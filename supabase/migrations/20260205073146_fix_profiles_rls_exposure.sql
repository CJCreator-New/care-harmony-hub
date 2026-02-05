-- Fix profiles table RLS exposure - prevent access to profiles with NULL hospital_id
-- Drop the overly permissive policy from misc.sql that allows hospital_id IS NULL
DROP POLICY IF EXISTS "Users can view profiles in their hospital" ON profiles;

-- Recreate the secure policy that requires hospital_id to be NOT NULL
CREATE POLICY "Users can view profiles in their hospital" ON profiles
  FOR SELECT TO authenticated
  USING (
    hospital_id IS NOT NULL AND
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );