# QA & Acceptance Testing Checklist

Use this checklist to define acceptance criteria and test scenarios for your feature before handing off to QA.

## Functional Acceptance Criteria Template

### Basic CRUD Operations

- [ ] **Create**: User can create a new [resource] with all required fields
- [ ] **Read**: User can view [resource] in list and detail views
- [ ] **Update**: User can modify [resource]; changes reflected in real-time
- [ ] **Delete/Archive**: User can delete [resource] or mark as archived (not permanently deleted)
- [ ] **Permissions**: Only authorized roles can perform each action

### Data Validation

- [ ] **Required fields**: Cannot submit form without required fields; clear error message shown
- [ ] **Field formats**: Email, phone, date, currency formats validated
- [ ] **Range checks**: Numeric fields validated (min/max); age, weight, lab values in realistic ranges
- [ ] **Relationships**: Foreign keys validated (e.g., drug exists in formulary, patient exists)
- [ ] **Duplicates**: Unique constraints enforced; user gets helpful error if creating duplicate

### Workflow & State Management

- [ ] **State transitions**: Object can transition only between valid states (e.g., Draft → Signed → Dispensed)
- [ ] **Blocking actions**: Cannot perform action if preconditions not met (e.g., cannot dispense before signed)
- [ ] **Timeouts**: Long-running operations display loading state; timeout after 30s with retry option
- [ ] **Concurrent edits**: If 2 users edit same object, show conflict warning; last edit wins (or require manual merge)

### Notifications & Alerts

- [ ] **Correct recipient**: Notification sent to correct user/role
- [ ] **Correct content**: Message contains all relevant information
- [ ] **Correct channel**: Email/SMS/in-app alert sent via correct channel
- [ ] **Timing**: Notification sent promptly (real-time for critical, <5min for routine)
- [ ] **Deduplication**: User doesn't receive duplicate notifications
- [ ] **User preferences**: User can configure notification preferences (opt-out if allowed)

### Search, Filter, Sort

- [ ] **Search**: Search by key fields works; results ranked by relevance
- [ ] **Filter**: Multiple filters work together (AND logic); results accurate
- [ ] **Sort**: Ascending/descending sort works; sort by multiple columns if applicable
- [ ] **Pagination**: Results paginated; can navigate between pages
- [ ] **Performance**: Search returns results in <500ms for typical dataset

### Error Handling

- [ ] **User-friendly error messages**: No stack traces shown to user; clear explanation of problem
- [ ] **Error recovery**: User can retry failed action or take alternate action
- [ ] **Logging**: Errors logged server-side with full context for debugging
- [ ] **Graceful degradation**: If feature fails, rest of app remains functional

---

## Role-Based Test Scenarios

### Test Scenario Template

**Test Case ID**: TC-[Feature]-[#]  
**Feature**: [Name]  
**Role**: [Doctor / Pharmacist / etc.]  
**Precondition**: [System state before test]  
**Steps**:
1. [Action]
2. [Action]
3. [Action]

**Expected Result**:
- [Assert 1]
- [Assert 2]

**Actual Result**: [Tester fills in]  
**Status**: [Pass / Fail / Blocked]

---

### Example Test Scenarios

#### TC-PRESC-001: Doctor Signs Prescription

**Role**: Doctor  
**Precondition**: 
- Logged in as doctor
- Patient has active encounter
- Prescription drafted (drug, dose, frequency entered)

**Steps**:
1. Click "Sign Prescription" button
2. Review signature preview (name, title, timestamp)
3. Click "Confirm & Sign"
4. Wait for confirmation message

**Expected**:
- ✓ Prescription marked "Signed" in system
- ✓ Timestamp recorded (accurate to user's timezone)
- ✓ Pharmacist receives notification<br/>- ✓ Patient sees updated prescription status
- ✓ Audit log records: [doctor_id, "signed", timestamp, signature_hash]

---

#### TC-PRESC-002: Pharmacist Rejects Prescription (No Inventory)

**Role**: Pharmacist  
**Precondition**:
- Logged in as pharmacist
- Prescription signed by doctor; status "Pending Dispense"
- Requested drug not in inventory

**Steps**:
1. Click prescription in queue
2. Review prescription details
3. Click "Reject" button
4. Select reason: "No Inventory"
5. Click "Confirm"

**Expected**:
- ✓ Prescription status → "Rejected"
- ✓ Doctor receives notification: "Prescription for [Patient] rejected: No Inventory"
- ✓ Patient receives notification: "Your prescription is delayed; your doctor will contact you"
- ✓ Audit log records: [pharmacist_id, "rejected", reason, timestamp]
- ✓ Doctor can modify prescription (change dose, drug) and re-sign

---

#### TC-PRESC-003: Permission Denied (Pharmacist Tries to Sign)

**Role**: Pharmacist (improper role)  
**Precondition**:
- Logged in as pharmacist
- Unsigned prescription visible in UI

**Steps**:
1. Click "Sign Prescription" button
2. Observe behavior

**Expected**:
- ✓ Button is disabled (grayed out)
- ✓ OR error message: "Only doctors can sign prescriptions"
- ✓ No action taken; prescription remains unsigned
- ✓ Audit log does NOT record attempted sign

---

### Cross-Role Integration Test

**Test**: Prescription flow end-to-end  
**Roles**: Doctor → Pharmacist → Patient

| Step | Actor | Action | Expected Outcome |
|------|-------|--------|------------------|
| 1 | Doctor | Create prescription | Draft saved |
| 2 | Doctor | Sign prescription | Signed; pharmacist notified |
| 3 | Pharmacist | View prescription | Prescription visible in queue |
| 4 | Pharmacist | Scan lot number | Dispensed; patient notified |
| 5 | Patient | Check patient portal | Prescription marked "Ready" |

---

## Performance Acceptance Criteria

| Scenario | Target | Acceptable Range |
|----------|--------|------------------|
| Page load (dashboard) | <2s | <3s |
| Search results | <500ms | <1s |
| Create prescription | <1s | <2s |
| Sign prescription | <2s | <3s |
| Notification sent | Real-time | <10s |
| Report generation (1000 records) | <5s | <10s |

---

## Security & Compliance Test Scenarios

### Authentication & Authorization

- [ ] **Session timeout**: User automatically logged out after 30 min inactivity
- [ ] **Role enforcement**: Doctor cannot access pharmacy inventory; pharmacist cannot approve lab results
- [ ] **PhI access**: User can only access patient data for their assigned patients/departments
- [ ] **Audit enforcement**: All actions logged; cannot modify own audit trail

### Data Protection

- [ ] **Encryption**: Patient data encrypted before storage; visible plain-text only in authenticated session
- [ ] **No hardcoded secrets**: API keys, DB passwords not in code; loaded from environment
- [ ] **Input sanitization**: Malicious input (SQL injection, XSS) rejected or encoded
- [ ] **Error safety**: Error messages sanitized; no PHI or internal paths leaked

### Compliance

- [ ] **Audit trail immutable**: Signed prescriptions cannot be modified post-hoc
- [ ] **Retention**: Records kept for required period (7 years for prescriptions)
- [ ] **Consent**: Patient consent documented for sensitive procedures
- [ ] **HIPAA compliance**: Change log captured; approved by Compliance team

---

## Mobile/Responsive Design

- [ ] **Mobile UI**: App responsive on phone (320px width)
- [ ] **Touch targets**: Buttons ≥44px for easy tapping
- [ ] **Orientation**: App works in portrait & landscape
- [ ] **Readability**: Font size ≥14px; sufficient contrast

---

## Accessibility (WCAG 2.1 AA)

- [ ] **Keyboard navigation**: All functions accessible via keyboard (no mouse required)
- [ ] **Screen reader**: Page readable by screen reader with proper ARIA labels
- [ ] **Color contrast**: Text contrast ≥4.5:1 for normal text, ≥3:1 for large text
- [ ] **Form labels**: All inputs have associated labels
- [ ] **Error messages**: Error messages linked to form fields with clear guidance

---

## Test Execution Template

**Test Date**: [Date]  
**Tester**: [Name]  
**Build Version**: [Version]  
**Browser/Device**: [Chrome 125, Safari iOS, etc.]

| Test Case ID | Feature | Result | Notes | Bug ID |
|---|---|---|---|---|
| TC-PRESC-001 | Doctor signs | ✓ PASS | Worked as expected | — |
| TC-PRESC-002 | Pharmacist rejects | ✓ PASS | Rejection reason captured | — |
| TC-PRESC-003 | Permission denied | ❌ FAIL | Button should be disabled but visible | BUG-1234 |

**Summary**: 2/3 passed. 1 bug found; blocked feature from release.

---

## Regression Test Scenarios (Run After Every Deploy)

- [ ] Existing prescriptions still load correctly
- [ ] Existing users can still log in
- [ ] Basic CRUD operations work (create, read, update, delete)
- [ ] Notifications still sent
- [ ] No 500 errors in logs
- [ ] Performance unchanged (load time <2s)

**Run time**: <30 minutes (automated tests + spot checks)

---

**Sign-Off**: QA Lead approval required before release to production.
