# 04: SEC-002 - Eliminate BOLA in Edge Functions by Enforcing `getAuthorizedActor` & Tenant Pinning

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-002 (Critical / HIPAA §164.312(a)(1) / OWASP A01:2021)
- **Files**: Edge functions (`supabase/functions/census-reports/index.ts`, `insurance-integration/index.ts`, `billing-reconciliation/index.ts`, `optimize-queue/index.ts`, `check-low-stock/index.ts`, `predict-deterioration/index.ts`, `workflow-automation/index.ts`)
- **Description**: Functions previously validated roles via `authorize(req, allowedRoles)` but discarded the authenticated actor context, accepting `hospital_id` or `patient_id` directly from client payloads. A user from Hospital A could read or mutate sensitive records at Hospital B.

## Technical Requirements
1. Update edge functions to replace `authorize()` with `getAuthorizedActor(req, allowedRoles)`.
2. Extract verified `actor.hospitalId` and `actor.userId` directly from the resolved actor context.
3. Remove any extraction of `hospital_id` or `hospitalId` from `req.json()` or query parameters.
4. Pin all Supabase queries strictly to `actor.hospitalId`:
   - e.g., `.eq('hospital_id', actor.hospitalId)`.
5. If the payload supplies target identifiers (e.g. `patient_id`), verify that the target record belongs to `actor.hospitalId` before executing queries.

## Acceptance Criteria
- [x] **AC-1 (Payload Hospital Override Ignored/Rejected)**:
  - **Given** an authenticated user whose profile belongs to Hospital 1
  - **When** the user sends a request to `census-reports`, `insurance-integration`, or `billing-reconciliation` with `{ "hospital_id": "hospital-2-id" }` in the JSON body
  - **Then** the function either rejects the request with HTTP 403 Forbidden or queries strictly using Hospital 1's ID
  - **And** zero records from Hospital 2 are returned.
- [x] **AC-2 (Service Role Client Scoped)**:
  - **Given** an edge function requiring elevated service-role queries
  - **When** querying PostgreSQL tables
  - **Then** every query includes `.eq('hospital_id', actor.hospitalId)`.
- [x] **AC-3 (Invalid Role Rejection)**:
  - **Given** a user with role `receptionist`
  - **When** attempting to access `census-reports` (which requires `['admin', 'doctor', 'nurse']`)
  - **Then** `getAuthorizedActor()` rejects the call with HTTP 403 Forbidden.
- [x] **AC-4 (Test Suite Verification)**:
  - **Given** automated security tests in `tests/security/`
  - **When** testing cross-tenant IDOR attacks against all refactored functions
  - **Then** endpoints enforce actor scoping and fail closed on tenant mismatches.

## Answer
- **Implementation**: Refactored `census-reports`, `insurance-integration`, `billing-reconciliation`, `check-low-stock`, `optimize-queue`, `predict-deterioration`, and `workflow-automation` to use `getAuthorizedActor()`. All queries are pinned strictly to `actor.hospitalId`. Cross-hospital overrides via JSON body payload are rejected with 403 Forbidden. Removed phantom `super_admin` references from headers and comments.
- **Verification**: Verified via `tests/security/p0-audit-remediation.test.ts`.
