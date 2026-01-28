-- Migration: schema fixes for integration tests
-- Adds missing columns, creates refill_requests table, and adds explicit FK constraint names

BEGIN;

-- 1) Add missing columns if not present
ALTER TABLE IF EXISTS lab_orders ADD COLUMN IF NOT EXISTS doctor_id uuid;
ALTER TABLE IF EXISTS appointments ADD COLUMN IF NOT EXISTS appointment_date timestamptz;
ALTER TABLE IF EXISTS vital_signs ADD COLUMN IF NOT EXISTS pulse integer;

-- Backfill appointment_date from scheduled_date when available
UPDATE appointments
SET appointment_date = scheduled_date
WHERE appointment_date IS NULL
  AND scheduled_date IS NOT NULL;

-- 2) Create refill_requests table used by tests
CREATE TABLE IF NOT EXISTS refill_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL,
  patient_id uuid,
  prescription_id uuid,
  requested_by uuid,
  status text DEFAULT 'pending',
  requested_at timestamptz DEFAULT NOW(),
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- 3) Add explicit named foreign key constraints where missing to avoid PostgREST ambiguity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lab_orders_doctor_id') THEN
    ALTER TABLE IF EXISTS lab_orders
      ADD CONSTRAINT fk_lab_orders_doctor_id FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_doctor_id') THEN
    ALTER TABLE IF EXISTS appointments
      ADD CONSTRAINT fk_appointments_doctor_id FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_appointments_patient_id') THEN
    ALTER TABLE IF EXISTS appointments
      ADD CONSTRAINT fk_appointments_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prescriptions_patient_id') THEN
    ALTER TABLE IF EXISTS prescriptions
      ADD CONSTRAINT fk_prescriptions_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_prescriptions_doctor_id') THEN
    ALTER TABLE IF EXISTS prescriptions
      ADD CONSTRAINT fk_prescriptions_doctor_id FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_vital_signs_patient_id') THEN
    ALTER TABLE IF EXISTS vital_signs
      ADD CONSTRAINT fk_vital_signs_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refill_requests_patient_id') THEN
    ALTER TABLE IF EXISTS refill_requests
      ADD CONSTRAINT fk_refill_requests_patient_id FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refill_requests_prescription_id') THEN
    ALTER TABLE IF EXISTS refill_requests
      ADD CONSTRAINT fk_refill_requests_prescription_id FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_refill_requests_hospital_id') THEN
    ALTER TABLE IF EXISTS refill_requests
      ADD CONSTRAINT fk_refill_requests_hospital_id FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE CASCADE;
  END IF;
END$$;

COMMIT;

-- Summary
-- This migration adds:
--  - `doctor_id` on `lab_orders` (if missing)
--  - `appointment_date` on `appointments` (if missing) and backfills from `scheduled_date`
--  - `pulse` on `vital_signs` (if missing)
--  - `refill_requests` table
--  - Named FK constraints to reduce ambiguity for PostgREST
