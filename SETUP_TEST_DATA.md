# Test Users & Data Setup Guide

**Purpose**: Complete guide to set up test users and populate realistic test data in CareSync HIMS

---

## 📋 Prerequisites

- Supabase project created and configured
- Database migrations applied
- Admin access to Supabase Dashboard

---

## 🚀 Setup Steps

### Step 1: Create Auth Users in Supabase

You need to create 7 auth users in Supabase Dashboard:

1. **Go to**: Supabase Dashboard → Authentication → Users
2. **Click**: "Add User" → "Create new user"
3. **Create each user** with these credentials:

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | Admin123! | Admin |
| doctor@test.com | Doctor123! | Doctor |
| nurse@test.com | Nurse123! | Nurse |
| receptionist@test.com | Receptionist123! | Receptionist |
| pharmacist@test.com | Pharmacist123! | Pharmacist |
| labtech@test.com | LabTech123! | Lab Technician |
| patient@test.com | Patient123! | Patient |

**Important**: 
- ✅ Check "Auto Confirm User" to skip email verification
- ✅ Note down the User ID for each user (you'll need these)

---

### Step 2: Update SQL Script with User IDs

After creating auth users, you need to update the SQL script with actual User IDs:

1. **Open**: `scripts/create-test-users.sql`
2. **Replace** the placeholder UUIDs with actual User IDs from Supabase:

```sql
-- Example: Replace this
'10000000-0000-0000-0000-000000000001'  -- Admin user_id

-- With actual UUID from Supabase
'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  -- Admin user_id
```

**User ID Mapping**:
- Admin: Replace `10000000-0000-0000-0000-000000000001`
- Doctor: Replace `20000000-0000-0000-0000-000000000002`
- Nurse: Replace `30000000-0000-0000-0000-000000000003`
- Receptionist: Replace `40000000-0000-0000-0000-000000000004`
- Pharmacist: Replace `50000000-0000-0000-0000-000000000005`
- Lab Tech: Replace `60000000-0000-0000-0000-000000000006`
- Patient: Replace `70000000-0000-0000-0000-000000000007`

---

### Step 3: Run User Creation Script

1. **Go to**: Supabase Dashboard → SQL Editor
2. **Click**: "New Query"
3. **Copy** entire content from `scripts/create-test-users.sql`
4. **Paste** into SQL Editor
5. **Click**: "Run" (or press Ctrl+Enter)

**Expected Output**:
```
✅ Test hospital created
✅ 7 user profiles created
✅ 7 role assignments created
✅ 1 patient record created
```

---

### Step 4: Run Test Data Seeding Script

1. **Go to**: Supabase Dashboard → SQL Editor
2. **Click**: "New Query"
3. **Copy** entire content from `scripts/seed-test-data.sql`
4. **Paste** into SQL Editor
5. **Click**: "Run" (or press Ctrl+Enter)

**Expected Output**:
```
✅ Test data seeding complete!
📊 Summary:
  - Patients: 10
  - Appointments: 80
  - Consultations: 30
  - Vitals: 50
  - Prescriptions: 50
  - Lab Orders: 20
  - Inventory Items: 10
  - Billing Invoices: 30
  - Queue Entries: 10
```

---

### Step 5: Verify Setup

#### Test Login for Each Role

1. **Admin** (admin@test.com / Admin123!)
   - ✅ Should see all modules in sidebar
   - ✅ Can access Billing, Reports, Staff Management
   - ✅ Dashboard shows admin metrics

2. **Doctor** (doctor@test.com / Doctor123!)
   - ✅ Can access Patients, Consultations, Prescriptions
   - ✅ Can see appointments and lab orders
   - ✅ Cannot access Billing or Reports

3. **Nurse** (nurse@test.com / Nurse123!)
   - ✅ Can access Patients (read), Queue, Vitals
   - ✅ Can view Inventory (read-only)
   - ✅ Cannot edit inventory or access billing

4. **Receptionist** (receptionist@test.com / Receptionist123!)
   - ✅ Can register patients and schedule appointments
   - ✅ Can manage queue
   - ✅ Can view billing (read-only)

5. **Pharmacist** (pharmacist@test.com / Pharmacist123!)
   - ✅ Can access Pharmacy and Prescriptions
   - ✅ Can manage inventory
   - ✅ Can dispense medications

6. **Lab Tech** (labtech@test.com / LabTech123!)
   - ✅ Can access Laboratory and Lab Orders
   - ✅ Can process samples and enter results
   - ✅ Cannot access pharmacy or billing

7. **Patient** (patient@test.com / Patient123!)
   - ✅ Can access Patient Portal
   - ✅ Can view own appointments and prescriptions
   - ✅ Cannot access admin features

---

## 🔍 Verification Queries

Run these queries in Supabase SQL Editor to verify data:

```sql
-- Check test users
SELECT email, (SELECT role FROM user_roles WHERE user_id = profiles.user_id LIMIT 1) as role
FROM profiles
WHERE email LIKE '%@test.com'
ORDER BY email;

-- Check test patients
SELECT COUNT(*) as patient_count FROM patients 
WHERE hospital_id = '00000000-0000-0000-0000-000000000001';

-- Check appointments
SELECT status, COUNT(*) as count FROM appointments 
WHERE hospital_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status;

-- Check prescriptions
SELECT status, COUNT(*) as count FROM prescriptions 
WHERE hospital_id = '00000000-0000-0000-0000-000000000001'
GROUP BY status;

-- Check inventory
SELECT category, COUNT(*) as count FROM inventory_items 
WHERE hospital_id = '00000000-0000-0000-0000-000000000001'
GROUP BY category;
```

---

## 🐛 Troubleshooting

### Issue: "User already exists"
**Solution**: Users were already created. Skip Step 1 or delete existing users first.

### Issue: "Foreign key violation"
**Solution**: Make sure auth users are created BEFORE running SQL scripts.

### Issue: "Permission denied"
**Solution**: Check RLS policies are properly configured. Run security hardening migration.

### Issue: "Cannot login"
**Solution**: 
- Verify email is confirmed in Supabase Auth
- Check password is correct (case-sensitive)
- Clear browser cache and try again

### Issue: "Wrong role displayed"
**Solution**:
- Check user_roles table for correct assignment
- Verify hospital_id matches
- Re-run create-test-users.sql script

---

## 📊 Test Data Summary

After successful setup, you'll have:

### Users (7)
- 1 Admin
- 1 Doctor  
- 1 Nurse
- 1 Receptionist
- 1 Pharmacist
- 1 Lab Technician
- 1 Patient

### Clinical Data
- **10 Patients** with complete profiles
- **80 Appointments** (30 future, 50 past)
- **30 Consultations** with diagnoses
- **50 Vitals** records
- **50 Prescriptions** (active and dispensed)
- **20 Lab Orders** (various statuses)

### Operational Data
- **10 Inventory Items** (medications, supplies, equipment)
- **30 Billing Invoices** (paid, pending, overdue)
- **10 Queue Entries** (current waiting patients)

---

## 🎯 Next Steps

After setup is complete:

1. ✅ **Test each role** - Login and verify access
2. ✅ **Test workflows** - Create appointment, consultation, prescription
3. ✅ **Test permissions** - Verify restricted access works
4. ✅ **Test data visibility** - Ensure users see only permitted data
5. ✅ **Update BUG_FIX_IMPLEMENTATION_PLAN.md** - Mark tasks as complete

---

## 📝 Notes

- **Test Hospital ID**: `00000000-0000-0000-0000-000000000001`
- **All test data** belongs to this hospital
- **Passwords** meet security requirements (8+ chars, uppercase, number, special)
- **MRN Format**: MRN-2024-XXX
- **Invoice Format**: INV-2024-XXXX

---

**Last Updated**: January 2026  
**Status**: Ready for execution
