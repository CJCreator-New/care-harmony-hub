-- Create messaging tables for cross-role communication
-- Migration: 20260128000000_create_messaging_tables.sql

-- Messages table for secure messaging between users
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication messages table for role-based messaging
CREATE TABLE IF NOT EXISTS communication_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  recipient_role TEXT,
  message_type TEXT NOT NULL CHECK (message_type IN ('task_assignment', 'status_update', 'urgent_alert', 'general', 'patient_update', 'workflow_notification')),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  related_entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication threads table for threaded conversations
CREATE TABLE IF NOT EXISTS communication_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  participants UUID[] NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  task_assignments BOOLEAN DEFAULT TRUE,
  urgent_alerts BOOLEAN DEFAULT TRUE,
  status_updates BOOLEAN DEFAULT TRUE,
  patient_updates BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_hospital_sender ON messages(hospital_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_hospital_recipient ON messages(hospital_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_patient ON messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_messages_hospital ON communication_messages(hospital_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_sender ON communication_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_recipient ON communication_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_type ON communication_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_communication_messages_priority ON communication_messages(priority);
CREATE INDEX IF NOT EXISTS idx_communication_messages_created_at ON communication_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_threads_hospital ON communication_threads(hospital_id);
CREATE INDEX IF NOT EXISTS idx_communication_threads_participants ON communication_threads USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_communication_threads_patient ON communication_threads(patient_id);

-- Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "messages_hospital_access" ON messages
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "messages_user_access" ON messages
  FOR ALL USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- RLS Policies for communication_messages
CREATE POLICY "communication_messages_hospital_access" ON communication_messages
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "communication_messages_user_access" ON communication_messages
  FOR ALL USING (
    sender_id = auth.uid() OR
    recipient_id = auth.uid() OR
    (recipient_role IS NOT NULL AND recipient_role IN (
      SELECT role FROM user_roles WHERE user_id = auth.uid()
    ))
  );

-- RLS Policies for communication_threads
CREATE POLICY "communication_threads_hospital_access" ON communication_threads
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "communication_threads_participant_access" ON communication_threads
  FOR ALL USING (
    auth.uid() = ANY(participants)
  );

-- RLS Policies for notification_settings
CREATE POLICY "notification_settings_user_access" ON notification_settings
  FOR ALL USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_messages_updated_at
  BEFORE UPDATE ON communication_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_threads_updated_at
  BEFORE UPDATE ON communication_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE communication_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE communication_threads;

-- Workflow action failures table for tracking failed automated actions
CREATE TABLE IF NOT EXISTS workflow_action_failures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  workflow_event_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_metadata JSONB,
  error_message TEXT NOT NULL,
  retry_attempts INTEGER DEFAULT 0,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for workflow action failures
CREATE INDEX IF NOT EXISTS idx_workflow_action_failures_hospital ON workflow_action_failures(hospital_id);
CREATE INDEX IF NOT EXISTS idx_workflow_action_failures_resolved ON workflow_action_failures(resolved);
CREATE INDEX IF NOT EXISTS idx_workflow_action_failures_created_at ON workflow_action_failures(created_at DESC);

-- RLS for workflow action failures
ALTER TABLE workflow_action_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_action_failures_hospital_access" ON workflow_action_failures
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Real-time subscription for workflow action failures
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_action_failures;

-- Comment
COMMENT ON TABLE workflow_action_failures IS 'Tracks failed workflow actions for admin review and retry';