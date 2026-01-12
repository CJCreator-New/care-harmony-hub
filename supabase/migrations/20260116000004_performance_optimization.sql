-- Performance Optimization Migration
-- Phase 1: Week 9-12 Implementation

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  metric_type TEXT CHECK (metric_type IN ('page_load', 'query_time', 'api_response', 'bundle_size', 'memory_usage')) NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  threshold NUMERIC,
  status TEXT CHECK (status IN ('good', 'warning', 'critical')) DEFAULT 'good',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create error tracking table
CREATE TABLE IF NOT EXISTS error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID REFERENCES profiles(user_id),
  url TEXT,
  user_agent TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "hospital_performance_metrics" ON performance_metrics
  FOR ALL TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "hospital_error_tracking" ON error_tracking
  FOR ALL TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Performance optimization function
CREATE OR REPLACE FUNCTION optimize_database_performance()
RETURNS VOID AS $$
BEGIN
  -- Analyze table statistics
  ANALYZE patients;
  ANALYZE appointments;
  ANALYZE consultations;
  ANALYZE task_assignments;
  ANALYZE queue_predictions;
  
  -- Update query planner statistics
  VACUUM ANALYZE;
  
  -- Log optimization
  INSERT INTO performance_metrics (hospital_id, metric_type, metric_name, value, metadata)
  SELECT 
    h.id,
    'query_time',
    'database_optimization',
    EXTRACT(EPOCH FROM NOW()),
    jsonb_build_object('action', 'vacuum_analyze', 'timestamp', NOW())
  FROM hospitals h;
END;
$$ LANGUAGE plpgsql;

-- Query performance monitoring function
CREATE OR REPLACE FUNCTION log_query_performance(
  query_name TEXT,
  execution_time NUMERIC,
  hospital_id_param UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO performance_metrics (
    hospital_id,
    metric_type,
    metric_name,
    value,
    threshold,
    status,
    metadata
  ) VALUES (
    hospital_id_param,
    'query_time',
    query_name,
    execution_time,
    1000, -- 1 second threshold
    CASE 
      WHEN execution_time > 2000 THEN 'critical'
      WHEN execution_time > 1000 THEN 'warning'
      ELSE 'good'
    END,
    jsonb_build_object('execution_time_ms', execution_time, 'timestamp', NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Create optimized indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_hospital_date ON appointments(hospital_id, scheduled_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultations_hospital_status ON consultations(hospital_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_assignments_hospital_status ON task_assignments(hospital_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patients_hospital_mrn ON patients(hospital_id, mrn);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_predictions_hospital_created ON queue_predictions(hospital_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_hospital_type ON performance_metrics(hospital_id, metric_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_error_tracking_hospital_severity ON error_tracking(hospital_id, severity);

-- Performance monitoring view
CREATE OR REPLACE VIEW performance_dashboard AS
SELECT 
  h.name as hospital_name,
  pm.metric_type,
  pm.metric_name,
  AVG(pm.value) as avg_value,
  MAX(pm.value) as max_value,
  MIN(pm.value) as min_value,
  COUNT(*) as measurement_count,
  COUNT(*) FILTER (WHERE pm.status = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE pm.status = 'warning') as warning_count
FROM performance_metrics pm
JOIN hospitals h ON pm.hospital_id = h.id
WHERE pm.created_at > NOW() - INTERVAL '24 hours'
GROUP BY h.name, pm.metric_type, pm.metric_name
ORDER BY critical_count DESC, warning_count DESC;