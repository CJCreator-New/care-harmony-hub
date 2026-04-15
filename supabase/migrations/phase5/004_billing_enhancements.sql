-- Phase 5 Feature 4: Billing Enhancements
-- Migration 004: Insurance Plans, Claims, Pre-Authorization

-- Create insurance_plans table
CREATE TABLE IF NOT EXISTS public.insurance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  
  -- Plan details
  plan_name TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  plan_code TEXT UNIQUE NOT NULL,
  
  -- Copay structure
  copay_amount DECIMAL(10, 2),
  copay_type TEXT DEFAULT 'fixed' CHECK (copay_type IN ('fixed', 'percentage', 'tiered')),
  
  -- Deductible
  annual_deductible DECIMAL(10, 2) DEFAULT 0,
  deductible_met_amount DECIMAL(10, 2) DEFAULT 0,
  
  -- Coinsurance percentage (20%, 30%, etc.)
  coinsurance_percentage DECIMAL(5, 2),
  out_of_pocket_max DECIMAL(10, 2),
  
  -- Coverage details
  is_active BOOLEAN DEFAULT TRUE,
  covers_preventive BOOLEAN DEFAULT TRUE,
  covers_emergency BOOLEAN DEFAULT TRUE,
  covers_telemedicine BOOLEAN DEFAULT TRUE,
  
  -- Provider credentials
  provider_api_key TEXT,
  provider_npi TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_insurance_hospital ON public.insurance_plans(hospital_id);
CREATE INDEX idx_insurance_active ON public.insurance_plans(is_active);
CREATE INDEX idx_insurance_plan_code ON public.insurance_plans(plan_code);

-- RLS Policies
CREATE POLICY "Staff can view insurance plans"
  ON public.insurance_plans
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Admin can manage insurance plans"
  ON public.insurance_plans
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.staff 
      WHERE user_id = auth.uid() AND role IN ('admin', 'billing')
    )
  );

-- Create insurance_claims table (EDI 837 format support)
CREATE TABLE IF NOT EXISTS public.insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id),
  insurance_plan_id UUID REFERENCES public.insurance_plans(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  
  -- Claim details
  claim_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'pending', 'approved', 'denied', 'paid', 'appealed')),
  
  -- Service details
  service_date DATE NOT NULL,
  service_description TEXT,
  diagnosis_code TEXT,
  procedure_code TEXT,
  
  -- Amount calculation
  service_charge DECIMAL(10, 2) NOT NULL,
  insurance_payment DECIMAL(10, 2),
  patient_responsibility DECIMAL(10, 2),
  copay_amount DECIMAL(10, 2),
  deductible_applied DECIMAL(10, 2),
  coinsurance_amount DECIMAL(10, 2),
  
  -- EDI 837 claim format (JSON)
  edi_837_data JSONB,
  edi_837_version TEXT DEFAULT '005010X222A1',
  
  -- Submission tracking
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID REFERENCES public.profiles(id),
  insurance_reference_number TEXT,
  
  -- Response tracking
  response_received_at TIMESTAMP WITH TIME ZONE,
  response_status_code TEXT,
  denial_reason TEXT,
  
  -- Payment tracking
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_amount DECIMAL(10, 2),
  check_number TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_claims_hospital ON public.insurance_claims(hospital_id);
CREATE INDEX idx_claims_appointment ON public.insurance_claims(appointment_id);
CREATE INDEX idx_claims_status ON public.insurance_claims(status);
CREATE INDEX idx_claims_service_date ON public.insurance_claims(service_date);

-- RLS Policies
CREATE POLICY "Billing staff can view claims"
  ON public.insurance_claims
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Billing staff can create claims"
  ON public.insurance_claims
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('billing', 'admin')
    )
  );

-- Create pre_authorizations table
CREATE TABLE IF NOT EXISTS public.pre_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  insurance_plan_id UUID NOT NULL REFERENCES public.insurance_plans(id),
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  appointment_id UUID REFERENCES public.appointments(id),
  
  -- Authorization details
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  authorization_number TEXT UNIQUE,
  
  -- Coverage verification
  is_covered BOOLEAN,
  coverage_percentage DECIMAL(5, 2),
  authorization_amount DECIMAL(10, 2),
  
  -- Validity period
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Request details
  requested_procedure TEXT,
  medical_justification TEXT,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Response details
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  denial_reason TEXT,
  
  -- Cache for performance
  cache_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pre_authorizations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_preauth_hospital ON public.pre_authorizations(hospital_id);
CREATE INDEX idx_preauth_patient ON public.pre_authorizations(patient_id);
CREATE INDEX idx_preauth_status ON public.pre_authorizations(status);
CREATE INDEX idx_preauth_authorization_number ON public.pre_authorizations(authorization_number);

-- RLS Policies
CREATE POLICY "Staff and patient can view pre-authorizations"
  ON public.pre_authorizations
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    OR patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can create pre-authorizations"
  ON public.pre_authorizations
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('billing', 'doctor', 'admin')
    )
  );

-- Create billing_audit_records table
CREATE TABLE IF NOT EXISTS public.billing_audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id),
  
  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('claim_generated', 'claim_submitted', 'payment_received', 'adjustment', 'write_off', 'appeal_filed')),
  reference_id UUID,
  
  -- Amount tracking
  amount DECIMAL(10, 2),
  description TEXT,
  
  -- Reconciliation
  reconciled BOOLEAN DEFAULT FALSE,
  reconciled_by UUID REFERENCES public.profiles(id),
  reconciled_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_audit_records ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_billing_audit_hospital ON public.billing_audit_records(hospital_id);
CREATE INDEX idx_billing_audit_event_type ON public.billing_audit_records(event_type);
CREATE INDEX idx_billing_audit_created_at ON public.billing_audit_records(created_at);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.insurance_claims TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_authorizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_audit_records TO authenticated;
