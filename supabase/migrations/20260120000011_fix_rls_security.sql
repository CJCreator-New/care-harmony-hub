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
