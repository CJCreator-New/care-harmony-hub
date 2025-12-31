-- Fix function search_path for security
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_mrn(hospital_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_next_queue_number(p_hospital_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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