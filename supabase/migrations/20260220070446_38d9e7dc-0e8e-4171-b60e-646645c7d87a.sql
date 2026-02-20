
-- 1. Create patient_consents table
CREATE TABLE public.patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  treatment_consent BOOLEAN DEFAULT false,
  data_processing_consent BOOLEAN DEFAULT false,
  telemedicine_consent BOOLEAN DEFAULT false,
  data_sharing_consent BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage consents" ON public.patient_consents
  FOR ALL USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Patients can view their own consents" ON public.patient_consents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.patients p WHERE p.id = patient_consents.patient_id AND p.user_id = auth.uid()
  ));

-- 2. Create task_assignments table
CREATE TABLE public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  patient_id UUID REFERENCES public.patients(id),
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view task assignments in their hospital" ON public.task_assignments
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can create task assignments" ON public.task_assignments
  FOR INSERT WITH CHECK (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Staff can update task assignments" ON public.task_assignments
  FOR UPDATE USING (user_belongs_to_hospital(auth.uid(), hospital_id));

-- 3. Add backup_codes_salt to two_factor_secrets
ALTER TABLE public.two_factor_secrets ADD COLUMN IF NOT EXISTS backup_codes_salt TEXT;

-- 4. Create log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB,
  p_severity TEXT DEFAULT 'info'
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, action_type, entity_type, details, user_agent, severity)
  VALUES (
    COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'),
    p_event_type,
    'security',
    jsonb_build_object('severity', p_severity) || COALESCE(p_details, '{}'::jsonb),
    p_user_agent,
    p_severity
  );
END;
$$;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_assignments_hospital ON public.task_assignments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assigned_to ON public.task_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status ON public.task_assignments(status);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON public.patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_hospital ON public.patient_consents(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON public.appointments(scheduled_date);
