import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

const RELATION_MISSING = '42P01';

describe('P0 DB/RLS Gate Verification', () => {
  it('verifies patient_consents relation exists in target database', async () => {
    const { error } = await supabase
      .from('patient_consents')
      .select('id')
      .limit(1);

    // Relation must exist; RLS/auth errors are acceptable for anon checks.
    expect(error?.code).not.toBe(RELATION_MISSING);
  });

  it('verifies anonymous queries cannot expose null-scoped profiles', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, hospital_id')
      .is('hospital_id', null)
      .limit(10);

    // For anon context, either blocked by policy or returns no rows.
    const blocked = error !== null;
    const empty = Array.isArray(data) && data.length === 0;
    expect(blocked || empty).toBe(true);
  });

  it('verifies two_factor_secrets relation exists and is not openly readable', async () => {
    const { data, error } = await supabase
      .from('two_factor_secrets')
      .select('id, secret_version, backup_codes_salt')
      .limit(10);

    expect(error?.code).not.toBe(RELATION_MISSING);

    // In anon context this should be denied or empty.
    const blocked = error !== null;
    const empty = Array.isArray(data) && data.length === 0;
    expect(blocked || empty).toBe(true);
  });
});

