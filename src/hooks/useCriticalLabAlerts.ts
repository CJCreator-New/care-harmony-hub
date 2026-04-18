// ===================================================================
// TIER 4.4: Critical Lab Alerts Hook
// ===================================================================
// Purpose: Manage critical lab alerts with escalation tracking
// File: src/hooks/useCriticalLabAlerts.ts
// ===================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/lib/hooks/observability/useAuditLog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export interface CriticalLabAlert {
  id: string;
  lab_result_id: string;
  patient_id: string;
  test_name: string;
  test_code: string;
  result_value: number;
  severity: 'critical_high' | 'critical_low' | 'warning';
  primary_doctor_id: string;
  primary_notified_at: string | null;
  primary_acknowledged_at: string | null;
  primary_action_taken: boolean;
  primary_action_notes: string | null;
  on_call_id: string | null;
  on_call_notified_at: string | null;
  on_call_acknowledged_at: string | null;
  on_call_action_taken: boolean;
  er_notified_at: string | null;
  er_acknowledged_at: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useCriticalLabAlerts() {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [alerts, setAlerts] = useState<CriticalLabAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unresolved, setUnresolved] = useState(0);
  const unsubscribeRef = useRef<() => void | null>(null);

  // Fetch unresolved alerts
  const fetchAlerts = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lab_critical_alerts')
        .select('*')
        .or(`primary_doctor_id.eq.${user.id},on_call_id.eq.${user.id}`)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setAlerts(data || []);
      setUnresolved((data || []).filter(a => !a.is_resolved).length);
    } catch (e) {
      console.error('Failed to fetch critical lab alerts:', e);
      toast.error('Failed to load critical lab alerts');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    fetchAlerts();

    const subscription = supabase
      .channel(`doctor:${user.id}:critical_alerts`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lab_critical_alerts',
          filter: `or(primary_doctor_id.eq.${user.id},on_call_id.eq.${user.id})`,
        },
        (payload) => {
          const alert = payload.new as CriticalLabAlert;
          setAlerts(prev => [alert, ...prev]);
          setUnresolved(prev => prev + 1);

          // Show prominent toast for critical alerts
          const icon = alert.severity === 'critical_high' 
            ? '🔴' 
            : alert.severity === 'critical_low' 
            ? '🟠' 
            : '🟡';
          
          toast.error(
            `${icon} CRITICAL LAB: ${alert.test_name} = ${alert.result_value}. Immediate action required!`,
            {
              duration: 10000,
              action: {
                label: 'Review',
                onClick: () => window.location.href = `/labs/alerts/${alert.id}`,
              },
            }
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lab_critical_alerts',
        },
        (payload) => {
          const updated = payload.new as CriticalLabAlert;
          setAlerts(prev =>
            prev.map(a => a.id === updated.id ? updated : a)
          );
          if (updated.is_resolved) {
            setUnresolved(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    unsubscribeRef.current = () => subscription.unsubscribe();

    return () => {
      unsubscribeRef.current?.();
    };
  }, [user?.id, fetchAlerts]);

  // Acknowledge alert as primary doctor
  const acknowledgeAsPrimary = useCallback(
    async (alertId: string, actionNotes?: string) => {
      try {
        const { error } = await supabase
          .from('lab_critical_alerts')
          .update({
            primary_acknowledged_at: new Date().toISOString(),
            primary_action_notes: actionNotes || '',
            primary_action_taken: !!actionNotes,
          })
          .eq('id', alertId);

        if (error) throw error;

        await logActivity(
          'critical_lab_alert_primary_acknowledged',
          'lab_critical_alerts',
          alertId,
          { action_notes: actionNotes }
        );

        toast.success('Alert acknowledged');
      } catch (e) {
        console.error('Failed to acknowledge alert:', e);
        toast.error('Failed to acknowledge alert');
      }
    },
    [logActivity]
  );

  // Acknowledge alert as on-call doctor
  const acknowledgeAsOnCall = useCallback(
    async (alertId: string, actionNotes?: string) => {
      try {
        const { error } = await supabase
          .from('lab_critical_alerts')
          .update({
            on_call_acknowledged_at: new Date().toISOString(),
            on_call_action_notes: actionNotes || '',
            on_call_action_taken: !!actionNotes,
          })
          .eq('id', alertId);

        if (error) throw error;

        await logActivity(
          'critical_lab_alert_on_call_acknowledged',
          'lab_critical_alerts',
          alertId,
          { action_notes: actionNotes }
        );

        toast.success('On-call alert acknowledged');
      } catch (e) {
        console.error('Failed to acknowledge on-call alert:', e);
        toast.error('Failed to acknowledge on-call alert');
      }
    },
    [logActivity]
  );

  // Acknowledge ER notification
  const acknowledgeAsER = useCallback(
    async (alertId: string, actionNotes?: string) => {
      try {
        const { error } = await supabase
          .from('lab_critical_alerts')
          .update({
            er_acknowledged_at: new Date().toISOString(),
            er_action_notes: actionNotes || '',
            er_action_taken: !!actionNotes,
          })
          .eq('id', alertId);

        if (error) throw error;

        await logActivity(
          'critical_lab_alert_er_acknowledged',
          'lab_critical_alerts',
          alertId,
          { action_notes: actionNotes }
        );

        toast.success('ER alert acknowledged');
      } catch (e) {
        console.error('Failed to acknowledge ER alert:', e);
        toast.error('Failed to acknowledge ER alert');
      }
    },
    [logActivity]
  );

  // Mark alert as resolved
  const resolveAlert = useCallback(
    async (alertId: string, resolutionNotes: string) => {
      try {
        const { error } = await supabase
          .from('lab_critical_alerts')
          .update({
            is_resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id,
            resolution_notes: resolutionNotes,
          })
          .eq('id', alertId);

        if (error) throw error;

        await logActivity(
          'critical_lab_alert_resolved',
          'lab_critical_alerts',
          alertId,
          { resolution_notes: resolutionNotes, resolved_by: user?.id }
        );

        setAlerts(prev => prev.filter(a => a.id !== alertId));
        setUnresolved(prev => Math.max(0, prev - 1));
        toast.success('Alert marked as resolved');
      } catch (e) {
        console.error('Failed to resolve alert:', e);
        toast.error('Failed to resolve alert');
      }
    },
    [user?.id, logActivity]
  );

  // Get alerts needing primary doctor action
  const getAlertsNeedingAction = useCallback(() => {
    return alerts.filter(
      a => a.primary_doctor_id === user?.id && !a.primary_acknowledged_at
    );
  }, [alerts, user?.id]);

  // Get escalation status for alert
  const getEscalationStatus = useCallback((alert: CriticalLabAlert) => {
    const chain = [];
    if (alert.primary_notified_at) {
      chain.push({
        level: 'primary',
        notified: true,
        acknowledged: !!alert.primary_acknowledged_at,
        actionTaken: alert.primary_action_taken,
      });
    }
    if (alert.on_call_notified_at) {
      chain.push({
        level: 'on_call',
        notified: true,
        acknowledged: !!alert.on_call_acknowledged_at,
        actionTaken: alert.on_call_action_taken,
      });
    }
    if (alert.er_notified_at) {
      chain.push({
        level: 'er',
        notified: true,
        acknowledged: !!alert.er_acknowledged_at,
        actionTaken: alert.er_action_taken,
      });
    }
    return chain;
  }, []);

  return {
    alerts,
    unresolved,
    isLoading,
    acknowledgeAsPrimary,
    acknowledgeAsOnCall,
    acknowledgeAsER,
    resolveAlert,
    getAlertsNeedingAction,
    getEscalationStatus,
    refetch: fetchAlerts,
  };
}
