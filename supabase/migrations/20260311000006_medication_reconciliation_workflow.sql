-- ============================================================
-- Medication Reconciliation on Admission Workflow
-- Enhancement #6: Cross-check incoming patient meds against
-- active prescriptions, flag duplicates/interactions.
-- Roles: doctor (initiate/review) → pharmacist (review) → nurse (reconcile)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.medication_reconciliation_workflows (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id       UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES public.patients(id),
  admission_type    TEXT NOT NULL DEFAULT 'inpatient'
    CHECK (admission_type IN ('inpatient','emergency','elective','transfer')),
  -- Workflow state
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','doctor_review','pharmacist_review','nurse_reconcile','completed','cancelled','failed')),
  current_step      INTEGER NOT NULL DEFAULT 1,
  initiated_by      UUID NOT NULL REFERENCES public.profiles(id),
  -- Medication lists
  home_medications  JSONB NOT NULL DEFAULT '[]',   -- meds patient reports taking at home
  active_orders     JSONB NOT NULL DEFAULT '[]',   -- current active DB prescriptions
  reconciled_list   JSONB DEFAULT NULL,            -- final reconciled medication list
  -- Discrepancy management
  discrepancies     JSONB NOT NULL DEFAULT '[]',   -- [{type,medication,severity,status}]
  interactions_found JSONB NOT NULL DEFAULT '[]',  -- drug-drug or drug-allergy flags
  -- Step actors
  doctor_reviewed_by  UUID REFERENCES public.profiles(id),
  doctor_reviewed_at  TIMESTAMPTZ,
  pharmacist_reviewed_by UUID REFERENCES public.profiles(id),
  pharmacist_reviewed_at TIMESTAMPTZ,
  nurse_reconciled_by UUID REFERENCES public.profiles(id),
  nurse_reconciled_at TIMESTAMPTZ,
  -- Metadata
  notes             TEXT,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS med_recon_hospital_idx
  ON public.medication_reconciliation_workflows(hospital_id);
CREATE INDEX IF NOT EXISTS med_recon_patient_idx
  ON public.medication_reconciliation_workflows(patient_id);
CREATE INDEX IF NOT EXISTS med_recon_status_idx
  ON public.medication_reconciliation_workflows(status)
  WHERE status NOT IN ('completed','cancelled');

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_med_recon_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS med_recon_updated_at_trigger
  ON public.medication_reconciliation_workflows;

CREATE TRIGGER med_recon_updated_at_trigger
  BEFORE UPDATE ON public.medication_reconciliation_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_med_recon_updated_at();

-- ============================================================
-- Audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medication_reconciliation_audit (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id      UUID NOT NULL REFERENCES public.medication_reconciliation_workflows(id) ON DELETE CASCADE,
  hospital_id      UUID NOT NULL REFERENCES public.hospitals(id),
  actor_id         UUID NOT NULL REFERENCES public.profiles(id),
  actor_role       TEXT NOT NULL,
  action           TEXT NOT NULL
    CHECK (action IN ('initiate','doctor_review','pharmacist_review','nurse_reconcile','override','complete','cancel')),
  from_status      TEXT,
  to_status        TEXT,
  discrepancies_resolved INTEGER DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medication_reconciliation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med_recon_audit_hospital_read" ON public.medication_reconciliation_audit
  FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE INDEX IF NOT EXISTS med_recon_audit_workflow_idx
  ON public.medication_reconciliation_audit(workflow_id);

-- ============================================================
-- RLS for main workflow table
-- ============================================================
ALTER TABLE public.medication_reconciliation_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "med_recon_hospital_read" ON public.medication_reconciliation_workflows
  FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "med_recon_doctor_initiate" ON public.medication_reconciliation_workflows
  FOR INSERT
  WITH CHECK (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('doctor','admin','super_admin','nurse')
        AND ur.hospital_id = hospital_id
    )
  );

CREATE POLICY "med_recon_staff_update" ON public.medication_reconciliation_workflows
  FOR UPDATE
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('doctor','pharmacist','nurse','admin','super_admin')
        AND ur.hospital_id = hospital_id
    )
  );
