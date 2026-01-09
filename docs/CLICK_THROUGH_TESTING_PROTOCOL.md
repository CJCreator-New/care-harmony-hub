# Systematic Click-Through Testing Protocol

## Overview
This document provides a step-by-step testing protocol to validate KPI consistency, dashboard data binding, and end-to-end workflow integrity in the Care Harmony Hub system.

---

## Pre-Test Setup

### Environment Preparation
```bash
# 1. Start the application
npm run dev

# 2. Clear browser cache and localStorage
# 3. Open browser developer tools (Network and Console tabs)
# 4. Navigate to http://localhost:5173
```

### Initial State Verification
- [ ] Confirm "Test Mode: Administrator" is visible in header
- [ ] Note initial KPI values for comparison:
  - Total Patients: ___
  - Today's Appointments: ___
  - Active Staff: ___
  - Monthly Revenue: ___
  - Queue Waiting: ___

---

## Test Protocol 1: Patient Management Flow

### Step 1: Patient Registration
**Action:** Dashboard → Patients → Register New Patient
1. Click "Patients" in sidebar
2. Click "+ Register Patient" button
3. Fill out patient form:
   ```
   First Name: John
   Last Name: TestPatient
   Date of Birth: 1985-06-15
   Gender: Male
   Phone: +1234567890
   Email: john.test@example.com
   ```
4. Click "Register Patient"

**Expected Results:**
- [ ] Success message appears
- [ ] Patient appears in patient list
- [ ] Return to Dashboard
- [ ] **KPI Check:** Total Patients incremented by 1
- [ ] **KPI Check:** "+X this month" updated
- [ ] **Activity Check:** Recent Activity shows "Patient registered"

**If KPIs don't update:** 
- Check browser console for errors
- Verify network requests completed successfully
- Note: Dashboard data binding issue confirmed

### Step 2: Patient Deactivation Test
**Action:** Deactivate the newly created patient
1. Go to Patients page
2. Find John TestPatient
3. Click edit/manage button
4. Set status to "Inactive"
5. Save changes

**Expected Results:**
- [ ] Patient status updated
- [ ] Return to Dashboard
- [ ] **KPI Check:** Total Patients decremented by 1
- [ ] **Activity Check:** "Patient deactivated" in Recent Activity

---

## Test Protocol 2: Appointment Management Flow

### Step 3: Appointment Creation
**Action:** Create multiple appointments for today
1. Dashboard → Appointments → Schedule New Appointment
2. Create Appointment 1:
   ```
   Patient: John TestPatient
   Doctor: Available doctor
   Date: Today's date
   Time: 09:00 AM
   Type: New Patient
   Status: Scheduled
   ```
3. Create Appointment 2:
   ```
   Patient: Existing patient (if available)
   Doctor: Available doctor
   Date: Today's date
   Time: 10:00 AM
   Type: Follow-up
   Status: Scheduled
   ```

**Expected Results:**
- [ ] Appointments created successfully
- [ ] Return to Dashboard
- [ ] **KPI Check:** Today's Appointments shows "2"
- [ ] **KPI Check:** Weekly chart shows today's bar with count "2"
- [ ] **Widget Check:** "No appointments today" message replaced with appointment list

### Step 4: Appointment Status Changes
**Action:** Update appointment statuses
1. Go to Appointments page
2. Mark Appointment 1 as "Completed"
3. Mark Appointment 2 as "Cancelled"
4. Return to Dashboard

**Expected Results:**
- [ ] **KPI Check:** Today's Appointments still shows "2"
- [ ] **KPI Check:** Status breakdown shows "1 completed, 1 cancelled"
- [ ] **Activity Check:** Status changes logged in Recent Activity

---

## Test Protocol 3: Queue Management Flow

### Step 5: Patient Check-in
**Action:** Check in a patient to the queue
1. Dashboard → Queue → Check In Patient
2. Select John TestPatient
3. Set Department: General
4. Set Priority: Normal
5. Complete check-in

**Expected Results:**
- [ ] Patient appears in queue
- [ ] **KPI Check:** Queue Waiting incremented
- [ ] **Dashboard Check:** Patient Queue section shows the patient
- [ ] **Time Check:** Wait time starts counting (e.g., "1m Waiting")

### Step 6: Queue Status Progression
**Action:** Move patient through queue statuses
1. Change patient status to "In Service"
2. Wait 2-3 minutes
3. Change patient status to "Completed"
4. Return to Dashboard

**Expected Results:**
- [ ] **KPI Check:** Queue Waiting decremented when moved to "In Service"
- [ ] **KPI Check:** Department Performance updated:
  - Patients count increased
  - Avg Wait time reflects actual wait
  - Completion % updated
- [ ] **Consistency Check:** "9m Waiting" matches "Avg Wait X min"

---

## Test Protocol 4: Consultation & Billing Flow

### Step 7: Start Consultation
**Action:** Begin consultation for queued patient
1. Dashboard → Consultations → Start New Consultation
2. Select the patient from queue
3. Complete consultation steps:
   - Chief Complaint: "Routine checkup"
   - Physical Exam: Normal findings
   - Diagnosis: "Healthy"
   - Treatment Plan: "Continue current lifestyle"
4. Complete consultation

**Expected Results:**
- [ ] Consultation saved successfully
- [ ] Patient removed from queue
- [ ] **Activity Check:** "Consultation completed" logged

### Step 8: Generate Invoice and Payment
**Action:** Create and process billing
1. Dashboard → Billing → Create Invoice
2. Select completed consultation
3. Add line items:
   ```
   Consultation Fee: $150
   Administrative Fee: $25
   Total: $175
   ```
4. Generate invoice
5. Process payment (Cash: $175)

**Expected Results:**
- [ ] Invoice created successfully
- [ ] Payment processed
- [ ] Return to Dashboard
- [ ] **KPI Check:** Monthly Revenue shows "+$175" (or $0.175K)
- [ ] **KPI Check:** Pending amount unchanged (if was $0) or decreased

---

## Test Protocol 5: Staff Management Flow

### Step 9: Staff Status Updates
**Action:** Update staff presence/activity
1. Dashboard → Staff Management
2. Find a staff member
3. Update "Last Seen" to current time
4. Set status to "Active" and "On Duty"
5. Save changes

**Expected Results:**
- [ ] Staff status updated
- [ ] Return to Dashboard
- [ ] **KPI Check:** Active Staff incremented
- [ ] **Consistency Check:** Active Staff count aligns with Staff by Role totals

### Step 10: Role Distribution Verification
**Action:** Verify staff role counts
1. Count actual staff by role in Staff Management
2. Compare with Dashboard "Staff by Role" widget

**Expected Results:**
- [ ] **Consistency Check:** Numbers match exactly
- [ ] All roles represented accurately
- [ ] Inactive staff excluded from counts

---

## Test Protocol 6: Activity Logging Verification

### Step 11: Activity Log Audit
**Action:** Verify all actions were logged
1. Dashboard → Activity Logs
2. Filter by today's date
3. Review logged activities

**Expected Activities:**
- [ ] Patient registration
- [ ] Patient deactivation
- [ ] Appointment creation (2 entries)
- [ ] Appointment status changes (2 entries)
- [ ] Queue check-in
- [ ] Queue status changes (2 entries)
- [ ] Consultation completion
- [ ] Invoice generation
- [ ] Payment processing
- [ ] Staff status update

**If activities missing:**
- Note which actions are not being logged
- Check if `useActivityLog` hooks are called in those workflows

---

## Test Protocol 7: Real-time Updates

### Step 12: Multi-tab Testing
**Action:** Test real-time dashboard updates
1. Open Dashboard in Tab 1
2. Open Patients page in Tab 2
3. Create a new patient in Tab 2
4. Switch to Tab 1 (Dashboard)

**Expected Results:**
- [ ] Dashboard KPIs update automatically (within 5 seconds)
- [ ] No page refresh required
- [ ] Recent Activity updates in real-time

---

## Issue Documentation Template

For each failed test, document:

### Issue #X: [Brief Description]
**Test Step:** Protocol X, Step Y
**Expected:** [What should happen]
**Actual:** [What actually happened]
**KPI Affected:** [Which dashboard metric]
**Console Errors:** [Any JavaScript errors]
**Network Issues:** [Failed API calls]
**Hypothesis:** [Likely root cause]

**Example:**
```
Issue #1: Total Patients KPI Not Updating
Test Step: Protocol 1, Step 1
Expected: Total Patients increments from 2 to 3
Actual: Total Patients remains at 2
KPI Affected: Total Patients card
Console Errors: None
Network Issues: POST /patients succeeded (201)
Hypothesis: Dashboard query not invalidated after patient creation
```

---

## Success Criteria

### Critical KPIs (Must Pass)
- [ ] Total Patients accuracy: 100%
- [ ] Today's Appointments accuracy: 100%
- [ ] Queue metrics consistency: 100%
- [ ] Revenue calculation accuracy: 100%

### Activity Logging (Must Pass)
- [ ] All core actions logged: 100%
- [ ] Recent Activity populated: 100%
- [ ] Activity timestamps accurate: 100%

### Real-time Updates (Should Pass)
- [ ] Dashboard updates within 5 seconds: 90%
- [ ] Multi-tab synchronization: 90%

### Staff Management (Should Pass)
- [ ] Active Staff calculation: 100%
- [ ] Staff by Role accuracy: 100%

---

## Post-Test Actions

### If All Tests Pass
1. Document successful test run
2. Create baseline KPI values
3. Schedule regular regression testing

### If Tests Fail
1. Document all issues using template above
2. Prioritize fixes by KPI criticality
3. Re-run failed tests after fixes
4. Update test protocol based on findings

---

## Automated Test Integration

Convert manual steps to automated tests:

```bash
# Run KPI validation suite
npm run test:kpi-validation

# Run end-to-end workflow tests
npm run test:e2e:workflows

# Run dashboard consistency tests
npm run test:dashboard-consistency
```

---

**Test Protocol Version:** 1.0  
**Last Updated:** January 3, 2025  
**Next Review:** January 10, 2025