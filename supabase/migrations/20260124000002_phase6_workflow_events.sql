-- ============================================================================
-- PHASE 6.1: WORKFLOW EVENTS & ORCHESTRATION
-- Target: End-to-End Workflow Integration
-- Created: 2026-01-24
-- ============================================================================

-- 1. WORKFLOW EVENTS
-- TRACKS HIGH-LEVEL DOMAIN EVENTS THAT TRIGGER SYSTEM-WIDE WORKFLOWS
CREATE TABLE IF NOT EXISTS workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  
  -- Event Info
  event_type TEXT NOT NULL, -- e.g., 'patient_checkout', 'triage_critical'
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  source_user UUID REFERENCES profiles(user_id),
  source_role app_role,
  
  -- Payload
  payload JSONB DEFAULT '{}'::jsonb,
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  
  -- Status
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workflow_events_hospital_type 
  ON workflow_events(hospital_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_events_patient 
  ON workflow_events(patient_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_staff_events_access" ON workflow_events
  FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM profiles WHERE user_id = auth.uid()));

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT ALL ON workflow_events TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE workflow_events IS 'Audit log of clinical events that trigger cross-role workflows';
