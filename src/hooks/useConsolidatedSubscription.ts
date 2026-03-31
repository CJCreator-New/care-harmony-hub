/**
 * Phase 5: Realtime Subscription Consolidation
 * Deduplicates and optimizes subscriptions to reduce network overhead and improve performance
 *
 * Problem: Multiple hooks subscribe to same channels separately
 * Solution: Central subscription manager with ref counting
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscription registration and reference counting
 */
interface SubscriptionRecord {
  channel: ReturnType<typeof supabase.channel>;
  refCount: number;
  lastUsed: number;
  callbacks: Set<(payload: any) => void>;
}

class ConsolidatedSubscriptionManager {
  private subscriptions = new Map<string, SubscriptionRecord>();
  private cleanupTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Subscribe to a channel with deduplication
   * Multiple callers → single real subscription
   */
  subscribe(
    channelName: string,
    event: string,
    callback: (payload: any) => void,
    filter?: string
  ): () => void {
    const key = `${channelName}:${event}${filter ? `:${filter}` : ''}`;

    let record = this.subscriptions.get(key);

    if (!record) {
      // First subscriber - create channel
      const channel = supabase
        .channel(channelName, {
          config: { broadcast: { self: true } },
        })
        .on(event, filter ? { filter } : {}, (payload) => {
          // Notify all subscribers
          record?.callbacks.forEach(cb => cb(payload));
        })
        .subscribe();

      record = {
        channel,
        refCount: 0,
        lastUsed: Date.now(),
        callbacks: new Set(),
      };

      this.subscriptions.set(key, record);
    }

    // Add this callback
    record.callbacks.add(callback);
    record.refCount += 1;
    record.lastUsed = Date.now();

    // Return unsubscribe function
    return () => {
      record!.callbacks.delete(callback);
      record!.refCount -= 1;
      record!.lastUsed = Date.now();

      // Clean up if no more subscribers
      if (record!.refCount === 0) {
        setTimeout(() => {
          if (record!.refCount === 0) {
            // Still no subscribers - unsubscribe
            supabase.removeChannel(record!.channel);
            this.subscriptions.delete(key);
          }
        }, this.cleanupTimeout);
      }
    };
  }

  /**
   * Get subscription stats (for monitoring)
   */
  getStats() {
    const stats = {
      activeChannels: this.subscriptions.size,
      totalSubscribers: 0,
      channels: [] as any[]
    };

    this.subscriptions.forEach((record, key) => {
      stats.totalSubscribers += record.callbacks.size;
      stats.channels.push({
        key,
        subscribers: record.callbacks.size,
        refCount: record.refCount,
        lastUsed: new Date(record.lastUsed).toISOString(),
      });
    });

    return stats;
  }

  /**
   * Clean up all subscriptions (for cleanup on unmount)
   */
  cleanup() {
    this.subscriptions.forEach(record => {
      supabase.removeChannel(record.channel);
    });
    this.subscriptions.clear();
  }
}

/** Global instance - singleton */
let manager: ConsolidatedSubscriptionManager | null = null;

function getManager(): ConsolidatedSubscriptionManager {
  if (!manager) {
    manager = new ConsolidatedSubscriptionManager();
  }
  return manager;
}

/**
 * Hook: Subscribe to consolidated channel
 * Automatically handles reference counting and cleanup
 */
export function useConsolidatedSubscription(
  channelName: string,
  event: string,
  callback: (payload: any) => void,
  filter?: string,
  enabled: boolean = true
) {
  const callbackRef = useRef(callback);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Update callback ref without re-subscribing
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const manager = getManager();
    unsubscribeRef.current = manager.subscribe(
      channelName,
      event,
      (payload) => callbackRef.current(payload),
      filter
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [channelName, event, filter, enabled]);
}

/**
 * Hook: Get subscription manager stats
 * For debugging and monitoring
 */
export function useSubscriptionStats() {
  return useCallback(() => {
    return getManager().getStats();
  }, []);
}

/**
 * Hook: Queue events with IDempotency
 * Prevents duplicate "patient called" announcements on network retries
 */
export function useIdempotentQueueEvent() {
  const eventCache = useRef(new Map<string, number>());
  const DUPLICATE_WINDOW_MS = 5000; // 5-second window to catch duplicates

  return useCallback((eventKey: string, callback: () => void) => {
    const now = Date.now();
    const lastTime = eventCache.current.get(eventKey);

    if (lastTime && (now - lastTime) < DUPLICATE_WINDOW_MS) {
      // Duplicate event within window - ignore
      console.debug(`[Idempotency] Suppressed duplicate event: ${eventKey}`);
      return false;
    }

    // First time or outside window - process event
    eventCache.current.set(eventKey, now);
    callback();

    // Clean up old entries
    if (eventCache.current.size > 100) {
      const cutoff = now - 10 * 60 * 1000; // 10 minutes
      eventCache.current.forEach((time, key) => {
        if (time < cutoff) {
          eventCache.current.delete(key);
        }
      });
    }

    return true;
  }, []);
}

/**
 * Canonical queue subscription pattern - used by ALL components
 * Consolidates all queue subscriptions into ONE channel
 */
export function useConsolidatedQueueSubscription(
  patientId: string,
  onStatusChange: (status: string, queueId: string) => void
) {
  const { hospital } = useAuth();
  
  const handleQueueChange = useCallback((payload: any) => {
    const { new: newData } = payload;
    if (newData?.status && newData?.id) {
      onStatusChange(newData.status, newData.id);
    }
  }, [onStatusChange]);

  useConsolidatedSubscription(
    `patient-queue-${hospital?.id}`,
    'postgres_changes',
    handleQueueChange,
    `eq.patient_id.${patientId}`,
    !!patientId && !!hospital?.id
  );
}

/**
 * Canonical notification subscription - replaces multiple fragmented subscriptions
 * Single consolidated channel for all notification types
 */
export function useConsolidatedNotificationSubscription(
  onNotification: (notification: any) => void
) {
  const { profile, hospital } = useAuth();
  
  const handleNotification = useCallback((payload: any) => {
    const { new: notification } = payload;
    if (notification?.recipient_id === profile?.user_id) {
      onNotification(notification);
    }
  }, [profile?.user_id, onNotification]);

  useConsolidatedSubscription(
    `hospital-notifications-${hospital?.id}`,
    'postgres_changes',
    handleNotification,
    undefined,
    !!profile?.user_id && !!hospital?.id
  );
}

/**
 * Monitor subscription health
 * Logs consolidation stats periodically
 */
export function useSubscriptionHealthMonitor() {
  const getStats = useSubscriptionStats();

  useEffect(() => {
    const interval = setInterval(() => {
      const stats = getStats();
      if (stats.activeChannels > 0) {
        console.debug('[Subscriptions] Consolidation stats:', {
          channels: stats.activeChannels,
          subscribers: stats.totalSubscribers,
          avgSubscribersPerChannel: (stats.totalSubscribers / stats.activeChannels).toFixed(2),
        });
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [getStats]);
}
