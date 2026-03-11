CREATE TABLE public.discharge_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  initiated_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  current_step TEXT NOT NULL DEFAULT 'pharmacist'
    CHECK (current_step IN ('doctor', 'pharmacist', 'billing', 'nurse', 'completed', 'cancelled')),
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
  last_action_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  last_action_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.discharge_workflow_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.discharge_workflows(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  transition_action TEXT NOT NULL CHECK (transition_action IN ('initiate', 'approve', 'reject', 'cancel')),
  from_step TEXT,
  to_step TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discharge_workflows_hospital_status
  ON public.discharge_workflows(hospital_id, status, current_step);

CREATE INDEX idx_discharge_workflows_patient
  ON public.discharge_workflows(patient_id, created_at DESC);

CREATE INDEX idx_discharge_workflow_audit_workflow
  ON public.discharge_workflow_audit(workflow_id, created_at DESC);

ALTER TABLE public.discharge_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discharge_workflow_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discharge_workflows_hospital_select"
ON public.discharge_workflows
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "discharge_workflows_hospital_insert"
ON public.discharge_workflows
FOR INSERT
WITH CHECK (
  hospital_id IN (
    SELECT hospital_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "discharge_workflows_hospital_update"
ON public.discharge_workflows
FOR UPDATE
USING (
  hospital_id IN (
    SELECT hospital_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  hospital_id IN (
    SELECT hospital_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "discharge_workflow_audit_hospital_select"
ON public.discharge_workflow_audit
FOR SELECT
USING (
  hospital_id IN (
    SELECT hospital_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "discharge_workflow_audit_hospital_insert"
ON public.discharge_workflow_audit
FOR INSERT
WITH CHECK (
  hospital_id IN (
    SELECT hospital_id
    FROM public.profiles
    WHERE user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_discharge_workflows_updated_at ON public.discharge_workflows;
CREATE TRIGGER update_discharge_workflows_updated_at
  BEFORE UPDATE ON public.discharge_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.discharge_workflows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discharge_workflow_audit;

COMMENT ON TABLE public.discharge_workflows IS
  'Multi-role patient discharge workflow state machine: doctor to pharmacist to billing to nurse.';

COMMENT ON TABLE public.discharge_workflow_audit IS
  'Immutable audit trail of patient discharge workflow state transitions.';
