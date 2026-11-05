import type {
  ActionExecutor,
  OfflineCacheKind,
  OfflineEvent,
  OfflineSnapshot,
  OfflineStorageAdapter,
  PendingAction,
  PendingActionType,
  SyncStatus,
} from '../types';
import { decryptRecord, encryptRecord, generateSessionKey, randomId, sha256Hex } from './crypto';
import { readLegacyOfflineData, removeLegacyKeys } from './legacy';

export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_BASE_MS = 1000;
export const MAX_PENDING_ACTIONS = 100;
export const MAX_ACTION_BYTES = 100_000;
export const CACHE_LIMITS: Record<OfflineCacheKind, number> = {
  patientData: 50,
  vitals: 100,
  medications: 50,
};
const CACHE_KINDS: OfflineCacheKind[] = ['patientData', 'vitals', 'medications'];

/** What one encrypted record holds once decrypted. */
type Payload =
  | { kind: 'action'; action: PendingAction }
  | { kind: OfflineCacheKind; at: number; data: Record<string, unknown> };

interface CacheEntry {
  id: string;
  at: number;
  data: Record<string, unknown>;
}

interface Session {
  key: CryptoKey;
  ownerHash: string;
}

export interface OfflineSyncStoreOptions {
  adapter: OfflineStorageAdapter;
  executor: ActionExecutor;
  /** Where the legacy plaintext cache lived (normally `window.localStorage`). */
  legacyStorage?: Storage | null;
  initialOnline?: boolean;
  scheduleRetry?: (fn: () => void, delayMs: number) => void;
}

export interface OfflineSyncStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): OfflineSnapshot;
  onEvent(listener: (event: OfflineEvent) => void): () => void;
  /**
   * Opens (or creates) the encrypted store for a signed-in user: reuses the
   * session key if it belongs to this user, otherwise destroys whatever is
   * stored and generates a new key. Migrates and deletes legacy keys.
   */
  open(userId: string): Promise<void>;
  /** Clears memory, deletes every record, the key and the database. */
  wipe(): Promise<void>;
  queueAction(type: PendingActionType, table: string, data: Record<string, unknown>): PendingAction | null;
  cacheData(kind: OfflineCacheKind, data: Record<string, unknown>): void;
  sync(): Promise<void>;
  clearPendingActions(): Promise<void>;
  setOnline(online: boolean): void;
  attachNetworkListeners(target: Pick<Window, 'addEventListener' | 'removeEventListener'>): () => void;
  /** Resolves once all persistence work queued so far has completed. */
  flush(): Promise<void>;
}

const byteLength = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

export function createOfflineSyncStore(options: OfflineSyncStoreOptions): OfflineSyncStore {
  const { adapter, executor } = options;
  const legacyStorage = options.legacyStorage ?? null;
  const scheduleRetry = options.scheduleRetry ?? ((fn, ms) => void setTimeout(fn, ms));

  let session: Session | null = null;
  /** Bumped by every wipe; an open() that started earlier must not commit. */
  let generation = 0;
  let isOnline = options.initialOnline ?? true;
  let syncStatus: SyncStatus = 'synced';
  let pending: PendingAction[] = [];
  let entries: Record<OfflineCacheKind, CacheEntry[]> = { patientData: [], vitals: [], medications: [] };
  let snapshot: OfflineSnapshot = buildSnapshot();

  const listeners = new Set<() => void>();
  const eventListeners = new Set<(e: OfflineEvent) => void>();

  // Every storage operation runs on one serial chain, so a wipe can never be
  // overtaken by a write that was issued before it.
  let chain: Promise<void> = Promise.resolve();
  const enqueue = (op: () => Promise<void>): Promise<void> => {
    const run = chain.then(op);
    chain = run.catch((error) => emit({ type: 'persist-error', error }));
    return run;
  };

  function buildSnapshot(): OfflineSnapshot {
    return {
      patientData: entries.patientData.map((e) => e.data),
      vitals: entries.vitals.map((e) => e.data),
      medications: entries.medications.map((e) => e.data),
      pendingActions: pending,
      syncStatus,
      isOnline,
      persistent: session !== null,
    };
  }

  function changed() {
    snapshot = buildSnapshot();
    listeners.forEach((l) => l());
  }

  function emit(event: OfflineEvent) {
    eventListeners.forEach((l) => {
      try {
        l(event);
      } catch {
        // listener errors must not break the store
      }
    });
  }

  async function writeNow(id: string, payload: Payload) {
    if (!session) return; // not signed in / wiped: memory only
    await adapter.write(await encryptRecord(session.key, id, payload));
  }

  async function removeNow(id: string) {
    if (!session) return;
    await adapter.remove(id);
  }

  const persist = (id: string, payload: Payload) => enqueue(() => writeNow(id, payload));
  const unpersist = (ids: string[]) =>
    ids.length === 0
      ? Promise.resolve()
      : enqueue(async () => {
          for (const id of ids) await removeNow(id);
        });

  /** Applies size limits; returns ids of records that fell off. */
  function trim(): string[] {
    const dropped: string[] = [];
    if (pending.length > MAX_PENDING_ACTIONS) {
      dropped.push(...pending.slice(0, pending.length - MAX_PENDING_ACTIONS).map((a) => a.id));
      pending = pending.slice(-MAX_PENDING_ACTIONS);
    }
    for (const kind of CACHE_KINDS) {
      const limit = CACHE_LIMITS[kind];
      if (entries[kind].length > limit) {
        dropped.push(...entries[kind].slice(0, entries[kind].length - limit).map((e) => e.id));
        entries = { ...entries, [kind]: entries[kind].slice(-limit) };
      }
    }
    return dropped;
  }

  async function doOpen(userId: string, startedIn: number) {
    if (startedIn !== generation) return; // wiped before this open ran
    const ownerHash = await sha256Hex(userId);
    if (session?.ownerHash === ownerHash) return;
    if (session) {
      // A different user signed in without a wipe in between.
      session = null;
      pending = [];
      entries = { patientData: [], vitals: [], medications: [] };
      await adapter.destroy();
    }

    const loadedActions: PendingAction[] = [];
    const loadedEntries: Record<OfflineCacheKind, CacheEntry[]> = { patientData: [], vitals: [], medications: [] };
    let key: CryptoKey;
    const stored = await adapter.readKey();
    if (stored && stored.ownerHash === ownerHash) {
      key = stored.key;
      for (const record of await adapter.readAll()) {
        try {
          const payload = await decryptRecord<Payload>(key, record);
          if (payload.kind === 'action') loadedActions.push({ ...payload.action, id: record.id });
          else loadedEntries[payload.kind].push({ id: record.id, at: payload.at, data: payload.data });
        } catch {
          await adapter.remove(record.id); // undecryptable or tampered
        }
      }
    } else {
      // No key, or a key from another user's session: nothing stored is ours.
      await adapter.destroy();
      key = await generateSessionKey();
      await adapter.writeKey({ key, ownerHash, createdAt: Date.now() });
    }
    if (startedIn !== generation) return; // wiped while opening
    session = { key, ownerHash };

    // Data queued in memory before the store was opened, plus legacy data.
    const toWrite: Array<[string, Payload]> = [];
    const memoryActions = pending;
    const memoryEntries = entries;
    const legacy = readLegacyOfflineData(legacyStorage);
    const legacyActions = (legacy?.pendingActions ?? []).map((a) => ({ ...a, id: randomId() }));
    for (const a of [...memoryActions, ...legacyActions]) toWrite.push([a.id, { kind: 'action', action: a }]);

    const merged: Record<OfflineCacheKind, CacheEntry[]> = { patientData: [], vitals: [], medications: [] };
    for (const kind of CACHE_KINDS) {
      const fromLegacy = (legacy?.items[kind] ?? []).map((data, i) => ({ id: randomId(), at: i, data }));
      for (const e of [...fromLegacy, ...memoryEntries[kind]]) toWrite.push([e.id, { kind, at: e.at, data: e.data }]);
      merged[kind] = [...loadedEntries[kind], ...fromLegacy, ...memoryEntries[kind]].sort((a, b) => a.at - b.at);
    }
    pending = [...loadedActions, ...legacyActions, ...memoryActions].sort((a, b) => a.timestamp - b.timestamp);
    entries = merged;
    if (pending.length > 0 && syncStatus === 'synced') syncStatus = 'pending';

    const dropped = new Set(trim());
    for (const [id, payload] of toWrite) if (!dropped.has(id)) await writeNow(id, payload);
    for (const id of dropped) await removeNow(id);

    // Only now that everything is safely re-encrypted, delete the plaintext.
    removeLegacyKeys(legacyStorage);
    changed();
  }

  async function runSync() {
    if (!isOnline || pending.length === 0) return;
    syncStatus = 'pending';
    changed();

    let synced = 0;
    let retryScheduled = false;
    for (const action of [...pending]) {
      if (!pending.some((p) => p.id === action.id)) continue; // cleared/wiped meanwhile
      let ok = false;
      try {
        ok = await executor(action);
      } catch {
        ok = false;
      }
      if (ok) {
        synced += 1;
        pending = pending.filter((p) => p.id !== action.id);
        void unpersist([action.id]);
        continue;
      }
      if (action.retryCount >= action.maxRetries) {
        // Already exhausted: keep it (never silently drop a clinical write);
        // only a manual sync retries it.
        emit({ type: 'action-failed', action });
        continue;
      }
      const updated = { ...action, retryCount: action.retryCount + 1 };
      pending = pending.map((p) => (p.id === action.id ? updated : p));
      void persist(updated.id, { kind: 'action', action: updated });
      if (updated.retryCount >= updated.maxRetries) {
        emit({ type: 'action-failed', action: updated });
      } else if (!retryScheduled) {
        retryScheduled = true;
        scheduleRetry(() => void store.sync(), RETRY_DELAY_BASE_MS * 2 ** updated.retryCount);
      }
    }

    syncStatus = pending.length === 0 ? 'synced' : 'error';
    changed();
    if (synced > 0) emit({ type: 'synced', count: synced });
  }

  let syncing: Promise<void> | null = null;
  let opening: { userId: string; promise: Promise<void> } | null = null;

  const store: OfflineSyncStore = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    onEvent(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },

    open(userId) {
      if (opening?.userId === userId) return opening.promise;
      const startedIn = generation;
      const promise = enqueue(() => doOpen(userId, startedIn)).finally(() => {
        if (opening?.promise === promise) opening = null;
      });
      opening = { userId, promise };
      return promise;
    },

    wipe() {
      generation += 1;
      session = null; // stop any write still waiting on the chain
      opening = null;
      pending = [];
      entries = { patientData: [], vitals: [], medications: [] };
      syncStatus = 'synced';
      removeLegacyKeys(legacyStorage);
      changed();
      return enqueue(() => adapter.destroy());
    },

    queueAction(type, table, data) {
      if (byteLength({ type, table, data }) > MAX_ACTION_BYTES) {
        emit({ type: 'action-too-large' });
        return null;
      }
      const action: PendingAction = {
        id: randomId(),
        type,
        table,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: MAX_RETRY_ATTEMPTS,
      };
      pending = [...pending, action];
      syncStatus = 'pending';
      const dropped = trim();
      changed();
      void persist(action.id, { kind: 'action', action });
      void unpersist(dropped);
      if (isOnline) void store.sync();
      else emit({ type: 'queued', action });
      return action;
    },

    cacheData(kind, data) {
      const entry: CacheEntry = { id: randomId(), at: Date.now(), data };
      entries = { ...entries, [kind]: [...entries[kind], entry] };
      const dropped = trim();
      changed();
      void persist(entry.id, { kind, at: entry.at, data });
      void unpersist(dropped);
    },

    sync() {
      if (syncing) return syncing;
      syncing = runSync().finally(() => {
        syncing = null;
      });
      return syncing;
    },

    async clearPendingActions() {
      const ids = pending.map((a) => a.id);
      pending = [];
      syncStatus = 'synced';
      changed();
      await unpersist(ids);
    },

    setOnline(online) {
      if (online === isOnline) return;
      isOnline = online;
      changed();
      emit({ type: online ? 'online' : 'offline' });
      if (online) void store.sync();
    },

    attachNetworkListeners(target) {
      const onOnline = () => store.setOnline(true);
      const onOffline = () => store.setOnline(false);
      target.addEventListener('online', onOnline);
      target.addEventListener('offline', onOffline);
      return () => {
        target.removeEventListener('online', onOnline);
        target.removeEventListener('offline', onOffline);
      };
    },

    flush: () => chain,
  };

  return store;
}
