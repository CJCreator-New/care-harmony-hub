# 15: RBAC-UNIFY - Consolidate 4 Conflicting Permission Systems into a Single Typed Layer

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: RBAC-UNIFY (High / Architecture Governance / ADR-0005)
- **Files**: `src/types/rbac.ts`, `src/lib/permissions.ts`, `src/utils/abacManager.ts`, `src/utils/*RBACManager.ts`
- **Description**: The application runs four disparate authorization layers: (1) category-based enum matrix, (2) flat string permission registry, (3) ABAC engine logging to a non-existent table, and (4) isolated per-role classes. These models diverge on critical operations (e.g. receptionist billing, doctor access to administrative screens).

## Technical Requirements
1. Establish a single authoritative permission resolution hub (e.g., `src/services/unifiedAuthService.ts`).
2. Map all flat string permissions to standard categories in `src/types/rbac.ts`.
3. Standardize per-role managers (`DoctorRBACManager`, `NurseRBACManager`, `ReceptionistRBACManager`, etc.) as thin facades delegating to the unified hub.
4. Implement `PatientRBACManager` for patient self-service portal operations.
5. Update `abacManager.ts` to log decisions to the verified `activity_logs` table.

## Acceptance Criteria
- [x] **AC-1 (Consistent Permission Resolution)**:
  - **Given** any role and permission check
  - **When** evaluated via enum check or string check
  - **Then** both checks produce the identical boolean decision.
- [x] **AC-2 (Billing Boundary Consistency)**:
  - **Given** a user with role `doctor` or `nurse`
  - **When** checking any billing permission across all 4 systems
  - **Then** every system returns `false` / access denied.
- [x] **AC-3 (PatientRBACManager Implemented)**:
  - **Given** an authenticated patient
  - **When** checking self-service portal operations
  - **Then** `PatientRBACManager` evaluates permissions strictly scoped to `profile.id = auth.uid()`.
- [x] **AC-4 (Cross-Parity Test Verification)**:
  - **Given** an automated test suite comparing all 7 roles against all permissions
  - **When** tests execute
  - **Then** 0 divergence exists between types, registries, and facade managers.
