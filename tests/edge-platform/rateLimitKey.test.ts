/**
 * S2-07 (EDGE-11): rate-limit key derivation and decision rules.
 * Behaviour tests of supabase/functions/_shared/rateLimitKey.ts (pure, no Deno APIs).
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RATE_LIMIT,
  consumeRateLimit,
  deriveRateLimitKey,
  firstForwardedHop,
  resolveRateLimitConfig,
  type RateLimitBucket,
} from '../../supabase/functions/_shared/rateLimitKey';

describe('deriveRateLimitKey', () => {
  it('keys a verified user by user id, not by the token prefix (EDGE-11 shared bucket)', () => {
    const alice = deriveRateLimitKey({ verifiedUserId: 'user-alice' });
    const bob = deriveRateLimitKey({ verifiedUserId: 'user-bob' });
    expect(alice).toBe('user:user-alice');
    expect(bob).not.toBe(alice);
  });

  it('prefers the verified user id over the forwarded client IP', () => {
    expect(deriveRateLimitKey({ verifiedUserId: 'u1', forwardedFor: '203.0.113.9' })).toBe('user:u1');
  });

  it('keys anonymous callers by the first x-forwarded-for hop', () => {
    expect(deriveRateLimitKey({ forwardedFor: '203.0.113.9, 10.0.0.1' })).toBe('ip:203.0.113.9');
    expect(deriveRateLimitKey({ forwardedFor: ' 198.51.100.7 ' })).toBe('ip:198.51.100.7');
  });

  it('falls back to a single unknown bucket when neither identity nor IP is present', () => {
    expect(deriveRateLimitKey({})).toBe('ip:unknown');
    expect(deriveRateLimitKey({ verifiedUserId: '   ', forwardedFor: '' })).toBe('ip:unknown');
  });

  it('never produces a shared user bucket for anonymous callers (old 20-char token prefix defect)', () => {
    // Anonymous callers carry no verified user id, so they key on their IP. Two anonymous
    // callers with the same token prefix therefore get separate buckets.
    const anonCallerA = deriveRateLimitKey({ forwardedFor: '192.0.2.1' });
    const anonCallerB = deriveRateLimitKey({ forwardedFor: '192.0.2.2' });
    expect(anonCallerA).not.toBe(anonCallerB);
    expect(anonCallerA.startsWith('user:')).toBe(false);
  });

  it('caps the length of attacker-controlled key parts', () => {
    const long = 'a'.repeat(1000);
    expect(deriveRateLimitKey({ forwardedFor: long }).length).toBeLessThanOrEqual(3 + 128);
    expect(deriveRateLimitKey({ verifiedUserId: long }).length).toBeLessThanOrEqual(5 + 128);
  });
});

describe('firstForwardedHop', () => {
  it('returns the leftmost address of the chain', () => {
    expect(firstForwardedHop('client, proxy-1, proxy-2')).toBe('client');
  });

  it('returns null for missing or empty headers', () => {
    expect(firstForwardedHop(null)).toBeNull();
    expect(firstForwardedHop(undefined)).toBeNull();
    expect(firstForwardedHop(' , ')).toBeNull();
  });
});

describe('resolveRateLimitConfig', () => {
  it('uses the defaults when nothing is configured', () => {
    expect(resolveRateLimitConfig(undefined)).toEqual(DEFAULT_RATE_LIMIT);
    expect(resolveRateLimitConfig({})).toEqual(DEFAULT_RATE_LIMIT);
  });

  it('honours the legacy {limit} spelling so the configured limit is enforced (EDGE-11)', () => {
    expect(resolveRateLimitConfig({ limit: 5, windowMs: 300000 })).toEqual({
      maxRequests: 5,
      windowMs: 300000,
    });
  });

  it('prefers maxRequests when both spellings are given', () => {
    expect(resolveRateLimitConfig({ limit: 5, maxRequests: 9 }).maxRequests).toBe(9);
  });

  it('ignores non-positive or non-finite values', () => {
    expect(resolveRateLimitConfig({ maxRequests: 0, windowMs: -1 })).toEqual(DEFAULT_RATE_LIMIT);
    expect(resolveRateLimitConfig({ maxRequests: Number.NaN })).toEqual(DEFAULT_RATE_LIMIT);
  });
});

describe('consumeRateLimit', () => {
  it('enforces the configured limit within a window', () => {
    const store = new Map<string, RateLimitBucket>();
    const config = { limit: 5, windowMs: 300000 };
    const decisions = Array.from({ length: 1000 }, () =>
      consumeRateLimit(store, 'ip:203.0.113.9', config, 1_000),
    );
    expect(decisions.filter((d) => d.allowed)).toHaveLength(5);
    expect(decisions[5].allowed).toBe(false);
    expect(decisions[5].remaining).toBe(0);
  });

  it('gives the 6th attempt within 5 minutes a 429 decision with Retry-After', () => {
    const store = new Map<string, RateLimitBucket>();
    const config = { maxRequests: 5, windowMs: 300000 };
    for (let i = 0; i < 5; i++) consumeRateLimit(store, 'user:u1', config, 0);
    const blocked = consumeRateLimit(store, 'user:u1', config, 10_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(290);
  });

  it('keeps two users independent', () => {
    const store = new Map<string, RateLimitBucket>();
    const config = { maxRequests: 2, windowMs: 60000 };
    consumeRateLimit(store, 'user:alice', config, 0);
    consumeRateLimit(store, 'user:alice', config, 0);
    expect(consumeRateLimit(store, 'user:alice', config, 0).allowed).toBe(false);
    expect(consumeRateLimit(store, 'user:bob', config, 0).allowed).toBe(true);
  });

  it('resets the bucket once the window has elapsed', () => {
    const store = new Map<string, RateLimitBucket>();
    const config = { maxRequests: 1, windowMs: 1000 };
    expect(consumeRateLimit(store, 'k', config, 0).allowed).toBe(true);
    expect(consumeRateLimit(store, 'k', config, 500).allowed).toBe(false);
    expect(consumeRateLimit(store, 'k', config, 1000).allowed).toBe(true);
  });

  it('reports remaining quota on allowed requests', () => {
    const store = new Map<string, RateLimitBucket>();
    const config = { maxRequests: 3, windowMs: 60000 };
    expect(consumeRateLimit(store, 'k', config, 0).remaining).toBe(2);
    expect(consumeRateLimit(store, 'k', config, 0).remaining).toBe(1);
    expect(consumeRateLimit(store, 'k', config, 0).remaining).toBe(0);
  });

  it('sweeps expired buckets once the store is large', () => {
    const store = new Map<string, RateLimitBucket>();
    for (let i = 0; i < 5_001; i++) {
      store.set(`stale-${i}`, { count: 1, resetTime: 100 });
    }
    consumeRateLimit(store, 'fresh', { maxRequests: 1, windowMs: 1000 }, 200);
    expect(store.size).toBe(1);
    expect(store.has('fresh')).toBe(true);
  });
});
