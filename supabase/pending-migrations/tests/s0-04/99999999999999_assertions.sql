-- Assertions for 20261105000004_role_aware_rls.sql (S0-04).
-- NOT a migration. Runs after 00000000000000_fixture.sql, the S0-10 migration
-- 20261105000002 and this migration (applied twice). Every check is recorded;
-- the file prints a principal x table matrix and the write checks as NOTICEs,
-- then RAISEs if anything failed, so it exits non-zero on any failure.
--
-- JWTs are simulated the way PostgREST does it: SET ROLE authenticated plus
-- request.jwt.claims = {"sub": ..., "role": "authenticated", "aal": ...}. All
-- principals use aal2 so the S0-10 restrictive policy is neutral, except the
-- one check that asserts the S0-10 interplay.

CREATE TEMP TABLE s004_results (kind text, label text, principal text, expected text, actual text, ok boolean);
GRANT ALL ON s004_results TO PUBLIC;

CREATE FUNCTION pg_temp.act(p_uid uuid, p_aal text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    PERFORM set_config('role', 'anon', true);
  ELSE
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
    PERFORM set_config('role', 'authenticated', true);
  END IF;
END $$;

CREATE FUNCTION pg_temp.reset() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', 'postgres', true);
  PERFORM set_config('request.jwt.claims', '', true);
END $$;

-- Principals, in matrix column order.
CREATE TEMP TABLE s004_principals (ord int, name text, uid uuid);
INSERT INTO s004_principals VALUES
  (1, 'admin',       'a0000000-0000-0000-0000-000000000001'),
  (2, 'doctor',      'a0000000-0000-0000-0000-000000000002'),
  (3, 'nurse',       'a0000000-0000-0000-0000-000000000003'),
  (4, 'pharmacist',  'a0000000-0000-0000-0000-000000000004'),
  (5, 'lab_tech',    'a0000000-0000-0000-0000-000000000005'),
  (6, 'reception',   'a0000000-0000-0000-0000-000000000006'),
  (7, 'patient',     'a0000000-0000-0000-0000-000000000007'),
  (8, 'inactive',    'a0000000-0000-0000-0000-000000000008'),
  (9, 'deactivated', 'a0000000-0000-0000-0000-000000000009'),
  (10, 'other_hosp', 'a0000000-0000-0000-0000-00000000000a'),
  (11, 'anon',       NULL);

-- Row count a principal sees; -1 when the query errors.
CREATE FUNCTION pg_temp.count_as(p_uid uuid, p_aal text, p_table text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM pg_temp.act(p_uid, p_aal);
    EXECUTE format('SELECT count(*) FROM public.%I', p_table) INTO n;
  EXCEPTION WHEN OTHERS THEN
    n := -1;
  END;
  PERFORM pg_temp.reset();
  RETURN n;
END $$;

-- Run a write as a principal and always roll it back. 'ok:<rows>' or 'err:<sqlstate>'.
CREATE FUNCTION pg_temp.try_as(p_uid uuid, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint; res text;
BEGIN
  BEGIN
    PERFORM pg_temp.act(p_uid, 'aal2');
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    res := 'ok:' || n;
    RAISE EXCEPTION 's004_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 's004_rollback' THEN res := 'err:' || SQLSTATE; END IF;
  END;
  PERFORM pg_temp.reset();
  RETURN res;
END $$;

CREATE FUNCTION pg_temp.check(p_kind text, p_label text, p_principal text, p_expected text, p_actual text)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO s004_results VALUES (p_kind, p_label, p_principal, p_expected, p_actual, p_expected = p_actual)
$$;

-- ---------------------------------------------------------------------------
-- 1. Read matrix. Columns: admin doctor nurse pharmacist lab_tech reception
--    patient inactive deactivated other_hosp anon. H1 holds 2 rows per table
--    (P1 = the portal patient's, P2), H2 holds 1 row (other_hosp's hospital).
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE s004_expect (ord serial, tbl text, counts text);
INSERT INTO s004_expect (tbl, counts) VALUES
  ('patients',                    '2 2 2 2 2 2 1 0 0 1 0'),
  ('appointments',                '2 2 2 0 0 2 1 0 0 1 0'),
  ('appointment_requests',        '2 2 2 0 0 2 1 0 0 1 0'),
  ('consultations',               '2 2 2 2 2 0 0 0 0 1 0'),
  ('prescriptions',               '2 2 2 2 0 0 1 0 0 1 0'),
  ('prescription_items',          '2 2 2 2 0 0 1 0 0 1 0'),
  ('lab_orders',                  '2 2 2 0 2 0 1 0 0 1 0'),
  ('medical_records',             '2 2 2 0 0 0 1 0 0 1 0'),
  ('vital_signs',                 '2 2 2 0 0 0 1 0 0 1 0'),
  ('documents',                   '2 2 2 0 0 0 1 0 0 1 0'),
  ('patient_consents',            '2 2 2 0 0 2 1 0 0 1 0'),
  ('patient_prep_checklists',     '2 2 2 0 0 0 0 0 0 1 0'),
  ('patient_queue',               '2 2 2 2 2 2 1 0 0 1 0'),
  ('medication_administrations',  '2 2 2 2 0 0 0 0 0 1 0'),
  ('invoices',                    '2 0 0 0 0 2 1 0 0 0 0'),
  ('invoice_items',               '2 0 0 0 0 2 1 0 0 0 0'),
  ('payments',                    '2 0 0 0 0 2 1 0 0 0 0'),
  ('payment_plans',               '2 0 0 0 0 2 1 0 0 0 0'),
  ('insurance_claims',            '2 0 0 0 0 2 1 0 0 0 0'),
  ('messages',                    '1 1 1 1 0 1 1 0 0 1 0'),
  ('notifications',               '1 1 1 1 1 1 1 0 0 1 0'),
  ('task_assignments',            '2 2 2 0 1 0 0 0 0 1 0'),
  ('telemedicine_sessions',       '2 2 2 0 0 0 1 0 0 1 0'),
  ('shift_handovers',             '2 2 2 0 0 0 0 0 0 1 0'),
  ('shift_schedules',             '2 2 2 2 2 2 0 0 0 1 0'),
  ('doctor_availability',         '2 2 2 2 2 2 2 0 0 1 0'),
  ('time_slots',                  '2 2 2 2 2 2 2 0 0 1 0'),
  ('departments',                 '2 2 2 2 2 2 2 0 0 1 0'),
  ('hospital_resources',          '2 2 2 2 2 2 0 0 0 1 0'),
  ('medications',                 '2 2 2 2 0 0 0 0 0 1 0'),
  ('suppliers',                   '2 0 0 2 0 0 0 0 0 0 0'),
  ('purchase_orders',             '2 0 0 2 0 0 0 0 0 0 0'),
  ('purchase_order_items',        '2 0 0 2 0 0 0 0 0 0 0'),
  ('reorder_rules',               '2 0 0 2 0 0 0 0 0 0 0'),
  ('stock_alerts',                '2 0 0 2 0 0 0 0 0 0 0'),
  ('prescription_refill_requests','2 2 2 2 0 0 1 0 0 1 0'),
  ('system_config',               '3 2 2 2 2 2 1 0 0 2 0'),
  ('icd10_codes',                 '3 3 3 3 3 3 3 0 0 3 0'),
  ('lab_queue',                   '2 2 2 0 2 0 0 0 0 1 0'),
  ('hospitals',                   '1 1 1 1 1 1 1 0 0 1 0'),
  ('mar_administrations',         '2 2 2 0 0 0 1 0 0 1 0'),
  ('drug_interactions',           '2 2 2 2 2 2 2 0 0 2 0'),
  ('unknown_open_table',          '0 0 0 0 0 0 0 0 0 0 0'),
  ('care_gaps',                   '2 2 2 2 2 2 1 0 0 1 0'),
  ('activity_logs',               '2 2 2 2 2 2 1 0 0 1 0'),
  ('lab_equipment_errors',        '2 0 0 0 2 0 0 0 0 0 0');

DO $$
DECLARE e record; p record; v_exp text[]; v_n int;
BEGIN
  FOR e IN SELECT * FROM s004_expect ORDER BY ord LOOP
    v_exp := string_to_array(e.counts, ' ');
    FOR p IN SELECT * FROM s004_principals ORDER BY ord LOOP
      v_n := pg_temp.count_as(p.uid, 'aal2', e.tbl);
      PERFORM pg_temp.check('read', e.tbl, p.name, v_exp[p.ord], v_n::text);
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Writes (each rolled back). H1 = 1000..01, H2 = 1000..02.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  admin  constant uuid := 'a0000000-0000-0000-0000-000000000001';
  doctor constant uuid := 'a0000000-0000-0000-0000-000000000002';
  nurse  constant uuid := 'a0000000-0000-0000-0000-000000000003';
  pharm  constant uuid := 'a0000000-0000-0000-0000-000000000004';
  lab    constant uuid := 'a0000000-0000-0000-0000-000000000005';
  recep  constant uuid := 'a0000000-0000-0000-0000-000000000006';
  pat    constant uuid := 'a0000000-0000-0000-0000-000000000007';
  inact  constant uuid := 'a0000000-0000-0000-0000-000000000008';
  deact  constant uuid := 'a0000000-0000-0000-0000-000000000009';
  h2doc  constant uuid := 'a0000000-0000-0000-0000-00000000000a';
  h1 constant text := '''10000000-0000-0000-0000-000000000001''';
  h2 constant text := '''10000000-0000-0000-0000-000000000002''';
  p1 constant text := '''c0000000-0000-0000-0000-000000000001''';
  p2 constant text := '''c0000000-0000-0000-0000-000000000002''';
  rx_h2 text;
  rx_h1 text;
  inv_h1 text;
BEGIN
  SELECT quote_literal(id) INTO rx_h2 FROM public.prescriptions WHERE hospital_id = '10000000-0000-0000-0000-000000000002' LIMIT 1;
  SELECT quote_literal(id) INTO rx_h1 FROM public.prescriptions WHERE patient_id = 'c0000000-0000-0000-0000-000000000002' LIMIT 1;
  SELECT quote_literal(id) INTO inv_h1 FROM public.invoices WHERE patient_id = 'c0000000-0000-0000-0000-000000000002' LIMIT 1;

  -- DB-07 billing boundary
  PERFORM pg_temp.check('write', 'invoices INSERT H1', 'doctor', 'err:42501',
    pg_temp.try_as(doctor, format('INSERT INTO public.invoices (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'invoices INSERT H1', 'nurse', 'err:42501',
    pg_temp.try_as(nurse, format('INSERT INTO public.invoices (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'invoices INSERT H1', 'reception', 'ok:1',
    pg_temp.try_as(recep, format('INSERT INTO public.invoices (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'invoices INSERT H2 (other tenant)', 'reception', 'err:42501',
    pg_temp.try_as(recep, format('INSERT INTO public.invoices (hospital_id) VALUES (%s)', h2)));
  PERFORM pg_temp.check('write', 'invoices UPDATE', 'doctor', 'ok:0',
    pg_temp.try_as(doctor, 'UPDATE public.invoices SET notes = ''x'''));
  PERFORM pg_temp.check('write', 'payments INSERT for H1 invoice', 'reception', 'ok:1',
    pg_temp.try_as(recep, format('INSERT INTO public.payments (hospital_id, invoice_id, amount) VALUES (%s, %s, 5)', h1, inv_h1)));
  PERFORM pg_temp.check('write', 'payments INSERT, hospital_id != invoice hospital', 'reception', 'err:42501',
    pg_temp.try_as(recep, format('INSERT INTO public.payments (hospital_id, invoice_id, amount) VALUES (%s, %s, 5)', h2, inv_h1)));
  PERFORM pg_temp.check('write', 'payments INSERT', 'pharmacist', 'err:42501',
    pg_temp.try_as(pharm, format('INSERT INTO public.payments (hospital_id, invoice_id, amount) VALUES (%s, %s, 5)', h1, inv_h1)));
  PERFORM pg_temp.check('write', 'payments UPDATE (append-only)', 'reception', 'ok:0',
    pg_temp.try_as(recep, 'UPDATE public.payments SET amount = 0'));
  PERFORM pg_temp.check('write', 'payments DELETE (append-only)', 'admin', 'ok:0',
    pg_temp.try_as(admin, 'DELETE FROM public.payments'));

  -- DB-09 prescription items and prescriptions (ADR-0004)
  PERFORM pg_temp.check('write', 'prescription_items UPDATE', 'nurse', 'ok:0',
    pg_temp.try_as(nurse, 'UPDATE public.prescription_items SET dosage = ''x'''));
  PERFORM pg_temp.check('write', 'prescription_items UPDATE', 'reception', 'ok:0',
    pg_temp.try_as(recep, 'UPDATE public.prescription_items SET dosage = ''x'''));
  PERFORM pg_temp.check('write', 'prescription_items UPDATE (H1 rows)', 'pharmacist', 'ok:2',
    pg_temp.try_as(pharm, 'UPDATE public.prescription_items SET dosage = ''x'''));
  PERFORM pg_temp.check('write', 'prescription_items DELETE', 'doctor', 'ok:0',
    pg_temp.try_as(doctor, 'DELETE FROM public.prescription_items'));
  PERFORM pg_temp.check('write', 'prescription_items INSERT into H2 prescription', 'doctor', 'err:42501',
    pg_temp.try_as(doctor, format('INSERT INTO public.prescription_items (prescription_id, hospital_id, medication_name) VALUES (%s, %s, ''x'')', rx_h2, h1)));
  PERFORM pg_temp.check('write', 'prescription_items INSERT stamped H2, hospital taken from parent', 'doctor', 'ok:1',
    pg_temp.try_as(doctor, format('WITH ins AS (INSERT INTO public.prescription_items (prescription_id, hospital_id, medication_name) VALUES (%s, %s, ''x'') RETURNING hospital_id) SELECT 1 FROM ins WHERE hospital_id = %s', rx_h1, h2, h1)));
  PERFORM pg_temp.check('write', 'prescriptions INSERT', 'pharmacist', 'err:42501',
    pg_temp.try_as(pharm, format('INSERT INTO public.prescriptions (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'prescriptions INSERT', 'doctor', 'ok:1',
    pg_temp.try_as(doctor, format('INSERT INTO public.prescriptions (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'prescriptions UPDATE (H1 rows)', 'pharmacist', 'ok:2',
    pg_temp.try_as(pharm, 'UPDATE public.prescriptions SET status = ''verified'''));
  PERFORM pg_temp.check('write', 'prescriptions UPDATE', 'nurse', 'ok:0',
    pg_temp.try_as(nurse, 'UPDATE public.prescriptions SET status = ''dispensed'''));

  -- Labs
  PERFORM pg_temp.check('write', 'lab_orders UPDATE (H1 rows)', 'lab_tech', 'ok:2',
    pg_temp.try_as(lab, 'UPDATE public.lab_orders SET status = ''completed'''));
  PERFORM pg_temp.check('write', 'lab_orders INSERT', 'lab_tech', 'err:42501',
    pg_temp.try_as(lab, format('INSERT INTO public.lab_orders (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'lab_queue UPDATE', 'reception', 'ok:0',
    pg_temp.try_as(recep, 'UPDATE public.lab_queue SET status = ''x'''));

  -- Clinical writes
  PERFORM pg_temp.check('write', 'vital_signs INSERT P2', 'nurse', 'ok:1',
    pg_temp.try_as(nurse, format('INSERT INTO public.vital_signs (patient_id) VALUES (%s)', p2)));
  PERFORM pg_temp.check('write', 'vital_signs INSERT P2', 'inactive', 'err:42501',
    pg_temp.try_as(inact, format('INSERT INTO public.vital_signs (patient_id) VALUES (%s)', p2)));
  PERFORM pg_temp.check('write', 'vital_signs INSERT P2', 'deactivated', 'err:42501',
    pg_temp.try_as(deact, format('INSERT INTO public.vital_signs (patient_id) VALUES (%s)', p2)));
  PERFORM pg_temp.check('write', 'consultations INSERT into H1', 'other_hosp', 'err:42501',
    pg_temp.try_as(h2doc, format('INSERT INTO public.consultations (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'consultations INSERT', 'nurse', 'err:42501',
    pg_temp.try_as(nurse, format('INSERT INTO public.consultations (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
  PERFORM pg_temp.check('write', 'patients UPDATE', 'deactivated', 'ok:0',
    pg_temp.try_as(deact, 'UPDATE public.patients SET notes = ''x'''));
  PERFORM pg_temp.check('write', 'patients DELETE', 'doctor', 'ok:0',
    pg_temp.try_as(doctor, 'DELETE FROM public.patients'));
  PERFORM pg_temp.check('write', 'patients UPDATE (H1 rows)', 'reception', 'ok:2',
    pg_temp.try_as(recep, 'UPDATE public.patients SET notes = ''x'''));

  -- Patient portal principal
  PERFORM pg_temp.check('write', 'patients UPDATE own row (allergies)', 'patient', 'ok:0',
    pg_temp.try_as(pat, 'UPDATE public.patients SET allergies = ARRAY[''none'']'));
  PERFORM pg_temp.check('write', 'appointment_requests INSERT own', 'patient', 'ok:1',
    pg_temp.try_as(pat, format('INSERT INTO public.appointment_requests (hospital_id, patient_id, status) VALUES (%s, %s, ''pending'')', h1, p1)));
  PERFORM pg_temp.check('write', 'appointment_requests INSERT for P2', 'patient', 'err:42501',
    pg_temp.try_as(pat, format('INSERT INTO public.appointment_requests (hospital_id, patient_id, status) VALUES (%s, %s, ''pending'')', h1, p2)));
  PERFORM pg_temp.check('write', 'appointment_requests cancel own', 'patient', 'ok:1',
    pg_temp.try_as(pat, 'UPDATE public.appointment_requests SET status = ''cancelled'''));
  PERFORM pg_temp.check('write', 'appointment_requests self-approve', 'patient', 'err:42501',
    pg_temp.try_as(pat, 'UPDATE public.appointment_requests SET status = ''approved'''));
  PERFORM pg_temp.check('write', 'medical_records INSERT own, source patient_portal', 'patient', 'ok:1',
    pg_temp.try_as(pat, format('INSERT INTO public.medical_records (hospital_id, patient_id, source) VALUES (%s, %s, ''patient_portal'')', h1, p1)));
  PERFORM pg_temp.check('write', 'medical_records INSERT own, other source', 'patient', 'err:42501',
    pg_temp.try_as(pat, format('INSERT INTO public.medical_records (hospital_id, patient_id, source) VALUES (%s, %s, ''clinician'')', h1, p1)));
  PERFORM pg_temp.check('write', 'vital_signs INSERT own', 'patient', 'ok:1',
    pg_temp.try_as(pat, format('INSERT INTO public.vital_signs (patient_id) VALUES (%s)', p1)));
  PERFORM pg_temp.check('write', 'messages INSERT to doctor', 'patient', 'ok:1',
    pg_temp.try_as(pat, format('INSERT INTO public.messages (hospital_id, sender_id, recipient_id, content) VALUES (%s, %L, %L, ''hi'')', h1, pat, doctor)));
  PERFORM pg_temp.check('write', 'messages INSERT spoofed sender', 'nurse', 'err:42501',
    pg_temp.try_as(nurse, format('INSERT INTO public.messages (hospital_id, sender_id, recipient_id, content) VALUES (%s, %L, %L, ''hi'')', h1, doctor, admin)));
  PERFORM pg_temp.check('write', 'messages INSERT to H2 doctor', 'nurse', 'err:42501',
    pg_temp.try_as(nurse, format('INSERT INTO public.messages (hospital_id, sender_id, recipient_id, content) VALUES (%s, %L, %L, ''hi'')', h1, nurse, h2doc)));
  PERFORM pg_temp.check('write', 'messages UPDATE others'' messages', 'admin', 'ok:0',
    pg_temp.try_as(admin, 'UPDATE public.messages SET content = ''x'' WHERE recipient_id <> auth.uid()'));
  PERFORM pg_temp.check('write', 'notifications INSERT to H2 doctor', 'nurse', 'err:42501',
    pg_temp.try_as(nurse, format('INSERT INTO public.notifications (hospital_id, recipient_id, title) VALUES (%s, %L, ''x'')', h1, h2doc)));
  PERFORM pg_temp.check('write', 'notifications INSERT to doctor', 'nurse', 'ok:1',
    pg_temp.try_as(nurse, format('INSERT INTO public.notifications (hospital_id, recipient_id, sender_id, title) VALUES (%s, %L, %L, ''x'')', h1, doctor, nurse)));

  -- DB-13 reference data is read-only; guard on an unowned table
  PERFORM pg_temp.check('write', 'drug_interactions INSERT', 'admin', 'err:42501',
    pg_temp.try_as(admin, 'INSERT INTO public.drug_interactions (drug_a, drug_b) VALUES (''a'', ''b'')'));
  PERFORM pg_temp.check('write', 'unknown_open_table INSERT', 'admin', 'err:42501',
    pg_temp.try_as(admin, 'INSERT INTO public.unknown_open_table (payload) VALUES (''x'')'));
  PERFORM pg_temp.check('write', 'care_gaps UPDATE (legacy FOR ALL + guard)', 'patient', 'ok:1',
    pg_temp.try_as(pat, 'UPDATE public.care_gaps SET gap = ''x'''));
  PERFORM pg_temp.check('write', 'care_gaps UPDATE (legacy FOR ALL + guard)', 'inactive', 'ok:0',
    pg_temp.try_as(inact, 'UPDATE public.care_gaps SET gap = ''x'''));
  PERFORM pg_temp.check('write', 'care_gaps INSERT P2 row', 'patient', 'err:42501',
    pg_temp.try_as(pat, format('INSERT INTO public.care_gaps (hospital_id, patient_id) VALUES (%s, %s)', h1, p2)));
END $$;

-- ---------------------------------------------------------------------------
-- 3. Helpers, S0-10 interplay, and structural post-conditions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  h1 constant uuid := '10000000-0000-0000-0000-000000000001';
  v text; n int;
BEGIN
  PERFORM pg_temp.check('helper', 'user_belongs_to_hospital(doctor, H1)', 'postgres', 'true',
    public.user_belongs_to_hospital('a0000000-0000-0000-0000-000000000002', h1)::text);
  PERFORM pg_temp.check('helper', 'user_belongs_to_hospital(patient, H1)', 'postgres', 'false',
    public.user_belongs_to_hospital('a0000000-0000-0000-0000-000000000007', h1)::text);
  PERFORM pg_temp.check('helper', 'user_belongs_to_hospital(inactive, H1)', 'postgres', 'false',
    public.user_belongs_to_hospital('a0000000-0000-0000-0000-000000000008', h1)::text);
  PERFORM pg_temp.check('helper', 'user_belongs_to_hospital(deactivated, H1)', 'postgres', 'false',
    public.user_belongs_to_hospital('a0000000-0000-0000-0000-000000000009', h1)::text);
  PERFORM pg_temp.check('helper', 'user_belongs_to_hospital(other_hosp, H1)', 'postgres', 'false',
    public.user_belongs_to_hospital('a0000000-0000-0000-0000-00000000000a', h1)::text);

  PERFORM pg_temp.act('a0000000-0000-0000-0000-000000000002', 'aal2');
  v := format('%s/%s/%s/%s', public.is_active_staff_of(h1), public.is_active_staff_of(h1, ARRAY['admin']),
              public.has_any_role(ARRAY['doctor']), public.is_patient_self('c0000000-0000-0000-0000-000000000001'));
  PERFORM pg_temp.reset();
  PERFORM pg_temp.check('helper', 'staff_of(H1)/staff_of(H1,admin)/has_any_role(doctor)/patient_self(P1)', 'doctor', 't/f/t/f', v);

  PERFORM pg_temp.act('a0000000-0000-0000-0000-000000000007', 'aal1');
  v := format('%s/%s/%s', public.is_active_staff_of(h1), public.has_any_role(ARRAY['patient'], h1),
              public.is_patient_self('c0000000-0000-0000-0000-000000000001'));
  PERFORM pg_temp.reset();
  PERFORM pg_temp.check('helper', 'staff_of(H1)/has_any_role(patient,H1)/patient_self(P1)', 'patient', 'f/t/t', v);

  BEGIN
    PERFORM pg_temp.act(NULL, NULL);
    PERFORM public.user_is_member_of('a0000000-0000-0000-0000-000000000002', h1);
    v := 'executed';
  EXCEPTION WHEN insufficient_privilege THEN v := 'denied';
  END;
  PERFORM pg_temp.reset();
  PERFORM pg_temp.check('helper', 'anon EXECUTE user_is_member_of', 'anon', 'denied', v);

  -- Without profiles.is_active (as in the types.ts snapshot) the helpers still
  -- work; only role deletion then marks a user inactive.
  BEGIN
    ALTER TABLE public.profiles DROP COLUMN is_active;
    v := format('%s/%s', public.user_belongs_to_hospital('a0000000-0000-0000-0000-000000000008', h1),
                         public.user_belongs_to_hospital('a0000000-0000-0000-0000-000000000009', h1));
    RAISE EXCEPTION 's004_rollback';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 's004_rollback' THEN v := 'err:' || SQLSTATE; END IF;
  END;
  PERFORM pg_temp.check('helper', 'no is_active column: belongs(is_active=false user)/belongs(roles deleted)', 'postgres', 't/f', v);

  -- S0-10: doctor at aal1 sees no PHI even with the role-aware policies.
  PERFORM pg_temp.check('s0-10', 'patients at aal1', 'doctor', '0',
    pg_temp.count_as('a0000000-0000-0000-0000-000000000002', 'aal1', 'patients')::text);
  PERFORM pg_temp.check('s0-10', 'patients at aal1 (no 2FA role)', 'nurse', '2',
    pg_temp.count_as('a0000000-0000-0000-0000-000000000003', 'aal1', 'patients')::text);

  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
   WHERE ns.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity;
  PERFORM pg_temp.check('structure', 'public tables without RLS', 'postgres', '0', n::text);

  SELECT count(*) INTO n FROM rls_migration_audit.s004_policy_spec s
   WHERE NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public'
                      AND p.tablename = s.tablename AND p.policyname = s.policyname);
  PERFORM pg_temp.check('structure', 'spec policies missing (lab_queue/prescription_queue may be absent)', 'postgres',
    (SELECT count(*)::text FROM rls_migration_audit.s004_policy_spec WHERE tablename = 'prescription_queue'), n::text);

  SELECT count(*) INTO n FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.permissive = 'PERMISSIVE' AND p.policyname NOT LIKE 's004\_%'
     AND p.tablename IN (SELECT tablename FROM rls_migration_audit.s004_policy_spec);
  PERFORM pg_temp.check('structure', 'foreign permissive policies left on owned tables', 'postgres', '0', n::text);

  SELECT string_agg(policyname, ',' ORDER BY policyname) INTO v FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'patients' AND permissive = 'RESTRICTIVE';
  PERFORM pg_temp.check('structure', 'restrictive policies kept on patients', 'postgres', 'mfa_aal2_required', v);

  SELECT string_agg(tablename, ',' ORDER BY tablename) INTO v FROM pg_policies
   WHERE schemaname = 'public' AND policyname = 's004_active_principal_guard';
  PERFORM pg_temp.check('structure', 'tables with the section E guard', 'postgres', 'activity_logs,care_gaps', v);

  SELECT format('%s/%s', count(*) FILTER (WHERE in_repo_history), count(*) FILTER (WHERE NOT in_repo_history))
    INTO v FROM rls_migration_audit.s004_dropped_policies
   WHERE tablename = 'invoices';
  PERFORM pg_temp.check('structure', 'invoices policies dropped: in repo history / live-only', 'postgres', '2/1', v);

  SELECT count(*) INTO n FROM rls_migration_audit.s004_dropped_policies WHERE policyname LIKE 's004\_%';
  PERFORM pg_temp.check('structure', 'dropped s004 policies recorded as foreign (re-apply)', 'postgres', '0', n::text);

  SELECT count(*) INTO n FROM pg_trigger WHERE tgname = 's004_prescription_items_hospital_from_parent';
  PERFORM pg_temp.check('structure', 'prescription_items parent-hospital trigger', 'postgres', '1', n::text);

  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public' AND p.prosecdef
     AND p.proname IN ('profile_is_active', 'my_staff_hospital_ids', 'is_active_staff_of', 'has_any_role',
                       'my_patient_ids', 'my_patient_hospital_ids', 'is_patient_self', 'is_active_principal',
                       'current_profile_id', 'user_is_staff_of', 'user_is_member_of', 'patient_hospital_id',
                       'prescription_hospital_id', 'prescription_patient_id', 'invoice_hospital_id',
                       'invoice_patient_id', 'purchase_order_hospital_id', 'user_belongs_to_hospital')
     AND p.provolatile = 's'
     AND array_to_string(p.proconfig, ',') = 'search_path=""';
  PERFORM pg_temp.check('structure', 'helpers STABLE SECURITY DEFINER search_path=''''', 'postgres', '18', n::text);
END $$;

-- ---------------------------------------------------------------------------
-- 4. Report
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  e record; line text; cell record; hdr text; n_fail int; n_total int; r record;
BEGIN
  hdr := rpad('table', 29);
  FOR cell IN SELECT name FROM s004_principals ORDER BY ord LOOP
    hdr := hdr || lpad(left(cell.name, 10), 11);
  END LOOP;
  RAISE NOTICE 'READ MATRIX (rows visible; "n!e" = got n, expected e)';
  RAISE NOTICE '%', hdr;
  FOR e IN SELECT * FROM s004_expect ORDER BY ord LOOP
    line := rpad(e.tbl, 29);
    FOR cell IN SELECT r2.actual, r2.expected, r2.ok FROM s004_principals p
                  JOIN s004_results r2 ON r2.kind = 'read' AND r2.label = e.tbl AND r2.principal = p.name
                 ORDER BY p.ord LOOP
      line := line || lpad(CASE WHEN cell.ok THEN cell.actual ELSE cell.actual || '!' || cell.expected END, 11);
    END LOOP;
    RAISE NOTICE '%', line;
  END LOOP;
  FOR r IN SELECT * FROM s004_results WHERE kind <> 'read' ORDER BY kind DESC, label, principal LOOP
    RAISE NOTICE '% [%] % as %: expected %, got %',
      CASE WHEN r.ok THEN 'PASS' ELSE 'FAIL' END, r.kind, r.label, r.principal, r.expected, r.actual;
  END LOOP;
  SELECT count(*) FILTER (WHERE NOT ok OR ok IS NULL), count(*) INTO n_fail, n_total FROM s004_results;
  IF n_fail > 0 THEN
    RAISE EXCEPTION 'S0-04 assertions: % of % checks FAILED', n_fail, n_total;
  END IF;
  RAISE NOTICE 'S0-04 assertions: all % checks passed', n_total;
END $$;
