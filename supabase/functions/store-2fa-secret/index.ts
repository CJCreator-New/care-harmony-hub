import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const requestSchema = z.object({
  secret: z.string().min(16),
  backupCodes: z.array(z.string()).min(1),
});

const textEncoder = new TextEncoder();

const toBase64 = (data: ArrayBuffer | Uint8Array) => {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const normalizeBackupCode = (code: string) =>
  code.toUpperCase().replace(/\s/g, "");

const getEncryptionKey = async () => {
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
    ["encrypt"]
  );
};

const encryptSecret = async (secret: string, key: CryptoKey) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = textEncoder.encode(secret);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    iv: toBase64(iv),
    ciphertext: toBase64(ciphertext),
  };
};

const hashBackupCode = async (code: string, salt: Uint8Array) => {
  const normalized = normalizeBackupCode(code);
  const codeBytes = textEncoder.encode(normalized);
  const combined = new Uint8Array(salt.length + codeBytes.length);
  combined.set(salt);
  combined.set(codeBytes, salt.length);
  const digest = await crypto.subtle.digest("SHA-256", combined);
  return toBase64(digest);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const validation = await validateRequest(req, requestSchema);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: validation.error }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const key = await getEncryptionKey();
    const { iv, ciphertext } = await encryptSecret(validation.data.secret, key);
    const secretPayload = `v1:${iv}.${ciphertext}`;

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltBase64 = toBase64(salt);

    const hashedCodes = await Promise.all(
      validation.data.backupCodes.map((code) => hashBackupCode(code, salt))
    );

    const { error: upsertError } = await supabaseAdmin
      .from("two_factor_secrets")
      .upsert(
        {
          user_id: authData.user.id,
          secret: secretPayload,
          backup_codes: hashedCodes,
          backup_codes_salt: saltBase64,
          verified_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("2FA secret upsert error:", upsertError);
      return new Response(
        JSON.stringify({ error: "Failed to store 2FA secret" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ two_factor_enabled: true })
      .eq("user_id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to enable 2FA" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("store-2fa-secret error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
