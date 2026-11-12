import type { OfflineStorageAdapter, StoredKey, StoredRecord } from '../types';

/**
 * In-memory adapter. Holds the same structured objects IndexedDB would
 * (including the CryptoKey object), so the encryption/queue logic can be
 * exercised without a real IndexedDB.
 */
export function createMemoryOfflineAdapter(): OfflineStorageAdapter & {
  /** Test hook: the raw records as they would sit at rest. */
  peek(): { key: StoredKey | undefined; records: StoredRecord[] };
} {
  let key: StoredKey | undefined;
  const records = new Map<string, StoredRecord>();

  return {
    async readKey() {
      return key;
    },
    async writeKey(k) {
      key = k;
    },
    async readAll() {
      return Array.from(records.values());
    },
    async write(record) {
      records.set(record.id, record);
    },
    async remove(id) {
      records.delete(id);
    },
    async destroy() {
      key = undefined;
      records.clear();
    },
    peek() {
      return { key, records: Array.from(records.values()) };
    },
  };
}
