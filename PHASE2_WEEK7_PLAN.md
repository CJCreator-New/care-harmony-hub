# Phase 2: Week 7 Detailed Execution Plan
## E2E Testing Architecture & Implementation Strategy

**Timeline**: April 29 - May 3, 2026  
**Team Size**: 12-15 (Frontend, QA, Backend liaisons)  
**Success Target**: 50+ E2E scenarios, 96%+ pass rate, 6 roles fully covered

---

## 📐 Technical Architecture

### Playwright Configuration Optimization

**File**: `playwright.e2e-full.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: process.env.CI ? true : false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'playwright-report-week7' }],
    ['junit', { outputFile: 'test-results/e2e-week7.xml' }],
    ['json', { outputFile: 'test-results/e2e-week7.json' }],
    ['list'],
  ],

  use: {
    // Base URL points to local dev server or staging
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    
    // Trace & video for failed tests
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

**File**: `playwright.roles.config.ts` (for parallel role testing)
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  
  projects: [
    {
      name: 'patient',
      grep: /@patient/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'doctor',
      grep: /@doctor/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'pharmacy',
      grep: /@pharmacy/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'laboratory',
      grep: /@laboratory/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'receptionist',
      grep: /@receptionist/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'admin',
      grep: /@admin/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

### Test Fixtures & Base Classes

**File**: `tests/test/e2e-fixtures.ts`
```typescript
import { test as base, expect, Page } from '@playwright/test';
import { Database } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

// Extend test with custom fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  dbClient: Database;
  userContext: any;
}>({
  // Fixture: Database client for seeding/cleanup
  dbClient: async ({}, use) => {
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await use(client);
  },

  // Fixture: Pre-authenticated page for role testing
  authenticatedPage: async ({ page, dbClient, userRole }, use) => {
    // Seed user in database
    const user = await seedUser(dbClient, userRole);
    
    // Navigate to login page
    await page.goto('/login');
    
    // Perform login
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard/**');
    
    // Verify authentication
    expect(page.url()).toContain('/dashboard');
    
    await use(page);
    
    // Cleanup: logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');
  },

  // Fixture: User context for assertions
  userContext: async ({ dbClient, userRole }, use) => {
    const user = await seedUser(dbClient, userRole);
    const hospital = await getHospitalContext(dbClient, user.hospital_id);
    
    await use({
      user,
      hospital,
      role: userRole,
    });
  },
});

export { expect };
```

**Test data seeding**:
```typescript
// tests/test/seed.ts
export async function seedUser(dbClient: Database, role: string) {
  const hospitalId = process.env.TEST_HOSPITAL_ID || 'hp1';
  
  const email = `test-${role}-${Date.now()}@caresync.local`;
  const password = process.env.TEST_USER_PASSWORD || 'TestPass123!';
  
  // Create auth user
  const { data: authUser, error: authError } = await dbClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  
  if (authError) throw authError;
  
  // Create profile with role
  const { data: profile, error: profileError } = await dbClient
    .from('profiles')
    .insert({
      id: authUser.user.id,
      email,
      role,
      hospital_id: hospitalId,
      full_name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    })
    .select()
    .single();
  
  if (profileError) throw profileError;
  
  return {
    id: authUser.user.id,
    email,
    password,
    ...profile,
  };
}
```

---

### E2E Test Template & Best Practices

**File**: `tests/e2e/patient/auth.e2e.test.ts` (example)
```typescript
import { test, expect } from '../fixtures/e2e-fixtures';

test.describe('@patient Patient Authentication', () => {
  test.beforeEach(async ({ dbClient }) => {
    // Seed test data
    await seedPatientWithAppointments(dbClient);
  });

  test('should login with valid MRN', async ({ page, dbClient }) => {
    const patient = await getTestPatient(dbClient);
    
    // Navigate to login
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="mrn"]', patient.mrn);
    await page.fill('input[name="password"]', patient.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Assert: redirected to dashboard
    await page.waitForURL('/patient/dashboard');
    expect(page.url()).toContain('/patient/dashboard');
    
    // Assert: patient name visible
    const patientName = await page.textContent('[data-testid="patient-name"]');
    expect(patientName).toContain(patient.full_name);
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="mrn"]', 'INVALID123');
    await page.fill('input[name="password"]', 'wrongpass');
    
    await page.click('button[type="submit"]');
    
    // Assert: error message shown
    const errorMsg = await page.textContent('[data-testid="error-message"]');
    expect(errorMsg).toContain('Invalid MRN or password');
    
    // Assert: still on login page
    expect(page.url()).toContain('/login');
  });

  test('should persist session on page reload', async ({ page, dbClient }) => {
    const patient = await getTestPatient(dbClient);
    
    // Login
    await page.goto('/login');
    await page.fill('input[name="mrn"]', patient.mrn);
    await page.fill('input[name="password"]', patient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/patient/dashboard');
    
    // Reload page
    await page.reload();
    
    // Assert: still logged in, no redirect to login
    expect(page.url()).toContain('/patient/dashboard');
    const patientName = await page.textContent('[data-testid="patient-name"]');
    expect(patientName).toContain(patient.full_name);
  });

  test('should cleanup session on logout', async ({ page, dbClient }) => {
    const patient = await getTestPatient(dbClient);
    
    // Login
    await page.goto('/login');
    await page.fill('input[name="mrn"]', patient.mrn);
    await page.fill('input[name="password"]', patient.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/patient/dashboard');
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');
    
    // Assert: redirected to login
    await page.waitForURL('/login');
    expect(page.url()).toContain('/login');
  });
});
```

---

## 🔍 Test Coverage Matrix

### Patient Role (8 workflows)
| Workflow | Tests | Files | Lines |
|----------|-------|-------|-------|
| Authentication | 4 | patient/auth.e2e.test.ts | ~60 |
| Dashboard & Vitals | 3 | patient/dashboard.e2e.test.ts | ~45 |
| Appointments | 4 | patient/appointments.e2e.test.ts | ~65 |
| Medical History | 3 | patient/medical-history.e2e.test.ts | ~50 |
| Prescriptions | 4 | patient/prescriptions.e2e.test.ts | ~60 |
| Payments | 3 | patient/payments.e2e.test.ts | ~50 |
| **Subtotal** | **21** | — | **~330** |

### Doctor Role (8 workflows)
| Workflow | Tests | Files | Lines |
|----------|-------|-------|-------|
| Authentication | 3 | doctor/auth.e2e.test.ts | ~45 |
| Patient Search | 4 | doctor/patient-search.e2e.test.ts | ~65 |
| Prescription Workflow | 5 | doctor/prescription-workflow.e2e.test.ts | ~80 |
| Lab Orders | 3 | doctor/lab-orders.e2e.test.ts | ~50 |
| Consultation Notes | 3 | doctor/consultation.e2e.test.ts | ~50 |
| Quick Results View | 2 | doctor/patient-notes.e2e.test.ts | ~30 |
| **Subtotal** | **20** | — | **~320** |

### Pharmacy Role (8 workflows)
| Workflow | Tests | Files | Lines |
|----------|-------|-------|-------|
| Authentication | 3 | pharmacy/auth.e2e.test.ts | ~45 |
| Prescription Queue | 4 | pharmacy/prescription-queue.e2e.test.ts | ~65 |
| Filling Process | 4 | pharmacy/filling-process.e2e.test.ts | ~65 |
| Inventory Management | 3 | pharmacy/inventory-mgmt.e2e.test.ts | ~50 |
| Payment Collection | 2 | pharmacy/payment-collection.e2e.test.ts | ~35 |
| **Subtotal** | **16** | — | **~260** |

### Laboratory Role (8 workflows)
| Workflow | Tests | Files | Lines |
|----------|-------|-------|-------|
| Authentication | 3 | laboratory/auth.e2e.test.ts | ~45 |
| Lab Order Intake | 4 | laboratory/lab-order-intake.e2e.test.ts | ~65 |
| Specimen Processing | 4 | laboratory/specimen-processing.e2e.test.ts | ~65 |
| Result Entry | 4 | laboratory/result-entry.e2e.test.ts | ~65 |
| Report Generation | 3 | laboratory/report-generation.e2e.test.ts | ~50 |
| **Subtotal** | **18** | — | **~290** |

### Receptionist Role (8 workflows)
| Workflow | Tests | Files | Lines |
|----------|-------|-------|-------|
| Authentication | 3 | receptionist/auth.e2e.test.ts | ~45 |
| Patient Registration | 4 | receptionist/patient-registration.e2e.test.ts | ~65 |
| Appointment Booking | 4 | receptionist/appointment-booking.e2e.test.ts | ~65 |
| Check-In | 3 | receptionist/check-in.e2e.test.ts | ~50 |
| Billing Inquiry | 2 | receptionist/billing-inquiry.e2e.test.ts | ~35 |
| **Subtotal** | **16** | — | **~260** |

### Admin Role (8 workflows)
| Workflow | Tests | Files | Lines |
|----------|-------|-------|-------|
| Authentication & MFA | 3 | admin/auth.e2e.test.ts | ~50 |
| User Management | 4 | admin/user-management.e2e.test.ts | ~65 |
| Hospital Configuration | 3 | admin/hospital-config.e2e.test.ts | ~50 |
| Role & Permissions | 3 | admin/role-permissions.e2e.test.ts | ~50 |
| Audit Logs | 2 | admin/audit-logs.e2e.test.ts | ~35 |
| **Subtotal** | **15** | — | **~250** |

### Cross-Role Workflows (4 multi-step scenarios)
| Workflow | Tests | Files | Lines |
|----------|-------|-------|-------|
| Patient → Doctor → Pharmacy | 2 | workflows/patient-registration-to-payment.e2e.test.ts | ~40 |
| Doctor → Lab | 2 | workflows/prescription-to-pickup.e2e.test.ts | ~40 |
| Lab Complete Cycle | 2 | workflows/lab-order-to-results.e2e.test.ts | ~40 |
| Emergency Flow | 2 | workflows/emergency-to-consultation.e2e.test.ts | ~40 |
| **Subtotal** | **8** | — | **~160** |

**TOTAL**: **50+ workflows, 114+ E2E tests, ~1,850+ lines of E2E code**

---

## 🛠️ NPM Scripts for Week 7

Add to `package.json`:
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:full": "playwright test --config=playwright.e2e-full.config.ts",
    "test:e2e:roles": "playwright test --config=playwright.roles.config.ts",
    "test:e2e:patient": "playwright test --grep @patient",
    "test:e2e:doctor": "playwright test --grep @doctor",
    "test:e2e:pharmacy": "playwright test --grep @pharmacy",
    "test:e2e:laboratory": "playwright test --grep @laboratory",
    "test:e2e:receptionist": "playwright test --grep @receptionist",
    "test:e2e:admin": "playwright test --grep @admin",
    "test:e2e:workflows": "playwright test --grep @workflow",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:report": "playwright show-report playwright-report-week7",
    "test:e2e:seed": "node scripts/seed-e2e-data.mjs",
    "test:e2e:ci": "npm run test:e2e:full -- --reporter=junit"
  }
}
```

---

## 📊 Success Metrics & Thresholds

### Primary Metrics (Must Pass)

| Metric | Target | Threshold | Measurement |
|--------|--------|-----------|-------------|
| **Test Count** | 50+ scenarios | ≥48 | Manual count post-execution |
| **Pass Rate** | 96%+ | ≥95% | Total passing / Total tests |
| **Role Coverage** | 6/6 | 100% | All roles represented |
| **Critical Workflows** | 100% passing | 4/4 flows | Core business flows |
| **Execution Time** | <10 min | <12 min | Per full suite run |

### Secondary Metrics (Should Pass)

| Metric | Target | Threshold | Notes |
|--------|--------|-----------|-------|
| **Browser Compatibility** | 3/3 | Chrome + FF | Safari optional |
| **Hospital Scoping** | 100% | No cross-hospital leakage | Authorization validation |
| **Error Recovery** | ≥90% | Graceful degradation | Form preservation, retry logic |
| **Performance** | <5sec/scenario | <8sec average | User experience threshold |
| **Code Coverage** | N/A | E2E coverage by features | Tracked separately from unit |

---

## 🔐 Security & Compliance Validations

### HIPAA Compliance Checks in E2E

```typescript
// Patient data isolation
test('should not expose cross-hospital patient data', async ({ authenticatedPage, dbClient }) => {
  const otherHospitalPatient = await createPatientInDifferentHospital(dbClient);
  
  // Try to access via direct URL
  await authenticatedPage.goto(`/patients/${otherHospitalPatient.id}`);
  
  // Should redirect to 401 or 403
  expect(authenticatedPage.url()).toContain('/unauthorized');
});

// Encryption metadata validation
test('should preserve encryption metadata on patient update', async ({ authenticatedPage, dbClient }) => {
  const patient = await getTestPatient(dbClient);
  
  // Update patient data
  await authenticatedPage.goto(`/patients/${patient.id}/edit`);
  await authenticatedPage.fill('input[name="phone"]', '+1234567890');
  await authenticatedPage.click('button[type="submit"]');
  
  // Verify in database
  const updated = await dbClient
    .from('patients')
    .select('encryption_metadata')
    .eq('id', patient.id)
    .single();
  
  expect(updated.encryption_metadata).toBeDefined();
  expect(updated.encryption_metadata.algorithm).toBe('AES-256-GCM');
});

// Role-based access control
test('should prevent pharmacist from viewing patient medical records', async ({ authenticatedPage }) => {
  // Login as pharmacist
  // Navigate to patient records URL
  await authenticatedPage.goto('/patients/list');
  
  // Should not see detailed medical records, only prescriptions
  const medicalRecordsTab = await authenticatedPage.$('[data-testid="medical-records-tab"]');
  expect(medicalRecordsTab).toBeNull();
});
```

---

## 📋 Database Seed Strategy

**File**: `scripts/seed-e2e-data.mjs`
```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedTestData() {
  console.log('Seeding E2E test data...');
  
  // 1. Create test hospital
  const hospital = await supabase
    .from('hospitals')
    .insert({
      name: 'E2E Test Hospital',
      code: 'E2E-TEST-001',
    })
    .select()
    .single();
  
  // 2. Create test users for each role
  const roles = ['patient', 'doctor', 'pharmacy', 'laboratory', 'receptionist', 'admin'];
  
  for (const role of roles) {
    // Auth user
    const email = `test-${role}@e2e.local`;
    const { data: authUser } = await supabase.auth.admin.createUser({
      email,
      password: 'TestPass123!',
    });
    
    // Profile
    await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email,
        role,
        hospital_id: hospital.id,
        full_name: `Test ${role}`,
      });
  }
  
  // 3. Create test patients
  for (let i = 0; i < 5; i++) {
    await supabase
      .from('patients')
      .insert({
        mrn: `TEST-${String(i).padStart(4, '0')}`,
        first_name: `Test Patient ${i}`,
        last_name: `${i}`,
        date_of_birth: '1990-01-01',
        hospital_id: hospital.id,
      });
  }
  
  console.log('✅ E2E test data seeded');
}

seedTestData();
```

---

## ⚡ Performance Benchmarks & Optimization

### Target Performance

```
Patient Login              |████░░░░░░│  <2s  ← Critical
Doctor Patient Search      |█████░░░░░│  <3s  ← Critical
Prescription Submit        |██████░░░░│  <4s  ← Critical
Lab Result Entry           |████░░░░░░│  <2.5s ← Critical
Inventory Lookup           |█████░░░░░│  <3s  ← Critical
```

### Load Testing (Optional - Week 7+)

```bash
# Simulate 50 concurrent users
npm run test:e2e:load -- --concurrency=50
```

---

## 🚨 Known Limitations & Workarounds

| Issue | Impact | Workaround | Status |
|-------|--------|-----------|--------|
| Date picker in Safari | 1 test | Use JS `page.evaluate()` | TBD |
| Slow CI runner | Timeouts | Increase to 45s timeout | TBD |
| Async permissions | Flakiness | Add `waitForLoadState('networkidle')` | TBD |
| Multi-window testing | N/A | Restructure to single-window flows | TBD |

---

## 📞 Escalation & Support

**QA Lead**: Owns E2E execution, passes/fails gate approval  
**Frontend Tech Lead**: Fixes UI-related test failures  
**Backend Tech Lead**: Fixes API/database seed failures  
**DevOps**: Manages CI/CD pipeline, test environment  

**Critical Blocker Resolution Time**: <2 hours  
**Non-Critical Issue Resolution**: By EOD same day

---

## 📦 Deliverables Checklist

- [ ] `tests/e2e/` folder structure created
- [ ] 50+ `.e2e.test.ts` files completed
- [ ] `playwright.e2e-full.config.ts` optimized
- [ ] `tests/test/e2e-fixtures.ts` fixture library ready
- [ ] `scripts/seed-e2e-data.mjs` seeding script verified
- [ ] `npm run test:e2e` scripts all working
- [ ] HTML report generated (`playwright-report-week7/`)
- [ ] CI/CD integration complete
- [ ] Documentation complete

---

**Document Version**: 1.0  
**Created**: April 9, 2026  
**Next Review**: April 29, 2026
