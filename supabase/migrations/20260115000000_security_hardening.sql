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