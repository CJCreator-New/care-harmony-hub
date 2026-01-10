-- Phase 8: Cross-Role Integration - Real-Time Status Board & Task Assignment
-- Migration: 20260110000008_phase8_integration.sql

-- Task Assignment System
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  patient_id UUID REFERENCES patients(id),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMPTZ,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-Time Status Tracking
CREATE TABLE patient_status_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  current_location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting', 'in_progress', 'ready', 'completed')),
  assigned_staff UUID REFERENCES profiles(id),
  estimated_duration INTEGER, -- minutes
  actual_start_time TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  notes TEXT,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Availability Tracking
CREATE TABLE resource_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL CHECK (resource_type IN ('room', 'equipment', 'staff')),
  resource_id TEXT NOT NULL,
  resource_name TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance', 'reserved')),
  occupied_by UUID REFERENCES patients(id),
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  hospital_id UUID REFERENCES hospitals(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Queue Management
CREATE TABLE workflow_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name TEXT NOT NULL,
  department TEXT NOT NULL,
  patient_id UUID REFERENCES patients(id),
  priority_score INTEGER DEFAULT 0,
  wait_time_minutes INTEGER DEFAULT 0,
  queue_position INTEGER,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_service', 'completed')),
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication Hub
CREATE TABLE inter_role_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  patient_id UUID REFERENCES patients(id),
  message_type TEXT DEFAULT 'general' CHECK (message_type IN ('general', 'urgent', 'handoff', 'alert')),
  subject TEXT,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Metrics Tracking
CREATE TABLE workflow_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  department TEXT,
  staff_id UUID REFERENCES profiles(id),
  patient_id UUID REFERENCES patients(id),
  metric_value DECIMAL,
  measurement_unit TEXT,
  recorded_date DATE DEFAULT CURRENT_DATE,
  hospital_id UUID REFERENCES hospitals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_assignments_assigned_to ON task_assignments(assigned_to);
CREATE INDEX idx_task_assignments_patient ON task_assignments(patient_id);
CREATE INDEX idx_task_assignments_status ON task_assignments(status);
CREATE INDEX idx_patient_status_board_patient ON patient_status_board(patient_id);
CREATE INDEX idx_patient_status_board_location ON patient_status_board(current_location);
CREATE INDEX idx_resource_availability_type ON resource_availability(resource_type);
CREATE INDEX idx_workflow_queues_department ON workflow_queues(department);
CREATE INDEX idx_inter_role_messages_recipient ON inter_role_messages(recipient_id);

-- RLS Policies
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_status_board ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE inter_role_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_metrics ENABLE ROW LEVEL SECURITY;

-- Task assignments policies
CREATE POLICY "Users can view tasks assigned to them" ON task_assignments
  FOR SELECT USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Users can create tasks" ON task_assignments
  FOR INSERT WITH CHECK (assigned_by = auth.uid());

CREATE POLICY "Users can update their tasks" ON task_assignments
  FOR UPDATE USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- Status board policies
CREATE POLICY "Staff can view status board" ON patient_status_board
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'doctor', 'nurse', 'receptionist')
    )
  );

-- Resource availability policies
CREATE POLICY "Staff can view resources" ON resource_availability
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'doctor', 'nurse', 'receptionist')
    )
  );

-- Functions for real-time updates
CREATE OR REPLACE FUNCTION update_patient_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_status_trigger
  BEFORE UPDATE ON patient_status_board
  FOR EACH ROW EXECUTE FUNCTION update_patient_status();

CREATE TRIGGER update_task_assignments_trigger
  BEFORE UPDATE ON task_assignments
  FOR EACH ROW EXECUTE FUNCTION update_patient_status();