-- Migration: 20260617000001_tighten_activity_logs_rls.sql
-- Purpose: Tighten activity_logs SELECT policy so non-admin staff can only read
-- their own log entries. Admins retain full hospital-scoped read access.
-- Previously all hospital staff could read ALL activity logs, which meant a nurse
-- or pharmacist could directly query the full audit trail via the Supabase client,
-- bypassing the admin-only UI route guard at /settings/activity.

-- Replace the overly-broad SELECT policy
DROP POLICY IF EXISTS "Hospital staff can view activity logs" ON activity_logs;

-- Admins can read all logs for their hospital
CREATE POLICY "Admins can view hospital activity logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Non-admin staff can only read their own log entries
CREATE POLICY "Staff can view own activity logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND NOT public.has_role(auth.uid(), 'admin')
  );
