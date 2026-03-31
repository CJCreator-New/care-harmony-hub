# CareSync HIMS — Consolidated End-to-End QA Review Report & Master Bug List

**Test Environment:** localhost:8080 | **Date:** March 28, 2026 | **Tester:** Senior QA Engineer (Automated)
**Test Mode Tool Used:** Built-in role switcher (bottom-right overlay badge)

---

## 1. ROLES TESTED

| Role | Sidebar Sections Available | Dashboard Type |
|---|---|---|
| **Administrator** | Core Ops, Clinical Care, Pharmacy & Inventory, Laboratory, Administration, Business Ops | Full KPI overview, Invite Staff, View Reports, Settings |
| **Doctor** | Core Ops (no Smart Scheduler), Clinical Care, Laboratory | Clinical schedule view, My Tasks, Patient Queue |
| **Nurse** | Core Ops (Dashboard, Patients, Queue only — no Appointments), Clinical Care, Laboratory | Vitals-focused, Prep Station, Handovers |
| **Receptionist** | Core Ops, Business Operations only | Check-In/Check-Out, Walk-In, Kiosk Mode, Appointments view |
| **Pharmacist** | Dashboard only, Pharmacy & Inventory (collapsed) | Rx Queue, Inventory Status |
| **Lab Technician** | Dashboard only, Laboratory (collapsed) | Pending Orders, Active Lab Orders, Urgent Orders |

---

## 2. WORKFLOW COVERAGE

| Workflow Stage | Tested | Status |
|---|---|---|
| Patient Registration | Yes (Admin, Receptionist) | Accessible |
| Appointment Booking | Yes | Accessible |
| Check-In / Walk-In | Yes (Receptionist role) | Accessible |
| Queue Management | Yes (all roles attempted) | Partially broken |
| Nurse Triage/Vitals | Yes | Accessible |
| Doctor Consultation | Yes | Accessible |
| Lab Order Lifecycle | Yes | Critically broken (server error) |
| Prescription Dispensing | Yes (Pharmacist) | Critically broken (page crash) |
| Billing | Yes (Receptionist/Admin) | Accessible |
| Reporting | Yes | Role leakage confirmed |
| Settings/Admin | Yes | Systemic role leakage confirmed |

---

## 3. PASS/FAIL SUMMARY BY TEST AREA

| Area | Status |
|---|---|
| Sidebar scoping (Doctor role) | ✅ PASS |
| Route-level access control | ❌ FAIL — 3 of 8 restricted URLs breached |
| Patient list — view access | ✅ PASS |
| Patient record — edit restriction | ❌ FAIL — editable by Doctor |
| Appointments view | ✅ PASS (with minor UI overflow) |
| Queue Management | ✅ PASS (Complete button needs review) |
| Consultation workflow (5 steps) | ✅ PASS structurally — logic bugs present |
| Lab Orders list | ❌ FAIL — server error on list load |
| Telemedicine | ✅ PASS |
| Voice Clinical Notes | ✅ PASS |
| Dashboard data accuracy | ❌ FAIL — multiple KPI mismatches |
| Real-time KPI reactivity | ❌ FAIL — no updates after clinical actions |
| Recent Activity feed | ❌ FAIL — never populates |

**Overall Doctor Flow: NOT READY FOR DEMO** — 3 critical permission bugs, 1 broken lab module, and non-reactive dashboard KPIs are the primary blockers.

---

## 4. MASTER BUG LIST (COMBINED BY SEVERITY)

### 🔴 CRITICAL (P0 — Must Fix Before Any Demo or Release)

**1. DR-PERM-01 | Role Leakage**
- `/settings` is fully accessible to Doctor via direct URL. Hospital fields are editable.
- Expected: Access Denied / redirect

**2. DR-PERM-02 | Role Leakage**
- `/settings/staff` is fully accessible to Doctor via direct URL.
- Expected: Access Denied

**3. DR-PERM-03 | Permission Bug**
- Doctor can edit patient registration data via "Edit Details" (First Name, Last Name, Phone, Email, Address, Insurance, etc.).
- Expected: Demographics section read-only for Doctor; only clinical sections editable.

**4. PERM-001 | Role Leakage (Systemic)**
- `/settings` accessible by ALL non-admin roles via direct URL (Receptionist, Doctor, Nurse, Lab Tech).
- Route guards are applied only to sidebar nav links, not at the route/middleware level.

**5. PERM-003 | Role Leakage**
- Nurse can access `/settings/staff` with a live "Invite Staff" button.
- Expected: Page blocked entirely for Nurse.

**6. WF-003 | Page Crash**
- `/pharmacy` crashes with JS runtime error: `require is not defined`.
- Affects Administrator AND Pharmacist — Pharmacist's workflow is blocked. CommonJS syntax issue.

**7. DATA-001 | Data Mismatch — Today's Appointments**
- Dashboard KPI card: **15** vs Today's Appointments panel: **0** vs `/appointments` module: **Total Today = 1**.
- Must sync to display real data.

---

### 🔴 HIGH (P1 — Must Fix Before Demo)

**9. DR-PERM-04 | Role Leakage**
- Doctor can access `/reports` via direct URL, seeing hospital-wide financial data and staff performance.
- Expected: Blocked or restricted to personal clinical metrics.

**10. PERM-002 | Role Leakage**
- Receptionist can access `/reports` via direct URL including Staff Performance and full financials.

**11. PERM-004 | Role Leakage**
- Receptionist can access `/consultations` and sees "Continue" action button on active consultation.

**12. PERM-006 | Role Leakage**
- Doctor can access `/settings`, `/settings/staff`, and `/reports` via direct URL.

**13. DR-WF-01 | Workflow Bug**
- Lab Orders list fails to load for Doctor: "Failed to load lab orders — There was a problem contacting the server"

**14. WF-002 | Workflow Bug**
- Same lab orders list failure confirmed across all roles.

**15. DATA-002 | Data Mismatch**
- Dashboard KPI "Total Patients" = **42** vs `/patients` module header = **50 Total Patients**.

**16. DATA-003 | Data Mismatch**
- Dashboard "Pending Labs" = **4** vs Laboratory module = **3 Pending Orders**.

**17. DATA-004 | Data Mismatch**
- Dashboard Queue KPIs: Waiting = **3**, In Service = **2** vs Queue page: Waiting = **0**, In Service = **1**, Active Widget = **1**.

**18. DATA-013 | Data Mismatch**
- Appointments page: Completed = **0** vs Dashboard KPI: **12 completed**. (Only 1 actual appointment exists today).

**19. DR-DATA-01 | Data Mismatch**
- Doctor dashboard KPI "Today's Patients" = **0 Scheduled**, but patient is Checked In.

**20. DR-DATA-02 | Data Mismatch**
- Doctor dashboard "Pending Labs" = **0** vs Lab module shows **3 Pending Orders**.

---

### 🟡 MEDIUM (P2 — Fix Before Production)

**21. DR-PERM-05 | Permission Bug**
- "Register Patient" button is visible on `/patients` page for Doctor role.

**22. DR-WF-02 | Workflow Bug**
- All 5 consultation steps can be advanced with completely empty fields. No validation prevents blank data.

**23. DR-WF-03 | State Management Issue**
- Clicking "Next" advances the consultation status to "Handoff" even without saving.

**24. WF-005 / DR-WF-04 | Workflow Bug**
- "Continue" button appears on all completed consultations, allowing edits on signed-off records. Expected: "View" only.

**25. DR-DATA-03 | Data Mismatch**
- Doctor dashboard KPI "Consultations Completed Today" still shows **0** even after status changes to Handoff.

**26. DR-DATA-04 | Data Mismatch**
- "Today's Appointments" panel on Doctor dashboard: **0 scheduled** vs `/appointments` page: **1 Checked In**.

**27. DATA-005 | Data Mismatch**
- Nurse dashboard "Ready for Doctor" KPI = **3** vs Queue page = **0**.

**28. DATA-006 | Data Mismatch / State Management**
- All Workflow Stage Performance metrics show **0.0 min** despite patient being In Service for over 1 hour.

**29. DATA-009 | Data Mismatch**
- Reports page "Patients Seen Today" = **0** vs Consultations = **1**.

**30. DR-UI-01 | UI Bug**
- Appointments table overflows horizontally on default viewport.

**31. PERM-005 | Role Leakage**
- Lab Technician can access `/queue` with action buttons visible.

**32. DR-UI-02 | UI Bug / Navigation Issue**
- Doctor greeting uses account organisation name instead of actual name.

**33. DR-UI-03 | State Management Issue**
- "Recent Activity" widget shows nothing on Doctor dashboard despite activities taking place.

**34. DATA-007 | Test-Data Issue**
- Widespread name-gender mismatches in seeded patient data (e.g. Lisa tagged as MALE).

**35. DATA-008 | Test-Data Issue**
- Admin account "CJ_Creator's Org" listed as patient MRN0001.

**36. DATA-010 | Test-Data Issue / Data Mismatch**
- MRN format inconsistency (`MRN0004` vs `MRN00000004`).

**37. WF-006 | State Management Issue / Test-Data Issue**
- Duplicated patient entries in Nurse queue stuck at 1440-minute wait time.

**38. DATA-011 | Data Mismatch**
- Patient gender breakdown visual gap (Total 50 vs M 14 + F 17). 19 OTHER ignored.

**39. BUG-UNKNOWN-ROLE | State Management Issue**
- Test Mode sometimes shows "Unknown role" and requires hard refresh.

---

### 🟢 LOW (P3 — Polish / Minor)

**40. DR-UI-04 | Navigation Issue**
- Receptionist dashboard shows "Smart Scheduler" which might be a dead-end.

**41. UI-001 | UI Bug**
- Dashboard greeting syntax issue.

**42. UI-002 | UI Bug**
- "Pending Labs" badge on Admin dashboard KPI card has no drill-down link.

**43. DATA-012 | Test-Data Issue / UI Bug**
- Department Performance (Today) Completion = **0%**.

**44. UI-003 | UI Bug**
- "This Week's Appointments" chart flatlines on historical days despite records existing.

**45. DR-UI-05 | UI Bug**
- Focus area links target generic pages instead of specific modules.

---

## BUG SUMMARY COUNT

| Severity | Count |
|---|---|
| 🔴 Critical (P0) | 8 |
| 🔴 High (P1) | 12 |
| 🟡 Medium (P2) | 19 |
| 🟢 Low (P3) | 6 |
| **Total** | **45 bugs** |
# CareSync HIMS — Full End-to-End QA Report
**Test Date:** March 28, 2026 | **Environment:** localhost:8080 | **Roles Tested:** Doctor, Nurse, Receptionist, Lab Technician, Administrator

***

## 🔴 CRITICAL BUGS (P0 — Blockers)

### BUG-001: Test Mode Role Not Persisted Across Direct URL Navigation
- **Severity:** P0 — Critical
- **Roles Affected:** All roles
- **Steps to Reproduce:** Switch to any role (e.g., Nurse), then navigate directly to any URL (e.g., `/queue`, `/reports`, `/settings`)
- **Observed:** "Unknown role" state appears with blank sidebar ("No navigation items available for your role"), loading spinner that never resolves
- **Expected:** Role context should persist across all in-app navigation
- **Root Cause:** Test mode role is stored as ephemeral in-memory state, not in session storage or cookie. Direct URL navigation re-initializes the app without restoring the role
- **Workaround Found:** Using in-app sidebar links after initial role switch preserves the role; direct URL navigation always breaks it
- **Impact:** Makes multi-page workflows untestable; blocks QA across all roles

***

### BUG-002: Pharmacy Page — JavaScript Runtime Error (`require is not defined`)
- **Severity:** P0 — Critical
- **URL:** `/pharmacy`
- **Error:** `require is not defined` (CommonJS `require()` called in browser ESM context)
- **Support Reference:** `trace_mn9w6xb2_wcieva`
- **Observed:** Full-page error boundary triggers; page completely unusable
- **Expected:** Pharmacy module loads and renders correctly
- **Impact:** Entire Pharmacy & Inventory module is inaccessible

***

### BUG-003: New Lab Order — Database Table Missing (`public.lab_queue`)
- **Severity:** P0 — Critical
- **Role:** Lab Technician
- **Action:** Create New Lab Order → fill form → click "Create Lab Order"
- **Error:** `Could not find the table 'public.lab_queue' in the schema cache`
- **Impact:** Lab Technicians cannot create manual lab orders; backend schema is out of sync with the application

***

### BUG-004: Staff Invitation — Foreign Key Constraint Violation
- **Severity:** P0 — Critical
- **Role:** Administrator
- **Action:** Invite Staff Member → fill all 3 steps → click "Send Invitation"
- **Error:** `insert or update on table "staff_invitations" violates foreign key constraint "staff_invitations_invited_by_fkey"`
- **Root Cause:** In test mode, the `invited_by` user ID is not properly resolved; FK constraint cannot be satisfied
- **Impact:** Administrator cannot onboard new staff via the system

***

### BUG-005: Smart Scheduler — 404 Page Not Found
- **Severity:** P0 — Critical
- **URL:** `/scheduler`
- **Role:** Receptionist, Administrator (visible in sidebar for both)
- **Observed:** Clicking "Smart Scheduler" in sidebar leads to 404 error
- **Impact:** AI-based scheduling feature is completely inaccessible

***

## 🟠 HIGH SEVERITY BUGS (P1)

### BUG-006: Record Vitals / "Complete Preparation" — Silent Form Submission Failure
- **Severity:** P1 — High
- **Role:** Nurse
- **Steps:** Open "Record Vitals" modal → select patient → fill all fields including Chief Complaint → click "Complete Preparation"
- **Observed:** Button shows loading spinner, then stops with no success message, no error message; modal remains open; "Vitals Recorded" counter stays at 0
- **Expected:** Success toast, modal closes, counter increments
- **Impact:** Nurses cannot record patient vitals — a core workflow is broken

### BUG-007: BMI Auto-Calculation Not Working
- **Severity:** P1 — High
- **Role:** Nurse (Record Vitals form)
- **Steps:** Enter Weight (e.g., 72 kg) and Height (e.g., 175 cm) in Anthropometrics section
- **Observed:** BMI field shows "-" and does not auto-calculate
- **Expected:** BMI = Weight(kg) / Height(m)² = 72/1.75² = 23.5 — should auto-populate
- **Impact:** Clinical accuracy compromised; nurses must calculate manually

***

## 🟡 MEDIUM SEVERITY BUGS (P2)

### BUG-008: Search Returns False Matches (Sarah Johnson for "John" query)
- **Severity:** P2 — Medium
- **Role:** Receptionist (Check-In patient search)
- **Steps:** Search for "John" in the patient check-in search
- **Observed:** "Sarah Johnson" appears in results alongside John Davis and John Hernandez
- **Expected:** Search should match first names or MRN containing "John", not last names like "Johnson" (or should be clearly documented as full-name search)

### BUG-009: User Greeting Inconsistency Across Roles
- **Severity:** P3 — Low
- **Observed:** Doctor dashboard: "Good afternoon, CJ_Creator's Org!"; Nurse dashboard: "Good afternoon, CJ_Creator's!" (missing "Org"); Admin dashboard: "Good afternoon, CJ_Creator!" (further truncated)
- **Expected:** Consistent display name across all role dashboards

### BUG-010: Kiosk Mode Branding Inconsistency
- **Severity:** P3 — Low
- **Location:** Receptionist → Kiosk Mode modal header
- **Observed:** Header shows "AroCard Healthcare" branding but the hospital name is "My Hospital"
- **Expected:** Kiosk should display the configured hospital name, not a hardcoded fallback brand name

### BUG-011: Test Data Visible in Lab Orders (Test Name Shows "cimp" and "1")
- **Severity:** P3 — Low
- **Location:** Lab Orders queue
- **Observed:** Test names display as "cimp" and "1" — clearly invalid/test data artifacts
- **Expected:** Test data should be sanitized before demo; or validation should prevent single-character/nonsensical test names

### BUG-012: Today's Appointments Count Inconsistency Between Dashboard and Appointments Page
- **Severity:** P3 — Low
- **Observed:** Admin dashboard shows "Today's Appointments: 2"; Receptionist dashboard shows "Today's Appointments: 1"
- **Expected:** All role dashboards should reflect the same live appointment count

### BUG-013: New Lab Order Form — Category Dropdown Clears Test Name Input
- **Severity:** P3 — Low
- **Steps:** Type test name → click Category dropdown → test name disappears
- **Expected:** Focus on dropdown should not clear other field values

***

## ✅ FEATURES WORKING CORRECTLY

| Feature | Role | Status |
|---|---|---|
| Administer Medication (full flow) | Nurse | ✅ Working |
| Care Protocols checklist with progress tracking | Nurse | ✅ Working |
| Shift Handover creation (submission) | Nurse | ✅ Working (counter bug noted) |
| Patient Check-Out (5-step wizard) | Receptionist | ✅ Working |
| Schedule New Appointment | Receptionist | ✅ Working |
| Walk-In Registration search | Receptionist | ✅ Working |
| Queue Optimization (Run Optimization) | Receptionist | ✅ Working |
| Kiosk Mode UI | Receptionist | ✅ Working (branding issue noted) |
| Sample Collection (Collect button) | Lab Technician | ✅ Working |
| Lab Automation Dashboard | Lab Technician | ✅ Working |
| Discard Unsaved Changes dialog | Lab Technician | ✅ Working |
| Reports & Analytics (all 4 tabs) | Administrator | ✅ Working |
| Hospital Settings (save) | Administrator | ✅ Working |
| Staff Management / Invitations view | Administrator | ✅ Working |
| Activity Logs with HIPAA export | Administrator | ✅ Working |
| System Monitoring (uptime, response time) | Administrator | ✅ Working |
| Billing & Finance (invoice list) | Administrator | ✅ Working |
| Workflow Dashboard | Administrator | ✅ Working |
| AI Clinical Intelligence Banner (NEWS2/qSOFA) | Nurse | ✅ Working |
| Quick Templates in Nurse Notes | Nurse | ✅ Working |
| Role Switcher (Test Mode dropdown) | All | ✅ Working (when accessed in-session) |
| Appointment counter increments correctly | Receptionist | ✅ Working |
| Insurance Claims / Payment Plans tabs | Administrator | ✅ Working |

***

## 📊 SUMMARY METRICS

| Category | Count |
|---|---|
| P0 Critical (Blockers) | **5** |
| P1 High | **2** |
| P2 Medium | **1** |
| P3 Low | **5** |
| **Total Bugs** | **13** |
| Features Verified Working | 22+ |

***

## 🏗️ TOP PRIORITY RECOMMENDATIONS

1. **Fix Role Persistence (BUG-001):** Store test mode role in `localStorage` or session cookie so it survives full page navigations. This is prerequisite for stable QA testing of all other features.

2. **Fix Pharmacy Module (BUG-002):** The `require is not defined` error suggests a dependency is using CommonJS syntax in an ESM bundle. Audit the pharmacy module's imports and replace `require()` with ES module `import` statements.

3. **Run DB Migrations (BUG-003, BUG-004):** The `public.lab_queue` table and `staff_invitations_invited_by_fkey` constraint indicate schema drift. Run pending migrations and ensure the test environment database is in sync with the application schema.

4. **Fix Smart Scheduler Route (BUG-005):** Either implement the `/scheduler` route or remove the navigation link until it's ready. A 404 on a featured navigation item creates a bad impression.

5. **Fix Nurse Vitals Submission (BUG-006):** The silent failure in "Complete Preparation" is the most impactful clinical workflow bug. Add proper error logging, backend validation feedback, and a visible error state to the submit button.