// register-patient (roadmap S0-03: DB-01, SECF-10, FUNC-01)
//
// Patient self-registration = claiming an existing, staff-created patient
// record. The tenant (hospital) comes from the matched record, never from the
// request body. Anonymous POST:
//   { email, password, hospitalCode, mrn, dateOfBirth (YYYY-MM-DD), lastName }
// Flow:
//   1. verify_patient_claim (throttled per client, per record, per hospital)
//      BEFORE any account exists, so a failed claim leaves nothing behind;
//   2. auth.admin.createUser with email_confirm = false (the email must be the
//      one on the record; the confirmation email proves the caller owns it);
//   3. register_patient links patients.user_id, the profile tenant and the
//      patient role in one transaction; on failure the new auth user is deleted;
//   4. a confirmation email is requested (auth.resend type "signup").
// Responses: 200 { success: true, confirmation_email_sent }, 400 not matched or
// invalid, 409 email already registered, 429 throttled, 500 otherwise.
//
// Requires supabase/pending-migrations/20261105000003_lock_tenant_key.sql.
// Without it, step 1 fails and the function returns 500 (fails closed).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders, isOriginAllowed } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rateLimit.ts";
import {
  PATIENT_NOT_VERIFIED_MESSAGE,
  clientAddress,
  hashClientKey,
  interpretClaimStatus,
  mapOnboardingRpcError,
  parsePatientRegistration,
} from "../_shared/onboarding.ts";

const REGISTER_RATE_LIMIT = { windowMs: 10 * 60 * 1000, maxRequests: 8 };

const handler = async (req: Request): Promise<Response> => {
  const cors = getCorsHeaders(req);
  const json = (status: number, payload: Record<string, unknown>, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors, ...extra },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!isOriginAllowed(req)) return json(403, { error: "Origin not allowed" });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const address = clientAddress(req.headers);
  // Per-instance burst limit; the database throttle in verify_patient_claim is the real one.
  const burst = rateLimit(`register-patient:${address}`, REGISTER_RATE_LIMIT);
  if (!burst.allowed) {
    return json(429, { error: "Too many attempts. Please try again later." },
      { "Retry-After": String(Math.ceil((burst.resetTime - Date.now()) / 1000)) });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const parsed = parsePatientRegistration(body);
  if (!parsed.ok) return json(400, { error: "Validation failed", details: parsed.errors });
  const input = parsed.value;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    // 1. Verify before creating anything.
    const clientKey = await hashClientKey(address, crypto.subtle);
    const { data: claimData, error: claimError } = await admin.rpc("verify_patient_claim", {
      p_client_key: clientKey,
      p_hospital_code: input.hospitalCode,
      p_mrn: input.mrn,
      p_date_of_birth: input.dateOfBirth,
      p_last_name: input.lastName,
      p_email: input.email,
    });
    if (claimError) {
      console.error("verify_patient_claim error:", claimError.code);
      return json(500, { error: "Registration failed" });
    }
    const claim = interpretClaimStatus(claimData);
    if (claim.status === "locked") {
      return json(429, { error: "Too many attempts. Please try again later." },
        { "Retry-After": String(claim.retry_after_seconds ?? 3600) });
    }
    if (claim.status !== "ok") return json(400, { error: PATIENT_NOT_VERIFIED_MESSAGE });

    // 2. Create the account (unconfirmed).
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: false,
    });
    if (createError || !created?.user) {
      if ((createError?.message ?? "").toLowerCase().includes("already")) {
        return json(409, { error: "An account with this email already exists. Sign in or reset your password." });
      }
      // For example a password the Auth password policy rejects.
      return json(400, { error: "Could not create the account. Choose a stronger password or try again later." });
    }
    const userId = created.user.id;

    // 3. Link the record, tenant and role atomically; undo the account on failure.
    const { error: registerError } = await admin.rpc("register_patient", {
      p_user_id: userId,
      p_hospital_code: input.hospitalCode,
      p_mrn: input.mrn,
      p_date_of_birth: input.dateOfBirth,
      p_last_name: input.lastName,
      p_email: input.email,
    });
    if (registerError) {
      console.error("register_patient error:", registerError.code);
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) console.error("register-patient: could not delete auth user after failure");
      const mapped = mapOnboardingRpcError(registerError, "patient");
      return json(mapped.status, { error: mapped.error });
    }

    // 4. Confirmation email (proves the caller owns the record's email).
    const { error: resendError } = await anon.auth.resend({ type: "signup", email: input.email });
    if (resendError) console.error("register-patient: confirmation email not sent");

    return json(200, { success: true, confirmation_email_sent: !resendError });
  } catch (error: unknown) {
    console.error("register-patient error:", error instanceof Error ? error.name : "unknown");
    return json(500, { error: "Registration failed" });
  }
};

// Not wrapped in withRateLimit: its key is the Authorization header prefix,
// which is the same anon key for every anonymous caller, so it would throttle
// all patients together. The per-address limit above and the database throttle
// apply instead.
serve(handler);
