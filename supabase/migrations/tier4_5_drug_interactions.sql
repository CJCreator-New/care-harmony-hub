-- Tier 4.5: Drug Interactions Database Schema
-- Purpose: Store drug-drug interactions and DUR (Drug Utilization Review) records
-- Clinical Safety: Prevent contraindicated medication combinations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Drug Interaction Definitions Table
-- Stores potential interactions between drugs with severity levels
CREATE TABLE IF NOT EXISTS public.drug_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  
  -- Drug 1 identifier (RxNorm RxCUI - standardized drug identifier)
  drug1_rxcui VARCHAR(10) NOT NULL,
  drug1_name TEXT NOT NULL,
  
  -- Drug 2 identifier
  drug2_rxcui VARCHAR(10) NOT NULL,
  drug2_name TEXT NOT NULL,
  
  -- Interaction severity levels
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (
    severity IN ('contraindicated', 'serious', 'moderate', 'minor')
  ),
  
  -- Clinical details
  description TEXT NOT NULL,
  clinical_recommendation TEXT,
  mechanism TEXT, -- e.g. "increased risk of bleeding", "enzyme inhibition"
  evidence_level TEXT CHECK (
    evidence_level IN ('established', 'probable', 'suspected', 'theoretical')
  ) DEFAULT 'established',
  
  -- Drug-specific exclusions (e.g. interaction doesn't apply to topical formulation)
  excludes_routes TEXT[], -- e.g. ['topical', 'inhaled']
  excludes_formulations TEXT[], -- e.g. ['suppository']
  
  -- Age-based rules (e.g. tetracyclines not for age < 8 years)
  age_ranges JSONB, -- { "min_age_months": 0, "max_age_months": 96, "reason": "permanent tooth staining risk" }
  
  -- Pregnancy/lactation
  contraindicated_in_pregnancy BOOLEAN DEFAULT FALSE,
  contraindicated_in_lactation BOOLEAN DEFAULT FALSE,
  pregnancy_note TEXT,
  
  -- Source & versioning
  source TEXT NOT NULL DEFAULT 'local' CHECK (
    source IN ('rxnorm', 'local', 'hl7-fhir', 'fda-alert', 'custom-protocol')
  ),
  external_id TEXT, -- References external DB (e.g., RxNorm interaction ID)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Drug Interaction Cache Table
-- Caches results of DDI checks to reduce RxNorm API calls (30-day TTL)
CREATE TABLE IF NOT EXISTS public.drug_interaction_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  
  -- Query parameters
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  new_drug_rxcui VARCHAR(10) NOT NULL,
  new_drug_name TEXT NOT NULL,
  
  -- Result summary
  interactions_found INTEGER DEFAULT 0,
  severity_max TEXT CHECK (
    severity_max IN ('contraindicated', 'serious', 'moderate', 'minor', 'none')
  ) DEFAULT 'none',
  
  -- Detailed results
  details JSONB, -- { interactions: [ { rxcui, drugName, severity, recommendation } ] }
  
  -- Cache control
  checked_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  
  -- Audit
  checked_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Prescription DUR (Drug Utilization Review) Records
-- Tracks all medication review checks performed by pharmacists
CREATE TABLE IF NOT EXISTS public.prescription_dur_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  
  -- References
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  
  -- Pharmacist review
  reviewed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  
  -- Overall status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'cleared', 'flagged', 'denied', 'approved_with_conditions')
  ),
  
  -- Drug-Drug Interaction Check
  ddi_checked BOOLEAN DEFAULT FALSE,
  ddi_severity TEXT CHECK (
    ddi_severity IN ('contraindicated', 'serious', 'moderate', 'minor', 'none')
  ) DEFAULT 'none',
  ddi_details JSONB, -- { interactions: [ { drugName, severity, recommendation } ] }
  
  -- Drug-Allergy Check
  allergy_checked BOOLEAN DEFAULT FALSE,
  allergy_conflicts TEXT[], -- List of conflicting allergens
  
  -- Age-Appropriateness Check
  age_checked BOOLEAN DEFAULT FALSE,
  age_appropriate BOOLEAN,
  age_note TEXT,
  
  -- Pregnancy Check
  pregnancy_checked BOOLEAN DEFAULT FALSE,
  pregnancy_safe BOOLEAN,
  pregnancy_note TEXT,
  
  -- Renal Dosage Adjustment Check
  renal_checked BOOLEAN DEFAULT FALSE,
  patient_egfr NUMERIC(6,1), -- Estimated Glomerular Filtration Rate
  renal_dosage_ok BOOLEAN,
  renal_note TEXT,
  
  -- Hepatic Dosage Adjustment Check
  hepatic_checked BOOLEAN DEFAULT FALSE,
  patient_child_pugh_score TEXT, -- 'A', 'B', 'C'
  hepatic_dosage_ok BOOLEAN,
  hepatic_note TEXT,
  
  -- Pharmacist notes and recommendations
  pharmacist_notes TEXT,
  pharmacist_recommendation TEXT,
  
  -- Doctor Override (for serious/contraindicated interactions)
  requires_doctor_approval BOOLEAN DEFAULT FALSE,
  doctor_approval_status TEXT CHECK (
    doctor_approval_status IN ('pending', 'approved', 'denied', NULL)
  ),
  doctor_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  doctor_approval_at TIMESTAMPTZ,
  doctor_approval_note TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Drug Interactions: Lookups by drug pair
CREATE INDEX IF NOT EXISTS idx_drug_interactions_rxcui_pair 
  ON public.drug_interactions(drug1_rxcui, drug2_rxcui);

CREATE INDEX IF NOT EXISTS idx_drug_interactions_hospital 
  ON public.drug_interactions(hospital_id);

-- Reverse index (check both directions of interaction)
CREATE INDEX IF NOT EXISTS idx_drug_interactions_reverse 
  ON public.drug_interactions(drug2_rxcui, drug1_rxcui);

-- Drug Interaction Cache: Lookups by patient + drug
CREATE INDEX IF NOT EXISTS idx_drug_interaction_cache_patient_drug 
  ON public.drug_interaction_cache(patient_id, new_drug_rxcui);

CREATE INDEX IF NOT EXISTS idx_drug_interaction_cache_hospital 
  ON public.drug_interaction_cache(hospital_id);

-- Cache expiration index (cleanup task)
CREATE INDEX IF NOT EXISTS idx_drug_interaction_cache_expires 
  ON public.drug_interaction_cache(expires_at) 
  WHERE expires_at < now();

-- DUR Reviews: Lookups by prescription + status
CREATE INDEX IF NOT EXISTS idx_prescription_dur_reviews_rx_id 
  ON public.prescription_dur_reviews(prescription_id);

CREATE INDEX IF NOT EXISTS idx_prescription_dur_reviews_patient 
  ON public.prescription_dur_reviews(patient_id);

CREATE INDEX IF NOT EXISTS idx_prescription_dur_reviews_status 
  ON public.prescription_dur_reviews(status);

CREATE INDEX IF NOT EXISTS idx_prescription_dur_reviews_hospital 
  ON public.prescription_dur_reviews(hospital_id);

-- Find pending approvals
CREATE INDEX IF NOT EXISTS idx_prescription_dur_reviews_pending 
  ON public.prescription_dur_reviews(hospital_id, status)
  WHERE status IN ('pending', 'flagged', 'approved_with_conditions');

-- ============================================================================
-- ROW LEVEL SECURITY (HIPAA Multi-Tenant Isolation)
-- ============================================================================

ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interaction_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_dur_reviews ENABLE ROW LEVEL SECURITY;

-- Drug Interactions: Hospital-scoped read/write
CREATE POLICY drug_interactions_hospital_scope 
  ON public.drug_interactions 
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid()));

-- Drug Interaction Cache: Hospital-scoped
CREATE POLICY drug_interaction_cache_hospital_scope 
  ON public.drug_interaction_cache 
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid()));

-- DUR Reviews: Hospital-scoped
CREATE POLICY prescription_dur_reviews_hospital_scope 
  ON public.prescription_dur_reviews 
  USING (hospital_id = (SELECT hospital_id FROM public.profiles WHERE id = auth.uid()));

-- ============================================================================
-- AUTO-UPDATE TRIGGERS
-- ============================================================================

-- Update timestamps on table modifications
CREATE OR REPLACE FUNCTION public.trigger_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER drug_interactions_updated_at
  BEFORE UPDATE ON public.drug_interactions
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER drug_interaction_cache_updated_at
  BEFORE UPDATE ON public.drug_interaction_cache
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION public.trigger_updated_at();

CREATE TRIGGER prescription_dur_reviews_updated_at
  BEFORE UPDATE ON public.prescription_dur_reviews
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION public.trigger_updated_at();

-- ============================================================================
-- AUDIT LOGGING TRIGGER
-- ============================================================================

-- Log all DUR review status changes for compliance
CREATE OR REPLACE FUNCTION public.log_dur_review_changes()
  RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status OR 
     NEW.doctor_approval_status IS DISTINCT FROM OLD.doctor_approval_status THEN
    INSERT INTO public.audit_logs (
      action_type,
      resource_type,
      resource_id,
      performed_by,
      hospital_id,
      details
    ) VALUES (
      'dur_review_' || NEW.status,
      'prescription_dur_review',
      NEW.id,
      NEW.reviewed_by,
      NEW.hospital_id,
      jsonb_build_object(
        'prescription_id', NEW.prescription_id,
        'patient_id', NEW.patient_id,
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'severity_issues', NEW.ddi_severity,
        'requires_approval', NEW.requires_doctor_approval
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER prescription_dur_reviews_audit
  AFTER INSERT OR UPDATE ON public.prescription_dur_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.log_dur_review_changes();

-- ============================================================================
-- SEED COMMON DRUG INTERACTIONS (Optional)
-- ============================================================================

-- Note: In production, these would be populated from RxNorm or pharmacy protocols
-- For now, we seed a few common, high-risk interactions

INSERT INTO public.drug_interactions (
  hospital_id,
  drug1_rxcui,
  drug1_name,
  drug2_rxcui,
  drug2_name,
  severity,
  description,
  clinical_recommendation,
  mechanism,
  evidence_level,
  source
) SELECT
  h.id,
  '4324', 'Warfarin',
  '7052', 'Ibuprofen',
  'serious',
  'Concurrent use may increase anticoagulant effect and risk of bleeding',
  'Avoid NSAIDs with warfarin. Use acetaminophen instead. Monitor INR closely.',
  'NSAIDs inhibit platelet function and may displace warfarin from protein binding',
  'established',
  'rxnorm'
FROM public.hospitals h
ON CONFLICT DO NOTHING;

INSERT INTO public.drug_interactions (
  hospital_id,
  drug1_rxcui,
  drug1_name,
  drug2_rxcui,
  drug2_name,
  severity,
  description,
  clinical_recommendation,
  mechanism,
  evidence_level,
  source,
  age_ranges
) SELECT
  h.id,
  '10582', 'Tetracycline',
  NULL,
  'Child <8 years',
  'contraindicated',
  'Tetracyclines cause permanent discoloration of developing teeth',
  'Do not use in children <8 years. Use alternative antibiotic class.',
  'Tetracyclines form stable complexes with calcium in calcifying teeth',
  'established',
  'local',
  jsonb_build_object('min_age_months', 0, 'max_age_months', 96)
FROM public.hospitals h
ON CONFLICT DO NOTHING;

INSERT INTO public.drug_interactions (
  hospital_id,
  drug1_rxcui,
  drug1_name,
  drug2_rxcui,
  drug2_name,
  severity,
  description,
  clinical_recommendation,
  mechanism,
  evidence_level,
  source
) SELECT
  h.id,
  '18827', 'Metformin',
  '16681', 'Iodinated Contrast',
  'serious',
  'Risk of contrast-induced nephropathy with metformin continuation',
  'Hold metformin 48 hours after contrast administration. Monitor renal function.',
  'Contrast may impair renal function; metformin accumulation → lactic acidosis',
  'established',
  'rxnorm'
FROM public.hospitals h
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.drug_interactions IS
  'Stores known drug-drug interactions with severity, clinical details, and evidence';

COMMENT ON COLUMN public.drug_interactions.drug1_rxcui IS
  'RxNorm unique concept ID for first drug. IMPORTANT: https://rxnav.nlm.nih.gov/';

COMMENT ON COLUMN public.drug_interactions.severity IS
  'Contraindicated = Never give together. Serious = Doctor approval needed. Moderate/Minor = Caution/Monitor';

COMMENT ON TABLE public.drug_interaction_cache IS
  'Caches DDI check results (30-day TTL) to reduce RxNorm API calls';

COMMENT ON TABLE public.prescription_dur_reviews IS
  'Audit trail of pharmacist medication reviews and doctor approvals. HIPAA compliance required.';

COMMENT ON COLUMN public.prescription_dur_reviews.ddi_severity IS
  'Highest severity interaction found. NULL means no DDI check performed or no interactions.';
