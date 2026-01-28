import { z } from 'zod';

// Base consultation schema
export const ConsultationSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  appointment_id: z.string().uuid().optional(),
  hospital_id: z.string().uuid(),
  consultation_type: z.enum(['initial', 'followup', 'emergency', 'telemedicine']),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']),
  chief_complaint: z.string().min(1).max(1000),
  history_of_present_illness: z.string().optional(),
  vital_signs: z.object({
    blood_pressure: z.string().optional(),
    heart_rate: z.number().optional(),
    temperature: z.number().optional(),
    respiratory_rate: z.number().optional(),
    oxygen_saturation: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    bmi: z.number().optional(),
  }).optional(),
  physical_examination: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  diagnosis_codes: z.array(z.string()).optional(), // ICD-10 codes
  procedure_codes: z.array(z.string()).optional(), // CPT codes
  medications_prescribed: z.array(z.object({
    medication_id: z.string().uuid(),
    dosage: z.string(),
    frequency: z.string(),
    duration: z.string(),
    instructions: z.string().optional(),
  })).optional(),
  lab_orders: z.array(z.string().uuid()).optional(),
  imaging_orders: z.array(z.string().uuid()).optional(),
  follow_up_instructions: z.string().optional(),
  progress_notes: z.string().optional(),
  clinical_notes: z.string().optional(),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid(),
  updated_by: z.string().uuid(),
});

// Clinical workflow schema
export const ClinicalWorkflowSchema = z.object({
  id: z.string().uuid(),
  consultation_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  workflow_type: z.enum(['consultation', 'admission', 'discharge', 'transfer', 'procedure']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']),
  current_step: z.string(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
    assigned_to: z.string().uuid().optional(),
    assigned_role: z.string().optional(),
    due_date: z.string().datetime().optional(),
    completed_at: z.string().datetime().optional(),
    notes: z.string().optional(),
  })),
  metadata: z.record(z.any()).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Medical record schema
export const MedicalRecordSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  hospital_id: z.string().uuid(),
  record_type: z.enum(['consultation', 'lab_result', 'imaging', 'prescription', 'procedure', 'discharge']),
  record_date: z.string().datetime(),
  provider_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string(),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    filename: z.string(),
    content_type: z.string(),
    size: z.number(),
    url: z.string(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  is_confidential: z.boolean().default(false),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Clinical decision support schema
export const ClinicalDecisionSupportSchema = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  consultation_id: z.string().uuid().optional(),
  rule_type: z.enum(['drug_interaction', 'allergy_alert', 'duplicate_therapy', 'dose_check', 'diagnosis_suggestion']),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string().min(1).max(200),
  message: z.string().min(1),
  recommendations: z.array(z.string()).optional(),
  evidence: z.string().optional(),
  is_acknowledged: z.boolean().default(false),
  acknowledged_by: z.string().uuid().optional(),
  acknowledged_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
});

// Consultation creation schema
export const CreateConsultationSchema = ConsultationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  created_by: true,
  updated_by: true,
  started_at: true,
  completed_at: true,
});

// Consultation update schema
export const UpdateConsultationSchema = CreateConsultationSchema.partial();

// Clinical workflow creation schema
export const CreateClinicalWorkflowSchema = ClinicalWorkflowSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Medical record creation schema
export const CreateMedicalRecordSchema = MedicalRecordSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Search/filter schemas
export const ConsultationSearchSchema = z.object({
  hospital_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  provider_id: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).optional(),
  consultation_type: z.enum(['initial', 'followup', 'emergency', 'telemedicine']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});

export const ClinicalWorkflowSearchSchema = z.object({
  hospital_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold']).optional(),
  workflow_type: z.enum(['consultation', 'admission', 'discharge', 'transfer', 'procedure']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent', 'critical']).optional(),
});

export const MedicalRecordSearchSchema = z.object({
  hospital_id: z.string().uuid(),
  patient_id: z.string().uuid().optional(),
  record_type: z.enum(['consultation', 'lab_result', 'imaging', 'prescription', 'procedure', 'discharge']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

// Type definitions
export type Consultation = z.infer<typeof ConsultationSchema>;
export type CreateConsultation = z.infer<typeof CreateConsultationSchema>;
export type UpdateConsultation = z.infer<typeof UpdateConsultationSchema>;
export type ClinicalWorkflow = z.infer<typeof ClinicalWorkflowSchema>;
export type CreateClinicalWorkflow = z.infer<typeof CreateClinicalWorkflowSchema>;
export type MedicalRecord = z.infer<typeof MedicalRecordSchema>;
export type CreateMedicalRecord = z.infer<typeof CreateMedicalRecordSchema>;
export type ClinicalDecisionSupport = z.infer<typeof ClinicalDecisionSupportSchema>;
export type ConsultationSearch = z.infer<typeof ConsultationSearchSchema>;
export type ClinicalWorkflowSearch = z.infer<typeof ClinicalWorkflowSearchSchema>;
export type MedicalRecordSearch = z.infer<typeof MedicalRecordSearchSchema>;

// API response types
export interface ConsultationResponse {
  data: Consultation;
  success: true;
}

export interface ConsultationsResponse {
  data: Consultation[];
  total: number;
  limit: number;
  offset: number;
  success: true;
}

export interface ClinicalWorkflowResponse {
  data: ClinicalWorkflow;
  success: true;
}

export interface ClinicalWorkflowsResponse {
  data: ClinicalWorkflow[];
  total: number;
  limit: number;
  offset: number;
  success: true;
}

export interface MedicalRecordResponse {
  data: MedicalRecord;
  success: true;
}

export interface MedicalRecordsResponse {
  data: MedicalRecord[];
  total: number;
  limit: number;
  offset: number;
  success: true;
}

export interface ClinicalDecisionSupportResponse {
  data: ClinicalDecisionSupport[];
  success: true;
}

// Error response type
export interface ErrorResponse {
  error: string;
  message: string;
  success: false;
  code?: string;
}

// Common API response union
export type ApiResponse<T> = T | ErrorResponse;