-- Patient consent tracking table
CREATE TABLE IF NOT EXISTS patient_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_consent BOOLEAN NOT NULL DEFAULT false,
  data_processing_consent BOOLEAN NOT NULL DEFAULT false,
  telemedicine_consent BOOLEAN DEFAULT false,
  data_sharing_consent BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX idx_patient_consents_consent_date ON patient_consents(consent_date);

-- RLS policies
ALTER TABLE patient_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
  ON patient_consents FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Staff can view patient consents"
  ON patient_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('doctor', 'nurse', 'admin', 'receptionist')
    )
  );

CREATE POLICY "Patients can insert own consents"
  ON patient_consents FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can update own consents"
  ON patient_consents FOR UPDATE
  USING (auth.uid() = patient_id);
