import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useClinicalMetrics } from '@/hooks/useClinicalMetrics';
import { sanitizeLogMessage } from '@/utils/sanitize';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';

export interface VitalSigns {
  id: string;
  patient_id: string;
  consultation_id: string | null;
  recorded_by: string | null;
  recorded_at: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  weight: number | null;
  height: number | null;
  bmi: number | null;
  pain_level: number | null;
  notes: string | null;
  recorder?: {
    first_name: string;
    last_name: string;
  };
}

export function usePatientVitalSigns(patientId: string) {
  return useQuery({
    queryKey: ['vital-signs', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vital_signs')
        .select(`
          *,
          recorder:recorded_by(first_name, last_name)
        `)
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data as VitalSigns[];
    },
    enabled: !!patientId,
  });
}

export function useLatestVitals(patientId: string) {
  return useQuery({
    queryKey: ['vital-signs', 'latest', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vital_signs')
        .select(`
          *,
          recorder:recorded_by(first_name, last_name)
        `)
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as VitalSigns | null;
    },
    enabled: !!patientId,
  });
}

export function useTodayVitalsCount() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['vital-signs', 'today-count', profile?.hospital_id],
    queryFn: async () => {
      if (!profile?.hospital_id) return 0;

      const today = new Date().toISOString().split('T')[0];
      
      const { count, error } = await supabase
        .from('vital_signs')
        .select('id', { count: 'exact', head: true })
        .gte('recorded_at', `${today}T00:00:00`)
        .lt('recorded_at', `${today}T23:59:59`);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.hospital_id,
  });
}

export function useRecordVitals() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const { recordOperation, recordCustomEvent } = useClinicalMetrics();

  return useMutation({
    mutationFn: async (vitals: {
      patient_id: string;
      consultation_id?: string;
      blood_pressure_systolic?: number;
      blood_pressure_diastolic?: number;
      heart_rate?: number;
      temperature?: number;
      respiratory_rate?: number;
      oxygen_saturation?: number;
      weight?: number;
      height?: number;
      pain_level?: number;
      notes?: string;
    }) => {
      return recordOperation(
        {
          workflowType: 'vital',
          operationName: 'RecordVitalSigns',
          attributes: { patient_id: vitals.patient_id },
        },
        async () => {
          // Calculate BMI if weight and height are provided
          let bmi = null;
          if (vitals.weight && vitals.height) {
            const heightInMeters = vitals.height / 100;
            bmi = vitals.weight / (heightInMeters * heightInMeters);
          }

      const { data, error } = await supabase
        .from('vital_signs')
        .insert({
          ...vitals,
          recorded_by: profile?.id,
          bmi,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vital-signs', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['vital-signs', 'today-count'] });
      toast.success('Vitals recorded successfully');
      void (async () => {
        await triggerWorkflow({
          type: WORKFLOW_EVENT_TYPES.VITALS_RECORDED,
          sourceRole: 'nurse',
          patientId: variables.patient_id,
          data: { consultationId: variables.consultation_id ?? null },
          priority: 'normal',
        });

        let consultationLookup = variables.consultation_id ? { id: variables.consultation_id } : null;
        if (!consultationLookup) {
          const { data, error } = await supabase
            .from('consultations')
            .select('id')
            .eq('patient_id', variables.patient_id)
            .neq('status', 'completed')
            .neq('status', 'cancelled')
            .order('created_at', { ascending: false })
            .maybeSingle();

          if (error) throw error;
          consultationLookup = data;
        }

        const { data: activeQueueEntry, error: queueError } = await supabase
          .from('patient_queue')
          .select('id')
          .eq('patient_id', variables.patient_id)
          .in('status', ['waiting', 'called', 'in_prep'])
          .order('created_at', { ascending: false })
          .maybeSingle();

        if (queueError) throw queueError;

        if (consultationLookup?.id && activeQueueEntry?.id) {
          await triggerWorkflow({
            type: WORKFLOW_EVENT_TYPES.PATIENT_READY_FOR_DOCTOR,
            sourceRole: 'nurse',
            patientId: variables.patient_id,
            data: {
              consultationId: consultationLookup.id,
              queueEntryId: activeQueueEntry.id,
            },
            priority: 'high',
          });
        }
      })().catch((error) => {
        console.error('Vitals workflow handoff failed:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      });
    },
    onError: (error) => {
      console.error('Error recording vitals:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast.error('Failed to record vitals');
    },
  });
}

// Unified Vital Signs Hook
export function useVitalSigns() {
  const recordVitalsMutation = useRecordVitals();

  return {
    recordVitals: recordVitalsMutation.mutateAsync
  };
}
