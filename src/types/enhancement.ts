// Types for Phase 4 Enhancement Tables

export interface LoincCode {
  code: string;
  component: string;
  property: string | null;
  time_aspect: string | null;
  system_type: string | null;
  scale_type: string | null;
  reference_range: Record<string, string> | null;
  created_at: string;
}

export interface TriageAssessment {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  esi_level: number | null; // 1-5 Emergency Severity Index
  chief_complaint: string | null;
  vital_signs: Record<string, any> | null;
  symptoms: Record<string, any> | null;
  immediate_attention_required: boolean;
  high_risk_flags: string[] | null;
  notes: string | null;
  assessed_by: string | null;
  hospital_id: string;
  created_at: string;
}

export interface TaskAssignment {
  id: string;
  title: string;
  description: string | null;
  assigned_by: string;
  assigned_to: string;
  patient_id: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_date: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at: string | null;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

export interface CareGap {
  id: string;
  patient_id: string;
  measure_type: string;
  measure_name: string;
  due_date: string | null;
  completed_date: string | null;
  status: 'open' | 'due' | 'overdue' | 'completed' | 'not_applicable';
  notes: string | null;
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

// Input types for creating new records
export interface CreateTriageAssessmentData {
  appointment_id?: string;
  patient_id: string;
  esi_level?: number;
  chief_complaint?: string;
  vital_signs?: Record<string, any>;
  symptoms?: Record<string, any>;
  immediate_attention_required?: boolean;
  high_risk_flags?: string[];
  notes?: string;
  assessed_by?: string;
}

export interface CreateTaskAssignmentData {
  title: string;
  description?: string;
  assigned_to: string;
  patient_id?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
}

export interface CreateCareGapData {
  patient_id: string;
  measure_type: string;
  measure_name: string;
  due_date?: string;
  notes?: string;
}

// Update types
export interface UpdateTaskAssignmentData {
  title?: string;
  description?: string;
  assigned_to?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  due_date?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completed_at?: string;
}

export interface UpdateCareGapData {
  measure_type?: string;
  measure_name?: string;
  due_date?: string;
  completed_date?: string;
  status?: 'open' | 'due' | 'overdue' | 'completed' | 'not_applicable';
  notes?: string;
}