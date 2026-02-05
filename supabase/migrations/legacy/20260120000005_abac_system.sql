-- Add ABAC (Attribute-Based Access Control) support
-- Migration: 20260120000005_abac_system.sql

-- Add additional attributes to profiles table for ABAC
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seniority INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clearance_level TEXT DEFAULT 'low' CHECK (clearance_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- Add sensitivity levels to key tables
ALTER TABLE patients ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'confidential' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted'));
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'confidential' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted'));
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'confidential' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted'));
ALTER TABLE lab_orders ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'confidential' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sensitivity_level TEXT DEFAULT 'internal' CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted'));

-- Create audit_logs table for ABAC decision logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  hospital_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital_id ON audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs in their hospital" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.hospital_id = audit_logs.hospital_id
      AND 'admin' = ANY(profiles.roles)
    )
  );

CREATE POLICY "Hospital-scoped audit log creation" ON audit_logs
  FOR INSERT WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create abac_policies table for dynamic policy management
CREATE TABLE IF NOT EXISTS abac_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '[]',
  effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
  enabled BOOLEAN DEFAULT true,
  hospital_id UUID,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on abac_policies
ALTER TABLE abac_policies ENABLE ROW LEVEL SECURITY;

-- RLS policies for abac_policies
CREATE POLICY "Hospital-scoped ABAC policies" ON abac_policies
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
    ) OR hospital_id IS NULL
  );

-- Create indexes for abac_policies
CREATE INDEX IF NOT EXISTS idx_abac_policies_hospital_id ON abac_policies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_abac_policies_priority ON abac_policies(priority DESC);
CREATE INDEX IF NOT EXISTS idx_abac_policies_enabled ON abac_policies(enabled) WHERE enabled = true;

-- Insert default ABAC policies (these will be loaded by the ABACManager)
INSERT INTO abac_policies (policy_id, name, description, priority, conditions, effect, enabled) VALUES
('emergency-access', 'Emergency Access Override', 'Allow emergency access to critical resources', 100,
 '[{"attribute": "environment", "field": "isEmergency", "operator": "equals", "value": true}, {"attribute": "environment", "field": "accessLevel", "operator": "equals", "value": "emergency"}]',
 'allow', true),

('admin-full-access', 'Administrator Full Access', 'Administrators have full access to all resources', 90,
 '[{"attribute": "user", "field": "roles", "operator": "contains", "value": "admin"}]',
 'allow', true),

('doctor-patient-access', 'Doctor Patient Access', 'Doctors can access patient records in their hospital', 80,
 '[{"attribute": "user", "field": "roles", "operator": "contains", "value": "doctor"}, {"attribute": "user", "field": "hospitalId", "operator": "equals", "field": "resource.hospitalId"}, {"attribute": "resource", "field": "type", "operator": "in", "value": ["patient", "consultation", "prescription", "lab_order"]}]',
 'allow', true),

('nurse-restricted-access', 'Nurse Restricted Access', 'Nurses have limited access to sensitive patient data', 70,
 '[{"attribute": "user", "field": "roles", "operator": "contains", "value": "nurse"}, {"attribute": "user", "field": "hospitalId", "operator": "equals", "field": "resource.hospitalId"}, {"attribute": "resource", "field": "sensitivityLevel", "operator": "not_equals", "value": "restricted"}, {"attribute": "action", "operator": "in", "value": ["read", "update"]}]',
 'allow', true),

('pharmacist-medication-access', 'Pharmacist Medication Access', 'Pharmacists can manage medications and prescriptions', 70,
 '[{"attribute": "user", "field": "roles", "operator": "contains", "value": "pharmacist"}, {"attribute": "user", "field": "hospitalId", "operator": "equals", "field": "resource.hospitalId"}, {"attribute": "resource", "field": "type", "operator": "in", "value": ["prescription", "medication"]}]',
 'allow', true),

('lab-tech-lab-access', 'Lab Technician Lab Access', 'Lab technicians can process lab orders and upload results', 70,
 '[{"attribute": "user", "field": "roles", "operator": "contains", "value": "lab_technician"}, {"attribute": "user", "field": "hospitalId", "operator": "equals", "field": "resource.hospitalId"}, {"attribute": "resource", "field": "type", "operator": "equals", "value": "lab_order"}]',
 'allow', true),

('patient-self-access', 'Patient Self Access', 'Patients can access their own records', 60,
 '[{"attribute": "user", "field": "roles", "operator": "contains", "value": "patient"}, {"attribute": "user", "field": "id", "operator": "equals", "field": "resource.ownerId"}, {"attribute": "resource", "field": "sensitivityLevel", "operator": "not_equals", "value": "restricted"}]',
 'allow', true),

('after-hours-restriction', 'After Hours Restriction', 'Restrict access to sensitive data after business hours', 50,
 '[{"attribute": "environment", "field": "time", "operator": "matches", "value": "after_hours"}, {"attribute": "resource", "field": "sensitivityLevel", "operator": "equals", "value": "restricted"}, {"attribute": "user", "field": "clearanceLevel", "operator": "not_equals", "value": "high"}]',
 'deny', true),

('default-deny', 'Default Deny', 'Deny access by default', 0, '[]', 'deny', true)
ON CONFLICT (policy_id) DO NOTHING;

-- Update existing profiles with default values
UPDATE profiles SET
  clearance_level = CASE
    WHEN 'admin' = ANY(roles) THEN 'critical'
    WHEN 'doctor' = ANY(roles) THEN 'high'
    WHEN 'nurse' = ANY(roles) OR 'pharmacist' = ANY(roles) THEN 'medium'
    ELSE 'low'
  END,
  is_active = true
WHERE clearance_level IS NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for abac_policies
CREATE TRIGGER update_abac_policies_updated_at
  BEFORE UPDATE ON abac_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();