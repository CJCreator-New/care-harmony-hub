-- M3 RLS hardening: remove permissive non-SELECT write policies.
-- This migration is idempotent and safe to run in environments with partial schema drift.

DO $$
BEGIN
  -- Harden hospitals INSERT policy (previously WITH CHECK (true) in older migrations).
  IF to_regclass('public.hospitals') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can insert hospitals" ON public.hospitals;
    CREATE POLICY "Admins can insert hospitals"
      ON public.hospitals FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- Harden error_logs INSERT policy (previously WITH CHECK (true) in older migrations).
  IF to_regclass('public.error_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can insert error logs" ON public.error_logs;
    CREATE POLICY "Users can insert error logs"
      ON public.error_logs FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Harden performance_logs INSERT policy (previously WITH CHECK (true)).
  IF to_regclass('public.performance_logs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can insert performance logs" ON public.performance_logs;
    DROP POLICY IF EXISTS "Admins can insert performance logs" ON public.performance_logs;
    CREATE POLICY "Admins can insert performance logs"
      ON public.performance_logs FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = 'admin'
        )
      );
  END IF;
END;
$$;

