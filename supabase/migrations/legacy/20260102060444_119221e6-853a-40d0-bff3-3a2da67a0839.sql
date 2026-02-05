-- Telemedicine sessions table
CREATE TABLE IF NOT EXISTS public.telemedicine_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start TIMESTAMP WITH TIME ZONE,
  actual_end TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show')),
  room_id TEXT,
  meeting_url TEXT,
  notes TEXT,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for telemedicine_sessions
ALTER TABLE public.telemedicine_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for telemedicine_sessions
CREATE POLICY "Staff can view telemedicine sessions" ON public.telemedicine_sessions
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Clinical staff can manage telemedicine sessions" ON public.telemedicine_sessions
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND (
      has_role(auth.uid(), 'doctor'::app_role) OR 
      has_role(auth.uid(), 'nurse'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'receptionist'::app_role)
    )
  );

-- Insurance claims table
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  claim_number TEXT NOT NULL,
  insurance_provider TEXT NOT NULL,
  policy_number TEXT,
  group_number TEXT,
  diagnosis_codes TEXT[],
  procedure_codes TEXT[],
  claim_amount NUMERIC NOT NULL DEFAULT 0,
  approved_amount NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  patient_responsibility NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'in_review', 'approved', 'partially_approved', 'denied', 'appealed', 'paid')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  denial_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for insurance_claims
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- RLS policies for insurance_claims
CREATE POLICY "Staff can view insurance claims" ON public.insurance_claims
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Billing staff can manage insurance claims" ON public.insurance_claims
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'receptionist'::app_role)
    )
  );

-- Payment plans table
CREATE TABLE IF NOT EXISTS public.payment_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  down_payment NUMERIC DEFAULT 0,
  remaining_balance NUMERIC NOT NULL,
  installment_amount NUMERIC NOT NULL,
  installment_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (installment_frequency IN ('weekly', 'bi_weekly', 'monthly')),
  total_installments INTEGER NOT NULL,
  paid_installments INTEGER DEFAULT 0,
  next_due_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'defaulted', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for payment_plans
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_plans
CREATE POLICY "Staff can view payment plans" ON public.payment_plans
  FOR SELECT USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "Billing staff can manage payment plans" ON public.payment_plans
  FOR ALL USING (
    user_belongs_to_hospital(auth.uid(), hospital_id) AND (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'receptionist'::app_role)
    )
  );

-- Patient can view their own payment plans
CREATE POLICY "Patients can view their payment plans" ON public.payment_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.id = payment_plans.patient_id AND p.user_id = auth.uid()
    )
  );

-- Generate unique claim number function
CREATE OR REPLACE FUNCTION public.generate_claim_number(p_hospital_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  claim_count INTEGER;
  new_claim_number TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO claim_count 
  FROM public.insurance_claims 
  WHERE hospital_id = p_hospital_id;
  
  new_claim_number := 'CLM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(claim_count::TEXT, 4, '0');
  RETURN new_claim_number;
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_hospital ON public.telemedicine_sessions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_patient ON public.telemedicine_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_doctor ON public.telemedicine_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_status ON public.telemedicine_sessions(status);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_hospital ON public.insurance_claims(hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_patient ON public.insurance_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON public.insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_hospital ON public.payment_plans(hospital_id);
CREATE INDEX IF NOT EXISTS idx_payment_plans_patient ON public.payment_plans(patient_id);

-- Enable realtime for activity_logs (for audit trail)
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;