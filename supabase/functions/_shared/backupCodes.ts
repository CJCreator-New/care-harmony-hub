/**
 * Pure logic for MFA backup (recovery) codes (roadmap S0-10, EDGE-25).
 *
 * Used by supabase/functions/generate-backup-codes and
 * supabase/functions/verify-backup-code, and unit-tested from
 * tests/security/backupCodes.test.ts (same pattern as _shared/criticalLabEscalation.ts).
 * This file must stay free of imports and Deno/Node-only globals: it relies only
 * on Web Crypto (`crypto.getRandomValues`, `crypto.subtle`), `atob`/`btoa`,
 * TextEncoder and TextDecoder, which both runtimes provide.
 *
 * Design:
 *   - Codes are generated server-side: 10 codes of 10 characters drawn uniformly
 *     from the RFC 4648 base32 alphabet (A-Z, 2-7). Each character carries 5 bits,
 *     so each code carries 50 bits of entropy. A random byte masked with 0x1f is
 *     uniform over 32 symbols because 256 is a multiple of 32 (no modulo bias).
 *   - Only a keyed hash is stored: HMAC-SHA-256 with a server-side pepper (an edge
 *     function secret that never reaches the database), over a message that binds
 *     the hash version, the user id and a random per-batch salt. A database dump
 *     alone therefore cannot be brute-forced, and identical codes for two users or
 *     two batches hash differently.
 *   - The hash is deterministic for (pepper, user, salt, code), so the database can
 *     consume a code atomically with a single
 *     `UPDATE ... WHERE code_hash = ANY(...) AND used_at IS NULL RETURNING`.
 */

export const BACKUP_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const BACKUP_CODE_LENGTH = 10;
export const BACKUP_CODE_COUNT = 10;
export const BACKUP_CODE_BITS_PER_CHAR = 5;
export const BACKUP_CODE_ENTROPY_BITS = BACKUP_CODE_LENGTH * BACKUP_CODE_BITS_PER_CHAR;
export const BACKUP_CODE_HASH_VERSION = 'v1';
export const BACKUP_CODE_SALT_BYTES = 16;
/** Minimum pepper length, in characters. Generate with e.g. `openssl rand -base64 48`. */
export const MIN_PEPPER_LENGTH = 32;

/** Name of the edge-function secrets read by resolvePeppers (documented operator step). */
export const PEPPER_ENV = {
  current: 'BACKUP_CODE_PEPPER',
  currentId: 'BACKUP_CODE_PEPPER_ID',
  previous: 'BACKUP_CODE_PEPPER_PREVIOUS',
  previousId: 'BACKUP_CODE_PEPPER_PREVIOUS_ID',
} as const;
export const DEFAULT_PEPPER_ID = 'p1';

export type RandomSource = (bytes: Uint8Array) => Uint8Array;

const defaultRandom: RandomSource = (bytes) => globalThis.crypto.getRandomValues(bytes);

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/** One code: BACKUP_CODE_LENGTH symbols, each from one CSPRNG byte masked to 5 bits. */
export function generateBackupCode(random: RandomSource = defaultRandom): string {
  const bytes = random(new Uint8Array(BACKUP_CODE_LENGTH));
  if (bytes.length !== BACKUP_CODE_LENGTH) {
    throw new Error('random source returned the wrong number of bytes');
  }
  let code = '';
  for (const b of bytes) code += BACKUP_CODE_ALPHABET[b & 0x1f];
  return code;
}

/** A batch of distinct codes (a duplicate within a batch is redrawn). */
export function generateBackupCodes(
  count: number = BACKUP_CODE_COUNT,
  random: RandomSource = defaultRandom,
): string[] {
  if (!Number.isInteger(count) || count < 1 || count > 20) {
    throw new Error('count must be an integer between 1 and 20');
  }
  const codes = new Set<string>();
  let draws = 0;
  while (codes.size < count) {
    if (++draws > count * 10) throw new Error('random source is not producing distinct codes');
    codes.add(generateBackupCode(random));
  }
  return [...codes];
}

/** Display form shown to the user once: `ABCDE-FGHIJ`. */
export function formatBackupCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

/**
 * Canonical form of user input, or null if it cannot be a valid code.
 * Accepts lower case, spaces and hyphens, and maps the digits people type for
 * look-alike letters (0 -> O, 1 -> I, 8 -> B), which are not in the alphabet.
 */
export function normalizeBackupCode(input: string): string | null {
  if (typeof input !== 'string' || input.length > 64) return null;
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/8/g, 'B');
  if (cleaned.length !== BACKUP_CODE_LENGTH) return null;
  for (const ch of cleaned) {
    if (!BACKUP_CODE_ALPHABET.includes(ch)) return null;
  }
  return cleaned;
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

/** Fresh random per-batch salt (base64, 16 bytes). */
export function generateSalt(random: RandomSource = defaultRandom): string {
  return bytesToBase64(random(new Uint8Array(BACKUP_CODE_SALT_BYTES)));
}

export type HashInput = {
  /** Raw or normalized code; it is normalized again here. */
  code: string;
  userId: string;
  salt: string;
  pepper: string;
};

/**
 * Lower-case hex HMAC-SHA-256(pepper, "caresync-backup-code|v1|<userId>|<salt>|<CODE>").
 * Throws on an invalid code, an empty user id or salt, or a short pepper.
 */
export async function hashBackupCode(
  { code, userId, salt, pepper }: HashInput,
  subtle: SubtleCrypto = globalThis.crypto.subtle,
): Promise<string> {
  const normalized = normalizeBackupCode(code);
  if (!normalized) throw new Error('invalid backup code format');
  if (!userId) throw new Error('userId is required');
  if (!salt) throw new Error('salt is required');
  if (!isUsablePepper(pepper)) throw new Error('pepper is missing or too short');

  const enc = new TextEncoder();
  const key = await subtle.importKey('raw', enc.encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const message = `caresync-backup-code|${BACKUP_CODE_HASH_VERSION}|${userId}|${salt}|${normalized}`;
  const mac = await subtle.sign('HMAC', key, enc.encode(message));
  return bytesToHex(new Uint8Array(mac));
}

/** Hashes for every (salt, pepper id) pair the user's unused codes were stored with. */
export async function candidateHashes(
  code: string,
  userId: string,
  storedBatches: ReadonlyArray<{ salt: string; pepper_id: string }>,
  peppers: ReadonlyMap<string, string>,
  subtle: SubtleCrypto = globalThis.crypto.subtle,
): Promise<string[]> {
  const out = new Set<string>();
  for (const batch of storedBatches) {
    const pepper = peppers.get(batch.pepper_id);
    if (!pepper) continue; // retired pepper: those codes can no longer be verified
    out.add(await hashBackupCode({ code, userId, salt: batch.salt, pepper }, subtle));
  }
  return [...out];
}

/** Constant-time string comparison (for hex digests). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/** Recomputes the hash and compares it in constant time. */
export async function verifyBackupCodeHash(
  input: HashInput,
  expectedHash: string,
  subtle: SubtleCrypto = globalThis.crypto.subtle,
): Promise<boolean> {
  if (!normalizeBackupCode(input.code)) return false;
  const actual = await hashBackupCode(input, subtle);
  return constantTimeEqual(actual, expectedHash);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function isUsablePepper(pepper: string | undefined | null): pepper is string {
  return typeof pepper === 'string' && pepper.length >= MIN_PEPPER_LENGTH;
}

export type PepperConfig = { currentId: string; peppers: Map<string, string> };

/**
 * Reads the pepper secrets through `getEnv` (Deno.env.get in the functions).
 * Returns null when the current pepper is missing or too short, so callers fail closed.
 * An optional previous pepper keeps codes issued before a rotation verifiable.
 */
export function resolvePeppers(getEnv: (name: string) => string | undefined): PepperConfig | null {
  const current = getEnv(PEPPER_ENV.current);
  if (!isUsablePepper(current)) return null;
  const currentId = (getEnv(PEPPER_ENV.currentId) || DEFAULT_PEPPER_ID).trim();
  const peppers = new Map<string, string>([[currentId, current]]);
  const previous = getEnv(PEPPER_ENV.previous);
  const previousId = (getEnv(PEPPER_ENV.previousId) || '').trim();
  if (isUsablePepper(previous) && previousId && previousId !== currentId) {
    peppers.set(previousId, previous);
  }
  return { currentId, peppers };
}

// ---------------------------------------------------------------------------
// Session assurance level
// ---------------------------------------------------------------------------

/**
 * Decodes a JWT payload WITHOUT verifying it. Only call this on a token that the
 * auth server has already accepted (auth.getUser(token) succeeded).
 */
export function decodeJwtClaims(token: string): Record<string, unknown> | null {
  if (typeof token !== 'string') return null;
  const parts = token.replace(/^Bearer\s+/i, '').split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return claims && typeof claims === 'object' && !Array.isArray(claims) ? claims : null;
  } catch {
    return null;
  }
}

/** True when the (already verified) claims belong to `userId` and carry aal2. */
export function isAal2For(claims: Record<string, unknown> | null, userId: string): boolean {
  return !!claims && claims.sub === userId && claims.aal === 'aal2';
}
