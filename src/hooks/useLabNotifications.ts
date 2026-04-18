// ===================================================================
// TIER 4.2: Lab Notifications Hook
// ===================================================================
// Purpose: Manage lab result notifications, acknowledgments, and actions
// File: src/hooks/useLabNotifications.ts
// ===================================================================

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/lib/hooks/observability/useAuditLog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface LabNotification {
  id: string;
  lab_result_id: string;
  patient_id: string;
  ordering_doctor_id: string;
  status: 'pending' | 'notified' | 'acknowledged' | 'acted_upon' | 'cancelled';
  is_critical: boolean;
  requires_immediate_action: boolean;
  notified_at: string | null;
  acknowledged_at: string | null;
  action_notes: string | null;
  test_name: string;
  result_value: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export function useLabNotifications() {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [notifications, setNotifications] = useState<LabNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const unsubscribeRef = useRef<() => void | null>(null);

  // Fetch pending notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_result_notifications')
        .select(`
          id,
          lab_result_id,
          patient_id,
          ordering_doctor_id,
          status,
          is_critical,
          requires_immediate_action,
          notified_at,
          acknowledged_at,
          action_notes,
          created_at,
          updated_at,
          lab_results (
            test_name,
            result_value,
            unit
          )
        `)
        .eq('ordering_doctor_id', user.id)
        .in('status', ['pending', 'notified', 'acknowledged'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Flatten lab_results data
      const flattened = data?.map(n => ({
        ...n,
        test_name: n.lab_results?.test_name || 'Unknown Test',
        result_value: n.lab_results?.result_value || 0,
        unit: n.lab_results?.unit || '',
        lab_results: undefined, // Remove nested object
      })) || [];

      setNotifications(flattened);
      setPendingCount(flattened.filter(n => n.status === 'pending').length);
    } catch (e) {
      console.error('Failed to fetch lab notifications:', e);
      toast.error('Failed to load lab notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Subscribe to new notifications via real-time
    const subscription = supabase
      .channel(`doctor:${user.id}:lab_notifications`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lab_result_notifications',
          filter: `ordering_doctor_id=eq.${user.id}`,
        },
        (payload) => {
          // Refetch to get complete data with lab_results join
          fetchNotifications();
          if (payload.new.is_critical) {
            toast.error('🚨 Critical lab value - Immediate action required!');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lab_result_notifications',
        },
        (payload) => {
          // Update local state with acknowledged/acted updates
          setNotifications(prev =>
            prev.map(n =>
              n.id === payload.new.id ? { ...n, ...payload.new } : n
            )
          );
        }
      )
      .subscribe();

    unsubscribeRef.current = () => subscription.unsubscribe();

    return () => {
      unsubscribeRef.current?.();
    };
  }, [user?.id, fetchNotifications]);

  // Acknowledge notification
  const acknowledgeNotification = useCallback(
    async (notificationId: string) => {
      try {
        const { error } = await supabase
          .from('lab_result_notifications')
          .update({
            status: 'acknowledged',
            acknowledged_at: new Date().toISOString(),
            acknowledged_by: user?.id,
          })
          .eq('id', notificationId);

        if (error) throw error;

        await logActivity(
          'lab_notification_acknowledged',
          'lab_result_notifications',
          notificationId,
          { acknowledged: true }
        );

        toast.success('Notification acknowledged');
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
              : n
          )
        );
      } catch (e) {
        console.error('Failed to acknowledge notification:', e);
        toast.error('Failed to acknowledge notification');
      }
    },
    [user?.id, logActivity]
  );

  // Record action taken on notification
  const recordAction = useCallback(
    async (notificationId: string, actionNotes: string) => {
      try {
        const { error } = await supabase
          .from('lab_result_notifications')
          .update({
            status: 'acted_upon',
            acted_upon_at: new Date().toISOString(),
            action_notes: actionNotes,
            consent_logged: true,
            consent_logged_at: new Date().toISOString(),
          })
          .eq('id', notificationId);

        if (error) throw error;

        await logActivity(
          'lab_notification_action_taken',
          'lab_result_notifications',
          notificationId,
          { action_notes: actionNotes, consent_logged: true }
        );

        toast.success('Action recorded and consent logged');
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? {
                  ...n,
                  status: 'acted_upon',
                  acted_upon_at: new Date().toISOString(),
                  action_notes: actionNotes,
                }
              : n
          )
        );
      } catch (e) {
        console.error('Failed to record action:', e);
        toast.error('Failed to record action');
      }
    },
    [logActivity]
  );

  // Cancel notification
  const cancelNotification = useCallback(
    async (notificationId: string, reason: string) => {
      try {
        const { error } = await supabase
          .from('lab_result_notifications')
          .update({
            status: 'cancelled',
            action_notes: reason,
          })
          .eq('id', notificationId);

        if (error) throw error;

        await logActivity(
          'lab_notification_cancelled',
          'lab_result_notifications',
          notificationId,
          { reason }
        );

        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        toast.info('Notification cancelled');
      } catch (e) {
        console.error('Failed to cancel notification:', e);
        toast.error('Failed to cancel notification');
      }
    },
    [logActivity]
  );

  return {
    notifications,
    pendingCount,
    isLoading,
    acknowledgeNotification,
    recordAction,
    cancelNotification,
    refetch: fetchNotifications,
  };
}

import { useRef } from 'react';
