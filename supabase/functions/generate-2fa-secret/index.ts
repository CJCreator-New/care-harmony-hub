// Supabase Edge Function: generate-2fa-secret (RETIRED, roadmap S0-10)
//
// Returns 410 Gone. Second factors are handled by Supabase Auth MFA (TOTP
// factors; the session JWT carries aal2 after supabase.auth.mfa.verify), and RLS
// requires aal2 for admin/doctor PHI access (public.mfa_satisfied(), see
// supabase/pending-migrations/20261105000002_mfa_backup_codes_and_aal2.sql).
// The previous implementation emitted base64url instead of RFC 4648 base32
// (EDGE-12) and was removed to reduce attack surface (EDGE-05).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { retiredFunctionResponse } from "../_shared/retired.ts";

serve((req) =>
  retiredFunctionResponse(
    req,
    "generate-2fa-secret",
    "Enroll a TOTP factor with supabase.auth.mfa.enroll({ factorType: 'totp' }) and confirm it with supabase.auth.mfa.challengeAndVerify.",
  )
);
