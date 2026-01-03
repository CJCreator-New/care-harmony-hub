-- Fix ambiguous mrn column reference in generate_mrn function
CREATE OR REPLACE FUNCTION public.generate_mrn(hospital_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
  new_mrn TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(patients.mrn FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.patients
  WHERE patients.hospital_id = generate_mrn.hospital_id;
  
  new_mrn := 'MRN' || LPAD(next_number::TEXT, 8, '0');
  RETURN new_mrn;
END;
$function$;