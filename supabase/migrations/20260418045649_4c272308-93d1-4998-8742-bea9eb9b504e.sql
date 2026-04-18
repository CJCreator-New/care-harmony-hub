-- Replace permissive WITH CHECK (true) with admin-only check
DROP POLICY IF EXISTS "Admins can insert hospitals" ON public.hospitals;

CREATE POLICY "Admins can insert hospitals"
ON public.hospitals
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));