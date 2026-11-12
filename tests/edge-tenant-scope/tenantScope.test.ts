/**
 * S0-06 (EDGE-07/08/13/14/22): behaviour tests for the tenant-scoping rules shared by
 * the service-role edge functions (supabase/functions/_shared/tenantScope.ts).
 *
 * getAuthorizedActor (authorize.ts) delegates its role/hospital decision to
 * decideActorAccess, so the EDGE-14 acceptance criteria are tested here.
 * The async lookups are run against a fake query client with two hospitals.
 */
import { describe, it, expect } from 'vitest';
import {
  INSUFFICIENT_ROLE_ERROR,
  NO_HOSPITAL_ERROR,
  assertPatientInHospital,
  checkBodyHospital,
  clampInt,
  decideActorAccess,
  findInHospital,
  findProfileInHospital,
  hasAnyRole,
  isActorIdentity,
  isUuid,
  pickAllowedFields,
  rolesForHospital,
  rowInHospital,
  scopeRecordData,
  type TenantDb,
} from '../../supabase/functions/_shared/tenantScope';

const HOSP_A = '11111111-1111-4111-8111-111111111111';
const HOSP_B = '22222222-2222-4222-8222-222222222222';
const PATIENT_A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const PATIENT_B = 'bbbbbbbb-0000-4000-8000-00000000000b';
const PROFILE_A = 'aaaaaaaa-1111-4000-8000-00000000000a';
const USER_A = 'aaaaaaaa-2222-4000-8000-00000000000a';
const PROFILE_B = 'bbbbbbbb-1111-4000-8000-00000000000b';

type Row = Record<string, unknown>;

/** Minimal fake of the PostgREST builder: from().select().eq()...maybeSingle(). */
function fakeDb(tables: Record<string, Row[]>, opts: { failWith?: unknown; ignoreFilters?: boolean } = {}) {
  const calls: Array<{ table: string; select: string; filters: Array<[string, unknown]> }> = [];
  const db: TenantDb = {
    from(table: string) {
      return {
        select(select: string) {
          const call = { table, select, filters: [] as Array<[string, unknown]> };
          calls.push(call);
          const builder = {
            eq(column: string, value: unknown) {
              call.filters.push([column, value]);
              return builder;
            },
            maybeSingle() {
              if (opts.failWith) return Promise.resolve({ data: null, error: opts.failWith });
              const rows = (tables[table] ?? []).filter(
                (r) => opts.ignoreFilters || call.filters.every(([c, v]) => r[c] === v),
              );
              return Promise.resolve({ data: rows[0] ?? null, error: null });
            },
          };
          return builder;
        },
      };
    },
  };
  return { db, calls };
}

const tables = {
  patients: [
    { id: PATIENT_A, hospital_id: HOSP_A },
    { id: PATIENT_B, hospital_id: HOSP_B },
  ],
  profiles: [
    { id: PROFILE_A, user_id: USER_A, hospital_id: HOSP_A },
    { id: PROFILE_B, user_id: 'bbbbbbbb-2222-4000-8000-00000000000b', hospital_id: HOSP_B },
  ],
};

describe('rolesForHospital / decideActorAccess (EDGE-14)', () => {
  it('fails closed when the profile has no hospital', () => {
    const d = decideActorAccess({
      profileHospitalId: null,
      roleRows: [{ role: 'admin', hospital_id: null }],
      allowedRoles: ['admin'],
    });
    expect(d).toEqual({ ok: false, status: 403, error: NO_HOSPITAL_ERROR });
  });

  it('does not match a role granted for another hospital', () => {
    const d = decideActorAccess({
      profileHospitalId: HOSP_B,
      roleRows: [{ role: 'admin', hospital_id: HOSP_A }],
      allowedRoles: ['admin'],
    });
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error).toBe(INSUFFICIENT_ROLE_ERROR);
  });

  it('matches roles for the profile hospital and legacy NULL-hospital rows only', () => {
    const rows = [
      { role: 'admin', hospital_id: HOSP_A },
      { role: 'doctor', hospital_id: HOSP_B },
      { role: 'nurse', hospital_id: null },
      { role: 'nurse', hospital_id: HOSP_B },
    ];
    expect(rolesForHospital(rows, HOSP_B)).toEqual(['doctor', 'nurse']);
    expect(rolesForHospital(rows, HOSP_B, false)).toEqual(['doctor', 'nurse']);
    expect(rolesForHospital([{ role: 'nurse', hospital_id: null }], HOSP_B, false)).toEqual([]);
    const d = decideActorAccess({ profileHospitalId: HOSP_B, roleRows: rows, allowedRoles: ['admin', 'doctor'] });
    expect(d).toEqual({ ok: true, assignedRoles: ['doctor', 'nurse'], matchedRoles: ['doctor'] });
  });

  it('never echoes the caller roles in the denial', () => {
    const d = decideActorAccess({
      profileHospitalId: HOSP_A,
      roleRows: [{ role: 'receptionist', hospital_id: HOSP_A }],
      allowedRoles: ['admin'],
    });
    expect(JSON.stringify(d)).not.toContain('receptionist');
  });

  it('ignores malformed role rows', () => {
    expect(rolesForHospital([{ role: null, hospital_id: HOSP_A }, { role: '', hospital_id: HOSP_A }], HOSP_A)).toEqual([]);
    expect(rolesForHospital(undefined, HOSP_A)).toEqual([]);
    expect(rolesForHospital([{ role: 'admin', hospital_id: HOSP_A }], '')).toEqual([]);
  });
});

describe('identity and role helpers', () => {
  const actor = { userId: USER_A, profileId: PROFILE_A, hospitalId: HOSP_A, assignedRoles: ['doctor'] };

  it('isActorIdentity accepts the user id or profile id only', () => {
    expect(isActorIdentity(actor, USER_A)).toBe(true);
    expect(isActorIdentity(actor, PROFILE_A)).toBe(true);
    expect(isActorIdentity(actor, PROFILE_B)).toBe(false);
    expect(isActorIdentity(actor, '')).toBe(false);
    expect(isActorIdentity(actor, undefined)).toBe(false);
    expect(isActorIdentity({ userId: USER_A, profileId: null }, null)).toBe(false);
  });

  it('hasAnyRole', () => {
    expect(hasAnyRole(actor, ['doctor', 'admin'])).toBe(true);
    expect(hasAnyRole(actor, ['pharmacist'])).toBe(false);
  });
});

describe('body checks', () => {
  it('checkBodyHospital allows absent or same hospital, refuses another', () => {
    expect(checkBodyHospital(HOSP_A, undefined).ok).toBe(true);
    expect(checkBodyHospital(HOSP_A, null).ok).toBe(true);
    expect(checkBodyHospital(HOSP_A, '').ok).toBe(true);
    expect(checkBodyHospital(HOSP_A, HOSP_A).ok).toBe(true);
    expect(checkBodyHospital(HOSP_A, HOSP_B)).toEqual({ ok: false, status: 403, error: 'Forbidden - hospital scope mismatch' });
  });

  it('rowInHospital requires an exact hospital match', () => {
    expect(rowInHospital({ hospital_id: HOSP_A }, HOSP_A)).toBe(true);
    expect(rowInHospital({ hospital_id: HOSP_B }, HOSP_A)).toBe(false);
    expect(rowInHospital({}, HOSP_A)).toBe(false);
    expect(rowInHospital(null, HOSP_A)).toBe(false);
    expect(rowInHospital({ hospital_id: null }, '')).toBe(false);
  });

  it('pickAllowedFields rejects server-owned columns (EDGE-08 mass assignment)', () => {
    const allowed = ['description', 'status'];
    expect(pickAllowedFields({ description: 'x', status: undefined }, allowed)).toEqual({
      ok: true,
      value: { description: 'x' },
    });
    const bad = pickAllowedFields({ description: 'x', hospital_id: HOSP_B, pharmacist_id: PROFILE_B }, allowed);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.status).toBe(400);
      expect(bad.fields.sort()).toEqual(['hospital_id', 'pharmacist_id']);
    }
    expect(pickAllowedFields(null, allowed).ok).toBe(false);
    expect(pickAllowedFields([1], allowed).ok).toBe(false);
  });

  it('clampInt bounds caller-chosen limits', () => {
    expect(clampInt(undefined, { min: 1, max: 50, fallback: 10 })).toBe(10);
    expect(clampInt('abc', { min: 1, max: 50, fallback: 10 })).toBe(10);
    expect(clampInt(1e9, { min: 1, max: 50, fallback: 10 })).toBe(50);
    expect(clampInt(-4, { min: 1, max: 50, fallback: 10 })).toBe(1);
    expect(clampInt('7.9', { min: 1, max: 50, fallback: 10 })).toBe(7);
  });

  it('isUuid', () => {
    expect(isUuid(PATIENT_A)).toBe(true);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(42)).toBe(false);
  });

  it('scopeRecordData pins the nested record to the actor hospital (EDGE-07)', () => {
    expect(scopeRecordData({ patient_id: PATIENT_A }, HOSP_A)).toEqual({
      ok: true,
      value: { patient_id: PATIENT_A, hospital_id: HOSP_A },
    });
    expect(scopeRecordData(undefined, HOSP_A)).toEqual({ ok: true, value: { hospital_id: HOSP_A } });
    expect(scopeRecordData({ hospital_id: HOSP_B, patient_id: PATIENT_B }, HOSP_A)).toEqual({
      ok: false,
      status: 403,
      error: 'Forbidden - hospital scope mismatch',
    });
    expect(scopeRecordData('x', HOSP_A).ok).toBe(false);
  });
});

describe('database lookups pinned to the caller hospital (EDGE-13)', () => {
  it('assertPatientInHospital accepts own-tenant and refuses foreign-tenant patients', async () => {
    const { db, calls } = fakeDb(tables);
    expect(await assertPatientInHospital(db, PATIENT_A, HOSP_A)).toBe(true);
    expect(await assertPatientInHospital(db, PATIENT_B, HOSP_A)).toBe(false);
    expect(calls[0].filters).toEqual([
      ['id', PATIENT_A],
      ['hospital_id', HOSP_A],
    ]);
  });

  it('refuses non-uuid ids without querying', async () => {
    const { db, calls } = fakeDb(tables);
    expect(await assertPatientInHospital(db, 'x', HOSP_A)).toBe(false);
    expect(await assertPatientInHospital(db, undefined, HOSP_A)).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('treats query errors as not found (fail closed)', async () => {
    const { db } = fakeDb(tables, { failWith: { message: 'boom' } });
    expect(await assertPatientInHospital(db, PATIENT_A, HOSP_A)).toBe(false);
  });

  it('re-checks hospital_id on the returned row even if the query ignored the filter', async () => {
    const { db } = fakeDb({ patients: [{ id: PATIENT_B, hospital_id: HOSP_B }] }, { ignoreFilters: true });
    expect(await findInHospital(db, 'patients', PATIENT_B, HOSP_A)).toBeNull();
  });

  it('always selects hospital_id', async () => {
    const { db, calls } = fakeDb(tables);
    await findInHospital(db, 'patients', PATIENT_A, HOSP_A, { select: 'id' });
    expect(calls[0].select).toBe('id, hospital_id');
  });

  it('findProfileInHospital resolves by profile id or user id, same hospital only', async () => {
    const { db } = fakeDb(tables);
    expect((await findProfileInHospital(db, PROFILE_A, HOSP_A))?.id).toBe(PROFILE_A);
    expect((await findProfileInHospital(db, USER_A, HOSP_A))?.id).toBe(PROFILE_A);
    expect(await findProfileInHospital(db, PROFILE_B, HOSP_A)).toBeNull();
    expect(await findProfileInHospital(db, USER_A, HOSP_B)).toBeNull();
  });
});
