-- Prescription Approval Workflow Migration
-- Creates the state machine table for multi-role prescription approval process
-- Workflow: Doctor → Pharmacist → (optionally Nurse for clarification)
-- 
-- Status transitions:
-- initiated → pending_approval → approved → dispensed → completed
--           → rejected (terminal)
--           → pending_clarification → approved (from clarification hook)

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create prescription_approval_workflows table
CREATE TABLE public.prescription_approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'initiated'
    CHECK (status IN ('initiated', 'pending_approval', 'pending_clarification', 'approved', 'dispensed', 'completed', 'rejected', 'cancelled')),
  current_step INTEGER NOT NULL DEFAULT 1,
  
  -- Approval tracking
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  
  -- Workflow metadata
  dur_check_passed BOOLEAN DEFAULT NULL, -- Drug Utilization Review result
  dur_warnings TEXT[], -- ARRAY of DUR warning codes/messages
  clarification_notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.prescription_approval_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Hospital Scoping
-- Users can only see workflows in their hospital
CREATE POLICY "prescription_approval_hospital_scope"
  ON public.prescription_approval_workflows
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

-- RLS Policy: Doctor can view own initiation or assigned patient
CREATE POLICY "prescription_approval_doctor_read"
  ON public.prescription_approval_workflows
  FOR SELECT
  USING (
    initiated_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('doctor', 'pharmacist', 'nurse')
      AND ur.hospital_id = prescription_approval_workflows.hospital_id
    )
  );

-- RLS Policy: Only pharmacist can update (approve/reject)
-- Enforced server-side in Edge Function
CREATE POLICY "prescription_approval_pharmacist_update"
  ON public.prescription_approval_workflows
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'pharmacist'
      AND ur.hospital_id = prescription_approval_workflows.hospital_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'pharmacist'
      AND ur.hospital_id = prescription_approval_workflows.hospital_id
    )
  );

-- Create audit trigger for moddatetime
CREATE TRIGGER prescription_approval_workflows_update_trigger
  BEFORE UPDATE ON public.prescription_approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);

-- Index for common queries
CREATE INDEX idx_prescription_approval_hospital_status
  ON public.prescription_approval_workflows (hospital_id, status);

CREATE INDEX idx_prescription_approval_prescription_id
  ON public.prescription_approval_workflows (prescription_id);

CREATE INDEX idx_prescription_approval_patient_id
  ON public.prescription_approval_workflows (patient_id);

CREATE INDEX idx_prescription_approval_initiated_by
  ON public.prescription_approval_workflows (initiated_by);

-- Grant access
GRANT SELECT, INSERT, UPDATE ON public.prescription_approval_workflows TO authenticated;
