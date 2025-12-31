import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PatientAppointment {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  appointment_type: string;
  status: string;
  reason_for_visit: string | null;
  notes: string | null;
  doctor: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface PatientPrescription {
  id: string;
  status: string;
  created_at: string;
  notes: string | null;
  prescriber: {
    first_name: string;
    last_name: string;
  } | null;
  items: {
    id: string;
    medication_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string | null;
  }[];
}

export interface PatientLabResult {
  id: string;
  test_name: string;
  test_category: string | null;
  status: string;
  ordered_at: string;
  completed_at: string | null;
  results: Record<string, unknown> | null;
  result_notes: string | null;
  normal_range: string | null;
}

export interface PatientVitals {
  id: string;
  recorded_at: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
}

export function usePatientProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user context');

      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function usePatientAppointments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-appointments', user?.id],
    queryFn: async (): Promise<PatientAppointment[]> => {
      if (!user?.id) throw new Error('No user context');

      // First get the patient record for this user
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      if (!patient) return [];

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          appointment_type,
          status,
          reason_for_visit,
          notes,
          doctor:profiles!appointments_doctor_id_fkey(first_name, last_name)
        `)
        .eq('patient_id', patient.id)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (error) throw error;
      return (data || []) as PatientAppointment[];
    },
    enabled: !!user?.id,
  });
}

export function usePatientPrescriptions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-prescriptions', user?.id],
    queryFn: async (): Promise<PatientPrescription[]> => {
      if (!user?.id) throw new Error('No user context');

      // First get the patient record for this user
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      if (!patient) return [];

      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          status,
          created_at,
          notes,
          prescriber:profiles!prescriptions_prescribed_by_fkey(first_name, last_name),
          items:prescription_items(
            id,
            medication_name,
            dosage,
            frequency,
            duration,
            instructions
          )
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PatientPrescription[];
    },
    enabled: !!user?.id,
  });
}

export function usePatientLabResults() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-lab-results', user?.id],
    queryFn: async (): Promise<PatientLabResult[]> => {
      if (!user?.id) throw new Error('No user context');

      // First get the patient record for this user
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      if (!patient) return [];

      const { data, error } = await supabase
        .from('lab_orders')
        .select(`
          id,
          test_name,
          test_category,
          status,
          ordered_at,
          completed_at,
          results,
          result_notes,
          normal_range
        `)
        .eq('patient_id', patient.id)
        .order('ordered_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PatientLabResult[];
    },
    enabled: !!user?.id,
  });
}

export function usePatientVitals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-vitals', user?.id],
    queryFn: async (): Promise<PatientVitals[]> => {
      if (!user?.id) throw new Error('No user context');

      // First get the patient record for this user
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      if (!patient) return [];

      const { data, error } = await supabase
        .from('vital_signs')
        .select(`
          id,
          recorded_at,
          blood_pressure_systolic,
          blood_pressure_diastolic,
          heart_rate,
          temperature,
          respiratory_rate,
          oxygen_saturation,
          weight,
          height
        `)
        .eq('patient_id', patient.id)
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as PatientVitals[];
    },
    enabled: !!user?.id,
  });
}
