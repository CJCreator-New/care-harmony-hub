-- Phase 3: Receptionist & Scheduling Enhancement Database Schema
-- Multi-Resource Scheduling, Waitlist Management, and Insurance Verification

-- Resource Types (Rooms, Equipment, etc.)
CREATE TABLE IF NOT EXISTS resource_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'room', 'equipment', 'vehicle'
  requires_booking BOOLEAN DEFAULT TRUE,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced Hospital Resources with Scheduling
ALTER TABLE hospital_resources ADD COLUMN IF NOT EXISTS booking_buffer_minutes INTEGER DEFAULT 15;
ALTER TABLE hospital_resources ADD COLUMN IF NOT EXISTS max_booking_duration_hours INTEGER DEFAULT 8;
ALTER TABLE hospital_resources ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE hospital_resources ADD COLUMN IF NOT EXISTS resource_type_id UUID REFERENCES resource_types(id);

-- Resource Bookings
CREATE TABLE IF NOT EXISTS resource_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES hospital_resources(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  booked_by UUID REFERENCES profiles(id) NOT NULL,
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Booking Details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  purpose TEXT,
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'pending', 'cancelled'
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waitlist Management
CREATE TABLE IF NOT EXISTS appointment_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  doctor_id UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Waitlist Details
  preferred_date_start DATE,
  preferred_date_end DATE,
  preferred_times TEXT[], -- Array of preferred time slots
  appointment_type TEXT NOT NULL,
  reason_for_visit TEXT,
  
  -- Priority and Urgency
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  urgency_level INTEGER DEFAULT 3, -- 1-5 scale
  
  -- Contact Preferences
  contact_method TEXT DEFAULT 'phone', -- 'phone', 'email', 'sms', 'portal'
  auto_book BOOLEAN DEFAULT FALSE,
  max_notice_hours INTEGER DEFAULT 24,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'notified', 'booked', 'expired', 'cancelled'
  notified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recurring Appointments
CREATE TABLE IF NOT EXISTS recurring_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  doctor_id UUID REFERENCES profiles(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Recurrence Pattern
  pattern_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
  interval_value INTEGER DEFAULT 1, -- Every X days/weeks/months
  days_of_week INTEGER[], -- For weekly: [1,3,5] = Mon,Wed,Fri
  day_of_month INTEGER, -- For monthly: 15 = 15th of each month
  
  -- Appointment Details
  appointment_type TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  preferred_time TIME,
  reason_for_visit TEXT,
  
  -- Series Management
  series_start_date DATE NOT NULL,
  series_end_date DATE,
  max_occurrences INTEGER,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  last_generated_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance Verification
CREATE TABLE IF NOT EXISTS insurance_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Insurance Details
  insurance_provider TEXT NOT NULL,
  policy_number TEXT,
  group_number TEXT,
  member_id TEXT,
  
  -- Verification Status
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'expired'
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES profiles(id),
  
  -- Coverage Details
  copay_amount DECIMAL(10,2),
  deductible_amount DECIMAL(10,2),
  deductible_met DECIMAL(10,2),
  coverage_percentage INTEGER,
  
  -- Authorization
  requires_authorization BOOLEAN DEFAULT FALSE,
  authorization_number TEXT,
  authorization_expires_at TIMESTAMPTZ,
  
  -- Verification Response
  verification_response JSONB,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-Registration Forms
CREATE TABLE IF NOT EXISTS pre_registration_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Form Data
  form_data JSONB NOT NULL,
  form_version TEXT DEFAULT '1.0',
  
  -- Completion Status
  status TEXT DEFAULT 'sent', -- 'sent', 'in_progress', 'completed', 'expired'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Digital Signatures
  patient_signature TEXT, -- Base64 encoded signature
  consent_signatures JSONB, -- Multiple consent forms
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment Buffer Rules
CREATE TABLE IF NOT EXISTS appointment_buffer_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID REFERENCES hospitals(id) NOT NULL,
  
  -- Rule Criteria
  appointment_type TEXT,
  doctor_id UUID REFERENCES profiles(id),
  department_id UUID REFERENCES departments(id),
  
  -- Buffer Settings
  buffer_before_minutes INTEGER DEFAULT 15,
  buffer_after_minutes INTEGER DEFAULT 15,
  cleanup_time_minutes INTEGER DEFAULT 10,
  
  -- Scheduling Rules
  max_consecutive_appointments INTEGER,
  required_break_minutes INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1, -- Higher number = higher priority
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_resource_bookings_resource_time ON resource_bookings(resource_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_resource_bookings_appointment ON resource_bookings(appointment_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_patient ON appointment_waitlist(patient_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_doctor_date ON appointment_waitlist(doctor_id, preferred_date_start);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON appointment_waitlist(status, priority);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_patient ON recurring_appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_recurring_appointments_series ON recurring_appointments(series_start_date, status);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_patient ON insurance_verifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_insurance_verifications_appointment ON insurance_verifications(appointment_id);
CREATE INDEX IF NOT EXISTS idx_pre_registration_patient ON pre_registration_forms(patient_id);
CREATE INDEX IF NOT EXISTS idx_pre_registration_status ON pre_registration_forms(status, expires_at);

-- Insert sample resource types
INSERT INTO resource_types (name, description, category) VALUES
('Examination Room', 'Standard patient examination room', 'room'),
('Procedure Room', 'Room for minor procedures', 'room'),
('X-Ray Machine', 'Digital X-Ray equipment', 'equipment'),
('Ultrasound Machine', 'Ultrasound imaging equipment', 'equipment'),
('EKG Machine', 'Electrocardiogram equipment', 'equipment')
ON CONFLICT DO NOTHING;