/**
 * S0-10 (EDGE-25): unit tests for the backup-code logic used by
 * supabase/functions/generate-backup-codes and supabase/functions/verify-backup-code.
 *
 * Behaviour tests of the shared module (no source-string checks). The database
 * side (atomic single use, lockout, RLS) is tested on PostgreSQL by
 * supabase/pending-migrations/tests/s0-10/ (see supabase/pending-migrations/README.md).
 */
import { describe, it, expect, vi } from 'vitest';
import { createHmac, webcrypto } from 'node:crypto';
import {
  BACKUP_CODE_ALPHABET,
  BACKUP_CODE_COUNT,
  BACKUP_CODE_ENTROPY_BITS,
  BACKUP_CODE_LENGTH,
  MIN_PEPPER_LENGTH,
  PEPPER_ENV,
  candidateHashes,
  constantTimeEqual,
  decodeJwtClaims,
  formatBackupCode,
  generateBackupCode,
  generateBackupCodes,
  generateSalt,
  hashBackupCode,
  isAal2For,
  normalizeBackupCode,
  resolvePeppers,
  verifyBackupCodeHash,
} from '../../supabase/functions/_shared/backupCodes.ts';

const subtle = webcrypto.subtle as unknown as SubtleCrypto;
const nodeRandom = (b: Uint8Array) => webcrypto.getRandomValues(b);
const PEPPER = 'test-pepper-0123456789-abcdefghijklmnopqrstuvwxyz';
const USER = '00000000-0000-0000-0000-00000000d0c1';

describe('backup code generation', () => {
  it('uses the RFC 4648 base32 alphabet and carries at least 50 bits per code', () => {
    expect(BACKUP_CODE_ALPHABET).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567');
    expect(new Set(BACKUP_CODE_ALPHABET).size).toBe(32);
    expect(BACKUP_CODE_LENGTH * Math.log2(BACKUP_CODE_ALPHABET.length)).toBe(BACKUP_CODE_ENTROPY_BITS);
    expect(BACKUP_CODE_ENTROPY_BITS).toBeGreaterThanOrEqual(50);
  });

  it('generates 10 distinct 10-character codes from the alphabet', () => {
    const codes = generateBackupCodes(BACKUP_CODE_COUNT, nodeRandom);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-Z2-7]{10}$/);
  });

  it('draws its randomness from the supplied CSPRNG (crypto.getRandomValues by default)', () => {
    const spy = vi.fn(nodeRandom);
    generateBackupCode(spy);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toHaveLength(BACKUP_CODE_LENGTH);

    const globalSpy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    try {
      generateBackupCode();
      expect(globalSpy).toHaveBeenCalled();
    } finally {
      globalSpy.mockRestore();
    }
  });

  it('maps every byte value uniformly onto the 32 symbols (no modulo bias)', () => {
    let next = 0;
    const counter = (b: Uint8Array) => {
      for (let i = 0; i < b.length; i++) b[i] = next++ & 0xff;
      return b;
    };
    const counts = new Map<string, number>();
    // 256 bytes = every byte value once (in 26 codes of 10, minus 4 spare draws).
    let drawn = '';
    while (drawn.length < 256) drawn += generateBackupCode(counter);
    for (const ch of drawn.slice(0, 256)) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    expect(counts.size).toBe(32);
    for (const n of counts.values()) expect(n).toBe(8);
  });

  it('has a roughly flat symbol distribution over many real draws', () => {
    const counts = new Map<string, number>();
    const codes = Array.from({ length: 2000 }, () => generateBackupCode(nodeRandom)).join('');
    for (const ch of codes) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const expected = codes.length / 32; // 625
    for (const ch of BACKUP_CODE_ALPHABET) {
      expect(counts.get(ch) ?? 0).toBeGreaterThan(expected * 0.75);
      expect(counts.get(ch) ?? 0).toBeLessThan(expected * 1.25);
    }
  });

  it('redraws duplicates and refuses a broken random source', () => {
    const constant = (b: Uint8Array) => b.fill(7);
    expect(() => generateBackupCodes(2, constant)).toThrow(/distinct/);
    expect(() => generateBackupCodes(0, nodeRandom)).toThrow();
    expect(() => generateBackupCode(() => new Uint8Array(3))).toThrow();
  });

  it('formats for display and normalizes user input', () => {
    expect(formatBackupCode('ABCDEFGHIJ')).toBe('ABCDE-FGHIJ');
    expect(normalizeBackupCode('abcde-fghij')).toBe('ABCDEFGHIJ');
    expect(normalizeBackupCode(' ABCDE FGHIJ ')).toBe('ABCDEFGHIJ');
    expect(normalizeBackupCode('0B1DE-8GH2J')).toBe('OBIDEBGH2J');
    expect(normalizeBackupCode('ABCDEFGHI')).toBeNull();
    expect(normalizeBackupCode('ABCDEFGHIJK')).toBeNull();
    expect(normalizeBackupCode('ABCDE9GHIJ')).toBeNull();
    expect(normalizeBackupCode('ABCDE_GHIJ')).toBeNull();
    expect(normalizeBackupCode('x'.repeat(65))).toBeNull();
    for (const code of generateBackupCodes(10, nodeRandom)) {
      expect(normalizeBackupCode(formatBackupCode(code))).toBe(code);
    }
  });
});

describe('backup code hashing', () => {
  const salt = 'c2FsdHNhbHRzYWx0c2FsdA==';

  it('is HMAC-SHA-256(pepper, "caresync-backup-code|v1|user|salt|CODE") as 64 hex chars', async () => {
    const hash = await hashBackupCode({ code: 'abcde-fghij', userId: USER, salt, pepper: PEPPER }, subtle);
    const reference = createHmac('sha256', PEPPER)
      .update(`caresync-backup-code|v1|${USER}|${salt}|ABCDEFGHIJ`)
      .digest('hex');
    expect(hash).toBe(reference);
    expect(hash).toMatch(/^[0-9a-f]{64}$/); // matches the SQL CHECK constraint
  });

  it('works with the runtime default crypto.subtle', async () => {
    const a = await hashBackupCode({ code: 'ABCDEFGHIJ', userId: USER, salt, pepper: PEPPER });
    const b = await hashBackupCode({ code: 'ABCDEFGHIJ', userId: USER, salt, pepper: PEPPER }, subtle);
    expect(a).toBe(b);
  });

  it('binds the hash to the user, the salt and the pepper', async () => {
    const base = { code: 'ABCDEFGHIJ', userId: USER, salt, pepper: PEPPER };
    const h = await hashBackupCode(base, subtle);
    expect(await hashBackupCode({ ...base, userId: '00000000-0000-0000-0000-00000000a115' }, subtle)).not.toBe(h);
    expect(await hashBackupCode({ ...base, salt: generateSalt(nodeRandom) }, subtle)).not.toBe(h);
    expect(await hashBackupCode({ ...base, pepper: `${PEPPER}x` }, subtle)).not.toBe(h);
    expect(await hashBackupCode({ ...base, code: 'ABCDEFGHIK' }, subtle)).not.toBe(h);
  });

  it('rejects malformed codes, missing salt/user and short peppers', async () => {
    const base = { code: 'ABCDEFGHIJ', userId: USER, salt, pepper: PEPPER };
    await expect(hashBackupCode({ ...base, code: 'short' }, subtle)).rejects.toThrow();
    await expect(hashBackupCode({ ...base, userId: '' }, subtle)).rejects.toThrow();
    await expect(hashBackupCode({ ...base, salt: '' }, subtle)).rejects.toThrow();
    await expect(hashBackupCode({ ...base, pepper: 'x'.repeat(MIN_PEPPER_LENGTH - 1) }, subtle)).rejects.toThrow();
  });

  it('verifies the right code and rejects others', async () => {
    const input = { code: 'ABCDEFGHIJ', userId: USER, salt, pepper: PEPPER };
    const stored = await hashBackupCode(input, subtle);
    expect(await verifyBackupCodeHash({ ...input, code: 'abcde fghij' }, stored, subtle)).toBe(true);
    expect(await verifyBackupCodeHash({ ...input, code: 'ABCDEFGHIK' }, stored, subtle)).toBe(false);
    expect(await verifyBackupCodeHash({ ...input, code: 'nope' }, stored, subtle)).toBe(false);
  });

  it('round-trips a generated batch: each code matches exactly one stored hash', async () => {
    const codes = generateBackupCodes(10, nodeRandom);
    const batchSalt = generateSalt(nodeRandom);
    const stored = await Promise.all(codes.map((code) => hashBackupCode({ code, userId: USER, salt: batchSalt, pepper: PEPPER }, subtle)));
    expect(new Set(stored).size).toBe(10);
    const peppers = new Map([['p1', PEPPER]]);
    for (const code of codes) {
      const candidates = await candidateHashes(formatBackupCode(code).toLowerCase(), USER, [{ salt: batchSalt, pepper_id: 'p1' }], peppers, subtle);
      expect(candidates.filter((h) => stored.includes(h))).toHaveLength(1);
    }
  });

  it('computes one candidate per known (salt, pepper) batch and skips retired peppers', async () => {
    const peppers = new Map([['p1', PEPPER], ['p2', `${PEPPER}-new`]]);
    const batches = [
      { salt: 'a', pepper_id: 'p1' },
      { salt: 'b', pepper_id: 'p2' },
      { salt: 'c', pepper_id: 'retired' },
      { salt: 'a', pepper_id: 'p1' },
    ];
    const hashes = await candidateHashes('ABCDEFGHIJ', USER, batches, peppers, subtle);
    expect(hashes).toHaveLength(2);
  });

  it('generates 16-byte base64 salts', () => {
    const s = generateSalt(nodeRandom);
    expect(atob(s)).toHaveLength(16);
    expect(generateSalt(nodeRandom)).not.toBe(s);
  });

  it('compares in constant time with correct results', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('', '')).toBe(true);
  });
});

describe('pepper configuration', () => {
  const env = (vars: Record<string, string>) => (name: string) => vars[name];

  it('fails closed when the pepper is missing or short', () => {
    expect(resolvePeppers(env({}))).toBeNull();
    expect(resolvePeppers(env({ [PEPPER_ENV.current]: 'short' }))).toBeNull();
  });

  it('uses p1 as the default id and accepts a previous pepper for rotation', () => {
    const one = resolvePeppers(env({ [PEPPER_ENV.current]: PEPPER }));
    expect(one?.currentId).toBe('p1');
    expect([...one!.peppers.keys()]).toEqual(['p1']);

    const two = resolvePeppers(env({
      [PEPPER_ENV.current]: `${PEPPER}-2`,
      [PEPPER_ENV.currentId]: 'p2',
      [PEPPER_ENV.previous]: PEPPER,
      [PEPPER_ENV.previousId]: 'p1',
    }));
    expect(two?.currentId).toBe('p2');
    expect(two?.peppers.get('p1')).toBe(PEPPER);
    expect(two?.peppers.get('p2')).toBe(`${PEPPER}-2`);
  });

  it('ignores a previous pepper without its own id or with the current id', () => {
    const cfg = resolvePeppers(env({ [PEPPER_ENV.current]: PEPPER, [PEPPER_ENV.previous]: `${PEPPER}-old` }));
    expect(cfg?.peppers.size).toBe(1);
  });
});

describe('session assurance level (aal) check', () => {
  const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = (claims: Record<string, unknown>) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(claims)}.sig`;

  it('decodes the payload of a JWT (with or without "Bearer ")', () => {
    const token = jwt({ sub: USER, aal: 'aal2', name: 'Zoë' });
    expect(decodeJwtClaims(token)).toMatchObject({ sub: USER, aal: 'aal2', name: 'Zoë' });
    expect(decodeJwtClaims(`Bearer ${token}`)).toMatchObject({ sub: USER });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtClaims('not-a-jwt')).toBeNull();
    expect(decodeJwtClaims('a.%%%.c')).toBeNull();
    expect(decodeJwtClaims(`a.${Buffer.from('[1]').toString('base64url')}.c`)).toBeNull();
  });

  it('requires aal2 and the same subject', () => {
    expect(isAal2For(decodeJwtClaims(jwt({ sub: USER, aal: 'aal2' })), USER)).toBe(true);
    expect(isAal2For(decodeJwtClaims(jwt({ sub: USER, aal: 'aal1' })), USER)).toBe(false);
    expect(isAal2For(decodeJwtClaims(jwt({ sub: USER })), USER)).toBe(false);
    expect(isAal2For(decodeJwtClaims(jwt({ sub: 'someone-else', aal: 'aal2' })), USER)).toBe(false);
    expect(isAal2For(null, USER)).toBe(false);
  });
});
