-- Phase 2: Nurse Workflow Enhancement Database Schema
-- Triage Assessment, MAR, and Medication Reconciliation

-- ESI Triage Assessments
CREATE TABLE IF NOT EXISTS triage_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  nurse_id UUID REFERENCES profiles(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- ESI Scoring (Emergency Severity Index 1-5)
  esi_level INTEGER CHECK (esi_level >= 1 AND esi_level <= 5),
  chief_complaint TEXT NOT NULL,
  vital_signs JSONB,
  pain_score INTEGER CHECK (pain_score >= 0 AND pain_score <= 10),
  
  -- Triage Decision Points
  requires_immediate_attention BOOLEAN DEFAULT FALSE,
  high_risk_situation BOOLEAN DEFAULT FALSE,
  resource_needs TEXT[],
  
  -- Assessment Details
  presenting_symptoms TEXT[],
  allergies_verified BOOLEAN DEFAULT FALSE,
  medications_reviewed BOOLEAN DEFAULT FALSE,
  isolation_precautions TEXT,
  
  -- Timing
  triage_start_time TIMESTAMPTZ DEFAULT NOW(),
  triage_complete_time TIMESTAMPTZ,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication Reconciliation
CREATE TABLE IF NOT EXISTS medication_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  nurse_id UUID REFERENCES profiles(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Reconciliation Data
  home_medications JSONB, -- Array of current medications
  discontinued_medications JSONB, -- Medications stopped
  new_medications JSONB, -- Newly prescribed
  
  -- Verification Status
  patient_verified BOOLEAN DEFAULT FALSE,
  pharmacy_verified BOOLEAN DEFAULT FALSE,
  physician_reviewed BOOLEAN DEFAULT FALSE,
  
  -- Discrepancies
  discrepancies_found BOOLEAN DEFAULT FALSE,
  discrepancy_details TEXT,
  resolution_notes TEXT,
  
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication Administration Record (MAR)
CREATE TABLE IF NOT EXISTS medication_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id),
  medication_name TEXT NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_times TIME[], -- Array of times for the day
  frequency TEXT, -- 'once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'prn'
  
  -- Medication Details
  dosage TEXT NOT NULL,
  route TEXT, -- 'oral', 'iv', 'im', 'topical', etc.
  instructions TEXT,
  
  -- Safety Checks
  requires_double_check BOOLEAN DEFAULT FALSE,
  high_alert_medication BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MAR Administration Records
CREATE TABLE IF NOT EXISTS mar_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_schedule_id UUID REFERENCES medication_schedules(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Administration Details
  scheduled_time TIMESTAMPTZ NOT NULL,
  actual_time TIMESTAMPTZ,
  administered_by UUID REFERENCES profiles(id),
  witness_id UUID REFERENCES profiles(id), -- For high-risk medications
  
  -- Status
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'given', 'refused', 'held', 'missed'
  reason_not_given TEXT,
  
  -- Effectiveness (for PRN medications)
  effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 10),
  effectiveness_notes TEXT,
  
  -- Documentation
  administration_notes TEXT,
  side_effects_observed TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care Plan Compliance Tracking
CREATE TABLE IF NOT EXISTS care_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Care Item Details
  care_item_type TEXT NOT NULL, -- 'assessment', 'intervention', 'education', 'monitoring'
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT, -- 'once_per_shift', 'every_4_hours', 'daily', 'prn'
  
  -- Scheduling
  start_date DATE,
  end_date DATE,
  next_due TIMESTAMPTZ,
  
  -- Priority and Status
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'discontinued'
  
  -- Assignment
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Care Plan Compliance Records
CREATE TABLE IF NOT EXISTS care_plan_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_item_id UUID REFERENCES care_plan_items(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Compliance Details
  due_time TIMESTAMPTZ NOT NULL,
  completed_time TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'overdue', 'skipped'
  compliance_percentage INTEGER CHECK (compliance_percentage >= 0 AND compliance_percentage <= 100),
  
  -- Documentation
  notes TEXT,
  outcome TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_triage_assessments_patient ON triage_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_nurse ON triage_assessments(nurse_id);
CREATE INDEX IF NOT EXISTS idx_triage_assessments_esi ON triage_assessments(esi_level);
CREATE INDEX IF NOT EXISTS idx_medication_reconciliation_patient ON medication_reconciliation(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedules_patient ON medication_schedules(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_mar_administrations_schedule ON mar_administrations(medication_schedule_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_items_patient ON care_plan_items(patient_id);
CREATE INDEX IF NOT EXISTS idx_care_plan_compliance_item ON care_plan_compliance(care_plan_item_id);