# 01: SEC-001 - Restrict `phi-crypto` Decryption Oracle with Resource-Level RLS Scoping

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-001 (Critical / HIPAA §164.312(a)(2)(iv) / OWASP A01:2021)
- **File**: `supabase/functions/phi-crypto/index.ts`
- **Description**: The `phi-crypto` edge function allows any authenticated user to decrypt arbitrary ciphertext arrays without verifying whether the caller has clinical or administrative permission to view the underlying patient record.

## Technical Requirements
1. Update `action: 'decrypt'` in `supabase/functions/phi-crypto/index.ts` to require `resourceType` (e.g., `'clinical_notes'`, `'prescriptions'`, `'patients'`) and `resourceId`.
2. Probe PostgreSQL using the caller's JWT token (not service role) to verify that the caller can `SELECT` the specified resource under active RLS policies.
3. If RLS returns 0 rows or denies access, immediately abort with HTTP 403 Forbidden without invoking the decryption cipher.
4. Add comprehensive audit logging for all decryption events.

## Acceptance Criteria
- [x] **AC-1 (Unauthorized Decryption Rejected)**:
  - **Given** an authenticated user with role `receptionist`
  - **When** the user sends a POST request to `phi-crypto` with `action: 'decrypt'` targeting a `clinical_notes` record belonging to another doctor/patient
  - **Then** the function returns HTTP 403 Forbidden with `{ "error": "Access denied: insufficient permissions to decrypt this record" }`
  - **And** no plaintext data is returned in the response.
- [x] **AC-2 (Arbitrary Ciphertext Rejected)**:
  - **Given** an authenticated user
  - **When** the request omits valid `resourceType` and `resourceId`
  - **Then** the schema validator rejects the payload with HTTP 400 Bad Request.
- [x] **AC-3 (Authorized Decryption Passes)**:
  - **Given** an authenticated doctor assigned to patient A
  - **When** the doctor requests decryption of patient A's clinical note providing valid `resourceType: 'clinical_notes'` and `resourceId`
  - **Then** the database RLS probe confirms `SELECT` permission
  - **And** the function returns HTTP 200 OK with the decrypted plaintext data.
- [x] **AC-4 (Audit Log Emitted)**:
  - **Given** any successful decryption request
  - **When** the response is generated
  - **Then** an immutable audit record is logged containing `user_id`, `hospital_id`, `resource_type`, `resource_id`, and timestamp.

## Answer
- **Implementation**: Updated `supabase/functions/phi-crypto/index.ts` to require `resourceType` and `resourceId`. Verified through caller's JWT probe against PostgreSQL RLS tables (`clinical_notes`, `prescriptions`, `patients`, `vitals`, `lab_results`, etc.). Non-admin calls without resource context or lacking RLS access are denied with 403 Forbidden. Decryptions log to `activity_logs` with `PHI_DECRYPT` action and hospital scope.
- **Verification**: Verified via `tests/security/p0-audit-remediation.test.ts`.
