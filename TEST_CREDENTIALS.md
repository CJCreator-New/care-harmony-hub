# Test User Credentials

## Overview
This document contains test user credentials for CareSync HIMS. Each user has a single role to properly test role-based access control.

**⚠️ IMPORTANT**: These are test credentials only. Never use in production.

---

## Test Users

### 1. Administrator
- **Email**: `admin@test.com`
- **Password**: `Admin123!`
- **Role**: Admin
- **Access**: Full system access (all modules)
- **Use For**: Testing admin features, settings, reports, staff management

### 2. Doctor
- **Email**: `doctor@test.com`
- **Password**: `Doctor123!`
- **Role**: Doctor
- **Access**: Patients, Consultations, Prescriptions, Lab, Telemedicine
- **Use For**: Testing clinical workflows, consultations, prescriptions

### 3. Nurse
- **Email**: `nurse@test.com`
- **Password**: `Nurse123!`
- **Role**: Nurse
- **Access**: Patients, Queue, Vitals, Medications, Inventory (read-only)
- **Use For**: Testing nursing workflows, vitals, medication administration

### 4. Receptionist
- **Email**: `receptionist@test.com`
- **Password**: `Receptionist123!`
- **Role**: Receptionist
- **Access**: Patients, Appointments, Queue, Billing (read-only)
- **Use For**: Testing patient registration, appointment scheduling, check-in/out

### 5. Pharmacist
- **Email**: `pharmacist@test.com`
- **Password**: `Pharmacist123!`
- **Role**: Pharmacist
- **Access**: Pharmacy, Prescriptions, Inventory, Clinical Pharmacy
- **Use For**: Testing pharmacy workflows, dispensing, inventory management

### 6. Lab Technician
- **Email**: `labtech@test.com`
- **Password**: `LabTech123!`
- **Role**: Lab Technician
- **Access**: Laboratory, Lab Orders, Samples
- **Use For**: Testing lab workflows, sample processing, result entry

### 7. Patient
- **Email**: `patient@test.com`
- **Password**: `Patient123!`
- **Role**: Patient
- **Access**: Patient Portal, Appointments (read), Prescriptions (read), Lab Results (read)
- **Use For**: Testing patient portal, self-service features

---

## Setup Instructions

### Step 1: Create Auth Users in Supabase

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" for each test user
3. Enter email and password from above
4. Confirm email (or disable email confirmation in settings)

### Step 2: Run SQL Script

1. Go to Supabase Dashboard → SQL Editor
2. Open `scripts/create-test-users.sql`
3. Run the script to create profiles and role assignments

### Step 3: Verify

1. Log in with each test user
2. Verify correct role is assigned
3. Verify correct sidebar menu items appear
4. Test access to permitted modules

---

## Testing Checklist

### Admin Testing
- [ ] Can access all modules
- [ ] Can view Billing
- [ ] Can view Reports
- [ ] Can access Staff Management
- [ ] Can access Staff Performance
- [ ] Can access Activity Logs
- [ ] Can access Workflow Dashboard

### Doctor Testing
- [ ] Can access Patients
- [ ] Can access Consultations
- [ ] Can create Prescriptions
- [ ] Can order Lab tests
- [ ] Can access Telemedicine
- [ ] Cannot access Billing
- [ ] Cannot access Reports

### Nurse Testing
- [ ] Can access Patients (read)
- [ ] Can access Queue
- [ ] Can record Vitals
- [ ] Can administer Medications
- [ ] Can view Inventory (read-only)
- [ ] Cannot edit Inventory
- [ ] Cannot access Billing

### Receptionist Testing
- [ ] Can register Patients
- [ ] Can schedule Appointments
- [ ] Can manage Queue
- [ ] Can view Billing (read-only)
- [ ] Cannot create Prescriptions
- [ ] Cannot access Reports

### Pharmacist Testing
- [ ] Can access Pharmacy
- [ ] Can dispense Prescriptions
- [ ] Can manage Inventory
- [ ] Can access Clinical Pharmacy
- [ ] Cannot access Billing
- [ ] Cannot access Reports

### Lab Technician Testing
- [ ] Can access Laboratory
- [ ] Can process Lab Orders
- [ ] Can manage Samples
- [ ] Can enter Results
- [ ] Cannot access Pharmacy
- [ ] Cannot access Billing

### Patient Testing
- [ ] Can access Patient Portal
- [ ] Can view Appointments (read-only)
- [ ] Can view Prescriptions (read-only)
- [ ] Can view Lab Results (read-only)
- [ ] Cannot access admin features
- [ ] Cannot access other patients' data

---

## Security Notes

1. **Single Role Per User**: Each test user has exactly one role to properly test RBAC
2. **No Production Use**: These credentials are for testing only
3. **Password Policy**: Passwords meet minimum requirements (8+ chars, uppercase, number, special)
4. **Test Hospital**: All users belong to "Test Hospital" (ID: 00000000-0000-0000-0000-000000000001)

---

## Troubleshooting

### User Can't Log In
- Verify email is confirmed in Supabase Auth
- Check password is correct (case-sensitive)
- Verify user exists in auth.users table

### Wrong Role Displayed
- Check user_roles table for correct role assignment
- Verify hospital_id matches
- Clear browser cache and re-login

### Access Denied Errors
- Verify RLS policies are enabled
- Check permission matrix in `src/lib/permissions.ts`
- Verify role is correctly assigned in database

---

**Last Updated**: January 2026  
**Maintained By**: Engineering Team
