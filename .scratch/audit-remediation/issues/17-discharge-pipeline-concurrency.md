# 17: SEC-009 / REL-002 - Discharge Hospital Scoping & Row Locking

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-009 / REL-002 (High / IDOR & Concurrency Risk / ADR-0003)
- **File**: `supabase/functions/discharge-workflow/index.ts:98-121`
- **Description**: The `discharge-workflow` edge function updates workflow stages (`approveWorkflow`, `rejectWorkflow`) by querying `discharge_workflows` purely by UUID without checking `hospital_id = actor.hospitalId`. Furthermore, transitions lack database row locking (`FOR UPDATE`), allowing race conditions during concurrent approvals between doctor, pharmacist, and billing.

## Technical Requirements
1. In `supabase/functions/discharge-workflow/index.ts`, enforce that `discharge_workflows` queries explicitly include:
   ```typescript
   .eq('id', payload.workflowId)
   .eq('hospital_id', actor.hospitalId)
   ```
2. Wrap multi-role stage transitions in a database transaction or RPC function with `SELECT ... FOR UPDATE` row locking to prevent state mutation races.
3. Validate sequential stage requirements strictly according to ADR-0003:
   - Doctor Initiation -> Pharmacist Med Rec -> Billing Clearance -> Nurse Summary.

## Acceptance Criteria
- [x] **AC-1 (Cross-Hospital Discharge Mutation Denied)**:
  - **Given** an authenticated doctor at Hospital A
  - **When** calling `discharge-workflow` with `workflowId` belonging to Hospital B
  - **Then** the function returns HTTP 404 Not Found or HTTP 403 Forbidden.
- [x] **AC-2 (Sequential Invariant Preserved)**:
  - **Given** a discharge workflow awaiting pharmacist medication reconciliation
  - **When** a nurse attempts to complete the discharge summary ahead of time
  - **Then** the transition is rejected with HTTP 400 Bad Request.
- [x] **AC-3 (Race Condition Immunity)**:
  - **Given** two concurrent approval requests for the same workflow step
  - **When** executing concurrently
  - **Then** one succeeds and the other receives a conflict status without data corruption.
