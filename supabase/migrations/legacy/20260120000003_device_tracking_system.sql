-- Phase 3: Security & Compliance Enhancements - Device Tracking
-- Migration: 20260120000003_device_tracking_system.sql

-- Create user_devices table for device tracking and management
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  os TEXT,
  ip_address INET,
  location TEXT,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  is_trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique device per user
  UNIQUE(user_id, device_id)
);

-- Create user_sessions table for enhanced session management
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES user_devices(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Index for efficient session lookups
  INDEX idx_user_sessions_user_id (user_id),
  INDEX idx_user_sessions_token (session_token),
  INDEX idx_user_sessions_expires (expires_at)
);

-- Create security_events table for security monitoring
CREATE TABLE IF NOT EXISTS security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success', 'login_failure', 'logout', 'password_change',
    'device_trusted', 'device_untrusted', 'device_removed',
    'suspicious_activity', 'password_reset', '2fa_enabled', '2fa_disabled'
  )),
  device_id UUID REFERENCES user_devices(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  location TEXT,
  details JSONB DEFAULT '{}',
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for efficient querying
  INDEX idx_security_events_user_id (user_id),
  INDEX idx_security_events_type (event_type),
  INDEX idx_security_events_created (created_at DESC)
);

-- Create password_policies table for secure password requirements
CREATE TABLE IF NOT EXISTS password_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_symbols BOOLEAN DEFAULT true,
  prevent_reuse_count INTEGER DEFAULT 5,
  max_age_days INTEGER DEFAULT 90,
  lockout_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- One policy per hospital
  UNIQUE(hospital_id)
);

-- Enable RLS on all new tables
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_devices
CREATE POLICY "Users can view their own devices" ON user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own devices" ON user_devices
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for security_events
CREATE POLICY "Users can view their own security events" ON security_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all security events for their hospital" ON security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.hospital_id IN (
        SELECT p2.hospital_id FROM profiles p2 WHERE p2.user_id = security_events.user_id
      )
    )
  );

-- RLS Policies for password_policies
CREATE POLICY "Hospital members can view password policies" ON password_policies
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage password policies" ON password_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_device_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO security_events (
    user_id, event_type, device_id, ip_address,
    user_agent, location, details, severity
  ) VALUES (
    p_user_id, p_event_type, p_device_id, p_ip_address,
    p_user_agent, p_location, p_details, p_severity
  );
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_sessions SET is_active = false WHERE expires_at < NOW();
  DELETE FROM user_sessions WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Function to validate password against policy
CREATE OR REPLACE FUNCTION validate_password_policy(
  p_hospital_id UUID,
  p_password TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  errors TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  policy_record RECORD;
  error_list TEXT[] := ARRAY[]::TEXT[];
  has_upper BOOLEAN := false;
  has_lower BOOLEAN := false;
  has_number BOOLEAN := false;
  has_symbol BOOLEAN := false;
BEGIN
  -- Get password policy for hospital
  SELECT * INTO policy_record
  FROM password_policies
  WHERE hospital_id = p_hospital_id;

  -- If no policy exists, use defaults
  IF policy_record IS NULL THEN
    policy_record := ROW(
      NULL, NULL, 8, true, true, true, true, 5, 90, 5, 30, NOW(), NOW()
    )::password_policies;
  END IF;

  -- Check minimum length
  IF length(p_password) < policy_record.min_length THEN
    error_list := array_append(error_list, 'Password must be at least ' || policy_record.min_length || ' characters long');
  END IF;

  -- Check character requirements
  IF policy_record.require_uppercase AND NOT (p_password ~ '[A-Z]') THEN
    error_list := array_append(error_list, 'Password must contain at least one uppercase letter');
  END IF;

  IF policy_record.require_lowercase AND NOT (p_password ~ '[a-z]') THEN
    error_list := array_append(error_list, 'Password must contain at least one lowercase letter');
  END IF;

  IF policy_record.require_numbers AND NOT (p_password ~ '[0-9]') THEN
    error_list := array_append(error_list, 'Password must contain at least one number');
  END IF;

  IF policy_record.require_symbols AND NOT (p_password ~ '[^a-zA-Z0-9]') THEN
    error_list := array_append(error_list, 'Password must contain at least one special character');
  END IF;

  RETURN QUERY SELECT
    array_length(error_list, 1) IS NULL,
    error_list;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_security_events_user_created ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_type_created ON security_events(event_type, created_at DESC);

-- Insert default password policy for existing hospitals
INSERT INTO password_policies (hospital_id)
SELECT id FROM hospitals
ON CONFLICT (hospital_id) DO NOTHING;</content>
<parameter name="filePath">c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub\supabase\migrations\20260120000003_device_tracking_system.sql