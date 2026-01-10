// Phase 6: Patient Portal Enhancement Types
// After Visit Summary & Digital Check-In

export interface AVSTemplate {
  id: string;
  template_name: string;
  template_type: 'visit_summary' | 'discharge_instructions' | 'medication_guide';
  content_sections: {
    sections: Array<{
      id: string;
      title: string;
      required: boolean;
    }>;
  };
  is_active: boolean;
  hospital_id: string;
  created_at: string;
}

export interface AfterVisitSummary {
  id: string;
  patient_id: string;
  consultation_id: string;
  doctor_id: string;
  visit_date: string;
  chief_complaint?: string;
  diagnosis_summary?: string;
  treatment_plan?: string;
  medications_prescribed?: Array<{
    medication_name: string;
    dosage: string;
    frequency: string;
    instructions: string;
    new_medication: boolean;
  }>;
  follow_up_instructions?: string;
  next_appointment_date?: string;
  educational_materials?: Array<{
    title: string;
    url?: string;
    type: string;
  }>;
  emergency_instructions?: string;
  generated_at: string;
  delivered_at?: string;
  delivery_method?: 'email' | 'sms' | 'portal' | 'print';
  hospital_id: string;
  created_at: string;
}

export interface PatientEducationMaterial {
  id: string;
  title: string;
  content_type: 'article' | 'video' | 'infographic' | 'checklist';
  category: 'condition' | 'medication' | 'procedure' | 'lifestyle';
  content_url?: string;
  content_text?: string;
  reading_level: number;
  languages: string[];
  tags: string[];
  is_active: boolean;
  created_at: string;
}

export interface DigitalCheckinSession {
  id: string;
  patient_id: string;
  appointment_id: string;
  session_token: string;
  checkin_status: 'started' | 'in_progress' | 'completed' | 'expired';
  started_at: string;
  completed_at?: string;
  expires_at: string;
  checkin_data: {
    demographics_confirmed?: boolean;
    insurance_verified?: boolean;
    questionnaire_completed?: boolean;
    consent_signed?: boolean;
    payment_processed?: boolean;
    arrival_time?: string;
  };
  hospital_id: string;
  created_at: string;
}

export interface PreVisitQuestionnaire {
  id: string;
  questionnaire_name: string;
  specialty?: string;
  questions: {
    questions: Array<{
      id: string;
      type: 'text' | 'select' | 'boolean' | 'scale' | 'multiselect' | 'date';
      question: string;
      required: boolean;
      options?: string[];
      min?: number;
      max?: number;
      validation?: string;
    }>;
  };
  is_active: boolean;
  hospital_id: string;
  created_at: string;
}

export interface QuestionnaireResponse {
  id: string;
  patient_id: string;
  appointment_id: string;
  questionnaire_id: string;
  responses: Record<string, any>;
  completed_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  clinical_notes?: string;
  hospital_id: string;
  created_at: string;
}

export interface SecureMessage {
  id: string;
  thread_id?: string;
  patient_id: string;
  sender_id: string;
  sender_type: 'patient' | 'doctor' | 'nurse' | 'staff';
  recipient_id: string;
  recipient_type: 'patient' | 'doctor' | 'nurse' | 'staff';
  subject?: string;
  message_body: string;
  message_type: 'general' | 'appointment' | 'prescription' | 'test_result';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  read_at?: string;
  attachments?: Array<{
    filename: string;
    file_url: string;
    file_type: string;
    file_size: number;
  }>;
  parent_message_id?: string;
  hospital_id: string;
  created_at: string;
}

export interface ConsentForm {
  id: string;
  form_name: string;
  form_type: 'treatment' | 'privacy' | 'financial' | 'research';
  form_content: string;
  version: string;
  is_active: boolean;
  requires_signature: boolean;
  hospital_id: string;
  created_at: string;
}

export interface PatientConsent {
  id: string;
  patient_id: string;
  consent_form_id: string;
  appointment_id?: string;
  consent_given: boolean;
  digital_signature?: string;
  witness_signature?: string;
  signed_at: string;
  ip_address?: string;
  user_agent?: string;
  hospital_id: string;
  created_at: string;
}

export interface SymptomCheckerSession {
  id: string;
  patient_id: string;
  session_data: {
    symptoms: Array<{
      symptom: string;
      severity: number;
      duration: string;
      location?: string;
    }>;
    demographics: {
      age: number;
      gender: string;
      medical_history?: string[];
    };
    assessment_results: {
      risk_level: 'low' | 'moderate' | 'high' | 'critical';
      confidence_score: number;
      differential_diagnoses?: string[];
    };
  };
  symptoms_reported: string[];
  severity_score: number;
  triage_recommendation: 'self_care' | 'schedule_appointment' | 'urgent_care' | 'emergency';
  completed_at: string;
  hospital_id: string;
  created_at: string;
}

// Enhanced patient portal interfaces
export interface PatientPortalDashboard {
  patient_id: string;
  upcoming_appointments: Array<{
    id: string;
    date: string;
    time: string;
    doctor_name: string;
    specialty: string;
    location: string;
    checkin_available: boolean;
  }>;
  recent_visits: AfterVisitSummary[];
  unread_messages: number;
  pending_tasks: Array<{
    type: 'questionnaire' | 'consent' | 'payment' | 'insurance';
    title: string;
    due_date?: string;
    priority: string;
  }>;
  health_reminders: Array<{
    type: 'medication' | 'appointment' | 'screening';
    message: string;
    due_date: string;
  }>;
}

export interface CheckinWorkflow {
  session_id: string;
  current_step: number;
  total_steps: number;
  steps: Array<{
    id: string;
    title: string;
    component: string;
    required: boolean;
    completed: boolean;
    data?: any;
  }>;
  can_proceed: boolean;
  estimated_completion_time: number;
}

export interface MessageThread {
  thread_id: string;
  subject: string;
  participants: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  messages: SecureMessage[];
  last_message_at: string;
  unread_count: number;
  priority: string;
  status: 'active' | 'closed' | 'archived';
}

export interface PatientEducationRecommendation {
  material_id: string;
  title: string;
  relevance_score: number;
  reason: string;
  estimated_reading_time: number;
  difficulty_level: string;
  content_preview: string;
}

export interface DigitalConsentWorkflow {
  form_id: string;
  form_title: string;
  form_content: string;
  signature_required: boolean;
  witness_required: boolean;
  consent_status: 'pending' | 'signed' | 'declined';
  signature_data?: {
    signature_image: string;
    signed_at: string;
    ip_address: string;
  };
}

export interface AppointmentPreparation {
  appointment_id: string;
  checklist: Array<{
    id: string;
    task: string;
    completed: boolean;
    required: boolean;
    due_date?: string;
  }>;
  questionnaires: PreVisitQuestionnaire[];
  educational_materials: PatientEducationMaterial[];
  preparation_score: number;
  estimated_completion_time: number;
}

export interface PatientNotificationPreferences {
  patient_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  notification_types: {
    appointment_reminders: boolean;
    test_results: boolean;
    medication_reminders: boolean;
    educational_content: boolean;
    billing_updates: boolean;
  };
  preferred_language: string;
  quiet_hours: {
    start_time: string;
    end_time: string;
  };
}

export interface HealthDataSummary {
  patient_id: string;
  time_period: {
    start_date: string;
    end_date: string;
  };
  vital_signs_trend: Array<{
    date: string;
    blood_pressure: string;
    heart_rate: number;
    weight: number;
    temperature: number;
  }>;
  lab_results_summary: Array<{
    test_name: string;
    latest_value: string;
    trend: 'improving' | 'stable' | 'concerning';
    reference_range: string;
  }>;
  medication_adherence: {
    overall_score: number;
    missed_doses: number;
    adherence_by_medication: Array<{
      medication: string;
      adherence_percentage: number;
    }>;
  };
  upcoming_screenings: Array<{
    screening_type: string;
    due_date: string;
    overdue: boolean;
  }>;
}