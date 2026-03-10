import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { withRateLimit } from "../_shared/rateLimit.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const verifyTotpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

interface VerifyRequest {
  code: string;
}

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const getDecryptionKey = async () => {
  const keyBase64 = Deno.env.get("TWO_FACTOR_ENCRYPTION_KEY");
  if (!keyBase64) {
    throw new Error("Encryption key not configured");
  }
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  if (keyBytes.length !== 32) {
    throw new Error("Encryption key must be 32 bytes (base64-encoded)");
  }
  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    "AES-GCM",
    false,
    ["decrypt"]
  );
};

const decryptSecret = async (payload: string) => {
  if (!payload.startsWith("v1:")) {
    return payload;
  }

  const [, encoded] = payload.split("v1:");
  const [ivPart, cipherPart] = encoded.split(".");
  if (!ivPart || !cipherPart) {
    throw new Error("Invalid encrypted secret format");
  }

  const key = await getDecryptionKey();
  const iv = fromBase64(ivPart);
  const cipherBytes = fromBase64(cipherPart);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    cipherBytes
  );

  return new TextDecoder().decode(plaintext);
};

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
  const reqCorsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: reqCorsHeaders });
  }

  if (!isOriginAllowed(req)) {
    return new Response(
      JSON.stringify({ error: "Origin not allowed" }),
      { status: 403, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Require a valid Authorization header — never trust a caller-supplied userId.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }

    const validation = await validateRequest(req, verifyTotpSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }
    const { code } = validation.data;

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }
    const userId = user.id;
    
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
        { status: 404, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
      );
    }
    
    const secret = await decryptSecret(secretData.secret);

    // Verify the TOTP code
    const isValid = await verifyTOTP(secret, code);
    
    console.log(`TOTP verification for user ${userId}: ${isValid ? 'success' : 'failed'}`);
    
    return new Response(
      JSON.stringify({ 
        valid: isValid,
        message: isValid ? "Code verified successfully" : "Invalid code"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
    
  } catch (error: unknown) {
    console.error("Error in verify-totp function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...reqCorsHeaders } }
    );
  }
};

serve((req) => withRateLimit(req, handler));
