-- Create patient_consents table for ConsentForm.tsx
CREATE TABLE IF NOT EXISTS patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_consent BOOLEAN DEFAULT FALSE,
  data_processing_consent BOOLEAN DEFAULT FALSE,
  telemedicine_consent BOOLEAN DEFAULT FALSE,
  data_sharing_consent BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ DEFAULT NOW(),
  consented_by UUID REFERENCES profiles(id),
  witness_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hospital_id UUID REFERENCES hospitals(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_hospital ON patient_consents(hospital_id);

-- Enable RLS
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY IF NOT EXISTS "Users can view consents for their hospital"
  ON patient_consents FOR SELECT
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Staff can insert consents"
  ON patient_consents FOR INSERT
  WITH CHECK (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Staff can update consents"
  ON patient_consents FOR UPDATE
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));
