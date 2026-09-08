-- ============================================================================
-- audit_logs.hospital_id integrity (audit DB-004)
-- ============================================================================
-- audit_logs has known schema drift across migrations, so this migration is
-- intentionally defensive and idempotent:
--   1. ensure the column exists,
--   2. backfill NULLs from the acting user's profile,
--   3. index it,
--   4. enforce NOT NULL ONLY if every row has a hospital_id.
-- Pre-authentication / system security events (e.g. login_failure with no user
-- context) may legitimately have no hospital; in that case we keep the column
-- nullable rather than break audit logging (itself a HIPAA control).
-- ============================================================================

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES public.hospitals(id);

-- Backfill from the acting user's profile where derivable.
UPDATE public.audit_logs a
SET hospital_id = p.hospital_id
FROM public.profiles p
WHERE a.hospital_id IS NULL
  AND p.user_id = a.user_id
  AND p.hospital_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_hospital_id
  ON public.audit_logs(hospital_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.audit_logs WHERE hospital_id IS NULL) THEN
    ALTER TABLE public.audit_logs ALTER COLUMN hospital_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'audit_logs.hospital_id left nullable: rows without a derivable hospital remain (e.g. pre-auth/system events).';
  END IF;
END $$;
