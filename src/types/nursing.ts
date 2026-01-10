// Phase 2: Nurse Workflow Types
// Triage, MAR, Medication Reconciliation, and Care Plan Compliance

export interface TriageAssessment {
  id: string;
  patient_id: string;
  appointment_id?: string;
  nurse_id: string;
  hospital_id: string;
  
  // ESI Scoring
  esi_level: 1 | 2 | 3 | 4 | 5;
  chief_complaint: string;
  vital_signs: VitalSigns;
  pain_score: number; // 0-10
  
  // Decision Points
  requires_immediate_attention: boolean;
  high_risk_situation: boolean;
  resource_needs: string[];
  
  // Assessment
  presenting_symptoms: string[];
  allergies_verified: boolean;
  medications_reviewed: boolean;
  isolation_precautions?: string;
  
  // Timing
  triage_start_time: string;
  triage_complete_time?: string;
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MedicationReconciliation {
  id: string;
  patient_id: string;
  appointment_id?: string;
  nurse_id: string;
  hospital_id: string;
  
  // Medication Lists
  home_medications: HomeMedication[];
  discontinued_medications: DiscontinuedMedication[];
  new_medications: NewMedication[];
  
  // Verification
  patient_verified: boolean;
  pharmacy_verified: boolean;
  physician_reviewed: boolean;
  
  // Discrepancies
  discrepancies_found: boolean;
  discrepancy_details?: string;
  resolution_notes?: string;
  
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HomeMedication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  prescriber?: string;
  last_taken?: string;
  still_taking: boolean;
  notes?: string;
}

export interface DiscontinuedMedication {
  name: string;
  dosage: string;
  reason_discontinued: string;
  discontinued_date: string;
  discontinued_by: string;
}

export interface NewMedication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  prescriber: string;
  indication: string;
}

export interface MedicationSchedule {
  id: string;
  patient_id: string;
  prescription_id?: string;
  medication_name: string;
  hospital_id: string;
  
  // Scheduling
  scheduled_date: string;
  scheduled_times: string[]; // Array of time strings
  frequency: 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily' | 'prn';
  
  // Details
  dosage: string;
  route: MedicationRoute;
  instructions?: string;
  
  // Safety
  requires_double_check: boolean;
  high_alert_medication: boolean;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MedicationRoute = 
  | 'oral' 
  | 'iv' 
  | 'im' 
  | 'subcutaneous' 
  | 'topical' 
  | 'inhalation' 
  | 'rectal' 
  | 'sublingual' 
  | 'transdermal';

export interface MARAdministration {
  id: string;
  medication_schedule_id: string;
  patient_id: string;
  hospital_id: string;
  
  // Administration
  scheduled_time: string;
  actual_time?: string;
  administered_by?: string;
  witness_id?: string;
  
  // Status
  status: 'scheduled' | 'given' | 'refused' | 'held' | 'missed';
  reason_not_given?: string;
  
  // Effectiveness (PRN)
  effectiveness_score?: number; // 1-10
  effectiveness_notes?: string;
  
  // Documentation
  administration_notes?: string;
  side_effects_observed?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CarePlanItem {
  id: string;
  patient_id: string;
  hospital_id: string;
  
  // Item Details
  care_item_type: 'assessment' | 'intervention' | 'education' | 'monitoring';
  title: string;
  description?: string;
  frequency: 'once_per_shift' | 'every_4_hours' | 'daily' | 'prn';
  
  // Scheduling
  start_date?: string;
  end_date?: string;
  next_due?: string;
  
  // Priority
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'active' | 'completed' | 'discontinued';
  
  // Assignment
  assigned_to?: string;
  created_by?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CarePlanCompliance {
  id: string;
  care_plan_item_id: string;
  patient_id: string;
  hospital_id: string;
  
  // Compliance
  due_time: string;
  completed_time?: string;
  completed_by?: string;
  
  // Status
  status: 'pending' | 'completed' | 'overdue' | 'skipped';
  compliance_percentage?: number; // 0-100
  
  // Documentation
  notes?: string;
  outcome?: string;
  
  created_at: string;
  updated_at: string;
}

export interface ESILevel {
  level: 1 | 2 | 3 | 4 | 5;
  description: string;
  criteria: string[];
  color: string;
  max_wait_time: string;
}

export const ESI_LEVELS: ESILevel[] = [
  {
    level: 1,
    description: 'Resuscitation',
    criteria: ['Requires immediate life-saving intervention'],
    color: 'red',
    max_wait_time: 'Immediate'
  },
  {
    level: 2,
    description: 'Emergent',
    criteria: ['High-risk situation', 'Severe pain/distress', 'Altered mental status'],
    color: 'orange',
    max_wait_time: '10 minutes'
  },
  {
    level: 3,
    description: 'Urgent',
    criteria: ['Stable vital signs', 'Moderate symptoms', 'Multiple resources needed'],
    color: 'yellow',
    max_wait_time: '30 minutes'
  },
  {
    level: 4,
    description: 'Less Urgent',
    criteria: ['Stable', 'One resource needed', 'Minor symptoms'],
    color: 'green',
    max_wait_time: '60 minutes'
  },
  {
    level: 5,
    description: 'Non-Urgent',
    criteria: ['No resources needed', 'Minor complaint', 'Stable'],
    color: 'blue',
    max_wait_time: '120 minutes'
  }
];

export interface VitalSigns {
  temperature?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
}