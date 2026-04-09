# CareSync HIMS - Testing Strategy & Automation Guide

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**For**: QA engineers, developers, test automation specialists, CI/CD engineers

---

## Table of Contents

1. [Testing Pyramid](#testing-pyramid)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End (E2E) Tests](#end-to-end-e2e-tests)
5. [Test Infrastructure](#test-infrastructure)
6. [Running Tests](#running-tests)
7. [Coverage Standards](#coverage-standards)
8. [CI/CD Pipeline](#cicd-pipeline)

---

## Testing Pyramid

CareSync HIMS follows the standard testing pyramid:

```
         /\
        /  \
       / E2E \        (50 tests)
      /______\
     /        \
    / Integration \ (200 tests)
   /____________\
  /              \
 / Unit Tests     \ (500+ tests)
/__________________\
```

### Test Distribution
- **Unit Tests**: 70% (~500 tests)
- **Integration Tests**: 20% (~200 tests)
- **E2E Tests**: 10% (~50 tests, covering critical workflows)

### Test Coverage Goals

| Category | Minimum Coverage | Target Coverage |
|----------|---|---|
| Backend / API | 75% | 85%+ |
| Frontend components | 60% | 75%+ |
| Hooks & utilities | 80% | 90%+ |
| Critical paths (Rx, Lab, Billing) | 90% | 95%+ |

---

## Unit Tests

### Testing Framework

**Framework**: Vitest (Vue/Vite testing framework, works with React)  
**Location**: `tests/unit/` or `__tests__/` folders  
**File naming**: `*.test.ts` or `*.test.tsx`

### Unit Test Pattern

```typescript
// tests/unit/hooks/usePatients.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { usePatients } from '@/hooks/usePatients';
import * as supabaseModule from '@/services/supabase';
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@/services/supabase');

describe('usePatients', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('fetches patients for authenticated hospital', async () => {
    // Arrange
    const mockPatients = [
      { id: '1', first_name: 'John', last_name: 'Smith' },
      { id: '2', first_name: 'Jane', last_name: 'Doe' }
    ];
    
    vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: mockPatients,
              error: null
            })
          })
        })
      })
    } as any);

    // Act
    const { result } = renderHook(() => usePatients(), {
      wrapper: AuthProvider
    });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(mockPatients);
      expect(result.current.isLoading).toBe(false);
    });
  });

  test('handles error gracefully', async () => {
    const mockError = new Error('Network error');
    
    vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: null,
              error: mockError
            })
          })
        })
      })
    } as any);

    const { result } = renderHook(() => usePatients(), {
      wrapper: AuthProvider
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

});
```

### What to Unit Test

| Item | Example |
|------|---------|
| **Hooks** | `usePatients()`, `usePrescriptions()`, `usePermissions()` |
| **Utilities** | `sanitizeInput()`, `formatDate()`, `calculateAge()` |
| **Business Logic** | Drug interaction checking, dosage validation |
| **Components (isolated)** | Button, Input, Modal (without real data) |
| **Permission checking** | `hasPermission('patients:read')` returns true/false |

### Unit Test Checklist

- [ ] Test happy path (data fetches successfully)
- [ ] Test error handling (network failure, 404, etc.)
- [ ] Test edge cases (empty arrays, null values)
- [ ] Test permission denials
- [ ] Mocks external dependencies (Supabase, API calls)
- [ ] No actual database calls in unit tests
- [ ] No actual network requests
- [ ] Tests run in < 5 seconds total

---

## Integration Tests

### Integration Test Pattern

Integration tests verify multiple components work together without full E2E.

```typescript
// tests/integration/workflows/prescription-approval.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { useApprovalWorkflow } from '@/hooks/useApprovalWorkflow';
import { supabase } from '@/services/supabase';
import { vi } from 'vitest';

describe('Prescription Approval Workflow', () => {

  test('prescription can be created and approved by pharmacist', async () => {
    // Arrange - Set up test data in real test database
    const testPatient = await setupTestPatient({
      hospital_id: TEST_HOSPITAL_ID
    });
    
    const testDoctor = await setupTestUser({
      role: 'doctor',
      hospital_id: TEST_HOSPITAL_ID
    });
    
    const testPharmacist = await setupTestUser({
      role: 'pharmacist',
      hospital_id: TEST_HOSPITAL_ID
    });

    // Act 1 - Doctor creates prescription
    const { result: doctorResult } = renderHook(
      () => usePrescriptions(),
      { wrapper: AuthProviderWithUser(testDoctor) }
    );

    await waitFor(() => {
      doctorResult.current.createPrescription({
        patient_id: testPatient.id,
        drug_name: 'Amoxicillin',
        dose: 500,
        unit: 'mg',
        frequency: 'twice daily'
      });
    });

    // Assert 1 - Prescription created
    const createdPrescription = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', testPatient.id)
      .single();
    
    expect(createdPrescription.data.status).toBe('pending_approval');

    // Act 2 - Pharmacist approves
    const { result: pharmacistResult } = renderHook(
      () => useApprovalWorkflow(),
      { wrapper: AuthProviderWithUser(testPharmacist) }
    );

    await waitFor(() => {
      pharmacistResult.current.approvePrescription(createdPrescription.data.id);
    });

    // Assert 2 - Prescription approved
    const approvedPrescription = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', createdPrescription.data.id)
      .single();
    
    expect(approvedPrescription.data.status).toBe('approved');
  });

});
```

### What to Integration Test

| Workflow | Coverage |
|----------|----------|
| **Appointment → Consultation** | Patient books → Check-in → Doctor consultation → Notes saved |
| **Prescription Creation → Approval** | Doctor creates → Validation → Pharmacist approval → Dispensing |
| **Lab Order → Result → Notification** | Order created → Specimen collected → Result entered → Approved → Patient notified |
| **Multi-role Workflows** | Receptionist check-in → Nurse vitals → Doctor consultation |

### Integration Test Checklist

- [ ] Uses test database (real Supabase test instance)
- [ ] Sets up realistic test data
- [ ] Crosses component/hook boundaries
- [ ] Tests permission enforcement at API layer
- [ ] Tests real database RLS policies
- [ ] Verifies audit trail creation
- [ ] Tests run in < 30 seconds per test

---

## End-to-End (E2E) Tests

### E2E Testing Framework

**Framework**: Playwright  
**Location**: `tests/e2e/`  
**Config**: `playwright.config.ts`, `playwright.roles.config.ts`

### E2E Test Pattern

```typescript
// tests/e2e/roles/doctor/create-and-sign-consultation.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs } from '@/test/utils/auth';
import { createTestPatient } from '@/test/utils/fixtures';

test.describe('Doctor - Create & Sign Consultation', () => {

  test('should create consultation and sign', async ({ page, context }) => {
    // Setup
    const doctor = await loginAs('doctor', context);
    const patient = await createTestPatient();

    // Navigate to patient
    await page.goto('/dashboard');
    await page.fill('[placeholder="Search patient"]', patient.first_name);
    await page.click(`text=${patient.first_name} ${patient.last_name}`);
    
    // Verify patient details loaded
    await expect(page.locator(`text=${patient.first_name}`)).toBeVisible();

    // Start consultation
    await page.click('button:has-text("Start Consultation")');
    
    // Verify consultation form loads
    await expect(page.locator('[name="chief_complaint"]')).toBeVisible();

    // Fill chief complaint
    await page.fill('[name="chief_complaint"]', 'Persistent cough for 3 days');
    
    // Fill assessment
    await page.fill('[name="assessment"]', 'Acute bronchitis');
    
    // Add medication
    await page.click('button:has-text("Add Medication")');
    await page.fill('[name="drug_name"]', 'Amoxicillin');
    await page.fill('[name="dose"]', '500');
    await page.selectOption('[name="unit"]', 'mg');
    
    // System checks interactions automatically
    await expect(page.locator('text=No interactions')).toBeVisible({ timeout: 5000 });
    
    // Set follow-up
    await page.selectOption('[name="followup_days"]', '3');
    
    // Sign consultation
    await page.click('button:has-text("Sign Consultation")');
    
    // E-signature modal appears
    await expect(page.locator('text=Enter PIN to sign')).toBeVisible();
    await page.fill('[name="signature_pin"]', '1234');  // Test PIN
    await page.click('button:has-text("Sign")');
    
    // Verify success
    await expect(page.locator('text=Consultation signed successfully')).toBeVisible();
    
    // Verify prescription sent to pharmacy
    const notificationText = await page.locator('[role="status"]').textContent();
    expect(notificationText).toContain('Prescription sent to pharmacy');
  });

  test('should handle drug interaction warning', async ({ page, context }) => {
    const doctor = await loginAs('doctor', context);
    const patient = await createTestPatientWithMedications([
      'Warfarin 5mg'  // Blood thinner
    ]);

    await page.goto('/dashboard');
    // ... navigate to patient, start consultation ...
    
    // Add conflicting medication
    await page.fill('[name="drug_name"]', 'Aspirin');
    await page.fill('[name="dose"]', '500');
    
    // System detects interaction
    await expect(page.locator('text=Interaction Warning')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Bleeds with Warfarin')).toBeVisible();
    
    // Doctor can acknowledge or cancel
    await page.click('button:has-text("Continue with caution")');
  });

});
```

### What to E2E Test

**Critical user workflows** (not everything):

| Workflow | Priority | Approx. Time |
|----------|----------|---|
| Doctor appointments end-to-end | P0 | 15 min |
| Prescription approval workflow | P0 | 10 min |
| Lab order & result workflow | P0 | 20 min |
| Patient appointment booking | P1 | 12 min |
| Multi-role collaboration | P1 | 20 min |
| Permission-based access control | P1 | 10 min |
| Error handling & recovery | P2 | 8 min |

### E2E Test Organization

```
tests/e2e/
├── roles/
│   ├── doctor/
│   │   ├── create-and-sign-consultation.spec.ts
│   │   ├── manage-prescriptions.spec.ts
│   │   └── order-labs.spec.ts
│   ├── pharmacist/
│   │   ├── approve-prescriptions.spec.ts
│   │   └── dispense-medication.spec.ts
│   ├── patient/
│   │   ├── book-appointment.spec.ts
│   │   └── view-records.spec.ts
│   └── ... (other roles)
│
├── workflows/
│   ├── appointment-to-consultation.spec.ts
│   ├── prescription-approval.spec.ts
│   └── lab-order-to-patient-notification.spec.ts
│
├── fixtures/
│   ├── auth.ts (login helpers)
│   ├── testdata.ts (create test patients, etc)
│   └── selectors.ts (UI element selectors)
│
└── utils/
    ├── assertions.ts (custom expect helpers)
    ├── network.ts (API mocking)
    └── performance.ts (timing checks)
```

### E2E Test Checklist

- [ ] Tests critical user workflows (not every feature)
- [ ] Tests cross-role interactions
- [ ] Verifies permissions denied properly
- [ ] Tests on real staging environment
- [ ] Tests pass on Chrome, Firefox, and Safari
- [ ] Tests include error scenarios
- [ ] Tests verify data persists (check database after flow)
- [ ] Tests run in < 1 hour total (50 tests × ~1 min each)
- [ ] Videos captured for failures (for debugging)

---

## Test Infrastructure

### Test Database

```typescript
// tests/fixtures/database.ts
export async function setupTestDatabase() {
  // Create isolated test schema
  await supabase.rpc('setup_test_schema', {
    schema_name: `test_${testRunId}`
  });

  // Reset sequences
  await supabase.rpc('reset_test_sequences');
}

export async function teardownTestDatabase() {
  // Clean up test data
  await supabase.rpc('teardown_test_schema', {
    schema_name: `test_${testRunId}`
  });
}
```

### Test User Fixtures

```typescript
// tests/fixtures/users.ts
export async function createTestUser(role: UserRole) {
  const testUser = {
    email: `test-${role}-${Date.now()}@caresync-test.local`,
    password: 'Test1234!',
    role,
    hospital_id: TEST_HOSPITAL_ID
  };

  // Create in auth system
  const { user, session } = await supabase.auth.signUpWithPassword({
    email: testUser.email,
    password: testUser.password
  });

  // Create user record
  await supabase.from('users').insert({
    id: user.id,
    email: user.email,
    role,
    hospital_id: TEST_HOSPITAL_ID
  });

  return { user, session, ...testUser };
}

export async function loginAs(role: UserRole, context: BrowserContext) {
  const testUser = await createTestUser(role);
  
  // Set auth token in browser storage
  await context.addCookies([{
    name: 'auth_token',
    value: testUser.session.access_token,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Strict'
  }]);

  return testUser;
}
```

### Test Patient Fixtures

```typescript
// tests/fixtures/patients.ts
export async function createTestPatient(overrides?: Partial<Patient>) {
  const defaultPatient = {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    date_of_birth: faker.date.birthDate(),
    email: faker.internet.email(),
    phone: faker.phone.number('+1 ### ### ####'),
    gender: faker.helpers.arrayElement(['M', 'F', 'O']),
    hospital_id: TEST_HOSPITAL_ID,
    ...overrides
  };

  const { data, error } = await supabase
    .from('patients')
    .insert(defaultPatient)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createTestPatientWithMedications(
  medications: string[],
  overrides?: Partial<Patient>
) {
  const patient = await createTestPatient(overrides);

  for (const drug of medications) {
    await supabase.from('prescriptions').insert({
      patient_id: patient.id,
      drug_name: drug,
      dose: 500,
      unit: 'mg',
      frequency: 'daily',
      status: 'active',
      start_date: new Date(),
      hospital_id: TEST_HOSPITAL_ID
    });
  }

  return patient;
}
```

---

## Running Tests

### Command Reference

```bash
# Run all unit tests
npm run test:unit

# Run specific unit test
npm run test:unit -- usePatients.test.ts

# Run unit tests with coverage
npm run test:unit -- --coverage

# Run integration tests
npm run test:integration

# Run all E2E tests
npm run test:e2e

# Run E2E tests for specific role
npm run test:e2e -- --project=doctor

# Run E2E tests and generate report
npm run test:e2e -- --reporter=html

# Run tests in watch mode (re-run on file change)
npm run test:watch

# Run security tests (OWASP scanning)
npm run test:security

# Run accessibility tests
npm run test:accessibility

# Run performance tests
npm run test:performance
```

### Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Unit test configuration |
| `vitest.integration.config.ts` | Integration test config |
| `playwright.config.ts` | E2E test base config |
| `playwright.roles.config.ts` | E2E config per role |
| `jest.setup.ts` | Global test setup |

---

## Coverage Standards

### Coverage Report

```bash
npm run test:unit -- --coverage

# Output:
# ─────────────────────────────────────────────────
# File              | % Stmts | % Branch | % Funcs |
# ─────────────────────────────────────────────────
# All files        |  78.3%  |   72.1%  |  81.5%  |
#  hooks/          |  85.2%  |   82.0%  |  87.3%  |
#  utils/          |  92.1%  |   88.5%  |  94.2%  |
#  components/     |  65.4%  |   58.2%  |  68.9%  |
# ─────────────────────────────────────────────────
```

### Coverage Gates

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      lines: 75,      // Fail if < 75% line coverage
      functions: 75,  // Fail if < 75% function coverage
      branches: 70,   // Fail if < 70% branch coverage
      statements: 75, // Fail if < 75% statement coverage
      
      // Exceptions for UI components
      exclude: [
        'src/components/ui/**',  // shadcn primitives
        'src/pages/**'  // Page components have lower coverage
      ]
    }
  }
});
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - run: npm run test:unit -- --coverage > coverage.txt
      
      - name: Comment coverage on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coverage = fs.readFileSync('coverage.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `\`\`\`\n${coverage}\n\`\`\``
            });

  integration-tests:
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres:latest
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        role: [admin, doctor, nurse, patient, pharmacist, lab_tech]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - run: npm run test:e2e -- --project=${{ matrix.role }}
        env:
          PLAYWRIGHT_HEADED: false
          BASE_URL: https://staging.caresync.local
      
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.role }}
          path: playwright-report/

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:accessibility

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:security
```

### Test Results Dashboard

```bash
# After CI runs, view results:
npm run test:report

# Outputs:
# ✓ Unit Tests: 542/542 passed (100%)
# ✓ Integration Tests: 78/78 passed (100%)
# ✓ E2E Tests: 48/48 passed (100%)
# ✓ Coverage: 78.3% (target: 75%)
# ✓ Accessibility: 0 violations (WCAG 2.1 AA)
# ✓ Security: 0 critical issues
```

---

## Test Writing Best Practices

### Naming Tests

```typescript
// ✅ CLEAR: Describes behavior
test('usePatients returns list of patients for authenticated hospital', async () => {});

test('usePatients throws error when network request fails', async () => {});

test('doctor can approve prescription only if has permission', async () => {});

// ❌ VAGUE: Doesn't describe what's being tested
test('test patients', async () => {});

test('check permissions', async () => {});

test('works', async () => {});
```

### Arrange-Act-Assert Pattern

```typescript
test('prescription approval workflow', async () => {
  // ARRANGE: Set up test data and mocks
  const testPatient = await createTestPatient();
  const testPrescription = { patient_id: testPatient.id, ... };
  
  // ACT: Perform the action being tested
  await approvePrescription(testPrescription.id);
  
  // ASSERT: Verify the result
  expect(prescription.status).toBe('approved');
  expect(pharmacy.received_notification).toBe(true);
});
```

### Avoid Shared State

```typescript
// ❌ WRONG: Shared state between tests
let testPatient;

beforeEach(() => {
  testPatient = { id: '1', name: 'John' };
});

test('test 1', () => {
  testPatient.name = 'Jane';  // Modifies shared state
});

test('test 2', () => {
  expect(testPatient.name).toBe('John');  // FAILS! Was modified by test1
});

// ✅ RIGHT: Each test has its own data
test('test 1', async () => {
  const patient1 = await createTestPatient();
  // Modifications don't affect others
});

test('test 2', async () => {
  const patient2 = await createTestPatient();
  // Independent test data
});
```

---

## Test Maintenance

### Debugging Failed Tests

```bash
# Run single test in verbose mode
npm run test:unit -- usePatients.test.ts --reporter=verbose

# Run with detailed stack traces
npm run test:unit -- usePatients.test.ts --reporter=tap

# Run E2E test with browser visible (headed mode)
npm run test:e2e -- create-prescription.spec.ts --headed

# Run E2E test and pause execution
npm run test:e2e -- create-prescription.spec.ts --debug
```

### Flaky Test Detection

CareSync's CI monitors test flakiness:

```bash
npm run analyze:flaky-tests

# Output:
# Flaky Tests (failed in 1 of 3 runs):
# ├─ appointments.spec.ts (33% failure rate)
# └─ lab-results.spec.ts (25% failure rate)
```

### Test Deprecation

When removing features, mark tests as deprecated:

```typescript
test.skip('deprecated: old prescription format', async () => {
  // Test kept for reference but no longer run
  // Remove after April 2026
});
```

---

**For more examples?** See test files in:
- `tests/unit/` — Unit test examples
- `tests/integration/` — Integration test examples  
- `tests/e2e/` — E2E test examples

**Questions?** Reference [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md#testing-standards) for coding patterns.
