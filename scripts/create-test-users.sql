-- Test Users Creation Script
-- Creates separate test users for each role
-- Run this in Supabase SQL Editor

-- 1. Create test users in auth.users (via Supabase Dashboard or API)
-- Note: Passwords must be set via Supabase Auth API or Dashboard
-- This script creates the profiles and role assignments

-- Test Hospital (if not exists)
INSERT INTO hospitals (id, name, address, city, state, zip, phone, email, license_number)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Hospital',
  '123 Test Street',
  'Test City',
  'Test State',
  '12345',
  '+1234567890',
  'test@hospital.com',
  'TEST-LIC-001'
) ON CONFLICT (id) DO NOTHING;

-- Admin User
INSERT INTO profiles (id, user_id, hospital_id, first_name, last_name, email, phone)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Admin',
  'User',
  'admin@test.com',
  '+1234567801'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

INSERT INTO user_roles (user_id, role, hospital_id)
VALUES ('10000000-0000-0000-0000-000000000001', 'admin', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

-- Doctor User
INSERT INTO profiles (id, user_id, hospital_id, first_name, last_name, email, phone)
VALUES (
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Doctor',
  'Smith',
  'doctor@test.com',
  '+1234567802'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

INSERT INTO user_roles (user_id, role, hospital_id)
VALUES ('20000000-0000-0000-0000-000000000002', 'doctor', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

-- Nurse User
INSERT INTO profiles (id, user_id, hospital_id, first_name, last_name, email, phone)
VALUES (
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Nurse',
  'Johnson',
  'nurse@test.com',
  '+1234567803'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

INSERT INTO user_roles (user_id, role, hospital_id)
VALUES ('30000000-0000-0000-0000-000000000003', 'nurse', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

-- Receptionist User
INSERT INTO profiles (id, user_id, hospital_id, first_name, last_name, email, phone)
VALUES (
  '40000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'Receptionist',
  'Williams',
  'receptionist@test.com',
  '+1234567804'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

INSERT INTO user_roles (user_id, role, hospital_id)
VALUES ('40000000-0000-0000-0000-000000000004', 'receptionist', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

-- Pharmacist User
INSERT INTO profiles (id, user_id, hospital_id, first_name, last_name, email, phone)
VALUES (
  '50000000-0000-0000-0000-000000000005',
  '50000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'Pharmacist',
  'Brown',
  'pharmacist@test.com',
  '+1234567805'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

INSERT INTO user_roles (user_id, role, hospital_id)
VALUES ('50000000-0000-0000-0000-000000000005', 'pharmacist', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

-- Lab Technician User
INSERT INTO profiles (id, user_id, hospital_id, first_name, last_name, email, phone)
VALUES (
  '60000000-0000-0000-0000-000000000006',
  '60000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  'Lab',
  'Tech',
  'labtech@test.com',
  '+1234567806'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

INSERT INTO user_roles (user_id, role, hospital_id)
VALUES ('60000000-0000-0000-0000-000000000006', 'lab_technician', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

-- Patient User
INSERT INTO profiles (id, user_id, hospital_id, first_name, last_name, email, phone)
VALUES (
  '70000000-0000-0000-0000-000000000007',
  '70000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'Patient',
  'Test',
  'patient@test.com',
  '+1234567807'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

INSERT INTO user_roles (user_id, role, hospital_id)
VALUES ('70000000-0000-0000-0000-000000000007', 'patient', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role, hospital_id) DO NOTHING;

-- Create patient record for patient user
INSERT INTO patients (id, hospital_id, first_name, last_name, date_of_birth, gender, email, phone, mrn, user_id)
VALUES (
  '70000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000001',
  'Patient',
  'Test',
  '1990-01-01',
  'other',
  'patient@test.com',
  '+1234567807',
  'MRN-TEST-001',
  '70000000-0000-0000-0000-000000000007'
) ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;
