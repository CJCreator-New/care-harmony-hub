import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout

interface UseSessionTimeoutProps {
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

export function useSessionTimeout({ logout, isAuthenticated }: UseSessionTimeoutProps) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  const resetTimeout = useCallback(() => {
    if (!isAuthenticated) return;

    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    lastActivityRef.current = Date.now();

    // Set warning timeout
    warningRef.current = setTimeout(() => {
      toast.warning('Session will expire in 5 minutes due to inactivity', {
        duration: 10000,
        action: {
          label: 'Stay Active',
          onClick: () => resetTimeout()
        }
      });
    }, SESSION_TIMEOUT - WARNING_TIME);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      toast.error('Session expired due to inactivity');
      logout();
    }, SESSION_TIMEOUT);
  }, [isAuthenticated, logout]);

  const handleActivity = useCallback(() => {
    if (Date.now() - lastActivityRef.current > 60000) { // Only reset if more than 1 minute since last activity
      resetTimeout();
    }
  }, [resetTimeout]);

  useEffect(() => {
    if (!isAuthenticated) return;

    resetTimeout();

    // Activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [isAuthenticated, handleActivity, resetTimeout]);

  return { resetTimeout };
}