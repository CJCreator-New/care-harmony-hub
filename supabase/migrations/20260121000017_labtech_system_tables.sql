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
