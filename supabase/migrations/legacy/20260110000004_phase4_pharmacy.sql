-- Phase 4: Pharmacy Enhancement
-- E-Prescribe Infrastructure & Enhanced Drug Safety

-- NCPDP SCRIPT format prescriptions
CREATE TABLE e_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  ncpdp_script_xml TEXT,
  transmission_status TEXT DEFAULT 'pending',
  pharmacy_ncpdp_id TEXT,
  transmitted_at TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  response_status TEXT,
  error_message TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Formulary management
CREATE TABLE formulary_drugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  generic_name TEXT,
  ndc_number TEXT,
  tier_level INTEGER DEFAULT 1,
  prior_auth_required BOOLEAN DEFAULT false,
  quantity_limits JSONB,
  step_therapy_required BOOLEAN DEFAULT false,
  preferred_alternatives JSONB,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced drug interactions
CREATE TABLE drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug1_name TEXT NOT NULL,
  drug2_name TEXT NOT NULL,
  interaction_type TEXT NOT NULL, -- contraindicated, major, moderate, minor
  severity_level INTEGER NOT NULL, -- 1-5 scale
  mechanism TEXT,
  clinical_effect TEXT,
  management_strategy TEXT,
  evidence_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dose adjustment protocols
CREATE TABLE dose_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  adjustment_type TEXT NOT NULL, -- renal, hepatic, age, weight
  condition_criteria JSONB, -- creatinine clearance ranges, etc.
  dose_modification JSONB, -- percentage reduction, frequency changes
  monitoring_requirements TEXT[],
  contraindications TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pediatric dosing protocols
CREATE TABLE pediatric_dosing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  age_group TEXT, -- neonate, infant, child, adolescent
  weight_based_dose JSONB, -- mg/kg calculations
  max_dose JSONB,
  frequency TEXT,
  route TEXT,
  special_considerations TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pregnancy/lactation safety
CREATE TABLE pregnancy_lactation_safety (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  pregnancy_category TEXT, -- A, B, C, D, X
  lactation_risk TEXT, -- compatible, caution, contraindicated
  trimester_specific_risks JSONB,
  lactation_considerations TEXT,
  alternative_drugs TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapeutic duplication tracking
CREATE TABLE therapeutic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_name TEXT NOT NULL,
  therapeutic_class TEXT NOT NULL,
  subclass TEXT,
  mechanism_of_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prior authorization workflow
CREATE TABLE prior_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  insurance_plan TEXT,
  request_status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ,
  denial_reason TEXT,
  appeal_submitted BOOLEAN DEFAULT false,
  supporting_documents JSONB,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Counseling documentation
CREATE TABLE medication_counseling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id),
  patient_id UUID REFERENCES patients(id),
  pharmacist_id UUID REFERENCES profiles(id),
  counseling_type TEXT, -- initial, refill, adherence
  topics_covered TEXT[],
  patient_understanding_level TEXT,
  adherence_barriers JSONB,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date DATE,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SIG (prescription instructions) builder
CREATE TABLE sig_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  route TEXT,
  frequency_code TEXT,
  frequency_description TEXT,
  duration_type TEXT,
  special_instructions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_e_prescriptions_prescription_id ON e_prescriptions(prescription_id);
CREATE INDEX idx_e_prescriptions_status ON e_prescriptions(transmission_status);
CREATE INDEX idx_formulary_drugs_name ON formulary_drugs(drug_name);
CREATE INDEX idx_drug_interactions_drugs ON drug_interactions(drug1_name, drug2_name);
CREATE INDEX idx_dose_adjustments_drug ON dose_adjustments(drug_name);
CREATE INDEX idx_pediatric_dosing_drug ON pediatric_dosing(drug_name);
CREATE INDEX idx_pregnancy_safety_drug ON pregnancy_lactation_safety(drug_name);
CREATE INDEX idx_therapeutic_classes_drug ON therapeutic_classes(drug_name);
CREATE INDEX idx_prior_auth_prescription ON prior_authorizations(prescription_id);
CREATE INDEX idx_counseling_patient ON medication_counseling(patient_id);

-- Sample data for drug interactions
INSERT INTO drug_interactions (drug1_name, drug2_name, interaction_type, severity_level, mechanism, clinical_effect, management_strategy, evidence_level) VALUES
('Warfarin', 'Aspirin', 'major', 4, 'Additive anticoagulant effects', 'Increased bleeding risk', 'Monitor INR closely, consider PPI', 'A'),
('Digoxin', 'Furosemide', 'moderate', 3, 'Hypokalemia increases digoxin toxicity', 'Arrhythmias, nausea', 'Monitor potassium and digoxin levels', 'B'),
('Metformin', 'Contrast dye', 'major', 4, 'Increased lactic acidosis risk', 'Metabolic acidosis', 'Hold metformin 48h before/after contrast', 'A'),
('ACE inhibitor', 'Potassium supplement', 'moderate', 3, 'Additive hyperkalemia risk', 'Cardiac arrhythmias', 'Monitor serum potassium', 'B');

-- Sample formulary data
INSERT INTO formulary_drugs (drug_name, generic_name, ndc_number, tier_level, prior_auth_required, quantity_limits) VALUES
('Lipitor', 'Atorvastatin', '0071-0155-23', 2, false, '{"max_quantity": 30, "days_supply": 30}'),
('Humira', 'Adalimumab', '0074-3799-02', 3, true, '{"max_quantity": 2, "days_supply": 28}'),
('Metformin', 'Metformin', '0093-1074-01', 1, false, '{"max_quantity": 60, "days_supply": 30}'),
('Nexium', 'Esomeprazole', '0186-0272-31', 2, false, '{"max_quantity": 30, "days_supply": 30}');

-- Sample dose adjustment data
INSERT INTO dose_adjustments (drug_name, adjustment_type, condition_criteria, dose_modification, monitoring_requirements) VALUES
('Digoxin', 'renal', '{"creatinine_clearance": {"<30": "reduce_50_percent", "30-50": "reduce_25_percent"}}', '{"frequency": "daily_to_every_other_day"}', ARRAY['Serum digoxin level', 'Serum creatinine']),
('Metformin', 'renal', '{"egfr": {"<30": "contraindicated", "30-45": "reduce_50_percent"}}', '{"max_dose": "1000mg_daily"}', ARRAY['eGFR', 'Lactic acid level']),
('Gabapentin', 'renal', '{"creatinine_clearance": {"<15": "reduce_75_percent", "15-30": "reduce_50_percent"}}', '{"frequency": "tid_to_daily"}', ARRAY['Serum creatinine', 'Neurological status']);

-- Sample pediatric dosing
INSERT INTO pediatric_dosing (drug_name, age_group, weight_based_dose, max_dose, frequency, route, special_considerations) VALUES
('Acetaminophen', 'infant', '{"dose_mg_per_kg": 15, "min_weight_kg": 3}', '{"max_single_dose_mg": 160}', 'q4-6h', 'PO', ARRAY['Do not exceed 5 doses in 24h', 'Use weight-based dosing']),
('Amoxicillin', 'child', '{"dose_mg_per_kg": 45, "min_age_months": 3}', '{"max_daily_dose_mg": 3000}', 'BID', 'PO', ARRAY['Adjust for severe infections', 'Complete full course']),
('Ibuprofen', 'child', '{"dose_mg_per_kg": 10, "min_age_months": 6}', '{"max_single_dose_mg": 400}', 'q6-8h', 'PO', ARRAY['Avoid in dehydration', 'Take with food']);

-- Sample pregnancy safety data
INSERT INTO pregnancy_lactation_safety (drug_name, pregnancy_category, lactation_risk, trimester_specific_risks, lactation_considerations, alternative_drugs) VALUES
('Warfarin', 'X', 'contraindicated', '{"first_trimester": "teratogenic", "third_trimester": "bleeding_risk"}', 'Passes into breast milk, bleeding risk', ARRAY['Heparin', 'Enoxaparin']),
('Metformin', 'B', 'compatible', '{"all_trimesters": "generally_safe"}', 'Minimal transfer to breast milk', ARRAY['Insulin']),
('Lisinopril', 'D', 'caution', '{"second_third_trimester": "renal_toxicity"}', 'Unknown excretion in breast milk', ARRAY['Methyldopa', 'Labetalol']);

-- Sample therapeutic classes
INSERT INTO therapeutic_classes (drug_name, therapeutic_class, subclass, mechanism_of_action) VALUES
('Lisinopril', 'ACE Inhibitor', 'Cardiovascular', 'Blocks angiotensin-converting enzyme'),
('Losartan', 'ARB', 'Cardiovascular', 'Blocks angiotensin II receptor'),
('Amlodipine', 'Calcium Channel Blocker', 'Cardiovascular', 'Blocks calcium channels'),
('Metoprolol', 'Beta Blocker', 'Cardiovascular', 'Blocks beta-adrenergic receptors'),
('Atorvastatin', 'Statin', 'Lipid-lowering', 'Inhibits HMG-CoA reductase'),
('Simvastatin', 'Statin', 'Lipid-lowering', 'Inhibits HMG-CoA reductase');

-- Sample SIG templates
INSERT INTO sig_templates (template_name, route, frequency_code, frequency_description, duration_type, special_instructions) VALUES
('Standard Oral BID', 'PO', 'BID', 'Take twice daily', 'days', ARRAY['Take with food', 'Complete full course']),
('PRN Pain', 'PO', 'PRN', 'Take as needed for pain', 'days', ARRAY['Do not exceed 4 doses per day', 'Take with food']),
('Insulin Sliding Scale', 'SubQ', 'AC+HS', 'Before meals and at bedtime', 'ongoing', ARRAY['Check blood sugar before each dose', 'Rotate injection sites']),
('Topical BID', 'Topical', 'BID', 'Apply twice daily', 'days', ARRAY['Apply thin layer', 'Wash hands after application']);