-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create prescription refill requests table
CREATE TABLE public.prescription_refill_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'fulfilled')),
  reason TEXT,
  notes TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescription_refill_requests ENABLE ROW LEVEL SECURITY;

-- Patients can create refill requests for their own prescriptions
CREATE POLICY "Patients can create refill requests"
ON public.prescription_refill_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = prescription_refill_requests.patient_id
    AND p.user_id = auth.uid()
  )
);

-- Patients can view their own refill requests
CREATE POLICY "Patients can view their refill requests"
ON public.prescription_refill_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patients p
    WHERE p.id = prescription_refill_requests.patient_id
    AND p.user_id = auth.uid()
  )
);

-- Staff can view refill requests in their hospital
CREATE POLICY "Staff can view refill requests"
ON public.prescription_refill_requests
FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

-- Pharmacists and doctors can update refill requests
CREATE POLICY "Pharmacists and doctors can update refill requests"
ON public.prescription_refill_requests
FOR UPDATE
USING (
  user_belongs_to_hospital(auth.uid(), hospital_id) 
  AND (
    has_role(auth.uid(), 'pharmacist'::app_role) 
    OR has_role(auth.uid(), 'doctor'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_prescription_refill_requests_updated_at
BEFORE UPDATE ON public.prescription_refill_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();