import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_DURATION = 5 * 60 * 1000; // 5 minutes warning before logout

interface UseSessionTimeoutOptions {
  onTimeout?: () => void;
  enabled?: boolean;
}

export function useSessionTimeout({ onTimeout, enabled = true }: UseSessionTimeoutOptions = {}) {
  const { isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(async () => {
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity for HIPAA compliance.",
      variant: "destructive",
    });
    await logout();
    onTimeout?.();
  }, [logout, toast, onTimeout]);

  const showWarning = useCallback(() => {
    toast({
      title: "Session Expiring Soon",
      description: "Your session will expire in 5 minutes due to inactivity. Move your mouse or press a key to stay logged in.",
    });
  }, [toast]);

  const resetTimer = useCallback(() => {
    if (!enabled || !isAuthenticated) return;

    lastActivityRef.current = Date.now();
    clearTimers();

    // Set warning timer (25 minutes)
    warningRef.current = setTimeout(showWarning, TIMEOUT_DURATION - WARNING_DURATION);

    // Set logout timer (30 minutes)
    timeoutRef.current = setTimeout(handleTimeout, TIMEOUT_DURATION);
  }, [enabled, isAuthenticated, clearTimers, showWarning, handleTimeout]);

  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      clearTimers();
      return;
    }

    // Activity events to track
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      // Throttle activity updates to once per minute
      if (Date.now() - lastActivityRef.current > 60000) {
        resetTimer();
      }
    };

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start the timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, isAuthenticated, resetTimer, clearTimers]);

  return {
    resetTimer,
    lastActivity: lastActivityRef.current,
  };
}
