/**
 * useEdgeCaseResilience Hook
 * Wraps resilience utilities for critical mutations in patient-facing flows.
 * 
 * Usage:
 *   const { mutateWithRetry, trackSubmission } = useEdgeCaseResilience();
 *   const result = await mutateWithRetry(
 *     () => createPrescription(data),
 *     { idempotencyKey, onRetry: () => toast('Retrying...') }
 *   );
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  retryWithBackoff,
  idempotencyTracker,
  generateIdempotencyKey,
  detectConcurrentModification,
  getSessionState,
  handleAuthError,
  requireValue,
  validateId,
  CircuitBreaker,
} from '@/utils/edgeCaseResilience';
import type { RetryOptions } from '@/utils/edgeCaseResilience';

interface MutationOptions extends RetryOptions {
  idempotencyKey?: string;
  onRetry?: (attempt: number) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  timeout?: number; // max ms for entire operation
}

/**
 * Hook for resilient mutations in critical patient workflows.
 * Wraps retry logic, idempotency, and error handling.
 */
export function useEdgeCaseResilience() {
  const { profile, session } = useAuth();
  const circuitBreakerRef = useRef(new CircuitBreaker());

  // ─── Session Monitoring ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.expires_at) return;

    const checkSession = () => {
      const state = getSessionState(new Date(session.expires_at * 1000));
      if (!state.isValid) {
        // Session expired; trigger re-auth
        console.warn('Session expired, re-authentication required');
        // Could dispatch action to show re-auth modal
      } else if (state.warning) {
        console.warn('Session expiry warning:', state.warning);
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [session?.expires_at]);

  // ─── Idempotent Mutation with Retry ──────────────────────────────────────────

  const mutateWithRetry = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options: MutationOptions = {}
    ): Promise<{
      success: boolean;
      data?: T;
      error?: string;
      isDuplicate?: boolean;
    }> => {
      const {
        idempotencyKey,
        onRetry,
        onSuccess,
        onError,
        maxAttempts = 3,
        timeout = 30000,
        ...retryOptions
      } = options;

      try {
        const key = idempotencyKey || generateIdempotencyKey(
          requireValue(profile?.id, 'User ID required for idempotency'),
          'mutation',
          Date.now().toString()
        );

        // Check for duplicate submission
        if (idempotencyTracker.isDuplicate(key)) {
          const cached = idempotencyTracker.getCachedResult(key);
          return {
            success: cached?.success !== false,
            data: cached?.data,
            isDuplicate: true,
          };
        }

        // Execute with retry and timeout
        let result: T | undefined;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Mutation timeout')), timeout)
        );

        try {
          result = await Promise.race([
            retryWithBackoff(fn, { maxAttempts, ...retryOptions }),
            timeoutPromise,
          ]);
        } catch (err) {
          throw err;
        }

        // Track successful submission
        idempotencyTracker.track(key, { success: true, data: result });
        onSuccess?.(result);

        return { success: true, data: result };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);

        // Check for auth errors
        if (errorMsg.includes('401') || errorMsg.includes('403')) {
          const authError = handleAuthError(
            errorMsg.includes('401') ? 401 : 403,
            { userId: profile?.id }
          );
          if (authError.shouldReauth) {
            // Trigger re-auth flow
            console.warn('Re-auth required:', authError.message);
          }
        }

        onError?.(err instanceof Error ? err : new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    },
    [profile?.id]
  );

  // ─── Optimistic Update with Rollback ────────────────────────────────────────

  const mutateOptimistic = useCallback(
    async <T extends { updated_at: Date; id: string }>(
      optimisticData: T,
      mutationFn: (data: T) => Promise<T>,
      fetchLatestFn: (id: string) => Promise<T>,
      onRollback?: (data: T) => void
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        // Check for concurrent modifications
        const latest = await fetchLatestFn(optimisticData.id);
        const conflict = detectConcurrentModification(
          latest.updated_at,
          optimisticData.updated_at
        );

        if (conflict.isConflict) {
          onRollback?.(latest);
          return {
            success: false,
            error: conflict.message || 'Concurrent modification detected',
            data: latest,
          };
        }

        // No conflict, proceed
        const result = await mutationFn(optimisticData);
        return { success: true, data: result };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        onRollback?.(optimisticData);
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  // ─── Circuit Breaker for External Calls ────────────────────────────────────

  const executeWithCircuitBreaker = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<{
      success: boolean;
      data?: T;
      error?: string;
      circuitOpen?: boolean;
    }> => {
      try {
        const data = await circuitBreakerRef.current.execute(fn);
        return { success: true, data };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const circuitOpen = circuitBreakerRef.current.getState() === 'open';
        return {
          success: false,
          error: errorMsg,
          circuitOpen,
        };
      }
    },
    []
  );

  // ─── Reset Circuit Breaker ──────────────────────────────────────────────────

  const resetCircuitBreaker = useCallback(() => {
    circuitBreakerRef.current.reset();
  }, []);

  // ─── Track Submission (for duplicate detection) ─────────────────────────────

  const trackSubmission = useCallback(
    (key: string, result?: any) => {
      idempotencyTracker.track(key, result);
    },
    []
  );

  // ─── Validate IDs ───────────────────────────────────────────────────────────

  const validateIds = useCallback(
    (ids: Record<string, any>): { valid: boolean; missingKeys?: string[] } => {
      const missingKeys = Object.entries(ids)
        .filter(([, value]) => !validateId(value))
        .map(([key]) => key);

      return {
        valid: missingKeys.length === 0,
        missingKeys,
      };
    },
    []
  );

  return {
    mutateWithRetry,
    mutateOptimistic,
    executeWithCircuitBreaker,
    resetCircuitBreaker,
    trackSubmission,
    validateIds,
  };
}
