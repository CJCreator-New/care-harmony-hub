-- Migration: AI Security and Encryption Tables
-- Phase 1.1.1.3: HIPAA-compliant data handling for AI services

-- AI Encryption Keys Table
-- Stores encryption keys used for AI data protection
CREATE TABLE IF NOT EXISTS ai_encryption_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_id VARCHAR(255) NOT NULL UNIQUE,
  encrypted_key TEXT NOT NULL, -- Base64 encoded encrypted key
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('diagnosis', 'treatment', 'education', 'research')),
  key_status VARCHAR(20) DEFAULT 'active' CHECK (key_status IN ('active', 'expired', 'revoked')),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- AI Security Audit Table
-- Comprehensive audit trail for all AI operations
CREATE TABLE IF NOT EXISTS ai_security_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id VARCHAR(255) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('diagnosis', 'treatment', 'education', 'research')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  result_summary TEXT,
  compliance_status VARCHAR(20) NOT NULL CHECK (compliance_status IN ('compliant', 'warning', 'violation')),
  data_classification VARCHAR(20) DEFAULT 'phi' CHECK (data_classification IN ('phi', 'non_phi', 'deidentified')),
  encryption_key_id VARCHAR(255), -- References ai_encryption_keys.key_id
  processing_duration_ms INTEGER,
  ai_provider VARCHAR(50), -- openai, anthropic, google
  model_used VARCHAR(100),
  token_count INTEGER,
  cost_estimate DECIMAL(10,4),

  -- Additional audit fields
  ip_address INET,
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  risk_score DECIMAL(3,2), -- 0.00 to 1.00
  anomaly_detected BOOLEAN DEFAULT FALSE,
  anomaly_details JSONB,

  CONSTRAINT fk_encryption_key FOREIGN KEY (encryption_key_id)
    REFERENCES ai_encryption_keys(key_id) ON DELETE SET NULL
);

-- AI Data Flow Tracking Table
-- Tracks data movement through AI processing pipeline
CREATE TABLE IF NOT EXISTS ai_data_flow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  data_flow_id VARCHAR(255) NOT NULL UNIQUE, -- De-identified tracking ID
  original_patient_id UUID, -- Encrypted/hashed reference only
  deidentified_patient_id VARCHAR(255) NOT NULL,

  -- Data flow stages
  stage VARCHAR(50) NOT NULL CHECK (stage IN (
    'data_ingestion', 'sanitization', 'encryption', 'ai_processing',
    'decryption', 'response_processing', 'storage', 'cleanup'
  )),
  stage_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stage_status VARCHAR(20) DEFAULT 'completed' CHECK (stage_status IN ('pending', 'processing', 'completed', 'failed')),

  -- Data characteristics (for audit, not content)
  data_size_bytes INTEGER,
  data_fields_count INTEGER,
  phi_detected BOOLEAN DEFAULT FALSE,
  sanitization_applied BOOLEAN DEFAULT TRUE,

  -- Processing metadata
  processing_duration_ms INTEGER,
  ai_provider VARCHAR(50),
  model_used VARCHAR(100),
  token_count INTEGER,

  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(100),

  -- Audit trail
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Compliance Policies Table
-- Hospital-specific AI usage policies and rules
CREATE TABLE IF NOT EXISTS ai_compliance_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  policy_name VARCHAR(255) NOT NULL,
  policy_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN (
    'data_retention', 'access_control', 'usage_limitation',
    'audit_requirements', 'encryption_standards'
  )),

  -- Policy configuration
  policy_config JSONB NOT NULL, -- Flexible configuration storage
  is_active BOOLEAN DEFAULT TRUE,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_until TIMESTAMP WITH TIME ZONE,

  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(hospital_id, policy_name, policy_version)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_encryption_keys_hospital ON ai_encryption_keys(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_encryption_keys_expires ON ai_encryption_keys(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_encryption_keys_status ON ai_encryption_keys(key_status);

CREATE INDEX IF NOT EXISTS idx_ai_security_audit_hospital ON ai_security_audit(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_user ON ai_security_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_timestamp ON ai_security_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_compliance ON ai_security_audit(compliance_status);
CREATE INDEX IF NOT EXISTS idx_ai_security_audit_session ON ai_security_audit(session_id);

CREATE INDEX IF NOT EXISTS idx_ai_data_flow_hospital ON ai_data_flow(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_data_flow_session ON ai_data_flow(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_data_flow_stage ON ai_data_flow(stage, stage_status);
CREATE INDEX IF NOT EXISTS idx_ai_data_flow_patient ON ai_data_flow(deidentified_patient_id);

CREATE INDEX IF NOT EXISTS idx_ai_compliance_policies_hospital ON ai_compliance_policies(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_policies_active ON ai_compliance_policies(hospital_id, is_active);

-- Row Level Security Policies

-- AI Encryption Keys
ALTER TABLE ai_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_encryption_keys_hospital_access" ON ai_encryption_keys
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_encryption_keys_system_access" ON ai_encryption_keys
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- AI Security Audit
ALTER TABLE ai_security_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_security_audit_hospital_access" ON ai_security_audit
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "ai_security_audit_insert" ON ai_security_audit
  FOR INSERT WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    ) AND user_id = auth.uid()
  );

-- AI Data Flow
ALTER TABLE ai_data_flow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_data_flow_hospital_access" ON ai_data_flow
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

-- AI Compliance Policies
ALTER TABLE ai_compliance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_compliance_policies_hospital_access" ON ai_compliance_policies
  FOR ALL USING (
    hospital_id IN (
      SELECT hospital_id FROM user_hospital_roles
      WHERE user_id = auth.uid()
    )
  );

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_data_flow_updated_at
  BEFORE UPDATE ON ai_data_flow
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_compliance_policies_updated_at
  BEFORE UPDATE ON ai_compliance_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ai_encryption_keys IS 'Stores encryption keys for AI data protection with HIPAA compliance';
COMMENT ON TABLE ai_security_audit IS 'Comprehensive audit trail for all AI operations and compliance monitoring';
COMMENT ON TABLE ai_data_flow IS 'Tracks data movement through AI processing pipeline for audit purposes';
COMMENT ON TABLE ai_compliance_policies IS 'Hospital-specific AI usage policies and compliance rules';

-- Insert default compliance policies for all hospitals
INSERT INTO ai_compliance_policies (
  hospital_id,
  policy_name,
  policy_type,
  policy_config,
  created_by
)
SELECT
  h.id as hospital_id,
  'default_data_retention' as policy_name,
  'data_retention' as policy_type,
  '{
    "maxRetentionDays": 90,
    "autoDeletion": true,
    "auditRetention": 2555,
    "phiRetention": 90
  }'::jsonb as policy_config,
  h.admin_user_id as created_by
FROM hospitals h
WHERE NOT EXISTS (
  SELECT 1 FROM ai_compliance_policies
  WHERE hospital_id = h.id AND policy_name = 'default_data_retention'
);

INSERT INTO ai_compliance_policies (
  hospital_id,
  policy_name,
  policy_type,
  policy_config,
  created_by
)
SELECT
  h.id as hospital_id,
  'default_access_control' as policy_name,
  'access_control' as policy_type,
  '{
    "requireMFA": true,
    "maxSessionDuration": 480,
    "allowedRoles": ["admin", "doctor"],
    "auditAllAccess": true
  }'::jsonb as policy_config,
  h.admin_user_id as created_by
FROM hospitals h
WHERE NOT EXISTS (
  SELECT 1 FROM ai_compliance_policies
  WHERE hospital_id = h.id AND policy_name = 'default_access_control'
);

INSERT INTO ai_compliance_policies (
  hospital_id,
  policy_name,
  policy_type,
  policy_config,
  created_by
)
SELECT
  h.id as hospital_id,
  'default_usage_limitation' as policy_name,
  'usage_limitation' as policy_type,
  '{
    "allowedPurposes": ["diagnosis", "treatment", "education"],
    "maxRequestsPerHour": 100,
    "maxTokensPerRequest": 4000,
    "requireApproval": false
  }'::jsonb as policy_config,
  h.admin_user_id as created_by
FROM hospitals h
WHERE NOT EXISTS (
  SELECT 1 FROM ai_compliance_policies
  WHERE hospital_id = h.id AND policy_name = 'default_usage_limitation'
);