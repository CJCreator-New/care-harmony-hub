import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface RefillRequest {
  id: string;
  prescription_id: string;
  patient_id: string;
  hospital_id: string;
  reason: string | null;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRefillRequestData {
  prescription_id: string;
  reason?: string;
  is_urgent?: boolean;
}

export function useRefillRequests() {
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

  // Fetch refill requests for the current patient
  const {
    data: refillRequests,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['refill-requests', profile?.user_id],
    queryFn: async () => {
      const patient = await getPatientId();
      
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .select(`
          *,
          prescription:prescriptions!prescription_refill_requests_prescription_id_fkey(
            id,
            status,
            prescription_items(
              medication_name,
              dosage,
              frequency,
              quantity
            )
          ),
          reviewed_by_profile:profiles!prescription_refill_requests_reviewed_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RefillRequest[];
    },
    enabled: !!profile?.user_id,
  });

  // Create new refill request
  const createRefillRequest = useMutation({
    mutationFn: async (requestData: CreateRefillRequestData) => {
      const patient = await getPatientId();
      
      // First, verify the prescription belongs to the patient
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .select('id, patient_id, hospital_id')
        .eq('id', requestData.prescription_id)
        .eq('patient_id', patient.id)
        .single();

      if (prescriptionError) throw new Error('Prescription not found or access denied');

      // Create the refill request
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .insert({
          prescription_id: requestData.prescription_id,
          patient_id: patient.id,
          hospital_id: patient.hospital_id,
          reason: requestData.reason || null,
          status: 'pending',
          requested_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log the refill request for audit purposes
      await supabase.from('activity_logs').insert({
        user_id: profile?.user_id,
        hospital_id: patient.hospital_id,
        action_type: 'prescription_refill_requested',
        entity_type: 'prescription_refill_request',
        entity_id: data.id,
        details: {
          prescription_id: requestData.prescription_id,
          is_urgent: requestData.is_urgent || false,
          reason: requestData.reason
        }
      });

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['refill-requests'] });
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      
      toast({
        title: "Refill Requested",
        description: "Your prescription refill request has been submitted for review. You will be notified when it's processed.",
      });
    },
    onError: (error) => {
      console.error('Error creating refill request:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Error",
        description: "Failed to submit refill request. Please try again.",
        variant: "destructive"
      });
    },
  });

  // Cancel refill request
  const cancelRefillRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('prescription_refill_requests')
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
      queryClient.invalidateQueries({ queryKey: ['refill-requests'] });
      toast({
        title: "Request Cancelled",
        description: "Your refill request has been cancelled.",
      });
    },
    onError: (error) => {
      console.error('Error cancelling refill request:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Error",
        description: "Failed to cancel refill request. Please try again.",
        variant: "destructive"
      });
    },
  });

  return {
    refillRequests,
    isLoading,
    error,
    refetch,
    createRefillRequest: createRefillRequest.mutate,
    isCreating: createRefillRequest.isPending,
    cancelRefillRequest: cancelRefillRequest.mutate,
    isCancelling: cancelRefillRequest.isPending,
  };
}

// Hook for hospital staff to view all refill requests
export function useHospitalRefillRequests() {
  const { profile } = useAuth();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['hospital-refill-requests', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) throw new Error('Hospital not found');
      
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .select(`
          *,
          prescription:prescriptions!prescription_refill_requests_prescription_id_fkey(
            id,
            status,
            prescription_items(
              medication_name,
              dosage,
              frequency,
              quantity
            )
          ),
          patient:patients!prescription_refill_requests_patient_id_fkey(
            id,
            first_name,
            last_name,
            mrn,
            phone,
            email
          ),
          reviewed_by_profile:profiles!prescription_refill_requests_reviewed_by_fkey(
            first_name,
            last_name
          )
        `)
        .eq('hospital_id', profile.hospital_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as RefillRequest[];
    },
    enabled: !!profile?.hospital_id,
  });
}

// Hook for updating refill requests (for pharmacists/staff)
export function useUpdateRefillRequest() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .update({ 
          status,
          notes: notes || null,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log the update for audit purposes
      if (profile?.hospital_id) {
        await supabase.from('activity_logs').insert({
          user_id: profile.user_id,
          hospital_id: profile.hospital_id,
          action_type: 'prescription_refill_updated',
          entity_type: 'prescription_refill_request',
          entity_id: id,
          details: {
            status,
            notes,
            reviewed_by: profile.id
          }
        });
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hospital-refill-requests'] });
      queryClient.invalidateQueries({ queryKey: ['refill-requests'] });
      toast({
        title: "Request Updated",
        description: `Refill request has been ${data.status}.`,
      });
    },
    onError: (error) => {
      console.error('Error updating refill request:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast({
        title: "Error",
        description: "Failed to update refill request. Please try again.",
        variant: "destructive"
      });
    },
  });
}

// Alias for backward compatibility
export const useCreateRefillRequest = () => {
  const { createRefillRequest, isCreating } = useRefillRequests();
  return {
    mutate: createRefillRequest,
    isPending: isCreating,
  };
};

// Alias for patient refill requests
export const usePatientRefillRequests = useRefillRequests;
