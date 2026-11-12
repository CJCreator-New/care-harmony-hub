/**
 * S0-03 (DB-01, SECF-10, FUNC-01): unit tests for the pure onboarding logic
 * used by supabase/functions/register-patient and create-hospital-admin.
 *
 * Behaviour tests of the shared module. The database side (tenant derived
 * from a verified record, throttling, grants) is tested on PostgreSQL by
 * supabase/pending-migrations/tests/s0-03/.
 */
import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  PATIENT_NOT_VERIFIED_MESSAGE,
  clientAddress,
  hashClientKey,
  interpretClaimStatus,
  isPlausibleBirthDate,
  mapOnboardingRpcError,
  normalizeMrn,
  parsePatientRegistration,
} from '../../supabase/functions/_shared/onboarding.ts';

const NOW = new Date('2026-11-05T12:00:00Z');
const valid = {
  email: '  Ada@Example.TEST ',
  password: 'correct horse 1!',
  hospitalCode: '  LIC-A  ',
  mrn: ' mrn 0000 0001 ',
  dateOfBirth: '1980-01-02',
  lastName: '  Love   lace ',
};

describe('parsePatientRegistration', () => {
  it('normalises a valid body', () => {
    const r = parsePatientRegistration(valid, NOW);
    expect(r).toEqual({
      ok: true,
      value: {
        email: 'ada@example.test',
        password: 'correct horse 1!',
        hospitalCode: 'LIC-A',
        mrn: 'MRN00000001',
        dateOfBirth: '1980-01-02',
        lastName: 'Love lace',
      },
    });
  });

  it('never passes a client-supplied hospital id or user id through', () => {
    const r = parsePatientRegistration(
      { ...valid, hospitalId: '00000000-0000-0000-0000-0000000000b1', hospital_id: 'x', userId: 'y', role: 'admin' },
      NOW,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Object.keys(r.value).sort()).toEqual(
        ['dateOfBirth', 'email', 'hospitalCode', 'lastName', 'mrn', 'password'],
      );
    }
  });

  it.each([
    ['email', { email: 'not-an-email' }],
    ['password', { password: 'short' }],
    ['password', { password: 'x'.repeat(73) }],
    ['hospitalCode', { hospitalCode: '   ' }],
    ['mrn', { mrn: '  ' }],
    ['dateOfBirth', { dateOfBirth: '1980-02-30' }],
    ['dateOfBirth', { dateOfBirth: '2027-01-01' }],
    ['dateOfBirth', { dateOfBirth: '02/01/1980' }],
    ['lastName', { lastName: '' }],
  ])('rejects an invalid %s', (field, patch) => {
    const r = parsePatientRegistration({ ...valid, ...patch }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toContain(field);
  });

  it('rejects non-object bodies and non-string fields', () => {
    expect(parsePatientRegistration(null, NOW).ok).toBe(false);
    expect(parsePatientRegistration([valid], NOW).ok).toBe(false);
    expect(parsePatientRegistration({ ...valid, mrn: 1 }, NOW).ok).toBe(false);
  });
});

describe('isPlausibleBirthDate', () => {
  it('accepts today and rejects tomorrow and impossible ages', () => {
    expect(isPlausibleBirthDate('2026-11-05', NOW)).toBe(true);
    expect(isPlausibleBirthDate('2026-11-06', NOW)).toBe(false);
    expect(isPlausibleBirthDate('1890-01-01', NOW)).toBe(false);
    expect(isPlausibleBirthDate('2000-02-29', NOW)).toBe(true);
    expect(isPlausibleBirthDate('2001-02-29', NOW)).toBe(false);
  });
});

describe('normalizeMrn', () => {
  it('matches the SQL rule (no whitespace, upper case)', () => {
    expect(normalizeMrn(' mrn\t0000 0001\n')).toBe('MRN00000001');
  });
});

describe('client key', () => {
  it('uses the first X-Forwarded-For hop, then fallbacks', () => {
    expect(clientAddress(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(clientAddress(new Headers({ 'cf-connecting-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientAddress(new Headers())).toBe('unknown');
  });

  it('hashes the address (no raw IP stored) deterministically', async () => {
    const subtle = webcrypto.subtle as unknown as SubtleCrypto;
    const a = await hashClientKey('203.0.113.7', subtle);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain('203');
    expect(await hashClientKey('203.0.113.7', subtle)).toBe(a);
    expect(await hashClientKey('203.0.113.8', subtle)).not.toBe(a);
  });
});

describe('interpretClaimStatus', () => {
  it('fails closed on anything unexpected', () => {
    expect(interpretClaimStatus({ status: 'ok' })).toEqual({ status: 'ok' });
    expect(interpretClaimStatus({ status: 'OK' })).toEqual({ status: 'invalid' });
    expect(interpretClaimStatus(null)).toEqual({ status: 'invalid' });
    expect(interpretClaimStatus('ok')).toEqual({ status: 'invalid' });
    expect(interpretClaimStatus({ status: 'locked', retry_after_seconds: 12.2 })).toEqual({ status: 'locked', retry_after_seconds: 13 });
    expect(interpretClaimStatus({ status: 'locked' })).toEqual({ status: 'locked', retry_after_seconds: 3600 });
  });
});

describe('mapOnboardingRpcError', () => {
  it('maps SQLSTATEs from the onboarding RPCs to safe HTTP responses', () => {
    expect(mapOnboardingRpcError({ code: '42501' }, 'hospital').status).toBe(409);
    expect(mapOnboardingRpcError({ code: '23505' }, 'hospital').error).toMatch(/license number/);
    expect(mapOnboardingRpcError({ code: 'P0002' }, 'patient')).toEqual({ status: 400, error: PATIENT_NOT_VERIFIED_MESSAGE });
    expect(mapOnboardingRpcError({ code: '22023' }, 'patient').status).toBe(400);
  });

  it('does not leak database messages for unknown errors', () => {
    const r = mapOnboardingRpcError({ code: 'XX000', message: 'relation "roles" does not exist' }, 'patient');
    expect(r).toEqual({ status: 500, error: 'Registration failed' });
    expect(mapOnboardingRpcError(null, 'hospital')).toEqual({ status: 500, error: 'Failed to create hospital' });
  });
});
