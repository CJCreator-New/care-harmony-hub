# Supabase Migration Deployment Guide

## Quick Deploy to Supabase

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/wmxtzkrkscjwixafumym/sql

2. **Run migrations in order:**
   ```
   20251231100404_fdb444e1-ede0-4bca-b043-8bd43bba7c08.sql (Core schema)
   20251231100734_144ba98a-eb6a-4078-bc00-f8120c95ff65.sql (Functions)
   20251231105428_5966ae49-7f9f-44bb-8940-78e47c86bb6e.sql (Staff invitations)
   20251231114122_8458bdf2-7265-460d-b3ef-ec0cbbb766f4.sql (Lab orders)
   20251231115217_00460338-353c-4767-80a0-d0e6376a7d2e.sql (Prescriptions)
   20251231121313_8fce8a77-7648-45db-b750-ec9b3779162c.sql (Invoices)
   20260103120000_fix_patient_portal_rbac.sql (Patient RBAC - CRITICAL)
   ```

3. **Copy each file content and paste into SQL Editor**

### Method 2: CLI (if you have DB password)

```bash
supabase link --project-ref wmxtzkrkscjwixafumym --password YOUR_DB_PASSWORD
supabase db push
```

## Critical P0 Fixes Needed After Deployment

### P0-001: Doctor Consultation Date SQL Error
**File to check:** Frontend consultation form validation

### P0-002: Patient Portal RBAC 
**Status:** ✅ FIXED in migration 20260103120000_fix_patient_portal_rbac.sql

### P0-003 & P0-004: Doctor → Pharmacy/Lab Sync
**Action:** Verify consultation creation triggers prescription/lab_order inserts

### P0-005: Invoice Creation
**Action:** Verify invoice_number function exists after migration

## Verification Steps

After deployment, verify these tables exist:
- hospitals ✓
- profiles ✓  
- user_roles ✓
- patients ✓
- appointments ✓
- consultations ✓
- prescriptions ✓
- lab_orders ✓
- invoices ✓
- payments ✓

## Test Critical Workflows

1. **Patient Login** → Should access portal pages
2. **Doctor Consultation** → Should save dates without SQL error
3. **Prescription Creation** → Should appear in pharmacy queue
4. **Lab Order Creation** → Should appear in lab queue
5. **Invoice Creation** → Should generate invoice number