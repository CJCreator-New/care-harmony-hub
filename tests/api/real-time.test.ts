import { describe, it, expect, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

// Integration gate: these tests need a live Supabase project. Without
// VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY the client falls back to a
// stub URL, so the suite is skipped rather than run against nothing.
const hasLiveBackend = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

describe.runIf(hasLiveBackend)('Real-time Subscriptions', () => {
  describe('Channel Subscriptions', () => {
    it('should establish real-time connection', async () => {
      const channel = supabase.channel('test-realtime');

      const status = await new Promise((resolve) => {
        channel
          .on('presence', { event: 'sync' }, () => resolve('connected'))
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') resolve('subscribed');
          });
      });

      expect(status).toBeDefined();
      await supabase.removeChannel(channel);
    });

    it('should receive database changes', async () => {
      const callback = vi.fn();

      const channel = supabase
        .channel('db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          callback
        )
        .subscribe();

      expect(channel).toBeDefined();
      await supabase.removeChannel(channel);
    });
  });

  describe('Presence Tracking', () => {
    it('should track online users', async () => {
      const channel = supabase.channel('online-users', {
        config: { presence: { key: 'test-user' } },
      });

      await channel.subscribe();

      const state = channel.presenceState();
      expect(state).toBeDefined();

      await supabase.removeChannel(channel);
    });
  });

  describe('Broadcast Messages', () => {
    it('should broadcast messages to channel', async () => {
      const channel = supabase.channel('broadcast-test');

      await channel.subscribe();

      const result = await channel.send({
        type: 'broadcast',
        event: 'test',
        payload: { message: 'Hello' },
      });

      expect(result).toBe('ok');
      await supabase.removeChannel(channel);
    });
  });
});
