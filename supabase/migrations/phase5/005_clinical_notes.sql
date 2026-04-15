-- Phase 5 Feature 5: Clinical Notes Workflows
-- Migration 005: Clinical Notes, Versions, Signatures

-- Create clinical_notes table
CREATE TABLE IF NOT EXISTS public.clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  
  -- Author info
  doctor_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Note content (stored in latest version)
  title TEXT,
  content_html TEXT,
  content_plain_text TEXT,
  
  -- Clinical categories
  note_type TEXT CHECK (note_type IN ('progress', 'consultation', 'procedure', 'discharge', 'follow_up')),
  chief_complaint TEXT,
  findings TEXT,
  assessment TEXT,
  plan TEXT,
  
  -- Medication info
  medications_prescribed JSONB DEFAULT '[]'::jsonb,
  
  -- Vitals captured in note
  vitals_recorded JSONB DEFAULT '{}'::jsonb,
  
  -- Status and signing
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'signed', 'archived')),
  is_signed BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by UUID REFERENCES public.profiles(id),
  
  -- Digital signature details
  signature_data JSONB, -- Contains: {algorithm, timestamp, certificate_id, public_key_id}
  signature_valid BOOLEAN DEFAULT TRUE,
  signature_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Immutability: prevent direct updates after signing
  is_immutable BOOLEAN DEFAULT FALSE,
  
  -- Current version reference
  latest_version_id UUID,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_clinical_notes_hospital ON public.clinical_notes(hospital_id);
CREATE INDEX idx_clinical_notes_appointment ON public.clinical_notes(appointment_id);
CREATE INDEX idx_clinical_notes_patient ON public.clinical_notes(patient_id);
CREATE INDEX idx_clinical_notes_doctor ON public.clinical_notes(doctor_id);
CREATE INDEX idx_clinical_notes_status ON public.clinical_notes(status);
CREATE INDEX idx_clinical_notes_signed ON public.clinical_notes(is_signed);

-- RLS Policies
CREATE POLICY "Doctor and approved staff can view clinical notes"
  ON public.clinical_notes
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
    OR doctor_id = auth.uid()
    OR (patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) AND is_signed = TRUE)
  );

CREATE POLICY "Doctor can create clinical notes"
  ON public.clinical_notes
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('doctor', 'nurse', 'admin')
    )
  );

CREATE POLICY "Doctor can update own draft notes"
  ON public.clinical_notes
  FOR UPDATE
  USING (
    (doctor_id = auth.uid() OR created_by = auth.uid())
    AND status = 'draft'
    AND is_immutable = FALSE
  )
  WITH CHECK (
    (doctor_id = auth.uid() OR created_by = auth.uid())
    AND status IN ('draft', 'pending_review')
    AND is_immutable = FALSE
  );

-- Create clinical_note_versions table (audit trail)
CREATE TABLE IF NOT EXISTS public.clinical_note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  clinical_note_id UUID NOT NULL REFERENCES public.clinical_notes(id) ON DELETE CASCADE,
  
  -- Version info
  version_number INTEGER NOT NULL,
  change_reason TEXT,
  
  -- Snapshot of note state
  content_html TEXT,
  content_plain_text TEXT,
  note_type TEXT,
  chief_complaint TEXT,
  findings TEXT,
  assessment TEXT,
  plan TEXT,
  
  -- Medications at this version
  medications_prescribed JSONB DEFAULT '[]'::jsonb,
  
  -- Vitals at this version
  vitals_recorded JSONB DEFAULT '{}'::jsonb,
  
  -- Status at this version
  status_at_version TEXT,
  
  -- Changed by
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Diff from previous version
  diff_from_previous JSONB,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_note_versions ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_note_versions_note ON public.clinical_note_versions(clinical_note_id);
CREATE INDEX idx_note_versions_hospital ON public.clinical_note_versions(hospital_id);
CREATE INDEX idx_note_versions_changed_by ON public.clinical_note_versions(changed_by);

-- RLS Policies
CREATE POLICY "Staff can view note versions"
  ON public.clinical_note_versions
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

-- Create clinical_note_signatures table
CREATE TABLE IF NOT EXISTS public.clinical_note_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  clinical_note_id UUID NOT NULL REFERENCES public.clinical_notes(id) ON DELETE CASCADE,
  
  -- Signatory info
  signed_by UUID NOT NULL REFERENCES public.profiles(id),
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Signature algorithm
  signature_algorithm TEXT NOT NULL DEFAULT 'SHA256RSA',
  signature_certificate_id TEXT,
  signature_public_key_id TEXT,
  
  -- Actual signature (encrypted)
  signature_data TEXT NOT NULL,
  signature_valid BOOLEAN DEFAULT TRUE,
  validation_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Immutability timestamp
  immutable_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_note_signatures ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_signatures_note ON public.clinical_note_signatures(clinical_note_id);
CREATE INDEX idx_signatures_signed_by ON public.clinical_note_signatures(signed_by);

-- RLS Policies
CREATE POLICY "Staff can view signatures"
  ON public.clinical_note_signatures
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

-- Create clinical_note_observations table (nurse observations)
CREATE TABLE IF NOT EXISTS public.clinical_note_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  clinical_note_id UUID NOT NULL REFERENCES public.clinical_notes(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id),
  
  -- Observer (nurse)
  observed_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Observation content
  observation_text TEXT NOT NULL,
  observation_category TEXT CHECK (observation_category IN ('vital_sign', 'patient_behavior', 'pain_level', 'medication_reaction', 'comfort', 'other')),
  
  -- Timestamp of observation
  observed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Immutability (append-only)
  is_locked BOOLEAN DEFAULT TRUE,
  
  -- Audit fields
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_note_observations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_observations_note ON public.clinical_note_observations(clinical_note_id);
CREATE INDEX idx_observations_appointment ON public.clinical_note_observations(appointment_id);
CREATE INDEX idx_observations_observed_by ON public.clinical_note_observations(observed_by);

-- RLS Policies
CREATE POLICY "Staff can view observations"
  ON public.clinical_note_observations
  FOR SELECT
  USING (
    hospital_id IN (SELECT hospital_id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "Nurses can add observations"
  ON public.clinical_note_observations
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.staff
      WHERE user_id = auth.uid() AND role IN ('nurse', 'doctor', 'admin')
    )
  );

-- Create immutability enforcement function
CREATE OR REPLACE FUNCTION public.prevent_clinical_note_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_immutable = TRUE AND (
    OLD.content_html IS DISTINCT FROM NEW.content_html OR
    OLD.findings IS DISTINCT FROM NEW.findings OR
    OLD.assessment IS DISTINCT FROM NEW.assessment OR
    OLD.plan IS DISTINCT FROM NEW.plan
  ) THEN
    RAISE EXCEPTION 'Signed clinical note is immutable and cannot be modified';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_prevent_note_modification
BEFORE UPDATE ON public.clinical_notes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_clinical_note_modification();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinical_notes TO authenticated;
GRANT SELECT, INSERT ON public.clinical_note_versions TO authenticated;
GRANT SELECT, INSERT ON public.clinical_note_signatures TO authenticated;
GRANT SELECT, INSERT ON public.clinical_note_observations TO authenticated;
