# 13: CLIN-005 - Migrate Pediatric Dosing Calculation to Validated Backend Engine

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: CLIN-005 (High / Patient Safety / AAP Pediatric Dosing Guidelines)
- **Files**: `src/components/prescriptions/PediatricDosingCard.tsx:32-100`, backend edge functions
- **Description**: Pediatric dosing calculations were performed entirely in client-side React state. The client hardcoded rules for only two medications (`Acetaminophen` and `Amoxicillin`), with zero server-side verification during prescription ordering. All other pediatric medications had no automated dosage verification.

## Technical Requirements
1. Create a server-side pediatric dosing validation service (or edge function / shared module) storing AAP-compliant dosing rules (mg/kg/day, maximum single dose, maximum daily dose).
2. Wire prescription creation in `prescriptions` or `prescription-approval` to compute:
   - `recommended_dose = weight_kg * dose_per_kg`
   - Assert `prescribed_dose <= max_single_dose`
   - Assert `prescribed_daily_dose <= max_daily_dose`
3. If dose exceeds 110% of maximum AAP guideline, require explicit clinical override justification before saving.
4. Refactor `PediatricDosingCard.tsx` to fetch validated dose calculations from the server rather than performing local mock arithmetic.

## Acceptance Criteria
- [x] **AC-1 (Overdose Flagging)**:
  - **Given** a 10 kg child
  - **When** a doctor enters Amoxicillin at 120 mg/kg/day (maximum safe: 90 mg/kg/day)
  - **Then** the validation engine flags a severe dosing error and blocks submission without override.
- [x] **AC-2 (Adult Dose Cap Enforced)**:
  - **Given** an adolescent child whose calculated mg/kg dose exceeds standard adult dose
  - **When** dosage calculation occurs
  - **Then** the dose is automatically capped at the adult maximum dose.
- [x] **AC-3 (Server-Side Enforcement)**:
  - **Given** a direct API call or submission attempting to bypass UI validation
  - **When** the payload reaches the serverless backend
  - **Then** the prescription is validated server-side and rejected if unvalidated.
- [x] **AC-4 (Test Suite Coverage)**:
  - **Given** test cases in `tests/clinical/pediatric-dosing.test.ts`
  - **When** executing tests with neonatal, infant, and child weight parameters
  - **Then** all calculations match AAP standards.

## Answer
- **Implementation**:
  1. Built `src/utils/pediatricDosingEngine.ts` containing AAP-compliant dosing rules (Amoxicillin, Acetaminophen, Ibuprofen, Azithromycin, Cephalexin, Prednisolone) with weight-based calculation, adult max dose caps, 110% override requirement, and >200% hard stops.
  2. Created `supabase/functions/pediatric-dosing/index.ts` edge function to validate dosages server-side.
  3. Integrated pediatric weight-based dosing into `supabase/functions/prescription-approval/index.ts` DUR verification.
  4. Refactored `src/components/prescriptions/PediatricDosingCard.tsx` to use the validated AAP engine instead of client mock tables.
- **Verification**: Verified via `tests/clinical/pediatric-dosing.test.ts` (6/6 tests passing).

