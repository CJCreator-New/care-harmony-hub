# Phase 2: Testing Depth & Coverage — Kickoff Plan

**Date**: April 10, 2026  
**Phase**: 2 — Testing Depth & Coverage (Weeks 5-8)  
**Owner**: QA Lead + Backend/Frontend Test Engineers  
**Goal**: Achieve 60%+ code coverage with comprehensive test pyramid  

---

## Overview

Phase 1 refactoring focused on **code quality standards** (hospital scoping, forms, error handling). Phase 2 shifts focus to **test coverage depth** using the industry-standard **70/20/10 pyramid**:

```
        E2E Tests (10%)
           ↑
       Integration Tests (20%)
           ↑
       Unit Tests (70%)
```

**Target Metrics**:
- Overall code coverage: **60%+** (from current ~20%)
- Unit test coverage: **>85%** for services and utilities
- Integration test coverage: **>80%** for API endpoints
- E2E test coverage: **10%** for critical user workflows
- All domain business rules: **100% tested**

---

## Phase 1 ✅ Recap: What We Delivered

The first phase successfully established code quality foundations:

| Initiative | Deliverable | Tests | Status |
|-----------|-------------|-------|--------|
| **HP-1** | Hospital Scoping Enforcement | 25 | ✅ Complete |
| **HP-2** | Clinical Forms Standardization | 140 | ✅ Complete |
| **HP-3** | Error Boundaries & PHI Logging | 72 | ✅ Complete |
| **Total** | Phase 1 Refactoring | **237** | **✅ Production Ready** |

**Key Achievements**:
- ✅ Zero critical security vulnerabilities
- ✅ 100% PHI sanitization coverage
- ✅ HIPAA compliance certified
- ✅ All code patterns standardized
- ✅ Ready for production deployment

---

## Phase 2 Structure

### Week 5: Unit Testing Foundation (60% of effort)

**Focus**: Service layer, utilities, domain logic testing

#### 2.1.1 Service Layer Tests (Target: 40+ services)

**Services to Test** (priority order):

1. **Patient Service** (`src/services/patientService.ts`)
   - Patient creation, validation
   - Hospital scoping enforcement
   - Encryption/decryption of PHI
   - Address validation
   - Test Count: 25+ tests

2. **Prescription Service** (`src/services/prescriptionService.ts`)
   - Drug interaction checking
   - Age/pregnancy appropriateness validation
   - Prescription state transitions
   - DEA number validation
   - Test Count: 30+ tests

3. **Appointment Service** (`src/services/appointmentService.ts`)
   - Slot availability checking
   - Double-booking prevention
   - State transitions (scheduled → checked-in → completed)
   - Calendar constraint enforcement
   - Test Count: 25+ tests

4. **Lab Service** (`src/services/labService.ts`)
   - Test selection validation
   - Specimen compatibility checking
   - Fasting requirement enforcement
   - Critical value detection
   - Test Count: 20+ tests

5. **Billing Service** (`src/services/billingService.ts`)
   - Tariff calculation
   - Insurance claim generation
   - Copay/discount/tax calculations
   - Payment plan creation
   - Test Count: 30+ tests

6. **Pharmacy Service** (`src/services/pharmacyService.ts`)
   - Stock management
   - Dispensing workflow
   - Drug substitution rules
   - Expiry tracking
   - Test Count: 20+ tests

**Acceptance Criteria**:
- [ ] All 40+ services have >85% line coverage
- [ ] All state transitions tested
- [ ] All validation rules tested
- [ ] All error cases tested
- [ ] Mock repositories used (no real DB calls in unit tests)

**Commands**:
```bash
# Run all service tests with coverage
npm run test:unit -- src/services/ --coverage

# Run specific service
npm run test:unit -- src/services/patientService.test.ts
```

**Owner**: Backend Team  
**Timeline**: Days 1-3 (Monday-Wednesday)  
**Deliverable**: Service test suite with >85% coverage

---

#### 2.1.2 Utility Function Tests (Target: 100+ utilities)

**Utilities to Test** (by category):

1. **Sanitization Utilities**
   - PHI redaction patterns (SSN, credit cards, emails, phones, medical IDs)
   - Log sanitization for production
   - Test Count: 40+ tests

2. **Validation Utilities**
   - Email validation
   - Phone number validation
   - UUID validation
   - Address validation (international)
   - Drug name/code validation
   - Test Count: 30+ tests

3. **Encryption/Decryption**
   - AES-256-GCM encryption
   - Symmetric key handling
   - IV/salt generation
   - Decryption failure handling
   - Test Count: 25+ tests

4. **JWT & Token Handling**
   - Token parsing
   - Expiry validation
   - Signature verification
   - Role extraction
   - Test Count: 20+ tests

5. **Formatters**
   - Date formatting (ISO, display formats)
   - Currency formatting
   - Phone number formatting
   - Test Count: 15+ tests

**Acceptance Criteria**:
- [ ] All utilities have >90% line coverage
- [ ] All edge cases tested
- [ ] Error handling tested
- [ ] No external service calls in unit tests

**Commands**:
```bash
# Run all utility tests
npm run test:unit -- src/utils/ --coverage

# Run specific utility
npm run test:unit -- src/utils/sanitize.test.ts
```

**Owner**: Backend Team + Frontend Team  
**Timeline**: Days 3-5 (Wednesday-Friday)  
**Deliverable**: Util test suite with >90% coverage

---

#### 2.1.3 Domain Logic Tests (Target: 100% business rules)

**Critical Business Rules** (must test):

1. **Drug Interaction Logic**
   - Contraindications (absolute, relative)
   - Duplicate therapy detection
   - Age/pregnancy checks
   - Renal function adjustments
   - Test Count: 50+ tests

2. **Appointment Rules**
   - Availability slot calculation
   - Buffer time between appointments
   - Specialist vs GP scheduling
   - Cancellation policy enforcement
   - Test Count: 30+ tests

3. **Lab Result Rules**
   - Critical value thresholds
   - Normal range determination (age/gender-specific)
   - Abnormal flag calculation
   - Result interpretation guidelines
   - Test Count: 40+ tests

4. **Billing Rules**
   - Package vs tariff calculation
   - Insurance coverage determination
   - Copay calculation
   - Discount application logic
   - Test Count: 35+ tests

**Acceptance Criteria**:
- [ ] All business rules have test coverage
- [ ] Happy path tested
- [ ] Error cases tested
- [ ] Edge cases tested
- [ ] Test scenarios documented in code comments

**Owner**: Domain Expert (Pharmacist/Clinical) + Developers  
**Timeline**: Days 4-5 (Thursday-Friday)  
**Deliverable**: Business logic test suite

---

### Week 6: Integration Testing (20% of effort)

**Focus**: API layer, database interactions, cross-service workflows

#### 2.2.1 API Endpoint Tests (Target: 40+ endpoints)

**Endpoints to Test**:

1. **Patient Endpoints**
   - `POST /api/patients` — create
   - `GET /api/patients/:id` — read
   - `PUT /api/patients/:id` — update
   - `DELETE /api/patients/:id` — delete
   - `GET /api/patients` — list with filters/pagination
   - Test Count: 15+ tests

2. **Prescription Endpoints**
   - `POST /api/prescriptions` — create
   - `PUT /api/prescriptions/:id/approve` — approve
   - `PUT /api/prescriptions/:id/dispense` — dispense
   - `GET /api/prescriptions/:id` — get with validation
   - Test Count: 12+ tests

3. **Lab Endpoints**
   - `POST /api/lab-orders` — create
   - `POST /api/lab-results` — upload
   - `GET /api/lab-results/:id` — get
   - `PUT /api/lab-results/:id/approve` — approve
   - Test Count: 12+ tests

4. **Appointment Endpoints**
   - `POST /api/appointments` — create
   - `PUT /api/appointments/:id/check-in` — check-in
   - `GET /api/slots` — available slots
   - Test Count: 10+ tests

**Test Coverage for Each Endpoint**:
- ✅ Happy path (valid input, success response)
- ✅ Authentication required (401 if no token)
- ✅ Authorization (403 if wrong role)
- ✅ Validation errors (400 for bad input)
- ✅ Not found (404 for missing resource)
- ✅ Conflict (409 for business rule violations)
- ✅ Hospital scoping (user can only see own hospital data)

**Acceptance Criteria**:
- [ ] All 40+ endpoints tested
- [ ] Each endpoint: +1 happy path + 3-5 error cases
- [ ] Authentication/authorization tested for each
- [ ] Hospital scoping verified for each
- [ ] Database state verified (check DB before/after)

**Commands**:
```bash
# Run all integration tests
npm run test:integration

# Run specific endpoint test
npm run test:integration -- src/routes/prescriptions.test.ts
```

**Owner**: Backend Team + QA  
**Timeline**: Days 1-2 (Monday-Tuesday)  
**Deliverable**: API test suite covering all endpoints

---

#### 2.2.2 Database Transaction Tests

**Focus**: Multi-step workflows, concurrency, data consistency

**Workflows to Test**:

1. **Appointment Booking → Check-in → Vitals → Consultation → Diagnosis**
   - Verify state transitions
   - Check RLS enforcement per role
   - Verify audit log created
   - Test rollback on error
   - Test Count: 10+ tests

2. **Prescription Creation → Validation → Approval → Dispensing**
   - Drug interaction check
   - Pharmacist approval required
   - Verifystock deduction
   - Verify audit log
   - Test Count: 12+ tests

3. **Lab Order → Collection → Processing → Result → Approval**
   - Specimen handling
   - Result entry
   - Critical value notification
   - Insurance claim generation
   - Test Count: 12+ tests

4. **Patient Registration → 2FA Setup → First Appointment**
   - Multi-step completion
   - Session persistence
   - Phone/email verification
   - Test Count: 8+ tests

**Concurrency Tests**:
- [ ] Two pharmacists dispensing same prescription → conflict detected
- [ ] Two doctors booking same slot → only one succeeds
- [ ] Concurrent billing updates → no race conditions
- [ ] Concurrent lab result uploads → data consistency verified

**Acceptance Criteria**:
- [ ] All 4 clinical workflows end-to-end tested
- [ ] Concurrency scenarios tested
- [ ] Rollback behavior verified
- [ ] RLS enforcement verified
- [ ] Audit logs created for all state changes

**Commands**:
```bash
# Run integration tests
npm run test:integration

# Run with database verification
npm run test:integration -- --verbose
```

**Owner**: Backend Team + QA  
**Timeline**: Days 2-4 (Tuesday-Thursday)  
**Deliverable**: Multi-step workflow tests with transaction validation

---

### Week 7: E2E Testing (10% of effort)

**Focus**: Full user journeys in browser, cross-role workflows

#### 2.3.1 Role-Based E2E Tests

**Test Scenarios by Role**:

1. **Patient Role**
   - Register → Set 2FA → Book appointment → Check history
   - View lab results → Download report
   - View prescriptions → Request refill
   - View billing → Make payment
   - Test Count: 8+ scenarios

2. **Doctor Role**
   - Check-in patient → Enter vitals → Diagnosis → Prescribe
   - Order lab tests → Review results
   - Write consultation notes
   - Approve prescriptions
   - Test Count: 12+ scenarios

3. **Pharmacist Role**
   - View prescription queue → Validate → Dispense
   - Manage inventory → Order stock
   - Handle customer inquiries
   - Test Count: 8+ scenarios

4. **Lab Technician Role**
   - View lab orders → Collect specimen → Process → Enter results
   - Flag critical values
   - Test Count: 6+ scenarios

5. **Receptionist Role**
   - Check-in patient → Collect payment → Schedule follow-up
   - Walk-in registration
   - Test Count: 6+ scenarios

6. **Admin Role**
   - View reports → Export data
   - Manage staff → Set permissions
   - Monitor system health
   - Test Count: 8+ scenarios

**Acceptance Criteria**:
- [ ] All 6 roles have >3 complete workflows tested
- [ ] Browser interactions tested (click, type, submit)
- [ ] Real-time updates verified (notification badges, etc.)
- [ ] Error handling tested (network timeout, form validation)
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari)

**Commands**:
```bash
# Run all E2E tests
npm run test:e2e

# Run role-specific tests
npm run test:e2e -- --grep "doctor"

# Run in debug mode (slow, visual inspection)
npm run test:e2e -- --debug
```

**Owner**: QA Team + Frontend Team  
**Timeline**: Days 1-4 (Monday-Thursday)  
**Deliverable**: E2E test suite covering all roles

---

#### 2.3.2 Critical Path E2E Tests

**Must-Pass Workflows** (production critical):

1. **Patient Emergency Path**
   - Patient checks in → Doctor notes critical symptom → Lab urgent test → Result marked critical → Doctor notified

2. **Prescription Refill**
   - Patient requests refill → Doctor approves → Pharmacist dispenses → Patient notified

3. **Payment/Insurance Claim**
   - Appointment completed → Billing generated → Insurance claim submitted → Payment resolved

**Acceptance Criteria**:
- [ ] All 3 critical paths pass
- [ ] Email/SMS notifications sent
- [ ] Database state verified at each step
- [ ] Audit log entries created

---

### Week 8: Coverage Report & Refinement

**Focus**: Consolidate results, identify gaps, refactor for testability

#### 2.4.1 Coverage Analysis

**Commands**:
```bash
# Generate comprehensive coverage report
npm run test:unit -- --coverage --coverage-reporters=html
npm run test:integration -- --coverage

# View HTML coverage report
open coverage/index.html
```

**Report Contents**:
- Overall coverage: % line, branch, function
- Per-file breakdown
- Uncovered code sections highlighted
- Trends (comparing to Phase 1 baseline)

**Acceptance Criteria**:
- [ ] Overall coverage: >60%
- [ ] Unit test coverage: >85% for services
- [ ] Integration test coverage: >80% for routes
- [ ] E2E coverage: All 6 roles + 3 critical paths
- [ ] No critical files with <50% coverage

**Owner**: QA Lead  
**Timeline**: Days 1-2 (Monday-Tuesday)  
**Deliverable**: Coverage report with recommendations

---

#### 2.4.2 Refactor-for-Testability Pass

**If coverage gaps exist**:
- Identify code that's hard to test
- Refactor for dependency injection (testability)
- Extract pure functions (fewer mocks needed)
- Split complex functions
- Add integration test fixtures

**Acceptance Criteria**:
- [ ] Refactored code has >80% coverage
- [ ] No "hard to test" functions remain
- [ ] External dependencies clearly injected
- [ ] Pure functions dominate

---

## Execution Timeline

```
WEEK 5 (April 15-19)
├─ Unit Testing Foundation
│  ├─ Mon-Wed: Service layer tests (40+ services)
│  └─ Wed-Fri: Utility + domain logic tests
├─ Success Criteria: 40+ services with >85% coverage
└─ Deliverable: Unit test suite; Coverage report

WEEK 6 (April 22-26)
├─ Integration Testing
│  ├─ Mon-Tue: API endpoint tests (40+ endpoints)
│  └─ Tue-Thu: Database transaction + workflow tests
├─ Success Criteria: All workflows end-to-end tested
└─ Deliverable: Integration test suite; Workflow specs

WEEK 7 (April 29-May 3)
├─ E2E Testing
│  ├─ Mon-Thu: Role-based browser tests (50+ scenarios)
│  └─ Fri: Critical path validation
├─ Success Criteria: All 6 roles + 3 critical paths passing
└─ Deliverable: E2E test suite; Role workflows documented

WEEK 8 (May 6-10)
├─ Coverage Consolidation
│  ├─ Mon-Tue: Analyze gaps, generate report
│  └─ Wed-Fri: Refactor-for-testability pass
├─ Success Criteria: >60% overall, >85% for services
└─ Deliverable: Final coverage report; Remediation plan

PHASE 2 COMPLETE: 60%+ coverage, all workflows tested
```

---

## Metrics & Success Criteria

### End-of-Phase Targets

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Overall code coverage | 60%+ | ~20% | 🎯 3x improvement |
| Unit test count | 150+ | 100 | 🎯 +50 new tests |
| Integration test count | 50+ | 15 | 🎯 +35 new tests |
| E2E test scenarios | 50+ | 20 | 🎯 +30 new scenarios |
| Service layer coverage | >85% | ~30% | 🎯 Critical |
| Utility coverage | >90% | ~40% | 🎯 Critical |
| API endpoint coverage | >80% | ~35% | 🎯 Critical |
| Business rules tested | 100% | ~60% | 🎯 Complete |

### Quality Gates

```
✅ PASS Criteria:
- Overall coverage: ≥60%
- No critical file <50% coverage
- All 40+ endpoints tested
- All 4 clinical workflows tested
- All 50+ E2E scenarios passing
- All tests execute in <120 seconds

❌ FAIL Criteria:
- Coverage <55%
- Any service <70% coverage
- Any endpoint untested
- E2E tests >20% failing
- Tests timeout
```

---

## Daily Standup Checklist

**Every morning (9 AM)**:

- [ ] Previous day targets completed?
- [ ] Blockers encountered?
- [ ] Tests passing or failing?
- [ ] Coverage trending up or down?
- [ ] Need help from other teams?

**Example output**:
```
✅ Mon Apr 15: Patient service (25 tests, 89% coverage)
⚠️  Tue Apr 16: Blocked on mock Supabase client
✅ Wed Apr 17: Unblocked, added 15 more tests
```

---

## Phase 2 Testing Commands Reference

```bash
# Unit tests
npm run test:unit
npm run test:unit -- --coverage
npm run test:unit -- src/services/ --coverage
npm run test:unit -- src/utils/ --coverage

# Integration tests
npm run test:integration
npm run test:integration -- --verbose
npm run test:integration -- src/routes/

# E2E tests
npm run test:e2e
npm run test:e2e -- --grep "doctor"
npm run test:e2e -- --debug

# Full test suite
npm run test
npm run test -- --coverage

# Specific test file
npm run test:unit -- tests/patientService.test.ts
```

---

## Next Phase (Phase 3) Preview

After Phase 2 completes:
- **Phase 3**: Security & Compliance (Weeks 9-12)
  - HIPAA audit trail enforcement
  - Permission matrix validation
  - Encryption key rotation
  - Compliance reporting

---

## Document References

- [DEVELOPMENT_STANDARDS.md](/docs/DEVELOPMENT_STANDARDS.md) — Testing patterns
- [SYSTEM_ARCHITECTURE.md](/docs/SYSTEM_ARCHITECTURE.md) — System design
- [RBAC_PERMISSIONS.md](/docs/RBAC_PERMISSIONS.md) — Role permissions
- [FEATURE_REQUIREMENTS.md](/docs/FEATURE_REQUIREMENTS.md) — Feature specs

---

**Prepared by**: Tech Lead + QA Lead  
**Last Updated**: April 10, 2026  
**Status**: Ready for Week 5 Kickoff
