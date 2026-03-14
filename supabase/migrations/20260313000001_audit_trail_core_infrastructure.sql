-- ============================================================================
-- CareSync Phase 2A: Core Audit Trail Infrastructure
-- ============================================================================
-- Enforces tamper-evident, append-only audit logging for clinical, billing &
-- administrative workflows with forensic integrity.
-- 
-- Pattern: All high-risk events are logged to immutable audit tables.
--          Corrections use AMENDMENT pattern (new records, not overwrites).
-- ============================================================================

-- ============================================================================
-- 1. CORE AUDIT TABLE (Foundation for all audit logging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  -- Primary identification
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Temporal tracking (immutable)
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Hospital & Tenant scoping
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  
  -- Actor context (WHO made the change)
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  actor_email TEXT,
  
  -- Entity being changed (WHAT changed)
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Semantic context (WHY it changed)
  change_reason TEXT,
  
  -- State snapshots (BEFORE/AFTER for forensic recovery)
  before_state JSONB,
  after_state JSONB,
  
  -- Network & session tracking (WHERE & HOW)
  source_ip INET,
  session_id TEXT,
  user_agent TEXT,
  
  -- Amendment tracking (for corrections)
  amends_audit_id UUID REFERENCES public.audit_log(audit_id) ON DELETE RESTRICT,
  
  -- Patient context (for clinical audit trails)
  patient_id UUID REFERENCES public.patients(id) ON DELETE RESTRICT,
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  
  -- Compliance & forensics
  hash_chain TEXT,
  immutable_lock BOOLEAN NOT NULL DEFAULT true
);

-- Immutable: No updates or deletes allowed after creation
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log is append-only, no updates"
ON public.audit_log FOR UPDATE
USING (false);

CREATE POLICY "Audit log is append-only, no deletes"
ON public.audit_log FOR DELETE
USING (false);

CREATE POLICY "Staff can read audit logs for their hospital"
ON public.audit_log FOR SELECT
USING (user_belongs_to_hospital(auth.uid(), hospital_id));

CREATE POLICY "System can insert audit logs"
ON public.audit_log FOR INSERT
WITH CHECK (hospital_id IN (
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Critical indexes for forensic investigation
CREATE INDEX idx_audit_log_hospital_time 
  ON public.audit_log(hospital_id, event_time DESC);
  
CREATE INDEX idx_audit_log_entity 
  ON public.audit_log(entity_type, entity_id, event_time DESC);
  
CREATE INDEX idx_audit_log_actor 
  ON public.audit_log(actor_user_id, event_time DESC);
  
CREATE INDEX idx_audit_log_patient 
  ON public.audit_log(patient_id, event_time DESC);
  
CREATE INDEX idx_audit_log_action 
  ON public.audit_log(action_type, event_time DESC);
  
CREATE INDEX idx_audit_log_amendment 
  ON public.audit_log(amends_audit_id) 
  WHERE amends_audit_id IS NOT NULL;

-- ============================================================================
-- 2. PRESCRIPTION AUDIT TABLE (Append-only, forensic-grade)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.prescription_audit (
  -- Primary & immutable
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now() CHECK (event_time <= now()),
  
  -- Scoping
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  prescription_id UUID NOT NULL,
  
  -- Actor context
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN (
    'doctor', 'pharmacist', 'nurse', 'admin', 'compliance'
  )),
  
  -- Action semantics
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATE', 'VERIFY', 'APPROVE', 'REJECT', 'DISPENSE', 
    'AMEND', 'REVERSAL', 'HOLD', 'CANCEL'
  )),
  
  -- Forensic payload
  change_reason TEXT,
  before_state JSONB,
  after_state JSONB,
  
  -- Key fields for quick filtering
  medication_name TEXT,
  dosage_before TEXT,
  dosage_after TEXT,
  quantity_before INTEGER,
  quantity_after INTEGER,
  
  -- Amendment pattern (for corrections)
  amends_audit_id UUID REFERENCES public.prescription_audit(audit_id) ON DELETE RESTRICT,
  amendment_justification TEXT,
  
  -- Network context
  source_ip INET,
  session_id TEXT,
  
  -- Immutability lock
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prescription_audit ENABLE ROW LEVEL SECURITY;

-- Enforce append-only
CREATE POLICY "prescription_audit_no_update"
ON public.prescription_audit FOR UPDATE USING (false);

CREATE POLICY "prescription_audit_no_delete"
ON public.prescription_audit FOR DELETE USING (false);

CREATE POLICY "prescription_audit_select"
ON public.prescription_audit FOR SELECT
USING (hospital_id IN (
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "prescription_audit_insert"
ON public.prescription_audit FOR INSERT
WITH CHECK (hospital_id IN (
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
));

-- Forensic indexes
CREATE INDEX idx_prescription_audit_hospital_time 
  ON public.prescription_audit(hospital_id, event_time DESC);
  
CREATE INDEX idx_prescription_audit_prescription 
  ON public.prescription_audit(prescription_id, event_time DESC);
  
CREATE INDEX idx_prescription_audit_patient 
  ON public.prescription_audit(patient_id, event_time DESC);
  
CREATE INDEX idx_prescription_audit_actor 
  ON public.prescription_audit(actor_user_id, event_time DESC);
  
CREATE INDEX idx_prescription_audit_action 
  ON public.prescription_audit(action_type, event_time DESC);
  
CREATE INDEX idx_prescription_audit_amendment 
  ON public.prescription_audit(amends_audit_id) 
  WHERE amends_audit_id IS NOT NULL;

-- ============================================================================
-- 3. INVOICE ADJUSTMENT AUDIT TABLE (Append-only, never overwrite)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_adjustment_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  invoice_id UUID NOT NULL,
  
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN (
    'billing', 'accountant', 'doctor', 'admin'
  )),
  
  -- Billing actions
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CHARGE_CREATED', 'PAYMENT_RECEIVED', 'ADJUSTMENT', 
    'DISCOUNT_APPLIED', 'REVERSAL', 'WRITE_OFF', 'RECONCILED'
  )),
  
  change_reason TEXT NOT NULL,
  
  -- Amount tracking (immutable snapshots)
  amount_change NUMERIC(10,2),
  subtotal_before NUMERIC(10,2),
  subtotal_after NUMERIC(10,2),
  tax_before NUMERIC(10,2),
  tax_after NUMERIC(10,2),
  total_before NUMERIC(10,2),
  total_after NUMERIC(10,2),
  
  -- Full state for forensic analysis
  before_state JSONB,
  after_state JSONB,
  
  -- Amendment pattern
  amends_audit_id UUID REFERENCES public.invoice_adjustment_audit(audit_id) ON DELETE RESTRICT,
  
  source_ip INET,
  session_id TEXT,
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_adjustment_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_adjustment_audit_no_update"
ON public.invoice_adjustment_audit FOR UPDATE USING (false);

CREATE POLICY "invoice_adjustment_audit_no_delete"
ON public.invoice_adjustment_audit FOR DELETE USING (false);

CREATE POLICY "invoice_adjustment_audit_select"
ON public.invoice_adjustment_audit FOR SELECT
USING (hospital_id IN (
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "invoice_adjustment_audit_insert"
ON public.invoice_adjustment_audit FOR INSERT
WITH CHECK (hospital_id IN (
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE INDEX idx_invoice_adjustment_audit_hospital_time 
  ON public.invoice_adjustment_audit(hospital_id, event_time DESC);
  
CREATE INDEX idx_invoice_adjustment_audit_invoice 
  ON public.invoice_adjustment_audit(invoice_id, event_time DESC);
  
CREATE INDEX idx_invoice_adjustment_audit_patient 
  ON public.invoice_adjustment_audit(patient_id, event_time DESC);
  
CREATE INDEX idx_invoice_adjustment_audit_actor 
  ON public.invoice_adjustment_audit(actor_user_id, event_time DESC);

-- ============================================================================
-- 4. LAB RESULT AUDIT TABLE (Amendment pattern for corrections)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lab_result_audit (
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  lab_result_id UUID NOT NULL,
  
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN (
    'lab_technician', 'pathologist', 'doctor', 'admin'
  )),
  
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATED', 'VERIFIED', 'AMENDED', 'CORRECTED', 'INVALIDATED'
  )),
  
  change_reason TEXT,
  
  test_name TEXT,
  result_value_before TEXT,
  result_value_after TEXT,
  reference_range TEXT,
  unit_before TEXT,
  unit_after TEXT,
  
  before_state JSONB,
  after_state JSONB,
  
  amends_audit_id UUID REFERENCES public.lab_result_audit(audit_id) ON DELETE RESTRICT,
  amendment_justification TEXT,
  
  source_ip INET,
  session_id TEXT,
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_result_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_result_audit_no_update"
ON public.lab_result_audit FOR UPDATE USING (false);

CREATE POLICY "lab_result_audit_no_delete"
ON public.lab_result_audit FOR DELETE USING (false);

CREATE POLICY "lab_result_audit_select"
ON public.lab_result_audit FOR SELECT
USING (hospital_id IN (
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "lab_result_audit_insert"
ON public.lab_result_audit FOR INSERT
WITH CHECK (hospital_id IN (
  SELECT hospital_id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE INDEX idx_lab_result_audit_hospital_time 
  ON public.lab_result_audit(hospital_id, event_time DESC);
  
CREATE INDEX idx_lab_result_audit_lab_result 
  ON public.lab_result_audit(lab_result_id, event_time DESC);
  
CREATE INDEX idx_lab_result_audit_patient 
  ON public.lab_result_audit(patient_id, event_time DESC);

-- ============================================================================
-- 5. HELPER FUNCTION: Log audit event (reusable across all workflows)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_hospital_id UUID,
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_patient_id UUID DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_source_ip INET DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_actor_email TEXT;
BEGIN
  -- Get actor email for convenience
  SELECT email INTO v_actor_email 
  FROM public.profiles 
  WHERE id = p_actor_user_id;
  
  -- Insert audit record (append-only)
  INSERT INTO public.audit_log (
    hospital_id,
    actor_user_id,
    actor_role,
    actor_email,
    action_type,
    entity_type,
    entity_id,
    patient_id,
    change_reason,
    before_state,
    after_state,
    source_ip,
    session_id
  ) VALUES (
    p_hospital_id,
    p_actor_user_id,
    p_actor_role,
    v_actor_email,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_patient_id,
    p_change_reason,
    p_before_state,
    p_after_state,
    p_source_ip,
    p_session_id
  )
  RETURNING audit_id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. HELPER FUNCTION: Create amendment record (never overwrite original)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_amendment_audit(
  p_amends_audit_id UUID,
  p_hospital_id UUID,
  p_actor_user_id UUID,
  p_actor_role TEXT,
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_patient_id UUID DEFAULT NULL,
  p_amendment_justification TEXT,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_source_ip INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_audit_id UUID;
BEGIN
  -- Insert new amendment audit record
  INSERT INTO public.audit_log (
    hospital_id,
    actor_user_id,
    actor_role,
    action_type,
    entity_type,
    entity_id,
    patient_id,
    amends_audit_id,
    change_reason,
    before_state,
    after_state,
    source_ip
  ) VALUES (
    p_hospital_id,
    p_actor_user_id,
    p_actor_role,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_patient_id,
    p_amends_audit_id,
    p_amendment_justification,
    p_before_state,
    p_after_state,
    p_source_ip
  )
  RETURNING audit_id INTO v_new_audit_id;
  
  RETURN v_new_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. AUDIT LOG VIEW: Forensic summary for investigators
-- ============================================================================

CREATE OR REPLACE VIEW public.audit_log_summary AS
SELECT 
  al.audit_id,
  al.event_time,
  al.hospital_id,
  p.email AS actor_email,
  al.actor_role,
  al.action_type,
  al.entity_type,
  al.entity_id,
  pa.name AS patient_name,
  al.change_reason,
  (al.before_state ->> 'status') AS status_before,
  (al.after_state ->> 'status') AS status_after,
  CASE 
    WHEN al.amends_audit_id IS NOT NULL 
    THEN 'AMENDMENT'
    ELSE 'ORIGINAL'
  END AS record_type,
  al.source_ip,
  al.session_id
FROM public.audit_log al
LEFT JOIN public.profiles p ON al.actor_user_id = p.id
LEFT JOIN public.patients pa ON al.patient_id = pa.id
ORDER BY al.event_time DESC;

GRANT SELECT ON public.audit_log_summary TO authenticated;
