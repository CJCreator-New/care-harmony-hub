-- Assertions for 20261105000005_neutralize_destructive_endpoints.sql (S0-05, DB-04).
-- NOT a migration. Runs after 00000000000000_fixture.sql and the migration
-- (applied twice). Every check RAISEs on failure, so the file exits non-zero if
-- any check fails; each passing check prints "PASS ...".

CREATE FUNCTION pg_temp.expect(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL %', p_label;
  END IF;
  RAISE NOTICE 'PASS %', p_label;
END $$;

-- Calls a function as a given role over the same path PostgREST uses
-- (SET ROLE, then SELECT the function) and returns the SQLSTATE, or 'ok'.
CREATE FUNCTION pg_temp.call_as(p_role text, p_call text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  v_state text := 'ok';
BEGIN
  BEGIN
    PERFORM set_config('role', p_role, true);
    EXECUTE 'SELECT ' || p_call;
    PERFORM set_config('role', 'postgres', true);
  EXCEPTION WHEN OTHERS THEN
    v_state := SQLSTATE;
  END;
  PERFORM set_config('role', 'postgres', true);
  RETURN v_state;
END $$;

DO $a$
DECLARE
  v_role text;
  v_call text;
  v_state text;
BEGIN
  PERFORM pg_temp.expect(NOT EXISTS (
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname IN ('purge_old_audit_logs_staging_only',
                           'test_setup_prescription_audit_scenario',
                           'test_setup_invoice_audit_scenario')),
    'no purge or test_setup_* function (any overload) exists in schema public');

  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    FOREACH v_call IN ARRAY ARRAY[
      'public.purge_old_audit_logs_staging_only(0)',
      'public.purge_old_audit_logs_staging_only(0::bigint, false)',
      'public.test_setup_prescription_audit_scenario()',
      'public.test_setup_invoice_audit_scenario()'] LOOP
      v_state := pg_temp.call_as(v_role, v_call);
      -- 42883 undefined_function: the RPC is gone (PostgREST answers 404).
      PERFORM pg_temp.expect(v_state = '42883',
        format('%s cannot execute %s (sqlstate %s)', v_role, v_call, v_state));
    END LOOP;
  END LOOP;

  PERFORM pg_temp.expect((SELECT count(*) FROM public.audit_log) = 200,
    'all 200 audit_log rows are intact');
  PERFORM pg_temp.expect(NOT EXISTS (SELECT 1 FROM public.audit_log WHERE action_type LIKE 'fabricated_%'),
    'no fabricated audit rows were written');
END
$a$;
