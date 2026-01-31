import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ACTIVITY_LOG_COLUMNS } from '@/lib/queryColumns';
import { sanitizeForLog } from '@/utils/sanitize';

export type ActionType = 
  | 'login'
  | 'logout'
  | 'patient_view'
  | 'patient_record_view'
  | 'patient_create'
  | 'patient_update'
  | 'appointment_create'
  | 'appointment_update'
  | 'appointment_cancel'
  | 'consultation_start'
  | 'consultation_complete'
  | 'prescription_create'
  | 'prescription_dispense'
  | 'lab_order_create'
  | 'lab_result_enter'
  | 'invoice_create'
  | 'payment_record'
  | 'staff_invite'
  | 'staff_deactivate'
  | 'settings_update';

export interface ActivityLog {
  id: string;
  user_id: string;
  hospital_id: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface LogActivityParams {
  actionType: ActionType;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

export function useActivityLog() {
  const { user, hospital } = useAuth();
  const queryClient = useQueryClient();

  const logActivity = useCallback(async ({
    actionType,
    entityType,
    entityId,
    details = {},
  }: LogActivityParams) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          hospital_id: hospital?.id || null,
          action_type: actionType,
          entity_type: entityType || null,
          entity_id: entityId || null,
          details,
          user_agent: navigator.userAgent,
        });

      if (error) {
        console.error('Error logging activity:', sanitizeForLog(String(error)));
      }
    } catch (err) {
      console.error('Failed to log activity:', sanitizeForLog(String(err)));
    }
  }, [user, hospital]);

  return { logActivity };
}

export function useActivityLogs(filters?: {
  actionType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['activity-logs', hospital?.id, filters],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('activity_logs')
        .select(`
          ${ACTIVITY_LOG_COLUMNS.list},
          profiles:user_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });

      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!hospital?.id,
  });
}
