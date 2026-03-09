-- Migration: 20260309000005_realtime_and_feature_flags_fixes.sql
-- Purpose:
--   Part A: Add missing Realtime publications for patient-safety-critical tables:
--     - critical_value_notifications (urgent lab alerts)
--     - critical_results (urgent lab results)
--     - lab_results (ordering physician result delivery)
--     - telemedicine_sessions (WebRTC session state transitions)
--     - appointment_waitlist (live queue for receptionists)
--     - shift_handovers (time-sensitive nurse handoffs)
--     - medical_records (new records visible in patient portal without refresh)
--   Part B: Fix the feature_flags admin write policy which JOINs a non-existent
--           `roles` table, making it impossible for admins to toggle feature flags.
-- Idempotent: idempotent DO block for Realtime, DROP/CREATE for policies.

-- ============================================================
-- Part A: Realtime Publications
-- ============================================================

DO $$
BEGIN
  -- critical_value_notifications (patient-safety — high priority)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'critical_value_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.critical_value_notifications;
  END IF;

  -- critical_results (patient-safety — high priority)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'critical_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.critical_results;
  END IF;

  -- lab_results (ordering physician result delivery)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'lab_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lab_results;
  END IF;

  -- telemedicine_sessions (WebRTC UI needs live session status)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'telemedicine_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.telemedicine_sessions;
  END IF;

  -- appointment_waitlist (live queue for receptionists / patients)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'appointment_waitlist'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_waitlist;
  END IF;

  -- shift_handovers (time-sensitive acknowledgement by incoming nurse)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'shift_handovers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_handovers;
  END IF;

  -- medical_records (new records from a consultation should appear without refresh)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'medical_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_records;
  END IF;

  -- secure_messages (patient portal messaging)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'secure_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.secure_messages;
  END IF;

  -- stock_alerts (pharmacy inventory alerts need real-time push)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'stock_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_alerts;
  END IF;

  -- patient_prep_checklists (nurse check off → doctor sees patient ready instantly)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'patient_prep_checklists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_prep_checklists;
  END IF;
END;
$$;

-- ============================================================
-- Part B: Fix feature_flags admin write policy
-- The old policy JOINs a non-existent `roles` table:
--   JOIN user_roles ur ON ur.user_id = p.id  ← wrong key (p.id vs p.user_id)
--   JOIN roles r ON r.id = ur.role_id        ← `roles` table does not exist
-- Replace with has_role() helper.
-- ============================================================

DROP POLICY IF EXISTS "Admin can manage feature flags" ON public.feature_flags;
CREATE POLICY "Admin can manage feature flags"
  ON public.feature_flags FOR ALL
  TO authenticated
  USING (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.user_belongs_to_hospital(auth.uid(), hospital_id)
    AND public.has_role(auth.uid(), 'admin')
  );
