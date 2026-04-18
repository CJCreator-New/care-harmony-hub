/**
 * Hook for monitoring Supabase Realtime connection status
 * Provides auto-retry with exponential backoff and disconnect event logging
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { RealtimeClient } from '@supabase/realtime-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RealtimeConnectionStatus {
  isConnected: boolean;
  lastDisconnectedAt: Date | null;
  disconnectCount: number;
  retryAttempt: number;
  retryDelayMs: number;
  error: Error | null;
}

interface DisconnectLog {
  disconnect_at: string;
  reason?: string;
  retry_attempt: number;
  reconnect_at: string | null;
}

/**
 * Configuration for exponential backoff retry strategy
 */
interface RetryConfig {
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  maxRetries: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  initialDelayMs: 1000, // 1 second
  maxDelayMs: 30000, // 30 seconds
  backoffMultiplier: 1.5,
  maxRetries: 10,
};

/**
 * Hook to monitor Supabase Realtime connection and handle disconnections
 * Implements exponential backoff retry strategy
 */
export function useRealtimeConnectionStatus(
  logToDatabase: boolean = true,
  onDisconnect?: (reason?: string) => void,
  onReconnect?: () => void
): RealtimeConnectionStatus {
  const [status, setStatus] = useState<RealtimeConnectionStatus>({
    isConnected: true,
    lastDisconnectedAt: null,
    disconnectCount: 0,
    retryAttempt: 0,
    retryDelayMs: DEFAULT_RETRY_CONFIG.initialDelayMs,
    error: null,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionListenerRef = useRef<any>(null);
  const disconnectLogsRef = useRef<DisconnectLog[]>([]);

  /**
   * Log disconnect event to system_logs table for post-mortem analysis
   */
  const logDisconnectEvent = useCallback(
    async (reason?: string, retryAttempt: number = 0) => {
      if (!logToDatabase) return;

      try {
        const disconnectLog: DisconnectLog = {
          disconnect_at: new Date().toISOString(),
          reason: reason || 'Unknown',
          retry_attempt: retryAttempt,
          reconnect_at: null,
        };

        disconnectLogsRef.current.push(disconnectLog);

        // Log to system_logs table (async, non-blocking)
        supabase
          .from('system_logs')
          .insert({
            level: 'warning',
            message: `Realtime connection lost: ${reason || 'Unknown reason'}`,
            context: {
              retry_attempt: retryAttempt,
              timestamp: disconnectLog.disconnect_at,
              logs_count: disconnectLogsRef.current.length,
            },
            created_at: new Date().toISOString(),
          })
          .catch((err) => {
            console.warn('Failed to log disconnect event:', err);
          });
      } catch (err) {
        console.error('Error logging disconnect event:', err);
      }
    },
    [logToDatabase]
  );

  /**
   * Calculate next retry delay using exponential backoff
   */
  const calculateNextRetryDelay = useCallback(
    (retryAttempt: number): number => {
      const delayMs = Math.min(
        DEFAULT_RETRY_CONFIG.initialDelayMs *
          Math.pow(
            DEFAULT_RETRY_CONFIG.backoffMultiplier,
            retryAttempt
          ),
        DEFAULT_RETRY_CONFIG.maxDelayMs
      );

      // Add jitter (±10%) to prevent thundering herd
      const jitterRange = delayMs * 0.1;
      const jitter = (Math.random() - 0.5) * jitterRange * 2;

      return Math.max(1000, Math.round(delayMs + jitter));
    },
    []
  );

  /**
   * Attempt to reconnect to Realtime
   */
  const attemptReconnect = useCallback(
    async (currentRetryAttempt: number) => {
      if (currentRetryAttempt >= DEFAULT_RETRY_CONFIG.maxRetries) {
        console.error(
          'Max reconnection attempts reached. Manual intervention required.'
        );

        setStatus((prev) => ({
          ...prev,
          error: new Error(
            'Failed to reconnect after maximum attempts. Please refresh the page.'
          ),
        }));

        toast.error(
          'Connection failed. Please refresh the page.',
          {
            duration: Infinity,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload(),
            },
          }
        );

        return;
      }

      const nextDelayMs = calculateNextRetryDelay(currentRetryAttempt);

      console.log(
        `Attempting reconnection (attempt ${currentRetryAttempt + 1}/${DEFAULT_RETRY_CONFIG.maxRetries}) in ${nextDelayMs}ms`
      );

      setStatus((prev) => ({
        ...prev,
        retryAttempt: currentRetryAttempt + 1,
        retryDelayMs: nextDelayMs,
      }));

      await logDisconnectEvent(
        'Scheduling reconnection attempt',
        currentRetryAttempt
      );

      retryTimeoutRef.current = setTimeout(async () => {
        try {
          // Attempt to reconnect Realtime channel
          const realtimeClient = supabase.realtime;

          if (realtimeClient) {
            // Force disconnect and reconnect
            if (realtimeClient.socket?.disconnect) {
              realtimeClient.socket.disconnect();
            }

            // Re-establish connection
            if (realtimeClient.socket?.connect) {
              realtimeClient.socket.connect();
            }

            // Verify connection is restored
            if (
              realtimeClient.socket?.isConnected?.() ||
              realtimeClient.socket?.state === 'open'
            ) {
              console.log('Realtime connection restored');

              setStatus((prev) => ({
                isConnected: true,
                lastDisconnectedAt: prev.lastDisconnectedAt,
                disconnectCount: prev.disconnectCount,
                retryAttempt: 0,
                retryDelayMs: DEFAULT_RETRY_CONFIG.initialDelayMs,
                error: null,
              }));

              toast.success('Connection restored', {
                duration: 3000,
              });

              if (onReconnect) {
                onReconnect();
              }

              // Update last log with reconnect time
              if (disconnectLogsRef.current.length > 0) {
                disconnectLogsRef.current[
                  disconnectLogsRef.current.length - 1
                ].reconnect_at = new Date().toISOString();
              }

              return;
            }
          }

          // Connection still not restored, try again
          attemptReconnect(currentRetryAttempt + 1);
        } catch (err) {
          console.error('Reconnection attempt failed:', err);
          attemptReconnect(currentRetryAttempt + 1);
        }
      }, nextDelayMs);
    },
    [calculateNextRetryDelay, logDisconnectEvent, onReconnect]
  );

  /**
   * Handle Realtime disconnection event
   */
  const handleDisconnect = useCallback(
    async (reason?: string) => {
      console.warn('Realtime connection lost:', reason);

      setStatus((prev) => ({
        isConnected: false,
        lastDisconnectedAt: new Date(),
        disconnectCount: prev.disconnectCount + 1,
        retryAttempt: 0,
        retryDelayMs: DEFAULT_RETRY_CONFIG.initialDelayMs,
        error: new Error(reason || 'Connection lost'),
      }));

      await logDisconnectEvent(reason, 0);

      // Show user notification
      toast.error(
        '🔴 Connection lost. Clinical updates may be delayed.',
        {
          duration: Infinity,
          action: {
            label: 'Retry',
            onClick: () => attemptReconnect(0),
          },
        }
      );

      // Trigger callback
      if (onDisconnect) {
        onDisconnect(reason);
      }

      // Start reconnection attempts
      attemptReconnect(0);
    },
    [attemptReconnect, logDisconnectEvent, onDisconnect]
  );

  /**
   * Set up Realtime connection listeners
   */
  useEffect(() => {
    try {
      const realtimeClient = supabase.realtime;

      if (!realtimeClient) {
        console.warn('Supabase Realtime client not available');
        return;
      }

      // Listen for connection state changes
      const handleConnectionChange = (state: any) => {
        console.log('Realtime connection state changed:', state);

        if (
          state === 'open' ||
          state === 'connected' ||
          realtimeClient.socket?.isConnected?.()
        ) {
          // Connection restored
          if (status.disconnectCount > 0 && !status.isConnected) {
            setStatus((prev) => ({
              isConnected: true,
              lastDisconnectedAt: prev.lastDisconnectedAt,
              disconnectCount: prev.disconnectCount,
              retryAttempt: 0,
              retryDelayMs: DEFAULT_RETRY_CONFIG.initialDelayMs,
              error: null,
            }));

            toast.success('Connection restored', {
              duration: 3000,
            });

            if (onReconnect) {
              onReconnect();
            }
          }
        } else if (
          state === 'closed' ||
          state === 'error' ||
          !realtimeClient.socket?.isConnected?.()
        ) {
          // Connection lost
          if (status.isConnected) {
            handleDisconnect(
              `State changed to: ${state || 'unknown'}`
            );
          }
        }
      };

      // Register state change listener
      if (realtimeClient.socket) {
        realtimeClient.socket.onOpen(
          () => handleConnectionChange('open')
        );
        realtimeClient.socket.onClose(
          () => handleConnectionChange('closed')
        );
        realtimeClient.socket.onError((err) =>
          handleConnectionChange('error')
        );

        connectionListenerRef.current = {
          onOpen: () => handleConnectionChange('open'),
          onClose: () => handleConnectionChange('closed'),
          onError: (err: any) => handleConnectionChange('error'),
        };
      }
    } catch (err) {
      console.error('Failed to set up Realtime connection listener:', err);
    }

    return () => {
      // Cleanup retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [handleDisconnect, status.isConnected, status.disconnectCount, onReconnect]);

  return status;
}

/**
 * Alternative hook for simple connection status display
 * Returns only the boolean connection state
 */
export function useIsRealtimeConnected(): boolean {
  const { isConnected } = useRealtimeConnectionStatus(
    false // Don't log to database
  );
  return isConnected;
}
