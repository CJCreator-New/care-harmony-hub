# Test Data Setup Guide

This guide explains how to set up complete test data for E2E testing of the CareSync HIMS application.

## Files Created

1. **`supabase/migrations/20260125000001_complete_test_data_setup.sql`** - Complete database migration with all test data
2. **`scripts/create-test-users.js`** - Node.js script to create auth users with specific UUIDs

## Setup Steps

### Step 1: Deploy Database Migration

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/wmxtzkrkscjwixafumym/sql)
2. Copy the entire contents of `supabase/migrations/20260125000001_complete_test_data_setup.sql`
3. Paste and run the SQL in the editor
4. Verify all tables are created successfully

### Step 2: Create Auth Users

1. Get your service role key from [Supabase API Settings](https://supabase.com/dashboard/project/wmxtzkrkscjwixafumym/settings/api)
2. Set the environment variable:
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key-here'
   ```
3. Run the user creation script:
   ```bash
   npm run test:create-users
   ```

### Step 3: Run Tests

Once both database data and auth users are created, run the tests:

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:auth      # Authentication tests
npm run test:e2e:smoke     # Smoke tests
npm run test:e2e:admin     # Admin role tests
npm run test:e2e:doctor    # Doctor role tests
```

## Test Data Created

### Hospital
- **Test General Hospital** (ID: `550e8400-e29b-41d4-a716-446655440001`)

### Departments (6 total)
- Emergency Medicine
- Internal Medicine
- Surgery
- Pharmacy
- Laboratory
- Administration

### Users (7 total with specific UUIDs)

| Role | Email | Password | User ID |
|------|-------|----------|---------|
| Admin | admin@testgeneral.com | TestPass123! | 550e8400-e29b-41d4-a716-446655440003 |
| Doctor | doctor@testgeneral.com | TestPass123! | 550e8400-e29b-41d4-a716-446655440005 |
| Nurse | nurse@testgeneral.com | TestPass123! | 550e8400-e29b-41d4-a716-446655440007 |
| Receptionist | reception@testgeneral.com | TestPass123! | 550e8400-e29b-41d4-a716-446655440009 |
| Pharmacist | pharmacy@testgeneral.com | TestPass123! | 550e8400-e29b-41d4-a716-446655440011 |
| Lab Tech | lab@testgeneral.com | TestPass123! | 550e8400-e29b-41d4-a716-446655440013 |
| Patient | patient@testgeneral.com | TestPass123! | 550e8400-e29b-41d4-a716-446655440015 |

### Sample Data
- **3 Patients** with complete records
- **3 Appointments** (scheduled, confirmed, scheduled)
- **2 Prescriptions** (active medications)
- **2 Lab Orders** (completed and pending)
- **2 Lab Results** (CBC results)
- **1 Consultation** (completed visit)
- **2 Invoices** (paid and pending)
- **1 Payment** (completed transaction)

## Troubleshooting

### Auth Users Already Exist
If you get errors about users already existing, the script will skip them automatically.

### Database Migration Errors
If the migration fails, check:
1. All required tables exist from previous migrations
2. Foreign key constraints are satisfied
3. No duplicate data conflicts

### Test Failures
If tests still fail after setup:
1. Ensure the dev server is running: `npm run dev`
2. Check that all auth users were created with correct UUIDs
3. Verify database data was inserted correctly

## Next Steps

After successful setup:
1. All authentication tests should pass
2. Role-based dashboard tests should work
3. Smoke tests should pass quickly
4. Performance tests should meet baseline requirements

The test environment is now ready for comprehensive E2E testing!