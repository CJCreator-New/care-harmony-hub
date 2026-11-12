-- Test fixture for 20261105000002_mfa_backup_codes_and_aal2.sql (S0-10).
-- NOT a migration. Apply only to a throwaway PostgreSQL that already has
-- scripts/db/supabase-compat-shim.sql (see supabase/pending-migrations/README.md).
--
-- A minimal stand-in for the live schema: the columns from
-- src/integrations/supabase/types.ts plus the columns later migrations add
-- (is_active, two_factor_required, two_factor_secret, role), and a
-- hospital-membership SELECT policy on each PHI table like the ones in
-- supabase/migrations. The real policies come from the S0-01 capture.

CREATE TYPE public.app_role AS ENUM
  ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient');

CREATE TABLE public.hospitals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL);

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
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamptz,
  security_question text,
  security_answer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  hospital_id uuid REFERENCES public.hospitals(id),
  UNIQUE (user_id, role)
);

CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital(_user_id uuid, _hospital_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles
                  WHERE user_id = _user_id AND hospital_id = _hospital_id AND is_active)
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- PHI tables: hospital-scoped, permissive policies only (as in the repo today).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['patients', 'consultations', 'prescriptions', 'prescription_items',
                           'lab_orders', 'vital_signs', 'medical_records'] LOOP
    EXECUTE format('CREATE TABLE public.%I (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                      hospital_id uuid NOT NULL REFERENCES public.hospitals(id), note text)', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "hospital members can view" ON public.%I FOR SELECT TO authenticated
                      USING (public.user_belongs_to_hospital(auth.uid(), hospital_id))', t);
    EXECUTE format('CREATE POLICY "hospital members can insert" ON public.%I FOR INSERT TO authenticated
                      WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id))', t);
  END LOOP;
END
$$;

-- Same grants Supabase gives the API roles.
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Data: one hospital, three patients; doctor, nurse, admin, doctor+nurse, and an
-- outsider with no hospital.
INSERT INTO public.hospitals (id, name) VALUES ('00000000-0000-0000-0000-0000000000a1', 'Test General');

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000d0c1', 'doctor@example.test'),
  ('00000000-0000-0000-0000-00000000a115', 'nurse@example.test'),
  ('00000000-0000-0000-0000-00000000ad01', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000b0b0', 'docnurse@example.test'),
  ('00000000-0000-0000-0000-00000000e0e0', 'outsider@example.test');

INSERT INTO public.profiles (user_id, email, first_name, last_name, hospital_id, is_staff) VALUES
  ('00000000-0000-0000-0000-00000000d0c1', 'doctor@example.test',   'Dee', 'Doctor', '00000000-0000-0000-0000-0000000000a1', true),
  ('00000000-0000-0000-0000-00000000a115', 'nurse@example.test',    'Nia', 'Nurse',  '00000000-0000-0000-0000-0000000000a1', true),
  ('00000000-0000-0000-0000-00000000ad01', 'admin@example.test',    'Ada', 'Admin',  '00000000-0000-0000-0000-0000000000a1', true),
  ('00000000-0000-0000-0000-00000000b0b0', 'docnurse@example.test', 'Bo',  'Both',   '00000000-0000-0000-0000-0000000000a1', true),
  ('00000000-0000-0000-0000-00000000e0e0', 'outsider@example.test', 'Oz',  'Out',    NULL, false);

INSERT INTO public.user_roles (user_id, role, hospital_id) VALUES
  ('00000000-0000-0000-0000-00000000d0c1', 'doctor', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000a115', 'nurse',  '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000ad01', 'admin',  '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000b0b0', 'doctor', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-00000000b0b0', 'nurse',  '00000000-0000-0000-0000-0000000000a1');

INSERT INTO public.patients (hospital_id, note)
SELECT '00000000-0000-0000-0000-0000000000a1', 'patient ' || g FROM generate_series(1, 3) g;
INSERT INTO public.vital_signs (hospital_id, note)
SELECT '00000000-0000-0000-0000-0000000000a1', 'vitals ' || g FROM generate_series(1, 2) g;
