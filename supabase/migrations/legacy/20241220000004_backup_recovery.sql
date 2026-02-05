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