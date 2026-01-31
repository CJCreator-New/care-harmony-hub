interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

class CacheManager<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: T, ttl: number = this.defaultTTL, tags: string[] = []): void {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt, tags });
    
    // Index by tags for batch invalidation
    tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }
    
    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.tags.forEach(tag => {
        this.tagIndex.get(tag)?.delete(key);
      });
    }
    this.cache.delete(key);
  }

  invalidateByTag(tag: string): void {
    const keys = this.tagIndex.get(tag);
    if (keys) {
      keys.forEach(key => this.delete(key));
      this.tagIndex.delete(tag);
    }
  }

  clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        expiresIn: Math.max(0, entry.expiresAt - Date.now()),
        tags: entry.tags,
      })),
    };
  }
}

// Query result caching
export const queryCache = new CacheManager();

// User data caching
export const userCache = new CacheManager();

// Patient data caching
export const patientCache = new CacheManager();

// Invalidate all patient-related caches
export const invalidatePatientCache = (patientId: string): void => {
  patientCache.invalidateByTag(`patient-${patientId}`);
  patientCache.invalidateByTag('patients-list');
};

// Invalidate all user-related caches
export const invalidateUserCache = (userId: string): void => {
  userCache.invalidateByTag(`user-${userId}`);
  userCache.invalidateByTag('users-list');
};
