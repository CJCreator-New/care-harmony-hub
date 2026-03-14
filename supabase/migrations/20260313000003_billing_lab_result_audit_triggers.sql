-- ============================================================================
-- CareSync Phase 2A: Billing & Lab Result Audit Triggers
-- ============================================================================
-- Forensic-grade audit logging for financial and clinical workflows.
-- ============================================================================

-- ============================================================================
-- 1. INVOICE ADJUSTMENT PATTERN
-- ============================================================================
-- DO NOT UPDATE invoice totals directly.
-- Instead: Create adjustment audit records with full justification.
-- Non-repudiation: Finance manager + approver signatures required.

CREATE OR REPLACE FUNCTION public.log_invoice_charge_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.invoice_adjustment_audit (
    hospital_id,
    patient_id,
    invoice_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    subtotal_before,
    subtotal_after,
    tax_before,
    tax_after,
    total_before,
    total_after,
    before_state,
    after_state
  ) VALUES (
    NEW.hospital_id,
    NEW.patient_id,
    NEW.id,
    auth.uid(),
    'billing',
    'CHARGE_CREATED',
    'New invoice created for consultation',
    0,
    NEW.subtotal,
    0,
    NEW.tax,
    0,
    NEW.total,
    jsonb_build_object('status', 'new'),
    jsonb_build_object(
      'id', NEW.id,
      'invoice_number', NEW.invoice_number,
      'subtotal', NEW.subtotal,
      'tax', NEW.tax,
      'total', NEW.total,
      'status', NEW.status,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER invoice_charge_creation_audit_trigger
AFTER INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.log_invoice_charge_creation();

-- ============================================================================
-- 2. INCOME ADJUSTMENT FUNCTION (Discount, reversal, write-off)
-- ============================================================================
-- For corrections: no UPDATE allowed. Create NEW adjustment record.
-- Example: Invoice total was $1000, discounted by $50 (insurance negotiation)
--   → Create adjustment record showing: $1000 → $950 with reason

CREATE OR REPLACE FUNCTION public.create_invoice_adjustment(
  p_invoice_id UUID,
  p_adjustment_amount NUMERIC,
  p_adjustment_type TEXT,
  p_reason TEXT,
  p_approving_user_id UUID,
  p_approver_role TEXT
)
RETURNS UUID AS $$
DECLARE
  v_hospital_id UUID;
  v_patient_id UUID;
  v_invoice_row RECORD;
  v_new_total NUMERIC;
  v_new_tax NUMERIC;
BEGIN
  -- Get invoice details
  SELECT hospital_id, patient_id, subtotal, tax, total
  INTO v_hospital_id, v_patient_id, v_invoice_row
  FROM public.invoices
  WHERE id = p_invoice_id;
  
  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
  END IF;
  
  -- Calculate new totals
  v_new_total := v_invoice_row.total + p_adjustment_amount;
  v_new_tax := v_invoice_row.tax;
  
  -- Create adjustment audit record (NOT updating original invoice)
  INSERT INTO public.invoice_adjustment_audit (
    hospital_id,
    patient_id,
    invoice_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    amount_change,
    total_before,
    total_after,
    tax_before,
    tax_after,
    before_state,
    after_state
  ) VALUES (
    v_hospital_id,
    v_patient_id,
    p_invoice_id,
    p_approving_user_id,
    p_approver_role,
    p_adjustment_type,
    p_reason,
    p_adjustment_amount,
    v_invoice_row.total,
    v_new_total,
    v_new_tax,
    v_new_tax,
    jsonb_build_object('total', v_invoice_row.total),
    jsonb_build_object('total', v_new_total, 'adjustment_reason', p_reason)
  );
  
  RETURN p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_invoice_adjustment(UUID, NUMERIC, TEXT, TEXT, UUID, TEXT) 
TO authenticated;

-- ============================================================================
-- 3. PAYMENT LOGGING TRIGGER
-- ============================================================================
-- Logs every payment received (immutable record for reconciliation)

CREATE OR REPLACE FUNCTION public.log_payment_received()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_row RECORD;
BEGIN
  SELECT hospital_id, patient_id, total
  INTO v_invoice_row
  FROM public.invoices
  WHERE id = NEW.invoice_id;
  
  INSERT INTO public.invoice_adjustment_audit (
    hospital_id,
    patient_id,
    invoice_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    amount_change,
    total_after,
    before_state,
    after_state
  ) VALUES (
    v_invoice_row.hospital_id,
    v_invoice_row.patient_id,
    NEW.invoice_id,
    COALESCE(NEW.received_by, auth.uid()),
    'billing',
    'PAYMENT_RECEIVED',
    FORMAT('Payment [%s] of %s received', NEW.payment_method, NEW.amount),
    NEW.amount,
    v_invoice_row.total,
    jsonb_build_object('payment_status', 'pending'),
    jsonb_build_object(
      'payment_method', NEW.payment_method,
      'amount', NEW.amount,
      'reference_number', NEW.reference_number,
      'payment_date', NEW.payment_date,
      'received_by', NEW.received_by
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER payment_audit_trigger
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.log_payment_received();

-- ============================================================================
-- 4. LAB RESULT CREATION LOGGING
-- ============================================================================
-- Logs when lab technician creates a new result

CREATE OR REPLACE FUNCTION public.log_lab_result_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.lab_result_audit (
    hospital_id,
    patient_id,
    lab_result_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    test_name,
    result_value_after,
    unit_after,
    reference_range,
    before_state,
    after_state
  ) VALUES (
    NEW.hospital_id,
    NEW.patient_id,
    NEW.id,
    auth.uid(),
    'lab_technician',
    'CREATED',
    'New lab result entered',
    NEW.test_name,
    NEW.result_value::text,
    NEW.unit,
    NEW.reference_range,
    NULL,
    jsonb_build_object(
      'id', NEW.id,
      'test_name', NEW.test_name,
      'result_value', NEW.result_value,
      'unit', NEW.unit,
      'reference_range', NEW.reference_range,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER lab_result_creation_audit_trigger
AFTER INSERT ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.log_lab_result_creation();

-- ============================================================================
-- 5. LAB RESULT VERIFICATION/SIGN-OFF
-- ============================================================================
-- Logs when pathologist approves/signs off on result

CREATE OR REPLACE FUNCTION public.log_lab_result_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified_at IS NOT NULL AND OLD.verified_at IS NULL THEN
    INSERT INTO public.lab_result_audit (
      hospital_id,
      patient_id,
      lab_result_id,
      actor_user_id,
      actor_role,
      action_type,
      change_reason,
      test_name,
      result_value_before,
      result_value_after,
      before_state,
      after_state
    ) VALUES (
      NEW.hospital_id,
      NEW.patient_id,
      NEW.id,
      auth.uid(),
      'pathologist',
      'VERIFIED',
      'Result reviewed and verified by pathologist',
      NEW.test_name,
      NEW.result_value::text,
      NEW.result_value::text,
      jsonb_build_object('verified', false),
      jsonb_build_object('verified', true, 'verified_at', NEW.verified_at, 'verified_by', auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER lab_result_verification_audit_trigger
AFTER UPDATE ON public.lab_results
FOR EACH ROW
EXECUTE FUNCTION public.log_lab_result_verification();

-- ============================================================================
-- 6. LAB RESULT AMENDMENT (Error correction without overwriting)
-- ============================================================================
-- Pattern: Result was 125 mg/dL, should be 95 mg/dL (data entry error)
-- Solutions:
--   A. Create CORRECTED amendment record (preferred)
--   B. Keep original, mark as invalidated, link to corrected
--   C. Chain visible in audit trail

CREATE OR REPLACE FUNCTION public.amend_lab_result(
  p_lab_result_id UUID,
  p_corrected_value TEXT,
  p_correction_reason TEXT,
  p_corrected_by_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_hospital_id UUID;
  v_patient_id UUID;
  v_original_value TEXT;
  v_test_name TEXT;
  v_original_audit_id UUID;
  v_new_audit_id UUID;
BEGIN
  -- Get original result details
  SELECT hospital_id, patient_id, result_value::text, test_name
  INTO v_hospital_id, v_patient_id, v_original_value, v_test_name
  FROM public.lab_results
  WHERE id = p_lab_result_id;
  
  -- Find original creation audit
  SELECT audit_id INTO v_original_audit_id
  FROM public.lab_result_audit
  WHERE lab_result_id = p_lab_result_id
    AND action_type = 'CREATED'
  LIMIT 1;
  
  -- Create amendment audit (new record, not overwriting)
  INSERT INTO public.lab_result_audit (
    hospital_id,
    patient_id,
    lab_result_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    test_name,
    result_value_before,
    result_value_after,
    amends_audit_id,
    amendment_justification,
    before_state,
    after_state
  ) VALUES (
    v_hospital_id,
    v_patient_id,
    p_lab_result_id,
    p_corrected_by_id,
    'pathologist',
    'CORRECTED',
    'Data entry error corrected',
    v_test_name,
    v_original_value,
    p_corrected_value,
    v_original_audit_id,
    p_correction_reason,
    jsonb_build_object('result_value', v_original_value),
    jsonb_build_object('result_value', p_corrected_value, 'reason', p_correction_reason)
  )
  RETURNING audit_id INTO v_new_audit_id;
  
  -- Mark original as amended (optional: update lab_results status if column exists)
  -- UPDATE public.lab_results SET status = 'amended' WHERE id = p_lab_result_id;
  
  RETURN v_new_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.amend_lab_result(UUID, TEXT, TEXT, UUID) TO authenticated;

-- ============================================================================
-- 7. INVALID LAB RESULT PATTERN
-- ============================================================================
-- Result must be invalidated due to specimen contamination/equipment failure
-- Create INVALIDATED record, do not delete

CREATE OR REPLACE FUNCTION public.invalidate_lab_result(
  p_lab_result_id UUID,
  p_invalidation_reason TEXT,
  p_invalidated_by_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_hospital_id UUID;
  v_patient_id UUID;
  v_new_audit_id UUID;
BEGIN
  SELECT hospital_id, patient_id
  INTO v_hospital_id, v_patient_id
  FROM public.lab_results
  WHERE id = p_lab_result_id;
  
  INSERT INTO public.lab_result_audit (
    hospital_id,
    patient_id,
    lab_result_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    before_state,
    after_state
  ) VALUES (
    v_hospital_id,
    v_patient_id,
    p_lab_result_id,
    p_invalidated_by_id,
    'pathologist',
    'INVALIDATED',
    p_invalidation_reason,
    jsonb_build_object('status', 'valid'),
    jsonb_build_object('status', 'invalid', 'reason', p_invalidation_reason)
  )
  RETURNING audit_id INTO v_new_audit_id;
  
  RETURN v_new_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.invalidate_lab_result(UUID, TEXT, UUID) TO authenticated;

-- ============================================================================
-- 8. FORENSIC QUERIES
-- ============================================================================

-- Query 1: Full invoice lifecycle (charges + payments + adjustments)
CREATE OR REPLACE FUNCTION public.get_invoice_audit_trail(p_invoice_id UUID)
RETURNS TABLE (
  sequence_number INT,
  event_time TIMESTAMPTZ,
  actor_email TEXT,
  action_type TEXT,
  amount_change NUMERIC,
  total_before NUMERIC,
  total_after NUMERIC,
  reason TEXT
) AS $$
SELECT 
  ROW_NUMBER() OVER (ORDER BY iaa.event_time) AS seq,
  iaa.event_time,
  p.email,
  iaa.action_type,
  iaa.amount_change,
  iaa.total_before,
  iaa.total_after,
  iaa.change_reason
FROM public.invoice_adjustment_audit iaa
LEFT JOIN public.profiles p ON iaa.actor_user_id = p.id
WHERE iaa.invoice_id = p_invoice_id
ORDER BY iaa.event_time;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_invoice_audit_trail(UUID) TO authenticated;

-- Query 2: Lab result correction chain
CREATE OR REPLACE FUNCTION public.get_lab_result_history(p_lab_result_id UUID)
RETURNS TABLE (
  sequence_number INT,
  event_time TIMESTAMPTZ,
  actor_role TEXT,
  action_type TEXT,
  result_value_before TEXT,
  result_value_after TEXT,
  reason TEXT
) AS $$
WITH RECURSIVE lab_chain AS (
  SELECT 
    1 AS seq,
    lra.event_time,
    lra.actor_role,
    lra.action_type,
    lra.result_value_before,
    lra.result_value_after,
    lra.change_reason,
    lra.audit_id,
    lra.amends_audit_id
  FROM public.lab_result_audit lra
  WHERE lra.lab_result_id = p_lab_result_id
    AND lra.amends_audit_id IS NULL
  
  UNION ALL
  
  SELECT 
    lc.seq + 1,
    lra.event_time,
    lra.actor_role,
    lra.action_type,
    lra.result_value_before,
    lra.result_value_after,
    lra.change_reason,
    lra.audit_id,
    lra.amends_audit_id
  FROM public.lab_result_audit lra
  INNER JOIN lab_chain lc ON lra.amends_audit_id = lc.audit_id
)
SELECT 
  seq::INT,
  event_time,
  actor_role,
  action_type,
  result_value_before,
  result_value_after,
  change_reason
FROM lab_chain
ORDER BY seq;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_lab_result_history(UUID) TO authenticated;
