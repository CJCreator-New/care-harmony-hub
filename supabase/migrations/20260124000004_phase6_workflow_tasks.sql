-- ============================================================================
-- PHASE 6.3: WORKFLOW TASKS SYSTEM
-- Target: Role-based Task Management and Clinical Handoffs
-- Created: 2026-01-24
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_role TEXT, -- e.g., 'nurse', 'doctor', 'pharmacist'
  assigned_to UUID REFERENCES profiles(id), -- optional specific user
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  workflow_type TEXT, -- e.g., 'patient_check_in', 'triage_completed'
  metadata JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;

-- Hospital-scoped access
CREATE POLICY "Users can view tasks for their hospital"
  ON workflow_tasks FOR SELECT
  USING (hospital_id IN (SELECT id FROM hospitals));

CREATE POLICY "Users can create tasks for their hospital"
  ON workflow_tasks FOR INSERT
  WITH CHECK (hospital_id IN (SELECT id FROM hospitals));

CREATE POLICY "Users can update tasks in their hospital"
  ON workflow_tasks FOR UPDATE
  USING (hospital_id IN (SELECT id FROM hospitals));

-- Real-time subscription
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_tasks;

-- Cleanup Trigger
CREATE OR REPLACE FUNCTION update_workflow_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_update_workflow_tasks_updated_at
BEFORE UPDATE ON workflow_tasks
FOR EACH ROW
EXECUTE FUNCTION update_workflow_tasks_updated_at();

-- Indexing for performance
CREATE INDEX idx_workflow_tasks_hospital ON workflow_tasks(hospital_id);
CREATE INDEX idx_workflow_tasks_role ON workflow_tasks(assigned_role);
CREATE INDEX idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX idx_workflow_tasks_patient ON workflow_tasks(patient_id);
