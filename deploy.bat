@echo off
echo ========================================
echo Supabase Migration Deployment Helper
echo ========================================
echo.
echo Project: wmxtzkrkscjwixafumym
echo URL: https://supabase.com/dashboard/project/wmxtzkrkscjwixafumym/sql
echo.
echo STEP 1: Open Supabase SQL Editor
echo Go to the URL above
echo.
echo STEP 2: Run migrations in this order:
echo.
echo 1. Core Schema (REQUIRED FIRST):
echo    supabase/migrations/20251231100404_fdb444e1-ede0-4bca-b043-8bd43bba7c08.sql
echo.
echo 2. Functions:
echo    supabase/migrations/20251231100734_144ba98a-eb6a-4078-bc00-f8120c95ff65.sql
echo.
echo 3. Staff Management:
echo    supabase/migrations/20251231105428_5966ae49-7f9f-44bb-8940-78e47c86bb6e.sql
echo.
echo 4. Lab Orders:
echo    supabase/migrations/20251231114122_8458bdf2-7265-460d-b3ef-ec0cbbb766f4.sql
echo.
echo 5. Prescriptions:
echo    supabase/migrations/20251231115217_00460338-353c-4767-80a0-d0e6376a7d2e.sql
echo.
echo 6. Billing:
echo    supabase/migrations/20251231121313_8fce8a77-7648-45db-b750-ec9b3779162c.sql
echo.
echo 7. CRITICAL - Patient Portal Fix:
echo    supabase/migrations/20260103120000_fix_patient_portal_rbac.sql
echo.
echo STEP 3: After deployment, test P0 issues:
echo - P0-002: Patient portal access (should be FIXED)
echo - P0-001: Doctor consultation dates
echo - P0-003: Pharmacy sync
echo - P0-004: Lab sync  
echo - P0-005: Invoice creation
echo.
pause