-- Test Users Setup Migration
-- Creates test hospital and user profiles for E2E testing
-- Note: Auth users must be created separately through Supabase Auth API

-- Insert test hospital
INSERT INTO hospitals (id, name, address, city, state, zip, phone, email, license_number, settings)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Test General Hospital',
  '123 Test Street',
  'Test City',
  'Test State',
  '12345',
  '(555) 123-4567',
  'admin@testgeneral.com',
  'TEST-LIC-001',
  '{"timezone": "UTC", "currency": "USD", "features": ["appointments", "pharmacy", "laboratory"]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Insert test user profiles
INSERT INTO profiles (
  id,
  user_id,
  hospital_id,
  first_name,
  last_name,
  email,
  phone,
  is_staff,
  created_at,
  updated_at
) VALUES
-- Admin User
(
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003', -- This UUID will need to match the auth.users.id
  '550e8400-e29b-41d4-a716-446655440001',
  'Admin',
  'User',
  'admin@testgeneral.com',
  '(555) 100-0001',
  true,
  NOW(),
  NOW()
),
-- Doctor User
(
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440005',
  '550e8400-e29b-41d4-a716-446655440001',
  'Dr. Jane',
  'Smith',
  'doctor@testgeneral.com',
  '(555) 100-0002',
  true,
  NOW(),
  NOW()
),
-- Nurse User
(
  '550e8400-e29b-41d4-a716-446655440006',
  '550e8400-e29b-41d4-a716-446655440007',
  '550e8400-e29b-41d4-a716-446655440001',
  'Nancy',
  'Nurse',
  'nurse@testgeneral.com',
  '(555) 100-0003',
  true,
  NOW(),
  NOW()
),
-- Receptionist User
(
  '550e8400-e29b-41d4-a716-446655440008',
  '550e8400-e29b-41d4-a716-446655440009',
  '550e8400-e29b-41d4-a716-446655440001',
  'Rachel',
  'Receptionist',
  'reception@testgeneral.com',
  '(555) 100-0004',
  true,
  NOW(),
  NOW()
),
-- Pharmacist User
(
  '550e8400-e29b-41d4-a716-446655440010',
  '550e8400-e29b-41d4-a716-446655440011',
  '550e8400-e29b-41d4-a716-446655440001',
  'Phil',
  'Pharmacist',
  'pharmacy@testgeneral.com',
  '(555) 100-0005',
  true,
  NOW(),
  NOW()
),
-- Lab Tech User
(
  '550e8400-e29b-41d4-a716-446655440012',
  '550e8400-e29b-41d4-a716-446655440013',
  '550e8400-e29b-41d4-a716-446655440001',
  'Larry',
  'LabTech',
  'lab@testgeneral.com',
  '(555) 100-0006',
  true,
  NOW(),
  NOW()
),
-- Patient User
(
  '550e8400-e29b-41d4-a716-446655440014',
  '550e8400-e29b-41d4-a716-446655440015',
  '550e8400-e29b-41d4-a716-446655440001',
  'John',
  'Patient',
  'patient@testgeneral.com',
  '(555) 100-0007',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Insert user roles
INSERT INTO user_roles (user_id, role, created_at) VALUES
-- Admin roles
('550e8400-e29b-41d4-a716-446655440003', 'admin', NOW()),
-- Doctor roles
('550e8400-e29b-41d4-a716-446655440005', 'doctor', NOW()),
-- Nurse roles
('550e8400-e29b-41d4-a716-446655440007', 'nurse', NOW()),
-- Receptionist roles
('550e8400-e29b-41d4-a716-446655440009', 'receptionist', NOW()),
-- Pharmacist roles
('550e8400-e29b-41d4-a716-446655440011', 'pharmacist', NOW()),
-- Lab Tech roles
('550e8400-e29b-41d4-a716-446655440013', 'lab_tech', NOW()),
-- Patient roles
('550e8400-e29b-41d4-a716-446655440015', 'patient', NOW())
ON CONFLICT (user_id, role) DO NOTHING;

-- Insert patient record for the patient user
INSERT INTO patients (
  id,
  hospital_id,
  user_id,
  mrn,
  first_name,
  last_name,
  date_of_birth,
  gender,
  phone,
  email,
  address,
  emergency_contact_name,
  emergency_contact_phone,
  created_at,
  updated_at
) VALUES (
  '550e8400-e29b-41d4-a716-446655440016',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440015',
  'MRN001',
  'John',
  'Patient',
  '1985-06-15',
  'Male',
  '(555) 100-0007',
  'patient@testgeneral.com',
  '456 Patient Avenue, Test City, Test State 12345',
  'Jane Patient',
  '(555) 100-0008',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;