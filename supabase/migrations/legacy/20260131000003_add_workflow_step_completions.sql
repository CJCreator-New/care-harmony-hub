-- Add missing workflow_step_completions table
-- Referenced in useWorkflowOrchestrator and PatientJourneyTracker

CREATE TABLE IF NOT EXISTS workflow_step_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  workflow_type VARCHAR(100) NOT NULL,
  step_name VARCHAR(200) NOT NULL,
  completed_by UUID NOT NULL,
  completed_by_role VARCHAR(50),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_workflow_step_completions_hospital ON workflow_step_completions(hospital_id);
CREATE INDEX idx_workflow_step_completions_patient ON workflow_step_completions(patient_id);
CREATE INDEX idx_workflow_step_completions_workflow ON workflow_step_completions(workflow_type);

-- RLS
ALTER TABLE workflow_step_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can view workflow completions" ON workflow_step_completions
  FOR SELECT USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Hospital staff can insert workflow completions" ON workflow_step_completions
  FOR INSERT WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );