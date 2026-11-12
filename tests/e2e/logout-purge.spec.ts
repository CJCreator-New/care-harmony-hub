/**
 * SECF-04 / SECF-05: logout must leave no PHI in the browser profile.
 *
 * Runs against the Vite dev server with E2E mock auth (VITE_E2E_MOCK_AUTH=true,
 * set by playwright.config.ts webServer and .env.test), so it needs no Supabase
 * backend. The mock-auth logout path calls the same purgeClientState() as the
 * real Supabase path; the Supabase-specific parts (signOut fallback, SIGNED_OUT
 * handler) are covered by src/contexts/__tests__/AuthContext.logout.test.tsx.
 *
 * The service worker is disabled in dev (vite.config.ts devOptions), so Cache
 * Storage is seeded directly from the page, the same way an old SW would have
 * left `supabase-*` caches behind.
 *
 *   npx playwright test tests/e2e/logout-purge.spec.ts --project=chromium
 */
import { test, expect, type Page } from '@playwright/test';

const MOCK_USER = 'nurse@testgeneral.com';
const ALLOWED_LOCAL_KEYS = ['caresync-theme', 'sidebar-collapsed'];

async function snapshotClientState(page: Page) {
  return page.evaluate(async () => {
    const local = Object.keys(window.localStorage).sort();
    const session = Object.keys(window.sessionStorage).sort();
    const cacheNames = 'caches' in window ? (await caches.keys()).sort() : [];
    const dbs =
      typeof indexedDB.databases === 'function'
        ? (await indexedDB.databases()).map((d) => d.name ?? '').sort()
        : [];
    return { local, session, cacheNames, dbs };
  });
}

test.describe('logout purges client-side state @security', () => {
  test('localStorage, sessionStorage, Cache Storage and IndexedDB hold no app data after logout', async ({
    page,
  }) => {
    // 1. Mock sign-in (dev/test builds only).
    await page.goto('/hospital');
    await page.evaluate((email) => {
      window.localStorage.setItem('e2e-mock-auth-user', email);
      window.localStorage.setItem('caresync-theme', 'dark');
    }, MOCK_USER);
    await page.goto('/dashboard');
    const logoutButton = page.getByRole('button', { name: 'Logout from application' });
    await expect(logoutButton).toBeVisible({ timeout: 60_000 });

    // 2. Seed every client-side store the app (or an old service worker) writes PHI to.
    await page.evaluate(async () => {
      const phi = JSON.stringify({ patient: 'Jane Doe', mrn: 'MRN-0001' });
      for (const key of [
        'care-harmony-offline-cache',
        'offline_data',
        'offline_patients_cache',
        'offline_vitals_cache',
        'offline_medications_cache',
        'lab-samples-fallback',
        'testing-data',
        'preferredRole',
        'sb-stub-auth-token',
      ]) {
        window.localStorage.setItem(key, phi);
      }
      window.localStorage.setItem('sidebar-collapsed', 'true');
      window.sessionStorage.setItem('sb-stub-auth-token', '{"refresh_token":"r"}');
      window.sessionStorage.setItem('form_session_patient-registration', phi);

      for (const name of ['supabase-api', 'supabase-storage']) {
        const cache = await caches.open(name);
        await cache.put(
          'https://stub.supabase.co/rest/v1/patients?select=*',
          new Response(phi, { headers: { 'content-type': 'application/json' } }),
        );
      }

      const openDb = (name: string) =>
        new Promise<void>((resolve, reject) => {
          const request = indexedDB.open(name, 1);
          request.onupgradeneeded = () => request.result.createObjectStore('records');
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('records', 'readwrite');
            tx.objectStore('records').put(phi, 'p1');
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
          request.onerror = () => reject(request.error);
        });
      await openDb('care-harmony-cache');
      await openDb('caresync-offline');
    });

    const before = await snapshotClientState(page);
    expect(before.local).toContain('care-harmony-offline-cache');
    expect(before.cacheNames).toEqual(expect.arrayContaining(['supabase-api', 'supabase-storage']));
    expect(before.dbs).toEqual(expect.arrayContaining(['care-harmony-cache', 'caresync-offline']));

    // 3. Log out through the UI.
    await logoutButton.click();
    await page.waitForURL(/\/hospital/);

    // 4. Nothing but harmless UI preferences survives.
    await expect
      .poll(async () => (await snapshotClientState(page)).dbs.filter((n) => /^(care-harmony-cache|caresync)/i.test(n)))
      .toEqual([]);
    const after = await snapshotClientState(page);
    expect(after.local.filter((k) => !ALLOWED_LOCAL_KEYS.includes(k))).toEqual([]);
    expect(after.session).toEqual([]);
    expect(after.cacheNames.filter((n) => !n.startsWith('workbox-precache'))).toEqual([]);
    expect(await page.evaluate(() => window.localStorage.getItem('caresync-theme'))).toBe('dark');

    // 5. A reload does not restore the session.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/hospital/);
  });
});
