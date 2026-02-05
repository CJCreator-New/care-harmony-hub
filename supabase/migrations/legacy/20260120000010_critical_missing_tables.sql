-- Create missing tables referenced in components

-- Security alerts table for intrusion detection
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance metrics table
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

-- Error tracking table
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

-- CPT codes reference table
CREATE TABLE IF NOT EXISTS cpt_codes (
  code TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  base_fee NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOINC codes reference table
CREATE TABLE IF NOT EXISTS loinc_codes (
  code TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  property TEXT,
  system_type TEXT,
  reference_range JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpt_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loinc_codes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Admin can manage security alerts" ON security_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Hospital staff can view performance metrics" ON performance_metrics
  FOR SELECT TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Hospital staff can view error tracking" ON error_tracking
  FOR SELECT TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "All authenticated users can view reference codes" ON cpt_codes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can view LOINC codes" ON loinc_codes
  FOR SELECT TO authenticated
  USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_hospital ON performance_metrics(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_tracking_hospital ON error_tracking(hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpt_codes_category ON cpt_codes(category);

-- Insert some basic CPT codes
INSERT INTO cpt_codes (code, description, category, base_fee) VALUES
('99213', 'Office visit, established patient, level 3', 'Evaluation and Management', 150.00),
('99214', 'Office visit, established patient, level 4', 'Evaluation and Management', 200.00),
('99215', 'Office visit, established patient, level 5', 'Evaluation and Management', 250.00),
('99203', 'Office visit, new patient, level 3', 'Evaluation and Management', 180.00),
('99204', 'Office visit, new patient, level 4', 'Evaluation and Management', 230.00),
('99205', 'Office visit, new patient, level 5', 'Evaluation and Management', 280.00),
('36415', 'Venipuncture', 'Laboratory', 25.00),
('85025', 'Complete blood count', 'Laboratory', 35.00),
('80053', 'Comprehensive metabolic panel', 'Laboratory', 45.00),
('93000', 'Electrocardiogram', 'Diagnostic', 75.00)
ON CONFLICT (code) DO NOTHING;