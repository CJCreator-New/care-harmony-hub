# 21: TEST-GAPS - Implement Automated Regression Suites for Cross-System RBAC Parity, Fail-Closed DDI, and Audit Immutability

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: TEST-GAPS (High / Quality Assurance & Compliance Testing)
- **Files**: `tests/rbac/`, `tests/security/`, `src/__tests__/`
- **Description**: While the repository has 888 passing unit tests and 130 passing security tests, critical regression gaps exist: cross-system RBAC agreement between `rbac.ts` and `permissions.ts` is never tested; fail-closed behavior on DDI timeout is untested; and `audit_logs` immutability is unverified.

## Technical Requirements
1. Implement `tests/rbac/cross-system-parity.test.ts`:
   - Iterate over all 7 canonical roles and all defined permissions.
   - Assert that `src/types/rbac.ts`, `src/lib/permissions.ts`, and facade managers return identical permission decisions.
2. Implement `tests/clinical/fail-closed-ddi.test.ts`:
   - Simulate external API failure, edge function 500/timeout, and unmapped drug codes.
   - Assert that `requiresManualReview: true` and warning alerts are returned in every failure mode.
3. Implement `tests/security/audit-immutability.test.ts`:
   - Attempt `UPDATE` and `DELETE` queries on both `activity_logs` and `audit_logs` using service role and authenticated roles.
   - Assert that PostgreSQL triggers raise exceptions and roll back transactions.

## Acceptance Criteria
- [x] **AC-1 (RBAC Parity Test Passed)**:
  - **When** running `npm run test:unit tests/rbac/cross-system-parity.test.ts`
  - **Then** all parity assertions pass with 0 discrepancies.
- [x] **AC-2 (DDI Fail-Closed Assertions Passed)**:
  - **When** running `npm run test:unit tests/clinical/fail-closed-ddi.test.ts`
  - **Then** all error-path scenarios correctly assert fail-closed flags.
- [x] **AC-3 (Audit Immutability Assertions Passed)**:
  - **When** running `npm run test:security tests/security/audit-immutability.test.ts`
  - **Then** all attempts to mutate or delete log entries fail with database exceptions.
