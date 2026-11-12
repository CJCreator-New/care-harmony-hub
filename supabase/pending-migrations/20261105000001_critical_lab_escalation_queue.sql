-- =============================================================================
-- PENDING MIGRATION (not in supabase/migrations/, so neither the Supabase CLI
-- nor the Lovable sync applies it). Read supabase/pending-migrations/README.md.
--
-- 20261105000001_critical_lab_escalation_queue.sql
-- Roadmap S0-08 (EDGE-03, CLIN-10): make the Critical Lab Escalation Queue work.
--
--   1. lab_critical_ranges   ensure it exists; replace the policies that compared
--                            profiles.id with auth.uid().
--   2. lab_critical_alerts   ensure it exists; key it to lab_orders (lab_results is
--                            not in the live schema); allow non-numeric values for
--                            fail-closed review alerts; add acknowledgement columns;
--                            severity vocabulary incl. 'review_required'; one OPEN
--                            alert per lab order; replace the self-referencing RLS.
--   3. lab_alert_escalations ensure it exists; status vocabulary incl. 'processing';
--                            worker bookkeeping columns; one row per (alert, level).
--   4. Triggers              updated_at; cancel pending escalations on acknowledge
--                            or resolve (SECURITY DEFINER, sets 'cancelled').
--   5. on_call_schedule      hospital-scoped on-call / ED roster used by the worker.
--   6. lab_critical_alert_events  append-only audit rows written by triggers.
--   7. Scheduler             pg_cron job every minute -> pg_net POST to the
--                            critical-lab-check worker, secret read from Vault.
--                            No-ops (with a NOTICE/WARNING) when an extension or a
--                            Vault secret is absent.
--
-- Idempotent: every statement is IF [NOT] EXISTS, CREATE OR REPLACE, or guarded in
-- a DO block. Applying it twice is a no-op the second time.
-- Prerequisites (live schema): hospitals, profiles(id,user_id,hospital_id,phone),
-- patients, lab_orders, user_roles, notifications, app_role enum,
-- has_role(uuid, app_role), user_belongs_to_hospital(uuid, uuid).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Prerequisites: fail loudly instead of half-applying.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.hospitals', 'public.profiles', 'public.patients',
                           'public.lab_orders', 'public.user_roles', 'public.notifications'] LOOP
    IF to_regclass(t) IS NULL THEN missing := missing || t; END IF;
  END LOOP;
  IF to_regtype('public.app_role') IS NULL THEN missing := missing || 'type public.app_role'::text; END IF;
  IF to_regprocedure('public.has_role(uuid, public.app_role)') IS NULL THEN
    missing := missing || 'function public.has_role(uuid, app_role)'::text;
  END IF;
  IF to_regprocedure('public.user_belongs_to_hospital(uuid, uuid)') IS NULL THEN
    missing := missing || 'function public.user_belongs_to_hospital(uuid, uuid)'::text;
  END IF;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'critical_lab_escalation_queue: missing prerequisites: %', array_to_string(missing, ', ');
  END IF;
END
$$;

-- Shared updated_at helper (no dependency on the moddatetime extension).
CREATE OR REPLACE FUNCTION public.lab_alert_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. lab_critical_ranges (hospital-configured thresholds; no seed data here)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_critical_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  critical_low NUMERIC,
  critical_high NUMERIC,
  warning_low NUMERIC,
  warning_high NUMERIC,
  unit_of_measure TEXT,
  age_group TEXT,
  gender TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (hospital_id, test_code, age_group, gender)
);

CREATE INDEX IF NOT EXISTS idx_lab_critical_ranges_hospital_test
  ON public.lab_critical_ranges (hospital_id, test_code, age_group);

ALTER TABLE public.lab_critical_ranges ENABLE ROW LEVEL SECURITY;

-- tier4 policies compared profiles.id (not user_id) with auth.uid() and
-- referenced a non-existent 'lab_manager' role.
DROP POLICY IF EXISTS "lab_critical_ranges_hospital_scope" ON public.lab_critical_ranges;
DROP POLICY IF EXISTS "lab_critical_ranges_insert" ON public.lab_critical_ranges;
DROP POLICY IF EXISTS "lab_critical_ranges_select" ON public.lab_critical_ranges;
DROP POLICY IF EXISTS "lab_critical_ranges_admin_write" ON public.lab_critical_ranges;

CREATE POLICY "lab_critical_ranges_select" ON public.lab_critical_ranges
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "lab_critical_ranges_admin_write" ON public.lab_critical_ranges
  FOR ALL TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id)
         AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id)
              AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- 2. lab_critical_alerts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  lab_order_id UUID REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  lab_result_id UUID,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  result_value NUMERIC,
  result_text TEXT,
  unit TEXT,
  critical_range_id UUID REFERENCES public.lab_critical_ranges(id),
  severity TEXT NOT NULL DEFAULT 'review_required',
  primary_doctor_id UUID REFERENCES public.profiles(id),
  primary_notified_at TIMESTAMPTZ,
  primary_acknowledged_at TIMESTAMPTZ,
  primary_action_taken BOOLEAN DEFAULT FALSE,
  primary_action_notes TEXT,
  on_call_id UUID REFERENCES public.profiles(id),
  on_call_notified_at TIMESTAMPTZ,
  on_call_acknowledged_at TIMESTAMPTZ,
  on_call_action_taken BOOLEAN DEFAULT FALSE,
  on_call_action_notes TEXT,
  er_notified_at TIMESTAMPTZ,
  er_acknowledged_at TIMESTAMPTZ,
  er_action_taken BOOLEAN DEFAULT FALSE,
  er_action_notes TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledgment_channel TEXT,
  acknowledgment_notes TEXT,
  acknowledgment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bring a tier4-shaped table up to the same shape.
ALTER TABLE public.lab_critical_alerts
  ADD COLUMN IF NOT EXISTS lab_order_id UUID REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS result_text TEXT,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS acknowledgment_channel TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgment_notes TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.lab_critical_alerts ALTER COLUMN lab_result_id DROP NOT NULL;
ALTER TABLE public.lab_critical_alerts ALTER COLUMN result_value DROP NOT NULL;
-- An unresolvable ordering clinician must not block the alert; the worker falls back.
ALTER TABLE public.lab_critical_alerts ALTER COLUMN primary_doctor_id DROP NOT NULL;
ALTER TABLE public.lab_critical_alerts ALTER COLUMN severity SET DEFAULT 'review_required';
UPDATE public.lab_critical_alerts SET is_resolved = FALSE WHERE is_resolved IS NULL;
ALTER TABLE public.lab_critical_alerts ALTER COLUMN is_resolved SET DEFAULT FALSE;
ALTER TABLE public.lab_critical_alerts ALTER COLUMN is_resolved SET NOT NULL;

-- Replace any severity CHECK (tier4's lacked a fail-closed value) with one named constraint.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.lab_critical_alerts'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%severity%'
      AND conname <> 'lab_critical_alerts_severity_vocab'
  LOOP
    EXECUTE format('ALTER TABLE public.lab_critical_alerts DROP CONSTRAINT %I', c.conname);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.lab_critical_alerts'::regclass
                   AND conname = 'lab_critical_alerts_severity_vocab') THEN
    ALTER TABLE public.lab_critical_alerts ADD CONSTRAINT lab_critical_alerts_severity_vocab
      CHECK (severity IN ('critical_high', 'critical_low', 'warning', 'review_required'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.lab_critical_alerts'::regclass
                   AND conname = 'lab_critical_alerts_source_present') THEN
    ALTER TABLE public.lab_critical_alerts ADD CONSTRAINT lab_critical_alerts_source_present
      CHECK (lab_order_id IS NOT NULL OR lab_result_id IS NOT NULL) NOT VALID;
  END IF;
  -- Keep the lab_results FK only where that table exists (it is not in the live schema).
  -- (nested IF: plpgsql does not short-circuit, and ::regclass fails on a missing table)
  IF to_regclass('public.lab_results') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.lab_critical_alerts'::regclass AND contype = 'f'
        AND confrelid = to_regclass('public.lab_results')) THEN
      ALTER TABLE public.lab_critical_alerts ADD CONSTRAINT lab_critical_alerts_lab_result_id_fkey
        FOREIGN KEY (lab_result_id) REFERENCES public.lab_results(id) ON DELETE CASCADE;
    END IF;
  END IF;
END
$$;

-- Idempotent alert creation: at most one OPEN (unacknowledged, unresolved) alert per order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_critical_alerts_open_per_order
  ON public.lab_critical_alerts (lab_order_id)
  WHERE lab_order_id IS NOT NULL AND is_resolved = FALSE AND acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_critical_alerts_hospital
  ON public.lab_critical_alerts (hospital_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_lab_critical_alerts_primary_doctor
  ON public.lab_critical_alerts (primary_doctor_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_lab_critical_alerts_lab_order
  ON public.lab_critical_alerts (lab_order_id);

DROP TRIGGER IF EXISTS trg_lab_critical_alerts_touch ON public.lab_critical_alerts;
CREATE TRIGGER trg_lab_critical_alerts_touch
  BEFORE UPDATE ON public.lab_critical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.lab_alert_touch_updated_at();

ALTER TABLE public.lab_critical_alerts ENABLE ROW LEVEL SECURITY;

-- tier4's "clinical_access" policy selected from lab_critical_alerts inside its own
-- policy (infinite recursion) and both compared profiles.id with auth.uid().
DROP POLICY IF EXISTS "lab_critical_alerts_hospital_scope" ON public.lab_critical_alerts;
DROP POLICY IF EXISTS "lab_critical_alerts_clinical_access" ON public.lab_critical_alerts;
DROP POLICY IF EXISTS "lab_critical_alerts_clinical_select" ON public.lab_critical_alerts;
DROP POLICY IF EXISTS "lab_critical_alerts_clinical_update" ON public.lab_critical_alerts;

CREATE POLICY "lab_critical_alerts_clinical_select" ON public.lab_critical_alerts
  FOR SELECT TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'doctor'::public.app_role)
         OR public.has_role(auth.uid(), 'nurse'::public.app_role)
         OR public.has_role(auth.uid(), 'lab_technician'::public.app_role))
  );

-- Clients may update (acknowledge/resolve via the module's adapter) but never insert
-- or delete: alerts are created only by critical-lab-check with the service role.
CREATE POLICY "lab_critical_alerts_clinical_update" ON public.lab_critical_alerts
  FOR UPDATE TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND (public.has_role(auth.uid(), 'admin'::public.app_role)
         OR public.has_role(auth.uid(), 'doctor'::public.app_role)
         OR public.has_role(auth.uid(), 'nurse'::public.app_role))
  )
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- ---------------------------------------------------------------------------
-- 3. lab_alert_escalations (durable queue)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_alert_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.lab_critical_alerts(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('primary', 'on_call', 'er')),
  target_user_id UUID REFERENCES public.profiles(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  dispatched_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivery_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_alert_escalations
  ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivery_log JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.lab_alert_escalations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
      AND conname <> 'lab_alert_escalations_status_vocab'
  LOOP
    EXECUTE format('ALTER TABLE public.lab_alert_escalations DROP CONSTRAINT %I', c.conname);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.lab_alert_escalations'::regclass
                   AND conname = 'lab_alert_escalations_status_vocab') THEN
    ALTER TABLE public.lab_alert_escalations ADD CONSTRAINT lab_alert_escalations_status_vocab
      CHECK (status IN ('pending', 'processing', 'dispatched', 'acknowledged', 'cancelled', 'failed'));
  END IF;
END
$$;

-- The old worker inserted a new 'er' row on every run. Keep the earliest row per
-- (alert, level) so the unique index below can be built.
DO $$
DECLARE n integer;
BEGIN
  DELETE FROM public.lab_alert_escalations a
  USING public.lab_alert_escalations b
  WHERE a.alert_id = b.alert_id
    AND a.escalation_level = b.escalation_level
    AND (a.created_at, a.id) > (b.created_at, b.id);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN
    RAISE NOTICE 'lab_alert_escalations: removed % duplicate rows created by the old worker', n;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lab_alert_escalations_alert_level
  ON public.lab_alert_escalations (alert_id, escalation_level);
CREATE INDEX IF NOT EXISTS idx_lab_alert_escalations_due
  ON public.lab_alert_escalations (scheduled_for)
  WHERE status IN ('pending', 'processing');

DROP TRIGGER IF EXISTS trg_lab_alert_escalations_touch ON public.lab_alert_escalations;
CREATE TRIGGER trg_lab_alert_escalations_touch
  BEFORE UPDATE ON public.lab_alert_escalations
  FOR EACH ROW EXECUTE FUNCTION public.lab_alert_touch_updated_at();

ALTER TABLE public.lab_alert_escalations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lab_alert_escalations_hospital_read" ON public.lab_alert_escalations;
CREATE POLICY "lab_alert_escalations_hospital_read" ON public.lab_alert_escalations
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));
-- No client write policies: only the service role (worker) changes queue rows.

-- ---------------------------------------------------------------------------
-- 4. Acknowledge / resolve cancels the pending ladder (any write path).
--    SECURITY DEFINER so a client-side acknowledgement can cancel rows that
--    clients cannot write directly. Status is 'cancelled' (the old trigger
--    wrote 'acknowledged' onto rows nobody acknowledged).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_lab_alert_escalations_on_ack()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.acknowledged_at IS NOT NULL AND OLD.acknowledged_at IS NULL)
     OR (NEW.primary_acknowledged_at IS NOT NULL AND OLD.primary_acknowledged_at IS NULL)
     OR (NEW.is_resolved AND NOT OLD.is_resolved) THEN
    UPDATE public.lab_alert_escalations
       SET status = 'cancelled',
           error_message = COALESCE(error_message, 'alert acknowledged or resolved')
     WHERE alert_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_lab_alert_escalations_on_ack() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_cancel_lab_escalations ON public.lab_critical_alerts;
CREATE TRIGGER trg_cancel_lab_escalations
  AFTER UPDATE ON public.lab_critical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.cancel_lab_alert_escalations_on_ack();

-- ---------------------------------------------------------------------------
-- 5. on_call_schedule: who receives the on-call (5 min) and ED (10 min) levels.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.on_call_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('on_call', 'er')),
  specialty TEXT NOT NULL DEFAULT 'general',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT on_call_schedule_window CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_on_call_schedule_lookup
  ON public.on_call_schedule (hospital_id, tier, starts_at, ends_at)
  WHERE is_active;

-- The rostered clinician must belong to the same hospital as the roster row.
CREATE OR REPLACE FUNCTION public.on_call_schedule_enforce_hospital()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = NEW.profile_id AND p.hospital_id = NEW.hospital_id) THEN
    RAISE EXCEPTION 'on_call_schedule: profile % does not belong to hospital %', NEW.profile_id, NEW.hospital_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.on_call_schedule_enforce_hospital() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_on_call_schedule_hospital ON public.on_call_schedule;
CREATE TRIGGER trg_on_call_schedule_hospital
  BEFORE INSERT OR UPDATE OF profile_id, hospital_id ON public.on_call_schedule
  FOR EACH ROW EXECUTE FUNCTION public.on_call_schedule_enforce_hospital();

DROP TRIGGER IF EXISTS trg_on_call_schedule_touch ON public.on_call_schedule;
CREATE TRIGGER trg_on_call_schedule_touch
  BEFORE UPDATE ON public.on_call_schedule
  FOR EACH ROW EXECUTE FUNCTION public.lab_alert_touch_updated_at();

ALTER TABLE public.on_call_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "on_call_schedule_hospital_read" ON public.on_call_schedule;
DROP POLICY IF EXISTS "on_call_schedule_admin_write" ON public.on_call_schedule;

CREATE POLICY "on_call_schedule_hospital_read" ON public.on_call_schedule
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "on_call_schedule_admin_write" ON public.on_call_schedule
  FOR ALL TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id)
         AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id)
              AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------------
-- 6. Audit: append-only event rows for every alert and escalation state change.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lab_critical_alert_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hospital_id UUID NOT NULL,
  alert_id UUID NOT NULL,          -- no FK: audit rows outlive the alert
  escalation_id UUID,
  escalation_level TEXT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_profile_id UUID,
  actor_user_id UUID,              -- auth.uid() of the writer; NULL for the service-role worker
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lab_critical_alert_events_alert
  ON public.lab_critical_alert_events (alert_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lab_critical_alert_events_hospital
  ON public.lab_critical_alert_events (hospital_id, created_at);

CREATE OR REPLACE FUNCTION public.lab_critical_alert_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'lab_critical_alert_events is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_critical_alert_events_immutable ON public.lab_critical_alert_events;
CREATE TRIGGER trg_lab_critical_alert_events_immutable
  BEFORE UPDATE OR DELETE ON public.lab_critical_alert_events
  FOR EACH ROW EXECUTE FUNCTION public.lab_critical_alert_events_immutable();

ALTER TABLE public.lab_critical_alert_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lab_critical_alert_events_hospital_read" ON public.lab_critical_alert_events;
CREATE POLICY "lab_critical_alert_events_hospital_read" ON public.lab_critical_alert_events
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));
-- Rows are written only by the SECURITY DEFINER triggers below.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lab_critical_alert_events FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lab_critical_alert_events FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.lab_critical_alert_events FROM authenticated;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.lab_critical_alerts_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
BEGIN
  BEGIN
    v_uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    NULL; -- auth schema absent (non-Supabase replay): keep the claim fallback
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lab_critical_alert_events
      (hospital_id, alert_id, event_type, to_status, actor_profile_id, actor_user_id, details)
    VALUES (NEW.hospital_id, NEW.id, 'alert_created', NEW.severity, NEW.created_by, v_uid,
            jsonb_build_object('lab_order_id', NEW.lab_order_id, 'test_code', NEW.test_code,
                               'severity', NEW.severity, 'primary_doctor_id', NEW.primary_doctor_id));
    RETURN NEW;
  END IF;

  IF NEW.acknowledged_at IS NOT NULL AND OLD.acknowledged_at IS NULL THEN
    INSERT INTO public.lab_critical_alert_events
      (hospital_id, alert_id, event_type, actor_profile_id, actor_user_id, details)
    VALUES (NEW.hospital_id, NEW.id, 'alert_acknowledged', NEW.acknowledged_by, v_uid,
            jsonb_build_object('channel', NEW.acknowledgment_channel,
                               'minutes_since_created',
                               round(EXTRACT(EPOCH FROM (NEW.acknowledged_at - NEW.created_at)) / 60.0, 1)));
  END IF;
  IF NEW.primary_acknowledged_at IS NOT NULL AND OLD.primary_acknowledged_at IS NULL
     AND NEW.acknowledged_at IS NOT DISTINCT FROM OLD.acknowledged_at THEN
    INSERT INTO public.lab_critical_alert_events
      (hospital_id, alert_id, event_type, actor_user_id)
    VALUES (NEW.hospital_id, NEW.id, 'alert_acknowledged_primary', v_uid);
  END IF;
  IF NEW.is_resolved AND NOT OLD.is_resolved THEN
    INSERT INTO public.lab_critical_alert_events
      (hospital_id, alert_id, event_type, actor_profile_id, actor_user_id)
    VALUES (NEW.hospital_id, NEW.id, 'alert_resolved', NEW.resolved_by, v_uid);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lab_critical_alerts_audit() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_lab_critical_alerts_audit_events ON public.lab_critical_alerts;
CREATE TRIGGER trg_lab_critical_alerts_audit_events
  AFTER INSERT OR UPDATE ON public.lab_critical_alerts
  FOR EACH ROW EXECUTE FUNCTION public.lab_critical_alerts_audit();

CREATE OR REPLACE FUNCTION public.lab_alert_escalations_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.lab_critical_alert_events
      (hospital_id, alert_id, escalation_id, escalation_level, event_type, to_status, details)
    VALUES (NEW.hospital_id, NEW.alert_id, NEW.id, NEW.escalation_level, 'escalation_scheduled', NEW.status,
            jsonb_build_object('scheduled_for', NEW.scheduled_for));
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'processing' THEN
    INSERT INTO public.lab_critical_alert_events
      (hospital_id, alert_id, escalation_id, escalation_level, event_type, from_status, to_status, details)
    VALUES (NEW.hospital_id, NEW.alert_id, NEW.id, NEW.escalation_level,
            'escalation_' || NEW.status, OLD.status, NEW.status,
            jsonb_build_object('attempt', NEW.attempt_count, 'error', NEW.error_message,
                               'delivery', NEW.delivery_log, 'target_user_id', NEW.target_user_id));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lab_alert_escalations_audit() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_lab_alert_escalations_audit_events ON public.lab_alert_escalations;
CREATE TRIGGER trg_lab_alert_escalations_audit_events
  AFTER INSERT OR UPDATE ON public.lab_alert_escalations
  FOR EACH ROW EXECUTE FUNCTION public.lab_alert_escalations_audit();

-- ---------------------------------------------------------------------------
-- 7. Scheduler: pg_cron (every minute) -> pg_net -> critical-lab-check worker.
--
-- Vault secrets (created by an operator, never in a migration or in git):
--   critical_lab_worker_url          https://<project-ref>.supabase.co/functions/v1/critical-lab-check
--   critical_lab_worker_secret       same value as the function's CRITICAL_LAB_WORKER_SECRET (>= 32 chars)
--   critical_lab_worker_gateway_key  optional: the project's legacy anon key (a JWT), so the
--                                    gateway's verify_jwt check passes. It grants nothing in the
--                                    function: the worker path checks only the secret header.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invoke_critical_lab_escalation_worker()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_gateway text;
  v_headers jsonb;
  v_request_id bigint;
BEGIN
  IF to_regclass('vault.decrypted_secrets') IS NULL THEN
    RAISE WARNING 'critical-lab worker not invoked: Vault (vault.decrypted_secrets) is unavailable';
    RETURN NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE WARNING 'critical-lab worker not invoked: pg_net extension is not installed';
    RETURN NULL;
  END IF;

  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
    INTO v_url USING 'critical_lab_worker_url';
  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
    INTO v_secret USING 'critical_lab_worker_secret';
  EXECUTE 'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = $1 LIMIT 1'
    INTO v_gateway USING 'critical_lab_worker_gateway_key';

  IF v_url IS NULL OR v_secret IS NULL OR length(v_secret) < 32 THEN
    RAISE WARNING 'critical-lab worker not invoked: Vault secrets critical_lab_worker_url / critical_lab_worker_secret (>= 32 chars) are not set';
    RETURN NULL;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json',
                                  'x-critical-lab-worker-secret', v_secret);
  IF v_gateway IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_gateway,
                                                 'apikey', v_gateway);
  END IF;

  EXECUTE 'SELECT net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 30000)'
    INTO v_request_id
    USING v_url, jsonb_build_object('action', 'process_escalations', 'limit', 100), v_headers;
  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_critical_lab_escalation_worker() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON FUNCTION public.invoke_critical_lab_escalation_worker() FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON FUNCTION public.invoke_critical_lab_escalation_worker() FROM authenticated;
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
  EXCEPTION WHEN insufficient_privilege OR undefined_file OR feature_not_supported OR invalid_schema_name THEN
    RAISE NOTICE 'pg_net unavailable here; the critical-lab worker cannot be invoked from the database';
  END;
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN insufficient_privilege OR undefined_file OR feature_not_supported OR object_not_in_prerequisite_state THEN
    RAISE NOTICE 'pg_cron unavailable here; schedule critical-lab-check process_escalations another way';
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'critical-lab-escalation-worker';
    PERFORM cron.schedule(
      'critical-lab-escalation-worker',
      '* * * * *',
      $cron$SELECT public.invoke_critical_lab_escalation_worker();$cron$
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed: critical-lab-escalation-worker job NOT scheduled';
  END IF;
END
$$;
