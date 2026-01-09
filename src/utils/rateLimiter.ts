import React from 'react';

// Request record interface
interface RequestRecord {
  timestamp: number;
  count: number;
}

// Rate limit result interface
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  blockExpires?: number;
}

// Rate limit status interface
interface RateLimitStatus {
  currentRequests: number;
  remaining: number;
  resetTime: number;
  blocked: boolean;
  blockExpires?: number;
}

// Rate Limiting Service for CareSync HMS
export class RateLimiter {
  private requests: Map<string, RequestRecord[]> = new Map();
  private blockedKeys: Map<string, number> = new Map();

  constructor(
    private windowMs: number = 60000, // 1 minute
    private maxRequests: number = 100,
    private blockDuration: number = 300000 // 5 minutes
  ) {
    // Clean up old records periodically
    setInterval(() => this.cleanup(), this.windowMs);
  }

  // Check if request is allowed
  private isAllowed(key: string, increment: boolean = true): RateLimitResult {
    // Check if key is currently blocked
    const blockExpiry = this.blockedKeys.get(key);
    if (blockExpiry && blockExpiry > Date.now()) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: blockExpiry,
        blocked: true,
        blockExpires: blockExpiry
      };
    }

    // Remove expired block
    if (blockExpiry) {
      this.blockedKeys.delete(key);
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing records for this key
    let records = this.requests.get(key) || [];

    // Filter out old records
    records = records.filter(record => record.timestamp > windowStart);

    // Calculate current request count
    const currentCount = records.reduce((sum, record) => sum + record.count, 0);

    if (currentCount >= this.maxRequests) {
      // Block the key
      const blockExpiry = now + this.blockDuration;
      this.blockedKeys.set(key, blockExpiry);

      return {
        allowed: false,
        remaining: 0,
        resetTime: windowStart + this.windowMs,
        blocked: true,
        blockExpires: blockExpiry
      };
    }

    // Request is allowed
    const remaining = Math.max(0, this.maxRequests - currentCount - (increment ? 1 : 0));
    const resetTime = windowStart + this.windowMs;

    if (increment) {
      // Add new request record
      records.push({ timestamp: now, count: 1 });
      this.requests.set(key, records);
    }

    return {
      allowed: true,
      remaining,
      resetTime,
      blocked: false
    };
  }

  // Consume a request (decrement remaining)
  consume(key: string): boolean {
    return this.isAllowed(key, true).allowed;
  }

  // Check without consuming
  check(key: string): RateLimitResult {
    return this.isAllowed(key, false);
  }

  // Reset rate limit for a key
  reset(key: string): void {
    this.requests.delete(key);
    this.blockedKeys.delete(key);
  }

  // Get rate limit status for a key
  getStatus(key: string): RateLimitStatus {
    const checkResult = this.check(key);
    const records = this.requests.get(key) || [];
    const currentRequests = records.reduce((sum, record) => sum + record.count, 0);

    return {
      currentRequests,
      remaining: checkResult.remaining,
      resetTime: checkResult.resetTime,
      blocked: checkResult.blocked,
      blockExpires: checkResult.blockExpires
    };
  }

  // Clean up old records
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Clean up request records
    for (const [key, records] of this.requests.entries()) {
      const filtered = records.filter(record => record.timestamp > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }

    // Clean up expired blocks
    for (const [key, expiry] of this.blockedKeys.entries()) {
      if (expiry <= now) {
        this.blockedKeys.delete(key);
      }
    }
  }

  // Get all rate limit stats
  getStats(): {
    totalKeys: number;
    blockedKeys: number;
    activeKeys: number;
  } {
    return {
      totalKeys: this.requests.size + this.blockedKeys.size,
      blockedKeys: this.blockedKeys.size,
      activeKeys: this.requests.size
    };
  }
}

// API Rate Limiter with different limits for different endpoints
export class APIRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  constructor() {
    // Default rate limiter for general API calls
    this.limiters.set('default', new RateLimiter(60000, 100, 300000)); // 100 requests per minute

    // Stricter limits for sensitive operations
    this.limiters.set('auth', new RateLimiter(60000, 5, 900000)); // 5 auth attempts per minute
    this.limiters.set('payment', new RateLimiter(60000, 10, 300000)); // 10 payment operations per minute
    this.limiters.set('admin', new RateLimiter(60000, 50, 300000)); // 50 admin operations per minute

    // Looser limits for read operations
    this.limiters.set('read', new RateLimiter(60000, 200, 60000)); // 200 read operations per minute
  }

  // Check rate limit for specific endpoint type
  checkLimit(
    key: string,
    endpointType: 'default' | 'auth' | 'payment' | 'admin' | 'read' = 'default'
  ): RateLimitResult {
    const limiter = this.limiters.get(endpointType) || this.limiters.get('default')!;
    return limiter.check(key);
  }

  // Consume rate limit for specific endpoint type
  consumeLimit(
    key: string,
    endpointType: 'default' | 'auth' | 'payment' | 'admin' | 'read' = 'default'
  ): boolean {
    const limiter = this.limiters.get(endpointType) || this.limiters.get('default')!;
    return limiter.consume(key);
  }

  // Get rate limit status
  getStatus(
    key: string,
    endpointType: 'default' | 'auth' | 'payment' | 'admin' | 'read' = 'default'
  ): RateLimitStatus {
    const limiter = this.limiters.get(endpointType) || this.limiters.get('default')!;
    return limiter.getStatus(key);
  }

  // Reset rate limit for a key
  resetLimit(
    key: string,
    endpointType: 'default' | 'auth' | 'payment' | 'admin' | 'read' = 'default'
  ): void {
    const limiter = this.limiters.get(endpointType) || this.limiters.get('default')!;
    limiter.reset(key);
  }

  // Get overall stats
  getStats() {
    return {
      default: this.limiters.get('default')!.getStats(),
      auth: this.limiters.get('auth')!.getStats(),
      payment: this.limiters.get('payment')!.getStats(),
      admin: this.limiters.get('admin')!.getStats(),
      read: this.limiters.get('read')!.getStats()
    };
  }
}

// IP-based rate limiter for additional security
export class IPRateLimiter extends RateLimiter {
  constructor() {
    super(60000, 50, 600000); // 50 requests per minute, 10 minute block
  }

  // Override to use IP as key
  checkIP(ip: string): RateLimitResult {
    return this.check(ip);
  }

  consumeIP(ip: string): boolean {
    return this.consume(ip);
  }
}

// User-based rate limiter
export class UserRateLimiter extends RateLimiter {
  constructor() {
    super(60000, 30, 300000); // 30 requests per minute, 5 minute block
  }

  // Override to use user ID as key
  checkUser(userId: string): RateLimitResult {
    return this.check(userId);
  }

  consumeUser(userId: string): boolean {
    return this.consume(userId);
  }
}

// Global instances
export const apiRateLimiter = new APIRateLimiter();
export const ipRateLimiter = new IPRateLimiter();
export const userRateLimiter = new UserRateLimiter();

// Middleware function for Express.js (can be adapted for other frameworks)
export const rateLimitMiddleware = (
  endpointType: 'default' | 'auth' | 'payment' | 'admin' | 'read' = 'default',
  useIP: boolean = true,
  useUser: boolean = true
) => {
  return (req: any, res: any, next: any) => {
    const keys: string[] = [];

    // Use IP address
    if (useIP) {
      const ip = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
      keys.push(ip);
    }

    // Use user ID if authenticated
    if (useUser && req.user?.id) {
      keys.push(req.user.id);
    }

    // Check rate limits
    for (const key of keys) {
      const result = apiRateLimiter.checkLimit(key, endpointType);

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          blocked: result.blocked,
          blockExpires: result.blockExpires
        });
      }
    }

    // Consume rate limit
    for (const key of keys) {
      apiRateLimiter.consumeLimit(key, endpointType);
    }

    next();
  };
};

// React hook for rate limiting in components
export const useRateLimit = (
  key: string,
  endpointType: 'default' | 'auth' | 'payment' | 'admin' | 'read' = 'default',
  cooldown: number = 1000
) => {
  const [lastRequest, setLastRequest] = React.useState(0);
  const [status, setStatus] = React.useState<RateLimitStatus>({
    currentRequests: 0,
    remaining: 0,
    resetTime: 0,
    blocked: false
  });

  const checkLimit = React.useCallback(() => {
    const now = Date.now();
    if (now - lastRequest < cooldown) {
      return false;
    }

    const result = apiRateLimiter.checkLimit(key, endpointType);
    setStatus({
      currentRequests: 0,
      remaining: result.remaining,
      resetTime: result.resetTime,
      blocked: result.blocked,
      blockExpires: result.blockExpires
    });
    return result.allowed;
  }, [key, endpointType, lastRequest, cooldown]);

  const consumeLimit = React.useCallback(() => {
    const allowed = apiRateLimiter.consumeLimit(key, endpointType);
    if (allowed) {
      setLastRequest(Date.now());
      setStatus(apiRateLimiter.getStatus(key, endpointType));
    }
    return allowed;
  }, [key, endpointType]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(apiRateLimiter.getStatus(key, endpointType));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [key, endpointType]);

  return {
    checkLimit,
    consumeLimit,
    status,
    isBlocked: status.blocked,
    remaining: status.remaining,
    resetTime: new Date(status.resetTime)
  };
};

export default {
  RateLimiter,
  APIRateLimiter,
  IPRateLimiter,
  UserRateLimiter,
  apiRateLimiter,
  ipRateLimiter,
  userRateLimiter,
  rateLimitMiddleware,
  useRateLimit
};