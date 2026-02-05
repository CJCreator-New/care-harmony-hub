-- Real-time Communication Enhancement Migration
-- Phase 1: Week 3-4 Implementation

-- Create notification channels table
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('role_based', 'department', 'emergency', 'personal')) NOT NULL,
  participants UUID[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(user_id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create real-time messages table
CREATE TABLE IF NOT EXISTS real_time_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(user_id),
  message TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('text', 'alert', 'task', 'patient_update')) DEFAULT 'text',
  patient_id UUID REFERENCES patients(id),
  priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  read_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_time_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification channels
CREATE POLICY "user_notification_channels" ON notification_channels
  FOR ALL TO authenticated
  USING (auth.uid() = ANY(participants));

-- RLS Policies for real-time messages
CREATE POLICY "user_real_time_messages" ON real_time_messages
  FOR ALL TO authenticated
  USING (
    channel_id IN (
      SELECT id FROM notification_channels 
      WHERE auth.uid() = ANY(participants)
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_channels_hospital ON notification_channels(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notification_channels_type ON notification_channels(type);
CREATE INDEX IF NOT EXISTS idx_real_time_messages_channel ON real_time_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_real_time_messages_created ON real_time_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_real_time_messages_priority ON real_time_messages(priority);

-- Function to create default channels for hospitals
CREATE OR REPLACE FUNCTION create_default_notification_channels(hospital_id_param UUID)
RETURNS VOID AS $$
DECLARE
  admin_users UUID[];
  doctor_users UUID[];
  nurse_users UUID[];
  all_staff UUID[];
BEGIN
  -- Get user arrays by role
  SELECT array_agg(p.user_id) INTO admin_users
  FROM profiles p
  JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE p.hospital_id = hospital_id_param AND ur.role = 'admin';

  SELECT array_agg(p.user_id) INTO doctor_users
  FROM profiles p
  JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE p.hospital_id = hospital_id_param AND ur.role = 'doctor';

  SELECT array_agg(p.user_id) INTO nurse_users
  FROM profiles p
  JOIN user_roles ur ON p.user_id = ur.user_id
  WHERE p.hospital_id = hospital_id_param AND ur.role = 'nurse';

  SELECT array_agg(p.user_id) INTO all_staff
  FROM profiles p
  WHERE p.hospital_id = hospital_id_param AND p.is_staff = true;

  -- Create default channels
  INSERT INTO notification_channels (hospital_id, name, type, participants) VALUES
    (hospital_id_param, 'Emergency Alerts', 'emergency', COALESCE(all_staff, '{}')),
    (hospital_id_param, 'Admin Announcements', 'role_based', COALESCE(admin_users, '{}')),
    (hospital_id_param, 'Clinical Updates', 'role_based', COALESCE(doctor_users || nurse_users, '{}')),
    (hospital_id_param, 'General Staff', 'role_based', COALESCE(all_staff, '{}'))
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create default channels for existing hospitals
SELECT create_default_notification_channels(id) FROM hospitals;

-- Function to automatically add users to appropriate channels
CREATE OR REPLACE FUNCTION add_user_to_channels()
RETURNS TRIGGER AS $$
BEGIN
  -- Add to general staff channel
  UPDATE notification_channels 
  SET participants = array_append(participants, NEW.user_id)
  WHERE hospital_id = NEW.hospital_id 
    AND name = 'General Staff'
    AND NOT (NEW.user_id = ANY(participants));

  -- Add to emergency channel
  UPDATE notification_channels 
  SET participants = array_append(participants, NEW.user_id)
  WHERE hospital_id = NEW.hospital_id 
    AND name = 'Emergency Alerts'
    AND NOT (NEW.user_id = ANY(participants));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add new staff to channels
CREATE TRIGGER add_staff_to_channels
  AFTER INSERT ON profiles
  FOR EACH ROW
  WHEN (NEW.is_staff = true)
  EXECUTE FUNCTION add_user_to_channels();