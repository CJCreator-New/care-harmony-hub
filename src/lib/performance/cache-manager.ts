import { sanitizeUrl } from '@/utils/sanitize';

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  static: `caresync-static-${CACHE_VERSION}`,
  api: `caresync-api-${CACHE_VERSION}`,
  images: `caresync-images-${CACHE_VERSION}`,
};

export class CacheManager {
  static async cacheStaticAssets(urls: string[]) {
    const cache = await caches.open(CACHE_NAMES.static);
    return cache.addAll(urls);
  }

  static async cacheAPIResponse(url: string, response: Response, ttl = 300000) {
    const cache = await caches.open(CACHE_NAMES.api);
    const clonedResponse = response.clone();
    
    const cachedResponse = new Response(clonedResponse.body, {
      status: clonedResponse.status,
      statusText: clonedResponse.statusText,
      headers: {
        ...Object.fromEntries(clonedResponse.headers.entries()),
        'X-Cache-Timestamp': Date.now().toString(),
        'X-Cache-TTL': ttl.toString(),
      },
    });
    
    await cache.put(url, cachedResponse);
  }

  static async getCachedAPIResponse(url: string): Promise<Response | null> {
    const cache = await caches.open(CACHE_NAMES.api);
    const cachedResponse = await cache.match(url);
    
    if (!cachedResponse) return null;
    
    const timestamp = cachedResponse.headers.get('X-Cache-Timestamp');
    const ttl = cachedResponse.headers.get('X-Cache-TTL');
    
    if (timestamp && ttl) {
      const age = Date.now() - parseInt(timestamp);
      if (age > parseInt(ttl)) {
        await cache.delete(url);
        return null;
      }
    }
    
    return cachedResponse;
  }

  static async clearOldCaches() {
    const cacheNames = await caches.keys();
    const validCaches = Object.values(CACHE_NAMES);
    
    return Promise.all(
      cacheNames
        .filter(name => !validCaches.includes(name))
        .map(name => caches.delete(name))
    );
  }

  static async clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

export const useCacheStrategy = () => {
  const cacheFirst = async (url: string): Promise<Response> => {
    const sanitizedUrl = sanitizeUrl(url);
    if (!sanitizedUrl) {
      throw new Error('Invalid URL provided');
    }
    
    const cached = await CacheManager.getCachedAPIResponse(sanitizedUrl);
    if (cached) return cached;
    
    const response = await fetch(sanitizedUrl);
    await CacheManager.cacheAPIResponse(sanitizedUrl, response);
    return response;
  };

  const networkFirst = async (url: string): Promise<Response> => {
    const sanitizedUrl = sanitizeUrl(url);
    if (!sanitizedUrl) {
      throw new Error('Invalid URL provided');
    }
    
    try {
      const response = await fetch(sanitizedUrl);
      await CacheManager.cacheAPIResponse(sanitizedUrl, response);
      return response;
    } catch {
      const cached = await CacheManager.getCachedAPIResponse(sanitizedUrl);
      if (cached) return cached;
      throw new Error('Network failed and no cache available');
    }
  };

  return { cacheFirst, networkFirst };
};
