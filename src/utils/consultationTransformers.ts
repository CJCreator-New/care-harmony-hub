import { Consultation, ConsultationStatus } from '@/hooks/useConsultations';
import { Consultation as ServiceConsultation } from '@/types/clinical';

/**
 * Transforms consultation data from clinical service to frontend format
 * This is a temporary transformation until the frontend is fully migrated
 */
export function transformConsultationFromService(
  consultation: ServiceConsultation
): Consultation {
  return {
    ...consultation,
    doctor_id: consultation.provider_id,
    status: consultation.status as ConsultationStatus,
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
