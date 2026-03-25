import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { useEffect, useCallback, useRef } from 'react';
import { devLog } from '@/utils/sanitize';
import { executeWithRateLimitBackoff } from '@/utils/rateLimitBackoff';
import { supabase } from '@/integrations/supabase/client';
import { CONSULTATION_COLUMNS, PATIENT_COLUMNS } from '@/lib/queryColumns';
import type { PostgrestError } from '@supabase/supabase-js';
import { useAudit } from '@/hooks/useAudit';
import { fieldEncryption } from '@/utils/dataProtection';

export type ConsultationStatus =
  | 'scheduled'
  | 'patient_overview'
  | 'clinical_assessment'
  | 'treatment_planning'
  | 'final_review'
  | 'handoff'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

/** Lifecycle-only status — maps to DB consultation_status column. */
export type ConsultationLifecycleStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Workflow step names — maps to DB workflow_stage column. */
export type WorkflowStageName =
  | 'patient_overview'
  | 'clinical_assessment'
  | 'treatment_planning'
  | 'final_review'
  | 'handoff';

/** Normalise legacy / alternate status strings to ConsultationLifecycleStatus. */
export const LEGACY_CONSULTATION_STATUS_MAP: Record<string, ConsultationLifecycleStatus> = {
  'active': 'in_progress',
  'in-progress': 'in_progress',
  'in_service': 'in_progress',
};

export function mapToLifecycleStatus(
  raw: string | null | undefined
): ConsultationLifecycleStatus {
  if (!raw) return 'scheduled';
  if (['scheduled', 'in_progress', 'completed', 'cancelled'].includes(raw)) {
    return raw as ConsultationLifecycleStatus;
  }
  return LEGACY_CONSULTATION_STATUS_MAP[raw] ?? 'scheduled';
}

export interface Consultation {
  id: string;
  hospital_id: string;
  appointment_id: string | null;
  patient_id: string;
  doctor_id: string;
  nurse_id: string | null;
  consultation_status?: 'active' | 'completed' | 'cancelled';
  workflow_stage?: Exclude<ConsultationStatus, 'scheduled' | 'in-progress' | 'completed' | 'cancelled'>;
  status: ConsultationStatus;
  current_step: number;
  // Step 1: Patient Overview
  vitals: Record<string, any>;
  chief_complaint: string | null;
  history_of_present_illness: string | null;
  hpi_data: Record<string, any> | null;
  hpi_notes: string | null;
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

const withConsultationRateLimit = async <T,>(fn: () => Promise<T>) =>
  executeWithRateLimitBackoff(fn, {
    key: 'consultations',
    onRetry: (attempt, delayMs) => {
      toast.info(`Rate limited. Retrying in ${Math.round(delayMs / 1000)}s (attempt ${attempt}/4).`);
    },
  });

const consultationJoinSelect = (includeHpiColumns = true) => `
  ${includeHpiColumns ? CONSULTATION_COLUMNS.detail : CONSULTATION_COLUMNS.detailWithoutHpi},
  patient:patients(${PATIENT_COLUMNS.detail}),
  doctor:profiles!consultations_doctor_id_fkey(id, first_name, last_name)
`;

const getMissingConsultationColumns = (error: PostgrestError | null): string[] => {
  if (!error) return [];

  const patterns = [
    /column consultations\.([a-zA-Z0-9_]+) does not exist/gi,
    /could not find the '([a-zA-Z0-9_]+)' column of 'consultations' in the schema cache/gi,
  ];

  const missingColumns = new Set<string>();

  for (const pattern of patterns) {
    for (const match of error.message.matchAll(pattern)) {
      const columnName = match[1];
      if (columnName) missingColumns.add(columnName);
    }
  }

  return [...missingColumns];
};

const isMissingHpiColumnError = (error: PostgrestError | null) =>
  getMissingConsultationColumns(error).some((columnName) => ['hpi_data', 'hpi_notes'].includes(columnName));

const withConsultationHpiFallback = async <T,>(
  runQuery: (includeHpiColumns: boolean) => PromiseLike<{ data: T | null; error: PostgrestError | null }>
) => {
  const primaryResult = await runQuery(true);
  if (!isMissingHpiColumnError(primaryResult.error)) {
    if (primaryResult.error) throw primaryResult.error;
    return primaryResult.data;
  }

  const fallbackResult = await runQuery(false);
  if (fallbackResult.error) throw fallbackResult.error;
  return fallbackResult.data;
};

const stripUnsupportedConsultationFields = <T extends Record<string, any>>(
  updates: T,
  unsupportedFields: string[]
): T => {
  const sanitized = { ...updates };

  for (const field of unsupportedFields) {
    delete sanitized[field];
  }

  return sanitized;
};

/** F2.3 — Decrypt consultation clinical PHI fields if encryption_metadata is present. */
async function decryptConsultationFields(consultation: any): Promise<any> {
  if (!consultation?.encryption_metadata || Object.keys(consultation.encryption_metadata).length === 0) {
    return consultation;
  }
  const decrypted = { ...consultation };
  for (const [field, encData] of Object.entries(consultation.encryption_metadata as Record<string, any>)) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].startsWith('__ENCRYPTED__')) {
      try {
        decrypted[field] = await fieldEncryption.decryptField(encData);
      } catch {
        decrypted[field] = '[Encrypted]';
      }
    }
  }
  return decrypted;
}

export function useConsultations() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['consultations', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) {
        devLog('No hospital ID available');
        return [];
      }

      devLog('Fetching consultations for hospital:', hospital.id);

      return withConsultationRateLimit(async () => {
        const data = await withConsultationHpiFallback((includeHpiColumns) =>
          supabase
            .from('consultations')
            .select(consultationJoinSelect(includeHpiColumns))
            .eq('hospital_id', hospital.id)
            .order('created_at', { ascending: false })
            .limit(100)
        );

        devLog('Consultations fetched:', data?.length ?? 0);
        const rows = (data || []) as any[];
        const decrypted = await Promise.all(rows.map(decryptConsultationFields));
        return decrypted as unknown as Consultation[];
      });
    },
    enabled: !!hospital?.id,
    staleTime: 60 * 1000, // 1 minute - consultations updated via realtime
  });
}

export function useConsultation(consultationId: string | undefined) {
  return useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      if (!consultationId) return null;

      return withConsultationRateLimit(async () => {
        const data = await withConsultationHpiFallback((includeHpiColumns) =>
          supabase
            .from('consultations')
            .select(consultationJoinSelect(includeHpiColumns))
            .eq('id', consultationId)
            .maybeSingle()
        );

        return await decryptConsultationFields(data) as unknown as Consultation | null;
      });
    },
    enabled: !!consultationId,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateConsultation() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();
  const { logActivity } = useAudit();

  return useMutation({
    mutationFn: async (data: ConsultationInsert) => {
      if (!hospital?.id || !profile?.id) throw new Error('Not authenticated');

      return withConsultationRateLimit(async () => {
        // Idempotency guard: return existing non-completed consultation if present
        const existing = await withConsultationHpiFallback((includeHpiColumns) =>
          supabase
            .from('consultations')
            .select(consultationJoinSelect(includeHpiColumns))
            .eq('hospital_id', hospital.id)
            .eq('patient_id', data.patient_id)
            .neq('status', 'completed')
            .maybeSingle()
        );

        if (existing) return existing as unknown as Consultation;

        const consultation = await withConsultationHpiFallback((includeHpiColumns) =>
          supabase
            .from('consultations')
            .insert({
              patient_id: data.patient_id,
              hospital_id: hospital.id,
              doctor_id: profile.id,
              nurse_id: data.nurse_id ?? null,
              appointment_id: data.appointment_id ?? null,
              status: 'patient_overview' as ConsultationStatus,
              current_step: 1,
              started_at: new Date().toISOString(),
            })
            .select(consultationJoinSelect(includeHpiColumns))
            .single()
        );

        return consultation as unknown as Consultation;
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      toast.success('Consultation started');
      // F3.1 — HIPAA §164.312(b): audit log for consultation create
      void logActivity({
        actionType: 'CONSULTATION_CREATED',
        entityType: 'consultations',
        entityId: data?.id,
        details: { patient_id: data?.patient_id, doctor_id: data?.doctor_id },
        severity: 'info',
      });
      // T-90: Critical-handoff telemetry — consult_start_success (no PHI in details)
      void supabase.from('activity_logs').insert({
        user_id: profile?.user_id ?? null,
        hospital_id: hospital?.id ?? null,
        action_type: 'telemetry:consult_start_success',
        entity_type: 'consultation',
        entity_id: data?.id ?? null,
        details: { event: 'consult_start_success', emitted_at: new Date().toISOString() },
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start consultation: ${error.message}`);
      // T-90: Critical-handoff telemetry — consult_start_failure (no PHI in details)
      void supabase.from('activity_logs').insert({
        user_id: profile?.user_id ?? null,
        hospital_id: hospital?.id ?? null,
        action_type: 'telemetry:consult_start_failure',
        entity_type: 'consultation',
        entity_id: null,
        details: { event: 'consult_start_failure', error_code: error.message, emitted_at: new Date().toISOString() },
      });
    },
  });
}

export function useGetOrCreateConsultation() {
  const queryClient = useQueryClient();
  const { hospital, profile } = useAuth();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const { logActivity } = useAudit();

  return useMutation({
    mutationFn: async (patientId: string) => {
      if (!hospital?.id || !profile?.id) throw new Error('Not authenticated');

      return withConsultationRateLimit(async () => {
        // First, try to find existing consultation
        const existingConsultation = await withConsultationHpiFallback((includeHpiColumns) =>
          supabase
            .from('consultations')
            .select(consultationJoinSelect(includeHpiColumns))
            .eq('patient_id', patientId)
            .neq('status', 'completed')
            .maybeSingle()
        );

        if (existingConsultation) {
          // Update queue entry to in_service if not already
          await supabase
            .from('patient_queue')
            .update({ 
              status: 'in_service', 
              service_start_time: new Date().toISOString() 
            })
            .eq('patient_id', patientId)
            .in('status', ['waiting', 'called']);

          return existingConsultation as unknown as Consultation;
        }

        // Create new consultation if none exists
        const consultation = await withConsultationHpiFallback((includeHpiColumns) =>
          supabase
            .from('consultations')
            .insert({
              patient_id: patientId,
              hospital_id: hospital.id,
              doctor_id: profile.id,
              status: 'patient_overview' as ConsultationStatus,
              current_step: 1,
              started_at: new Date().toISOString(),
            })
            .select(consultationJoinSelect(includeHpiColumns))
            .single()
        );

        // Update queue entry to in_service
        await supabase
          .from('patient_queue')
          .update({ 
            status: 'in_service', 
            service_start_time: new Date().toISOString() 
          })
          .eq('patient_id', patientId)
          .in('status', ['waiting', 'called']);

        return consultation as unknown as Consultation;
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      toast.success('Consultation started');
      // F3.1 — HIPAA §164.312(b): audit log
      void logActivity({
        actionType: 'CONSULTATION_CREATED',
        entityType: 'consultations',
        entityId: data.id,
        details: { patient_id: data.patient_id, doctor_id: data.doctor_id },
        severity: 'info',
      });
      void triggerWorkflow({
        type: WORKFLOW_EVENT_TYPES.CONSULTATION_STARTED,
        sourceRole: 'doctor',
        patientId: data.patient_id,
        data: { consultationId: data.id, doctorId: data.doctor_id },
        priority: 'normal',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to load consultation: ${error.message}`);
    },
  });
}

export function useUpdateConsultation() {
  const queryClient = useQueryClient();
  const { logActivity } = useAudit();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Consultation> & { id: string }) =>
      withConsultationRateLimit(async () => {
        // F2.3 — HIPAA §164.312(a)(2)(iv): encrypt clinical narrative PHI fields before storage
        const clinicalPHIFields = [
          'chief_complaint', 'history_of_present_illness', 'treatment_plan',
          'clinical_notes', 'follow_up_notes', 'handoff_notes',
        ] as const;
        const encMeta: Record<string, any> = (updates as any).encryption_metadata ?? {};
        for (const field of clinicalPHIFields) {
          const value = (updates as any)[field];
          if (value && typeof value === 'string' && !value.startsWith('__ENCRYPTED__')) {
            const encrypted = await fieldEncryption.encryptField(value);
            encMeta[field] = encrypted;
            (updates as any)[field] = `__ENCRYPTED__${encrypted.keyVersion}`;
          }
        }
        if (Object.keys(encMeta).length > 0) {
          (updates as any).encryption_metadata = encMeta;
        }

        let pendingUpdates = { ...updates };

        while (true) {
          const result = await supabase
            .from('consultations')
            .update(pendingUpdates)
            .eq('id', id)
            .select()
            .single();

          const missingColumns = getMissingConsultationColumns(result.error);
          if (!missingColumns.length) {
            if (result.error) throw result.error;
            return result.data as Consultation;
          }

          const nextUpdates = stripUnsupportedConsultationFields(pendingUpdates, missingColumns);
          if (Object.keys(nextUpdates).length === Object.keys(pendingUpdates).length) {
            throw result.error;
          }

          pendingUpdates = nextUpdates;
        }
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['consultations'] });
      queryClient.invalidateQueries({ queryKey: ['consultation', data.id] });
      // F3.1 — HIPAA §164.312(b): audit log for consultation update
      void logActivity({
        actionType: 'CONSULTATION_UPDATED',
        entityType: 'consultations',
        entityId: data.id,
        details: { patient_id: data.patient_id, status: data.status },
        severity: 'info',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update consultation: ${error.message}`);
    },
  });
}

export function useAdvanceConsultationStep() {
  const updateConsultation = useUpdateConsultation();
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const { logActivity } = useAudit();

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
    onSuccess: (data) => {
      if (data.status === 'completed') {
        void logActivity({
          actionType: 'CONSULTATION_COMPLETED',
          entityType: 'consultations',
          entityId: data.id,
          details: { patient_id: data.patient_id, doctor_id: data.doctor_id },
          severity: 'info',
        });
        void triggerWorkflow({
          type: WORKFLOW_EVENT_TYPES.CONSULTATION_COMPLETED,
          sourceRole: 'doctor',
          patientId: data.patient_id,
          data: { consultationId: data.id, doctorId: data.doctor_id },
          priority: 'normal',
        });
      }
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
            queue_entry:patient_queue!patient_prep_checklists_queue_entry_id_fkey(id, queue_number, status, check_in_time)
          `)
          .eq('hospital_id', hospital.id)
          .eq('ready_for_doctor', true)
          .in('queue_entry.status', ['waiting', 'called']);

        if (error) throw error;
        return data || [];
      });
    },
    enabled: !!hospital?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
