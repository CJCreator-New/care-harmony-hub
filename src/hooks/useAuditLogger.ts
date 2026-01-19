import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAuditLogger() {
  const { user, hospital } = useAuth();

  const logActivity = async (
    action: string,
    entityType: string,
    entityId: string,
    details?: Record<string, any>
  ) => {
    if (!user || !hospital) return;

    try {
      await supabase.from('audit_logs').insert({
        hospital_id: hospital.id,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details || {},
        ip_address: null, // Will be populated by RLS policy
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log audit activity:', error);
    }
  };

  // Auto-log page views
  useEffect(() => {
    if (user && hospital) {
      logActivity('page_view', 'navigation', window.location.pathname, {
        url: window.location.href,
        referrer: document.referrer
      });
    }
  }, [user, hospital]); // Removed window.location.pathname as it's not reactive

  return { logActivity };
}