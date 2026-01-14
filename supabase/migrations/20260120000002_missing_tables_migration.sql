-- Missing Tables Migration
-- Create performance_metrics, error_tracking, and cpt_codes tables

-- Performance Monitoring Tables
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC,
  status TEXT DEFAULT 'good',
  metadata JSONB DEFAULT '{}',
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  url TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  user_id UUID,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CPT Reference Table
CREATE TABLE IF NOT EXISTS cpt_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  base_fee NUMERIC(10,2) DEFAULT 0,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Hospital scoped performance metrics"
ON performance_metrics FOR ALL
TO authenticated
USING (hospital_id IN (
  SELECT hospital_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Hospital scoped error tracking"
ON error_tracking FOR ALL
TO authenticated
USING (hospital_id IN (
  SELECT hospital_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Hospital scoped CPT codes"
ON cpt_codes FOR ALL
TO authenticated
USING (hospital_id IN (
  SELECT hospital_id FROM profiles WHERE id = auth.uid()
));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_hospital_created
ON performance_metrics(hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_tracking_hospital_created
ON error_tracking(hospital_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cpt_codes_category
ON cpt_codes(category);