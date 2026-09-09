# 14: RBAC-001 - Enforce Real Role Validation in `PharmacistRBACManager`

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: RBAC-001 (Critical / Access Control / ADR-0004)
- **File**: `src/utils/pharmacistRBACManager.ts:11-13`
- **Description**: The static method `PharmacistRBACManager.checkPermission(_userId: string, _permission: string): Promise<boolean>` was hardcoded to `return true;`. Any frontend component or service invoking this method grants unconditional pharmacist permissions to any authenticated user.

## Technical Requirements
1. Refactor `PharmacistRBACManager.checkPermission(userId, permission)` to query `user_roles` for the active user:
   - Verify that the caller has role `'pharmacist'` or `'admin'`.
   - Verify that the requested permission belongs to the pharmacist permission set.
2. In non-production test environments, support mock role injection while preventing production bypass.
3. Align `PharmacistRBACManager` methods (`canVerifyPrescription`, `canDispenseMedication`) to delegate to the verified role check.

## Acceptance Criteria
- [x] **AC-1 (Non-Pharmacist Rejected)**:
  - **Given** an authenticated user with role `doctor`, `nurse`, or `receptionist`
  - **When** calling `PharmacistRBACManager.checkPermission(userId, 'dispense_medication')`
  - **Then** the method returns `false`.
- [x] **AC-2 (Pharmacist Permitted)**:
  - **Given** an authenticated user with role `pharmacist`
  - **When** calling `PharmacistRBACManager.checkPermission(userId, 'dispense_medication')`
  - **Then** the method returns `true`.
- [x] **AC-3 (Admin Permitted for Oversight)**:
  - **Given** an authenticated user with role `admin`
  - **When** checking permissions for pharmacist configuration
  - **Then** the method returns `true`.
- [x] **AC-4 (Unit Test Coverage)**:
  - **Given** tests in `src/test/pharmacist-rbac.test.ts`
  - **When** asserting across all 7 canonical roles
  - **Then** only `pharmacist` and `admin` pass verification.

## Answer
- **Implementation**: In `src/utils/pharmacistRBACManager.ts`:
  1. Replaced the unconditional return with real database query against `user_roles` ensuring only `'pharmacist'` and `'admin'` can perform pharmacist operations.
  2. Implemented permission validation against the canonical `PharmacistPermission` enum.
  3. Added isolated test role registry (`setMockUserRoleForTesting`, `clearMockRolesForTesting`) only active in test environments.
  4. Added `canDispenseMedication` and `canVerifyPrescription` delegating directly to `checkPermission`.
  5. Rewrote `src/test/pharmacist-rbac.test.ts` with genuine assertions covering all 7 canonical roles.
- **Verification**: Verified via `src/test/pharmacist-rbac.test.ts` (5/5 tests passing).

