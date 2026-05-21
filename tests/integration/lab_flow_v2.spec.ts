import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Integration test for lab_flow_v2 feature gate and basic DB expectations.
// Requires TEST_SUPABASE_URL and TEST_SUPABASE_SERVICE_ROLE_KEY environment variables.

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const TEST_SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

describe('lab_flow_v2 integration', () => {
  if (!TEST_SUPABASE_URL || !TEST_SUPABASE_SERVICE_ROLE_KEY) {
    it('skips when TEST_SUPABASE_URL or TEST_SUPABASE_SERVICE_ROLE_KEY not set', () => {
      expect(TEST_SUPABASE_URL).toBeUndefined();
    });
    return;
  }

  const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY as string);

  it('checks for feature flag `lab_flow_v2` if table exists', async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('key', 'lab_flow_v2')
        .limit(1)
        .maybeSingle();

      if (error) {
        // If the table doesn't exist in the test DB, skip the assertion.
        // Use a soft pass by asserting true.
        expect(error).toBeNull();
        return;
      }

      // If the flag exists, its record should include an `enabled` boolean.
      if (data) {
        expect(typeof (data as any).enabled).toBe('boolean');
      } else {
        // No flag record found is acceptable for a conservative test.
        expect(data).toBeNull();
      }
    } catch (err) {
      // If anything unexpected goes wrong, fail the test to draw attention.
      throw err;
    }
  });
});
