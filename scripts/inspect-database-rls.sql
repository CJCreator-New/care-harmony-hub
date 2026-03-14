-- Database Inspection Script for RLS & CareSync Setup Verification
-- Run on: Local Supabase PostgreSQL or production database
-- Purpose: Verify hospital_id scoping, RLS policies, and critical table integrity

-- ============================================================
-- 1. Check RLS Status on All 46 Tables
-- ============================================================

SELECT
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables t2
      WHERE t2.table_name = t.table_name
      AND t2.table_schema = 'public'
      AND EXISTS (
        SELECT 1 FROM pg_class pc
        JOIN pg_namespace pn ON pc.relnamespace = pn.oid
        WHERE pc.relname = t.table_name
        AND pn.nspname = 'public'
        AND pc.relrowsecurity = true
      )
    ) THEN 'ENABLED ✅'
    ELSE 'DISABLED ❌'
  END AS rls_status
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected Output (should show all 46 tables with RLS ENABLED ✅):
-- | table_name              | rls_status      |
-- |-------------------------|-----------------|
-- | activity_logs           | ENABLED ✅      |
-- | appointments            | ENABLED ✅      |
-- | consultations           | ENABLED ✅      |
-- | ... (44 more tables)    | ENABLED ✅      |

---

-- ============================================================
-- 2. Verify hospital_id Foreign Key Exists on Critical Tables
-- ============================================================

SELECT
  kcu.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  CASE 
    WHEN kcu.column_name = 'hospital_id' 
         AND ccu.table_name = 'hospitals' 
         AND ccu.column_name = 'id' 
    THEN 'CORRECT ✅'
    ELSE 'CHECK ⚠️'
  END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND kcu.column_name = 'hospital_id'
ORDER BY kcu.table_name;

-- Expected Output:
-- | table_name      | column_name | foreign_table | foreign_column | status     |
-- |-----------------|-------------|---------------|----------------|------------|
-- | appointments    | hospital_id | hospitals     | id             | CORRECT ✅ |
-- | consultations   | hospital_id | hospitals     | id             | CORRECT ✅ |
-- | invoices        | hospital_id | hospitals     | id             | CORRECT ✅ |
-- ... (43 more tables)

---

-- ============================================================
-- 3. Count Hospital-Scoped Tables (should be 46/46)
-- ============================================================

SELECT
  COUNT(DISTINCT tc.table_name) AS total_tables,
  COUNT(DISTINCT CASE 
    WHEN kcu.column_name = 'hospital_id' THEN tc.table_name
  END) AS hospital_scoped_tables,
  ROUND(
    COUNT(DISTINCT CASE 
      WHEN kcu.column_name = 'hospital_id' THEN tc.table_name
    END) * 100.0 / COUNT(DISTINCT tc.table_name), 
    1
  ) AS percentage_scoped
FROM information_schema.table_constraints AS tc
LEFT JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  );

-- Expected Output:
-- | total_tables | hospital_scoped_tables | percentage_scoped |
-- |--------------|------------------------|-------------------|
-- | 46           | 46                     | 100.0             |

---

-- ============================================================
-- 4. List All RLS Policies (Sample)
-- ============================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual AS policy_condition,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname
LIMIT 20;

-- Expected Output (showing first 20 policies):
-- | schemaname | tablename    | policyname                              | permissive | roles          | qual              | with_check |
-- |------------|--------------|----------------------------------------|------------|----------------|-------------------|------------|
-- | public     | patients     | Hospital staff can read patients        | PERMISSIVE | authenticated  | (hospital_scoped) | -          |
-- | public     | patients     | Doctors can update patient medical...   | PERMISSIVE | authenticated  | (doctor + hosp)   | (doctor) |
-- ... (18 more)

---

-- ============================================================
-- 5. Test Hospital Isolation - RLS in Action
-- ============================================================

-- Simulating: User from Hospital A tries to see Hospital B's patients
-- This query shows how RLS filters data

-- First, identify test hospitals
SELECT id, name FROM hospitals LIMIT 5;

-- Example: For hospital_id = 'hosp-001', count patients visible
SELECT
  hospital_id,
  COUNT(*) as patient_count
FROM patients
WHERE hospital_id IN (
  SELECT id FROM hospitals LIMIT 2
)
GROUP BY hospital_id
ORDER BY hospital_id;

-- Expected Output (for 2 different hospitals):
-- | hospital_id | patient_count |
-- |-------------|---------------|
-- | hosp-001    | 50            |
-- | hosp-002    | 35            |

-- Note: If a doctor from hosp-001 runs this query, they should ONLY see:
-- | hospital_id | patient_count |
-- |-------------|---------------|
-- | hosp-001    | 50            |

---

-- ============================================================
-- 6. Verify Critical Table Structure (Top 15 Tables)
-- ============================================================

-- 6a. Patients Table Structure
\d+ patients

-- Expected columns:
-- | Column Name           | Type    | Constraints |
-- |-----------------------|---------|-------------|
-- | id                    | UUID    | PK          |
-- | hospital_id          | UUID    | FK          |
-- | mrn                  | TEXT    | UNIQUE      |
-- | first_name           | TEXT    |             |
-- | last_name            | TEXT    |             |
-- | date_of_birth        | DATE    |             |
-- | allergies            | TEXT[]  |             |
-- | chronic_conditions   | TEXT[]  |             |
-- | current_medications  | JSONB   |             |
-- | insurance_provider   | TEXT    |             |
-- | created_at           | TIMESTAMP | DEFAULT    |
-- | updated_at           | TIMESTAMP | DEFAULT    |

-- 6b. Appointments Table
\d+ appointments

-- 6c. Consultations Table
\d+ consultations

-- 6d. Prescriptions Table
\d+ prescriptions

-- 6e. Lab Orders Table
\d+ lab_orders

-- 6f. Invoices Table
\d+ invoices

---

-- ============================================================
-- 7. Check Indexes for Performance
-- ============================================================

SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('patients', 'appointments', 'consultations', 
                    'prescriptions', 'lab_orders', 'invoices')
ORDER BY tablename, indexname;

-- Expected Output (should have hospital_id indexes on each table):
-- | schemaname | tablename      | indexname                       | indexdef                              |
-- |------------|----------------|---------------------------------|---------------------------------------|
-- | public     | patients       | idx_patients_hospital           | CREATE INDEX idx_...ON patients...   |
-- | public     | appointments   | idx_appointments_hospital       | CREATE INDEX idx_...ON appointments...|
-- ... (etc)

---

-- ============================================================
-- 8. Count Critical Master Data
-- ============================================================

SELECT
  'Patient Records' as data_type,
  COUNT(*) as count
FROM patients

UNION ALL

SELECT
  'Appointments' as data_type,
  COUNT(*) as count
FROM appointments

UNION ALL

SELECT
  'Consultations' as data_type,
  COUNT(*) as count
FROM consultations

UNION ALL

SELECT
  'Prescriptions' as data_type,
  COUNT(*) as count
FROM prescriptions

UNION ALL

SELECT
  'Lab Orders' as data_type,
  COUNT(*) as count
FROM lab_orders

UNION ALL

SELECT
  'Invoices' as data_type,
  COUNT(*) as count
FROM invoices

UNION ALL

SELECT
  'Audit Logs (Activity)' as data_type,
  COUNT(*) as count
FROM activity_logs;

-- Expected Output (after seeding test data):
-- | data_type                | count |
-- |--------------------------|-------|
-- | Patient Records          | 50+   |
-- | Appointments             | 20+   |
-- | Consultations            | 15+   |
-- | Prescriptions            | 30+   |
-- | Lab Orders               | 25+   |
-- | Invoices                 | 20+   |
-- | Audit Logs (Activity)    | 100+  |

---

-- ============================================================
-- 9. Verify Encryption Metadata (HIPAA Compliance)
-- ============================================================

-- Check if encryption_metadata is recorded for sensitive fields
SELECT
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%encrypted%' OR
    column_name LIKE '%ssn%' OR
    column_name LIKE '%credit_card%'
  )
ORDER BY table_name, column_name;

-- Sample query: Check if patient SSN has encryption metadata
SELECT
  id,
  ssn_encrypted,
  encryption_metadata
FROM patients
WHERE ssn_encrypted IS NOT NULL
LIMIT 1;

-- Expected Output:
-- | id                              | ssn_encrypted        | encryption_metadata                                |
-- |----------------------------------|----------------------|-----------------------------------------------------|
-- | 550e8400-e29b-41d4-a716-446655 | [ENCRYPTED]          | {"encrypted_with":"AES-256","key_version":1,...}  |

---

-- ============================================================
-- 10. List Test Users & Roles
-- ============================================================

SELECT
  p.email,
  p.first_name || ' ' || p.last_name as full_name,
  STRING_AGG(ur.role, ', ') as roles,
  p.hospital_id,
  p.created_at
FROM profiles p
LEFT JOIN user_roles ur ON p.user_id = ur.user_id
WHERE p.email LIKE '%test%' OR p.email LIKE '%@testgeneral%'
GROUP BY p.id, p.email, p.first_name, p.last_name, p.hospital_id, p.created_at
ORDER BY p.created_at DESC;

-- Expected Output (after running npm run test:create-users):
-- | email                    | full_name         | roles        | hospital_id | created_at |
-- |--------------------------|-------------------|--------------|-------------|-----------|
-- | admin@testgeneral.com    | Admin User        | admin        | hosp-001... | 2026-03... |
-- | doctor@testgeneral.com   | Dr. Jane Smith    | doctor       | hosp-001... | 2026-03... |
-- | nurse@testgeneral.com    | Nancy Nurse       | nurse        | hosp-001... | 2026-03... |
-- | pharmacy@testgeneral.com | Phil Pharmacist   | pharmacist   | hosp-001... | 2026-03... |
-- | lab@testgeneral.com      | Larry LabTech     | lab_technician| hosp-001... | 2026-03... |
-- | reception@testgeneral.com| Rachel Receptionist| receptionist| hosp-001... | 2026-03... |
-- | patient@testgeneral.com  | John Patient      | patient      | hosp-001... | 2026-03... |

---

-- ============================================================
-- 11. Audit Trail Verification - Recent Changes
-- ============================================================

SELECT
  created_at,
  user_id,
  action_type,
  entity_type,
  entity_id,
  severity,
  CASE 
    WHEN old_values IS NULL THEN 'New Record'
    WHEN new_values IS NULL THEN 'Deleted'
    ELSE 'Updated'
  END AS change_type
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- Expected Output (recent audit entries):
-- | created_at              | user_id | action_type      | entity_type   | severity | change_type |
-- |-------------------------|---------|------------------|---------------|----------|-------------|
-- | 2026-03-13 10:45:23 UTC | user123 | PATIENT_CREATE   | patients      | info     | New Record  |
-- | 2026-03-13 10:42:15 UTC | user456 | PRESCRIPTION_VER  | prescriptions | info     | Updated    |
-- ... (18 more recent changes)

---

-- ============================================================
-- 12. Quick Health Check - All 46 Tables Exist
-- ============================================================

SELECT
  COUNT(*) as table_count,
  CASE
    WHEN COUNT(*) = 46 THEN 'HEALTHY ✅ (46 tables)'
    WHEN COUNT(*) > 40 THEN 'WARNING ⚠️ (missing some tables)'
    ELSE 'CRITICAL ❌ (missing many tables)'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Expected Output:
-- | table_count | status              |
-- |-------------|---------------------|
-- | 46          | HEALTHY ✅ (46 tables)|

---

-- ============================================================
-- 13. Check Function Availability (Security Helpers)
-- ============================================================

SELECT
  routine_name,
  routine_type,
  CASE 
    WHEN routine_name IN (
      'user_belongs_to_hospital',
      'has_role',
      'user_hospital_id'
    ) THEN 'REQUIRED ✅'
    ELSE 'OPTIONAL'
  END as importance
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%hospital%'
  OR routine_name LIKE '%role%'
ORDER BY routine_name;

-- Expected Output:
-- | routine_name                | routine_type | importance   |
-- |-----------------------------|--------------|--------------|
-- | user_belongs_to_hospital    | FUNCTION     | REQUIRED ✅  |
-- | has_role                    | FUNCTION     | REQUIRED ✅  |
-- | user_hospital_id            | FUNCTION     | REQUIRED ✅  |

---

-- ============================================================
-- USAGE GUIDE
-- ============================================================

-- Run this entire script to get a complete health report:
-- psql -U postgres -d caresync -f inspect-database-rls.sql

-- Or run individual sections in psql:
-- psql -U postgres -d caresync
-- caresync=# \i inspect-database-rls.sql

-- For production databases:
-- psql postgresql://user:password@prod-db.com:5432/caresync -f inspect-database-rls.sql

-- For Supabase:
-- psql postgresql://postgres:[YOUR_PASSWORD]@wmxtzkrkscjwixafumym.supabase.co:5432/postgres -f inspect-database-rls.sql

---

-- ============================================================
-- EXPECTED RESULTS CHECKLIST
-- ============================================================

-- After running this script, you should see:
-- ✅ All 46 tables with RLS ENABLED
-- ✅ All 46 tables with hospital_id foreign key
-- ✅ 100% of tables are hospital-scoped
-- ✅ 30+ RLS policies across tables
-- ✅ Indexes on critical tables (patients, appointments, prescriptions, lab_orders, invoices)
-- ✅ 50+ patient records (after seeding)
-- ✅ 7 test users with appropriate roles
-- ✅ 50+ audit log entries
-- ✅ Required security functions exist: user_belongs_to_hospital(), has_role()

-- If ANY check shows ❌ or missing data:
-- Contact DevOps team or check database migrations status
