-- ============================================================================
-- CareSync Phase 2A: Additional Test Helpers & Forensic Utilities
-- ============================================================================
-- Testing utilities and helper functions for audit logging integration.
-- ============================================================================

-- ============================================================================
-- 1-2. REMOVED (roadmap S0-05, issue DB-04)
-- ============================================================================
-- test_setup_prescription_audit_scenario() and test_setup_invoice_audit_scenario()
-- were SECURITY DEFINER test helpers granted to `authenticated`: any signed-in
-- user could write fabricated rows into the audit tables. Test fixtures do not
-- belong in production migrations. Databases that already have them get them
-- dropped by supabase/pending-migrations/20261105000005_neutralize_destructive_endpoints.sql.

-- ============================================================================
-- 3. COMPLIANCE QUERY: Find all high-risk amendments
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_high_risk_amendments(
  p_hospital_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT now() - interval '90 days',
  p_date_to TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  entity_type TEXT,
  amendment_count INT,
  affected_patients INT,
  actors JSONB,
  date_range TEXT
) AS $$
SELECT
  al.entity_type,
  COUNT(*)::INT AS amendment_count,
  COUNT(DISTINCT al.patient_id)::INT AS affected_patients,
  jsonb_agg(
    jsonb_build_object('user_id', al.actor_user_id, 'role', al.actor_role)
  ) AS actors,
  FORMAT('%s to %s', p_date_from::DATE, p_date_to::DATE) AS date_range
FROM public.audit_log al
WHERE al.hospital_id = p_hospital_id
  AND al.amends_audit_id IS NOT NULL  -- Only amendments
  AND al.event_time >= p_date_from
  AND al.event_time <= p_date_to
GROUP BY al.entity_type
ORDER BY amendment_count DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.find_high_risk_amendments(UUID, TIMESTAMPTZ, TIMESTAMPTZ) 
TO authenticated;

-- ============================================================================
-- 4. COMPLIANCE QUERY: Detect potential audit bypasses (suspicious patterns)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_audit_anomalies(
  p_hospital_id UUID,
  p_hours_since DEFAULT 24
)
RETURNS TABLE (
  anomaly_type TEXT,
  count INT,
  description TEXT,
  example_entity_id UUID
) AS $$
WITH anomalies AS (
  -- Anomaly 1: Prescription status changed without audit trail
  SELECT 
    'MISSING_CREATE_AUDIT'::TEXT AS anomaly,
    COUNT(DISTINCT p.id)::INT AS cnt,
    'Prescriptions exist but no CREATE audit log found'::TEXT AS desc,
    p.id AS ex_entity_id
  FROM public.prescriptions p
  LEFT JOIN public.prescription_audit pa 
    ON p.id = pa.prescription_id AND pa.action_type = 'CREATE'
  WHERE p.hospital_id = p_hospital_id
    AND p.created_at >= now() - (p_hours_since || ' hours')::INTERVAL
    AND pa.audit_id IS NULL
  GROUP BY 1, 2, 3
  
  UNION ALL
  
  -- Anomaly 2: Invoices changed but no adjustment audit
  SELECT
    'MISSING_INVOICE_AUDIT'::TEXT,
    COUNT(DISTINCT i.id)::INT,
    'Invoices modified but no adjustment audit recorded'::TEXT,
    i.id
  FROM public.invoices i
  LEFT JOIN public.invoice_adjustment_audit iaa 
    ON i.id = iaa.invoice_id
  WHERE i.hospital_id = p_hospital_id
    AND i.updated_at >= now() - (p_hours_since || ' hours')::INTERVAL
    AND iaa.audit_id IS NULL
    AND i.status != 'draft'
  GROUP BY 1, 2, 3
  
  UNION ALL
  
  -- Anomaly 3: High discretionary discounts (>20%) without documented reason
  SELECT
    'UNDOCUMENTED_DISCOUNT'::TEXT,
    COUNT(*)::INT,
    'Discount >20% without documented reason'::TEXT,
    iaa.invoice_id
  FROM public.invoice_adjustment_audit iaa
  WHERE iaa.hospital_id = p_hospital_id
    AND iaa.event_time >= now() - (p_hours_since || ' hours')::INTERVAL
    AND iaa.action_type = 'DISCOUNT_APPLIED'
    AND (ABS(iaa.amount_change) / NULLIF(iaa.total_before, 0)) > 0.20
    AND (iaa.change_reason IS NULL OR iaa.change_reason = '')
  GROUP BY 1, 2, 3
)
SELECT 
  anomaly,
  cnt,
  desc,
  ex_entity_id
FROM anomalies
WHERE cnt > 0;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.find_audit_anomalies(UUID, INT) TO authenticated;

-- ============================================================================
-- 5. ADMIN QUERY: Audit log export (for regulatory requests)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.export_audit_trail_for_patient(
  p_hospital_id UUID,
  p_patient_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT '2000-01-01'::TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  audit_id UUID,
  event_time TIMESTAMPTZ,
  entity_type TEXT,
  entity_id UUID,
  actor_role TEXT,
  action_type TEXT,
  change_reason TEXT,
  before_state JSONB,
  after_state JSONB,
  source_ip INET,
  record_type TEXT
) AS $$
SELECT
  al.audit_id,
  al.event_time,
  al.entity_type,
  al.entity_id,
  al.actor_role,
  al.action_type,
  al.change_reason,
  al.before_state,
  al.after_state,
  al.source_ip,
  CASE 
    WHEN al.amends_audit_id IS NOT NULL THEN 'AMENDMENT'
    ELSE 'ORIGINAL'
  END AS record_type
FROM public.audit_log al
WHERE al.hospital_id = p_hospital_id
  AND al.patient_id = p_patient_id
  AND al.event_time >= p_date_from
  AND al.event_time <= p_date_to
ORDER BY al.event_time DESC;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.export_audit_trail_for_patient(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ) 
TO authenticated;

-- ============================================================================
-- 6. REMOVED (roadmap S0-05, issue DB-04)
-- ============================================================================
-- purge_old_audit_logs_staging_only(int) was a SECURITY DEFINER function that
-- deleted public.audit_log rows. Its guard
--   IF current_setting('app.environment', true) != 'staging'
-- evaluates to NULL when the setting is unset, so the check was skipped, and
-- with no REVOKE, PUBLIC (anon) could call it over /rest/v1/rpc. There is no
-- audit-log purge path in this application. Databases that already have it get
-- it dropped by supabase/pending-migrations/20261105000005_neutralize_destructive_endpoints.sql.
