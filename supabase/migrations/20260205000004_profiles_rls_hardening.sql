-- Harden profiles RLS to prevent public exposure of unassigned profiles

DROP POLICY IF EXISTS "Users can view profiles in their hospital" ON public.profiles;

CREATE POLICY "Users can view profiles in their hospital"
  ON public.profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.user_belongs_to_hospital(auth.uid(), hospital_id)
  );
