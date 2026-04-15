-- Phase 5 Feature 2: Telemedicine Integration & Video Consultation
-- Migration 002: Telehealth Sessions & Messaging

-- Create telehealth_sessions table
CREATE TABLE IF NOT EXISTS public.telehealth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  
  -- Meeting provider: zoom, twilio, custom
  provider TEXT NOT NULL CHECK (provider IN ('zoom', 'twilio', 'custom')),
  provider_session_id TEXT NOT NULL,
  
  -- Time tracking
  scheduled_start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  actual_start_at TIMESTAMP WITH TIME ZONE,
  actual_end_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show')),
  
  -- Recording details
  has_recording BOOLEAN DEFAULT FALSE,
  recording_url TEXT,
  recording_duration_minutes INTEGER,
  recording_encrypted BOOLEAN DEFAULT TRUE,
  
  -- Participants
  host_id UUID NOT NULL REFERENCES public.profiles(id),
  max_participants INTEGER DEFAULT 2,
  
  -- Meeting settings
  allow_screen_share BOOLEAN DEFAULT TRUE,
  allow_recording BOOLEAN DEFAULT TRUE,
  encrypted_end_to_end BOOLEAN DEFAULT TRUE,
  
  -- Prescription issued during session
  prescription_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telehealth_sessions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_telehealth_hospital_id ON public.telehealth_sessions(hospital_id);
CREATE INDEX idx_telehealth_appointment_id ON public.telehealth_sessions(appointment_id);
CREATE INDEX idx_telehealth_status ON public.telehealth_sessions(status);
CREATE INDEX idx_telehealth_scheduled_start ON public.telehealth_sessions(scheduled_start_at);

-- RLS Policies
CREATE POLICY "Hospital staff & approved patients can view telehealth sessions"
  ON public.telehealth_sessions
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    OR host_id = auth.uid()
    OR id IN (
      SELECT ts.id FROM public.telehealth_sessions ts
      JOIN public.appointments a ON ts.appointment_id = a.id
      WHERE a.patient_id = auth.uid()
    )
  );

CREATE POLICY "Hospital staff can create telehealth sessions"
  ON public.telehealth_sessions
  FOR INSERT
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    AND host_id = auth.uid()
  );

CREATE POLICY "Hospital staff can update telehealth sessions"
  ON public.telehealth_sessions
  FOR UPDATE
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    OR host_id = auth.uid()
  )
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    OR host_id = auth.uid()
  );

-- Create telehealth_messages table for chat
CREATE TABLE IF NOT EXISTS public.telehealth_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  telehealth_session_id UUID NOT NULL REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  
  -- Sender info
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('doctor', 'nurse', 'patient', 'admin')),
  
  -- Message content (encrypted)
  message_content TEXT NOT NULL,
  encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
  is_encrypted BOOLEAN DEFAULT TRUE,
  
  -- Message metadata
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'prescription_link', 'system')),
  
  -- File attachment (optional)
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size_bytes INTEGER,
  
  -- Deleted flag (soft delete)
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.telehealth_messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_telehealth_messages_session ON public.telehealth_messages(telehealth_session_id);
CREATE INDEX idx_telehealth_messages_sender ON public.telehealth_messages(sender_id);
CREATE INDEX idx_telehealth_messages_created ON public.telehealth_messages(created_at);

-- RLS Policies
CREATE POLICY "Session participants can view messages"
  ON public.telehealth_messages
  FOR SELECT
  USING (
    telehealth_session_id IN (
      SELECT id FROM public.telehealth_sessions
      WHERE host_id = auth.uid()
        OR hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    )
    AND is_deleted = FALSE
  );

CREATE POLICY "Session participants can send messages"
  ON public.telehealth_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND telehealth_session_id IN (
      SELECT id FROM public.telehealth_sessions
      WHERE host_id = auth.uid()
        OR hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    )
  );

-- Create telehealth_screen_shares table
CREATE TABLE IF NOT EXISTS public.telehealth_screen_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telehealth_session_id UUID NOT NULL REFERENCES public.telehealth_sessions(id) ON DELETE CASCADE,
  
  -- Screen share initiator
  initiated_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Tracking
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Recording metadata
  recording_url TEXT,
  is_encrypted BOOLEAN DEFAULT TRUE,
  
  -- Activity log
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telehealth_screen_shares ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX idx_screen_shares_session ON public.telehealth_screen_shares(telehealth_session_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telehealth_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telehealth_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telehealth_screen_shares TO authenticated;
