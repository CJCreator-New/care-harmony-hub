-- Task Routing System Migration
-- Phase 1: Enhanced Task Assignment System

-- Create task routing rules table
CREATE TABLE IF NOT EXISTS task_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  role_priority TEXT[] NOT NULL,
  workload_threshold NUMERIC DEFAULT 80,
  skill_requirements TEXT[] DEFAULT '{}',
  auto_assign BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE task_routing_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "hospital_task_routing_rules" ON task_routing_rules
  FOR ALL TO authenticated
  USING (hospital_id IN (
    SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
  ));

-- Add columns to task_assignments for intelligent routing
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS auto_assigned BOOLEAN DEFAULT false;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS assignment_reason TEXT;
ALTER TABLE task_assignments ADD COLUMN IF NOT EXISTS estimated_completion TIMESTAMPTZ;

-- Create workload calculation function
CREATE OR REPLACE FUNCTION calculate_user_workloads(hospital_id_param UUID)
RETURNS TABLE (
  user_id UUID,
  active_tasks INTEGER,
  avg_completion_time NUMERIC,
  current_capacity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    COALESCE(active.task_count, 0) as active_tasks,
    COALESCE(completed.avg_time, 480) as avg_completion_time, -- Default 8 hours
    CASE 
      WHEN COALESCE(active.task_count, 0) = 0 THEN 100
      WHEN COALESCE(active.task_count, 0) < 3 THEN 80
      WHEN COALESCE(active.task_count, 0) < 5 THEN 60
      WHEN COALESCE(active.task_count, 0) < 8 THEN 40
      ELSE 20
    END as current_capacity
  FROM profiles p
  LEFT JOIN (
    SELECT 
      assigned_to,
      COUNT(*) as task_count
    FROM task_assignments 
    WHERE status IN ('pending', 'in_progress') 
      AND hospital_id = hospital_id_param
    GROUP BY assigned_to
  ) active ON p.user_id = active.assigned_to
  LEFT JOIN (
    SELECT 
      assigned_to,
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_time
    FROM task_assignments 
    WHERE status = 'completed' 
      AND hospital_id = hospital_id_param
      AND completed_at > NOW() - INTERVAL '30 days'
    GROUP BY assigned_to
  ) completed ON p.user_id = completed.assigned_to
  WHERE p.hospital_id = hospital_id_param
    AND p.is_staff = true;
END;
$$ LANGUAGE plpgsql;

-- Insert default routing rules for existing hospitals
INSERT INTO task_routing_rules (hospital_id, task_type, role_priority)
SELECT 
  h.id,
  task_type,
  role_priority
FROM hospitals h
CROSS JOIN (
  VALUES 
    ('patient_prep', ARRAY['nurse']),
    ('medication_review', ARRAY['pharmacist', 'nurse']),
    ('lab_follow_up', ARRAY['lab_tech', 'doctor']),
    ('billing_inquiry', ARRAY['receptionist', 'admin']),
    ('clinical_review', ARRAY['doctor', 'nurse'])
) AS rules(task_type, role_priority)
ON CONFLICT DO NOTHING;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_task_routing_rules_hospital_type ON task_routing_rules(hospital_id, task_type);
CREATE INDEX IF NOT EXISTS idx_task_assignments_status_hospital ON task_assignments(status, hospital_id);