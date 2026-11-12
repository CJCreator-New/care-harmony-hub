// Pure rate-limit logic (no Deno APIs) so it can be unit-tested under vitest.
// rateLimit.ts wires these to the request, the environment and the per-isolate store.

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitConfigInput {
  windowMs?: number;
  maxRequests?: number;
  /**
   * @deprecated Misspelling of `maxRequests`. Still honoured so that existing call sites
   * are enforced instead of silently unlimited (EDGE-11). Use `maxRequests`.
   */
  limit?: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 60 };

const MAX_KEY_PART_LENGTH = 128;
const PRUNE_THRESHOLD = 5_000;

export interface RateLimitBucket {
  count: number;
  resetTime: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function resolveRateLimitConfig(input?: RateLimitConfigInput | null): RateLimitConfig {
  const maxFromInput = input?.maxRequests;
  const maxFromLegacy = input?.limit;
  const windowFromInput = input?.windowMs;

  let maxRequests = DEFAULT_RATE_LIMIT.maxRequests;
  if (isPositiveNumber(maxFromInput)) maxRequests = maxFromInput;
  else if (isPositiveNumber(maxFromLegacy)) maxRequests = maxFromLegacy;

  const windowMs = isPositiveNumber(windowFromInput) ? windowFromInput : DEFAULT_RATE_LIMIT.windowMs;

  return { maxRequests: Math.floor(maxRequests), windowMs };
}

/** First hop of an x-forwarded-for chain ("client, proxy1, proxy2" -> "client"). */
export function firstForwardedHop(header: string | null | undefined): string | null {
  if (!header) return null;
  const first = header.split(",")[0]?.trim() ?? "";
  return first ? first.slice(0, MAX_KEY_PART_LENGTH) : null;
}

/**
 * Key for the rate-limit bucket. A verified user id always wins. Anonymous callers are
 * keyed on the client IP (first x-forwarded-for hop, best effort: the gateway must set
 * the header, and a client that controls it can rotate its bucket).
 * `verifiedUserId` must come from a token check, never from an unverified header.
 */
export function deriveRateLimitKey(input: {
  verifiedUserId?: string | null;
  forwardedFor?: string | null;
}): string {
  const userId = input.verifiedUserId?.trim();
  if (userId) return `user:${userId.slice(0, MAX_KEY_PART_LENGTH)}`;
  const hop = firstForwardedHop(input.forwardedFor);
  return `ip:${hop ?? "unknown"}`;
}

/**
 * Counts one request against `key`. Buckets reset `windowMs` after they were opened.
 * Expired buckets are swept once the store grows past a threshold so memory stays bounded.
 */
export function consumeRateLimit(
  store: Map<string, RateLimitBucket>,
  key: string,
  configInput: RateLimitConfigInput | null | undefined,
  now: number,
): RateLimitDecision {
  const config = resolveRateLimitConfig(configInput);

  if (store.size > PRUNE_THRESHOLD) {
    for (const [storedKey, bucket] of store) {
      if (bucket.resetTime <= now) store.delete(storedKey);
    }
  }

  let bucket = store.get(key);
  if (!bucket || bucket.resetTime <= now) {
    bucket = { count: 0, resetTime: now + config.windowMs };
    store.set(key, bucket);
  }

  if (bucket.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: bucket.resetTime,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetTime - now) / 1000)),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: config.maxRequests - bucket.count,
    resetTime: bucket.resetTime,
    retryAfterSeconds: 0,
  };
}
