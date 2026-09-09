# 12: CLIN-003 - Dynamic Age Group Resolution & Fail-Closed Critical Lab Range Matching

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: CLIN-003 (Critical / Patient Safety / Pediatric Guidelines)
- **File**: `supabase/functions/critical-lab-check/index.ts:215-245`
- **Description**: `critical-lab-check` hardcodes `.eq("age_group", "adult")`, evaluating neonatal and pediatric specimens against adult thresholds. Furthermore, if the range query fails or errors, it returns `{ severity: "unknown", isCritical: false }`, silently suppressing critical panic alerts.

## Technical Requirements
1. Resolve patient date of birth from `patients.date_of_birth` using `patient_id`.
2. Compute patient age and map to clinical age group:
   - `< 28 days`: `'neonate'`
   - `28 days - 1 year`: `'infant'`
   - `1 - 12 years`: `'pediatric'`
   - `12 - 18 years`: `'adolescent'`
   - `>= 18 years`: `'adult'`
   - `>= 65 years`: `'geriatric'`
3. Query `lab_critical_ranges` matching both `test_name` and calculated `age_group` (falling back to `'all'` or age brackets).
4. Implement **fail-closed** behavior: if range lookup fails or is missing, flag `{ isCritical: true, severity: "critical", reason: "Missing reference range - requires immediate manual review" }`.

## Acceptance Criteria
- [x] **AC-1 (Pediatric Range Scoping)**:
  - **Given** a 3-year-old pediatric patient
  - **When** checking a lab result
  - **Then** the range lookup queries `age_group = 'pediatric'`
  - **And** adult ranges are not applied.
- [x] **AC-2 (Neonatal Range Scoping)**:
  - **Given** a 14-day-old neonate
  - **When** checking potassium level of 6.2 mmol/L (normal for neonates, critical for adults)
  - **Then** the neonate range correctly evaluates the result without false-positive adult panic escalation.
- [x] **AC-3 (Fail-Closed on Unknown Range)**:
  - **Given** an unconfigured lab assay or database exception
  - **When** `critical-lab-check` runs
  - **Then** `isCritical` returns `true` with high severity requiring clinician review.
- [x] **AC-4 (Unit Test Coverage)**:
  - **Given** unit tests in `tests/clinical/critical-lab-check.test.ts`
  - **When** evaluating all age groups and error fallbacks
  - **Then** all test assertions pass.

## Answer
- **Implementation**: In `supabase/functions/critical-lab-check/index.ts`:
  1. Updated `checkCriticalValue` to dynamically compute patient age in days and years from `patients.date_of_birth` and map to `'neonate'`, `'infant'`, `'pediatric'`, `'adolescent'`, `'adult'`, and `'geriatric'`.
  2. Scoped `lab_critical_ranges` query to the resolved `age_group`, falling back hierarchically to `'pediatric'` (for neonates/infants) and `'adult'`.
  3. Enforced fail-closed behavior: if no reference range is found or an exception occurs, returns `{ isCritical: true, severity: "critical", reason: "Missing reference range - requires immediate manual review" }`.
- **Verification**: Verified via `tests/clinical/critical-lab-check.test.ts` (4/4 tests passing).

