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

      // Fetch today's appointments for this doctor
      const { data: todaysAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('doctor_id', profile.id)
        .eq('scheduled_date', today);

      // Fetch completed consultations today
      const { data: completedConsults } = await supabase
        .from('consultations')
        .select('id, started_at, completed_at')
        .eq('hospital_id', hospital.id)
        .eq('doctor_id', profile.id)
        .eq('status', 'completed')
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);

      // Calculate average consultation duration
      let avgDuration = 0;
      if (completedConsults && completedConsults.length > 0) {
        const durations = completedConsults
          .filter(c => c.started_at && c.completed_at)
          .map(c => {
            const start = new Date(c.started_at!).getTime();
            const end = new Date(c.completed_at!).getTime();
            return (end - start) / (1000 * 60); // minutes
          });
        if (durations.length > 0) {
          avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        }
      }

      // Fetch pending lab orders for this doctor's patients
      const { data: pendingLabs } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('ordered_by', profile.id)
        .in('status', ['pending', 'in_progress', 'collected']);

      // Fetch completed lab orders needing review
      const { data: labsToReview } = await supabase
        .from('lab_orders')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('ordered_by', profile.id)
        .eq('status', 'completed');

      // Fetch pending prescriptions (not yet dispensed)
      const { data: pendingRx } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('prescribed_by', profile.id)
        .is('dispensed_at', null);

      // Fetch consultations needing follow-up notes
      const { data: pendingFollowUps } = await supabase
        .from('consultations')
        .select('id')
        .eq('hospital_id', hospital.id)
        .eq('doctor_id', profile.id)
        .eq('status', 'completed')
        .not('follow_up_date', 'is', null)
        .is('follow_up_notes', null);

      return {
        todaysPatients: todaysAppointments?.length || 0,
        completedConsultations: completedConsults?.length || 0,
        pendingLabs: pendingLabs?.length || 0,
        avgConsultationDuration: avgDuration,
        pendingLabReviews: labsToReview?.length || 0,
        pendingPrescriptions: pendingRx?.length || 0,
        pendingFollowUps: pendingFollowUps?.length || 0,
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
