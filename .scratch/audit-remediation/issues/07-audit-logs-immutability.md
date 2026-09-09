# 07: SEC-004 - Deploy Append-Only Trigger on Live `activity_logs` & Create `audit_logs` Schema

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-004 (Critical / HIPAA §164.312(b) Audit Controls / Live DB Confirmed)
- **Files**: `supabase/migrations/20260622000003_activity_logs_immutable.sql`, `supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql`
- **Description**: The live database lacked the promised append-only immutability trigger on `activity_logs`, allowing records to be edited or deleted. In addition, the separate `audit_logs` table (referenced by ABAC and DDI services) did not exist in the live database, causing audit writes to fail silently. Finally, write policies on `activity_logs` allowed any signed-in user to write entries tagged with another hospital's ID.

## Technical Requirements
1. Deploy table `public.audit_logs` with columns (`id`, `user_id`, `hospital_id`, `action`, `resource_type`, `resource_id`, `details`, `ip_address`, `created_at`).
2. Deploy trigger function `prevent_audit_log_mutation()` raising exception on UPDATE or DELETE.
3. Attach `BEFORE UPDATE OR DELETE` triggers to both `public.activity_logs` and `public.audit_logs`.
4. Fix write RLS policy on `public.activity_logs`: enforce that `hospital_id` must match `public.user_belongs_to_hospital(auth.uid(), hospital_id)`.

## Acceptance Criteria
- [x] **AC-1 (Update Prohibited)**:
  - **Given** an existing entry in `activity_logs` or `audit_logs`
  - **When** any user (including admin) executes an `UPDATE` statement
  - **Then** PostgreSQL raises exception: `audit_logs is append-only...` and rolls back.
- [x] **AC-2 (Delete Prohibited)**:
  - **Given** an existing entry in `activity_logs` or `audit_logs`
  - **When** any user executes a `DELETE` statement
  - **Then** PostgreSQL raises exception and aborts the deletion.
- [x] **AC-3 (Insert Permitted with Valid Hospital)**:
  - **Given** an authenticated user at Hospital A
  - **When** inserting a valid activity log row tagged with Hospital A
  - **Then** the row is successfully inserted.
- [x] **AC-4 (Cross-Hospital Write Rejected)**:
  - **Given** an authenticated user at Hospital A
  - **When** attempting to insert an activity log entry tagged with Hospital B
  - **Then** RLS policy rejects the insert with a permission error.

## Answer
- **Implementation**: In `supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql`, deployed `prevent_audit_log_mutation()` and attached immutability triggers to both `activity_logs` and `audit_logs`. Created `public.audit_logs` schema with RLS policies. Hardened `Staff can insert activity logs` policy on `activity_logs` to require `public.user_belongs_to_hospital(auth.uid(), hospital_id)`, preventing cross-hospital log spoofing.
- **Verification**: Verified via `tests/security/p1-audit-remediation.test.ts`.
