import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  code: string;
  userId?: string;
}

// TOTP implementation
function base32Decode(encoded: string): ArrayBuffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  for (const char of encoded.toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  
  // Return a copy as ArrayBuffer to avoid SharedArrayBuffer issues
  return bytes.slice().buffer;
}

async function generateTOTP(secret: string, time: number = Date.now()): Promise<string> {
  const secretBytes = base32Decode(secret);
  const timeStep = Math.floor(time / 30000);
  
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, timeStep, false);
  
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, timeBuffer);
  const signatureBytes = new Uint8Array(signature);
  
  const offset = signatureBytes[signatureBytes.length - 1] & 0x0f;
  const code = (
    ((signatureBytes[offset] & 0x7f) << 24) |
    ((signatureBytes[offset + 1] & 0xff) << 16) |
    ((signatureBytes[offset + 2] & 0xff) << 8) |
    (signatureBytes[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  const now = Date.now();
  
  // Check current and adjacent time windows (allows for 30 second drift)
  for (const offset of [0, -30000, 30000]) {
    const expectedCode = await generateTOTP(secret, now + offset);
    if (expectedCode === code) {
      return true;
    }
  }
  
  return false;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    let userId: string;
    
    const { code, userId: providedUserId }: VerifyRequest = await req.json();
    
    if (!code || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "Invalid code format. Please provide a 6-digit code." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // If userId is provided (for login verification), use that
    // Otherwise, get user from auth token
    if (providedUserId) {
      userId = providedUserId;
    } else if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      userId = user.id;
    } else {
      return new Response(
        JSON.stringify({ error: "User ID or authorization required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Get user's 2FA secret
    const { data: secretData, error: secretError } = await supabase
      .from("two_factor_secrets")
      .select("secret, verified_at")
      .eq("user_id", userId)
      .single();
    
    if (secretError || !secretData) {
      console.error("Error fetching 2FA secret:", secretError);
      return new Response(
        JSON.stringify({ error: "2FA not configured for this user" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Verify the TOTP code
    const isValid = await verifyTOTP(secretData.secret, code);
    
    console.log(`TOTP verification for user ${userId}: ${isValid ? 'success' : 'failed'}`);
    
    return new Response(
      JSON.stringify({ 
        valid: isValid,
        message: isValid ? "Code verified successfully" : "Invalid code"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in verify-totp function:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
