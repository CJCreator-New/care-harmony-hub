-- Clinical Service Database Schema Migration
-- This migration creates the database schema for the clinical workflow service

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create consultations table
CREATE TABLE IF NOT EXISTS consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  appointment_id UUID,
  hospital_id UUID NOT NULL,
  consultation_type VARCHAR(50) NOT NULL CHECK (consultation_type IN ('initial', 'followup', 'emergency', 'telemedicine')),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled')),
  chief_complaint TEXT NOT NULL, -- Encrypted
  history_of_present_illness TEXT, -- Encrypted
  vital_signs JSONB,
  physical_examination TEXT, -- Encrypted
  assessment TEXT, -- Encrypted
  plan TEXT, -- Encrypted
  diagnosis_codes JSONB, -- Array of ICD-10 codes
  procedure_codes JSONB, -- Array of CPT codes
  medications_prescribed JSONB, -- Array of medication objects
  lab_orders JSONB, -- Array of lab order IDs
  imaging_orders JSONB, -- Array of imaging order IDs
  follow_up_instructions TEXT,
  progress_notes TEXT, -- Encrypted
  clinical_notes TEXT, -- Encrypted
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,

  -- Constraints
  CONSTRAINT fk_consultations_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_consultations_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_consultations_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_consultations_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  CONSTRAINT fk_consultations_created_by FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_consultations_updated_by FOREIGN KEY (updated_by) REFERENCES users(id),

  -- Check constraints
  CONSTRAINT chk_consultation_dates CHECK (started_at IS NULL OR completed_at IS NULL OR started_at <= completed_at)
);

-- Create clinical_workflows table
CREATE TABLE IF NOT EXISTS clinical_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID NOT NULL UNIQUE,
  patient_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN ('consultation', 'admission', 'discharge', 'transfer', 'procedure')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'critical')),
  current_step VARCHAR(100) NOT NULL,
  steps JSONB NOT NULL, -- Array of workflow step objects
  metadata JSONB, -- Additional workflow metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_workflows_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflows_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_workflows_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  record_type VARCHAR(50) NOT NULL CHECK (record_type IN ('consultation', 'lab_result', 'imaging', 'prescription', 'procedure', 'discharge')),
  record_date TIMESTAMPTZ NOT NULL,
  provider_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL, -- Encrypted
  attachments JSONB, -- Array of attachment objects
  tags JSONB, -- Array of tag strings
  is_confidential BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_records_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_records_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE,
  CONSTRAINT fk_records_provider FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create clinical_decision_support table
CREATE TABLE IF NOT EXISTS clinical_decision_support (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL,
  consultation_id UUID,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('drug_interaction', 'allergy_alert', 'duplicate_therapy', 'dose_check', 'diagnosis_suggestion')),
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  recommendations JSONB, -- Array of recommendation strings
  evidence TEXT,
  is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_cds_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_cds_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cds_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_provider_id ON consultations(provider_id);
CREATE INDEX IF NOT EXISTS idx_consultations_hospital_id ON consultations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_type ON consultations(consultation_type);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON consultations(created_at);
CREATE INDEX IF NOT EXISTS idx_consultations_updated_at ON consultations(updated_at);

CREATE INDEX IF NOT EXISTS idx_workflows_consultation_id ON clinical_workflows(consultation_id);
CREATE INDEX IF NOT EXISTS idx_workflows_patient_id ON clinical_workflows(patient_id);
CREATE INDEX IF NOT EXISTS idx_workflows_hospital_id ON clinical_workflows(hospital_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON clinical_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_priority ON clinical_workflows(priority);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON clinical_workflows(workflow_type);

CREATE INDEX IF NOT EXISTS idx_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_records_hospital_id ON medical_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_records_type ON medical_records(record_type);
CREATE INDEX IF NOT EXISTS idx_records_date ON medical_records(record_date);
CREATE INDEX IF NOT EXISTS idx_records_provider_id ON medical_records(provider_id);
CREATE INDEX IF NOT EXISTS idx_records_tags ON medical_records USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_records_confidential ON medical_records(is_confidential);

CREATE INDEX IF NOT EXISTS idx_cds_patient_id ON clinical_decision_support(patient_id);
CREATE INDEX IF NOT EXISTS idx_cds_consultation_id ON clinical_decision_support(consultation_id);
CREATE INDEX IF NOT EXISTS idx_cds_rule_type ON clinical_decision_support(rule_type);
CREATE INDEX IF NOT EXISTS idx_cds_severity ON clinical_decision_support(severity);
CREATE INDEX IF NOT EXISTS idx_cds_acknowledged ON clinical_decision_support(is_acknowledged);
CREATE INDEX IF NOT EXISTS idx_cds_created_at ON clinical_decision_support(created_at);

-- Create Row Level Security policies
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_decision_support ENABLE ROW LEVEL SECURITY;

-- RLS policies for consultations
CREATE POLICY consultations_hospital_isolation ON consultations
  FOR ALL USING (hospital_id = current_setting('app.hospital_id', true)::uuid);

CREATE POLICY consultations_user_access ON consultations
  FOR ALL USING (
    patient_id IN (
      SELECT patient_id FROM user_patients WHERE user_id = current_setting('app.user_id', true)::uuid
    ) OR
    provider_id = current_setting('app.user_id', true)::uuid OR
    created_by = current_setting('app.user_id', true)::uuid
  );

-- RLS policies for clinical_workflows
CREATE POLICY workflows_hospital_isolation ON clinical_workflows
  FOR ALL USING (hospital_id = current_setting('app.hospital_id', true)::uuid);

CREATE POLICY workflows_user_access ON clinical_workflows
  FOR ALL USING (
    patient_id IN (
      SELECT patient_id FROM user_patients WHERE user_id = current_setting('app.user_id', true)::uuid
    ) OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id AND c.provider_id = current_setting('app.user_id', true)::uuid
    )
  );

-- RLS policies for medical_records
CREATE POLICY records_hospital_isolation ON medical_records
  FOR ALL USING (hospital_id = current_setting('app.hospital_id', true)::uuid);

CREATE POLICY records_user_access ON medical_records
  FOR ALL USING (
    patient_id IN (
      SELECT patient_id FROM user_patients WHERE user_id = current_setting('app.user_id', true)::uuid
    ) OR
    provider_id = current_setting('app.user_id', true)::uuid OR
    (NOT is_confidential) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = current_setting('app.user_id', true)::uuid
      AND r.name IN ('admin', 'physician', 'nurse_practitioner')
    )
  );

-- RLS policies for clinical_decision_support
CREATE POLICY cds_hospital_isolation ON clinical_decision_support
  FOR ALL USING (
    patient_id IN (
      SELECT patient_id FROM user_patients WHERE user_id = current_setting('app.user_id', true)::uuid
    ) OR
    EXISTS (
      SELECT 1 FROM consultations c
      WHERE c.id = consultation_id AND c.provider_id = current_setting('app.user_id', true)::uuid
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON consultations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON clinical_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function for workflow step validation
CREATE OR REPLACE FUNCTION validate_workflow_step()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate that current_step exists in steps array
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.steps) AS step
    WHERE step->>'id' = NEW.current_step
  ) THEN
    RAISE EXCEPTION 'current_step must exist in steps array';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for workflow step validation
CREATE TRIGGER validate_workflow_step_trigger
  BEFORE INSERT OR UPDATE ON clinical_workflows
  FOR EACH ROW EXECUTE FUNCTION validate_workflow_step();

-- Insert sample data for testing (optional)
-- This would be removed in production
INSERT INTO consultations (
  patient_id, provider_id, hospital_id, consultation_type, status,
  chief_complaint, created_by, updated_by
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Replace with actual patient UUID
  '00000000-0000-0000-0000-000000000002', -- Replace with actual provider UUID
  '00000000-0000-0000-0000-000000000003', -- Replace with actual hospital UUID
  'initial',
  'scheduled',
  'Patient reports chest pain', -- This will be encrypted
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002'
) ON CONFLICT DO NOTHING;