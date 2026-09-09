# 05: RBAC-002 - Enforce Billing Boundary in `invoices_hospital_billing_read` RLS Policy

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: RBAC-002 (High / ADR-0002 Compliance / HIPAA Access Control)
- **File**: `supabase/migrations/20260311000007_rls_hardening.sql:145-149`, `supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql`
- **Description**: The existing RLS policy `invoices_hospital_billing_read` granted `SELECT` on `public.invoices` to users with roles `admin`, `super_admin`, `doctor`, `receptionist`, and `nurse`. This directly violated [ADR-0002](file:///C:/Users/HP/OneDrive/Desktop/Projects/VS%20Code/AroCord-HIMS/care-harmony-hub/docs/adr/0002-seven-canonical-roles-and-billing-boundary.md) and [`src/types/rbac.ts`](file:///C:/Users/HP/OneDrive/Desktop/Projects/VS%20Code/AroCord-HIMS/care-harmony-hub/src/types/rbac.ts#L80), which strictly forbid clinical providers (`doctor`, `nurse`) from viewing patient billing invoices.

## Technical Requirements
1. Drop the legacy `invoices_hospital_billing_read` policy on `public.invoices`.
2. Re-create `invoices_hospital_billing_read` permitting `SELECT` strictly to `admin` and `receptionist`:
   ```sql
   CREATE POLICY "invoices_hospital_billing_read" ON public.invoices
     FOR SELECT USING (
       public.user_belongs_to_hospital(auth.uid(), hospital_id)
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
         WHERE ur.user_id = auth.uid()
           AND ur.role IN ('admin', 'receptionist')
           AND ur.hospital_id = hospital_id
       )
     );
   ```
3. Verify that `invoices_patient_read` permits patients to read only their own invoices (`patient_id IN (SELECT id FROM patients WHERE profile_id = auth.uid())`).
4. Apply the migration to the database catalog.

## Acceptance Criteria
- [x] **AC-1 (Doctor Access Denied)**:
  - **Given** an authenticated user with role `doctor`
  - **When** querying `public.invoices` via the Supabase client
  - **Then** the query returns 0 rows, even for patients assigned to the doctor.
- [x] **AC-2 (Nurse Access Denied)**:
  - **Given** an authenticated user with role `nurse`
  - **When** querying `public.invoices`
  - **Then** the query returns 0 rows.
- [x] **AC-3 (Admin & Receptionist Access Permitted)**:
  - **Given** an authenticated user with role `admin` or `receptionist` at Hospital 1
  - **When** querying `public.invoices`
  - **Then** invoices belonging to Hospital 1 are returned.
- [x] **AC-4 (Patient Read-Own Preserved)**:
  - **Given** an authenticated patient
  - **When** viewing their own billing portal
  - **Then** only their personal invoices are returned.

## Answer
- **Implementation**: Deployed policy update in `supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql` dropping legacy `invoices_hospital_billing_read` and creating replacement policy restricting read access strictly to `admin` and `receptionist`. Doctors and nurses are excluded, upholding the billing boundary established in ADR-0002.
- **Verification**: Verified via `tests/security/p1-audit-remediation.test.ts`.
