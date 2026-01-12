# Scripts Directory

This directory contains SQL scripts for setting up test users and data in CareSync HIMS.

---

## 📁 Files

### 1. `create-test-users.sql`
**Purpose**: Creates 7 test users with proper roles and permissions

**What it does**:
- Creates Test Hospital
- Creates 7 user profiles (Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Tech, Patient)
- Assigns roles to each user
- Creates patient record for patient user

**Run order**: FIRST (after creating auth users in Supabase)

**Dependencies**: 
- Auth users must be created in Supabase Dashboard first
- Update User IDs in script before running

---

### 2. `seed-test-data.sql`
**Purpose**: Populates realistic test data for all major modules

**What it does**:
- Creates 10 test patients
- Creates 80 appointments (30 future, 50 past)
- Creates 30 consultations with diagnoses
- Creates 50 vitals records
- Creates 50 prescriptions
- Creates 20 lab orders
- Creates 10 inventory items
- Creates 30 billing invoices
- Creates 10 queue entries

**Run order**: SECOND (after create-test-users.sql)

**Dependencies**: 
- Test users must exist
- Test hospital must exist

---

## 🚀 Quick Start

### Step 1: Create Auth Users
Go to Supabase Dashboard → Authentication → Users and create:
- admin@test.com / Admin123!
- doctor@test.com / Doctor123!
- nurse@test.com / Nurse123!
- receptionist@test.com / Receptionist123!
- pharmacist@test.com / Pharmacist123!
- labtech@test.com / LabTech123!
- patient@test.com / Patient123!

### Step 2: Update User IDs
Open `create-test-users.sql` and replace placeholder UUIDs with actual User IDs from Supabase.

### Step 3: Run Scripts
1. Run `create-test-users.sql` in Supabase SQL Editor
2. Run `seed-test-data.sql` in Supabase SQL Editor

### Step 4: Verify
Login with each test user and verify data is visible.

---

## 📖 Documentation

- **Full Setup Guide**: `../SETUP_TEST_DATA.md`
- **Quick Reference**: `../QUICK_SETUP_REFERENCE.md`
- **Credentials**: `../TEST_CREDENTIALS.md`
- **Completion Summary**: `../TEST_SETUP_COMPLETE.md`

---

## ⚠️ Important Notes

- **Test Only**: These scripts are for testing purposes only
- **Never in Production**: Do not run these scripts in production environment
- **Order Matters**: Run create-test-users.sql BEFORE seed-test-data.sql
- **Auth First**: Create auth users in Supabase BEFORE running SQL scripts

---

## 🔍 Verification Queries

After running scripts, verify with:

```sql
-- Check users
SELECT email, (SELECT role FROM user_roles WHERE user_id = profiles.user_id LIMIT 1) as role
FROM profiles WHERE email LIKE '%@test.com';

-- Check data counts
SELECT 
  (SELECT COUNT(*) FROM patients WHERE hospital_id = '00000000-0000-0000-0000-000000000001') as patients,
  (SELECT COUNT(*) FROM appointments WHERE hospital_id = '00000000-0000-0000-0000-000000000001') as appointments,
  (SELECT COUNT(*) FROM consultations WHERE hospital_id = '00000000-0000-0000-0000-000000000001') as consultations,
  (SELECT COUNT(*) FROM prescriptions WHERE hospital_id = '00000000-0000-0000-0000-000000000001') as prescriptions;
```

---

**Last Updated**: January 2026
