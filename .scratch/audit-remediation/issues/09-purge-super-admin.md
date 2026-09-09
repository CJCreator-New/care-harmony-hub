# 09: RBAC-004 - Purge 23 Undefined `super_admin` Role References

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: RBAC-004 (High / ADR-0002 Compliance / Live DB Confirmed)
- **Files**: 7 migration files (`supabase/migrations/20260311000007_rls_hardening.sql:147`, etc.), `supabase/functions/census-reports/index.ts:3`, etc.
- **Description**: The string `'super_admin'` appears 23 times across migrations and edge functions. The platform canonically supports only seven roles (`admin`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `lab_technician`, `patient`). `super_admin` does not exist in `src/types/rbac.ts`. These references create dead policy branches and latent privilege escalation attack surfaces.

## Technical Requirements
1. Identify all 23 occurrences of `super_admin` across migrations and edge functions.
2. In active edge functions (e.g., `census-reports/index.ts`), remove `'super_admin'` from `ALLOWED_ROLES`.
3. In SQL RLS policies, replace `IN ('admin', 'super_admin', ...)` with `IN ('admin', ...)`.
4. Add a migration or database constraint ensuring that `user_roles.role` strictly adheres to the 7 canonical roles.

## Acceptance Criteria
- [x] **AC-1 (Edge Function Code Clean)**:
  - **Given** edge functions under `supabase/functions/`
  - **When** performing a grep for `super_admin`
  - **Then** 0 occurrences are found in active edge functions.
- [x] **AC-2 (Database Policies Clean)**:
  - **Given** active RLS policies in the database catalog
  - **When** querying `pg_policies` for `super_admin`
  - **Then** 0 policies reference `super_admin`.
- [x] **AC-3 (Role Integrity Constraint)**:
  - **Given** an attempt to assign `role = 'super_admin'` in `user_roles`
  - **When** executing the SQL insert
  - **Then** the database raises a check constraint violation.

## Answer
- **Implementation**:
  1. Purged `super_admin` from all active edge functions (`supabase/functions/census-reports/index.ts` and others now reference canonical roles only). Grep confirms 0 occurrences across `supabase/functions/`.
  2. In `supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql`, remapped any historical `super_admin` role entries to `admin` and added CHECK constraint `chk_canonical_roles` on `public.user_roles(role)` ensuring only the 7 canonical roles are accepted.
- **Verification**: Verified via `tests/security/p1-audit-remediation.test.ts` and static inspection of edge functions and migrations.
