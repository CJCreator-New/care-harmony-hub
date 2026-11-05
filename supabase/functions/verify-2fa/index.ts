// Supabase Edge Function: verify-2fa (RETIRED, roadmap S0-10)
//
// Returns 410 Gone. Second factors are handled by Supabase Auth MFA (TOTP
// factors; the session JWT carries aal2 after supabase.auth.mfa.verify), and RLS
// requires aal2 for admin/doctor PHI access (public.mfa_satisfied(), see
// supabase/pending-migrations/20261105000002_mfa_backup_codes_and_aal2.sql).
// The previous implementation verified a client-supplied secret and returned a
// boolean that nothing on the server trusted (EDGE-05, EDGE-12).
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { retiredFunctionResponse } from "../_shared/retired.ts";

serve((req) =>
  retiredFunctionResponse(
    req,
    "verify-2fa",
    "Verify TOTP codes with supabase.auth.mfa.challenge and supabase.auth.mfa.verify, which raise the session to aal2.",
  )
);
