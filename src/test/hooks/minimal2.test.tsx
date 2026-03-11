import { vi, describe, it, expect } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), functions: { invoke: vi.fn() }, channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() }), removeChannel: vi.fn() },
}));

describe('minimal with mock', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
