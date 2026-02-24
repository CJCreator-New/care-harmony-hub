/**
 * Consolidated Real-time Subscriptions Hook
 * 
 * Combines multiple WebSocket subscriptions into a single channel
 * to reduce connection overhead and improve performance.
 * 
 * @module useRealtimeSubscriptions
 * @version 1.0.0
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { invalidateCache } from '@/utils/cacheInvalidation';
import { devLog } from '@/utils/sanitize';

interface SubscriptionConfig {
  table: string;
  events?: ('INSERT' | 'UPDATE' | 'DELETE')[];
  filter?: string;
  invalidateQueries?: string[];
}

interface UseRealtimeSubscriptionsOptions {
  hospitalId: string;
  subscriptions: SubscriptionConfig[];
  enabled?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Consolidated real-time subscriptions hook
 * Uses a single channel for all subscriptions to reduce connection overhead
 */
export function useRealtimeSubscriptions({
  hospitalId,
  subscriptions,
  enabled = true,
  onError
}: UseRealtimeSubscriptionsOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const handleDatabaseChange = useCallback((
    payload: any,
    config: SubscriptionConfig
  ) => {
    const { table, invalidateQueries } = config;

    // Determine which queries to invalidate.
    // NOTE: We only use invalidateQueries (not setQueryData) here because the
    // actual TanStack Query cache keys used by hooks are multi-part arrays such
    // as ['queue', hospitalId, status]. Attempting to write via a bare
    // single-string key like ['queue'] would write to an orphaned cache slot
    // that no component ever reads, defeating the purpose of the optimistic
    // update entirely.  invalidateQueries performs prefix matching, so every
    // variant of the key (any hospitalId, any status filter) is refreshed
    // correctly on the next render cycle.
    const queriesToInvalidate = invalidateQueries || [table];

    for (const queryKey of queriesToInvalidate) {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
    }

    // Invalidate related caches via the shared utility
    invalidateCache(table, { strategy: 'related', skipReactQuery: true });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || !hospitalId || subscriptions.length === 0) {
      return;
    }

    const setupChannel = () => {
      // Create a single consolidated channel
      const channelName = `hospital-${hospitalId}`;
      
      channelRef.current = supabase
        .channel(channelName)
        .on('system', {}, (payload) => {
          // Handle system events (connect, disconnect, etc.)
          if (payload.type === 'connected') {
            reconnectAttemptsRef.current = 0;
            devLog(`Real-time channel connected: ${channelName}`);
          }
        });

      // Add all subscriptions to the single channel
      subscriptions.forEach(config => {
        const { table, events = ['INSERT', 'UPDATE', 'DELETE'], filter } = config;
        
        // Build filter string
        const filterString = filter || `hospital_id=eq.${hospitalId}`;
        
        channelRef.current!.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: filterString
          },
          (payload) => {
            // Only process configured events
            if (events.includes(payload.eventType)) {
              handleDatabaseChange(payload, config);
            }
          }
        );
      });

      // Subscribe with error handling and auto-reconnect
      channelRef.current.subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || err) {
          console.error('Real-time subscription error:', err);
          
          if (onError) {
            onError(err || new Error('Channel error'));
          }

          // Attempt reconnection with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            reconnectAttemptsRef.current++;
            
            setTimeout(() => {
              devLog(`Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
              setupChannel();
            }, delay);
          }
        }
      });
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [hospitalId, enabled, subscriptions, handleDatabaseChange, onError]);

  // Return connection status
  return {
    isConnected: channelRef.current?.state === 'joined',
    reconnectAttempts: reconnectAttemptsRef.current
  };
}

/**
 * Pre-configured hook for admin dashboard real-time updates
 */
export function useAdminRealtime(hospitalId: string, enabled = true) {
  return useRealtimeSubscriptions({
    hospitalId,
    enabled,
    subscriptions: [
      {
        table: 'patients',
        invalidateQueries: ['patients', 'admin-stats']
      },
      {
        table: 'appointments',
        invalidateQueries: ['appointments', 'admin-stats']
      },
      {
        table: 'payments',
        invalidateQueries: ['payments', 'admin-stats']
      },
      {
        table: 'patient_queue',
        invalidateQueries: ['queue', 'admin-stats']
      },
      {
        table: 'prescriptions',
        invalidateQueries: ['prescriptions', 'admin-stats']
      },
      {
        table: 'lab_orders',
        invalidateQueries: ['lab_orders', 'admin-stats']
      }
    ]
  });
}

/**
 * Pre-configured hook for patient-specific real-time updates
 */
export function usePatientRealtime(patientId: string, hospitalId: string, enabled = true) {
  return useRealtimeSubscriptions({
    hospitalId,
    enabled: enabled && !!patientId,
    subscriptions: [
      {
        table: 'patients',
        filter: `id=eq.${patientId}`,
        events: ['UPDATE'],
        invalidateQueries: ['patient', patientId]
      },
      {
        table: 'appointments',
        filter: `patient_id=eq.${patientId}`,
        invalidateQueries: ['patient-appointments', patientId]
      },
      {
        table: 'prescriptions',
        filter: `patient_id=eq.${patientId}`,
        invalidateQueries: ['patient-prescriptions', patientId]
      },
      {
        table: 'lab_orders',
        filter: `patient_id=eq.${patientId}`,
        invalidateQueries: ['patient-labs', patientId]
      }
    ]
  });
}

/**
 * Pre-configured hook for doctor/nurse workflow real-time updates
 */
export function useWorkflowRealtime(hospitalId: string, userId: string, enabled = true) {
  return useRealtimeSubscriptions({
    hospitalId,
    enabled,
    subscriptions: [
      {
        table: 'appointments',
        filter: `doctor_id=eq.${userId}`,
        invalidateQueries: ['my-appointments', 'appointments']
      },
      {
        table: 'patient_queue',
        invalidateQueries: ['queue', 'waiting-patients']
      },
      {
        table: 'consultations',
        filter: `doctor_id=eq.${userId}`,
        invalidateQueries: ['my-consultations']
      },
      {
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
        events: ['INSERT'],
        invalidateQueries: ['notifications', userId]
      }
    ]
  });
}

export default useRealtimeSubscriptions;
