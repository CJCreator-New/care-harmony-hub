-- Phase 1: Integrated Workflow Foundation
-- Creates essential tables and indexes for comprehensive workflow management

-- ============================================================================
-- 1. WORKFLOW METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  metric_date DATE NOT NULL,
  
  -- Timing Metrics (in minutes)
  check_in_to_nurse_avg DECIMAL(10,2),
  nurse_to_doctor_avg DECIMAL(10,2),
  consultation_duration_avg DECIMAL(10,2),
  lab_turnaround_avg DECIMAL(10,2),
  prescription_fill_avg DECIMAL(10,2),
  invoice_generation_avg DECIMAL(10,2),
  
  -- Volume Metrics
  patient_throughput INTEGER DEFAULT 0,
  total_patients_seen INTEGER DEFAULT 0,
  total_appointments INTEGER DEFAULT 0,
  
  -- Quality Metrics
  no_show_rate DECIMAL(5,2) DEFAULT 0,
  patient_satisfaction_score DECIMAL(3,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(hospital_id, metric_date)
);

-- ============================================================================
-- 2. ESCALATION RULES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Rule Definition
  rule_name TEXT NOT NULL,
  description TEXT,
  trigger_condition JSONB NOT NULL,
  escalation_action JSONB NOT NULL,
  
  -- Targeting
  target_role app_role,
  target_user_id UUID REFERENCES profiles(user_id),
  
  -- Priority & Status
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  active BOOLEAN DEFAULT true,
  
  -- Execution Tracking
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. CRITICAL VALUE ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS critical_value_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Lab Order Reference
  lab_order_id UUID REFERENCES lab_orders(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  
  -- Test Information
  test_name TEXT NOT NULL,
  test_code TEXT,
  critical_value TEXT NOT NULL,
  normal_range TEXT,
  unit_of_measure TEXT,
  
  -- Alert Status
  severity TEXT CHECK (severity IN ('critical', 'urgent', 'high')) DEFAULT 'critical',
  alerted_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_by UUID REFERENCES profiles(user_id),
  acknowledged_at TIMESTAMPTZ,
  
  -- Actions Taken
  action_taken TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. WORKFLOW STAGE TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_stage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  
  -- Stage Information
  stage_name TEXT NOT NULL CHECK (stage_name IN (
    'checked_in',
    'triage_started',
    'triage_completed',
    'ready_for_doctor',
    'consultation_started',
    'consultation_completed',
    'lab_ordered',
    'lab_completed',
    'prescription_created',
    'prescription_dispensed',
    'billing_created',
    'payment_completed',
    'discharged'
  )),
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Staff Assignment
  assigned_to UUID REFERENCES profiles(user_id),
  assigned_role app_role,
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')) DEFAULT 'pending',
  
  -- Metadata
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. BOTTLENECK DETECTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bottleneck_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Bottleneck Information
  stage_name TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  
  -- Metrics
  current_wait_time INTEGER, -- minutes
  target_wait_time INTEGER,
  queue_length INTEGER,
  staff_available INTEGER,
  
  -- Recommendations
  recommendation TEXT,
  auto_escalated BOOLEAN DEFAULT false,
  
  -- Detection Time
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. PERFORMANCE INDEXES
-- ============================================================================

-- Queue Performance
CREATE INDEX IF NOT EXISTS idx_queue_hospital_status 
  ON patient_queue(hospital_id, status) 
  WHERE status != 'completed';

CREATE INDEX IF NOT EXISTS idx_queue_check_in_time 
  ON patient_queue(check_in_time DESC);

-- Consultation Performance
CREATE INDEX IF NOT EXISTS idx_consultations_hospital_status 
  ON consultations(hospital_id, status);

CREATE INDEX IF NOT EXISTS idx_consultations_started_completed 
  ON consultations(started_at, completed_at) 
  WHERE status = 'completed';

-- Lab Orders Performance
CREATE INDEX IF NOT EXISTS idx_lab_orders_status_created 
  ON lab_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lab_orders_hospital_status 
  ON lab_orders(hospital_id, status);

-- Prescriptions Performance
CREATE INDEX IF NOT EXISTS idx_prescriptions_status_created 
  ON prescriptions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_prescriptions_hospital_status 
  ON prescriptions(hospital_id, status);

-- Workflow Metrics Performance
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_hospital_date 
  ON workflow_metrics(hospital_id, metric_date DESC);

-- Workflow Stage Tracking Performance
CREATE INDEX IF NOT EXISTS idx_workflow_stage_patient 
  ON workflow_stage_tracking(patient_id, stage_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_stage_hospital 
  ON workflow_stage_tracking(hospital_id, stage_name, status);

-- Critical Value Alerts Performance
CREATE INDEX IF NOT EXISTS idx_critical_alerts_patient 
  ON critical_value_alerts(patient_id, alerted_at DESC);

CREATE INDEX IF NOT EXISTS idx_critical_alerts_unacknowledged 
  ON critical_value_alerts(hospital_id, acknowledged_at) 
  WHERE acknowledged_at IS NULL;

-- ============================================================================
-- 7. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE workflow_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_value_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottleneck_detections ENABLE ROW LEVEL SECURITY;

-- Workflow Metrics Policies
CREATE POLICY "workflow_metrics_hospital_access" ON workflow_metrics
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Escalation Rules Policies
CREATE POLICY "escalation_rules_hospital_access" ON escalation_rules
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Critical Value Alerts Policies
CREATE POLICY "critical_alerts_hospital_access" ON critical_value_alerts
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Workflow Stage Tracking Policies
CREATE POLICY "workflow_stage_hospital_access" ON workflow_stage_tracking
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Bottleneck Detection Policies
CREATE POLICY "bottleneck_hospital_access" ON bottleneck_detections
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate workflow stage duration
CREATE OR REPLACE FUNCTION calculate_stage_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for workflow stage duration
DROP TRIGGER IF EXISTS trigger_calculate_stage_duration ON workflow_stage_tracking;
CREATE TRIGGER trigger_calculate_stage_duration
  BEFORE INSERT OR UPDATE ON workflow_stage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION calculate_stage_duration();

-- Function to detect bottlenecks
CREATE OR REPLACE FUNCTION detect_workflow_bottlenecks(
  p_hospital_id UUID,
  p_threshold_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
  stage_name TEXT,
  avg_wait_time DECIMAL,
  queue_length BIGINT,
  severity TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wst.stage_name,
    AVG(wst.duration_minutes)::DECIMAL AS avg_wait_time,
    COUNT(*) AS queue_length,
    CASE 
      WHEN AVG(wst.duration_minutes) > p_threshold_minutes * 2 THEN 'critical'
      WHEN AVG(wst.duration_minutes) > p_threshold_minutes * 1.5 THEN 'high'
      WHEN AVG(wst.duration_minutes) > p_threshold_minutes THEN 'medium'
      ELSE 'low'
    END AS severity
  FROM workflow_stage_tracking wst
  WHERE wst.hospital_id = p_hospital_id
    AND wst.started_at > NOW() - INTERVAL '24 hours'
    AND wst.status = 'in_progress'
  GROUP BY wst.stage_name
  HAVING AVG(wst.duration_minutes) > p_threshold_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get workflow metrics for date range
CREATE OR REPLACE FUNCTION get_workflow_metrics_range(
  p_hospital_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  metric_date DATE,
  check_in_to_nurse_avg DECIMAL,
  nurse_to_doctor_avg DECIMAL,
  consultation_duration_avg DECIMAL,
  lab_turnaround_avg DECIMAL,
  prescription_fill_avg DECIMAL,
  patient_throughput INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wm.metric_date,
    wm.check_in_to_nurse_avg,
    wm.nurse_to_doctor_avg,
    wm.consultation_duration_avg,
    wm.lab_turnaround_avg,
    wm.prescription_fill_avg,
    wm.patient_throughput
  FROM workflow_metrics wm
  WHERE wm.hospital_id = p_hospital_id
    AND wm.metric_date BETWEEN p_start_date AND p_end_date
  ORDER BY wm.metric_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. INITIAL DATA SEEDING
-- ============================================================================

-- Insert default escalation rules (example)
INSERT INTO escalation_rules (hospital_id, rule_name, description, trigger_condition, escalation_action, target_role, priority)
SELECT 
  h.id,
  'Doctor Queue Overload',
  'Alert admin when doctor queue exceeds 10 patients',
  '{"queue_length": {"$gt": 10}}'::jsonb,
  '{"type": "send_notification", "message": "Doctor queue exceeds 10 patients", "priority": "urgent"}'::jsonb,
  'admin',
  'urgent'
FROM hospitals h
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON workflow_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON escalation_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE ON critical_value_alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON workflow_stage_tracking TO authenticated;
GRANT SELECT, INSERT, UPDATE ON bottleneck_detections TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE workflow_metrics IS 'Stores daily workflow performance metrics for KPI tracking';
COMMENT ON TABLE escalation_rules IS 'Defines automated escalation rules for workflow bottlenecks';
COMMENT ON TABLE critical_value_alerts IS 'Tracks critical lab values requiring immediate attention';
COMMENT ON TABLE workflow_stage_tracking IS 'Tracks patient progress through workflow stages';
COMMENT ON TABLE bottleneck_detections IS 'Records detected workflow bottlenecks for analysis';
