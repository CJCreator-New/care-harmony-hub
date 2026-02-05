-- Consolidated migration group: analytics_ai
-- Generated: 2026-02-04 18:14:19
-- Source migrations: 5

-- ============================================
-- Migration: 20241220000006_ai_clinical_support.sql
-- ============================================

-- Create AI clinical analyses table
CREATE TABLE IF NOT EXISTS ai_clinical_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id),
  clinical_data JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('symptom_analysis', 'risk_assessment', 'drug_interaction', 'treatment_recommendation')),
  confidence_score DECIMAL(3,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create drug interactions table
CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_a TEXT NOT NULL,
  drug_b TEXT NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('major', 'moderate', 'minor')),
  severity TEXT NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  description TEXT NOT NULL,
  mechanism TEXT,
  clinical_effects TEXT[],
  management_recommendations TEXT[],
  evidence_level TEXT CHECK (evidence_level IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drug_a, drug_b)
);

-- Create clinical guidelines table
CREATE TABLE IF NOT EXISTS clinical_guidelines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  condition TEXT NOT NULL,
  guideline_type TEXT NOT NULL CHECK (guideline_type IN ('diagnosis', 'treatment', 'monitoring', 'prevention')),
  title TEXT NOT NULL,
  description TEXT,
  recommendations JSONB NOT NULL,
  evidence_level TEXT CHECK (evidence_level IN ('A', 'B', 'C', 'D')),
  source_organization TEXT,
  publication_date DATE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Create patient risk scores table
CREATE TABLE IF NOT EXISTS patient_risk_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  risk_type TEXT NOT NULL CHECK (risk_type IN ('cardiovascular', 'diabetes', 'fall_risk', 'readmission', 'mortality')),
  score DECIMAL(5,4) NOT NULL CHECK (score >= 0 AND score <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  factors_considered JSONB,
  recommendations TEXT[],
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  calculated_by UUID REFERENCES auth.users(id),
  valid_until TIMESTAMPTZ,
  UNIQUE(patient_id, risk_type, calculated_at)
);

-- Create AI model performance tracking
CREATE TABLE IF NOT EXISTS ai_model_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  performance_metric TEXT NOT NULL,
  metric_value DECIMAL(5,4),
  evaluation_date TIMESTAMPTZ DEFAULT NOW(),
  dataset_size INTEGER,
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_analyses_patient_id ON ai_clinical_analyses(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_type ON ai_clinical_analyses(analysis_type);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_created_at ON ai_clinical_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_drug_interactions_drugs ON drug_interactions(drug_a, drug_b);
CREATE INDEX IF NOT EXISTS idx_clinical_guidelines_condition ON clinical_guidelines(condition);
CREATE INDEX IF NOT EXISTS idx_patient_risk_scores_patient ON patient_risk_scores(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_risk_scores_type ON patient_risk_scores(risk_type);

-- Insert sample drug interactions
INSERT INTO drug_interactions (drug_a, drug_b, interaction_type, severity, description, clinical_effects, management_recommendations, evidence_level) VALUES
('warfarin', 'aspirin', 'major', 'high', 'Increased risk of bleeding due to additive anticoagulant effects', 
 ARRAY['Increased bleeding risk', 'Prolonged bleeding time', 'Risk of hemorrhage'], 
 ARRAY['Monitor INR closely', 'Consider alternative antiplatelet therapy', 'Educate patient on bleeding signs'], 'A'),
('metformin', 'contrast_dye', 'moderate', 'medium', 'Risk of lactic acidosis in patients with renal impairment', 
 ARRAY['Lactic acidosis', 'Acute kidney injury'], 
 ARRAY['Hold metformin 48 hours before contrast', 'Check kidney function', 'Resume after normal creatinine'], 'B'),
('digoxin', 'furosemide', 'moderate', 'medium', 'Hypokalemia from diuretic may increase digoxin toxicity', 
 ARRAY['Digoxin toxicity', 'Cardiac arrhythmias'], 
 ARRAY['Monitor potassium levels', 'Monitor digoxin levels', 'Consider potassium supplementation'], 'B')
ON CONFLICT (drug_a, drug_b) DO NOTHING;

-- Insert sample clinical guidelines
INSERT INTO clinical_guidelines (condition, guideline_type, title, description, recommendations, evidence_level, source_organization) VALUES
('hypertension', 'treatment', 'Hypertension Management Guidelines', 'Evidence-based approach to hypertension treatment',
 '{"first_line": ["ACE inhibitors", "ARBs", "Calcium channel blockers", "Thiazide diuretics"], "target_bp": "< 130/80 mmHg", "lifestyle": ["Low sodium diet", "Regular exercise", "Weight management"]}',
 'A', 'American Heart Association'),
('diabetes_type_2', 'treatment', 'Type 2 Diabetes Management', 'Comprehensive diabetes care guidelines',
 '{"first_line": ["Metformin", "Lifestyle modifications"], "target_hba1c": "< 7%", "monitoring": ["HbA1c every 3 months", "Annual eye exam", "Foot care"]}',
 'A', 'American Diabetes Association'),
('heart_failure', 'treatment', 'Heart Failure Management', 'Evidence-based heart failure treatment approach',
 '{"medications": ["ACE inhibitors", "Beta blockers", "Diuretics"], "monitoring": ["Daily weights", "Symptom assessment"], "lifestyle": ["Fluid restriction", "Low sodium diet"]}',
 'A', 'American College of Cardiology')
ON CONFLICT DO NOTHING;


-- ============================================
-- Migration: 20260110000007_phase7_analytics.sql
-- ============================================

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


-- ============================================
-- Migration: 20260115000002_ai_predictive_analytics.sql
-- ============================================

-- Phase 1: AI Integration Foundation - Database Schema
-- Migration: 20260115000002_ai_predictive_analytics.sql

-- Prediction models table for storing ML model metadata
CREATE TABLE IF NOT EXISTS prediction_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL CHECK (model_type IN ('no_show', 'staffing', 'inventory', 'risk_assessment', 'care_gaps')),
  model_version TEXT NOT NULL,
  accuracy_score DECIMAL(5,4),
  precision_score DECIMAL(5,4),
  recall_score DECIMAL(5,4),
  f1_score DECIMAL(5,4),
  training_data_size INTEGER,
  last_trained TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  model_data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictive alerts for AI-generated insights
CREATE TABLE IF NOT EXISTS predictive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('no_show_risk', 'clinical_risk', 'care_gap', 'inventory_alert', 'staffing_alert')),
  risk_score DECIMAL(5,4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  confidence_level DECIMAL(5,4) CHECK (confidence_level >= 0 AND confidence_level <= 1),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  recommended_action TEXT,
  action_taken BOOLEAN DEFAULT false,
  action_taken_by UUID REFERENCES profiles(id),
  action_taken_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI clinical insights for storing AI-generated clinical support
CREATE TABLE IF NOT EXISTS ai_clinical_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('differential_diagnosis', 'risk_assessment', 'clinical_coding', 'drug_interaction', 'care_recommendation')),
  generated_by TEXT NOT NULL DEFAULT 'ai_system',
  confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  insight_data JSONB NOT NULL,
  human_reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  accuracy_feedback TEXT CHECK (accuracy_feedback IN ('accurate', 'partially_accurate', 'inaccurate')),
  clinical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow automation rules
CREATE TABLE IF NOT EXISTS workflow_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('care_team_assignment', 'follow_up_scheduling', 'task_prioritization', 'alert_generation')),
  trigger_conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  success_rate DECIMAL(5,4),
  execution_count INTEGER DEFAULT 0,
  last_executed TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automated task executions log
CREATE TABLE IF NOT EXISTS automated_task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES workflow_automation_rules(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  execution_status TEXT NOT NULL CHECK (execution_status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  trigger_data JSONB,
  execution_result JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance metrics for AI/automation systems
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('prediction_accuracy', 'automation_success_rate', 'user_satisfaction', 'time_savings')),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  measurement_unit TEXT,
  measurement_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  measurement_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_hospital_patient ON predictive_alerts(hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_type_priority ON predictive_alerts(alert_type, priority);
CREATE INDEX IF NOT EXISTS idx_predictive_alerts_created_at ON predictive_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_ai_clinical_insights_hospital_patient ON ai_clinical_insights(hospital_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_clinical_insights_type ON ai_clinical_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_clinical_insights_consultation ON ai_clinical_insights(consultation_id);

CREATE INDEX IF NOT EXISTS idx_workflow_automation_rules_hospital ON workflow_automation_rules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_workflow_automation_rules_type ON workflow_automation_rules(rule_type);

CREATE INDEX IF NOT EXISTS idx_automated_task_executions_hospital ON automated_task_executions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_automated_task_executions_rule ON automated_task_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_automated_task_executions_status ON automated_task_executions(execution_status);

CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_hospital ON ai_performance_metrics(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_performance_metrics_type ON ai_performance_metrics(metric_type);

-- Add RLS policies
ALTER TABLE prediction_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_clinical_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automated_task_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hospital-scoped access
CREATE POLICY "prediction_models_hospital_access" ON prediction_models
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "predictive_alerts_hospital_access" ON predictive_alerts
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_clinical_insights_hospital_access" ON ai_clinical_insights
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workflow_automation_rules_hospital_access" ON workflow_automation_rules
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "automated_task_executions_hospital_access" ON automated_task_executions
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_performance_metrics_hospital_access" ON ai_performance_metrics
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prediction_models_updated_at BEFORE UPDATE ON prediction_models
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictive_alerts_updated_at BEFORE UPDATE ON predictive_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_clinical_insights_updated_at BEFORE UPDATE ON ai_clinical_insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_automation_rules_updated_at BEFORE UPDATE ON workflow_automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample prediction models
INSERT INTO prediction_models (model_type, model_version, accuracy_score, precision_score, recall_score, f1_score, training_data_size, model_data) VALUES
('no_show', 'v1.0.0', 0.8500, 0.8200, 0.8800, 0.8500, 10000, '{"algorithm": "random_forest", "features": ["age", "previous_no_shows", "appointment_type", "weather"]}'),
('risk_assessment', 'v1.2.1', 0.9200, 0.9000, 0.9400, 0.9200, 25000, '{"algorithm": "gradient_boosting", "features": ["vitals", "lab_results", "medications", "comorbidities"]}'),
('staffing', 'v1.1.0', 0.7800, 0.7500, 0.8100, 0.7800, 5000, '{"algorithm": "linear_regression", "features": ["historical_volume", "day_of_week", "season", "events"]}'),
('inventory', 'v1.0.2', 0.8800, 0.8600, 0.9000, 0.8800, 15000, '{"algorithm": "arima", "features": ["usage_history", "seasonal_patterns", "supplier_lead_times"]}');

-- Insert sample workflow automation rules
INSERT INTO workflow_automation_rules (hospital_id, rule_name, rule_type, trigger_conditions, actions, created_by) 
SELECT 
  h.id,
  'Auto Care Team Assignment for High Acuity',
  'care_team_assignment',
  '{"conditions": [{"field": "acuity_level", "operator": ">=", "value": "high"}]}',
  '{"actions": [{"type": "assign_primary_doctor", "criteria": "specialty_match"}, {"type": "assign_nurse", "criteria": "experience_level"}]}',
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

-- Insert workflow rules for clinical workflows
INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Lab Results Ready Notification',
  'Notify ordering doctor when lab results are completed',
  'lab_results_ready',
  '{}',
  '[{"type": "send_notification", "target_role": "doctor", "target_user": "{{orderedBy}}", "message": "Lab results for {{testName}} are ready for {{patientName}}"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Prescription Review Task',
  'Create task for pharmacist to review new prescriptions',
  'prescription_created',
  '{}',
  '[{"type": "create_task", "target_role": "pharmacist", "message": "Review prescription for {{patientName}} ({{medicationCount}} medications)"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Lab Order Processing',
  'Create task for lab technician when lab order is created',
  'lab_order_created',
  '{}',
  '[{"type": "create_task", "target_role": "lab_technician", "message": "Process {{testName}} for {{patientName}}"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;

INSERT INTO workflow_rules (hospital_id, name, description, trigger_event, trigger_conditions, actions, priority, created_by)
SELECT 
  h.id,
  'Consultation Completion Notification',
  'Notify billing/reception when consultation is completed',
  'consultation_completed',
  '{}',
  '[{"type": "send_notification", "target_role": "receptionist", "message": "Consultation completed for {{patientName}} - ready for checkout"}]',
  1,
  p.id
FROM hospitals h
CROSS JOIN profiles p
WHERE p.role = 'admin'
LIMIT 1;


-- ============================================
-- Migration: 20260116000003_predictive_analytics.sql
-- ============================================

-- Predictive Analytics Migration
-- Phase 1: Week 5-8 Implementation

-- Create queue predictions table
CREATE TABLE IF NOT EXISTS queue_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  appointment_id UUID REFERENCES appointments(id),
  predicted_wait_time INTEGER NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.5,
  prediction_factors JSONB DEFAULT '{}',
  actual_wait_time INTEGER,
  prediction_accuracy NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create no-show predictions table
CREATE TABLE IF NOT EXISTS no_show_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id),
  no_show_probability NUMERIC(3,2) NOT NULL,
  risk_factors TEXT[] DEFAULT '{}',
  prediction_date TIMESTAMPTZ DEFAULT NOW(),
  actual_outcome TEXT CHECK (actual_outcome IN ('attended', 'no_show', 'cancelled')),
  prediction_accuracy NUMERIC(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE queue_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_show_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "hospital_queue_predictions" ON queue_predictions
  FOR ALL TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "hospital_no_show_predictions" ON no_show_predictions
  FOR ALL TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Queue prediction function
CREATE OR REPLACE FUNCTION predict_queue_wait_times(hospital_id_param UUID)
RETURNS TABLE (
  patient_id UUID,
  estimated_wait_time INTEGER,
  confidence_score NUMERIC,
  prediction_factors JSONB
) AS $$
DECLARE
  avg_consultation_time NUMERIC;
  current_queue_length INTEGER;
BEGIN
  -- Calculate average consultation time from recent data
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60), 15)
  INTO avg_consultation_time
  FROM consultations 
  WHERE hospital_id = hospital_id_param 
    AND completed_at > NOW() - INTERVAL '7 days'
    AND status = 'completed';

  -- Get current queue length
  SELECT COUNT(*)
  INTO current_queue_length
  FROM patient_queue pq
  JOIN appointments a ON pq.appointment_id = a.id
  WHERE a.hospital_id = hospital_id_param
    AND pq.status IN ('waiting', 'called');

  RETURN QUERY
  SELECT 
    pq.patient_id,
    (pq.queue_position * avg_consultation_time)::INTEGER as estimated_wait_time,
    CASE 
      WHEN pq.queue_position <= 3 THEN 0.9
      WHEN pq.queue_position <= 6 THEN 0.8
      ELSE 0.7
    END as confidence_score,
    jsonb_build_object(
      'queue_position', pq.queue_position,
      'avg_consultation_time', avg_consultation_time,
      'current_queue_length', current_queue_length,
      'appointment_type', a.appointment_type
    ) as prediction_factors
  FROM patient_queue pq
  JOIN appointments a ON pq.appointment_id = a.id
  WHERE a.hospital_id = hospital_id_param
    AND pq.status IN ('waiting', 'called')
  ORDER BY pq.queue_position;
END;
$$ LANGUAGE plpgsql;

-- No-show prediction function
CREATE OR REPLACE FUNCTION predict_no_show_probability(appointment_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  patient_history RECORD;
  no_show_probability NUMERIC;
  risk_factors TEXT[] := '{}';
  appointment_info RECORD;
BEGIN
  -- Get appointment info
  SELECT a.*, p.date_of_birth, p.phone, p.email
  INTO appointment_info
  FROM appointments a
  JOIN patients p ON a.patient_id = p.id
  WHERE a.id = appointment_id_param;

  -- Get patient appointment history
  SELECT 
    COUNT(*) as total_appointments,
    COUNT(*) FILTER (WHERE status = 'no_show') as no_shows,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancellations
  INTO patient_history
  FROM appointments 
  WHERE patient_id = appointment_info.patient_id
    AND scheduled_date > NOW() - INTERVAL '1 year'
    AND id != appointment_id_param;

  -- Base probability calculation
  no_show_probability := CASE
    WHEN patient_history.total_appointments = 0 THEN 0.15 -- New patient baseline
    ELSE LEAST(0.8, (patient_history.no_shows::NUMERIC / NULLIF(patient_history.total_appointments, 0)) * 1.2)
  END;

  -- Risk factor adjustments
  IF patient_history.no_shows > 1 THEN
    risk_factors := array_append(risk_factors, 'Previous no-shows');
    no_show_probability := no_show_probability + 0.1;
  END IF;

  IF patient_history.cancellations > 2 THEN
    risk_factors := array_append(risk_factors, 'Frequent cancellations');
    no_show_probability := no_show_probability + 0.05;
  END IF;

  -- Time-based factors
  IF EXTRACT(DOW FROM appointment_info.scheduled_date) IN (1, 6) THEN -- Monday or Saturday
    risk_factors := array_append(risk_factors, 'High-risk day');
    no_show_probability := no_show_probability + 0.03;
  END IF;

  RETURN jsonb_build_object(
    'probability', LEAST(0.9, no_show_probability),
    'risk_level', CASE
      WHEN no_show_probability < 0.2 THEN 'low'
      WHEN no_show_probability < 0.4 THEN 'medium'
      WHEN no_show_probability < 0.6 THEN 'high'
      ELSE 'very_high'
    END,
    'risk_factors', risk_factors,
    'total_appointments', patient_history.total_appointments,
    'previous_no_shows', patient_history.no_shows
  );
END;
$$ LANGUAGE plpgsql;

-- Queue optimization function
CREATE OR REPLACE FUNCTION optimize_queue_order(hospital_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  current_queue JSONB;
  optimized_queue JSONB;
BEGIN
  -- Get current queue with priorities
  SELECT jsonb_agg(
    jsonb_build_object(
      'patient_id', pq.patient_id,
      'queue_position', pq.queue_position,
      'priority', a.priority,
      'appointment_type', a.appointment_type,
      'estimated_duration', COALESCE(a.duration_minutes, 15),
      'check_in_time', pq.check_in_time
    ) ORDER BY pq.queue_position
  )
  INTO current_queue
  FROM patient_queue pq
  JOIN appointments a ON pq.appointment_id = a.id
  WHERE a.hospital_id = hospital_id_param
    AND pq.status = 'waiting';

  -- Optimize by priority and duration
  SELECT jsonb_agg(
    queue_item ORDER BY 
      CASE (queue_item->>'priority')::TEXT
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'high' THEN 3
        ELSE 4
      END,
      (queue_item->>'estimated_duration')::INTEGER
  )
  INTO optimized_queue
  FROM jsonb_array_elements(current_queue) AS queue_item;

  RETURN jsonb_build_object(
    'current_queue', current_queue,
    'optimized_queue', optimized_queue,
    'efficiency_gain', 12
  );
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_predictions_hospital ON queue_predictions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_queue_predictions_created ON queue_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_hospital ON no_show_predictions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_no_show_predictions_date ON no_show_predictions(prediction_date);


-- ============================================
-- Migration: 20260128000001_ai_security_compliance.sql
-- ============================================

-- Migration: AI Security and Encryption Tables
-- Phase 1.1.1.3: HIPAA-compliant data handling for AI services

-- AI Encryption Keys Table
-- Stores encryption keys used for AI data protection
CREATE TABLE IF NOT EXISTS ai_encryption_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_id VARCHAR(255) NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL, -- Base64 encoded encrypted key
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('diagnosis', 'treatment', 'education', 'research')),
  key_status VARCHAR(20) DEFAULT 'active' CHECK (key_status IN ('active', 'expired', 'revoked')),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- AI Security Audit Table
-- Comprehensive audit trail for all AI operations
CREATE TABLE IF NOT EXISTS ai_security_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('diagnosis', 'treatment', 'education', 'research')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  result_summary TEXT,
  compliance_status VARCHAR(20) NOT NULL CHECK (compliance_status IN ('compliant', 'warning', 'violation')),
  data_classification VARCHAR(20) DEFAULT 'phi' CHECK (data_classification IN ('phi', 'non_phi', 'deidentified')),
  encryption_key_id VARCHAR(255), -- References ai_encryption_keys.key_id
  processing_duration_ms INTEGER,
  ai_provider VARCHAR(50), -- openai, anthropic, google
  model_used VARCHAR(100),
  token_count INTEGER,
  cost_estimate DECIMAL(10,4),

  -- Additional audit fields
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  risk_score DECIMAL(3,2), -- 0.00 to 1.00
  anomaly_detected BOOLEAN DEFAULT FALSE,
  anomaly_details JSONB,

  CONSTRAINT fk_encryption_key FOREIGN KEY (encryption_key_id)
    REFERENCES ai_encryption_keys(key_id) ON DELETE SET NULL
);

-- AI Data Flow Tracking Table
-- Tracks data movement through AI processing pipeline
CREATE TABLE IF NOT EXISTS ai_data_flow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  data_flow_id VARCHAR(255) NOT NULL UNIQUE, -- De-identified tracking ID
  original_patient_id UUID, -- Encrypted/hashed reference only
  deidentified_patient_id VARCHAR(255) NOT NULL,

  -- Data flow stages
  stage VARCHAR(50) NOT NULL CHECK (stage IN (
    'data_ingestion', 'sanitization', 'encryption', 'ai_processing',
    'decryption', 'response_processing', 'storage', 'cleanup'
  )),
  stage_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stage_status VARCHAR(20) DEFAULT 'completed' CHECK (stage_status IN ('pending', 'processing', 'completed', 'failed')),

  -- Data characteristics (for audit, not content)
  data_size_bytes INTEGER,
  data_fields_count INTEGER,
  phi_detected BOOLEAN DEFAULT FALSE,
  sanitization_applied BOOLEAN DEFAULT TRUE,

  -- Processing metadata
  processing_duration_ms INTEGER,
  ai_provider VARCHAR(50),
  model_used VARCHAR(100),
  token_count INTEGER,

  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(100),

  -- Audit trail
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Compliance Policies Table
-- Hospital-specific AI usage policies and rules
CREATE TABLE IF NOT EXISTS ai_compliance_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  policy_name VARCHAR(255) NOT NULL,
  policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN (
    'data_retention', 'access_control', 'usage_limitation',
    'audit_requirements', 'encryption_standards'
  )),

  -- Policy configuration
  policy_config JSONB NOT NULL, -- Flexible configuration storage
  is_active BOOLEAN DEFAULT TRUE,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_until TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(hospital_id, policy_name, policy_version)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_encryption_keys_hospital ON ai_encryption_keys(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_encryption_keys_expires ON ai_encryption_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_encryption_keys_status ON ai_encryption_keys(key_status);

CREATE INDEX IF NOT EXISTS idx_ai_security_audit_hospital ON ai_security_audit(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_user ON ai_security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_timestamp ON ai_security_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_compliance ON ai_security_audit(compliance_status);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_session ON ai_security_audit(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_data_flow_hospital ON ai_data_flow(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_data_flow_session ON ai_data_flow(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_data_flow_stage ON ai_data_flow(stage, stage_status);
CREATE INDEX IF NOT EXISTS idx_ai_data_flow_patient ON ai_data_flow(deidentified_patient_id);

CREATE INDEX IF NOT EXISTS idx_ai_compliance_policies_hospital ON ai_compliance_policies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_policies_active ON ai_compliance_policies(hospital_id, is_active);

-- Row Level Security Policies

-- AI Encryption Keys
ALTER TABLE ai_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_encryption_keys_hospital_access" ON ai_encryption_keys
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_encryption_keys_system_access" ON ai_encryption_keys
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- AI Security Audit
ALTER TABLE ai_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_security_audit_hospital_access" ON ai_security_audit
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_security_audit_insert" ON ai_security_audit
  FOR INSERT WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

-- AI Data Flow
ALTER TABLE ai_data_flow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_data_flow_hospital_access" ON ai_data_flow
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

-- AI Compliance Policies
ALTER TABLE ai_compliance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_compliance_policies_hospital_access" ON ai_compliance_policies
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_data_flow_updated_at
  BEFORE UPDATE ON ai_data_flow
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_compliance_policies_updated_at
  BEFORE UPDATE ON ai_compliance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ai_encryption_keys IS 'Stores encryption keys for AI data protection with HIPAA compliance';
COMMENT ON TABLE ai_security_audit IS 'Comprehensive audit trail for all AI operations and compliance monitoring';
COMMENT ON TABLE ai_data_flow IS 'Tracks data movement through AI processing pipeline for audit purposes';
COMMENT ON TABLE ai_compliance_policies IS 'Hospital-specific AI usage policies and compliance rules';

-- Insert default compliance policies for all hospitals
INSERT INTO ai_compliance_policies (
  hospital_id,
  policy_name,
  policy_type,
  policy_config,
  created_by
)
SELECT
  h.id as hospital_id,
  'default_data_retention' as policy_name,
  'data_retention' as policy_type,
  '{
    "maxRetentionDays": 90,
    "autoDeletion": true,
    "auditRetention": 2555,
    "phiRetention": 90
  }'::jsonb as policy_config,
  h.admin_user_id as created_by
FROM hospitals h
WHERE NOT EXISTS (
  SELECT 1 FROM ai_compliance_policies
  WHERE hospital_id = h.id AND policy_name = 'default_data_retention'
);

INSERT INTO ai_compliance_policies (
  hospital_id,
  policy_name,
  policy_type,
  policy_config,
  created_by
)
SELECT
  h.id as hospital_id,
  'default_access_control' as policy_name,
  'access_control' as policy_type,
  '{
    "requireMFA": true,
    "maxSessionDuration": 480,
    "allowedRoles": ["admin", "doctor"],
    "auditAllAccess": true
  }'::jsonb as policy_config,
  h.admin_user_id as created_by
FROM hospitals h
WHERE NOT EXISTS (
  SELECT 1 FROM ai_compliance_policies
  WHERE hospital_id = h.id AND policy_name = 'default_access_control'
);

INSERT INTO ai_compliance_policies (
  hospital_id,
  policy_name,
  policy_type,
  policy_config,
  created_by
)
SELECT
  h.id as hospital_id,
  'default_usage_limitation' as policy_name,
  'usage_limitation' as policy_type,
  '{
    "allowedPurposes": ["diagnosis", "treatment", "education"],
    "maxRequestsPerHour": 100,
    "maxTokensPerRequest": 4000,
    "requireApproval": false
  }'::jsonb as policy_config,
  h.admin_user_id as created_by
FROM hospitals h
WHERE NOT EXISTS (
  SELECT 1 FROM ai_compliance_policies
  WHERE hospital_id = h.id AND policy_name = 'default_usage_limitation'
);


