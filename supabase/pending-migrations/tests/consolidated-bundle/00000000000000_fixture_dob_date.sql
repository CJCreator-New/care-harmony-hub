-- Validation fixture for the consolidated bundle (S0-03 to S0-10). NOT a migration.
-- Rebuilt 2026-11-05 from the live policy export: see the POLICY SET note below.
-- Apply scripts/db/supabase-compat-shim.sql first. Run on a scratch PostgreSQL only.
-- Variant: date patients.date_of_birth (date).

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
  date_of_birth date,
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
-- POLICY SET (rebuilt 2026-11-05). Every policy below comes from the live
-- policy export (167 rows, one per table/policy name). Only these are faithful
-- to the live database: the table name, the policy name, the command, the
-- PERMISSIVE flag and the role list.
--
-- PLACEHOLDER BODIES: every USING and WITH CHECK clause is `true`. The bodies
-- are NOT the live rules and carry NO access semantics. Do not read them as a
-- model of hospital, patient or role access. The role-aware rules are what the
-- S0-04 part under test writes, not what this fixture holds.
--
-- Tables that the live list names but the fixture lacked were created here with
-- the minimal columns: id uuid and hospital_id uuid. No foreign keys, no NOT NULL.
-- RLS switches are kept as the earlier fixture had them (no new RLS is enabled
-- for tables that had none).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_equipment_errors ENABLE ROW LEVEL SECURITY;   -- RLS on, zero policies (DB-13)
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.table_name FROM information_schema.columns c
            WHERE c.table_schema = 'public' AND c.column_name = 'hospital_id'
              AND c.table_name NOT IN ('profiles', 'user_roles', 'staff_invitations', 'hospitals',
                                       'mar_administrations', 'lab_equipment_errors', 'prescription_items')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['vital_signs', 'invoice_items', 'purchase_order_items', 'icd10_codes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
-- Tables the bundle's part-01 creates, with part-01's own DDL (copied verbatim, so
-- its IF NOT EXISTS is a no-op). Live already has these tables.
CREATE TABLE IF NOT EXISTS public.lab_critical_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  critical_low NUMERIC,
  critical_high NUMERIC,
  warning_low NUMERIC,
  warning_high NUMERIC,
  unit_of_measure TEXT,
  age_group TEXT,
  gender TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (hospital_id, test_code, age_group, gender)
);
CREATE TABLE IF NOT EXISTS public.lab_critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  lab_order_id UUID REFERENCES public.lab_orders(id) ON DELETE CASCADE,
  lab_result_id UUID,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  result_value NUMERIC,
  result_text TEXT,
  unit TEXT,
  critical_range_id UUID REFERENCES public.lab_critical_ranges(id),
  severity TEXT NOT NULL DEFAULT 'review_required',
  primary_doctor_id UUID REFERENCES public.profiles(id),
  primary_notified_at TIMESTAMPTZ,
  primary_acknowledged_at TIMESTAMPTZ,
  primary_action_taken BOOLEAN DEFAULT FALSE,
  primary_action_notes TEXT,
  on_call_id UUID REFERENCES public.profiles(id),
  on_call_notified_at TIMESTAMPTZ,
  on_call_acknowledged_at TIMESTAMPTZ,
  on_call_action_taken BOOLEAN DEFAULT FALSE,
  on_call_action_notes TEXT,
  er_notified_at TIMESTAMPTZ,
  er_acknowledged_at TIMESTAMPTZ,
  er_action_taken BOOLEAN DEFAULT FALSE,
  er_action_notes TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES public.profiles(id),
  acknowledgment_channel TEXT,
  acknowledgment_notes TEXT,
  acknowledgment_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.lab_alert_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.lab_critical_alerts(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('primary', 'on_call', 'er')),
  target_user_id UUID REFERENCES public.profiles(id),
  scheduled_for TIMESTAMPTZ NOT NULL,
  dispatched_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivery_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Other live tables the fixture lacked: minimal stand-ins (id, hospital_id).
CREATE TABLE public.appointment_no_shows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.appointment_recurrence_patterns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.break_glass_overrides (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.discharge_workflow_tasks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.discharge_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  initiated_by UUID,
  current_step TEXT DEFAULT 'pharmacist' CHECK (current_step IN ('doctor','pharmacist','billing','nurse','completed','cancelled')),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('draft','in_progress','completed','cancelled')),
  last_action_by UUID,
  last_action_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.prescription_approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  initiated_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated','pending_approval','pending_clarification','approved','dispensed','completed','rejected','cancelled')),
  current_step INTEGER DEFAULT 1,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  dur_check_passed BOOLEAN DEFAULT NULL,
  dur_warnings TEXT[],
  clarification_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE public.drug_interaction_cache (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.feature_flags (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.lab_critical_acknowledgements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.lab_critical_escalation_log (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.lab_result_notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.medication_reconciliation_audit (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.medication_reconciliation_workflows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.prescription_dur_reviews (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.system_metrics (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.telehealth_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.telehealth_screen_shares (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);
CREATE TABLE public.telehealth_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), hospital_id uuid);

-- Placeholder policies, one per live row (USING true / WITH CHECK true).
CREATE POLICY "Admins can view activity logs in their hospital" ON public.activity_logs AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can view hospital activity logs" ON public.activity_logs AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can insert activity logs" ON public.activity_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can view own activity logs" ON public.activity_logs AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view their own activity logs" ON public.activity_logs AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "activity_logs_hospital_read" ON public.activity_logs AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "activity_logs_no_delete" ON public.activity_logs AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "activity_logs_no_update" ON public.activity_logs AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "activity_logs_self_insert" ON public.activity_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Hospital staff can create no-shows" ON public.appointment_no_shows AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Hospital staff can update no-shows" ON public.appointment_no_shows AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Hospital staff can view no-shows" ON public.appointment_no_shows AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Hospital staff can create recurrence patterns" ON public.appointment_recurrence_patterns AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Hospital staff can delete recurrence patterns" ON public.appointment_recurrence_patterns AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "Hospital staff can update recurrence patterns" ON public.appointment_recurrence_patterns AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Hospital staff can view recurrence patterns" ON public.appointment_recurrence_patterns AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Patients can create appointment requests" ON public.appointment_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Patients can view their appointment requests" ON public.appointment_requests AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can update appointment requests" ON public.appointment_requests AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view appointment requests" ON public.appointment_requests AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can manage appointments" ON public.appointments AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view appointments in their hospital" ON public.appointments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "audit_logs_authenticated_insert" ON public.audit_logs AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "audit_logs_hospital_admin_read" ON public.audit_logs AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "audit_logs_no_delete" ON public.audit_logs AS PERMISSIVE FOR DELETE TO authenticated USING (true);
CREATE POLICY "audit_logs_no_update" ON public.audit_logs AS PERMISSIVE FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "break_glass_hospital_scope" ON public.break_glass_overrides AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "break_glass_role_restriction" ON public.break_glass_overrides AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Doctors and nurses can manage consultations" ON public.consultations AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view consultations in their hospital" ON public.consultations AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view departments in their hospital" ON public.departments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "discharge_workflow_tasks_hospital_scope" ON public.discharge_workflow_tasks AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "discharge_workflow_tasks_update_own_hospital" ON public.discharge_workflow_tasks AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "discharge_workflows_delete_admin_only" ON public.discharge_workflows AS PERMISSIVE FOR DELETE TO public USING (true);
CREATE POLICY "discharge_workflows_hospital_scope" ON public.discharge_workflows AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "discharge_workflows_update_own_hospital" ON public.discharge_workflows AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Doctors can manage their own availability" ON public.doctor_availability AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view doctor availability" ON public.doctor_availability AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Clinical staff can manage documents" ON public.documents AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view documents in their hospital" ON public.documents AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "drug_interaction_cache_hospital_scope" ON public.drug_interaction_cache AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "drug_interactions_hospital_scope" ON public.drug_interactions AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Admin can manage feature flags" ON public.feature_flags AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated staff can read their hospital flags" ON public.feature_flags AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "feature_flags_admin_write" ON public.feature_flags AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "feature_flags_hospital_or_global_read" ON public.feature_flags AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins and nurses can manage resources" ON public.hospital_resources AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view resources in their hospital" ON public.hospital_resources AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert hospitals" ON public.hospitals AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update their hospital" ON public.hospitals AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Users can view their hospital" ON public.hospitals AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "ICD-10 codes are viewable by authenticated users" ON public.icd10_codes AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Billing staff can manage insurance claims" ON public.insurance_claims AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view insurance claims" ON public.insurance_claims AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can create invoice items" ON public.invoice_items AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can update invoice items" ON public.invoice_items AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view invoice items" ON public.invoice_items AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can create invoices" ON public.invoices AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can update invoices" ON public.invoices AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view invoices in their hospital" ON public.invoices AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "invoices_hospital_billing_read" ON public.invoices AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "lab_alert_escalations_hospital_read" ON public.lab_alert_escalations AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "lab_critical_ack_hospital_read" ON public.lab_critical_acknowledgements AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "lab_critical_ack_physician_update" ON public.lab_critical_acknowledgements AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_critical_alerts_clinical_access" ON public.lab_critical_alerts AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_critical_alerts_hospital_scope" ON public.lab_critical_alerts AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_escalation_log_hospital_read" ON public.lab_critical_escalation_log AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "lab_critical_ranges_hospital_scope" ON public.lab_critical_ranges AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_critical_ranges_insert" ON public.lab_critical_ranges AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Clinical staff can create lab orders" ON public.lab_orders AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Lab techs and clinical staff can update lab orders" ON public.lab_orders AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view lab orders in their hospital" ON public.lab_orders AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "lab_result_notifications_doctor_access" ON public.lab_result_notifications AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "lab_result_notifications_hospital_scope" ON public.lab_result_notifications AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Clinical staff can create medical records" ON public.medical_records AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Clinical staff can update medical records" ON public.medical_records AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view medical records in their hospital" ON public.medical_records AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Nurses can record medication administrations" ON public.medication_administrations AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can view medication administrations" ON public.medication_administrations AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "med_recon_audit_hospital_read" ON public.medication_reconciliation_audit AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "med_recon_doctor_initiate" ON public.medication_reconciliation_workflows AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "med_recon_hospital_read" ON public.medication_reconciliation_workflows AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "med_recon_staff_update" ON public.medication_reconciliation_workflows AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Pharmacists and admins can manage medications" ON public.medications AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view medications in their hospital" ON public.medications AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Recipients can update messages" ON public.messages AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Users can send messages" ON public.messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can view their messages" ON public.messages AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can create notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can update their own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Users can view their own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "notifications_hospital_recipient_read" ON public.notifications AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Patients can view their own consents" ON public.patient_consents AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can manage consents" ON public.patient_consents AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Nurses can manage checklists" ON public.patient_prep_checklists AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view checklists in their hospital" ON public.patient_prep_checklists AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can manage queue" ON public.patient_queue AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view queue in their hospital" ON public.patient_queue AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can insert patients" ON public.patients AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can update patients" ON public.patients AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view patients in their hospital" ON public.patients AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Billing staff can manage payment plans" ON public.payment_plans AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Patients can view their payment plans" ON public.payment_plans AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can view payment plans" ON public.payment_plans AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can create payments" ON public.payments AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can view payments in their hospital" ON public.payments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "prescription_approval_doctor_read" ON public.prescription_approval_workflows AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "prescription_approval_hospital_scope" ON public.prescription_approval_workflows AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "prescription_approval_pharmacist_update" ON public.prescription_approval_workflows AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "prescription_dur_reviews_hospital_scope" ON public.prescription_dur_reviews AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Doctors can create prescription items" ON public.prescription_items AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Pharmacists can update prescription items" ON public.prescription_items AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view prescription items" ON public.prescription_items AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "prescription_items_hospital_isolation" ON public.prescription_items AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Patients can create refill requests" ON public.prescription_refill_requests AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Patients can view their refill requests" ON public.prescription_refill_requests AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Pharmacists and doctors can update refill requests" ON public.prescription_refill_requests AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view refill requests" ON public.prescription_refill_requests AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Doctors can create prescriptions" ON public.prescriptions AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Pharmacists can update prescriptions" ON public.prescriptions AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view prescriptions in their hospital" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "prescriptions_hospital_read_v2" ON public.prescriptions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Users can view profiles in their hospital" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacists and admins can manage purchase order items" ON public.purchase_order_items AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view purchase order items" ON public.purchase_order_items AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Pharmacists and admins can manage purchase orders" ON public.purchase_orders AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view purchase orders" ON public.purchase_orders AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Pharmacists and admins can manage reorder rules" ON public.reorder_rules AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view reorder rules" ON public.reorder_rules AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Nurses can create handovers" ON public.shift_handovers AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Nurses can update handovers" ON public.shift_handovers AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Nurses can view handovers in their hospital" ON public.shift_handovers AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage shift schedules" ON public.shift_schedules AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view shift schedules in their hospital" ON public.shift_schedules AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can create invitations" ON public.staff_invitations AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can update invitations" ON public.staff_invitations AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Admins can view hospital invitations" ON public.staff_invitations AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Pharmacists and admins can manage stock alerts" ON public.stock_alerts AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view stock alerts" ON public.stock_alerts AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Pharmacists and admins can manage suppliers" ON public.suppliers AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view suppliers" ON public.suppliers AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage config" ON public.system_config AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view non-sensitive config" ON public.system_config AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert metrics" ON public.system_metrics AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Admins can view hospital metrics" ON public.system_metrics AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can create task assignments" ON public.task_assignments AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can update task assignments" ON public.task_assignments AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view task assignments in their hospital" ON public.task_assignments AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Session participants can send messages" ON public.telehealth_messages AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Session participants can view messages" ON public.telehealth_messages AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "telehealth_screen_shares_hospital_read" ON public.telehealth_screen_shares AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Hospital staff & approved patients can view telehealth sessions" ON public.telehealth_sessions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Hospital staff can create telehealth sessions" ON public.telehealth_sessions AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Hospital staff can update telehealth sessions" ON public.telehealth_sessions AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Clinical staff can manage telemedicine sessions" ON public.telemedicine_sessions AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view telemedicine sessions" ON public.telemedicine_sessions AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Staff can manage time slots" ON public.time_slots AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view time slots" ON public.time_slots AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage roles in their hospital" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Users can view roles in their hospital" ON public.user_roles AS PERMISSIVE FOR SELECT TO public USING (true);
CREATE POLICY "Clinical staff can manage vital signs" ON public.vital_signs AS PERMISSIVE FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can insert vital signs" ON public.vital_signs AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Staff can update vital signs" ON public.vital_signs AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Staff can view vital signs" ON public.vital_signs AS PERMISSIVE FOR SELECT TO public USING (true);

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
                                       'prescription_items', 'activity_logs', 'payments',
                                       'lab_critical_ranges', 'lab_critical_alerts', 'lab_alert_escalations', 'on_call_schedule', 'lab_critical_alert_events')
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
CREATE FUNCTION register_patient(
  p_user_id uuid, p_first_name text, p_last_name text, p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL, p_date_of_birth date DEFAULT NULL, p_gender text DEFAULT NULL,
  p_address text DEFAULT NULL, p_city text DEFAULT NULL, p_state text DEFAULT NULL,
  p_zip text DEFAULT NULL, p_blood_type text DEFAULT NULL, p_allergies text[] DEFAULT NULL,
  p_chronic_conditions text[] DEFAULT NULL, p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL, p_emergency_contact_relationship text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role_id uuid;
BEGIN
  SELECT id INTO v_role_id FROM roles WHERE name = 'patient' LIMIT 1;
  RETURN NULL;
END $$;
GRANT EXECUTE ON FUNCTION register_patient TO authenticated;

CREATE FUNCTION public.ensure_patient_record_for_user(
  p_user_id UUID, p_first_name TEXT, p_last_name TEXT, p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL, p_date_of_birth DATE DEFAULT NULL, p_gender TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL, p_city TEXT DEFAULT NULL, p_state TEXT DEFAULT NULL,
  p_zip TEXT DEFAULT NULL, p_blood_type TEXT DEFAULT NULL, p_allergies TEXT[] DEFAULT NULL,
  p_chronic_conditions TEXT[] DEFAULT NULL, p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL, p_emergency_contact_relationship TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.hospitals ORDER BY created_at LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.ensure_patient_record_for_user(
  UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT) TO authenticated;

CREATE FUNCTION public.assign_patient_role(p_user_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (p_user_id, 'patient');
END $$;
GRANT EXECUTE ON FUNCTION public.assign_patient_role(UUID) TO authenticated;
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

ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_value_notifications ENABLE ROW LEVEL SECURITY;

-- profiles.is_active exists in the live schema (the S0-10 guard names it).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
