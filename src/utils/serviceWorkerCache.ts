/**
 * Service Worker Cache Strategies
 * 
 * Advanced caching strategies for the CareSync HMS PWA.
 * Implements multiple cache patterns for different resource types.
 * 
 * @module serviceWorkerCache
 * @version 1.0.0
 */

// Cache names
const CACHE_NAMES = {
  static: 'care-harmony-static-v1',
  dynamic: 'care-harmony-dynamic-v1',
  api: 'care-harmony-api-v1',
  images: 'care-harmony-images-v1',
  fonts: 'care-harmony-fonts-v1'
};

// Cache duration configuration (in seconds)
const CACHE_DURATION = {
  static: 30 * 24 * 60 * 60,    // 30 days
  api: 5 * 60,                   // 5 minutes
  images: 7 * 24 * 60 * 60,     // 7 days
  fonts: 365 * 24 * 60 * 60     // 1 year
};

// API endpoints that should be cached
const CACHEABLE_API_ENDPOINTS = [
  /\/rest\/v1\/patients/,
  /\/rest\/v1\/appointments/,
  /\/rest\/v1\/prescriptions/,
  /\/rest\/v1\/lab_orders/,
  /\/rest\/v1\/invoices/,
  /\/rest\/v1\/rpc\/get_dashboard_stats/
];

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/pwa-192x192.png',
  '/pwa-512x512.png'
];

/**
 * Determine if a request should be cached
 */
function shouldCache(request: Request): { shouldCache: boolean; cacheName: string; duration: number } {
  const url = new URL(request.url);
  
  // Static assets
  if (request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'document') {
    return { shouldCache: true, cacheName: CACHE_NAMES.static, duration: CACHE_DURATION.static };
  }
  
  // Images
  if (request.destination === 'image') {
    return { shouldCache: true, cacheName: CACHE_NAMES.images, duration: CACHE_DURATION.images };
  }
  
  // Fonts
  if (request.destination === 'font') {
    return { shouldCache: true, cacheName: CACHE_NAMES.fonts, duration: CACHE_DURATION.fonts };
  }
  
  // API calls
  if (url.hostname.includes('supabase.co')) {
    const isCacheable = CACHEABLE_API_ENDPOINTS.some(pattern => pattern.test(url.pathname));
    if (isCacheable) {
      return { shouldCache: true, cacheName: CACHE_NAMES.api, duration: CACHE_DURATION.api };
    }
  }
  
  return { shouldCache: false, cacheName: '', duration: 0 };
}

/**
 * Cache First strategy - for static assets
 * Returns from cache if available, otherwise fetches and caches
 */
async function cacheFirst(request: Request, cacheName: string, duration: number): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Check if cache is still valid
    const cachedTime = cachedResponse.headers.get('x-cached-time');
    if (cachedTime) {
      const age = (Date.now() - parseInt(cachedTime)) / 1000;
      if (age < duration) {
        return cachedResponse;
      }
    }
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone response before caching
      const responseToCache = networkResponse.clone();
      
      // Add cache timestamp header
      const headers = new Headers(responseToCache.headers);
      headers.set('x-cached-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      await cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // Return stale cache if network fails
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

/**
 * Network First strategy - for API calls
 * Fetches from network first, falls back to cache
 */
async function networkFirst(request: Request, cacheName: string, duration: number): Promise<Response> {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Update cache with fresh data
      const responseToCache = networkResponse.clone();
      
      const headers = new Headers(responseToCache.headers);
      headers.set('x-cached-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      await cache.put(request, modifiedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // Return from cache if network fails
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API calls
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Network unavailable. Using cached data.' }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Stale While Revalidate strategy - for non-critical data
 * Returns cached data immediately, updates cache in background
 */
async function staleWhileRevalidate(request: Request, cacheName: string, duration: number): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always fetch in background
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      
      const headers = new Headers(responseToCache.headers);
      headers.set('x-cached-time', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      await cache.put(request, modifiedResponse);
    }
    return networkResponse;
  }).catch(() => {
    // Silently fail background fetch
  });
  
  // Return cached response immediately if available and valid
  if (cachedResponse) {
    const cachedTime = cachedResponse.headers.get('x-cached-time');
    if (cachedTime) {
      const age = (Date.now() - parseInt(cachedTime)) / 1000;
      if (age < duration) {
        return cachedResponse;
      }
    }
  }
  
  // Wait for network response if no valid cache
  return fetchPromise.then(response => response || cachedResponse);
}

/**
 * Handle fetch event with appropriate strategy
 */
export async function handleFetch(request: Request): Promise<Response> {
  const { shouldCache, cacheName, duration } = shouldCache(request);
  
  if (!shouldCache) {
    return fetch(request);
  }
  
  // Choose strategy based on resource type
  if (cacheName === CACHE_NAMES.static || cacheName === CACHE_NAMES.fonts) {
    return cacheFirst(request, cacheName, duration);
  }
  
  if (cacheName === CACHE_NAMES.api) {
    return networkFirst(request, cacheName, duration);
  }
  
  if (cacheName === CACHE_NAMES.images) {
    return staleWhileRevalidate(request, cacheName, duration);
  }
  
  return fetch(request);
}

/**
 * Precache static assets during service worker installation
 */
export async function precacheStaticAssets(): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.static);
  
  const assetsToCache = STATIC_ASSETS.map(asset => {
    return fetch(asset).then(response => {
      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set('x-cached-time', Date.now().toString());
        
        const modifiedResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
        
        return cache.put(asset, modifiedResponse);
      }
    }).catch(error => {
      console.warn(`Failed to cache ${asset}:`, error);
    });
  });
  
  await Promise.all(assetsToCache);
}

/**
 * Clear old caches
 */
export async function clearOldCaches(currentVersion: string): Promise<void> {
  const cacheNames = await caches.keys();
  
  const cachesToDelete = cacheNames.filter(name => {
    // Keep current version caches
    return !name.includes(currentVersion);
  });
  
  await Promise.all(
    cachesToDelete.map(name => caches.delete(name))
  );
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCaches: number;
  totalSize: number;
  entries: Record<string, number>;
}> {
  const cacheNames = Object.values(CACHE_NAMES);
  const entries: Record<string, number> = {};
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    entries[cacheName] = requests.length;
    
    // Estimate size (this is approximate)
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return {
    totalCaches: cacheNames.length,
    totalSize,
    entries
  };
}

/**
 * Clear specific cache
 */
export async function clearCache(cacheName: string): Promise<void> {
  await caches.delete(cacheName);
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

// Export cache names for external use
export { CACHE_NAMES, CACHE_DURATION, STATIC_ASSETS };

// Default export
export default {
  handleFetch,
  precacheStaticAssets,
  clearOldCaches,
  getCacheStats,
  clearCache,
  clearAllCaches,
  CACHE_NAMES,
  CACHE_DURATION
};
