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