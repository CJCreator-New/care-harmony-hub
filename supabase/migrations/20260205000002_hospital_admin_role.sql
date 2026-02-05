-- Create transactional hospital creation with enforced admin role assignment

CREATE OR REPLACE FUNCTION public.create_hospital_with_admin(
  p_user_id UUID,
  p_name TEXT,
  p_address TEXT,
  p_city TEXT,
  p_state TEXT,
  p_zip TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_license_number TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
  v_profile_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  v_hospital_id := gen_random_uuid();

  INSERT INTO public.hospitals (
    id,
    name,
    address,
    city,
    state,
    zip,
    phone,
    email,
    license_number
  ) VALUES (
    v_hospital_id,
    p_name,
    NULLIF(p_address, ''),
    NULLIF(p_city, ''),
    NULLIF(p_state, ''),
    NULLIF(p_zip, ''),
    NULLIF(p_phone, ''),
    NULLIF(p_email, ''),
    NULLIF(p_license_number, '')
  );

  UPDATE public.profiles
  SET hospital_id = v_hospital_id
  WHERE user_id = p_user_id
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  INSERT INTO public.user_roles (user_id, role, hospital_id)
  VALUES (p_user_id, 'admin', v_hospital_id)
  ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

  RETURN v_hospital_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_hospital_with_admin(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_hospital_with_admin(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.accept_staff_invitation(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_staff_invitation(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;

DROP POLICY IF EXISTS "Users can insert their own initial role" ON public.user_roles;

CREATE POLICY "Users can insert initial admin role for new hospital"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'admin'
    AND hospital_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.hospital_id = user_roles.hospital_id
    )
  );
