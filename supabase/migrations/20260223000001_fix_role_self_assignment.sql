-- =============================================================================
-- Migration: Fix role self-assignment privilege escalation vulnerability
-- Date: 2026-02-23
-- =============================================================================
-- Addresses three vulnerabilities:
--   1. Permissive "Users can insert their own initial role" policy still live
--   2. No server-side function for patient role assignment
-- =============================================================================

-- ── Step 1: Remove the overly permissive INSERT policy ───────────────────────
-- This policy allowed any authenticated user to insert ANY role for themselves.
DROP POLICY IF EXISTS "Users can insert their own initial role" ON public.user_roles;

-- ── Step 2: Ensure the restrictive replacement policy exists ─────────────────
-- This was intended in 20260205000002_hospital_admin_role.sql but the live DB
-- still carried the old policy. Re-applying idempotently with DROP + CREATE.
DROP POLICY IF EXISTS "Users can insert initial admin role for new hospital" ON public.user_roles;

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

-- ── Step 3: Create SECURITY DEFINER function for patient self-registration ────
-- Called by patients on account creation; only ever inserts the 'patient' role.
CREATE OR REPLACE FUNCTION public.assign_patient_role(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is assigning their own user id only
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot assign role for another user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Guard: do not overwrite an existing role
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'User already has an assigned role';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Only authenticated users may call this function (no PUBLIC access)
REVOKE EXECUTE ON FUNCTION public.assign_patient_role(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.assign_patient_role(UUID) TO authenticated;

COMMENT ON FUNCTION public.assign_patient_role(UUID) IS
  'SECURITY DEFINER: assigns the patient role to a self-registering user. '
  'Enforces caller == p_user_id and rejects if a role already exists. '
  'Never grants any role other than patient.';
