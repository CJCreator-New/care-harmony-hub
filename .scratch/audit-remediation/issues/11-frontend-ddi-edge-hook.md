# 11: CLIN-004 - Wire Frontend `useDrugInteractionChecker` to Backend Edge Function

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: CLIN-004 (High / Clinical Decision Support / Patient Safety)
- **Files**: `src/hooks/useDrugInteractionChecker.ts:42-135`, `src/lib/hooks/pharmacy/useDrugInteractionChecker.ts`, `supabase/functions/drug-interaction-check/index.ts`
- **Description**: While the backend edge function `drug-interaction-check` was hardened to fail closed, the primary React hook `useDrugInteractionChecker.ts` was never wired to call it. Instead, the hook queried only the first 100 rows of the local database table and fell back to a 7-item hardcoded array (`warfarin`, `metformin`, etc.). Any other lethal interaction returned an empty array, creating the illusion of safety for prescribing doctors.

## Technical Requirements
1. Refactor `useDrugInteractionChecker.ts` to call `supabase.functions.invoke('drug-interaction-check', { body: { drugCodes, patientId } })`.
2. Handle network timeout and errors with **fail-closed** behavior:
   - If the request fails, return `requiresManualReview: true`, `hasInteractions: true`, and a clear clinical warning banner.
3. Remove the client-side 100-row limit and 7-item hardcoded mock array.
4. Ensure `src/lib/hooks/pharmacy/useDrugInteractionChecker.ts` exports the unified hook canonically.

## Acceptance Criteria
- [x] **AC-1 (Edge Function Invoked)**:
  - **Given** two or more active medications selected in the prescription UI
  - **When** the hook executes an interaction check
  - **Then** a POST request is dispatched to `drug-interaction-check` edge function with drug identifiers.
- [x] **AC-2 (Known Severe Interactions Detected)**:
  - **Given** drugs that interact (e.g. Sildenafil + Nitroglycerin or SSRI + MAOI)
  - **When** checked via the hook
  - **Then** the hook returns severe warnings and flags `requiresManualReview: true`.
- [x] **AC-3 (Fail-Closed on Network Failure)**:
  - **Given** a simulated network disconnection or edge function 500 error
  - **When** checking interactions
  - **Then** the hook returns `{ hasInteractions: true, requiresManualReview: true, error: "Clinical check unavailable - pharmacist review required" }`.
- [x] **AC-4 (Unit Test Coverage)**:
  - **Given** `tests/clinical/drug-interaction-checker.test.tsx`
  - **When** testing both success and failure mock scenarios
  - **Then** all tests pass cleanly.

## Answer
- **Implementation**:
  1. Refactored `src/hooks/useDrugInteractionChecker.ts` to dispatch checks to `supabase.functions.invoke('drug-interaction-check')`, supporting both `prescriptionId` and direct `{ patientId, drugCodes, newDrugName }` invocations.
  2. Enforced fail-closed behavior across edge errors and network exceptions: returns `requiresManualReview: true`, `hasInteractions: true`, and `error: 'Clinical check unavailable - pharmacist review required'`.
  3. Removed the client-side 100-row limit query and the 7-item mock array from the frontend hook.
  4. Enhanced `supabase/functions/drug-interaction-check/index.ts` to evaluate pairwise drug combinations against AAP/FDA contraindicated combinations (including Sildenafil + Nitrates, SSRIs + MAOIs) and automatically require manual review for contraindicated and serious combinations.
- **Verification**: Verified via `tests/clinical/drug-interaction-checker.test.tsx` (5/5 tests passing).

