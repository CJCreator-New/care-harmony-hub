import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeForLog } from '@/utils/sanitize';

export interface LabCriticalAcknowledgement {
  id: string;
  hospital_id: string;
  lab_order_id: string;
  patient_id: string;
  notified_physician: string;
  critical_values: Array<{ test: string; value: number; message: string }>;
  status: 'pending' | 'acknowledged' | 'escalated' | 'cancelled';
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  acknowledgement_note: string | null;
  escalation_level: number;
  escalated_at: string | null;
  alert_sent_at: string;
  ack_deadline: string;
  created_at: string;
  lab_orders?: {
    test_name: string;
    results: Record<string, unknown>;
    patients: { first_name: string; last_name: string };
  };
}

/**
 * Fetch pending (unacknowledged) critical lab alerts for the current user's hospital.
 * Doctors see only their own alerts; admins/nurses see all pending.
 */
export function usePendingCriticalAlerts() {
  const { profile, primaryRole } = useAuth();

  return useQuery({
    queryKey: ['lab-critical-alerts', 'pending', profile?.hospital_id, profile?.id],
    queryFn: async () => {
      if (!profile?.hospital_id) return [];

      let query = supabase
        .from('lab_critical_acknowledgements')
        .select(`
          *,
          lab_orders (
            test_name,
            results,
            patients ( first_name, last_name )
          )
        `)
        .eq('hospital_id', profile.hospital_id)
        .eq('status', 'pending')
        .order('ack_deadline', { ascending: true });

      // Doctors see only their own alerts
      if (primaryRole === 'doctor') {
        query = query.eq('notified_physician', profile.id);
      }

      const { data, error } = await query;
      if (error) {
        console.error(sanitizeForLog(`Critical alerts fetch failed: ${error.message}`));
        throw error;
      }
      return (data ?? []) as LabCriticalAcknowledgement[];
    },
    enabled: !!profile?.hospital_id,
    staleTime: 30 * 1000,          // 30 seconds — these are urgent
    refetchInterval: 60 * 1000,    // Poll every minute for new alerts
  });
}

/**
 * Fetch the full acknowledgement history for a specific lab order.
 */
export function useCriticalAlertHistory(labOrderId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['lab-critical-alerts', 'history', labOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lab_critical_acknowledgements')
        .select('*')
        .eq('lab_order_id', labOrderId!)
        .eq('hospital_id', profile!.hospital_id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LabCriticalAcknowledgement[];
    },
    enabled: !!labOrderId && !!profile?.hospital_id,
  });
}

/**
 * Acknowledge a critical lab alert.
 * Marks the record as acknowledged and records the physician's note.
 */
export function useAcknowledgeCriticalAlert() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      ackId,
      note,
    }: {
      ackId: string;
      note?: string;
    }) => {
      const { data, error } = await supabase
        .from('lab_critical_acknowledgements')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: profile?.id,
          acknowledgement_note: note ?? null,
        })
        .eq('id', ackId)
        .eq('hospital_id', profile?.hospital_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-critical-alerts'] });
      toast.success('Critical alert acknowledged', {
        description: 'Your acknowledgement has been recorded.',
      });
    },
    onError: (error: Error) => {
      console.error(sanitizeForLog(`Acknowledge failed: ${error.message}`));
      toast.error('Failed to acknowledge alert', {
        description: 'Please try again or contact support.',
      });
    },
  });
}

/**
 * Trigger the escalation edge function for overdue critical alerts.
 * Called by an admin or charge nurse when a physician hasn't responded.
 */
export function useEscalateCriticalAlert() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      ackId,
      reason,
    }: {
      ackId: string;
      reason: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'lab-critical-values',
        {
          body: { action: 'escalate', ackId, reason, hospitalId: profile?.hospital_id },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-critical-alerts'] });
      toast.warning('Alert escalated', {
        description: 'Charge nurse and on-call physician have been notified.',
      });
    },
    onError: (error: Error) => {
      console.error(sanitizeForLog(`Escalation failed: ${error.message}`));
      toast.error('Escalation failed', {
        description: 'Please escalate manually and contact the charge nurse.',
      });
    },
  });
}

/**
 * Count of pending critical alerts — used for notification badges.
 */
export function useCriticalAlertCount() {
  const { data: alerts } = usePendingCriticalAlerts();
  const overdue = (alerts ?? []).filter(
    a => new Date(a.ack_deadline) < new Date()
  );
  return { total: alerts?.length ?? 0, overdue: overdue.length };
}
