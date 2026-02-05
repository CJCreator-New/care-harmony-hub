-- Consolidated migration group: telemedicine
-- Generated: 2026-02-04 18:14:19
-- Source migrations: 1

-- ============================================
-- Migration: 20241220000007_telemedicine.sql
-- ============================================

-- Create telemedicine sessions table
CREATE TABLE IF NOT EXISTS telemedicine_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  session_token TEXT,
  room_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  recording_url TEXT,
  session_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create session participants table
CREATE TABLE IF NOT EXISTS session_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES telemedicine_sessions(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_type TEXT NOT NULL CHECK (user_type IN ('doctor', 'patient', 'nurse', 'observer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  connection_quality TEXT CHECK (connection_quality IN ('excellent', 'good', 'fair', 'poor')),
  device_info JSONB
);

-- Create remote monitoring data table
CREATE TABLE IF NOT EXISTS remote_monitoring_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id),
  device_type TEXT NOT NULL CHECK (device_type IN ('blood_pressure', 'glucose', 'weight', 'heart_rate', 'oxygen_saturation', 'temperature')),
  measurement_value DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  device_id TEXT,
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  alert_triggered BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create telemedicine prescriptions table
CREATE TABLE IF NOT EXISTS telemedicine_prescriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES telemedicine_sessions(id),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  e_signature TEXT,
  verification_code TEXT,
  digital_signature_timestamp TIMESTAMPTZ,
  pharmacy_notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create virtual waiting room table
CREATE TABLE IF NOT EXISTS virtual_waiting_room (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  estimated_wait_time INTEGER, -- in minutes
  current_position INTEGER,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'in_session', 'completed')),
  pre_consultation_forms JSONB,
  technical_check_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add telemedicine session reference to appointments
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS telemedicine_session_id UUID REFERENCES telemedicine_sessions(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_doctor ON telemedicine_sessions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_patient ON telemedicine_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_status ON telemedicine_sessions(status);
CREATE INDEX IF NOT EXISTS idx_telemedicine_sessions_started_at ON telemedicine_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_remote_monitoring_patient ON remote_monitoring_data(patient_id);
CREATE INDEX IF NOT EXISTS idx_remote_monitoring_measured_at ON remote_monitoring_data(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_virtual_waiting_room_appointment ON virtual_waiting_room(appointment_id);

-- Create RLS policies
ALTER TABLE telemedicine_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE remote_monitoring_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_waiting_room ENABLE ROW LEVEL SECURITY;

-- Telemedicine sessions: doctors and patients can view their own sessions
CREATE POLICY "Users can view their telemedicine sessions" ON telemedicine_sessions
FOR SELECT USING (
  doctor_id = auth.uid() OR 
  patient_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'nurse')
  )
);

-- Session participants: users can view sessions they participate in
CREATE POLICY "Users can view their session participation" ON session_participants
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM telemedicine_sessions ts 
    WHERE ts.id = session_id 
    AND (ts.doctor_id = auth.uid() OR ts.patient_id = auth.uid())
  )
);

-- Remote monitoring: patients can view their own data, doctors can view their patients' data
CREATE POLICY "Patients can view their monitoring data" ON remote_monitoring_data
FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "Doctors can view their patients monitoring data" ON remote_monitoring_data
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM consultations c 
    WHERE c.patient_id = remote_monitoring_data.patient_id 
    AND c.doctor_id = auth.uid()
  )
);

-- Virtual waiting room: patients can view their own waiting status
CREATE POLICY "Patients can view their waiting room status" ON virtual_waiting_room
FOR SELECT USING (patient_id = auth.uid());

-- Create function to calculate session duration
CREATE OR REPLACE FUNCTION calculate_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session duration calculation
CREATE TRIGGER update_session_duration
  BEFORE UPDATE ON telemedicine_sessions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_session_duration();

-- Insert sample remote monitoring alert thresholds
CREATE TABLE IF NOT EXISTS monitoring_alert_thresholds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_type TEXT NOT NULL,
  parameter TEXT NOT NULL,
  min_value DECIMAL(10,2),
  max_value DECIMAL(10,2),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  alert_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO monitoring_alert_thresholds (device_type, parameter, min_value, max_value, severity, alert_message) VALUES
('blood_pressure', 'systolic', 90, 180, 'high', 'Blood pressure outside normal range'),
('blood_pressure', 'diastolic', 60, 110, 'high', 'Diastolic pressure abnormal'),
('glucose', 'level', 70, 200, 'medium', 'Blood glucose level requires attention'),
('heart_rate', 'bpm', 60, 100, 'medium', 'Heart rate outside normal range'),
('oxygen_saturation', 'percentage', 95, 100, 'high', 'Oxygen saturation below normal'),
('temperature', 'celsius', 36.1, 37.8, 'medium', 'Body temperature abnormal')
ON CONFLICT DO NOTHING;


