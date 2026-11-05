-- Test fixture for 20261105000006_rls_lab_tables.sql.
-- NOT a migration. Apply only to a throwaway PostgreSQL that already has
-- scripts/db/supabase-compat-shim.sql (run-tests.mjs in this folder does it).
--
-- Columns of the six lab tables follow the Row types in
-- src/integrations/supabase/types.ts (no NOT NULL, no foreign keys). Supporting
-- tables: hospitals, profiles (is_active), user_roles, patients, lab_orders.
-- Two hospitals (A, B) and the seed rows the assertions read.
--
-- Pre-existing state simulated here: an older permissive policy on lab_results
-- and critical_value_notifications (the migration must remove it) and a
-- restrictive policy on lab_results (the migration must keep it).

CREATE TYPE public.app_role AS ENUM
  ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient');

CREATE TABLE public.hospitals (id uuid PRIMARY KEY, name text);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  hospital_id uuid,
  first_name text,
  last_name text,
  email text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  hospital_id uuid
);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  hospital_id uuid
);

CREATE TABLE public.lab_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL,
  patient_id uuid
);

CREATE TABLE public.loinc_codes (
  code text PRIMARY KEY,
  component text,
  class text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.lab_interpretation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loinc_code text,
  condition_type text,
  condition_criteria jsonb,
  interpretation_text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id uuid,
  hospital_id uuid,
  loinc_code text,
  result_value text,
  result_numeric numeric,
  critical_flag boolean,
  verified_by uuid,
  performed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.lab_qc_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid,
  loinc_code text,
  qc_level text,
  run_date date,
  technician_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.lab_trends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid,
  patient_id uuid,
  loinc_code text,
  trend_period text,
  trend_data jsonb,
  calculated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.critical_value_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid,
  patient_id uuid,
  lab_result_id uuid,
  loinc_code text,
  critical_value text,
  notification_level int,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Older permissive policy and RLS switched on (as an earlier migration would).
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_value_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY legacy_open ON public.lab_results FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY legacy_open ON public.critical_value_notifications FOR ALL TO public USING (true) WITH CHECK (true);
-- Restrictive policy that must survive the migration: hides BLOCKED rows.
CREATE POLICY legacy_restrictive_block ON public.lab_results AS RESTRICTIVE FOR ALL TO public
  USING (coalesce(loinc_code, '') <> 'BLOCKED') WITH CHECK (true);

-- ---------------------------------------------------------------- seed data
-- Hospitals A = aaaa..., B = bbbb...
INSERT INTO public.hospitals (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hospital A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Hospital B');

-- Principals. profiles rows for all but 'no profile' (a9).
INSERT INTO public.profiles (user_id, hospital_id, first_name, last_name, email, is_active) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ada',  'Admin',    'admin-a@test', true),
  ('00000000-0000-0000-0000-0000000000a2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Dan',  'Doctor',   'doctor-a@test', true),
  ('00000000-0000-0000-0000-0000000000a3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nia',  'Nurse',    'nurse-a@test', true),
  ('00000000-0000-0000-0000-0000000000a4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Lou',  'LabTech',  'lab-a@test', true),
  ('00000000-0000-0000-0000-0000000000a5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rita', 'Recep',    'recep-a@test', true),
  ('00000000-0000-0000-0000-0000000000a6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pat',  'Patient',  'patient-a@test', true),
  ('00000000-0000-0000-0000-0000000000a7', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ian',  'Inactive', 'inactive-a@test', false),
  ('00000000-0000-0000-0000-0000000000b8', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bea',  'LabTechB', 'lab-b@test', true),
  ('00000000-0000-0000-0000-0000000000b1', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Bob',  'AdminB',   'admin-b@test', true);

INSERT INTO public.user_roles (user_id, role, hospital_id) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin',          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('00000000-0000-0000-0000-0000000000a2', 'doctor',         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('00000000-0000-0000-0000-0000000000a3', 'nurse',          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('00000000-0000-0000-0000-0000000000a4', 'lab_technician', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('00000000-0000-0000-0000-0000000000a5', 'receptionist',   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('00000000-0000-0000-0000-0000000000a6', 'patient',        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('00000000-0000-0000-0000-0000000000a7', 'lab_technician', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('00000000-0000-0000-0000-0000000000b8', 'lab_technician', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('00000000-0000-0000-0000-0000000000b1', 'admin',          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  -- a9: has a lab_technician role in A but no profile row at all.
  ('00000000-0000-0000-0000-0000000000a9', 'lab_technician', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

INSERT INTO public.patients (id, user_id, hospital_id) VALUES
  ('50000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a6', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('50000000-0000-0000-0000-00000000000b', NULL, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

INSERT INTO public.lab_orders (id, hospital_id, patient_id) VALUES
  ('4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '50000000-0000-0000-0000-00000000000a'),
  ('4f000000-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '50000000-0000-0000-0000-00000000000b');

INSERT INTO public.loinc_codes (code, component, class) VALUES
  ('2345-7', 'Glucose', 'CHEM'),
  ('718-7',  'Hemoglobin', 'HEM');

INSERT INTO public.lab_interpretation_rules (id, loinc_code, condition_type, condition_criteria, interpretation_text) VALUES
  ('1e000000-0000-0000-0000-00000000000a', '2345-7', 'range', '{"min": 70}', 'Glucose check');

-- lab_results
--   R_A         hospital A, order A         visible to A staff
--   R_A_NULL    hospital NULL, order A      visible to A staff via the order
--   R_B         hospital B, order B         visible to B staff only
--   R_NOSCOPE   hospital NULL, no order     visible to nobody
--   R_MISMATCH  hospital B, order A         refused (row and order disagree)
--   R_BLOCKED   hospital A, order A, BLOCKED hidden by the restrictive policy
INSERT INTO public.lab_results (id, lab_order_id, hospital_id, loinc_code, result_value, critical_flag) VALUES
  ('51000000-0000-0000-0000-00000000000a', '4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', '5.1', false),
  ('51000000-0000-0000-0000-0000000000a0', '4f000000-0000-0000-0000-00000000000a', NULL, '718-7', '13.2', false),
  ('51000000-0000-0000-0000-00000000000b', '4f000000-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2345-7', '4.9', false),
  ('51000000-0000-0000-0000-0000000000c0', NULL, NULL, '2345-7', '6.0', false),
  ('51000000-0000-0000-0000-0000000000d0', '4f000000-0000-0000-0000-00000000000a', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2345-7', '7.0', false),
  ('51000000-0000-0000-0000-0000000000e0', '4f000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'BLOCKED', '8.0', false);

INSERT INTO public.lab_qc_results (id, hospital_id, loinc_code, qc_level, run_date) VALUES
  ('52000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '2345-7', 'L1', '2026-11-04'),
  ('52000000-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '2345-7', 'L1', '2026-11-04');

INSERT INTO public.lab_trends (id, hospital_id, patient_id, loinc_code, trend_period) VALUES
  ('53000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '50000000-0000-0000-0000-00000000000a', '2345-7', '30d'),
  ('53000000-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '50000000-0000-0000-0000-00000000000b', '2345-7', '30d');

INSERT INTO public.critical_value_notifications (id, hospital_id, patient_id, lab_result_id, loinc_code, critical_value, notification_level) VALUES
  ('54000000-0000-0000-0000-00000000000a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '50000000-0000-0000-0000-00000000000a', '51000000-0000-0000-0000-00000000000a', '2345-7', '6.9 mmol/L', 3),
  ('54000000-0000-0000-0000-00000000000b', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '50000000-0000-0000-0000-00000000000b', '51000000-0000-0000-0000-00000000000b', '2345-7', '6.8 mmol/L', 3);
