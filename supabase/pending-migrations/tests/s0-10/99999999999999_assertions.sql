-- Assertions for 20261105000002_mfa_backup_codes_and_aal2.sql (S0-10).
-- NOT a migration. Runs after 00000000000000_fixture.sql and the migration
-- (applied twice). Every check RAISEs on failure, so the file exits non-zero if
-- any check fails; each passing check prints "PASS ...".
--
-- JWTs are simulated the way PostgREST does it: SET ROLE authenticated plus
-- request.jwt.claims = {"sub": ..., "role": "authenticated", "aal": "aal1|aal2"}.

CREATE FUNCTION pg_temp.act(p_uid uuid, p_aal text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  PERFORM set_config('role', 'authenticated', true);
END $$;

CREATE FUNCTION pg_temp.act_anon() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  PERFORM set_config('role', 'anon', true);
END $$;

CREATE FUNCTION pg_temp.act_service() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  PERFORM set_config('role', 'service_role', true);
END $$;

CREATE FUNCTION pg_temp.reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

CREATE FUNCTION pg_temp.expect(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL %', p_label;
  END IF;
  RAISE NOTICE 'PASS %', p_label;
END $$;

-- ---------------------------------------------------------------------------
-- 1. PHI reads by assurance level and role
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  doctor   constant uuid := '00000000-0000-0000-0000-00000000d0c1';
  nurse    constant uuid := '00000000-0000-0000-0000-00000000a115';
  admin    constant uuid := '00000000-0000-0000-0000-00000000ad01';
  docnurse constant uuid := '00000000-0000-0000-0000-00000000b0b0';
  outsider constant uuid := '00000000-0000-0000-0000-00000000e0e0';
  n int; v int; ok boolean;
BEGIN
  PERFORM pg_temp.act(doctor, 'aal1');
  SELECT count(*) INTO n FROM public.patients;
  SELECT count(*) INTO v FROM public.vital_signs;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 0 AND v = 0, format('aal1 doctor sees 0 patients and 0 vital_signs (got %s, %s)', n, v));

  PERFORM pg_temp.act(doctor, 'aal2');
  SELECT count(*) INTO n FROM public.patients;
  SELECT count(*) INTO v FROM public.vital_signs;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 3 AND v = 2, format('aal2 doctor sees 3 patients and 2 vital_signs (got %s, %s)', n, v));

  PERFORM pg_temp.act(nurse, 'aal1');
  SELECT count(*) INTO n FROM public.patients;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 3, format('aal1 nurse sees 3 patients (got %s)', n));

  PERFORM pg_temp.act(admin, 'aal1');
  SELECT count(*) INTO n FROM public.patients;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 0, format('aal1 admin sees 0 patients (got %s)', n));

  PERFORM pg_temp.act(admin, 'aal2');
  SELECT count(*) INTO n FROM public.patients;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 3, format('aal2 admin sees 3 patients (got %s)', n));

  PERFORM pg_temp.act(docnurse, 'aal1');
  SELECT count(*) INTO n FROM public.patients;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 0, format('aal1 doctor+nurse sees 0 patients (got %s)', n));

  PERFORM pg_temp.act(outsider, 'aal1');
  SELECT count(*), public.mfa_satisfied() INTO n, ok FROM public.patients;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 0 AND ok, format('aal1 user without hospital: 0 patients, mfa_satisfied() true (got %s, %s)', n, ok));

  PERFORM pg_temp.act(doctor, 'aal1');
  ok := public.mfa_satisfied();
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(ok = false, 'mfa_satisfied() is false for an aal1 doctor');

  PERFORM pg_temp.act(doctor, 'aal2');
  ok := public.mfa_satisfied();
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(ok = true, 'mfa_satisfied() is true for an aal2 doctor');
END
$$;

-- ---------------------------------------------------------------------------
-- 2. PHI writes (restrictive policy is FOR ALL)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  doctor constant uuid := '00000000-0000-0000-0000-00000000d0c1';
  hosp   constant uuid := '00000000-0000-0000-0000-0000000000a1';
  blocked boolean := false;
BEGIN
  BEGIN
    PERFORM pg_temp.act(doctor, 'aal1');
    INSERT INTO public.patients (hospital_id, note) VALUES (hosp, 'aal1 insert');
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(blocked, 'aal1 doctor INSERT into patients is rejected (42501)');

  PERFORM pg_temp.act(doctor, 'aal2');
  INSERT INTO public.patients (hospital_id, note) VALUES (hosp, 'aal2 insert');
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(true, 'aal2 doctor INSERT into patients succeeds');
  DELETE FROM public.patients WHERE note = 'aal2 insert';
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Profiles: privileged columns
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  doctor   constant uuid := '00000000-0000-0000-0000-00000000d0c1';
  outsider constant uuid := '00000000-0000-0000-0000-00000000e0e0';
  hosp     constant uuid := '00000000-0000-0000-0000-0000000000a1';
  c text;
  blocked boolean;
  n int;
BEGIN
  PERFORM pg_temp.act(doctor, 'aal1');
  UPDATE public.profiles SET first_name = 'Dana', phone = '+15550000' WHERE user_id = doctor;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 1, 'user can update own first_name/phone');

  FOREACH c IN ARRAY ARRAY['two_factor_enabled', 'two_factor_required', 'hospital_id', 'is_active',
                           'is_staff_true', 'role', 'two_factor_secret', 'failed_login_attempts',
                           'locked_until'] LOOP
    blocked := false;
    BEGIN
      PERFORM pg_temp.act(outsider, 'aal1');
      CASE c
        WHEN 'two_factor_enabled'    THEN UPDATE public.profiles SET two_factor_enabled = true WHERE user_id = outsider;
        WHEN 'two_factor_required'   THEN UPDATE public.profiles SET two_factor_required = true WHERE user_id = outsider;
        WHEN 'hospital_id'           THEN UPDATE public.profiles SET hospital_id = hosp WHERE user_id = outsider;
        WHEN 'is_active'             THEN UPDATE public.profiles SET is_active = false WHERE user_id = outsider;
        WHEN 'is_staff_true'         THEN UPDATE public.profiles SET is_staff = true WHERE user_id = outsider;
        WHEN 'role'                  THEN UPDATE public.profiles SET role = 'admin' WHERE user_id = outsider;
        WHEN 'two_factor_secret'     THEN UPDATE public.profiles SET two_factor_secret = 'x' WHERE user_id = outsider;
        WHEN 'failed_login_attempts' THEN UPDATE public.profiles SET failed_login_attempts = 3 WHERE user_id = outsider;
        WHEN 'locked_until'          THEN UPDATE public.profiles SET locked_until = now() WHERE user_id = outsider;
      END CASE;
    EXCEPTION WHEN insufficient_privilege THEN
      blocked := true;
    END;
    PERFORM pg_temp.reset();
    PERFORM pg_temp.expect(blocked, format('user cannot change profiles.%s (42501)', c));
  END LOOP;

  -- Downgrades are allowed.
  PERFORM pg_temp.act(doctor, 'aal1');
  UPDATE public.profiles SET is_staff = false, two_factor_enabled = false, two_factor_secret = NULL
   WHERE user_id = doctor;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 1, 'user can downgrade is_staff/two_factor_enabled/two_factor_secret');

  -- Sending unchanged privileged values is fine (clients that PATCH the whole row).
  PERFORM pg_temp.act(doctor, 'aal1');
  UPDATE public.profiles SET hospital_id = hosp, is_active = true WHERE user_id = doctor;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 1, 'unchanged privileged values pass');

  -- Server paths are not restricted.
  PERFORM pg_temp.act_service();
  UPDATE public.profiles SET hospital_id = hosp, is_staff = true, two_factor_enabled = true WHERE user_id = outsider;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 1, 'service_role can set hospital_id/is_staff/two_factor_enabled');
  UPDATE public.profiles SET hospital_id = NULL, is_staff = false, two_factor_enabled = false WHERE user_id = outsider;
  UPDATE public.profiles SET is_staff = true WHERE user_id = doctor;

  -- INSERT with privileged values is rejected; a plain insert works.
  INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-0000000000ee', 'new@example.test');
  blocked := false;
  BEGIN
    PERFORM pg_temp.act('00000000-0000-0000-0000-0000000000ee', 'aal1');
    INSERT INTO public.profiles (user_id, email, first_name, last_name, hospital_id)
    VALUES ('00000000-0000-0000-0000-0000000000ee', 'new@example.test', 'N', 'U', hosp);
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(blocked, 'user cannot INSERT a profile with hospital_id');

  PERFORM pg_temp.act('00000000-0000-0000-0000-0000000000ee', 'aal1');
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES ('00000000-0000-0000-0000-0000000000ee', 'new@example.test', 'N', 'U');
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(true, 'user can INSERT a plain profile');
END
$$;

-- ---------------------------------------------------------------------------
-- 4. Backup codes: no client access; atomic single use; lockout
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  doctor constant uuid := '00000000-0000-0000-0000-00000000d0c1';
  hashes text[];
  r jsonb;
  n int;
  blocked boolean;
  i int;
BEGIN
  SELECT array_agg(md5('code' || g) || md5('pad' || g) ORDER BY g) INTO hashes FROM generate_series(1, 10) g;

  FOREACH r IN ARRAY ARRAY['"select"', '"consume"', '"replace"', '"anon_select"']::jsonb[] LOOP
    blocked := false;
    BEGIN
      IF r = '"anon_select"' THEN PERFORM pg_temp.act_anon(); ELSE PERFORM pg_temp.act(doctor, 'aal2'); END IF;
      CASE r #>> '{}'
        WHEN 'select'      THEN PERFORM count(*) FROM public.mfa_backup_codes;
        WHEN 'anon_select' THEN PERFORM count(*) FROM public.mfa_backup_codes;
        WHEN 'consume'     THEN PERFORM public.consume_mfa_backup_code(doctor, hashes);
        WHEN 'replace'     THEN PERFORM public.replace_mfa_backup_codes(doctor, 'salt', 'p1', hashes);
      END CASE;
    EXCEPTION WHEN insufficient_privilege THEN
      blocked := true;
    END;
    PERFORM pg_temp.reset();
    PERFORM pg_temp.expect(blocked, format('client cannot %s backup codes (42501)', r #>> '{}'));
  END LOOP;

  PERFORM pg_temp.act_service();
  n := public.replace_mfa_backup_codes(doctor, 'c2FsdA==', 'p1', hashes);
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 10, format('service role stores 10 hashes (got %s)', n));

  PERFORM pg_temp.act(doctor, 'aal1');
  n := public.my_mfa_backup_codes_remaining();
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(n = 10, format('my_mfa_backup_codes_remaining() = 10 (got %s)', n));

  PERFORM pg_temp.act_service();
  r := public.consume_mfa_backup_code(doctor, ARRAY[hashes[3]]);
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(r ->> 'status' = 'ok' AND (r ->> 'remaining')::int = 9, format('valid code consumed: %s', r));

  PERFORM pg_temp.act_service();
  r := public.consume_mfa_backup_code(doctor, ARRAY[hashes[3]]);
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(r ->> 'status' = 'invalid', format('same code a second time is invalid: %s', r));

  FOR i IN 1..4 LOOP
    PERFORM pg_temp.act_service();
    r := public.consume_mfa_backup_code(doctor, ARRAY[md5('wrong' || i) || md5('x')]);
    PERFORM pg_temp.reset();
  END LOOP;
  PERFORM pg_temp.expect(r ->> 'status' = 'invalid', 'wrong codes are invalid');

  PERFORM pg_temp.act_service();
  r := public.consume_mfa_backup_code(doctor, ARRAY[hashes[4]]);
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(r ->> 'status' = 'locked' AND (r ->> 'retry_after_seconds')::int > 0,
                         format('after 5 failures even a valid code is locked out: %s', r));

  -- Regenerating replaces unused codes and keeps used ones as history.
  DELETE FROM public.mfa_backup_code_attempts WHERE user_id = doctor;
  PERFORM pg_temp.act_service();
  n := public.replace_mfa_backup_codes(doctor, 'bmV3', 'p1',
         (SELECT array_agg(md5('new' || g) || md5('pad' || g)) FROM generate_series(1, 10) g));
  PERFORM pg_temp.reset();
  SELECT count(*) FILTER (WHERE used_at IS NULL), count(*) FILTER (WHERE used_at IS NOT NULL)
    INTO n, i FROM public.mfa_backup_codes WHERE user_id = doctor;
  PERFORM pg_temp.expect(n = 10 AND i = 1, format('regenerate: 10 unused, 1 used kept (got %s, %s)', n, i));

  PERFORM pg_temp.act_service();
  r := public.consume_mfa_backup_code(doctor, ARRAY[hashes[5]]);
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(r ->> 'status' = 'invalid', 'codes from the replaced batch no longer work');

  blocked := false;
  BEGIN
    PERFORM pg_temp.act_service();
    PERFORM public.replace_mfa_backup_codes(doctor, 's', 'p1', ARRAY['not-hex']);
  EXCEPTION WHEN invalid_parameter_value THEN
    blocked := true;
  END;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.expect(blocked, 'replace_mfa_backup_codes rejects malformed input');
END
$$;

-- ---------------------------------------------------------------------------
-- 5. Catalog checks
-- ---------------------------------------------------------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
   WHERE schemaname = 'public' AND policyname = 'mfa_aal2_required' AND permissive = 'RESTRICTIVE';
  PERFORM pg_temp.expect(n = 7, format('7 restrictive mfa_aal2_required policies (got %s)', n));

  SELECT count(*) INTO n FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND table_name IN ('mfa_backup_codes', 'mfa_backup_code_attempts')
     AND grantee IN ('anon', 'authenticated', 'PUBLIC');
  PERFORM pg_temp.expect(n = 0, format('no table grants to anon/authenticated/PUBLIC on backup-code tables (got %s)', n));

  SELECT count(*) INTO n FROM pg_trigger
   WHERE tgrelid = 'public.profiles'::regclass AND tgname = 'profiles_guard_privileged_columns';
  PERFORM pg_temp.expect(n = 1, 'exactly one profiles guard trigger');
END
$$;
