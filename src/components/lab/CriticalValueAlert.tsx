import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function CriticalValueAlert() {
  const { hospital, profile } = useAuth();

  useEffect(() => {
    if (!hospital?.id || !profile?.user_id) return;

    const channel = supabase
      .channel('critical-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'critical_value_alerts',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        (payload) => {
          const alert = payload.new as any;
          
          toast.error(
            `🚨 CRITICAL VALUE: ${alert.test_name} = ${alert.critical_value}`,
            {
              description: 'Patient requires immediate attention',
              duration: 10000,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [hospital?.id, profile?.user_id]);

  return null;
}
