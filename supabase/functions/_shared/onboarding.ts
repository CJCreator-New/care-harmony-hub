// Pure helpers for the onboarding edge functions (roadmap S0-03):
// register-patient, create-hospital-admin.
//
// No Deno or network imports, so the logic is unit-tested under vitest
// (tests/security/onboarding.test.ts). The database side (tenant derivation,
// throttling, grants) is tested on PostgreSQL by
// supabase/pending-migrations/tests/s0-03/.

export interface PatientRegistrationInput {
  email: string;
  password: string;
  hospitalCode: string;
  mrn: string;
  dateOfBirth: string; // YYYY-MM-DD
  lastName: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt (Supabase Auth) only uses the first 72 bytes.
export const PASSWORD_MAX_LENGTH = 72;
const MAX_FIELD_LENGTH = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Trims and lower-cases an email address. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Trims and collapses inner whitespace (hospital code, names). */
export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** MRNs are compared without whitespace and case-insensitively (same rule as the SQL). */
export function normalizeMrn(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

/**
 * True for a real calendar date in YYYY-MM-DD form that is not in the future
 * and not more than 130 years ago.
 */
export function isPlausibleBirthDate(value: string, now: Date = new Date()): boolean {
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return false;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() > today) return false;
  return now.getUTCFullYear() - y <= 130;
}

function str(input: Record<string, unknown>, key: string): string | null {
  const v = input[key];
  return typeof v === 'string' ? v : null;
}

/**
 * Validates and normalises the register-patient request body. Only these
 * fields are read: anything else in the body (for example a hospital id) is
 * ignored, so the client cannot choose the tenant.
 */
export function parsePatientRegistration(
  body: unknown,
  now: Date = new Date(),
): ParseResult<PatientRegistrationInput> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = body as Record<string, unknown>;
  const errors: string[] = [];

  const email = str(input, 'email');
  const password = str(input, 'password');
  const hospitalCode = str(input, 'hospitalCode');
  const mrn = str(input, 'mrn');
  const dateOfBirth = str(input, 'dateOfBirth');
  const lastName = str(input, 'lastName');

  if (!email || !EMAIL_RE.test(email.trim()) || email.length > 254) errors.push('email is invalid');
  if (!password || password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`);
  }
  if (!hospitalCode || !normalizeText(hospitalCode) || hospitalCode.length > MAX_FIELD_LENGTH) {
    errors.push('hospitalCode is required');
  }
  if (!mrn || !normalizeMrn(mrn) || mrn.length > MAX_FIELD_LENGTH) errors.push('mrn is required');
  if (!dateOfBirth || !isPlausibleBirthDate(dateOfBirth.trim(), now)) errors.push('dateOfBirth is invalid');
  if (!lastName || !normalizeText(lastName) || lastName.length > MAX_FIELD_LENGTH) errors.push('lastName is required');

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      email: normalizeEmail(email!),
      password: password!,
      hospitalCode: normalizeText(hospitalCode!),
      mrn: normalizeMrn(mrn!),
      dateOfBirth: dateOfBirth!.trim(),
      lastName: normalizeText(lastName!),
    },
  };
}

/**
 * The caller's address for throttling: the first X-Forwarded-For hop (set by
 * the Supabase gateway), else cf-connecting-ip / x-real-ip, else "unknown".
 */
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first || headers.get('cf-connecting-ip')?.trim() || headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Hex SHA-256 of the address, so the attempts table stores no raw IPs. */
export async function hashClientKey(address: string, subtle: SubtleCrypto): Promise<string> {
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(`patient-claim|${address}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
}

export interface MappedError {
  status: number;
  error: string;
}

/**
 * Maps an onboarding RPC error (SQLSTATE in `code`) to an HTTP status and a
 * message that is safe to show. Unknown errors become a generic 500.
 */
export function mapOnboardingRpcError(err: PostgrestLikeError | null | undefined, context: 'hospital' | 'patient'): MappedError {
  switch (err?.code) {
    case '42501':
      return context === 'hospital'
        ? { status: 409, error: 'This account already belongs to a hospital or already has a role.' }
        : { status: 409, error: 'This account is already registered.' };
    case '23505':
      return context === 'hospital'
        ? { status: 409, error: 'A hospital with this license number is already registered.' }
        : { status: 409, error: 'This account is already registered.' };
    case 'P0002':
      return context === 'hospital'
        ? { status: 404, error: 'Account not found.' }
        : { status: 400, error: PATIENT_NOT_VERIFIED_MESSAGE };
    case '22004':
    case '22023':
      return { status: 400, error: 'Invalid request.' };
    default:
      return { status: 500, error: context === 'hospital' ? 'Failed to create hospital' : 'Registration failed' };
  }
}

export const PATIENT_NOT_VERIFIED_MESSAGE =
  'We could not match these details to a patient record. Check the hospital code, MRN, date of birth, ' +
  'last name and the email address your hospital has on file, or ask reception to update your record.';

export type ClaimStatus = { status: 'ok' } | { status: 'invalid' } | { status: 'locked'; retry_after_seconds?: number };

/** Interprets the jsonb returned by public.verify_patient_claim. Anything unexpected fails closed. */
export function interpretClaimStatus(data: unknown): ClaimStatus {
  if (typeof data !== 'object' || data === null) return { status: 'invalid' };
  const d = data as Record<string, unknown>;
  if (d.status === 'ok') return { status: 'ok' };
  if (d.status === 'locked') {
    const n = Number(d.retry_after_seconds);
    return { status: 'locked', retry_after_seconds: Number.isFinite(n) && n > 0 ? Math.ceil(n) : 3600 };
  }
  return { status: 'invalid' };
}
