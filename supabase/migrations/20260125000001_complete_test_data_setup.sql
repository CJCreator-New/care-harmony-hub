-- Complete Test Data Setup Migration
-- Creates all necessary test data for E2E testing
-- This includes hospitals, users, roles, patients, and sample data for dashboards

-- ============================================
-- HOSPITAL SETUP
-- ============================================

-- Insert test hospital
INSERT INTO hospitals (id, name, address, city, state, zip, phone, email, license_number, settings, created_at)
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
  '{"timezone": "UTC", "currency": "USD", "features": ["appointments", "pharmacy", "laboratory", "emergency", "surgery"]}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DEPARTMENTS
-- ============================================

-- Insert test departments
INSERT INTO departments (id, hospital_id, name, description, head_id, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440001', 'Emergency Medicine', 'Emergency Department', NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Internal Medicine', 'Internal Medicine Department', NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Surgery', 'Surgical Department', NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'Pharmacy', 'Pharmacy Department', NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 'Laboratory', 'Lab Services', NULL, NOW()),
('550e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440001', 'Administration', 'Hospital Administration', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER PROFILES
-- ============================================

-- Insert test user profiles (these will be linked to auth.users)
INSERT INTO profiles (
  id,
  user_id,
  hospital_id,
  first_name,
  last_name,
  email,
  phone,
  department_id,
  is_staff,
  created_at,
  updated_at
) VALUES
-- Admin User
(
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003',
  '550e8400-e29b-41d4-a716-446655440001',
  'Admin',
  'User',
  'admin@testgeneral.com',
  '(555) 100-0001',
  '550e8400-e29b-41d4-a716-446655440105',
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
  '550e8400-e29b-41d4-a716-446655440101',
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
  '550e8400-e29b-41d4-a716-446655440100',
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
  '550e8400-e29b-41d4-a716-446655440105',
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
  '550e8400-e29b-41d4-a716-446655440103',
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
  '550e8400-e29b-41d4-a716-446655440104',
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
  NULL,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER ROLES
-- ============================================

-- Insert user roles
INSERT INTO user_roles (user_id, role, created_at) VALUES
('550e8400-e29b-41d4-a716-446655440003', 'admin', NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'doctor', NOW()),
('550e8400-e29b-41d4-a716-446655440007', 'nurse', NOW()),
('550e8400-e29b-41d4-a716-446655440009', 'receptionist', NOW()),
('550e8400-e29b-41d4-a716-446655440011', 'pharmacist', NOW()),
('550e8400-e29b-41d4-a716-446655440013', 'lab_tech', NOW()),
('550e8400-e29b-41d4-a716-446655440015', 'patient', NOW())
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- PATIENTS
-- ============================================

-- Insert patient records
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
),
-- Additional test patients
(
  '550e8400-e29b-41d4-a716-446655440017',
  '550e8400-e29b-41d4-a716-446655440001',
  NULL,
  'MRN002',
  'Alice',
  'Johnson',
  '1990-03-22',
  'Female',
  '(555) 200-0001',
  'alice.johnson@test.com',
  '789 Health Street, Test City, Test State 12345',
  'Bob Johnson',
  '(555) 200-0002',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440018',
  '550e8400-e29b-41d4-a716-446655440001',
  NULL,
  'MRN003',
  'Michael',
  'Brown',
  '1975-11-08',
  'Male',
  '(555) 200-0003',
  'michael.brown@test.com',
  '321 Care Lane, Test City, Test State 12345',
  'Sarah Brown',
  '(555) 200-0004',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- APPOINTMENTS
-- ============================================

-- Insert sample appointments
INSERT INTO appointments (
  id,
  hospital_id,
  patient_id,
  doctor_id,
  scheduled_date,
  status,
  type,
  notes,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440019',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440016',
  '550e8400-e29b-41d4-a716-446655440004',
  NOW() + INTERVAL '1 day',
  'scheduled',
  'follow_up',
  'Routine checkup',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440020',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440017',
  '550e8400-e29b-41d4-a716-446655440004',
  NOW() + INTERVAL '2 days',
  'confirmed',
  'consultation',
  'Initial consultation',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440021',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440018',
  '550e8400-e29b-41d4-a716-446655440004',
  NOW() + INTERVAL '3 days',
  'scheduled',
  'procedure',
  'Minor procedure',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PRESCRIPTIONS
-- ============================================

-- Insert sample prescriptions
INSERT INTO prescriptions (
  id,
  hospital_id,
  patient_id,
  doctor_id,
  pharmacist_id,
  medication_name,
  dosage,
  frequency,
  duration,
  status,
  notes,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440022',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440016',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440010',
  'Lisinopril',
  '10mg',
  'Once daily',
  30,
  'active',
  'For hypertension',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440023',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440017',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440010',
  'Metformin',
  '500mg',
  'Twice daily',
  90,
  'active',
  'For diabetes management',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- LAB ORDERS
-- ============================================

-- Insert sample lab orders
INSERT INTO lab_orders (
  id,
  hospital_id,
  patient_id,
  doctor_id,
  lab_tech_id,
  test_name,
  status,
  priority,
  notes,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440024',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440016',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440012',
  'Complete Blood Count',
  'completed',
  'routine',
  'Routine CBC',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440025',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440017',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440012',
  'Lipid Panel',
  'pending',
  'urgent',
  'Cardiac risk assessment',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- LAB RESULTS
-- ============================================

-- Insert sample lab results
INSERT INTO lab_results (
  id,
  lab_order_id,
  test_name,
  value,
  unit,
  reference_range,
  status,
  notes,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440026',
  '550e8400-e29b-41d4-a716-446655440024',
  'White Blood Cell Count',
  '7.2',
  'K/uL',
  '4.0-11.0',
  'normal',
  'Within normal range',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440027',
  '550e8400-e29b-41d4-a716-446655440024',
  'Hemoglobin',
  '14.1',
  'g/dL',
  '12.0-16.0',
  'normal',
  'Within normal range',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CONSULTATIONS
-- ============================================

-- Insert sample consultations
INSERT INTO consultations (
  id,
  hospital_id,
  patient_id,
  doctor_id,
  appointment_id,
  chief_complaint,
  history_of_present_illness,
  physical_exam,
  assessment,
  plan,
  status,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440028',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440016',
  '550e8400-e29b-41d4-a716-446655440004',
  '550e8400-e29b-41d4-a716-446655440019',
  'Hypertension follow-up',
  'Patient reports good medication compliance. BP has been well controlled.',
  'BP: 128/82, HR: 72, RR: 16, Temp: 98.6F. No acute distress.',
  'Well-controlled hypertension',
  'Continue current medication regimen. Follow up in 3 months.',
  'completed',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INVOICES
-- ============================================

-- Insert sample invoices
INSERT INTO invoices (
  id,
  hospital_id,
  patient_id,
  total_amount,
  paid_amount,
  status,
  due_date,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440029',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440016',
  150.00,
  150.00,
  'paid',
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
),
(
  '550e8400-e29b-41d4-a716-446655440030',
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440017',
  200.00,
  0.00,
  'pending',
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PAYMENTS
-- ============================================

-- Insert sample payments
INSERT INTO payments (
  id,
  invoice_id,
  amount,
  payment_method,
  status,
  transaction_id,
  created_at,
  updated_at
) VALUES
(
  '550e8400-e29b-41d4-a716-446655440031',
  '550e8400-e29b-41d4-a716-446655440029',
  150.00,
  'insurance',
  'completed',
  'TXN_001',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Test data setup completed successfully!';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 1 hospital';
    RAISE NOTICE '  - 6 departments';
    RAISE NOTICE '  - 7 user profiles';
    RAISE NOTICE '  - 7 user roles';
    RAISE NOTICE '  - 3 patients';
    RAISE NOTICE '  - 3 appointments';
    RAISE NOTICE '  - 2 prescriptions';
    RAISE NOTICE '  - 2 lab orders';
    RAISE NOTICE '  - 2 lab results';
    RAISE NOTICE '  - 1 consultation';
    RAISE NOTICE '  - 2 invoices';
    RAISE NOTICE '  - 1 payment';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Create auth users in Supabase with the same UUIDs';
    RAISE NOTICE '2. Run authentication tests';
END $$;