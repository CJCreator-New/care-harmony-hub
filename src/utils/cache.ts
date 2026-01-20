// Redis caching utility for performance optimization
// Use with Upstash Redis or any Redis provider

interface CacheConfig {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

class CacheManager {
  private redis: any;
  private enabled: boolean;

  constructor() {
    this.enabled = !!import.meta.env.VITE_REDIS_URL;
    if (this.enabled) {
      // Initialize Redis client when available
      // this.redis = new Redis(import.meta.env.VITE_REDIS_URL);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;
    try {
      const data = await this.redis?.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, config?: CacheConfig): Promise<void> {
    if (!this.enabled) return;
    try {
      const ttl = config?.ttl || 300; // 5 minutes default
      const prefixedKey = config?.prefix ? `${config.prefix}:${key}` : key;
      await this.redis?.setex(prefixedKey, ttl, JSON.stringify(value));
    } catch {}
  }

  async del(key: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.redis?.del(key);
    } catch {}
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.enabled) return;
    try {
      const keys = await this.redis?.keys(pattern);
      if (keys?.length) {
        await this.redis?.del(...keys);
      }
    } catch {}
  }
}

export const cache = new CacheManager();

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: (id: string) => `user:${id}`,
  HOSPITAL_SETTINGS: (id: string) => `hospital:${id}`,
  ICD10_CODES: 'icd10:all',
  CPT_CODES: 'cpt:all',
  DASHBOARD_STATS: (userId: string) => `stats:${userId}`,
};

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 3600,       // 1 hour
  DAY: 86400,       // 24 hours
};
