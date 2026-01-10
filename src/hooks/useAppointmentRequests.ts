import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface AppointmentRequest {
  id: string;
  appointment_type: string;
  preferred_date: string;
  preferred_time: string | null;
  alternate_date: string | null;
  alternate_time: string | null;
  reason_for_visit: string | null;
  status: string;
  notes: string | null;
  doctor_id: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_appointment_id: string | null;
}

export interface CreateAppointmentRequestData {
  appointment_type: string;
  preferred_date: string;
  preferred_time?: string;
  alternate_date?: string;
  alternate_time?: string;
  reason_for_visit?: string;
  doctor_id?: string;
}

export function useAppointmentRequests() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get patient ID from profile
  const getPatientId = async () => {
    if (!profile?.user_id) throw new Error('User not authenticated');
    
    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, hospital_id')
      .eq('user_id', profile.user_id)
      .single();
    
    if (error) throw error;
    return patient;
  };

  // Fetch appointment requests for the current patient
  const {
    data: appointmentRequests,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['appointment-requests', profile?.user_id],
    queryFn: async () => {
      const patient = await getPatientId();
      
      const { data, error } = await supabase
        .from('appointment_requests')
        .select(`
          *,
          doctor:profiles!appointment_requests_doctor_id_fkey(
            id,
            first_name,
            last_name,
            email
          ),
          reviewed_by_profile:profiles!appointment_requests_reviewed_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AppointmentRequest[];
    },
    enabled: !!profile?.user_id,
  });

  // Create new appointment request
  const createAppointmentRequest = useMutation({
    mutationFn: async (requestData: CreateAppointmentRequestData) => {
      const patient = await getPatientId();
      
      const { data, error } = await supabase
        .from('appointment_requests')
        .insert({
          patient_id: patient.id,
          hospital_id: patient.hospital_id,
          appointment_type: requestData.appointment_type,
          preferred_date: requestData.preferred_date,
          preferred_time: requestData.preferred_time || null,
          alternate_date: requestData.alternate_date || null,
          alternate_time: requestData.alternate_time || null,
          reason_for_visit: requestData.reason_for_visit || null,
          doctor_id: requestData.doctor_id || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      toast({
        title: "Appointment Requested",
        description: "Your appointment request has been submitted successfully. You will receive a confirmation shortly.",
      });
    },
    onError: (error) => {
      console.error('Error creating appointment request:', error);
      toast({
        title: "Error",
        description: "Failed to submit appointment request. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Cancel appointment request
  const cancelAppointmentRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('appointment_requests')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      toast({
        title: "Request Cancelled",
        description: "Your appointment request has been cancelled.",
      });
    },
    onError: (error) => {
      console.error('Error cancelling appointment request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment request. Please try again.",
        variant: "destructive"
      });
    },
  });

  return {
    appointmentRequests,
    isLoading,
    error,
    refetch,
    createAppointmentRequest: createAppointmentRequest.mutate,
    isCreating: createAppointmentRequest.isPending,
    cancelAppointmentRequest: cancelAppointmentRequest.mutate,
    isCancelling: cancelAppointmentRequest.isPending,
  };
}

// Alias for backward compatibility
export const useCreateAppointmentRequest = () => {
  const { createAppointmentRequest, isCreating } = useAppointmentRequests();
  return {
    mutate: createAppointmentRequest,
    isPending: isCreating,
  };
};

// Alias for patient appointment requests
export const usePatientAppointmentRequests = useAppointmentRequests;

// Hook for updating appointment requests (for receptionists/admins)
export function useUpdateAppointmentRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, reviewed_by }: { id: string; status: string; reviewed_by: string }) => {
      const { data, error } = await supabase
        .from('appointment_requests')
        .update({ 
          status,
          reviewed_by,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-appointment-requests'] });
      toast({
        title: data.status === 'approved' ? "Request Approved" : "Request Rejected",
        description: `Appointment request has been ${data.status}.`,
      });
    },
    onError: (error) => {
      console.error('Error updating appointment request:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment request. Please try again.",
        variant: "destructive"
      });
    },
  });
}