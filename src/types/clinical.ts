// Comprehensive type definitions for CareSync HMS
// This file consolidates types used across multiple components

// =====================================================
// Lab Sample Tracking Types
// =====================================================

export interface LabSample {
  id: string;
  sample_id: string;
  patient_id: string;
  test_type: string;
  status: 'collected' | 'received' | 'processing' | 'completed' | 'rejected';
  priority: 'routine' | 'urgent' | 'stat';
  collected_at: string;
  received_at?: string;
  processed_at?: string;
  completed_at?: string;
  collector_id: string;
  technician_id?: string;
  location: string;
  temperature?: number;
  volume?: string;
  notes?: string;
  rejection_reason?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface LabSampleWithRelations extends LabSample {
  patient?: {
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
  collector?: {
    first_name: string;
    last_name: string;
  };
  technician?: {
    first_name: string;
    last_name: string;
  };
}

export interface SampleTracking {
  id: string;
  sample_id: string;
  location: string;
  action: 'collected' | 'received' | 'moved' | 'processed' | 'completed' | 'rejected';
  timestamp: string;
  user_id: string;
  temperature?: number;
  notes?: string;
  hospital_id: string;
}

// =====================================================
// Performance Monitoring Types
// =====================================================

export interface PerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  value: number;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
  metadata: Record<string, any>;
  hospital_id?: string;
  created_at: string;
}

export interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  url?: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  user_id?: string;
  hospital_id?: string;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  response_time: number;
  error_rate: number;
  last_check: string;
}

// =====================================================
// AI Clinical Support Types
// =====================================================

export interface DifferentialDiagnosis {
  condition: string;
  confidence: number;
  evidence: string[];
  icd10_code: string;
}

export interface RiskAssessment {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  factors: string[];
  recommendations: string[];
}

export interface ClinicalCoding {
  icd10_codes: string[];
  cpt_codes: string[];
  confidence: number;
  suggested_modifiers: string[];
}

export interface DrugInteraction {
  drugs: string[];
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  mechanism: string;
  recommendation: string;
  clinical_effects?: string[];
}

export interface TreatmentRecommendation {
  condition: string;
  treatment: string;
  evidence_level: 'A' | 'B' | 'C' | 'D';
  guideline_source: string;
  contraindications?: string[];
  monitoring_required?: string[];
}

// =====================================================
// Clinical Coding Types
// =====================================================

export interface CPTCode {
  code: string;
  description: string;
  category: string;
  base_fee: number;
  hospital_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LOINCCode {
  code: string;
  component: string;
  property?: string;
  time_aspect?: string;
  system_type?: string;
  scale_type?: string;
  method_type?: string;
  reference_range?: {
    min?: number;
    max?: number;
    unit?: string;
  };
  active: boolean;
  created_at: string;
}

// =====================================================
// Nurse Workflow Types
// =====================================================

export interface PatientChecklist {
  id: string;
  patient_id: string;
  appointment_id?: string;
  nurse_id: string;
  vitals_recorded: boolean;
  allergies_verified: boolean;
  medications_reviewed: boolean;
  chief_complaint_documented: boolean;
  ready_for_doctor: boolean;
  notes?: string;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Queue Management Types
// =====================================================

export interface QueueEntry {
  id: string;
  queue_number: number;
  patient_id: string;
  appointment_id?: string;
  department?: string;
  priority: 'emergency' | 'urgent' | 'high' | 'normal' | 'low';
  status: 'waiting' | 'called' | 'in_service' | 'completed';
  check_in_time: string;
  called_time?: string;
  service_start_time?: string;
  service_end_time?: string;
  assigned_to?: string;
  hospital_id: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
}

// =====================================================
// HPI Template Types
// =====================================================

export interface HPITemplateField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'date' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface HPITemplate {
  name: string;
  description: string;
  fields: HPITemplateField[];
}

// =====================================================
// Review of Systems Types
// =====================================================

export type CheckedState = boolean | 'indeterminate';

export interface SystemReview {
  system: string;
  findings: string[];
  abnormal: boolean;
  notes?: string;
}

// =====================================================
// Utility Types
// =====================================================

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export type SortDirection = 'asc' | 'desc';

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: SortDirection;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

// =====================================================
// Form Validation Types
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isSubmitting: boolean;
  isDirty: boolean;
}
