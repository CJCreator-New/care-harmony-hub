-- Test fixture for 20261105000005_neutralize_destructive_endpoints.sql (S0-05, DB-04).
-- NOT a migration. Apply only to a throwaway PostgreSQL that already has
-- scripts/db/supabase-compat-shim.sql (see 20261105000005.README.md).
--
-- Recreates the state a live database has after
-- 20260313000004_audit_testing_compliance_utilities.sql: an audit_log table
-- with rows, the purge function exactly as it shipped (NULL-unsafe guard,
-- SECURITY DEFINER, no REVOKE), and stand-ins for the two test_setup_* helpers
-- with the original signatures and grants. The shim's default privileges give
-- EXECUTE on new functions to anon, authenticated and service_role, as Supabase
-- does. The last block proves the vulnerability exists before the migration.

CREATE TABLE public.audit_log (
  audit_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time timestamptz NOT NULL DEFAULT now(),
  action_type text NOT NULL
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit log is append-only, no deletes" ON public.audit_log FOR DELETE USING (false);
CREATE POLICY "read" ON public.audit_log FOR SELECT USING (true);

INSERT INTO public.audit_log (event_time, action_type)
SELECT now() - (g || ' days')::interval, 'fixture' FROM generate_series(1, 200) g;

-- Exactly as in 20260313000004 (section 6).
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs_staging_only(
  p_days_retention INT DEFAULT 90
)
RETURNS TABLE (
  deleted_count INT,
  warning_message TEXT
) AS $$
DECLARE
  v_deleted INT;
BEGIN
  IF current_setting('app.environment', true) != 'staging' THEN
    RAISE EXCEPTION 'Audit log purge only allowed in staging environment!';
  END IF;

  DELETE FROM public.audit_log
  WHERE event_time < now() - (p_days_retention || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN QUERY SELECT
    v_deleted,
    'WARNING: Audit logs deleted. Production policy: keep forever.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- A drifted overload, to prove the migration handles any signature.
CREATE FUNCTION public.purge_old_audit_logs_staging_only(p_days_retention bigint, p_dry_run boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ DELETE FROM public.audit_log $$;

-- Stand-ins with the original signatures and grants (sections 1 and 2).
CREATE OR REPLACE FUNCTION public.test_setup_prescription_audit_scenario()
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_log (action_type) VALUES ('fabricated_prescription_event');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.test_setup_prescription_audit_scenario() TO authenticated;

CREATE OR REPLACE FUNCTION public.test_setup_invoice_audit_scenario()
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_log (action_type) VALUES ('fabricated_invoice_event');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.test_setup_invoice_audit_scenario() TO authenticated;

-- Precondition: the hole is real. anon can execute the purge, and (with
-- app.environment unset) it deletes rows. Run inside a subtransaction that is
-- rolled back so the fixture keeps its 200 rows.
DO $pre$
DECLARE
  v_count int;
BEGIN
  IF NOT has_function_privilege('anon', 'public.purge_old_audit_logs_staging_only(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'fixture precondition failed: anon cannot execute the purge';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.test_setup_invoice_audit_scenario()', 'EXECUTE') THEN
    RAISE EXCEPTION 'fixture precondition failed: authenticated cannot execute test_setup_invoice_audit_scenario';
  END IF;
  BEGIN
    PERFORM set_config('role', 'anon', true);
    PERFORM * FROM public.purge_old_audit_logs_staging_only(0);
    PERFORM set_config('role', 'postgres', true);
    SELECT count(*) INTO v_count FROM public.audit_log;
    RAISE NOTICE 'PRECONDITION anon purge left % of 200 audit rows', v_count;
    IF v_count <> 0 THEN
      RAISE EXCEPTION 'fixture precondition failed: purge did not delete rows (left %)', v_count;
    END IF;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 's005_rollback';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 's005_rollback' THEN RAISE; END IF;
  END;
  PERFORM set_config('role', 'postgres', true);
END
$pre$;
