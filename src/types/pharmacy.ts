// Phase 4: Pharmacy Enhancement Types
// E-Prescribe Infrastructure & Enhanced Drug Safety

export interface EPrescription {
  id: string;
  prescription_id: string;
  ncpdp_script_xml: string;
  transmission_status: 'pending' | 'transmitted' | 'received' | 'error';
  pharmacy_ncpdp_id?: string;
  transmitted_at?: string;
  response_received_at?: string;
  response_status?: string;
  error_message?: string;
  hospital_id: string;
  created_at: string;
}

export interface FormularyDrug {
  id: string;
  drug_name: string;
  generic_name?: string;
  ndc_number?: string;
  tier_level: number;
  prior_auth_required: boolean;
  quantity_limits?: {
    max_quantity: number;
    days_supply: number;
    refill_limits?: number;
  };
  step_therapy_required: boolean;
  preferred_alternatives?: string[];
  hospital_id: string;
  created_at: string;
}

export interface DrugInteraction {
  id: string;
  drug1_name: string;
  drug2_name: string;
  interaction_type: 'contraindicated' | 'major' | 'moderate' | 'minor';
  severity_level: 1 | 2 | 3 | 4 | 5;
  mechanism: string;
  clinical_effect: string;
  management_strategy: string;
  evidence_level: 'A' | 'B' | 'C' | 'D';
  created_at: string;
}

export interface DoseAdjustment {
  id: string;
  drug_name: string;
  adjustment_type: 'renal' | 'hepatic' | 'age' | 'weight';
  condition_criteria: {
    creatinine_clearance?: Record<string, string>;
    egfr?: Record<string, string>;
    age_years?: Record<string, string>;
    weight_kg?: Record<string, string>;
  };
  dose_modification: {
    percentage_reduction?: number;
    frequency_change?: string;
    max_dose?: string;
  };
  monitoring_requirements: string[];
  contraindications: string[];
  created_at: string;
}

export interface PediatricDosing {
  id: string;
  drug_name: string;
  age_group: 'neonate' | 'infant' | 'child' | 'adolescent';
  weight_based_dose: {
    dose_mg_per_kg: number;
    min_weight_kg?: number;
    max_weight_kg?: number;
    min_age_months?: number;
  };
  max_dose: {
    max_single_dose_mg?: number;
    max_daily_dose_mg?: number;
  };
  frequency: string;
  route: string;
  special_considerations: string[];
  created_at: string;
}

export interface PregnancyLactationSafety {
  id: string;
  drug_name: string;
  pregnancy_category: 'A' | 'B' | 'C' | 'D' | 'X';
  lactation_risk: 'compatible' | 'caution' | 'contraindicated';
  trimester_specific_risks: {
    first_trimester?: string;
    second_trimester?: string;
    third_trimester?: string;
    all_trimesters?: string;
  };
  lactation_considerations: string;
  alternative_drugs: string[];
  created_at: string;
}

export interface TherapeuticClass {
  id: string;
  drug_name: string;
  therapeutic_class: string;
  subclass?: string;
  mechanism_of_action: string;
  created_at: string;
}

export interface PriorAuthorization {
  id: string;
  prescription_id: string;
  insurance_plan: string;
  request_status: 'pending' | 'submitted' | 'approved' | 'denied' | 'appealed';
  submitted_at?: string;
  approved_at?: string;
  denied_at?: string;
  denial_reason?: string;
  appeal_submitted: boolean;
  supporting_documents?: {
    diagnosis_codes: string[];
    clinical_notes: string;
    lab_results?: string[];
    prior_therapies?: string[];
  };
  hospital_id: string;
  created_at: string;
}

export interface MedicationCounseling {
  id: string;
  prescription_id: string;
  patient_id: string;
  pharmacist_id: string;
  counseling_type: 'initial' | 'refill' | 'adherence' | 'side_effects';
  topics_covered: string[];
  patient_understanding_level: 'excellent' | 'good' | 'fair' | 'poor';
  adherence_barriers?: {
    cost_concerns: boolean;
    side_effects: boolean;
    complexity: boolean;
    forgetfulness: boolean;
    other: string;
  };
  follow_up_needed: boolean;
  follow_up_date?: string;
  hospital_id: string;
  created_at: string;
}

export interface SigTemplate {
  id: string;
  template_name: string;
  route: string;
  frequency_code: string;
  frequency_description: string;
  duration_type: 'days' | 'weeks' | 'months' | 'ongoing';
  special_instructions: string[];
  created_at: string;
}

// Enhanced prescription interface with pharmacy features
export interface EnhancedPrescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  refills: number;
  instructions: string;
  
  // Enhanced pharmacy fields
  ndc_number?: string;
  generic_substitution_allowed: boolean;
  daw_code?: number; // Dispense As Written
  sig_code?: string;
  formulary_status?: 'preferred' | 'non-preferred' | 'not-covered';
  prior_auth_required?: boolean;
  quantity_limits_exceeded?: boolean;
  
  // Safety checks
  drug_interactions?: DrugInteraction[];
  dose_adjustments?: DoseAdjustment[];
  pregnancy_warnings?: PregnancyLactationSafety;
  pediatric_considerations?: PediatricDosing;
  therapeutic_duplications?: string[];
  
  // E-prescribe data
  e_prescription?: EPrescription;
  prior_authorization?: PriorAuthorization;
  counseling_records?: MedicationCounseling[];
  
  status: 'draft' | 'sent' | 'received' | 'dispensed' | 'cancelled';
  hospital_id: string;
  created_at: string;
  updated_at: string;
}

// Drug safety alert interface
export interface DrugSafetyAlert {
  type: 'interaction' | 'dose_adjustment' | 'pregnancy' | 'pediatric' | 'duplication' | 'allergy';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  message: string;
  recommendation: string;
  override_reason?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

// Dose calculation interface
export interface DoseCalculation {
  patient_weight_kg?: number;
  patient_age_years?: number;
  creatinine_clearance?: number;
  indication: string;
  calculated_dose: {
    amount: number;
    unit: string;
    frequency: string;
  };
  max_dose?: {
    amount: number;
    unit: string;
    period: string;
  };
  adjustments_applied: string[];
  warnings: string[];
}

// Pharmacy workflow status
export interface PharmacyWorkflowStatus {
  prescription_id: string;
  received_at: string;
  verified_at?: string;
  prepared_at?: string;
  checked_at?: string;
  dispensed_at?: string;
  counseled_at?: string;
  pharmacist_id?: string;
  technician_id?: string;
  notes?: string;
  status: 'received' | 'verified' | 'prepared' | 'checked' | 'dispensed' | 'counseled' | 'completed';
}

export interface NCPDPScript {
  message_id: string;
  from_qualifier: string;
  to_qualifier: string;
  message_type: 'NEWRX' | 'RXCHG' | 'RXFILL' | 'CANRX';
  patient_info: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: 'M' | 'F';
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    phone?: string;
  };
  prescriber_info: {
    npi: string;
    dea: string;
    first_name: string;
    last_name: string;
    clinic_name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    phone: string;
  };
  medication_info: {
    drug_description: string;
    strength: string;
    dosage_form: string;
    quantity: number;
    days_supply: number;
    refills: number;
    substitutions: number; // 0 = substitution allowed, 1 = no substitution
    sig: string;
    ndc?: string;
  };
  pharmacy_info?: {
    ncpdp_id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    phone: string;
  };
}