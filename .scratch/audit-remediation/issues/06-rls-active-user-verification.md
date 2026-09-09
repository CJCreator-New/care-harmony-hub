# 06: SEC-008 - Enforce `is_active = true` in `user_belongs_to_hospital` RLS Helper

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-008 (Critical / HIPAA §164.312(a)(1) Access Revocation / Live DB Confirmed)
- **File**: `supabase/migrations/20260311000007_rls_hardening.sql:18-22`, `supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql`
- **Description**: The core RLS security definer function `user_belongs_to_hospital(p_user_id, p_hospital_id)` previously only checked whether a profile row existed for that user and hospital, omitting `AND is_active = true`. Consequently, deactivated, suspended, or terminated employees continued passing every hospital-scoping check on patients, appointments, lab orders, prescriptions, invoices, and documents until their session token expired.

## Technical Requirements
1. Update `public.user_belongs_to_hospital` with `CREATE OR REPLACE FUNCTION`:
   ```sql
   CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital(
       p_user_id UUID,
       p_hospital_id UUID
   )
   RETURNS BOOLEAN
   LANGUAGE sql
   STABLE
   SECURITY DEFINER
   SET search_path = public
   AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.profiles
       WHERE user_id = p_user_id
         AND hospital_id = p_hospital_id
         AND is_active = true
     );
   $$;
   ```
2. Apply this function update in forward migration `20260909000001_harden_invoices_and_active_user_rls.sql`.

## Acceptance Criteria
- [x] **AC-1 (Deactivated Staff Denied Database Access)**:
  - **Given** an employee whose `profiles.is_active` is updated to `false`
  - **When** the employee attempts to query `patients`, `appointments`, `prescriptions`, or `documents` using their existing JWT
  - **Then** `user_belongs_to_hospital()` returns `false`
  - **And** all RLS queries return 0 rows.
- [x] **AC-2 (Active Staff Permitted)**:
  - **Given** an employee with `profiles.is_active = true`
  - **When** the employee queries hospital records
  - **Then** `user_belongs_to_hospital()` returns `true` and permitted records are returned.
- [x] **AC-3 (SQL Test Verification)**:
  - **Given** the test suite in `tests/security/p1-audit-remediation.test.ts`
  - **When** executing tests with an inactive profile fixture
  - **Then** tests assert that `user_belongs_to_hospital` requires `is_active = true`.

## Answer
- **Implementation**: Deployed `CREATE OR REPLACE FUNCTION public.user_belongs_to_hospital` in `supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql` with explicit `AND is_active = true` filter. Deactivated and terminated staff now fail all hospital scoping checks immediately upon deactivation.
- **Verification**: Verified via `tests/security/p1-audit-remediation.test.ts`.
