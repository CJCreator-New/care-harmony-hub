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
--            authenticated. RLS is enabled on the table and on each partition.
-- Section B  writes. Every INSERT and FOR ALL policy on activity_logs, audit_logs
--            and audit_log is dropped, whatever its name or predicate (the live
--            set has WITH CHECK (true) on activity_logs and audit_logs). Each
--            table then gets one policy that binds the actor to auth.uid() and
--            the hospital to the caller's own. A table whose columns cannot bind
--            an actor gets no client INSERT policy, so only the service role
--            writes to it.
-- Section C  reads. Every SELECT and FOR ALL policy on activity_logs and
--            audit_logs is dropped (the live set has USING (true) on several,
--            and role-only admin policies that read across hospitals). Each table
--            gets admin reads limited to the admin's own hospital and self reads.
--            audit_log_summary gets security_invoker, so it reads as the caller.
-- Section D  audit helper functions that take a caller-supplied actor
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
-- Helper: does the table exist with all of these columns? Each policy below is
-- created only where its predicate can be written, so the file does not fail on
-- schema drift. Dropped at the end of this file.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.s105_table_has_columns(p_table text, p_cols text[])
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT to_regclass('public.' || p_table) IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM unnest(p_cols) AS c
        WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns ic
                           WHERE ic.table_schema = 'public'
                             AND ic.table_name = p_table
                             AND ic.column_name = c))
$$;

-- -----------------------------------------------------------------------------
-- B. Writes. Every INSERT and FOR ALL policy on the audit tables is dropped,
--    whatever its name or predicate. Each table then gets one self-bound INSERT
--    policy if its columns allow it. A table whose columns cannot bind an actor
--    gets no client INSERT policy, so only the service role writes to it.
--    Edge functions and triggers running as the owner are not affected.
-- -----------------------------------------------------------------------------
DO $s105b$
DECLARE
  p record;
  t text;
BEGIN
  -- activity_logs: WITH CHECK (true) in the live policy set lets any signed-in
  -- user write a row for any user and hospital.
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'activity_logs'
                AND cmd IN ('INSERT', 'ALL') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_logs', p.policyname);
    END LOOP;
    IF public.s105_table_has_columns('activity_logs', ARRAY['user_id', 'hospital_id']) THEN
      CREATE POLICY "activity_logs_self_insert" ON public.activity_logs
        FOR INSERT TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          AND (hospital_id IS NULL OR EXISTS (
                SELECT 1 FROM public.profiles pr
                 WHERE pr.user_id = auth.uid()
                   AND pr.hospital_id = activity_logs.hospital_id))
        );
    ELSE
      RAISE NOTICE '20261105000008: activity_logs lacks user_id or hospital_id; no client insert policy';
    END IF;
  END IF;

  -- audit_logs: WITH CHECK (true) and user_id IS NULL both let a client write
  -- arbitrary rows.
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'audit_logs'
                AND cmd IN ('INSERT', 'ALL') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', p.policyname);
    END LOOP;
    IF public.s105_table_has_columns('audit_logs', ARRAY['user_id', 'hospital_id']) THEN
      CREATE POLICY "audit_logs_self_insert" ON public.audit_logs
        FOR INSERT TO authenticated
        WITH CHECK (
          user_id = auth.uid()
          AND hospital_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM public.profiles pr
                       WHERE pr.user_id = auth.uid()
                         AND pr.hospital_id = audit_logs.hospital_id)
        );
    ELSE
      RAISE NOTICE '20261105000008: audit_logs lacks user_id or hospital_id; no client insert policy';
    END IF;
  END IF;

  -- audit_log (core table): the insert policy checks only the hospital, so a
  -- staff member could name any actor. The write must name the caller.
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'audit_log'
                AND cmd IN ('INSERT', 'ALL') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_log', p.policyname);
    END LOOP;
    IF public.s105_table_has_columns('audit_log', ARRAY['actor_user_id', 'hospital_id']) THEN
      CREATE POLICY "audit_log_insert_as_actor" ON public.audit_log
        FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.profiles pr
                   WHERE pr.user_id = auth.uid()
                     AND pr.id = audit_log.actor_user_id
                     AND pr.hospital_id = audit_log.hospital_id)
        );
    ELSE
      RAISE NOTICE '20261105000008: audit_log lacks actor_user_id or hospital_id; no client insert policy';
    END IF;
  END IF;

  -- Clinical audit tables (20260313000001): the insert policy checks only the
  -- hospital, so a staff member could name any actor. The triggers that write
  -- these rows (20260313000002 and 20260313000003) are not SECURITY INVOKER,
  -- so they do not depend on the client policy.
  FOREACH t IN ARRAY ARRAY['prescription_audit', 'invoice_adjustment_audit', 'lab_result_audit'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    FOR p IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = t
                AND cmd IN ('INSERT', 'ALL') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    IF public.s105_table_has_columns(t, ARRAY['actor_user_id', 'hospital_id']) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK ('
        '  EXISTS (SELECT 1 FROM public.profiles pr'
        '           WHERE pr.user_id = auth.uid()'
        '             AND pr.id = %I.actor_user_id'
        '             AND pr.hospital_id = %I.hospital_id))',
        t || '_insert_as_actor', t, t, t);
    ELSE
      RAISE NOTICE '20261105000008: % lacks actor_user_id or hospital_id; no client insert policy', t;
    END IF;
  END LOOP;
END
$s105b$;

-- -----------------------------------------------------------------------------
-- C. Reads. Every SELECT and FOR ALL policy on activity_logs and audit_logs is
--    dropped, because the live set contains USING (true) and role-only policies
--    (cross-tenant). Each table gets admin-in-own-hospital reads and self reads
--    where the columns allow them. audit_log keeps its hospital-scoped read.
-- -----------------------------------------------------------------------------
DO $s105c$
DECLARE
  p record;
BEGIN
  IF to_regclass('public.activity_logs') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'activity_logs'
                AND cmd IN ('SELECT', 'ALL') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_logs', p.policyname);
    END LOOP;
    IF public.s105_table_has_columns('activity_logs', ARRAY['hospital_id']) THEN
      CREATE POLICY "activity_logs_admin_hospital_read" ON public.activity_logs
        FOR SELECT TO authenticated
        USING (
          activity_logs.hospital_id IS NOT NULL
          AND EXISTS (
            SELECT 1
              FROM public.user_roles ur
              JOIN public.profiles pr ON pr.user_id = ur.user_id
             WHERE ur.user_id = auth.uid()
               AND ur.role::text = 'admin'
               AND ur.hospital_id = activity_logs.hospital_id
               AND coalesce((to_jsonb(pr) ->> 'is_active')::boolean, true)
          )
        );
    END IF;
    IF public.s105_table_has_columns('activity_logs', ARRAY['user_id']) THEN
      CREATE POLICY "activity_logs_self_read" ON public.activity_logs
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    END IF;
  END IF;

  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    FOR p IN SELECT policyname FROM pg_policies
              WHERE schemaname = 'public' AND tablename = 'audit_logs'
                AND cmd IN ('SELECT', 'ALL') LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.audit_logs', p.policyname);
    END LOOP;
    IF public.s105_table_has_columns('audit_logs', ARRAY['hospital_id']) THEN
      CREATE POLICY "audit_logs_admin_hospital_read" ON public.audit_logs
        FOR SELECT TO authenticated
        USING (
          audit_logs.hospital_id IS NOT NULL
          AND EXISTS (
            SELECT 1
              FROM public.user_roles ur
              JOIN public.profiles pr ON pr.user_id = ur.user_id
             WHERE ur.user_id = auth.uid()
               AND ur.role::text = 'admin'
               AND ur.hospital_id = audit_logs.hospital_id
               AND coalesce((to_jsonb(pr) ->> 'is_active')::boolean, true)
          )
        );
    ELSE
      RAISE NOTICE '20261105000008: audit_logs lacks hospital_id; no admin read policy';
    END IF;
    IF public.s105_table_has_columns('audit_logs', ARRAY['user_id']) THEN
      CREATE POLICY "audit_logs_self_read" ON public.audit_logs
        FOR SELECT TO authenticated
        USING (user_id = auth.uid());
    END IF;
  END IF;
END
$s105c$;

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

-- -----------------------------------------------------------------------------
-- Clean up the helper this file used.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.s105_table_has_columns(text, text[]);
