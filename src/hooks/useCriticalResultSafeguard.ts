import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  selectSafeguardAlerts,
  type CriticalLabOrderLike,
  type SafeguardAlert,
} from '@/lib/clinical/criticalResultSafeguard';

/** Roles that see the interim safeguard at all. */
const CLINICAL_ROLES = ['doctor', 'nurse', 'lab_technician', 'admin', 'super_admin', 'hospital_admin'];
const LOOKBACK_HOURS = 72;
const POLL_MS = 30_000;
export const CRITICAL_RECEIPT_ACTION = 'critical_result_receipt';

export interface SafeguardOrder extends CriticalLabOrderLike {
  readonly test_name: string;
  readonly patient_id: string;
  readonly result_notes?: string | null;
  readonly patient?: { first_name?: string | null; last_name?: string | null; mrn?: string | null } | null;
}

/**
 * Interim S0-08 safeguard: polls critical lab orders without a recorded
 * read-back and returns the ones this user must see. Polling (not realtime) is
 * deliberate: it keeps working if realtime is unavailable. A load failure is
 * reported (`loadError`) so the banner can say the safeguard itself is down.
 */
export function useCriticalResultSafeguard() {
  const { user, profile, roles } = useAuth();
  const queryClient = useQueryClient();
  const hospitalId = profile?.hospital_id ?? null;
  const roleList = useMemo(() => (roles ?? []).map(String), [roles]);
  const enabled = !!user && !!hospitalId && roleList.some((r) => CLINICAL_ROLES.includes(r));

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [enabled]);

  const ordersQuery = useQuery({
    queryKey: ['critical-result-safeguard', hospitalId],
    enabled,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    queryFn: async (): Promise<SafeguardOrder[]> => {
      const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();
      const { data, error } = await supabase
        .from('lab_orders')
        .select(
          'id, test_name, patient_id, status, is_critical, ordered_by, completed_at, critical_notified_at, updated_at, result_notes, results, patient:patients(first_name, last_name, mrn)'
        )
        .eq('hospital_id', hospitalId as string)
        .eq('is_critical', true)
        .gte('updated_at', since)
        .order('updated_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as SafeguardOrder[];
    },
  });

  const receiptsQuery = useQuery({
    queryKey: ['critical-result-safeguard', 'receipts', user?.id],
    enabled,
    refetchInterval: POLL_MS,
    queryFn: async (): Promise<string[]> => {
      const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();
      const { data, error } = await supabase
        .from('activity_logs')
        .select('entity_id')
        .eq('user_id', user!.id)
        .eq('action_type', CRITICAL_RECEIPT_ACTION)
        .gte('created_at', since);
      // Receipts only hide alerts; if they cannot be read, show everything.
      if (error) return [];
      return (data ?? []).map((r: { entity_id: string | null }) => r.entity_id).filter(Boolean) as string[];
    },
  });

  const receipts = useMemo(() => new Set(receiptsQuery.data ?? []), [receiptsQuery.data]);

  const alerts: SafeguardAlert<SafeguardOrder>[] = useMemo(
    () =>
      enabled
        ? selectSafeguardAlerts(ordersQuery.data ?? [], { profileId: profile?.id, roles: roleList }, now, receipts)
        : [],
    [enabled, ordersQuery.data, profile?.id, roleList, now, receipts]
  );

  const receiptMutation = useMutation({
    mutationFn: async (alert: SafeguardAlert<SafeguardOrder>) => {
      const { error } = await supabase.from('activity_logs').insert({
        user_id: user!.id,
        hospital_id: hospitalId,
        action_type: CRITICAL_RECEIPT_ACTION,
        entity_type: 'lab_order',
        entity_id: alert.order.id,
        severity: 'warning',
        details: {
          patient_id: alert.order.patient_id,
          test_name: alert.order.test_name,
          stage: alert.stage,
          minutes_open: alert.minutesOpen,
          ordering_clinician: alert.isOrderingClinician,
          source: 'interim-safeguard-s0-08',
        },
      } as never);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['critical-result-safeguard', 'receipts', user?.id] }),
  });

  const isLabOrAdmin = roleList.some((r) => ['lab_technician', 'admin', 'super_admin', 'hospital_admin'].includes(r));

  return {
    enabled,
    alerts,
    isLabOrAdmin,
    loadError: ordersQuery.error ? (ordersQuery.error as Error).message || 'unknown error' : null,
    recordReceipt: useCallback((a: SafeguardAlert<SafeguardOrder>) => receiptMutation.mutateAsync(a), [receiptMutation]),
    isRecording: receiptMutation.isPending,
  };
}
