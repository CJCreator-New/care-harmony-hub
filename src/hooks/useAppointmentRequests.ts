import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AppointmentRequest {
  id: string;
  hospital_id: string;
  patient_id: string;
  preferred_date: string;
  preferred_time: string | null;
  alternate_date: string | null;
  alternate_time: string | null;
  appointment_type: string;
  reason_for_visit: string | null;
  doctor_id: string | null;
  status: string;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_appointment_id: string | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
  doctor?: {
    first_name: string;
    last_name: string;
  } | null;
}

export interface CreateAppointmentRequest {
  preferred_date: string;
  preferred_time?: string;
  alternate_date?: string;
  alternate_time?: string;
  appointment_type: string;
  reason_for_visit?: string;
  doctor_id?: string;
}

// Hook for patients to view their appointment requests
export function usePatientAppointmentRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-appointment-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user context');

      // First get patient record
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, hospital_id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      if (!patient) return [];

      const { data, error } = await supabase
        .from('appointment_requests')
        .select(`
          *,
          doctor:profiles!appointment_requests_doctor_id_fkey(first_name, last_name)
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AppointmentRequest[];
    },
    enabled: !!user?.id,
  });
}

// Hook for patients to create appointment requests
export function useCreateAppointmentRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateAppointmentRequest) => {
      if (!user?.id) throw new Error('No user context');

      // Get patient record
      const { data: patient, error: patientError } = await supabase
        .from('patients')
        .select('id, hospital_id')
        .eq('user_id', user.id)
        .single();

      if (patientError) throw patientError;
      if (!patient) throw new Error('Patient record not found');

      const { data, error } = await supabase
        .from('appointment_requests')
        .insert({
          hospital_id: patient.hospital_id,
          patient_id: patient.id,
          preferred_date: request.preferred_date,
          preferred_time: request.preferred_time || null,
          alternate_date: request.alternate_date || null,
          alternate_time: request.alternate_time || null,
          appointment_type: request.appointment_type,
          reason_for_visit: request.reason_for_visit || null,
          doctor_id: request.doctor_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-appointment-requests'] });
      toast.success('Appointment request submitted successfully');
    },
    onError: (error) => {
      toast.error('Failed to submit appointment request');
      console.error('Error creating appointment request:', error);
    },
  });
}

// Hook for staff to view appointment requests
export function useStaffAppointmentRequests() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['staff-appointment-requests', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) throw new Error('No hospital context');

      const { data, error } = await supabase
        .from('appointment_requests')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn),
          doctor:profiles!appointment_requests_doctor_id_fkey(first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AppointmentRequest[];
    },
    enabled: !!hospital?.id,
  });
}

// Hook for staff to approve/reject appointment requests
export function useUpdateAppointmentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes,
      reviewed_by 
    }: { 
      id: string; 
      status: 'approved' | 'rejected' | 'scheduled'; 
      notes?: string;
      reviewed_by: string;
    }) => {
      const { data, error } = await supabase
        .from('appointment_requests')
        .update({
          status,
          notes: notes || null,
          reviewed_by,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['patient-appointment-requests'] });
      toast.success('Appointment request updated');
    },
    onError: (error) => {
      toast.error('Failed to update appointment request');
      console.error('Error updating appointment request:', error);
    },
  });
}
