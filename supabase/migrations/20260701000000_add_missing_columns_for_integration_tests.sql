-- Migration: Add missing columns for integration test alignment
-- Adds doctor_id and appointment_date to appointments, pulse to vital_signs, lab_result to lab_results, and ensures prescription_refill_requests linkage

-- 1. Add doctor_id and appointment_date to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES profiles(id);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_date DATE;

-- 2. Add pulse to vital_signs
ALTER TABLE vital_signs ADD COLUMN IF NOT EXISTS pulse INTEGER;

-- 3. Add lab_result to lab_results (if not present)
ALTER TABLE lab_results ADD COLUMN IF NOT EXISTS lab_result TEXT;

-- 4. Ensure prescription_refill_requests linkage (already exists, but add FK if missing)
ALTER TABLE prescription_refill_requests ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES prescriptions(id);

-- 5. Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_vital_signs_pulse ON vital_signs(pulse);
CREATE INDEX IF NOT EXISTS idx_lab_results_lab_result ON lab_results(lab_result);
