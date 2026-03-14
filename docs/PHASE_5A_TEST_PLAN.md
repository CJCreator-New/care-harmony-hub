# Phase 5A: Test Implementation Roadmap (Days 4-6)

**Generated**: March 14, 2026  
**Duration**: 3 days (Thursday-Saturday)  
**Effort**: ~18 hours distributed  
**Target Exit**: All Phase 5A tests passing, ready for Phase 6 rollout

---

## Quick Summary

### Current State
- ✅ Type Safety: **PASSED**
- ⚠️ Unit Tests: **98.1% pass** (106/108) — 2 failures (audit logging mocks)
- ⚠️ Integration Tests: **83.9% pass** (26/31) — 1 failing signup flow
- ❌ Accessibility Tests: **0 implemented**
- ❌ E2E Tests: **0% pass** (all timeout — environment issue)
- ❌ RLS Validation: **script missing**

### Action Required
- **2 unit test fixes** (1 hour)
- **1 integration test fix** (1.5 hours)
- **12 accessibility tests** (3 hours)
- **3 integration tests for Phase 4B forms** (2 hours)
- **1 RLS validation script** (1 hour)
- **E2E environment setup** (2 hours)

**Total Effort**: ~10.5 hours of development work

---

## Day 4 (Thursday) — Setup & Quick Wins

**Daily Goal**: Clear blockers, establish baseline for accessibility/integration tests  
**Target Hours**: 6 hours  
**Success Criteria**: 
- ✅ Unit tests: 100% pass (108/108)
- ✅ Lint: 0 errors
- ✅ Type check: 0 errors
- ✅ Accessibility tests: Framework installed, 3+ tests working
- ⚠️ E2E: Environment identified/started

---

### 9:00-10:00 AM: Unit Test Fixes (1 hour)

**Task 1A: Update vitest.config.ts** (20 min)
```bash
# What to do:
1. Open vitest.config.ts
2. Add setupFiles reference to tests/setup.ts
3. Verify test environment is 'jsdom'

# File location:
vitest.config.ts

# Expected change:
- setupFiles: ['./tests/setup.ts']
```

**Task 1B: Create tests/setup.ts** (20 min)
```bash
# Create new file:
tests/setup.ts

# Content:
- Mock @supabase/supabase-js createClient
- Implement .from().insert() mock
- Include auth mock (onAuthStateChange, getSession)
```

**Task 1C: Verify Unit Tests Pass** (20 min)
```bash
npm run test:coverage

# Expected output:
  Test Files 18 passed (0 failed)
       Tests 108 passed (0 failed)
    Pass Rate 100% ✅
```

---

### 10:00-11:00 AM: Lint & Type Check (1 hour)

**Task 2A: Run Lint (10 min)**
```bash
npm run lint 2>&1 | tee lint-output.txt

# Review output for:
- ESLint violations
- Unused imports
- Type issues

# If errors > 10:
  - Document top 10 for QA review
  - Create lint-fixes task for next week
```

**Task 2B: Verify Type Check** (5 min)
```bash
npm run type-check

# Expected: (no output = 0 errors)
```

**Task 2C: Create Lint Baseline Report** (45 min)
```bash
# Document:
- Number of lint errors
- Top 3 issue categories
- Recommended fixes vs. can-defer
```

---

### 11:00 AM-12:30 PM: RLS Validation Setup (1.5 hours)

**Task 3A: Create RLS Validation Script** (45 min)

```bash
# Create:
scripts/validate-rls.mjs

# Implement:
1. Connect to Supabase using SERVICE_KEY
2. Check each table for hospital_id column:
   - patients
   - prescriptions
   - vital_signs
   - lab_orders
   - appointments
3. Report pass/fail for each table
4. Exit with code 1 if any fail
```

**Task 3B: Test RLS Script** (30 min)
```bash
# Set env variables:
export SUPABASE_URL="your-url"
export SUPABASE_SERVICE_KEY="your-key"

# Run:
npm run validate:rls

# Expected output:
  ✅ patients - hospital_id present
  ✅ prescriptions - hospital_id present
  ✅ vital_signs - hospital_id present
  ✅ lab_orders - hospital_id present
  ✅ appointments - hospital_id present
```

**Task 3C: Add npm Script** (15 min)
```bash
# In package.json, add:
"validate:rls": "node scripts/validate-rls.mjs"

# Verify with:
npm run validate:rls
```

---

### 12:30-1:30 PM: LUNCH BREAK ☕

---

### 1:30-3:30 PM: Accessibility Test Framework Setup (2 hours)

**Task 4A: Install Accessibility Testing Libraries** (15 min)
```bash
npm install --save-dev \
  @axe-core/react \
  @testing-library/jest-dom \
  vitest-axe

# Verify installation:
npm list @axe-core/react vitest-axe

# Expected: version numbers printed
```

**Task 4B: Create Accessibility Test Directory Structure** (15 min)
```bash
mkdir -p tests/accessibility

# Create empty test files:
touch tests/accessibility/forms.a11y.test.tsx
touch tests/accessibility/contrast.a11y.test.tsx
touch tests/accessibility/keyboard-nav.a11y.test.tsx
touch tests/accessibility/aria-labels.a11y.test.tsx
touch tests/accessibility/touch-targets.a11y.test.tsx
touch tests/accessibility/screen-reader.a11y.test.tsx
```

**Task 4C: Implement forms.a11y.test.tsx** (60 min)
```typescript
// tests/accessibility/forms.a11y.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';
import { expect, describe, it } from 'vitest';

// Import Phase 4B components
import MedicationRequestForm from '@/components/forms/MedicationRequestForm';
import VitalSignsForm from '@/components/forms/VitalSignsForm';
import LabOrderForm from '@/components/forms/LabOrderForm';

describe('Forms - Accessibility (WCAG AAA)', () => {
  describe('MedicationRequestForm', () => {
    it('has no axe violations', async () => {
      const { container } = render(<MedicationRequestForm patientId="test" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('dosage field has font-size >= 16px', () => {
      render(<MedicationRequestForm patientId="test" />);
      const input = screen.getByLabelText(/dosage/i);
      const styles = window.getComputedStyle(input);
      const fontSize = parseFloat(styles.fontSize);
      expect(fontSize).toBeGreaterThanOrEqual(16);
    });
    
    it('form labels are associated with inputs', () => {
      render(<MedicationRequestForm patientId="test" />);
      // Axe will check this too, but explicit check:
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
    });
  });
  
  describe('VitalSignsForm', () => {
    it('has no axe violations', async () => {
      const { container } = render(<VitalSignsForm patientId="test" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    it('current value displays with large font (36px)', () => {
      render(<VitalSignsForm patientId="test" />);
      const display = screen.getByText(/\d{2,3}/) // Current value
      const styles = window.getComputedStyle(display);
      expect(styles.fontSize).toMatch(/3[6-9]px|4[0-9]px|5[0-9]px/); // >= 36px
    });
  });
  
  describe('LabOrderForm', () => {
    it('has no axe violations', async () => {
      const { container } = render(<LabOrderForm patientId="test" />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
```

**Task 4D: Run Accessibility Tests (First Pass)** (30 min)
```bash
npm run test:accessibility

# Review output:
# - How many axe violations reported?
# - Which violations are WCAG Level A vs AA vs AAA?
# - Document findings

# Document in:
PHASE_5A_ACCESSIBILITY_BASELINE.txt
```

---

### 3:30-4:30 PM: E2E Environment Investigation (1 hour)

**Task 5A: Check Dev Server Startup** (20 min)
```bash
# Terminal 1:
npm run dev

# Wait 5 seconds, then verify:
# - http://localhost:5173 accessible
# - Page loads without 404s
# - Check console for errors

Control+C to stop
```

**Task 5B: Check E2E Test Configuration** (20 min)
```bash
# Review:
cat playwright.config.ts

# Look for:
- webServer configuration
- Base URL
- Timeout settings

# Review:
cat .env.test

# Verify:
- SUPABASE_URL present
- SUPABASE_ANON_KEY present
```

**Task 5C: Create E2E Startup Script** (20 min)
```bash
# Create:
scripts/start-e2e-tests.sh

# Content:
#!/bin/bash
npm run dev &
DEV_PID=$!
sleep 5
npm run test:e2e:smoke -- --reporter=list
kill $DEV_PID
```

---

### 4:30 PM: Day 4 Wrap-Up (30 min)

**Checklist**:
- [ ] Unit tests: 100% pass ✅
- [ ] Type check: 0 errors ✅
- [ ] Lint: Results documented
- [ ] RLS validation: Working ✅
- [ ] Accessibility tests: Framework installed, 3+ tests passing
- [ ] E2E: Environment identified
- [ ] Documentation: Updated with findings

**Exit Meeting (5:00 PM)**:
- Report status to PM/QA
- Identify blockers
- Plan tomorrow

---

## Day 5 (Friday) — Integration Tests & Accessibility Expansion

**Daily Goal**: Complete accessibility test suite, fix integration test failures  
**Target Hours**: 6 hours  
**Success Criteria**:
- ✅ Accessibility tests: <16 WCAG AAA errors
- ✅ Integration tests: 100% pass (31/31+)
- ✅ Phase 4B form integration tests: 3 new tests passing

---

### 9:00-10:30 AM: Complete Accessibility Tests (1.5 hours)

**Task 1A: Implement contrast.a11y.test.tsx** (30 min)

```typescript
import { getContrast } from '@testing-library/jest-dom';

describe('WCAG AAA Color Contrast', () => {
  const colors = {
    primaryBlue: '#003D99',      // Phase 4B darkened
    primaryGreen: '#00B050',
    redAlert: '#C00000',
    white: '#FFFFFF',
    grayText: '#333333',
  };
  
  it('normal text meets 7:1 contrast ratio (WCAG AAA)', () => {
    // Blue text on white
    const ratio = getContrast(colors.primaryBlue, colors.white);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });
  
  it('form labels accessible on light background', () => {
    const ratio = getContrast(colors.grayText, colors.white);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
  });
});
```

**Task 1B: Implement keyboard-nav.a11y.test.tsx** (30 min)

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Keyboard Navigation', () => {
  it('tab stops through form fields in logical order', async () => {
    const user = userEvent.setup();
    render(<MedicationRequestForm patientId="test" />);
    
    const fields = [
      screen.getByLabelText(/medication/i),
      screen.getByLabelText(/dosage/i),
      screen.getByLabelText(/frequency/i),
      screen.getByRole('button', { name: /submit/i }),
    ];
    
    // Start at first field
    fields[0].focus();
    expect(fields[0]).toHaveFocus();
    
    // Tab through each
    for (let i = 1; i < fields.length; i++) {
      await user.tab();
      expect(fields[i]).toHaveFocus();
    }
  });
  
  it('form submission works via Enter key', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<MedicationRequestForm onSubmit={handleSubmit} />);
    
    const submitBtn = screen.getByRole('button', { name: /submit/i });
    submitBtn.focus();
    
    await user.keyboard('{Enter}');
    expect(handleSubmit).toHaveBeenCalled();
  });
});
```

**Task 1C: Implement aria-labels.a11y.test.tsx** (30 min)

```typescript
describe('ARIA Labels & Live Regions', () => {
  it('allergy warning has role="alert"', () => {
    render(<MedicationRequestForm patientId="123-with-allergy" />);
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/allergy/i);
  });
  
  it('all buttons have descriptive aria-labels', () => {
    render(<MedicationRequestForm patientId="test" />);
    const buttons = screen.getAllByRole('button');
    
    buttons.forEach(btn => {
      const label = btn.getAttribute('aria-label');
      const text = btn.textContent;
      expect(label || text).toBeTruthy();
    });
  });
});
```

---

### 10:30 AM-12:00 PM: Implement Integration Tests (1.5 hours)

**Task 2A: Create forms.integration.test.tsx** (45 min)

Focus on one form (MedicationRequestForm) as example:

```typescript
// tests/integration/medication-request.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MedicationRequestForm from '@/components/forms/MedicationRequestForm';

// Use mocked Supabase (from tests/setup.ts)
describe('MedicationRequestForm Integration', () => {
  const mockPatientId = 'patient-123';
  const mockHospitalId = 'hospital-456';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('submits form and creates prescription in database', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MedicationRequestForm 
        patientId={mockPatientId}
        hospitalId={mockHospitalId}
        onSuccess={vi.fn()}
      />
    );
    
    // Fill form
    await user.type(
      screen.getByLabelText(/medication/i),
      'Amoxicillin'
    );
    await user.type(
      screen.getByLabelText(/dosage/i),
      '500'
    );
    await user.selectOptions(
      screen.getByLabelText(/frequency/i),
      'TDS'  // Three times daily
    );
    
    // Submit
    await user.click(
      screen.getByRole('button', { name: /submit/i })
    );
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByText(/prescription created/i)).toBeInTheDocument();
    });
  });
  
  it('RLS filters prescriptions by hospital_id', async () => {
    // This test verifies that mocked Supabase filters by hospital_id
    // Actual RLS enforcement happens in database
  });
});
```

**Task 2B: Create vital-signs.integration.test.tsx** (30 min)

Similar structure to medication form, focus on:
- Critical value detection
- Alert creation
- Temperature unit handling

**Task 2C: Create lab-order.integration.test.tsx** (15 min)

Focus on:
- Priority/urgency selection
- Queue entry creation with correct priority

---

### 12:00-1:00 PM: LUNCH BREAK ☕

---

### 1:00-2:00 PM: Fix Failing Integration Tests (1 hour)

**Task 3A: Fix useAppointments.test.tsx** (30 min)

```bash
# The test is [queued], likely due to Supabase mock
# With enhanced setup.ts, this should now pass

npm run test:integration

# If still failing:
# - Add specific mock for appointments table
# - Verify RLS filter is mocked
```

**Task 3B: Fix signup-flow.test.tsx** (30 min)

```typescript
// tests/integration/signup-flow.test.tsx
// Likely needs auth mocking

it('completes signup and navigates to role setup', async () => {
  // Mock auth state
  // Mock Supabase insert for user + hospital + role
  // Verify redirect
});
```

---

### 2:00-4:00 PM: E2E Tests & Polish (2 hours)

**Task 4A: Run E2E Tests with Dev Server** (40 min)

```bash
# Terminal 1:
npm run dev

# Terminal 2 (after 5 second wait):
npm run test:e2e:smoke -- --reporter=list

# Capture output
# Expected: Some failures due to environment, but should get specific errors
```

**Task 4B: Document E2E Findings** (40 min)

```markdown
# E2E Test Status Report

## Failures Found
1. Login flow: [specific error from test run]
2. Dashboard access: [specific error]

## Environment Checklist
- [ ] Dev server running on port 5173
- [ ] Supabase credentials valid
- [ ] Auth user exists in test database
- [ ] RLS allows test user access

## Next Steps
- If environment OK: Debug specific test failures
- If environment issue: Need DevOps to fix
```

**Task 4C: Run Full Test Suite** (20 min)

```bash
# Run all tests and capture summary:
npm run type-check && \
npm run lint && \
npm run test:coverage && \
npm run test:integration && \
npm run test:accessibility && \
npm run validate:rls

# Document results in:
PHASE_5A_FRIDAY_SUMMARY.txt
```

---

### 4:00-5:00 PM: Day 5 Wrap-Up & Day 6 Planning

**Checklist**:
- [ ] Accessibility tests expanded (5+ test files)
- [ ] Integration test failures fixed
- [ ] E2E environment tested
- [ ] All tests documented
- [ ] Blockers identified

**If Behind**:
- Defer E2E comprehensive testing to Monday
- Focus on Phase 5A critical path (unit, integration, accessibility)

---

## Day 6 (Saturday) — Final Validation & Sign-Off

**Daily Goal**: Reach all success criteria, prepare QA sign-off  
**Target Hours**: 4 hours (shorter day)  
**Success Criteria**:
- ✅ 100% of Phase 5A tests passing
- ✅ <16 WCAG AAA errors
- ✅ All deliverables documented
- ✅ QA sign-off ready

---

### 10:00-11:00 AM: Final Test Runs & Documentation (1 hour)

```bash
# Run complete test matrix one final time:
npm run type-check        # Type safety
npm run lint              # Code quality
npm run test:coverage     # Unit tests
npm run test:integration  # Database layer
npm run test:accessibility # WCAG AAA
npm run test:security     # Security baseline
npm run test:e2e:smoke    # Critical paths (if environment ready)
npm run validate:rls      # RLS policies

# Capture all output to:
TEST_EXECUTION_FINAL.log
```

---

### 11:00 AM-12:00 PM: QA Sign-Off Preparation (1 hour)

**Create Final Report**: `PHASE_5A_FINAL_REPORT.md`

```markdown
# Phase 5A: Testing & Validation — FINAL REPORT

## Summary
✅ **All Phase 5A success criteria met**

## Test Results Summary
| Test Type | Pass Rate | Status |
|-----------|-----------|--------|
| Type Safety | 100% (0 errors) | ✅ |
| Lint | X% (Y errors) | ✅/⚠️ |
| Unit Tests | 100% (108/108) | ✅ |
| Integration | 100% (31/31) | ✅ |
| Accessibility | <16 errors | ✅ |
| Security | [baseline] | ✅ |
| E2E Smoke | X% | ✅/⚠️ |
| RLS Validation | All tables scoped | ✅ |

## Blockers Cleared
- [x] Unit test mocks fixed (Supabase)
- [x] E2E environment identified
- [x] Accessibility tests implemented
- [x] RLS validation script created
- [x] Integration tests expanded

## Phase 4B Component Validation
- [x] MedicationRequestForm: 15 tests passing
- [x] VitalSignsForm: 18 tests passing
- [x] LabOrderForm: 13 tests passing
- [x] All forms WCAG AAA compliant

## Ready for Phase 6?
✅ **YES** — All criteria met. Approved for feature flag rollout.

## Signed By
- [ ] QA Lead
- [ ] Dev Lead
- [ ] PM
- [ ] CTO
```

---

### 12:00-1:00 PM: Success Verification & Cleanup (1 hour)

**Final Checklist** ✅:
- [ ] All tests pass
- [ ] Accessibility <16 errors
- [ ] Type check: 0 errors
- [ ] Lint: X errors (document if >0)
- [ ] Documentation complete
- [ ] QA sign-off template ready
- [ ] No console warnings in tests
- [ ] CI/CD ready for Phase 6

**Output Files**:
```
docs/
├── PHASE_5A_COVERAGE_BASELINE.md       ✅ Done
├── PHASE_5A_GAP_ANALYSIS.md            ✅ Done
├── PHASE_5A_TEST_PLAN.md               ✅ This file
├── PHASE_5A_FINAL_REPORT.md            📝 Create Sat AM
├── PHASE_5A_ACCESSIBILITY_BASELINE.txt 📝 Create Fri
├── TEST_EXECUTION_FINAL.log            📝 Create Sat AM
└── PHASE_5A_QA_SIGN_OFF.md             📝 Create Sat AM
```

**Deliverables Ready**:
- ✅ Baseline test matrix
- ✅ Gap analysis (prioritized)
- ✅ Test implementation code
- ✅ Updated package.json scripts
- ✅ Test configuration (vitest, playwright)
- ✅ RLS validation script
- ✅ Accessibility test framework
- ✅ Integration test examples
- ✅ Final sign-off report

---

## Parallel Work Tracks (If Team > 1 Dev)

### Dev 1: Core Fixes (Unit + Integration)
- Day 4: Unit test mocks, RLS script
- Day 5: Integration test fixes, forms testing
- Day 6: Final validation

### Dev 2: Accessibility Tests
- Day 4: Framework setup & first test (forms.a11y)
- Day 5: Remaining 5 tests (contrast, keyboard, aria, touch, screen-reader)
- Day 6: Refinement & sign-off

### QA: E2E + Documentation
- Day 4: E2E environment investigation, lint baseline
- Day 5: E2E test runs, gap analysis review
- Day 6: QA sign-off preparation

---

## Risk Mitigation

**What if E2E tests still timeout on Day 6?**
- ✅ Not a Phase 5A blocker (unit/integration are blocking)
- 🟡 Create task for phase 6 pre-rollout: "Fix E2E environment"
- 📝 Document known E2E issues in final report

**What if accessibility tests find >20 errors?**
- 🚨 Phase 4B implementation incomplete
- 📝 Document each error with fix priority
- 🟡 Can still proceed to Phase 6 if fixes are < 2 days work

**What if unit/integration tests don't reach 100%?**
- 🚨 BLOCKER — Cannot proceed to Phase 6
- 🔧 Extend to Monday for fixes
- 📝 Root cause analysis required

---

## Success Criteria (Final Checklist)

### Must Pass to Proceed to Phase 6
- [ ] Unit tests: **100%** pass (108/108) ✅
- [ ] Integration tests: **100%** pass (31+/31) ✅
- [ ] Type check: **0 errors** ✅
- [ ] Accessibility: **<16 WCAG AAA errors** ✅
- [ ] RLS validation: **all tables scoped** ✅
- [ ] Lint: **0 critical errors** ✅

### Nice to Have
- [x] Lint: 0 all errors (can defer)
- [x] E2E: 50%+ pass rate (can defer to next week)
- [x] Security tests: Full assessment (can defer)

---

## Next Steps After Phase 5A

### Phase 6 (Feature Flags & Rollout)
- Begin Day 7 (Monday)
- Uses Phase 5A test infrastructure as safety gate
- Feature flags control Phase 4B rollout (10% → 50% → 100%)
- SLO monitoring during rollout

### Phase 7 (Post-Rollout)
- Complete E2E testing (from current baseline)
- Security testing on production-like environment
- Load testing (no >50ms regression)

---

## Communication Template (Daily Standup)

**Thursday End-of-Day**:
> "Phase 5A Progress: Unit tests fixed ✅, Accessibility framework installed 🟡, E2E environment under investigation 🔍. On track for Friday completion."

**Friday End-of-Day**:
> "Phase 5A: Accessibility tests complete <16 errors ✅, Integration tests 100% passing ✅, E2E environment [status]. Ready for QA sign-off Saturday."

**Saturday Noon**:
> "Phase 5A: ALL SUCCESS CRITERIA MET ✅. Ready for Phase 6 feature flag rollout (targeting Monday start). QA signed off."

---

**Report Status**: Ready for Thursday kickoff  
**Owner**: Dev Lead + QA Lead  
**Review**: PM/CTO approval on Saturday  
**Next Document**: Phase 6 Feature Flag & Rollout Strategy
