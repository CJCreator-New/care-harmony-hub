-- Phase 7: Analytics & Population Health
-- Clinical Quality Dashboard & Population Health Tools

-- Care gaps identification and tracking
CREATE TABLE care_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  measure_type TEXT NOT NULL, -- diabetes_hba1c, mammography, colonoscopy, blood_pressure
  measure_category TEXT NOT NULL, -- preventive, chronic_care, screening
  gap_description TEXT NOT NULL,
  due_date DATE,
  completed_date DATE,
  status TEXT DEFAULT 'open', -- open, closed, overdue, scheduled
  priority_level INTEGER DEFAULT 2, -- 1=low, 2=medium, 3=high, 4=critical
  assigned_provider_id UUID REFERENCES profiles(id),
  intervention_notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality measures tracking (HEDIS, CMS, etc.)
CREATE TABLE quality_measures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measure_code TEXT NOT NULL, -- CDC-A1C-9, BCS-E, COL-E
  measure_name TEXT NOT NULL,
  measure_description TEXT,
  measure_type TEXT NOT NULL, -- process, outcome, structure
  target_population TEXT, -- diabetes, women_50_74, adults_50_75
  numerator_criteria JSONB,
  denominator_criteria JSONB,
  exclusion_criteria JSONB,
  target_rate DECIMAL(5,2), -- Target percentage
  reporting_period TEXT DEFAULT 'annual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient quality measure compliance
CREATE TABLE patient_quality_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  measure_id UUID REFERENCES quality_measures(id),
  compliance_status TEXT NOT NULL, -- compliant, non_compliant, excluded
  compliance_date DATE,
  next_due_date DATE,
  compliance_value TEXT, -- Actual value (e.g., "7.2%" for HbA1c)
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider performance scorecards
CREATE TABLE provider_scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES profiles(id),
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  total_patients INTEGER DEFAULT 0,
  quality_scores JSONB, -- Scores by measure
  patient_satisfaction_score DECIMAL(3,2),
  productivity_metrics JSONB,
  financial_metrics JSONB,
  peer_ranking INTEGER,
  improvement_areas TEXT[],
  achievements TEXT[],
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Population health cohorts
CREATE TABLE population_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_name TEXT NOT NULL,
  cohort_description TEXT,
  inclusion_criteria JSONB NOT NULL,
  exclusion_criteria JSONB,
  target_size INTEGER,
  current_size INTEGER DEFAULT 0,
  risk_stratification JSONB, -- High, medium, low risk definitions
  intervention_protocols JSONB,
  outcome_measures TEXT[],
  is_active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient cohort membership
CREATE TABLE patient_cohort_membership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  cohort_id UUID REFERENCES population_cohorts(id),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  risk_level TEXT, -- high, medium, low
  last_contact_date DATE,
  next_outreach_date DATE,
  status TEXT DEFAULT 'active', -- active, inactive, graduated, lost_to_followup
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical outcomes tracking
CREATE TABLE clinical_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  outcome_type TEXT NOT NULL, -- readmission, mortality, infection, complication
  outcome_date DATE NOT NULL,
  severity_level TEXT, -- mild, moderate, severe, critical
  related_diagnosis TEXT,
  related_procedure TEXT,
  preventable BOOLEAN,
  root_cause_analysis TEXT,
  improvement_actions TEXT[],
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk stratification scores
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  score_type TEXT NOT NULL, -- charlson, frailty, falls, readmission
  score_value DECIMAL(5,2) NOT NULL,
  risk_category TEXT, -- low, moderate, high, very_high
  calculated_date DATE DEFAULT CURRENT_DATE,
  factors_considered JSONB,
  recommendations TEXT[],
  valid_until DATE,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Population health interventions
CREATE TABLE population_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_name TEXT NOT NULL,
  intervention_type TEXT NOT NULL, -- education, outreach, care_management, screening
  target_cohort_id UUID REFERENCES population_cohorts(id),
  start_date DATE NOT NULL,
  end_date DATE,
  intervention_protocol TEXT,
  success_metrics JSONB,
  cost_per_patient DECIMAL(10,2),
  expected_outcomes TEXT[],
  status TEXT DEFAULT 'planned', -- planned, active, completed, cancelled
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intervention outcomes tracking
CREATE TABLE intervention_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES population_interventions(id),
  patient_id UUID REFERENCES patients(id),
  participation_status TEXT, -- enrolled, completed, dropped_out, excluded
  baseline_metrics JSONB,
  follow_up_metrics JSONB,
  outcome_achieved BOOLEAN,
  cost_savings DECIMAL(10,2),
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_care_gaps_patient ON care_gaps(patient_id);
CREATE INDEX idx_care_gaps_status ON care_gaps(status, due_date);
CREATE INDEX idx_care_gaps_provider ON care_gaps(assigned_provider_id);
CREATE INDEX idx_quality_compliance_patient ON patient_quality_compliance(patient_id);
CREATE INDEX idx_quality_compliance_measure ON patient_quality_compliance(measure_id);
CREATE INDEX idx_provider_scorecards_provider ON provider_scorecards(provider_id);
CREATE INDEX idx_cohort_membership_patient ON patient_cohort_membership(patient_id);
CREATE INDEX idx_cohort_membership_cohort ON patient_cohort_membership(cohort_id);
CREATE INDEX idx_risk_scores_patient ON risk_scores(patient_id, score_type);
CREATE INDEX idx_clinical_outcomes_patient ON clinical_outcomes(patient_id);
CREATE INDEX idx_intervention_outcomes_patient ON intervention_outcomes(patient_id);

-- Sample quality measures (HEDIS/CMS)
INSERT INTO quality_measures (measure_code, measure_name, measure_description, measure_type, target_population, target_rate) VALUES
('CDC-A1C-9', 'Diabetes HbA1c Control (<9%)', 'Percentage of patients 18-75 years with diabetes whose HbA1c is <9%', 'process', 'diabetes_patients', 80.0),
('BCS-E', 'Breast Cancer Screening', 'Percentage of women 50-74 years who had mammography to screen for breast cancer', 'process', 'women_50_74', 75.0),
('COL-E', 'Colorectal Cancer Screening', 'Percentage of adults 50-75 years who had appropriate screening for colorectal cancer', 'process', 'adults_50_75', 70.0),
('CBP', 'Controlling High Blood Pressure', 'Percentage of patients 18-85 years with hypertension whose BP is <140/90', 'outcome', 'hypertension_patients', 70.0),
('CCS', 'Cervical Cancer Screening', 'Percentage of women 21-64 years who were screened for cervical cancer', 'process', 'women_21_64', 80.0);

-- Sample population cohorts
INSERT INTO population_cohorts (cohort_name, cohort_description, inclusion_criteria, target_size) VALUES
('Diabetes Management', 'Patients with Type 2 Diabetes requiring intensive management', '{"diagnosis_codes": ["E11"], "age_range": "18-75", "hba1c": ">8.0"}', 500),
('Hypertension Control', 'Patients with uncontrolled hypertension', '{"diagnosis_codes": ["I10"], "bp_systolic": ">140", "bp_diastolic": ">90"}', 300),
('Preventive Care Gaps', 'Patients overdue for preventive screenings', '{"overdue_screenings": ["mammography", "colonoscopy", "cervical_cancer"]}', 1000),
('High-Risk Elderly', 'Elderly patients at high risk for falls and readmissions', '{"age": ">75", "risk_factors": ["falls_history", "polypharmacy", "cognitive_impairment"]}', 200);

-- Sample care gaps
INSERT INTO care_gaps (patient_id, measure_type, measure_category, gap_description, due_date, status, priority_level, hospital_id) VALUES
(gen_random_uuid(), 'diabetes_hba1c', 'chronic_care', 'HbA1c test overdue - last result >9%', CURRENT_DATE + INTERVAL '30 days', 'open', 3, gen_random_uuid()),
(gen_random_uuid(), 'mammography', 'preventive', 'Annual mammography screening overdue', CURRENT_DATE - INTERVAL '60 days', 'overdue', 2, gen_random_uuid()),
(gen_random_uuid(), 'colonoscopy', 'screening', 'Colorectal cancer screening due', CURRENT_DATE + INTERVAL '90 days', 'open', 2, gen_random_uuid()),
(gen_random_uuid(), 'blood_pressure', 'chronic_care', 'Blood pressure check overdue - last reading elevated', CURRENT_DATE + INTERVAL '14 days', 'open', 3, gen_random_uuid());

-- Sample population interventions
INSERT INTO population_interventions (intervention_name, intervention_type, start_date, intervention_protocol, success_metrics, status, hospital_id) VALUES
('Diabetes Self-Management Education', 'education', CURRENT_DATE, 'Group education sessions on diabetes management, nutrition, and medication adherence', '{"hba1c_improvement": ">0.5%", "medication_adherence": ">80%"}', 'active', gen_random_uuid()),
('Hypertension Medication Adherence Program', 'care_management', CURRENT_DATE, 'Pharmacist-led medication review and adherence counseling', '{"bp_control_rate": ">70%", "medication_adherence": ">85%"}', 'active', gen_random_uuid()),
('Preventive Care Outreach Campaign', 'outreach', CURRENT_DATE, 'Automated reminders and care coordinator follow-up for overdue screenings', '{"screening_completion_rate": ">60%"}', 'active', gen_random_uuid());