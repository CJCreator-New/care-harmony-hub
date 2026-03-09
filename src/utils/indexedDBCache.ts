/**
 * IndexedDB Cache Utility
 * 
 * Replaces localStorage with IndexedDB for larger storage capacity (50MB+ vs 5-10MB)
 * and better performance for structured healthcare data.
 * 
 * @module indexedDBCache
 * @version 1.0.0
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database configuration
const DB_NAME = 'care-harmony-cache';
const DB_VERSION = 1;
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit

// Cache TTL configuration (in milliseconds)
const CACHE_TTL = {
  patients: 1000 * 60 * 5,      // 5 minutes
  appointments: 1000 * 60 * 2,  // 2 minutes
  prescriptions: 1000 * 60 * 10, // 10 minutes
  labResults: 1000 * 60 * 30,   // 30 minutes
  billing: 1000 * 60 * 15,      // 15 minutes
  default: 1000 * 60 * 5        // 5 minutes default
};

// Database schema
interface CareSyncDB extends DBSchema {
  patients: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      hospitalId: string;
    };
    indexes: { 'by-hospital': string; 'by-timestamp': number };
  };
  appointments: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      hospitalId: string;
    };
    indexes: { 'by-hospital': string; 'by-timestamp': number };
  };
  prescriptions: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      hospitalId: string;
    };
    indexes: { 'by-hospital': string; 'by-timestamp': number };
  };
  labResults: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      hospitalId: string;
    };
    indexes: { 'by-hospital': string; 'by-timestamp': number };
  };
  billing: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      hospitalId: string;
    };
    indexes: { 'by-hospital': string; 'by-timestamp': number };
  };
  offlineActions: {
    key: string;
    value: {
      id: string;
      type: 'create' | 'update' | 'delete';
      table: string;
      data: any;
      timestamp: number;
      retryCount: number;
      maxRetries: number;
    };
    indexes: { 'by-timestamp': number };
  };
  metadata: {
    key: string;
    value: {
      lastSync: number;
      cacheSize: number;
      version: string;
    };
  };
}

class IndexedDBCache {
  private db: IDBPDatabase<CareSyncDB> | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInit();
    return this.initPromise;
  }

  private async doInit(): Promise<void> {
    try {
      this.db = await openDB<CareSyncDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create stores for different data types
          const stores = ['patients', 'appointments', 'prescriptions', 'labResults', 'billing'];
          
          stores.forEach(storeName => {
            if (!db.objectStoreNames.contains(storeName)) {
              const store = db.createObjectStore(storeName, { keyPath: 'id' });
              store.createIndex('by-hospital', 'hospitalId');
              store.createIndex('by-timestamp', 'timestamp');
            }
          });

          // Offline actions store
          if (!db.objectStoreNames.contains('offlineActions')) {
            const actionStore = db.createObjectStore('offlineActions', { keyPath: 'id' });
            actionStore.createIndex('by-timestamp', 'timestamp');
          }

          // Metadata store
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata', { keyPath: 'key' });
          }
        }
      });

      // Clean up old cache entries on init
      await this.cleanup();
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(
    storeName: keyof CareSyncDB,
    key: string,
    hospitalId?: string
  ): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    try {
      const entry = await this.db.get(storeName as any, key);
      
      if (!entry) return null;

      // Check if entry belongs to correct hospital
      if (hospitalId && entry.hospitalId !== hospitalId) {
        return null;
      }

      // Check TTL
      const ttl = CACHE_TTL[storeName as keyof typeof CACHE_TTL] || CACHE_TTL.default;
      if (Date.now() - entry.timestamp > ttl) {
        // Entry expired, delete it
        await this.db.delete(storeName as any, key);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.error(`Failed to get from cache [${storeName}]:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(
    storeName: keyof CareSyncDB,
    key: string,
    data: T,
    hospitalId: string
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      const entry = {
        id: key,
        data,
        timestamp: Date.now(),
        hospitalId
      };

      await this.db.put(storeName as any, entry);
      
      // Check cache size and cleanup if needed
      await this.checkCacheSize();
    } catch (error) {
      console.error(`Failed to set cache [${storeName}]:`, error);
    }
  }

  /**
   * Get all data for a hospital from a store
   */
  async getAllByHospital<T>(
    storeName: keyof CareSyncDB,
    hospitalId: string
  ): Promise<T[]> {
    await this.init();
    if (!this.db) return [];

    try {
      const entries = await this.db.getAllFromIndex(
        storeName as any,
        'by-hospital',
        hospitalId
      );

      // Filter out expired entries
      const ttl = CACHE_TTL[storeName as keyof typeof CACHE_TTL] || CACHE_TTL.default;
      const now = Date.now();
      
      const validEntries = entries.filter(entry => {
        if (now - entry.timestamp > ttl) {
          // Delete expired entry
          this.db!.delete(storeName as any, entry.id);
          return false;
        }
        return true;
      });

      return validEntries.map(entry => entry.data);
    } catch (error) {
      console.error(`Failed to get all from cache [${storeName}]:`, error);
      return [];
    }
  }

  /**
   * Delete specific entry
   */
  async delete(storeName: keyof CareSyncDB, key: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      await this.db.delete(storeName as any, key);
    } catch (error) {
      console.error(`Failed to delete from cache [${storeName}]:`, error);
    }
  }

  /**
   * Clear all data for a hospital
   */
  async clearHospital(hospitalId: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    const stores = ['patients', 'appointments', 'prescriptions', 'labResults', 'billing'];
    
    for (const storeName of stores) {
      try {
        const entries = await this.db.getAllFromIndex(
          storeName as any,
          'by-hospital',
          hospitalId
        );
        
        for (const entry of entries) {
          await this.db.delete(storeName as any, entry.id);
        }
      } catch (error) {
        console.error(`Failed to clear hospital data [${storeName}]:`, error);
      }
    }
  }

  /**
   * Clear entire cache
   */
  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const stores = ['patients', 'appointments', 'prescriptions', 'labResults', 'billing', 'offlineActions'];
    
    for (const storeName of stores) {
      try {
        await this.db.clear(storeName as any);
      } catch (error) {
        console.error(`Failed to clear cache [${storeName}]:`, error);
      }
    }
  }

  /**
   * Add offline action
   */
  async addOfflineAction(action: {
    id: string;
    type: 'create' | 'update' | 'delete';
    table: string;
    data: any;
    maxRetries: number;
  }): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.put('offlineActions', {
        ...action,
        timestamp: Date.now(),
        retryCount: 0
      });
    } catch (error) {
      console.error('Failed to add offline action:', error);
      throw error;
    }
  }

  /**
   * Get all pending offline actions
   */
  async getOfflineActions(): Promise<CareSyncDB['offlineActions']['value'][]> {
    await this.init();
    if (!this.db) return [];

    try {
      return await this.db.getAll('offlineActions');
    } catch (error) {
      console.error('Failed to get offline actions:', error);
      return [];
    }
  }

  /**
   * Update offline action (e.g., increment retry count)
   */
  async updateOfflineAction(
    action: CareSyncDB['offlineActions']['value']
  ): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      await this.db.put('offlineActions', action);
    } catch (error) {
      console.error('Failed to update offline action:', error);
    }
  }

  /**
   * Delete offline action
   */
  async deleteOfflineAction(id: string): Promise<void> {
    await this.init();
    if (!this.db) return;

    try {
      await this.db.delete('offlineActions', id);
    } catch (error) {
      console.error('Failed to delete offline action:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    await this.init();
    if (!this.db) {
      return { totalEntries: 0, oldestEntry: 0, newestEntry: 0 };
    }

    const stores = ['patients', 'appointments', 'prescriptions', 'labResults', 'billing'];
    let totalEntries = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const storeName of stores) {
      try {
        const entries = await this.db.getAll(storeName as any);
        totalEntries += entries.length;
        
        for (const entry of entries) {
          if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
          if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
        }
      } catch (error) {
        console.error(`Failed to get stats [${storeName}]:`, error);
      }
    }

    return { totalEntries, oldestEntry, newestEntry };
  }

  /**
   * Clean up expired entries
   */
  private async cleanup(): Promise<void> {
    if (!this.db) return;

    const stores = ['patients', 'appointments', 'prescriptions', 'labResults', 'billing'];
    const now = Date.now();

    for (const storeName of stores) {
      try {
        const ttl = CACHE_TTL[storeName as keyof typeof CACHE_TTL] || CACHE_TTL.default;
        const entries = await this.db.getAll(storeName as any);
        
        for (const entry of entries) {
          if (now - entry.timestamp > ttl) {
            await this.db.delete(storeName as any, entry.id);
          }
        }
      } catch (error) {
        console.error(`Failed to cleanup [${storeName}]:`, error);
      }
    }

    // Clean up old offline actions (older than 7 days)
    try {
      const actions = await this.db.getAll('offlineActions');
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      
      for (const action of actions) {
        if (action.timestamp < sevenDaysAgo) {
          await this.db.delete('offlineActions', action.id);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup offline actions:', error);
    }
  }

  /**
   * Check cache size and cleanup if needed
   */
  private async checkCacheSize(): Promise<void> {
    // This is a simplified check - in production you'd want more sophisticated size tracking
    const stats = await this.getStats();
    
    // If we have too many entries, clean up oldest ones
    if (stats.totalEntries > 10000) {
      await this.cleanup();
    }
  }
}

// Singleton instance
export const indexedDBCache = new IndexedDBCache();

// Export types
export type { CareSyncDB };
export { CACHE_TTL, MAX_CACHE_SIZE };

export default indexedDBCache;
