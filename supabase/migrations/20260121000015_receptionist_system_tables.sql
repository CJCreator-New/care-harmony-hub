-- Receptionist Module Database Schema
-- 7 tables with RLS policies and indexes

-- Patient Registrations Table
CREATE TABLE IF NOT EXISTS patient_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(10),
  emergency_contact_name VARCHAR(100),
  emergency_contact_relationship VARCHAR(50),
  emergency_contact_phone VARCHAR(20),
  insurance_provider VARCHAR(255),
  insurance_member_id VARCHAR(100),
  insurance_group_number VARCHAR(100),
  insurance_plan_name VARCHAR(255),
  insurance_copay DECIMAL(10, 2),
  insurance_deductible DECIMAL(10, 2),
  insurance_status VARCHAR(20) CHECK (insurance_status IN ('verified', 'pending', 'invalid')),
  insurance_verified_at TIMESTAMP WITH TIME ZONE,
  insurance_verified_by UUID REFERENCES auth.users(id),
  medical_history TEXT[],
  allergies TEXT[],
  medications TEXT[],
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'archived')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  registered_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patient_registrations_email ON patient_registrations(email);
CREATE INDEX idx_patient_registrations_phone ON patient_registrations(phone);
CREATE INDEX idx_patient_registrations_status ON patient_registrations(status);
CREATE INDEX idx_patient_registrations_registered_by ON patient_registrations(registered_by);

-- Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  appointment_type VARCHAR(50) CHECK (appointment_type IN ('consultation', 'follow_up', 'procedure', 'emergency')),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER DEFAULT 30,
  room_number VARCHAR(50),
  status VARCHAR(20) CHECK (status IN ('scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_provider ON appointments(provider_id);
CREATE INDEX idx_appointments_scheduled_time ON appointments(scheduled_time);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Check-in Records Table
CREATE TABLE IF NOT EXISTS check_in_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_in_by UUID NOT NULL REFERENCES auth.users(id),
  insurance_verified BOOLEAN DEFAULT FALSE,
  forms_completed BOOLEAN DEFAULT FALSE,
  vitals_recorded BOOLEAN DEFAULT FALSE,
  waiting_room_assigned VARCHAR(50),
  status VARCHAR(20) CHECK (status IN ('checked_in', 'waiting', 'called', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_check_in_records_appointment ON check_in_records(appointment_id);
CREATE INDEX idx_check_in_records_patient ON check_in_records(patient_id);
CREATE INDEX idx_check_in_records_check_in_time ON check_in_records(check_in_time);

-- Check-out Records Table
CREATE TABLE IF NOT EXISTS check_out_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  check_out_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  check_out_by UUID NOT NULL REFERENCES auth.users(id),
  bill_generated BOOLEAN DEFAULT FALSE,
  next_appointment_scheduled BOOLEAN DEFAULT FALSE,
  discharge_summary_provided BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) CHECK (status IN ('completed', 'pending_payment', 'pending_followup')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_check_out_records_appointment ON check_out_records(appointment_id);
CREATE INDEX idx_check_out_records_patient ON check_out_records(patient_id);
CREATE INDEX idx_check_out_records_check_out_time ON check_out_records(check_out_time);

-- Patient Communications Table
CREATE TABLE IF NOT EXISTS patient_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  communication_type VARCHAR(50) CHECK (communication_type IN ('sms', 'email', 'phone', 'app_notification')),
  subject VARCHAR(255),
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(20) CHECK (status IN ('sent', 'delivered', 'failed', 'read')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patient_communications_patient ON patient_communications(patient_id);
CREATE INDEX idx_patient_communications_type ON patient_communications(communication_type);
CREATE INDEX idx_patient_communications_status ON patient_communications(status);

-- Scheduling Conflicts Table
CREATE TABLE IF NOT EXISTS scheduling_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  conflict_type VARCHAR(50) CHECK (conflict_type IN ('provider_overlap', 'room_conflict', 'resource_unavailable', 'patient_conflict')),
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'medium')),
  description TEXT NOT NULL,
  suggested_resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_scheduling_conflicts_appointment ON scheduling_conflicts(appointment_id);
CREATE INDEX idx_scheduling_conflicts_severity ON scheduling_conflicts(severity);

-- No-Show Predictions Table
CREATE TABLE IF NOT EXISTS no_show_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient_registrations(id) ON DELETE CASCADE,
  risk_score DECIMAL(5, 2),
  risk_level VARCHAR(20) CHECK (risk_level IN ('high', 'medium', 'low')),
  factors TEXT[],
  recommended_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_no_show_predictions_appointment ON no_show_predictions(appointment_id);
CREATE INDEX idx_no_show_predictions_risk_level ON no_show_predictions(risk_level);

-- RLS Policies

-- Patient Registrations RLS
ALTER TABLE patient_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists can view patient registrations"
  ON patient_registrations FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin', 'doctor', 'nurse'));

CREATE POLICY "Receptionists can insert patient registrations"
  ON patient_registrations FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

CREATE POLICY "Receptionists can update patient registrations"
  ON patient_registrations FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

-- Appointments RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view appointments"
  ON appointments FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('receptionist', 'admin', 'doctor', 'nurse') OR
    patient_id IN (SELECT id FROM patient_registrations WHERE id = auth.uid())
  );

CREATE POLICY "Receptionists can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

CREATE POLICY "Receptionists can update appointments"
  ON appointments FOR UPDATE
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

-- Check-in Records RLS
ALTER TABLE check_in_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists can view check-in records"
  ON check_in_records FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin', 'nurse', 'doctor'));

CREATE POLICY "Receptionists can insert check-in records"
  ON check_in_records FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

-- Check-out Records RLS
ALTER TABLE check_out_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists can view check-out records"
  ON check_out_records FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin', 'nurse', 'doctor'));

CREATE POLICY "Receptionists can insert check-out records"
  ON check_out_records FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

-- Patient Communications RLS
ALTER TABLE patient_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists can view communications"
  ON patient_communications FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

CREATE POLICY "Receptionists can insert communications"
  ON patient_communications FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

-- Scheduling Conflicts RLS
ALTER TABLE scheduling_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists can view scheduling conflicts"
  ON scheduling_conflicts FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));

-- No-Show Predictions RLS
ALTER TABLE no_show_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Receptionists can view no-show predictions"
  ON no_show_predictions FOR SELECT
  USING (auth.jwt() ->> 'role' IN ('receptionist', 'admin'));
