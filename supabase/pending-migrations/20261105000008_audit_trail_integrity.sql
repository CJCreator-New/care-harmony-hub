-- =============================================================================
-- PENDING MIGRATION (not in supabase/migrations/, so neither the Supabase CLI
-- nor the Lovable sync applies it). Read supabase/pending-migrations/README.md
-- and the sibling note 20261105000008.README.md before promoting it.
--
-- 20261105000008_audit_trail_integrity.sql
-- Roadmap S1-05 (issues DB-08, EDGE-09, DB-06): restore audit-trail integrity.
--
-- Section A  append-only at the engine level. Every existing audit table
--            (audit_log, prescription_audit, invoice_adjustment_audit,
--            lab_result_audit, audit_logs, activity_logs, admin_activity_logs)
--            and every partition of them gets a BEFORE UPDATE OR DELETE row
--            trigger and a BEFORE TRUNCATE statement trigger. These fire for
--            every role, including service_role, which bypasses RLS. UPDATE,
--            DELETE and TRUNCATE are also revoked from PUBLIC, anon and
--            authenticated. RLS is enabled on partitions, so direct reads of a
--            partition by a client role are denied.
-- Section B  tamper-resistant write path. The open inserts go: activity_logs
--            "System can insert logs" (WITH CHECK (true)), the audit_logs
--            inserts that accept user_id IS NULL or any actor, and the audit_log
--            insert that checks only the hospital. A client may write only rows
--            where it is the actor and the hospital is its own.
-- Section C  scoped reads. Cross-tenant admin reads go: the audit_logs policies
--            that check only the role, and the policy whose hospital comparison
--            resolved to the inner table (always true). activity_logs readable
--            by any hospital staff member goes too. audit_log_summary runs with
--            security_invoker, so it no longer reads audit_log as the view owner.
-- Section D  audit helper functions that accept a caller-supplied actor
--            (log_audit_event, create_amendment_audit, set_audit_context) are not
--            executable by PUBLIC, anon or authenticated. No migration or src/
--            file calls them (checked on 2026-11-05).
-- Section E  DB-06: every SECURITY DEFINER function in schema public that has
--            no search_path set gets SET search_path = public, pg_temp.
--
-- NOT fixed here (see the README): EDGE-09 (audit-logger edge function, which
-- lives in supabase/functions/ and is out of this file's scope) and the
-- client-authored activity_logs rows that a signed-in user may still write for
-- themselves. Server-only audit writes need the src/ and edge changes.
--
-- Idempotent. Nothing is deleted or rewritten: no row changes, only policies,
-- triggers, grants, RLS flags, view options and function settings. Each block
-- skips objects that are absent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A.0 Generic reject function. Used by every trigger below.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

REVOKE ALL ON FUNCTION public.audit_reject_mutation() FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- A.1 Triggers, RLS on partitions, and privilege revokes for each audit table.
-- -----------------------------------------------------------------------------
DO $s105a$
DECLARE
  t        text;
  rel      regclass;
  r        text;
  v_roles  text[] := ARRAY['anon', 'authenticated'];
BEGIN
  FOREACH t IN ARRAY ARRAY['audit_log', 'prescription_audit', 'invoice_adjustment_audit',
                           'lab_result_audit', 'audit_logs', 'activity_logs',
                           'admin_activity_logs'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '20261105000008: public.% is absent, skipped', t;
      CONTINUE;
    END IF;

    -- Row trigger on the table. On a partitioned parent it is cloned into every
    -- partition (PostgreSQL 13+), including partitions created later.
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_append_only ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_append_only BEFORE UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.audit_reject_mutation()', t, t);

    -- Each relation in the tree: the parent and every partition. Statement
    -- triggers are not inherited from a parent, so TRUNCATE is covered per
    -- relation. RLS is enabled on each, and the client roles lose write grants.
    -- pg_partition_tree() returns no rows for a plain table, so the root is
    -- listed explicitly and the partitions are added after it.
    FOR rel IN
      SELECT to_regclass('public.' || t)
      UNION
      SELECT pt.relid::regclass
        FROM pg_partition_tree(to_regclass('public.' || t)) pt
    LOOP
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_no_truncate ON %s', t, rel);
      EXECUTE format(
        'CREATE TRIGGER trg_%s_no_truncate BEFORE TRUNCATE ON %s '
        'FOR EACH STATEMENT EXECUTE FUNCTION public.audit_reject_mutation()', t, rel);

      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', rel);

      EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE %s FROM PUBLIC', rel);
      FOREACH r IN ARRAY v_roles LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
          EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON TABLE %s FROM %I', rel, r);
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END
$s105a$;

-- -----------------------------------------------------------------------------
-- B. Remove the open insert policies and replace them with self-only inserts.
-- -----------------------------------------------------------------------------

-- B.1 activity_logs: "System can insert logs" is WITH CHECK (true), so any
--     signed-in user could write a row with any user_id and hospital_id.
--     "Staff can insert activity logs" (user_id = auth.uid(), hospital check)
--     and "activity_logs_self_insert" remain. Both are self-only.
DO $s105b1$
BEGIN
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "System can insert logs" ON public.activity_logs;
  END IF;
END
$s105b1$;

-- B.2 audit_logs: drop every insert policy and recreate one. Writes must carry
--     the caller's own user_id and a hospital the caller belongs to. Rows with
--     no user (system or pre-auth events) are written by the service role only.
DO $s105b2$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    RAISE NOTICE '20261105000008: public.audit_logs is absent, B.2 skipped';
    RETURN;
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'hospital_id')
  ) THEN
    RAISE NOTICE '20261105000008: audit_logs lacks user_id or hospital_id, B.2 and C.2 skipped';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Hospital-scoped audit log creation" ON public.audit_logs;
  DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs_authenticated_insert" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs_self_insert" ON public.audit_logs;

  CREATE POLICY "audit_logs_self_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND hospital_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.user_id = auth.uid()
           AND p.hospital_id = audit_logs.hospital_id
      )
    );
END
$s105b2$;

-- B.3 audit_log (core table, 20260313000001): the insert policy checks only
--     the hospital, so a staff member could write a row for any actor.
--     Writes must name the caller as actor and the caller's hospital.
DO $s105b3$
BEGIN
  IF to_regclass('public.audit_log') IS NULL THEN
    RETURN;
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'actor_user_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'audit_log' AND column_name = 'hospital_id')
  ) THEN
    RAISE NOTICE '20261105000008: audit_log lacks actor_user_id or hospital_id, B.3 skipped';
    RETURN;
  END IF;
  DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_log;
  DROP POLICY IF EXISTS "audit_log_insert_as_actor" ON public.audit_log;
  CREATE POLICY "audit_log_insert_as_actor" ON public.audit_log
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.user_id = auth.uid()
           AND p.id = audit_log.actor_user_id
           AND p.hospital_id = audit_log.hospital_id
      )
    );
END
$s105b3$;

-- -----------------------------------------------------------------------------
-- C. Scoped reads.
-- -----------------------------------------------------------------------------

-- C.1 activity_logs: hospital-wide read for any staff member bypassed the
--     admin-only policy from 20260617000001 (policies are OR-ed). Keep the
--     admin-in-hospital read, the admin read from 20260617000001, and own-row
--     reads. Drop the hospital-wide read.
DO $s105c1$
BEGIN
  IF to_regclass('public.activity_logs') IS NULL THEN
    RETURN;
  END IF;
  DROP POLICY IF EXISTS "activity_logs_hospital_read" ON public.activity_logs;
  DROP POLICY IF EXISTS "Hospital staff can read own hospital logs" ON public.activity_logs;
  DROP POLICY IF EXISTS "Hospital staff can view activity logs" ON public.activity_logs;
END
$s105c1$;

-- C.2 audit_logs: admin reads are scoped to the admin's own hospital. The
--     20260909000001 policy compared ur.hospital_id to itself, which is always
--     true, so it was a cross-tenant read. The role-only policies are dropped.
DO $s105c2$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    RETURN;
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_id')
    AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'hospital_id')
  ) THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Admin can view all audit logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "Admins can view all audit logs in their hospital" ON public.audit_logs;
  DROP POLICY IF EXISTS "Hospital-scoped audit log access" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs_hospital_admin_read" ON public.audit_logs;
  DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs_admin_hospital_read" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs_self_read" ON public.audit_logs;

  CREATE POLICY "audit_logs_admin_hospital_read" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
          FROM public.user_roles ur
          JOIN public.profiles p ON p.user_id = ur.user_id
         WHERE ur.user_id = auth.uid()
           AND ur.role::text = 'admin'
           AND ur.hospital_id = audit_logs.hospital_id
           AND coalesce((to_jsonb(p) ->> 'is_active')::boolean, true)
      )
    );

  CREATE POLICY "audit_logs_self_read" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
END
$s105c2$;

-- C.3 audit_log_summary: a view runs as its owner unless security_invoker is
--     set, so it read every hospital's audit_log rows for any signed-in user.
DO $s105c3$
BEGIN
  IF to_regclass('public.audit_log_summary') IS NULL THEN
    RETURN;
  END IF;
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE WARNING '20261105000008: security_invoker needs PostgreSQL 15+; audit_log_summary NOT hardened';
    RETURN;
  END IF;
  ALTER VIEW public.audit_log_summary SET (security_invoker = true);
END
$s105c3$;

-- -----------------------------------------------------------------------------
-- D. Audit helpers that take a caller-supplied actor are not callable by
--    client roles. Nothing in supabase/migrations or src/ calls them.
-- -----------------------------------------------------------------------------
DO $s105d$
DECLARE
  f    record;
  r    text;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('log_audit_event', 'create_amendment_audit', 'set_audit_context')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f.sig);
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I', f.sig, r);
      END IF;
    END LOOP;
  END LOOP;
END
$s105d$;

-- -----------------------------------------------------------------------------
-- E. DB-06: SET search_path on every SECURITY DEFINER function in public that
--    has none. Extension-owned functions are skipped. A function the migration
--    role cannot alter is reported as a WARNING and left as it is.
--    public, pg_temp (not '') keeps unqualified calls to other public functions
--    working. Functions that already set a search_path are not changed.
-- -----------------------------------------------------------------------------
DO $s105e$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure::text AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND NOT EXISTS (
         SELECT 1 FROM pg_depend d
          WHERE d.classid = 'pg_proc'::regclass
            AND d.objid = p.oid
            AND d.deptype = 'e')
       AND NOT EXISTS (
         SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) cfg
          WHERE cfg LIKE 'search_path=%')
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE WARNING '20261105000008: could not set search_path on %', f.sig;
    END;
  END LOOP;
END
$s105e$;
