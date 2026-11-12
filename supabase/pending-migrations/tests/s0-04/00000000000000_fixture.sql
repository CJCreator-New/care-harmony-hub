-- Test fixture for 20261105000004_role_aware_rls.sql (S0-04).
-- NOT a migration. Apply only to a throwaway PostgreSQL that already has
-- scripts/db/supabase-compat-shim.sql (run-tests.mjs in this folder does it).
--
-- A stand-in for the live schema. The 44 CREATE TABLE statements below are
-- generated from the Row types of every public table in
-- src/integrations/supabase/types.ts (the live snapshot): uuid for ids and
-- *_id/*_by columns, boolean/numeric/jsonb/text[] as typed, text otherwise, no
-- NOT NULL or foreign keys. Then the columns later migrations add, six tables
-- the code uses that types.ts lacks (queue, DB-13 examples, a guard target),
-- live-like policies in the DB-02/DB-07/DB-09/DB-16 shapes, and data for two
-- hospitals. The real policies come from the S0-01 capture.

CREATE TYPE public.app_role AS ENUM
  ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient');

CREATE TABLE public.activity_logs (
  action_type text,
  created_at timestamptz DEFAULT now(),
  details jsonb,
  entity_id uuid,
  entity_type text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text,
  new_values jsonb,
  old_values jsonb,
  severity text,
  user_agent text,
  user_id uuid
);

CREATE TABLE public.appointment_requests (
  alternate_date text,
  alternate_time text,
  appointment_type text,
  created_appointment_id uuid,
  created_at timestamptz DEFAULT now(),
  doctor_id uuid,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  patient_id uuid,
  preferred_date text,
  preferred_time text,
  reason_for_visit text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  status text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.appointments (
  appointment_type text,
  cancellation_reason text,
  check_in_time text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  doctor_id uuid,
  duration_minutes numeric,
  end_time text,
  follow_up_required boolean,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  patient_id uuid,
  priority text,
  queue_number numeric,
  reason_for_visit text,
  reminder_sent boolean,
  reminder_sent_at timestamptz,
  room_number text,
  scheduled_date text,
  scheduled_time text,
  start_time text,
  status text,
  updated_at timestamptz DEFAULT now(),
  waitlist_position numeric
);

CREATE TABLE public.consultations (
  appointment_id uuid,
  auto_save_data jsonb,
  billing_notified boolean,
  chief_complaint text,
  clinical_notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  current_step numeric,
  diagnoses jsonb,
  doctor_id uuid,
  final_diagnosis text[],
  follow_up_date text,
  follow_up_notes text,
  handoff_notes text,
  history_of_present_illness text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_notified boolean,
  lab_orders jsonb,
  last_auto_save text,
  nurse_id uuid,
  patient_id uuid,
  pharmacy_notified boolean,
  physical_examination jsonb,
  prescriptions jsonb,
  provisional_diagnosis text[],
  referrals jsonb,
  started_at timestamptz,
  status text,
  symptoms text[],
  treatment_plan text,
  updated_at timestamptz DEFAULT now(),
  vitals jsonb
);

CREATE TABLE public.departments (
  code text,
  created_at timestamptz DEFAULT now(),
  description text,
  head_of_department uuid,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean,
  name text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.doctor_availability (
  created_at timestamptz DEFAULT now(),
  day_of_week numeric,
  doctor_id uuid,
  end_time text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean,
  is_telemedicine boolean,
  slot_duration_minutes numeric,
  start_time text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.documents (
  consultation_id uuid,
  created_at timestamptz DEFAULT now(),
  description text,
  document_type text,
  file_name text,
  file_path text,
  file_size numeric,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_confidential boolean,
  mime_type text,
  patient_id uuid,
  tags text[],
  title text,
  updated_at timestamptz DEFAULT now(),
  uploaded_by uuid
);

CREATE TABLE public.hospital_resources (
  capacity numeric,
  code text,
  created_at timestamptz DEFAULT now(),
  current_patient_id uuid,
  department_id uuid,
  floor text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean,
  name text,
  notes text,
  resource_type text,
  status text,
  updated_at timestamptz DEFAULT now(),
  wing text
);

CREATE TABLE public.hospitals (
  address text,
  city text,
  created_at timestamptz DEFAULT now(),
  email text,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_number text,
  logo_url text,
  name text,
  phone text,
  settings jsonb,
  state text,
  updated_at timestamptz DEFAULT now(),
  zip text
);

CREATE TABLE public.icd10_codes (
  category text,
  chapter text,
  code text,
  created_at timestamptz DEFAULT now(),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_billable boolean,
  long_description text,
  short_description text
);

CREATE TABLE public.insurance_claims (
  approved_amount numeric,
  claim_amount numeric,
  claim_number text,
  created_at timestamptz DEFAULT now(),
  denial_reason text,
  diagnosis_codes text[],
  group_number text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_provider text,
  invoice_id uuid,
  notes text,
  paid_amount numeric,
  paid_at timestamptz,
  patient_id uuid,
  patient_responsibility numeric,
  policy_number text,
  procedure_codes text[],
  reviewed_at timestamptz,
  status text,
  submitted_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.invoice_items (
  created_at timestamptz DEFAULT now(),
  description text,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  item_type text,
  quantity numeric,
  total numeric,
  unit_price numeric
);

CREATE TABLE public.invoices (
  appointment_id uuid,
  consultation_id uuid,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  discount numeric,
  due_date text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text,
  notes text,
  paid_amount numeric,
  patient_id uuid,
  status text,
  subtotal numeric,
  tax numeric,
  total numeric,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.lab_orders (
  collected_at timestamptz,
  collected_by uuid,
  completed_at timestamptz,
  consultation_id uuid,
  created_at timestamptz DEFAULT now(),
  critical_notified boolean,
  critical_notified_at timestamptz,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_critical boolean,
  normal_range text,
  ordered_at timestamptz,
  ordered_by uuid,
  patient_id uuid,
  priority text,
  processed_by uuid,
  result_notes text,
  results jsonb,
  sample_type text,
  specimen_type text,
  status text,
  test_category text,
  test_code text,
  test_name text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.medical_records (
  consultation_id uuid,
  created_at timestamptz DEFAULT now(),
  data jsonb,
  description text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_confidential boolean,
  onset_date text,
  patient_id uuid,
  record_type text,
  recorded_by uuid,
  resolution_date text,
  severity text,
  source text,
  status text,
  title text,
  updated_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid
);

CREATE TABLE public.medication_administrations (
  administered_at timestamptz,
  administered_by uuid,
  created_at timestamptz DEFAULT now(),
  dosage text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name text,
  notes text,
  patient_id uuid,
  prescription_id uuid,
  prescription_item_id uuid,
  route text,
  scheduled_time text,
  status text,
  witness_id uuid
);

CREATE TABLE public.medications (
  batch_number text,
  category text,
  created_at timestamptz DEFAULT now(),
  current_stock numeric,
  expiry_date text,
  form text,
  generic_name text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean,
  manufacturer text,
  minimum_stock numeric,
  name text,
  strength text,
  unit text,
  unit_price numeric,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.messages (
  content text,
  created_at timestamptz DEFAULT now(),
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_read boolean,
  parent_message_id uuid,
  patient_id uuid,
  read_at timestamptz,
  recipient_id uuid,
  sender_id uuid,
  subject text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.notifications (
  action_url text,
  category text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_read boolean,
  message text,
  metadata jsonb,
  priority text,
  read_at timestamptz,
  recipient_id uuid,
  sender_id uuid,
  title text,
  type text
);

CREATE TABLE public.patient_consents (
  consent_date text,
  created_at timestamptz DEFAULT now(),
  data_processing_consent boolean,
  data_sharing_consent boolean,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid,
  telemedicine_consent boolean,
  treatment_consent boolean,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.patient_prep_checklists (
  allergies_verified boolean,
  appointment_id uuid,
  chief_complaint_recorded boolean,
  completed_at timestamptz,
  consent_obtained boolean,
  created_at timestamptz DEFAULT now(),
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medications_reviewed boolean,
  notes text,
  nurse_id uuid,
  patient_id uuid,
  queue_entry_id uuid,
  ready_for_doctor boolean,
  updated_at timestamptz DEFAULT now(),
  vitals_completed boolean
);

CREATE TABLE public.patient_queue (
  appointment_id uuid,
  assigned_to uuid,
  called_time text,
  check_in_time text,
  created_at timestamptz DEFAULT now(),
  department text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  patient_id uuid,
  priority text,
  queue_number numeric,
  service_end_time text,
  service_start_time text,
  status text
);

CREATE TABLE public.patients (
  address text,
  allergies text[],
  blood_type text,
  chronic_conditions text[],
  city text,
  created_at timestamptz DEFAULT now(),
  current_medications jsonb,
  date_of_birth text,
  email text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  first_name text,
  gender text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurance_group_number text,
  insurance_policy_number text,
  insurance_provider text,
  is_active boolean,
  last_name text,
  mrn text,
  notes text,
  phone text,
  state text,
  updated_at timestamptz DEFAULT now(),
  user_id uuid,
  zip text
);

CREATE TABLE public.payment_plans (
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  down_payment numeric,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_amount numeric,
  installment_frequency text,
  invoice_id uuid,
  next_due_date text,
  notes text,
  paid_installments numeric,
  patient_id uuid,
  remaining_balance numeric,
  status text,
  total_amount numeric,
  total_installments numeric,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.payments (
  amount numeric,
  created_at timestamptz DEFAULT now(),
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid,
  notes text,
  payment_date text,
  payment_method text,
  received_by uuid,
  reference_number text
);

CREATE TABLE public.prescription_items (
  created_at timestamptz DEFAULT now(),
  dosage text,
  duration text,
  frequency text,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instructions text,
  is_dispensed boolean,
  medication_id uuid,
  medication_name text,
  prescription_id uuid,
  quantity numeric
);

CREATE TABLE public.prescription_refill_requests (
  created_at timestamptz DEFAULT now(),
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  patient_id uuid,
  prescription_id uuid,
  reason text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  status text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.prescriptions (
  allergy_alerts jsonb,
  consultation_id uuid,
  created_at timestamptz DEFAULT now(),
  dispensed_at timestamptz,
  dispensed_by uuid,
  drug_interactions jsonb,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  patient_id uuid,
  prescribed_by uuid,
  priority text,
  status text,
  updated_at timestamptz DEFAULT now(),
  verification_required boolean,
  verified_at timestamptz,
  verified_by uuid
);

CREATE TABLE public.profiles (
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  email text,
  failed_login_attempts numeric,
  first_name text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_staff boolean,
  last_login text,
  last_name text,
  locked_until text,
  password_changed_at timestamptz,
  phone text,
  security_answer text,
  security_question text,
  two_factor_enabled boolean,
  updated_at timestamptz DEFAULT now(),
  user_id uuid
);

CREATE TABLE public.purchase_order_items (
  created_at timestamptz DEFAULT now(),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text,
  medication_id uuid,
  purchase_order_id uuid,
  quantity numeric,
  received_quantity numeric,
  total numeric,
  unit_price numeric
);

CREATE TABLE public.purchase_orders (
  created_at timestamptz DEFAULT now(),
  expected_delivery_date text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  order_number text,
  ordered_at timestamptz,
  ordered_by uuid,
  received_at timestamptz,
  received_by uuid,
  status text,
  supplier_id uuid,
  total_amount numeric,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.reorder_rules (
  auto_reorder boolean,
  created_at timestamptz DEFAULT now(),
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean,
  last_auto_order_date text,
  medication_id uuid,
  preferred_supplier_id uuid,
  reorder_point numeric,
  reorder_quantity numeric,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.shift_handovers (
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now(),
  critical_patients jsonb,
  handover_time text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incoming_nurse_id uuid,
  notes text,
  outgoing_nurse_id uuid,
  pending_tasks jsonb,
  shift_date text,
  shift_type text,
  status text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.shift_schedules (
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  department_id uuid,
  end_time text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  shift_date text,
  shift_type text,
  staff_id uuid,
  start_time text,
  status text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.staff_invitations (
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  email text,
  expires_at timestamptz,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invited_by uuid,
  role public.app_role,
  status text,
  token uuid
);

CREATE TABLE public.stock_alerts (
  acknowledged_at timestamptz,
  acknowledged_by uuid,
  alert_type text,
  auto_order_created boolean,
  created_at timestamptz DEFAULT now(),
  current_quantity numeric,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid,
  purchase_order_id uuid,
  resolved_at timestamptz,
  status text,
  threshold_quantity numeric
);

CREATE TABLE public.suppliers (
  address text,
  city text,
  contact_person text,
  created_at timestamptz DEFAULT now(),
  email text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active boolean,
  name text,
  notes text,
  payment_terms text,
  phone text,
  state text,
  updated_at timestamptz DEFAULT now(),
  zip text
);

CREATE TABLE public.system_config (
  category text,
  config_key text,
  config_value jsonb,
  created_at timestamptz DEFAULT now(),
  description text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_sensitive boolean,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.task_assignments (
  assigned_by uuid,
  assigned_to uuid,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  description text,
  due_date text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  patient_id uuid,
  priority text,
  status text,
  task_type text,
  title text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.telemedicine_sessions (
  actual_end text,
  actual_start text,
  appointment_id uuid,
  created_at timestamptz DEFAULT now(),
  doctor_id uuid,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_url text,
  notes text,
  patient_id uuid,
  recording_url text,
  room_id uuid,
  scheduled_end text,
  scheduled_start text,
  status text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.time_slots (
  appointment_id uuid,
  created_at timestamptz DEFAULT now(),
  doctor_id uuid,
  end_time text,
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_booked boolean,
  is_telemedicine boolean,
  slot_date text,
  start_time text
);

CREATE TABLE public.two_factor_secrets (
  backup_codes text[],
  backup_codes_salt text,
  created_at timestamptz DEFAULT now(),
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  secret text,
  updated_at timestamptz DEFAULT now(),
  user_id uuid,
  verified_at timestamptz
);

CREATE TABLE public.user_roles (
  created_at timestamptz DEFAULT now(),
  hospital_id uuid,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role,
  user_id uuid
);

CREATE TABLE public.vital_signs (
  blood_pressure_diastolic numeric,
  blood_pressure_systolic numeric,
  bmi numeric,
  consultation_id uuid,
  heart_rate numeric,
  height numeric,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notes text,
  oxygen_saturation numeric,
  pain_level numeric,
  patient_id uuid,
  recorded_at timestamptz,
  recorded_by uuid,
  respiratory_rate numeric,
  temperature numeric,
  weight numeric
);

-- ---------------------------------------------------------------------------
-- Columns later migrations add live (not in the 2026-09-08 types snapshot).
-- is_active: emulates S0-03 / 20260909000001 having added it. The migration
-- reads it through to_jsonb, so it also works without the column.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN two_factor_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN two_factor_secret text;
ALTER TABLE public.profiles ADD COLUMN role text;
ALTER TABLE public.prescription_items ADD COLUMN hospital_id uuid;   -- 20260622000002
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_role_hospital_key UNIQUE (user_id, role, hospital_id);

-- Tables the code uses that are not in types.ts (DB-09 queue, DB-13 examples,
-- and one unknown table with a membership-only policy for the section E guard).
CREATE TABLE public.lab_queue (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid, lab_order_id uuid, status text);
CREATE TABLE public.mar_administrations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid, patient_id uuid, administration_notes text);
CREATE TABLE public.drug_interactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), drug_a text, drug_b text, severity text);
CREATE TABLE public.unknown_open_table (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payload text);
CREATE TABLE public.care_gaps (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid, patient_id uuid, gap text);
CREATE TABLE public.lab_equipment_errors (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid, error text);

-- ---------------------------------------------------------------------------
-- Live helper functions as the repository defines them (misc.sql:211-250):
-- membership only, no role, no is_active.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE FUNCTION public.user_belongs_to_hospital(_user_id uuid, _hospital_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND hospital_id = _hospital_id)
$$;

-- ---------------------------------------------------------------------------
-- Live-like policies: the DB-02 / DB-07 / DB-09 shapes, on every table.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their hospital" ON public.hospitals FOR SELECT USING (public.user_belongs_to_hospital(auth.uid(), id));
ALTER TABLE public.two_factor_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_equipment_errors ENABLE ROW LEVEL SECURITY;   -- RLS on, zero policies (DB-13)

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.column_name = 'hospital_id'
              AND c.table_name NOT IN ('profiles', 'user_roles', 'staff_invitations', 'hospitals',
                                       'mar_administrations', 'lab_equipment_errors', 'prescription_items')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (public.user_belongs_to_hospital(auth.uid(), hospital_id))',
                   'Staff can view ' || t || ' in their hospital', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated
                      USING (hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()))
                      WITH CHECK (hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()))',
                   t || ' hospital scoped', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['vital_signs', 'invoice_items', 'purchase_order_items', 'icd10_codes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
                   'Authenticated can manage ' || t, t);
  END LOOP;
END
$$;

-- Exact repository names for the billing policies (DB-07) and the DB-09 ones.
-- ("Staff can view invoices in their hospital" is created by the loop above.)
CREATE POLICY "Staff can create invoices" ON public.invoices FOR INSERT
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));
CREATE POLICY "Staff can create payments" ON public.payments FOR INSERT
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescription_items_hospital_isolation" ON public.prescription_items FOR ALL TO authenticated
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()))
  WITH CHECK (hospital_id = (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "messages_hospital_access" ON public.messages FOR ALL
  USING (hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "lab_queue_hospital_access" ON public.lab_queue FOR ALL TO authenticated
  USING (hospital_id IN (SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()));
-- DB-16: a dead jwt-role policy.
CREATE POLICY "Pharmacists can update prescriptions" ON public.prescriptions FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('pharmacist', 'admin'));

-- Same grants Supabase gives the API roles.
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Data. Two hospitals. H1 has one user per role, a portal patient (P1), a
-- staff member with profiles.is_active = false, and one "deactivated" through
-- the UI (roles deleted, profile left in H1: DeactivateStaffDialog.tsx). H2 has
-- one doctor. P2 is a second H1 patient, P3 is in H2.
-- ---------------------------------------------------------------------------
INSERT INTO public.hospitals (id, name) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Hospital One'),
  ('10000000-0000-0000-0000-000000000002', 'Hospital Two');

INSERT INTO auth.users (id, email)
SELECT ('a0000000-0000-0000-0000-0000000000' || lpad(to_hex(g), 2, '0'))::uuid, 'u' || g || '@example.test'
  FROM generate_series(1, 10) g;

INSERT INTO public.profiles (id, user_id, email, first_name, last_name, hospital_id, is_staff, is_active)
SELECT ('b0000000-0000-0000-0000-0000000000' || lpad(to_hex(g), 2, '0'))::uuid,
       ('a0000000-0000-0000-0000-0000000000' || lpad(to_hex(g), 2, '0'))::uuid,
       'u' || g || '@example.test', 'U', g::text,
       CASE WHEN g = 10 THEN '10000000-0000-0000-0000-000000000002'::uuid
            ELSE '10000000-0000-0000-0000-000000000001'::uuid END,
       g <> 7, g <> 8
  FROM generate_series(1, 10) g;

-- 1 admin, 2 doctor, 3 nurse, 4 pharmacist, 5 lab_technician, 6 receptionist,
-- 7 patient (portal), 8 nurse with is_active=false, 9 deactivated (no roles), 10 doctor in H2.
INSERT INTO public.user_roles (user_id, role, hospital_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'admin',          '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'doctor',         '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'nurse',          '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', 'pharmacist',     '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', 'lab_technician', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000006', 'receptionist',   '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000007', 'patient',        '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000008', 'nurse',          '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-00000000000a', 'doctor',         '10000000-0000-0000-0000-000000000002');

INSERT INTO public.patients (id, hospital_id, user_id, first_name, last_name, mrn) VALUES
  ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'Pat', 'One', 'MRN1'),
  ('c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', NULL, 'Pat', 'Two', 'MRN2'),
  ('c0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', NULL, 'Pat', 'Three', 'MRN3');

-- One row per patient (P1, P2 in H1; P3 in H2) in every hospital+patient table,
-- two H1 rows and one H2 row in every hospital-only table.
DO $$
DECLARE
  t text;
  v_has_patient boolean;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.column_name = 'hospital_id'
              AND c.table_name NOT IN ('profiles', 'user_roles', 'staff_invitations', 'hospitals', 'patients',
                                       'messages', 'notifications', 'task_assignments', 'system_config',
                                       'prescription_items', 'activity_logs', 'payments')
            ORDER BY 1
  LOOP
    SELECT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'patient_id') INTO v_has_patient;
    IF v_has_patient THEN
      EXECUTE format('INSERT INTO public.%I (hospital_id, patient_id) SELECT hospital_id, id FROM public.patients', t);
    ELSE
      EXECUTE format($q$INSERT INTO public.%I (hospital_id) VALUES
        ('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000001'),
        ('10000000-0000-0000-0000-000000000002')$q$, t);
    END IF;
  END LOOP;
END
$$;

-- doctor_availability rows belong to the doctors (profile ids).
UPDATE public.doctor_availability SET doctor_id = CASE hospital_id
  WHEN '10000000-0000-0000-0000-000000000001' THEN 'b0000000-0000-0000-0000-000000000002'::uuid
  ELSE 'b0000000-0000-0000-0000-00000000000a'::uuid END;
UPDATE public.documents SET is_confidential = false, uploaded_by = 'b0000000-0000-0000-0000-000000000003';

INSERT INTO public.vital_signs (patient_id, recorded_at) SELECT id, now() FROM public.patients;
INSERT INTO public.prescription_items (prescription_id, hospital_id, medication_name, dosage)
  SELECT id, hospital_id, 'amoxicillin', '500 mg' FROM public.prescriptions;
INSERT INTO public.invoice_items (invoice_id, description) SELECT id, 'visit' FROM public.invoices;
INSERT INTO public.payments (invoice_id, hospital_id, amount) SELECT id, hospital_id, 10 FROM public.invoices;
INSERT INTO public.purchase_order_items (purchase_order_id, item_name)
  SELECT id, 'gloves' FROM public.purchase_orders;
INSERT INTO public.icd10_codes (code) VALUES ('A00'), ('B00'), ('C00');
INSERT INTO public.drug_interactions (drug_a, drug_b) VALUES ('warfarin', 'aspirin'), ('ssri', 'maoi');
INSERT INTO public.unknown_open_table (payload) VALUES ('x');
INSERT INTO public.system_config (hospital_id, config_key, is_sensitive) VALUES
  ('10000000-0000-0000-0000-000000000001', 'h1.public', false),
  ('10000000-0000-0000-0000-000000000001', 'h1.secret', true),
  ('10000000-0000-0000-0000-000000000002', 'h2.public', false),
  (NULL, 'global.public', false);
-- Messages: doctor->patient (H1), nurse->admin (H1), H2 doctor->self (H2),
-- pharmacist->inactive nurse (H1), receptionist->deactivated user (H1).
INSERT INTO public.messages (hospital_id, sender_id, recipient_id, patient_id, content) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000001', 'hello'),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', NULL, 'shift'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', NULL, 'note'),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', NULL, 'to inactive'),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000009', NULL, 'to deactivated');
-- One notification for every user, in that user's hospital.
INSERT INTO public.notifications (hospital_id, recipient_id, title)
SELECT p.hospital_id, p.user_id, 'n' FROM public.profiles p;
-- Tasks: doctor -> lab tech (H1), admin -> nurse (H1), H2 doctor -> self (H2). Profile ids.
INSERT INTO public.task_assignments (hospital_id, assigned_by, assigned_to, title) VALUES
  ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', 't1'),
  ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 't2'),
  ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-00000000000a', 'b0000000-0000-0000-0000-00000000000a', 't3');
-- Activity logs: one by the doctor and one by the portal patient (H1), one in H2.
INSERT INTO public.activity_logs (hospital_id, user_id, action_type) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'view'),
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'login'),
  ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-00000000000a', 'view');
