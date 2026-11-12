/**
 * SECF-06: the offline-sync hook must not write PHI to web storage.
 * The store is backed by the in-memory adapter (jsdom has no IndexedDB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const auth = vi.hoisted(() => ({ user: { id: 'nurse-1' } as { id: string } | null }));
const shared = vi.hoisted(() => ({ adapter: null as unknown, executor: null as unknown }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: auth.user }),
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));

vi.mock('@/modules/offline-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/offline-store')>();
  return {
    ...actual,
    getOfflineSyncStore: (executor: import('@/modules/offline-store').ActionExecutor) => {
      const adapter = actual.createMemoryOfflineAdapter();
      const spy = vi.fn(executor);
      shared.adapter = adapter;
      shared.executor = spy;
      const store = actual.createOfflineSyncStore({
        adapter,
        executor: spy,
        legacyStorage: window.localStorage,
        initialOnline: false,
      });
      store.attachNetworkListeners(window);
      return store;
    },
  };
});

import { useOfflineSync } from '@/hooks/useOfflineSync';

const PHI_FIELD_NAMES = ['patient_id', 'systolic_bp', 'chief_complaint', 'clinical_notes', 'first_name'];

describe('useOfflineSync (SECF-06)', () => {
  beforeEach(() => {
    auth.user = { id: 'nurse-1' };
  });

  it('queues offline, replays online, shares state across instances and keeps PHI out of web storage', async () => {
    window.localStorage.setItem(
      'care-harmony-offline-cache',
      JSON.stringify({ pendingActions: [{ type: 'create', table: 'vitals', data: { first_name: 'Legacy' }, timestamp: 1 }] }),
    );

    const a = renderHook(() => useOfflineSync());
    const b = renderHook(() => useOfflineSync());
    await waitFor(() => expect(a.result.current.pendingActionCount).toBe(1)); // migrated legacy action
    expect(window.localStorage.getItem('care-harmony-offline-cache')).toBeNull();

    act(() => {
      a.result.current.queueAction('create', 'vital_signs', {
        patient_id: 'pt-1',
        systolic_bp: 120,
        chief_complaint: 'headache',
      });
      a.result.current.queueAction('update', 'consultations', { id: 'c1', clinical_notes: 'x' });
    });
    expect(a.result.current.pendingActionCount).toBe(3);
    expect(b.result.current.pendingActionCount).toBe(3); // one shared store

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)!;
      const value = `${key}=${window.localStorage.getItem(key)}`;
      for (const field of PHI_FIELD_NAMES) expect(value).not.toContain(field);
    }
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)!;
      const value = `${key}=${window.sessionStorage.getItem(key)}`;
      for (const field of PHI_FIELD_NAMES) expect(value).not.toContain(field);
    }

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(b.result.current.pendingActionCount).toBe(0));
    expect(shared.executor).toHaveBeenCalledTimes(3);
    expect(a.result.current.isOnline).toBe(true);
    expect(a.result.current.cache.syncStatus).toBe('synced');
  });

  it('wipes the encrypted store when the user signs out', async () => {
    const { result, rerender } = renderHook(() => useOfflineSync());
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    act(() => {
      result.current.queueAction('create', 'vital_signs', { patient_id: 'pt-1' });
    });
    await waitFor(() =>
      expect((shared.adapter as { peek(): { records: unknown[] } }).peek().records.length).toBeGreaterThan(0),
    );

    auth.user = null;
    rerender();
    await waitFor(() => expect(result.current.pendingActionCount).toBe(0));
    await waitFor(() =>
      expect((shared.adapter as { peek(): unknown }).peek()).toEqual({ key: undefined, records: [] }),
    );
  });
});
