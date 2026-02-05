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