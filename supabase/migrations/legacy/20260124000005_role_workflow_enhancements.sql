-- ============================================================================
-- PHASE 6: LAB AUTOMATION & WORKFLOW ENHANCEMENTS
-- Target: Lab Equipment Tracking & Missing Tables
-- Created: 2026-01-24
-- ============================================================================

-- 1. LAB EQUIPMENT MANAGEMENT
-- Tracks analyzer status, maintenance schedules, and integration metadata
CREATE TABLE IF NOT EXISTS lab_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Equipment Identity
  name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  type TEXT CHECK (type IN ('hematology', 'chemistry', 'immunoassay', 'urinalysis', 'microbiology', 'molecular', 'other')),
  location TEXT,
  
  -- Operational Status
  status TEXT CHECK (status IN ('online', 'offline', 'maintenance', 'error', 'calibrating')) DEFAULT 'online',
  utilization_rate INTEGER DEFAULT 0, -- 0-100 percentage
  temperature DECIMAL(5,2), -- monitoring metric
  
  -- Maintenance Tracking
  last_maintenance_date TIMESTAMPTZ,
  next_maintenance_due TIMESTAMPTZ,
  last_calibration_date TIMESTAMPTZ,
  calibration_due_date TIMESTAMPTZ,
  
  -- QC Status
  qc_status TEXT CHECK (qc_status IN ('passed', 'failed', 'pending', 'expired')) DEFAULT 'pending',
  
  -- Health & Prediction (for predictive maintenance)
  health_score INTEGER DEFAULT 100,
  predicted_failure_prob INTEGER DEFAULT 0,
  
  -- Integration
  ip_address TEXT,
  port INTEGER,
  protocol TEXT DEFAULT 'hl7',
  
  -- Metadata
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EQUIPMENT ERROR LOGS
-- Detailed error tracking for maintenance analysis
CREATE TABLE IF NOT EXISTS lab_equipment_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES lab_equipment(id) ON DELETE CASCADE NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  error_code TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(user_id),
  
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QC TEST RUNS
-- Stores Levey-Jennings data points
CREATE TABLE IF NOT EXISTS lab_qc_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID REFERENCES lab_equipment(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  test_code TEXT NOT NULL,
  
  -- Results
  run_time TIMESTAMPTZ DEFAULT NOW(),
  value DECIMAL(10,4) NOT NULL,
  target_mean DECIMAL(10,4),
  target_sd DECIMAL(10,4),
  deviation_index DECIMAL(10,4), -- Z-score
  
  -- Evaluation
  result_status TEXT CHECK (result_status IN ('pass', 'fail', 'warning')),
  westgard_violation TEXT, -- e.g., '1:3s'
  
  operator_id UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_equipment_hospital ON lab_equipment(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_equipment_status ON lab_equipment(status);
CREATE INDEX IF NOT EXISTS idx_lab_qc_runs_equipment_time ON lab_qc_runs(equipment_id, run_time DESC);

-- RLS
ALTER TABLE lab_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_equipment_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_qc_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_staff_view_equipment" ON lab_equipment
  FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "lab_admins_manage_equipment" ON lab_equipment
  FOR ALL TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'lab_tech'))
  );

CREATE POLICY "hospital_staff_view_qc" ON lab_qc_runs
  FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_lab_equipment_modtime
    BEFORE UPDATE ON lab_equipment
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Seed some mock equipment data for development
INSERT INTO lab_equipment (hospital_id, name, model, type, status, health_score) 
SELECT 
  id, 
  'Hematology X100', 
  'Sysmex-XN', 
  'hematology', 
  'online', 
  98 
FROM hospitals 
LIMIT 1;
