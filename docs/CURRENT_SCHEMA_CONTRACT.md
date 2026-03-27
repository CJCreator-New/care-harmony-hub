# Current Schema Contract

This is the current launch-oriented schema contract derived from the active migration stream. It is not a full schema dump; it is the contract the app must protect during production hardening.

## Identity and Tenancy

- Canonical identity join:
  `auth.users.id -> profiles.user_id -> user_roles.user_id`
- Hospital-scoped data must use `hospital_id` consistently in table design, queries, RLS, and edge-function authorization.
- New authorization work must not rely on `profiles.id` as a substitute for auth user identity.

## Launch-Critical Table Families

- `profiles`
- `user_roles`
- `patients`
- `appointments`
- `consultations`
- `prescriptions`
- `prescription_items`
- `lab_orders`
- `notifications`
- `discharge_workflows`
- billing-related workflow and adjustment tables
- audit trail tables introduced in the March 2026 hardening stream

## Required Protections

- RLS enabled on every hospital-scoped launch-critical table
- policies check user identity through `profiles.user_id`
- policies enforce hospital scoping for read and write paths
- privileged edge functions re-check hospital scope even when using service-role access
- audit logging on critical workflow mutations

## Highest-Risk Backend Files

- `supabase/migrations/20260204000001_core_schema.sql`
- `supabase/migrations/20260309000001_fix_broken_rls_policies.sql`
- `supabase/migrations/20260311000007_rls_hardening.sql`
- `supabase/functions/_shared/authorize.ts`
- `supabase/functions/workflow-automation/index.ts`
- `supabase/functions/audit-logger/index.ts`
- `supabase/functions/prescription-approval/index.ts`
- `supabase/functions/discharge-workflow/index.ts`

## Review Rule

Before editing any launch-critical table, migration, or edge function:

1. confirm the identity join uses `profiles.user_id`
2. confirm hospital scoping exists
3. confirm route/UI permissions match backend enforcement
4. confirm a test path exists in API/security and E2E coverage
