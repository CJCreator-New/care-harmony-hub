-- Add security columns to profiles table for login attempt tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS security_question text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS security_answer text DEFAULT NULL;

-- Add is_staff column to distinguish staff from patients
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_staff boolean DEFAULT false;

-- Add last_login column for tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login timestamp with time zone DEFAULT NULL;

-- Create function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT locked_until > now() FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- Create function to increment failed login attempts
CREATE OR REPLACE FUNCTION public.increment_failed_login(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts integer;
BEGIN
  SELECT failed_login_attempts INTO current_attempts
  FROM public.profiles WHERE user_id = _user_id;
  
  UPDATE public.profiles 
  SET failed_login_attempts = COALESCE(current_attempts, 0) + 1,
      locked_until = CASE 
        WHEN COALESCE(current_attempts, 0) + 1 >= 5 
        THEN now() + interval '30 minutes'
        ELSE locked_until
      END
  WHERE user_id = _user_id;
END;
$$;

-- Create function to reset failed login attempts
CREATE OR REPLACE FUNCTION public.reset_failed_login(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET failed_login_attempts = 0,
      locked_until = NULL,
      last_login = now()
  WHERE user_id = _user_id;
END;
$$;