import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const auth = { session: { access_token: 't1' } as { access_token: string } | null, profile: {}, roles: ['doctor'] };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

const fetchMfaAssurance = vi.fn();
vi.mock('@/lib/auth/mfa', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/mfa')>();
  return { ...actual, fetchMfaAssurance: () => fetchMfaAssurance() };
});

const { useMfaAssurance, resetMfaAssuranceCache, sessionIdOf } = await import(
  '@/lib/hooks/auth/useMfaAssurance'
);

beforeEach(() => {
  // .env.test enables E2E mock auth, which bypasses MFA; test the real path.
  vi.stubEnv('VITE_E2E_MOCK_AUTH', 'false');
  fetchMfaAssurance.mockReset();
  resetMfaAssuranceCache();
  auth.session = { access_token: 't1' };
  auth.roles = ['doctor'];
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('useMfaAssurance', () => {
  it('is bypassed only under E2E mock auth (non-production builds)', () => {
    vi.stubEnv('VITE_E2E_MOCK_AUTH', 'true');
    const { result } = renderHook(() => useMfaAssurance());
    expect(result.current.decision).toBe('allow');
    expect(fetchMfaAssurance).not.toHaveBeenCalled();
  });

  it('starts in loading and never allows before the lookup resolves', () => {
    fetchMfaAssurance.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useMfaAssurance());
    expect(result.current.decision).toBe('loading');
  });

  it('shares one lookup between guards for the same token', async () => {
    fetchMfaAssurance.mockResolvedValue({
      status: 'ready',
      currentLevel: 'aal2',
      verifiedTotpFactorId: 'f',
    });
    const a = renderHook(() => useMfaAssurance());
    const b = renderHook(() => useMfaAssurance());
    await waitFor(() => expect(a.result.current.decision).toBe('allow'));
    expect(b.result.current.decision).toBe('allow');
    expect(fetchMfaAssurance).toHaveBeenCalledTimes(1);
  });

  it('fails closed to challenge on lookup error', async () => {
    fetchMfaAssurance.mockResolvedValue({ status: 'error', message: 'offline' });
    const { result } = renderHook(() => useMfaAssurance());
    await waitFor(() => expect(result.current.decision).toBe('challenge'));
  });

  it('re-reads when the access token changes (e.g. after mfa.verify)', async () => {
    fetchMfaAssurance.mockResolvedValueOnce({
      status: 'ready',
      currentLevel: 'aal1',
      verifiedTotpFactorId: 'f',
    });
    const { result, rerender } = renderHook(() => useMfaAssurance());
    await waitFor(() => expect(result.current.decision).toBe('challenge'));

    fetchMfaAssurance.mockResolvedValueOnce({
      status: 'ready',
      currentLevel: 'aal2',
      verifiedTotpFactorId: 'f',
    });
    auth.session = { access_token: 't2' };
    rerender();
    await waitFor(() => expect(result.current.decision).toBe('allow'));
    expect(fetchMfaAssurance).toHaveBeenCalledTimes(2);
  });

  it('requires enrolment for admin/doctor with no verified factor', async () => {
    fetchMfaAssurance.mockResolvedValue({
      status: 'ready',
      currentLevel: 'aal1',
      verifiedTotpFactorId: null,
    });
    const { result } = renderHook(() => useMfaAssurance());
    await waitFor(() => expect(result.current.decision).toBe('enroll'));
  });
});

describe('useMfaAssurance across token changes', () => {
  const jwt = (claims: Record<string, unknown>) =>
    `h.${btoa(JSON.stringify(claims)).split('=').join('')}.s`;
  const AAL2 = { status: 'ready', currentLevel: 'aal2', verifiedTotpFactorId: 'f' };

  it('reads session_id from a token', () => {
    expect(sessionIdOf(jwt({ session_id: 'abc' }))).toBe('abc');
    expect(sessionIdOf('not-a-jwt')).toBeNull();
    expect(sessionIdOf(null)).toBeNull();
  });

  it('keeps serving the result for a refreshed token of the same session', async () => {
    auth.session = { access_token: jwt({ session_id: 's1', n: 1 }) };
    fetchMfaAssurance.mockResolvedValueOnce(AAL2);
    const { result, rerender } = renderHook(() => useMfaAssurance());
    await waitFor(() => expect(result.current.decision).toBe('allow'));

    let resolveRecheck: (v: unknown) => void = () => {};
    fetchMfaAssurance.mockReturnValueOnce(new Promise((r) => (resolveRecheck = r)));
    auth.session = { access_token: jwt({ session_id: 's1', n: 2 }) };
    rerender();
    expect(result.current.decision).toBe('allow');
    resolveRecheck(AAL2);
    await waitFor(() => expect(fetchMfaAssurance).toHaveBeenCalledTimes(2));
  });

  it('keeps the same-session result if the re-check errors', async () => {
    auth.session = { access_token: jwt({ session_id: 's1', n: 1 }) };
    fetchMfaAssurance.mockResolvedValueOnce(AAL2);
    const { result, rerender } = renderHook(() => useMfaAssurance());
    await waitFor(() => expect(result.current.decision).toBe('allow'));

    fetchMfaAssurance.mockResolvedValueOnce({ status: 'error', message: 'offline' });
    auth.session = { access_token: jwt({ session_id: 's1', n: 2 }) };
    rerender();
    await waitFor(() => expect(fetchMfaAssurance).toHaveBeenCalledTimes(2));
    expect(result.current.decision).toBe('allow');
  });

  it('does not carry an aal2 result over to a new sign-in of the same user', async () => {
    auth.session = { access_token: jwt({ session_id: 's1' }) };
    fetchMfaAssurance.mockResolvedValueOnce(AAL2);
    const { result, rerender } = renderHook(() => useMfaAssurance());
    await waitFor(() => expect(result.current.decision).toBe('allow'));

    fetchMfaAssurance.mockReturnValueOnce(new Promise(() => {}));
    auth.session = { access_token: jwt({ session_id: 's2' }) };
    rerender();
    expect(result.current.decision).toBe('loading');
  });
});
