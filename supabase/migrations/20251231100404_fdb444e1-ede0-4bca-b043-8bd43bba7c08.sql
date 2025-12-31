-- Create ENUM types for the application
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'patient');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.consultation_status AS ENUM ('pending', 'patient_overview', 'clinical_assessment', 'treatment_planning', 'final_review', 'handoff', 'completed');
CREATE TYPE public.priority_level AS ENUM ('low', 'normal', 'high', 'urgent', 'emergency');
CREATE TYPE public.gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Hospitals table
CREATE TABLE public.hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  license_number TEXT UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, hospital_id)
);

-- Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mrn TEXT NOT NULL, -- Medical Record Number
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender_type NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  insurance_group_number TEXT,
  allergies TEXT[] DEFAULT '{}',
  chronic_conditions TEXT[] DEFAULT '{}',
  current_medications JSONB DEFAULT '[]',
  blood_type TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, mrn)
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  appointment_type TEXT NOT NULL,
  status appointment_status DEFAULT 'scheduled',
  priority priority_level DEFAULT 'normal',
  reason_for_visit TEXT,
  notes TEXT,
  check_in_time TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  queue_number INTEGER,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consultations table (5-step workflow)
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status consultation_status DEFAULT 'pending',
  current_step INTEGER DEFAULT 1,
  
  -- Step 1: Patient Overview
  vitals JSONB DEFAULT '{}',
  chief_complaint TEXT,
  history_of_present_illness TEXT,
  
  -- Step 2: Clinical Assessment
  physical_examination JSONB DEFAULT '{}',
  symptoms TEXT[],
  provisional_diagnosis TEXT[],
  
  -- Step 3: Treatment Planning
  final_diagnosis TEXT[],
  treatment_plan TEXT,
  prescriptions JSONB DEFAULT '[]',
  lab_orders JSONB DEFAULT '[]',
  referrals JSONB DEFAULT '[]',
  
  -- Step 4: Final Review
  clinical_notes TEXT,
  follow_up_date DATE,
  follow_up_notes TEXT,
  
  -- Step 5: Handoff
  handoff_notes TEXT,
  pharmacy_notified BOOLEAN DEFAULT false,
  lab_notified BOOLEAN DEFAULT false,
  billing_notified BOOLEAN DEFAULT false,
  
  -- Metadata
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  auto_save_data JSONB DEFAULT '{}',
  last_auto_save TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vital signs history
CREATE TABLE public.vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  temperature DECIMAL(4,1),
  oxygen_saturation INTEGER,
  weight DECIMAL(5,1),
  height DECIMAL(5,1),
  bmi DECIMAL(4,1),
  pain_level INTEGER,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Queue management
CREATE TABLE public.patient_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  queue_number INTEGER NOT NULL,
  priority priority_level DEFAULT 'normal',
  status TEXT DEFAULT 'waiting', -- waiting, called, in_service, completed
  department TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_time TIMESTAMPTZ,
  service_start_time TIMESTAMPTZ,
  service_end_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_queue ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's hospital_id
CREATE OR REPLACE FUNCTION public.get_user_hospital_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT hospital_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user belongs to hospital
CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital(_user_id UUID, _hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id AND hospital_id = _hospital_id
  )
$$;

-- RLS Policies for hospitals
CREATE POLICY "Users can view their hospital"
  ON public.hospitals FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), id));

CREATE POLICY "Admins can update their hospital"
  ON public.hospitals FOR UPDATE
  USING (public.user_belongs_to_hospital(auth.uid(), id) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert hospitals"
  ON public.hospitals FOR INSERT
  WITH CHECK (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their hospital"
  ON public.profiles FOR SELECT
  USING (
    hospital_id IS NULL OR 
    public.user_belongs_to_hospital(auth.uid(), hospital_id) OR 
    user_id = auth.uid()
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their hospital"
  ON public.user_roles FOR SELECT
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id) OR 
    user_id = auth.uid()
  );

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own initial role"
  ON public.user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for patients
CREATE POLICY "Staff can view patients in their hospital"
  ON public.patients FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can insert patients"
  ON public.patients FOR INSERT
  WITH CHECK (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can update patients"
  ON public.patients FOR UPDATE
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- RLS Policies for appointments
CREATE POLICY "Staff can view appointments in their hospital"
  ON public.appointments FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can manage appointments"
  ON public.appointments FOR ALL
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- RLS Policies for consultations
CREATE POLICY "Staff can view consultations in their hospital"
  ON public.consultations FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Doctors and nurses can manage consultations"
  ON public.consultations FOR ALL
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id) AND
    (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse') OR public.has_role(auth.uid(), 'admin'))
  );

-- RLS Policies for vital_signs
CREATE POLICY "Staff can view vital signs"
  ON public.vital_signs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_id AND public.user_belongs_to_hospital(auth.uid(), p.hospital_id)
    )
  );

CREATE POLICY "Clinical staff can manage vital signs"
  ON public.vital_signs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = patient_id AND public.user_belongs_to_hospital(auth.uid(), p.hospital_id)
    ) AND
    (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'nurse'))
  );

-- RLS Policies for patient_queue
CREATE POLICY "Staff can view queue in their hospital"
  ON public.patient_queue FOR SELECT
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can manage queue"
  ON public.patient_queue FOR ALL
  USING (public.user_belongs_to_hospital(auth.uid(), hospital_id));

-- Update trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate MRN
CREATE OR REPLACE FUNCTION public.generate_mrn(hospital_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
  mrn TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(mrn FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.patients
  WHERE patients.hospital_id = generate_mrn.hospital_id;
  
  mrn := 'MRN' || LPAD(next_number::TEXT, 8, '0');
  RETURN mrn;
END;
$$;

-- Function to get next queue number
CREATE OR REPLACE FUNCTION public.get_next_queue_number(p_hospital_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO next_number
  FROM public.patient_queue
  WHERE hospital_id = p_hospital_id
    AND DATE(created_at) = CURRENT_DATE;
  
  RETURN next_number;
END;
$$;

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;