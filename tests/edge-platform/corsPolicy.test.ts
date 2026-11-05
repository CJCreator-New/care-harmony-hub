/**
 * S2-07 (EDGE-26): CORS origin policy.
 * Behaviour tests of supabase/functions/_shared/corsPolicy.ts (pure, no Deno APIs).
 */
import { describe, it, expect } from 'vitest';
import {
  DEV_ALLOWED_ORIGINS,
  parseOriginList,
  resolveOriginPolicy,
} from '../../supabase/functions/_shared/corsPolicy';

describe('resolveOriginPolicy', () => {
  it('uses CORS_ALLOWED_ORIGINS when it is set, in any environment', () => {
    const policy = resolveOriginPolicy({
      configuredOrigins: ' https://app.example.org , https://staging.example.org ',
      environment: 'production',
    });
    expect(policy).toEqual({
      allowedOrigins: ['https://app.example.org', 'https://staging.example.org'],
      source: 'configured',
    });
  });

  it('keeps the localhost allow-list for local development when nothing is configured', () => {
    const policy = resolveOriginPolicy({ configuredOrigins: undefined, environment: undefined });
    expect(policy.source).toBe('dev-default');
    expect(policy.allowedOrigins).toEqual([...DEV_ALLOWED_ORIGINS]);
  });

  it('fails closed in production when CORS_ALLOWED_ORIGINS is unset (EDGE-26)', () => {
    const policy = resolveOriginPolicy({ configuredOrigins: '', environment: 'production' });
    expect(policy).toEqual({ allowedOrigins: [], source: 'none' });
  });

  it('treats only the exact value "production" as production', () => {
    expect(resolveOriginPolicy({ configuredOrigins: null, environment: 'Production' }).source).toBe(
      'dev-default',
    );
  });
});

describe('parseOriginList', () => {
  it('splits, trims and drops empty entries', () => {
    expect(parseOriginList(' a , ,b,')).toEqual(['a', 'b']);
    expect(parseOriginList(undefined)).toEqual([]);
  });
});
