import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  purgeClientState,
  deleteLegacySupabaseCaches,
  PRESERVED_LOCAL_STORAGE_KEYS,
} from '@/lib/security/purgeClientState';
import { queryClient as appQueryClient } from '@/lib/queryClient';

type DeleteBehaviour = 'success' | 'error' | 'never';

function installCacheStorage(initial: string[]) {
  const names = new Set(initial);
  const cacheStorage = {
    keys: vi.fn(async () => [...names]),
    delete: vi.fn(async (name: string) => names.delete(name)),
  };
  vi.stubGlobal('caches', cacheStorage);
  return { names, cacheStorage };
}

function installIndexedDb(
  initial: string[],
  { withDatabases = true, behaviour = {} as Record<string, DeleteBehaviour> } = {},
) {
  const names = new Set(initial);
  const factory: Record<string, unknown> = {
    deleteDatabase: vi.fn((name: string) => {
      const request: { onsuccess?: () => void; onerror?: () => void; onblocked?: () => void } = {};
      const mode = behaviour[name] ?? 'success';
      setTimeout(() => {
        if (mode === 'success') {
          names.delete(name);
          request.onsuccess?.();
        } else if (mode === 'error') {
          request.onerror?.();
        } else {
          request.onblocked?.();
        }
      }, 0);
      return request;
    }),
  };
  if (withDatabases) {
    factory.databases = vi.fn(async () => [...names].map((name) => ({ name, version: 1 })));
  }
  vi.stubGlobal('indexedDB', factory);
  return { names, factory };
}

describe('purgeClientState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    appQueryClient.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('removes every localStorage key except the UI-preference allowlist', async () => {
    installCacheStorage([]);
    installIndexedDb([]);
    const seeded: Record<string, string> = {
      'caresync-theme': 'dark',
      'sidebar-collapsed': 'true',
      preferredRole: 'doctor',
      testRole: 'nurse',
      'e2e-mock-auth-user': 'nurse@testgeneral.com',
      'care-harmony-offline-cache': '{"patients":[{"name":"Jane Doe"}]}',
      offline_data: 'x',
      offline_patients_cache: 'x',
      offline_vitals_cache: 'x',
      offline_medications_cache: 'x',
      'lab-samples-fallback': 'x',
      'testing-data': 'x',
      'sb-stub-auth-token': '{"access_token":"t"}',
    };
    Object.entries(seeded).forEach(([k, v]) => window.localStorage.setItem(k, v));

    const summary = await purgeClientState();

    const remaining = Object.keys({ ...window.localStorage });
    expect(remaining.sort()).toEqual([...PRESERVED_LOCAL_STORAGE_KEYS].sort());
    expect(window.localStorage.getItem('caresync-theme')).toBe('dark');
    expect(summary.localStorageKeysRemoved).toContain('sb-stub-auth-token');
    // Removed either by the offline-store wipe (legacy keys) or by the storage purge.
    expect(window.localStorage.getItem('care-harmony-offline-cache')).toBeNull();
    expect(summary.errors).toEqual([]);
  });

  it('clears sessionStorage completely, including the Supabase session', async () => {
    installCacheStorage([]);
    installIndexedDb([]);
    window.sessionStorage.setItem('sb-stub-auth-token', '{"refresh_token":"r"}');
    window.sessionStorage.setItem('form_session_patient', '{"name":"Jane Doe"}');
    window.sessionStorage.setItem('correlationId', 'abc');

    await purgeClientState();

    expect(window.sessionStorage.length).toBe(0);
  });

  it('clears the application React Query cache by default', async () => {
    installCacheStorage([]);
    installIndexedDb([]);
    appQueryClient.setQueryData(['patients'], [{ id: 'p1', name: 'Jane Doe' }]);
    expect(appQueryClient.getQueryCache().getAll()).toHaveLength(1);

    const summary = await purgeClientState();

    expect(summary.queryCacheCleared).toBe(true);
    expect(appQueryClient.getQueryCache().getAll()).toHaveLength(0);
  });

  it('clears an injected QueryClient', async () => {
    installCacheStorage([]);
    installIndexedDb([]);
    const client = new QueryClient();
    client.setQueryData(['labs'], { result: 'positive' });

    await purgeClientState({ queryClient: client });

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it('deletes every Cache Storage cache except the Workbox static precache', async () => {
    const { names } = installCacheStorage([
      'supabase-api',
      'supabase-storage',
      'care-harmony-api-v1',
      'caresync-api-v1',
      'workbox-precache-v2-https://app.example/',
    ]);
    installIndexedDb([]);

    const summary = await purgeClientState();

    expect([...names]).toEqual(['workbox-precache-v2-https://app.example/']);
    expect(summary.cachesDeleted.sort()).toEqual(
      ['care-harmony-api-v1', 'caresync-api-v1', 'supabase-api', 'supabase-storage'].sort(),
    );
  });

  it('deletes app IndexedDB databases found via indexedDB.databases()', async () => {
    installCacheStorage([]);
    const { names } = installIndexedDb([
      'care-harmony-cache',
      'caresync-offline',
      'caresync-offline-queue',
      'CareSync-Other',
      'unrelated-library-db',
    ]);

    const summary = await purgeClientState();

    expect([...names]).toEqual(['unrelated-library-db']);
    expect(summary.indexedDbDeleted.sort()).toEqual(
      ['CareSync-Other', 'care-harmony-cache', 'caresync-offline', 'caresync-offline-queue'].sort(),
    );
  });

  it('falls back to known database names when indexedDB.databases() is unavailable', async () => {
    installCacheStorage([]);
    const { factory } = installIndexedDb(['care-harmony-cache', 'caresync-offline'], {
      withDatabases: false,
    });

    await purgeClientState();

    const deleted = (factory.deleteDatabase as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(deleted).toEqual(expect.arrayContaining(['care-harmony-cache', 'caresync-offline']));
  });

  it('does not hang when a database deletion stays blocked', async () => {
    vi.useFakeTimers();
    installCacheStorage(['supabase-api']);
    installIndexedDb(['care-harmony-cache'], { behaviour: { 'care-harmony-cache': 'never' } });

    const pending = purgeClientState();
    await vi.advanceTimersByTimeAsync(5000);
    const summary = await pending;

    expect(summary.indexedDbDeleted).not.toContain('care-harmony-cache');
    expect(summary.cachesDeleted).toEqual(['supabase-api']);
  });

  it('never rejects, even when every step fails', async () => {
    vi.stubGlobal('caches', {
      keys: vi.fn(async () => {
        throw new Error('caches unavailable');
      }),
      delete: vi.fn(),
    });
    vi.stubGlobal('indexedDB', {
      databases: vi.fn(async () => {
        throw new Error('idb unavailable');
      }),
      deleteDatabase: vi.fn(() => {
        throw new Error('idb unavailable');
      }),
    });
    const brokenClient = {
      clear: () => {
        throw new Error('boom');
      },
    };
    window.localStorage.setItem('preferredRole', 'doctor');

    const summary = await purgeClientState({ queryClient: brokenClient });

    expect(summary.queryCacheCleared).toBe(false);
    expect(summary.errors.some((e) => e.startsWith('queryClient'))).toBe(true);
    // Remaining steps still ran.
    expect(window.localStorage.getItem('preferredRole')).toBeNull();
  });

  it('works when Cache Storage and IndexedDB do not exist', async () => {
    vi.stubGlobal('caches', undefined);
    vi.stubGlobal('indexedDB', undefined);
    window.localStorage.setItem('offline_data', 'x');

    const summary = await purgeClientState();

    expect(window.localStorage.getItem('offline_data')).toBeNull();
    expect(summary.cachesDeleted).toEqual([]);
    expect(summary.indexedDbDeleted).toEqual([]);
  });

  it('shares one run between concurrent callers', async () => {
    const { cacheStorage } = installCacheStorage(['supabase-api']);
    installIndexedDb([]);

    const [a, b] = await Promise.all([purgeClientState(), purgeClientState()]);

    expect(a).toBe(b);
    expect(cacheStorage.keys).toHaveBeenCalledTimes(1);
  });
});

describe('deleteLegacySupabaseCaches', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes only supabase-* caches', async () => {
    const { names } = installCacheStorage([
      'supabase-api',
      'supabase-storage',
      'workbox-precache-v2-x',
      'care-harmony-static-v1',
    ]);

    const deleted = await deleteLegacySupabaseCaches();

    expect(deleted.sort()).toEqual(['supabase-api', 'supabase-storage']);
    expect([...names].sort()).toEqual(['care-harmony-static-v1', 'workbox-precache-v2-x']);
  });

  it('resolves to [] when Cache Storage is unavailable', async () => {
    vi.stubGlobal('caches', undefined);
    await expect(deleteLegacySupabaseCaches()).resolves.toEqual([]);
  });
});

describe('purgeClientState: nurse offline store (SECF-06 integration)', () => {
  it('wipes the offline store on every purge, and a failing wipe never blocks logout', async () => {
    const { purgeClientState } = await import('../purgeClientState');
    const wipe = vi.fn().mockResolvedValue(undefined);
    await purgeClientState({ queryClient: null, wipeOfflineStore: wipe });
    expect(wipe).toHaveBeenCalledTimes(1);

    const failing = vi.fn().mockRejectedValue(new Error('blocked'));
    const summary = await purgeClientState({ queryClient: null, wipeOfflineStore: failing });
    expect(failing).toHaveBeenCalledTimes(1);
    expect(summary.errors.some((e) => e.startsWith('offlineStore:'))).toBe(true);
  });
});
