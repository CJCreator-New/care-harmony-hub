import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeStorage } from '@/integrations/supabase/client';

describe('SEC-006: Auth Session Storage Security (sessionStorage isolation)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('AC-1: stores session tokens in sessionStorage and NEVER in localStorage', () => {
    const sessionKey = 'sb-myproject-auth-token';
    const sessionPayload = JSON.stringify({
      access_token: 'fake-jwt-token-12345',
      refresh_token: 'fake-refresh-token-67890',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });

    safeStorage.setItem(sessionKey, sessionPayload);

    // Assert token exists in sessionStorage
    expect(window.sessionStorage.getItem(sessionKey)).toBe(sessionPayload);

    // Assert token does NOT exist in localStorage
    expect(window.localStorage.getItem(sessionKey)).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it('AC-2: purges legacy tokens from localStorage if accessed or set', () => {
    const legacyKey = 'sb-legacy-project-auth-token';
    window.localStorage.setItem(legacyKey, 'leaked-token');
    expect(window.localStorage.getItem(legacyKey)).toBe('leaked-token');

    // Setting the key through safeStorage immediately deletes from localStorage
    safeStorage.setItem(
      legacyKey,
      JSON.stringify({
        access_token: 'new-token',
        refresh_token: 'valid-refresh',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      })
    );

    expect(window.localStorage.getItem(legacyKey)).toBeNull();
    expect(window.sessionStorage.getItem(legacyKey)).toBeTruthy();
  });

  it('AC-3: safeStorage.getItem purges expired tokens and returns null', () => {
    const expiredKey = 'sb-expired-auth-token';
    const expiredPayload = JSON.stringify({
      access_token: 'expired-token',
      refresh_token: 'refresh-token',
      expires_at: Math.floor(Date.now() / 1000) - 100, // expired 100 seconds ago
    });

    window.sessionStorage.setItem(expiredKey, expiredPayload);

    const result = safeStorage.getItem(expiredKey);
    expect(result).toBeNull();
    expect(window.sessionStorage.getItem(expiredKey)).toBeNull();
  });

  it('AC-4: safeStorage.clear purges sessionStorage and sweeps localStorage auth keys', () => {
    const sessionKey = 'sb-active-token';
    const residualLocalKey = 'sb-residual-token';

    window.sessionStorage.setItem(sessionKey, 'active');
    window.localStorage.setItem(residualLocalKey, 'residual');
    window.localStorage.setItem('unrelated_theme', 'dark');

    safeStorage.clear();

    expect(window.sessionStorage.getItem(sessionKey)).toBeNull();
    expect(window.localStorage.getItem(residualLocalKey)).toBeNull();
    // Non-auth keys like theme remain untouched
    expect(window.localStorage.getItem('unrelated_theme')).toBe('dark');
  });
});
