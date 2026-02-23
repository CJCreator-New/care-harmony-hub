
-- =====================================================
-- FIX: Remove permissive user_roles INSERT policy
-- and create secure assign_patient_role RPC
-- =====================================================

-- Step 1: Drop the dangerously permissive policy that allows self-assigning ANY role
DROP POLICY IF EXISTS "Users can insert their own initial role" ON public.user_roles;

-- Step 2: Drop the restrictive policy too (it may or may not exist) to recreate cleanly
DROP POLICY IF EXISTS "Users can insert initial admin role for new hospital" ON public.user_roles;

-- Step 3: NO client-side INSERT policy on user_roles at all.
-- All role assignments go through SECURITY DEFINER functions:
--   - create_hospital_with_admin (hospital signup → admin role)
--   - accept_staff_invitation (staff join → invited role)
--   - assign_patient_role (patient self-registration → patient role only)

-- Step 4: Create secure patient role assignment function
CREATE OR REPLACE FUNCTION public.assign_patient_role(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Only assign patient role - no other role can be assigned through this function
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Only authenticated users can call this (for self-registration)
REVOKE EXECUTE ON FUNCTION public.assign_patient_role(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_patient_role(UUID) TO authenticated;
