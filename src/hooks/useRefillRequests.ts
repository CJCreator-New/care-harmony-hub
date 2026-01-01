import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RefillRequest {
  id: string;
  prescription_id: string;
  patient_id: string;
  hospital_id: string;
  status: 'pending' | 'approved' | 'denied' | 'fulfilled';
  reason: string | null;
  notes: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  prescription?: {
    id: string;
    status: string;
    items: Array<{
      medication_name: string;
      dosage: string;
      frequency: string;
    }>;
  };
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
  };
  reviewer?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function usePatientRefillRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-refill-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .select(`
          *,
          prescription:prescriptions(
            id,
            status,
            items:prescription_items(medication_name, dosage, frequency)
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      return data as RefillRequest[];
    },
    enabled: !!user?.id,
  });
}

export function useHospitalRefillRequests(status?: string) {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['hospital-refill-requests', hospital?.id, status],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('prescription_refill_requests')
        .select(`
          *,
          prescription:prescriptions(
            id,
            status,
            items:prescription_items(medication_name, dosage, frequency)
          ),
          patient:patients(id, first_name, last_name, mrn),
          reviewer:profiles!prescription_refill_requests_reviewed_by_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('requested_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RefillRequest[];
    },
    enabled: !!hospital?.id,
  });
}

export function useCreateRefillRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      prescriptionId,
      patientId,
      hospitalId,
      reason,
    }: {
      prescriptionId: string;
      patientId: string;
      hospitalId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .insert({
          prescription_id: prescriptionId,
          patient_id: patientId,
          hospital_id: hospitalId,
          reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-refill-requests'] });
      toast.success('Refill request submitted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit refill request: ${error.message}`);
    },
  });
}

export function useUpdateRefillRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      status,
      notes,
    }: {
      requestId: string;
      status: 'approved' | 'denied' | 'fulfilled';
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('prescription_refill_requests')
        .update({
          status,
          notes,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-refill-requests'] });
      queryClient.invalidateQueries({ queryKey: ['patient-refill-requests'] });
      toast.success('Refill request updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update request: ${error.message}`);
    },
  });
}
