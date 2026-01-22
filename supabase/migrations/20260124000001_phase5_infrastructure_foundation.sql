-- ============================================================================
-- PHASE 5.1: INFRASTRUCTURE FOUNDATION
-- Target: Backend Architecture Enhancements
-- Created: 2026-01-24
-- ============================================================================

-- 1. WORKFLOW EXECUTION LOGS
-- TRACKS GRANULAR AUTOMATION ACTIONS AND SYSTEM TRIGGER RESPONSES
CREATE TABLE IF NOT EXISTS workflow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES escalation_rules(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Context
  trigger_event TEXT NOT NULL, -- e.g., 'patient_check_in', 'lab_completed'
  trigger_data JSONB,
  
  -- Execution
  actions_executed JSONB NOT NULL,
  execution_time_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'partial', 'failed', 'skipped')) DEFAULT 'success',
  error_message TEXT,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. QUEUE ANALYTICS (SNAPSHOTS)
-- STORES HISTORICAL SNAPSHOTS FOR TREND ANALYSIS AND DASHBOARD GRAPHS
CREATE TABLE IF NOT EXISTS queue_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Snapshot Metrics
  snapshot_time TIMESTAMPTZ DEFAULT NOW(),
  avg_wait_time INTEGER, -- minutes
  max_wait_time INTEGER,
  queue_length INTEGER,
  throughput_rate DECIMAL,
  
  -- Insights
  bottleneck_stage TEXT,
  active_staff_count INTEGER,
  recommendations JSONB,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PHARMACIST WORKFLOW QUEUE
-- ENHANCES PHARMACIST DASHBOARD WITH GRANULAR PROCESSING TRACKING
CREATE TABLE IF NOT EXISTS prescription_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Status Tracking
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'on_hold')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('routine', 'urgent', 'emergency')) DEFAULT 'routine',
  
  -- Assignment
  assigned_pharmacist UUID REFERENCES profiles(user_id),
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Content/Notes
  notes TEXT,
  verified_by UUID REFERENCES profiles(user_id),
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PATIENT MEDICATION REMINDERS
-- SUPPORTS PATIENT PORTAL HEALTH HUB FEATURES
CREATE TABLE IF NOT EXISTS medication_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
  
  -- Medication Info (Direct for redundancy/offline support)
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  
  -- Scheduling
  scheduled_time TIMESTAMPTZ NOT NULL,
  window_minutes INTEGER DEFAULT 60, -- Time allowed before/after
  
  -- Tracking
  status TEXT CHECK (status IN ('pending', 'taken', 'skipped', 'snoozed')) DEFAULT 'pending',
  taken_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SCHEMA ENHANCEMENTS FOR EXISTING TABLES
-- ============================================================================

-- Add priority scoring to patient queue for AI optimization
ALTER TABLE patient_queue ADD COLUMN IF NOT EXISTS priority_score FLOAT DEFAULT 0.0;
ALTER TABLE patient_queue ADD COLUMN IF NOT EXISTS ai_recommendation JSONB;

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workflow_logs_hospital_time 
  ON workflow_execution_logs(hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_queue_analytics_hospital_time 
  ON queue_analytics(hospital_id, snapshot_time DESC);

CREATE INDEX IF NOT EXISTS idx_prescription_queue_status_priority 
  ON prescription_queue(hospital_id, status, priority);

CREATE INDEX IF NOT EXISTS idx_medication_reminders_patient_time 
  ON medication_reminders(patient_id, scheduled_time ASC);

CREATE INDEX IF NOT EXISTS idx_medication_reminders_status 
  ON medication_reminders(status) WHERE status = 'pending';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders ENABLE ROW LEVEL SECURITY;

-- Workflow Execution Logs Policies
CREATE POLICY "hospital_staff_logs_access" ON workflow_execution_logs
  FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

-- Queue Analytics Policies
CREATE POLICY "hospital_staff_analytics_access" ON queue_analytics
  FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

-- Prescription Queue Policies
CREATE POLICY "hospital_staff_prescription_queue_access" ON prescription_queue
  FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

-- Medication Reminders Policies
CREATE POLICY "patients_view_own_reminders" ON medication_reminders
  FOR SELECT TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "patients_update_own_reminders" ON medication_reminders
  FOR UPDATE TO authenticated
  USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()))
  WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "hospital_staff_manage_reminders" ON medication_reminders
  FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate prescription processing time
CREATE OR REPLACE FUNCTION calculate_prescription_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_prescription_duration
  BEFORE INSERT OR UPDATE ON prescription_queue
  FOR EACH ROW
  EXECUTE FUNCTION calculate_prescription_duration();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON workflow_execution_logs TO authenticated;
GRANT ALL ON queue_analytics TO authenticated;
GRANT ALL ON prescription_queue TO authenticated;
GRANT ALL ON medication_reminders TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE workflow_execution_logs IS 'Audit trail for automated workflow rule executions';
COMMENT ON TABLE queue_analytics IS 'Historical snapshots of patient queue performance';
COMMENT ON TABLE prescription_queue IS 'Pharmacist-specific workflow tracking for prescriptions';
COMMENT ON TABLE medication_reminders IS 'Patient medication adherence reminders and tracking';
