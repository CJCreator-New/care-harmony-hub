-- Tier 4.1: Discharge Workflow Database Schema
-- Purpose: Multi-role discharge workflow state machine with audit logging

-- Main workflow state table
CREATE TABLE IF NOT EXISTS public.discharge_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Workflow state machine
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN (
      'pending_review',
      'clinical_cleared',
      'nurse_confirmed',
      'med_reconciled',
      'financial_cleared',
      'discharged',
      'finalized',
      'cancelled'
    )),
  current_step INTEGER NOT NULL DEFAULT 1,
  cancellation_reason TEXT,
  
  -- Step-specific data (JSONB for flexibility, extensibility)
  clinical_notes JSONB DEFAULT '{}',
  medication_reconciliation JSONB DEFAULT '{}',
  financial_details JSONB DEFAULT '{}',
  checkout_details JSONB DEFAULT '{}',
  
  -- Track who performed each step + timestamp
  doctor_clearance_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  doctor_clearance_at TIMESTAMPTZ,
  nurse_confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nurse_confirmed_at TIMESTAMPTZ,
  pharmacist_reconciliation_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  pharmacist_reconciliation_at TIMESTAMPTZ,
  billing_clearance_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  billing_clearance_at TIMESTAMPTZ,
  receptionist_checkout_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  receptionist_checkout_at TIMESTAMPTZ,
  
  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}',
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT discharge_workflows_unique_admission_active CHECK (
    -- Only one active (non-finalized, non-cancelled) workflow per admission
    status NOT IN ('finalized', 'cancelled') OR 
    admission_id NOT IN (
      SELECT admission_id FROM discharge_workflows 
      WHERE status NOT IN ('finalized', 'cancelled')
    )
  )
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_discharge_workflows_admission 
  ON discharge_workflows(admission_id);
CREATE INDEX IF NOT EXISTS idx_discharge_workflows_hospital 
  ON discharge_workflows(hospital_id);
CREATE INDEX IF NOT EXISTS idx_discharge_workflows_patient 
  ON discharge_workflows(patient_id);
CREATE INDEX IF NOT EXISTS idx_discharge_workflows_status 
  ON discharge_workflows(status);
CREATE INDEX IF NOT EXISTS idx_discharge_workflows_created 
  ON discharge_workflows(created_at DESC);

-- Optional: Task-level checklist (tracks granular tasks within each step)
CREATE TABLE IF NOT EXISTS public.discharge_workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  discharge_workflow_id UUID NOT NULL REFERENCES discharge_workflows(id) ON DELETE CASCADE,
  
  -- Task metadata
  task_name TEXT NOT NULL,
  task_category TEXT NOT NULL CHECK (task_category IN (
    'clinical',
    'medication',
    'financial',
    'checkout'
  )),
  step_number INTEGER NOT NULL,
  
  -- Task state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'completed',
    'skipped',
    'not_applicable'
  )),
  
  -- Assignment + completion tracking
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  
  -- Notes/evidence
  notes TEXT,
  evidence_data JSONB DEFAULT '{}',
  
  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discharge_workflow_tasks_workflow 
  ON discharge_workflow_tasks(discharge_workflow_id);
CREATE INDEX IF NOT EXISTS idx_discharge_workflow_tasks_status 
  ON discharge_workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_discharge_workflow_tasks_hospital 
  ON discharge_workflow_tasks(hospital_id);

-- Row-Level Security (RLS)
ALTER TABLE public.discharge_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discharge_workflow_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view/edit discharge workflows in their hospital
CREATE POLICY "discharge_workflows_hospital_scope" ON public.discharge_workflows
  FOR SELECT USING (
    hospital_id = (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "discharge_workflows_update_own_hospital" ON public.discharge_workflows
  FOR UPDATE USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "discharge_workflows_delete_admin_only" ON public.discharge_workflows
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role = 'admin' AND hospital_id = discharge_workflows.hospital_id
    )
  );

-- RLS Policy: Discharge workflow tasks
CREATE POLICY "discharge_workflow_tasks_hospital_scope" ON public.discharge_workflow_tasks
  FOR SELECT USING (
    hospital_id = (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "discharge_workflow_tasks_update_own_hospital" ON public.discharge_workflow_tasks
  FOR UPDATE USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

-- Auto-update timestamp on modifications
CREATE TRIGGER discharge_workflows_update_timestamp
  BEFORE UPDATE ON discharge_workflows
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

CREATE TRIGGER discharge_workflow_tasks_update_timestamp
  BEFORE UPDATE ON discharge_workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Audit logging function
CREATE OR REPLACE FUNCTION log_discharge_workflow_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (
      action_type,
      resource_type,
      resource_id,
      performed_by,
      hospital_id,
      details
    ) VALUES (
      'discharge_workflow_' || NEW.status,
      'discharge_workflow',
      NEW.id,
      COALESCE(
        NEW.doctor_clearance_by,
        NEW.nurse_confirmed_by,
        NEW.pharmacist_reconciliation_by,
        NEW.billing_clearance_by,
        NEW.receptionist_checkout_by,
        auth.uid()
      ),
      NEW.hospital_id,
      jsonb_build_object(
        'admission_id', NEW.admission_id,
        'patient_id', NEW.patient_id,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'current_step', NEW.current_step,
        'cancellation_reason', NEW.cancellation_reason
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger on status change
CREATE TRIGGER discharge_workflows_audit_status_change
  AFTER UPDATE ON discharge_workflows
  FOR EACH ROW
  EXECUTE FUNCTION log_discharge_workflow_status_change();

-- Audit logging function for task completion
CREATE OR REPLACE FUNCTION log_discharge_workflow_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_logs (
      action_type,
      resource_type,
      resource_id,
      performed_by,
      hospital_id,
      details
    ) VALUES (
      'discharge_workflow_task_' || NEW.status,
      'discharge_workflow_task',
      NEW.id,
      COALESCE(NEW.completed_by, auth.uid()),
      NEW.hospital_id,
      jsonb_build_object(
        'discharge_workflow_id', NEW.discharge_workflow_id,
        'task_name', NEW.task_name,
        'task_category', NEW.task_category,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'notes', NEW.notes
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger on task status change
CREATE TRIGGER discharge_workflow_tasks_audit_status_change
  AFTER UPDATE ON discharge_workflow_tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_discharge_workflow_task_completion();

-- Add discharge workflow reference to admissions table (for quick lookup)
ALTER TABLE public.admissions 
  ADD COLUMN IF NOT EXISTS discharge_workflow_id UUID REFERENCES discharge_workflows(id);

CREATE INDEX IF NOT EXISTS idx_admissions_discharge_workflow 
  ON admissions(discharge_workflow_id);

-- Commentary and version tracking
COMMENT ON TABLE discharge_workflows IS 
  'Multi-role discharge workflow state machine. Tracks patient discharge from initiation through checkout.';

COMMENT ON COLUMN discharge_workflows.status IS 
  'Current state of discharge workflow: pending_review → clinical_cleared → nurse_confirmed → med_reconciled → financial_cleared → discharged → finalized (or cancelled at any point)';

COMMENT ON COLUMN discharge_workflows.current_step IS 
  'Current step number (1-7). Used for progress tracking and UI display.';

COMMENT ON COLUMN discharge_workflows.clinical_notes IS 
  'Doctor-provided clinical rationale for discharge. JSONB structure: {cleared_at, notes, vital_signs_confirmed, ...}';

COMMENT ON COLUMN discharge_workflows.medication_reconciliation IS 
  'Pharmacist reconciliation details. JSONB: {medications: [{name, dose, frequency, status}], reconciled_at, notes}';

COMMENT ON COLUMN discharge_workflows.financial_details IS 
  'Billing final review. JSONB: {outstanding_balance, payment_plan, copay_instructions, insurance_approved}';

COMMENT ON COLUMN discharge_workflows.checkout_details IS 
  'Receptionist checkout info. JSONB: {discharge_summary_sent, patient_acknowledged, followup_appointments, transport_arranged}';
