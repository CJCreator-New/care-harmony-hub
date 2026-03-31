/**
 * Edge Case Resilience Utilities
 * Prevents runtime crashes, null issues, races, unhandled exceptions in patient-critical flows.
 * 
 * Pattern: Concurrent edit protection, duplicate submission guards, network resilience
 */

import { v4 as uuidv4 } from 'uuid';

// ─── Optimistic Locking (updated_at Pattern) ─────────────────────────────────

/**
 * Detect concurrent modification: compare server updated_at with client's last-known version.
 * Returns conflict if server version is newer than client's.
 */
export function detectConcurrentModification(
  serverUpdatedAt: Date,
  clientLastKnownAt: Date
): { isConflict: boolean; message?: string } {
  const serverTime = new Date(serverUpdatedAt).getTime();
  const clientTime = new Date(clientLastKnownAt).getTime();

  if (serverTime > clientTime) {
    return {
      isConflict: true,
      message: `Record was modified at ${serverUpdatedAt}. Refresh and try again.`,
    };
  }

  return { isConflict: false };
}

/**
 * Optimistic locking guard for Supabase mutations.
 * Check: compare local doc's updated_at with current server version before updating.
 */
export async function withOptimisticLocking<T extends { updated_at: Date; id: string }>(
  doc: T,
  mutationFn: (doc: T) => Promise<any>,
  fetchLatestFn: (id: string) => Promise<T>
): Promise<{ success: boolean; data?: any; conflict?: boolean }> {
  try {
    // Fetch latest to check for conflicts
    const latest = await fetchLatestFn(doc.id);
    const conflict = detectConcurrentModification(latest.updated_at, doc.updated_at);

    if (conflict.isConflict) {
      return { success: false, conflict: true, data: { message: conflict.message } };
    }

    // No conflict, proceed with mutation
    const result = await mutationFn(doc);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, data: { error: String(err) } };
  }
}

// ─── Duplicate Submission Guards ────────────────────────────────────────────

/**
 * Generate idempotency key: unique ID for a user action (e.g., prescribe, order lab).
 * Allows safe retries: server recognizes idempotency key, doesn't duplicate.
 */
export function generateIdempotencyKey(userId: string, actionType: string, resourceId: string): string {
  const timestamp = new Date().toISOString();
  return `${userId}:${actionType}:${resourceId}:${timestamp}:${uuidv4().slice(0, 8)}`;
}

/**
 * Track submitted idempotency keys in-memory (in production, use Redis or DB).
 * Ensures same key is rejected within debounce window.
 */
class IdempotencyTracker {
  private keys: Map<string, { timestamp: number; result?: any }> = new Map();
  private debounceMs: number;

  constructor(debounceMs: number = 2000) {
    this.debounceMs = debounceMs;
  }

  /**
   * Check if key was recently submitted.
   */
  isDuplicate(key: string): boolean {
    const entry = this.keys.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    if (age > this.debounceMs) {
      this.keys.delete(key); // Expire old entry
      return false;
    }

    return true;
  }

  /**
   * Record a new submission.
   */
  track(key: string, result?: any): void {
    this.keys.set(key, { timestamp: Date.now(), result });
  }

  /**
   * Get cached result of previous submission.
   */
  getCachedResult(key: string): any | undefined {
    return this.keys.get(key)?.result;
  }

  /**
   * Clear old entries periodically.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.keys.entries())) {
      if (now - entry.timestamp > this.debounceMs * 2) {
        this.keys.delete(key);
      }
    }
  }
}

export const idempotencyTracker = new IdempotencyTracker();

// Cleanup every 30 seconds
setInterval(() => idempotencyTracker.cleanup(), 30000);

// ─── Retry with Exponential Backoff ────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

/**
 * Retry function with exponential backoff for transient failures.
 * Stops on success, 4xx errors, or max attempts.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;

      // Don't retry on client errors (4xx)
      if (err.status && err.status >= 400 && err.status < 500) {
        throw err;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts - 1) {
        throw err;
      }

      // Calculate backoff delay
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      // Add jitter (±10%)
      const jitter = delay * 0.1 * (Math.random() * 2 - 1);
      const totalDelay = Math.max(0, delay + jitter);

      await new Promise((resolve) => setTimeout(resolve, Math.round(totalDelay)));
    }
  }

  throw lastError || new Error('Max retry attempts reached');
}

// ─── Session Expiry Detection ──────────────────────────────────────────────

export interface SessionState {
  isValid: boolean;
  expiresAt?: Date;
  warning?: string;
}

/**
 * Check if session is close to expiry (within 5 minutes).
 */
export function getSessionState(expiresAt?: Date): SessionState {
  if (!expiresAt) {
    return { isValid: true };
  }

  const now = new Date();
  const msUntilExpiry = new Date(expiresAt).getTime() - now.getTime();
  const secondsUntilExpiry = msUntilExpiry / 1000;

  if (secondsUntilExpiry < 0) {
    return { isValid: false, expiresAt, warning: 'Session has expired' };
  }

  if (secondsUntilExpiry < 300) {
    return {
      isValid: true,
      expiresAt,
      warning: `Session expires in ${Math.round(secondsUntilExpiry / 60)} minutes`,
    };
  }

  return { isValid: true, expiresAt };
}

/**
 * Middleware: detect 401/403 responses as potential session expiry.
 * Triggers re-auth flow instead of silent failure.
 */
export function handleAuthError(
  status: number,
  context?: { path?: string; userId?: string }
): { shouldReauth: boolean; message: string } {
  if (status === 401) {
    return {
      shouldReauth: true,
      message: 'Session expired. Please log in again.',
    };
  }

  if (status === 403) {
    return {
      shouldReauth: false,
      message: `Access denied. ${context?.path ? `Path: ${context.path}` : ''}`,
    };
  }

  return { shouldReauth: false, message: '' };
}

// ─── Null/Missing Guard Patterns ───────────────────────────────────────────

/**
 * Safely access nested property with default fallback.
 */
export function safeGet<T>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  const keys = path.split('.');
  let result: any = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result ?? defaultValue;
}

/**
 * Require a value; throw error if null or undefined.
 * Prevents silent failures in critical paths.
 */
export function requireValue<T>(
  value: T | null | undefined,
  message: string
): T {
  if (value === null || value === undefined) {
    throw new Error(`Required value missing: ${message}`);
  }
  return value;
}

/**
 * Validate identifier (UUID or non-empty string).
 */
export function validateId(id: any): id is string {
  return typeof id === 'string' && id.trim().length > 0;
}

// ─── Circuit Breaker (for external calls) ─────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number; // ms before half-open retry

  constructor(
    failureThreshold: number = 5,
    successThreshold: number = 2,
    timeout: number = 60000
  ) {
    this.failureThreshold = failureThreshold;
    this.successThreshold = successThreshold;
    this.timeout = timeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if timeout elapsed; try half-open
      if (Date.now() - (this.lastFailureTime || 0) > this.timeout) {
        this.state = 'half-open';
        this.failureCount = 0;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.state = 'closed';
          this.failureCount = 0;
          this.successCount = 0;
        }
      } else if (this.state === 'closed') {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }

      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.state === 'half-open') {
        this.state = 'open';
        throw new Error(`Circuit breaker reopened. Error: ${err}`);
      }

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        throw new Error(`Circuit breaker opened after ${this.failureCount} failures. ${err}`);
      }

      throw err;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}

// ─── Safe Collection Access ───────────────────────────────────────────────

/**
 * Safely map over array; skip errors.
 */
export function safeMap<T, U>(
  arr: T[] | null | undefined,
  fn: (item: T) => U
): U[] {
  if (!arr) return [];
  return arr
    .map((item) => {
      try {
        return fn(item);
      } catch (err) {
        console.error('Error in safeMap:', err);
        return null;
      }
    })
    .filter((item): item is U => item !== null);
}
