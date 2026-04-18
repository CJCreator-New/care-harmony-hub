-- Tier 3.2: AI Gateway Usage Metrics Table
-- Migration file for tracking Lovable AI usage and costs

CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  
  -- AI Gateway Metrics
  ai_calls_count INTEGER DEFAULT 0,
  ai_tokens_used INTEGER DEFAULT 0,
  ai_cost_estimate DECIMAL(10, 4) DEFAULT 0.00,
  ai_model VARCHAR(100),
  ai_feature VARCHAR(100),
  
  -- Performance Metrics
  response_time_ms INTEGER,
  memory_usage_mb DECIMAL(10, 2),
  
  -- Timestamps
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  notes TEXT,
  
  -- Indexes
  CONSTRAINT fk_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX idx_system_metrics_hospital_measured ON system_metrics(hospital_id, measured_at DESC);
CREATE INDEX idx_system_metrics_ai_calls ON system_metrics(hospital_id, ai_calls_count DESC) WHERE ai_calls_count > 0;
CREATE INDEX idx_system_metrics_cost ON system_metrics(hospital_id, ai_cost_estimate DESC) WHERE ai_cost_estimate > 0;

-- Enable RLS
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin-only read access per hospital
CREATE POLICY "Admins can view hospital metrics" ON system_metrics
  FOR SELECT USING (
    hospital_id = (SELECT hospital_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND hospital_id = system_metrics.hospital_id 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert metrics" ON system_metrics
  FOR INSERT WITH CHECK (
    hospital_id = (SELECT hospital_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1)
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND hospital_id = system_metrics.hospital_id 
      AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON system_metrics TO postgres, service_role;

-- Add comment
COMMENT ON TABLE system_metrics IS 'Tracks system health metrics including AI usage, costs, and performance indicators - Tier 3.2 Observability';
