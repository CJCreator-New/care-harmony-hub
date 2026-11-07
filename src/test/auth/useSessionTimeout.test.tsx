import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useSessionTimeout,
  getSessionWarningState,
  staySignedIn,
  signOutFromWarning,
  consumeSignOutReason,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_WARNING_LEAD_MS,
} from '@/lib/hooks/auth/useSessionTimeout';

const WARNING_AT = SESSION_IDLE_TIMEOUT_MS - SESSION_WARNING_LEAD_MS;

describe('useSessionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens a persistent warning at 25 minutes and signs out at 30 minutes', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useSessionTimeout({ logout, isAuthenticated: true }));

    act(() => {
      vi.advanceTimersByTime(WARNING_AT - 1);
    });
    expect(getSessionWarningState().open).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(getSessionWarningState().open).toBe(true);
    expect(getSessionWarningState().deadline).not.toBeNull();
    expect(logout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(SESSION_WARNING_LEAD_MS);
    });
    expect(logout).toHaveBeenCalledTimes(1);
    expect(getSessionWarningState().open).toBe(false);
    expect(consumeSignOutReason()).toBe('inactivity');
    expect(consumeSignOutReason()).toBeNull();
  });

  it('does not dismiss the warning on activity; only "stay signed in" does', () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useSessionTimeout({ logout, isAuthenticated: true }));

    act(() => {
      vi.advanceTimersByTime(WARNING_AT);
    });
    expect(getSessionWarningState().open).toBe(true);

    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown'));
    });
    expect(getSessionWarningState().open).toBe(true);

    act(() => {
      staySignedIn();
    });
    expect(getSessionWarningState().open).toBe(false);

    // The idle timer restarted, so the warning comes back after another full idle period.
    act(() => {
      vi.advanceTimersByTime(WARNING_AT);
    });
    expect(getSessionWarningState().open).toBe(true);
    expect(logout).not.toHaveBeenCalled();
  });

  it('signs out immediately from the warning when the user chooses sign out', () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useSessionTimeout({ logout, isAuthenticated: true }));

    act(() => {
      vi.advanceTimersByTime(WARNING_AT);
    });
    act(() => {
      signOutFromWarning();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(getSessionWarningState().open).toBe(false);
  });

  it('does nothing while signed out', () => {
    const logout = vi.fn();
    renderHook(() => useSessionTimeout({ logout, isAuthenticated: false }));

    act(() => {
      vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT_MS * 2);
    });
    expect(logout).not.toHaveBeenCalled();
    expect(getSessionWarningState().open).toBe(false);
  });
});
