-- Create doctor_preferences table for storing doctor-specific settings and preferences
-- This table supports personalized workflows, favorite diagnoses, lab panels, and UI preferences

CREATE TABLE IF NOT EXISTS doctor_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  favorite_diagnoses JSONB DEFAULT '[]'::jsonb,
  lab_panels JSONB DEFAULT '[]'::jsonb,
  voice_enabled BOOLEAN DEFAULT false,
  keyboard_shortcuts JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one preference record per doctor
  UNIQUE(doctor_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doctor_preferences_doctor ON doctor_preferences(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_preferences_voice ON doctor_preferences(voice_enabled) WHERE voice_enabled = true;

-- Enable RLS (Row Level Security)
ALTER TABLE doctor_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Doctors can only access their own preferences
CREATE POLICY "Doctors can view their own preferences" ON doctor_preferences
  FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert their own preferences" ON doctor_preferences
  FOR INSERT WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their own preferences" ON doctor_preferences
  FOR UPDATE USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete their own preferences" ON doctor_preferences
  FOR DELETE USING (auth.uid() = doctor_id);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_doctor_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_doctor_preferences_updated_at
  BEFORE UPDATE ON doctor_preferences
  FOR EACH ROW EXECUTE FUNCTION update_doctor_preferences_updated_at();

-- Add comments for documentation
COMMENT ON TABLE doctor_preferences IS 'Stores doctor-specific preferences and settings for personalized workflows';
COMMENT ON COLUMN doctor_preferences.favorite_diagnoses IS 'Array of frequently used ICD-10 diagnosis codes';
COMMENT ON COLUMN doctor_preferences.lab_panels IS 'Array of frequently ordered lab test panels';
COMMENT ON COLUMN doctor_preferences.voice_enabled IS 'Whether voice commands are enabled for this doctor';
COMMENT ON COLUMN doctor_preferences.keyboard_shortcuts IS 'Custom keyboard shortcuts configuration';