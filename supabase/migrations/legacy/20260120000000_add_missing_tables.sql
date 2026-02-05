-- Migration: Add missing tables for performance monitoring, lab sample tracking, and clinical coding
-- Created: 2026-01-20

-- =====================================================
-- 1. Performance Monitoring Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC,
  status TEXT DEFAULT 'good' CHECK (status IN ('good', 'warning', 'critical')),
  metadata JSONB DEFAULT '{}',
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_performance_metrics_hospital ON performance_metrics(hospital_id);
CREATE INDEX idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX idx_performance_metrics_status ON performance_metrics(status);

COMMENT ON TABLE performance_metrics IS 'Stores system performance metrics for monitoring';

-- =====================================================
-- 2. Error Tracking Table
-- =====================================================

CREATE TABLE IF NOT EXISTS error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT false,
  user_id UUID,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

CREATE INDEX idx_error_tracking_hospital ON error_tracking(hospital_id);
CREATE INDEX idx_error_tracking_resolved ON error_tracking(resolved);
CREATE INDEX idx_error_tracking_severity ON error_tracking(severity);
CREATE INDEX idx_error_tracking_created_at ON error_tracking(created_at DESC);

COMMENT ON TABLE error_tracking IS 'Tracks application errors and exceptions';

-- =====================================================
-- 3. Lab Sample Tracking Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  status TEXT DEFAULT 'collected' CHECK (status IN ('collected', 'received', 'processing', 'completed', 'rejected')),
  priority TEXT DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  collector_id UUID REFERENCES profiles(id),
  technician_id UUID REFERENCES profiles(id),
  location TEXT,
  temperature NUMERIC,
  volume TEXT,
  notes TEXT,
  rejection_reason TEXT,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_samples_patient ON lab_samples(patient_id);
CREATE INDEX idx_lab_samples_hospital ON lab_samples(hospital_id);
CREATE INDEX idx_lab_samples_status ON lab_samples(status);
CREATE INDEX idx_lab_samples_priority ON lab_samples(priority);
CREATE INDEX idx_lab_samples_created_at ON lab_samples(created_at DESC);

COMMENT ON TABLE lab_samples IS 'Tracks laboratory samples from collection to completion';

-- =====================================================
-- 4. Sample Tracking History
-- =====================================================

CREATE TABLE IF NOT EXISTS sample_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID REFERENCES lab_samples(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('collected', 'received', 'moved', 'processed', 'completed', 'rejected')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id),
  temperature NUMERIC,
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL
);

CREATE INDEX idx_sample_tracking_sample ON sample_tracking(sample_id);
CREATE INDEX idx_sample_tracking_timestamp ON sample_tracking(timestamp DESC);
CREATE INDEX idx_sample_tracking_hospital ON sample_tracking(hospital_id);

COMMENT ON TABLE sample_tracking IS 'Audit trail for sample movements and status changes';

-- =====================================================
-- 5. CPT Codes Reference Table
-- =====================================================

CREATE TABLE IF NOT EXISTS cpt_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  base_fee NUMERIC(10,2) DEFAULT 0,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cpt_codes_category ON cpt_codes(category);
CREATE INDEX idx_cpt_codes_hospital ON cpt_codes(hospital_id);
CREATE INDEX idx_cpt_codes_active ON cpt_codes(active);

COMMENT ON TABLE cpt_codes IS 'Current Procedural Terminology codes for billing';

-- =====================================================
-- 6. LOINC Codes Reference Table
-- =====================================================

CREATE TABLE IF NOT EXISTS loinc_codes (
  code TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  property TEXT,
  time_aspect TEXT,
  system_type TEXT,
  scale_type TEXT,
  method_type TEXT,
  reference_range JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_loinc_codes_component ON loinc_codes(component);
CREATE INDEX idx_loinc_codes_active ON loinc_codes(active);

COMMENT ON TABLE loinc_codes IS 'Logical Observation Identifiers Names and Codes for lab tests';

-- =====================================================
-- Row Level Security Policies
-- =====================================================

-- Performance Metrics RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance metrics for their hospital"
  ON performance_metrics FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert performance metrics"
  ON performance_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND hospital_id = performance_metrics.hospital_id
      AND role = 'admin'
    )
  );

-- Error Tracking RLS
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view errors for their hospital"
  ON error_tracking FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert error logs"
  ON error_tracking FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Lab Samples RLS
ALTER TABLE lab_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Healthcare staff can view lab samples"
  ON lab_samples FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'doctor', 'nurse', 'lab_technician')
    )
  );

CREATE POLICY "Lab staff can insert samples"
  ON lab_samples FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
      AND role IN ('lab_technician', 'nurse', 'doctor')
    )
  );

CREATE POLICY "Lab staff can update samples"
  ON lab_samples FOR UPDATE
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
      AND role IN ('lab_technician', 'nurse', 'doctor')
    )
  );

-- Sample Tracking RLS
ALTER TABLE sample_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Healthcare staff can view sample tracking"
  ON sample_tracking FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'doctor', 'nurse', 'lab_technician')
    )
  );

CREATE POLICY "Lab staff can insert tracking records"
  ON sample_tracking FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
      AND role IN ('lab_technician', 'nurse', 'doctor')
    )
  );

-- CPT Codes RLS
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CPT codes"
  ON cpt_codes FOR SELECT
  USING (
    hospital_id IS NULL OR
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage CPT codes"
  ON cpt_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- LOINC Codes RLS (public reference data)
ALTER TABLE loinc_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view LOINC codes"
  ON loinc_codes FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- Triggers for updated_at timestamps
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lab_samples_updated_at
  BEFORE UPDATE ON lab_samples
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cpt_codes_updated_at
  BEFORE UPDATE ON cpt_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Insert sample CPT codes
-- =====================================================

INSERT INTO cpt_codes (code, description, category, base_fee) VALUES
  ('99213', 'Office visit, established patient, 20-29 minutes', 'Evaluation and Management', 150.00),
  ('99214', 'Office visit, established patient, 30-39 minutes', 'Evaluation and Management', 200.00),
  ('99215', 'Office visit, established patient, 40-54 minutes', 'Evaluation and Management', 250.00),
  ('36415', 'Routine venipuncture', 'Laboratory', 25.00),
  ('80053', 'Comprehensive metabolic panel', 'Laboratory', 75.00),
  ('85025', 'Complete blood count with differential', 'Laboratory', 50.00),
  ('93000', 'Electrocardiogram, complete', 'Diagnostic', 100.00)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- Insert sample LOINC codes
-- =====================================================

INSERT INTO loinc_codes (code, component, property, time_aspect, system_type, scale_type, reference_range) VALUES
  ('2345-7', 'Glucose', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', '{"min": 70, "max": 100, "unit": "mg/dL"}'::jsonb),
  ('2160-0', 'Creatinine', 'MCnc', 'Pt', 'Ser/Plas', 'Qn', '{"min": 0.7, "max": 1.3, "unit": "mg/dL"}'::jsonb),
  ('6690-2', 'White blood cells', 'NCnc', 'Pt', 'Bld', 'Qn', '{"min": 4.5, "max": 11.0, "unit": "10*3/uL"}'::jsonb),
  ('789-8', 'Erythrocytes', 'NCnc', 'Pt', 'Bld', 'Qn', '{"min": 4.5, "max": 5.9, "unit": "10*6/uL"}'::jsonb),
  ('718-7', 'Hemoglobin', 'MCnc', 'Pt', 'Bld', 'Qn', '{"min": 13.5, "max": 17.5, "unit": "g/dL"}'::jsonb)
ON CONFLICT (code) DO NOTHING;
