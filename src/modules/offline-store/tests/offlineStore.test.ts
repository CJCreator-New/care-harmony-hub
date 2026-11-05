/**
 * Deep Module Test Suite: `offline-store` (SECF-06)
 *
 * Exercises the encryption + queue logic through the public entry point with
 * the in-memory adapter. The raw IndexedDB adapter itself is NOT exercised
 * here (jsdom has no IndexedDB and `fake-indexeddb` is not installed).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createOfflineSyncStore,
  createMemoryOfflineAdapter,
  LEGACY_OFFLINE_STORAGE_KEYS,
  MAX_PENDING_ACTIONS,
  type ActionExecutor,
  type OfflineSyncStoreOptions,
} from '../index';

const PHI_FIELD_NAMES = [
  'first_name',
  'last_name',
  'date_of_birth',
  'patient_id',
  'systolic_bp',
  'chief_complaint',
  'clinical_notes',
  'allergies',
];

const vitalsPayload = {
  patient_id: 'pt-123',
  first_name: 'Jane',
  last_name: 'Doe',
  systolic_bp: 141,
  chief_complaint: 'Chest pain radiating to left arm',
};

function setup(overrides: Partial<OfflineSyncStoreOptions> = {}) {
  const adapter = createMemoryOfflineAdapter();
  const executor = vi.fn<ActionExecutor>(async () => true);
  const scheduleRetry = vi.fn();
  const store = createOfflineSyncStore({
    adapter,
    executor,
    legacyStorage: window.localStorage,
    initialOnline: false,
    scheduleRetry,
    ...overrides,
  });
  return { adapter, executor, scheduleRetry, store };
}

function ciphertextText(adapter: ReturnType<typeof createMemoryOfflineAdapter>): string {
  return adapter
    .peek()
    .records.map((r) => new TextDecoder('latin1').decode(new Uint8Array(r.ciphertext)))
    .join('\n');
}

function localStorageDump(): string {
  let out = '';
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)!;
    out += `${key}=${window.localStorage.getItem(key)}\n`;
  }
  return out;
}

describe('offline-store', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe('encryption at rest', () => {
    it('stores queued writes only as AES-GCM ciphertext under a non-extractable key', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      await store.flush();

      const { key, records } = adapter.peek();
      expect(records).toHaveLength(1);
      expect(key?.key.extractable).toBe(false);
      expect(key?.key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
      await expect(crypto.subtle.exportKey('raw', key!.key)).rejects.toBeDefined();
      expect(key?.ownerHash).not.toContain('user-1');

      const atRest = ciphertextText(adapter) + JSON.stringify(Object.keys(records[0]));
      for (const needle of ['Jane', 'Doe', 'Chest pain', 'vital_signs', ...PHI_FIELD_NAMES]) {
        expect(atRest).not.toContain(needle);
      }
      expect(records[0].iv).toHaveLength(12);
    });

    it('uses a fresh IV for every record', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      store.queueAction('create', 'vital_signs', vitalsPayload);
      await store.flush();
      const [a, b] = adapter.peek().records;
      expect(Array.from(a.iv)).not.toEqual(Array.from(b.iv));
    });

    it('drops a record whose ciphertext was tampered with', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      await store.flush();
      const record = adapter.peek().records[0];
      new Uint8Array(record.ciphertext)[0] ^= 0xff;

      const store2 = createOfflineSyncStore({ adapter, executor: vi.fn(), initialOnline: false });
      await store2.open('user-1');
      expect(store2.getSnapshot().pendingActions).toHaveLength(0);
      expect(adapter.peek().records).toHaveLength(0);
    });
  });

  describe('session lifetime', () => {
    it('queued writes survive a page reload while the same user is signed in', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      const queued = store.queueAction('create', 'vital_signs', vitalsPayload)!;
      store.cacheData('vitals', { patient_id: 'pt-123', systolic_bp: 141 });
      await store.flush();

      // "Reload": new store instance over the same persisted storage.
      const store2 = createOfflineSyncStore({ adapter, executor: vi.fn(), initialOnline: false });
      expect(store2.getSnapshot().pendingActions).toHaveLength(0);
      await store2.open('user-1');
      const snap = store2.getSnapshot();
      expect(snap.persistent).toBe(true);
      expect(snap.pendingActions).toHaveLength(1);
      expect(snap.pendingActions[0]).toMatchObject({ id: queued.id, table: 'vital_signs', data: vitalsPayload });
      expect(snap.vitals).toEqual([{ patient_id: 'pt-123', systolic_bp: 141 }]);
    });

    it('a different user never sees the previous user\'s data and gets a new key', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      await store.flush();
      const firstKey = adapter.peek().key!.key;

      const store2 = createOfflineSyncStore({ adapter, executor: vi.fn(), initialOnline: false });
      await store2.open('user-2');
      expect(store2.getSnapshot().pendingActions).toHaveLength(0);
      expect(adapter.peek().records).toHaveLength(0);
      expect(adapter.peek().key!.key).not.toBe(firstKey);
    });

    it('wipe() removes all records, the key and in-memory state', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      store.cacheData('patientData', { first_name: 'Jane' });
      await store.wipe();

      expect(adapter.peek()).toEqual({ key: undefined, records: [] });
      const snap = store.getSnapshot();
      expect(snap.pendingActions).toEqual([]);
      expect(snap.patientData).toEqual([]);
      expect(snap.persistent).toBe(false);
    });

    it('writes issued after wipe() are not persisted until a new open()', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      const wiped = store.wipe();
      store.queueAction('create', 'vital_signs', vitalsPayload);
      await wiped;
      await store.flush();
      expect(adapter.peek().records).toHaveLength(0);
      expect(adapter.peek().key).toBeUndefined();
    });

    it('a wipe racing an open() leaves nothing behind', async () => {
      const { adapter, store } = setup();
      const opening = store.open('user-1');
      const wiped = store.wipe();
      await Promise.allSettled([opening, wiped]);
      expect(adapter.peek()).toEqual({ key: undefined, records: [] });
      expect(store.getSnapshot().persistent).toBe(false);
    });

    it('writes queued before sign-in are kept in memory, then encrypted on open()', async () => {
      const { adapter, store } = setup();
      store.queueAction('create', 'vital_signs', vitalsPayload);
      await store.flush();
      expect(adapter.peek().records).toHaveLength(0);
      expect(store.getSnapshot().pendingActions).toHaveLength(1);

      await store.open('user-1');
      expect(adapter.peek().records).toHaveLength(1);
      expect(store.getSnapshot().pendingActions).toHaveLength(1);
    });
  });

  describe('queue and replay', () => {
    it('queues while offline and replays when back online', async () => {
      const { adapter, executor, store } = setup();
      const events: string[] = [];
      store.onEvent((e) => events.push(e.type));
      await store.open('user-1');

      store.queueAction('create', 'vital_signs', vitalsPayload);
      store.queueAction('update', 'consultations', { id: 'c1', clinical_notes: 'x' });
      expect(executor).not.toHaveBeenCalled();
      expect(store.getSnapshot().syncStatus).toBe('pending');

      store.setOnline(true);
      await store.sync();
      await store.flush();

      expect(executor).toHaveBeenCalledTimes(2);
      expect(executor.mock.calls.map(([a]) => a.table)).toEqual(['vital_signs', 'consultations']);
      expect(store.getSnapshot().pendingActions).toHaveLength(0);
      expect(store.getSnapshot().syncStatus).toBe('synced');
      expect(adapter.peek().records).toHaveLength(0);
      expect(events).toEqual(expect.arrayContaining(['queued', 'online', 'synced']));
    });

    it('syncs immediately when queued while online', async () => {
      const { executor, store } = setup({ initialOnline: true });
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      await store.sync();
      expect(executor).toHaveBeenCalledTimes(1);
      expect(store.getSnapshot().pendingActions).toHaveLength(0);
    });

    it('keeps failed writes, persists the retry count and schedules a backoff retry', async () => {
      const executor = vi.fn(async () => false);
      const { adapter, scheduleRetry, store } = setup({ executor });
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      store.setOnline(true);
      await store.sync();
      await store.flush();

      const snap = store.getSnapshot();
      expect(snap.pendingActions).toHaveLength(1);
      expect(snap.pendingActions[0].retryCount).toBe(1);
      expect(snap.syncStatus).toBe('error');
      expect(scheduleRetry).toHaveBeenCalledWith(expect.any(Function), 2000);

      const store2 = createOfflineSyncStore({ adapter, executor: vi.fn(), initialOnline: false });
      await store2.open('user-1');
      expect(store2.getSnapshot().pendingActions[0].retryCount).toBe(1);
    });

    it('never silently drops a write that exhausted its retries', async () => {
      const executor = vi.fn(async () => {
        throw new Error('network');
      });
      const { store } = setup({ executor });
      const failed: unknown[] = [];
      store.onEvent((e) => e.type === 'action-failed' && failed.push(e));
      await store.open('user-1');
      store.queueAction('create', 'vital_signs', vitalsPayload);
      store.setOnline(true);
      for (let i = 0; i < 5; i++) await store.sync();
      expect(store.getSnapshot().pendingActions).toHaveLength(1);
      expect(store.getSnapshot().pendingActions[0].retryCount).toBe(3);
      expect(failed.length).toBeGreaterThan(0);
    });

    it('rejects oversized actions and caps the queue length', async () => {
      const { adapter, store } = setup();
      await store.open('user-1');
      expect(store.queueAction('create', 't', { blob: 'x'.repeat(200_000) })).toBeNull();
      for (let i = 0; i < MAX_PENDING_ACTIONS + 5; i++) store.queueAction('create', 't', { i });
      await store.flush();
      expect(store.getSnapshot().pendingActions).toHaveLength(MAX_PENDING_ACTIONS);
      expect(store.getSnapshot().pendingActions[0].data).toEqual({ i: 5 });
      expect(adapter.peek().records).toHaveLength(MAX_PENDING_ACTIONS);
    });
  });

  describe('legacy localStorage migration', () => {
    const legacyCache = {
      // The old code object-spread arrays, so lists may be numeric-key objects.
      patientData: { 0: { id: 'p1', first_name: 'Jane', last_name: 'Doe', date_of_birth: '1980-01-01' } },
      vitals: [{ patient_id: 'pt-123', systolic_bp: 150 }],
      medications: [{ name: '__ENCRYPTED__1', dosage: '5mg' }],
      syncStatus: 'pending',
      pendingActions: [
        {
          id: 'create-vital_signs-1',
          type: 'create',
          table: 'vital_signs',
          data: vitalsPayload,
          timestamp: 1,
          retryCount: 0,
          maxRetries: 3,
        },
        { type: 'bogus', table: 1, data: null },
      ],
      encryptionMetadata: { patientData: {}, vitals: {}, medications: {} },
    };

    it('migrates the plaintext cache into the encrypted store, then deletes every legacy key', async () => {
      window.localStorage.setItem('care-harmony-offline-cache', JSON.stringify(legacyCache));
      window.localStorage.setItem('offline_patients_cache', JSON.stringify([{ first_name: 'Imported' }]));
      window.localStorage.setItem('offline_actions_queue', '[]');
      window.localStorage.setItem('sidebar-collapsed', 'true');

      const { adapter, store } = setup();
      await store.open('user-1');

      const snap = store.getSnapshot();
      expect(snap.pendingActions).toHaveLength(1);
      expect(snap.pendingActions[0]).toMatchObject({ table: 'vital_signs', data: vitalsPayload });
      expect(snap.patientData).toEqual([legacyCache.patientData[0]]);
      expect(snap.vitals).toEqual(legacyCache.vitals);
      expect(snap.medications).toEqual([]); // server-encrypted placeholders cannot be restored offline
      // Import-panel keys are deleted, not migrated.
      expect(snap.patientData).not.toContainEqual({ first_name: 'Imported' });

      for (const key of LEGACY_OFFLINE_STORAGE_KEYS) {
        expect(window.localStorage.getItem(key)).toBeNull();
      }
      expect(window.localStorage.getItem('sidebar-collapsed')).toBe('true');
      expect(adapter.peek().records).toHaveLength(3);
      expect(ciphertextText(adapter)).not.toContain('Jane');
    });

    it('wipe() also deletes legacy keys left behind', async () => {
      window.localStorage.setItem('care-harmony-offline-cache', JSON.stringify(legacyCache));
      const { store } = setup();
      await store.wipe();
      expect(window.localStorage.getItem('care-harmony-offline-cache')).toBeNull();
    });
  });

  it('acceptance (SECF-06): no web-storage key contains PHI field names after an offline session', async () => {
    window.localStorage.setItem('care-harmony-offline-cache', JSON.stringify({ pendingActions: [] }));
    const { store } = setup();
    await store.open('nurse-1');
    store.cacheData('patientData', { first_name: 'Jane', last_name: 'Doe', date_of_birth: '1980-01-01', allergies: 'penicillin' });
    store.cacheData('vitals', vitalsPayload);
    store.queueAction('create', 'vital_signs', vitalsPayload);
    store.queueAction('update', 'consultations', { id: 'c1', patient_id: 'pt-123', clinical_notes: 'notes' });
    store.setOnline(true);
    await store.sync();
    store.setOnline(false);
    store.queueAction('create', 'vital_signs', vitalsPayload);
    await store.flush();

    const dump = localStorageDump() + window.sessionStorage.length;
    for (const field of PHI_FIELD_NAMES) expect(dump).not.toContain(field);
    expect(dump).not.toContain('Jane');
  });
});
