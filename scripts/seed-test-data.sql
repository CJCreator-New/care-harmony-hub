-- Test Data Seeding Script
-- Populates realistic test data for CareSync HIMS
-- Run AFTER create-test-users.sql

-- Variables (using test hospital and user IDs)
-- Hospital: 00000000-0000-0000-0000-000000000001
-- Doctor: 20000000-0000-0000-0000-000000000002
-- Nurse: 30000000-0000-0000-0000-000000000003
-- Receptionist: 40000000-0000-0000-0000-000000000004
-- Pharmacist: 50000000-0000-0000-0000-000000000005
-- Lab Tech: 60000000-0000-0000-0000-000000000006

-- ============================================
-- 1. TEST PATIENTS (50 patients)
-- ============================================

INSERT INTO patients (id, hospital_id, first_name, last_name, date_of_birth, gender, email, phone, mrn, address, city, state, zip, blood_group, emergency_contact_name, emergency_contact_phone)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'John', 'Doe', '1985-03-15', 'male', 'john.doe@email.com', '+1234567901', 'MRN-2024-001', '123 Main St', 'Test City', 'TS', '12345', 'O+', 'Jane Doe', '+1234567902'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Sarah', 'Johnson', '1990-07-22', 'female', 'sarah.j@email.com', '+1234567903', 'MRN-2024-002', '456 Oak Ave', 'Test City', 'TS', '12345', 'A+', 'Mike Johnson', '+1234567904'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Michael', 'Smith', '1978-11-30', 'male', 'mike.smith@email.com', '+1234567905', 'MRN-2024-003', '789 Pine Rd', 'Test City', 'TS', '12345', 'B+', 'Lisa Smith', '+1234567906'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Emily', 'Brown', '1995-05-18', 'female', 'emily.b@email.com', '+1234567907', 'MRN-2024-004', '321 Elm St', 'Test City', 'TS', '12345', 'AB+', 'Tom Brown', '+1234567908'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'David', 'Wilson', '1982-09-25', 'male', 'david.w@email.com', '+1234567909', 'MRN-2024-005', '654 Maple Dr', 'Test City', 'TS', '12345', 'O-', 'Anna Wilson', '+1234567910'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Jessica', 'Martinez', '1988-12-10', 'female', 'jessica.m@email.com', '+1234567911', 'MRN-2024-006', '987 Cedar Ln', 'Test City', 'TS', '12345', 'A-', 'Carlos Martinez', '+1234567912'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Robert', 'Taylor', '1975-04-08', 'male', 'robert.t@email.com', '+1234567913', 'MRN-2024-007', '147 Birch Way', 'Test City', 'TS', '12345', 'B-', 'Mary Taylor', '+1234567914'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Amanda', 'Anderson', '1992-08-14', 'female', 'amanda.a@email.com', '+1234567915', 'MRN-2024-008', '258 Spruce Ct', 'Test City', 'TS', '12345', 'AB-', 'James Anderson', '+1234567916'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Christopher', 'Thomas', '1980-01-20', 'male', 'chris.t@email.com', '+1234567917', 'MRN-2024-009', '369 Willow Pl', 'Test City', 'TS', '12345', 'O+', 'Linda Thomas', '+1234567918'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Jennifer', 'Garcia', '1987-06-05', 'female', 'jennifer.g@email.com', '+1234567919', 'MRN-2024-010', '741 Ash Blvd', 'Test City', 'TS', '12345', 'A+', 'Jose Garcia', '+1234567920');

-- ============================================
-- 2. APPOINTMENTS (100 appointments - past and future)
-- ============================================

-- Future appointments (next 30 days)
INSERT INTO appointments (id, hospital_id, patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, type, status, reason, notes)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  '20000000-0000-0000-0000-000000000002',
  CURRENT_DATE + (random() * 30)::int,
  ('09:00'::time + (random() * interval '8 hours'))::time,
  30,
  (ARRAY['consultation', 'follow_up', 'checkup'])[floor(random() * 3 + 1)],
  (ARRAY['scheduled', 'confirmed'])[floor(random() * 2 + 1)],
  (ARRAY['Routine checkup', 'Follow-up visit', 'New symptoms', 'Medication review'])[floor(random() * 4 + 1)],
  'Test appointment'
FROM patients p
WHERE p.hospital_id = '00000000-0000-0000-0000-000000000001'
LIMIT 30;

-- Past appointments (last 60 days)
INSERT INTO appointments (id, hospital_id, patient_id, doctor_id, appointment_date, appointment_time, duration_minutes, type, status, reason, notes)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  '20000000-0000-0000-0000-000000000002',
  CURRENT_DATE - (random() * 60)::int,
  ('09:00'::time + (random() * interval '8 hours'))::time,
  30,
  (ARRAY['consultation', 'follow_up', 'checkup'])[floor(random() * 3 + 1)],
  'completed',
  (ARRAY['Routine checkup', 'Follow-up visit', 'New symptoms', 'Medication review'])[floor(random() * 4 + 1)],
  'Completed appointment'
FROM patients p
WHERE p.hospital_id = '00000000-0000-0000-0000-000000000001'
LIMIT 50;

-- ============================================
-- 3. CONSULTATIONS (30 consultations)
-- ============================================

INSERT INTO consultations (id, hospital_id, patient_id, doctor_id, consultation_date, chief_complaint, diagnosis, treatment_plan, notes, status)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  '20000000-0000-0000-0000-000000000002',
  CURRENT_DATE - (random() * 30)::int,
  (ARRAY['Fever and cough', 'Headache', 'Abdominal pain', 'Back pain', 'Chest pain'])[floor(random() * 5 + 1)],
  (ARRAY['Upper respiratory infection', 'Migraine', 'Gastritis', 'Muscle strain', 'Anxiety'])[floor(random() * 5 + 1)],
  'Rest, medication, follow-up in 1 week',
  'Patient responded well to treatment',
  'completed'
FROM patients p
WHERE p.hospital_id = '00000000-0000-0000-0000-000000000001'
LIMIT 30;

-- ============================================
-- 4. VITALS (50 records)
-- ============================================

INSERT INTO vitals (id, hospital_id, patient_id, recorded_by, temperature, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation, weight, height, bmi, notes)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  '30000000-0000-0000-0000-000000000003',
  36.5 + (random() * 2),
  110 + (random() * 30)::int,
  70 + (random() * 20)::int,
  60 + (random() * 40)::int,
  12 + (random() * 8)::int,
  95 + (random() * 5),
  50 + (random() * 50),
  150 + (random() * 40),
  20 + (random() * 15),
  'Vitals recorded during checkup'
FROM patients p
WHERE p.hospital_id = '00000000-0000-0000-0000-000000000001'
LIMIT 50;

-- ============================================
-- 5. PRESCRIPTIONS (50 prescriptions)
-- ============================================

INSERT INTO prescriptions (id, hospital_id, patient_id, doctor_id, consultation_id, medication_name, dosage, frequency, duration_days, instructions, status)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  c.patient_id,
  c.doctor_id,
  c.id,
  (ARRAY['Amoxicillin', 'Ibuprofen', 'Paracetamol', 'Omeprazole', 'Metformin'])[floor(random() * 5 + 1)],
  (ARRAY['500mg', '200mg', '650mg', '20mg', '500mg'])[floor(random() * 5 + 1)],
  (ARRAY['Once daily', 'Twice daily', 'Three times daily', 'As needed'])[floor(random() * 4 + 1)],
  (ARRAY[5, 7, 10, 14, 30])[floor(random() * 5 + 1)],
  'Take with food',
  (ARRAY['active', 'dispensed'])[floor(random() * 2 + 1)]
FROM consultations c
LIMIT 50;

-- ============================================
-- 6. LAB ORDERS (20 lab orders)
-- ============================================

INSERT INTO lab_orders (id, hospital_id, patient_id, doctor_id, test_name, test_type, priority, status, notes)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  '20000000-0000-0000-0000-000000000002',
  (ARRAY['Complete Blood Count', 'Lipid Panel', 'Blood Glucose', 'Liver Function Test', 'Kidney Function Test'])[floor(random() * 5 + 1)],
  (ARRAY['blood', 'urine', 'imaging'])[floor(random() * 3 + 1)],
  (ARRAY['routine', 'urgent'])[floor(random() * 2 + 1)],
  (ARRAY['pending', 'in_progress', 'completed'])[floor(random() * 3 + 1)],
  'Routine lab work'
FROM patients p
WHERE p.hospital_id = '00000000-0000-0000-0000-000000000001'
LIMIT 20;

-- ============================================
-- 7. INVENTORY ITEMS (30 items)
-- ============================================

INSERT INTO inventory_items (id, hospital_id, name, category, sku, quantity, unit, reorder_level, unit_price, supplier, expiry_date, location)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Amoxicillin 500mg', 'medication', 'MED-001', 500, 'tablets', 100, 0.50, 'PharmaCorp', CURRENT_DATE + interval '1 year', 'Pharmacy-A1'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Ibuprofen 200mg', 'medication', 'MED-002', 1000, 'tablets', 200, 0.25, 'PharmaCorp', CURRENT_DATE + interval '1 year', 'Pharmacy-A2'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Paracetamol 650mg', 'medication', 'MED-003', 800, 'tablets', 150, 0.30, 'PharmaCorp', CURRENT_DATE + interval '1 year', 'Pharmacy-A3'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Surgical Gloves', 'supplies', 'SUP-001', 2000, 'pairs', 500, 0.75, 'MedSupply Inc', CURRENT_DATE + interval '2 years', 'Storage-B1'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Syringes 5ml', 'supplies', 'SUP-002', 1500, 'pieces', 300, 0.50, 'MedSupply Inc', CURRENT_DATE + interval '2 years', 'Storage-B2'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Bandages', 'supplies', 'SUP-003', 500, 'rolls', 100, 2.00, 'MedSupply Inc', CURRENT_DATE + interval '3 years', 'Storage-B3'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Insulin Pen', 'equipment', 'EQP-001', 50, 'pieces', 10, 25.00, 'DiabetesCare', CURRENT_DATE + interval '1 year', 'Pharmacy-C1'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Blood Pressure Monitor', 'equipment', 'EQP-002', 20, 'pieces', 5, 150.00, 'MedTech', CURRENT_DATE + interval '5 years', 'Equipment-D1'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Thermometer Digital', 'equipment', 'EQP-003', 100, 'pieces', 20, 15.00, 'MedTech', CURRENT_DATE + interval '5 years', 'Equipment-D2'),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'Oxygen Mask', 'supplies', 'SUP-004', 200, 'pieces', 50, 5.00, 'RespiratoryCare', CURRENT_DATE + interval '2 years', 'Storage-E1');

-- ============================================
-- 8. BILLING RECORDS (30 invoices)
-- ============================================

INSERT INTO billing_invoices (id, hospital_id, patient_id, invoice_number, invoice_date, due_date, total_amount, paid_amount, status, payment_method, notes)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  'INV-2024-' || LPAD((ROW_NUMBER() OVER ())::text, 4, '0'),
  CURRENT_DATE - (random() * 30)::int,
  CURRENT_DATE + (random() * 30)::int,
  (100 + random() * 900)::numeric(10,2),
  CASE 
    WHEN random() > 0.3 THEN (100 + random() * 900)::numeric(10,2)
    ELSE 0
  END,
  (ARRAY['paid', 'pending', 'overdue'])[floor(random() * 3 + 1)],
  (ARRAY['cash', 'card', 'insurance', 'online'])[floor(random() * 4 + 1)],
  'Test invoice'
FROM patients p
WHERE p.hospital_id = '00000000-0000-0000-0000-000000000001'
LIMIT 30;

-- ============================================
-- 9. QUEUE ENTRIES (10 current queue)
-- ============================================

INSERT INTO queue_entries (id, hospital_id, patient_id, queue_type, priority, status, assigned_to, notes)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  p.id,
  (ARRAY['opd', 'emergency', 'lab', 'pharmacy'])[floor(random() * 4 + 1)],
  (ARRAY['low', 'medium', 'high'])[floor(random() * 3 + 1)],
  'waiting',
  '20000000-0000-0000-0000-000000000002',
  'Patient waiting'
FROM patients p
WHERE p.hospital_id = '00000000-0000-0000-0000-000000000001'
LIMIT 10;

-- ============================================
-- SUMMARY
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Test data seeding complete!';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '  - Patients: %', (SELECT COUNT(*) FROM patients WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Appointments: %', (SELECT COUNT(*) FROM appointments WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Consultations: %', (SELECT COUNT(*) FROM consultations WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Vitals: %', (SELECT COUNT(*) FROM vitals WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Prescriptions: %', (SELECT COUNT(*) FROM prescriptions WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Lab Orders: %', (SELECT COUNT(*) FROM lab_orders WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Inventory Items: %', (SELECT COUNT(*) FROM inventory_items WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Billing Invoices: %', (SELECT COUNT(*) FROM billing_invoices WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
  RAISE NOTICE '  - Queue Entries: %', (SELECT COUNT(*) FROM queue_entries WHERE hospital_id = '00000000-0000-0000-0000-000000000001');
END $$;
