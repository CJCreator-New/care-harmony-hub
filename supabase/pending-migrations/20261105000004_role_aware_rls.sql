-- =============================================================================
-- PENDING MIGRATION (not in supabase/migrations/, so neither the Supabase CLI
-- nor the Lovable sync applies it). Read supabase/pending-migrations/README.md
-- and the sibling notes 20261105000004.README.md before promoting it.
--
-- 20261105000004_role_aware_rls.sql
-- Roadmap S0-04 (DB-02, DB-07, DB-09, DB-13, DB-16): make RLS role-aware.
--
--   A. Helpers        STABLE SECURITY DEFINER functions with SET search_path = ''
--                     that resolve the caller into one of three principals:
--                       active staff  a user_roles row (role <> 'patient') whose
--                                     hospital_id is the row's hospital, and a
--                                     profile that is not deactivated;
--                       patient       patients.user_id = auth.uid(), profile
--                                     not deactivated;
--                       inactive      everyone else: no rows anywhere.
--   B. user_belongs_to_hospital(_user_id, _hospital_id) is redefined (same
--      parameter names, so CREATE OR REPLACE is legal) to mean "active staff of
--      that hospital". Every live policy that still calls it stops matching
--      patients and deactivated staff (DB-02, issue 06 / SEC-008).
--   C. Owned tables   for 39 tables in the live type snapshot plus lab_queue and
--                     prescription_queue, EVERY permissive policy is dropped
--                     (backed up first) and replaced by the per-role, per-command
--                     policies listed in rls_migration_audit.s004_policy_spec.
--                     Fixes the invoice/billing boundary (DB-07), the FOR ALL
--                     membership policies (DB-09) and the dead or mis-keyed
--                     policies on those tables (DB-16).
--   D. DB-13          RLS is enabled on every public table that lacks it.
--                     Known reference tables get read-only access, known PHI and
--                     ops tables get role-scoped policies, everything else is
--                     deny-by-default.
--   E. Guard          every other hospital- or patient-keyed table that still
--                     carries policies this file does not own gets a RESTRICTIVE
--                     policy s004_active_principal_guard, so whatever its live
--                     permissive policies say, inactive users and patients
--                     cannot reach rows outside their own scope.
--
-- Not touched (owned elsewhere): profiles, user_roles, staff_invitations,
-- hospitals (S0-03, tenant key and role-bearing rows), two_factor_secrets and
-- mfa_* (S0-10). RESTRICTIVE policies already present (e.g. S0-10's
-- mfa_aal2_required) are kept: they only narrow access further.
--
-- Idempotent: helpers use CREATE OR REPLACE behind a signature guard, policies
-- are dropped by name and recreated, bookkeeping tables are IF NOT EXISTS.
-- Applying it twice is a no-op (the second run drops and recreates the s004_*
-- policies and finds nothing else to sweep).
--
-- Mode switch (default: abort). Read at the start of the file.
-- 'abort' (default): section 0a lists every permissive policy on the owned tables
--   whose name is not in the reviewed list (names only) and RAISEs before anything
--   changes. Section C repeats the same check before it drops anything.
-- 'sweep' (explicit only): permissive policies on owned tables that are not s004_*
--   are backed up to rls_migration_audit.s004_dropped_policies and dropped, including
--   names that are not on the reviewed list. Set it only by a deliberate decision in
--   the same session, before the file runs. The consolidated bundle never sets it.
--
-- Prerequisites (live schema): auth.uid(), public.profiles(id, user_id),
-- public.user_roles(user_id, role, hospital_id), public.patients(id, user_id,
-- hospital_id). The file checks them and aborts if any is missing.
-- =============================================================================

-- =============================================================================
-- PRE-FLIGHT (read-only; run against production or the S0-01 capture BEFORE
-- promoting this file, and record the answers in the S0-04 ticket).
-- =============================================================================
-- 1. Current policies on the tables this file takes over (compare with the
--    spec; anything not in s004_repo_policy_names is live-only drift):
--      SELECT tablename, policyname, permissive, cmd, roles, qual, with_check
--        FROM pg_policies WHERE schemaname = 'public'
--         AND tablename IN ('appointment_requests','appointments','consultations',
--           'departments','doctor_availability','documents','hospital_resources',
--           'icd10_codes','insurance_claims','invoice_items','invoices','lab_orders',
--           'medical_records','medication_administrations','medications','messages',
--           'notifications','patient_consents','patient_prep_checklists',
--           'patient_queue','patients','payment_plans','payments','prescription_items',
--           'prescription_refill_requests','prescriptions','purchase_order_items',
--           'purchase_orders','reorder_rules','shift_handovers','shift_schedules',
--           'stock_alerts','suppliers','system_config','task_assignments',
--           'telemedicine_sessions','time_slots','vital_signs','lab_queue',
--           'prescription_queue')
--       ORDER BY 1, 2;
-- 2. Public tables with RLS off (DB-13). Each becomes deny-by-default unless it
--    is classified in section D:
--      SELECT c.relname, c.relkind, c.relispartition FROM pg_class c
--        JOIN pg_namespace n ON n.oid = c.relnamespace
--       WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity
--       ORDER BY 1;
-- 3. Staff role rows without a hospital. These users LOSE all hospital access
--    (membership comes from user_roles.hospital_id). Backfill first:
--      SELECT ur.user_id, ur.role, p.hospital_id AS profile_hospital
--        FROM public.user_roles ur LEFT JOIN public.profiles p USING (user_id)
--       WHERE ur.role::text <> 'patient' AND ur.hospital_id IS NULL;
--      -- backfill (review each row; profiles.hospital_id was user-writable, DB-01):
--      -- UPDATE public.user_roles ur SET hospital_id = p.hospital_id
--      --   FROM public.profiles p WHERE p.user_id = ur.user_id
--      --    AND ur.hospital_id IS NULL AND ur.role::text <> 'patient';
-- 4. Staff whose role hospital differs from their profile hospital (possible
--    DB-01 tampering, or legitimate multi-hospital staff):
--      SELECT ur.user_id, ur.role, ur.hospital_id, p.hospital_id
--        FROM public.user_roles ur JOIN public.profiles p USING (user_id)
--       WHERE ur.role::text <> 'patient' AND p.hospital_id IS DISTINCT FROM ur.hospital_id;
-- 5. Does profiles.is_active exist, and how many rows are NULL / false?
--      SELECT count(*) FILTER (WHERE (to_jsonb(p)->>'is_active') IS NULL) AS null_or_missing,
--             count(*) FILTER (WHERE (to_jsonb(p)->>'is_active') = 'false') AS inactive
--        FROM public.profiles p;
-- 6. Patient portal users without a linked patients row (they will see nothing):
--      SELECT ur.user_id FROM public.user_roles ur
--       WHERE ur.role::text = 'patient'
--         AND NOT EXISTS (SELECT 1 FROM public.patients pt WHERE pt.user_id = ur.user_id);
-- 7. Who can write user_roles? Role checks are only as strong as that. Expect no
--    client INSERT/UPDATE policy except a hospital-scoped admin one (S0-03):
--      SELECT policyname, cmd, qual, with_check FROM pg_policies
--       WHERE schemaname = 'public' AND tablename = 'user_roles';
-- 8. Signature of user_belongs_to_hospital (must be _user_id, _hospital_id):
--      SELECT pg_get_function_identity_arguments('public.user_belongs_to_hospital'::regproc);
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Prerequisites: fail loudly instead of half-applying.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  req constant text[][] := ARRAY[
    ARRAY['profiles', 'id'], ARRAY['profiles', 'user_id'],
    ARRAY['user_roles', 'user_id'], ARRAY['user_roles', 'role'], ARRAY['user_roles', 'hospital_id'],
    ARRAY['patients', 'id'], ARRAY['patients', 'user_id'], ARRAY['patients', 'hospital_id']];
  i int;
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL THEN missing := missing || 'function auth.uid()'::text; END IF;
  FOR i IN 1 .. array_length(req, 1) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = req[i][1] AND column_name = req[i][2]) THEN
      missing := missing || format('public.%s.%s', req[i][1], req[i][2]);
    END IF;
  END LOOP;
  IF array_length(missing, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'role_aware_rls: missing prerequisites: %', array_to_string(missing, ', ');
  END IF;
  IF coalesce(nullif(current_setting('s0_04.unknown_policy_mode', true), ''), 'abort') NOT IN ('sweep', 'abort') THEN
    RAISE EXCEPTION 's0_04.unknown_policy_mode must be sweep or abort';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 0a. Reviewed policy names and the abort guard (default mode: abort).
--     Runs before ANY change in this file. The temp table holds the reviewed list:
--     policy names found in the repository history (supabase/migrations, legacy/)
--     on the owned tables. If a permissive policy on an owned table is not on the
--     list, the guard raises and nothing below runs. The bundle runs this part in
--     one transaction, so a raise also leaves the rest of part-04 unapplied.
--     Sweep mode runs only when a session sets s0_04.unknown_policy_mode = 'sweep'
--     explicitly. No bundle sets it.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS pg_temp.s004_reviewed_names;
-- S004-REVIEWED-NAMES-BEGIN
CREATE TEMP TABLE s004_reviewed_names AS
SELECT DISTINCT t AS tablename, unnest(names) AS policyname FROM (VALUES
  ('appointment_requests', ARRAY['Patients can create appointment requests','Patients can view their appointment requests','Staff can update appointment requests','Staff can view appointment requests']),
  ('appointments', ARRAY['Patients can view their own appointments','Receptionists can insert appointments','Receptionists can update appointments','Staff can manage appointments','Staff can view appointments in their hospital','Users can view appointments','appointments_hospital_isolation','appointments_patient_view']),
  ('consultations', ARRAY['Doctors and nurses can manage consultations','Involved staff can view consultations','Patients can view their own consultations','Staff can view consultations in their hospital','lab_technician_view_consultations','pharmacist_view_consultations']),
  ('departments', ARRAY['Admins can manage departments','Departments hospital scoped','Staff can view departments in their hospital']),
  ('doctor_availability', ARRAY['Doctor availability hospital scoped','Doctors can manage their own availability','Staff can view doctor availability']),
  ('documents', ARRAY['Clinical staff can manage documents','Documents hospital scoped','Staff can view documents in their hospital']),
  ('hospital_resources', ARRAY['Admins and nurses can manage resources','Hospital resources hospital scoped','Staff can view resources in their hospital']),
  ('icd10_codes', ARRAY['ICD-10 codes are viewable by authenticated users','ICD-10 codes viewable by hospital users']),
  ('insurance_claims', ARRAY['Billing staff can create claims','Billing staff can manage insurance claims','Billing staff can view claims','Insurance claims hospital scoped','Staff can view insurance claims']),
  ('invoice_items', ARRAY['Staff can create invoice items','Staff can update invoice items','Staff can view invoice items']),
  ('invoices', ARRAY['Patients can view their own invoices','Staff can create invoices','Staff can update invoices','Staff can view invoices in their hospital','invoices_hospital_billing_read','invoices_hospital_staff_policy']),
  ('lab_orders', ARRAY['Clinical staff can create lab orders','Lab techs and clinical staff can update lab orders','Patients can view their own lab orders','Staff can view lab orders in their hospital','patient_view_own_lab_orders']),
  ('medical_records', ARRAY['Clinical staff can create medical records','Clinical staff can update medical records','Clinical staff can view medical records','Staff can view medical records in their hospital']),
  ('medication_administrations', ARRAY['Nurses can record medication administrations','Staff can view medication administrations']),
  ('medications', ARRAY['Medications hospital scoped','Pharmacists and admins can manage medications','Staff can view medications in their hospital']),
  ('messages', ARRAY['Messages hospital scoped','Recipients can update messages','Users can send messages','Users can view their messages','messages_hospital_access','messages_user_access']),
  ('notifications', ARRAY['Notifications recipient access','Staff can create notifications','Users can update own notifications','Users can update their own notifications','Users can view own notifications','Users can view their own notifications','notifications_hospital_recipient_read']),
  ('patient_consents', ARRAY['Patients can insert own consents','Patients can update own consents','Patients can view their own consents','Staff can insert consents','Staff can manage consents','Staff can update consents']),
  ('patient_prep_checklists', ARRAY['Nurses can manage checklists','Patient prep checklists hospital scoped','Staff can view checklists in their hospital']),
  ('patient_queue', ARRAY['Patient queue hospital scoped','Staff can manage queue','Staff can view queue in their hospital']),
  ('patients', ARRAY['Patients can update their own contact info','Patients can view their own patient record','Staff can insert patients','Staff can update patients','Staff can view patients in their hospital','lab_technician_view_patients']),
  ('payment_plans', ARRAY['Billing staff can manage payment plans','Patients can view their payment plans','Payment plans hospital scoped','Staff can view payment plans']),
  ('payments', ARRAY['Patients can view their own payments','Staff can create payments','Staff can view payments in their hospital']),
  ('prescription_items', ARRAY['Doctors can create prescription items','Patients can view their own prescription items','Pharmacists can update prescription items','Staff can view prescription items','prescription_items_hospital_isolation']),
  ('prescription_refill_requests', ARRAY['Patients can create refill requests','Patients can view own refill requests','Patients can view their refill requests','Pharmacists and doctors can update refill requests','Pharmacists can update refill requests','Staff can view refill requests']),
  ('prescriptions', ARRAY['Clinical staff can view prescriptions','Doctors can create prescriptions','Patients can view their own prescriptions','Pharmacists can insert prescriptions','Pharmacists can update prescriptions','Pharmacists can view prescriptions','Staff can view prescriptions in their hospital','prescriptions_hospital_read_v2']),
  ('purchase_order_items', ARRAY['Pharmacists and admins can manage purchase order items','Purchase order items hospital scoped','Staff can view purchase order items']),
  ('purchase_orders', ARRAY['Pharmacists and admins can manage purchase orders','Purchase orders hospital scoped','Staff can view purchase orders']),
  ('reorder_rules', ARRAY['Pharmacists and admins can manage reorder rules','Reorder rules hospital scoped','Staff can view reorder rules']),
  ('shift_handovers', ARRAY['Nurses can create handovers','Nurses can update handovers','Nurses can view handovers in their hospital','Shift handovers hospital scoped']),
  ('shift_schedules', ARRAY['Admins can manage shift schedules','Shift schedules hospital scoped','Staff can view shift schedules in their hospital']),
  ('stock_alerts', ARRAY['Pharmacists and admins can manage stock alerts','Staff can view stock alerts','Stock alerts hospital scoped']),
  ('suppliers', ARRAY['Pharmacists and admins can manage suppliers','Staff can view suppliers','Suppliers hospital scoped']),
  ('system_config', ARRAY['Admins can manage config','Staff can view non-sensitive config','System config hospital scoped']),
  ('task_assignments', ARRAY['Staff can create task assignments','Staff can update task assignments','Staff can view task assignments in their hospital','Task assignments hospital scoped','Users can create tasks','Users can update their tasks','Users can view their tasks']),
  ('telemedicine_sessions', ARRAY['Clinical staff can manage telemedicine sessions','Staff can view telemedicine sessions','Telemedicine sessions hospital scoped','Users can view their telemedicine sessions']),
  ('time_slots', ARRAY['Staff can manage time slots','Staff can view time slots','Time slots hospital scoped']),
  ('vital_signs', ARRAY['Clinical staff can manage vital signs','Healthcare staff can insert patient vital signs','Healthcare staff can view patient vital signs','Nurses can insert vital signs','Nurses can view vital signs for their patients','Patients can view their own vital signs','Staff can insert vital signs','Staff can update vital signs','Staff can view vital signs']),
  ('lab_queue', ARRAY['Hospital staff can view lab queue','Hospital staff can insert into lab queue','Lab techs can update lab queue','lab_queue_hospital_access','lab_queue_lab_tech_write']),
  ('prescription_queue', ARRAY['Hospital staff can view prescription queue','Hospital staff can insert into prescription queue','Pharmacist can update prescription queue status','hospital_staff_prescription_queue_access'])
) AS v(t, names);
-- S004-REVIEWED-NAMES-END

DO $$
DECLARE
  v_mode constant text := coalesce(nullif(current_setting('s0_04.unknown_policy_mode', true), ''), 'abort');
  v_unknown text[];
BEGIN
  IF v_mode = 'sweep' THEN
    RAISE NOTICE 's0_04: sweep mode set explicitly; policies not on the reviewed list will be backed up and dropped';
    RETURN;
  END IF;
  SELECT array_agg(format('%I.%I', p.tablename, p.policyname) ORDER BY p.tablename, p.policyname)
    INTO v_unknown
    FROM pg_policies p
   WHERE p.schemaname = 'public'
     AND p.permissive = 'PERMISSIVE'
     AND p.policyname NOT LIKE 's004\_%'
     AND p.tablename IN (SELECT r.tablename FROM pg_temp.s004_reviewed_names r)
     AND NOT EXISTS (SELECT 1 FROM pg_temp.s004_reviewed_names k
                      WHERE k.tablename = p.tablename AND k.policyname = p.policyname);
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'role_aware_rls: ABORTED, nothing changed. % policy name(s) on the owned tables are not in the reviewed list: %',
      array_length(v_unknown, 1), array_to_string(v_unknown, ', ')
      USING HINT = 'Each entry is table.policy. Compare with the preflight rows in part-04 and with 20261105000004.README.md, step 3. Add a name to the reviewed list only after reviewing it. Sweep mode is a deliberate, explicit choice, never a fallback.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 0b. Bookkeeping, in a schema PostgREST does not expose. Not readable by
--     anon/authenticated.
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS rls_migration_audit;
REVOKE ALL ON SCHEMA rls_migration_audit FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON SCHEMA rls_migration_audit FROM anon, authenticated';
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS rls_migration_audit.s004_dropped_policies (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dropped_at  timestamptz NOT NULL DEFAULT now(),
  tablename   text NOT NULL,
  policyname  text NOT NULL,
  permissive  text NOT NULL,
  cmd         text NOT NULL,
  roles       text[] NOT NULL,
  qual        text,
  with_check  text,
  in_repo_history boolean NOT NULL,
  recreate_sql text NOT NULL
);
COMMENT ON TABLE rls_migration_audit.s004_dropped_policies IS
  'S0-04: every policy the role-aware RLS migration dropped, with SQL to recreate it.';

CREATE TABLE IF NOT EXISTS rls_migration_audit.s004_run_log (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  logged_at timestamptz NOT NULL DEFAULT now(),
  section   text NOT NULL,
  tablename text,
  action    text NOT NULL,
  detail    text
);

CREATE TABLE IF NOT EXISTS rls_migration_audit.s004_policy_spec (
  tablename  text NOT NULL,
  policyname text NOT NULL,
  cmd        text NOT NULL CHECK (cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  using_expr text,
  check_expr text,
  PRIMARY KEY (tablename, policyname)
);
COMMENT ON TABLE rls_migration_audit.s004_policy_spec IS
  'S0-04: the exact policy set the migration installs on the tables it owns (all TO authenticated, PERMISSIVE).';

-- Policy names on the owned tables that appear anywhere in supabase/migrations
-- (including legacy/). Used only to label dropped policies as "known" or
-- "live-only drift" and for the abort mode.
CREATE TABLE IF NOT EXISTS rls_migration_audit.s004_repo_policy_names (
  tablename  text NOT NULL,
  policyname text NOT NULL,
  PRIMARY KEY (tablename, policyname)
);

-- 0c. Copy the reviewed list into bookkeeping. Reached only if the guard in 0a passed.
DELETE FROM rls_migration_audit.s004_repo_policy_names;
INSERT INTO rls_migration_audit.s004_repo_policy_names (tablename, policyname)
SELECT tablename, policyname FROM pg_temp.s004_reviewed_names
ON CONFLICT DO NOTHING;

-- =============================================================================
-- A. Helpers
-- =============================================================================
-- Guard against the DB-03 failure mode: CREATE OR REPLACE cannot rename
-- parameters or change the return type. If a function with one of these names
-- already exists with a different signature, stop and let the operator decide.
DO $$
DECLARE
  r record;
  expected constant jsonb := jsonb_build_object(
    'profile_is_active',          '_user_id uuid',
    'is_active_principal',        '',
    'current_profile_id',         '',
    'my_staff_hospital_ids',      '_roles text[]',
    'is_active_staff_of',         '_hospital_id uuid, _roles text[]',
    'has_any_role',               '_roles text[], _hospital_id uuid',
    'my_patient_ids',             '',
    'my_patient_hospital_ids',    '',
    'is_patient_self',            '_patient_id uuid',
    'user_is_staff_of',           '_user_id uuid, _hospital_id uuid',
    'user_is_member_of',          '_user_id uuid, _hospital_id uuid',
    'patient_hospital_id',        '_patient_id uuid',
    'prescription_hospital_id',   '_prescription_id uuid',
    'prescription_patient_id',    '_prescription_id uuid',
    'invoice_hospital_id',        '_invoice_id uuid',
    'invoice_patient_id',         '_invoice_id uuid',
    'purchase_order_hospital_id', '_purchase_order_id uuid',
    'user_belongs_to_hospital',   '_user_id uuid, _hospital_id uuid');
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND expected ? p.proname
  LOOP
    IF r.args <> (expected ->> r.proname) THEN
      RAISE EXCEPTION 'role_aware_rls: public.%(%) exists with a different signature than this file expects (%). Reconcile with the S0-01 capture: drop or rename it deliberately, then rerun.',
        r.proname, r.args, expected ->> r.proname;
    END IF;
  END LOOP;
END
$$;

-- Profile not deactivated. Reads is_active through to_jsonb so the function
-- works whether or not the column exists live (S0-03 owns that column); a
-- missing column or NULL counts as active, an explicit false as inactive.
-- No profile row at all counts as inactive.
CREATE OR REPLACE FUNCTION public.profile_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.user_id = _user_id
       AND coalesce((to_jsonb(p) ->> 'is_active')::boolean, true))
$$;

-- Hospitals in which the caller is active staff, optionally limited to roles.
-- Use in policies as: hospital_id IN (SELECT public.my_staff_hospital_ids(ARRAY[...]))
-- (an uncorrelated subquery, so it runs once per statement, not once per row).
CREATE OR REPLACE FUNCTION public.my_staff_hospital_ids(_roles text[] DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT DISTINCT ur.hospital_id
    FROM public.user_roles ur
   WHERE ur.user_id = auth.uid()
     AND ur.hospital_id IS NOT NULL
     AND ur.role::text <> 'patient'
     AND (_roles IS NULL OR ur.role::text = ANY (_roles))
     AND public.profile_is_active(ur.user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff_of(_hospital_id uuid, _roles text[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT _hospital_id IS NOT NULL
     AND _hospital_id IN (SELECT public.my_staff_hospital_ids(_roles))
$$;

-- Patient records linked to the caller (portal principal).
CREATE OR REPLACE FUNCTION public.my_patient_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT pt.id FROM public.patients pt
   WHERE pt.user_id = auth.uid()
     AND public.profile_is_active(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.my_patient_hospital_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT DISTINCT pt.hospital_id FROM public.patients pt
   WHERE pt.user_id = auth.uid()
     AND pt.hospital_id IS NOT NULL
     AND public.profile_is_active(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_patient_self(_patient_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT _patient_id IS NOT NULL AND _patient_id IN (SELECT public.my_patient_ids())
$$;

-- Caller holds one of the roles (staff roles: in some hospital, or in the given
-- one) and is active. 'patient' in _roles means "is linked to a patient record".
CREATE OR REPLACE FUNCTION public.has_any_role(_roles text[], _hospital_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.my_staff_hospital_ids(_roles) h
                  WHERE _hospital_id IS NULL OR h = _hospital_id)
      OR ('patient' = ANY (_roles)
          AND EXISTS (SELECT 1 FROM public.my_patient_hospital_ids() h
                       WHERE _hospital_id IS NULL OR h = _hospital_id))
$$;

-- Active staff anywhere, or an active linked patient. Used for reference data.
CREATE OR REPLACE FUNCTION public.is_active_principal()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.my_staff_hospital_ids(NULL))
      OR EXISTS (SELECT 1 FROM public.my_patient_ids())
$$;

-- profiles.id of the caller (doctor_id, assigned_to, uploaded_by ... hold profile ids).
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1
$$;

-- Membership of ANOTHER user (message/notification recipients).
CREATE OR REPLACE FUNCTION public.user_is_staff_of(_user_id uuid, _hospital_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = _user_id
       AND ur.hospital_id = _hospital_id
       AND ur.role::text <> 'patient')
     AND public.profile_is_active(_user_id)
$$;

CREATE OR REPLACE FUNCTION public.user_is_member_of(_user_id uuid, _hospital_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.user_is_staff_of(_user_id, _hospital_id)
      OR (public.profile_is_active(_user_id)
          AND EXISTS (SELECT 1 FROM public.patients pt
                       WHERE pt.user_id = _user_id AND pt.hospital_id = _hospital_id))
$$;

-- Parent lookups for child tables. The parent row decides the tenant and the
-- patient, never a hospital_id the client stamped on the child (DB-09).
CREATE OR REPLACE FUNCTION public.patient_hospital_id(_patient_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT pt.hospital_id FROM public.patients pt WHERE pt.id = _patient_id $$;

-- The remaining parent lookups are created only when the parent table exists.
DO $$
BEGIN
  IF to_regclass('public.prescriptions') IS NOT NULL THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.prescription_hospital_id(_prescription_id uuid)
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
      AS $b$ SELECT rx.hospital_id FROM public.prescriptions rx WHERE rx.id = _prescription_id $b$ $f$;
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.prescription_patient_id(_prescription_id uuid)
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
      AS $b$ SELECT rx.patient_id FROM public.prescriptions rx WHERE rx.id = _prescription_id $b$ $f$;
  END IF;
  IF to_regclass('public.invoices') IS NOT NULL THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.invoice_hospital_id(_invoice_id uuid)
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
      AS $b$ SELECT i.hospital_id FROM public.invoices i WHERE i.id = _invoice_id $b$ $f$;
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.invoice_patient_id(_invoice_id uuid)
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
      AS $b$ SELECT i.patient_id FROM public.invoices i WHERE i.id = _invoice_id $b$ $f$;
  END IF;
  IF to_regclass('public.purchase_orders') IS NOT NULL THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.purchase_order_hospital_id(_purchase_order_id uuid)
      RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
      AS $b$ SELECT po.hospital_id FROM public.purchase_orders po WHERE po.id = _purchase_order_id $b$ $f$;
  END IF;
END
$$;

-- Grants. Helpers that only describe the caller are callable by anon too, so a
-- guard policy evaluated for an anon request returns "no rows" instead of a
-- permission error. Helpers that describe OTHER users or rows are not.
DO $$
DECLARE
  f text;
  self_only constant text[] := ARRAY[
    'public.profile_is_active(uuid)', 'public.my_staff_hospital_ids(text[])',
    'public.is_active_staff_of(uuid, text[])', 'public.has_any_role(text[], uuid)',
    'public.my_patient_ids()', 'public.my_patient_hospital_ids()',
    'public.is_patient_self(uuid)', 'public.is_active_principal()',
    'public.current_profile_id()'];
  others constant text[] := ARRAY[
    'public.user_is_staff_of(uuid, uuid)', 'public.user_is_member_of(uuid, uuid)',
    'public.patient_hospital_id(uuid)', 'public.prescription_hospital_id(uuid)',
    'public.prescription_patient_id(uuid)', 'public.invoice_hospital_id(uuid)',
    'public.invoice_patient_id(uuid)', 'public.purchase_order_hospital_id(uuid)'];
BEGIN
  FOREACH f IN ARRAY self_only || others LOOP
    IF to_regprocedure(f) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f);
    IF f = ANY (self_only) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', f);
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    END IF;
  END LOOP;
  -- profile_is_active answers for any user id: keep it off the API.
  EXECUTE 'REVOKE ALL ON FUNCTION public.profile_is_active(uuid) FROM anon, authenticated';
END
$$;

-- =============================================================================
-- B. user_belongs_to_hospital: active staff only (DB-02, SEC-008, issue 06)
-- =============================================================================
-- Same parameter names as the live function (types.ts: _user_id, _hospital_id),
-- so CREATE OR REPLACE is legal; the guard above aborts if live differs.
-- Before: "has a profile row with this hospital_id" (self-writable, no role, no
-- is_active). After: active non-patient role in that hospital.
CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital(_user_id uuid, _hospital_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.user_is_staff_of(_user_id, _hospital_id) $$;

COMMENT ON FUNCTION public.user_belongs_to_hospital(uuid, uuid) IS
  'S0-04: true only for active staff (non-patient user_roles row for that hospital, profile not deactivated).';

-- =============================================================================
-- C. Owned tables: per-role, per-command policies
-- =============================================================================
-- Role -> table matrix: see 20261105000004.README.md. Macros used to build the
-- spec (session-local, gone at disconnect):
--   staff(col, roles)  col IN (SELECT public.my_staff_hospital_ids(ARRAY[roles]))
--                      roles '*' = any staff role
--   self(col)          col IN (SELECT public.my_patient_ids())
CREATE OR REPLACE FUNCTION pg_temp.s004_staff(p_col text, p_roles text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT format('(%s IN (SELECT public.my_staff_hospital_ids(%s)))', p_col,
    CASE WHEN p_roles = '*' THEN 'NULL::text[]'
         ELSE 'ARRAY[' || (SELECT string_agg(quote_literal(btrim(x)), ', ')
                             FROM unnest(string_to_array(p_roles, ',')) x) || ']::text[]' END)
$$;
CREATE OR REPLACE FUNCTION pg_temp.s004_self(p_col text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT format('(%s IN (SELECT public.my_patient_ids()))', p_col)
$$;

DELETE FROM rls_migration_audit.s004_policy_spec;

INSERT INTO rls_migration_audit.s004_policy_spec (tablename, policyname, cmd, using_expr, check_expr)
SELECT t, p, c, u, k FROM (VALUES
  -- ---------------------------------------------------------------- patients
  ('patients', 's004_patients_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist,pharmacist,lab_technician'), NULL),
  ('patients', 's004_patients_self_select', 'SELECT', pg_temp.s004_self('id'), NULL),
  ('patients', 's004_patients_staff_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('patients', 's004_patients_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'),
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('patients', 's004_patients_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  -- ---------------------------------------------------------------- appointments
  ('appointments', 's004_appointments_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'), NULL),
  ('appointments', 's004_appointments_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('appointments', 's004_appointments_staff_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('appointments', 's004_appointments_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'),
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('appointments', 's004_appointments_staff_delete', 'DELETE',
     pg_temp.s004_staff('hospital_id', 'admin,receptionist'), NULL),
  -- ---------------------------------------------------------------- appointment_requests
  ('appointment_requests', 's004_appointment_requests_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'), NULL),
  ('appointment_requests', 's004_appointment_requests_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('appointment_requests', 's004_appointment_requests_self_insert', 'INSERT', NULL,
     pg_temp.s004_self('patient_id') || ' AND hospital_id = public.patient_hospital_id(patient_id)'
       || ' AND coalesce(status, ''pending'') = ''pending'''),
  ('appointment_requests', 's004_appointment_requests_staff_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,nurse,receptionist')),
  ('appointment_requests', 's004_appointment_requests_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'),
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('appointment_requests', 's004_appointment_requests_self_cancel', 'UPDATE',
     pg_temp.s004_self('patient_id') || ' AND coalesce(status, ''pending'') = ''pending''',
     pg_temp.s004_self('patient_id') || ' AND hospital_id = public.patient_hospital_id(patient_id)'
       || ' AND status IN (''pending'', ''cancelled'')'),
  ('appointment_requests', 's004_appointment_requests_admin_delete', 'DELETE',
     pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  -- ---------------------------------------------------------------- consultations
  ('consultations', 's004_consultations_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,pharmacist,lab_technician'), NULL),
  ('consultations', 's004_consultations_doctor_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'doctor')),
  ('consultations', 's004_consultations_doctor_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'doctor'), pg_temp.s004_staff('hospital_id', 'doctor')),
  -- ---------------------------------------------------------------- prescriptions (ADR-0004)
  ('prescriptions', 's004_prescriptions_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,pharmacist'), NULL),
  ('prescriptions', 's004_prescriptions_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('prescriptions', 's004_prescriptions_doctor_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'doctor')),
  ('prescriptions', 's004_prescriptions_clinical_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'doctor,pharmacist'), pg_temp.s004_staff('hospital_id', 'doctor,pharmacist')),
  -- ---------------------------------------------------------------- prescription_items (DB-09)
  ('prescription_items', 's004_prescription_items_staff_select', 'SELECT',
     pg_temp.s004_staff('public.prescription_hospital_id(prescription_id)', 'admin,doctor,nurse,pharmacist'), NULL),
  ('prescription_items', 's004_prescription_items_self_select', 'SELECT',
     pg_temp.s004_self('public.prescription_patient_id(prescription_id)'), NULL),
  ('prescription_items', 's004_prescription_items_doctor_insert', 'INSERT', NULL,
     pg_temp.s004_staff('public.prescription_hospital_id(prescription_id)', 'doctor')),
  ('prescription_items', 's004_prescription_items_clinical_update', 'UPDATE',
     pg_temp.s004_staff('public.prescription_hospital_id(prescription_id)', 'doctor,pharmacist'),
     pg_temp.s004_staff('public.prescription_hospital_id(prescription_id)', 'doctor,pharmacist')),
  -- ---------------------------------------------------------------- lab_orders
  ('lab_orders', 's004_lab_orders_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,lab_technician'), NULL),
  ('lab_orders', 's004_lab_orders_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('lab_orders', 's004_lab_orders_doctor_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'doctor')),
  ('lab_orders', 's004_lab_orders_clinical_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'doctor,nurse,lab_technician'),
     pg_temp.s004_staff('hospital_id', 'doctor,nurse,lab_technician')),
  -- ---------------------------------------------------------------- medical_records
  ('medical_records', 's004_medical_records_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), NULL),
  ('medical_records', 's004_medical_records_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('medical_records', 's004_medical_records_clinical_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'doctor,nurse')),
  ('medical_records', 's004_medical_records_self_insert', 'INSERT', NULL,
     pg_temp.s004_self('patient_id') || ' AND hospital_id = public.patient_hospital_id(patient_id)'
       || ' AND source = ''patient_portal'''),
  ('medical_records', 's004_medical_records_clinical_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'doctor,nurse'), pg_temp.s004_staff('hospital_id', 'doctor,nurse')),
  -- ---------------------------------------------------------------- vital_signs (no hospital_id live: via patient)
  ('vital_signs', 's004_vital_signs_staff_select', 'SELECT',
     pg_temp.s004_staff('public.patient_hospital_id(patient_id)', 'admin,doctor,nurse'), NULL),
  ('vital_signs', 's004_vital_signs_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('vital_signs', 's004_vital_signs_clinical_insert', 'INSERT', NULL,
     pg_temp.s004_staff('public.patient_hospital_id(patient_id)', 'doctor,nurse')),
  ('vital_signs', 's004_vital_signs_self_insert', 'INSERT', NULL, pg_temp.s004_self('patient_id')),
  ('vital_signs', 's004_vital_signs_clinical_update', 'UPDATE',
     pg_temp.s004_staff('public.patient_hospital_id(patient_id)', 'doctor,nurse'),
     pg_temp.s004_staff('public.patient_hospital_id(patient_id)', 'doctor,nurse')),
  -- ---------------------------------------------------------------- documents
  ('documents', 's004_documents_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), NULL),
  ('documents', 's004_documents_self_select', 'SELECT',
     pg_temp.s004_self('patient_id') || ' AND is_confidential IS NOT TRUE', NULL),
  ('documents', 's004_documents_staff_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('documents', 's004_documents_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse')),
  ('documents', 's004_documents_delete', 'DELETE',
     pg_temp.s004_staff('hospital_id', 'admin') || ' OR (' || pg_temp.s004_staff('hospital_id', '*')
       || ' AND uploaded_by = (SELECT public.current_profile_id()))', NULL),
  -- ---------------------------------------------------------------- patient_consents
  ('patient_consents', 's004_patient_consents_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'), NULL),
  ('patient_consents', 's004_patient_consents_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('patient_consents', 's004_patient_consents_staff_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('patient_consents', 's004_patient_consents_self_insert', 'INSERT', NULL,
     pg_temp.s004_self('patient_id') || ' AND hospital_id = public.patient_hospital_id(patient_id)'),
  ('patient_consents', 's004_patient_consents_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'),
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('patient_consents', 's004_patient_consents_self_update', 'UPDATE',
     pg_temp.s004_self('patient_id'),
     pg_temp.s004_self('patient_id') || ' AND hospital_id = public.patient_hospital_id(patient_id)'),
  -- ---------------------------------------------------------------- patient_prep_checklists
  ('patient_prep_checklists', 's004_patient_prep_checklists_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), NULL),
  ('patient_prep_checklists', 's004_patient_prep_checklists_clinical_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'doctor,nurse')),
  ('patient_prep_checklists', 's004_patient_prep_checklists_clinical_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'doctor,nurse'), pg_temp.s004_staff('hospital_id', 'doctor,nurse')),
  -- ---------------------------------------------------------------- patient_queue
  ('patient_queue', 's004_patient_queue_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist,pharmacist,lab_technician'), NULL),
  ('patient_queue', 's004_patient_queue_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('patient_queue', 's004_patient_queue_staff_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('patient_queue', 's004_patient_queue_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist'),
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,receptionist')),
  ('patient_queue', 's004_patient_queue_staff_delete', 'DELETE',
     pg_temp.s004_staff('hospital_id', 'admin,receptionist'), NULL),
  -- ---------------------------------------------------------------- medication_administrations
  ('medication_administrations', 's004_medication_administrations_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,pharmacist'), NULL),
  ('medication_administrations', 's004_medication_administrations_nurse_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'nurse')),
  ('medication_administrations', 's004_medication_administrations_nurse_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'nurse'), pg_temp.s004_staff('hospital_id', 'nurse')),
  -- ---------------------------------------------------------------- billing (ADR-0002, DB-07)
  ('invoices', 's004_invoices_billing_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,receptionist'), NULL),
  ('invoices', 's004_invoices_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('invoices', 's004_invoices_billing_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,receptionist')),
  ('invoices', 's004_invoices_billing_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,receptionist'), pg_temp.s004_staff('hospital_id', 'admin,receptionist')),
  ('invoice_items', 's004_invoice_items_billing_select', 'SELECT',
     pg_temp.s004_staff('public.invoice_hospital_id(invoice_id)', 'admin,receptionist'), NULL),
  ('invoice_items', 's004_invoice_items_self_select', 'SELECT',
     pg_temp.s004_self('public.invoice_patient_id(invoice_id)'), NULL),
  ('invoice_items', 's004_invoice_items_billing_insert', 'INSERT', NULL,
     pg_temp.s004_staff('public.invoice_hospital_id(invoice_id)', 'admin,receptionist')),
  ('invoice_items', 's004_invoice_items_billing_update', 'UPDATE',
     pg_temp.s004_staff('public.invoice_hospital_id(invoice_id)', 'admin,receptionist'),
     pg_temp.s004_staff('public.invoice_hospital_id(invoice_id)', 'admin,receptionist')),
  ('invoice_items', 's004_invoice_items_billing_delete', 'DELETE',
     pg_temp.s004_staff('public.invoice_hospital_id(invoice_id)', 'admin,receptionist'), NULL),
  -- payments are append-only for clients: no UPDATE or DELETE policy.
  ('payments', 's004_payments_billing_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,receptionist'), NULL),
  ('payments', 's004_payments_self_select', 'SELECT', pg_temp.s004_self('public.invoice_patient_id(invoice_id)'), NULL),
  ('payments', 's004_payments_billing_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,receptionist')
       || ' AND hospital_id = public.invoice_hospital_id(invoice_id)'),
  ('payment_plans', 's004_payment_plans_billing_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,receptionist'), NULL),
  ('payment_plans', 's004_payment_plans_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('payment_plans', 's004_payment_plans_billing_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,receptionist')),
  ('payment_plans', 's004_payment_plans_billing_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,receptionist'), pg_temp.s004_staff('hospital_id', 'admin,receptionist')),
  ('insurance_claims', 's004_insurance_claims_billing_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,receptionist'), NULL),
  ('insurance_claims', 's004_insurance_claims_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('insurance_claims', 's004_insurance_claims_billing_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,receptionist')),
  ('insurance_claims', 's004_insurance_claims_billing_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,receptionist'), pg_temp.s004_staff('hospital_id', 'admin,receptionist')),
  -- ---------------------------------------------------------------- messages (DB-09: participants only)
  ('messages', 's004_messages_participant_select', 'SELECT',
     '(sender_id = (SELECT auth.uid()) OR recipient_id = (SELECT auth.uid())) AND ('
       || pg_temp.s004_staff('hospital_id', '*') || ' OR hospital_id IN (SELECT public.my_patient_hospital_ids()))', NULL),
  ('messages', 's004_messages_sender_insert', 'INSERT', NULL,
     'sender_id = (SELECT auth.uid()) AND (('
       || pg_temp.s004_staff('hospital_id', '*') || ' AND public.user_is_member_of(recipient_id, hospital_id))'
       || ' OR (hospital_id IN (SELECT public.my_patient_hospital_ids())'
       || ' AND public.user_is_staff_of(recipient_id, hospital_id)'
       || ' AND (patient_id IS NULL OR ' || pg_temp.s004_self('patient_id') || ')))'),
  ('messages', 's004_messages_recipient_update', 'UPDATE',
     'recipient_id = (SELECT auth.uid()) AND (' || pg_temp.s004_staff('hospital_id', '*')
       || ' OR hospital_id IN (SELECT public.my_patient_hospital_ids()))',
     'recipient_id = (SELECT auth.uid()) AND (' || pg_temp.s004_staff('hospital_id', '*')
       || ' OR hospital_id IN (SELECT public.my_patient_hospital_ids()))'),
  -- ---------------------------------------------------------------- notifications
  ('notifications', 's004_notifications_recipient_select', 'SELECT',
     'recipient_id = (SELECT auth.uid()) AND (SELECT public.is_active_principal()) AND (hospital_id IS NULL OR '
       || pg_temp.s004_staff('hospital_id', '*') || ' OR hospital_id IN (SELECT public.my_patient_hospital_ids()))', NULL),
  ('notifications', 's004_notifications_staff_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', '*') || ' AND public.user_is_member_of(recipient_id, hospital_id)'
       || ' AND (sender_id IS NULL OR sender_id = (SELECT auth.uid()))'),
  ('notifications', 's004_notifications_recipient_update', 'UPDATE',
     'recipient_id = (SELECT auth.uid()) AND (SELECT public.is_active_principal())',
     'recipient_id = (SELECT auth.uid()) AND (SELECT public.is_active_principal())'),
  ('notifications', 's004_notifications_recipient_delete', 'DELETE',
     'recipient_id = (SELECT auth.uid()) AND (SELECT public.is_active_principal())', NULL),
  -- ---------------------------------------------------------------- task_assignments (ids are profile ids)
  ('task_assignments', 's004_task_assignments_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse') || ' OR (' || pg_temp.s004_staff('hospital_id', '*')
       || ' AND (SELECT public.current_profile_id()) IN (assigned_to, assigned_by))', NULL),
  ('task_assignments', 's004_task_assignments_staff_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', '*')),
  ('task_assignments', 's004_task_assignments_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse') || ' OR (' || pg_temp.s004_staff('hospital_id', '*')
       || ' AND (SELECT public.current_profile_id()) IN (assigned_to, assigned_by))',
     pg_temp.s004_staff('hospital_id', '*')),
  ('task_assignments', 's004_task_assignments_delete', 'DELETE',
     pg_temp.s004_staff('hospital_id', 'admin') || ' OR (' || pg_temp.s004_staff('hospital_id', '*')
       || ' AND (SELECT public.current_profile_id()) IN (assigned_to, assigned_by))', NULL),
  -- ---------------------------------------------------------------- telemedicine_sessions
  ('telemedicine_sessions', 's004_telemedicine_sessions_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), NULL),
  ('telemedicine_sessions', 's004_telemedicine_sessions_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('telemedicine_sessions', 's004_telemedicine_sessions_clinical_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse')),
  ('telemedicine_sessions', 's004_telemedicine_sessions_clinical_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse')),
  -- ---------------------------------------------------------------- nursing / staffing
  ('shift_handovers', 's004_shift_handovers_clinical_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), NULL),
  ('shift_handovers', 's004_shift_handovers_clinical_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse')),
  ('shift_handovers', 's004_shift_handovers_clinical_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse'), pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse')),
  ('shift_schedules', 's004_shift_schedules_staff_select', 'SELECT', pg_temp.s004_staff('hospital_id', '*'), NULL),
  ('shift_schedules', 's004_shift_schedules_admin_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin')),
  ('shift_schedules', 's004_shift_schedules_admin_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin'), pg_temp.s004_staff('hospital_id', 'admin')),
  ('shift_schedules', 's004_shift_schedules_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  -- ---------------------------------------------------------------- scheduling directory (patients may read for booking)
  ('doctor_availability', 's004_doctor_availability_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', '*') || ' OR hospital_id IN (SELECT public.my_patient_hospital_ids())', NULL),
  ('doctor_availability', 's004_doctor_availability_insert', 'INSERT', NULL,
     pg_temp.s004_staff('hospital_id', 'admin') || ' OR (' || pg_temp.s004_staff('hospital_id', 'doctor')
       || ' AND doctor_id = (SELECT public.current_profile_id()))'),
  ('doctor_availability', 's004_doctor_availability_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin') || ' OR (' || pg_temp.s004_staff('hospital_id', 'doctor')
       || ' AND doctor_id = (SELECT public.current_profile_id()))',
     pg_temp.s004_staff('hospital_id', 'admin') || ' OR (' || pg_temp.s004_staff('hospital_id', 'doctor')
       || ' AND doctor_id = (SELECT public.current_profile_id()))'),
  ('doctor_availability', 's004_doctor_availability_delete', 'DELETE',
     pg_temp.s004_staff('hospital_id', 'admin') || ' OR (' || pg_temp.s004_staff('hospital_id', 'doctor')
       || ' AND doctor_id = (SELECT public.current_profile_id()))', NULL),
  ('time_slots', 's004_time_slots_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', '*') || ' OR hospital_id IN (SELECT public.my_patient_hospital_ids())', NULL),
  ('time_slots', 's004_time_slots_staff_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,doctor,receptionist')),
  ('time_slots', 's004_time_slots_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,receptionist'), pg_temp.s004_staff('hospital_id', 'admin,doctor,receptionist')),
  ('time_slots', 's004_time_slots_staff_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin,receptionist'), NULL),
  ('departments', 's004_departments_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', '*') || ' OR hospital_id IN (SELECT public.my_patient_hospital_ids())', NULL),
  ('departments', 's004_departments_admin_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin')),
  ('departments', 's004_departments_admin_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin'), pg_temp.s004_staff('hospital_id', 'admin')),
  ('departments', 's004_departments_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  ('hospital_resources', 's004_hospital_resources_staff_select', 'SELECT', pg_temp.s004_staff('hospital_id', '*'), NULL),
  ('hospital_resources', 's004_hospital_resources_admin_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin')),
  ('hospital_resources', 's004_hospital_resources_staff_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,nurse,receptionist'), pg_temp.s004_staff('hospital_id', 'admin,nurse,receptionist')),
  ('hospital_resources', 's004_hospital_resources_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  -- ---------------------------------------------------------------- pharmacy inventory
  ('medications', 's004_medications_staff_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,pharmacist'), NULL),
  ('medications', 's004_medications_pharmacy_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('medications', 's004_medications_pharmacy_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('medications', 's004_medications_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  ('suppliers', 's004_suppliers_pharmacy_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), NULL),
  ('suppliers', 's004_suppliers_pharmacy_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('suppliers', 's004_suppliers_pharmacy_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('suppliers', 's004_suppliers_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  ('purchase_orders', 's004_purchase_orders_pharmacy_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), NULL),
  ('purchase_orders', 's004_purchase_orders_pharmacy_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('purchase_orders', 's004_purchase_orders_pharmacy_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('purchase_orders', 's004_purchase_orders_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  ('purchase_order_items', 's004_purchase_order_items_pharmacy_select', 'SELECT',
     pg_temp.s004_staff('public.purchase_order_hospital_id(purchase_order_id)', 'admin,pharmacist'), NULL),
  ('purchase_order_items', 's004_purchase_order_items_pharmacy_insert', 'INSERT', NULL,
     pg_temp.s004_staff('public.purchase_order_hospital_id(purchase_order_id)', 'admin,pharmacist')),
  ('purchase_order_items', 's004_purchase_order_items_pharmacy_update', 'UPDATE',
     pg_temp.s004_staff('public.purchase_order_hospital_id(purchase_order_id)', 'admin,pharmacist'),
     pg_temp.s004_staff('public.purchase_order_hospital_id(purchase_order_id)', 'admin,pharmacist')),
  ('purchase_order_items', 's004_purchase_order_items_pharmacy_delete', 'DELETE',
     pg_temp.s004_staff('public.purchase_order_hospital_id(purchase_order_id)', 'admin,pharmacist'), NULL),
  ('reorder_rules', 's004_reorder_rules_pharmacy_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), NULL),
  ('reorder_rules', 's004_reorder_rules_pharmacy_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('reorder_rules', 's004_reorder_rules_pharmacy_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('reorder_rules', 's004_reorder_rules_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  ('stock_alerts', 's004_stock_alerts_pharmacy_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), NULL),
  ('stock_alerts', 's004_stock_alerts_pharmacy_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('stock_alerts', 's004_stock_alerts_pharmacy_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('stock_alerts', 's004_stock_alerts_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  -- ---------------------------------------------------------------- refills
  ('prescription_refill_requests', 's004_prescription_refill_requests_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,pharmacist'), NULL),
  ('prescription_refill_requests', 's004_prescription_refill_requests_self_select', 'SELECT', pg_temp.s004_self('patient_id'), NULL),
  ('prescription_refill_requests', 's004_prescription_refill_requests_self_insert', 'INSERT', NULL,
     pg_temp.s004_self('patient_id') || ' AND hospital_id = public.patient_hospital_id(patient_id)'
       || ' AND coalesce(status, ''pending'') = ''pending'''),
  ('prescription_refill_requests', 's004_prescription_refill_requests_clinical_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'doctor,pharmacist'), pg_temp.s004_staff('hospital_id', 'doctor,pharmacist')),
  -- ---------------------------------------------------------------- configuration and reference
  ('system_config', 's004_system_config_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin') || ' OR (is_sensitive IS NOT TRUE AND ('
       || pg_temp.s004_staff('hospital_id', '*') || ' OR (hospital_id IS NULL AND (SELECT public.is_active_principal()))))', NULL),
  ('system_config', 's004_system_config_admin_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin')),
  ('system_config', 's004_system_config_admin_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin'), pg_temp.s004_staff('hospital_id', 'admin')),
  ('system_config', 's004_system_config_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  ('icd10_codes', 's004_icd10_codes_select', 'SELECT', '(SELECT public.is_active_principal())', NULL),
  -- ---------------------------------------------------------------- queues (DB-09; not in types.ts, skipped if absent)
  ('lab_queue', 's004_lab_queue_staff_select', 'SELECT', pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,lab_technician'), NULL),
  ('lab_queue', 's004_lab_queue_clinical_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse')),
  ('lab_queue', 's004_lab_queue_lab_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,lab_technician'), pg_temp.s004_staff('hospital_id', 'admin,lab_technician')),
  ('lab_queue', 's004_lab_queue_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL),
  ('prescription_queue', 's004_prescription_queue_staff_select', 'SELECT',
     pg_temp.s004_staff('hospital_id', 'admin,doctor,nurse,pharmacist'), NULL),
  ('prescription_queue', 's004_prescription_queue_clinical_insert', 'INSERT', NULL, pg_temp.s004_staff('hospital_id', 'admin,doctor')),
  ('prescription_queue', 's004_prescription_queue_pharmacy_update', 'UPDATE',
     pg_temp.s004_staff('hospital_id', 'admin,pharmacist'), pg_temp.s004_staff('hospital_id', 'admin,pharmacist')),
  ('prescription_queue', 's004_prescription_queue_admin_delete', 'DELETE', pg_temp.s004_staff('hospital_id', 'admin'), NULL)
) AS v(t, p, c, u, k);

-- Reviewed policy names: now in section 0a (temp table) and 0c (bookkeeping), before any change.

-- Apply the spec, one table at a time. Each table runs in a subtransaction: if
-- any of its new policies fails to compile (a column the live table lacks),
-- the old policies are restored for that table, a WARNING is raised and the
-- table is left for the guard in section E.
DO $$
DECLARE
  v_mode constant text := coalesce(nullif(current_setting('s0_04.unknown_policy_mode', true), ''), 'abort');
  t text;
  pol record;
  sp record;
  v_unknown text[];
  v_sql text;
BEGIN
  -- Abort mode: refuse before changing anything if live has policies the
  -- repository never created.
  IF v_mode = 'abort' THEN
    SELECT array_agg(format('%s.%s', p.tablename, p.policyname) ORDER BY p.tablename, p.policyname)
      INTO v_unknown
      FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.permissive = 'PERMISSIVE'
       AND p.policyname NOT LIKE 's004\_%'
       AND p.tablename IN (SELECT DISTINCT tablename FROM rls_migration_audit.s004_policy_spec)
       AND NOT EXISTS (SELECT 1 FROM rls_migration_audit.s004_repo_policy_names k
                        WHERE k.tablename = p.tablename AND k.policyname = p.policyname);
    IF v_unknown IS NOT NULL THEN
      RAISE EXCEPTION 'role_aware_rls (abort mode): live-only policies would be dropped: %', array_to_string(v_unknown, '; ')
        USING HINT = 'Review them, add them to s004_repo_policy_names (or rewrite them), then rerun; or rerun in sweep mode.';
    END IF;
  END IF;

  FOR t IN SELECT DISTINCT tablename FROM rls_migration_audit.s004_policy_spec ORDER BY 1 LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('C', t, 'skipped_missing_table', NULL);
      RAISE NOTICE 'role_aware_rls: public.% does not exist; skipped', t;
      CONTINUE;
    END IF;

    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- Back up and drop every permissive policy this file does not own.
      FOR pol IN
        SELECT p.* FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = t
           AND p.permissive = 'PERMISSIVE' AND p.policyname NOT LIKE 's004\_%'
      LOOP
        INSERT INTO rls_migration_audit.s004_dropped_policies
          (tablename, policyname, permissive, cmd, roles, qual, with_check, in_repo_history, recreate_sql)
        VALUES (t, pol.policyname, pol.permissive, pol.cmd, pol.roles::text[], pol.qual, pol.with_check,
                EXISTS (SELECT 1 FROM rls_migration_audit.s004_repo_policy_names k
                         WHERE k.tablename = t AND k.policyname = pol.policyname),
                format('CREATE POLICY %I ON public.%I AS %s FOR %s TO %s%s%s;',
                       pol.policyname, t, pol.permissive, pol.cmd,
                       (SELECT string_agg(CASE WHEN r = 'public' THEN 'public' ELSE quote_ident(r) END, ', ')
                          FROM unnest(pol.roles::text[]) r),
                       CASE WHEN pol.qual IS NOT NULL THEN ' USING (' || pol.qual || ')' ELSE '' END,
                       CASE WHEN pol.with_check IS NOT NULL THEN ' WITH CHECK (' || pol.with_check || ')' ELSE '' END));
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
        RAISE NOTICE 'role_aware_rls: dropped %.% (%)', t, pol.policyname, pol.cmd;
      END LOOP;

      FOR pol IN
        SELECT p.policyname FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = t AND p.permissive = 'RESTRICTIVE'
      LOOP
        INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
        VALUES ('C', t, 'kept_restrictive', pol.policyname);
      END LOOP;

      FOR sp IN SELECT * FROM rls_migration_audit.s004_policy_spec WHERE tablename = t ORDER BY policyname LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', sp.policyname, t);
        v_sql := format('CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO authenticated', sp.policyname, t, sp.cmd);
        IF sp.using_expr IS NOT NULL THEN v_sql := v_sql || ' USING (' || sp.using_expr || ')'; END IF;
        IF sp.check_expr IS NOT NULL THEN v_sql := v_sql || ' WITH CHECK (' || sp.check_expr || ')'; END IF;
        EXECUTE v_sql;
      END LOOP;

      -- Policies named s004_* that are no longer in the spec (older revision of this file).
      FOR pol IN
        SELECT p.policyname FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = t AND p.policyname LIKE 's004\_%'
           AND p.policyname <> 's004_active_principal_guard'
           AND NOT EXISTS (SELECT 1 FROM rls_migration_audit.s004_policy_spec s
                            WHERE s.tablename = t AND s.policyname = p.policyname)
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, t);
      END LOOP;
      -- A guard left by an earlier run where this table was skipped is redundant now.
      EXECUTE format('DROP POLICY IF EXISTS s004_active_principal_guard ON public.%I', t);

      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('C', t, 'owned', (SELECT count(*)::text || ' policies' FROM rls_migration_audit.s004_policy_spec WHERE tablename = t));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'role_aware_rls: public.% NOT rewritten (old policies kept; section E guard applies instead): %', t, SQLERRM;
      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('C', t, 'failed_kept_old_policies', SQLERRM);
    END;
  END LOOP;
END
$$;

-- hospitals is owned by S0-03 and not rewritten here. Section B makes its
-- membership policy ("Users can view their hospital", user_belongs_to_hospital)
-- staff-only, so portal patients would lose their own hospital row (AuthContext
-- loads it for every user). This one additive policy keeps that working.
DO $$
BEGIN
  IF to_regclass('public.hospitals') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS s004_hospitals_patient_select ON public.hospitals';
    EXECUTE 'CREATE POLICY s004_hospitals_patient_select ON public.hospitals FOR SELECT TO authenticated
               USING (id IN (SELECT public.my_patient_hospital_ids()))';
  END IF;
END
$$;

-- DB-09: a prescription item always carries its prescription's hospital, when
-- the live table has the hospital_id column (added by 20260622000002).
CREATE OR REPLACE FUNCTION public.s004_prescription_items_hospital_from_parent()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_hospital uuid;
BEGIN
  SELECT rx.hospital_id INTO v_hospital FROM public.prescriptions rx WHERE rx.id = NEW.prescription_id;
  IF v_hospital IS NULL THEN
    RAISE EXCEPTION 'prescription_items: prescription % not found', NEW.prescription_id USING ERRCODE = '23503';
  END IF;
  NEW.hospital_id := v_hospital;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.s004_prescription_items_hospital_from_parent() FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'prescription_items' AND column_name = 'hospital_id')
     AND to_regclass('public.prescriptions') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS s004_prescription_items_hospital_from_parent ON public.prescription_items';
    EXECUTE 'CREATE TRIGGER s004_prescription_items_hospital_from_parent
               BEFORE INSERT OR UPDATE OF prescription_id, hospital_id ON public.prescription_items
               FOR EACH ROW EXECUTE FUNCTION public.s004_prescription_items_hospital_from_parent()';
  END IF;
END
$$;

-- =============================================================================
-- D. DB-13: RLS on every public table; deny by default
-- =============================================================================
-- Classified tables (from DATABASE_AUDIT DB-13) get explicit policies, but only
-- when this file is the only one governing them (no foreign permissive policy).
-- Anything unclassified that had RLS off becomes deny-all for anon and
-- authenticated (service_role bypasses RLS). Partitions get RLS on and no
-- policy: they are read through their parent.
DO $$
DECLARE
  r record;
  v_class text;
  v_cols text[];
  v_foreign int;
  c_reference constant text[] := ARRAY['drug_interactions', 'dose_adjustments', 'pediatric_dosing',
    'pregnancy_lactation_safety', 'therapeutic_classes', 'sig_templates', 'lab_interpretation_rules',
    'clinical_guidelines', 'clinical_templates', 'patient_education_materials'];
  c_phi constant text[] := ARRAY['mar_administrations', 'medication_schedules', 'medication_reconciliation',
    'care_plan_items', 'care_plan_compliance', 'refill_requests', 'patient_risk_scores', 'risk_scores',
    'clinical_outcomes', 'ai_clinical_analyses', 'patient_quality_compliance', 'patient_cohort_membership',
    'population_interventions', 'intervention_outcomes'];
  c_ops constant text[] := ARRAY['backup_jobs', 'backup_schedules', 'disaster_recovery_log', 'system_alerts',
    'provider_scorecards', 'quality_measures', 'population_cohorts', 'ai_model_performance'];
  -- RLS on but zero policies in the repository (DB-13 second list).
  c_lab_ops constant text[] := ARRAY['lab_equipment_errors'];
  c_staff_read constant text[] := ARRAY['workflow_queues'];
  c_participants constant text[] := ARRAY['inter_role_messages'];
  v_scope text;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, c.relrowsecurity, c.relispartition
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d
                        WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
     ORDER BY c.relname
  LOOP
    IF NOT r.relrowsecurity THEN
      BEGIN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
        INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action)
        VALUES ('D', r.relname, 'rls_enabled');
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'role_aware_rls: could not enable RLS on public.%: %', r.relname, SQLERRM;
        INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
        VALUES ('D', r.relname, 'rls_enable_failed', SQLERRM);
        CONTINUE;
      END;
    END IF;

    IF r.relispartition THEN CONTINUE; END IF;

    v_class := CASE
      WHEN r.relname = ANY (c_reference) THEN 'reference'
      WHEN r.relname = ANY (c_phi) THEN 'phi'
      WHEN r.relname = ANY (c_ops) THEN 'ops'
      WHEN r.relname = ANY (c_lab_ops) THEN 'lab_ops'
      WHEN r.relname = ANY (c_staff_read) THEN 'staff_read'
      WHEN r.relname = ANY (c_participants) THEN 'participants'
    END;

    IF v_class IS NULL THEN
      IF NOT r.relrowsecurity THEN
        RAISE WARNING 'role_aware_rls: public.% had RLS off; now deny-by-default (no policy). Classify it if clients need it.', r.relname;
        INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action)
        VALUES ('D', r.relname, 'closed_unclassified');
      END IF;
      CONTINUE;
    END IF;

    -- Reference data is read-only for clients whatever else applies.
    IF v_class = 'reference' THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon, authenticated', r.relname);
    END IF;

    SELECT count(*) INTO v_foreign FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = r.relname
       AND p.permissive = 'PERMISSIVE' AND p.policyname NOT LIKE 's004\_%';
    IF v_foreign > 0 THEN
      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('D', r.relname, 'classified_but_has_foreign_policies', v_class || ' (left to section E guard)');
      CONTINUE;
    END IF;

    SELECT array_agg(column_name::text) INTO v_cols FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = r.relname;

    -- Drop this file's earlier class policies so the set is rebuilt from scratch.
    FOR v_scope IN SELECT policyname FROM pg_policies
                    WHERE schemaname = 'public' AND tablename = r.relname AND policyname LIKE 's004\_class\_%' LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', v_scope, r.relname);
    END LOOP;

    v_scope := CASE
      WHEN 'hospital_id' = ANY (v_cols) THEN 'hospital_id'
      WHEN 'patient_id' = ANY (v_cols) THEN 'public.patient_hospital_id(patient_id)'
    END;

    IF v_class = 'reference' THEN
      EXECUTE format('CREATE POLICY s004_class_reference_select ON public.%I FOR SELECT TO authenticated
                        USING ((SELECT public.is_active_principal()))', r.relname);
    ELSIF v_scope IS NULL THEN
      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('D', r.relname, 'classified_deny_all', v_class || ': no hospital_id/patient_id column');
      CONTINUE;
    ELSIF v_class = 'phi' THEN
      EXECUTE format('CREATE POLICY s004_class_phi_select ON public.%I FOR SELECT TO authenticated USING (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, 'admin,doctor,nurse'));
      EXECUTE format('CREATE POLICY s004_class_phi_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, 'doctor,nurse'));
      EXECUTE format('CREATE POLICY s004_class_phi_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, 'doctor,nurse'), pg_temp.s004_staff(v_scope, 'doctor,nurse'));
      IF 'patient_id' = ANY (v_cols) THEN
        EXECUTE format('CREATE POLICY s004_class_phi_self_select ON public.%I FOR SELECT TO authenticated USING (%s)',
                       r.relname, pg_temp.s004_self('patient_id'));
      END IF;
    ELSIF v_class = 'ops' THEN
      EXECUTE format('CREATE POLICY s004_class_ops_admin_select ON public.%I FOR SELECT TO authenticated USING (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, 'admin'));
    ELSIF v_class = 'lab_ops' THEN
      EXECUTE format('CREATE POLICY s004_class_lab_ops_select ON public.%I FOR SELECT TO authenticated USING (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, 'admin,lab_technician'));
      EXECUTE format('CREATE POLICY s004_class_lab_ops_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, 'admin,lab_technician'));
      EXECUTE format('CREATE POLICY s004_class_lab_ops_update ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, 'admin,lab_technician'), pg_temp.s004_staff(v_scope, 'admin,lab_technician'));
    ELSIF v_class = 'staff_read' THEN
      EXECUTE format('CREATE POLICY s004_class_staff_select ON public.%I FOR SELECT TO authenticated USING (%s)',
                     r.relname, pg_temp.s004_staff(v_scope, '*'));
    ELSIF v_class = 'participants' THEN
      IF NOT ('sender_id' = ANY (v_cols) AND 'recipient_id' = ANY (v_cols)) THEN
        INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
        VALUES ('D', r.relname, 'classified_deny_all', 'participants: no sender_id/recipient_id');
        CONTINUE;
      END IF;
      -- sender_id/recipient_id semantics (auth uid vs profile id) are unknown live: match either.
      EXECUTE format('CREATE POLICY s004_class_participant_select ON public.%I FOR SELECT TO authenticated
                        USING (%s AND ((SELECT auth.uid()) IN (sender_id, recipient_id)
                                       OR (SELECT public.current_profile_id()) IN (sender_id, recipient_id)))',
                     r.relname, pg_temp.s004_staff(v_scope, '*'));
      EXECUTE format('CREATE POLICY s004_class_participant_insert ON public.%I FOR INSERT TO authenticated
                        WITH CHECK (%s AND sender_id IN ((SELECT auth.uid()), (SELECT public.current_profile_id())))',
                     r.relname, pg_temp.s004_staff(v_scope, '*'));
    END IF;

    INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
    VALUES ('D', r.relname, 'classified', v_class);
  END LOOP;
END
$$;

-- =============================================================================
-- E. Guard for every other hospital/patient-keyed table (DB-02 containment)
-- =============================================================================
-- Tables whose live permissive policies this file does not own still use
-- membership-only checks (user_belongs_to_hospital, which section B fixed, or
-- raw "profiles.hospital_id = ..." subqueries, which it cannot fix). A
-- RESTRICTIVE policy is ANDed with all of them, so the effective rule becomes
-- "their policy AND (active staff of the row's hospital OR the row is the
-- caller's own)". Applied TO public, so anon requests also get no tenant rows.
DO $$
DECLARE
  r record;
  v_cols text[];
  v_parts text[];
  v_expr text;
  c_excluded constant text[] := ARRAY['profiles', 'user_roles', 'staff_invitations', 'hospitals',
    'two_factor_secrets', 'mfa_backup_codes', 'mfa_backup_code_attempts'];
BEGIN
  FOR r IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relispartition
       AND c.relrowsecurity
       AND c.relname <> ALL (c_excluded)
     ORDER BY c.relname
  LOOP
    -- Only where someone else's permissive policy can grant access.
    IF NOT EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = r.relname
                      AND p.permissive = 'PERMISSIVE' AND p.policyname NOT LIKE 's004\_%') THEN
      EXECUTE format('DROP POLICY IF EXISTS s004_active_principal_guard ON public.%I', r.relname);
      CONTINUE;
    END IF;

    SELECT array_agg(column_name::text) INTO v_cols FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = r.relname;
    v_parts := ARRAY[]::text[];
    IF 'hospital_id' = ANY (v_cols) THEN
      v_parts := v_parts || 'hospital_id IS NULL'::text || pg_temp.s004_staff('hospital_id', '*');
    ELSIF 'patient_id' = ANY (v_cols) THEN
      v_parts := v_parts || pg_temp.s004_staff('public.patient_hospital_id(patient_id)', '*');
    ELSE
      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('E', r.relname, 'no_guard', 'no hospital_id/patient_id column');
      CONTINUE;
    END IF;
    IF 'patient_id' = ANY (v_cols) THEN
      v_parts := v_parts || pg_temp.s004_self('patient_id');
    END IF;
    IF 'user_id' = ANY (v_cols) THEN
      v_parts := v_parts || '(user_id = (SELECT auth.uid()) AND (SELECT public.is_active_principal()))'::text;
    END IF;
    IF 'recipient_id' = ANY (v_cols) THEN
      v_parts := v_parts || '(recipient_id = (SELECT auth.uid()) AND (SELECT public.is_active_principal()))'::text;
    END IF;
    IF 'sender_id' = ANY (v_cols) THEN
      v_parts := v_parts || '(sender_id = (SELECT auth.uid()) AND (SELECT public.is_active_principal()))'::text;
    END IF;
    v_expr := array_to_string(v_parts, ' OR ');

    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS s004_active_principal_guard ON public.%I', r.relname);
      EXECUTE format('CREATE POLICY s004_active_principal_guard ON public.%I AS RESTRICTIVE FOR ALL TO public USING (%s) WITH CHECK (%s)',
                     r.relname, v_expr, v_expr);
      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('E', r.relname, 'guarded', v_expr);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'role_aware_rls: guard on public.% failed: %', r.relname, SQLERRM;
      INSERT INTO rls_migration_audit.s004_run_log (section, tablename, action, detail)
      VALUES ('E', r.relname, 'guard_failed', SQLERRM);
    END;
  END LOOP;
END
$$;

-- =============================================================================
-- F. Post-conditions
-- =============================================================================
DO $$
DECLARE
  v_open text[];
  v_dropped int;
  v_unknown int;
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname) INTO v_open
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM pg_depend d
                      WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e');
  IF v_open IS NOT NULL THEN
    RAISE WARNING 'role_aware_rls: public tables still without RLS: %', array_to_string(v_open, ', ');
  END IF;
  SELECT count(*), count(*) FILTER (WHERE NOT in_repo_history) INTO v_dropped, v_unknown
    FROM rls_migration_audit.s004_dropped_policies;
  RAISE NOTICE 'role_aware_rls: done. Dropped policies recorded so far: % (% not in repository history). See rls_migration_audit.s004_dropped_policies and s004_run_log.',
    v_dropped, v_unknown;
END
$$;

DROP FUNCTION IF EXISTS pg_temp.s004_staff(text, text);
DROP FUNCTION IF EXISTS pg_temp.s004_self(text);
