-- Workflow Metrics and Automation Tables

-- Workflow metrics for KPI tracking
CREATE TABLE IF NOT EXISTS workflow_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  metric_type TEXT NOT NULL, -- 'check_in_to_nurse', 'nurse_to_doctor', etc.
  stage_name TEXT NOT NULL,
  avg_time_minutes NUMERIC(10,2),
  target_time_minutes NUMERIC(10,2),
  patient_count INTEGER DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escalation rules for automated alerts
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  rule_name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- 'queue_length_exceeded', 'wait_time_exceeded', etc.
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow stage tracking for individual patients
CREATE TABLE IF NOT EXISTS workflow_stage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  queue_entry_id UUID REFERENCES patient_queue(id),
  appointment_id UUID REFERENCES appointments(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  stage TEXT NOT NULL, -- 'check_in', 'triage', 'consultation', 'lab', 'pharmacy', 'billing', 'discharge'
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_minutes NUMERIC(10,2),
  status TEXT DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Critical value alerts for lab results
CREATE TABLE IF NOT EXISTS critical_value_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID REFERENCES lab_orders(id) NOT NULL,
  patient_id UUID REFERENCES patients(id) NOT NULL,
  test_name TEXT NOT NULL,
  result_value TEXT NOT NULL,
  critical_range TEXT NOT NULL,
  severity TEXT DEFAULT 'high', -- 'high', 'critical'
  notified_doctor_id UUID REFERENCES profiles(id),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflow_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE critical_value_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Hospital staff can view workflow metrics" ON workflow_metrics
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admin can manage escalation rules" ON escalation_rules
  FOR ALL TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Hospital staff can view workflow tracking" ON workflow_stage_tracking
  FOR SELECT TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Hospital staff can insert workflow tracking" ON workflow_stage_tracking
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clinical staff can view critical alerts" ON critical_value_alerts
  FOR SELECT TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('doctor', 'nurse', 'lab_technician', 'admin')
    )
  );

CREATE POLICY "Lab staff can create critical alerts" ON critical_value_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('lab_technician', 'admin')
    )
  );

-- Indexes
CREATE INDEX idx_workflow_metrics_hospital_date ON workflow_metrics(hospital_id, date DESC);
CREATE INDEX idx_workflow_metrics_type ON workflow_metrics(metric_type, date DESC);
CREATE INDEX idx_escalation_rules_hospital ON escalation_rules(hospital_id, is_active);
CREATE INDEX idx_workflow_tracking_patient ON workflow_stage_tracking(patient_id, started_at DESC);
CREATE INDEX idx_workflow_tracking_stage ON workflow_stage_tracking(stage, status);
CREATE INDEX idx_critical_alerts_patient ON critical_value_alerts(patient_id, acknowledged);
CREATE INDEX idx_critical_alerts_doctor ON critical_value_alerts(notified_doctor_id, acknowledged);

-- Function to calculate workflow stage duration
CREATE OR REPLACE FUNCTION update_workflow_stage_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_stage_duration_trigger
  BEFORE INSERT OR UPDATE ON workflow_stage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_stage_duration();

-- Function to aggregate daily workflow metrics
CREATE OR REPLACE FUNCTION aggregate_workflow_metrics(p_hospital_id UUID, p_date DATE)
RETURNS VOID AS $$
BEGIN
  -- Check-in to Nurse
  INSERT INTO workflow_metrics (hospital_id, metric_type, stage_name, avg_time_minutes, date, patient_count)
  SELECT 
    p_hospital_id,
    'check_in_to_nurse',
    'Check-in to Nurse',
    AVG(duration_minutes),
    p_date,
    COUNT(*)
  FROM workflow_stage_tracking
  WHERE hospital_id = p_hospital_id
    AND stage = 'triage'
    AND DATE(started_at) = p_date
    AND completed_at IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Add more stage aggregations as needed
END;
$$ LANGUAGE plpgsql;
