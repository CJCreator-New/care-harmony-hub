# Phase 1 Refactoring Priority List

**Date**: April 9, 2026 (based on baseline audit: 48% → 80%+ target)  
**Status**: Creating PR backlog for Phase 1 (Weeks 2-4)  
**Owner**: Tech Lead + Frontend/Backend Leads

---

## Priority Framework

**Scoring Factors** (1-5 scale):
- **Impact**: How many files affected + how critical the pattern
- **Effort**: Estimated PR complexity (1 = trivial, 5 = major refactor)
- **Risk**: Potential for breaking changes
- **Security**: HIPAA/OWASP implications

**Priority = (Impact × 2) + Security - Effort**

---

## HIGH PRIORITY REFACTORS (Start Immediately)

### 🔴 HP-1: Hospital Scoping Enforcement (Backend)
**Pattern**: Add `hospital_id` filter to all database queries  
**Why Critical**: Security vulnerability - HIPAA violation if not enforced  
**Files Affected**: 26 backend services (estimated)  
**Effort**: 3/5 (medium - systematic change)  
**Impact**: 5/5 (100% of patient data queries)  
**Security**: 5/5 (critical HIPAA requirement)  
**Score**: 15

**Tasks**:
```sql
-- Step 1: Identify all Supabase queries without hospital_id filter
-- grep -r "\.select\|\.insert\|\.update\|\.delete" src/services/*.ts
-- Check if each includes .eq('hospital_id', ...)

-- Step 2: Create base pattern in repository.ts
const withHospitalScoping = (query, hospitalId) => 
  query.eq('hospital_id', hospitalId);

-- Step 3: Apply to top 10 services first (core workflows)
-- Step 4: Add test coverage for hospital isolation
-- Step 5: Verify RLS policy also enforces (defense-in-depth)
```

**PRs to Create**:
1. `[Phase 1] [Backend] Hospital Scoping: Add filters to patient-related queries`
2. `[Phase 1] [Backend] Hospital Scoping: Add filters to prescription queries`
3. `[Phase 1] [Backend] Hospital Scoping: Add filters to appointment queries`
4. `[Phase 1] [Backend] Hospital Scoping: Add filters to lab/pharmacy queries`

**Acceptance Criteria**:
- [ ] All 26 services include hospital_id in .eq() filters
- [ ] Integration tests verify queries are scoped per hospital
- [ ] No raw SQL without hospital_id
- [ ] Audit passes for hospital scoping: 100% (5/5)

**Owner**: Backend Lead  
**Timeline**: 4-5 PRs, 1 week

---

### 🔴 HP-2: React Hook Form + Zod Standardization (Frontend)
**Pattern**: Replace unvalidated forms with React Hook Form + Zod  
**Why Critical**: Form security vulnerability - injection attacks  
**Files Affected**: 8-12 forms across components  
**Effort**: 3/5 (medium - formulaic changes)  
**Impact**: 5/5 (all patient-facing forms)  
**Security**: 4/5 (input validation + type safety)  
**Score**: 14

**Files to Refactor** (highest risk):
1. PrescriptionForm.tsx — medication entry (drug interaction checks)
2. LabOrderForm.tsx — test order creation
3. PatientRegistrationForm.tsx — patient creation
4. ConsultationNotes.tsx — clinical documentation
5. VitalsEntry.tsx — vital signs input

**Tasks**:
```tsx
// Pattern to apply:
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const prescriptionSchema = z.object({
  medicationId: z.string().uuid('Invalid medication'),
  dosage: z.number().positive('Dosage must be positive'),
  frequency: z.enum(['once', 'twice', 'thrice']),
  duration: z.number().int().min(1).max(365),
});

export function PrescriptionForm() {
  const form = useForm({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {...},
  });
  
  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

**PRs to Create**:
1. `[Phase 1] [Frontend] Forms: Standardize PrescriptionForm with RHF + Zod`
2. `[Phase 1] [Frontend] Forms: Standardize patient registration forms`
3. `[Phase 1] [Frontend] Forms: Standardize clinical note forms`
4. `[Phase 1] [Frontend] Forms: Add Zod schemas library (reusable)`

**Acceptance Criteria**:
- [ ] 8+ forms use React Hook Form + Zod
- [ ] All forms have validation error messages
- [ ] TypeScript strict types for form values
- [ ] Audit passes: React Hook Form score 100%

**Owner**: Frontend Lead  
**Timeline**: 4 PRs, 1 week

---

### 🔴 HP-3: Error Boundaries & PHI Logging (Frontend + Backend)
**Pattern**: Centralize error handling, ensure no PHI in logs  
**Why Critical**: HIPAA violation if PHI appears in logs/error messages  
**Files Affected**: All route handlers + error boundaries  
**Effort**: 2/5 (low - mostly config changes)  
**Impact**: 5/5 (affects all error scenarios)  
**Security**: 5/5 (critical HIPAA + security requirement)  
**Score**: 15

**Tasks**:
```tsx
// Frontend: Global error boundary
export function RootErrorBoundary() {
  return (
    <ErrorBoundary
      fallback={<ErrorPage />}
      onError={(error, error_info) => {
        // Sanitize before logging
        const sanitized = sanitizeForLog(error.message);
        console.error('App error:', sanitized);
      }}
    >
      <AppRoutes />
    </ErrorBoundary>
  );
}

// Backend: Central error handler
app.use((err, req, res, next) => {
  const sanitized = sanitizeForLog(err.message);
  logger.error('Request failed', { sanitized, status: err.statusCode });
  res.status(err.statusCode || 500).json({ 
    error: 'An error occurred. Please contact support.' 
  });
});
```

**PRs to Create**:
1. `[Phase 1] [Frontend] Error Handling: Add ErrorBoundary to all page routes`
2. `[Phase 1] [Backend] Error Handling: Centralize error middleware with sanitization`
3. `[Phase 1] [All] Logging: Remove all PHI from console logs`

**Acceptance Criteria**:
- [ ] All page routes wrapped with error boundary
- [ ] No error.message or stack traces in HTTP responses
- [ ] All logs sanitized (PHI removed)
- [ ] Audit passes: Error handling score 100%

**Owner**: Tech Lead + Frontend + Backend  
**Timeline**: 3 PRs, 1 week

---

### 🟡 HP-4: Custom Hooks Library & Reuse (Frontend)
**Pattern**: Extract reusable logic → custom hooks  
**Why Important**: Reduces code duplication, improves maintainability  
**Files Affected**: 15-20 components  
**Effort**: 3/5 (medium - requires refactoring logic extraction)  
**Impact**: 4/5 (improves 20+ components)  
**Security**: 2/5 (no direct security impact)  
**Score**: 10

**Priority Hooks to Extract**:
1. `usePatientData()` — fetch + cache patient info (used in 8+ components)
2. `usePrescriptions()` — fetch + filter prescriptions
3. `useHIPAACompliance()` — encryption/decryption wrapper (reusable encryption)
4. `usePermissions()` — role-based feature gating
5. `usePaginatedQuery()` — combine useQuery + pagination logic

**PRs to Create**:
1. `[Phase 1] [Frontend] Hooks: Create custom hooks library (usePatient, usePrescriptions)`
2. `[Phase 1] [Frontend] Hooks: Extract HIPAA compliance wrapper`
3. `[Phase 1] [Frontend] Components: Refactor to use custom hooks (8 components)`

**Acceptance Criteria**:
- [ ] 5+ custom hooks implemented
- [ ] No duplicate data-fetching logic
- [ ] All hooks have TypeScript types
- [ ] Audit passes: Hooks usage >80%

**Owner**: Frontend Lead  
**Timeline**: 3 PRs, 1 week

---

### 🟡 HP-5: Service Layer Isolation (Backend)
**Pattern**: Move business logic from controllers → services  
**Why Important**: Testability, separation of concerns  
**Files Affected**: 10 controllers + 15 services  
**Effort**: 4/5 (high - requires logic reorganization)  
**Impact**: 4/5 (improves 15+ services)  
**Security**: 2/5 (no direct security impact)  
**Score**: 8

**Files to Refactor**:
```
Controllers (HTTP-focused only):
- validateRequest() → middleware
- extractHospitalId() → middleware
- delegate to service → NOT business logic

Services (business logic):
- drug interaction checks
- appointment state transitions
- prescription validation
- lab result interpretation
- billing calculations
```

**PRs to Create**:
1. `[Phase 1] [Backend] Services: Extract prescription validation logic`
2. `[Phase 1] [Backend] Services: Extract appointment scheduling logic`
3. `[Phase 1] [Backend] Controllers: Remove business logic, delegate to services`

**Acceptance Criteria**:
- [ ] All controllers <100 lines (thin HTTP handlers)
- [ ] All services independently testable
- [ ] No database access in controllers
- [ ] Audit passes: Service layer isolation >90%

**Owner**: Backend Lead  
**Timeline**: 3 PRs, 1.5 weeks

---

## MEDIUM PRIORITY REFACTORS (Weeks 3-4)

### 🟡 MP-1: TypeScript Type System Hardening
**Impact**: 3/5 | **Effort**: 4/5 | **Security**: 3/5 | **Score**: 7
```
- Remove all `any` types (currently 48% have `any`)
- Add proper DTO interfaces
- Enable strict null checks
- Create shared type library for domain objects
```

**PRs**: 2-3 PRs

---

### 🟡 MP-2: Repository Pattern Standardization
**Impact**: 3/5 | **Effort**: 3/5 | **Security**: 3/5 | **Score**: 8
```
- Create base repository class  
- Ensure NO raw SQL (all parameterized queries)
- Standardize filtering/pagination methods
- Apply to 8+ services
```

**PRs**: 2-3 PRs

---

### 🟢 MP-3: Sonner Toast Standardization
**Impact**: 2/5 | **Effort**: 2/5 | **Security**: 1/5 | **Score**: 4
```
- Centralize toast calls (success/error/warning patterns)
- Ensure no PHI in error messages
- Create toast utility library
- Apply to all forms
```

**PRs**: 1-2 PRs

---

### 🟢 MP-4: Component Props Typing
**Impact**: 3/5 | **Effort**: 2/5 | **Security**: 2/5 | **Score**: 7
```
- Add explicit Props interface to all components
- Remove prop drilling where possible
- Use Context for deeply nested props
- Audit: 358 components to check
```

**PRs**: 3-4 PRs

---

## LOW PRIORITY REFACTORS (Phase 1 Week 4)

### 🟢 LP-1: State Management Cleanup
**Impact**: 2/5 | **Effort**: 2/5 | **Security**: 1/5 | **Score**: 3
- Move client state → TanStack Query
- Reduce excessive useState usage
- Consolidate related state

### 🟢 LP-2: Documentation & Comments
**Impact**: 2/5 | **Effort**: 1/5 | **Security**: 1/5 | **Score**: 3
- Add JSDoc to public APIs
- Update README for current state
- Document architectural decisions

---

## Phase 1 Refactoring Roadmap

```
WEEK 2 (April 15-19)
├─ HP-1: Hospital Scoping (2 PRs, Backend Lead)
├─ HP-2: React Hook Form (2 PRs, Frontend Lead)
├─ HP-3: Error Handling (1 PR, Tech Lead)
└─ Goal: 5 PRs merged, score +15 percentage points

WEEK 3 (April 22-26)
├─ HP-2: Continue forms (2 more PRs)
├─ HP-4: Custom Hooks (2 PRs, Frontend Lead)
├─ HP-5: Service Layer (1 PR, Backend Lead)
└─ Goal: 5 PRs merged, score +15 percentage points

WEEK 4 (April 29-May 3)
├─ HP-1: Finish Hospital Scoping (2 more PRs)
├─ MP-1: TypeScript Hardening (2 PRs)
├─ MP-2: Repository Pattern (1 PR)
└─ Goal: 5 PRs merged, score +15 percentage points

FINAL TARGET (end of Week 4)
─ Overall Score: 79-82% (from 48%)
─ All high-priority refactors complete
─ Ready for Phase 2: Testing
```

---

## Validation Criteria

After each PR:
1. Run `python scripts/phase1-audit.py` — verify score increased
2. All tests pass: `npm run test:unit && npm run test:integration`
3. No TypeScript errors: `npm run type-check`
4. Code review approval (using SECURITY_CHECKLIST.md template)

---

**Backlog Tool**: Use GitHub Project Board with labels:
- `phase-1-refactor`
- `high-priority`
- `frontend`/`backend`
- `security`

This enables rapid prioritization and tracking across the 15-20 total PRs needed to close the 32-point gap.
