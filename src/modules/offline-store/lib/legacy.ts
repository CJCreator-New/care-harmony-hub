import type { OfflineCacheKind, PendingAction } from '../types';

/** Key written by the old localStorage implementation of `useOfflineSync`. */
export const LEGACY_OFFLINE_CACHE_KEY = 'care-harmony-offline-cache';

/**
 * Keys written by the removed nurse "Import/Export" panel. They were never
 * read back by the app, so they are deleted without being migrated (their
 * content came from arbitrary, unvalidated JSON files).
 */
export const LEGACY_IMPORT_KEYS = [
  'offline_vitals_cache',
  'offline_medications_cache',
  'offline_patients_cache',
  'offline_actions_queue',
] as const;

export const ALL_LEGACY_KEYS: readonly string[] = [LEGACY_OFFLINE_CACHE_KEY, ...LEGACY_IMPORT_KEYS];

export interface LegacyOfflineData {
  items: Record<OfflineCacheKind, Record<string, unknown>[]>;
  pendingActions: PendingAction[];
}

const MAX_LEGACY_BYTES = 4 * 1024 * 1024;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Items that went through the old `phi-crypto` field encryption carry
 * `__ENCRYPTED__<n>` placeholders whose plaintext is only recoverable via the
 * server; they cannot be restored offline and are dropped.
 */
function hasServerEncryptedPlaceholder(item: Record<string, unknown>): boolean {
  return Object.values(item).some((v) => typeof v === 'string' && v.startsWith('__ENCRYPTED__'));
}

/**
 * The old code passed whole arrays through an object spread, so on disk a
 * "list" may be an array or an object with numeric keys.
 */
function toItemList(value: unknown): Record<string, unknown>[] {
  const list = Array.isArray(value) ? value : isPlainObject(value) ? Object.values(value) : [];
  return list.filter(isPlainObject).filter((item) => !hasServerEncryptedPlaceholder(item));
}

function toPendingAction(value: unknown): PendingAction | null {
  if (!isPlainObject(value)) return null;
  const { type, table, data } = value;
  if (type !== 'create' && type !== 'update' && type !== 'delete') return null;
  if (typeof table !== 'string' || !isPlainObject(data)) return null;
  return {
    id: '', // reassigned on import
    type,
    table,
    data,
    timestamp: typeof value.timestamp === 'number' ? value.timestamp : Date.now(),
    retryCount: typeof value.retryCount === 'number' ? value.retryCount : 0,
    maxRetries: typeof value.maxRetries === 'number' ? value.maxRetries : 3,
  };
}

/** Reads (but does not delete) the legacy plaintext offline cache. */
export function readLegacyOfflineData(storage: Storage | null | undefined): LegacyOfflineData | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(LEGACY_OFFLINE_CACHE_KEY);
  } catch {
    return null;
  }
  if (!raw || raw.length > MAX_LEGACY_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return null;
    const pending = Array.isArray(parsed.pendingActions) ? parsed.pendingActions : [];
    return {
      items: {
        patientData: toItemList(parsed.patientData),
        vitals: toItemList(parsed.vitals),
        medications: toItemList(parsed.medications),
      },
      pendingActions: pending.map(toPendingAction).filter((a): a is PendingAction => a !== null),
    };
  } catch {
    return null;
  }
}

export function removeLegacyKeys(storage: Storage | null | undefined): void {
  if (!storage) return;
  for (const key of ALL_LEGACY_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      // storage unavailable
    }
  }
}
