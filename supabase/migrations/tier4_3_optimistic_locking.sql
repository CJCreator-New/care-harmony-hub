-- Add optimistic locking to prescriptions table
-- Prevents concurrent edit conflicts via version tracking

-- Add version column for optimistic locking
ALTER TABLE public.prescriptions 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create index for version-based queries
CREATE INDEX IF NOT EXISTS idx_prescriptions_version 
  ON public.prescriptions(version);

-- Add comment explaining versioning strategy
COMMENT ON COLUMN public.prescriptions.version IS 
'Optimistic locking version number. Incremented on each update. 
Prevents concurrent edit conflicts: UPDATE...WHERE id=X AND version=Y. 
If version mismatch, client must re-fetch and reconcile.';

-- Update RLS policies to allow version checking
-- (existing RLS policies already support WHERE clauses with version)

-- Trigger to auto-increment version on updates
-- Note: Supabase doesn't support automatic version increment in the same way as manual
-- Instead, application must increment version explicitly in UPDATE statement:
-- UPDATE prescriptions SET version = version + 1, ... WHERE id = X AND version = Y

-- Create audit function to log version conflicts
CREATE OR REPLACE FUNCTION log_prescription_version_conflict()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    hospital_id,
    action_type,
    entity_type,
    entity_id,
    details,
    severity,
    created_at
  ) VALUES (
    auth.uid(),
    NEW.hospital_id,
    'prescription_version_conflict',
    'prescription',
    NEW.id,
    jsonb_build_object(
      'expected_version', OLD.version,
      'actual_version', NEW.version,
      'timestamp', now()
    ),
    'info',
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure moddatetime trigger updates the updated_at field
-- (This allows the app to detect when prescription was last modified)
CREATE TRIGGER prescriptions_update_timestamp 
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
