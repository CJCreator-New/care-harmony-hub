import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";
import { sanitizeForLog } from "@/utils/sanitize";

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

interface AuditParams {
  actionType: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  severity?: AuditSeverity;
  oldValues?: any;
  newValues?: any;
}

/**
 * Hook for performing HIPAA-compliant audit logging.
 * Usage: 
 *   const { logActivity } = useAudit();
 *   logActivity({ actionType: 'VIEW_PATIENT', entityType: 'patients', entityId: patientId });
 */
export function useAudit() {
  const { session, profile } = useAuth();

  const logActivity = useCallback(async (params: AuditParams) => {
    if (!session?.user?.id || !profile?.hospital_id) return;

    try {
      const { error } = await supabase.from('activity_logs').insert({
        hospital_id: profile.hospital_id,
        user_id: session.user.id,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        old_values: params.oldValues,
        new_values: params.newValues,
        details: {
          ...params.details,
          pathname: window.location.pathname,
        },
        severity: params.severity || 'info',
        ip_address: '0.0.0.0', // Handled by edge function in production
        user_agent: navigator.userAgent,
      });

      if (error) {
        // Audit failure must never be silent — log sanitized message and persist to error tracking
        console.error('Audit Logging Failed:', sanitizeForLog(String(error)));
        void supabase.from('activity_logs').insert({
          hospital_id: profile.hospital_id,
          user_id: session.user.id,
          action_type: 'audit_log_write_failure',
          entity_type: 'system',
          details: { original_action: params.actionType, error_message: 'audit_log_write_failed' },
          severity: 'critical' as AuditSeverity,
        }).then(() => {});
      }
    } catch (err) {
      console.error('Failed to log activity:', sanitizeForLog(String(err)));
    }
  }, [session?.user?.id, profile?.hospital_id]);

  return { logActivity };
}
