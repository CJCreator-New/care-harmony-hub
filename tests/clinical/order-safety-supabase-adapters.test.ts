/**
 * Supabase adapters for the order-safety engine, with a mocked Supabase client.
 *
 * - loadActivePrescriptionMedications: encrypted medication names are decrypted
 *   through phi-crypto with a patient resource context, and every failure mode
 *   becomes a gap (fail closed), never an exception or a silently dropped drug.
 * - writeIntakeToPatientRecord: an UPDATE that row-level security filters out
 *   (0 rows, no error) is reported as not saved.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invoke, from, tables } = vi.hoisted(() => {
  const tables: Record<string, { select?: any; update?: any }> = {};
  const invoke = vi.fn();
  const chain = (result: any) => {
    const c: any = {};
    for (const m of ['select', 'eq', 'neq', 'gte', 'not', 'maybeSingle', 'update']) {
      c[m] = vi.fn(() => c);
    }
    c.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
    return c;
  };
  const from = vi.fn((table: string) => {
    const t = tables[table] ?? {};
    // A read chain until .update() is called, then the update chain.
    const read = chain(t.select ?? { data: null, error: null });
    read.update = vi.fn((patch: unknown) => {
      const upd = chain(t.update ?? { data: [], error: null });
      (upd as any).patch = patch;
      lastUpdate.chain = upd;
      lastUpdate.patch = patch;
      return upd;
    });
    return read;
  });
  const lastUpdate: { chain?: any; patch?: unknown } = {};
  (from as any).lastUpdate = lastUpdate;
  return { invoke, from, tables };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from, functions: { invoke } },
}));

import {
  loadActivePrescriptionMedications,
  writeIntakeToPatientRecord,
} from '@/modules/order-safety/adapters/SupabaseAdapters';

const enc = (ciphertext: string) => ({ encrypted: ciphertext, iv: 'iv', keyVersion: 'v1' });
const rxRows = (...items: any[]) => ({ data: [{ id: 'rx-1', status: 'pending', prescription_items: items }], error: null });

beforeEach(() => {
  invoke.mockReset();
  from.mockClear();
  for (const k of Object.keys(tables)) delete tables[k];
});

describe('loadActivePrescriptionMedications (phi-crypto decrypt)', () => {
  it('decrypts encrypted names in one call with the patient as resource context', async () => {
    tables.prescriptions = {
      select: rxRows(
        { medication_name: 'Aspirin' },
        { medication_name: '__ENCRYPTED__v1', encryption_metadata: { medication_name: enc('c1') } }
      ),
    };
    invoke.mockResolvedValue({ data: { results: ['Warfarin'] }, error: null });

    const out = await loadActivePrescriptionMedications('patient-1', 'hosp-1');

    expect(out.gaps).toEqual([]);
    expect(out.medications.map((m) => m.drugName).sort()).toEqual(['Aspirin', 'Warfarin']);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('phi-crypto', {
      body: { action: 'decrypt', items: [enc('c1')], resourceType: 'patients', resourceId: 'patient-1' },
    });
  });

  it('a phi-crypto error (403 / CORS / network) becomes a gap, not an exception or a bogus drug', async () => {
    tables.prescriptions = {
      select: rxRows(
        { medication_name: 'Aspirin' },
        { medication_name: '__ENCRYPTED__v1', encryption_metadata: { medication_name: enc('c1') } },
        { medication_name: '__ENCRYPTED__v1', encryption_metadata: { medication_name: enc('c2') } }
      ),
    };
    invoke.mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', message: 'Failed to send a request' } });

    const out = await loadActivePrescriptionMedications('patient-1', 'hosp-1');

    expect(out.medications.map((m) => m.drugName)).toEqual(['Aspirin']);
    expect(out.gaps).toEqual(['2 existing prescription item(s) could not be decrypted for interaction screening']);
  });

  it('a thrown invoke becomes a gap', async () => {
    tables.prescriptions = {
      select: rxRows({ medication_name: '__ENCRYPTED__v1', encryption_metadata: { medication_name: enc('c1') } }),
    };
    invoke.mockRejectedValue(new TypeError('Failed to fetch'));

    const out = await loadActivePrescriptionMedications('patient-1', 'hosp-1');

    expect(out.medications).toEqual([]);
    expect(out.gaps).toHaveLength(1);
  });

  it('a short or prefixed response leaves gaps for the missing items', async () => {
    tables.prescriptions = {
      select: rxRows(
        { medication_name: '__ENCRYPTED__v1', encryption_metadata: { medication_name: enc('c1') } },
        { medication_name: '__ENCRYPTED__v1', encryption_metadata: { medication_name: enc('c2') } },
        { medication_name: '__ENCRYPTED__v1' } // no metadata at all
      ),
    };
    // decryptFields rejects a length mismatch outside test mode; here it echoes
    // ciphertext, which must not be taken for a drug name either.
    invoke.mockResolvedValue({ data: { results: ['Warfarin'] }, error: null });

    const out = await loadActivePrescriptionMedications('patient-1', 'hosp-1');

    expect(out.medications).toEqual([]);
    expect(out.gaps).toEqual(['3 existing prescription item(s) could not be decrypted for interaction screening']);
  });

  it('a prescriptions query error is a gap', async () => {
    tables.prescriptions = { select: { data: null, error: { message: 'permission denied' } } };
    const out = await loadActivePrescriptionMedications('patient-1', 'hosp-1');
    expect(out).toEqual({ medications: [], gaps: ['existing prescriptions could not be loaded'] });
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('writeIntakeToPatientRecord', () => {
  const lastUpdate = (from as any).lastUpdate as { chain?: any; patch?: any };

  it('reports success only when a row was updated', async () => {
    tables.patients = {
      select: { data: { allergies: ['Latex'], current_medications: [] }, error: null },
      update: { data: [{ id: 'patient-1' }], error: null },
    };

    const out = await writeIntakeToPatientRecord('patient-1', { allergies: 'Penicillin' });

    expect(out).toEqual({ ok: true, changed: true });
    expect(lastUpdate.patch).toEqual({ allergies: ['Latex', 'Penicillin'] });
    expect(lastUpdate.chain.eq).toHaveBeenCalledWith('id', 'patient-1');
    expect(lastUpdate.chain.select).toHaveBeenCalledWith('id');
  });

  it('an UPDATE filtered out by RLS (0 rows, no error) is reported as not saved', async () => {
    tables.patients = {
      select: { data: { allergies: [], current_medications: [] }, error: null },
      update: { data: [], error: null },
    };

    const out = await writeIntakeToPatientRecord('patient-1', { allergies: 'Penicillin' });

    expect(out.ok).toBe(false);
    expect(out.changed).toBe(false);
    expect(out.error).toMatch(/not updated/);
  });

  it('an UPDATE error is reported', async () => {
    tables.patients = {
      select: { data: { allergies: [], current_medications: [] }, error: null },
      update: { data: null, error: { message: 'PHI data must be encrypted before storage' } },
    };

    const out = await writeIntakeToPatientRecord('patient-1', { currentMedications: 'Metformin 500mg' });

    expect(out).toEqual({ ok: false, changed: false, error: 'PHI data must be encrypted before storage' });
  });

  it('nothing new to record does not write', async () => {
    tables.patients = { select: { data: { allergies: ['Penicillin'], current_medications: [] }, error: null } };
    lastUpdate.patch = undefined;

    const out = await writeIntakeToPatientRecord('patient-1', { allergies: 'penicillin' });

    expect(out).toEqual({ ok: true, changed: false });
    expect(lastUpdate.patch).toBeUndefined();
  });
});
