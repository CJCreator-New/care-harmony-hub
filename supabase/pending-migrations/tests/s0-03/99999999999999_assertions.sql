-- Assertions for 20261105000003_lock_tenant_key.sql (S0-03).
-- NOT a migration. Runs after 00000000000000_fixture.sql, 20261105000002 and
-- 20261105000003 (applied twice). Every check RAISEs on failure, so the file
-- exits non-zero if any check fails; each passing check prints "PASS ...".
--
-- Callers are simulated the way PostgREST does it: SET ROLE authenticated (or
-- anon / service_role) plus request.jwt.claims.

-- Run p_sql as p_role (with sub = p_uid) and return 'OK:<rows>' or the SQLSTATE.
CREATE FUNCTION pg_temp.run_as(p_role text, p_uid uuid, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  n bigint;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'role', p_role, 'aal', 'aal1')::text, true);
    PERFORM set_config('role', p_role, true);
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN 'OK:' || n;
  EXCEPTION WHEN OTHERS THEN
    RETURN SQLSTATE;   -- the subtransaction rollback restores role and claims
  END;
END $$;

-- Run a single-value query as p_role and return the value as text (or ERR:<state>).
CREATE FUNCTION pg_temp.value_as(p_role text, p_uid uuid, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'role', p_role, 'aal', 'aal1')::text, true);
    PERFORM set_config('role', p_role, true);
    EXECUTE p_sql INTO v;
    PERFORM set_config('role', 'postgres', true);
    PERFORM set_config('request.jwt.claims', '', true);
    RETURN v;
  EXCEPTION WHEN OTHERS THEN
    RETURN 'ERR:' || SQLSTATE;
  END;
END $$;

CREATE FUNCTION pg_temp.expect(p_ok boolean, p_label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL %', p_label;
  END IF;
  RAISE NOTICE 'PASS %', p_label;
END $$;

-- ---------------------------------------------------------------------------
-- 1. Secrets moved out of profiles (DB-22, SECF-11)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  nurse constant uuid := '00000000-0000-0000-0000-00000000a115';
  admin constant uuid := '00000000-0000-0000-0000-00000000ad01';
  r text;
BEGIN
  PERFORM pg_temp.expect(NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'profiles'
         AND column_name IN ('security_answer', 'security_question', 'two_factor_secret', 'backup_codes')),
    'profiles has no security_answer/security_question/two_factor_secret/backup_codes columns');

  PERFORM pg_temp.expect(
    (SELECT count(*) FROM public.profile_security_answers) = 2
    AND (SELECT answer_hash = extensions.crypt('rex', answer_hash) FROM public.profile_security_answers WHERE user_id = admin)
    AND (SELECT answer_hash = extensions.crypt('springfield', answer_hash) FROM public.profile_security_answers WHERE user_id = nurse)
    AND NOT EXISTS (SELECT 1 FROM public.profile_security_answers WHERE answer_hash ILIKE '%rex%' OR answer_hash ILIKE '%springfield%'),
    'legacy answers kept only as bcrypt(lower(btrim(answer))) hashes');

  PERFORM pg_temp.expect(
    (SELECT two_factor_secret = 'JBSWY3DPEHPK3PXP' AND backup_codes = ARRAY['h1', 'h2']
       FROM public.profiles_legacy_2fa_archive WHERE user_id = admin)
    AND (SELECT count(*) FROM public.profiles_legacy_2fa_archive) = 1,
    'legacy 2FA artefacts archived for the one user that had them');

  -- A same-hospital colleague reads profiles (allowed) but no secrets.
  r := pg_temp.value_as('authenticated', nurse, $q$SELECT count(*)::text FROM public.profiles$q$);
  PERFORM pg_temp.expect(r = '2', format('nurse still reads the 2 profiles of hospital A (got %s)', r));
  r := pg_temp.value_as('authenticated', nurse, $q$SELECT security_answer FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-00000000ad01'$q$);
  PERFORM pg_temp.expect(r = 'ERR:42703', format('select security_answer from profiles fails (got %s)', r));
  r := pg_temp.value_as('authenticated', nurse, $q$SELECT answer_hash FROM public.profile_security_answers LIMIT 1$q$);
  PERFORM pg_temp.expect(r = 'ERR:42501', format('authenticated cannot read profile_security_answers (got %s)', r));
  r := pg_temp.value_as('authenticated', admin, $q$SELECT two_factor_secret FROM public.profiles_legacy_2fa_archive LIMIT 1$q$);
  PERFORM pg_temp.expect(r = 'ERR:42501', format('authenticated cannot read profiles_legacy_2fa_archive (got %s)', r));
  r := pg_temp.value_as('anon', NULL, $q$SELECT count(*)::text FROM public.profile_security_answers$q$);
  PERFORM pg_temp.expect(r = 'ERR:42501', format('anon cannot read profile_security_answers (got %s)', r));
  r := pg_temp.value_as('authenticated', nurse, $q$SELECT count(*)::text FROM (SELECT * FROM public.profiles) s$q$);
  PERFORM pg_temp.expect(r = '2', format('select * on profiles still works for clients (got %s)', r));
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Tenant key, activation and role columns are not client-writable (DB-01)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  nurse    constant uuid := '00000000-0000-0000-0000-00000000a115';
  outsider constant uuid := '00000000-0000-0000-0000-00000000e0e0';
  r text;
BEGIN
  r := pg_temp.run_as('authenticated', outsider,
    $q$UPDATE public.profiles SET hospital_id = '00000000-0000-0000-0000-0000000000a1' WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('user without tenant cannot set own hospital_id (got %s)', r));

  r := pg_temp.run_as('authenticated', nurse,
    $q$UPDATE public.profiles SET hospital_id = '00000000-0000-0000-0000-0000000000b1' WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('staff of A cannot switch own hospital_id to B (got %s)', r));

  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET is_active = true WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = 'OK:1', format('writing an unchanged is_active is a no-op that succeeds (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET is_active = false WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('user cannot change own is_active (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET role = 'admin' WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('user cannot change own profiles.role (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET two_factor_required = true WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('user cannot change own two_factor_required (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET locked_until = NULL, failed_login_attempts = 5 WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('user cannot change own lockout columns (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET clearance_level = 'top' WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('user cannot change own clearance_level (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET first_name = 'Nina', phone = '555' WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = 'OK:1', format('user can still edit own name and phone (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse, $q$UPDATE public.profiles SET first_name = 'X' WHERE user_id = '00000000-0000-0000-0000-00000000ad01'$q$);
  PERFORM pg_temp.expect(r = 'OK:0', format('user cannot edit a colleague''s profile (got %s)', r));

  r := pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000f2',
    $q$INSERT INTO public.profiles (user_id, email, first_name, last_name, hospital_id)
       VALUES (auth.uid(), 'noprofile@example.test', 'N', 'P', '00000000-0000-0000-0000-0000000000a1')$q$);
  PERFORM pg_temp.expect(r = '42501', format('first profile INSERT cannot pick a hospital (got %s)', r));
  r := pg_temp.run_as('authenticated', '00000000-0000-0000-0000-0000000000f2',
    $q$INSERT INTO public.profiles (user_id, email, first_name, last_name) VALUES ('00000000-0000-0000-0000-0000000000c1', 'x@example.test', 'N', 'P')$q$);
  PERFORM pg_temp.expect(r = '42501', format('profile INSERT for another user is rejected by RLS (got %s)', r));

  -- The tenant key holds, so hospital A's patients stay invisible to the outsider.
  r := pg_temp.value_as('authenticated', outsider, $q$SELECT count(*)::text FROM public.patients$q$);
  PERFORM pg_temp.expect(r = '0', format('outsider sees 0 patients (got %s)', r));
  PERFORM pg_temp.expect(NOT public.user_belongs_to_hospital(outsider, '00000000-0000-0000-0000-0000000000a1'),
    'outsider is not a member of hospital A');
END
$$;

-- ---------------------------------------------------------------------------
-- 3. No client-side role self-assignment; invitations admin-only (SECF-09)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  admin    constant uuid := '00000000-0000-0000-0000-00000000ad01';
  nurse    constant uuid := '00000000-0000-0000-0000-00000000a115';
  outsider constant uuid := '00000000-0000-0000-0000-00000000e0e0';
  r text;
BEGIN
  INSERT INTO public.hospitals (id, name) VALUES ('00000000-0000-0000-0000-0000000000c0', 'Orphan Hospital')
  ON CONFLICT (id) DO NOTHING;

  r := pg_temp.run_as('authenticated', outsider,
    $q$INSERT INTO public.user_roles (user_id, role, hospital_id) VALUES (auth.uid(), 'admin', '00000000-0000-0000-0000-0000000000c0')$q$);
  PERFORM pg_temp.expect(r = '42501', format('user cannot self-assign admin of a hospital with no roles (got %s)', r));
  r := pg_temp.run_as('authenticated', outsider,
    $q$INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'doctor')$q$);
  PERFORM pg_temp.expect(r = '42501', format('user cannot self-assign any role (got %s)', r));
  r := pg_temp.run_as('authenticated', nurse,
    $q$UPDATE public.user_roles SET role = 'admin' WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r IN ('OK:0', '42501'), format('nurse cannot promote own role (got %s)', r));
  PERFORM pg_temp.expect(NOT public.has_role(nurse, 'admin'), 'nurse is still not admin');
  r := pg_temp.value_as('authenticated', nurse, $q$SELECT string_agg(role::text, ',') FROM public.user_roles WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = 'nurse', format('user still reads own roles (got %s)', r));
  r := pg_temp.run_as('authenticated', admin,
    $q$INSERT INTO public.user_roles (user_id, role, hospital_id) VALUES ('00000000-0000-0000-0000-00000000a115', 'receptionist', '00000000-0000-0000-0000-0000000000a1')$q$);
  PERFORM pg_temp.expect(r = 'OK:1', format('admin of A can still grant roles in A (got %s)', r));

  r := pg_temp.run_as('authenticated', nurse,
    $q$INSERT INTO public.staff_invitations (hospital_id, email, role, invited_by)
       VALUES ('00000000-0000-0000-0000-0000000000a1', 'evil@example.test', 'admin', auth.uid())$q$);
  PERFORM pg_temp.expect(r = '42501', format('nurse cannot create an invitation (got %s)', r));
  r := pg_temp.value_as('authenticated', nurse, $q$SELECT count(*)::text FROM public.staff_invitations$q$);
  PERFORM pg_temp.expect(r = '0', format('nurse cannot read invitation tokens (got %s)', r));
  r := pg_temp.run_as('authenticated', admin,
    $q$INSERT INTO public.staff_invitations (hospital_id, email, role, invited_by)
       VALUES ('00000000-0000-0000-0000-0000000000a1', 'pharm@example.test', 'pharmacist', auth.uid())$q$);
  PERFORM pg_temp.expect(r = 'OK:1', format('admin of A can create an invitation for A (got %s)', r));
  r := pg_temp.run_as('authenticated', admin,
    $q$INSERT INTO public.staff_invitations (hospital_id, email, role, invited_by)
       VALUES ('00000000-0000-0000-0000-0000000000b1', 'x@example.test', 'admin', auth.uid())$q$);
  PERFORM pg_temp.expect(r = '42501', format('admin of A cannot create an invitation for B (got %s)', r));
END
$$;

-- ---------------------------------------------------------------------------
-- 4. Onboarding RPCs are not callable by clients; unsafe ones are gone
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  outsider constant uuid := '00000000-0000-0000-0000-00000000e0e0';
  r text;
BEGIN
  PERFORM pg_temp.expect(to_regprocedure('public.ensure_patient_record_for_user(uuid,text,text,text,text,date,text,text,text,text,text,text,text[],text[],text,text,text)') IS NULL,
    'ensure_patient_record_for_user (oldest-hospital fallback) is dropped');
  PERFORM pg_temp.expect((SELECT count(*) FROM pg_proc WHERE proname = 'register_patient' AND pronamespace = 'public'::regnamespace) = 1,
    'only the new register_patient overload exists');

  FOREACH r IN ARRAY ARRAY[
    $q$SELECT public.register_patient('00000000-0000-0000-0000-00000000e0e0', 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'outsider@example.test')$q$,
    $q$SELECT public.verify_patient_claim('k', 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'ada@example.test')$q$,
    $q$SELECT public.create_hospital_with_admin('00000000-0000-0000-0000-00000000e0e0', 'Mine', NULL, NULL, NULL, NULL, NULL, NULL, NULL)$q$,
    $q$SELECT public.accept_staff_invitation('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000e0e0', 'O', 'O', 'new.nurse@example.test')$q$,
    $q$SELECT public.assign_patient_role('00000000-0000-0000-0000-00000000e0e0')$q$,
    $q$SELECT * FROM public.patient_claim_candidates('LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'ada@example.test')$q$]
  LOOP
    PERFORM pg_temp.expect(pg_temp.run_as('authenticated', outsider, r) = '42501',
      format('authenticated cannot execute: %s', left(r, 60)));
    PERFORM pg_temp.expect(pg_temp.run_as('anon', NULL, r) = '42501',
      format('anon cannot execute: %s', left(r, 60)));
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 5. Patient self-registration (verify_patient_claim + register_patient)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  ada     constant uuid := '00000000-0000-0000-0000-0000000000c1';
  mallory constant uuid := '00000000-0000-0000-0000-0000000000c2';
  v jsonb;
  r text;
  i int;
BEGIN
  PERFORM set_config('role', 'service_role', true);

  v := public.verify_patient_claim('client-1', 'lic-a', 'mrn 00000001', '1980-01-02', 'LOVELACE', 'ada@example.test');
  PERFORM pg_temp.expect(v ->> 'status' = 'ok', format('matching claim verifies, codes/case/spaces normalised (got %s)', v));
  v := public.verify_patient_claim('client-1', 'LIC-A', 'MRN00000001', '1980-01-03', 'Lovelace', 'ada@example.test');
  PERFORM pg_temp.expect(v ->> 'status' = 'invalid', format('wrong date of birth is invalid (got %s)', v));
  v := public.verify_patient_claim('client-1', 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'mallory@example.test');
  PERFORM pg_temp.expect(v ->> 'status' = 'invalid', format('email other than the record''s is invalid (got %s)', v));
  v := public.verify_patient_claim('client-1', 'LIC-A', 'MRN00000002', '1990-05-06', 'Email', 'no@example.test');
  PERFORM pg_temp.expect(v ->> 'status' = 'invalid', format('record without an email cannot be claimed (got %s)', v));
  v := public.verify_patient_claim('client-1', 'LIC-B', 'MRN00000001', '1980-01-02', 'Lovelace', 'ada@example.test');
  PERFORM pg_temp.expect(v ->> 'status' = 'invalid', format('hospital code decides the tenant: same MRN at B does not match (got %s)', v));

  -- Five failures on one record lock that record for everyone.
  FOR i IN 1..5 LOOP
    v := public.verify_patient_claim('client-' || (10 + i), 'LIC-A', 'MRN00000003', ('1970-07-0' || i::text)::date, 'Target', 'lock@example.test');
  END LOOP;
  v := public.verify_patient_claim('client-99', 'LIC-A', 'MRN00000003', '1970-07-07', 'Target', 'lock@example.test');
  PERFORM pg_temp.expect(v ->> 'status' = 'locked' AND (v ->> 'retry_after_seconds')::int > 0,
    format('5 failures on one record lock it, even with the right answer (got %s)', v));
  -- Ten failures from one client lock that client.
  FOR i IN 1..10 LOOP
    v := public.verify_patient_claim('client-bad', 'LIC-A', 'MRN9' || i::text, '2000-01-01', 'X', 'x@example.test');
  END LOOP;
  v := public.verify_patient_claim('client-bad', 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'ada@example.test');
  PERFORM pg_temp.expect(v ->> 'status' = 'locked', format('10 failures from one client lock that client (got %s)', v));

  -- register_patient re-verifies and links atomically.
  BEGIN
    PERFORM public.register_patient(mallory, 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'ada@example.test');
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM pg_temp.expect(r = '42501', format('register_patient refuses an account whose email differs from the claim (got %s)', r));

  v := public.register_patient(ada, 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'ADA@example.test');
  PERFORM pg_temp.expect(v ->> 'hospital_id' = '00000000-0000-0000-0000-0000000000a1'
      AND v ->> 'patient_id' = '00000000-0000-0000-0000-0000000001a1',
    format('register_patient links the record of hospital A (got %s)', v));
  PERFORM set_config('role', 'postgres', true);
END
$$;

DO $$
DECLARE
  ada     constant uuid := '00000000-0000-0000-0000-0000000000c1';
  mallory constant uuid := '00000000-0000-0000-0000-0000000000c2';
  r text;
BEGIN
  PERFORM pg_temp.expect(
    (SELECT user_id FROM public.patients WHERE id = '00000000-0000-0000-0000-0000000001a1') = ada
    AND (SELECT hospital_id = '00000000-0000-0000-0000-0000000000a1' AND NOT coalesce(is_staff, false)
           FROM public.profiles WHERE user_id = ada)
    AND (SELECT array_agg(role::text || '@' || hospital_id::text) FROM public.user_roles WHERE user_id = ada)
        = ARRAY['patient@00000000-0000-0000-0000-0000000000a1'],
    'claim sets patients.user_id, profile tenant from the record (is_staff false) and the patient role');

  BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM public.register_patient(ada, 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'ada@example.test');
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM pg_temp.expect(r = '42501', format('a registered account cannot register again (got %s)', r));

  UPDATE auth.users SET email = 'ada@example.test' WHERE id = mallory;  -- pretend Mallory owns the same email
  BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM public.register_patient(mallory, 'LIC-A', 'MRN00000001', '1980-01-02', 'Lovelace', 'ada@example.test');
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM set_config('role', 'postgres', true);
  UPDATE auth.users SET email = 'mallory@example.test' WHERE id = mallory;
  PERFORM pg_temp.expect(r = 'P0002', format('an already claimed record cannot be claimed again (got %s)', r));

  -- The new patient reads their own record, cannot move tenant.
  r := pg_temp.value_as('authenticated', ada, $q$SELECT mrn FROM public.patients WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = 'MRN00000001', format('registered patient reads own record (got %s)', r));
  r := pg_temp.run_as('authenticated', ada,
    $q$UPDATE public.profiles SET hospital_id = '00000000-0000-0000-0000-0000000000b1' WHERE user_id = auth.uid()$q$);
  PERFORM pg_temp.expect(r = '42501', format('registered patient cannot switch tenant (got %s)', r));
END
$$;

-- ---------------------------------------------------------------------------
-- 6. create_hospital_with_admin
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  founder   constant uuid := '00000000-0000-0000-0000-0000000000f1';
  noprofile constant uuid := '00000000-0000-0000-0000-0000000000f2';
  nurse     constant uuid := '00000000-0000-0000-0000-00000000a115';
  h uuid;
  r text;
BEGIN
  PERFORM set_config('role', 'service_role', true);
  h := public.create_hospital_with_admin(founder, 'Founder Hospital', NULL, NULL, NULL, NULL, NULL, NULL, 'LIC-F');
  PERFORM set_config('role', 'postgres', true);
  PERFORM pg_temp.expect(
    (SELECT hospital_id FROM public.profiles WHERE user_id = founder) = h
    AND public.has_role(founder, 'admin')
    AND (SELECT hospital_id FROM public.user_roles WHERE user_id = founder AND role = 'admin') = h
    AND (SELECT license_number FROM public.hospitals WHERE id = h) = 'LIC-F',
    'new account gets a new hospital, its tenant key and the admin role');

  BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM public.create_hospital_with_admin(founder, 'Second', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM pg_temp.expect(r = '42501', format('an account with a hospital cannot create (move to) another (got %s)', r));

  BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM public.create_hospital_with_admin(nurse, 'Nurse Hospital', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM pg_temp.expect(r = '42501', format('existing staff cannot spawn a hospital and become its admin (got %s)', r));

  BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM public.create_hospital_with_admin(noprofile, 'Dup', NULL, NULL, NULL, NULL, NULL, NULL, 'LIC-A');
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM pg_temp.expect(r = '23505', format('a duplicate license number is rejected (got %s)', r));

  PERFORM set_config('role', 'service_role', true);
  h := public.create_hospital_with_admin(noprofile, 'Nora Hospital', NULL, NULL, NULL, NULL, NULL, NULL, NULL);
  PERFORM set_config('role', 'postgres', true);
  PERFORM pg_temp.expect(
    (SELECT first_name = 'Nora' AND last_name = 'Account' AND email = 'noprofile@example.test' AND hospital_id = h
       FROM public.profiles WHERE user_id = noprofile),
    'an account without a profile row gets one (from auth.users) with the new tenant');
END
$$;

-- ---------------------------------------------------------------------------
-- 7. accept_staff_invitation
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  invitee constant uuid := '00000000-0000-0000-0000-0000000000d1';
  outsider constant uuid := '00000000-0000-0000-0000-00000000e0e0';
  v jsonb;
  r text;
BEGIN
  BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM public.accept_staff_invitation('11111111-1111-1111-1111-111111111111', outsider, 'O', 'O', 'new.nurse@example.test');
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM pg_temp.expect(r = '42501', format('an invitation cannot be accepted by an account with another email (got %s)', r));

  PERFORM set_config('role', 'service_role', true);
  v := public.accept_staff_invitation('11111111-1111-1111-1111-111111111111', invitee, 'Nell', 'New', 'New.Nurse@example.test');
  PERFORM set_config('role', 'postgres', true);
  PERFORM pg_temp.expect(v ->> 'role' = 'nurse'
    AND (SELECT hospital_id FROM public.profiles WHERE user_id = invitee) = '00000000-0000-0000-0000-0000000000a1'
    AND public.has_role(invitee, 'nurse')
    AND (SELECT status::text FROM public.staff_invitations WHERE id = '00000000-0000-0000-0000-00000000aaa1') = 'accepted',
    format('invitation sets tenant and role from the invitation row (got %s)', v));

  BEGIN
    PERFORM set_config('role', 'service_role', true);
    PERFORM public.accept_staff_invitation('11111111-1111-1111-1111-111111111111', invitee, 'Nell', 'New', 'new.nurse@example.test');
    r := 'OK';
  EXCEPTION WHEN OTHERS THEN r := SQLSTATE; END;
  PERFORM pg_temp.expect(r = 'P0002', format('an accepted invitation cannot be reused (got %s)', r));
  PERFORM set_config('role', 'postgres', true);
END
$$;

-- ---------------------------------------------------------------------------
-- 8. Policies and grants as expected after two applications
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  PERFORM pg_temp.expect(NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'
         AND policyname IN ('Users can insert their own initial role',
                            'Users can insert initial admin role for new hospital',
                            'User roles hospital scoped')),
    'user_roles self-assignment policies are gone');
  PERFORM pg_temp.expect(NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_invitations'
         AND policyname = 'Staff invitations hospital scoped'),
    'permissive staff_invitations policy is gone');
  PERFORM pg_temp.expect(
    (SELECT with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
        AND policyname = 'profiles_update_own') IS NOT NULL,
    'profiles UPDATE policy has an explicit WITH CHECK');
  PERFORM pg_temp.expect(
    (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass
        AND tgname IN ('profiles_guard_privileged_columns', 'profiles_guard_abac_columns') AND NOT tgisinternal) = 2,
    'S0-10 guard and the ABAC companion guard are both installed once');
END
$$;
