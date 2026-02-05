-- Harden staff invitation access to prevent token enumeration via RLS

DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;
