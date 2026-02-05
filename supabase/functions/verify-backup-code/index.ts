import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const requestSchema = z.object({
  code: z.string().min(4),
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

    const { data, error } = await supabaseAdmin
      .from("two_factor_secrets")
      .select("backup_codes, backup_codes_salt")
      .eq("user_id", authData.user.id)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "Backup codes not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const normalizedCode = normalizeBackupCode(validation.data.code);
    const existingCodes = (data.backup_codes || []) as string[];

    if (!data.backup_codes_salt) {
      const legacyIndex = existingCodes.indexOf(normalizedCode);
      if (legacyIndex === -1) {
        return new Response(
          JSON.stringify({ error: "Invalid backup code" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltBase64 = toBase64(salt);
      const hashedCodes = await Promise.all(
        existingCodes.map((code) => hashBackupCode(code, salt))
      );
      const usedHash = await hashBackupCode(normalizedCode, salt);
      const nextCodes = hashedCodes.filter((hash) => hash !== usedHash);

      await supabaseAdmin
        .from("two_factor_secrets")
        .update({ backup_codes: nextCodes, backup_codes_salt: saltBase64 })
        .eq("user_id", authData.user.id);

      return new Response(
        JSON.stringify({ success: true, remaining: nextCodes.length }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const saltBytes = Uint8Array.from(atob(data.backup_codes_salt), (c) => c.charCodeAt(0));
    const hashed = await hashBackupCode(normalizedCode, saltBytes);
    const codeIndex = existingCodes.indexOf(hashed);

    if (codeIndex === -1) {
      return new Response(
        JSON.stringify({ error: "Invalid backup code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const newCodes = existingCodes.filter((_, i) => i !== codeIndex);
    const { error: updateError } = await supabaseAdmin
      .from("two_factor_secrets")
      .update({ backup_codes: newCodes })
      .eq("user_id", authData.user.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to update backup codes" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, remaining: newCodes.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("verify-backup-code error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
