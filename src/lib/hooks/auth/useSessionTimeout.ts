import { useCallback, useEffect, useRef } from 'react';

/** Inactivity before sign-out (30 minutes). */
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
/** How long the "Still there?" dialog stays up before the user is signed out (5 minutes). */
export const SESSION_WARNING_LEAD_MS = 5 * 60 * 1000;

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'] as const;
const ACTIVITY_THROTTLE_MS = 60 * 1000;

export interface SessionWarningState {
  open: boolean;
  /** Epoch ms at which the user is signed out, while the warning is open. */
  deadline: number | null;
}

interface SessionHandlers {
  stay: () => void;
  expire: () => void;
}

const CLOSED: SessionWarningState = { open: false, deadline: null };

// Module-level store so the warning dialog (mounted elsewhere in the tree) can read it
// without a context change. This keeps AuthContext's value untouched.
let warningState: SessionWarningState = CLOSED;
let handlers: SessionHandlers | null = null;
let pendingSignOutReason: 'inactivity' | null = null;
const listeners = new Set<() => void>();

function publish(next: SessionWarningState) {
  warningState = next;
  listeners.forEach((listener) => listener());
}

/** For useSyncExternalStore. */
export function subscribeSessionWarning(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionWarningState(): SessionWarningState {
  return warningState;
}

/** "Stay signed in": closes the warning and restarts the idle timer. */
export function staySignedIn(): void {
  handlers?.stay();
}

/** "Sign out now" from the warning dialog. */
export function signOutFromWarning(): void {
  handlers?.expire();
}

/**
 * Returns and clears the reason for the most recent automatic sign-out, so the login
 * page can explain why the user is back there. Kept in memory: a full page reload
 * clears it, which is acceptable for a notice.
 */
export function consumeSignOutReason(): 'inactivity' | null {
  const reason = pendingSignOutReason;
  pendingSignOutReason = null;
  return reason;
}

interface UseSessionTimeoutProps {
  logout?: () => Promise<void>;
  isAuthenticated?: boolean;
  enabled?: boolean;
}

/**
 * Inactivity sign-out with a persistent warning. The warning stays open until the user
 * acts, and it is not dismissed by activity, so a clinician who looks away still sees it.
 * Drafts are kept by the form draft store (see useDraftState), so they survive the
 * sign-out in memory.
 */
export function useSessionTimeout({ logout, isAuthenticated, enabled }: UseSessionTimeoutProps = {}) {
  const isActive = enabled ?? isAuthenticated ?? false;
  const logoutRef = useRef(logout);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const expireTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
  }, []);

  const expire = useCallback(() => {
    clearTimers();
    publish(CLOSED);
    pendingSignOutReason = 'inactivity';
    void logoutRef.current?.();
  }, [clearTimers]);

  const schedule = useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();
    publish(CLOSED);
    warnTimerRef.current = setTimeout(() => {
      publish({ open: true, deadline: Date.now() + SESSION_WARNING_LEAD_MS });
      expireTimerRef.current = setTimeout(expire, SESSION_WARNING_LEAD_MS);
    }, SESSION_IDLE_TIMEOUT_MS - SESSION_WARNING_LEAD_MS);
  }, [clearTimers, expire]);

  const stay = useCallback(() => {
    if (isActive) schedule();
  }, [isActive, schedule]);

  useEffect(() => {
    if (!isActive) {
      clearTimers();
      publish(CLOSED);
      return;
    }

    const handleActivity = () => {
      // Activity does not dismiss the warning. The user must choose.
      if (warningState.open) return;
      if (Date.now() - lastActivityRef.current > ACTIVITY_THROTTLE_MS) {
        schedule();
      }
    };

    handlers = { stay, expire };
    schedule();
    ACTIVITY_EVENTS.forEach((event) => document.addEventListener(event, handleActivity, true));

    return () => {
      ACTIVITY_EVENTS.forEach((event) => document.removeEventListener(event, handleActivity, true));
      clearTimers();
      publish(CLOSED);
      if (handlers?.expire === expire) handlers = null;
    };
  }, [isActive, schedule, stay, expire, clearTimers]);

  return { resetTimeout: stay };
}
