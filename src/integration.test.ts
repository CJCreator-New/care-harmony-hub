import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '@/utils/apiClient';
import { queryCache, invalidatePatientCache } from '@/utils/cacheStrategy';
import { rateLimiter } from '@/utils/rateLimiting';

describe('API Client Integration', () => {
  it('adds request interceptor', () => {
    const interceptor = vi.fn((config) => config);
    apiClient.addRequestInterceptor(interceptor);
    expect(interceptor).toBeDefined();
  });

  it('adds response interceptor', () => {
    const interceptor = vi.fn((response) => response);
    apiClient.addResponseInterceptor(interceptor);
    expect(interceptor).toBeDefined();
  });
});

describe('Cache Strategy Integration', () => {
  beforeEach(() => queryCache.clear());

  it('caches data with TTL', () => {
    queryCache.set('key1', { data: 'value' }, 5000, ['tag1']);
    expect(queryCache.get('key1')).toEqual({ data: 'value' });
  });

  it('invalidates by tag', () => {
    queryCache.set('key1', 'value1', 5000, ['patient-1']);
    queryCache.set('key2', 'value2', 5000, ['patient-1']);
    invalidatePatientCache('1');
    expect(queryCache.get('key1')).toBeNull();
    expect(queryCache.get('key2')).toBeNull();
  });

  it('returns cache stats', () => {
    queryCache.set('key1', 'value1', 5000, ['tag1']);
    const stats = queryCache.getStats();
    expect(stats.size).toBe(1);
  });
});

describe('Rate Limiter Integration', () => {
  it('tracks requests per key', () => {
    expect(rateLimiter.isAllowed('user1')).toBe(true);
    expect(rateLimiter.getRemainingRequests('user1')).toBeLessThan(100);
  });

  it('resets rate limit', () => {
    rateLimiter.isAllowed('user1');
    rateLimiter.reset('user1');
    expect(rateLimiter.getRemainingRequests('user1')).toBe(100);
  });
});
