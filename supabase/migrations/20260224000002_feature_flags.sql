-- T-87: Feature flag table for per-hospital v2 code-path rollout.
-- Each row controls one named flag for one hospital.
-- Absence of a row means flag = FALSE (safe default: legacy path).

CREATE TABLE IF NOT EXISTS feature_flags (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id   uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  flag_name     text NOT NULL,
  enabled       boolean NOT NULL DEFAULT false,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, flag_name)
);

-- Index for fast per-hospital lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_hospital
  ON feature_flags (hospital_id, flag_name);

-- RLS: staff can read their own hospital flags; only admins can write.
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can read their hospital flags"
  ON feature_flags FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage feature flags"
  ON feature_flags FOR ALL
  USING (
    hospital_id IN (
      SELECT p.hospital_id FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.id
      JOIN roles r ON r.id = ur.role_id
      WHERE p.user_id = auth.uid() AND r.name = 'admin'
    )
  );

-- Seed the six v2 rollout flags for existing hospitals (all disabled by default)
INSERT INTO feature_flags (hospital_id, flag_name, enabled)
SELECT id, flag, false
FROM hospitals
CROSS JOIN (VALUES
  ('doctor_flow_v2'),
  ('lab_flow_v2'),
  ('nurse_flow_v2'),
  ('pharmacy_flow_v2'),
  ('reception_flow_v2'),
  ('patient_portal_v2')
) AS flags(flag)
ON CONFLICT (hospital_id, flag_name) DO NOTHING;
