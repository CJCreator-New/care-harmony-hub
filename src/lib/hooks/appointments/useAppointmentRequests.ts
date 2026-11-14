import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sanitizeLogMessage } from '@/utils/sanitize';
import { useActivityLog } from '@/hooks/useActivityLog';
import { resolveBookingModeration } from '@/lib/appointments/bookingModeration';

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

  // Get patient ID and identity tier from profile
  const getPatientId = async () => {
    if (!profile?.user_id) throw new Error('User not authenticated');

    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, hospital_id, phone, is_identity_verified')
      .eq('user_id', profile.user_id)
      .single();

    if (error) throw error;
    return patient;
  };

  /** ADR-0015: surface a possible duplicate chart by matching phone within the hospital. */
  const findPossibleDuplicate = async (
    patientId: string,
    hospitalId: string,
    phone: string | null
  ): Promise<string | null> => {
    if (!phone) return null;

    const { data } = await supabase
      .from('patients')
      .select('id')
      .eq('hospital_id', hospitalId)
      .eq('phone', phone)
      .neq('id', patientId)
      .limit(1)
      .maybeSingle();

    return data?.id ?? null;
  };

  // Fetch appointment requests for the current patient
  const {
    data: appointmentRequests,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['appointment-requests', profile?.user_id],
    queryFn: async () => {
      const patient = await getPatientId();

      const { data, error } = await supabase
        .from('appointment_requests')
        .select(
          `
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
        `
        )
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
      const moderation = resolveBookingModeration(patient.is_identity_verified);
      const matchedPatientId = await findPossibleDuplicate(
        patient.id,
        patient.hospital_id,
        patient.phone
      );

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
          // ADR-0015: unverified portal patients cannot self-confirm a slot.
          status: moderation.status,
          verification_tier: moderation.verificationTier,
          matched_patient_id: matchedPatientId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-appointment-requests'] });
      toast({
        title: 'Appointment Requested',
        description:
          data?.status === 'pending_confirmation'
            ? 'Your request is received and pending front-desk review. Please bring official ID to your appointment.'
            : 'Your appointment request has been submitted successfully. You will receive a confirmation shortly.',
      });
    },
    onError: (error) => {
      console.error(
        'Error creating appointment request:',
        sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error')
      );
      toast({
        title: 'Error',
        description: 'Failed to submit appointment request. Please try again.',
        variant: 'destructive',
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
          updated_at: new Date().toISOString(),
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
        title: 'Request Cancelled',
        description: 'Your appointment request has been cancelled.',
      });
    },
    onError: (error) => {
      console.error(
        'Error cancelling appointment request:',
        sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error')
      );
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment request. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    appointmentRequests,
    isLoading,
    error,
    refetch,
    createAppointmentRequest: createAppointmentRequest.mutate,
    createAppointmentRequestAsync: createAppointmentRequest.mutateAsync,
    isCreating: createAppointmentRequest.isPending,
    cancelAppointmentRequest: cancelAppointmentRequest.mutate,
    isCancelling: cancelAppointmentRequest.isPending,
  };
}

// Alias for backward compatibility
export const useCreateAppointmentRequest = () => {
  const { createAppointmentRequest, createAppointmentRequestAsync, isCreating } =
    useAppointmentRequests();
  return {
    mutate: createAppointmentRequest,
    mutateAsync: createAppointmentRequestAsync,
    isPending: isCreating,
  };
};

// Alias for patient appointment requests
export const usePatientAppointmentRequests = useAppointmentRequests;

// Hook for updating appointment requests (for receptionists/admins)
export function useUpdateAppointmentRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();

  return useMutation({
    // `reason` is audit-only (required by the UI when rejecting); the request row has no reason column.
    mutationFn: async ({
      id,
      status,
      reviewed_by,
    }: {
      id: string;
      status: string;
      reviewed_by: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('appointment_requests')
        .update({
          status,
          reviewed_by,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-appointment-requests'] });
      if (data.status === 'rejected') {
        void logActivity({
          actionType: 'appointment_update',
          entityType: 'appointment_request',
          entityId: data.id,
          details: { status: 'rejected', reason: variables.reason?.trim() || null },
        });
      }
      const statusMessage: Record<string, string> = {
        approved: 'Appointment request confirmed. The slot is allocated.',
        rejected: 'Appointment request rejected.',
        reschedule_requested: 'Reschedule requested. The patient will be contacted.',
      };
      toast({
        title: `Request ${data.status.replace('_', ' ')}`,
        description: statusMessage[data.status] ?? `Appointment request is ${data.status}.`,
      });
    },
    onError: (error) => {
      console.error(
        'Error updating appointment request:',
        sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error')
      );
      toast({
        title: 'Error',
        description: 'Failed to update appointment request. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

// Auto-approval hook for smart appointment requests
export function useAutoApproveAppointmentRequests() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestIds: string[]) => {
      if (!profile?.id) throw new Error('User not authenticated');

      // Get requests to check eligibility
      const { data: requests, error: fetchError } = await supabase
        .from('appointment_requests')
        .select(
          `
          id,
          appointment_type,
          patient:patients!appointment_requests_patient_id_fkey (
            id,
            insurance_status,
            last_visit,
            created_at
          )
        `
        )
        .in('id', requestIds)
        .eq('status', 'pending');

      if (fetchError) throw fetchError;

      const approvedRequests: string[] = [];
      const rejectedRequests: string[] = [];

      // Apply auto-approval rules
      for (const request of requests || []) {
        const patient = request.patient as any;
        const isEligible =
          // Established patient (visited before)
          patient?.last_visit &&
          // Has active insurance
          patient?.insurance_status === 'active' &&
          // Standard appointment types
          ['follow_up', 'check_up', 'consultation', 'routine'].includes(request.appointment_type) &&
          // Patient created more than 30 days ago (established)
          patient?.created_at &&
          new Date(patient.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        if (isEligible) {
          approvedRequests.push(request.id);
        } else {
          rejectedRequests.push(request.id);
        }
      }

      // Update approved requests
      if (approvedRequests.length > 0) {
        const { error: approveError } = await supabase
          .from('appointment_requests')
          .update({
            status: 'approved',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', approvedRequests);

        if (approveError) throw approveError;
      }

      // Update rejected requests (mark as needs_review for manual handling)
      if (rejectedRequests.length > 0) {
        const { error: rejectError } = await supabase
          .from('appointment_requests')
          .update({
            status: 'needs_review',
            reviewed_by: profile.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .in('id', rejectedRequests);

        if (rejectError) throw rejectError;
      }

      return { approved: approvedRequests.length, rejected: rejectedRequests.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['appointment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-appointment-requests'] });
      toast({
        title: 'Auto-Approval Complete',
        description: `Approved ${result.approved} requests, ${result.rejected} need manual review.`,
      });
    },
    onError: (error) => {
      console.error(
        'Error auto-approving requests:',
        sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error')
      );
      toast({
        title: 'Auto-Approval Failed',
        description: 'Failed to process appointment requests. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
