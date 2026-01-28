/**
 * Cache Invalidation System
 * 
 * Manages cache invalidation across IndexedDB, Service Worker, and React Query.
 * Ensures data consistency when mutations occur.
 * 
 * @module cacheInvalidation
 * @version 1.0.0
 */

import { QueryClient } from '@tanstack/react-query';
import { indexedDBCache } from './indexedDBCache';
import { CACHE_NAMES } from './serviceWorkerCache';

// Global query client instance (set during app initialization)
let queryClient: QueryClient | null = null;

/**
 * Initialize cache invalidation with QueryClient
 */
export function initializeCacheInvalidation(client: QueryClient): void {
  queryClient = client;
}

/**
 * Cache invalidation strategies
 */
export type InvalidationStrategy = 
  | 'exact'           // Invalidate exact key only
  | 'prefix'          // Invalidate all keys with prefix
  | 'related'         // Invalidate related entities
  | 'all';            // Invalidate all caches

/**
 * Entity relationships for cascade invalidation
 */
const ENTITY_RELATIONSHIPS: Record<string, string[]> = {
  patients: ['appointments', 'prescriptions', 'lab_orders', 'invoices', 'consultations'],
  appointments: ['patients', 'consultations', 'patient_queue'],
  prescriptions: ['patients', 'medications'],
  lab_orders: ['patients', 'lab_results'],
  invoices: ['patients', 'payments'],
  staff: ['appointments', 'consultations', 'departments'],
  departments: ['staff', 'appointments', 'patient_queue']
};

/**
 * Invalidate React Query cache
 */
function invalidateReactQuery(
  entity: string,
  id?: string,
  strategy: InvalidationStrategy = 'related'
): void {
  if (!queryClient) {
    console.warn('QueryClient not initialized for cache invalidation');
    return;
  }

  switch (strategy) {
    case 'exact':
      if (id) {
        queryClient.invalidateQueries({ queryKey: [entity, id] });
      }
      break;

    case 'prefix':
      queryClient.invalidateQueries({ queryKey: [entity] });
      break;

    case 'related':
      // Invalidate the entity itself
      queryClient.invalidateQueries({ queryKey: [entity] });
      
      // Invalidate related entities
      const related = ENTITY_RELATIONSHIPS[entity] || [];
      related.forEach(relatedEntity => {
        queryClient!.invalidateQueries({ queryKey: [relatedEntity] });
      });
      break;

    case 'all':
      queryClient.invalidateQueries();
      break;
  }
}

/**
 * Invalidate IndexedDB cache
 */
async function invalidateIndexedDB(
  entity: string,
  id?: string,
  hospitalId?: string
): Promise<void> {
  try {
    if (id) {
      // Invalidate specific record
      await indexedDBCache.delete(entity as any, id);
    } else if (hospitalId) {
      // Invalidate all records for hospital
      await indexedDBCache.clearHospital(hospitalId);
    }
  } catch (error) {
    console.error('Failed to invalidate IndexedDB cache:', error);
  }
}

/**
 * Invalidate Service Worker cache
 */
async function invalidateServiceWorkerCache(entity: string): Promise<void> {
  try {
    // Check if service worker is available
    if (!('caches' in window)) return;

    const cache = await caches.open(CACHE_NAMES.api);
    const requests = await cache.keys();
    
    // Find and delete cached API responses for this entity
    const entityPattern = new RegExp(`/rest/v1/${entity}`);
    
    const deletions = requests
      .filter(request => entityPattern.test(request.url))
      .map(request => cache.delete(request));
    
    await Promise.all(deletions);
  } catch (error) {
    console.error('Failed to invalidate Service Worker cache:', error);
  }
}

/**
 * Main cache invalidation function
 * Invalidates across all cache layers
 */
export async function invalidateCache(
  entity: string,
  options: {
    id?: string;
    hospitalId?: string;
    strategy?: InvalidationStrategy;
    skipReactQuery?: boolean;
    skipIndexedDB?: boolean;
    skipServiceWorker?: boolean;
  } = {}
): Promise<void> {
  const {
    id,
    hospitalId,
    strategy = 'related',
    skipReactQuery = false,
    skipIndexedDB = false,
    skipServiceWorker = false
  } = options;

  const promises: Promise<void>[] = [];

  // React Query invalidation
  if (!skipReactQuery) {
    invalidateReactQuery(entity, id, strategy);
  }

  // IndexedDB invalidation
  if (!skipIndexedDB) {
    promises.push(invalidateIndexedDB(entity, id, hospitalId));
  }

  // Service Worker cache invalidation
  if (!skipServiceWorker) {
    promises.push(invalidateServiceWorkerCache(entity));
  }

  await Promise.all(promises);
}

/**
 * Invalidate cache after mutation
 * Smart invalidation based on mutation type
 */
export async function invalidateAfterMutation(
  entity: string,
  mutationType: 'create' | 'update' | 'delete',
  data?: { id?: string; hospitalId?: string }
): Promise<void> {
  const strategy: InvalidationStrategy = mutationType === 'delete' ? 'related' : 'prefix';
  
  await invalidateCache(entity, {
    id: data?.id,
    hospitalId: data?.hospitalId,
    strategy
  });
}

/**
 * Batch invalidate multiple entities
 */
export async function invalidateMultiple(
  entities: Array<{
    entity: string;
    id?: string;
    strategy?: InvalidationStrategy;
  }>,
  hospitalId?: string
): Promise<void> {
  const promises = entities.map(({ entity, id, strategy }) =>
    invalidateCache(entity, { id, hospitalId, strategy })
  );
  
  await Promise.all(promises);
}

/**
 * Clear all caches (nuclear option)
 */
export async function clearAllCaches(): Promise<void> {
  // Clear React Query
  if (queryClient) {
    queryClient.clear();
  }

  // Clear IndexedDB
  await indexedDBCache.clearAll();

  // Clear Service Worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
}

/**
 * Get cache invalidation statistics
 */
export async function getInvalidationStats(): Promise<{
  reactQueryInitialized: boolean;
  indexedDBInitialized: boolean;
  serviceWorkerAvailable: boolean;
}> {
  return {
    reactQueryInitialized: queryClient !== null,
    indexedDBInitialized: true, // Always available after import
    serviceWorkerAvailable: 'caches' in window
  };
}

/**
 * Hook for automatic cache invalidation after mutations
 * Usage with React Query mutations
 */
export function createInvalidationConfig(
  entity: string,
  options: {
    relatedEntities?: string[];
    hospitalId?: string;
  } = {}
) {
  const { relatedEntities = [], hospitalId } = options;

  return {
    onSuccess: async (data: any) => {
      // Invalidate the main entity
      await invalidateCache(entity, { hospitalId, strategy: 'prefix' });
      
      // Invalidate related entities
      for (const relatedEntity of relatedEntities) {
        await invalidateCache(relatedEntity, { hospitalId, strategy: 'prefix' });
      }
      
      return data;
    },
    onError: (error: any) => {
      console.error(`Mutation error for ${entity}:`, error);
      throw error;
    }
  };
}

// Export types
export { QueryClient };

// Default export
export default {
  initializeCacheInvalidation,
  invalidateCache,
  invalidateAfterMutation,
  invalidateMultiple,
  clearAllCaches,
  getInvalidationStats,
  createInvalidationConfig,
  ENTITY_RELATIONSHIPS
};
