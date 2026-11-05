// Supabase Edge Function: verify-backup-code (roadmap S0-10, EDGE-25)
//
// MFA recovery for a user who has lost their authenticator. The caller signs in
// with their password (aal1 session) and submits one backup code.
//
//   Request:  POST { code: string }      Authorization: Bearer <user JWT>
//   Response: 200 { success: true }      code consumed; the user's TOTP factors
//                                        were deleted so they must re-enroll
//             200 { success: false, error: "invalid_code" }
//             429 { success: false, error: "locked", retryAfterSeconds }
//             400 / 401 / 405 / 500 { success: false, error }
//
// Guarantees:
//   - Codes are compared as HMAC-SHA-256 hashes keyed with a server pepper
//     (BACKUP_CODE_PEPPER); plaintext codes are never stored (_shared/backupCodes.ts).
//   - Consumption is atomic in public.consume_mfa_backup_code (one UPDATE ...
//     WHERE used_at IS NULL RETURNING under a per-user advisory lock), so a
//     concurrent double-submit yields exactly one success.
//   - Lockout: 5 failed codes in 15 minutes locks recovery for the rest of the
//     window. It is enforced in the database, so it holds across isolates.
//
// Requires supabase/pending-migrations/20261105000002_mfa_backup_codes_and_aal2.sql.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";
import { rateLimit } from "../_shared/rateLimit.ts";
import { candidateHashes, normalizeBackupCode, resolvePeppers } from "../_shared/backupCodes.ts";

const requestSchema = z.object({
  code: z.string().min(1).max(64),
});

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

  const validation = await validateRequest(req, requestSchema);
  if (!validation.success) return json(400, { success: false, error: "validation_failed" });

  const pepperConfig = resolvePeppers((name) => Deno.env.get(name));
  if (!pepperConfig) {
    console.error("verify-backup-code: BACKUP_CODE_PEPPER is not configured (or shorter than 32 characters)");
    return json(500, { success: false, error: "not_configured" });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return json(401, { success: false, error: "unauthorized" });
    const userId = authData.user.id;

    // Per-isolate burst limit, keyed by user (the database lockout is the real control).
    const burst = rateLimit(`verify-backup-code:${userId}`, { windowMs: 60_000, maxRequests: 10 });
    if (!burst.allowed) {
      return json(429, { success: false, error: "rate_limited" }, {
        "Retry-After": String(Math.max(1, Math.ceil((burst.resetTime - Date.now()) / 1000))),
      });
    }

    // A malformed code still counts as a failed attempt, so it goes through the RPC
    // with an empty hash list.
    const normalized = normalizeBackupCode(validation.data.code);
    let hashes: string[] = [];
    if (normalized) {
      const { data: batches, error: batchError } = await supabaseAdmin
        .from("mfa_backup_codes")
        .select("salt, pepper_id")
        .eq("user_id", userId)
        .is("used_at", null);
      if (batchError) {
        console.error("verify-backup-code: batch lookup failed:", batchError.message);
        return json(500, { success: false, error: "internal_error" });
      }
      const unique = new Map<string, { salt: string; pepper_id: string }>();
      for (const b of batches ?? []) unique.set(`${b.pepper_id}|${b.salt}`, b);
      hashes = await candidateHashes(normalized, userId, [...unique.values()], pepperConfig.peppers);
    }

    const { data: result, error: rpcError } = await supabaseAdmin.rpc("consume_mfa_backup_code", {
      p_user_id: userId,
      p_code_hashes: hashes,
    });
    if (rpcError || !result) {
      console.error("verify-backup-code: consume failed:", rpcError?.message);
      return json(500, { success: false, error: "internal_error" });
    }

    const status = (result as { status?: string }).status;
    if (status === "locked") {
      const retry = Number((result as { retry_after_seconds?: number }).retry_after_seconds) || 900;
      return json(429, { success: false, error: "locked", retryAfterSeconds: retry }, { "Retry-After": String(retry) });
    }
    if (status !== "ok") return json(200, { success: false, error: "invalid_code" });

    const codeId = (result as { code_id?: string }).code_id;

    // Recovery: remove the user's TOTP factors so they must enroll a new device.
    const { data: factorData, error: listError } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId });
    let resetError = listError?.message ?? null;
    if (!listError) {
      for (const factor of factorData?.factors ?? []) {
        if (factor.factor_type !== "totp") continue;
        const { error: delError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({ id: factor.id, userId });
        if (delError) {
          resetError = delError.message;
          break;
        }
      }
    }

    if (resetError) {
      // Give the code back so the user is not charged for a failed recovery.
      console.error("verify-backup-code: factor reset failed:", resetError);
      if (codeId) {
        await supabaseAdmin.from("mfa_backup_codes").update({ used_at: null }).eq("id", codeId).eq("user_id", userId);
      }
      return json(500, { success: false, error: "factor_reset_failed" });
    }

    return json(200, { success: true });
  } catch (error: unknown) {
    console.error("verify-backup-code error:", error instanceof Error ? error.message : "unknown");
    return json(500, { success: false, error: "internal_error" });
  }
};

serve(handler);
