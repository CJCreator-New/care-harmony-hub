import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useRealtimeUpdates() {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!hospital?.id) return;

    console.log('Initializing real-time subscriptions for hospital:', hospital.id);

    // 1. Patient Queue Channel
    const queueChannel = supabase
      .channel('public:patient_queue')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'patient_queue',
          filter: `hospital_id=eq.${hospital.id}`
        },
        (payload) => {
          console.log('Queue change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['queue'] });
          queryClient.invalidateQueries({ queryKey: ['patient-stats'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('New patient added to queue');
          }
        }
      )
      .subscribe();

    // 2. Lab Orders Channel
    const labChannel = supabase
      .channel('public:lab_orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lab_orders',
          filter: `hospital_id=eq.${hospital.id}`
        },
        (payload) => {
          console.log('Lab order change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['lab-orders'] });
          
          if (payload.eventType === 'UPDATE') {
            const newRecord = payload.new as any;
            if (newRecord.status === 'completed') {
              toast.success(`Lab results ready for patient: ${newRecord.patient_id}`);
            }
          }
        }
      )
      .subscribe();

    // 3. Prescriptions Channel
    const prescriptionChannel = supabase
      .channel('public:prescriptions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prescriptions',
          filter: `hospital_id=eq.${hospital.id}`
        },
        (payload) => {
          console.log('Prescription change detected:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
          queryClient.invalidateQueries({ queryKey: ['prescription-queue'] });
        }
      )
      .subscribe();

    // 4. Critical Alerts Channel
    const alertsChannel = supabase
      .channel('public:critical_value_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'critical_value_alerts',
          filter: `hospital_id=eq.${hospital.id}`
        },
        (payload) => {
          const alert = payload.new as any;
          toast.error(`CRITICAL ALERT: ${alert.message}`, {
            duration: 10000,
            id: alert.id
          });
          queryClient.invalidateQueries({ queryKey: ['critical-alerts'] });
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(queueChannel);
      supabase.removeChannel(labChannel);
      supabase.removeChannel(prescriptionChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [hospital?.id, queryClient]);
}
