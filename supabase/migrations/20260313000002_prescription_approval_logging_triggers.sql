-- ============================================================================
-- CareSync Phase 2A: Prescription Approval & Amendment Audit Triggers
-- ============================================================================
-- This file provides production-ready trigger code for logging prescription
-- lifecycle events with forensic integrity.
-- ============================================================================

-- ============================================================================
-- 1. PRESCRIPTION APPROVAL TRIGGER
-- ============================================================================
-- Logs when pharmacist approves a prescription after interaction checks.
-- Captures: actor info, timestamp (UTC), change reason, before/after state

CREATE OR REPLACE FUNCTION public.log_prescription_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_role TEXT;
  v_before_state JSONB;
  v_after_state JSONB;
BEGIN
  -- Only log when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Get approver's role
    SELECT COALESCE(
      (SELECT role FROM public.profiles WHERE id = auth.uid()),
      'pharmacist'
    ) INTO v_actor_role;
    
    -- Capture before state
    v_before_state := jsonb_build_object(
      'prescription_id', OLD.id,
      'patient_id', OLD.patient_id,
      'status', OLD.status,
      'notes', OLD.notes,
      'dispensed_by', OLD.dispensed_by,
      'dispensed_at', OLD.dispensed_at,
      'created_at', OLD.created_at
    );
    
    -- Capture after state
    v_after_state := jsonb_build_object(
      'prescription_id', NEW.id,
      'patient_id', NEW.patient_id,
      'status', NEW.status,
      'notes', NEW.notes,
      'dispensed_by', NEW.dispensed_by,
      'dispensed_at', NEW.dispensed_at,
      'created_at', NEW.created_at
    );
    
    -- Log to prescription_audit table
    INSERT INTO public.prescription_audit (
      hospital_id,
      patient_id,
      prescription_id,
      actor_user_id,
      actor_role,
      action_type,
      change_reason,
      before_state,
      after_state
    ) VALUES (
      NEW.hospital_id,
      NEW.patient_id,
      NEW.id,
      auth.uid(),
      v_actor_role,
      'APPROVE',
      COALESCE(
        current_setting('audit.change_reason', true),
        'Approved after interaction check'
      ),
      v_before_state,
      v_after_state
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prescription_approval_audit_trigger
AFTER UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_prescription_approval();

-- ============================================================================
-- 2. PRESCRIPTION REJECTION TRIGGER
-- ============================================================================
-- Logs when pharmacist rejects a prescription with safety concern

CREATE OR REPLACE FUNCTION public.log_prescription_rejection()
RETURNS TRIGGER AS $$
DECLARE
  v_rejection_reason TEXT;
BEGIN
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    v_rejection_reason := COALESCE(
      current_setting('audit.rejection_reason', true),
      'Safety concern identified'
    );
    
    INSERT INTO public.prescription_audit (
      hospital_id,
      patient_id,
      prescription_id,
      actor_user_id,
      actor_role,
      action_type,
      change_reason,
      before_state,
      after_state
    ) VALUES (
      NEW.hospital_id,
      NEW.patient_id,
      NEW.id,
      auth.uid(),
      'pharmacist',
      'REJECT',
      v_rejection_reason,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', 'rejected', 'rejection_reason', v_rejection_reason)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prescription_rejection_audit_trigger
AFTER UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_prescription_rejection();

-- ============================================================================
-- 3. PRESCRIPTION CREATION TRIGGER
-- ============================================================================
-- Logs when doctor creates a new prescription

CREATE OR REPLACE FUNCTION public.log_prescription_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.prescription_audit (
    hospital_id,
    patient_id,
    prescription_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    before_state,
    after_state
  ) VALUES (
    NEW.hospital_id,
    NEW.patient_id,
    NEW.id,
    NEW.prescribed_by,
    'doctor',
    'CREATE',
    'New prescription created',
    NULL,
    jsonb_build_object(
      'id', NEW.id,
      'patient_id', NEW.patient_id,
      'prescribed_by', NEW.prescribed_by,
      'status', NEW.status,
      'notes', NEW.notes,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prescription_creation_audit_trigger
AFTER INSERT ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_prescription_creation();

-- ============================================================================
-- 4. PRESCRIPTION DISPENSING TRIGGER
-- ============================================================================
-- Logs when pharmacy technician marks prescription as dispensed

CREATE OR REPLACE FUNCTION public.log_prescription_dispensing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_dispensed = true AND OLD.is_dispensed = false THEN
    INSERT INTO public.prescription_audit (
      hospital_id,
      patient_id,
      prescription_id,
      actor_user_id,
      actor_role,
      action_type,
      change_reason,
      before_state,
      after_state
    ) VALUES (
      (SELECT hospital_id FROM public.prescriptions WHERE id = NEW.prescription_id),
      (SELECT patient_id FROM public.prescriptions WHERE id = NEW.prescription_id),
      NEW.prescription_id,
      auth.uid(),
      'pharmacist',
      'DISPENSE',
      'Prescription item dispensed to patient',
      jsonb_build_object('is_dispensed', OLD.is_dispensed),
      jsonb_build_object('is_dispensed', NEW.is_dispensed, 'dispensed_at', now())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prescription_item_dispensing_audit_trigger
AFTER UPDATE ON public.prescription_items
FOR EACH ROW
EXECUTE FUNCTION public.log_prescription_dispensing();

-- ============================================================================
-- 5. AMENDMENT PATTERN: Doctor Corrects Dosage
-- ============================================================================
-- DO NOT UPDATE THE ORIGINAL PRESCRIPTION IN PLACE
-- Instead: 
--   1. Create NEW prescription_amendment record
--   2. Link amendment to original via amends_audit_id
--   3. Mark original as 'amended' status
--   4. All history remains immutable

CREATE OR REPLACE FUNCTION public.amend_prescription_dosage(
  p_prescription_id UUID,
  p_old_dosage TEXT,
  p_new_dosage TEXT,
  p_amendment_reason TEXT,
  p_amending_doctor_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_hospital_id UUID;
  v_patient_id UUID;
  v_original_audit_id UUID;
  v_new_audit_id UUID;
BEGIN
  -- Get hospital and patient info from prescription
  SELECT hospital_id, patient_id 
  INTO v_hospital_id, v_patient_id
  FROM public.prescriptions
  WHERE id = p_prescription_id;
  
  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'Prescription not found: %', p_prescription_id;
  END IF;
  
  -- Find the original approval audit record
  SELECT audit_id INTO v_original_audit_id
  FROM public.prescription_audit
  WHERE prescription_id = p_prescription_id
    AND action_type = 'APPROVE'
  ORDER BY event_time DESC
  LIMIT 1;
  
  -- Create amendment audit record (new, not updating original)
  INSERT INTO public.prescription_audit (
    hospital_id,
    patient_id,
    prescription_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    dosage_before,
    dosage_after,
    amends_audit_id,
    amendment_justification,
    before_state,
    after_state
  ) VALUES (
    v_hospital_id,
    v_patient_id,
    p_prescription_id,
    p_amending_doctor_id,
    'doctor',
    'AMEND',
    'Dosage correction',
    p_old_dosage,
    p_new_dosage,
    v_original_audit_id,
    p_amendment_reason,
    jsonb_build_object('dosage', p_old_dosage),
    jsonb_build_object('dosage', p_new_dosage, 'reason', p_amendment_reason)
  )
  RETURNING audit_id INTO v_new_audit_id;
  
  -- Update prescription to reflect amendment (but original is still in audit)
  UPDATE public.prescriptions
  SET status = 'amended',
      updated_at = now()
  WHERE id = p_prescription_id;
  
  RETURN v_new_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. REVERSAL PATTERN: Prescription Recalled
-- ============================================================================
-- When a prescription must be recalled (e.g., drug interaction discovered),
-- create a REVERSAL audit record, not a delete.

CREATE OR REPLACE FUNCTION public.reverse_prescription(
  p_prescription_id UUID,
  p_reversal_reason TEXT,
  p_initiated_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_hospital_id UUID;
  v_patient_id UUID;
  v_new_audit_id UUID;
BEGIN
  SELECT hospital_id, patient_id 
  INTO v_hospital_id, v_patient_id
  FROM public.prescriptions
  WHERE id = p_prescription_id;
  
  INSERT INTO public.prescription_audit (
    hospital_id,
    patient_id,
    prescription_id,
    actor_user_id,
    actor_role,
    action_type,
    change_reason,
    before_state,
    after_state
  ) VALUES (
    v_hospital_id,
    v_patient_id,
    p_prescription_id,
    p_initiated_by,
    'pharmacist',
    'REVERSAL',
    p_reversal_reason,
    jsonb_build_object('status', 'approved'),
    jsonb_build_object('status', 'reversed', 'reason', p_reversal_reason)
  )
  RETURNING audit_id INTO v_new_audit_id;
  
  UPDATE public.prescriptions
  SET status = 'reversed',
      updated_at = now()
  WHERE id = p_prescription_id;
  
  RETURN v_new_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. HELPER: Query Amendment Chain (forensic investigation)
-- ============================================================================
-- Shows original prescription approval + all amendments in chronological order

CREATE OR REPLACE FUNCTION public.get_prescription_amendment_chain(
  p_prescription_id UUID
)
RETURNS TABLE (
  sequence_number INT,
  audit_id UUID,
  event_time TIMESTAMPTZ,
  actor_email TEXT,
  action_type TEXT,
  dosage_before TEXT,
  dosage_after TEXT,
  change_reason TEXT,
  amendment_justification TEXT
) AS $$
WITH RECURSIVE amendment_chain AS (
  -- Base: original CREATE/APPROVE record
  SELECT 
    1 AS seq,
    pa.audit_id,
    pa.event_time,
    p.email,
    pa.action_type,
    pa.dosage_before,
    pa.dosage_after,
    pa.change_reason,
    NULL::TEXT AS amendment_justification,
    pa.audit_id as audit_ref
  FROM public.prescription_audit pa
  LEFT JOIN public.profiles p ON pa.actor_user_id = p.id
  WHERE pa.prescription_id = p_prescription_id
    AND pa.amends_audit_id IS NULL
  
  UNION ALL
  
  -- Recursive: amendments that point to previous records
  SELECT
    ac.seq + 1,
    pa.audit_id,
    pa.event_time,
    p.email,
    pa.action_type,
    pa.dosage_before,
    pa.dosage_after,
    pa.change_reason,
    pa.amendment_justification,
    pa.audit_id
  FROM public.prescription_audit pa
  LEFT JOIN public.profiles p ON pa.actor_user_id = p.id
  INNER JOIN amendment_chain ac ON pa.amends_audit_id = ac.audit_id
  WHERE pa.prescription_id = p_prescription_id
)
SELECT 
  seq::INT,
  audit_id,
  event_time,
  email,
  action_type,
  dosage_before,
  dosage_after,
  change_reason,
  amendment_justification
FROM amendment_chain
ORDER BY seq;
$$ LANGUAGE SQL SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_prescription_amendment_chain(UUID) TO authenticated;

-- ============================================================================
-- 8. AUDIT CONTEXT SETTER (Application-level usage)
-- ============================================================================
-- Call this before UPDATE/amendment operations to attach context to triggers

CREATE OR REPLACE FUNCTION public.set_audit_context(
  p_change_reason TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('audit.change_reason', p_change_reason, false);
  IF p_rejection_reason IS NOT NULL THEN
    PERFORM set_config('audit.rejection_reason', p_rejection_reason, false);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.set_audit_context(TEXT, TEXT) TO authenticated;
