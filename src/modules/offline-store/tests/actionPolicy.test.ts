import { describe, expect, it } from 'vitest';
import {
  createMemoryOfflineAdapter,
  createOfflineSyncStore,
  isOfflineReplayAllowed,
  normalizeOfflineTable,
  OfflineActionBlockedError,
  assertOnlineForCriticalAction,
} from '../index';

describe('ADR-0013 offline action policy', () => {
  it('whitelists low-risk bedside writes, including the legacy vitals alias', () => {
    expect(isOfflineReplayAllowed('vital_signs')).toBe(true);
    expect(isOfflineReplayAllowed('nursing_notes')).toBe(true);
    expect(normalizeOfflineTable('vitals')).toBe('vital_signs');
    expect(isOfflineReplayAllowed('vitals')).toBe(true);
    expect(isOfflineReplayAllowed('invoices')).toBe(false);
    expect(isOfflineReplayAllowed('prescription_workflows')).toBe(false);
  });

  it('passes critical actions through while online', () => {
    expect(() => assertOnlineForCriticalAction('medication:dispense', true)).not.toThrow();
    expect(() => assertOnlineForCriticalAction('discharge:complete', true)).not.toThrow();
  });

  it('fails closed for dispensing, discharge release, and billing while offline', () => {
    for (const action of [
      'medication:dispense',
      'floor_stock:stat_override',
      'discharge:complete',
      'billing:finalize',
    ] as const) {
      expect(() => assertOnlineForCriticalAction(action, false)).toThrow(OfflineActionBlockedError);
    }

    expect(() => assertOnlineForCriticalAction('discharge:complete', false)).toThrow(
      /requires a network connection for critical clinical safety validation/
    );
  });

  it('queues offline vitals with the device timestamp', async () => {
    const store = createOfflineSyncStore({
      adapter: createMemoryOfflineAdapter(),
      executor: async () => false,
      initialOnline: false,
    });

    await store.open('user-1');
    store.queueAction('create', 'vital_signs', {
      patient_id: 'patient-1',
      heart_rate: 88,
      client_recorded_at: '2026-11-13T09:00:00.000Z',
    });

    const pending = store.getSnapshot().pendingActions;
    expect(pending).toHaveLength(1);
    expect(pending[0].table).toBe('vital_signs');
    expect(pending[0].data.client_recorded_at).toBe('2026-11-13T09:00:00.000Z');
    expect(pending[0].timestamp).toBeGreaterThan(0);
  });
});
