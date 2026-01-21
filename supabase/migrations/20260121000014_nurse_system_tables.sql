-- Nurse Module Database Schema
-- 8 tables with RLS policies and indexes

-- Patient Assignments Table
CREATE TABLE IF NOT EXISTS patient_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_number VARCHAR(50),
  acuity_level VARCHAR(20) CHECK (acuity_level IN ('critical', 'high', 'medium', 'low')),
  admission_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  primary_diagnosis TEXT,
  allergies TEXT[],
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  UNIQUE(patient_id, nurse_id)
);

CREATE INDEX idx_patient_assignments_nurse ON patient_assignments(nurse_id);
CREATE INDEX idx_patient_assignments_patient ON patient_assignments(patient_id);
CREATE INDEX idx_patient_assignments_acuity ON patient_assignments(acuity_level);

-- Vital Signs Table
CREATE TABLE IF NOT EXISTS vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id UUID NOT NULL REFERENCES auth.users(id),
  temperature DECIMAL(5, 2),
  heart_rate INTEGER,
  blood_pressure VARCHAR(20),
  respiratory_rate INTEGER,
  oxygen_saturation DECIMAL(5, 2),
  blood_glucose DECIMAL(7, 2),
  status VARCHAR(20) CHECK (status IN ('normal', 'abnormal', 'critical')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_vital_signs_patient ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_recorded_at ON vital_signs(recorded_at DESC);
CREATE INDEX idx_vital_signs_status ON vital_signs(status);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) CHECK (alert_type IN ('vital_abnormal', 'medication_due', 'task_overdue', 'order_pending', 'allergy_warning')),
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);

-- Tasks Table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) CHECK (task_type IN ('assessment', 'medication', 'procedure', 'monitoring', 'documentation')),
  priority VARCHAR(20) CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  due_time TIMESTAMP WITH TIME ZONE NOT NULL,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_patient ON tasks(patient_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);

-- Nurse Assessments Table
CREATE TABLE IF NOT EXISTS nurse_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id UUID NOT NULL REFERENCES auth.users(id),
  assessment_type VARCHAR(50) CHECK (assessment_type IN ('admission', 'shift', 'focused', 'discharge')),
  physical_examination TEXT,
  mental_status TEXT,
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  mobility_status TEXT,
  skin_integrity TEXT,
  nutrition_status TEXT,
  elimination_status TEXT,
  psychosocial_status TEXT,
  risk_assessments JSONB,
  care_plan_updates TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_nurse_assessments_patient ON nurse_assessments(patient_id);
CREATE INDEX idx_nurse_assessments_nurse ON nurse_assessments(nurse_id);
CREATE INDEX idx_nurse_assessments_type ON nurse_assessments(assessment_type);

-- Medication Administration Table
CREATE TABLE IF NOT EXISTS medication_administration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES prescriptions(id),
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  route VARCHAR(50),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  administered_time TIMESTAMP WITH TIME ZONE,
  administered_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) CHECK (status IN ('pending', 'administered', 'refused', 'held', 'missed')),
  reason TEXT,
  verified_by UUID REFERENCES auth.users(id),
  patient_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_medication_admin_patient ON medication_administration(patient_id);
CREATE INDEX idx_medication_admin_status ON medication_administration(status);
CREATE INDEX idx_medication_admin_scheduled ON medication_administration(scheduled_time);

-- Care Plans Table
CREATE TABLE IF NOT EXISTS care_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  goals JSONB NOT NULL DEFAULT '[]',
  interventions JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) CHECK (status IN ('active', 'completed', 'on_hold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_care_plans_patient ON care_plans(patient_id);
CREATE INDEX idx_care_plans_status ON care_plans(status);

-- Shift Handoffs Table
CREATE TABLE IF NOT EXISTS shift_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_date DATE NOT NULL,
  outgoing_nurse UUID NOT NULL REFERENCES auth.users(id),
  incoming_nurse UUID NOT NULL REFERENCES auth.users(id),
  patients JSONB NOT NULL DEFAULT '[]',
  critical_updates TEXT[],
  pending_orders TEXT[],
  staffing_notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_shift_handoffs_date ON shift_handoffs(shift_date);
CREATE INDEX idx_shift_handoffs_outgoing ON shift_handoffs(outgoing_nurse);
CREATE INDEX idx_shift_handoffs_incoming ON shift_handoffs(incoming_nurse);

-- RLS Policies

-- Patient Assignments RLS
ALTER TABLE patient_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view their assigned patients"
  ON patient_assignments FOR SELECT
  USING (nurse_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Nurses can insert patient assignments"
  ON patient_assignments FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('nurse', 'admin'));

-- Vital Signs RLS
ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view vital signs for their patients"
  ON vital_signs FOR SELECT
  USING (
    nurse_id = auth.uid() OR
    patient_id IN (SELECT patient_id FROM patient_assignments WHERE nurse_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Nurses can insert vital signs"
  ON vital_signs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('nurse', 'admin'));

-- Alerts RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view alerts for their patients"
  ON alerts FOR SELECT
  USING (
    patient_id IN (SELECT patient_id FROM patient_assignments WHERE nurse_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'admin'
  );

-- Tasks RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view their tasks"
  ON tasks FOR SELECT
  USING (assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Nurses can update their tasks"
  ON tasks FOR UPDATE
  USING (assigned_to = auth.uid() OR auth.jwt() ->> 'role' = 'admin');

-- Nurse Assessments RLS
ALTER TABLE nurse_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view assessments for their patients"
  ON nurse_assessments FOR SELECT
  USING (
    nurse_id = auth.uid() OR
    patient_id IN (SELECT patient_id FROM patient_assignments WHERE nurse_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Nurses can insert assessments"
  ON nurse_assessments FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('nurse', 'admin'));

-- Medication Administration RLS
ALTER TABLE medication_administration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view medication administration"
  ON medication_administration FOR SELECT
  USING (
    administered_by = auth.uid() OR
    patient_id IN (SELECT patient_id FROM patient_assignments WHERE nurse_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Nurses can insert medication administration"
  ON medication_administration FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('nurse', 'admin'));

-- Care Plans RLS
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view care plans for their patients"
  ON care_plans FOR SELECT
  USING (
    patient_id IN (SELECT patient_id FROM patient_assignments WHERE nurse_id = auth.uid()) OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Nurses can update care plans"
  ON care_plans FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('nurse', 'admin'));

-- Shift Handoffs RLS
ALTER TABLE shift_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Nurses can view their handoffs"
  ON shift_handoffs FOR SELECT
  USING (
    outgoing_nurse = auth.uid() OR
    incoming_nurse = auth.uid() OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Nurses can insert handoffs"
  ON shift_handoffs FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('nurse', 'admin'));
