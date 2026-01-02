-- Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  head_of_department uuid REFERENCES public.profiles(id),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create hospital beds/rooms table
CREATE TABLE IF NOT EXISTS public.hospital_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id),
  resource_type text NOT NULL CHECK (resource_type IN ('bed', 'room', 'equipment')),
  name text NOT NULL,
  code text,
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  floor text,
  wing text,
  capacity integer DEFAULT 1,
  current_patient_id uuid REFERENCES public.patients(id),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create shift schedules table
CREATE TABLE IF NOT EXISTS public.shift_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments(id),
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  shift_type text DEFAULT 'regular' CHECK (shift_type IN ('regular', 'overtime', 'on_call', 'emergency')),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments
CREATE POLICY "Staff can view departments in their hospital"
ON public.departments FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (user_belongs_to_hospital(auth.uid(), hospital_id) AND has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for hospital_resources
CREATE POLICY "Staff can view resources in their hospital"
ON public.hospital_resources FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Admins and nurses can manage resources"
ON public.hospital_resources FOR ALL
USING (user_belongs_to_hospital(auth.uid(), hospital_id) AND 
       (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'nurse'::app_role)));

-- RLS Policies for shift_schedules
CREATE POLICY "Staff can view shift schedules in their hospital"
ON public.shift_schedules FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Admins can manage shift schedules"
ON public.shift_schedules FOR ALL
USING (user_belongs_to_hospital(auth.uid(), hospital_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_hospital_resources_updated_at
  BEFORE UPDATE ON public.hospital_resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_shift_schedules_updated_at
  BEFORE UPDATE ON public.shift_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();