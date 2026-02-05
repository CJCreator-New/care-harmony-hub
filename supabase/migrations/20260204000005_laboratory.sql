-- Consolidated migration group: laboratory
-- Generated: 2026-02-04 18:14:18
-- Source migrations: 3

-- ============================================
-- Migration: 20260110000005_phase5_laboratory.sql
-- ============================================

-- Phase 5: Laboratory Enhancement
-- LOINC Code Integration & Critical Value Management

-- LOINC codes standardization
CREATE TABLE loinc_codes (
  code TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  property TEXT,
  time_aspect TEXT,
  system_type TEXT,
  scale_type TEXT,
  method_type TEXT,
  class TEXT,
  reference_range JSONB,
  critical_values JSONB,
  units TEXT,
  specimen_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced lab orders with LOINC
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS loinc_code TEXT REFERENCES loinc_codes(code);
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS specimen_collected_at TIMESTAMPTZ;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS specimen_type TEXT;
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS collection_notes TEXT;

-- Lab results with standardized values
CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID REFERENCES lab_orders(id),
  loinc_code TEXT REFERENCES loinc_codes(code),
  result_value TEXT NOT NULL,
  result_numeric DECIMAL,
  result_unit TEXT,
  reference_range TEXT,
  abnormal_flag TEXT, -- H, L, HH, LL, A
  critical_flag BOOLEAN DEFAULT false,
  result_status TEXT DEFAULT 'final', -- preliminary, final, corrected
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  interpretation TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical value notifications
CREATE TABLE critical_value_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id UUID REFERENCES lab_results(id),
  patient_id UUID REFERENCES patients(id),
  loinc_code TEXT REFERENCES loinc_codes(code),
  critical_value TEXT NOT NULL,
  notification_level INTEGER DEFAULT 1, -- 1=routine, 2=urgent, 3=critical
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  read_back_verified BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  resolution_notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab interpretation rules
CREATE TABLE lab_interpretation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loinc_code TEXT REFERENCES loinc_codes(code),
  condition_type TEXT NOT NULL, -- range, delta, pattern
  condition_criteria JSONB NOT NULL,
  interpretation_text TEXT NOT NULL,
  severity_level TEXT, -- normal, abnormal, critical
  auto_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab trending and analytics
CREATE TABLE lab_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  loinc_code TEXT REFERENCES loinc_codes(code),
  trend_period TEXT NOT NULL, -- 24h, 7d, 30d, 90d
  trend_direction TEXT, -- increasing, decreasing, stable, volatile
  trend_significance TEXT, -- significant, moderate, minimal
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  trend_data JSONB,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality control tracking
CREATE TABLE lab_qc_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loinc_code TEXT REFERENCES loinc_codes(code),
  qc_level TEXT NOT NULL, -- normal, abnormal_low, abnormal_high
  expected_value DECIMAL,
  actual_value DECIMAL,
  variance_percent DECIMAL,
  within_limits BOOLEAN,
  run_date DATE NOT NULL,
  instrument_id TEXT,
  lot_number TEXT,
  technician_id UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_loinc_codes_component ON loinc_codes(component);
CREATE INDEX idx_loinc_codes_class ON loinc_codes(class);
CREATE INDEX idx_lab_orders_loinc ON lab_orders(loinc_code);
CREATE INDEX idx_lab_results_order ON lab_results(lab_order_id);
CREATE INDEX idx_lab_results_loinc ON lab_results(loinc_code);
CREATE INDEX idx_lab_results_patient ON lab_results(lab_order_id, loinc_code);
CREATE INDEX idx_critical_notifications_patient ON critical_value_notifications(patient_id);
CREATE INDEX idx_critical_notifications_status ON critical_value_notifications(acknowledged_at);
CREATE INDEX idx_lab_trends_patient_loinc ON lab_trends(patient_id, loinc_code);
CREATE INDEX idx_qc_results_date ON lab_qc_results(run_date);

-- Sample LOINC codes data
INSERT INTO loinc_codes (code, component, property, time_aspect, system_type, scale_type, method_type, class, reference_range, critical_values, units, specimen_type) VALUES
('33747-0', 'Hemoglobin', 'MCnc', 'Pt', 'Bld', 'Qn', 'Automated count', 'HEMATOLOGY/CELL COUNTS', '{"male": "13.8-17.2", "female": "12.1-15.1"}', '{"low": "<7.0", "high": ">20.0"}', 'g/dL', 'Blood'),
('6690-2', 'Leukocytes', 'NCnc', 'Pt', 'Bld', 'Qn', 'Automated count', 'HEMATOLOGY/CELL COUNTS', '{"normal": "4.5-11.0"}', '{"low": "<1.0", "high": ">50.0"}', '10*3/uL', 'Blood'),
('777-3', 'Platelets', 'NCnc', 'Pt', 'Bld', 'Qn', 'Automated count', 'HEMATOLOGY/CELL COUNTS', '{"normal": "150-450"}', '{"low": "<50", "high": ">1000"}', '10*3/uL', 'Blood'),
('2951-2', 'Sodium', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Ion selective electrode', 'CHEMISTRY', '{"normal": "136-145"}', '{"low": "<120", "high": ">160"}', 'mmol/L', 'Serum'),
('2823-3', 'Potassium', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Ion selective electrode', 'CHEMISTRY', '{"normal": "3.5-5.1"}', '{"low": "<2.5", "high": ">6.5"}', 'mmol/L', 'Serum'),
('2160-0', 'Creatinine', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Enzymatic method', 'CHEMISTRY', '{"male": "0.74-1.35", "female": "0.59-1.04"}', '{"high": ">5.0"}', 'mg/dL', 'Serum'),
('33743-4', 'Troponin T', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', 'Immunoassay', 'CHEMISTRY', '{"normal": "<0.01"}', '{"high": ">0.04"}', 'ng/mL', 'Serum'),
('1975-2', 'Bilirubin.total', 'SCnc', 'Pt', 'Ser/Plas', 'Qn', 'Spectrophotometry', 'CHEMISTRY', '{"normal": "0.3-1.2"}', '{"high": ">20.0"}', 'mg/dL', 'Serum'),
('1742-6', 'ALT', 'CCnc', 'Pt', 'Ser/Plas', 'Qn', 'Enzymatic rate', 'CHEMISTRY', '{"male": "10-40", "female": "7-35"}', '{"high": ">1000"}', 'U/L', 'Serum'),
('1920-8', 'AST', 'CCnc', 'Pt', 'Ser/Plas', 'Qn', 'Enzymatic rate', 'CHEMISTRY', '{"male": "10-40", "female": "9-32"}', '{"high": ">1000"}', 'U/L', 'Serum');

-- Sample interpretation rules
INSERT INTO lab_interpretation_rules (loinc_code, condition_type, condition_criteria, interpretation_text, severity_level, auto_flag) VALUES
('33747-0', 'range', '{"low": 7.0, "high": 20.0}', 'Hemoglobin level requires immediate clinical attention', 'critical', true),
('6690-2', 'range', '{"low": 1.0, "high": 50.0}', 'White blood cell count indicates possible infection or hematologic disorder', 'critical', true),
('777-3', 'range', '{"low": 50}', 'Platelet count indicates bleeding risk - consider platelet transfusion', 'critical', true),
('2951-2', 'range', '{"low": 120, "high": 160}', 'Sodium level requires immediate intervention', 'critical', true),
('2823-3', 'range', '{"low": 2.5, "high": 6.5}', 'Potassium level requires cardiac monitoring and immediate treatment', 'critical', true),
('33743-4', 'range', '{"high": 0.04}', 'Elevated troponin indicates myocardial injury - consider acute coronary syndrome', 'critical', true);

-- Sample critical value notifications setup
INSERT INTO critical_value_notifications (lab_result_id, patient_id, loinc_code, critical_value, notification_level) 
SELECT 
  gen_random_uuid(),
  gen_random_uuid(),
  '33747-0',
  '5.2 g/dL',
  3
WHERE NOT EXISTS (SELECT 1 FROM critical_value_notifications LIMIT 1);


-- ============================================
-- Migration: 20260117000002_phase6_lab_automation.sql
-- ============================================

-- Phase 6: Lab Technician Automation
-- Automated Sample Tracking, Quality Control, and Critical Result Management

-- Lab samples tracking
CREATE TABLE lab_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  test_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'collected' CHECK (status IN ('collected', 'received', 'processing', 'completed', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  collected_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  collector_id UUID REFERENCES profiles(id) NOT NULL,
  technician_id UUID REFERENCES profiles(id),
  location TEXT NOT NULL,
  temperature DECIMAL(4,1), -- Celsius
  volume TEXT,
  notes TEXT,
  rejection_reason TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample tracking history
CREATE TABLE sample_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id TEXT NOT NULL REFERENCES lab_samples(sample_id),
  location TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('collected', 'received', 'moved', 'processed', 'completed', 'rejected')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  temperature DECIMAL(4,1),
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab equipment tracking
CREATE TABLE lab_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  model TEXT,
  manufacturer TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'out_of_service', 'retired')),
  last_calibration TIMESTAMPTZ,
  next_calibration TIMESTAMPTZ,
  last_maintenance TIMESTAMPTZ,
  next_maintenance TIMESTAMPTZ,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality control tests
CREATE TABLE quality_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL,
  control_lot TEXT NOT NULL,
  control_level TEXT NOT NULL CHECK (control_level IN ('low', 'normal', 'high')),
  expected_value DECIMAL(10,4) NOT NULL,
  expected_range_min DECIMAL(10,4) NOT NULL,
  expected_range_max DECIMAL(10,4) NOT NULL,
  measured_value DECIMAL(10,4),
  result TEXT CHECK (result IN ('pass', 'fail', 'pending')),
  technician_id UUID REFERENCES profiles(id) NOT NULL,
  equipment_id UUID REFERENCES lab_equipment(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality control rules (Westgard rules)
CREATE TABLE quality_control_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL,
  control_level TEXT NOT NULL,
  expected_mean DECIMAL(10,4) NOT NULL,
  standard_deviation DECIMAL(10,4) NOT NULL,
  acceptable_range_min DECIMAL(10,4) NOT NULL,
  acceptable_range_max DECIMAL(10,4) NOT NULL,
  westgard_rules TEXT[] NOT NULL, -- Array of rule codes like '1_2s', '2_2s', 'R_4s', etc.
  active BOOLEAN DEFAULT true,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical results for immediate notification
CREATE TABLE critical_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  test_type TEXT NOT NULL,
  test_name TEXT NOT NULL,
  result_value DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL,
  reference_range_min DECIMAL(10,4),
  reference_range_max DECIMAL(10,4),
  severity TEXT NOT NULL CHECK (severity IN ('low_critical', 'high_critical', 'panic')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'reviewed')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  notification_sent BOOLEAN DEFAULT false,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment maintenance logs
CREATE TABLE equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES lab_equipment(id) NOT NULL,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'calibration', 'repair')),
  description TEXT NOT NULL,
  performed_by UUID REFERENCES profiles(id) NOT NULL,
  performed_at TIMESTAMPTZ NOT NULL,
  next_due TIMESTAMPTZ,
  cost DECIMAL(10,2),
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_lab_samples_patient ON lab_samples(patient_id);
CREATE INDEX idx_lab_samples_status ON lab_samples(status);
CREATE INDEX idx_lab_samples_priority ON lab_samples(priority);
CREATE INDEX idx_lab_samples_hospital ON lab_samples(hospital_id);
CREATE INDEX idx_lab_samples_created_at ON lab_samples(created_at DESC);

CREATE INDEX idx_sample_tracking_sample ON sample_tracking(sample_id);
CREATE INDEX idx_sample_tracking_timestamp ON sample_tracking(timestamp DESC);
CREATE INDEX idx_sample_tracking_hospital ON sample_tracking(hospital_id);

CREATE INDEX idx_lab_equipment_status ON lab_equipment(status);
CREATE INDEX idx_lab_equipment_hospital ON lab_equipment(hospital_id);

CREATE INDEX idx_quality_control_test_type ON quality_control(test_type);
CREATE INDEX idx_quality_control_result ON quality_control(result);
CREATE INDEX idx_quality_control_performed_at ON quality_control(performed_at DESC);
CREATE INDEX idx_quality_control_hospital ON quality_control(hospital_id);

CREATE INDEX idx_qc_rules_test_type ON quality_control_rules(test_type);
CREATE INDEX idx_qc_rules_active ON quality_control_rules(active);

CREATE INDEX idx_critical_results_patient ON critical_results(patient_id);
CREATE INDEX idx_critical_results_status ON critical_results(status);
CREATE INDEX idx_critical_results_severity ON critical_results(severity);
CREATE INDEX idx_critical_results_hospital ON critical_results(hospital_id);
CREATE INDEX idx_critical_results_created_at ON critical_results(created_at DESC);

CREATE INDEX idx_equipment_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX idx_equipment_maintenance_performed_at ON equipment_maintenance(performed_at DESC);

-- Row Level Security
ALTER TABLE lab_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_control_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Lab samples hospital access" ON lab_samples
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Sample tracking hospital access" ON sample_tracking
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Lab equipment hospital access" ON lab_equipment
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Quality control hospital access" ON quality_control
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "QC rules hospital access" ON quality_control_rules
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Critical results hospital access" ON critical_results
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Equipment maintenance hospital access" ON equipment_maintenance
  FOR ALL USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

-- Sample data for lab equipment
INSERT INTO lab_equipment (equipment_id, name, model, manufacturer, location, status, last_calibration, next_calibration, hospital_id) VALUES
('CBC-001', 'Automated CBC Analyzer', 'XN-1000', 'Sysmex', 'Hematology Lab', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '335 days', (SELECT id FROM hospitals LIMIT 1)),
('CHEM-001', 'Clinical Chemistry Analyzer', 'Cobas 8000', 'Roche', 'Chemistry Lab', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '350 days', (SELECT id FROM hospitals LIMIT 1)),
('UA-001', 'Urinalysis System', 'CLINITEK', 'Siemens', 'Urine Lab', 'active', NOW() - INTERVAL '45 days', NOW() + INTERVAL '320 days', (SELECT id FROM hospitals LIMIT 1)),
('COAG-001', 'Coagulation Analyzer', 'ACL TOP 700', 'Instrumentation Laboratory', 'Coagulation Lab', 'maintenance', NOW() - INTERVAL '60 days', NOW() + INTERVAL '305 days', (SELECT id FROM hospitals LIMIT 1));

-- Sample QC rules with Westgard rules
INSERT INTO quality_control_rules (test_type, control_level, expected_mean, standard_deviation, acceptable_range_min, acceptable_range_max, westgard_rules, hospital_id) VALUES
('Hemoglobin', 'normal', 14.5, 0.8, 12.9, 16.1, ARRAY['1_2s', '2_2s', 'R_4s', '4_1s'], (SELECT id FROM hospitals LIMIT 1)),
('Glucose', 'normal', 95.0, 8.5, 78.0, 112.0, ARRAY['1_2s', '2_2s', 'R_4s'], (SELECT id FROM hospitals LIMIT 1)),
('Sodium', 'normal', 140.0, 3.2, 133.6, 146.4, ARRAY['1_3s', '2_2s', 'R_4s'], (SELECT id FROM hospitals LIMIT 1)),
('Potassium', 'normal', 4.2, 0.3, 3.6, 4.8, ARRAY['1_2s', '2_2s', 'R_4s', '4_1s'], (SELECT id FROM hospitals LIMIT 1));

-- Sample critical result thresholds (would be configured per hospital)
-- These are examples - actual values would be determined by medical guidelines

-- Functions for lab automation
CREATE OR REPLACE FUNCTION check_critical_values()
RETURNS TRIGGER AS $$
DECLARE
  critical_threshold RECORD;
  severity_level TEXT;
BEGIN
  -- Check for critical values based on test type and result
  -- This is a simplified example - actual implementation would be more comprehensive

  -- Hemoglobin critical values
  IF NEW.test_type = 'CBC' AND NEW.test_name = 'Hemoglobin' THEN
    IF NEW.result_value < 7.0 THEN
      severity_level := 'panic';
    ELSIF NEW.result_value < 8.0 THEN
      severity_level := 'high_critical';
    END IF;
  END IF;

  -- Glucose critical values
  IF NEW.test_type = 'Chemistry' AND NEW.test_name = 'Glucose' THEN
    IF NEW.result_value > 600 OR NEW.result_value < 40 THEN
      severity_level := 'panic';
    ELSIF NEW.result_value > 400 OR NEW.result_value < 60 THEN
      severity_level := 'high_critical';
    END IF;
  END IF;

  -- Potassium critical values
  IF NEW.test_type = 'Chemistry' AND NEW.test_name = 'Potassium' THEN
    IF NEW.result_value > 7.0 OR NEW.result_value < 2.5 THEN
      severity_level := 'panic';
    ELSIF NEW.result_value > 6.0 OR NEW.result_value < 3.0 THEN
      severity_level := 'high_critical';
    END IF;
  END IF;

  -- Insert critical result if threshold exceeded
  IF severity_level IS NOT NULL THEN
    INSERT INTO critical_results (
      patient_id, test_type, test_name, result_value, unit,
      reference_range_min, reference_range_max, severity, hospital_id
    ) VALUES (
      NEW.patient_id, NEW.test_type, NEW.test_name, NEW.result_value, NEW.unit,
      NEW.reference_range_min, NEW.reference_range_max, severity_level, NEW.hospital_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate QC statistics
CREATE OR REPLACE FUNCTION calculate_qc_statistics(
  p_test_type TEXT,
  p_hospital_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  test_type TEXT,
  total_tests BIGINT,
  passed_tests BIGINT,
  failed_tests BIGINT,
  pass_rate DECIMAL,
  average_value DECIMAL,
  standard_deviation DECIMAL
) AS $$
DECLARE
  qc_data RECORD;
  values_array DECIMAL[];
  avg_val DECIMAL;
  std_dev DECIMAL;
BEGIN
  -- Get QC data for the specified period
  FOR qc_data IN
    SELECT measured_value, result
    FROM quality_control
    WHERE test_type = p_test_type
      AND hospital_id = p_hospital_id
      AND performed_at >= NOW() - INTERVAL '1 day' * p_days
      AND measured_value IS NOT NULL
  LOOP
    values_array := array_append(values_array, qc_data.measured_value);
  END LOOP;

  -- Calculate statistics
  SELECT AVG(val), STDDEV(val) INTO avg_val, std_dev
  FROM unnest(values_array) AS val;

  RETURN QUERY
  SELECT
    p_test_type,
    COUNT(*)::BIGINT as total_tests,
    COUNT(CASE WHEN result = 'pass' THEN 1 END)::BIGINT as passed_tests,
    COUNT(CASE WHEN result = 'fail' THEN 1 END)::BIGINT as failed_tests,
    ROUND(
      (COUNT(CASE WHEN result = 'pass' THEN 1 END)::DECIMAL /
       NULLIF(COUNT(*), 0)) * 100, 2
    ) as pass_rate,
    ROUND(avg_val, 4) as average_value,
    ROUND(std_dev, 4) as standard_deviation
  FROM quality_control
  WHERE test_type = p_test_type
    AND hospital_id = p_hospital_id
    AND performed_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Function to get sample processing metrics
CREATE OR REPLACE FUNCTION get_sample_processing_metrics(
  p_hospital_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_samples BIGINT,
  completed_samples BIGINT,
  completion_rate DECIMAL,
  average_processing_time INTERVAL,
  urgent_samples BIGINT,
  overdue_samples BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_samples,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::BIGINT as completed_samples,
    ROUND(
      (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL /
       NULLIF(COUNT(*), 0)) * 100, 2
    ) as completion_rate,
    AVG(completed_at - collected_at) as average_processing_time,
    COUNT(CASE WHEN priority IN ('urgent', 'stat') THEN 1 END)::BIGINT as urgent_samples,
    COUNT(
      CASE WHEN status NOT IN ('completed', 'rejected')
                AND collected_at < NOW() - INTERVAL '4 hours'
                AND priority = 'routine' THEN 1
           WHEN status NOT IN ('completed', 'rejected')
                AND collected_at < NOW() - INTERVAL '1 hour'
                AND priority = 'urgent' THEN 1
           WHEN status NOT IN ('completed', 'rejected')
                AND collected_at < NOW() - INTERVAL '30 minutes'
                AND priority = 'stat' THEN 1
      END
    )::BIGINT as overdue_samples
  FROM lab_samples
  WHERE hospital_id = p_hospital_id
    AND collected_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_lab_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lab_samples_updated_at
  BEFORE UPDATE ON lab_samples
  FOR EACH ROW EXECUTE FUNCTION update_lab_updated_at_column();

CREATE TRIGGER update_lab_equipment_updated_at
  BEFORE UPDATE ON lab_equipment
  FOR EACH ROW EXECUTE FUNCTION update_lab_updated_at_column();


-- ============================================
-- Migration: 20260121000017_labtech_system_tables.sql
-- ============================================

-- Lab Tech Module Database Schema
-- 8 tables with RLS policies and indexes

-- Specimens Table
CREATE TABLE IF NOT EXISTS specimens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  order_id UUID,
  specimen_type VARCHAR(100),
  collection_time TIMESTAMP WITH TIME ZONE,
  received_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  volume DECIMAL(10, 2),
  unit VARCHAR(20),
  status VARCHAR(20) CHECK (status IN ('received', 'processing', 'tested', 'reviewed', 'approved', 'rejected', 'cancelled')),
  rejection_reason TEXT,
  received_by UUID NOT NULL REFERENCES auth.users(id),
  processed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_specimens_patient ON specimens(patient_id);
CREATE INDEX idx_specimens_status ON specimens(status);
CREATE INDEX idx_specimens_received_time ON specimens(received_time);

-- Lab Tests Table
CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  test_code VARCHAR(50),
  test_name VARCHAR(255),
  ordering_provider UUID REFERENCES auth.users(id),
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  start_time TIMESTAMP WITH TIME ZONE,
  completion_time TIMESTAMP WITH TIME ZONE,
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lab_tests_specimen ON lab_tests(specimen_id);
CREATE INDEX idx_lab_tests_patient ON lab_tests(patient_id);
CREATE INDEX idx_lab_tests_status ON lab_tests(status);

-- Test Results Table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  test_code VARCHAR(50),
  test_name VARCHAR(255),
  result_value VARCHAR(255),
  result_unit VARCHAR(50),
  reference_range VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('normal', 'abnormal', 'critical', 'pending')),
  flag VARCHAR(50),
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  reviewed_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  review_time TIMESTAMP WITH TIME ZONE,
  approval_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_test_results_test ON test_results(test_id);
CREATE INDEX idx_test_results_patient ON test_results(patient_id);
CREATE INDEX idx_test_results_status ON test_results(status);

-- Quality Control Table
CREATE TABLE IF NOT EXISTS quality_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzer_id UUID NOT NULL,
  test_code VARCHAR(50),
  qc_level VARCHAR(20) CHECK (qc_level IN ('low', 'normal', 'high')),
  expected_value DECIMAL(15, 4),
  expected_range VARCHAR(100),
  actual_value DECIMAL(15, 4),
  status VARCHAR(20) CHECK (status IN ('passed', 'failed', 'warning')),
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quality_control_analyzer ON quality_control(analyzer_id);
CREATE INDEX idx_quality_control_status ON quality_control(status);
CREATE INDEX idx_quality_control_performed_at ON quality_control(performed_at);

-- Analyzers Table
CREATE TABLE IF NOT EXISTS analyzers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  model VARCHAR(100),
  serial_number VARCHAR(100),
  location VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('operational', 'maintenance', 'calibration', 'offline')),
  last_calibration TIMESTAMP WITH TIME ZONE,
  next_calibration TIMESTAMP WITH TIME ZONE,
  last_maintenance TIMESTAMP WITH TIME ZONE,
  next_maintenance TIMESTAMP WITH TIME ZONE,
  tests_processed INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  uptime DECIMAL(5, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analyzers_status ON analyzers(status);
CREATE INDEX idx_analyzers_next_maintenance ON analyzers(next_maintenance);

-- Analyzer Maintenance Table
CREATE TABLE IF NOT EXISTS analyzer_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analyzer_id UUID NOT NULL REFERENCES analyzers(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) CHECK (maintenance_type IN ('preventive', 'corrective', 'calibration')),
  description TEXT,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analyzer_maintenance_analyzer ON analyzer_maintenance(analyzer_id);
CREATE INDEX idx_analyzer_maintenance_status ON analyzer_maintenance(status);

-- Lab Alerts Table
CREATE TABLE IF NOT EXISTS lab_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) CHECK (alert_type IN ('critical_result', 'quality_failure', 'analyzer_error', 'specimen_issue', 'maintenance_due')),
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  message TEXT NOT NULL,
  related_test_id UUID REFERENCES lab_tests(id),
  related_specimen_id UUID REFERENCES specimens(id),
  related_analyzer_id UUID,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lab_alerts_type ON lab_alerts(alert_type);
CREATE INDEX idx_lab_alerts_severity ON lab_alerts(severity);
CREATE INDEX idx_lab_alerts_acknowledged ON lab_alerts(acknowledged);

-- Critical Results Table
CREATE TABLE IF NOT EXISTS critical_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES lab_tests(id) ON DELETE CASCADE,
  specimen_id UUID NOT NULL REFERENCES specimens(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  test_name VARCHAR(255),
  result_value VARCHAR(255),
  critical_threshold VARCHAR(100),
  severity VARCHAR(20) CHECK (severity IN ('critical', 'panic')),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notified_provider UUID REFERENCES auth.users(id),
  notification_time TIMESTAMP WITH TIME ZONE,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_critical_results_patient ON critical_results(patient_id);
CREATE INDEX idx_critical_results_severity ON critical_results(severity);
CREATE INDEX idx_critical_results_acknowledged ON critical_results(acknowledged);

-- RLS Policies

-- Specimens RLS
ALTER TABLE specimens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view specimens"
  ON specimens FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin', 'doctor', 'nurse'));

CREATE POLICY "Lab techs can insert specimens"
  ON specimens FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

CREATE POLICY "Lab techs can update specimens"
  ON specimens FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

-- Lab Tests RLS
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view tests"
  ON lab_tests FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin', 'doctor'));

CREATE POLICY "Lab techs can insert tests"
  ON lab_tests FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

CREATE POLICY "Lab techs can update tests"
  ON lab_tests FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

-- Test Results RLS
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view results"
  ON test_results FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin', 'doctor', 'nurse'));

CREATE POLICY "Lab techs can insert results"
  ON test_results FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

CREATE POLICY "Lab techs can update results"
  ON test_results FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

-- Quality Control RLS
ALTER TABLE quality_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view QC"
  ON quality_control FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

CREATE POLICY "Lab techs can insert QC"
  ON quality_control FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

-- Analyzers RLS
ALTER TABLE analyzers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view analyzers"
  ON analyzers FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

CREATE POLICY "Lab techs can update analyzers"
  ON analyzers FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

-- Analyzer Maintenance RLS
ALTER TABLE analyzer_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view maintenance"
  ON analyzer_maintenance FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

CREATE POLICY "Lab techs can insert maintenance"
  ON analyzer_maintenance FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

-- Lab Alerts RLS
ALTER TABLE lab_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view alerts"
  ON lab_alerts FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));

-- Critical Results RLS
ALTER TABLE critical_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lab techs can view critical results"
  ON critical_results FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('lab_technician', 'admin', 'doctor'));

CREATE POLICY "Lab techs can insert critical results"
  ON critical_results FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('lab_technician', 'admin'));


