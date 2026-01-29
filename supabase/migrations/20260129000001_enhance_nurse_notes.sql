-- Add enhanced nurse notes and patient preparation fields to vital_signs table
-- This migration extends the vital_signs table to support comprehensive patient preparation workflow

ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS consultation_id UUID REFERENCES consultations(id);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles(id);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_pressure_systolic INTEGER;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS blood_pressure_diastolic INTEGER;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10);
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS bmi DECIMAL(4,1);

-- Patient preparation fields
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS chief_complaint TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS current_medications TEXT;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS nurse_notes TEXT;

-- Structured observations (checkboxes)
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS patient_anxious BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS language_barrier BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS family_present BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS requires_assistance BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pain_management_needed BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS mobility_concerns BOOLEAN DEFAULT FALSE;

-- Critical flags
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS mark_critical BOOLEAN DEFAULT FALSE;
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS requires_followup BOOLEAN DEFAULT FALSE;

-- Update existing records to have proper nurse_id reference
UPDATE vital_signs SET nurse_id = recorded_by WHERE nurse_id IS NULL AND recorded_by IS NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vital_signs_consultation ON vital_signs(consultation_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_by ON vital_signs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_vital_signs_mark_critical ON vital_signs(mark_critical) WHERE mark_critical = TRUE;

-- Add RLS policies for the new fields (if not already covered)
-- The existing RLS policies should cover these fields as they extend the vital_signs table