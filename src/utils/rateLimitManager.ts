export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (context: Record<string, unknown>) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export interface RateLimitStatus {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
  isLimited: boolean;
}

class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, number[]> = new Map();
  private config: RateLimitConfig;

  private constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests || 100,
      windowMs: config.windowMs || 60000,
      skipSuccessfulRequests: config.skipSuccessfulRequests ?? false,
      skipFailedRequests: config.skipFailedRequests ?? false,
      keyGenerator: config.keyGenerator || ((ctx) => (ctx.userId as string) || 'anonymous'),
    };

    this.cleanup();
  }

  static getInstance(config?: RateLimitConfig): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter(config || { maxRequests: 100, windowMs: 60000 });
    }
    return RateLimiter.instance;
  }

  check(context: Record<string, unknown>): RateLimitStatus {
    const key = this.config.keyGenerator?.(context) || 'default';
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    const current = timestamps.length;
    const isLimited = current >= this.config.maxRequests;
    const resetTime = timestamps.length > 0 ? timestamps[0] + this.config.windowMs : now + this.config.windowMs;

    if (!isLimited) {
      timestamps.push(now);
      this.requests.set(key, timestamps);
    }

    return {
      limit: this.config.maxRequests,
      current,
      remaining: Math.max(0, this.config.maxRequests - current),
      resetTime,
      isLimited,
    };
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
  }

  private cleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const windowStart = now - this.config.windowMs;

      this.requests.forEach((timestamps, key) => {
        const filtered = timestamps.filter((t) => t > windowStart);
        if (filtered.length === 0) {
          this.requests.delete(key);
        } else {
          this.requests.set(key, filtered);
        }
      });
    }, this.config.windowMs);
  }

  getStats(): Record<string, unknown> {
    const stats: Record<string, unknown> = {};
    this.requests.forEach((timestamps, key) => {
      stats[key] = {
        requests: timestamps.length,
        percentage: Math.round((timestamps.length / this.config.maxRequests) * 100),
      };
    });
    return stats;
  }
}

export const rateLimiter = RateLimiter.getInstance();

export function createRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = RateLimiter.getInstance(config);

  return (context: Record<string, unknown>) => {
    const status = limiter.check(context);

    if (status.isLimited) {
      const error = new Error('Rate limit exceeded');
      (error as Record<string, unknown>).status = 429;
      (error as Record<string, unknown>).retryAfter = Math.ceil((status.resetTime - Date.now()) / 1000);
      throw error;
    }

    return status;
  };
}
