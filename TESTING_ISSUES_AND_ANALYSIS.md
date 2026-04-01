# Complete Testing Analysis: Issues & Workflow Gaps

**Document Date:** April 1, 2026  
**Status:** COMPREHENSIVE ISSUE IDENTIFICATION  
**Test Suite:** patient-flow-complete.spec.ts  

---

## EXECUTIVE SUMMARY

The patient flow E2E test suite has **9 critical issues** preventing proper execution:

| # | Category | Severity | Issue |
|---|----------|----------|-------|
| 1 | Authentication | CRITICAL | Wrong fixture import (auth.fixture vs roles.fixture) |
| 2 | Test Infrastructure | CRITICAL | Missing dev server prerequisites |
| 3 | Test Data | HIGH | No persistent storage verification |
| 4 | Workflow Logic | HIGH | Missing data handoff validation between stages |
| 5 | RBAC Validation | HIGH | No cross-role permission verification |
| 6 | State Management | HIGH | No patient record tracking across test stages |
| 7 | Error Handling | MEDIUM | No error recovery or negative test cases |
| 8 | Assertions | MEDIUM | Insufficient data integrity checks |
| 9 | Documentation | MEDIUM | Missing expected vs actual outcomes |

---

## ISSUE 1: AUTHENTICATION & FIXTURE SETUP ⚠️ CRITICAL

### Problem
**Location:** `tests/e2e/patient-flow-complete.spec.ts` line 2

```typescript
// WRONG - Requires pre-generated storage state files
import { receptionistTest, nurseTest, ... } from './fixtures/auth.fixture';
```

**Root Cause:**
- `auth.fixture.ts` expects storage state files at `test-results/.auth/{role}.json`
- These files are **not generated** (globalSetup not configured properly)
- Tests fail silently with ENOENT errors before any test logic runs
- This is why tests execute in 16-30ms (immediate failure before page load)

**Evidence:**
```
Running 35 tests using 1 worker
  ✗ 1 [chromium] tests\e2e\patient-flow-complete.spec.ts:19:1 (20ms)
  ✗ 2 [chromium] tests\e2e\patient-flow-complete.spec.ts:92:1 (16ms)
  // ... 32 more tests fail immediately
```

### Solution: Use roles.fixture.ts
**Location:** `tests/e2e/fixtures/roles.fixture.ts`

The correct fixture provides:
- ✅ Mock auth session injection
- ✅ LocalStorage setup for E2E mode
- ✅ Works without pre-generated storage states
- ✅ Proper test context initialization

**Fix:**
```typescript
// CORRECT - Uses mock auth injection
import { test, expect } from './fixtures/roles.fixture';

test.describe('Complete Patient Flow', () => {
  test('Patient Registration to Discharge', async ({ receptionistPage, nurseTest, doctorPage, ...}) => {
    // ...
  });
});
```

---

## ISSUE 2: MISSING TEST PREREQUISITES ⚠️ CRITICAL

### Problem
Tests require a **development server running on port 8080** with:
- Vite dev server in test mode
- Database seeded with test users
- Mock API endpoints available
- WebSocket connections for real-time updates

### Current State
```
✗ No dev server running on localhost:8080
✗ No database seeding for test users
✗ No mock API handlers configured
```

### Evidence from playwright.config.ts
```typescript
webServer: {
  command: 'npx vite --host 0.0.0.0 --port 8080 --mode test',
  url: process.env.E2E_BASE_URL || 'http://localhost:8080',
  reuseExistingServer: !isCI,
  timeout: 180_000,
  env: {
    TEST_MODE: 'true',
    VITE_E2E_MOCK_AUTH: 'true',  // ← This must be set
  },
},
```

### Solution
Before running tests, start dev server:
```bash
npm run dev
# Then in another terminal:
npm run test:e2e
```

**OR** Playwright auto-starts if webServer config in playwright.config.ts is active.

---

## ISSUE 3: NO PERSISTENT DATA TRACKING ⚠️ HIGH

### Problem
Tests create data but **never verify** if it's actually persisted or accessible by subsequent roles.

**Example from Stage 1 → Stage 2:**
```typescript
// STAGE 1: Receptionist creates patient
await receptionistPage.fill('input[name="name"]', 'John Doe');
await receptionistPage.click('button[name="register"]');
console.log('✓ Patient registered');

// BUT: No verification that patient was saved to database!
// AND: No mechanism to pass patient ID to Stage 2 (Nurse)

// STAGE 2: Nurse login
await nursePage.goto('/queue');
// BUT: Which patient should nurseTest see? 
// Is the recently registered patient visible?
// This is never verified!
```

### Missing Validations
- ❌ Patient record in database after registration
- ❌ Patient ID visible in queue for Nurse
- ❌ Patient data accessible by other roles
- ❌ Proper audit trail entries created
- ❌ Data reaches all necessary tables

### Impact
Tests pass false positives—they click buttons but never verify business outcomes.

---

## ISSUE 4: WORKFLOW STATE ISOLATION ⚠️ HIGH

### Problem
Each test uses **independent page contexts** with **no data sharing mechanism**.

```typescript
// Stage 1: Receptionist creates patient
receptionistTest('Receptionist: Patient Registration', async ({ receptionistPage }) => {
  const patientId = await receptionistPage.evaluate(() => /* extract from page */);
  // patientId exists only in this test context
});

// Stage 2: Nurse receives vitals (SEPARATE TEST)
nurseTest('Nurse: Vital Signs', async ({ nursePage }) => {
  // How do we know WHICH patient to work with?
  // There's no way to reference the patient created in Stage 1
  // Tests are completely decoupled
});
```

### Missing Component: Patient Record Tracking
```typescript
// SHOULD BE: Shared test context tracking the same patient
const testContext = {
  patientId: null,
  patientName: 'John Doe',
  prescriptionIds: [],
  labOrderIds: [],
  vitalSigns: {},
};

// Then each stage updates this:
receptionistTest('Register', async ({ receptionistPage }) => {
  testContext.patientId = await registerPatient(...);
});

nurseTest('Vitals', async ({ nursePage }) => {
  // NOW we can work with the SAME patient
  const patient = await getPatient(testContext.patientId);
  await recordVitals(patient.id, {...});
});
```

### Current Architecture Problem
**Tests are SEQUENTIAL but treat data as ISOLATED:**
```
Receptionist creates Patient → No ID captured
                              ↓
Nurse tries to find patient → Can't find it
                              ↓
Doctor tries to access vitals → Nothing exists
```

---

## ISSUE 5: MISSING CROSS-ROLE RBAC VALIDATION ⚠️ HIGH

### Problem
Tests use role-specific pages but **never verify RBAC enforcement**.

**Missing RBAC Validations:**
```typescript
// Test 1: Doctor CAN create prescriptions
doctorTest('Doctor creates prescription', async ({ doctorPage }) => {
  await doctorPage.goto('/prescriptions/create');
  await expectSuccess(); // ✓ Works
});

// Missing Test: Nurse CANNOT create prescriptions
nurseTest('Nurse blocked from creating prescription', async ({ nursePage }) => {
  await nursePage.goto('/prescriptions/create');
  // Should return 403 Forbidden or Access Denied UI
  await expect(nursePage.locator('text=Access Denied')).toBeVisible();
  // ← THIS TEST IS MISSING!
});

// Missing Test: Patient cannot view doctor's consultation notes
patientTest('Patient blocked from viewing doctor notes', async ({ patientPage }) => {
  await patientPage.goto(`/patients/${othersPatientId}/consultation-notes`);
  // Should return 403
  await expect(patientPage.locator('text=Unauthorized')).toBeVisible();
  // ← THIS TEST IS MISSING!
});
```

### Validation Checklist (NOT DONE)
- ❌ Receptionist limited to registration only
- ❌ Nurse cannot approve prescriptions
- ❌ Doctor cannot dispense medication
- ❌ Pharmacist cannot create patient records
- ❌ Lab Tech cannot modify doctor orders
- ❌ Patient can only see own records
- ❌ Unauthorized API access returns 403
- ❌ Audit logs record RBAC violations

---

## ISSUE 6: MISSING BUSINESS LOGIC VALIDATIONS ⚠️ HIGH

### Problem
Tests check if buttons exist and click them, but **never verify business rules**.

**Examples of Missing Validations:**

| Stage | Business Rule | Test Coverage |
|-------|---------------|---------|
| Registration | Patient age ≥ 18 | ❌ Missing |
| Vitals | Systolic BP must be 70-250 mmHg | ❌ Missing |
| Vitals | Temperature 95-106°F | ❌ Missing |
| Prescription | Never prescribe > 100 tablets | ❌ Missing |
| Prescription | Drug interactions checked | ❌ Missing |
| Pharmacy | Cannot dispense unapproved Rx | ❌ Missing |
| Pharmacy | Expiry date validation | ❌ Missing |
| Lab | Cannot enter result outside normal range without confirmation | ❌ Missing |
| Lab | Critical values must trigger alerts | ❌ Missing |

### Example: Missing Drug Interaction Check
```typescript
// Current test: Just fills form
doctorTest('Create prescription', async ({ doctorPage }) => {
  await doctorPage.fill('input[name="drug"]', 'Warfarin');
  await doctorPage.fill('input[name="quantity"]', '100');  // ← No check for qty limit
  await doctorPage.click('button[name="save"]');
});

// MISSING: Drug interaction check
// If patient is already on Aspirin, Warfarin + Aspirin = contraindication
// This should be caught and surface an error

// MISSING: Quantity validation
// Prescription should not allow > reasonable quantity
```

---

## ISSUE 7: NO NEGATIVE TEST CASES ⚠️ MEDIUM

### Problem
Tests only cover the "happy path." No error scenarios tested.

**Missing Negative Tests:**

| Scenario | Expected Behavior | Currently Tested |
|----------|----------|---|
| Empty registration form | Error message | ❌ NO |
| Invalid email format | Email validation error | ❌ NO |
| Duplicate phone number | Duplicate error | ❌ NO |
| Missing required fields | Form prevents submission | ❌ NO |
| Network timeout on save | Graceful retry | ❌ NO |
| Concurrent edits | Last-write-wins or error | ❌ NO |
| Invalid vital sign ranges | Input validation error | ❌ NO |
| Delete patient with active Rx | Referential integrity error | ❌ NO |

---

## ISSUE 8: INSUFFICIENT ASSERTION DEPTH ⚠️ MEDIUM

### Problem
Tests assert page visibility but not **actual business outcomes**.

**Current Assertions:**
```typescript
// These assertions are TOO SHALLOW:
await expect(receptionistPage).toHaveURL(/dashboard/);
await expect(nameField).toBeVisible();
await receptionistPage.click('button[name="register"]');
console.log('✓ Patient registered');  // ← Assumes success without verification
```

**Missing Deep Assertions:**
```typescript
// SHOULD verify database state:
const patientInDb = await fetchFromDatabase(
  `SELECT * FROM patients WHERE email = ?`, 
  [patientEmail]
);
expect(patientInDb).toBeTruthy();
expect(patientInDb.first_name).toBe('John');

// SHOULD verify audit log:
const auditEntry = await fetchFromDatabase(
  `SELECT * FROM audit_log WHERE resource_id = ? AND action = 'created'`,
  [patientId]
);
expect(auditEntry.actor_role).toBe('receptionist');
expect(auditEntry.timestamp).toBeTruthy();

// SHOULD verify role can see it:
const nurseCanSee = await nursePage.evaluate(async () => {
  const res = await fetch(`/api/patients/${patientId}`);
  return res.ok;
});
expect(nurseCanSee).toBe(true);
```

---

## ISSUE 9: NO AUDIT TRAIL VALIDATION ⚠️ MEDIUM

### Problem
Tests don't verify that **every action is logged for compliance**.

**Missing Audit Validations:**

```typescript
// MISSING: Audit trail verification
const auditLog = await fetchAuditLog();

expect(auditLog).toContainEqual({
  action: 'patient_registered',
  actor_id: receptionistId,
  actor_role: 'receptionist',
  resource_type: 'patient',
  resource_id: patientId,
  changes: {
    name: 'John Doe',
    email: 'john@example.com',
    // ...
  },
  timestamp: expect.any(Date),
  reason: 'Initial registration'
});
```

---

## WORKFLOW STATE MACHINE ISSUES ⚠️ HIGH

### Missing State Validations

```
Current → Expected

Patient: REGISTERED ✓
Patient: [QUEUE] ← Status visibility missing
Patient: [VITALS_RECORDED] ← State transition not verified
Patient: [CONSULTATION_DONE] ← Next step validation missing
Patient: [RX_APPROVED] ← Must happen before DISPENSED
Patient: [DISPENSED] ← Can only happen after approved
Patient: [RESULTS_AVAILABLE] ← Lab finalizes this
Patient: [CLOSED] ← Final state

Missing validations:
- ❌ State transitions in correct order
- ❌ Cannot skip states
- ❌ Cannot go backward
- ❌ Final state marks completion
```

---

## CROSS-STAGE DATA INTEGRITY ⚠️ HIGH

### Problem
No verification that data flows correctly between stages.

**Data Flow Not Validated:**

```
Stage 1: Receptionist
  ├─ Creates patient
  ├─ Sets: name, email, phone, DOB, address
  └─ Patient ID = ? (NOT CAPTURED)

Stage 2: Nurse  
  ├─ Should see SAME patient
  ├─ Needs: patient ID from Stage 1
  └─ Currently: NO MECHANISM to get it

Stage 3: Doctor
  ├─ Should see SAME patient + vitals from Stage 2
  ├─ Needs: patient ID + vital signs from Stage 2
  └─ Currently: NO VERIFICATION Stage 2 data exists

Stage 4A: Lab Tech
  ├─ Should process SAME patient
  ├─ Needs: lab orders from Doctor (Stage 3)
  └─ Currently: NO LINKING between stages
```

---

## SUMMARY OF REQUIRED FIXES

### Fix Priority Order

1. **CRITICAL - Must Fix to Run Tests:**
   - [ ] Change fixture import to `roles.fixture.ts`
   - [ ] Ensure dev server runs on port 8080
   - [ ] Configure VITE_E2E_MOCK_AUTH=true

2. **HIGH - Expected for Valid Tests:**
   - [ ] Add patient ID tracking across all stages
   - [ ] Create @beforeAll hook to set up test patient
   - [ ] Verify data persists in database
   - [ ] Add RBAC verification tests
   - [ ] Implement state machine validation

3. **MEDIUM - Expected for Production Quality:**
   - [ ] Add error scenario tests
   - [ ] Add audit trail verification
   - [ ] Deepen database assertions
   - [ ] Add business logic validation
   - [ ] Add error recovery tests

4. **LOW - Polish:**
   - [ ] Add performance assertions
   - [ ] Add accessibility checks
   - [ ] Add visual regression
   - [ ] Add screenshot captures

---

## CONCRETE EXAMPLES OF MISSING LOGIC

### Example 1: Patient ID Not Captured
```typescript
// Current (WRONG):
receptionistTest('Register patient', async ({ receptionistPage }) => {
  await receptionistPage.goto('/register');
  await receptionistPage.fill('input[name="name"]', 'John Doe');
  await receptionistPage.click('button[name="submit"]');
  console.log('✓ Patient registered');  // ← No ID captured
});

// Fixed (CORRECT):
test('Register patient then record vitals', async ({ 
  receptionistPage, 
  nursePage,
  context  // ← Share data via context
}) => {
  // Stage 1: Register
  await receptionistPage.goto('/register');
  await receptionistPage.fill('input[name="name"]', 'John Doe');
  await receptionistPage.click('button[name="submit"]');
  
  // ← NEW: Extract patient ID from database
  const patient = await context.fixtureData.db.query(
    `SELECT id FROM patients WHERE first_name = 'John' ORDER BY created_at DESC LIMIT 1`
  );
  const patientId = patient[0].id;
  
  // ← NEW: Verify in database
  expect(patientId).toBeTruthy();
  
  // Stage 2: Record vitals with SAME patient
  await nursePage.goto(`/queue/${patientId}`);
  await nursePage.fill('input[name="systolic"]', '120');
  await nursePage.click('button[name="save"]');
  
  // ← NEW: Verify in database
  const vitals = await context.fixtureData.db.query(
    `SELECT * FROM vitals WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1`,
    [patientId]
  );
  expect(vitals[0].systolic_bp).toBe(120);
});
```

### Example 2: Missing RBAC Test
```typescript
// NEW TEST: Verify access control
test('Nurse cannot approve prescriptions', async ({ 
  phar macistPage, 
  nursePage 
}) => {
  // Setup: Create and approve prescription
  const rx = await setupTestPrescription('approved');
  
  // Attempt: Nurse tries to access approval UI
  await nursePage.goto(`/prescriptions/${rx.id}/approve`);
  
  // NEW: Verify access denied
  await expect(nursePage.locator('text=Access Denied|Unauthorized|403')).toBeVisible();
  
  // NEW: Verify API also blocked
  const apiResult = await nursePage.evaluate(async (rxId) => {
    const res = await fetch(`/api/prescriptions/${rxId}/approve`, {
      method: 'POST'
    });
    return res.status;
  }, rx.id);
  expect(apiResult).toBe(403);
});
```

---

## NEXT STEPS

1. ✅ **Review this document**
2. 🔄 **In progress: Core test fixes**
3. 📋 **Create: Fixed version of patient-flow-complete.spec.ts**
4. 🧪 **Run: Tests with new fixtures**
5. ✏️ **Add: Database verification logic**
6. 🔒 **Add: RBAC validation tests**
7. 📊 **Create: Test execution report**

