-- ============================================================================
-- Enforce 2FA for privileged clinical roles (admin, doctor)
-- ============================================================================
-- Audit finding (SECURITY_HIPAA): 2FA is optional; admins/doctors can access PHI
-- without it. This migration makes the requirement server-authoritative via a
-- `two_factor_required` flag on profiles, kept in sync by a trigger on user_roles.
--
-- NOTE: The app's TOTP is custom (not Supabase AAL/MFA), so the JWT carries no MFA
-- claim and RLS cannot test it directly. Enforcement is therefore: (1) this
-- server-set requirement flag + (2) an application route guard that blocks PHI
-- access for these roles until two_factor_enabled = true. See AuthContext /
-- routeDefinitions ProtectedRoute.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS two_factor_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.two_factor_required IS
  'Server-set: true when the user holds a privileged role (admin/doctor). The app blocks access until two_factor_enabled = true.';

-- Which roles must use 2FA.
CREATE OR REPLACE FUNCTION public.role_requires_2fa(p_role text)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$ SELECT p_role IN ('admin', 'doctor') $$;

-- Recompute the flag for a single user from their current roles.
CREATE OR REPLACE FUNCTION public.recompute_two_factor_required(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles p
  SET two_factor_required = EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND public.role_requires_2fa(ur.role::text)
  )
  WHERE p.user_id = p_user_id;
END;
$$;

-- Keep the flag in sync whenever roles change.
CREATE OR REPLACE FUNCTION public.sync_two_factor_required()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_two_factor_required(OLD.user_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_two_factor_required(NEW.user_id);
  IF (TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    PERFORM public.recompute_two_factor_required(OLD.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_two_factor_required ON public.user_roles;
CREATE TRIGGER trg_sync_two_factor_required
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.sync_two_factor_required();

-- Backfill existing privileged users.
UPDATE public.profiles p
SET two_factor_required = EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = p.user_id
    AND public.role_requires_2fa(ur.role::text)
);
