-- Assertions for 20261105000006_rls_lab_tables.sql.
-- NOT a migration. Runs after 00000000000000_fixture.sql and the migration
-- (applied twice). Every check is stored in s06_results; the last block prints
-- each one as a NOTICE and RAISEs if any failed.
--
-- Principals are simulated the way PostgREST does it: SET ROLE authenticated
-- with request.jwt.claims = {"sub": ..., "role": "authenticated"}; anon is
-- SET ROLE anon with {"role": "anon"}. Writes run inside a subtransaction that
-- is always rolled back, so each check starts from the seed data.

CREATE TEMP TABLE s06_results (
  seq serial, label text, expected text, actual text, ok boolean);

CREATE TEMP TABLE s06_who (name text PRIMARY KEY, uid uuid);
INSERT INTO s06_who VALUES
  ('admin_a',    '00000000-0000-0000-0000-0000000000a1'),
  ('doctor_a',   '00000000-0000-0000-0000-0000000000a2'),
  ('nurse_a',    '00000000-0000-0000-0000-0000000000a3'),
  ('lab_a',      '00000000-0000-0000-0000-0000000000a4'),
  ('recep_a',    '00000000-0000-0000-0000-0000000000a5'),
  ('patient_a',  '00000000-0000-0000-0000-0000000000a6'),
  ('inactive_a', '00000000-0000-0000-0000-0000000000a7'),
  ('noprof_a',   '00000000-0000-0000-0000-0000000000a9'),
  ('lab_b',      '00000000-0000-0000-0000-0000000000b8'),
  ('admin_b',    '00000000-0000-0000-0000-0000000000b1'),
  ('anon',       NULL);

CREATE FUNCTION pg_temp.u(p_name text) RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT uid FROM s06_who WHERE name = p_name
$$;

CREATE FUNCTION pg_temp.as_user(p_uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    PERFORM set_config('role', 'anon', true);
  ELSE
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
    PERFORM set_config('role', 'authenticated', true);
  END IF;
END $$;

CREATE FUNCTION pg_temp.reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

-- Read as p_uid. p_sql must return one count(*) row. 'rows:N' or 'error:SQLSTATE'.
CREATE FUNCTION pg_temp.q(p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  PERFORM pg_temp.as_user(p_uid);
  BEGIN
    EXECUTE p_sql INTO n;
    PERFORM pg_temp.reset();
    RETURN 'rows:' || n;
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_temp.reset();
    RETURN 'error:' || SQLSTATE;
  END;
END $$;

-- Write as p_uid, always rolled back. 'ok:<rows affected>' or 'err:<SQLSTATE>'.
CREATE FUNCTION pg_temp.w(p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint; res text;
BEGIN
  PERFORM pg_temp.as_user(p_uid);
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION 's06_rollback:%', n;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE 's06_rollback:%' THEN
      res := 'ok:' || substring(SQLERRM FROM 's06_rollback:(.*)$');
    ELSE
      res := 'err:' || SQLSTATE;
    END IF;
  END;
  PERFORM pg_temp.reset();
  RETURN res;
END $$;

CREATE FUNCTION pg_temp.expect(p_label text, p_expected text, p_actual text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO s06_results (label, expected, actual, ok)
  VALUES (p_label, p_expected, p_actual, p_expected = p_actual);
END $$;

-- For anon: either no rows or a permission error counts as reading nothing.
CREATE FUNCTION pg_temp.expect_nothing(p_label text, p_actual text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO s06_results (label, expected, actual, ok)
  VALUES (p_label, 'rows:0 or error:42501', p_actual,
          p_actual IN ('rows:0', 'error:42501'));
END $$;

-- -----------------------------------------------------------------------------
-- lab_results: reads
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('lab_results: lab_a (lab_technician A) counts own-hospital rows (order-linked + A)',
  'rows:2', pg_temp.q(pg_temp.u('lab_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: lab_a cannot see hospital B row',
  'rows:0', pg_temp.q(pg_temp.u('lab_a'),
  $s$SELECT count(*) FROM public.lab_results WHERE id = '51000000-0000-0000-0000-00000000000b'$s$));
SELECT pg_temp.expect('lab_results: lab_a cannot see row stamped B on order A (mismatch refused)',
  'rows:0', pg_temp.q(pg_temp.u('lab_a'),
  $s$SELECT count(*) FROM public.lab_results WHERE id = '51000000-0000-0000-0000-0000000000d0'$s$));
SELECT pg_temp.expect('lab_results: restrictive legacy policy still hides BLOCKED row from lab_a',
  'rows:0', pg_temp.q(pg_temp.u('lab_a'),
  $s$SELECT count(*) FROM public.lab_results WHERE id = '51000000-0000-0000-0000-0000000000e0'$s$));
SELECT pg_temp.expect('lab_results: lab_a cannot see row with no hospital and no order',
  'rows:0', pg_temp.q(pg_temp.u('lab_a'),
  $s$SELECT count(*) FROM public.lab_results WHERE id = '51000000-0000-0000-0000-0000000000c0'$s$));
SELECT pg_temp.expect('lab_results: lab_b (lab_technician B) sees only its own row',
  'rows:1', pg_temp.q(pg_temp.u('lab_b'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: admin_a sees hospital A rows',
  'rows:2', pg_temp.q(pg_temp.u('admin_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: admin_b sees hospital B rows only',
  'rows:1', pg_temp.q(pg_temp.u('admin_b'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: doctor_a reads hospital A rows',
  'rows:2', pg_temp.q(pg_temp.u('doctor_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: nurse_a reads hospital A rows',
  'rows:2', pg_temp.q(pg_temp.u('nurse_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: receptionist reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('recep_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: patient reads nothing (no patient-facing read)',
  'rows:0', pg_temp.q(pg_temp.u('patient_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: inactive lab_technician reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('inactive_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect('lab_results: staff role with no profile row reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('noprof_a'), 'SELECT count(*) FROM public.lab_results'));
SELECT pg_temp.expect_nothing('lab_results: anon reads nothing',
  pg_temp.q(pg_temp.u('anon'), 'SELECT count(*) FROM public.lab_results'));

-- -----------------------------------------------------------------------------
-- lab_results: writes
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('lab_results: lab_a inserts a row for hospital A order A',
  'ok:1', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: lab_a cannot insert a row for hospital B',
  'err:42501', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.lab_results (hospital_id, loinc_code, result_value)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: lab_a cannot insert hospital A row against order B',
  'err:42501', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000b', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: lab_a cannot insert a row with no hospital and no order',
  'err:42501', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.lab_results (loinc_code, result_value)
  VALUES ('2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: doctor_a inserts a row for hospital A order A',
  'ok:1', pg_temp.w(pg_temp.u('doctor_a'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: nurse_a cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('nurse_a'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: receptionist cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('recep_a'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: inactive lab_technician cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('inactive_a'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: patient cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('patient_a'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: lab_b cannot insert a hospital A row',
  'err:42501', pg_temp.w(pg_temp.u('lab_b'), $s$INSERT INTO public.lab_results (lab_order_id, hospital_id, loinc_code, result_value)
  VALUES ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.0')$s$));
SELECT pg_temp.expect('lab_results: lab_a updates its own hospital row',
  'ok:1', pg_temp.w(pg_temp.u('lab_a'), $s$UPDATE public.lab_results SET result_value = '6.0'
  WHERE id = '51000000-0000-0000-0000-00000000000a'$s$));
SELECT pg_temp.expect('lab_results: lab_a cannot update hospital B row (filtered)',
  'ok:0', pg_temp.w(pg_temp.u('lab_a'), $s$UPDATE public.lab_results SET result_value = '6.0'
  WHERE id = '51000000-0000-0000-0000-00000000000b'$s$));
SELECT pg_temp.expect('lab_results: lab_a cannot move its row to hospital B (WITH CHECK)',
  'err:42501', pg_temp.w(pg_temp.u('lab_a'), $s$UPDATE public.lab_results SET hospital_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  WHERE id = '51000000-0000-0000-0000-00000000000a'$s$));
SELECT pg_temp.expect('lab_results: nobody has DELETE (lab_a delete affects 0 rows)',
  'ok:0', pg_temp.w(pg_temp.u('lab_a'), $s$DELETE FROM public.lab_results
  WHERE id = '51000000-0000-0000-0000-00000000000a'$s$));
SELECT pg_temp.expect('lab_results: nurse_a cannot update (filtered)',
  'ok:0', pg_temp.w(pg_temp.u('nurse_a'), $s$UPDATE public.lab_results SET result_value = '6.0'
  WHERE id = '51000000-0000-0000-0000-00000000000a'$s$));

-- -----------------------------------------------------------------------------
-- lab_qc_results
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('lab_qc_results: lab_a reads hospital A row only',
  'rows:1', pg_temp.q(pg_temp.u('lab_a'), 'SELECT count(*) FROM public.lab_qc_results'));
SELECT pg_temp.expect('lab_qc_results: admin_a reads hospital A row only',
  'rows:1', pg_temp.q(pg_temp.u('admin_a'), 'SELECT count(*) FROM public.lab_qc_results'));
SELECT pg_temp.expect('lab_qc_results: doctor_a reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('doctor_a'), 'SELECT count(*) FROM public.lab_qc_results'));
SELECT pg_temp.expect('lab_qc_results: nurse_a reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('nurse_a'), 'SELECT count(*) FROM public.lab_qc_results'));
SELECT pg_temp.expect('lab_qc_results: inactive lab_technician reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('inactive_a'), 'SELECT count(*) FROM public.lab_qc_results'));
SELECT pg_temp.expect('lab_qc_results: lab_a inserts for hospital A',
  'ok:1', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.lab_qc_results (hospital_id, loinc_code, qc_level, run_date)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', 'L2', '2026-11-05')$s$));
SELECT pg_temp.expect('lab_qc_results: lab_a cannot insert for hospital B',
  'err:42501', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.lab_qc_results (hospital_id, loinc_code, qc_level, run_date)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2345-7', 'L2', '2026-11-05')$s$));
SELECT pg_temp.expect('lab_qc_results: doctor_a cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('doctor_a'), $s$INSERT INTO public.lab_qc_results (hospital_id, loinc_code, qc_level, run_date)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', 'L2', '2026-11-05')$s$));

-- -----------------------------------------------------------------------------
-- lab_trends
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('lab_trends: doctor_a reads hospital A row',
  'rows:1', pg_temp.q(pg_temp.u('doctor_a'), 'SELECT count(*) FROM public.lab_trends'));
SELECT pg_temp.expect('lab_trends: nurse_a reads hospital A row',
  'rows:1', pg_temp.q(pg_temp.u('nurse_a'), 'SELECT count(*) FROM public.lab_trends'));
SELECT pg_temp.expect('lab_trends: lab_b reads hospital B row only',
  'rows:1', pg_temp.q(pg_temp.u('lab_b'), 'SELECT count(*) FROM public.lab_trends'));
SELECT pg_temp.expect('lab_trends: patient reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('patient_a'), 'SELECT count(*) FROM public.lab_trends'));
SELECT pg_temp.expect('lab_trends: receptionist reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('recep_a'), 'SELECT count(*) FROM public.lab_trends'));
SELECT pg_temp.expect('lab_trends: nurse_a cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('nurse_a'), $s$INSERT INTO public.lab_trends (hospital_id, patient_id, loinc_code, trend_period)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '50000000-0000-0000-0000-00000000000a', '2345-7', '7d')$s$));
SELECT pg_temp.expect('lab_trends: doctor_a inserts for hospital A',
  'ok:1', pg_temp.w(pg_temp.u('doctor_a'), $s$INSERT INTO public.lab_trends (hospital_id, patient_id, loinc_code, trend_period)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '50000000-0000-0000-0000-00000000000a', '2345-7', '7d')$s$));
SELECT pg_temp.expect('lab_trends: lab_b cannot insert for hospital A',
  'err:42501', pg_temp.w(pg_temp.u('lab_b'), $s$INSERT INTO public.lab_trends (hospital_id, patient_id, loinc_code, trend_period)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '50000000-0000-0000-0000-00000000000a', '2345-7', '7d')$s$));

-- -----------------------------------------------------------------------------
-- critical_value_notifications
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('critical_value_notifications: nurse_a reads hospital A row',
  'rows:1', pg_temp.q(pg_temp.u('nurse_a'), 'SELECT count(*) FROM public.critical_value_notifications'));
SELECT pg_temp.expect('critical_value_notifications: lab_a reads hospital A row',
  'rows:1', pg_temp.q(pg_temp.u('lab_a'), 'SELECT count(*) FROM public.critical_value_notifications'));
SELECT pg_temp.expect('critical_value_notifications: lab_b reads hospital B row only (legacy open policy removed)',
  'rows:1', pg_temp.q(pg_temp.u('lab_b'), 'SELECT count(*) FROM public.critical_value_notifications'));
SELECT pg_temp.expect('critical_value_notifications: receptionist reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('recep_a'), 'SELECT count(*) FROM public.critical_value_notifications'));
SELECT pg_temp.expect('critical_value_notifications: patient reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('patient_a'), 'SELECT count(*) FROM public.critical_value_notifications'));
SELECT pg_temp.expect('critical_value_notifications: inactive user reads nothing',
  'rows:0', pg_temp.q(pg_temp.u('inactive_a'), 'SELECT count(*) FROM public.critical_value_notifications'));
SELECT pg_temp.expect('critical_value_notifications: nurse_a cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('nurse_a'), $s$INSERT INTO public.critical_value_notifications (hospital_id, loinc_code, critical_value)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '7.0')$s$));
SELECT pg_temp.expect('critical_value_notifications: doctor_a inserts for hospital A',
  'ok:1', pg_temp.w(pg_temp.u('doctor_a'), $s$INSERT INTO public.critical_value_notifications (hospital_id, loinc_code, critical_value)
  VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '7.0')$s$));
SELECT pg_temp.expect('critical_value_notifications: nurse_a acknowledges hospital A row',
  'ok:1', pg_temp.w(pg_temp.u('nurse_a'), $s$UPDATE public.critical_value_notifications SET acknowledged_at = now()
  WHERE id = '54000000-0000-0000-0000-00000000000a'$s$));
SELECT pg_temp.expect('critical_value_notifications: admin_a cannot acknowledge (no UPDATE grant for admin)',
  'ok:0', pg_temp.w(pg_temp.u('admin_a'), $s$UPDATE public.critical_value_notifications SET acknowledged_at = now()
  WHERE id = '54000000-0000-0000-0000-00000000000a'$s$));
SELECT pg_temp.expect('critical_value_notifications: lab_a cannot insert for hospital B',
  'err:42501', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.critical_value_notifications (hospital_id, loinc_code, critical_value)
  VALUES ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2345-7', '7.0')$s$));

-- -----------------------------------------------------------------------------
-- loinc_codes: any authenticated reads; only an admin writes
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('loinc_codes: lab_a (authenticated) reads all codes',
  'rows:2', pg_temp.q(pg_temp.u('lab_a'), 'SELECT count(*) FROM public.loinc_codes'));
SELECT pg_temp.expect('loinc_codes: patient_a (authenticated) reads all codes',
  'rows:2', pg_temp.q(pg_temp.u('patient_a'), 'SELECT count(*) FROM public.loinc_codes'));
SELECT pg_temp.expect('loinc_codes: receptionist (authenticated) reads all codes',
  'rows:2', pg_temp.q(pg_temp.u('recep_a'), 'SELECT count(*) FROM public.loinc_codes'));
SELECT pg_temp.expect('loinc_codes: admin_a reads all codes',
  'rows:2', pg_temp.q(pg_temp.u('admin_a'), 'SELECT count(*) FROM public.loinc_codes'));
SELECT pg_temp.expect_nothing('loinc_codes: anon reads nothing',
  pg_temp.q(pg_temp.u('anon'), 'SELECT count(*) FROM public.loinc_codes'));
SELECT pg_temp.expect('loinc_codes: admin_a inserts a code',
  'ok:1', pg_temp.w(pg_temp.u('admin_a'), $s$INSERT INTO public.loinc_codes (code, component) VALUES ('TEST-1', 'Test')$s$));
SELECT pg_temp.expect('loinc_codes: admin_b (other hospital admin) inserts a code',
  'ok:1', pg_temp.w(pg_temp.u('admin_b'), $s$INSERT INTO public.loinc_codes (code, component) VALUES ('TEST-2', 'Test')$s$));
SELECT pg_temp.expect('loinc_codes: lab_a cannot insert a code',
  'err:42501', pg_temp.w(pg_temp.u('lab_a'), $s$INSERT INTO public.loinc_codes (code, component) VALUES ('TEST-3', 'Test')$s$));
SELECT pg_temp.expect('loinc_codes: doctor_a cannot insert a code',
  'err:42501', pg_temp.w(pg_temp.u('doctor_a'), $s$INSERT INTO public.loinc_codes (code, component) VALUES ('TEST-4', 'Test')$s$));
SELECT pg_temp.expect('loinc_codes: patient_a cannot insert a code',
  'err:42501', pg_temp.w(pg_temp.u('patient_a'), $s$INSERT INTO public.loinc_codes (code, component) VALUES ('TEST-5', 'Test')$s$));
SELECT pg_temp.expect('loinc_codes: anon cannot insert a code',
  'err:42501', pg_temp.w(pg_temp.u('anon'), $s$INSERT INTO public.loinc_codes (code, component) VALUES ('TEST-6', 'Test')$s$));
SELECT pg_temp.expect('loinc_codes: lab_a update affects 0 rows',
  'ok:0', pg_temp.w(pg_temp.u('lab_a'), $s$UPDATE public.loinc_codes SET component = 'x' WHERE code = '2345-7'$s$));
SELECT pg_temp.expect('loinc_codes: lab_a delete affects 0 rows',
  'ok:0', pg_temp.w(pg_temp.u('lab_a'), $s$DELETE FROM public.loinc_codes WHERE code = '2345-7'$s$));
SELECT pg_temp.expect('loinc_codes: admin_a delete affects 1 row',
  'ok:1', pg_temp.w(pg_temp.u('admin_a'), $s$DELETE FROM public.loinc_codes WHERE code = '2345-7'$s$));

-- -----------------------------------------------------------------------------
-- lab_interpretation_rules: any authenticated reads; only an admin writes
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('lab_interpretation_rules: lab_a reads the rule',
  'rows:1', pg_temp.q(pg_temp.u('lab_a'), 'SELECT count(*) FROM public.lab_interpretation_rules'));
SELECT pg_temp.expect('lab_interpretation_rules: patient_a reads the rule',
  'rows:1', pg_temp.q(pg_temp.u('patient_a'), 'SELECT count(*) FROM public.lab_interpretation_rules'));
SELECT pg_temp.expect_nothing('lab_interpretation_rules: anon reads nothing',
  pg_temp.q(pg_temp.u('anon'), 'SELECT count(*) FROM public.lab_interpretation_rules'));
SELECT pg_temp.expect('lab_interpretation_rules: doctor_a cannot insert',
  'err:42501', pg_temp.w(pg_temp.u('doctor_a'), $s$INSERT INTO public.lab_interpretation_rules (loinc_code, condition_type, condition_criteria, interpretation_text)
  VALUES ('2345-7', 'range', '{}', 'x')$s$));
SELECT pg_temp.expect('lab_interpretation_rules: admin_a inserts',
  'ok:1', pg_temp.w(pg_temp.u('admin_a'), $s$INSERT INTO public.lab_interpretation_rules (loinc_code, condition_type, condition_criteria, interpretation_text)
  VALUES ('2345-7', 'range', '{}', 'x')$s$));
SELECT pg_temp.expect('lab_interpretation_rules: lab_a update affects 0 rows',
  'ok:0', pg_temp.w(pg_temp.u('lab_a'), $s$UPDATE public.lab_interpretation_rules SET interpretation_text = 'x'$s$));

-- -----------------------------------------------------------------------------
-- Migration state (no principal)
-- -----------------------------------------------------------------------------
SELECT pg_temp.expect('state: RLS is on for all six tables',
  '6', (SELECT count(*)::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relrowsecurity
           AND c.relname IN ('lab_results', 'lab_qc_results', 'lab_trends',
             'lab_interpretation_rules', 'critical_value_notifications', 'loinc_codes')));
SELECT pg_temp.expect('state: legacy permissive policy removed',
  '0', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND policyname = 'legacy_open'));
SELECT pg_temp.expect('state: restrictive legacy policy kept',
  '1', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public'
         AND policyname = 'legacy_restrictive_block' AND permissive = 'RESTRICTIVE'));
SELECT pg_temp.expect('state: 20 lab_rls_ permissive policies on the six tables',
  '20', (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public'
          AND permissive = 'PERMISSIVE' AND policyname LIKE 'lab\_rls\_%'
          AND tablename IN ('lab_results', 'lab_qc_results', 'lab_trends',
            'lab_interpretation_rules', 'critical_value_notifications', 'loinc_codes')));
SELECT pg_temp.expect('state: anon has no privilege on the six tables',
  '0', (SELECT count(*)::text FROM unnest(ARRAY['lab_results', 'lab_qc_results', 'lab_trends',
          'lab_interpretation_rules', 'critical_value_notifications', 'loinc_codes']) t
         WHERE has_table_privilege('anon', 'public.' || t, 'SELECT, INSERT, UPDATE, DELETE')));

-- -----------------------------------------------------------------------------
-- Report and fail
-- -----------------------------------------------------------------------------
DO $report$
DECLARE
  r record;
  n_fail int;
  n_all int;
BEGIN
  FOR r IN SELECT * FROM s06_results ORDER BY seq LOOP
    RAISE NOTICE '%  %  (expected %, actual %)',
      CASE WHEN r.ok THEN 'OK  ' ELSE 'FAIL' END, r.label, r.expected, r.actual;
  END LOOP;
  SELECT count(*) INTO n_all FROM s06_results;
  SELECT count(*) INTO n_fail FROM s06_results WHERE NOT ok;
  RAISE NOTICE 'checks: %, passed: %, failed: %', n_all, n_all - n_fail, n_fail;
  IF n_fail > 0 THEN
    RAISE EXCEPTION 's06 assertions failed: % of %', n_fail, n_all;
  END IF;
END
$report$;
