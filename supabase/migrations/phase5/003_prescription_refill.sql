-- Phase 5 Feature 3: Prescription Refill Workflows
-- Migration 003: Refill Requests & Auto-Refill Policies

-- Create prescription_refill_requests table
CREATE TABLE IF NOT EXISTS public.prescription_refill_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  
  -- Request status: requested, reviewing, approved, denied, dispensed, expired
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'reviewing', 'approved', 'denied', 'dispensed', 'expired')),
  
  -- Pharmacist assignment
  assigned_to UUID REFERENCES public.profiles(id),
  
  -- Request reason (optional)
  reason TEXT,
  
  -- Refill quantity
  quantity_requested INTEGER NOT NULL,
  quantity_approved INTEGER,
  
  -- Dates
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.profiles(id),
  dispensed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Denial reason (if applicable)
  denial_reason TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prescription_refill_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_refill_hospital_id ON public.prescription_refill_requests(hospital_id);
CREATE INDEX idx_refill_prescription_id ON public.prescription_refill_requests(prescription_id);
CREATE INDEX idx_refill_patient_id ON public.prescription_refill_requests(patient_id);
CREATE INDEX idx_refill_status ON public.prescription_refill_requests(status);
CREATE INDEX idx_refill_requested_at ON public.prescription_refill_requests(requested_at);

-- RLS Policies
CREATE POLICY "Patients can view own refill requests"
  ON public.prescription_refill_requests
  FOR SELECT
  USING (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
    OR hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Patients can create refill requests"
  ON public.prescription_refill_requests
  FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Pharmacists can update refill requests"
  ON public.prescription_refill_requests
  FOR UPDATE
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  )
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

-- Create prescription_auto_refill_policies table
CREATE TABLE IF NOT EXISTS public.prescription_auto_refill_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  
  -- Policy settings
  is_active BOOLEAN DEFAULT TRUE,
  auto_refill_enabled BOOLEAN DEFAULT FALSE,
  auto_refill_days_before_expiry INTEGER DEFAULT 7,
  max_refills_allowed INTEGER,
  refills_remaining INTEGER,
  
  -- Refill frequency: as_needed, weekly, monthly, quarterly
  frequency TEXT CHECK (frequency IN ('as_needed', 'weekly', 'monthly', 'quarterly')),
  
  -- Escalation: auto-approve if within quantity limits
  auto_approve_within_quantity BOOLEAN DEFAULT FALSE,
  
  -- Dates
  policy_start_date DATE NOT NULL,
  policy_end_date DATE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.prescription_auto_refill_policies ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_auto_refill_hospital ON public.prescription_auto_refill_policies(hospital_id);
CREATE INDEX idx_auto_refill_prescription ON public.prescription_auto_refill_policies(prescription_id);
CREATE INDEX idx_auto_refill_patient ON public.prescription_auto_refill_policies(patient_id);
CREATE INDEX idx_auto_refill_active ON public.prescription_auto_refill_policies(is_active);

-- RLS Policies
CREATE POLICY "Doctor and staff can view auto-refill policies"
  ON public.prescription_auto_refill_policies
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    OR doctor_id = auth.uid()
    OR patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Doctor can create auto-refill policies"
  ON public.prescription_auto_refill_policies
  FOR INSERT
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Doctor can update auto-refill policies"
  ON public.prescription_auto_refill_policies
  FOR UPDATE
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  )
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

-- Create trigger for automatic refill processing
CREATE OR REPLACE FUNCTION public.process_auto_refills()
RETURNS VOID AS $$
DECLARE
  v_policy RECORD;
  v_refill_request_id UUID;
BEGIN
  FOR v_policy IN
    SELECT * FROM public.prescription_auto_refill_policies
    WHERE is_active = TRUE
      AND auto_refill_enabled = TRUE
      AND (policy_end_date IS NULL OR policy_end_date >= CURRENT_DATE)
      AND refills_remaining > 0
  LOOP
    -- Create automatic refill request
    INSERT INTO public.prescription_refill_requests (
      hospital_id,
      prescription_id,
      patient_id,
      status,
      quantity_requested,
      quantity_approved,
      reason
    ) VALUES (
      v_policy.hospital_id,
      v_policy.prescription_id,
      v_policy.patient_id,
      CASE WHEN v_policy.auto_approve_within_quantity THEN 'approved' ELSE 'reviewing' END,
      1,
      CASE WHEN v_policy.auto_approve_within_quantity THEN 1 ELSE NULL END,
      'Auto-refill via policy'
    )
    RETURNING id INTO v_refill_request_id;
    
    -- Decrement refills remaining
    UPDATE public.prescription_auto_refill_policies
    SET refills_remaining = refills_remaining - 1
    WHERE id = v_policy.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_refill_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_auto_refill_policies TO authenticated;
