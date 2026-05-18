-- Lock down two_factor_secrets: clients must never read/modify TOTP secrets directly.
-- All TOTP verification and management goes through edge functions using service role.
DROP POLICY IF EXISTS "Users can view their own 2FA secrets" ON public.two_factor_secrets;
DROP POLICY IF EXISTS "Users can update their own 2FA secrets" ON public.two_factor_secrets;
DROP POLICY IF EXISTS "Users can delete their own 2FA secrets" ON public.two_factor_secrets;
DROP POLICY IF EXISTS "Users can insert their own 2FA secrets" ON public.two_factor_secrets;