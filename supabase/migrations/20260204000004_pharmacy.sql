-- Consolidated migration group: pharmacy
-- Generated: 2026-02-04 18:14:17
-- Source migrations: 2

-- ============================================
-- Migration: 20260110000004_phase4_pharmacy.sql
-- ============================================

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


-- ============================================
-- Migration: 20260117000001_phase5_clinical_pharmacy.sql
-- ============================================

-- Phase 5: Clinical Pharmacy Services
-- Advanced Clinical Decision Support & Medication Therapy Management

-- Clinical interventions tracking
CREATE TABLE clinical_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id),
  intervention_type TEXT NOT NULL, -- drug_interaction, allergy_alert, dose_error, therapeutic_duplication, contraindication
  severity_level TEXT NOT NULL, -- critical, major, moderate, minor
  description TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  pharmacist_id UUID REFERENCES profiles(id) NOT NULL,
  physician_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, implemented
  outcome TEXT, -- resolved, modified_prescription, patient_educated, monitoring_initiated
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  documentation TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication therapy reviews
CREATE TABLE medication_therapy_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  pharmacist_id UUID REFERENCES profiles(id) NOT NULL,
  review_type TEXT NOT NULL, -- comprehensive, targeted, discharge, adherence
  indications_assessed TEXT[], -- appropriateness, effectiveness, safety, adherence
  drug_therapy_problems JSONB, -- array of identified problems
  recommendations JSONB, -- array of recommendations
  physician_response TEXT, -- accepted, rejected, modified
  patient_education_provided BOOLEAN DEFAULT false,
  follow_up_scheduled BOOLEAN DEFAULT false,
  follow_up_date DATE,
  documentation TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drug utilization review criteria
CREATE TABLE dur_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_name TEXT NOT NULL,
  criteria_type TEXT NOT NULL, -- drug_drug_interaction, drug_disease_interaction, drug_age_interaction, therapeutic_duplication, overuse, underuse
  drug_name TEXT,
  condition_or_drug TEXT, -- for interactions
  age_range JSONB, -- min_age, max_age
  severity_level TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  intervention_required BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DUR findings and analysis results
CREATE TABLE dur_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id),
  criteria_id UUID REFERENCES dur_criteria(id) NOT NULL,
  finding_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  potential_risk TEXT,
  recommendation TEXT,
  pharmacist_reviewed BOOLEAN DEFAULT false,
  pharmacist_id UUID REFERENCES profiles(id),
  resolution_status TEXT DEFAULT 'pending', -- pending, resolved, dismissed
  resolution_notes TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DUR reports for analytics
CREATE TABLE dur_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- daily, weekly, monthly, quarterly
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  total_prescriptions_reviewed INTEGER DEFAULT 0,
  interventions_required INTEGER DEFAULT 0,
  interventions_implemented INTEGER DEFAULT 0,
  cost_savings_estimated DECIMAL(10,2) DEFAULT 0,
  patient_safety_improvements JSONB,
  top_criteria_violations JSONB,
  pharmacist_performance JSONB,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  generated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_clinical_interventions_patient ON clinical_interventions(patient_id);
CREATE INDEX idx_clinical_interventions_status ON clinical_interventions(status);
CREATE INDEX idx_clinical_interventions_pharmacist ON clinical_interventions(pharmacist_id);
CREATE INDEX idx_medication_reviews_patient ON medication_therapy_reviews(patient_id);
CREATE INDEX idx_medication_reviews_type ON medication_therapy_reviews(review_type);
CREATE INDEX idx_dur_criteria_type ON dur_criteria(criteria_type);
CREATE INDEX idx_dur_criteria_active ON dur_criteria(active);
CREATE INDEX idx_dur_findings_patient ON dur_findings(patient_id);
CREATE INDEX idx_dur_findings_status ON dur_findings(resolution_status);
CREATE INDEX idx_dur_reports_period ON dur_reports(report_period_start, report_period_end);
CREATE INDEX idx_dur_reports_hospital ON dur_reports(hospital_id);

-- Row Level Security
ALTER TABLE clinical_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_therapy_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE dur_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE dur_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dur_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Clinical interventions hospital access" ON clinical_interventions
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Medication reviews hospital access" ON medication_therapy_reviews
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "DUR criteria hospital access" ON dur_criteria
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "DUR findings hospital access" ON dur_findings
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "DUR reports hospital access" ON dur_reports
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

-- Sample DUR criteria
INSERT INTO dur_criteria (criteria_name, criteria_type, drug_name, condition_or_drug, severity_level, alert_message, intervention_required) VALUES
('Warfarin-Aspirin Interaction', 'drug_drug_interaction', 'Warfarin', 'Aspirin', 'major', 'Concomitant use increases bleeding risk. Monitor INR closely.', true),
('ACEI-Hyperkalemia Risk', 'drug_disease_interaction', 'Lisinopril', 'Chronic Kidney Disease', 'major', 'Increased risk of hyperkalemia in renal impairment.', true),
('NSAID-GI Bleed Risk', 'drug_disease_interaction', 'Ibuprofen', 'Peptic Ulcer Disease', 'major', 'Increased risk of GI bleeding with NSAID use.', true),
('Beta Blocker-Asthma', 'drug_disease_interaction', 'Metoprolol', 'Asthma', 'moderate', 'Beta blockers may worsen asthma symptoms.', true),
('Duplicate Therapy', 'therapeutic_duplication', 'Lisinopril', 'Losartan', 'moderate', 'Duplicate renin-angiotensin system blockade.', true),
('Pediatric Dose Check', 'drug_age_interaction', 'Codeine', NULL, 'critical', 'Codeine contraindicated in children under 12 due to respiratory depression risk.', true),
('Geriatric High Dose', 'drug_age_interaction', 'Digoxin', NULL, 'moderate', 'High doses in elderly increase toxicity risk.', true);

-- Functions for clinical analysis
CREATE OR REPLACE FUNCTION get_patient_medications(patient_uuid UUID)
RETURNS TABLE (
  prescription_id UUID,
  drug_name TEXT,
  dosage TEXT,
  frequency TEXT,
  start_date DATE,
  end_date DATE
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.drug_name,
    p.dosage,
    p.frequency,
    p.start_date,
    p.end_date
  FROM prescriptions p
  WHERE p.patient_id = patient_uuid
    AND p.status = 'active'
    AND p.end_date >= CURRENT_DATE;
END;
$$;

-- Function to check drug interactions
CREATE OR REPLACE FUNCTION check_drug_interactions(patient_uuid UUID)
RETURNS TABLE (
  drug1 TEXT,
  drug2 TEXT,
  interaction_type TEXT,
  severity_level INTEGER,
  clinical_effect TEXT,
  management_strategy TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm1.drug_name as drug1,
    pm2.drug_name as drug2,
    di.interaction_type,
    di.severity_level,
    di.clinical_effect,
    di.management_strategy
  FROM get_patient_medications(patient_uuid) pm1
  CROSS JOIN get_patient_medications(patient_uuid) pm2
  JOIN drug_interactions di ON (
    (di.drug1_name = pm1.drug_name AND di.drug2_name = pm2.drug_name) OR
    (di.drug1_name = pm2.drug_name AND di.drug2_name = pm1.drug_name)
  )
  WHERE pm1.prescription_id < pm2.prescription_id; -- Avoid duplicates
END;
$$;

-- Function for DUR analysis
CREATE OR REPLACE FUNCTION perform_dur_analysis(patient_uuid UUID)
RETURNS TABLE (
  prescription_id UUID,
  criteria_name TEXT,
  severity TEXT,
  description TEXT,
  recommendation TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  patient_record RECORD;
  prescription_record RECORD;
  criteria_record RECORD;
BEGIN
  -- Check each active prescription against DUR criteria
  FOR prescription_record IN
    SELECT * FROM prescriptions
    WHERE patient_id = patient_uuid
      AND status = 'active'
      AND end_date >= CURRENT_DATE
  LOOP
    -- Get patient demographics
    SELECT * INTO patient_record FROM patients WHERE id = patient_uuid;

    -- Check drug-drug interactions
    FOR criteria_record IN
      SELECT * FROM dur_criteria
      WHERE criteria_type = 'drug_drug_interaction'
        AND active = true
    LOOP
      -- Check if patient is on both drugs
      IF EXISTS (
        SELECT 1 FROM prescriptions p2
        WHERE p2.patient_id = patient_uuid
          AND p2.status = 'active'
          AND p2.end_date >= CURRENT_DATE
          AND p2.drug_name = criteria_record.condition_or_drug
          AND p2.id != prescription_record.id
      ) THEN
        RETURN QUERY SELECT
          prescription_record.id,
          criteria_record.criteria_name,
          criteria_record.severity_level,
          format('Potential interaction between %s and %s', prescription_record.drug_name, criteria_record.condition_or_drug),
          criteria_record.alert_message;
      END IF;
    END LOOP;

    -- Check drug-disease interactions
    FOR criteria_record IN
      SELECT * FROM dur_criteria
      WHERE criteria_type = 'drug_disease_interaction'
        AND drug_name = prescription_record.drug_name
        AND active = true
    LOOP
      -- Check if patient has the condition (simplified - would need more complex logic)
      IF patient_record.medical_history @> jsonb_build_array(criteria_record.condition_or_drug) THEN
        RETURN QUERY SELECT
          prescription_record.id,
          criteria_record.criteria_name,
          criteria_record.severity_level,
          format('Patient with %s taking %s', criteria_record.condition_or_drug, prescription_record.drug_name),
          criteria_record.alert_message;
      END IF;
    END LOOP;

    -- Check age-based criteria
    FOR criteria_record IN
      SELECT * FROM dur_criteria
      WHERE criteria_type = 'drug_age_interaction'
        AND drug_name = prescription_record.drug_name
        AND active = true
    LOOP
      IF criteria_record.age_range IS NOT NULL THEN
        IF (criteria_record.age_range->>'min_age')::int > EXTRACT(YEAR FROM AGE(patient_record.date_of_birth))
           OR (criteria_record.age_range->>'max_age')::int < EXTRACT(YEAR FROM AGE(patient_record.date_of_birth)) THEN
          RETURN QUERY SELECT
            prescription_record.id,
            criteria_record.criteria_name,
            criteria_record.severity_level,
            format('Age-based concern for %s in patient aged %s years', prescription_record.drug_name, EXTRACT(YEAR FROM AGE(patient_record.date_of_birth))),
            criteria_record.alert_message;
        END IF;
      END IF;
    END LOOP;
  END LOOP;

  RETURN;
END;
$$;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clinical_interventions_updated_at
  BEFORE UPDATE ON clinical_interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_reviews_updated_at
  BEFORE UPDATE ON medication_therapy_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dur_findings_updated_at
  BEFORE UPDATE ON dur_findings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


