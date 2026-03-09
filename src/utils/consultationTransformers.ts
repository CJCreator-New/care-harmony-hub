import { Consultation, ConsultationStatus } from '@/hooks/useConsultations';
import { Consultation as ServiceConsultation } from '@/types/clinical';

function normalizeConsultationStatus(status: string | null | undefined): ConsultationStatus {
  switch (status) {
    case 'scheduled':
    case 'patient_overview':
    case 'clinical_assessment':
    case 'treatment_planning':
    case 'final_review':
    case 'handoff':
    case 'completed':
    case 'cancelled':
      return status;
    case 'in_progress':
    case 'in-progress':
      return 'clinical_assessment';
    default:
      return 'patient_overview';
  }
}

function deriveWorkflowStage(status: ConsultationStatus): Consultation['workflow_stage'] {
  if (status === 'patient_overview') return 'patient_overview';
  if (status === 'clinical_assessment') return 'clinical_assessment';
  if (status === 'treatment_planning') return 'treatment_planning';
  if (status === 'final_review') return 'final_review';
  if (status === 'handoff') return 'handoff';
  if (status === 'scheduled' || status === 'in-progress') return 'clinical_assessment';
  return undefined;
}

function deriveConsultationLifecycle(status: ConsultationStatus): Consultation['consultation_status'] {
  if (status === 'completed') return 'completed';
  if (status === 'cancelled') return 'cancelled';
  return 'active';
}

/**
 * Transforms consultation data from clinical service to frontend format
 * This is a temporary transformation until the frontend is fully migrated
 */
export function transformConsultationFromService(
  consultation: ServiceConsultation
): Consultation {
  const normalizedStatus = normalizeConsultationStatus(consultation.status);
  return {
    ...consultation,
    nurse_id: (consultation as any).nurse_id || null,
    doctor_id: consultation.provider_id,
    status: normalizedStatus,
    workflow_stage: deriveWorkflowStage(normalizedStatus),
    consultation_status: deriveConsultationLifecycle(normalizedStatus),
    current_step: 1, // Default mapping
    vitals: consultation.vital_signs || {},
    chief_complaint: consultation.chief_complaint,
    history_of_present_illness: consultation.history_of_present_illness,
    physical_examination: consultation.physical_examination
      ? { notes: consultation.physical_examination }
      : {},
    symptoms: [],
    provisional_diagnosis: consultation.diagnosis_codes || [],
    final_diagnosis: consultation.diagnosis_codes || [],
    treatment_plan: consultation.plan,
    prescriptions: consultation.medications_prescribed || [],
    lab_orders: consultation.lab_orders || [],
    referrals: [],
    clinical_notes: consultation.clinical_notes,
    follow_up_date: null,
    follow_up_notes: consultation.follow_up_instructions,
    handoff_notes: null,
    pharmacy_notified: false,
    lab_notified: false,
    billing_notified: false,
    started_at: consultation.started_at,
    completed_at: consultation.completed_at,
    auto_save_data: {},
    last_auto_save: null,
    created_at: consultation.created_at,
    updated_at: consultation.updated_at,
    // Note: patient and doctor relations need to be fetched separately or joined
  };
}

/**
 * Transforms an array of consultations from clinical service to frontend format
 */
export function transformConsultationsFromService(
  consultations: ServiceConsultation[]
): Consultation[] {
  return consultations.map(transformConsultationFromService);
}
