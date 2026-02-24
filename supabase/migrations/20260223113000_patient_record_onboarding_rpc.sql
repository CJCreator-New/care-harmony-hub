-- Ensure patient self-registration also creates a patients row.
-- This function is SECURITY DEFINER because patients has no direct insert policy for authenticated users.
CREATE OR REPLACE FUNCTION public.ensure_patient_record_for_user(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_zip TEXT DEFAULT NULL,
  p_blood_type TEXT DEFAULT NULL,
  p_allergies TEXT[] DEFAULT NULL,
  p_chronic_conditions TEXT[] DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_emergency_contact_relationship TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id UUID;
  v_hospital_id UUID;
  v_mrn TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  SELECT id INTO v_patient_id
  FROM public.patients
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_patient_id IS NOT NULL THEN
    RETURN v_patient_id;
  END IF;

  SELECT p.hospital_id INTO v_hospital_id
  FROM public.profiles p
  WHERE p.user_id = p_user_id
  LIMIT 1;

  IF v_hospital_id IS NULL THEN
    SELECT h.id INTO v_hospital_id
    FROM public.hospitals h
    ORDER BY h.created_at ASC
    LIMIT 1;
  END IF;

  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'No hospital available for patient record creation';
  END IF;

  v_mrn := 'PT-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || SUBSTRING(REPLACE(p_user_id::TEXT, '-', ''), 1, 6);

  INSERT INTO public.patients (
    user_id,
    hospital_id,
    first_name,
    last_name,
    email,
    phone,
    date_of_birth,
    gender,
    address,
    city,
    state,
    zip,
    blood_type,
    allergies,
    chronic_conditions,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    mrn
  ) VALUES (
    p_user_id,
    v_hospital_id,
    COALESCE(NULLIF(TRIM(p_first_name), ''), 'Patient'),
    COALESCE(NULLIF(TRIM(p_last_name), ''), 'User'),
    p_email,
    p_phone,
    COALESCE(p_date_of_birth, CURRENT_DATE),
    CASE
      WHEN p_gender IN ('male', 'female', 'other') THEN p_gender::public.gender_type
      ELSE 'other'::public.gender_type
    END,
    p_address,
    p_city,
    p_state,
    p_zip,
    p_blood_type,
    p_allergies,
    p_chronic_conditions,
    p_emergency_contact_name,
    p_emergency_contact_phone,
    p_emergency_contact_relationship,
    v_mrn
  )
  RETURNING id INTO v_patient_id;

  RETURN v_patient_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_patient_record_for_user(
  UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.ensure_patient_record_for_user(
  UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT[], TEXT, TEXT, TEXT
) TO authenticated;

