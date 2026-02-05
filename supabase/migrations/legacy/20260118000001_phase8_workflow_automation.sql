-- Phase 8: Cross-Role Integration - Workflow Automation & Communication
-- Migration: 20260118000001_phase8_workflow_automation.sql

-- Enable RLS on existing tables if not already enabled
ALTER TABLE IF EXISTS task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inter_role_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workflow_metrics ENABLE ROW LEVEL SECURITY;

-- Workflow Tasks Table (enhanced task management)
CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('patient_admission', 'consultation', 'medication', 'lab_order', 'billing', 'discharge', 'follow_up', 'emergency')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'overdue')),
    assigned_to UUID REFERENCES profiles(id),
    assigned_by UUID REFERENCES profiles(id),
    patient_id UUID REFERENCES patients(id),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration INTEGER, -- minutes
    actual_duration INTEGER, -- minutes
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow Rules Table (automation rules)
CREATE TABLE IF NOT EXISTS workflow_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL, -- e.g., 'patient_admitted', 'lab_result_ready'
    trigger_conditions JSONB DEFAULT '{}',
    actions JSONB NOT NULL, -- automated actions to take
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    cooldown_minutes INTEGER DEFAULT 0, -- prevent rule spam
    last_triggered TIMESTAMP WITH TIME ZONE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication Messages Table (enhanced messaging)
CREATE TABLE IF NOT EXISTS communication_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    recipient_ids UUID[] NOT NULL,
    recipient_roles TEXT[] DEFAULT '{}',
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    message_type TEXT NOT NULL DEFAULT 'general' CHECK (message_type IN ('general', 'task_assignment', 'patient_update', 'alert', 'broadcast')),
    patient_id UUID REFERENCES patients(id),
    task_id UUID REFERENCES workflow_tasks(id),
    read_by UUID[] DEFAULT '{}',
    acknowledged_by UUID[] DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification Settings Table (user preferences)
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, notification_type, hospital_id)
);

-- Enable RLS on new tables
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_tasks
CREATE POLICY "workflow_tasks_hospital_access" ON workflow_tasks
    FOR ALL TO authenticated
    USING (hospital_id IN (
        SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "workflow_tasks_assigned_access" ON workflow_tasks
    FOR ALL TO authenticated
    USING (assigned_to IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

-- RLS Policies for workflow_rules
CREATE POLICY "workflow_rules_hospital_access" ON workflow_rules
    FOR ALL TO authenticated
    USING (hospital_id IN (
        SELECT hospital_id FROM profiles WHERE user_id = auth.uid()
    ));

-- RLS Policies for communication_messages
CREATE POLICY "communication_messages_sender_access" ON communication_messages
    FOR ALL TO authenticated
    USING (sender_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

CREATE POLICY "communication_messages_recipient_access" ON communication_messages
    FOR ALL TO authenticated
    USING (auth.uid() = ANY(recipient_ids));

-- RLS Policies for notification_settings
CREATE POLICY "notification_settings_user_access" ON notification_settings
    FOR ALL TO authenticated
    USING (user_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_assigned_to ON workflow_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_patient ON workflow_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_status ON workflow_tasks(status);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_workflow_type ON workflow_tasks(workflow_type);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_due_date ON workflow_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_workflow_tasks_hospital ON workflow_tasks(hospital_id);

CREATE INDEX IF NOT EXISTS idx_workflow_rules_trigger_event ON workflow_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_active ON workflow_rules(active);
CREATE INDEX IF NOT EXISTS idx_workflow_rules_hospital ON workflow_rules(hospital_id);

CREATE INDEX IF NOT EXISTS idx_communication_messages_sender ON communication_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_recipients ON communication_messages USING GIN(recipient_ids);
CREATE INDEX IF NOT EXISTS idx_communication_messages_patient ON communication_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_type ON communication_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_communication_messages_priority ON communication_messages(priority);
CREATE INDEX IF NOT EXISTS idx_communication_messages_hospital ON communication_messages(hospital_id);
CREATE INDEX IF NOT EXISTS idx_communication_messages_created_at ON communication_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(notification_type);

-- Functions for workflow automation

-- Function to automatically create tasks based on workflow rules
CREATE OR REPLACE FUNCTION trigger_workflow_automation()
RETURNS TRIGGER AS $$
DECLARE
    rule_record RECORD;
    task_data JSONB;
    assigned_user UUID;
BEGIN
    -- Find active rules that match the trigger event
    FOR rule_record IN
        SELECT * FROM workflow_rules
        WHERE active = true
        AND trigger_event = TG_ARGV[0]
        AND hospital_id = NEW.hospital_id
        AND (last_triggered IS NULL OR last_triggered < NOW() - INTERVAL '1 minute' * cooldown_minutes)
    LOOP
        -- Check trigger conditions
        IF check_workflow_conditions(rule_record.trigger_conditions, NEW) THEN
            -- Create automated task
            task_data := rule_record.actions->'task';
            IF task_data IS NOT NULL THEN
                -- Find best user to assign task to
                SELECT find_optimal_task_assignee(
                    task_data->>'workflow_type',
                    NEW.hospital_id,
                    rule_record.actions->>'assignment_strategy'
                ) INTO assigned_user;

                -- Create the task
                INSERT INTO workflow_tasks (
                    title,
                    description,
                    workflow_type,
                    priority,
                    assigned_to,
                    patient_id,
                    due_date,
                    hospital_id,
                    metadata
                ) VALUES (
                    task_data->>'title',
                    task_data->>'description',
                    task_data->>'workflow_type',
                    COALESCE(task_data->>'priority', 'medium'),
                    assigned_user,
                    NEW.id,
                    CASE WHEN task_data->>'due_hours' IS NOT NULL
                         THEN NOW() + INTERVAL '1 hour' * (task_data->>'due_hours')::INTEGER
                         ELSE NULL END,
                    NEW.hospital_id,
                    jsonb_build_object('auto_generated', true, 'rule_id', rule_record.id)
                );

                -- Update rule's last triggered timestamp
                UPDATE workflow_rules SET last_triggered = NOW() WHERE id = rule_record.id;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check workflow trigger conditions
CREATE OR REPLACE FUNCTION check_workflow_conditions(conditions JSONB, record_data RECORD)
RETURNS BOOLEAN AS $$
DECLARE
    condition_key TEXT;
    condition_value JSONB;
    field_value TEXT;
BEGIN
    -- Simple condition checking - can be extended for complex logic
    FOR condition_key, condition_value IN SELECT * FROM jsonb_object_keys(conditions), jsonb_extract_path(conditions, jsonb_object_keys(conditions))
    LOOP
        -- Get field value from record (simplified - would need expansion for complex fields)
        EXECUTE format('SELECT ($1).%I::TEXT', condition_key) INTO field_value USING record_data;

        -- Check condition (simplified equality check)
        IF condition_value->>'operator' = 'equals' AND field_value != condition_value->>'value' THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to find optimal task assignee
CREATE OR REPLACE FUNCTION find_optimal_task_assignee(
    workflow_type_param TEXT,
    hospital_id_param UUID,
    strategy TEXT DEFAULT 'workload'
)
RETURNS UUID AS $$
DECLARE
    assignee_id UUID;
BEGIN
    -- Simple workload-based assignment - can be enhanced with skills, availability, etc.
    IF strategy = 'workload' THEN
        SELECT p.id INTO assignee_id
        FROM profiles p
        LEFT JOIN workflow_tasks wt ON wt.assigned_to = p.id AND wt.status IN ('pending', 'in_progress')
        WHERE p.hospital_id = hospital_id_param
        AND p.role IN (
            CASE workflow_type_param
                WHEN 'consultation' THEN ARRAY['doctor']
                WHEN 'medication' THEN ARRAY['pharmacist', 'nurse']
                WHEN 'lab_order' THEN ARRAY['lab_technician']
                WHEN 'billing' THEN ARRAY['admin', 'receptionist']
                ELSE ARRAY['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician']
            END
        )
        GROUP BY p.id
        ORDER BY COUNT(wt.id) ASC, p.created_at ASC
        LIMIT 1;
    END IF;

    RETURN assignee_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update task status and trigger related workflows
CREATE OR REPLACE FUNCTION update_task_status_and_notify()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();

    -- If task is completed, update completed_at
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
        NEW.actual_duration = EXTRACT(EPOCH FROM (NOW() - OLD.created_at)) / 60; -- minutes
    END IF;

    -- Trigger notifications for status changes
    IF NEW.status != OLD.status THEN
        -- Create notification message
        INSERT INTO communication_messages (
            sender_id,
            sender_name,
            sender_role,
            recipient_ids,
            subject,
            content,
            priority,
            message_type,
            patient_id,
            task_id,
            hospital_id
        )
        SELECT
            NEW.assigned_by,
            p.full_name,
            p.role,
            ARRAY[NEW.assigned_to],
            'Task Status Updated: ' || NEW.title,
            format('Task "%s" status changed from %s to %s', NEW.title, OLD.status, NEW.status),
            CASE WHEN NEW.status = 'overdue' THEN 'urgent' ELSE 'normal' END,
            'task_assignment',
            NEW.patient_id,
            NEW.id,
            NEW.hospital_id
        FROM profiles p
        WHERE p.id = NEW.assigned_by;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for workflow automation
CREATE OR REPLACE TRIGGER trigger_patient_admission_workflow
    AFTER INSERT ON patients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_workflow_automation('patient_admitted');

CREATE OR REPLACE TRIGGER trigger_appointment_workflow
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_workflow_automation('appointment_created');

CREATE OR REPLACE TRIGGER trigger_task_status_updates
    BEFORE UPDATE ON workflow_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_task_status_and_notify();

-- Insert default workflow rules
INSERT INTO workflow_rules (name, description, trigger_event, trigger_conditions, actions, hospital_id) VALUES
('Patient Admission Follow-up', 'Create follow-up task when patient is admitted', 'patient_admitted',
 '{}',
 '{
   "task": {
     "title": "Complete patient admission paperwork",
     "description": "Review and complete all admission documentation",
     "workflow_type": "patient_admission",
     "priority": "high",
     "due_hours": 2
   },
   "assignment_strategy": "workload"
 }',
 (SELECT id FROM hospitals LIMIT 1)
),
('Consultation Task Creation', 'Create consultation task when appointment is scheduled', 'appointment_created',
 '{"status": {"operator": "equals", "value": "scheduled"}}',
 '{
   "task": {
     "title": "Prepare for patient consultation",
     "description": "Review patient history and prepare consultation notes",
     "workflow_type": "consultation",
     "priority": "medium",
     "due_hours": 1
   },
   "assignment_strategy": "workload"
 }',
 (SELECT id FROM hospitals LIMIT 1)
);

-- Insert default notification settings for existing users
INSERT INTO notification_settings (user_id, notification_type, hospital_id)
SELECT DISTINCT
    p.id,
    nt.notification_type,
    p.hospital_id
FROM profiles p
CROSS JOIN (
    VALUES ('task_assignment'), ('patient_update'), ('urgent_alert'), ('shift_reminder'), ('system_notification')
) AS nt(notification_type)
ON CONFLICT (user_id, notification_type, hospital_id) DO NOTHING;