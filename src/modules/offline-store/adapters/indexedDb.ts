import type { OfflineStorageAdapter, StoredKey, StoredRecord } from '../types';

/**
 * Database name. MUST keep the `caresync` prefix: the logout purge deletes
 * every IndexedDB database whose name starts with `caresync`.
 */
export const OFFLINE_DB_NAME = 'caresync-offline';
const DB_VERSION = 1;
const KEY_STORE = 'session-key';
const RECORD_STORE = 'records';
const KEY_ID = 'current';

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function getFactory(): IDBFactory {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable; offline storage is disabled');
  }
  return indexedDB;
}

/** Raw-IndexedDB adapter (no third-party wrapper). */
export function createIndexedDbOfflineAdapter(dbName: string = OFFLINE_DB_NAME): OfflineStorageAdapter {
  let dbPromise: Promise<IDBDatabase> | null = null;

  const open = (): Promise<IDBDatabase> => {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = getFactory().open(dbName, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
        if (!db.objectStoreNames.contains(RECORD_STORE)) {
          db.createObjectStore(RECORD_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // Let another tab's (or the logout purge's) deleteDatabase proceed.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
    return dbPromise;
  };

  return {
    async readKey() {
      const db = await open();
      const tx = db.transaction(KEY_STORE, 'readonly');
      return (await promisify(tx.objectStore(KEY_STORE).get(KEY_ID))) as StoredKey | undefined;
    },
    async writeKey(key) {
      const db = await open();
      const tx = db.transaction(KEY_STORE, 'readwrite');
      tx.objectStore(KEY_STORE).put(key, KEY_ID);
      await txDone(tx);
    },
    async readAll() {
      const db = await open();
      const tx = db.transaction(RECORD_STORE, 'readonly');
      return (await promisify(tx.objectStore(RECORD_STORE).getAll())) as StoredRecord[];
    },
    async write(record) {
      const db = await open();
      const tx = db.transaction(RECORD_STORE, 'readwrite');
      tx.objectStore(RECORD_STORE).put(record);
      await txDone(tx);
    },
    async remove(id) {
      const db = await open();
      const tx = db.transaction(RECORD_STORE, 'readwrite');
      tx.objectStore(RECORD_STORE).delete(id);
      await txDone(tx);
    },
    async destroy() {
      // Clear first, so the data is gone even if deleteDatabase is blocked by
      // a connection in another tab that has not yet closed.
      if (dbPromise) {
        try {
          const db = await dbPromise;
          const tx = db.transaction([KEY_STORE, RECORD_STORE], 'readwrite');
          tx.objectStore(KEY_STORE).clear();
          tx.objectStore(RECORD_STORE).clear();
          await txDone(tx);
          db.close();
        } catch {
          // fall through to deleteDatabase
        }
        dbPromise = null;
      }
      await new Promise<void>((resolve, reject) => {
        const req = getFactory().deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        // onblocked: other connections get `versionchange` and close; the
        // request then completes and onsuccess fires.
      });
    },
  };
}
