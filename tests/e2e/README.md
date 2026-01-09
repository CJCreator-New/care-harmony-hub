# E2E Testing for CareSync HMS

This directory contains comprehensive end-to-end tests for the CareSync Hospital Management System, focusing on critical patient workflows and role-based access control.

## 🎯 Test Coverage

### Critical Patient Flow Tests (`patient-flow-critical.spec.ts`)
Tests the complete patient journey through the healthcare system:

1. **Patient Check-in** (Receptionist role)
   - Queue management and patient registration
   - Appointment verification and check-in process

2. **Vitals Recording** (Nurse role)
   - Recording patient vital signs
   - Data validation and error handling

3. **Patient Preparation** (Nurse role)
   - Pre-consultation checklist completion
   - Patient readiness verification

4. **Consultation** (Doctor role)
   - 5-step consultation workflow
   - Clinical documentation and diagnosis
   - Prescription creation with safety checks

5. **Prescription Dispensing** (Pharmacist role)
   - Prescription processing and verification
   - Drug interaction checking
   - Medication dispensing workflow

### Role-Based Access Control Tests (`role-based-access.spec.ts`)
Validates security and permissions across all user roles:

- **Route Access Control**: Ensures users can only access authorized pages
- **UI Element Visibility**: Verifies role-appropriate interface elements
- **Data Access Restrictions**: Tests data isolation between roles and hospitals
- **Role Switching**: Validates localStorage persistence and role transitions
- **Security Edge Cases**: Tests unauthorized access attempts and role escalation

## 🚀 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Ensure Playwright browsers are installed
npx playwright install
```

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run critical patient flow tests only
npm run test:e2e:patient-flow

# Run role-based access control tests only
npm run test:e2e:rbac

# Run both critical test suites
npm run test:e2e:critical

# Run tests with UI (interactive mode)
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test patient-flow-critical.spec.ts

# Run tests on specific browser
npx playwright test --project=chromium

# Run tests with debug mode
npx playwright test --debug
```

## 🏗️ Test Architecture

### Test Structure
```
tests/e2e/
├── patient-flow-critical.spec.ts    # Critical patient workflow tests
├── role-based-access.spec.ts        # RBAC and security tests
├── utils/
│   └── test-helpers.ts              # Shared utilities and helpers
└── config/
    └── e2e.config.ts                # Test configuration and data
```

### Key Components

#### Test Helpers (`utils/test-helpers.ts`)
- **Role Management**: `setTestRole()`, `loginAsTestUser()`
- **API Mocking**: `setupApiMocks()` for consistent test data
- **Form Utilities**: `fillForm()`, `completeConsultationStep()`
- **Test Data**: Predefined patient, vitals, and prescription data

#### Configuration (`config/e2e.config.ts`)
- Test environment settings
- User credentials and test data templates
- Performance thresholds and timeouts
- API endpoints and selectors

## 🔧 Test Features

### Role Switching with localStorage Persistence
Tests validate that the role switching functionality works correctly:

```typescript
// Switch to nurse role
await setTestRole(page, 'nurse');

// Role persists across navigation
await page.goto('/queue');
await page.goto('/dashboard');

// Verify role is still active
const currentRole = await page.evaluate(() => localStorage.getItem('testRole'));
expect(currentRole).toBe('nurse');
```

### Comprehensive API Mocking
All tests use mocked API responses for consistency:

```typescript
await setupApiMocks(page);
// Provides mock data for patients, appointments, consultations, etc.
```

### Data Validation Testing
Tests include validation for:
- Form input validation
- Drug interaction alerts
- Allergy checking
- Role-based data access restrictions

### Error Handling
Tests cover various error scenarios:
- Network failures
- Invalid data submission
- Unauthorized access attempts
- Session timeouts

## 📊 Test Data

### Default Test Patient
```typescript
{
  firstName: 'Jane',
  lastName: 'TestPatient',
  mrn: 'MRN-E2E-001',
  phone: '555-0123',
  email: 'jane.testpatient@example.com',
  dateOfBirth: '1985-06-15',
  gender: 'female'
}
```

### Test Vitals
```typescript
{
  bloodPressure: '140/90',
  heartRate: '78',
  temperature: '98.6',
  weight: '165',
  height: '5\'6"'
}
```

### Test Prescription
```typescript
{
  medication: 'Lisinopril',
  dosage: '10mg',
  frequency: 'Once daily',
  duration: '30 days'
}
```

## 🛡️ Security Testing

### Role-Based Access Matrix
Tests validate access permissions for each route:

| Route | Admin | Doctor | Nurse | Receptionist | Pharmacist | Lab Tech | Patient |
|-------|-------|--------|-------|--------------|------------|----------|---------|
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `/patients` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/consultations` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `/pharmacy` | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `/settings/staff-management` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Security Test Cases
- **Unauthorized Route Access**: Attempts to access restricted pages
- **Role Escalation Prevention**: Attempts to manipulate localStorage
- **Data Isolation**: Ensures users only see appropriate data
- **API Endpoint Protection**: Validates API-level access control

## 🎭 Browser Support

Tests run on multiple browsers and devices:
- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: Chrome Mobile, Safari Mobile
- **Responsive**: Tests validate mobile-responsive design

## 📈 Performance Testing

Tests include performance validations:
- Page load times < 5 seconds
- API response times < 2 seconds
- Memory usage monitoring
- Network request optimization

## 🐛 Debugging Tests

### Debug Mode
```bash
# Run with debug mode (pauses execution)
npx playwright test --debug

# Run specific test with debug
npx playwright test patient-flow-critical.spec.ts --debug
```

### Screenshots and Videos
```bash
# Run with screenshots on failure
npx playwright test --screenshot=only-on-failure

# Run with video recording
npx playwright test --video=on-first-retry
```

### Trace Viewer
```bash
# Generate trace files
npx playwright test --trace=on

# View trace
npx playwright show-trace trace.zip
```

## 🔍 Test Reports

### HTML Report
```bash
# Generate and view HTML report
npx playwright show-report
```

### CI/CD Integration
Tests are configured for CI/CD environments:
- Automatic retries on failure
- Parallel execution
- Artifact collection (screenshots, videos, traces)

## 📝 Writing New Tests

### Test Template
```typescript
import { test, expect } from '@playwright/test';
import { setTestRole, loginAsTestUser, setupApiMocks } from './utils/test-helpers';

test.describe('New Feature Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAsTestUser(page, 'doctor');
  });

  test('should perform new feature workflow', async ({ page }) => {
    await test.step('Step 1: Setup', async () => {
      // Test setup
    });

    await test.step('Step 2: Action', async () => {
      // Test action
    });

    await test.step('Step 3: Verification', async () => {
      // Test verification
    });
  });
});
```

### Best Practices
1. **Use test.step()** for clear test organization
2. **Mock API calls** for consistent test data
3. **Test role-based access** for security features
4. **Include error scenarios** and edge cases
5. **Use descriptive test names** and assertions
6. **Clean up state** between tests

## 🚨 Troubleshooting

### Common Issues

#### Test Timeouts
```bash
# Increase timeout for slow operations
test.setTimeout(60000);
```

#### Element Not Found
```typescript
// Wait for element to be visible
await expect(page.getByText('Expected Text')).toBeVisible();

// Use more specific selectors
await page.getByRole('button', { name: 'Specific Button' }).click();
```

#### Role Switching Issues
```typescript
// Ensure role is set and page is reloaded
await setTestRole(page, 'nurse');
await page.waitForLoadState('networkidle');
```

#### API Mock Issues
```typescript
// Verify mock is set up before navigation
await setupApiMocks(page);
await page.goto('/target-page');
```

### Debug Checklist
- [ ] Are API mocks set up correctly?
- [ ] Is the correct role set for the test?
- [ ] Are selectors specific enough?
- [ ] Is the page fully loaded before assertions?
- [ ] Are there any console errors?

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## 🤝 Contributing

When adding new E2E tests:

1. Follow the existing test structure and patterns
2. Use the shared test helpers and utilities
3. Include both happy path and error scenarios
4. Test role-based access control where applicable
5. Add appropriate documentation and comments
6. Ensure tests are deterministic and reliable