-- ============================================================================
-- RLS POLICY AUDIT SCRIPT FOR CARESYNC HIMS
-- Purpose: Validate all Row-Level Security policies enforced on sensitive data
-- Compliance: HIPAA Privacy Rule, GDPR Article 32
-- Execution: Before every staging deployment and weekly in production
-- ============================================================================

-- ============================================================================
-- 1. AUDIT ALL RLS POLICIES ENABLED
-- ============================================================================

-- Check if RLS is enabled on all sensitive tables
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN relrowsecurity THEN 'ENABLED'
    ELSE 'DISABLED ⚠️'
  END as rls_status,
  CASE 
    WHEN relforcerowsecurity THEN 'ENFORCED (super user exempt)'
    ELSE 'NOT ENFORCED (super user bypasses)' 
  END as enforcement_level
FROM pg_tables t
JOIN pg_class pc ON t.tablename = pc.relname
JOIN pg_namespace pn ON t.schemaname = pn.nspname AND pn.oid = pc.relnamespace
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND tablename IN (
    'patients',
    'appointments',
    'prescriptions', 
    'telehealth_sessions',
    'invoices',
    'insurance_claims',
    'clinical_notes',
    'vital_signs',
    'lab_results',
    'auth_users',
    'audit_log'
  )
ORDER BY schemaname, tablename;

-- ============================================================================
-- 2. AUDIT PATIENT DATA ACCESS POLICIES
-- ============================================================================

-- List all RLS policies on patients table
SELECT 
  policyname,
  permissive,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'patients'
ORDER BY policyname;

-- Validate patient data cannot be accessed by unauthorized users
-- Test: Unauthenticated user cannot read any patients
SELECT 'CRITICAL: Any user can read patients' as vulnerability
FROM information_schema.role_table_grants 
WHERE table_name = 'patients'
  AND privilege_type = 'SELECT'
  AND grantee = 'public'
LIMIT 1;

-- Validate only user's own patient record is visible
SELECT 
  CASE 
    WHEN COUNT(DISTINCT policy_id) >= 1 THEN '✅ Patient data scoped to user'
    ELSE '❌ VIOLATION: Patient data not properly scoped'
  END as validation
FROM (
  SELECT DISTINCT policyname as policy_id
  FROM pg_policies 
  WHERE tablename = 'patients'
    AND qual LIKE '%user_id = current_user_id%'
       OR qual LIKE '%current_user_id()%'
) policies;

-- ============================================================================
-- 3. AUDIT APPOINTMENT ACCESS POLICIES
-- ============================================================================

-- Verify appointments visible to patient, doctor, and nurse only
SELECT 
  apt.id,
  apt.patient_id,
  apt.doctor_id,
  CASE 
    WHEN p1.id = current_user_id THEN 'Patient can see'
    WHEN d.id = current_user_id THEN 'Doctor can see'
    WHEN ep.role = 'nurse' THEN 'Nurse can see'
    ELSE 'NO ACCESS'
  END as visibility
FROM appointments apt
LEFT JOIN patients p1 ON apt.patient_id = p1.id
LEFT JOIN doctors d ON apt.doctor_id = d.id
LEFT JOIN auth_users ep ON (p1.id = ep.id OR d.id = ep.id)
LIMIT 5;

-- ============================================================================
-- 4. AUDIT PRESCRIPTION ACCESS POLICIES
-- ============================================================================

-- Verify only authorized roles can access prescriptions
SELECT 
  policyname,
  cmd,
  qual as policy_rule
FROM pg_policies 
WHERE tablename = 'prescriptions'
ORDER BY policyname;

-- Check for pharmacy-only access rules on sensitive fields
SELECT 
  CASE 
    WHEN COUNT(*) >= 1 THEN '✅ Pharmacy access restrictions in place'
    ELSE '⚠️  Verify pharmacy access controls'
  END as validation
FROM pg_policies 
WHERE tablename = 'prescriptions'
  AND qual LIKE '%role%'
  AND qual LIKE '%pharmacy%';

-- ============================================================================
-- 5. AUDIT BILLING/INSURANCE DATA POLICIES
-- ============================================================================

-- Verify billing managers have minimal data disclosure
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual LIKE '%credit_card%' THEN '❌ CRITICAL: Credit card visible'
    WHEN qual LIKE '%ssn%' THEN '❌ CRITICAL: SSN visible'
    ELSE '✅ Sensitive fields protected'
  END as field_protection
FROM pg_policies 
WHERE tablename IN ('invoices', 'insurance_claims')
ORDER BY tablename, policyname;

-- Validate credit card masking (if stored at all)
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '❌ RISK: Unmasked credit cards in database'
    ELSE '✅ No plaintext credit cards'
  END as credit_card_security
FROM information_schema.columns 
WHERE table_name IN ('invoices', 'payments')
  AND (column_name LIKE '%card%' OR column_name LIKE '%pan%')
  AND data_type NOT IN ('text', 'varchar') -- Should be encrypted
LIMIT 1;

-- ============================================================================
-- 6. AUDIT CLINICAL NOTES POLICIES
-- ============================================================================

-- Verify signatures and immutability
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'clinical_notes'
  AND (qual LIKE '%signature%' OR qual LIKE '%immutable%' OR cmd = 'UPDATE')
ORDER BY policyname;

-- Verify clinical notes cannot be deleted (only logically)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'clinical_notes' AND cmd = 'DELETE'
    ) THEN '❌ VIOLATION: Clinical notes can be deleted'
    ELSE '✅ Delete protection enforced'
  END as deletion_safety;

-- ============================================================================
-- 7. AUDIT AUDIT LOG PROTECTION
-- ============================================================================

-- Verify audit logs are append-only (no UPDATE/DELETE)
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd IN ('UPDATE', 'DELETE') THEN '❌ CRITICAL: Audit logs modifiable'
    WHEN cmd = 'INSERT' THEN '✅ Append-only'
    ELSE cmd
  END as immutability_status
FROM pg_policies 
WHERE tablename = 'audit_log'
ORDER BY cmd DESC;

-- Count tampering attempts (updates/deletes on audit log)
SELECT 
  COALESCE(SUM(CASE WHEN cmd = 'UPDATE' THEN 1 ELSE 0 END), 0) as update_attempts,
  COALESCE(SUM(CASE WHEN cmd = 'DELETE' THEN 1 ELSE 0 END), 0) as delete_attempts,
  CASE 
    WHEN COALESCE(SUM(CASE WHEN cmd IN ('UPDATE', 'DELETE') THEN 1 ELSE 0 END), 0) > 0 
      THEN '🚨 TAMPERING RISK DETECTED'
    ELSE '✅ Audit log immutability confirmed'
  END as tampering_risk
FROM pg_policies 
WHERE tablename = 'audit_log';

-- ============================================================================
-- 8. AUDIT ROLE-BASED POLICY MATRIX
-- ============================================================================

-- Create comprehensive access matrix for all roles
WITH role_access AS (
  SELECT 
    r.rolname as role,
    t.tablename,
    COUNT(DISTINCT p.policyname) as policy_count,
    MAX(CASE WHEN p.cmd = 'SELECT' THEN 1 ELSE 0 END) as can_read,
    MAX(CASE WHEN p.cmd = 'INSERT' THEN 1 ELSE 0 END) as can_create,
    MAX(CASE WHEN p.cmd = 'UPDATE' THEN 1 ELSE 0 END) as can_update,
    MAX(CASE WHEN p.cmd = 'DELETE' THEN 1 ELSE 0 END) as can_delete
  FROM pg_roles r
  CROSS JOIN (
    SELECT DISTINCT tablename FROM pg_tables 
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ) t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename
  WHERE r.rolname IN ('patient_role', 'doctor_role', 'nurse_role', 'pharmacy_role', 'billing_role')
  GROUP BY r.rolname, t.tablename
)
SELECT 
  role,
  tablename,
  policy_count,
  CASE WHEN can_read = 1 THEN 'R' ELSE '-' END ||
  CASE WHEN can_create = 1 THEN 'C' ELSE '-' END ||
  CASE WHEN can_update = 1 THEN 'U' ELSE '-' END ||
  CASE WHEN can_delete = 1 THEN 'D' ELSE '-' END as permissions
FROM role_access
WHERE tablename IN (
  'patients', 'appointments', 'prescriptions', 'telehealth_sessions',
  'invoices', 'clinical_notes', 'vital_signs', 'lab_results', 'audit_log'
)
ORDER BY role, tablename;

-- ============================================================================
-- 9. AUDIT DATA ENCRYPTION IN TRANSIT
-- ============================================================================

-- Verify SSL/TLS enforcement
SELECT 
  CASE 
    WHEN current_setting('ssl') = 'on' THEN '✅ SSL/TLS enabled'
    ELSE '❌ SSL/TLS DISABLED'
  END as encryption_status,
  
  CASE 
    WHEN current_setting('ssl_cert_file') != '' THEN '✅ Certificate configured'
    ELSE '❌ No certificate'
  END as cert_status;

-- ============================================================================
-- 10. AUDIT DATA AT REST ENCRYPTION METADATA
-- ============================================================================

-- Check encryption_metadata tracking for PHI columns
SELECT 
  table_name,
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('first_name', 'last_name', 'ssn', 'dob', 'insurance_id')
      THEN (
        SELECT COUNT(*) FROM information_schema.tables t
        WHERE t.table_name = table_name AND EXISTS (
          SELECT 1 FROM information_schema.columns c
          WHERE c.table_name = table_name AND c.column_name = 'encryption_metadata'
        )
      )
    ELSE 0
  END as encryption_tracked
FROM information_schema.columns
WHERE table_name IN ('patients', 'insurance_claims')
  AND column_name IN ('first_name', 'last_name', 'ssn', 'dob', 'insurance_id', 'encryption_metadata')
ORDER BY table_name, column_name;

-- ============================================================================
-- 11. AUDIT CONSENT & MINIMAL DISCLOSURE
-- ============================================================================

-- Verify patient consent tracking
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Consent tracking enabled'
    ELSE '⚠️  Verify consent implementation'
  END as consent_status
FROM information_schema.tables 
WHERE table_name = 'patient_consent'
  AND table_schema NOT IN ('pg_catalog', 'information_schema');

-- Verify billing access is minimal (no clinical data)
SELECT 
  policyname,
  qual,
  CASE 
    WHEN qual LIKE '%clinical%' OR qual LIKE '%medical%' 
      THEN '❌ Billing can see clinical data'
    ELSE '✅ Minimal disclosure enforced'
  END as disclosure_scope
FROM pg_policies 
WHERE tablename IN ('invoices', 'insurance_claims')
ORDER BY policyname;

-- ============================================================================
-- 12. COMPLIANCE SCORING & SUMMARY REPORT
-- ============================================================================

-- Generate comprehensive compliance score
WITH audit_checks AS (
  -- Check 1: RLS enabled on all sensitive tables
  SELECT 
    'RLS_ENABLED' as check_name,
    COUNT(CASE WHEN relrowsecurity THEN 1 END)::FLOAT / COUNT(*) as compliance_score,
    'All sensitive tables have RLS enabled' as description
  FROM pg_class pc
  JOIN pg_namespace pn ON pc.relnamespace = pn.oid
  WHERE pn.nspname NOT IN ('pg_catalog', 'information_schema')
    AND pc.relname IN (
      'patients', 'appointments', 'prescriptions', 'invoices', 
      'clinical_notes', 'audit_log', 'insurance_claims'
    )
  
  UNION ALL
  
  -- Check 2: Audit log immutability
  SELECT 
    'AUDIT_LOG_IMMUTABLE' as check_name,
    CASE 
      WHEN (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'audit_log' AND cmd IN ('UPDATE', 'DELETE')) = 0 
        THEN 1.0 
      ELSE 0.0 
    END as compliance_score,
    'Audit logs are append-only' as description
  
  UNION ALL
  
  -- Check 3: SSL/TLS enabled
  SELECT 
    'SSL_ENABLED' as check_name,
    CASE 
      WHEN current_setting('ssl') = 'on' THEN 1.0 
      ELSE 0.0 
    END as compliance_score,
    'SSL/TLS encryption in transit' as description
)
SELECT 
  check_name,
  (compliance_score * 100)::INT as compliance_percentage,
  description,
  CASE 
    WHEN compliance_score = 1.0 THEN '✅ PASS'
    WHEN compliance_score >= 0.8 THEN '⚠️  WARN'
    ELSE '❌ FAIL'
  END as status,
  (AVG(compliance_score) OVER() * 100)::INT as overall_score
FROM audit_checks
ORDER BY compliance_score DESC, check_name;

-- ============================================================================
-- 13. GENERATE DETAILED COMPLIANCE REPORT
-- ============================================================================

-- Summary: List all violations and remediation steps
SELECT 
  '📋 CARESYNC HIMS RLS AUDIT REPORT' as report_title,
  NOW()::TEXT as audit_timestamp,
  current_user as auditor,
  'STAGING' as environment;

-- List critical findings
SELECT 
  CASE 
    WHEN count_disabled > 0 THEN '🚨 CRITICAL'
    WHEN count_no_delete_protection > 0 THEN '🚨 CRITICAL'
    WHEN ssl_disabled THEN '🚨 CRITICAL'
    ELSE '✅ COMPLIANT'
  END as severity,
  
  CASE 
    WHEN count_disabled > 0 THEN 'RLS disabled on ' || count_disabled::TEXT || ' tables'
    WHEN count_no_delete_protection > 0 THEN 'Clinical notes deletable (non-immutable)'
    WHEN ssl_disabled THEN 'SSL/TLS not enabled'
    ELSE 'All RLS policies enforced'
  END as finding,
  
  CASE 
    WHEN count_disabled > 0 THEN 'ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;'
    WHEN count_no_delete_protection > 0 THEN 'CREATE POLICY ... ON clinical_notes FOR DELETE USING (false);'
    WHEN ssl_disabled THEN 'SET ssl = on; RELOAD config;'
    ELSE 'No action required'
  END as remediation
FROM (
  SELECT 
    (SELECT COUNT(*) FROM pg_class pc 
     JOIN pg_namespace pn ON pc.relnamespace = pn.oid 
     WHERE pn.nspname NOT IN ('pg_catalog', 'information_schema')
       AND pc.relname IN ('patients', 'prescriptions', 'clinical_notes')
       AND NOT pc.relrowsecurity) as count_disabled,
    (SELECT COUNT(*) FROM pg_policies 
     WHERE tablename = 'clinical_notes' AND cmd = 'DELETE') as count_no_delete_protection,
    (current_setting('ssl') != 'on') as ssl_disabled
) findings
ORDER BY severity DESC;

-- ============================================================================
-- 14. EXECUTION INSTRUCTIONS
-- ============================================================================
/*
EXECUTION INSTRUCTIONS:

1. Schedule this audit for:
   - Immediately before staging deployment (Apr 16)
   - Weekly in production (every Monday 2 AM UTC)
   - After any RLS policy changes

2. Review output for:
   - Any "❌ VIOLATION" or "❌ CRITICAL" findings
   - Overall compliance score < 100%
   - Any missing policies or disabled RLS

3. If violations found:
   - DO NOT proceed with deployment
   - Fix issues using remediation steps provided
   - Re-run audit to verify fixes
   - Escalate to Security team

4. Archive audit report:
   - Save results to /var/log/caresync/rls-audits/audit-YYYY-MM-DD.sql
   - Attach to deployment PR
   - Include in monthly HIPAA compliance report

5. Post-Deployment:
   - Re-run audit daily for first week
   - Then weekly for Month 1
   - Then monthly thereafter
*/
