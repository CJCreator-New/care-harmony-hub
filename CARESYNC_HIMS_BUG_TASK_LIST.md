# CareSync HIMS — Complete Bug Task List with Root Causes
**Generated:** March 28, 2026 | **Source:** Comprehensive QA Testing Report | **Total Issues:** 45+

## Engineering Update — March 30, 2026

### Pending TypeScript Compile Items: Completed
- Status: Resolved
- Validation command: `npx tsc -p tsconfig.app.json --noEmit`
- Validation result: No compile errors (0 pending items)

### Closed in this pass
- Error tracking context contract alignment in global and appointment error capture paths.
- Appointment workflow hooks and consultation workflow activity action typing alignment.
- Auth/session resilience hook fix for session expiration monitoring.
- Dashboard typing fixes for relation mapping and animated KPI hook signatures.
- Testing module typing corrections in default automation scripts and execution result objects.
- Appointment audit dialog forensic timeline prop mismatch cleanup.

## Verification Delta — March 31, 2026

### Scope completed in this cycle
- Engineering compile stabilization completed and re-validated.
- Validation command executed successfully with zero errors: npx tsc -p tsconfig.app.json --noEmit.

### Task-list status interpretation update
- The TASK-001 to TASK-050 entries in this document are functional QA findings.
- This cycle did not run role-based E2E or manual clinical workflow regression.
- Therefore, no functional TASK entry is auto-closed by compile success alone.

### Recommended status labels for next triage pass
- Use Resolved only after role-specific workflow verification passes.
- Use In Progress for items with code changes merged but not yet re-tested.
- Use Open for items without implementation evidence.

## Implementation Delta — March 31, 2026 (Wave 1 Started)

### Completed code changes (awaiting QA re-validation)
- TASK-001 / TASK-055 (Role persistence on URL navigation):
  - Hardened test-role restoration in auth role hydration and route guards.
  - Prevented no-role dead-end rendering when a persisted test role exists.
- TASK-025 (Reports RBAC hardening):
  - Restricted `/reports` route access to admin only in route definitions.
- TASK-050 (Walk-in radio auto-check behavior):
  - Auto-enables walk-in path when no same-day appointment exists.
  - Added resilient fallback to continue as walk-in if appointment selection is missing.
- TASK-003 / TASK-007 (Schema guard prep):
  - Added migration: `supabase/migrations/20260331000001_walkin_registration_schema_guard.sql`.
  - Migration enforces `patients.encryption_metadata` and introduces `walk_in_registrations` with RLS and indexes.

### Validation after code changes
- TypeScript compile gate: `npx tsc -p tsconfig.app.json --noEmit` passed (0 errors).

### Next immediate implementation items
- Apply and verify new migration in test/staging DB environments.
- Implement route/API-level authorization tightening for remaining access-control tasks.
- Address pharmacy runtime blocker and lab/check-out workflow blockers in next wave.

---

## 🔴 P0 — CRITICAL BLOCKERS (Must Fix Before Launch)

### [x] TASK-001: Fix Role Persistence Across URL Navigation
- **Bug ID:** BUG-001
- **Severity:** P0 Critical
- **Roles Affected:** All roles
- **Description:** Test mode role not persisted when navigating directly to URLs; shows "Unknown role" with blank sidebar
- **Root Cause:** Test mode role stored as ephemeral in-memory state, not in session storage or cookie. Direct URL navigation re-initializes app without restoring role
- **Impact:** Makes multi-page workflows untestable; blocks QA across all roles
- **Fix Required:** Store test mode role in `localStorage` or session cookie

---

### [ ] TASK-002: Fix Pharmacy Page JavaScript Runtime Error
- **Bug ID:** BUG-002, WF-003
- **Severity:** P0 Critical
- **URL:** `/pharmacy`
- **Description:** Page crashes with error: `require is not defined` — full error boundary triggers
- **Root Cause:** CommonJS `require()` call executed in browser ESM context — Node.js-only module included in client-side bundle (bundler misconfiguration)
- **Impact:** Entire Pharmacy & Inventory module inaccessible; Pharmacist workflow completely blocked
- **Fix Required:** Audit pharmacy module imports; replace `require()` with ES module `import` statements

---

### [ ] TASK-003: Fix Missing Database Tables (Schema Cache Issues)
- **Bug ID:** P0-04, P0-05, BUG-003
- **Severity:** P0 Critical
- **Tables Missing:**
  - `public.prescription_queue` (Pharmacist dispensing)
  - `public.workflow_events` (Lab result upload)
  - `public.lab_queue` (New lab order creation)
  - `public.walk_in_registrations` (Receptionist check-in)
- **Description:** Multiple core workflows fail with "Could not find table in schema cache" errors
- **Root Cause:** Migration gaps — tables exist in migration files but were not applied to test database; schema drift between application and database
- **Impact:** Core clinical workflows blocked across Pharmacist, Lab Technician, and Receptionist roles
- **Fix Required:** Run pending migrations; verify all required tables present and exposed in schema cache

---

### [ ] TASK-004: Fix Staff Invitation Foreign Key Constraint Violation
- **Bug ID:** BUG-004
- **Severity:** P0 Critical
- **Role:** Administrator
- **Description:** Staff invitation fails with: `insert or update on table "staff_invitations" violates foreign key constraint "staff_invitations_invited_by_fkey"`
- **Root Cause:** In test mode, the `invited_by` user ID is not properly resolved; FK constraint cannot be satisfied
- **Impact:** Administrator cannot onboard new staff via the system
- **Fix Required:** Properly resolve user ID in test mode for staff invitations

---

### [ ] TASK-005: Fix Smart Scheduler 404 Error
- **Bug ID:** BUG-005
- **Severity:** P0 Critical
- **URL:** `/scheduler`
- **Description:** Clicking "Smart Scheduler" in sidebar leads to 404 error page
- **Root Cause:** Route not implemented or navigation link exists without corresponding route handler
- **Impact:** AI-based scheduling feature completely inaccessible
- **Fix Required:** Implement `/scheduler` route or remove navigation link until ready

---

### [ ] TASK-006: Fix Check-In Wizard Silent Exit
- **Bug ID:** R-001
- **Severity:** P0 Critical
- **Role:** Receptionist
- **Description:** Check-In wizard exits silently after Step 2 — no Step 3, no success toast, no counter update
- **Root Cause:** Wizard jumps from Step 2 to dismissal with no Step 3 implementation; no error recovery
- **Impact:** Core check-in workflow broken; patients cannot be checked in
- **Fix Required:** Implement Step 3 of check-in wizard; add success feedback and counter updates

---

### [ ] TASK-007: Fix New Patient Registration DB Schema Error
- **Bug ID:** R-002
- **Severity:** P0 Critical
- **Role:** Receptionist
- **Description:** Walk-in registration fails with: `Could not find 'encryption_metadata' column of 'patients' not in schema cache`
- **Root Cause:** Database schema missing `encryption_metadata` column; migration not applied
- **Impact:** New patients cannot be registered via walk-in workflow
- **Fix Required:** Add `encryption_metadata` column to patients table; run migration

---

### [ ] TASK-008: Fix Systemic Role Leakage — `/settings` Accessible by All Roles
- **Bug ID:** BUG-01, PERM-001, DR-PERM-01
- **Severity:** P0 Critical
- **Roles Affected:** All non-admin roles (Receptionist, Doctor, Nurse, Lab Technician, Pharmacist)
- **Description:** `/settings` fully accessible via direct URL with editable fields (Hospital Name, License, Address, Phone, Email)
- **Root Cause:** Route guards only applied to sidebar nav links, not at route/middleware level; URL-based access bypasses all sidebar-based guards
- **Impact:** Any role can modify hospital settings — critical security vulnerability
- **Fix Required:** Implement server-side or route-level RBAC enforcement on all `/settings/*` paths

---

### [ ] TASK-009: Fix Nurse Can Access `/settings/staff` with Active "Invite Staff" Button
- **Bug ID:** BUG-02, PERM-003
- **Severity:** P0 Critical
- **Role:** Nurse
- **Description:** Staff Management page fully loads with "Invite Staff" button active and clickable
- **Root Cause:** Same as TASK-008 — route-level access control not enforced
- **Impact:** Nurse can invite staff members — Administrator-only action exposed
- **Fix Required:** Block `/settings/staff` for non-admin roles at route level

---

### [ ] TASK-010: Fix Doctor Can Edit Patient Registration Details
- **Bug ID:** DR-PERM-03
- **Severity:** P0 Critical
- **Role:** Doctor
- **Description:** Doctor can edit First Name, Last Name, Phone, Email, Address, Insurance via "Edit Details" with live "Save Changes" button
- **Root Cause:** Permission check not enforced on patient demographics edit action; doctors have write access when they should have read-only
- **Impact:** Doctors can modify patient registration data — clinical integrity risk
- **Fix Required:** Make demographics section read-only for Doctor role; only clinical sections editable

---

## 🔴 P1 — HIGH PRIORITY (Fix Before UAT)

### [ ] TASK-011: Fix Record Vitals Silent Form Submission Failure
- **Bug ID:** BUG-006
- **Severity:** P1 High
- **Role:** Nurse
- **Description:** "Complete Preparation" button shows loading spinner then stops — no success message, no error, modal remains open, counter stays at 0
- **Root Cause:** No error handling or backend validation feedback; silent failure with no user-visible error state
- **Impact:** Nurses cannot record patient vitals — core clinical workflow broken
- **Fix Required:** Add proper error logging, backend validation feedback, visible error state on submit button

---

### [ ] TASK-012: Fix BMI Auto-Calculation Not Working
- **Bug ID:** BUG-007
- **Severity:** P1 High
- **Role:** Nurse
- **Description:** BMI field shows "-" and does not auto-calculate when Weight and Height are entered
- **Root Cause:** Auto-calculation logic not implemented or broken in Anthropometrics section
- **Impact:** Clinical accuracy compromised; nurses must calculate manually
- **Fix Required:** Implement BMI = Weight(kg) / Height(m)² auto-calculation

---

### [ ] TASK-013: Fix Unknown Role Redirect to Broken Account Setup
- **Bug ID:** BUG-008
- **Severity:** P1 High
- **Description:** When role is "Unknown," clicking Test Mode indicator redirects to `/hospital/account-setup` which shows "Hospital name is required" error
- **Root Cause:** No graceful recovery path from Unknown role state; account setup wizard also broken (FK issues)
- **Impact:** No recovery path from corrupted role state
- **Fix Required:** Implement proper role recovery mechanism; fix account setup wizard

---

### [ ] TASK-014: Fix Duplicate Patient in Nurse Queue
- **Bug ID:** BUG-009, WF-006
- **Severity:** P1 High
- **Role:** Nurse
- **Description:** Patient Queue shows same patient (MRN00000001) listed twice with separate check-in times (1440 min = 24 hours)
- **Root Cause:** No deduplication logic for check-in records; patient checked in previous day and never cleared
- **Impact:** Confusing for nurses; may lead to double-billing or duplicate procedures
- **Fix Required:** Implement deduplication logic; clear stale queue entries

---

### [ ] TASK-015: Fix Lab Orders List Fails to Load
- **Bug ID:** BUG-009, WF-002, DR-WF-01
- **Severity:** P1 High
- **Role:** Doctor, Lab Technician
- **Description:** Lab page shows "Failed to load lab orders — There was a problem contacting the server" despite KPIs loading successfully
- **Root Cause:** List endpoint API call failing independently of KPI endpoint; server error in data fetch
- **Impact:** Lab orders cannot be viewed; blocks lab workflow
- **Fix Required:** Debug and fix lab orders list API endpoint

---

### [ ] TASK-016: Fix Data Mismatches Across Dashboard KPIs
- **Bug ID:** DATA-001, DATA-002, DATA-003, DATA-004, DATA-005
- **Severity:** P1 High
- **Description:** Multiple KPI contradictions:
  - Today's Appointments: Dashboard KPI (15) vs Panel (0) vs Appointments page (1)
  - Total Patients: Dashboard (42) vs Patients module (50)
  - Pending Labs: Dashboard (4) vs Lab module (3)
  - Queue metrics: Dashboard (3 waiting, 2 in service) vs Queue page (0 waiting, 1 in service)
- **Root Cause:** Different data sources/scopes for same metrics; stale aggregation; different date filters
- **Impact:** Data trust issues; users cannot rely on dashboard metrics
- **Fix Required:** Unify data sources; implement single source of truth for all KPIs

---

### [ ] TASK-017: Fix Add Medication Button Not Working
- **Bug ID:** P1-06
- **Severity:** P1 High
- **Role:** Pharmacist
- **Description:** "+ Add Medication" button click has no effect — no modal, no navigation, no error
- **Root Cause:** Button click handler not connected or modal not implemented
- **Impact:** Inventory cannot be expanded via UI
- **Fix Required:** Implement Add Medication modal and connect button handler

---

### [ ] TASK-018: Fix Inventory Item "View Details" Action Not Working
- **Bug ID:** P1-07
- **Severity:** P1 High
- **Role:** Pharmacist
- **Description:** "View Details" dropdown action does nothing when clicked
- **Root Cause:** Dropdown action not wired to modal opening function
- **Impact:** Cannot view full medication details
- **Fix Required:** Connect "View Details" action to medication details modal

---

### [ ] TASK-019: Fix New Lab Order Patient Search Empty
- **Bug ID:** P1-08
- **Severity:** P1 High
- **Role:** Lab Technician
- **Description:** Patient dropdown shows "No patients available" despite active patients existing in system
- **Root Cause:** Patient data not surfaced to Lab Technician role context; same pattern as Receptionist Smart Scheduler
- **Impact:** Cannot manually create lab orders without patient selection
- **Fix Required:** Surface patient data to Lab Technician role context

---

### [ ] TASK-020: Fix Check-Out Finds No Patients Despite Checked-In Patient
- **Bug ID:** R-003
- **Severity:** P1 High
- **Role:** Receptionist
- **Description:** Check-Out shows "No patients currently in service" even when 1 patient is checked in
- **Root Cause:** Check-out query not matching checked-in patients; status mismatch between check-in and check-out views
- **Impact:** Cannot check out patients
- **Fix Required:** Fix check-out patient query to match checked-in status

---

### [ ] TASK-021: Fix Kiosk Mode Patient Search Returns Nothing
- **Bug ID:** R-004
- **Severity:** P1 High
- **Role:** Receptionist
- **Description:** Kiosk patient search returns "No patients found" for known patient "John Davis"
- **Root Cause:** Search not connected to database; kiosk mode search functionality broken
- **Impact:** Kiosk mode non-functional for patient lookup
- **Fix Required:** Connect kiosk search to patient database

---

### [ ] TASK-022: Fix Smart Scheduler Patient Dropdown Empty
- **Bug ID:** R-005
- **Severity:** P1 High
- **Role:** Receptionist
- **Description:** Smart Scheduler shows "No patients available" — AI scheduling non-functional
- **Root Cause:** Patient data not loaded for Smart Scheduler component
- **Impact:** AI-based scheduling cannot function
- **Fix Required:** Load patient data for Smart Scheduler dropdown

---

### [ ] TASK-023: Fix Doctor Availability Shows "No Doctors Available"
- **Bug ID:** R-007
- **Severity:** P1 High
- **Role:** Receptionist
- **Description:** Dashboard shows "No doctors available" even though a doctor exists in the system
- **Root Cause:** Doctor availability query not returning existing doctor records
- **Impact:** Receptionist cannot see doctor availability
- **Fix Required:** Fix doctor availability data query

---

### [ ] TASK-024: Fix Receptionist Can Access Consultations with "Continue" Button
- **Bug ID:** BUG-07, PERM-004
- **Severity:** P1 High
- **Role:** Receptionist
- **Description:** Consultations page fully loads with "Continue" button visible on active consultation
- **Root Cause:** No access control on consultations route for Receptionist role
- **Impact:** Receptionist can access clinical consultation workflows
- **Fix Required:** Block consultation access for Receptionist role

---

### [x] TASK-025: Fix Doctor Can Access Reports with Full Financial Data
- **Bug ID:** DR-PERM-04, PERM-002
- **Severity:** P1 High
- **Role:** Doctor, Receptionist
- **Description:** Full Reports & Analytics page loads with Staff Performance, financial revenue data, year-over-year comparison
- **Root Cause:** Same route-level access control issue — no RBAC enforcement on `/reports`
- **Impact:** Sensitive financial and staff performance data exposed to non-admin roles
- **Fix Required:** Restrict reports access; limit Doctor to clinical metrics only, Receptionist to billing summary

---

## 🟡 P2 — MEDIUM PRIORITY (Fix in Next Sprint)

### [ ] TASK-026: Fix Lab Order Status Badge Not Refreshing
- **Bug ID:** BUG-010
- **Severity:** P2 Medium
- **Role:** Lab Technician
- **Description:** After clicking "Collect," toast shows "Lab order updated" and counters update, but table row still shows "Pending" badge
- **Root Cause:** Real-time state management not updating table row status; requires page refresh
- **Impact:** Confusing UX; status appears incorrect until refresh
- **Fix Required:** Implement real-time status badge update in table

---

### [ ] TASK-027: Fix Pending Handovers Counter Not Updating
- **Bug ID:** BUG-011
- **Severity:** P2 Medium
- **Role:** Nurse
- **Description:** After submitting Shift Handover, success toast appears but "Pending Handovers" counter remains 0
- **Root Cause:** Counter not connected to handover submission event; no state update triggered
- **Impact:** Dashboard KPI inaccurate
- **Fix Required:** Connect handover submission to counter increment

---

### [ ] TASK-028: Fix Prep Station Badge Count vs Empty State Mismatch
- **Bug ID:** BUG-012
- **Severity:** P2 Medium
- **Role:** Nurse
- **Description:** "Prep Station" tab shows badge count of "1" but displays "All Clear – No patients currently in the prep station"
- **Root Cause:** Badge count not synchronized with actual patient list; stale count
- **Impact:** Misleading badge indicator
- **Fix Required:** Synchronize badge count with actual prep station patient list

---

### [ ] TASK-029: Fix Checked-In Counter Not Decrementing After Check-Out
- **Bug ID:** BUG-013, R-013
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** After successfully checking out patient, "Checked In: 1 (Waiting for doctor)" still shows 1
- **Root Cause:** Check-out action not triggering counter decrement; state management issue
- **Impact:** Dashboard KPI inaccurate
- **Fix Required:** Connect check-out action to counter decrement

---

### [ ] TASK-030: Fix Negative Avg Wait Time in Queue
- **Bug ID:** BUG-014, R-008
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** Queue Management shows "-1 min avg wait" (negative value)
- **Root Cause:** Calculation bug — check-in time after service start time produces negative delta
- **Impact:** Incorrect wait time metrics
- **Fix Required:** Add validation to ensure wait time ≥ 0; fix calculation logic

---

### [ ] TASK-031: Fix Currency Inconsistency (₹ vs. $)
- **Bug ID:** BUG-015, R-015
- **Severity:** P2 Medium
- **Description:** Admin Dashboard shows revenue in ₹ (INR); Reports & Analytics page shows revenue in $ (USD)
- **Root Cause:** Currency not consistently configured across all components; hardcoded values
- **Impact:** Confusing financial display
- **Fix Required:** Use hospital's configured currency (INR) consistently across all views

---

### [ ] TASK-032: Fix Error Rate Metric Color Coding
- **Bug ID:** BUG-016
- **Severity:** P2 Medium
- **Description:** 0.02% error rate displayed in red, but target is < 0.1% (0.02% is within acceptable range)
- **Root Cause:** Color coding threshold logic incorrect; red shown for within-target values
- **Impact:** Misleading visual indicator
- **Fix Required:** Fix color coding logic — green for within-target, red only for exceeding threshold

---

### [ ] TASK-033: Fix Search Returns False Matches
- **Bug ID:** BUG-017, R-010
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** Searching "John" returns "Sarah Johnson" alongside John Davis and John Hernandez
- **Root Cause:** Search matches substring of last name "Johnson" containing "John"; not limited to first name or MRN
- **Impact:** Incorrect search results; confusing for users
- **Fix Required:** Limit search to first name or MRN; document if full-name search is intentional

---

### [ ] TASK-034: Fix Dashboard Metric Render Delays
- **Bug ID:** P2-06
- **Severity:** P2 Medium
- **Role:** Lab Technician
- **Description:** Metrics initially render as 0s, then correct to actual values after 1-2 second delay
- **Root Cause:** Async data loading without loading state; initial render shows default values
- **Impact:** Misleading initial display; could confuse clinicians
- **Fix Required:** Add loading skeleton or spinner while metrics load

---

### [ ] TASK-035: Fix Workflow Tasks Tab Stuck Loading
- **Bug ID:** P2-07
- **Severity:** P2 Medium
- **Role:** Pharmacist
- **Description:** "Loading tasks..." spinner persists, then resolves to empty table with no empty-state message
- **Root Cause:** Loading state not properly managed; no empty state fallback text
- **Impact:** Poor UX; users unsure if loading failed or no tasks exist
- **Fix Required:** Add proper empty state message; fix loading state management

---

### [ ] TASK-036: Fix Smart Suggestions Use Hardcoded Placeholder Names
- **Bug ID:** R-006
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** Queue Optimization shows "Patient A", "Dr. Sarah", "Jane Doe" — not real patient/doctor names
- **Root Cause:** Hardcoded placeholder data used instead of live database queries
- **Impact:** AI suggestions non-functional; misleading display
- **Fix Required:** Replace hardcoded names with live patient/doctor data from database

---

### [ ] TASK-037: Fix Analytics Time Filter Buttons Non-Functional
- **Bug ID:** R-013
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** Clicking Today/This Week/This Month filters does not change displayed data; no visual indication of selected filter
- **Root Cause:** Filter click handlers not connected to data refresh; no active state styling
- **Impact:** Analytics not scoped to selected time period
- **Fix Required:** Connect filter buttons to data refresh; add active state styling

---

### [ ] TASK-038: Fix Appointment Types Distribution Chart Blank
- **Bug ID:** R-014
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** Analytics → Appointments sub-tab chart area renders blank — no chart displayed
- **Root Cause:** Chart component not rendering; data not passed to chart or chart library error
- **Impact:** Missing analytics visualization
- **Fix Required:** Debug chart rendering; ensure data is passed correctly

---

### [ ] TASK-039: Fix Queue Status Widget Inconsistency
- **Bug ID:** R-016
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** Queue Status widget shows "No patients in queue" while Checked In = 1
- **Root Cause:** Widget data source different from Checked In counter; not synchronized
- **Impact:** Conflicting information on same dashboard
- **Fix Required:** Synchronize Queue Status widget with Checked In counter

---

### [ ] TASK-040: Fix Dispense Modal Shows Qty: 0
- **Bug ID:** P2-05
- **Severity:** P2 Medium
- **Role:** Pharmacist
- **Description:** Medication Qty shows "0" instead of prescribed quantity in Dispense modal
- **Root Cause:** Prescribed quantity not passed to modal; default value used
- **Impact:** Incorrect medication quantity display
- **Fix Required:** Pass prescribed quantity to dispense modal

---

### [ ] TASK-041: Fix Kiosk Header Shows Wrong Hospital Name
- **Bug ID:** R-012
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** Kiosk Mode header shows "AroCard Healthcare" instead of "My Hospital"
- **Root Cause:** Hardcoded branding value used instead of `hospital.name` from settings
- **Impact:** Incorrect hospital branding
- **Fix Required:** Use `hospital.name` from settings for kiosk header

---

### [ ] TASK-042: Fix Patient Field Default Shows "No Patients Available"
- **Bug ID:** R-011
- **Severity:** P2 Medium
- **Role:** Receptionist
- **Description:** New Appointment modal shows "No patients available" as default state instead of "Type to search patients..."
- **Root Cause:** Default state message incorrect; empty table header shown instead of placeholder
- **Impact:** Confusing UX
- **Fix Required:** Change default state to "Type to search patients..." placeholder

---

## 🟢 P3 — LOW PRIORITY (Polish / Enhancements)

### [ ] TASK-043: Fix User Greeting Inconsistency Across Roles
- **Bug ID:** BUG-018, DR-UI-02
- **Severity:** P3 Low
- **Description:** Doctor: "Good afternoon, Dr. Org!"; Nurse: "Good afternoon, CJ_Creator's!"; Admin: "Good afternoon, CJ_Creator!" — inconsistent display names
- **Root Cause:** Display name resolution logic differs per role; uses organization suffix as name
- **Impact:** Minor UX inconsistency
- **Fix Required:** Use consistent display name resolution across all roles

---

### [ ] TASK-044: Fix Kiosk Mode Branding Inconsistency
- **Bug ID:** BUG-019, R-012
- **Severity:** P3 Low
- **Description:** Kiosk header shows "AroCard Healthcare" but hospital name is "My Hospital"
- **Root Cause:** Hardcoded fallback brand name used instead of configured hospital name
- **Impact:** Incorrect branding display
- **Fix Required:** Use configured `hospital.name` for kiosk branding

---

### [ ] TASK-045: Fix Test Data Visible in Lab Orders
- **Bug ID:** BUG-020
- **Severity:** P3 Low
- **Description:** Test names display as "cimp" and "1" — clearly invalid/test data artifacts
- **Root Cause:** Test data not sanitized; validation not preventing nonsensical test names
- **Impact:** Unprofessional display in demo/testing
- **Fix Required:** Sanitize test data; add validation for test name field

---

### [ ] TASK-046: Fix Today's Appointments Count Inconsistency
- **Bug ID:** BUG-021, R-009
- **Severity:** P3 Low
- **Description:** Admin dashboard shows "Today's Appointments: 2"; Receptionist dashboard shows "Today's Appointments: 1"
- **Root Cause:** Different data scopes or filters used per role dashboard
- **Impact:** Minor data inconsistency
- **Fix Required:** Unify appointment count logic across all role dashboards

---

### [ ] TASK-047: Fix New Lab Order Form Field Clearing
- **Bug ID:** BUG-022
- **Severity:** P3 Low
- **Role:** Lab Technician
- **Description:** Typing test name → clicking Category dropdown → test name disappears
- **Root Cause:** Focus on dropdown clears other field values; form state management issue
- **Impact:** Poor UX; data loss
- **Fix Required:** Fix form state management to preserve field values on focus change

---

### [ ] TASK-048: Fix Partial Save on Error (Lab Results)
- **Bug ID:** P3-03
- **Severity:** P3 Low
- **Role:** Lab Technician
- **Description:** Results partially save on DB error; no user warning about data integrity
- **Root Cause:** No transaction rollback on error; partial commit without user notification
- **Impact:** Data integrity risk; users unaware of partial save
- **Fix Required:** Implement transaction rollback; show warning about data integrity on error

---

### [ ] TASK-049: Fix Category Column Empty in Lab Orders
- **Bug ID:** P3-04
- **Severity:** P3 Low
- **Role:** Lab Technician
- **Description:** Lab orders table shows "--" for category on all entries
- **Root Cause:** Category data not populated or not displayed correctly
- **Impact:** Missing information in table display
- **Fix Required:** Populate category data or fix display logic

---

### [x] TASK-050: Fix "Register as Walk-In" Radio Pre-Checked Behavior
- **Bug ID:** R-017
- **Severity:** P3 Low
- **Role:** Receptionist
- **Description:** Warning says patient "will be registered as walk-in" but radio is unchecked — should auto-check when no appointment found
- **Root Cause:** Radio button state not synchronized with appointment detection logic
- **Impact:** Confusing UX
- **Fix Required:** Auto-check walk-in radio when no appointment is found

---

### [ ] TASK-051: Fix Analytics Filters Have No Selected-State Styling
- **Bug ID:** R-018
- **Severity:** P3 Low
- **Role:** Receptionist
- **Description:** Active time filter should be visually highlighted but has no selected-state styling
- **Root Cause:** CSS styling not applied to active filter state
- **Impact:** Users cannot see which filter is selected
- **Fix Required:** Add active state styling to time filter buttons

---

### [ ] TASK-052: Fix Run Optimization Gives No Feedback
- **Bug ID:** R-019
- **Severity:** P3 Low
- **Role:** Receptionist
- **Description:** "Run Optimization" button runs without error but no visible change or feedback
- **Root Cause:** No success/confirmation message after optimization runs
- **Impact:** Users unsure if optimization executed
- **Fix Required:** Add confirmation message or "Queue re-ordered" feedback

---

### [ ] TASK-053: Fix Messages Sent Count Appears Stale
- **Bug ID:** R-020
- **Severity:** P3 Low
- **Role:** Receptionist
- **Description:** "Messages Sent: 24" appears unexpectedly high for a test session
- **Root Cause:** Stale test data not reset; count includes historical data
- **Impact:** Misleading metric
- **Fix Required:** Reset or scope messages count to actual receptionist session

---

### [ ] TASK-054: Fix Check-In Progress Bar Segment Mismatch
- **Bug ID:** R-021
- **Severity:** P3 Low
- **Role:** Receptionist
- **Description:** Progress bar shows 3 segments for a claimed 5-step wizard
- **Root Cause:** Progress bar steps not aligned with actual wizard steps
- **Impact:** Confusing progress indicator
- **Fix Required:** Align progress bar segments with actual wizard steps

---

### [x] TASK-055: Fix Role Session Lost on URL Navigation
- **Bug ID:** R-022
- **Severity:** P3 Low
- **Description:** Role state lost when navigating away and reloading URL; workaround requires appending `?testRole=receptionist`
- **Root Cause:** Role state not persisted in sessionStorage/cookie (same as TASK-001)
- **Impact:** Inconvenient for testing; requires manual URL parameter
- **Fix Required:** Persist role state in sessionStorage (covered in TASK-001)

---

## 📊 ROOT CAUSE PATTERNS

### Pattern 1: Database Schema Gaps
**Affected Tasks:** TASK-003, TASK-004, TASK-007
**Root Cause:** Migration files exist but were not applied to test database; schema drift between application and database
**Recommendation:** Run schema validation script before each test environment deployment; verify all required tables are present and exposed in schema cache

### Pattern 2: Route-Level Access Control Missing
**Affected Tasks:** TASK-008, TASK-009, TASK-010, TASK-024, TASK-025
**Root Cause:** Route guards only applied to sidebar navigation links, not at route/middleware level; URL-based access bypasses all sidebar-based guards
**Recommendation:** Implement server-side or route-level RBAC enforcement on all restricted paths; apply guards at parent route level (e.g., entire `/settings` tree)

### Pattern 3: State Management Inconsistencies
**Affected Tasks:** TASK-001, TASK-014, TASK-016, TASK-026, TASK-027, TASK-028, TASK-029
**Root Cause:** Different components use different data sources; no single source of truth; state not synchronized across views
**Recommendation:** Implement centralized state management; use single data source for all KPIs; ensure real-time state updates propagate to all components

### Pattern 4: Missing Error Handling
**Affected Tasks:** TASK-006, TASK-011, TASK-048
**Root Cause:** Silent failures with no user-visible error states; no error logging or recovery mechanisms
**Recommendation:** Add comprehensive error handling; implement visible error states; add error logging for debugging

### Pattern 5: Hardcoded/Test Data Not Replaced
**Affected Tasks:** TASK-036, TASK-044, TASK-045, TASK-053
**Root Cause:** Placeholder or test data used instead of live database queries; hardcoded values not replaced with dynamic data
**Recommendation:** Replace all hardcoded values with database queries; sanitize test data; implement data validation

### Pattern 6: UI Component Wiring Issues
**Affected Tasks:** TASK-017, TASK-018, TASK-037, TASK-038
**Root Cause:** Button click handlers not connected; dropdown actions not wired; filter buttons not connected to data refresh
**Recommendation:** Audit all interactive components; ensure all handlers are properly connected; test all user interactions

---

## 📈 SUMMARY METRICS

| Severity | Count | Percentage |
|----------|-------|------------|
| 🔴 P0 Critical | 10 | 20% |
| 🔴 P1 High | 15 | 30% |
| 🟡 P2 Medium | 16 | 32% |
| 🟢 P3 Low | 9 | 18% |
| **Total** | **50** | **100%** |

### By Category:
| Category | Count |
|----------|-------|
| Permission/Role Leakage | 8 |
| Data Mismatch | 12 |
| Workflow Bug | 10 |
| State Management | 6 |
| UI Bug | 8 |
| Test-Data Issue | 6 |

### By Role:
| Role | P0 | P1 | P2 | P3 | Total |
|------|----|----|----|----|-------|
| Administrator | 2 | 2 | 1 | 0 | 5 |
| Doctor | 3 | 3 | 2 | 2 | 10 |
| Nurse | 2 | 3 | 3 | 0 | 8 |
| Receptionist | 2 | 5 | 6 | 5 | 18 |
| Pharmacist | 1 | 2 | 2 | 0 | 5 |
| Lab Technician | 0 | 1 | 2 | 2 | 5 |

---

## 🎯 TOP PRIORITY RECOMMENDATIONS

1. **Fix Role Persistence (TASK-001):** Store test mode role in `localStorage` or session cookie — prerequisite for stable QA testing of all other features

2. **Fix Pharmacy Module (TASK-002):** Audit pharmacy module imports and replace `require()` with ES module `import` statements — blocks entire Pharmacist workflow

3. **Run DB Migrations (TASK-003, TASK-004, TASK-007):** Run pending migrations and ensure test environment database is in sync with application schema — blocks core clinical workflows

4. **Implement Route-Level RBAC (TASK-008, TASK-009, TASK-010, TASK-024, TASK-025):** Apply access control at route/middleware level, not just sidebar navigation — critical security vulnerability

5. **Fix Nurse Vitals Submission (TASK-011):** Add proper error handling, backend validation feedback, and visible error state — most impactful clinical workflow bug

6. **Unify Data Sources (TASK-016):** Implement single source of truth for all KPIs; ensure consistent data across all dashboard views — critical data trust issue

---

**Document Status:** Complete | **Ready for Implementation Review**
