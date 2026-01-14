-- Missing Tables Migration for CareSync HMS
-- This file contains the database schema for tables referenced in code but missing from the main schema

-- Performance Monitoring Tables
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC,
  status TEXT DEFAULT 'good',
  metadata JSONB DEFAULT '{}',
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  user_id UUID,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Sample Tracking
CREATE TABLE IF NOT EXISTS lab_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id TEXT NOT NULL UNIQUE,
  patient_id UUID REFERENCES patients(id),
  test_type TEXT NOT NULL,
  status TEXT DEFAULT 'collected',
  priority TEXT DEFAULT 'routine',
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  collector_id UUID REFERENCES profiles(id),
  technician_id UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample tracking table for location tracking
CREATE TABLE IF NOT EXISTS sample_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id UUID REFERENCES lab_samples(id),
  location TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL
);

-- Reference Tables (can be seeded with standard codes)
CREATE TABLE IF NOT EXISTS cpt_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  base_fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loinc_codes (
  code TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  property TEXT,
  system_type TEXT,
  reference_range JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loinc_codes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for hospital-scoped access
CREATE POLICY "Users can view performance metrics in their hospital" ON performance_metrics
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert performance metrics in their hospital" ON performance_metrics
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view error tracking in their hospital" ON error_tracking
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert error tracking in their hospital" ON error_tracking
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view lab samples in their hospital" ON lab_samples
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clinical staff can insert lab samples" ON lab_samples
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('doctor', 'nurse', 'lab_technician'))
  );

CREATE POLICY "Users can update lab samples in their hospital" ON lab_samples
  FOR UPDATE TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view sample tracking in their hospital" ON sample_tracking
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clinical staff can insert sample tracking" ON sample_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.role IN ('doctor', 'nurse', 'lab_technician'))
  );

-- Reference tables are readable by all authenticated users
CREATE POLICY "Authenticated users can view CPT codes" ON cpt_codes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view LOINC codes" ON loinc_codes
  FOR SELECT TO authenticated
  USING (true);

-- Add appropriate indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_hospital ON performance_metrics(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_tracking_hospital ON error_tracking(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_samples_hospital ON lab_samples(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_samples_patient ON lab_samples(patient_id);
CREATE INDEX IF NOT EXISTS idx_sample_tracking_sample ON sample_tracking(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_tracking_hospital ON sample_tracking(hospital_id, timestamp DESC);