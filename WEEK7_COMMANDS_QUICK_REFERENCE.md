# Week 7 Quick Reference: Commands & Resources
## Fast lookup for E2E testing execution

---

## 🚀 Getting Started (Copy-Paste Ready)

### Setup (Run Once)
```bash
# Clone latest code
git pull origin develop

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Seed test data
npm run test:e2e:seed

# Verify dev server works
npm run dev
# Should see: "Local: http://localhost:5173"
```

---

## 🧪 Running E2E Tests

### Quick Commands

```bash
# Run ALL E2E tests (all browsers, all roles)
npm run test:e2e:full

# Run tests for specific role
npm run test:e2e:patient      # Patient role only
npm run test:e2e:doctor       # Doctor role only
npm run test:e2e:pharmacy     # Pharmacy role only
npm run test:e2e:laboratory   # Lab tech role only
npm run test:e2e:receptionist # Receptionist role only
npm run test:e2e:admin        # Admin role only

# Run cross-role workflow tests
npm run test:e2e:workflows

# Run with debug UI (interactive)
npm run test:e2e:debug

# Run in headed mode (see browser)
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### Specific Test File
```bash
# Run single test file
npx playwright test tests/e2e/patient/auth.e2e.test.ts

# Run specific test by name
npx playwright test -g "should login with valid"

# Run with verbose output
npx playwright test --reporter=verbose
```

---

## 📊 Test Results & Reports

```bash
# Show HTML report (opens in browser)
npm run test:e2e:report

# Show last test results
cat playwright-report-week7/index.html | grep -A5 "Summary"

# Export test results to JSON
npx playwright test --reporter=json > test-results.json

# Export to JUnit format (for CI/CD)
npx playwright test --reporter=junit > test-results.xml
```

---

## 🔧 Debugging a Failed Test

```bash
# Step 1: Run with headed mode to watch
npm run test:e2e:headed -- tests/e2e/[role]/[test-name].e2e.test.ts

# Step 2: Debug with Playwright inspector
npm run test:e2e:debug -- tests/e2e/[role]/[test-name].e2e.test.ts

# Step 3: Check test video/screenshots
# Videos: playwright-report-week7/data/
# Look for .webm files

# Step 4: Check trace file
npx playwright show-trace playwright-report-week7/trace/trace.zip
```

---

## 🗂️ Test File Organization

```
tests/e2e/
├── patient/              ← 6-8 test files
│   ├── auth.e2e.test.ts
│   ├── dashboard.e2e.test.ts
│   └── ...
├── doctor/               ← 6-8 test files
│   ├── auth.e2e.test.ts
│   └── ...
├── pharmacy/             ← 5-6 test files
├── laboratory/           ← 5-6 test files
├── receptionist/         ← 5-6 test files
├── admin/                ← 5-6 test files
└── workflows/            ← 4 multi-role test files
```

---

## 📝 Writing Your First E2E Test

### Template
```typescript
import { test, expect } from '../fixtures/e2e-fixtures';

test.describe('@patient Patient Login', () => {
  test('should login with valid credentials', async ({ page, dbClient }) => {
    // 1. Seed test data
    const user = await seedUser(dbClient, 'patient');
    
    // 2. Navigate to page
    await page.goto('/login');
    
    // 3. Interact with UI
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // 4. Assert expected outcome
    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');
  });
});
```

### Key Imports
```typescript
// Always start with this
import { test, expect } from '../fixtures/e2e-fixtures';

// OR if using standard Playwright
import { test, expect } from '@playwright/test';
```

---

## 🛠️ Common Playwright Methods

```typescript
// Navigation
await page.goto('/path');
await page.goBack();
await page.reload();

// Filling & Clicking
await page.fill('selector', 'value');
await page.click('selector');
await page.press('selector', 'Enter');

// Waiting
await page.waitForURL('/path');
await page.waitForLoadState('networkidle');
await page.waitForSelector('selector');

// Reading
const text = await page.textContent('selector');
const value = await page.inputValue('selector');
const exists = await page.$('selector') !== null;

// Assertions
expect(page.url()).toContain('/dashboard');
expect(text).toBe('Expected text');
expect(element).toBeVisible();
expect(element).toBeDisabled();
```

---

## 🔑 Test Data & Fixtures

### Available Fixtures
```typescript
test('example', async ({ page, authenticatedPage, dbClient, userContext }) => {
  // page — Raw Playwright page object
  // authenticatedPage — Pre-logged-in page (requires @patient/@doctor etc tag)
  // dbClient — Supabase database client for seeding
  // userContext — User metadata (user.email, user.role, hospital info)
});
```

### Seeding Test Data
```typescript
// In your test file
import { seedUser, seedPatient, seedAppointment } from '../seed';

test('example', async ({ page, dbClient }) => {
  // Create test user
  const doctor = await seedUser(dbClient, 'doctor');
  
  // Create test patient
  const patient = await seedPatient(dbClient, doctor.hospital_id);
  
  // Create appointment
  const appt = await seedAppointment(dbClient, {
    doctor_id: doctor.id,
    patient_id: patient.id,
  });
  
  // Now use in test
  await page.goto(`/appointments/${appt.id}`);
});
```

---

## 💾 Database & Cleanup

### Manual Data Cleanup
```bash
# Delete all test data
npm run test:e2e:cleanup

# Reseed test data
npm run test:e2e:seed

# Check current test users
npm run test:e2e:check-users
```

### Database Connection
```typescript
// In your test
const { dbClient } = testContext;

// Query data
const result = await dbClient
  .from('patients')
  .select('*')
  .eq('mrn', 'TEST-0001')
  .single();

// Insert data
await dbClient
  .from('appointments')
  .insert({ /* data */ });

// Update data
await dbClient
  .from('patients')
  .update({ notes: 'Updated' })
  .eq('id', patient.id);
```

---

## 📋 Test Tags & Filtering

### Available Tags
```typescript
test.describe('@patient Patient Workflows', () => {
  // Runs with: npm run test:e2e:patient
});

test.describe('@doctor Doctor Workflows', () => {
  // Runs with: npm run test:e2e:doctor
});

test.describe('@workflow Workflow Tests', () => {
  // Runs with: npm run test:e2e:workflows
});
```

### Run Tests by Tag
```bash
# All patient tests
npx playwright test --grep @patient

# All doctor tests
npx playwright test --grep @doctor

# All workflow tests
npx playwright test --grep @workflow

# Exclude admin tests
npx playwright test --grep-invert @admin
```

---

## 🔒 Authentication Testing

### Testing Different Roles
```typescript
import { test, expect } from '../fixtures/e2e-fixtures';

test.describe('@doctor Doctor Portal', () => {
  test.use({ userRole: 'doctor' });
  
  test('doctor can view patient list', async ({ authenticatedPage }) => {
    // Already logged in as doctor via fixture
    await authenticatedPage.goto('/patients');
    
    // Verify doctor-specific UI
    const patientList = await authenticatedPage.$('[data-testid="patient-list"]');
    expect(patientList).toBeDefined();
  });
});
```

---

## ⚡ Performance Tips

### Speed Up Test Execution
```typescript
// Use parallel execution (default)
npx playwright test --workers=6

// Single worker for debugging
npx playwright test --workers=1

// Run only changed test files
npx playwright test --last-failed

// Skip retries for local testing
npx playwright test --retries=0
```

### Reduce Test Time
```typescript
// Cache test data between tests
test.describe.configure({ mode: 'parallel' });

// Skip navigation delays
await page.goto(url, { waitUntil: 'domcontentloaded' });

// Use page.evaluate() for complex actions
await page.evaluate(() => {
  // Direct JS execution, faster than UI automation
});
```

---

## 📞 Getting Help

### Check Logs
```bash
# View test output
npm run test:e2e -- --reporter=verbose

# Check for errors in browser console
npx playwright test --reporter=list

# Export full trace
npm run test:e2e -- --trace=on
```

### Ask in Slack
- **Channel**: #qa-e2e-testing
- **Questions**: Common issue + exact error message
- **Blockage**: Escalate to QA Lead immediately

### Documentation Resources
- **Playwright Docs**: https://playwright.dev
- **Project Guide**: `PHASE2_WEEK7_PLAN.md`
- **Fixtures Guide**: `PHASE2_WEEK7_INFRASTRUCTURE.md`

---

## 🔄 CI/CD & Deployment

### Local CI Simulation
```bash
# Run all checks (unit + e2e)
npm run test:ci

# Push will trigger GitHub Actions
git push origin develop
# E2E tests run automatically on PR
```

### GitHub Actions Status
```
Go to: GitHub > Actions > E2E Tests
  ↓
See latest run status
  ↓
If failed: Click run → See detailed logs
```

---

## 📊 Example: Full Test Execution Flow

```bash
# 1. Setup (first time only)
npm install && npx playwright install && npm run test:e2e:seed

# 2. Start dev server
npm run dev  # Terminal 1

# 3. Run tests (Terminal 2)
npm run test:e2e:full

# 4. View results
npm run test:e2e:report

# 5. Debug any failures
npm run test:e2e:headed -- tests/e2e/[ROLE]/[TEST].e2e.test.ts
```

---

## ✅ Checklist: Before You Push

- [ ] All tests pass locally (`npm run test:e2e:full`)
- [ ] New tests follow template structure
- [ ] Test data properly seeded & cleaned up
- [ ] No hardcoded credentials or sensitive data
- [ ] Test names are descriptive
- [ ] Tests have proper role tags (@patient, @doctor, etc)
- [ ] No pending/skipped tests (.skip, .only)
- [ ] Code follows team conventions

```bash
# Quick validation
npm run test:e2e:full && npm run test:lint
```

---

**Created**: April 9, 2026  
**Last Updated**: April 9, 2026  
**Valid Through**: April 29, 2026 (Week 7 Start)
