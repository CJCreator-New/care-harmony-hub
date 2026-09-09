# 10: SEC-005 - Scope Low Stock Medications to Actor Tenant

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-005 (Critical / Multi-Tenancy Isolation / OWASP A01:2021)
- **File**: `supabase/functions/check-low-stock/index.ts:37-60`
- **Description**: The `check-low-stock` edge function queries `medications` using the privileged `SUPABASE_SERVICE_ROLE_KEY` without filtering by `hospital_id`. As a result, when an admin or pharmacist at Hospital A checks low inventory, the function returns medication inventory rows across every tenant in the multi-tenant system.

## Technical Requirements
1. In `supabase/functions/check-low-stock/index.ts`, replace `authorize()` with `getAuthorizedActor(req, ['admin', 'pharmacist'])`.
2. Pin the database query to the caller's hospital:
   ```typescript
   const { data: medications, error } = await supabase
     .from('medications')
     .select('*')
     .eq('hospital_id', actor.hospitalId)
     .eq('is_active', true);
   ```
3. Ensure low-stock notifications and alerts are routed exclusively to staff within `actor.hospitalId`.

## Acceptance Criteria
- [x] **AC-1 (Hospital-Scoped Query Execution)**:
  - **Given** an authenticated pharmacist at Hospital A
  - **When** calling `check-low-stock`
  - **Then** only medications with `hospital_id = 'hospital-a-id'` are evaluated.
- [x] **AC-2 (Zero Cross-Tenant Leakage)**:
  - **Given** low stock items at Hospital B
  - **When** Hospital A executes `check-low-stock`
  - **Then** Hospital B's inventory items and alerts are completely excluded from the response.
- [x] **AC-3 (Security Test Assertion)**:
  - **Given** automated security test fixture with multiple hospitals
  - **When** executing test suite against `check-low-stock`
  - **Then** tests assert that zero items from other hospitals are returned.

## Answer
- **Implementation**: In `supabase/functions/check-low-stock/index.ts`, replaced `authorize()` with `getAuthorizedActor(req, ['admin', 'pharmacist'])` and added `.eq('hospital_id', actor.hospitalId)` to the medication query. Inventory inspection and alerting are strictly scoped to the caller's tenant.
- **Verification**: Verified via `tests/security/p1-audit-remediation.test.ts` (test case confirms tenant pinning on medication query).
