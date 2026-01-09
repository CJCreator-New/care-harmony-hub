import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect, useCallback, useRef } from 'react';

export type ConsultationStatus = 'pending' | 'patient_overview' | 'clinical_assessment' | 'treatment_planning' | 'final_review' | 'handoff' | 'completed';

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
  { step: 1, status: 'patient_overview' as ConsultationStatus, label: 'Patient Overview', description: 'Demographics, vitals, history' },
  { step: 2, status: 'clinical_assessment' as ConsultationStatus, label: 'Clinical Assessment', description: 'Symptoms, physical exam' },
  { step: 3, status: 'treatment_planning' as ConsultationStatus, label: 'Treatment Planning', description: 'Diagnosis, prescriptions, labs' },
  { step: 4, status: 'final_review' as ConsultationStatus, label: 'Final Review', description: 'Summary, billing' },
  { step: 5, status: 'handoff' as ConsultationStatus, label: 'Handoff', description: 'Notify pharmacy/lab' },
];

export function useConsultations() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['consultations', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];

      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, date_of_birth, gender, allergies, chronic_conditions),
          doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Consultation[];
    },
    enabled: !!hospital?.id,
  });
}

export function useConsultation(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      if (!consultationId) return null;

      const { data, error } = await supabase
        .from('consultations')
        .select(`
          *,
          patient:patients(id, first_name, last_name, mrn, date_of_birth, gender, allergies, chronic_conditions, current_medications, blood_type, phone, email, address, city, state, zip, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_policy_number),
          doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('id', consultationId)
        .maybeSingle();

      if (error) throw error;
      return data as Consultation | null;
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

      // Check for existing active consultation first
      const { data: existingConsultation } = await supabase
        .from('consultations')
        .select('id')
        .eq('patient_id', data.patient_id)
        .eq('doctor_id', profile.id)
        .neq('status', 'completed')
        .maybeSingle();

      if (existingConsultation) {
        // Return existing consultation instead of creating duplicate
        const { data: consultation, error } = await supabase
          .from('consultations')
          .select()
          .eq('id', existingConsultation.id)
          .single();
        
        if (error) throw error;
        toast.info('Consultation already exists for this patient');
        return consultation as Consultation;
      }

      const { data: consultation, error } = await supabase
        .from('consultations')
        .insert({
          ...data,
          hospital_id: hospital.id,
          doctor_id: profile.id,
          status: 'patient_overview' as ConsultationStatus,
          current_step: 1,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return consultation as Consultation;
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

export function useUpdateConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Consultation> & { id: string }) => {
      const { data, error } = await supabase
        .from('consultations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Consultation;
    },
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
  }, [consultationId, updateConsultation]);

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
      supabase.removeChannel(channel);
    };
  }, [hospital?.id, queryClient]);
}
