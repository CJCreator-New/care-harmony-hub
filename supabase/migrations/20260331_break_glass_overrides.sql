-- Migration: Create break_glass_overrides table
-- Phase 4: Emergency override patterns with mandatory reason capture

BEGIN;

CREATE TABLE public.break_glass_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  triggered_by_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
  approved_by_role TEXT NOT NULL CHECK (approved_by_role IN ('emergency_physician', 'icu_nurse', 'head_pharmacist', 'admin')),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  override_type TEXT NOT NULL CHECK (override_type IN (
    'emergency_medication_dispense',
    'critical_discharge',
    'lab_override_critical_value',
    'system_unavailable_workaround',
    'clinical_judgment_override'
  )),
  emergency_level TEXT NOT NULL CHECK (emergency_level IN ('critical', 'urgent', 'time_sensitive')),
  reason_sanitized TEXT NOT NULL, -- PHI-stripped reason for audit trail
  reason_hash TEXT NOT NULL,      -- SHA-256 for integrity verification
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  escalated_to_admin BOOLEAN DEFAULT FALSE,
  escalation_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX idx_break_glass_hospital_status ON public.break_glass_overrides(hospital_id, status);
CREATE INDEX idx_break_glass_patient_active ON public.break_glass_overrides(patient_id) WHERE status = 'active';
CREATE INDEX idx_break_glass_expires ON public.break_glass_overrides(expires_at) WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE public.break_glass_overrides ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see break-glass overrides for their hospital
CREATE POLICY "break_glass_hospital_scope" ON public.break_glass_overrides
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));

-- Policy: Only emergency roles can view/create overrides
CREATE POLICY "break_glass_role_restriction" ON public.break_glass_overrides
  USING (
    (SELECT role FROM user_roles WHERE user_id = auth.uid() AND hospital_id = break_glass_overrides.hospital_id)
    IN ('emergency_physician', 'icu_nurse', 'head_pharmacist', 'admin')
  );

-- Trigger to auto-expire old overrides (run hourly)
CREATE OR REPLACE FUNCTION public.expire_break_glass_overrides()
RETURNS void AS $$
BEGIN
  UPDATE public.break_glass_overrides
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at trigger using moddatetime
CREATE TRIGGER break_glass_updated_at BEFORE UPDATE ON public.break_glass_overrides
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

COMMIT;
