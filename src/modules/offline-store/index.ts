/**
 * Offline Store Module (`offline-store`)
 *
 * CareSync HIMS Deep Module (SECF-06).
 * Encrypted, session-scoped storage for offline clinical caches and the
 * queue of writes made while offline.
 *
 * - Storage: IndexedDB database `caresync-offline` (never localStorage).
 * - Encryption: every record is AES-GCM-256 encrypted with a per-session,
 *   NON-extractable WebCrypto key, which is itself kept (as a CryptoKey
 *   object, never as bytes) in the same database so queued writes survive a
 *   page reload while the user is still signed in.
 * - Wipe: `wipeOfflineStore()` deletes the records, the key and the database.
 *   The logout purge must call it.
 */

import { createIndexedDbOfflineAdapter } from './adapters/indexedDb';
import { createOfflineSyncStore, type OfflineSyncStore } from './lib/syncStore';
import { removeLegacyKeys } from './lib/legacy';
import type { ActionExecutor } from './types';

export type {
  ActionExecutor,
  OfflineCacheKind,
  OfflineEvent,
  OfflineSnapshot,
  OfflineStorageAdapter,
  PendingAction,
  PendingActionType,
  StoredKey,
  StoredRecord,
  SyncStatus,
} from './types';
export {
  createOfflineSyncStore,
  CACHE_LIMITS,
  MAX_PENDING_ACTIONS,
  MAX_RETRY_ATTEMPTS,
  type OfflineSyncStore,
  type OfflineSyncStoreOptions,
} from './lib/syncStore';
export { OFFLINE_DB_NAME, createIndexedDbOfflineAdapter } from './adapters/indexedDb';
export { createMemoryOfflineAdapter } from './adapters/memory';
export { ALL_LEGACY_KEYS as LEGACY_OFFLINE_STORAGE_KEYS } from './lib/legacy';
export {
  OFFLINE_QUEUE_ALLOWED_TABLES,
  OfflineActionBlockedError,
  assertOnlineForCriticalAction,
  isOfflineReplayAllowed,
  normalizeOfflineTable,
  type CriticalOfflineAction,
  type OfflineQueueAllowedTable,
} from './lib/actionPolicy';

const browserStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

let defaultStore: OfflineSyncStore | null = null;
let detachNetwork: (() => void) | null = null;

/**
 * The app-wide store (one per tab), shared by every `useOfflineSync` caller.
 * The executor is fixed by whoever first asks for the store.
 */
export function getOfflineSyncStore(executor: ActionExecutor): OfflineSyncStore {
  if (!defaultStore) {
    defaultStore = createOfflineSyncStore({
      adapter: createIndexedDbOfflineAdapter(),
      executor,
      legacyStorage: browserStorage(),
      initialOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    });
    if (typeof window !== 'undefined') {
      detachNetwork = defaultStore.attachNetworkListeners(window);
    }
  }
  return defaultStore;
}

/**
 * Logout purge entry point. Clears the in-memory offline state, deletes the
 * `caresync-offline` IndexedDB database (records + session key) and removes
 * any legacy plaintext localStorage keys. Safe to call when nothing exists.
 */
export async function wipeOfflineStore(): Promise<void> {
  if (defaultStore) {
    await defaultStore.wipe();
    return;
  }
  removeLegacyKeys(browserStorage());
  await createIndexedDbOfflineAdapter().destroy();
}
