/**
 * Central client-side purge routine (SECF-04, SECF-05).
 *
 * Runs on every logout path (manual logout, idle auto-logoff, Supabase
 * `SIGNED_OUT` events) so that nothing a previous user saw survives in the
 * browser profile of a shared clinical workstation:
 *
 *   1. React Query cache (queries + mutations)
 *   2. localStorage   – every key except the UI-preference allowlist below
 *   3. sessionStorage – every key (including the Supabase `sb-*` session)
 *   4. IndexedDB      – `care-harmony-cache` and every DB named `caresync*`
 *   5. Cache Storage  – every cache except the Workbox static-asset precache
 *
 * The purge is best-effort and NEVER throws: each step is isolated, async
 * steps are time-boxed, and failures are reported in the returned summary
 * rather than raised, so a purge problem can never block logout.
 */
import { queryClient as appQueryClient } from '@/lib/queryClient';

/**
 * localStorage keys that survive a purge.
 *
 * Only pure, non-identifying UI preferences belong here. Each entry was taken
 * from a `localStorage.setItem` call site in `src/`:
 *   - `caresync-theme`    (ThemeContext default storageKey): "light" | "dark" | "system"
 *   - `sidebar-collapsed` (DashboardLayout): "true" | "false"
 *
 * Deliberately NOT allowlisted (they are removed): `preferredRole`, `testRole`,
 * `e2e-mock-auth-user` (identify the user / role), `care-harmony-offline-cache`,
 * `offline_data`, `offline_data_archive`, `offline_*_cache`,
 * `offline_actions_queue`, `lab-samples-fallback`, `testing-data` (PHI or
 * clinical data), any `sb-*` / `*auth-token*` key (Supabase sessions), and any
 * key written through generic helpers (`performanceOptimization.cacheStrategy`).
 */
export const PRESERVED_LOCAL_STORAGE_KEYS: readonly string[] = Object.freeze([
  'caresync-theme',
  'sidebar-collapsed',
]);

/** IndexedDB databases that are always deleted, even if `indexedDB.databases()` is unavailable. */
export const KNOWN_INDEXED_DB_NAMES: readonly string[] = Object.freeze([
  'care-harmony-cache',
  'caresync-offline',
]);

/** Any IndexedDB database whose name starts with one of these prefixes is deleted. */
export const INDEXED_DB_NAME_PREFIXES: readonly string[] = Object.freeze(['caresync']);

/**
 * Cache Storage caches that survive a purge: the Workbox precache only holds
 * the build's static assets (JS/CSS/HTML/icons), never API responses.
 */
export const PRESERVED_CACHE_PREFIXES: readonly string[] = Object.freeze(['workbox-precache']);

/** Prefix of the caches the pre-SECF-04 service worker filled with Supabase responses. */
export const LEGACY_SUPABASE_CACHE_PREFIX = 'supabase-';

const IDB_DELETE_TIMEOUT_MS = 2000;
const CACHE_STEP_TIMEOUT_MS = 2000;

export interface PurgeSummary {
  queryCacheCleared: boolean;
  localStorageKeysRemoved: string[];
  sessionStorageKeysRemoved: string[];
  indexedDbDeleted: string[];
  cachesDeleted: string[];
  errors: string[];
}

export interface PurgeOptions {
  /** Defaults to the application QueryClient from `@/lib/queryClient`. */
  queryClient?: { clear: () => void } | null;
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> =>
  new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });

const getStorage = (kind: 'localStorage' | 'sessionStorage'): Storage | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window[kind] ?? null;
  } catch {
    return null;
  }
};

const purgeStorage = (storage: Storage | null, preserved: readonly string[]): string[] => {
  if (!storage) return [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && !preserved.includes(key)) keys.push(key);
  }
  keys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      /* keep going */
    }
  });
  return keys;
};

const getIndexedDb = (): IDBFactory | null => {
  try {
    return typeof indexedDB !== 'undefined' ? indexedDB : null;
  } catch {
    return null;
  }
};

const isAppDatabase = (name: string): boolean =>
  KNOWN_INDEXED_DB_NAMES.includes(name) ||
  INDEXED_DB_NAME_PREFIXES.some((prefix) => name.toLowerCase().startsWith(prefix));

const listAppDatabases = async (idb: IDBFactory): Promise<string[]> => {
  const names = new Set<string>(KNOWN_INDEXED_DB_NAMES);
  if (typeof idb.databases === 'function') {
    const infos = await withTimeout(idb.databases(), CACHE_STEP_TIMEOUT_MS, []);
    infos.forEach((info) => {
      if (info?.name && isAppDatabase(info.name)) names.add(info.name);
    });
  }
  return [...names];
};

/**
 * Resolves `true` once the database is gone. A `blocked` event means another
 * connection is still open: the deletion stays queued and completes when that
 * connection closes, so we keep waiting until the timeout instead of failing.
 */
const deleteDatabase = (idb: IDBFactory, name: string): Promise<boolean> =>
  withTimeout(
    new Promise<boolean>((resolve) => {
      try {
        const request = idb.deleteDatabase(name);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    }),
    IDB_DELETE_TIMEOUT_MS,
    false,
  );

const getCacheStorage = (): CacheStorage | null => {
  try {
    return typeof caches !== 'undefined' ? caches : null;
  } catch {
    return null;
  }
};

const deleteCachesMatching = async (shouldDelete: (name: string) => boolean): Promise<string[]> => {
  const cacheStorage = getCacheStorage();
  if (!cacheStorage) return [];
  const names = await withTimeout(cacheStorage.keys(), CACHE_STEP_TIMEOUT_MS, [] as string[]);
  const targets = names.filter(shouldDelete);
  const results = await Promise.all(
    targets.map((name) =>
      withTimeout(cacheStorage.delete(name), CACHE_STEP_TIMEOUT_MS, false).then((ok) => (ok ? name : null)),
    ),
  );
  return results.filter((name): name is string => name !== null);
};

/**
 * Deletes the `supabase-*` caches written by service workers built before
 * SECF-04. Safe to call on every app start; never throws.
 */
export async function deleteLegacySupabaseCaches(): Promise<string[]> {
  try {
    return await deleteCachesMatching((name) => name.startsWith(LEGACY_SUPABASE_CACHE_PREFIX));
  } catch {
    return [];
  }
}

const runPurge = async (options: PurgeOptions): Promise<PurgeSummary> => {
  const summary: PurgeSummary = {
    queryCacheCleared: false,
    localStorageKeysRemoved: [],
    sessionStorageKeysRemoved: [],
    indexedDbDeleted: [],
    cachesDeleted: [],
    errors: [],
  };

  // 1. In-memory React Query cache.
  try {
    const client = options.queryClient === undefined ? appQueryClient : options.queryClient;
    if (client) {
      client.clear();
      summary.queryCacheCleared = true;
    }
  } catch (error) {
    summary.errors.push(`queryClient: ${errorMessage(error)}`);
  }

  // 2 + 3. Web Storage (synchronous, so do it before any await).
  try {
    summary.localStorageKeysRemoved = purgeStorage(getStorage('localStorage'), PRESERVED_LOCAL_STORAGE_KEYS);
  } catch (error) {
    summary.errors.push(`localStorage: ${errorMessage(error)}`);
  }
  try {
    summary.sessionStorageKeysRemoved = purgeStorage(getStorage('sessionStorage'), []);
  } catch (error) {
    summary.errors.push(`sessionStorage: ${errorMessage(error)}`);
  }

  // 4 + 5. IndexedDB and Cache Storage, in parallel.
  const idbStep = (async () => {
    const idb = getIndexedDb();
    if (!idb) return;
    const names = await listAppDatabases(idb);
    const results = await Promise.all(names.map((name) => deleteDatabase(idb, name)));
    summary.indexedDbDeleted = names.filter((_, index) => results[index]);
  })().catch((error) => {
    summary.errors.push(`indexedDB: ${errorMessage(error)}`);
  });

  const cacheStep = deleteCachesMatching(
    (name) => !PRESERVED_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)),
  )
    .then((deleted) => {
      summary.cachesDeleted = deleted;
    })
    .catch((error) => {
      summary.errors.push(`caches: ${errorMessage(error)}`);
    });

  await Promise.all([idbStep, cacheStep]);
  return summary;
};

let inFlight: Promise<PurgeSummary> | null = null;

/**
 * Wipes all client-side state that could hold PHI or identify the last user.
 * Concurrent calls (e.g. logout() and the SIGNED_OUT event it triggers) share
 * one run. Never rejects.
 */
export function purgeClientState(options: PurgeOptions = {}): Promise<PurgeSummary> {
  if (inFlight) return inFlight;
  inFlight = runPurge(options)
    .catch((error) => ({
      queryCacheCleared: false,
      localStorageKeysRemoved: [],
      sessionStorageKeysRemoved: [],
      indexedDbDeleted: [],
      cachesDeleted: [],
      errors: [`purge: ${errorMessage(error)}`],
    }))
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}
