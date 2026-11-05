/**
 * Public types for the `offline-store` deep module.
 */

export type PendingActionType = 'create' | 'update' | 'delete';

export interface PendingAction {
  id: string;
  type: PendingActionType;
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

/** Read-side caches kept for offline viewing. */
export type OfflineCacheKind = 'patientData' | 'vitals' | 'medications';

export type SyncStatus = 'pending' | 'synced' | 'error';

/** Immutable snapshot of the offline store (safe for `useSyncExternalStore`). */
export interface OfflineSnapshot {
  patientData: Record<string, unknown>[];
  vitals: Record<string, unknown>[];
  medications: Record<string, unknown>[];
  pendingActions: PendingAction[];
  syncStatus: SyncStatus;
  isOnline: boolean;
  /** True once an encrypted session store has been opened for a signed-in user. */
  persistent: boolean;
}

/**
 * Replays one queued write against the server. Resolve `true` on success,
 * `false` (or throw) on failure; failures are retried with backoff.
 */
export type ActionExecutor = (action: PendingAction) => Promise<boolean>;

export type OfflineEvent =
  | { type: 'online' }
  | { type: 'offline' }
  | { type: 'queued'; action: PendingAction }
  | { type: 'action-too-large' }
  | { type: 'synced'; count: number }
  | { type: 'action-failed'; action: PendingAction }
  | { type: 'persist-error'; error: unknown };

/**
 * One encrypted record as it sits in storage. Only `id` (a random UUID) is
 * stored in clear; the record kind and payload are inside the ciphertext.
 */
export interface StoredRecord {
  id: string;
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}

/**
 * The per-session AES-GCM key. `key` is a NON-extractable CryptoKey: it can
 * be structured-cloned into IndexedDB, but its raw bytes can never be read
 * back by script.
 */
export interface StoredKey {
  key: CryptoKey;
  /** SHA-256 of the owning user id, so a different user never reuses it. */
  ownerHash: string;
  createdAt: number;
}

/**
 * Minimal persistence port. Production uses IndexedDB; tests use the
 * in-memory adapter. Adapters never see plaintext.
 */
export interface OfflineStorageAdapter {
  readKey(): Promise<StoredKey | undefined>;
  writeKey(key: StoredKey): Promise<void>;
  readAll(): Promise<StoredRecord[]>;
  write(record: StoredRecord): Promise<void>;
  remove(id: string): Promise<void>;
  /** Remove every record AND the key (and the backing database, if any). */
  destroy(): Promise<void>;
}
