/**
 * Critical Lab Alert Escalation Queue (`critical-lab-escalation`)
 *
 * React Hook Adapter: `useCriticalLabEscalation`
 *
 * Presentation seam connecting alert components to CriticalLabEscalationEngine.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { LabCriticalAlert, LabEscalationActor } from './types';
import {
  createCriticalLabEscalationEngine,
  CriticalLabEscalationEngine,
} from './CriticalLabEscalationEngine';

export interface UseCriticalLabEscalationOptions {
  readonly doctorId?: string;
  readonly engine?: CriticalLabEscalationEngine;
}

export interface UseCriticalLabEscalationReturn {
  readonly alerts: readonly LabCriticalAlert[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly unacknowledgedCount: number;
  readonly acknowledgeAlert: (
    alertId: string,
    notes?: string
  ) => Promise<{ success: boolean; error?: string }>;
  readonly resolveAlert: (
    alertId: string,
    notes: string
  ) => Promise<{ success: boolean; error?: string }>;
  readonly refresh: () => Promise<void>;
}

export function useCriticalLabEscalation(
  options: UseCriticalLabEscalationOptions = {}
): UseCriticalLabEscalationReturn {
  const { doctorId: overrideDoctorId, engine: customEngine } = options;
  const { user, profile } = useAuth();

  const engine = useMemo(() => customEngine || createCriticalLabEscalationEngine(), [customEngine]);

  const [alerts, setAlerts] = useState<readonly LabCriticalAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actor: LabEscalationActor = useMemo(() => {
    const role = (profile?.role || (user as any)?.role || 'doctor') as string;
    const hospitalId = profile?.hospital_id || (user as any)?.hospital_id || 'default-hospital';
    return {
      id: user?.id || 'anonymous-doctor',
      hospitalId,
      role,
    };
  }, [user, profile]);

  const targetDoctorId = overrideDoctorId ?? (actor.role === 'doctor' ? actor.id : undefined);

  const fetchAlerts = useCallback(async () => {
    if (!actor.hospitalId) return;

    setIsLoading(true);
    setError(null);
    try {
      const data = await engine.getActiveAlerts(actor.hospitalId, targetDoctorId);
      setAlerts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error('[useCriticalLabEscalation] Failed to fetch critical alerts:', msg);
    } finally {
      setIsLoading(false);
    }
  }, [actor.hospitalId, targetDoctorId, engine]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Realtime subscription for critical alerts broadcast
  useEffect(() => {
    if (!actor.hospitalId) return;

    const channel = supabase.channel(`hospital-lab-alerts:${actor.hospitalId}`);
    channel
      .on('broadcast', { event: 'critical_lab_escalation' }, (payload: any) => {
        toast.error(
          `CRITICAL LAB ALERT: ${payload?.payload?.testName} (${payload?.payload?.resultValue})`,
          {
            duration: 10000,
          }
        );
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [actor.hospitalId, fetchAlerts]);

  const acknowledgeAlert = useCallback(
    async (alertId: string, notes?: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await engine.acknowledgeAlert(actor, { alertId, notes });
        if (!res.success) {
          throw new Error(res.error || 'Failed to acknowledge critical alert');
        }
        toast.success('Critical lab alert acknowledged. Pending ladder escalations cancelled.');
        await fetchAlerts();
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Acknowledgment failed: ${msg}`);
        return { success: false, error: msg };
      }
    },
    [actor, engine, fetchAlerts]
  );

  const resolveAlert = useCallback(
    async (alertId: string, notes: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await engine.resolveAlert(actor, { alertId, notes });
        if (!res.success) {
          throw new Error(res.error || 'Failed to resolve critical alert');
        }
        toast.success('Critical lab alert resolved successfully.');
        await fetchAlerts();
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Resolution failed: ${msg}`);
        return { success: false, error: msg };
      }
    },
    [actor, engine, fetchAlerts]
  );

  const unacknowledgedCount = useMemo(() => {
    return alerts.filter((a) => !a.primary_acknowledged_at && !a.is_resolved).length;
  }, [alerts]);

  return {
    alerts,
    isLoading,
    error,
    unacknowledgedCount,
    acknowledgeAlert,
    resolveAlert,
    refresh: fetchAlerts,
  };
}
