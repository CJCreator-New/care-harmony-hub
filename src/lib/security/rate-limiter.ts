interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

class RateLimiter {
  private requests = new Map<string, number[]>();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    const recentRequests = userRequests.filter(time => now - time < config.windowMs);

    if (recentRequests.length >= config.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    this.cleanup();
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, times] of this.requests.entries()) {
      const validTimes = times.filter(time => now - time < 60000);
      if (validTimes.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimes);
      }
    }
  }

  reset(key: string) {
    this.requests.delete(key);
  }
}

export const rateLimiter = new RateLimiter();

export const useRateLimit = () => {
  const checkLimit = (key: string, maxRequests = 100, windowMs = 60000): boolean => {
    return rateLimiter.isAllowed(key, { maxRequests, windowMs });
  };

  return { checkLimit };
};
