// Phase 1: Foundation Types
// CPT Codes, Clinical Templates, and SOAP Note structures

export interface CPTCode {
  code: string;
  description: string;
  category: string;
  base_fee: number;
  hospital_id: string;
  created_at: string;
}

export interface ClinicalTemplate {
  id: string;
  name: string;
  type: 'encounter' | 'order_set' | 'medication_bundle' | 'hpi_template';
  specialty: string;
  template_data: TemplateData;
  hospital_id: string;
  created_at: string;
}

export interface TemplateData {
  name: string;
  description: string;
  fields: TemplateField[];
}

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  min?: number;
  max?: number;
  options?: string[];
}

export interface HPIData {
  template_type: 'OLDCARTS' | 'OPQRST';
  onset?: string;
  location?: string;
  duration?: string;
  character?: string;
  aggravating?: string;
  relieving?: string;
  timing?: string;
  severity?: number;
  provocation?: string;
  quality?: string;
  radiation?: string;
}

export interface SOAPNote {
  subjective: {
    chief_complaint: string;
    hpi: HPIData;
    review_of_systems: ReviewOfSystems;
    past_medical_history: string;
    medications: string;
    allergies: string;
    social_history: string;
  };
  objective: {
    vital_signs: VitalSigns;
    physical_exam: PhysicalExam;
    lab_results?: string;
    imaging?: string;
  };
  assessment: {
    diagnoses: DiagnosisWithReasoning[];
    clinical_impression: string;
  };
  plan: {
    treatment_plan: string;
    medications: string;
    follow_up: string;
    patient_education: string;
  };
}

export interface ReviewOfSystems {
  constitutional: boolean;
  eyes: boolean;
  ent: boolean;
  cardiovascular: boolean;
  respiratory: boolean;
  gastrointestinal: boolean;
  genitourinary: boolean;
  musculoskeletal: boolean;
  integumentary: boolean;
  neurological: boolean;
  psychiatric: boolean;
  endocrine: boolean;
  hematologic: boolean;
  allergic: boolean;
  notes: string;
}

export interface PhysicalExam {
  general_appearance: string;
  vital_signs: VitalSigns;
  heent: string;
  cardiovascular: string;
  respiratory: string;
  abdominal: string;
  extremities: string;
  neurological: string;
  skin: string;
  notes: string;
}

export interface VitalSigns {
  temperature: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  weight: number;
  height: number;
  bmi: number;
}

export interface DiagnosisWithReasoning {
  icd10_code: string;
  description: string;
  cpt_codes: string[];
  clinical_reasoning: string;
  differential_diagnoses: string[];
}