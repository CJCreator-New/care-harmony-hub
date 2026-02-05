-- Fix overly permissive RLS policies
-- These tables had USING (true) for ALL operations which is a security vulnerability

-- Fix user_sessions RLS
-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "user_sessions_all" ON user_sessions;
DROP POLICY IF EXISTS "Users can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete all sessions" ON user_sessions;

-- Create restrictive policies for user_sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON user_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Fix prediction_models RLS
-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "prediction_models_all" ON prediction_models;
DROP POLICY IF EXISTS "Users can view all prediction models" ON prediction_models;
DROP POLICY IF EXISTS "Users can insert all prediction models" ON prediction_models;
DROP POLICY IF EXISTS "Users can update all prediction models" ON prediction_models;
DROP POLICY IF EXISTS "Users can delete all prediction models" ON prediction_models;

-- Create restrictive policies for prediction_models
-- Only admin users can modify, others can only view
CREATE POLICY "Users can view published prediction models"
  ON prediction_models FOR SELECT
  USING (status = 'published' OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can insert prediction models"
  ON prediction_models FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can update prediction models"
  ON prediction_models FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Admins can delete prediction models"
  ON prediction_models FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Fix dur_criteria RLS
-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "dur_criteria_all" ON dur_criteria;
DROP POLICY IF EXISTS "Users can view all dur_criteria" ON dur_criteria;
DROP POLICY IF EXISTS "Users can insert all dur_criteria" ON dur_criteria;
DROP POLICY IF EXISTS "Users can update all dur_criteria" ON dur_criteria;
DROP POLICY IF EXISTS "Users can delete all dur_criteria" ON dur_criteria;

-- Create restrictive policies for dur_criteria
-- Pharmacists and admins can modify, others can view
CREATE POLICY "Users can view dur_criteria"
  ON dur_criteria FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM profiles 
    WHERE role IN ('pharmacist', 'admin') 
    OR hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Staff can insert dur_criteria"
  ON dur_criteria FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('pharmacist', 'admin')));

CREATE POLICY "Staff can update dur_criteria"
  ON dur_criteria FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role IN ('pharmacist', 'admin')));

CREATE POLICY "Admins can delete dur_criteria"
  ON dur_criteria FOR DELETE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));
