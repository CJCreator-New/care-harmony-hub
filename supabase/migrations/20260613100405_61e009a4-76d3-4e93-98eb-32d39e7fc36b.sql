
-- 1. Fix profiles SELECT policy: remove the hospital_id IS NULL branch that exposes unassigned profiles
DROP POLICY IF EXISTS "Users can view profiles in their hospital" ON public.profiles;
CREATE POLICY "Users can view profiles in their hospital"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (hospital_id IS NOT NULL AND public.user_belongs_to_hospital(auth.uid(), hospital_id))
  );

-- 2. Fix staff_invitations: drop public token policy, expose lookup via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  hospital_id uuid,
  email text,
  role app_role,
  status invitation_status,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, hospital_id, email, role, status, expires_at
  FROM public.staff_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated;

-- 3. Fix user_roles cross-tenant privilege escalation: scope admin management to the same hospital
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles in their hospital"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND hospital_id IS NOT NULL
    AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    AND hospital_id IS NOT NULL
    AND public.user_belongs_to_hospital(auth.uid(), hospital_id)
  );
