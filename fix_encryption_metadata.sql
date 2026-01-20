-- Fix: Add missing encryption_metadata column to patients table
-- This resolves the PGRST204 error when registering patients

-- Add the encryption_metadata column to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS encryption_metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN patients.encryption_metadata IS 'Stores encryption metadata for PHI fields (keys, versions, etc.)';

-- Create index for performance (JSONB fields can be indexed)
CREATE INDEX IF NOT EXISTS idx_patients_encryption_metadata ON patients USING GIN (encryption_metadata);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patients' AND column_name = 'encryption_metadata';