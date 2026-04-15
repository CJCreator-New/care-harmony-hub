-- Phase 5 Feature 1: Appointment Recurrence & No-Show Tracking
-- Migration 001: Appointment Recurrence Patterns

-- Create appointment_recurrence_patterns table
CREATE TABLE IF NOT EXISTS public.appointment_recurrence_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Recurrence type: daily, weekly, bi_weekly, monthly, custom
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'bi_weekly', 'monthly', 'custom')),
  
  -- Recurrence rule in JSONB format
  -- Example: {"interval": 1, "day_of_week": ["MON", "WED"], "time": "10:00"}
  recurrence_rule JSONB NOT NULL DEFAULT '{}',
  
  -- Duration of recurrence
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  
  -- Exceptions (holidays, manual blocks)
  exceptions JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.appointment_recurrence_patterns ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX idx_recurrence_hospital_id ON public.appointment_recurrence_patterns(hospital_id);
CREATE INDEX idx_recurrence_appointment_id ON public.appointment_recurrence_patterns(appointment_id);
CREATE INDEX idx_recurrence_start_date ON public.appointment_recurrence_patterns(start_date);

-- RLS Policies: Hospital-scoped access
CREATE POLICY "Hospital staff can view recurrence patterns"
  ON public.appointment_recurrence_patterns
  FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM public.staff WHERE user_id = auth.uid()
      UNION
      SELECT hospital_id FROM public.patients WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Hospital staff can create recurrence patterns"
  ON public.appointment_recurrence_patterns
  FOR INSERT
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Hospital staff can update recurrence patterns"
  ON public.appointment_recurrence_patterns
  FOR UPDATE
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  )
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Hospital staff can delete recurrence patterns"
  ON public.appointment_recurrence_patterns
  FOR DELETE
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

-- Add columns to appointments table for no-show tracking
ALTER TABLE public.appointments 
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS attended_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS no_show_flagged_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS follow_up_contact_sent BOOLEAN DEFAULT FALSE;

-- Create appointment_no_shows table
CREATE TABLE IF NOT EXISTS public.appointment_no_shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Reason code: no_show, cancelled, rescheduled, completed
  reason_code TEXT NOT NULL CHECK (reason_code IN ('no_show', 'cancelled', 'rescheduled', 'completed')),
  
  -- Follow-up action status
  follow_up_status TEXT DEFAULT 'pending' CHECK (follow_up_status IN ('pending', 'sent', 'ignored', 'resolved')),
  follow_up_notes TEXT,
  
  -- Audit fields
  flagged_by UUID NOT NULL REFERENCES public.profiles(id),
  flagged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Patient communication
  patient_notified_at TIMESTAMP WITH TIME ZONE,
  patient_notification_channel TEXT CHECK (patient_notification_channel IN ('email', 'sms', 'push', 'app'))
);

-- Enable RLS
ALTER TABLE public.appointment_no_shows ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_no_shows_hospital_id ON public.appointment_no_shows(hospital_id);
CREATE INDEX idx_no_shows_appointment_id ON public.appointment_no_shows(appointment_id);
CREATE INDEX idx_no_shows_flagged_at ON public.appointment_no_shows(flagged_at);
CREATE INDEX idx_no_shows_reason_code ON public.appointment_no_shows(reason_code);

-- RLS Policies
CREATE POLICY "Hospital staff can view no-shows"
  ON public.appointment_no_shows
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Hospital staff can create no-shows"
  ON public.appointment_no_shows
  FOR INSERT
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Hospital staff can update no-shows"
  ON public.appointment_no_shows
  FOR UPDATE
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  )
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

-- Add audit trigger for recurrence patterns
CREATE OR REPLACE FUNCTION public.log_recurrence_pattern_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs(
    hospital_id,
    user_id,
    action,
    table_name,
    record_id,
    changes,
    created_at
  ) VALUES (
    NEW.hospital_id,
    auth.uid(),
    TG_OP,
    'appointment_recurrence_patterns',
    NEW.id,
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_recurrence_changes
AFTER INSERT OR UPDATE OR DELETE ON public.appointment_recurrence_patterns
FOR EACH ROW
EXECUTE FUNCTION public.log_recurrence_pattern_changes();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_recurrence_patterns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_no_shows TO authenticated;
