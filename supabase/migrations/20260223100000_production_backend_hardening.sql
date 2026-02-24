-- =============================================================================
-- Migration: Production Backend Hardening
-- Date: 2026-02-23
-- Author: Architecture Audit
-- =============================================================================
-- Fixes identified in the comprehensive database audit against DATABASE.md,
-- USER_FLOW_AUDIT_REPORT.md, and the frontend hook source files:
--
--  1.  CREATE TABLE lab_queue          (was missing; useCreateLabOrder fails)
--  2.  Fix notifications.type CHECK    (missing 'info' causes INSERT errors)
--  3.  Fix notifications.category CHECK (missing 'pharmacy', 'laboratory', 'nursing')
--  4.  Fix notifications column name    (complete_patient_prep uses 'data' not 'metadata')
--  5.  Fix complete_patient_prep()      (wrong type + wrong FK value for recipient_id)
--  6.  Update workflow_rules seed data  (underscore events → dot-notation constants)
--  7.  DB trigger: patient checked-in → notify nurses
--  8.  DB trigger: prescription INSERT → notify pharmacists
--  9.  DB trigger: lab order completed → notify ordering doctor
--  10. DB trigger: consultation completed → notify receptionists
--  11. Add patients.encryption_metadata  (HIPAA PHI column required by useHIPAACompliance)
--  12. Add role-specific RLS to lab_queue and prescription_queue
--  13. Enable Supabase Realtime on all clinical tables
-- =============================================================================


-- =============================================================================
-- 1. CREATE lab_queue TABLE
--    Referenced by useCreateLabOrder (src/hooks/useLabOrders.ts) but never
--    defined in any previous migration.  The hook inserts here after creating
--    the lab_orders row and treats this as a durable processing queue.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lab_queue (
  id             UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id    UUID         NOT NULL REFERENCES public.hospitals(id)   ON DELETE CASCADE,
  lab_order_id   UUID         NOT NULL REFERENCES public.lab_orders(id)  ON DELETE CASCADE,
  patient_id     UUID         NOT NULL REFERENCES public.patients(id)    ON DELETE CASCADE,

  -- Processing status lifecycle
  status         TEXT         NOT NULL DEFAULT 'queued'
      CHECK (status IN ('queued', 'assigned', 'collecting', 'processing', 'resulted', 'cancelled')),

  -- Urgency mirrors the lab_orders.priority field
  priority       TEXT         NOT NULL DEFAULT 'normal'
      CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'emergency')),

  -- Staff assignment
  assigned_to    UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at    TIMESTAMPTZ,

  -- Timing
  started_at     TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,

  -- Free-form metadata (test_name snapshot, LOINC code, etc.)
  metadata       JSONB        NOT NULL DEFAULT '{}'::jsonb,

  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.lab_queue ENABLE ROW LEVEL SECURITY;

-- Any authenticated staff in the same hospital can read/write the lab queue
CREATE POLICY "lab_queue_hospital_access"
  ON public.lab_queue FOR ALL TO authenticated
  USING  (hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));

-- Lab technicians and admins can update queue entries
CREATE POLICY "lab_queue_lab_tech_write"
  ON public.lab_queue FOR UPDATE TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'lab_technician')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lab_queue_hospital_status
  ON public.lab_queue(hospital_id, status);
CREATE INDEX IF NOT EXISTS idx_lab_queue_lab_order
  ON public.lab_queue(lab_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_queue_patient
  ON public.lab_queue(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_queue_assigned
  ON public.lab_queue(assigned_to) WHERE assigned_to IS NOT NULL;

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_queue_updated_at ON public.lab_queue;
CREATE TRIGGER trg_lab_queue_updated_at
  BEFORE UPDATE ON public.lab_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 2.  Fix notifications.type CHECK constraint
--     Current allowed set:
--       'appointment_reminder','prescription_ready','lab_results','invoice',
--       'system','message','alert','task'
--     Missing values used by frontend hooks:
--       'info'          – notifyPrescriptionReady, notifyBillingUpdate
--       'patient_ready' – complete_patient_prep() legacy path (being fixed below)
--     Strategy: drop the constraint and re-add with the full canonical set.
-- =============================================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'appointment_reminder',
    'prescription_ready',
    'lab_results',
    'invoice',
    'system',
    'message',
    'alert',
    'task',
    'info',        -- General informational messages (patient portal, pharmacy)
    'warning'      -- Non-critical warnings
  ));


-- =============================================================================
-- 3.  Fix notifications.category CHECK constraint
--     Current allowed set: 'clinical','administrative','billing','system','communication'
--     Missing values used by frontend hooks:
--       'pharmacy'   – notifyPrescriptionReady (PrescriptionQueue.tsx)
--       'laboratory' – LaboratoryPage.tsx notification triggers
--       'nursing'    – NurseDashboard workflow notifications
-- =============================================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_category_check
  CHECK (category IN (
    'clinical',
    'administrative',
    'billing',
    'system',
    'communication',
    'pharmacy',       -- Dispensing completed / prescription ready
    'laboratory',     -- Lab results / critical values
    'nursing'         -- Shift handover / patient prep complete
  ));


-- =============================================================================
-- 4 & 5.  Fix complete_patient_prep() function
--     Three bugs in the notification INSERT inside the function:
--       a) type: 'patient_ready'       – not in CHECK constraint (→ 'alert')
--       b) column name: 'data'         – column is actually 'metadata'
--       c) recipient = pq.assigned_to  – profiles.id (PK), but notifications
--          recipient_id references profiles(user_id) i.e. the auth UID.
--          Fix: look up the auth user_id from profiles for the assigned_to profile.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.complete_patient_prep(
  p_patient_id         UUID,
  p_queue_entry_id     UUID,
  p_vitals_data        JSONB,
  p_chief_complaint    TEXT,
  p_allergies          TEXT  DEFAULT NULL,
  p_current_medications TEXT DEFAULT NULL,
  p_nurse_notes        TEXT  DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_caller_uid  UUID  := auth.uid();
  v_hospital_id UUID;
  v_assigned_to_profile_id UUID;
  v_doctor_user_id         UUID;
  v_patient_name           TEXT;
BEGIN
  -- Resolve hospital for this patient
  SELECT hospital_id INTO v_hospital_id
  FROM public.patients WHERE id = p_patient_id;

  BEGIN
    -- 1. Insert vitals into vital_signs (corrected table + column names)
    INSERT INTO public.vital_signs (
      patient_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      weight,
      height,
      pain_level,
      bmi,
      recorded_at,
      recorded_by
    ) VALUES (
      p_patient_id,
      NULLIF((p_vitals_data->>'temperature'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'blood_pressure_systolic'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'blood_pressure_diastolic'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'heart_rate'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'respiratory_rate'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'oxygen_saturation'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'weight'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'height'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'pain_scale'), '')::NUMERIC,
      NULLIF((p_vitals_data->>'bmi'), '')::NUMERIC,
      NOW(),
      v_caller_uid
    );

    -- 2. Upsert prep checklist (patient_prep_checklists)
    INSERT INTO public.patient_prep_checklists (
      patient_id,
      queue_entry_id,
      hospital_id,
      vitals_completed,
      chief_complaint_recorded,
      allergies_verified,
      medications_reviewed,
      ready_for_doctor,
      notes
    ) VALUES (
      p_patient_id,
      p_queue_entry_id,
      v_hospital_id,
      true,
      true,
      (p_allergies          IS NOT NULL AND p_allergies          <> ''),
      (p_current_medications IS NOT NULL AND p_current_medications <> ''),
      true,
      CONCAT_WS(E'\n',
        p_chief_complaint,
        CASE WHEN p_allergies IS NOT NULL AND p_allergies <> ''
             THEN 'Allergies: ' || p_allergies END,
        CASE WHEN p_current_medications IS NOT NULL AND p_current_medications <> ''
             THEN 'Medications: ' || p_current_medications END,
        p_nurse_notes
      )
    )
    ON CONFLICT (patient_id, queue_entry_id)
    DO UPDATE SET
      vitals_completed         = true,
      chief_complaint_recorded = true,
      allergies_verified       = (p_allergies IS NOT NULL AND p_allergies <> ''),
      medications_reviewed     = (p_current_medications IS NOT NULL AND p_current_medications <> ''),
      ready_for_doctor         = true,
      notes = CONCAT_WS(E'\n',
        p_chief_complaint,
        CASE WHEN p_allergies IS NOT NULL AND p_allergies <> ''
             THEN 'Allergies: ' || p_allergies END,
        CASE WHEN p_current_medications IS NOT NULL AND p_current_medications <> ''
             THEN 'Medications: ' || p_current_medications END,
        p_nurse_notes
      ),
      updated_at = NOW();

    -- 3. Advance queue to in_service
    UPDATE public.patient_queue
    SET status = 'in_service', updated_at = NOW()
    WHERE id = p_queue_entry_id;

    -- 4. Notify assigned doctor/staff (if any) - corrected type, metadata col, and FK
    SELECT pq.assigned_to INTO v_assigned_to_profile_id
    FROM public.patient_queue pq
    WHERE pq.id = p_queue_entry_id
      AND pq.assigned_to IS NOT NULL;

    IF v_assigned_to_profile_id IS NOT NULL THEN
      -- Resolve auth user_id from the profiles.id value
      SELECT p.user_id INTO v_doctor_user_id
      FROM public.profiles p
      WHERE p.id = v_assigned_to_profile_id;

      SELECT CONCAT(pt.first_name, ' ', pt.last_name) INTO v_patient_name
      FROM public.patients pt WHERE pt.id = p_patient_id;

      IF v_doctor_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          hospital_id,
          recipient_id,
          sender_id,
          type,            -- FIX: was 'patient_ready' (not in CHECK) → 'alert'
          title,
          message,
          metadata,        -- FIX: was 'data' (column does not exist)
          priority,
          category,
          created_at
        ) VALUES (
          v_hospital_id,
          v_doctor_user_id, -- FIX: auth UID via profiles.user_id, not profiles.id
          v_caller_uid,
          'alert',
          'Patient Ready for Consultation',
          CONCAT(v_patient_name, ' is ready. Chief complaint: ', p_chief_complaint),
          jsonb_build_object(
            'patient_id',      p_patient_id,
            'queue_entry_id',  p_queue_entry_id,
            'patient_name',    v_patient_name,
            'chief_complaint', p_chief_complaint
          ),
          'high',
          'nursing',
          NOW()
        );
      END IF;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION public.complete_patient_prep IS
  'Atomic patient prep completion: inserts vital_signs, upserts patient_prep_checklists, '
  'advances patient_queue to in_service, and notifies the assigned doctor via notifications.';


-- =============================================================================
-- 6.  Normalise workflow_rules.trigger_event to dot-notation
--     The frontend dispatches events via WORKFLOW_EVENT_TYPES constants which
--     all use dot-notation (e.g. 'prescription.created').  The seed data in the
--     misc migration used underscore-based names, which never matched.
-- =============================================================================

UPDATE public.workflow_rules
SET trigger_event = CASE trigger_event
  WHEN 'patient_check_in'       THEN 'patient.checked_in'
  WHEN 'patient_checked_in'     THEN 'patient.checked_in'
  WHEN 'triage_completed'       THEN 'patient.ready_for_doctor'
  WHEN 'vitals_recorded'        THEN 'vitals.recorded'
  WHEN 'consultation_started'   THEN 'consultation.started'
  WHEN 'consultation_completed' THEN 'consultation.completed'
  WHEN 'prescription_created'   THEN 'prescription.created'
  WHEN 'prescription_verified'  THEN 'prescription.verified'
  WHEN 'lab_order_created'      THEN 'lab.order_created'
  WHEN 'lab_results_ready'      THEN 'lab.results_ready'
  WHEN 'lab_critical_alert'     THEN 'lab.critical_alert'
  WHEN 'invoice_created'        THEN 'invoice.created'
  WHEN 'payment_received'       THEN 'payment.received'
  ELSE trigger_event  -- already correct or custom rule; leave unchanged
END
WHERE trigger_event NOT LIKE '%.%'; -- only update those still using underscores


-- =============================================================================
-- 7.  DB TRIGGER: patient_queue INSERT → notify all nurses
--     Supplements the frontend's notifyPatientCheckedIn() call with a reliable
--     server-side fan-out so nurses are always notified even if the client drops.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_patient_checked_in()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_patient_name TEXT;
  v_nurse        RECORD;
BEGIN
  -- Resolve patient name for the notification message
  SELECT CONCAT(first_name, ' ', last_name)
  INTO   v_patient_name
  FROM   public.patients
  WHERE  id = NEW.patient_id;

  -- Fan-out: one notification per nurse in the same hospital
  FOR v_nurse IN
    SELECT DISTINCT p.user_id
    FROM   public.profiles  p
    JOIN   public.user_roles ur ON ur.user_id = p.user_id
    WHERE  p.hospital_id = NEW.hospital_id
    AND    ur.role       = 'nurse'
    AND    ur.hospital_id = NEW.hospital_id
  LOOP
    INSERT INTO public.notifications (
      hospital_id,
      recipient_id,
      type,
      title,
      message,
      priority,
      category,
      metadata
    ) VALUES (
      NEW.hospital_id,
      v_nurse.user_id,
      'alert',
      'Patient Checked In',
      COALESCE(v_patient_name, 'A patient') || ' has checked in and is waiting for triage (Queue #' || NEW.queue_number || ')',
      'normal',
      'nursing',
      jsonb_build_object(
        'queue_entry_id', NEW.id,
        'patient_id',     NEW.patient_id,
        'queue_number',   NEW.queue_number,
        'priority',       NEW.priority
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_checked_in ON public.patient_queue;
CREATE TRIGGER trg_patient_checked_in
  AFTER INSERT ON public.patient_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_patient_checked_in();

COMMENT ON FUNCTION public.notify_patient_checked_in IS
  'Server-side fan-out: when a patient is added to patient_queue, '
  'inserts one notification row per nurse in the same hospital.';


-- =============================================================================
-- 8.  DB TRIGGER: prescriptions INSERT → notify all pharmacists
--     Guarantees pharmacists are notified even when the doctor uses the
--     QuickConsultationModal or any path that doesn't call notifyPrescriptionCreated.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_prescription_to_pharmacists()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_patient_name   TEXT;
  v_prescriber_uid UUID;
  v_pharmacist     RECORD;
BEGIN
  -- Resolve names / sender for the notification
  SELECT CONCAT(first_name, ' ', last_name)
  INTO   v_patient_name
  FROM   public.patients
  WHERE  id = NEW.patient_id;

  SELECT user_id INTO v_prescriber_uid
  FROM   public.profiles
  WHERE  id = NEW.prescribed_by;

  -- Fan-out to all pharmacists in this hospital
  FOR v_pharmacist IN
    SELECT DISTINCT p.user_id
    FROM   public.profiles  p
    JOIN   public.user_roles ur ON ur.user_id = p.user_id
    WHERE  p.hospital_id  = NEW.hospital_id
    AND    ur.role        = 'pharmacist'
    AND    ur.hospital_id = NEW.hospital_id
  LOOP
    INSERT INTO public.notifications (
      hospital_id,
      recipient_id,
      sender_id,
      type,
      title,
      message,
      priority,
      category,
      metadata
    ) VALUES (
      NEW.hospital_id,
      v_pharmacist.user_id,
      v_prescriber_uid,
      'task',
      'New Prescription to Dispense',
      'New prescription for ' || COALESCE(v_patient_name, 'a patient') || ' requires review and dispensing',
      CASE WHEN NEW.priority = 'stat' THEN 'urgent' ELSE 'high' END,
      'pharmacy',
      jsonb_build_object(
        'prescription_id', NEW.id,
        'patient_id',      NEW.patient_id,
        'prescription_priority', COALESCE(NEW.priority, 'normal')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prescription_created ON public.prescriptions;
CREATE TRIGGER trg_prescription_created
  AFTER INSERT ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_prescription_to_pharmacists();

COMMENT ON FUNCTION public.notify_prescription_to_pharmacists IS
  'Server-side fan-out: when a prescription is inserted, notifies all '
  'pharmacists in the same hospital so they can process the queue.';


-- =============================================================================
-- 9.  DB TRIGGER: lab_orders UPDATE (status → 'completed') → notify ordering doctor
--     Critical lab values use priority='urgent'; normal results use 'normal'.
--     Also fires an alert type for critical values so the notification badge
--     surfaces prominently on the doctor dashboard.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_lab_results_to_doctor()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_doctor_user_id UUID;
  v_patient_name   TEXT;
BEGIN
  -- Only fire when transitioning TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

    -- Get the ordering doctor's auth user_id
    SELECT p.user_id INTO v_doctor_user_id
    FROM   public.profiles p
    WHERE  p.id = NEW.ordered_by;

    -- Get patient name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_patient_name
    FROM   public.patients
    WHERE  id = NEW.patient_id;

    IF v_doctor_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (
        hospital_id,
        recipient_id,
        type,
        title,
        message,
        priority,
        category,
        metadata
      ) VALUES (
        NEW.hospital_id,
        v_doctor_user_id,
        CASE WHEN NEW.is_critical THEN 'alert' ELSE 'lab_results' END,
        CASE
          WHEN NEW.is_critical THEN 'CRITICAL Lab Result — ' || NEW.test_name
          ELSE 'Lab Result Ready — ' || NEW.test_name
        END,
        CONCAT(
          COALESCE(v_patient_name, 'Patient'),
          ': ',
          NEW.test_name,
          ' results are available',
          CASE WHEN NEW.is_critical THEN '. ⚠️ Critical value detected – immediate review required.' ELSE '.' END
        ),
        CASE WHEN NEW.is_critical THEN 'urgent' ELSE 'normal' END,
        'laboratory',
        jsonb_build_object(
          'lab_order_id', NEW.id,
          'patient_id',   NEW.patient_id,
          'test_name',    NEW.test_name,
          'is_critical',  NEW.is_critical
        )
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_order_completed ON public.lab_orders;
CREATE TRIGGER trg_lab_order_completed
  AFTER UPDATE OF status ON public.lab_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lab_results_to_doctor();

COMMENT ON FUNCTION public.notify_lab_results_to_doctor IS
  'When a lab order transitions to completed, notifies the ordering doctor '
  'with urgency=urgent and type=alert for critical values.';


-- =============================================================================
-- 10. DB TRIGGER: consultations UPDATE (status → 'completed') → notify receptionists
--     Provides server-side guarantee that the billing/checkout workflow is always
--     triggered, even when the doctor uses QuickConsultationModal.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_consultation_completed_to_reception()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_patient_name   TEXT;
  v_doctor_uid     UUID;
  v_receptionist   RECORD;
BEGIN
  -- Only fire when transitioning TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

    SELECT CONCAT(first_name, ' ', last_name) INTO v_patient_name
    FROM   public.patients WHERE id = NEW.patient_id;

    SELECT user_id INTO v_doctor_uid
    FROM   public.profiles WHERE id = NEW.doctor_id;

    -- Fan-out to all receptionists in this hospital
    FOR v_receptionist IN
      SELECT DISTINCT p.user_id
      FROM   public.profiles  p
      JOIN   public.user_roles ur ON ur.user_id = p.user_id
      WHERE  p.hospital_id  = NEW.hospital_id
      AND    ur.role        = 'receptionist'
      AND    ur.hospital_id = NEW.hospital_id
    LOOP
      INSERT INTO public.notifications (
        hospital_id,
        recipient_id,
        sender_id,
        type,
        title,
        message,
        priority,
        category,
        metadata
      ) VALUES (
        NEW.hospital_id,
        v_receptionist.user_id,
        v_doctor_uid,
        'task',
        'Consultation Complete — Billing Required',
        COALESCE(v_patient_name, 'A patient') || ' has completed their consultation. Please process checkout and generate the invoice.',
        'normal',
        'billing',
        jsonb_build_object(
          'consultation_id', NEW.id,
          'patient_id',      NEW.patient_id,
          'completed_at',    NEW.completed_at
        )
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consultation_completed ON public.consultations;
CREATE TRIGGER trg_consultation_completed
  AFTER UPDATE OF status ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_consultation_completed_to_reception();

COMMENT ON FUNCTION public.notify_consultation_completed_to_reception IS
  'Server-side fan-out: when a consultation is marked completed, all '
  'receptionists in the same hospital are notified to process billing/checkout.';


-- =============================================================================
-- 11. Add patients.encryption_metadata
--     Required by useHIPAACompliance() hook which encrypts PHI fields and
--     persists the AES-GCM key handle alongside the record (per HIPAA §164.312(a)(2)(iv)).
-- =============================================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS encryption_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.patients.encryption_metadata IS
  'AES-GCM encryption key handle and IV stored by useHIPAACompliance(). '
  'Must be present on every row that contains encrypted PHI fields.';


-- =============================================================================
-- 12. RLS hardening for prescription_queue and lab_queue
--     prescription_queue exists but had no role-specific policies beyond the
--     generic hospital_isolation pattern.  Adding pharmacist-specific WRITE
--     and lab_queue WRITE already defined above (section 1).
-- =============================================================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.prescription_queue ENABLE ROW LEVEL SECURITY;

-- Any hospital staff can READ the queue (for cross-role visibility)
DROP POLICY IF EXISTS "prescription_queue_read"  ON public.prescription_queue;
CREATE POLICY "prescription_queue_read"
  ON public.prescription_queue FOR SELECT TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Only pharmacists and admins can INSERT / UPDATE / DELETE entries
DROP POLICY IF EXISTS "prescription_queue_pharmacist_write" ON public.prescription_queue;
CREATE POLICY "prescription_queue_pharmacist_write"
  ON public.prescription_queue FOR ALL TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'pharmacist')
      OR public.has_role(auth.uid(), 'admin')
    )
  )
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid())
    AND (
      public.has_role(auth.uid(), 'pharmacist')
      OR public.has_role(auth.uid(), 'admin')
    )
  );


-- =============================================================================
-- 13. Enable Supabase Realtime on all clinical tables
--     Only tables not already added are listed here (notifications was already
--     added in the misc migration).  ALTER PUBLICATION ADD TABLE is idempotent
--     on tables already in the publication but will error if already present in
--     some configurations; use DO $$ to conditionally add.
-- =============================================================================

DO $$
DECLARE
  tables_to_add TEXT[] := ARRAY[
    'patient_queue',
    'lab_orders',
    'lab_queue',
    'prescriptions',
    'consultations',
    'prescription_queue',
    'workflow_events',
    'task_assignments'
  ];
  tbl TEXT;
  already_in_pub BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY tables_to_add LOOP
    SELECT EXISTS (
      SELECT 1
      FROM   pg_publication_tables
      WHERE  pubname   = 'supabase_realtime'
      AND    tablename = tbl
    ) INTO already_in_pub;

    IF NOT already_in_pub THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END;
$$;


-- =============================================================================
-- 14. Indexes for notification query patterns used by the frontend
--     useWorkflowNotifications counts unread; add a covering index.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_unread_by_recipient
  ON public.notifications(recipient_id, hospital_id, created_at DESC)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications(hospital_id, category, created_at DESC);


-- =============================================================================
-- GRANT statements – ensure authenticated role has DML on new tables
-- =============================================================================

GRANT ALL ON public.lab_queue TO authenticated;
GRANT ALL ON public.lab_queue TO service_role;


-- =============================================================================
-- Summary of changes
-- =============================================================================
COMMENT ON TABLE public.lab_queue IS
  'Durable processing queue for lab orders. '
  'Populated by useCreateLabOrder() after inserting into lab_orders.  '
  'Lab technicians claim entries here and update status through sample → result lifecycle.';
