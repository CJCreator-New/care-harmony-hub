-- ============================================================================
-- CareSync Phase 2A: Additional Test Helpers & Forensic Utilities
-- ============================================================================
-- Testing utilities and helper functions for audit logging integration.
-- ============================================================================

-- ============================================================================
-- 1. TEST HELPER: Populate prescription_audit with test data
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_setup_prescription_audit_scenario()
RETURNS void AS $$
DECLARE
  v_hospital_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
  v_patient_id UUID := 'b0000000-0000-0000-0000-000000000001'::UUID;
  v_doctor_id UUID := 'c0000000-0000-0000-0000-000000000001'::UUID;
  v_pharmacist_id UUID := 'd0000000-0000-0000-0000-000000000001'::UUID;
  v_prescription_id UUID := gen_random_uuid();
BEGIN
  -- Log prescription creation
  INSERT INTO public.prescription_audit (
    hospital_id, patient_id, prescription_id,
    actor_user_id, actor_role, action_type,
    change_reason,
    before_state, after_state,
    event_time
  ) VALUES (
    v_hospital_id, v_patient_id, v_prescription_id,
    v_doctor_id, 'doctor', 'CREATE',
    'New prescription created',
    NULL,
    jsonb_build_object('medication', 'Amoxicillin', 'dosage', '500mg BID'),
    now() - interval '2 hours'
  );
  
  -- Log pharmacist approval
  INSERT INTO public.prescription_audit (
    hospital_id, patient_id, prescription_id,
    actor_user_id, actor_role, action_type,
    change_reason,
    before_state, after_state,
    event_time
  ) VALUES (
    v_hospital_id, v_patient_id, v_prescription_id,
    v_pharmacist_id, 'pharmacist', 'APPROVE',
    'Approved after interaction check',
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', 'approved'),
    now() - interval '1 hour'
  );
  
  -- Log dosage amendment (doctor corrects)
  INSERT INTO public.prescription_audit (
    hospital_id, patient_id, prescription_id,
    actor_user_id, actor_role, action_type,
    change_reason, dosage_before, dosage_after,
    amends_audit_id, amendment_justification,
    before_state, after_state,
    event_time
  ) SELECT
    v_hospital_id, v_patient_id, v_prescription_id,
    v_doctor_id, 'doctor', 'AMEND',
    'Dosage correction',
    '500mg BID', '250mg BID',
    pa.audit_id, 'Patient has renal impairment; reduce per guidelines',
    jsonb_build_object('dosage', '500mg BID'),
    jsonb_build_object('dosage', '250mg BID'),
    now() - interval '30 minutes'
  FROM public.prescription_audit pa
  WHERE pa.prescription_id = v_prescription_id
    AND pa.action_type = 'APPROVE'
  LIMIT 1;
  
  RAISE NOTICE 'Test data created for prescription: %', v_prescription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.test_setup_prescription_audit_scenario() TO authenticated;

-- ============================================================================
-- 2. TEST HELPER: Populate invoice_adjustment_audit with test data
-- ============================================================================

CREATE OR REPLACE FUNCTION public.test_setup_invoice_audit_scenario()
RETURNS void AS $$
DECLARE
  v_hospital_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
  v_patient_id UUID := 'b0000000-0000-0000-0000-000000000001'::UUID;
  v_billing_user_id UUID := 'e0000000-0000-0000-0000-000000000001'::UUID;
  v_invoice_id UUID := gen_random_uuid();
BEGIN
  -- Log invoice creation
  INSERT INTO public.invoice_adjustment_audit (
    hospital_id, patient_id, invoice_id,
    actor_user_id, actor_role,
    action_type, change_reason,
    subtotal_before, subtotal_after,
    tax_before, tax_after,
    total_before, total_after,
    before_state, after_state,
    event_time
  ) VALUES (
    v_hospital_id, v_patient_id, v_invoice_id,
    v_billing_user_id, 'billing',
    'CHARGE_CREATED', 'New invoice from consultation',
    0, 1000.00,
    0, 100.00,
    0, 1100.00,
    NULL,
    jsonb_build_object('subtotal', 1000.00, 'tax', 100.00, 'total', 1100.00),
    now() - interval '1 hour'
  );
  
  -- Log discount applied
  INSERT INTO public.invoice_adjustment_audit (
    hospital_id, patient_id, invoice_id,
    actor_user_id, actor_role,
    action_type, change_reason,
    amount_change,
    total_before, total_after,
    before_state, after_state,
    event_time
  ) VALUES (
    v_hospital_id, v_patient_id, v_invoice_id,
    v_billing_user_id, 'billing',
    'DISCOUNT_APPLIED', 'Insurance negotiated 5% discount',
    -55.00,
    1100.00, 1045.00,
    jsonb_build_object('total', 1100.00),
    jsonb_build_object('total', 1045.00, 'discount_reason', 'Insurance negotiation'),
    now() - interval '30 minutes'
  );
  
  -- Log payment received
  INSERT INTO public.invoice_adjustment_audit (
    hospital_id, patient_id, invoice_id,
    actor_user_id, actor_role,
    action_type, change_reason,
    amount_change,
    total_after,
    before_state, after_state,
    event_time
  ) VALUES (
    v_hospital_id, v_patient_id, v_invoice_id,
    v_billing_user_id, 'billing',
    'PAYMENT_RECEIVED', 'Payment received via bank transfer',
    1045.00,
    1045.00,
    jsonb_build_object('paid_amount', 0),
    jsonb_build_object('paid_amount', 1045.00, 'payment_method', 'bank_transfer'),
    now() - interval '10 minutes'
  );
  
  RAISE NOTICE 'Test data created for invoice: %', v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.test_setup_invoice_audit_scenario() TO authenticated;

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
-- 6. PERFORMANCE: Purge old audit logs (if retention policy < forever)
-- ============================================================================
-- WARNING: Use only if your compliance policy allows deletion of audit logs.
--          Best practice: Keep forever. Only use for test/staging environments.

CREATE OR REPLACE FUNCTION public.purge_old_audit_logs_staging_only(
  p_days_retention INT DEFAULT 90
)
RETURNS TABLE (
  deleted_count INT,
  warning_message TEXT
) AS $$
DECLARE
  v_deleted INT;
BEGIN
  -- Safety check: only allow in non-production
  IF current_setting('app.environment', true) != 'staging' THEN
    RAISE EXCEPTION 'Audit log purge only allowed in staging environment!';
  END IF;
  
  DELETE FROM public.audit_log
  WHERE event_time < now() - (p_days_retention || ' days')::INTERVAL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN QUERY SELECT 
    v_deleted,
    'WARNING: Audit logs deleted. Production policy: keep forever.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- DO NOT GRANT THIS IN PRODUCTION
-- GRANT EXECUTE ON FUNCTION public.purge_old_audit_logs_staging_only(INT) TO authenticated;
