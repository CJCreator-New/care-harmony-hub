-- Add encryption metadata field to patients table for HIPAA compliance
-- This stores encryption keys and metadata for PHI fields

ALTER TABLE patients ADD COLUMN encryption_metadata JSONB;

-- Add comment for documentation
COMMENT ON COLUMN patients.encryption_metadata IS 'Stores encryption metadata for PHI fields (keys, versions, etc.)';

-- Create index for performance (JSONB fields can be indexed)
CREATE INDEX idx_patients_encryption_metadata ON patients USING GIN (encryption_metadata);

-- Update RLS policy to ensure encryption metadata is properly secured
-- (The existing RLS policies should already cover this since it's part of the patients table)