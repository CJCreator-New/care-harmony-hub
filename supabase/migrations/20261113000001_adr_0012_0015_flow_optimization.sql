-- ADR-0012 / ADR-0013 / ADR-0014 / ADR-0015
-- Flow optimization: hybrid queue orchestration, concurrent discharge staging,
-- portal identity tiering and moderated appointment booking.
--
-- Safety invariants preserved:
--   * Claims are atomic (SELECT ... FOR UPDATE) and hospital scoped.
--   * Emergency bypass requires a written clinical rationale.
--   * Nursing release is gated on doctor + pharmacy + billing clearance.
--   * Unverified portal patients cannot lock a clinical calendar slot.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ADR-0012: Hybrid queue orchestration (doctor pull / nurse push)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.patient_queue
  ADD COLUMN IF NOT EXISTS claimed_by_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_room TEXT,
  ADD COLUMN IF NOT EXISTS triage_acuity TEXT,
  ADD COLUMN IF NOT EXISTS emergency_bypass BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bypass_rationale TEXT,
  ADD COLUMN IF NOT EXISTS routed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS routed_at TIMESTAMPTZ;

ALTER TABLE public.patient_queue
  DROP CONSTRAINT IF EXISTS patient_queue_triage_acuity_check;
ALTER TABLE public.patient_queue
  ADD CONSTRAINT patient_queue_triage_acuity_check
  CHECK (triage_acuity IS NULL OR triage_acuity IN ('red', 'amber', 'green'));

ALTER TABLE public.patient_queue
  DROP CONSTRAINT IF EXISTS patient_queue_bypass_rationale_check;
ALTER TABLE public.patient_queue
  ADD CONSTRAINT patient_queue_bypass_rationale_check
  CHECK (
    emergency_bypass = false
    OR (bypass_rationale IS NOT NULL AND length(btrim(bypass_rationale)) >= 5)
  );

-- Claimable pool lookup, emergency-pinned first (ADR-0012 §3).
CREATE INDEX IF NOT EXISTS idx_patient_queue_claimable
  ON public.patient_queue (hospital_id, status, emergency_bypass DESC, priority DESC, check_in_time)
  WHERE status IN ('waiting', 'called');

-- Doctor self-claim. Atomic: the row lock plus the status guard means exactly one
-- physician can claim a patient; every other concurrent caller raises.
CREATE OR REPLACE FUNCTION public.claim_queue_patient(p_entry_id UUID)
RETURNS public.patient_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_profile_id UUID;
  v_hospital UUID;
  v_entry public.patient_queue;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;

  SELECT p.id, p.hospital_id INTO v_profile_id, v_hospital
  FROM public.profiles p
  WHERE p.user_id = v_actor AND COALESCE(p.is_active, true) = true;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_PROFILE' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(v_actor, 'doctor') OR public.has_role(v_actor, 'admin')) THEN
    RAISE EXCEPTION 'FORBIDDEN_ROLE: only doctors or admins may claim a patient'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_entry
  FROM public.patient_queue
  WHERE id = p_entry_id AND hospital_id = v_hospital
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QUEUE_ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_entry.status NOT IN ('waiting', 'called') THEN
    RAISE EXCEPTION 'QUEUE_ENTRY_NOT_CLAIMABLE: status is %', v_entry.status
      USING ERRCODE = '23514';
  END IF;

  IF v_entry.claimed_by_doctor_id IS NOT NULL AND v_entry.claimed_by_doctor_id <> v_profile_id THEN
    RAISE EXCEPTION 'QUEUE_ENTRY_ALREADY_CLAIMED' USING ERRCODE = '23505';
  END IF;

  UPDATE public.patient_queue
  SET status = 'in_service',
      claimed_by_doctor_id = v_profile_id,
      claimed_at = NOW(),
      assigned_to = COALESCE(assigned_to, v_profile_id),
      service_start_time = COALESCE(service_start_time, NOW())
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  RETURN v_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_queue_patient(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION public.claim_queue_patient IS
  'ADR-0012: atomic doctor self-claim; one winner per queue entry, hospital scoped.';

-- Triage nurse push: route a patient to a named doctor and room. May also record
-- triage acuity and an emergency triage bypass with a mandatory rationale.
CREATE OR REPLACE FUNCTION public.route_queue_patient(
  p_entry_id UUID,
  p_doctor_id UUID,
  p_room TEXT DEFAULT NULL,
  p_acuity TEXT DEFAULT NULL,
  p_emergency_bypass BOOLEAN DEFAULT false,
  p_bypass_rationale TEXT DEFAULT NULL
)
RETURNS public.patient_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_hospital UUID;
  v_entry public.patient_queue;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;

  SELECT p.hospital_id INTO v_hospital
  FROM public.profiles p
  WHERE p.user_id = v_actor AND COALESCE(p.is_active, true) = true;

  IF v_hospital IS NULL THEN
    RAISE EXCEPTION 'NO_ACTIVE_PROFILE' USING ERRCODE = '28000';
  END IF;

  IF NOT (
    public.has_role(v_actor, 'nurse')
    OR public.has_role(v_actor, 'admin')
    OR public.has_role(v_actor, 'doctor')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_ROLE: only nurses, doctors or admins may route a patient'
      USING ERRCODE = '42501';
  END IF;

  IF p_acuity IS NOT NULL AND p_acuity NOT IN ('red', 'amber', 'green') THEN
    RAISE EXCEPTION 'INVALID_ACUITY: %', p_acuity USING ERRCODE = '23514';
  END IF;

  IF p_emergency_bypass AND (p_bypass_rationale IS NULL OR length(btrim(p_bypass_rationale)) < 5) THEN
    RAISE EXCEPTION 'BYPASS_RATIONALE_REQUIRED: emergency triage bypass needs a clinical rationale'
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_entry
  FROM public.patient_queue
  WHERE id = p_entry_id AND hospital_id = v_hospital
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'QUEUE_ENTRY_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_entry.status NOT IN ('waiting', 'called') THEN
    RAISE EXCEPTION 'QUEUE_ENTRY_NOT_ROUTABLE: status is %', v_entry.status
      USING ERRCODE = '23514';
  END IF;

  IF v_entry.claimed_by_doctor_id IS NOT NULL
     AND p_doctor_id IS NOT NULL
     AND v_entry.claimed_by_doctor_id <> p_doctor_id THEN
    RAISE EXCEPTION 'QUEUE_ENTRY_ALREADY_CLAIMED' USING ERRCODE = '23505';
  END IF;

  UPDATE public.patient_queue
  SET status = 'called',
      assigned_to = p_doctor_id,
      claimed_by_doctor_id = p_doctor_id,
      claimed_at = CASE WHEN p_doctor_id IS NULL THEN claimed_at ELSE NOW() END,
      assigned_room = COALESCE(p_room, assigned_room),
      triage_acuity = COALESCE(p_acuity, triage_acuity),
      emergency_bypass = v_entry.emergency_bypass OR p_emergency_bypass,
      bypass_rationale = COALESCE(p_bypass_rationale, bypass_rationale),
      routed_by = v_actor,
      routed_at = NOW(),
      called_time = COALESCE(called_time, NOW())
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  RETURN v_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION public.route_queue_patient(UUID, UUID, TEXT, TEXT, BOOLEAN, TEXT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.route_queue_patient IS
  'ADR-0012: triage nurse push — assign doctor/room, acuity and audited emergency bypass.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADR-0014: Concurrent staging with an inviolable nursing release gate
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.discharge_workflows
  ADD COLUMN IF NOT EXISTS doctor_signed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pharmacy_cleared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS billing_cleared BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS staging_started_at TIMESTAMPTZ;

-- Backfill rows that already advanced under the sequential pipeline (ADR-0003).
UPDATE public.discharge_workflows
SET doctor_signed = true,
    pharmacy_cleared = current_step IN ('billing', 'nurse', 'completed', 'completed_ama'),
    billing_cleared = current_step IN ('nurse', 'completed', 'completed_ama'),
    staging_started_at = COALESCE(staging_started_at, last_action_at, created_at)
WHERE current_step NOT IN ('doctor', 'cancelled');

-- Allow the staging status and the AMA terminal step the client already uses.
ALTER TABLE public.discharge_workflows
  DROP CONSTRAINT IF EXISTS discharge_workflows_status_check;
ALTER TABLE public.discharge_workflows
  ADD CONSTRAINT discharge_workflows_status_check
  CHECK (status IN ('draft', 'in_progress', 'staging', 'completed', 'completed_ama', 'cancelled'));

ALTER TABLE public.discharge_workflows
  DROP CONSTRAINT IF EXISTS discharge_workflows_current_step_check;
ALTER TABLE public.discharge_workflows
  ADD CONSTRAINT discharge_workflows_current_step_check
  CHECK (current_step IN ('doctor', 'pharmacist', 'billing', 'nurse', 'completed', 'completed_ama', 'cancelled'));

-- The nursing release gate is enforced in the database, not only in the UI.
ALTER TABLE public.discharge_workflows
  DROP CONSTRAINT IF EXISTS discharge_nurse_release_gate;
ALTER TABLE public.discharge_workflows
  ADD CONSTRAINT discharge_nurse_release_gate
  CHECK (
    current_step <> 'completed'
    OR (doctor_signed AND pharmacy_cleared AND billing_cleared)
  );

-- Parallel-safe approval. `p_clearance` is the discipline the actor represents
-- (doctor | pharmacy | billing | nurse). Pharmacy and billing may act in any
-- order once staging starts; nursing completes only after both clear.
CREATE OR REPLACE FUNCTION public.approve_discharge_step(
  p_workflow_id UUID,
  p_hospital_id UUID,
  p_expected_step TEXT,
  p_actor_id UUID,
  p_clearance TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS public.discharge_workflows
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow public.discharge_workflows;
BEGIN
  SELECT * INTO v_workflow
  FROM public.discharge_workflows
  WHERE id = p_workflow_id AND hospital_id = p_hospital_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORKFLOW_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_workflow.status IN ('completed', 'completed_ama', 'cancelled') THEN
    RAISE EXCEPTION 'TERMINAL_STATE: workflow is %', v_workflow.status USING ERRCODE = '23514';
  END IF;

  IF p_clearance NOT IN ('doctor', 'pharmacy', 'billing', 'nurse') THEN
    RAISE EXCEPTION 'INVALID_CLEARANCE: %', p_clearance USING ERRCODE = '23514';
  END IF;

  -- Staging lets the other discipline act while the row is parked on one of them.
  IF v_workflow.current_step <> p_expected_step
     AND NOT (
       v_workflow.status = 'staging'
       AND (
         (p_clearance = 'billing' AND v_workflow.current_step = 'pharmacist')
         OR (p_clearance = 'pharmacy' AND v_workflow.current_step = 'billing')
       )
     ) THEN
    RAISE EXCEPTION 'STEP_MISMATCH: expected %, got %', p_expected_step, v_workflow.current_step
      USING ERRCODE = '23514';
  END IF;

  IF p_clearance = 'doctor' THEN
    IF v_workflow.current_step <> 'doctor' THEN
      RAISE EXCEPTION 'STEP_MISMATCH: doctor order already signed' USING ERRCODE = '23514';
    END IF;
    UPDATE public.discharge_workflows
    SET doctor_signed = true,
        status = 'staging',
        current_step = 'pharmacist',
        staging_started_at = COALESCE(staging_started_at, NOW()),
        last_action_by = p_actor_id,
        last_action_at = NOW(),
        rejection_reason = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata,
        updated_at = NOW()
    WHERE id = p_workflow_id
    RETURNING * INTO v_workflow;

  ELSIF p_clearance = 'pharmacy' THEN
    IF v_workflow.pharmacy_cleared THEN
      RAISE EXCEPTION 'ALREADY_CLEARED: pharmacy' USING ERRCODE = '23505';
    END IF;
    UPDATE public.discharge_workflows
    SET pharmacy_cleared = true,
        status = CASE WHEN billing_cleared THEN 'in_progress' ELSE 'staging' END,
        current_step = CASE WHEN billing_cleared THEN 'nurse' ELSE current_step END,
        last_action_by = p_actor_id,
        last_action_at = NOW(),
        rejection_reason = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata,
        updated_at = NOW()
    WHERE id = p_workflow_id
    RETURNING * INTO v_workflow;

  ELSIF p_clearance = 'billing' THEN
    IF v_workflow.billing_cleared THEN
      RAISE EXCEPTION 'ALREADY_CLEARED: billing' USING ERRCODE = '23505';
    END IF;
    UPDATE public.discharge_workflows
    SET billing_cleared = true,
        status = CASE WHEN pharmacy_cleared THEN 'in_progress' ELSE 'staging' END,
        current_step = CASE WHEN pharmacy_cleared THEN 'nurse' ELSE current_step END,
        last_action_by = p_actor_id,
        last_action_at = NOW(),
        rejection_reason = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata,
        updated_at = NOW()
    WHERE id = p_workflow_id
    RETURNING * INTO v_workflow;

  ELSE
    IF v_workflow.current_step <> 'nurse' THEN
      RAISE EXCEPTION 'NURSE_RELEASE_GATE: workflow is not at the nursing step'
        USING ERRCODE = '23514';
    END IF;
    IF NOT (v_workflow.doctor_signed AND v_workflow.pharmacy_cleared AND v_workflow.billing_cleared) THEN
      RAISE EXCEPTION 'NURSE_RELEASE_GATE: doctor, pharmacy and billing clearance are all required'
        USING ERRCODE = '23514';
    END IF;
    UPDATE public.discharge_workflows
    SET current_step = 'completed',
        status = 'completed',
        last_action_by = p_actor_id,
        last_action_at = NOW(),
        rejection_reason = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata,
        updated_at = NOW()
    WHERE id = p_workflow_id
    RETURNING * INTO v_workflow;
  END IF;

  RETURN v_workflow;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_discharge_step(UUID, UUID, TEXT, UUID, TEXT, JSONB)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.approve_discharge_step IS
  'ADR-0014: concurrent pharmacy/billing staging with a database-enforced nursing release gate.';

CREATE INDEX IF NOT EXISTS idx_discharge_workflows_staging
  ON public.discharge_workflows (hospital_id, status, pharmacy_cleared, billing_cleared)
  WHERE status = 'staging';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2b. ADR-0013: device timestamp for offline-captured bedside vitals
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.vital_signs
  ADD COLUMN IF NOT EXISTS client_recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.vital_signs.client_recorded_at IS
  'ADR-0013: device clock time captured while offline; created_at remains the server ingest time.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ADR-0008 / ADR-0015: portal identity tiering and moderated booking
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'pending_confirmation';

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS is_identity_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.appointment_requests
  ADD COLUMN IF NOT EXISTS verification_tier TEXT NOT NULL DEFAULT 'tier1',
  ADD COLUMN IF NOT EXISTS matched_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

ALTER TABLE public.appointment_requests
  DROP CONSTRAINT IF EXISTS appointment_requests_verification_tier_check;
ALTER TABLE public.appointment_requests
  ADD CONSTRAINT appointment_requests_verification_tier_check
  CHECK (verification_tier IN ('tier1', 'tier2'));

ALTER TABLE public.appointment_requests
  DROP CONSTRAINT IF EXISTS appointment_requests_status_check;
ALTER TABLE public.appointment_requests
  ADD CONSTRAINT appointment_requests_status_check
  CHECK (status IN ('pending', 'pending_confirmation', 'approved', 'rejected', 'needs_review', 'reschedule_requested', 'cancelled'));

-- Server-side enforcement: a portal patient cannot self-assign an approved
-- status or a higher verification tier at insert time.
CREATE OR REPLACE FUNCTION public.enforce_tier1_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'patient') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(p.is_identity_verified, false) INTO v_verified
  FROM public.patients p
  WHERE p.id = NEW.patient_id;

  NEW.verification_tier := CASE WHEN v_verified THEN 'tier2' ELSE 'tier1' END;
  NEW.status := CASE WHEN v_verified THEN 'pending' ELSE 'pending_confirmation' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tier1_booking_status ON public.appointment_requests;
CREATE TRIGGER trg_enforce_tier1_booking_status
  BEFORE INSERT ON public.appointment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_tier1_booking_status();

COMMENT ON COLUMN public.patients.is_identity_verified IS
  'ADR-0008: true once hospital staff verified photo ID in person. Tier-1 patients cannot view historical PHI.';

COMMENT ON COLUMN public.appointment_requests.verification_tier IS
  'ADR-0015: tier1 portal requests require front-desk moderation before the slot is confirmed.';
