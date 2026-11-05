import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMfaAssurance,
  requiresMandatoryMfa,
  resolveMfaGate,
  type MfaAssurance,
  type MfaGateDecision,
} from '@/lib/auth/mfa';

/**
 * Shared, per-access-token cache of the MFA assurance lookup so every guard on
 * the page reads one result instead of each one calling the Auth server.
 * A new access token (sign-in, refresh, `mfa.verify`) triggers a new lookup.
 *
 * While a token of the SAME Supabase session (JWT `session_id`) is being
 * re-checked, the previous `ready` result keeps being served, so an hourly
 * token refresh does not unmount the page the user is working on. A token
 * refresh never lowers a session's assurance level. A new sign-in has a new
 * `session_id`, so it always starts from `loading`.
 */
type Entry = { key: string; sessionId: string | null; state: MfaAssurance };

let entry: Entry | null = null;
let inFlightKey: string | null = null;
const listeners = new Set<() => void>();

const LOADING: MfaAssurance = { status: 'loading' };
const MOCK_AUTH_ASSURANCE: MfaAssurance = {
  status: 'ready',
  currentLevel: null,
  verifiedTotpFactorId: null,
};

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `session_id` claim of a Supabase access token, or null if it cannot be read. */
export function sessionIdOf(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.split('-').join('+').split('_').join('/');
    const claims = JSON.parse(atob(base64)) as { session_id?: unknown };
    return typeof claims.session_id === 'string' && claims.session_id ? claims.session_id : null;
  } catch {
    return null;
  }
}

/** The cached `ready` result if it belongs to the same Supabase session as `key`. */
function sameSessionState(cached: Entry | null, key: string): MfaAssurance | null {
  if (!cached || cached.state.status !== 'ready' || cached.sessionId === null) return null;
  return cached.sessionId === sessionIdOf(key) ? cached.state : null;
}

function load(key: string, force = false) {
  if (!force && (inFlightKey === key || entry?.key === key)) return;
  inFlightKey = key;
  const sessionId = sessionIdOf(key);
  const previous = sameSessionState(entry, key);
  entry = { key, sessionId, state: previous ?? LOADING };
  emit();
  void fetchMfaAssurance().then((state) => {
    // Ignore results for a token that has since been replaced.
    if (inFlightKey !== key) return;
    inFlightKey = null;
    // A transient error while re-checking a session that already had a result
    // keeps that result; a first lookup error is kept and fails closed.
    entry = { key, sessionId, state: state.status === 'error' && previous ? previous : state };
    emit();
  });
}

/** Test helper: drop the cached assurance. */
export function resetMfaAssuranceCache() {
  entry = null;
  inFlightKey = null;
  emit();
}

/**
 * E2E mock auth has no Supabase session, so it cannot hold an MFA factor.
 * Same condition as AuthContext (never true in a production build).
 */
function isE2EMockAuth(): boolean {
  return (
    !import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    import.meta.env.VITE_E2E_MOCK_AUTH === 'true'
  );
}

export interface MfaAssuranceResult {
  assurance: MfaAssurance;
  /** True when the user's role requires a verified factor (admin/doctor). */
  mandatory: boolean;
  decision: MfaGateDecision;
  /** Re-read the assurance level (e.g. after enrolling or verifying). */
  refresh: () => void;
}

export function useMfaAssurance(): MfaAssuranceResult {
  const { session, profile, roles } = useAuth();
  const key = session?.access_token ?? null;
  const mockAuth = isE2EMockAuth();

  const snapshot = useSyncExternalStore(subscribe, () => entry);

  useEffect(() => {
    if (key && !mockAuth) load(key);
  }, [key, mockAuth]);

  const refresh = useCallback(() => {
    if (key && !mockAuth) load(key, true);
  }, [key, mockAuth]);

  const mandatory = requiresMandatoryMfa(profile, roles);

  if (mockAuth) {
    return { assurance: MOCK_AUTH_ASSURANCE, mandatory, decision: 'allow', refresh };
  }

  let assurance: MfaAssurance = LOADING;
  if (key && snapshot) {
    // Before the effect starts the re-check for a new token, serve the last
    // result only when it is for the same session.
    assurance = snapshot.key === key ? snapshot.state : (sameSessionState(snapshot, key) ?? LOADING);
  }
  return { assurance, mandatory, decision: resolveMfaGate(assurance, mandatory), refresh };
}
