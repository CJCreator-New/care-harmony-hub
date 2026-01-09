import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuditEvent {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export function useAuditLogger() {
  const { user } = useAuth();

  const logEvent = useMutation({
    mutationFn: async (event: AuditEvent) => {
      if (!user?.id) return;

      const { data, error } = await supabase.functions.invoke('audit-logger', {
        body: {
          action: 'log_event',
          events: {
            user_id: user.id,
            session_id: sessionStorage.getItem('session_id') || crypto.randomUUID(),
            ...event,
          }
        }
      });

      if (error) throw error;
      return data;
    },
  });

  const getAuditTrail = useQuery({
    queryKey: ['audit-trail'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('audit-logger', {
        body: { action: 'get_audit_trail', events: { limit: 100 } }
      });
      if (error) throw error;
      return data.audit_trail as AuditLog[];
    },
    enabled: !!user,
  });

  // Helper functions for common audit events
  const logPatientAccess = (patientId: string, action: 'view' | 'edit' | 'create') => {
    logEvent.mutate({
      action: `patient_${action}`,
      resource_type: 'patients',
      resource_id: patientId,
      details: { timestamp: new Date().toISOString() }
    });
  };

  const logPrescriptionAction = (prescriptionId: string, action: 'create' | 'dispense' | 'modify') => {
    logEvent.mutate({
      action: `prescription_${action}`,
      resource_type: 'prescriptions',
      resource_id: prescriptionId,
      details: { timestamp: new Date().toISOString() }
    });
  };

  const logDataExport = (resourceType: string, recordCount: number) => {
    logEvent.mutate({
      action: 'data_export',
      resource_type: resourceType,
      details: { 
        record_count: recordCount,
        export_timestamp: new Date().toISOString()
      }
    });
  };

  const logLogin = () => {
    logEvent.mutate({
      action: 'user_login',
      resource_type: 'authentication',
      details: { login_timestamp: new Date().toISOString() }
    });
  };

  const logLogout = () => {
    logEvent.mutate({
      action: 'user_logout',
      resource_type: 'authentication',
      details: { logout_timestamp: new Date().toISOString() }
    });
  };

  return {
    logEvent: logEvent.mutate,
    auditTrail: getAuditTrail.data,
    isLoading: getAuditTrail.isLoading,
    
    // Helper methods
    logPatientAccess,
    logPrescriptionAction,
    logDataExport,
    logLogin,
    logLogout,
  };
}