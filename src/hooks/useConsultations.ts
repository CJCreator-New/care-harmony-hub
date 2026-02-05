import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clinicalApiClient } from '@/services/clinicalApiClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect, useCallback, useRef } from 'react';
import { sanitizeForLog } from '@/utils/sanitize';
import { executeWithRateLimitBackoff } from '@/utils/rateLimitBackoff';
import { supabase } from '@/integrations/supabase/client';
import { CONSULTATION_COLUMNS, PATIENT_COLUMNS } from '@/lib/queryColumns';
import { transformConsultationFromService, transformConsultationsFromService } from '@/utils/consultationTransformers';

export type ConsultationStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

export interface Consultation {
  id: string;
  hospital_id: string;
  appointment_id: string | null;
  patient_id: string;
  doctor_id: string;
  nurse_id: string | null;
  status: ConsultationStatus;
  current_step: number;
  // Step 1: Patient Overview
  vitals: Record<string, any>;
  chief_complaint: string | null;
  history_of_present_illness: string | null;
  // Step 2: Clinical Assessment
  physical_examination: Record<string, any>;
  symptoms: string[];
  provisional_diagnosis: string[];
  // Step 3: Treatment Planning
  final_diagnosis: string[];
  treatment_plan: string | null;
  prescriptions: any[];
  lab_orders: any[];
  referrals: any[];
  // Step 4: Final Review
  clinical_notes: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  // Step 5: Handoff
  handoff_notes: string | null;
  pharmacy_notified: boolean;
  lab_notified: boolean;
  billing_notified: boolean;
  // Metadata
  started_at: string | null;
  completed_at: string | null;
  auto_save_data: Record<string, any>;
  last_auto_save: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string;
    date_of_birth: string;
    gender: string;
    allergies: string[];
    chronic_conditions: string[];
  };
  doctor?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ConsultationInsert {
  patient_id: string;
  appointment_id?: string | null;
  nurse_id?: string | null;
}

export const CONSULTATION_STEPS = [
  { step: 1, status: 'scheduled' as ConsultationStatus, label: 'Patient Overview', description: 'Demographics, vitals, history' },
  { step: 2, status: 'in-progress' as ConsultationStatus, label: 'Clinical Assessment', description: 'Symptoms, physical exam' },
  { step: 3, status: 'in-progress' as ConsultationStatus, label: 'Treatment Planning', description: 'Diagnosis, prescriptions, labs' },
  { step: 4, status: 'in-progress' as ConsultationStatus, label: 'Final Review', description: 'Summary, billing' },
  { step: 5, status: 'completed' as ConsultationStatus, label: 'Handoff', description: 'Notify pharmacy/lab' },
];

const withConsultationRateLimit = async <T,>(fn: () => Promise<T>) =>
  executeWithRateLimitBackoff(fn, {
    key: 'consultations',
    onRetry: (attempt, delayMs) => {
      toast.info(`Rate limited. Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt}/4).`);
    },
  });

export function useConsultations() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['consultations', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) {
        console.log('No hospital ID available');
        return [];
      }

      console.log('Fetching consultations for hospital:', hospital.id);

      return withConsultationRateLimit(async () => {
        try {
          const result = await clinicalApiClient.getConsultations({
            limit: 100,
            offset: 0,
          });

          // Transform the data to match the expected format
          const transformedData = transformConsultationsFromService(result.data);

          console.log('Consultations fetched:', transformedData.length);
          return transformedData;
        } catch (error) {
          console.error('Error fetching consultations from clinical service:', sanitizeForLog(String(error)));
          throw error;
        }
      });
    },
    enabled: !!hospital?.id,
  });
}

export function useConsultation(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      if (!consultationId) return null;

      return withConsultationRateLimit(async () => {
        try {
          const consultation = await clinicalApiClient.getConsultation(consultationId);

          // Transform to match expected format
          return transformConsultationFromService(consultation);
        } catch (error) {
          console.error('Error fetching consultation from clinical service:', sanitizeForLog(String(error)));
          throw error;
        }
      });
    },
    enabled: !!consultationId,
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (data: ConsultationInsert) => {
      if (!hospital?.id || !profile?.id) throw new Error('Not authenticated');

      return withConsultationRateLimit(async () => {
        try {
          // Check for existing consultation for this patient (any status)
          // Note: This logic needs to be implemented in the clinical service
          // For now, we'll create a new consultation
          const consultationData = {
            patient_id: data.patient_id,
            provider_id: profile.id,
            appointment_id: data.appointment_id,
            hospital_id: hospital.id,
            consultation_type: 'initial' as const,
            status: 'scheduled' as const,
            chief_complaint: '', // Will be filled in the workflow
          };

          const consultation = await clinicalApiClient.createConsultation(consultationData);

          // Transform to match expected format
          return transformConsultationFromService(consultation);
        } catch (error) {
          console.error('Error creating consultation via clinical service:', sanitizeForLog(String(error)));
          throw error;
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      toast.success('Consultation started');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start consultation: ${error.message}`);
    },
  });
}

export function useGetOrCreateConsultation() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();

  return useMutation({
    mutationFn: async (patientId: string) => {
      if (!hospital?.id || !profile?.id) throw new Error('Not authenticated');

      return withConsultationRateLimit(async () => {
        // First, try to find existing consultation
        const { data: existingConsultation } = await supabase
          .from('consultations')
          .select(`
            ${CONSULTATION_COLUMNS.detail},
            patient:patients(${PATIENT_COLUMNS.detail}),
            doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
          `)
          .eq('patient_id', patientId)
          .neq('status', 'completed')
          .maybeSingle();

        if (existingConsultation) {
          // Update queue entry to in_service if not already
          await supabase
            .from('queue_entries')
            .update({ 
              status: 'in_service', 
              service_start_time: new Date().toISOString() 
            })
            .eq('patient_id', patientId)
            .in('status', ['waiting', 'called']);

          return existingConsultation as Consultation;
        }

        // Create new consultation if none exists
        const { data: consultation, error } = await supabase
          .from('consultations')
          .insert({
            patient_id: patientId,
            hospital_id: hospital.id,
            doctor_id: profile.id,
            status: 'patient_overview' as ConsultationStatus,
            current_step: 1,
            started_at: new Date().toISOString(),
          })
          .select(`
            ${CONSULTATION_COLUMNS.detail},
            patient:patients(${PATIENT_COLUMNS.detail}),
            doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
          `)
          .single();

        if (error) throw error;

        // Update queue entry to in_service
        await supabase
          .from('queue_entries')
          .update({ 
            status: 'in_service', 
            service_start_time: new Date().toISOString() 
          })
          .eq('patient_id', patientId)
          .in('status', ['waiting', 'called']);

        return consultation as Consultation;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Consultation started');
    },
    onError: (error: Error) => {
      toast.error(`Failed to load consultation: ${error.message}`);
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Consultation> & { id: string }) =>
      withConsultationRateLimit(async () => {
        const { data, error } = await supabase
          .from('consultations')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data as Consultation;
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', data.id] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update consultation: ${error.message}`);
    },
  });
}

export function useAdvanceConsultationStep() {
  const updateConsultation = useUpdateConsultation();

  return useMutation({
    mutationFn: async ({ consultationId, currentStep }: { consultationId: string; currentStep: number }) => {
      const nextStep = currentStep + 1;
      const nextStatus = CONSULTATION_STEPS[nextStep - 1]?.status || 'completed';

      const updates: Partial<Consultation> & { id: string } = {
        id: consultationId,
        current_step: nextStep,
        status: nextStatus,
      };

      if (nextStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      return updateConsultation.mutateAsync(updates);
    },
    onSuccess: () => {
      toast.success('Moved to next step');
    },
  });
}

export function useAutoSaveConsultation(consultationId: string | undefined) {
  const updateConsultation = useUpdateConsultation();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const currentConsultationId = useRef(consultationId);
  currentConsultationId.current = consultationId;

  const autoSave = useCallback((data: Record<string, any>) => {
    const id = currentConsultationId.current;
    if (!id) return;

    // Debounce auto-save to every 30 seconds
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (!currentConsultationId.current) return;
      updateConsultation.mutate({
        id: currentConsultationId.current,
        auto_save_data: data,
        last_auto_save: new Date().toISOString(),
      });
    }, 30000);
  }, [updateConsultation]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return autoSave;
}

export function useConsultationsRealtime() {
  const queryClient = useQueryClient();
  const { hospital } = useAuth();

  useEffect(() => {
    if (!hospital?.id) return;

    const channel = supabase
      .channel('consultations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consultations',
          filter: `hospital_id=eq.${hospital.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['consultations'] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [hospital?.id, queryClient]);
}

export function usePatientsReadyForConsultation() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['ready-patients', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      return withConsultationRateLimit(async () => {
        const { data, error } = await supabase
          .from('patient_prep_checklists')
          .select(`
            *,
            patient:patients(id, first_name, last_name, mrn, date_of_birth, gender),
            queue_entry:queue_entries!patient_prep_checklists_queue_entry_id_fkey(id, queue_number, status, check_in_time)
          `)
          .eq('hospital_id', hospital.id)
          .eq('ready_for_doctor', true)
          .in('queue_entry.status', ['waiting', 'called']);

        if (error) throw error;
        return data || [];
      });
    },
    enabled: !!hospital?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
