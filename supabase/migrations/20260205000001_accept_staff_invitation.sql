-- Create transactional invitation acceptance for staff onboarding
-- This function is intended to be called from a server-side context (edge function).

CREATE OR REPLACE FUNCTION public.accept_staff_invitation(
  p_token TEXT,
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.staff_invitations%ROWTYPE;
BEGIN
  SELECT *
  INTO v_invitation
  FROM public.staff_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  INSERT INTO public.profiles (user_id, first_name, last_name, email, hospital_id)
  VALUES (p_user_id, p_first_name, p_last_name, p_email, v_invitation.hospital_id)
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    hospital_id = EXCLUDED.hospital_id;

  INSERT INTO public.user_roles (user_id, role, hospital_id)
  VALUES (p_user_id, v_invitation.role, v_invitation.hospital_id)
  ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

  UPDATE public.staff_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'invitation_id', v_invitation.id,
    'hospital_id', v_invitation.hospital_id,
    'role', v_invitation.role
  );
END;
$$;
