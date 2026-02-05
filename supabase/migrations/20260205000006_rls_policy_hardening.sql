-- Harden overly permissive RLS policies (SEC-4)

-- Hospitals: restrict inserts to admins (service role bypasses RLS)
DROP POLICY IF EXISTS "Admins can insert hospitals" ON public.hospitals;
CREATE POLICY "Admins can insert hospitals"
  ON public.hospitals FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Error logs: ensure users can only insert their own logs
DROP POLICY IF EXISTS "Users can insert error logs" ON public.error_logs;
CREATE POLICY "Users can insert error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
