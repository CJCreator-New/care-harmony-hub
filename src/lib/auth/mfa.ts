/**
 * Second-factor (TOTP) authentication on top of Supabase Auth MFA.
 *
 * Supabase Auth owns the TOTP secret, verifies codes server-side and, after a
 * successful `mfa.verify`, issues a session whose JWT carries `aal: 'aal2'`.
 * Nothing about the second factor is decided by client-side state or by
 * self-writable profile columns.
 *
 * The legacy custom 2FA (`two_factor_secrets`, `profiles.two_factor_enabled`,
 * and the `generate-2fa-secret` / `store-2fa-secret` / `verify-2fa` /
 * `verify-totp` edge functions) is no longer read or written by the client.
 * `profiles.two_factor_enabled` is ignored on purpose: a user who enabled the
 * legacy 2FA has no Supabase MFA factor and therefore must enrol one at their
 * next login. See docs/security/MFA_MIGRATION.md.
 */
import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/types/auth';

/** Route of the mandatory enrolment page (admin/doctor without a verified factor). */
export const MFA_ENROLL_PATH = '/hospital/two-factor-setup';
/** Route of the login-time challenge page (verified factor, session still at aal1). */
export const MFA_CHALLENGE_PATH = '/hospital/mfa-challenge';
/** Router state handed to the login page after a backup-code recovery. */
export const MFA_REENROLL_LOGIN_STATE = { mfaReenroll: true } as const;

/**
 * Roles that must have a verified TOTP factor before reaching any app route.
 * Mirrors `public.role_requires_2fa()` in
 * supabase/migrations/20260622000001_enforce_2fa_for_clinical_roles.sql.
 */
export const MFA_MANDATORY_ROLES: readonly UserRole[] = ['admin', 'doctor'];

export type AssuranceLevel = 'aal1' | 'aal2';

export type MfaAssurance =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready';
      /** `aal` claim of the current access token. */
      currentLevel: AssuranceLevel | null;
      /** Id of the user's verified TOTP factor, or null when none is enrolled. */
      verifiedTotpFactorId: string | null;
    };

/**
 * What the route guard must do for the current session.
 * - `loading`: assurance not known yet. Render nothing protected.
 * - `allow`: render the route.
 * - `challenge`: the user has a factor but this session is not aal2, or the
 *   lookup failed (fail closed). Send to MFA_CHALLENGE_PATH.
 * - `enroll`: a mandatory role without a verified factor. Send to MFA_ENROLL_PATH.
 */
export type MfaGateDecision = 'loading' | 'allow' | 'challenge' | 'enroll';

interface MfaRequirementInput {
  two_factor_required?: boolean | null;
}

/**
 * True when this user must have a verified second factor.
 * `two_factor_required` is the server-maintained flag (set by a trigger on
 * user_roles); the role check is a defensive fallback. The legacy
 * `two_factor_enabled` column is deliberately NOT consulted.
 */
export function requiresMandatoryMfa(
  profile: MfaRequirementInput | null | undefined,
  roles: readonly UserRole[]
): boolean {
  if (profile?.two_factor_required === true) return true;
  return roles.some((role) => MFA_MANDATORY_ROLES.includes(role));
}

/** Pure decision table for the route guard. Never fails open. */
export function resolveMfaGate(assurance: MfaAssurance, mandatory: boolean): MfaGateDecision {
  if (assurance.status === 'loading') return 'loading';
  // Fail closed: if we cannot establish the assurance level, nobody gets through.
  if (assurance.status === 'error') return 'challenge';
  if (assurance.verifiedTotpFactorId) {
    return assurance.currentLevel === 'aal2' ? 'allow' : 'challenge';
  }
  return mandatory ? 'enroll' : 'allow';
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

/**
 * Read the session's assurance level and the user's verified TOTP factor.
 * `listFactors` goes to the Auth server (getUser), so a factor enrolled or
 * removed in another session is seen here. Any error yields `status: 'error'`.
 */
export async function fetchMfaAssurance(): Promise<MfaAssurance> {
  try {
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || !aal) {
      return { status: 'error', message: errorMessage(aalError, 'Could not read assurance level') };
    }
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError || !factors) {
      return { status: 'error', message: errorMessage(factorsError, 'Could not list MFA factors') };
    }
    const verified = factors.totp.find((factor) => factor.status === 'verified') ?? null;
    return {
      status: 'ready',
      currentLevel: aal.currentLevel,
      verifiedTotpFactorId: verified?.id ?? null,
    };
  } catch (error) {
    return { status: 'error', message: errorMessage(error, 'MFA lookup failed') };
  }
}

/**
 * Remove TOTP factors that were enrolled but never verified (abandoned or
 * retried enrolments). Unverified factors can be removed at aal1.
 */
export async function removeUnverifiedTotpFactors(): Promise<void> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) throw new Error(errorMessage(error, 'Could not list MFA factors'));
  const unverified = data.all.filter(
    (factor) => factor.factor_type === 'totp' && factor.status !== 'verified'
  );
  for (const factor of unverified) {
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (unenrollError) {
      throw new Error(errorMessage(unenrollError, 'Could not remove unfinished enrolment'));
    }
  }
}

export interface PendingTotpEnrollment {
  factorId: string;
  /** `data:image/svg+xml` URL of the otpauth QR code, generated by Supabase Auth. */
  qrCode: string;
  /** Base32 secret for manual entry. Never log it. */
  secret: string;
}

/**
 * Start a TOTP enrolment. The factor stays `unverified` (and does not count)
 * until `confirmTotpEnrollment` succeeds with a code from the authenticator.
 */
export async function startTotpEnrollment(): Promise<PendingTotpEnrollment> {
  await removeUnverifiedTotpFactors();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'AROCORD-HIMS',
    // Unique name: Supabase rejects a second factor with the same friendly name.
    friendlyName: `Authenticator ${new Date().toISOString()}`,
  });
  if (error || !data) throw new Error(errorMessage(error, 'Could not start enrolment'));
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Prove possession of the new factor. On success the session is upgraded to aal2. */
export async function confirmTotpEnrollment(factorId: string, code: string): Promise<void> {
  await verifyTotpCode(factorId, code);
}

/** Login-time step-up: challenge + verify an already enrolled factor. */
export async function verifyTotpCode(factorId: string, code: string): Promise<void> {
  const normalized = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(normalized)) throw new Error('Enter the 6-digit code from your app');
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError || !challenge) {
    throw new Error(errorMessage(challengeError, 'Could not start verification'));
  }
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: normalized,
  });
  if (verifyError) throw new Error(errorMessage(verifyError, 'Invalid code'));
}

/** Abandon an enrolment that was started but not verified. Best effort. */
export async function cancelTotpEnrollment(factorId: string): Promise<void> {
  try {
    await supabase.auth.mfa.unenroll({ factorId });
  } catch {
    // Left-over unverified factors are also cleaned up by the next startTotpEnrollment.
  }
}

/** Remove a verified factor (Supabase requires an aal2 session for this). */
export async function removeTotpFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(errorMessage(error, 'Could not remove the authenticator'));
}

/**
 * Account recovery with a backup code. The `verify-backup-code` edge function
 * consumes the code and, on success, unenrols the user's TOTP factor
 * server-side. The caller then signs out locally; at the next login a
 * mandatory-role user is sent to enrol a new factor.
 */
export async function redeemBackupCode(code: string): Promise<boolean> {
  const normalized = code.replace(/\s/g, '');
  if (!normalized) return false;
  try {
    const { data, error } = await supabase.functions.invoke('verify-backup-code', {
      body: { code: normalized },
    });
    return !error && (data as { success?: unknown } | null)?.success === true;
  } catch {
    return false;
  }
}
