-- Consolidated migration group: monitoring_ops
-- Generated: 2026-02-04 18:14:27
-- Source migrations: 3

-- ============================================
-- Migration: 20241220000003_monitoring_system.sql
-- ============================================

-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  status TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  condition TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES alert_rules(id),
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_alerts_timestamp ON system_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);

-- Insert default alert rules
INSERT INTO alert_rules (name, condition, threshold, severity) VALUES
('High Response Time', 'response_time_ms', 1000, 'medium'),
('Memory Usage Critical', 'memory_usage_mb', 512, 'high'),
('Database Connection Failure', 'database_errors', 5, 'critical'),
('Auth Service Degraded', 'auth_errors', 10, 'medium')
ON CONFLICT DO NOTHING;


-- ============================================
-- Migration: 20241220000004_backup_recovery.sql
-- ============================================

-- Create backup jobs table
CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental', 'critical')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  tables TEXT[] NOT NULL,
  size_mb INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

-- Create backup schedules table
CREATE TABLE IF NOT EXISTS backup_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('full', 'incremental', 'critical')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  enabled BOOLEAN DEFAULT true,
  next_run TIMESTAMPTZ NOT NULL,
  last_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create disaster recovery log table
CREATE TABLE IF NOT EXISTS disaster_recovery_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('backup_created', 'backup_failed', 'restore_started', 'restore_completed', 'restore_failed')),
  backup_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public) 
VALUES ('backups', 'backups', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for backups (admin only)
CREATE POLICY "Admin can manage backups" ON storage.objects
FOR ALL USING (
  bucket_id = 'backups' AND 
  auth.jwt() ->> 'role' = 'admin'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created_at ON backup_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run ON backup_schedules(next_run) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_log_timestamp ON disaster_recovery_log(timestamp DESC);

-- Insert default backup schedule
INSERT INTO backup_schedules (type, frequency, next_run) VALUES
('critical', 'daily', NOW() + INTERVAL '1 day'),
('full', 'weekly', NOW() + INTERVAL '7 days')
ON CONFLICT DO NOTHING;


-- ============================================
-- Migration: 20260116000005_real_time_monitoring.sql
-- ============================================

-- Real-time Monitoring System Migration
-- Phase 1: Admin Real-time Monitoring Dashboard

-- Create system_metrics table for storing performance metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service VARCHAR(100) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  value NUMERIC NOT NULL,
  status VARCHAR(20) CHECK (status IN ('healthy', 'warning', 'critical')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX idx_system_metrics_service ON system_metrics(service);
CREATE INDEX idx_system_metrics_metric_name ON system_metrics(metric_name);

-- Create alert_rules table for configurable alerting
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  condition VARCHAR(20) CHECK (condition IN ('greater_than', 'less_than', 'equals', 'not_equals')),
  threshold NUMERIC NOT NULL,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN DEFAULT true,
  notification_channels TEXT[] DEFAULT ARRAY['in_app'],
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff_productivity_metrics table
CREATE TABLE IF NOT EXISTS staff_productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patients_seen INTEGER DEFAULT 0,
  avg_consultation_time INTEGER, -- in minutes
  tasks_completed INTEGER DEFAULT 0,
  response_time_avg INTEGER, -- in minutes
  performance_score NUMERIC(3,2),
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_productivity_staff_id ON staff_productivity_metrics(staff_id);
CREATE INDEX idx_staff_productivity_timestamp ON staff_productivity_metrics(timestamp DESC);

-- Create patient_flow_metrics table
CREATE TABLE IF NOT EXISTS patient_flow_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  waiting_patients INTEGER DEFAULT 0,
  in_consultation INTEGER DEFAULT 0,
  completed_today INTEGER DEFAULT 0,
  avg_wait_time INTEGER, -- in minutes
  bottlenecks JSONB,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patient_flow_timestamp ON patient_flow_metrics(timestamp DESC);
CREATE INDEX idx_patient_flow_hospital ON patient_flow_metrics(hospital_id);

-- Function to collect system metrics
CREATE OR REPLACE FUNCTION collect_system_metrics()
RETURNS void AS $$
BEGIN
  -- Collect database performance metrics
  INSERT INTO system_metrics (service, metric_name, value, status)
  SELECT 
    'database',
    'active_connections',
    COUNT(*),
    CASE 
      WHEN COUNT(*) > 80 THEN 'critical'
      WHEN COUNT(*) > 50 THEN 'warning'
      ELSE 'healthy'
    END
  FROM pg_stat_activity
  WHERE state = 'active';

  -- Collect query performance
  INSERT INTO system_metrics (service, metric_name, value, status)
  SELECT 
    'database',
    'avg_query_time',
    AVG(EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000),
    CASE 
      WHEN AVG(EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000) > 2000 THEN 'critical'
      WHEN AVG(EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000) > 1000 THEN 'warning'
      ELSE 'healthy'
    END
  FROM pg_stat_activity
  WHERE state = 'active' AND query_start IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to collect patient flow metrics
CREATE OR REPLACE FUNCTION collect_patient_flow_metrics()
RETURNS void AS $$
DECLARE
  v_hospital_id UUID;
BEGIN
  FOR v_hospital_id IN SELECT id FROM hospitals LOOP
    INSERT INTO patient_flow_metrics (
      hospital_id,
      waiting_patients,
      in_consultation,
      completed_today,
      avg_wait_time
    )
    SELECT 
      v_hospital_id,
      COUNT(*) FILTER (WHERE status = 'waiting'),
      COUNT(*) FILTER (WHERE status = 'in_progress'),
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(created_at) = CURRENT_DATE),
      AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60) FILTER (WHERE status = 'waiting')
    FROM appointments
    WHERE hospital_id = v_hospital_id
      AND DATE(appointment_date) = CURRENT_DATE;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to collect staff productivity metrics
CREATE OR REPLACE FUNCTION collect_staff_productivity_metrics()
RETURNS void AS $$
BEGIN
  INSERT INTO staff_productivity_metrics (
    staff_id,
    hospital_id,
    patients_seen,
    avg_consultation_time,
    tasks_completed,
    performance_score
  )
  SELECT 
    s.id,
    s.hospital_id,
    COUNT(DISTINCT c.patient_id) FILTER (WHERE DATE(c.created_at) = CURRENT_DATE),
    AVG(EXTRACT(EPOCH FROM (c.updated_at - c.created_at)) / 60) FILTER (WHERE c.status = 'completed'),
    COUNT(*) FILTER (WHERE DATE(c.created_at) = CURRENT_DATE),
    CASE 
      WHEN COUNT(DISTINCT c.patient_id) > 20 THEN 1.0
      WHEN COUNT(DISTINCT c.patient_id) > 10 THEN 0.8
      ELSE 0.6
    END
  FROM staff s
  LEFT JOIN consultations c ON c.doctor_id = s.id
  WHERE s.role = 'doctor'
  GROUP BY s.id, s.hospital_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_productivity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_flow_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_metrics (admin only)
CREATE POLICY "Admins can view system metrics"
  ON system_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.role = 'admin'
    )
  );

-- RLS Policies for alert_rules (admin only)
CREATE POLICY "Admins can manage alert rules"
  ON alert_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.role = 'admin'
    )
  );

-- RLS Policies for staff_productivity_metrics
CREATE POLICY "Staff can view own productivity metrics"
  ON staff_productivity_metrics FOR SELECT
  TO authenticated
  USING (
    staff_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.role IN ('admin', 'doctor')
    )
  );

-- RLS Policies for patient_flow_metrics
CREATE POLICY "Staff can view patient flow metrics"
  ON patient_flow_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff
      WHERE staff.id = auth.uid()
      AND staff.hospital_id = patient_flow_metrics.hospital_id
    )
  );

-- Create scheduled job to collect metrics (runs every 5 minutes)
-- Note: This requires pg_cron extension
-- SELECT cron.schedule('collect-system-metrics', '*/5 * * * *', 'SELECT collect_system_metrics()');
-- SELECT cron.schedule('collect-patient-flow', '*/5 * * * *', 'SELECT collect_patient_flow_metrics()');
-- SELECT cron.schedule('collect-staff-productivity', '0 * * * *', 'SELECT collect_staff_productivity_metrics()');

COMMENT ON TABLE system_metrics IS 'Stores real-time system performance metrics';
COMMENT ON TABLE alert_rules IS 'Configurable alerting rules for system monitoring';
COMMENT ON TABLE staff_productivity_metrics IS 'Staff productivity tracking metrics';
COMMENT ON TABLE patient_flow_metrics IS 'Patient flow and queue metrics';


