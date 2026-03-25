---
name: hims-e2e-testing-complete
description: Complete end-to-end testing workflow for CareSync HIMS - from test planning through execution, bug discovery, fix implementation, and validation across all roles and workflows.
tools: ["*"]
applyTo: ["**/*.ts", "**/*.js", "docs/**/*.md", "tests/**/*"]
---

# HIMS Complete End-to-End Testing Skill

## Overview

This skill orchestrates the **complete lifecycle** of finding, diagnosing, and fixing bugs in CareSync HIMS:
1. **Discover** — Identify test scenarios across roles and workflows
2. **Execute** — Run automated Playwright tests with proper fixtures
3. **Analyze** — Triage failures and extract root cause
4. **Reproduce** — Create minimal repro cases
5. **Fix** — Implement code changes (RLS, validation, state machine, auth)
6. **Validate** — Verify fixes work cross-role and don't regress
7. **Report** — Document bugs, fixes, and coverage

---

## Phase 1: Test Planning & Discovery

### Step 1.1: Map the Workflow
Identify the clinical or administrative workflow to test:
- **User Journey** — Authentication → Role Assignment → Feature Access → Workflow Completion
- **Key Roles** — Who participates? (Doctor, Nurse, Pharmacist, Lab Tech, Receptionist, Billing, Admin)
- **State Transitions** — What states must the resource pass through? (Draft → Pending → Approved → Completed)
- **Integration Points** — Which APIs/RLS policies are involved?

### Step 1.2: Design Test Scenarios

Create test matrix covering:

| Scenario | Role 1 | Role 2 | Role 3 | Expected | Bug Risk |
|----------|--------|--------|--------|----------|----------|
| Happy path (authorized) | ✓ | ✗ | ✗ | Success | Low |
| RBAC bypass attempt | ✗ | ✗ | ✗ | Blocked | **HIGH** |
| State violation | ✓ | ✓ | ✓ | Fails | **HIGH** |
| Concurrent edit | ✓ | ✓ | - | Conflict detected | **HIGH** |
| Network failure | ✓ | ✓ | ✓ | Graceful recovery | Medium |
| Form validation | ✓ | ✓ | ✓ | Invalid data rejected | Medium |
| Audit logging | ✓ | ✓ | ✓ | All actions logged | High |

### Step 1.3: Write Test Scenario Description

```markdown
## Test: Patient Prescription Approval Workflow (RBAC + State Machine)

**Workflow:** Doctor creates Rx → Pharmacist approves → Nurse dispenses

**Roles:**
- doctor: Create, view own Rx
- pharmacist: Approve, reject, view all Rx
- nurse: Dispense approved Rx only
- receptionist: Cannot access

**Test Case 1: Happy Path (Doctor creates, Pharmacist approves)**
- Precondition: Doctor & Pharmacist logged in
- Steps:
  1. Doctor creates prescription for patient (penicillin 500mg)
  2. Prescription state = "draft"
  3. Pharmacist views medication queue
  4. Pharmacist approves prescription
  5. Prescription state = "approved"
  6. Nurse can now dispense
- Expected: All state transitions logged, audit trail complete
- Bug Risk: High (RBAC + state machine)

**Test Case 2: RBAC Violation - Receptionist cannot approve**
- Precondition: Prescription in "draft", Receptionist logged in
- Steps:
  1. Receptionist tries to access pharmacist approval panel
  2. Receptionist tries to approve prescription via direct API
- Expected: Both blocked, error surfaces, audit logged
- Bug Risk: **CRITICAL** if allowed

**Test Case 3: State Machine Violation - Cannot dispense before approval**
- Precondition: Prescription in "draft" state
- Steps:
  1. Nurse tries to dispense unapproved prescription
  2. Check database: dispensed_at should be null
- Expected: Dispensing blocked, error message surfaces
- Bug Risk: High (data integrity)
```

---

## Phase 2: Test Execution

### Step 2.1: Prepare Test Environment

```bash
# Start dev server with E2E mode
npm run dev

# In separate terminal, run tests
npm run test:e2e

# Or test specific role workflows
npm run test:e2e -- --project=doctor --project=pharmacist

# Or test a specific file
npx playwright test tests/e2e/t91-prescription-to-dispense.spec.ts
```

### Step 2.2: Structure Playwright Test

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth.fixture';
import { createTestPatient, createTestPrescription } from '../fixtures/testdata.fixture';

test.describe('Prescription Approval Workflow (RBAC + State)', () => {
  
  // TEST 1: Happy path - Doctor creates, Pharmacist approves
  test('Doctor creates Rx → Pharmacist approves → Nurse dispenses', async ({ browser }) => {
    const doctorPage = await browser.newPage();
    const pharmacistPage = await browser.newPage();
    const nursePage = await browser.newPage();

    try {
      // Setup: Create test patient
      const patient = await createTestPatient({ name: 'John Doe', age: 45 });

      // Actor 1: Doctor creates prescription
      await loginAs(doctorPage, 'doctor');
      await doctorPage.goto('/patients');
      await doctorPage.fill('text=Search patients', patient.uhid);
      await doctorPage.click(`text=${patient.name}`);
      await doctorPage.click('button:has-text("Add Prescription")');
      await doctorPage.fill('input[name="medication"]', 'Penicillin');
      await doctorPage.fill('input[name="dosage"]', '500mg');
      await doctorPage.fill('input[name="frequency"]', 'TID');
      await doctorPage.click('button:has-text("Create")');
      
      const rxId = await doctorPage.evaluate(() => 
        new URL(window.location.href).pathname.split('/').pop()
      );
      console.log(`✓ Doctor created prescription: ${rxId}`);

      // Verify state in DB
      const doctorRxState = await doctorPage.evaluate(async () => {
        const res = await fetch(`/api/prescriptions/${rxId}`);
        return (await res.json()).state; // Should be "draft"
      });
      expect(doctorRxState).toBe('draft');

      // Actor 2: Pharmacist approves
      await loginAs(pharmacistPage, 'pharmacist');
      await pharmacistPage.goto('/pharmacy/queue');
      await pharmacistPage.click(`text=${rxId}`);
      await pharmacistPage.click('button:has-text("Approve")');
      await pharmacistPage.waitForSelector('text=Approval successful');
      console.log(`✓ Pharmacist approved prescription`);

      // Verify state changed
      const approvedState = await pharmacistPage.evaluate(async () => {
        const res = await fetch(`/api/prescriptions/${rxId}`);
        return (await res.json()).state; // Should be "approved"
      });
      expect(approvedState).toBe('approved');

      // Actor 3: Nurse dispenses
      await loginAs(nursePage, 'nurse');
      await nursePage.goto('/dispense');
      await nursePage.click(`text=${rxId}`);
      await nursePage.fill('textarea[name="dispenseNotes"]', 'Dispensed to patient');
      await nursePage.click('button:has-text("Dispense")');
      await nursePage.waitForSelector('text=Medication dispensed');
      console.log(`✓ Nurse dispensed prescription`);

      // Verify final state
      const dispensedState = await nursePage.evaluate(async () => {
        const res = await fetch(`/api/prescriptions/${rxId}`);
        const data = await res.json();
        return { state: data.state, dispensedAt: data.dispensed_at };
      });
      expect(dispensedState.state).toBe('dispensed');
      expect(dispensedState.dispensedAt).toBeTruthy();

      // Verify audit trail
      const auditLog = await nursePage.evaluate(async () => {
        const res = await fetch(`/api/audit-logs?resource_id=${rxId}`);
        return (await res.json()).records;
      });
      expect(auditLog.length).toBeGreaterThanOrEqual(3); // create, approve, dispense
      expect(auditLog.some(r => r.action === 'created' && r.actor_role === 'doctor')).toBeTruthy();
      expect(auditLog.some(r => r.action === 'approved' && r.actor_role === 'pharmacist')).toBeTruthy();
      expect(auditLog.some(r => r.action === 'dispensed' && r.actor_role === 'nurse')).toBeTruthy();
      console.log(`✓ Audit trail verified: ${auditLog.length} entries`);

    } finally {
      await doctorPage.close();
      await pharmacistPage.close();
      await nursePage.close();
    }
  });

  // TEST 2: RBAC violation - Receptionist cannot approve
  test('RBAC: Receptionist cannot approve prescription (security)', async ({ browser }) => {
    const receptionist = await browser.newPage();
    
    try {
      await loginAs(receptionist, 'receptionist');
      
      // Attempt 1: UI access blocked
      await receptionist.goto('/pharmacy/queue');
      await expect(receptionist.locator('text=Access Denied')).toBeVisible();
      
      // Attempt 2: Direct API bypass
      const apiResult = await receptionist.evaluate(async () => {
        try {
          const res = await fetch('/api/prescriptions/rx_123/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          });
          return { status: res.status, ok: res.ok };
        } catch (e) {
          return { error: e.message };
        }
      });
      
      expect(apiResult.status).toBe(403); // Forbidden
      console.log(`✓ Receptionist API access blocked with 403`);
      
      // Verify no audit entry for receptionist approval attempt
      const auditAttempt = await receptionist.evaluate(async () => {
        const res = await fetch('/api/audit-logs?action=approved&role=receptionist');
        return (await res.json()).records;
      });
      expect(auditAttempt.length).toBe(0);
      console.log(`✓ No unauthorized audit entries created`);
      
    } finally {
      await receptionist.close();
    }
  });

  // TEST 3: State machine - Cannot dispense before approval
  test('State Machine: Cannot dispense unapproved prescription', async ({ browser }) => {
    const nursePage = await browser.newPage();
    
    try {
      const patient = await createTestPatient({ name: 'Jane Doe', age: 35 });
      const rx = await createTestPrescription(patient.id, {
        medication: 'Aspirin',
        dosage: '100mg',
        state: 'draft', // NOT yet approved
      });

      await loginAs(nursePage, 'nurse');
      await nursePage.goto(`/dispense/${rx.id}`);
      
      // Try to dispense without approval
      const result = await nursePage.evaluate(async () => {
        try {
          const res = await fetch(`/api/prescriptions/${rx.id}/dispense`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          return { status: res.status, ok: res.ok };
        } catch (e) {
          return { error: e.message };
        }
      });

      expect(result.status).toBe(400); // Bad request or 403 Forbidden
      console.log(`✓ Dispense blocked on unapproved prescription`);

      // Verify state unchanged in DB
      const stillDraft = await nursePage.evaluate(async () => {
        const res = await fetch(`/api/prescriptions/${rx.id}`);
        return (await res.json()).state;
      });
      expect(stillDraft).toBe('draft');
      
    } finally {
      await nursePage.close();
    }
  });

  // TEST 4: Concurrent edits - Race condition
  test('Concurrency: Two pharmacists cannot both approve same prescription', async ({ browser }) => {
    const pharm1 = await browser.newPage();
    const pharm2 = await browser.newPage();

    try {
      const patient = await createTestPatient({ name: 'Race Test Patient', age: 50 });
      const rx = await createTestPrescription(patient.id, { state: 'draft' });

      await loginAs(pharm1, 'pharmacist');
      await loginAs(pharm2, 'pharmacist');

      // Both attempt approval concurrently
      const [result1, result2] = await Promise.all([
        pharm1.evaluate(async () => {
          const res = await fetch(`/api/prescriptions/${rx.id}/approve`, { method: 'POST' });
          return { status: res.status, data: await res.json() };
        }),
        pharm2.evaluate(async () => {
          const res = await fetch(`/api/prescriptions/${rx.id}/approve`, { method: 'POST' });
          return { status: res.status, data: await res.json() };
        }),
      ]);

      // One should succeed (200/201), other should fail (409 Conflict or 400)
      const succeeded = result1.status === 200 || result2.status === 200;
      const failed = result1.status >= 400 || result2.status >= 400;
      expect(succeeded && failed).toBeTruthy();
      console.log(`✓ Race condition handled: one succeeded, one failed`);

    } finally {
      await pharm1.close();
      await pharm2.close();
    }
  });
});
```

### Step 2.3: Run Tests & Collect Results

```bash
# Run full test suite with detailed reporting
npx playwright test tests/e2e/t91-prescription-to-dispense.spec.ts --reporter=list,html

# Open the HTML report
npx playwright show-report

# Run with debugging
npx playwright test --debug

# Run headless but keep browser open on failure
npx playwright test --headed --workers=1
```

---

## Phase 3: Failure Analysis & Bug Triage

### Step 3.1: Analyze Failure Output

When tests fail, examine:

```
✗ Doctor creates Rx → Pharmacist approves → Nurse dispenses
  Error: expect(receivedState).toBe('approved')
    Received: "draft"
    Expected: "approved"
  
  At: pharmacist/approval endpoint (POST /api/prescriptions/rx_123/approve)
  Status: 200 (but state not updated!)
```

**Root Cause Analysis:**

| Failure Pattern | Likely Root Cause | Check |
|-----------------|-------------------|-------|
| State not updating | API success (200) but DB not updated | DB transaction, trigger, RLS policy |
| 403 Forbidden error | RLS policy denying role | Supabase RLS policy, role check |
| 500 Server error | Unhandled exception | Server logs, API error handler |
| Timeout/hangs | Infinite loop, deadlock | Browser console, DB locks |
| UI not updating | Frontend not refetching | React Query cache invalidation |

### Step 3.2: Extract Root Cause

For each failure, test the hypothesis:

```typescript
// Hypothesis 1: RLS policy is blocking the pharmacist role
async function testRLSPolicy() {
  const res = await fetch('/api/prescriptions/rx_123', {
    headers: { 'Authorization': `Bearer ${ pharmacistToken}` }
  });
  console.log('Pharmacist access:', res.status); // Should be 200, not 403
}

// Hypothesis 2: Database state not changing despite 200 response
async function testDatabaseState() {
  const before = await query('SELECT state FROM prescriptions WHERE id=$1', ['rx_123']);
  console.log('Before approval:', before); // draft

  await fetch('/api/prescriptions/rx_123/approve', { method: 'POST' });

  const after = await query('SELECT state FROM prescriptions WHERE id=$1', ['rx_123']);
  console.log('After approval:', after); // Should be approved, not draft!
}

// Hypothesis 3: API mutation missing permission check
async function testAPIPermission() {
  // Receptionist tries API directly
  const res = await fetch('/api/prescriptions/rx_123/approve', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${receptionist Token}` }
  });
  console.log('Receptionist approval:', res.status); // Should be 403, not 200!
}
```

### Step 3.3: Create Bug Report

```markdown
## Bug Report Template

**Title:** Pharmacist cannot approve prescription (status 200 but state unchanged)

**Severity:** HIGH (workflow blocks)

**Affected Roles:** Pharmacist, Doctor, Nurse

**Reproduction Steps:**
1. Login as Doctor
2. Create prescription for patient (Penicillin 500mg)
3. Verify state = "draft" (✓ works)
4. Login as Pharmacist
5. Navigate to /pharmacy/queue
6. Click prescription
7. Click "Approve" button
8. Status code: 200 OK
9. Expected: state = "approved"
10. Actual: state = "draft" (still unchanged!)

**Expected Behavior:**
- Pharmacist approval endpoint (/api/prescriptions/{id}/approve) should:
  1. Verify request authenticated as pharmacist
  2. Check RLS: pharmacist can write this prescription
  3. Execute SQL: UPDATE prescriptions SET state='approved', approved_by=user_id, approved_at=now() WHERE id=$1
  4. Return 200 with updated state
  5. Frontend refetch list to show approved status
  6. Audit log: INSERT INTO audit_logs (action, actor_role, resource_id) VALUES ('approved', 'pharmacist', id)

**Actual Behavior:**
- API returns 200 (success signal)
- Database state remains "draft"
- No audit log entry created
- Frontend state unchanged
- Next actor (nurse) cannot dispense because backend state still "draft"

**Root Cause Hypothesis:**
- API handler returns success without executing UPDATE query
- OR UPDATE executed but RLS policy reverted changes
- OR Transaction rolled back silently
- OR Frontend not refetching correct data

**Files to Review:**
- Backend: `src/api/endpoints/prescriptions.ts` (POST /approve handler)
- Database: RLS policies on `prescriptions` table for pharmacist role
- Frontend: React Query cache invalidation after approval
- Migrations: Any triggers on prescriptions table that might block update

**Impact:**
- Users blocked from completing prescription workflow
- Clinical workflow stalled
- Patients cannot receive medications
- Data integrity at risk (audit trail incomplete)

**Security Impact:**
- If API mutation missing permission check, receptionist could approve prescriptions
- If RLS bypassed, unauthorized access possible
```

---

## Phase 4: Bug Reproduction & Verification

### Step 4.1: Isolate the Issue

Run targeted diagnostics:

```typescript
test('Diagnosis: Where does approval fail?', async ({ page }) => {
  const rxId = 'rx_123'; // Use real prescription
  
  // Step 1: Can we READ the prescription?
  const readRes = await page.evaluate(async (id) => {
    const res = await fetch(`/api/prescriptions/${id}`);
    return { status: res.status, data: await res.json() };
  }, rxId);
  console.log('READ /api/prescriptions/{id}:', readRes.status, readRes.data);
  // Expected: 200, { id, state: 'draft', ... }

  // Step 2: Can we CALL the approve endpoint?
  const callRes = await page.evaluate(async (id) => {
    const res = await fetch(`/api/prescriptions/${id}/approve`, { method: 'POST' });
    return { status: res.status, data: await res.json() };
  }, rxId);
  console.log('POST /api/prescriptions/{id}/approve:', callRes.status, callRes.data);
  // Expected: 200, { id, state: 'approved', ... }

  // Step 3: Did the database actually update?
  const dbRes = await page.evaluate(async (id) => {
    const res = await fetch(`/api/prescriptions/${id}`);
    return (await res.json()).state;
  }, rxId);
  console.log('Database state after approval:', dbRes);
  // Expected: 'approved', Actual: 'draft'?

  // Step 4: Is the RLS policy blocking writes?
  const rlsRes = await page.evaluate(async (id) => {
    const res = await fetch(`/api/debug/rls-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'prescriptions',
        action: 'update',
        resource_id: id,
      }),
    });
    return await res.json();
  }, rxId);
  console.log('RLS policy allows update?', rlsRes);
});
```

### Step 4.2: Verify Bug Consistently Reproduces

Run the test 3-5 times to confirm:
- Is it deterministic (always fails)?
- Is it random (intermittent)?
- Is it timing dependent (slow network)?

```bash
# Run same test 5 times
for i in {1..5}; do
  echo "=== Run $i ==="
  npx playwright test tests/e2e/t91-prescription-to-dispense.spec.ts --grep "Pharmacist approves" --workers=1
done
```

---

## Phase 5: Fix Implementation

### Step 5.1: Identify Fix Location

Based on diagnosis, fix in the right place:

| Root Cause | Fix Location | File |
|------------|--------------|------|
| Missing API permission check | Backend mutation handler | `src/api/endpoints/prescriptions.ts` |
| RLS policy denies role | Supabase RLS policy | `supabase/policies/prescriptions.sql` |
| Missing frontend refetch | React Query cache | `src/hooks/usePrescriptions.ts` |
| State machine not enforced | API validation | `src/api/validators/prescription-state.ts` |
| Missing audit log | API handler | `src/api/endpoints/prescriptions.ts` |
| Database trigger broken | Migration | `supabase/migrations/*/add_prescription_state_trigger.sql` |

### Step 5.2: Implement the Fix

**Example: Fix missing permission check in API**

```typescript
// File: src/api/endpoints/prescriptions.ts

// BEFORE (buggy):
export async function approvePrescription(req: AuthRequest, res: Response) {
  const { id } = req.params;
  
  // ❌ BUG: No permission check!
  const result = await db.query(
    'UPDATE prescriptions SET state=$1, approved_by=$2, approved_at=NOW() WHERE id=$3',
    ['approved', req.user.id, id]
  );
  
  res.json({ success: true });
}

// AFTER (fixed):
export async function approvePrescription(req: AuthRequest, res: Response) {
  const { id } = req.params;
  
  // ✓ FIX 1: Check authenticated
  if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
  
  // ✓ FIX 2: Check role has permission
  if (!['pharmacist', 'doctor'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permission' });
  }
  
  // ✓ FIX 3: Check hospital scoped access
  const prescription = await db.query(
    'SELECT hospital_id FROM prescriptions WHERE id=$1',
    [id]
  );
  if (prescription[0].hospital_id !== req.user.hospital_id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // ✓ FIX 4: Check current state (state machine)
  if (prescription[0].state !== 'draft') {
    return res.status(400).json({ 
      error: `Cannot approve prescription in state: ${prescription[0].state}` 
    });
  }
  
  // ✓ FIX 5: Verify audit and transaction
  const client = await db.getClient();
  try {
    await client.query('BEGIN TRANSACTION');
    
    const result = await client.query(
      'UPDATE prescriptions SET state=$1, approved_by=$2, approved_at=NOW() WHERE id=$3 RETURNING *',
      ['approved', req.user.id, id]
    );
    
    // ✓ FIX 6: Create audit entry
    await client.query(
      'INSERT INTO audit_logs (action, actor_id, actor_role, resource_id, hospital_id, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
      ['approved', req.user.id, req.user.role, id, req.user.hospital_id, JSON.stringify({ medication: result[0].medication })]
    );
    
    await client.query('COMMIT');
    res.json({ success: true, data: result[0] });
    
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Approval failed' });
  }
}
```

### Step 5.3: Verify Fix in Code Review

Checklist before committing:

- [ ] Permission check added (user role, hospital scope)
- [ ] State machine validated (correct state before transition)
- [ ] RLS policy reviewed in Supabase
- [ ] Audit entry created for action
- [ ] Transaction used for multi-step mutations
- [ ] Error message is user-friendly (no stack traces)
- [ ] Frontend cache invalidation added
- [ ] Backward compatible (no breaking changes)

---

## Phase 6: Validation & Regression Testing

### Step 6.1: Test the Fix (Targeted)

```bash
# Test just the fixed workflow
npx playwright test tests/e2e/t91-prescription-to-dispense.spec.ts --grep "Pharmacist approves" --workers=1
```

Expected: ✓ All tests pass

### Step 6.2: Test Cross-Role Impact

```typescript
test('After fix: Verify all roles still work correctly', async ({ browser }) => {
  // Doctor can create
  // Pharmacist can approve
  // Nurse can dispense
  // Receptionist still cannot approve (regression check)
  // Lab tech cannot access (regression check)
});
```

### Step 6.3: Full Regression Suite

```bash
# Run all prescription-related tests to ensure no regressions
npx playwright test --grep "prescription" --workers=4

# Run all role-based access tests
npx playwright test --grep "RBAC|access" --workers=4

# Run full suite
npm run test:e2e
```

### Step 6.4: Database Query Verification

```sql
-- Verify fix: Check that approved prescriptions have all required fields
SELECT 
  id, 
  state, 
  approved_by, 
  approved_at,
  (SELECT COUNT(*) FROM audit_logs WHERE resource_id = prescriptions.id AND action='approved') as audit_entries
FROM prescriptions
WHERE state = 'approved'
LIMIT 10;

-- Expected: All rows have approved_by and approved_at filled, audit_entries >= 1

-- Verify RBAC: Check pharmacist can see prescriptions
SELECT * FROM prescriptions
WHERE hospital_id = 'hosp_123'
  AND state = 'draft'
LIMIT 5;

-- Check RLS policy enforces hospital scope
-- (Query should fail if using wrong hospital_id in WHERE clause)

-- Verify audit logged correctly
SELECT action, actor_role, resource_id, created_at FROM audit_logs
WHERE resource_id LIKE 'rx_%'
  AND action IN ('created', 'approved', 'dispensed')
ORDER BY created_at DESC
LIMIT 20;
```

---

## Phase 7: Documentation & Reporting

### Step 7.1: Update Test Coverage Report

Create file: `docs/TEST_COVERAGE_REPORT_PHASE_[X].md`

```markdown
# E2E Test Coverage Report — [Date]

## Summary
- Total test files: 25
- Total tests: 156
- Coverage: 89% (workflows, RBAC, state machine)
- Bugs found & fixed: 7
- Regressions: 0

## Workflows Tested (Passing)
- ✓ Patient Registration (doctor, receptionist)
- ✓ Prescription Workflow (doctor, pharmacist, nurse)
- ✓ Lab Order to Result (doctor, lab tech)
- ✓ Appointment Scheduling (receptionist, doctor, patient)
- ✓ Billing Cycle (billing, doctor, receptionist)
- ✓ Discharge Planning (doctor, nurse)

## RBAC Enforced
- ✓ Doctor cannot access pharmacy
- ✓ Pharmacist cannot dispense (only approve)
- ✓ Nurse cannot create prescriptions
- ✓ Receptionist cannot approve orders
- ✓ All unauthorized API calls blocked (403)

## State Machines Validated
- ✓ Prescription: draft → approved → dispensed → archived
- ✓ Lab Order: pending → collected → processed → reported
- ✓ Appointment: scheduled → confirmed → completed → reviewed
- ✓ No state transitions backwards (idempotency)
- ✓ Concurrent updates handled (optimistic locking or merge)

## Bugs Found & Fixed
| # | Title | Severity | Root Cause | Fix | Verified |
|---|-------|----------|-----------|-----|----------|
| 1 | Pharmacist approval state not updating | HIGH | Missing UPDATE query execution | Execute transaction | ✓ |
| 2 | Receptionist can bypass RBAC | CRITICAL | Missing permission check | Add role validation | ✓ |
| 3 | Audit trail incomplete | HIGH | Missing INSERT into audit_logs | Add audit after update | ✓ |

## Regressions: None

## Next Steps
- [ ] Deploy to staging
- [ ] Run performance tests
- [ ] Run accessibility tests
- [ ] Go-live
```

### Step 7.2: Document Known Limitations

```markdown
## Known Limitations & Deferred Bugs

### Medium Priority
- [ ] Lab result upload via file is slow (>5s for PDFs)
  - Workaround: Use direct admin upload
  - Planned fix: Migrate to chunked upload

- [ ] Concurrent appointment bookings race condition
  - Impact: Rarely happens, users can retry
  - Fix in: Phase 6C

### Low Priority
- [ ] Font loading flickers on first load
- [ ] Mobile responsiveness on iPad Mini
```

### Step 7.3: Update README with Test Instructions

```markdown
## Running Tests

### All Tests
\`\`\`bash
npm run test:e2e
\`\`\`

### By Workflow
\`\`\`bash
npx playwright test --grep "prescription"
npx playwright test --grep "appointment"
npx playwright test --grep "lab"
\`\`\`

### By Role
\`\`\`bash
npm run test:e2e -- --project=doctor
npm run test:e2e -- --project=pharmacist --project=nurse
\`\`\`

### Debug Mode
\`\`\`bash
npx playwright test --debug --headed
\`\`\`

### View Report
\`\`\`bash
npx playwright show-report
\`\`\`
```

---

## Phase 8: Continuous Integration

### Step 8.1: Pre-Merge Gate

Add to CI/CD pipeline (GitHub Actions, GitLab CI):

```yaml
# .github/workflows/test-before-merge.yml
name: E2E Tests (Pre-Merge)

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start app & database
        run: |
          npm run dev &
          npx wait-on http://localhost:8080
      
      - name: Run RBAC tests
        run: npx playwright test --grep "RBAC|access"
      
      - name: Run workflow tests
        run: npx playwright test --grep "prescription|appointment|lab"
      
      - name: Run state machine tests
        run: npx playwright test --grep "state"
      
      - name: Upload report
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Step 8.2: Full Regression (Nightly)

```yaml
# .github/workflows/full-regression-nightly.yml
name: Full E2E Regression (Nightly)

on:
  schedule:
    - cron: '0 2 * * *' # 2 AM UTC daily

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      
      - name: Run all E2E tests
        run: npm run test:e2e
      
      - name: Report results
        run: |
          echo "E2E tests completed at $(date)"
          npx playwright show-report
```

---

## Quick Reference: Common Test Patterns

### Pattern 1: Multi-Role Workflow
```typescript
test('Complete workflow across roles', async ({ browser }) => {
  const pages = {
    doctor: await browser.newPage(),
    pharmacist: await browser.newPage(),
    nurse: await browser.newPage(),
  };
  
  // Actor 1
  await loginAs(pages.doctor, 'doctor');
  // ... action 1
  
  // Actor 2
  await loginAs(pages.pharmacist, 'pharmacist');
  // ... action 2
  
  // Cleanup
  Object.values(pages).forEach(p => p.close());
});
```

### Pattern 2: RBAC Violation Check
```typescript
test('Role cannot access resource', async ({ page }) => {
  await loginAs(page, 'unauthorized_role');
  
  // Try UI
  await page.goto('/restricted-page');
  await expect(page.locator('text=Access Denied')).toBeVisible();
  
  // Try API
  const res = await page.evaluate(async () => {
    const r = await fetch('/api/restricted');
    return r.status;
  });
  expect(res).toBe(403);
});
```

### Pattern 3: State Machine Validation
```typescript
test('Cannot skip states in workflow', async ({ page }) => {
  const resource = await createTestResource({ state: 'draft' });
  
  // Try to jump to final state
  const result = await page.evaluate(async (id) => {
    const res = await fetch(`/api/resource/${id}/finalize`, {
      method: 'POST',
    });
    return res.status;
  }, resource.id);
  
  expect(result).toBe(400); // Bad request
  expect(resource.state).toBe('draft'); // Unchanged
});
```

### Pattern 4: Concurrent Action Handling
```typescript
test('Handle concurrent updates correctly', async ({ browser }) => {
  const[res1, res2] = await Promise.all([
    actor1.updateResource(id),
    actor2.updateResource(id),
  ]);
  
  expect(res1.ok || res2.ok).toBeTruthy(); // One should succeed
  expect(res1.ok && res2.ok).toBeFalsy(); // Not both
});
```

---

## Success Criteria Checklist

- [ ] All test files execute without timeout
- [ ] No flaky tests (100% consistency)
- [ ] All RBAC scenarios pass (no unauthorized access)
- [ ] All state machines validate correctly
- [ ] Audit trail complete for all actions
- [ ] Forms reject invalid clinical data
- [ ] Network failures gracefully recovered
- [ ] Concurrent operations handled safely
- [ ] Error messages user-friendly
- [ ] Frontend cache invalidation working
- [ ] HTML report clean and readable
- [ ] Logs don't leak PHI or secrets
- [ ] Coverage >85% of critical paths
- [ ] CI/CD pipeline runs successfully
- [ ] Documentation updated
- [ ] Team trained on running tests

---

## Emergency Debugging

When tests fail mysteriously:

```bash
# 1. Enable debug output
DEBUG=pw:api npx playwright test --headed

# 2. Pause on failure
npx playwright test --debug

# 3. Check browser console
# Press Shift+F12 in browser, check Console tab

# 4. Export test videos
npx playwright test --output=test-results

# 5. Check server logs
npm run dev 2>&1 | tee app.log

# 6. Query database directly
psql postgresql://user:pass@localhost/caredb
SELECT * FROM audit_logs LIMIT 5;

# 7. Check RLS policy
SELECT * FROM pg_policies WHERE tablename = 'prescriptions';

# 8. Network inspector
npx playwright test --record-video=retain-on-failure
```

