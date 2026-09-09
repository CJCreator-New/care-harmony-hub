-- ============================================================================
-- Migration: 20260909000001_harden_invoices_and_active_user_rls.sql
-- Description: 
--   1. Harden user_belongs_to_hospital to check profiles.is_active = true.
--   2. Restrict invoices_hospital_billing_read to admin and receptionist (enforcing ADR-0002).
--   3. Enforce append-only immutability on public.audit_logs table.
--   4. Create public.lab_alert_escalations queue table and auto-cancel trigger.
-- ============================================================================

-- 1. Ensure user_belongs_to_hospital checks is_active = true
CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital(
  p_user_id UUID,
  p_hospital_id UUID
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_user_id
      AND hospital_id = p_hospital_id
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.user_belongs_to_hospital(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_hospital(UUID, UUID) TO authenticated;

-- 2. invoices: Restrict read access strictly to admin and receptionist (excluding doctor, nurse)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices' AND relrowsecurity = true) THEN
    DROP POLICY IF EXISTS "invoices_hospital_billing_read" ON public.invoices;
    DROP POLICY IF EXISTS "invoices_select_all" ON public.invoices;

    CREATE POLICY "invoices_hospital_billing_read" ON public.invoices
      FOR SELECT
      USING (
        public.user_belongs_to_hospital(auth.uid(), hospital_id)
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'receptionist')
            AND ur.hospital_id = hospital_id
        )
      );
  END IF;
END;
$$;

-- 3. audit_logs: Enforce append-only immutability at the database engine level
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_logs') THEN
    DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
    CREATE TRIGGER trg_audit_logs_immutable
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

    -- Explicit RLS denies for authenticated users
    DROP POLICY IF EXISTS "audit_logs_no_update" ON public.audit_logs;
    CREATE POLICY "audit_logs_no_update" ON public.audit_logs
      FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

    DROP POLICY IF EXISTS "audit_logs_no_delete" ON public.audit_logs;
    CREATE POLICY "audit_logs_no_delete" ON public.audit_logs
      FOR DELETE TO authenticated USING (false);
  END IF;
END;
$$;

-- 4. lab_alert_escalations: Asynchronous escalation queue for critical values
CREATE TABLE IF NOT EXISTS public.lab_alert_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.lab_critical_alerts(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('primary', 'on_call', 'er')),
  target_user_id UUID REFERENCES public.profiles(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  dispatched_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'dispatched', 'acknowledged', 'cancelled', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_alert_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_alert_escalations_hospital_read" ON public.lab_alert_escalations
  FOR SELECT USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE INDEX IF NOT EXISTS idx_lab_alert_escalations_pending
  ON public.lab_alert_escalations(status, scheduled_for)
  WHERE status = 'pending';

-- Auto-cancel pending escalations when primary doctor acknowledges or alert is resolved
CREATE OR REPLACE FUNCTION public.cancel_lab_alert_escalations_on_ack()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.primary_acknowledged_at IS NOT NULL AND OLD.primary_acknowledged_at IS NULL)
     OR (NEW.is_resolved = true AND OLD.is_resolved = false) THEN
    UPDATE public.lab_alert_escalations
    SET status = 'acknowledged', updated_at = now()
    WHERE alert_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'lab_critical_alerts') THEN
    DROP TRIGGER IF EXISTS trg_cancel_lab_escalations ON public.lab_critical_alerts;
    CREATE TRIGGER trg_cancel_lab_escalations
    AFTER UPDATE ON public.lab_critical_alerts
    FOR EACH ROW EXECUTE FUNCTION public.cancel_lab_alert_escalations_on_ack();
  END IF;
END;
$$;

-- 5. activity_logs: Append-only immutability and write hospital scoping
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_logs') THEN
    DROP TRIGGER IF EXISTS trg_activity_logs_immutable ON public.activity_logs;
    CREATE TRIGGER trg_activity_logs_immutable
    BEFORE UPDATE OR DELETE ON public.activity_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

    -- Explicit RLS denies for update and delete
    DROP POLICY IF EXISTS "activity_logs_no_update" ON public.activity_logs;
    CREATE POLICY "activity_logs_no_update" ON public.activity_logs
      FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

    DROP POLICY IF EXISTS "activity_logs_no_delete" ON public.activity_logs;
    CREATE POLICY "activity_logs_no_delete" ON public.activity_logs
      FOR DELETE TO authenticated USING (false);

    -- Enforce hospital scoping on write to prevent cross-hospital injection
    DROP POLICY IF EXISTS "Staff can insert activity logs" ON public.activity_logs;
    CREATE POLICY "Staff can insert activity logs"
    ON public.activity_logs
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid()
      AND (
        hospital_id IS NULL
        OR public.user_belongs_to_hospital(auth.uid(), hospital_id)
      )
    );
  END IF;
END;
$$;

-- 6. user_roles: Enforce 7 Canonical Roles and Purge super_admin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_roles') THEN
    -- Ensure any legacy super_admin roles are mapped to admin
    UPDATE public.user_roles SET role = 'admin' WHERE role = 'super_admin';

    ALTER TABLE public.user_roles 
      DROP CONSTRAINT IF EXISTS chk_canonical_roles;

    ALTER TABLE public.user_roles
      ADD CONSTRAINT chk_canonical_roles
      CHECK (role IN ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient'));
  END IF;
END;
$$;

-- 7. Ensure audit_logs table exists for ABAC and clinical checks
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_hospital_admin_read" ON public.audit_logs
  FOR SELECT USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
        AND ur.hospital_id = hospital_id
    )
  );

CREATE POLICY "audit_logs_authenticated_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );
