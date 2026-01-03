import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PatientReadyForDoctor {
  id: string;
  patient_id: string;
  queue_entry_id: string | null;
  appointment_id: string | null;
  created_at: string;
  completed_at: string | null;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    date_of_birth: string;
    gender: string;
    allergies: string[] | null;
  };
  queue_entry?: {
    id: string;
    queue_number: number;
    priority: string;
    check_in_time: string;
    department: string | null;
  };
}

/**
 * Hook to fetch patients who have completed nurse prep and are ready for consultation
 */
export function usePatientsReadyForDoctor() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['patients-ready-for-doctor', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const today = new Date().toISOString().split('T')[0];

      // Get checklists where ready_for_doctor is true
      const { data: checklists, error } = await supabase
        .from('patient_prep_checklists')
        .select(`
          id,
          patient_id,
          queue_entry_id,
          appointment_id,
          created_at,
          completed_at,
          patient:patients!inner(
            id,
            first_name,
            last_name,
            mrn,
            date_of_birth,
            gender,
            allergies
          )
        `)
        .eq('hospital_id', hospital.id)
        .eq('ready_for_doctor', true)
        .gte('created_at', `${today}T00:00:00`)
        .order('completed_at', { ascending: true });

      if (error) throw error;

      // Also get queue information for these patients
      const patientIds = checklists?.map(c => c.patient_id) || [];
      
      if (patientIds.length === 0) return [];

      const { data: queueEntries } = await supabase
        .from('patient_queue')
        .select('id, patient_id, queue_number, priority, check_in_time, department, status')
        .eq('hospital_id', hospital.id)
        .in('patient_id', patientIds)
        .in('status', ['waiting', 'called'])
        .gte('created_at', `${today}T00:00:00`);

      // Merge queue data with checklists
      const queueMap = new Map(queueEntries?.map(q => [q.patient_id, q]) || []);

      return checklists?.map(checklist => ({
        ...checklist,
        queue_entry: queueMap.get(checklist.patient_id) || null,
      })) as PatientReadyForDoctor[];
    },
    enabled: !!hospital?.id,
    refetchInterval: 15000, // Refresh every 15 seconds
  });
}

/**
 * Get count of patients ready for doctor
 */
export function usePatientsReadyCount() {
  const { data: patients } = usePatientsReadyForDoctor();
  return patients?.length || 0;
}
