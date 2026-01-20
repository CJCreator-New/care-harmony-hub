import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface DoctorStats {
  todaysPatients: number;
  completedConsultations: number;
  pendingLabs: number;
  avgConsultationDuration: number;
  pendingLabReviews: number;
  pendingPrescriptions: number;
  pendingFollowUps: number;
}

export function useDoctorStats() {
  const { profile, hospital } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['doctor-stats', profile?.id, today],
    queryFn: async (): Promise<DoctorStats> => {
      if (!profile?.id || !hospital?.id) {
        return {
          todaysPatients: 0,
          completedConsultations: 0,
          pendingLabs: 0,
          avgConsultationDuration: 0,
          pendingLabReviews: 0,
          pendingPrescriptions: 0,
          pendingFollowUps: 0,
        };
      }

      // Single optimized query using RPC function
      const { data, error } = await supabase.rpc('get_doctor_stats', {
        p_doctor_id: profile.id,
        p_hospital_id: hospital.id,
        p_date: today
      });

      if (error) throw error;
      return data || {
        todaysPatients: 0,
        completedConsultations: 0,
        pendingLabs: 0,
        avgConsultationDuration: 0,
        pendingLabReviews: 0,
        pendingPrescriptions: 0,
        pendingFollowUps: 0,
      };
    },
    enabled: !!profile?.id && !!hospital?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useDoctorQueue() {
  const { profile, hospital } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['doctor-queue', profile?.id, today],
    queryFn: async () => {
      if (!profile?.id || !hospital?.id) return [];

      const { data, error } = await supabase
        .from('patient_queue')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, date_of_birth, gender),
          appointment:appointments(id, appointment_type, reason_for_visit, scheduled_time)
        `)
        .eq('hospital_id', hospital.id)
        .eq('assigned_to', profile.id)
        .in('status', ['waiting', 'called', 'in_progress'])
        .order('priority', { ascending: false })
        .order('check_in_time', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id && !!hospital?.id,
    refetchInterval: 15000,
  });
}
