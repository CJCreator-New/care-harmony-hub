# 02: CLIN-001 - Normalize Drug Allergy Conflict Detection with RxNorm Class Matching

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: CLIN-001 (Critical / Patient Safety / AAP & RxNorm Standards)
- **File**: `src/utils/clinicalValidation.ts`
- **Description**: `checkDrugAllergyConflict()` looks up contraindications using exact string dictionary keys (e.g., `'penicillin allergy'`). Real-world patient records stored as `'penicillin'`, `'Penicillin'`, or `'PCN'` evaluate to `undefined`, bypassing contraindication warnings and allowing amoxicillin or ampicillin to be prescribed to allergic patients.

## Technical Requirements
1. Refactor `checkDrugAllergyConflict()` in `src/utils/clinicalValidation.ts` to normalize incoming allergen strings:
   - Strip trailing descriptors (`"allergy"`, `"hypersensitivity"`, `"intolerance"`).
   - Normalize case and trim whitespace.
   - Map clinical synonyms (e.g., `"pcn"` -> `"penicillin"`, `"sulfa drugs"` -> `"sulfa"`).
2. Expand class-based contraindications for all major drug classes:
   - `penicillin`: `amoxicillin`, `ampicillin`, `piperacillin`, `penicillin v`, `augmentin`
   - `cephalosporin`: `cephalexin`, `ceftriaxone`, `cefazolin`, `cefepime` (with cross-reactivity warnings for penicillin)
   - `sulfa`: `sulfamethoxazole`, `sulfadiazine`, `bactrim`, `septra`
   - `nsaid`: `ibuprofen`, `naproxen`, `indomethacin`, `ketorolac`, `meloxicam`
   - `opioid`: `morphine`, `codeine`, `oxycodone`, `hydrocodone`, `fentanyl`
   - `aspirin`: `aspirin`, `salicylic acid`
3. Return structured conflict details (`allergen`, `medication`, `severity: 'severe' | 'high'`, `message`).

## Acceptance Criteria
- [x] **AC-1 (Bare Allergen Matching)**:
  - **Given** a patient with documented allergy `'penicillin'` (without the word `'allergy'`)
  - **When** a doctor attempts to prescribe `'Amoxicillin'`
  - **Then** `checkDrugAllergyConflict()` returns `{ hasConflict: true, conflicts: [...] }`
  - **And** the conflict severity is `'severe'`.
- [x] **AC-2 (Synonym & Acronym Matching)**:
  - **Given** a patient with allergy listed as `'PCN'` or `'pcn allergy'`
  - **When** a prescription is created for `'Piperacillin-Tazobactam'`
  - **Then** the check detects the conflict and returns `hasConflict: true`.
- [x] **AC-3 (Safe Prescription Handling)**:
  - **Given** a patient with allergy `'sulfa'`
  - **When** a prescription is created for `'Metformin'`
  - **Then** `checkDrugAllergyConflict()` returns `{ hasConflict: false, conflicts: [] }`.
- [x] **AC-4 (Unit Test Verification)**:
  - **Given** the test suite in `tests/clinical/drug-allergy-conflict.test.ts`
  - **When** executing tests with permutations of uppercase, lowercase, punctuation, and synonyms
  - **Then** 100% of allergy test assertions pass.

## Answer
- **Implementation**: Refactored `src/utils/clinicalValidation.ts` to normalize allergy terms using `normalizeAllergyTerm` and class taxonomy mapping across `penicillin`, `sulfa`, `nsaid`, `cephalosporin`, `opioid`, and `aspirin`. Return type includes `safe`, `hasConflict`, `conflictingAllergy`, and `conflicts`.
- **Verification**: Verified via `tests/clinical/drug-allergy-conflict.test.ts` (8/8 tests passed) and `tests/security/p0-audit-remediation.test.ts`.
