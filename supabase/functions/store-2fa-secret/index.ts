// Supabase Edge Function: store-2fa-secret (RETIRED, roadmap S0-10)
//
// Returns 410 Gone. The previous implementation let a client choose its own TOTP
// secret and backup codes and set profiles.two_factor_enabled without verifying
// a code (EDGE-05, EDGE-25).
//
// Replacements:
//   - TOTP secrets: Supabase Auth MFA (supabase.auth.mfa.enroll / challenge / verify).
//   - Backup codes: the generate-backup-codes function (server-generated, aal2
//     session required, stored as peppered hashes) and verify-backup-code.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { retiredFunctionResponse } from "../_shared/retired.ts";

serve((req) =>
  retiredFunctionResponse(
    req,
    "store-2fa-secret",
    "TOTP secrets are stored by Supabase Auth (supabase.auth.mfa.enroll). Create backup codes with the generate-backup-codes function from an aal2 session.",
  )
);
