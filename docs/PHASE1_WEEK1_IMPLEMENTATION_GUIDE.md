# Phase 1-2 Week 1: Domain Consolidation Implementation (Apr 11-17, 2026)

**Duration**: 1 week (40 hours)  
**Owner**: Senior Backend Engineer  
**Goal**: Migrate patient, appointment, pharmacy domain hooks to `lib/hooks/` structure  
**Success Criteria**: All migrated hooks work, 25+ patient tests passing, 0 import breakage in consumers

---

## Current State Analysis

**Source Location**: `src/hooks/` (130+ hooks total)  
**Target Location**: `src/lib/hooks/` (centralized, with subfolders per domain)  
**Current Structure**: Flat list of hooks (mixed concerns)  
**Target Structure**: Organized by domain with clear ownership

---

## Week 1 Implementation Tasks

### Task 1.1: Patient Domain Migration (8 hours)

**Hooks to Migrate** (from `src/hooks/` → `src/lib/hooks/patients/`):
```
src/hooks/usePatients.ts                    → src/lib/hooks/patients/usePatients.ts
src/hooks/usePatientQuery.ts                → src/lib/hooks/patients/usePatientQuery.ts
src/hooks/usePatientIdentity.ts             → src/lib/hooks/patients/usePatientIdentity.ts
src/hooks/usePatientPortal.ts               → src/lib/hooks/patients/usePatientPortal.ts
src/hooks/usePatientPortalQueries.ts        → src/lib/hooks/patients/usePatientPortalQueries.ts
src/hooks/usePatientsReadyForDoctor.ts      → src/lib/hooks/patients/usePatientsReadyForDoctor.ts
```

**Sub-task 1.1.1: Create Target Directory Structure**
```bash
# Run in terminal:
mkdir -p src/lib/hooks/patients
```

**Sub-task 1.1.2: Migrate Patient Hooks**
- [ ] Copy `src/hooks/usePatients.ts` → `src/lib/hooks/patients/usePatients.ts`
- [ ] Copy `src/hooks/usePatientQuery.ts` → `src/lib/hooks/patients/usePatientQuery.ts`
- [ ] Copy `src/hooks/usePatientIdentity.ts` → `src/lib/hooks/patients/usePatientIdentity.ts`
- [ ] Copy `src/hooks/usePatientPortal.ts` → `src/lib/hooks/patients/usePatientPortal.ts`
- [ ] Copy `src/hooks/usePatientPortalQueries.ts` → `src/lib/hooks/patients/usePatientPortalQueries.ts`
- [ ] Copy `src/hooks/usePatientsReadyForDoctor.ts` → `src/lib/hooks/patients/usePatientsReadyForDoctor.ts`

**Sub-task 1.1.3: Create Index File**
Create `src/lib/hooks/patients/index.ts`:
```typescript
// Patient domain hooks - centralized exports
export { usePatients } from './usePatients';
export { usePatientQuery } from './usePatientQuery';
export { usePatientIdentity } from './usePatientIdentity';
export { usePatientPortal } from './usePatientPortal';
export { usePatientPortalQueries } from './usePatientPortalQueries';
export { usePatientsReadyForDoctor } from './usePatientsReadyForDoctor';
```

**Sub-task 1.1.4: Update Main Hooks Index**
Edit `src/lib/hooks/index.ts` (create if doesn't exist):
```typescript
// Export all patient hooks via lib/hooks for centralized importing
export * from './patients';
```

**Sub-task 1.1.5: Find & Update All Imports (Critical)**
```bash
# Search for all patient hook imports in codebase:
grep -r "from '@/hooks/usePatients'" src/
grep -r "from '@/hooks/usePatientQuery'" src/
grep -r "from '@/hooks/usePatientIdentity'" src/
grep -r "from '@/hooks/usePatientPortal'" src/
grep -r "from '@/hooks/usePatientPortalQueries'" src/
grep -r "from '@/hooks/usePatientsReadyForDoctor'" src/
```

**Update Each File**: Replace imports
```typescript
// OLD:
import { usePatients } from '@/hooks/usePatients';
import { usePatientQuery } from '@/hooks/usePatientQuery';

// NEW:
import { usePatients, usePatientQuery } from '@/lib/hooks/patients';
// OR
import { usePatients, usePatientQuery } from '@/lib/hooks';
```

**Sub-task 1.1.6: Verify Patient Tests**
```bash
# Run patient-specific tests
npm run test:unit -- src/hooks/__tests__/usePatients.test.ts
npm run test:unit -- src/hooks/__tests__/usePatientQuery.test.ts
npm run test:unit -- src/hooks/__tests__/usePatientIdentity.test.ts
npm run test:unit -- src/hooks/__tests__/usePatientPortal.test.ts

# Expected: 25+ tests passing (✅ green)
# Acceptance Criteria: ALL TESTS PASS
```

**Time Budget**: 8 hours

---

### Task 1.2: Appointment Domain Migration (7 hours)

**Hooks to Migrate** (from `src/hooks/` → `src/lib/hooks/appointments/`):
```
src/hooks/useAppointments.ts                → src/lib/hooks/appointments/useAppointments.ts
src/hooks/useAppointmentRequests.ts         → src/lib/hooks/appointments/useAppointmentRequests.ts
src/hooks/useAppointmentOptimization.ts     → src/lib/hooks/appointments/useAppointmentOptimization.ts
src/hooks/useDoctorAvailability.ts          → src/lib/hooks/appointments/useDoctorAvailability.ts
src/hooks/useScheduling.ts                  → src/lib/hooks/appointments/useScheduling.ts
src/hooks/useSmartScheduling.ts             → src/lib/hooks/appointments/useSmartScheduling.ts
```

**Sub-task 1.2.1: Create Target Directory**
```bash
mkdir -p src/lib/hooks/appointments
```

**Sub-task 1.2.2: Migrate Appointment Hooks**
- [ ] Copy all 6 appointment hooks to `src/lib/hooks/appointments/`

**Sub-task 1.2.3: Create Index File**
Create `src/lib/hooks/appointments/index.ts`:
```typescript
export { useAppointments } from './useAppointments';
export { useAppointmentRequests } from './useAppointmentRequests';
export { useAppointmentOptimization } from './useAppointmentOptimization';
export { useDoctorAvailability } from './useDoctorAvailability';
export { useScheduling } from './useScheduling';
export { useSmartScheduling } from './useSmartScheduling';
```

**Sub-task 1.2.4: Update Main Hooks Index**
Update `src/lib/hooks/index.ts`:
```typescript
export * from './patients';
export * from './appointments';
```

**Sub-task 1.2.5: Find & Update Imports**
```bash
grep -r "from '@/hooks/useAppointments'" src/
grep -r "from '@/hooks/useAppointmentRequests'" src/
# ... etc for all 6 hooks
```

Replace with:
```typescript
import { useAppointments, useAppointmentRequests } from '@/lib/hooks/appointments';
```

**Sub-task 1.2.6: Verify Appointment Tests**
```bash
npm run test:unit -- src/hooks/__tests__/useAppointments.test.ts
npm run test:unit -- src/hooks/__tests__/useAppointmentRequests.test.ts
# ... etc

# Expected: 20+ tests passing
```

**Time Budget**: 7 hours

---

### Task 1.3: Pharmacy Domain Migration (7 hours)

**Hooks to Migrate** (from `src/hooks/` → `src/lib/hooks/pharmacy/`):
```
src/hooks/usePharmacy.ts                    → src/lib/hooks/pharmacy/usePharmacy.ts
src/hooks/usePrescriptions.ts               → src/lib/hooks/pharmacy/usePrescriptions.ts
src/hooks/useMedications.ts                 → src/lib/hooks/pharmacy/useMedications.ts
src/hooks/usePharmacistOperations.ts        → src/lib/hooks/pharmacy/usePharmacistOperations.ts
src/hooks/useMedicationAlerts.ts            → src/lib/hooks/pharmacy/useMedicationAlerts.ts
src/hooks/useDrugInteractionChecker.ts      → src/lib/hooks/pharmacy/useDrugInteractionChecker.ts
```

**Sub-task 1.3.1: Create Target Directory**
```bash
mkdir -p src/lib/hooks/pharmacy
```

**Sub-task 1.3.2: Migrate Pharmacy Hooks**
- [ ] Copy all 6 pharmacy hooks to `src/lib/hooks/pharmacy/`

**Sub-task 1.3.3: Create Index File**
Create `src/lib/hooks/pharmacy/index.ts`:
```typescript
export { usePharmacy } from './usePharmacy';
export { usePrescriptions } from './usePrescriptions';
export { useMedications } from './useMedications';
export { usePharmacistOperations } from './usePharmacistOperations';
export { useMedicationAlerts } from './useMedicationAlerts';
export { useDrugInteractionChecker } from './useDrugInteractionChecker';
```

**Sub-task 1.3.4: Update Main Hooks Index**
Update `src/lib/hooks/index.ts`:
```typescript
export * from './patients';
export * from './appointments';
export * from './pharmacy';
```

**Sub-task 1.3.5: Find & Update Imports**
```bash
grep -r "from '@/hooks/usePharmacy'" src/
grep -r "from '@/hooks/usePrescriptions'" src/
# ... etc for all 6 hooks
```

Replace with:
```typescript
import { usePharmacy, usePrescriptions } from '@/lib/hooks/pharmacy';
```

**Sub-task 1.3.6: Verify Pharmacy Tests**
```bash
npm run test:unit -- src/hooks/__tests__/usePharmacy.test.ts
npm run test:unit -- src/hooks/__tests__/usePrescriptions.test.ts
# ... etc

# Expected: 20+ tests passing
```

**Time Budget**: 7 hours

---

### Task 1.4: Shared Hospital Scoping Layer (7 hours)

**Objective**: Ensure all migrated hooks respect hospital_id scoping (multi-tenant requirement)

**Sub-task 1.4.1: Create Hospital Scoping Middleware**
Create `src/lib/hooks/useHospitalScope.ts`:
```typescript
import { useAuthContext } from '@/contexts/AuthContext';

export function useHospitalScope() {
  const { profile } = useAuthContext();
  
  if (!profile?.hospital_id) {
    throw new Error('Hospital scope required - user not assigned to hospital');
  }
  
  return {
    hospitalId: profile.hospital_id,
    validateScope: (dataHospitalId: string) => {
      if (dataHospitalId !== profile.hospital_id) {
        throw new Error('Cross-hospital access denied (RLS violation)');
      }
    }
  };
}
```

**Sub-task 1.4.2: Add Hospital Scoping to Patient Hooks**
Update each patient hook to validate hospital_id:
```typescript
// In usePatients.ts
export function usePatients() {
  const { hospitalId } = useHospitalScope();
  // All queries filtered by hospitalId
  // RLS enforces hospital_id = auth.uid().hospital_id
}
```

**Sub-task 1.4.3: Add Hospital Scoping to Appointment Hooks**
Same pattern for all appointment hooks

**Sub-task 1.4.4: Add Hospital Scoping to Pharmacy Hooks**
Same pattern for all pharmacy hooks

**Sub-task 1.4.5: Verify Hospital Scoping Tests**
Update all 25+ patient tests to verify hospital_id filtering:
```bash
npm run test:unit -- --grep "hospital_id.*scoping"
# Expected: All scoping tests pass
```

**Acceptance Criteria**:
- ✅ No cross-hospital data leaks possible
- ✅ All hooks enforce hospital_id validation
- ✅ RLS tests pass (100% pass rate)

**Time Budget**: 7 hours

---

### Task 1.5: Validate No Import Breakage (5 hours)

**Sub-task 1.5.1: Run Full Test Suite**
```bash
# Run all unit tests to catch any broken imports
npm run test:unit

# Expected: >95% pass rate (only pre-existing failures acceptable)
# Acceptance: 0 new failures introduced by migration
```

**Sub-task 1.5.2: Run Integration Tests**
```bash
npm run test:integration

# Expected: All integration tests pass
# These test hooks in real-world component scenarios
```

**Sub-task 1.5.3: Build Check**
```bash
# Verify TypeScript compilation succeeds
npm run build

# Expected: 0 compilation errors
# Acceptance: Code compiles without type errors
```

**Sub-task 1.5.4: ESLint & Code Quality**
```bash
# Check for unused imports, code style
npx eslint src/lib/hooks --fix

# Expected: 0 linting errors
```

**Time Budget**: 5 hours

---

## Daily Execution Schedule

### Monday (Apr 11): Patient Domain
- [ ] **9:00 AM**: Create directory structure
- [ ] **9:15 AM**: Copy patient hooks to lib/hooks/patients/
- [ ] **10:00 AM**: Create index files
- [ ] **10:30 AM**: Find all patient hook imports (grep search)
- [ ] **11:30 AM**: Update imports across codebase (6+ files estimated)
- [ ] **2:00 PM**: Run patient tests → verify 25+ passing
- [ ] **3:00 PM**: Document completed migration + blockers

### Tuesday (Apr 12): Appointment Domain
- [ ] **9:00 AM**: Create appointments directory
- [ ] **9:15 AM**: Copy appointment hooks
- [ ] **10:00 AM**: Create index, update main index
- [ ] **10:30 AM**: Find and update appointment imports
- [ ] **2:00 PM**: Run appointment tests → verify 20+ passing
- [ ] **3:00 PM**: Document completed migration

### Wednesday (Apr 13): Pharmacy Domain
- [ ] **9:00 AM**: Create pharmacy directory
- [ ] **9:15 AM**: Copy pharmacy hooks
- [ ] **10:00 AM**: Create index, update main index
- [ ] **10:30 AM**: Find and update pharmacy imports
- [ ] **2:00 PM**: Run pharmacy tests → verify 20+ passing
- [ ] **3:00 PM**: Document completed migration

### Thursday (Apr 14): Hospital Scoping Layer
- [ ] **9:00 AM**: Create useHospitalScope() hook
- [ ] **10:00 AM**: Add hospital scoping to patient hooks
- [ ] **11:00 AM**: Add hospital scoping to appointment hooks
- [ ] **1:00 PM**: Add hospital scoping to pharmacy hooks
- [ ] **2:00 PM**: Run scoping validation tests
- [ ] **3:00 PM**: Verify 0 cross-hospital leaks possible

### Friday (Apr 15): Validation & Integration
- [ ] **9:00 AM**: Run full test suite (npm run test:unit)
- [ ] **10:00 AM**: Run integration tests (npm run test:integration)
- [ ] **11:00 AM**: Build check (npm run build)
- [ ] **12:00 PM**: ESLint cleanup
- [ ] **1:00 PM**: Document all changes + metrics
- [ ] **2:00 PM**: Gate review prep (document completion %)

---

## Code Migration Template

### Step 1: Copy Hook (No changes yet)
```bash
cp src/hooks/usePatients.ts src/lib/hooks/patients/usePatients.ts
```

### Step 2: Update Internal Imports (if hook imports other hooks)
```typescript
// OLD:
import { useHospitalContext } from '@/hooks/';
import { someHelper } from '@/utils/';

// NEW (should mostly work as-is, but verify):
import { useHospitalContext } from '@/lib/hooks/';
import { someHelper } from '@/utils/';
```

### Step 3: Add Hospital Scoping (if not present)
```typescript
// Add to hook function:
const { hospitalId, validateScope } = useHospitalScope();
// Use in queries to filter by hospitalId
```

### Step 4: Create Index Export
```typescript
// In src/lib/hooks/{domain}/index.ts
export { usePatients } from './usePatients';
```

### Step 5: Update All Consumers
```bash
# Find all import statements
grep -r "from '@/hooks/usePatients'" src/ --include="*.ts" --include="*.tsx"

# Replace in each file:
# OLD: import { usePatients } from '@/hooks/usePatients';
# NEW: import { usePatients } from '@/lib/hooks/patients';
```

### Step 6: Verify Tests Pass
```bash
npm run test:unit -- src/hooks/__tests__/usePatients.test.ts
```

---

## Success Metrics (End of Week 1)

| Metric | Target | Owner |
|--------|--------|-------|
| Patient hooks migrated to lib/ | 6/6 | Backend |
| Appointment hooks migrated to lib/ | 6/6 | Backend |
| Pharmacy hooks migrated to lib/ | 6/6 | Backend |
| Patient tests passing | 25+ | QA |
| Appointment tests passing | 20+ | QA |
| Pharmacy tests passing | 20+ | QA |
| Hospital scoping validation | 100% | Security |
| Build succeeds (0 errors) | ✅ | Backend |
| 0 new broken imports | ✅ | Backend |
| Code coverage maintained or improved | >55% | QA |

---

## Blockers & Escalation

**If import search returns 20+ files to update**:
- [ ] Consider automated find/replace (safer than manual)
- [ ] Document all file changes in a matrix
- [ ] Test incrementally (one domain at a time)

**If tests fail post-migration**:
- [ ] Rollback domain to src/hooks/
- [ ] Debug import paths or dependency issues
- [ ] Check if hook relies on src/hooks/ sibling exports
- [ ] Escalate to Senior Backend Engineer for investigation

**If hospital_id validation breaks**:
- [ ] Verify useAuthContext() properly injected in test environment
- [ ] Check if tests mock museum_id correctly
- [ ] May need to adjust hospital scoping logic

---

## Deliverables

**By Friday Apr 15**:
1. ✅ 18 hooks migrated to lib/hooks/{domain}/ structure
2. ✅ 65+ tests passing (25+20+20 from three domains)
3. ✅ 0 cross-hospital data leak vulnerabilities
4. ✅ All imports updated across codebase
5. ✅ Hospital scoping middleware implemented
6. ✅ Migration summary document created
7. ✅ Gate review ready (HP refactoring 80% for Week 1 contribution)

