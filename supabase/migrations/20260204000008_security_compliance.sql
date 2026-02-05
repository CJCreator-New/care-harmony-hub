-- Consolidated migration group: security_compliance
-- Generated: 2026-02-04 18:14:22
-- Source migrations: 8

-- ============================================
-- Migration: 20241220000005_audit_logging.sql
-- ============================================

-- Create audit logs table for HIPAA compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create compliance reports table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL CHECK (report_type IN ('hipaa', 'access_log', 'data_breach', 'user_activity')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  generated_by UUID NOT NULL REFERENCES auth.users(id),
  file_path TEXT,
  status TEXT NOT NULL CHECK (status IN ('generating', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);

-- Create RLS policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

-- Audit logs: Admin and compliance officers can view all, users can view their own
CREATE POLICY "Admin can view all audit logs" ON audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'compliance_officer')
  )
);

CREATE POLICY "Users can view their own audit logs" ON audit_logs
FOR SELECT USING (user_id = auth.uid());

-- Security alerts: Admin only
CREATE POLICY "Admin can manage security alerts" ON security_alerts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Compliance reports: Admin and compliance officers only
CREATE POLICY "Compliance access to reports" ON compliance_reports
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'compliance_officer')
  )
);

-- Create function to automatically log database changes
CREATE OR REPLACE FUNCTION log_data_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    timestamp,
    severity
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    NOW(),
    CASE 
      WHEN TG_TABLE_NAME IN ('patients', 'medical_records', 'prescriptions') THEN 'high'
      ELSE 'medium'
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for critical tables
CREATE TRIGGER audit_patients_changes
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER audit_medical_records_changes
  AFTER INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();

CREATE TRIGGER audit_prescriptions_changes
  AFTER INSERT OR UPDATE OR DELETE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION log_data_changes();


-- ============================================
-- Migration: 20260115000000_security_hardening.sql
-- ============================================

-- Security Hardening Migration
-- Fix overly permissive RLS policies and enhance security

-- 1. Fix ICD-10 codes policy to be hospital-scoped
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "ICD-10 codes are viewable by authenticated users" ON public.icd10_codes;

-- Create hospital-scoped policy for ICD-10 codes
CREATE POLICY "ICD-10 codes viewable by hospital users"
ON public.icd10_codes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id IS NOT NULL
  )
);

-- 2. Add comprehensive RLS policies for tables that might be missing them

-- Ensure all core tables have proper hospital-scoped policies
-- Activity logs - only viewable by users in the same hospital
CREATE POLICY IF NOT EXISTS "Activity logs hospital scoped"
ON public.activity_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = activity_logs.hospital_id
  )
);

-- CPT codes - hospital scoped
CREATE POLICY IF NOT EXISTS "CPT codes hospital scoped"
ON public.cpt_codes
FOR ALL
TO authenticated
USING (
  hospital_id IS NULL OR -- Global codes
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = cpt_codes.hospital_id
  )
);

-- Clinical templates - hospital scoped
CREATE POLICY IF NOT EXISTS "Clinical templates hospital scoped"
ON public.clinical_templates
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = clinical_templates.hospital_id
  )
);

-- Departments - hospital scoped
CREATE POLICY IF NOT EXISTS "Departments hospital scoped"
ON public.departments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = departments.hospital_id
  )
);

-- Doctor availability - hospital scoped
CREATE POLICY IF NOT EXISTS "Doctor availability hospital scoped"
ON public.doctor_availability
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = doctor_availability.hospital_id
  )
);

-- Documents - hospital scoped with role-based access
CREATE POLICY IF NOT EXISTS "Documents hospital scoped"
ON public.documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = documents.hospital_id
    AND (
      -- Staff can see all documents in their hospital
      p.is_staff = true OR
      -- Patients can only see their own documents
      (documents.patient_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.patients pt
        WHERE pt.id = documents.patient_id
        AND pt.user_id = auth.uid()
      ))
    )
  )
);

-- Hospital resources - hospital scoped
CREATE POLICY IF NOT EXISTS "Hospital resources hospital scoped"
ON public.hospital_resources
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = hospital_resources.hospital_id
  )
);

-- Insurance claims - hospital scoped
CREATE POLICY IF NOT EXISTS "Insurance claims hospital scoped"
ON public.insurance_claims
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = insurance_claims.hospital_id
  )
);

-- Medications - hospital scoped
CREATE POLICY IF NOT EXISTS "Medications hospital scoped"
ON public.medications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = medications.hospital_id
  )
);

-- Messages - hospital scoped with sender/recipient access
CREATE POLICY IF NOT EXISTS "Messages hospital scoped"
ON public.messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = messages.hospital_id
    AND (
      p.user_id = messages.sender_id OR
      p.user_id = messages.recipient_id
    )
  )
);

-- Notifications - recipient access only
CREATE POLICY IF NOT EXISTS "Notifications recipient access"
ON public.notifications
FOR ALL
TO authenticated
USING (
  recipient_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = notifications.hospital_id
  )
);

-- Patient prep checklists - hospital scoped
CREATE POLICY IF NOT EXISTS "Patient prep checklists hospital scoped"
ON public.patient_prep_checklists
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = patient_prep_checklists.hospital_id
  )
);

-- Patient queue - hospital scoped
CREATE POLICY IF NOT EXISTS "Patient queue hospital scoped"
ON public.patient_queue
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = patient_queue.hospital_id
  )
);

-- Payment plans - hospital scoped
CREATE POLICY IF NOT EXISTS "Payment plans hospital scoped"
ON public.payment_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = payment_plans.hospital_id
  )
);

-- Purchase orders - hospital scoped
CREATE POLICY IF NOT EXISTS "Purchase orders hospital scoped"
ON public.purchase_orders
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = purchase_orders.hospital_id
  )
);

-- Purchase order items - hospital scoped via purchase order
CREATE POLICY IF NOT EXISTS "Purchase order items hospital scoped"
ON public.purchase_order_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po
    JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE po.id = purchase_order_items.purchase_order_id
    AND p.hospital_id = po.hospital_id
  )
);

-- Reorder rules - hospital scoped
CREATE POLICY IF NOT EXISTS "Reorder rules hospital scoped"
ON public.reorder_rules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = reorder_rules.hospital_id
  )
);

-- Shift handovers - hospital scoped
CREATE POLICY IF NOT EXISTS "Shift handovers hospital scoped"
ON public.shift_handovers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = shift_handovers.hospital_id
  )
);

-- Shift schedules - hospital scoped
CREATE POLICY IF NOT EXISTS "Shift schedules hospital scoped"
ON public.shift_schedules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = shift_schedules.hospital_id
  )
);

-- Staff invitations - hospital scoped
CREATE POLICY IF NOT EXISTS "Staff invitations hospital scoped"
ON public.staff_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = staff_invitations.hospital_id
  )
);

-- Stock alerts - hospital scoped
CREATE POLICY IF NOT EXISTS "Stock alerts hospital scoped"
ON public.stock_alerts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = stock_alerts.hospital_id
  )
);

-- Suppliers - hospital scoped
CREATE POLICY IF NOT EXISTS "Suppliers hospital scoped"
ON public.suppliers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = suppliers.hospital_id
  )
);

-- System config - hospital scoped
CREATE POLICY IF NOT EXISTS "System config hospital scoped"
ON public.system_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = system_config.hospital_id
  )
);

-- Telemedicine sessions - hospital scoped
CREATE POLICY IF NOT EXISTS "Telemedicine sessions hospital scoped"
ON public.telemedicine_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = telemedicine_sessions.hospital_id
  )
);

-- Time slots - hospital scoped
CREATE POLICY IF NOT EXISTS "Time slots hospital scoped"
ON public.time_slots
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = time_slots.hospital_id
  )
);

-- User roles - hospital scoped
CREATE POLICY IF NOT EXISTS "User roles hospital scoped"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.hospital_id = user_roles.hospital_id
    AND p.is_staff = true
  )
);

-- 3. Create function to check if user session is still valid
CREATE OR REPLACE FUNCTION check_session_timeout()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  last_activity TIMESTAMPTZ;
  timeout_minutes INTEGER := 30; -- HIPAA requirement
BEGIN
  -- Get last activity from profiles
  SELECT last_login INTO last_activity
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- If no last activity recorded, consider session invalid
  IF last_activity IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if session has timed out
  IF last_activity < NOW() - INTERVAL '1 minute' * timeout_minutes THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 4. Create function to update last activity
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE user_id = auth.uid();
END;
$$;

-- 5. Add security audit log function
CREATE OR REPLACE FUNCTION log_security_event(
  event_type TEXT,
  event_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_hospital_id UUID;
BEGIN
  -- Get user's hospital ID
  SELECT hospital_id INTO user_hospital_id
  FROM public.profiles
  WHERE user_id = auth.uid();
  
  -- Log the security event
  INSERT INTO public.activity_logs (
    user_id,
    hospital_id,
    action_type,
    entity_type,
    details,
    severity,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    user_hospital_id,
    event_type,
    'security',
    event_details,
    'high',
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

-- 6. Create trigger to log failed authentication attempts
CREATE OR REPLACE FUNCTION log_auth_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log failed login attempts
  IF NEW.failed_login_attempts > OLD.failed_login_attempts THEN
    PERFORM log_security_event(
      'failed_login_attempt',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'attempt_count', NEW.failed_login_attempts,
        'timestamp', NOW()
      )
    );
  END IF;
  
  -- Log account lockouts
  IF NEW.locked_until IS NOT NULL AND OLD.locked_until IS NULL THEN
    PERFORM log_security_event(
      'account_locked',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'locked_until', NEW.locked_until,
        'reason', 'excessive_failed_attempts'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for authentication monitoring
DROP TRIGGER IF EXISTS auth_attempt_trigger ON public.profiles;
CREATE TRIGGER auth_attempt_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_auth_attempt();

-- 7. Add indexes for security-related queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_security 
ON public.activity_logs(entity_type, action_type, created_at) 
WHERE entity_type = 'security';

CREATE INDEX IF NOT EXISTS idx_profiles_last_login 
ON public.profiles(last_login) 
WHERE last_login IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_locked_accounts 
ON public.profiles(locked_until) 
WHERE locked_until IS NOT NULL;

-- 8. Create view for security monitoring (admin only)
CREATE OR REPLACE VIEW security_events AS
SELECT 
  al.id,
  al.user_id,
  p.email,
  p.first_name,
  p.last_name,
  al.action_type,
  al.details,
  al.ip_address,
  al.user_agent,
  al.created_at,
  al.hospital_id
FROM public.activity_logs al
JOIN public.profiles p ON p.user_id = al.user_id
WHERE al.entity_type = 'security'
ORDER BY al.created_at DESC;

-- Add RLS to security events view
ALTER VIEW security_events SET (security_barrier = true);

-- Only allow admins to view security events
CREATE POLICY "Security events admin only"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  entity_type = 'security' AND
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND p.hospital_id = activity_logs.hospital_id
  )
);

-- Grant necessary permissions
GRANT SELECT ON security_events TO authenticated;
GRANT EXECUTE ON FUNCTION check_session_timeout() TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_event(TEXT, JSONB) TO authenticated;


-- ============================================
-- Migration: 20260120000006_add_encryption_metadata.sql
-- ============================================

-- Add encryption metadata field to patients table for HIPAA compliance
-- This stores encryption keys and metadata for PHI fields

ALTER TABLE patients ADD COLUMN encryption_metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN patients.encryption_metadata IS 'Stores encryption metadata for PHI fields (keys, versions, etc.)';

-- Create index for performance (JSONB fields can be indexed)
CREATE INDEX idx_patients_encryption_metadata ON patients USING GIN (encryption_metadata);

-- Update RLS policy to ensure encryption metadata is properly secured
-- (The existing RLS policies should already cover this since it's part of the patients table)


-- ============================================
-- Migration: 20260120000011_fix_rls_security.sql
-- ============================================

-- Phase 2: Critical Security Vulnerability Fixes
-- Fix RLS policies to prevent unauthorized data access

-- 1. Fix profiles table - prevent exposure of unassigned staff
DROP POLICY IF EXISTS "Users can view profiles in their hospital" ON profiles;
CREATE POLICY "Users can view profiles in their hospital" ON profiles
  FOR SELECT TO authenticated
  USING (
    hospital_id IS NOT NULL AND
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );

-- 2. Restrict medical_records to clinical staff only
DROP POLICY IF EXISTS "Staff can view medical records in their hospital" ON medical_records;
CREATE POLICY "Clinical staff can view medical records" ON medical_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.hospital_id = medical_records.hospital_id
      AND ur.role IN ('doctor', 'nurse', 'lab_technician', 'admin')
    )
  );

-- 3. Fix activity_logs - restrict to hospital staff only
DROP POLICY IF EXISTS "Users can view activity logs" ON activity_logs;
CREATE POLICY "Hospital staff can view activity logs" ON activity_logs
  FOR SELECT TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );

-- Restrict INSERT to authenticated users in same hospital
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;
CREATE POLICY "Hospital staff can insert activity logs" ON activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );

-- 4. Fix notifications - users should only see their own
DROP POLICY IF EXISTS "Users can view notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 5. Restrict consultations to involved parties only
DROP POLICY IF EXISTS "Staff can view consultations" ON consultations;
CREATE POLICY "Involved staff can view consultations" ON consultations
  FOR SELECT TO authenticated
  USING (
    doctor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.hospital_id = consultations.hospital_id
      AND EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('doctor', 'nurse', 'admin')
      )
    )
  );

-- 6. Restrict prescriptions to clinical staff
DROP POLICY IF EXISTS "Staff can view prescriptions" ON prescriptions;
CREATE POLICY "Clinical staff can view prescriptions" ON prescriptions
  FOR SELECT TO authenticated
  USING (
    prescribed_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND p.hospital_id = prescriptions.hospital_id
      AND ur.role IN ('doctor', 'nurse', 'pharmacist', 'admin')
    )
  );

-- 7. Add audit logging for sensitive operations
CREATE OR REPLACE FUNCTION log_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    hospital_id,
    ip_address,
    user_agent,
    severity
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    COALESCE(NEW.hospital_id, OLD.hospital_id),
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent',
    'info'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_medical_records ON medical_records;
CREATE TRIGGER audit_medical_records
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

DROP TRIGGER IF EXISTS audit_prescriptions ON prescriptions;
CREATE TRIGGER audit_prescriptions
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

DROP TRIGGER IF EXISTS audit_consultations ON consultations;
CREATE TRIGGER audit_consultations
  AFTER INSERT OR UPDATE OR DELETE ON consultations
  FOR EACH ROW EXECUTE FUNCTION log_sensitive_access();

-- 8. Add indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_hospital_user ON profiles(hospital_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_medical_records_hospital ON medical_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_hospital ON consultations(doctor_id, hospital_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_hospital ON prescriptions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_hospital_created ON activity_logs(hospital_id, created_at DESC);


-- ============================================
-- Migration: 20260121000000_phase2_security_vulnerability_fixes.sql
-- ============================================

-- Phase 2: Critical Security Vulnerabilities Fix
-- Address RLS Policy Security Issues

-- 1. Fix user_sessions table - overly permissive policy
DROP POLICY IF EXISTS "System can manage sessions" ON user_sessions;
CREATE POLICY "System can manage user sessions" ON user_sessions
  FOR ALL TO authenticated
  USING (
    -- Allow users to manage their own sessions
    user_id = auth.uid() OR
    -- Allow admins to manage sessions in their hospital
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = auth.uid()
      AND ur.role = 'admin'
      AND p.hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = user_sessions.user_id)
    )
  );

-- 2. Fix dur_criteria table - overly permissive policy
DROP POLICY IF EXISTS "DUR criteria global access" ON dur_criteria;
CREATE POLICY "DUR criteria hospital access" ON dur_criteria
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- 3. Fix prediction_models table - restrict UPDATE/DELETE operations
DROP POLICY IF EXISTS "prediction_models_hospital_access" ON prediction_models;

-- Allow all authenticated users to read global models
CREATE POLICY "prediction_models_read_access" ON prediction_models
  FOR SELECT TO authenticated
  USING (true);

-- Restrict write operations to hospital staff
CREATE POLICY "prediction_models_write_access" ON prediction_models
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "prediction_models_update_access" ON prediction_models
  FOR UPDATE TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "prediction_models_delete_access" ON prediction_models
  FOR DELETE TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- 4. Verify and fix any remaining overly permissive policies
-- Check for tables that might have USING (true) for non-SELECT operations

-- 5. Add additional security hardening

-- Ensure all sensitive tables have proper audit logging
CREATE OR REPLACE FUNCTION audit_security_events()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log security-sensitive operations
  IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') AND TG_TABLE_NAME IN (
    'profiles', 'user_roles', 'medical_records', 'prescriptions', 'consultations'
  ) THEN
    INSERT INTO activity_logs (
      user_id,
      action_type,
      entity_type,
      entity_id,
      details,
      hospital_id,
      ip_address,
      user_agent,
      severity
    ) VALUES (
      auth.uid(),
      TG_OP || '_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, OLD.id::text),
      json_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'old_data', CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
        'new_data', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
      ),
      COALESCE(NEW.hospital_id, OLD.hospital_id),
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'user-agent',
      CASE
        WHEN TG_TABLE_NAME IN ('medical_records', 'prescriptions') THEN 'high'
        ELSE 'medium'
      END
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply security audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_security_profiles ON profiles;
CREATE TRIGGER audit_security_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_security_events();

DROP TRIGGER IF EXISTS audit_security_user_roles ON user_roles;
CREATE TRIGGER audit_security_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_security_events();

-- 6. Add rate limiting protection (database-level)
-- Create a function to check for suspicious activity patterns

CREATE OR REPLACE FUNCTION check_rate_limit(
  user_id UUID,
  action_type TEXT,
  max_attempts INTEGER DEFAULT 10,
  time_window_minutes INTEGER DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM activity_logs
  WHERE user_id = $1
    AND action_type = $2
    AND created_at > NOW() - INTERVAL '1 minute' * $3;

  -- Return false if rate limit exceeded
  IF attempt_count >= max_attempts THEN
    -- Log rate limit violation
    INSERT INTO activity_logs (
      user_id, action_type, entity_type, details, severity
    ) VALUES (
      $1, 'rate_limit_exceeded', 'security',
      json_build_object('action', $2, 'attempts', attempt_count),
      'high'
    );
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add data encryption verification
-- Function to ensure PHI data is properly encrypted before storage

CREATE OR REPLACE FUNCTION validate_phi_encryption()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if sensitive fields are encrypted (basic validation)
  IF NEW.first_name IS NOT NULL AND NEW.first_name !~ '^enc_' THEN
    RAISE EXCEPTION 'PHI data must be encrypted before storage';
  END IF;

  IF NEW.last_name IS NOT NULL AND NEW.last_name !~ '^enc_' THEN
    RAISE EXCEPTION 'PHI data must be encrypted before storage';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply PHI validation to patients table
DROP TRIGGER IF EXISTS validate_phi_patients ON patients;
CREATE TRIGGER validate_phi_patients
  BEFORE INSERT OR UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION validate_phi_encryption();

-- 8. Add session timeout enforcement
-- Function to automatically expire old sessions

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- Delete sessions older than 30 minutes (HIPAA compliant timeout)
  DELETE FROM user_sessions
  WHERE last_activity < NOW() - INTERVAL '30 minutes';

  -- Log cleanup operation
  INSERT INTO activity_logs (
    action_type, entity_type, details, severity
  ) VALUES (
    'session_cleanup', 'system',
    json_build_object('deleted_sessions', FOUND),
    'info'
  );
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run session cleanup (would be called by cron/external scheduler)
-- For now, we'll create a manual function that can be called

-- 9. Final security verification
-- Create a view to show current RLS policy status

CREATE OR REPLACE VIEW security_policy_status AS
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Grant access to security monitoring
GRANT SELECT ON security_policy_status TO authenticated;

COMMENT ON VIEW security_policy_status IS 'Security monitoring view to track RLS policy status';


-- ============================================
-- Migration: 20260130000001_fix_rls_policies.sql
-- ============================================

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


-- ============================================
-- Migration: 20260131000002_add_missing_rls_policies.sql
-- ============================================

-- Add RLS policies for missing roles (pharmacist, lab_technician)
-- As specified in ROLE_ENHANCEMENT_PLAN.md

-- Patients table policies
CREATE POLICY "pharmacist_view_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = patients.hospital_id
    )
  );

CREATE POLICY "lab_technician_view_patients" ON patients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'lab_technician'
      AND user_roles.hospital_id = patients.hospital_id
    )
  );

-- Appointments table policies
CREATE POLICY "pharmacist_view_appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = appointments.hospital_id
    )
  );

-- Consultations table policies for read access
CREATE POLICY "pharmacist_view_consultations" ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'pharmacist'
      AND user_roles.hospital_id = consultations.hospital_id
    )
  );

CREATE POLICY "lab_technician_view_consultations" ON consultations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'lab_technician'
      AND user_roles.hospital_id = consultations.hospital_id
    )
  );

-- Patient portal access
CREATE POLICY "patient_view_own_data" ON patients
  FOR SELECT USING (
    patients.user_id = auth.uid()
  );

CREATE POLICY "patient_view_own_appointments" ON appointments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "patient_view_own_prescriptions" ON prescriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = prescriptions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "patient_view_own_lab_orders" ON lab_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = lab_orders.patient_id
      AND patients.user_id = auth.uid()
    )
  );


-- ============================================
-- Migration: 99999999999997_consent_management.sql
-- ============================================

-- Patient consent tracking table
CREATE TABLE IF NOT EXISTS patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_consent BOOLEAN NOT NULL DEFAULT false,
  data_processing_consent BOOLEAN NOT NULL DEFAULT false,
  telemedicine_consent BOOLEAN DEFAULT false,
  data_sharing_consent BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX idx_patient_consents_consent_date ON patient_consents(consent_date);

-- RLS policies
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
  ON patient_consents FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Staff can view patient consents"
  ON patient_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'nurse', 'admin', 'receptionist')
    )
  );

CREATE POLICY "Patients can insert own consents"
  ON patient_consents FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own consents"
  ON patient_consents FOR UPDATE
  USING (auth.uid() = patient_id);


