-- ============================================================
-- RLS Hardening — Multi-tenant policy audit & reinforcement
-- Ensures all high-risk tables have hospital_id-scoped policies
-- using direct column checks (not subquery joins where possible).
-- Uses user_belongs_to_hospital() helper — never auth.jwt() claims.
-- ============================================================

-- ============================================================
-- 1. Ensure user_belongs_to_hospital helper exists (idempotent)
-- ============================================================
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
  );
$$;

REVOKE ALL ON FUNCTION public.user_belongs_to_hospital(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_hospital(UUID, UUID) TO authenticated;

-- ============================================================
-- 2. activity_logs — enforce hospital-scoped reads
-- (Anyone can insert their own audit log, no cross-hospital reads)
-- ============================================================
DO $$
BEGIN
  -- Drop overly broad policies that use USING (true) or no hospital filter
  DROP POLICY IF EXISTS "activity_logs_select_all" ON public.activity_logs;
  DROP POLICY IF EXISTS "Allow authenticated users to view activity logs" ON public.activity_logs;
  DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_logs;
EXCEPTION WHEN undefined_object OR undefined_table THEN NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'activity_logs' AND relrowsecurity = true) THEN
    -- Hospital-scoped read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_hospital_read') THEN
      EXECUTE $policy$
        CREATE POLICY "activity_logs_hospital_read" ON public.activity_logs
          FOR SELECT
          USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));
      $policy$;
    END IF;

    -- Self-insert only
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_logs' AND policyname = 'activity_logs_self_insert') THEN
      EXECUTE $policy$
        CREATE POLICY "activity_logs_self_insert" ON public.activity_logs
          FOR INSERT
          WITH CHECK (
            user_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
          );
      $policy$;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 3. notifications — users must only see their own hospital's notifications
-- ============================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "notifications_select_all" ON public.notifications;
  DROP POLICY IF EXISTS "Users can view all notifications" ON public.notifications;
EXCEPTION WHEN undefined_object OR undefined_table THEN NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications' AND relrowsecurity = true) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_hospital_recipient_read') THEN
      EXECUTE $policy$
        CREATE POLICY "notifications_hospital_recipient_read" ON public.notifications
          FOR SELECT
          USING (
            recipient_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            OR (
              hospital_id IS NOT NULL
              AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
              AND EXISTS (
                SELECT 1 FROM public.user_roles ur
                WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin')
                  AND ur.hospital_id = hospital_id
              )
            )
          );
      $policy$;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 4. prescriptions — explicit hospital_id scope
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'prescriptions' AND relrowsecurity = true) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prescriptions' AND policyname = 'prescriptions_hospital_read_v2') THEN
      EXECUTE $policy$
        CREATE POLICY "prescriptions_hospital_read_v2" ON public.prescriptions
          FOR SELECT
          USING (
            hospital_id IS NOT NULL
            AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
          );
      $policy$;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 5. invoices — hospital-scoped, admins/billing only
-- ============================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "invoices_select_all" ON public.invoices;
EXCEPTION WHEN undefined_object OR undefined_table THEN NULL;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invoices' AND relrowsecurity = true) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_hospital_billing_read') THEN
      EXECUTE $policy$
        CREATE POLICY "invoices_hospital_billing_read" ON public.invoices
          FOR SELECT
          USING (
            public.user_belongs_to_hospital(auth.uid(), hospital_id)
            AND EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid()
                AND ur.role IN ('admin','super_admin','doctor','receptionist','nurse')
                AND ur.hospital_id = hospital_id
            )
          );
      $policy$;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 6. queue_entries — prevent cross-hospital queue reads
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'queue_entries' AND relrowsecurity = true) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'queue_entries' AND policyname = 'queue_entries_hospital_read_v2') THEN
      EXECUTE $policy$
        CREATE POLICY "queue_entries_hospital_read_v2" ON public.queue_entries
          FOR SELECT
          USING (
            hospital_id IS NOT NULL
            AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
          );
      $policy$;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 7. feature_flags — read-only for all authenticated hospital members
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'feature_flags' AND relrowsecurity = true) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'feature_flags_hospital_or_global_read') THEN
      EXECUTE $policy$
        CREATE POLICY "feature_flags_hospital_or_global_read" ON public.feature_flags
          FOR SELECT
          USING (
            hospital_id IS NULL   -- global flags visible to all authenticated users
            OR public.user_belongs_to_hospital(auth.uid(), hospital_id)
          );
      $policy$;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'feature_flags_admin_write') THEN
      EXECUTE $policy$
        CREATE POLICY "feature_flags_admin_write" ON public.feature_flags
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.user_roles ur
              WHERE ur.user_id = auth.uid() AND ur.role IN ('admin','super_admin')
                AND (ur.hospital_id = hospital_id OR hospital_id IS NULL)
            )
          );
      $policy$;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 8. Verify — list tables without RLS enabled for awareness
-- (Does not fail migration; outputs a notice only)
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT relname FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relkind = 'r'
      AND relrowsecurity = false
      AND relname NOT LIKE 'pg_%'
      AND relname NOT LIKE '_prisma_%'
  LOOP
    RAISE NOTICE 'Table without RLS: %', tbl;
  END LOOP;
END;
$$;
