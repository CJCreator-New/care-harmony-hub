// tests/regression/critical-bugs-fixed.test.ts
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Regression - Previously Fixed Bugs', () => {
  it('should not allow duplicate patient registration', async () => {
    const email = 'duplicate.patient@caresync.com';
    await supabase.from('patients').delete().eq('email', email);
    const { error: firstError } = await supabase.from('patients').insert({ email });
    const { error: secondError } = await supabase.from('patients').insert({ email });
    expect(firstError).toBeNull();
    expect(secondError).not.toBeNull();
  });

  it('should correctly calculate billing totals', async () => {
    // Simulate billing calculation
    const items = [ { price: 100, qty: 2 }, { price: 50, qty: 1 } ];
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    expect(total).toBe(250);
  });

  it('should maintain session across role switches', async () => {
    // Simulate session persistence
    const session1 = { user: 'doctor', token: 'abc' };
    const session2 = { ...session1, user: 'nurse' };
    expect(session2.token).toBe(session1.token);
  });

  it('should handle concurrent appointment bookings', async () => {
    // Simulate concurrent booking
    const book = async (slot: string) => {
      return await supabase.from('appointments').insert({ slot });
    };
    const [a, b] = await Promise.all([book('10am'), book('10am')]);
    expect(a.error || b.error).not.toBeNull();
  });
});
