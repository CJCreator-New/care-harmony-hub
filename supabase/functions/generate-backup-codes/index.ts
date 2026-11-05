// Supabase Edge Function: generate-backup-codes (roadmap S0-10, EDGE-25)
//
// Issues a fresh set of MFA backup codes. Replaces the client-chosen codes that
// store-2fa-secret used to accept.
//
//   Request:  POST {}                    Authorization: Bearer <user JWT, aal2>
//   Response: 200 { success: true, codes: ["ABCDE-FGHIJ", ...] }   shown ONCE
//             403 { success: false, error: "aal2_required" }
//             401 / 405 / 429 / 500 { success: false, error }
//
// - The session must be aal2 (the user has just verified a Supabase MFA factor),
//   so a stolen password alone cannot mint recovery codes.
// - 10 codes x 10 base32 characters (50 bits each) from crypto.getRandomValues.
// - Only HMAC-SHA-256 hashes keyed with BACKUP_CODE_PEPPER are stored, with a
//   fresh per-batch salt. Generating a new set invalidates every unused old code
//   (public.replace_mfa_backup_codes, one transaction).
//
// Requires supabase/pending-migrations/20261105000002_mfa_backup_codes_and_aal2.sql.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rateLimit.ts";
import {
  BACKUP_CODE_COUNT,
  decodeJwtClaims,
  formatBackupCode,
  generateBackupCodes,
  generateSalt,
  hashBackupCode,
  isAal2For,
  resolvePeppers,
} from "../_shared/backupCodes.ts";

const handler = async (req: Request): Promise<Response> => {
  const cors = getCorsHeaders(req);
  const json = (status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors, ...extra },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!isOriginAllowed(req)) return json(403, { success: false, error: "origin_not_allowed" });
  if (req.method !== "POST") return json(405, { success: false, error: "method_not_allowed" });

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { success: false, error: "unauthorized" });

  const pepperConfig = resolvePeppers((name) => Deno.env.get(name));
  if (!pepperConfig) {
    console.error("generate-backup-codes: BACKUP_CODE_PEPPER is not configured (or shorter than 32 characters)");
    return json(500, { success: false, error: "not_configured" });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    // The auth server validates the token (signature, expiry, session) first;
    // only then are its claims read locally for the aal check.
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return json(401, { success: false, error: "unauthorized" });
    const userId = authData.user.id;

    if (!isAal2For(decodeJwtClaims(token), userId)) {
      return json(403, { success: false, error: "aal2_required" });
    }

    const burst = rateLimit(`generate-backup-codes:${userId}`, { windowMs: 3_600_000, maxRequests: 5 });
    if (!burst.allowed) {
      return json(429, { success: false, error: "rate_limited" }, {
        "Retry-After": String(Math.max(1, Math.ceil((burst.resetTime - Date.now()) / 1000))),
      });
    }

    const codes = generateBackupCodes(BACKUP_CODE_COUNT);
    const salt = generateSalt();
    const pepper = pepperConfig.peppers.get(pepperConfig.currentId)!;
    const hashes = await Promise.all(codes.map((code) => hashBackupCode({ code, userId, salt, pepper })));

    const { error: rpcError } = await supabaseAdmin.rpc("replace_mfa_backup_codes", {
      p_user_id: userId,
      p_salt: salt,
      p_pepper_id: pepperConfig.currentId,
      p_code_hashes: hashes,
    });
    if (rpcError) {
      console.error("generate-backup-codes: store failed:", rpcError.message);
      return json(500, { success: false, error: "internal_error" });
    }

    return json(200, { success: true, codes: codes.map(formatBackupCode) });
  } catch (error: unknown) {
    console.error("generate-backup-codes error:", error instanceof Error ? error.message : "unknown");
    return json(500, { success: false, error: "internal_error" });
  }
};

serve(handler);
