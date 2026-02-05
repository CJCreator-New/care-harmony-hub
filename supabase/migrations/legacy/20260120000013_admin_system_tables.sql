-- Admin System Tables Migration
-- Version: 1.0
-- Date: 2026-01-20

-- Create audit_logs table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  resource_id UUID,
  details JSONB,
  severity VARCHAR(50) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  setting_key VARCHAR(255) NOT NULL,
  setting_value JSONB,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(hospital_id, setting_key)
);

-- Create admin_activity_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(255) NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_resource VARCHAR(255),
  target_resource_id UUID,
  changes JSONB,
  status VARCHAR(50) DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_permissions table for granular control
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(255) NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission)
);

-- Create admin_role_assignments table
CREATE TABLE IF NOT EXISTS admin_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);

CREATE INDEX idx_admin_activity_logs_admin_id ON admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_timestamp ON admin_activity_logs(timestamp);
CREATE INDEX idx_admin_activity_logs_activity_type ON admin_activity_logs(activity_type);

CREATE INDEX idx_admin_permissions_user_id ON admin_permissions(user_id);
CREATE INDEX idx_admin_permissions_permission ON admin_permissions(permission);

CREATE INDEX idx_admin_role_assignments_user_id ON admin_role_assignments(user_id);
CREATE INDEX idx_admin_role_assignments_role ON admin_role_assignments(role);

CREATE INDEX idx_system_settings_hospital_id ON system_settings(hospital_id);
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Enable RLS (Row Level Security)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for system_settings
CREATE POLICY "Admins can view system settings" ON system_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
      AND user_roles.hospital_id = system_settings.hospital_id
    )
  );

CREATE POLICY "Super admins can update system settings" ON system_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
      AND user_roles.hospital_id = system_settings.hospital_id
    )
  );

-- RLS Policies for admin_activity_logs
CREATE POLICY "Admins can view activity logs" ON admin_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for admin_permissions
CREATE POLICY "Admins can view permissions" ON admin_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- RLS Policies for admin_role_assignments
CREATE POLICY "Admins can view role assignments" ON admin_role_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_activity_type VARCHAR,
  p_target_user_id UUID DEFAULT NULL,
  p_target_resource VARCHAR DEFAULT NULL,
  p_target_resource_id UUID DEFAULT NULL,
  p_changes JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO admin_activity_logs (
    admin_id,
    activity_type,
    target_user_id,
    target_resource,
    target_resource_id,
    changes,
    status
  ) VALUES (
    p_admin_id,
    p_activity_type,
    p_target_user_id,
    p_target_resource,
    p_target_resource_id,
    p_changes,
    'success'
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get system setting
CREATE OR REPLACE FUNCTION get_system_setting(
  p_hospital_id UUID,
  p_setting_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT setting_value INTO v_value
  FROM system_settings
  WHERE hospital_id = p_hospital_id
  AND setting_key = p_setting_key;
  
  RETURN COALESCE(v_value, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set system setting
CREATE OR REPLACE FUNCTION set_system_setting(
  p_hospital_id UUID,
  p_setting_key VARCHAR,
  p_setting_value JSONB,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_setting_id UUID;
BEGIN
  INSERT INTO system_settings (
    hospital_id,
    setting_key,
    setting_value,
    description,
    updated_by
  ) VALUES (
    p_hospital_id,
    p_setting_key,
    p_setting_value,
    p_description,
    auth.uid()
  )
  ON CONFLICT (hospital_id, setting_key)
  DO UPDATE SET
    setting_value = p_setting_value,
    description = COALESCE(p_description, system_settings.description),
    updated_by = auth.uid(),
    updated_at = CURRENT_TIMESTAMP
  RETURNING id INTO v_setting_id;
  
  RETURN v_setting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT INSERT ON audit_logs TO authenticated;
GRANT SELECT ON system_settings TO authenticated;
GRANT SELECT ON admin_activity_logs TO authenticated;
GRANT SELECT ON admin_permissions TO authenticated;
GRANT SELECT ON admin_role_assignments TO authenticated;
