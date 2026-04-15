# Phases 1-2 Execution Plan (Apr 11 - May 10)

**Status Date**: April 10, 2026  
**Duration**: 4 weeks (Apr 11 - May 10)  
**Goal**: Complete HP refactoring (40% → 80%+) AND consolidate test coverage to >70%  
**Success Criteria**: All Phase 2 tests passing, >70% coverage achieved, Phase 4 readiness gate cleared

---

## Overview

**Phase 1** and **Phase 2** execute in **parallel** over 4 weeks:
- **Phase 1**: Repository pattern refactoring (HP1/HP2/HP3 consolidation)
- **Phase 2 Week 8**: Test coverage consolidation (integration tests → unit tests)
- **Gate**: Both must pass before Phase 4 execution begins (May 13)

Timeline pressure: 33 days to achieve both, no serialization possible.

---

## Phase 1: Repository Pattern Refactoring (HP1/HP2/HP3 → HP3 Final)

### Current State
- HP1: 30% migration complete (core hooks stabilized)
- HP2: PR 1-2 merged (authorization + billing domain)
- HP3: In-progress (audit trail + observability)
- **Target**: 80%+ refactored by May 10

### Weekly Breakdown

#### Week 1 (Apr 11-17): Domain Consolidation Sprint
**Owner**: Senior Backend Engineer  
**Deliverables**: All remaining domain models consolidated

**Task 1.1: Finalize Patient Domain (HP3)**
- [ ] Migrate `src/hooks/patients/usePatientList.ts` → `lib/hooks/patients/`
- [ ] Migrate `src/hooks/patients/usePatientDetail.ts` → `lib/hooks/patients/`
- [ ] Consolidate patient list/detail + add hospital scoping
- [ ] All exports via `lib/hooks/index.ts` (re-export)
- [ ] Update all 15+ consumer components to use centralized import
- **Acceptance Criteria**: 
  - No patient hooks exist outside `lib/hooks/patients/`
  - Zero console warnings about hook imports
  - All patient tests pass (25+ tests)

**Task 1.2: Finalize Appointment Domain (HP3)**
- [ ] Migrate appointment hooks: CRUD, list, detail, filters
- [ ] Consolidate with billing/slots coordination
- [ ] Add retry logic for appointment conflicts
- [ ] Update 8+ appointment components
- **Acceptance Criteria**: Appointment CRUD tests all green

**Task 1.3: Finalize Pharmacy Domain (HP2 PR 2)**
- [ ] Migrate pharmacy hooks (prescription CRUD, inventory, dispensing)
- [ ] Consolidate with billing domain (insurance lookups)
- [ ] Migrate 5+ pharmacy components
- **Acceptance Criteria**: Pharmacy flow tests pass (30+ tests)

**Time Budget**: 40 hours

#### Week 2 (Apr 18-24): Authorization & Security Layer (HP2 consolidation)
**Owner**: Security Engineer  
**Deliverables**: All authorization logic centralized, RLS policy validation complete

**Task 2.1: Consolidate RBAC Hooks**
- [ ] Migrate `usePermissions()` hook → `lib/hooks/auth/usePermissions.ts`
- [ ] Consolidate role checks (doctor, nurse, receptionist, pharmacist, lab-tech, admin)
- [ ] Add hospital-scoped capability matrix
- [ ] Migrate `useRoleProtectedRoute()` component → `lib/components/RoleProtectedRoute.tsx`
- [ ] Update all 40+ route guards
- **Acceptance Criteria**: 
  - Role-based test suite passes (20+ tests)
  - Zero unprotected patient endpoints
  - Zero OHID bypass vulnerabilities (verified via OWASP test)

**Task 2.2: RLS Policy Validation**
- [ ] Run RLS enforcement tests (verify hospital_id scoping)
- [ ] Validate HIPAA Domain 5 (multi-tenancy) → 0 cross-hospital data leaks
- [ ] Document authorized/unauthorized queries per role
- [ ] Create RLS audit matrix (role × resource matrix)
- **Acceptance Criteria**: 
  - 100% RLS tests passing
  - 0 high/critical HIPAA findings

**Task 2.3: Sensitive Data Sanitization**
- [ ] Consolidate sanitize utilities → `lib/utils/sanitizeForLog.ts`
- [ ] Audit all log statements for PHI leakage
- [ ] Migrate 20+ log calls to use `sanitizeForLog()`
- [ ] Validate Sentry error tracking (PHI masking enabled)
- **Acceptance Criteria**: 
  - Zero PHI in logs (audit test)
  - 0 critical privacy findings

**Time Budget**: 35 hours

#### Week 3 (Apr 25-May 1): Audit Trail & Observability (HP3)
**Owner**: DevOps Engineer  
**Deliverables**: Audit trail centralized, observability hooks ready for Phase 4

**Task 3.1: Audit Trail Consolidation**
- [ ] Migrate `logActivity()` function → `lib/hooks/useAuditLog.ts`
- [ ] Consolidate audit event types (enum, not strings)
- [ ] Add correlation IDs across all clinical workflows
- [ ] Document audit event taxonomy (20+ event types)
- [ ] Migrate all 50+ audit calls
- **Acceptance Criteria**: 
  - 100% of clinical actions generate audit logs
  - 0 audit trail gaps (verified via test)
  - Audit chain integrity verified (HIPAA Domain 7)

**Task 3.2: Observability Hooks Setup**
- [ ] Create `lib/hooks/usePerformanceMetrics.ts` (timing hooks for Phase 4)
- [ ] Create `lib/hooks/useHealthCheck.ts` (readiness probes)
- [ ] Add structured logging middleware (correlation IDs, request IDs)
- [ ] Set up Prometheus metric exports (optional, backend focus)
- **Acceptance Criteria**: 
  - All 200+ Phase 4 load tests can capture metrics
  - Health check endpoint responds < 100ms
  - Correlation IDs tracked end-to-end

**Task 3.3: Error Resilience Review**
- [ ] Run error resilience test suite (hims-error-resilience skill)
- [ ] Fix any null reference, async race, unhandled exception issues
- [ ] Migrate error handlers to centralized `lib/utils/handleError.ts`
- [ ] Validate error boundary coverage (patient-critical flows)
- **Acceptance Criteria**: 
  - 0 unhandled exceptions in critical paths
  - Error resilience tests pass (40+ tests)

**Time Budget**: 38 hours

#### Week 4 (May 2-10): Final Integration & Gate Prep
**Owner**: QA Lead  
**Deliverables**: All HP refactoring complete, Phase 1 sign-off ready

**Task 4.1: Cross-Domain Integration Testing**
- [ ] Run full integration suite (cross-functional.test.ts) → all green
- [ ] Test end-to-end workflows (patient registration → appointment → prescription → billing)
- [ ] Validate no import cycles or module dependencies broken
- [ ] Performance: All page loads < 2sec (cold cache)
- **Acceptance Criteria**: 
  - 50+ integration tests pass
  - 0 E2E test failures
  - Page load times logged (baseline for Phase 4)

**Task 4.2: Coverage Consolidation (Phase 2 Integration)**
- [ ] Verify all unit tests pass (>70% coverage achieved)
- [ ] Merge Phase 2 Week 8 coverage work
- [ ] Final coverage report: unit + integration + E2E combined
- **Acceptance Criteria**: 
  - Unit test coverage >70%
  - 0 test failures
  - Coverage improvement documented

**Task 4.3: Gate Review Preparation**
- [ ] Compile refactoring summary (40% → 80%+ complete)
- [ ] Document before/after metrics
- [ ] List 20+ performance improvements identified
- [ ] Security sign-off: 0 HIPAA/OWASP issues introduced
- [ ] Readiness for Phase 4: ✅ GO decision collected (Project Lead + CTO)
- **Acceptance Criteria**: 
  - Gate review completed
  - CTO sign-off obtained
  - Phase 4 execution unblocked (May 13)

**Time Budget**: 30 hours

---

## Phase 2 Week 8: Test Coverage Consolidation (Parallel, Apr 11 - May 10)

### Current State
- Unit test coverage: 55-60%
- Target: >70%
- Focus: Integration tests → unit test conversion

### Weekly Breakdown

#### Week 1-2 (Apr 11-24): Coverage Gap Analysis
**Owner**: QA Engineer  
**Deliverables**: Coverage map, priority list for new unit tests

**Task 2.1: Coverage Gap Analysis**
- [ ] Run coverage report: `npm run test:unit -- --coverage`
- [ ] Identify 20+ low-coverage files (red zones)
- [ ] Prioritize by clinical criticality (patient data first)
- [ ] Map integration tests → unit test conversion opportunities
- **Output**: Coverage Gap Analysis spreadsheet (file, current %, target %, priority)

**Task 2.2: Unit Test Strategy**
- [ ] Create unit test template (hooks, components, utilities)
- [ ] Document mocking strategy (Supabase, TanStack Query, React Router)
- [ ] Define test pyramid for clinical workflows
- **Output**: Unit Testing Strategy Document (5 pages)

**Time Budget**: 20 hours

#### Week 3-4 (Apr 25-May 10): Unit Test Implementation
**Owner**: QA Engineers (2-person team)  
**Deliverables**: 30+ new unit tests, >70% coverage achieved

**Task 2.3: Core Domain Unit Tests**
- [ ] Patient domain: 10+ unit tests (hooks, components)
- [ ] Appointment domain: 8+ unit tests
- [ ] Pharmacy domain: 8+ unit tests
- [ ] Billing domain: 8+ unit tests
- **Acceptance Criteria**: 
  - All tests pass (50+ new tests)
  - Coverage jumps from 55-60% → >70%
  - 0 integration test dependencies in unit tests

**Task 2.4: Coverage Validation & Reporting**
- [ ] Run final coverage report
- [ ] Document coverage by module
- [ ] Flag any remaining <50% coverage files
- [ ] Create coverage trending chart (past 4 weeks)
- **Acceptance Criteria**: 
  - >70% coverage confirmed
  - Coverage report ready for stakeholders
  - Phase 2 gate review sign-off

**Time Budget**: 50 hours

---

## Combined Gate: Phase 1-2 Completion (May 10)

### Gate Review Criteria

| Criterion | Target | Owner | Status |
|-----------|--------|-------|--------|
| HP Refactoring | 80%+ complete | HP Lead | [ ] |
| Unit Test Coverage | >70% | QA Lead | [ ] |
| Integration Tests | 50+ passing | QA Lead | [ ] |
| Security Review | 0 HIPAA/OWASP issues | Security Lead | [ ] |
| CTO Approval | GO/NO-GO | CTO | [ ] |

### Go/No-Go Decision Logic

**GO** (Phase 4 Begins May 13):
- [ ] HP refactoring 80%+
- [ ] Coverage >70%
- [ ] All tests passing
- [ ] CTO approves

**NO-GO** (Phase 4 Delayed):
- If any criterion fails, Phase 4 start delayed by 1 week
- Extra week allocated for remediation
- Gate review re-run (May 17)

### Escalation Process

**If gate fails**:
1. CTO notifies Project Lead immediately
2. Root cause analysis meeting (within 4 hours)
3. Remediation task assignment (extra resource if needed)
4. Re-gate within 7 days

---

## Resource Allocation

| Role | Phase 1 Hours | Phase 2 Hours | Total | FTE |
|------|--------------|--------------|-------|-----|
| Senior Backend Engineer | 40 | 0 | 40 | 1.0 |
| Security Engineer | 35 | 0 | 35 | 0.9 |
| DevOps Engineer | 38 | 0 | 38 | 0.9 |
| QA Lead | 30 | 20 | 50 | 1.2 |
| QA Engineers (2×) | 0 | 50 | 50 | 1.25 |
| **Total** | **143** | **70** | **213** | **5.25 FTE** |

**Budget**: 213 hours ÷ 5 weeks ≈ 43 hours/week (10.75 hours/day burdened)

---

## Risk Management

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Coverage gap analysis reveals >100 new tests needed | Medium | High | Start analysis in Week 1; allocate 2 QA engineers if needed |
| RLS policy validation discovers cross-hospital leak | Low | Critical | Security team on standby; escalate immediately to CTO |
| Integration test → unit test conversion takes 2× time | Medium | High | Parallel work: split tests across 2 QA engineers |
| Performance regression during refactoring | Medium | Medium | Measure page load times weekly; flag if >10% degradation |
| HP refactoring introduces new test failures | Medium | High | Maintain separate coverage branch; roll back if failing threshold exceeded |

---

## Success Metrics (May 10 Gate Review)

- ✅ HP components consolidated to 80%+ (`lib/hooks/` dominant)
- ✅ Unit test coverage >70% (verified via coverage report)
- ✅ 100+ total tests passing (unit + integration)
- ✅ 0 HIPAA/OWASP critical issues
- ✅ Page load times < 2sec (cold cache, baseline for Phase 4)
- ✅ CTO gate review: **GO** decision

---

## Outputs for Phase 4

Upon Phase 1-2 completion, Phase 4 receives:
1. **Refactored Codebase** (80%+ HP complete) → easier to profile/optimize
2. **Comprehensive Test Suite** (>70% coverage) → confidence for performance changes
3. **Observability Hooks** (ready for Phase 4 metrics capture)
4. **Baseline Metrics** (page load times, RLS latency, error rates)
5. **Gate Approval** (CTO sign-off for May 13 start)

