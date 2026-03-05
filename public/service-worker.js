// ─── SELF-UNREGISTERING STUB ────────────────────────────────────────────────
// This legacy service-worker.js previously competed with the VitePWA Workbox
// SW (sw.js), causing stale-cache empty-page issues after every new build.
// It now unregisters itself, purges all old caches, and reloads open tabs so
// the Workbox SW takes sole control cleanly.

self.addEventListener('install', () => {
  // Activate immediately — skip the "waiting" phase.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge every cache this SW ever created so no stale assets remain.
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));

      // Unregister this SW — the VitePWA Workbox sw.js will take over.
      // NOTE: Do NOT call client.navigate() here. Forcing a reload mid-session
      // interrupts lazy-module fetches and React navigation, causing blank pages
      // and "failed to fetch dynamically imported module" errors. The cache purge
      // + unregistration is sufficient; main.tsx handles the rest via getRegistrations().
      await self.registration.unregister();
    })()
  );
});
