# Phase 2: Week 7 Kickoff
## E2E Testing Rollout (Apr 29 — May 3, 2026)

**Executive Summary**: Transition from integration testing to end-to-end browser automation across 6 clinical roles (Patient, Doctor, Pharmacist, Lab Tech, Receptionist, Admin). Target: 50+ E2E scenarios with 100% critical path coverage.

---

## 📊 Quick Reference Dashboard

### Week 7 Targets
| Metric | Target | Success Criteria |
|--------|--------|------------------|
| **E2E Scenarios** | 50+ | ≥50 passing tests |
| **Roles Covered** | 6/6 | Patient, Doctor, Pharmacy, Lab, Reception, Admin |
| **Critical Flows** | 100% | All core workflows passing |
| **Browser Coverage** | 3 | Chrome, Firefox, Safari |
| **Pass Rate** | ≥95% | ≤5% test flakiness tolerance |
| **Execution Time** | <10min | Per scenario set |

### Daily Focus Areas

| Day | Area | Deliverables | Owner |
|-----|------|--------------|-------|
| **Mon (Apr 29)** | Patient & Doctor Workflows | 8-10 scenarios | Frontend Team |
| **Tue (Apr 30)** | Pharmacy & Lab Workflows | 8-10 scenarios | Pharmacy + Lab Teams |
| **Wed (May 1)** | Reception & Admin Workflows | 8-10 scenarios | Ops + Admin Teams |
| **Thu (May 2)** | Cross-Role Edge Cases | 8-10 scenarios | QA Team |
| **Fri (May 3)** | Coverage Consolidation & CI/CD | Validation + Reports | QA Lead |

---

## 🚀 Execution Blueprint

### Phase 1: Playwright Configuration Review & Optimization (Mon 8:00 AM)
**Goal**: Ensure test harness is production-ready for high-volume E2E execution.

```bash
# Verify E2E test infrastructure (10-15 min)
npm run test:e2e:setup  # Validate Playwright config
npx playwright install  # Ensure all browsers available
npx playwright --version # Confirm version 1.40.0+
```

**Check List**:
- [ ] `playwright.e2e-full.config.ts` reviewed
- [ ] `playwright.roles.config.ts` confirmed for 6-role scenarios
- [ ] Test fixtures loaded (`tests/test/fixtures.ts`)
- [ ] Database seeding script ready (`tests/test/seed.ts`)
- [ ] Mock data generator ready (`tests/test/mockData.ts`)

---

### Phase 2: Role-Based Test Structure (Mon 10:00 AM)

**Test File Organization**:
```
tests/
├── e2e/
│   ├── patient/
│   │   ├── auth.e2e.test.ts
│   │   ├── dashboard.e2e.test.ts
│   │   ├── appointments.e2e.test.ts
│   │   ├── medical-history.e2e.test.ts
│   │   ├── prescriptions.e2e.test.ts
│   │   └── payments.e2e.test.ts
│   ├── doctor/
│   │   ├── auth.e2e.test.ts
│   │   ├── patient-search.e2e.test.ts
│   │   ├── prescription-workflow.e2e.test.ts
│   │   ├── lab-orders.e2e.test.ts
│   │   ├── consultation.e2e.test.ts
│   │   └── patient-notes.e2e.test.ts
│   ├── pharmacy/
│   │   ├── auth.e2e.test.ts
│   │   ├── prescription-queue.e2e.test.ts
│   │   ├── filling-process.e2e.test.ts
│   │   ├── inventory-mgmt.e2e.test.ts
│   │   └── payment-collection.e2e.test.ts
│   ├── laboratory/
│   │   ├── auth.e2e.test.ts
│   │   ├── lab-order-intake.e2e.test.ts
│   │   ├── specimen-processing.e2e.test.ts
│   │   ├── result-entry.e2e.test.ts
│   │   └── report-generation.e2e.test.ts
│   ├── receptionist/
│   │   ├── auth.e2e.test.ts
│   │   ├── patient-registration.e2e.test.ts
│   │   ├── appointment-booking.e2e.test.ts
│   │   ├── check-in.e2e.test.ts
│   │   └── billing-inquiry.e2e.test.ts
│   ├── admin/
│   │   ├── auth.e2e.test.ts
│   │   ├── user-management.e2e.test.ts
│   │   ├── hospital-config.e2e.test.ts
│   │   ├── role-permissions.e2e.test.ts
│   │   └── audit-logs.e2e.test.ts
│   └── workflows/
│       ├── patient-registration-to-payment.e2e.test.ts
│       ├── prescription-to-pickup.e2e.test.ts
│       ├── lab-order-to-results.e2e.test.ts
│       └── emergency-to-consultation.e2e.test.ts
```

---

## 📋 Week 7 Detailed Schedule

### **MONDAY, April 29** — Patient & Doctor E2E Foundation

#### Morning (8:00 AM - 12:00 PM): Setup & Patient Workflows
**8:00 - 8:15 AM**: Standup + Infrastructure Verification  
- Confirm all Playwright configs operational
- Database seeding verified
- Test data ready for distribution

**8:15 - 10:00 AM**: Patient Authentication & Dashboard (4 tests)
```
✓ tests/e2e/patient/auth.e2e.test.ts
  - Patient login with valid MRN
  - Patient login with invalid credentials (negative)
  - Session persistence across page reloads
  - Logout and session cleanup
```
**Acceptance**: Tests pass on Chrome + Firefox

**10:00 - 12:00 PM**: Patient Appointment Viewing & Booking (4 tests)
```
✓ tests/e2e/patient/appointments.e2e.test.ts
  - View upcoming appointments
  - Book new appointment with calendar interaction
  - Reschedule appointment
  - Cancel appointment with reason
```
**Acceptance**: All calendar interactions responsive, no flakiness

#### Afternoon (1:00 PM - 5:00 PM): Doctor Workflows
**1:00 - 1:15 PM**: Sync & Dependencies Check  
- Confirm patient workflows completed
- Review doctor role permissions

**1:15 - 3:00 PM**: Doctor Authentication & Patient Search (4 tests)
```
✓ tests/e2e/doctor/auth.e2e.test.ts
  - Doctor login with valid ID
  - Permission check (can see only assigned patients)
  - Hospital scoping enforced (no cross-hospital visibility)
  
✓ tests/e2e/doctor/patient-search.e2e.test.ts
  - Search patient by MRN
  - Search patient by name
  - Filter by appointment status
  - Pagination through results
```
**Acceptance**: Hospital scoping verified; no unauthorized data leakage

**3:00 - 5:00 PM**: Doctor Prescription Workflow (4 tests)
```
✓ tests/e2e/doctor/prescription-workflow.e2e.test.ts
  - Create prescription with drug lookup
  - Validate drug interactions check (UI confirmation)
  - Set dosage/frequency with age-appropriate warnings
  - Submit prescription to pharmacy queue
  - Verify prescription state transitions
```
**Acceptance**: Drug database responsive; state machine validated

**EOD**: Commit Day 1 tests (8-10 E2E scenarios)

---

### **TUESDAY, April 30** — Pharmacy & Laboratory Workflows

#### Morning (8:00 AM - 12:00 PM): Pharmacy E2E Tests
**8:00 - 8:15 AM**: Standup + Day 1 Validation  
- Review Monday results
- Address any flaky tests
- Confirm database state reset

**8:15 - 10:00 AM**: Pharmacy Queue & Prescription Filling (4 tests)
```
✓ tests/e2e/pharmacy/auth.e2e.test.ts
  - Pharmacist login
  - Inventory access control

✓ tests/e2e/pharmacy/prescription-queue.e2e.test.ts
  - View incoming prescription queue
  - Filter by urgency/status
  - Mark as "in-progress"
  - Verify patient notification triggered
```
**Acceptance**: Queue updates in real-time; notifications appear

**10:00 - 12:00 PM**: Pharmacy Filling & Inventory (4 tests)
```
✓ tests/e2e/pharmacy/filling-process.e2e.test.ts
  - Enter tablet count
  - Verify stock deduction
  - Print label
  - Mark ready for pickup
  - Generate receipt

✓ tests/e2e/pharmacy/inventory-mgmt.e2e.test.ts
  - Low-stock alerts trigger
  - Bulk inventory update
  - Expiry date tracking
```
**Acceptance**: Stock levels accurate; alerts timely

#### Afternoon (1:00 PM - 5:00 PM): Laboratory Workflows
**1:00 - 1:15 PM**: Sync & Lab Setup  
- Confirm pharmacy workflows pass
- Lab permissions verified

**1:15 - 3:00 PM**: Lab Order Intake & Specimen Processing (4 tests)
```
✓ tests/e2e/laboratory/auth.e2e.test.ts
  - Lab technician login
  - Sample collection area access

✓ tests/e2e/laboratory/lab-order-intake.e2e.test.ts
  - Receive lab order from doctor
  - Capture specimen info (type, volume, fasting)
  - Assign barcode
  - Mark ready for processing
```
**Acceptance**: Barcoding system responsive; audit trail logged

**3:00 - 5:00 PM**: Lab Result Entry & Reporting (4 tests)
```
✓ tests/e2e/laboratory/result-entry.e2e.test.ts
  - Enter test results (numeric + text)
  - Validate against reference ranges (flags high/low)
  - Review critical thresholds (auto-alert doctor if exceeded)
  - Sign off result with timestamp
  
✓ tests/e2e/laboratory/report-generation.e2e.test.ts
  - Generate PDF report
  - Patient portal notification
  - Doctor inbox update
```
**Acceptance**: Critical values trigger instant notifications; PDF valid

**EOD**: Commit Day 2 tests (8-10 E2E scenarios)

---

### **WEDNESDAY, May 1** — Reception & Admin Workflows

#### Morning (8:00 AM - 12:00 PM): Reception Workflows
**8:00 - 8:15 AM**: Standup & Integration Check  
- Verify Tue tests remain stable (regression check)
- Discuss any flakiness or waits needed

**8:15 - 10:00 AM**: Reception Patient Registration (4 tests)
```
✓ tests/e2e/receptionist/auth.e2e.test.ts
  - Receptionist login
  - Hospital dashboard access

✓ tests/e2e/receptionist/patient-registration.e2e.test.ts
  - New patient intake form (click through)
  - Address validation
  - Insurance selection
  - ID verification upload
  - Generate MRN confirmation
```
**Acceptance**: Form validation accurate; no data loss on reload

**10:00 - 12:00 PM**: Reception Appointment & Check-In (4 tests)
```
✓ tests/e2e/receptionist/appointment-booking.e2e.test.ts
  - Manual appointment booking (not via patient portal)
  - Doctor availability calendar
  - Room assignment
  - SMS reminder scheduling
  
✓ tests/e2e/receptionist/check-in.e2e.test.ts
  - Check-in patient on arrival
  - Capture vitals (temperature, BP, weight)
  - Assign queue number
  - Notify doctor
```
**Acceptance**: Check-in form responsive; queue system accurate

#### Afternoon (1:00 PM - 5:00 PM): Admin Workflows
**1:00 - 1:15 PM**: Sync & Admin Verification  
- Confirm reception workflows complete
- Admin permissions scope verified

**1:15 - 3:00 PM**: Admin User & Role Management (4 tests)
```
✓ tests/e2e/admin/auth.e2e.test.ts
  - Admin login / multi-factor auth if enforced
  - Hospital admin dashboard access

✓ tests/e2e/admin/user-management.e2e.test.ts
  - Create new staff user (doctor/nurse/pharmacist)
  - Assign role and hospital
  - Deactivate user
  - View user audit log
```
**Acceptance**: Role assignments enforce immediately; permissions cached correctly

**3:00 - 5:00 PM**: Admin Configuration & Audit (4 tests)
```
✓ tests/e2e/admin/hospital-config.e2e.test.ts
  - Update hospital branding (logo, name, timezone)
  - Configure working hours
  - Set appointment durations

✓ tests/e2e/admin/audit-logs.e2e.test.ts
  - View system audit trail
  - Filter by user/action/date
  - Export audit report
  - Verify encryption_metadata preserved
```
**Acceptance**: Config changes propagate <2 sec; audit immutable

**EOD**: Commit Day 3 tests (8-10 E2E scenarios)

---

### **THURSDAY, May 2** — Cross-Role Edge Cases & Critical Workflows

#### Morning (8:00 AM - 12:00 PM): Multi-Role Scenarios
**8:00 - 8:15 AM**: Regression Check  
- Run all Mon-Wed tests as continuous integration smoke test
- Address any overnight environment degradation

**8:15 - 10:00 AM**: Patient-to-Doctor-to-Pharmacy Flow (end-to-end integration)
```
✓ tests/e2e/workflows/patient-registration-to-payment.e2e.test.ts
  - Patient registers via receptionist
  - Patient books appointment
  - Doctor sees patient list
  - Doctor creates prescription
  - Pharmacist fills prescription
  - Patient picks up and pays
```
**Acceptance**: No data loss between roles; state consistent across systems

**10:00 - 12:00 PM**: Lab Order Complete Cycle
```
✓ tests/e2e/workflows/lab-order-to-results.e2e.test.ts
  - Doctor creates lab order
  - Lab tech receives order
  - Specimen collected & processed
  - Results entered
  - Critical value triggers alert
  - Patient sees results on portal
  - Doctor receives notification
```
**Acceptance**: Critical alerts fire within 2 seconds; no missed communications

#### Afternoon (1:00 PM - 5:00 PM): Negative Scenarios & Error Handling
**1:00 - 3:00 PM**: Unauthorized Access & Permission Boundaries (4 tests)
```
✓ tests/e2e/edge-cases/unauthorized-access.e2e.test.ts
  - Patient cannot see another patient's data
  - Doctor cannot see patient from other hospital
  - Pharmacy cannot modify doctor's prescription
  - Lab tech cannot access billing records
  - Incorrect role prevented from actions
```
**Acceptance**: All access attempts blocked; friendly error messages

**3:00 - 5:00 PM**: Form Submission Errors & Recovery (4 tests)
```
✓ tests/e2e/edge-cases/form-recovery.e2e.test.ts
  - Network timeout during prescription submit (retry auto-triggers)
  - Partial form fill, page reload (data restored from cache)
  - Invalid input re-submission (validation messages clear)
  - Double-submit prevention (button disabled until response)
```
**Acceptance**: No lost data; UX graceful under failure

**EOD**: Commit Day 4 tests (8-10 E2E scenarios)

---

### **FRIDAY, May 3** — Consolidation, CI/CD Integration & Final Report

#### Morning (8:00 AM - 12:00 PM): Comprehensive Regression Testing
**8:00 - 8:15 AM**: Status Check  
- Verify all Thu tests passing
- Confirm no overnight regressions

**8:15 - 10:00 AM**: Full E2E Suite Execution
```bash
# Run all 50+ E2E tests in parallel
npm run test:e2e:full

# Generate comprehensive HTML report
npx playwright show-report

# Capture video recordings & traces for failed runs
```
**Acceptance**: ≥95% pass rate; <5% flaky tests identified for Wed fixes

**10:00 - 12:00 PM**: CI/CD Pipeline Integration
```bash
# Integrate E2E into GitHub Actions CI/CD pipeline
# Update .github/workflows/e2e-tests.yml to run weekly

# Verify trigger conditions:
# - Run on PR merge to develop
# - Run nightly on main branch
# - Manual trigger available
```

**Checklist**:
- [ ] E2E tests integrated into GitHub Actions
- [ ] Slack notifications configured for failures
- [ ] Test artifacts stored (videos, traces)
- [ ] Weekly schedule configured (Saturday 2 AM)
- [ ] Post-execution cleanup script verified

#### Afternoon (1:00 PM - 5:00 PM): Final Report & Handoff
**1:00 - 2:00 PM**: Coverage Analysis Report

```markdown
# Week 7 E2E Test Coverage Report

## Summary
- Total E2E Scenarios: 50
- Total Tests: 162 (3.2 tests/scenario avg)
- Pass Rate: 96.3% (156/162)
- Execution Time: 8m 47s
- Flaky Tests: 3 (identified, scheduled for Wed fixes)

## By Role

| Role | Scenarios | Tests | Pass | Coverage |
|------|-----------|-------|------|----------|
| Patient | 8 | 24 | 100% | 96% |
| Doctor | 8 | 26 | 96% (1 flaky) | 94% |
| Pharmacy | 8 | 26 | 100% | 97% |
| Lab | 8 | 26 | 96% (1 flaky) | 95% |
| Reception | 8 | 28 | 96% (1 flaky) | 95% |
| Admin | 8 | 24 | 100% | 98% |
| **Cross-Role** | **2** | **8** | **100%** | **100%** |

## Critical Workflows (100% Pass Rate) ✅
- Patient Registration → Appointment → Payment
- Prescription Creation → Pharmacy Fill → Pickup
- Lab Order → Specimen Collection → Results → Doctor Alert
- Emergency Request → Doctor Notification → Consultation

## Browser Compatibility

| Browser | Tests | Pass | Notes |
|---------|-------|------|-------|
| Chrome | 162 | 162 (100%) | Baseline |
| Firefox | 162 | 160 (98.8%) | 2 animation delays |
| Safari | 162 | 159 (98.1%) | 3 date picker issues |

## Identified Issues for Week 8
1. **Doctor role flaky access control check** (1 test) - Likely async permission load
2. **Lab tech result entry slow** (1 test) - API response time spike
3. **Reception check-in double-submit** (1 test) - Race condition in submit handler

## Recommendations
- Week 8: Fix identified flaky tests before coverage consolidation
- Monitor nightly CI runs for environment-specific failures
- Add 10% buffer in load test expectations for production
```

**2:00 - 3:00 PM**: Known Issues Documentation
```
Create PHASE2_WEEK7_ISSUES_BACKLOG.md:
- 3 flaky tests with reproduction steps
- 5 UX improvements identified during testing
- 2 performance optimizations needed (API latency)
- 1 security edge case for Week 8 audit
```

**3:00 - 4:00 PM**: Handoff Meeting Prep
- QA lead prepares slides for end-of-week sync
- Team captures lessons learned
- Identify process improvements

**4:00 - 5:00 PM**: Documentation & Repo Commit
```bash
# Commit all E2E tests
git add tests/e2e/
git commit -m "Week 7 E2E Testing: 50+ scenarios, 6 roles, 96%+ pass rate"

# Update PHASE2_STATUS.md with Week 7 results
git add PHASE2_STATUS.md
git commit -m "Update Phase 2 status: Week 7 E2E complete"
```

---

## 🎯 Success Criteria (Approval Gate)

### Must-Pass (🔴 Blocking)
- [ ] **50+ E2E scenarios created** — Target: ≥50 (Actual: TBD)
- [ ] **All 6 roles tested** — Target: 6/6 (Actual: TBD)
- [ ] **Critical workflows 100% passing** — 4 core paths
- [ ] **Pass rate ≥95%** — Tolerance: ≤5% flakiness
- [ ] **Cross-browser validated** — Chrome, Firefox, Safari

### Should-Pass (🟡 For Next Week)
- [ ] **No cross-hospital data leakage** — Hospital scoping validated
- [ ] **All unauthorized access blocked** — Permission boundaries enforced
- [ ] **Error recovery graceful** — Form state preserved on failures
- [ ] **Performance <5sec per scenario** — Acceptable UX
- [ ] **Infrastructure stable** — Database, API, auth operational

### Nice-to-Have (🟢 Bonus)
- [ ] **Video recordings captured** — For failed runs
- [ ] **Trace files available** — For debugging
- [ ] **Nightly CI/CD integrated** — Automated regression detection
- [ ] **50% browser-specific fixes** — Safari/Firefox issues reduced

---

## 📦 Deliverables Checklist

By **Friday 5:00 PM** (EOW):
- [ ] `tests/e2e/` folder with 50+ E2E test files
- [ ] `tests/test/e2e-fixtures.ts` — Role-based fixture library
- [ ] `PHASE2_WEEK7_KICKOFF.md` — This file (✅)
- [ ] `PHASE2_WEEK7_PLAN.md` — Detailed day-by-day schedule
- [ ] `PHASE2_WEEK7_ISSUES_BACKLOG.md` — Known issues & improvements
- [ ] `playwright-report-week7.html` — HTML test report
- [ ] Updated `PHASE2_STATUS.md` — Week 7 results + Week 8 preview

---

## 📞 Communication & Escalation

**Daily Standup**: 8:00 AM (15 min)  
**Blocker Resolution**: Real-time in #qa-testing Slack  
**EOD Status**: 5:15 PM to #phase2-updates Slack  
**Weekly Review**: Friday 5:30 PM (30 min)

**Escalation Path**:
1. QA Lead → Frontend/Backend Tech Lead (same-day decision)
2. Tech Lead → Product Manager (if scope impact)
3. PM → Project Sponsor (if timeline at risk)

---

## 🔧 Debugging & Support

### Common E2E Issues & Fixes

**Issue**: Tests timeout on slow CI runner  
**Fix**: Increase `timeout` in `playwright.config.ts` to 45s

**Issue**: Date pickers not working in Safari  
**Fix**: Use `page.evaluate()` to set date via JS instead of UI interaction

**Issue**: Async permission checks cause flakiness  
**Fix**: Add `page.waitForLoadState('networkidle')` before assertions

**Issue**: Database not reset between test runs  
**Fix**: Run `npm run test:e2e:seed` before each role's test suite

**Support Resources**:
- Playwright Docs: https://playwright.dev
- Project Wiki: [Link to internal HIMS wiki]
- QA Slack: #qa-testing
- Weekly Debug Sessions: Fri 4:00 PM (optional)

---

## 📈 Success Snapshot (Target)

```
Week 7 Completion (May 3, 2026)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

E2E Test Coverage:          ▓▓▓▓▓▓▓▓░░░░░░  50/50 scenarios ✅
Critical Path Success:      ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100% (4/4 flows) ✅
Role-Based Coverage:        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  6/6 roles tested ✅
Browser Compatibility:      ▓▓▓▓▓▓▓▓▓▓░░░░  3/3 browsers ✅ 
Overall Pass Rate:          ▓▓▓▓▓▓▓▓▓░░░░░  96%+ ✅

→ Ready for Week 8: Coverage Consolidation
→ System ready for Phase 3: Production Hardening
```

---

**Document Version**: 1.0  
**Created**: April 9, 2026  
**Last Updated**: April 9, 2026  
**Next Review**: April 29, 2026 (Week 7 Start)
