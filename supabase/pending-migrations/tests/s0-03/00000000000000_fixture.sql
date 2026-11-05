-- Test fixture for 20261105000003_lock_tenant_key.sql (S0-03).
-- NOT a migration. Apply only to a throwaway PostgreSQL that already has
-- scripts/db/supabase-compat-shim.sql (see 20261105000003.README.md).
--
-- A minimal stand-in for the live schema (columns from
-- src/integrations/supabase/types.ts plus columns later migrations add) with
-- the policies and functions the audit found: the self-writable profile, the
-- client role self-assignment policies, the FOR ALL invitation policy, the
-- broken register_patient and the oldest-hospital fallback. Then
-- 20261105000002 (S0-10) and 20261105000003 are applied on top, twice.

CREATE TYPE public.app_role AS ENUM
  ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient');
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text, city text, state text, zip text, phone text, email text,
  license_number text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  hospital_id uuid REFERENCES public.hospitals(id),
  is_staff boolean DEFAULT false,
  is_active boolean DEFAULT true,
  role text,
  two_factor_enabled boolean DEFAULT false,
  two_factor_required boolean NOT NULL DEFAULT false,
  two_factor_secret text,
  backup_codes text[],
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  security_question text,
  security_answer text,
  clearance_level text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, hospital_id)
);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id),
  user_id uuid REFERENCES auth.users(id),
  mrn text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender public.gender_type NOT NULL DEFAULT 'other',
  email text,
  is_active boolean DEFAULT true,
  note text
);

CREATE TABLE public.staff_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id),
  email text NOT NULL,
  role public.app_role NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  status public.invitation_status NOT NULL DEFAULT 'pending',
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE FUNCTION public.user_belongs_to_hospital(_user_id uuid, _hospital_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
                  WHERE user_id = _user_id AND hospital_id = _hospital_id AND is_active)
$$;

-- profiles: as in misc.sql / 20260303000001 (row ownership only, hospital-wide read).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_authenticated_select" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid()
         OR (hospital_id IS NOT NULL AND public.user_belongs_to_hospital(auth.uid(), hospital_id)));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- user_roles: including the self-assignment policies the migration must drop.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view roles in their hospital" ON public.user_roles FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id) OR user_id = auth.uid());
CREATE POLICY "Admins can manage roles in their hospital" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND hospital_id IS NOT NULL
         AND public.user_belongs_to_hospital(auth.uid(), hospital_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND hospital_id IS NOT NULL
              AND public.user_belongs_to_hospital(auth.uid(), hospital_id));
CREATE POLICY "Users can insert initial admin role for new hospital" ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'admin' AND hospital_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.hospital_id = user_roles.hospital_id));
CREATE POLICY "User roles hospital scoped" ON public.user_roles FOR ALL TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
       AND p.hospital_id = user_roles.hospital_id AND p.is_staff = true));

-- patients: hospital membership and own record (S0-04 rewrites these).
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view patients in their hospital" ON public.patients FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));
CREATE POLICY "patient_view_own_data" ON public.patients FOR SELECT USING (user_id = auth.uid());

-- staff_invitations: admin policies plus the permissive FOR ALL one (SECF-09).
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view hospital invitations" ON public.staff_invitations FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create invitations" ON public.staff_invitations FOR INSERT
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff invitations hospital scoped" ON public.staff_invitations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid()
                  AND p.hospital_id = staff_invitations.hospital_id));

ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their hospital" ON public.hospitals FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), id));

-- The broken / unsafe functions as they are in supabase/migrations.
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

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Data. Hospital A and B; staff of A; a patient record to claim; users with
-- no tenant yet.
-- ---------------------------------------------------------------------------
INSERT INTO public.hospitals (id, name, license_number, created_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Alpha General', 'LIC-A', now() - interval '2 years'),
  ('00000000-0000-0000-0000-0000000000b1', 'Beta Clinic',   'LIC-B', now() - interval '1 year');

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000ad01', 'admin.a@example.test',   '{}'),
  ('00000000-0000-0000-0000-00000000a115', 'nurse.a@example.test',   '{}'),
  ('00000000-0000-0000-0000-00000000b0b1', 'doctor.b@example.test',  '{}'),
  ('00000000-0000-0000-0000-00000000e0e0', 'outsider@example.test',  '{}'),
  ('00000000-0000-0000-0000-0000000000f1', 'founder@example.test',   '{"first_name":"Fay","last_name":"Founder"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'noprofile@example.test', '{"first_name":"Nora"}'),
  ('00000000-0000-0000-0000-0000000000c1', 'ada@example.test',       '{}'),
  ('00000000-0000-0000-0000-0000000000c2', 'mallory@example.test',   '{}'),
  ('00000000-0000-0000-0000-0000000000d1', 'new.nurse@example.test', '{}');

INSERT INTO public.profiles (user_id, email, first_name, last_name, hospital_id, is_staff,
                             security_question, security_answer, two_factor_secret, backup_codes) VALUES
  ('00000000-0000-0000-0000-00000000ad01', 'admin.a@example.test',  'Ada',  'Admin',  '00000000-0000-0000-0000-0000000000a1', true,
   'pet', 'Rex', 'JBSWY3DPEHPK3PXP', ARRAY['h1', 'h2']),
  ('00000000-0000-0000-0000-00000000a115', 'nurse.a@example.test',  'Nia',  'Nurse',  '00000000-0000-0000-0000-0000000000a1', true,
   'city', '  Springfield ', NULL, NULL),
  ('00000000-0000-0000-0000-00000000b0b1', 'doctor.b@example.test', 'Dee',  'Doctor', '00000000-0000-0000-0000-0000000000b1', true,
   NULL, NULL, NULL, NULL),
  ('00000000-0000-0000-0000-00000000e0e0', 'outsider@example.test', 'Oz',   'Out',    NULL, false, NULL, NULL, NULL, NULL),
  ('00000000-0000-0000-0000-0000000000f1', 'founder@example.test',  'Fay',  'Founder', NULL, false, NULL, NULL, NULL, NULL),
  ('00000000-0000-0000-0000-0000000000c2', 'mallory@example.test',  'Mal',  'Lory',   NULL, false, NULL, NULL, NULL, NULL);

INSERT INTO public.user_roles (user_id, role, hospital_id) VALUES
  ('00000000-0000-0000-0000-00000000ad01', 'admin',  '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000a115', 'nurse',  '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000b0b1', 'doctor', '00000000-0000-0000-0000-0000000000b1');

INSERT INTO public.patients (id, hospital_id, mrn, first_name, last_name, date_of_birth, email) VALUES
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000a1', 'MRN00000001', 'Ada', 'Lovelace', '1980-01-02', 'Ada@Example.test'),
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'MRN00000002', 'No', 'Email',    '1990-05-06', NULL),
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1', 'MRN00000003', 'Lock', 'Target', '1970-07-07', 'lock@example.test'),
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1', 'MRN00000001', 'Bob', 'Beta',    '1985-03-04', 'bob@example.test');

INSERT INTO public.staff_invitations (id, hospital_id, email, role, token, invited_by) VALUES
  ('00000000-0000-0000-0000-00000000aaa1', '00000000-0000-0000-0000-0000000000a1', 'new.nurse@example.test', 'nurse',
   '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-00000000ad01');
