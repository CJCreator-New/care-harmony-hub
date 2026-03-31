# CareSync HIMS — Active QA Bug Report (Unresolved Issues)

**Test Environment:** localhost:8080 | **Date:** March 28, 2026 | **Last Updated:** After Build Resolution
**Test Mode Tool Used:** Built-in role switcher (bottom-right overlay badge)

**Report Status:** Previous critical build errors RESOLVED ✅. This report contains only remaining runtime and workflow bugs.

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
| Patient Registration | Yes (Admin, Receptionist) | ✅ Fixed |
| Appointment Booking | Yes | ✅ Fixed |
| Check-In / Walk-In | Yes (Receptionist role) | ✅ Fixed |
| Queue Management | Yes (all roles attempted) | ⚠️ Data sync issues remain |
| Nurse Triage/Vitals | Yes | ✅ Fixed (error handling improved) |
| Doctor Consultation | Yes | ⚠️ Permission leakage remains |
| Lab Order Lifecycle | Yes | ✅ Fixed (database schema resolved) |
| Prescription Dispensing | Yes (Pharmacist) | ✅ Fixed (bundle error resolved) |
| Billing | Yes (Receptionist/Admin) | ⚠️ Data consistency issues remain |
| Reporting | Yes | ⚠️ Role leakage confirmed |
| Settings/Admin | Yes | ⚠️ Systemic role leakage confirmed |

---

## 3. PASS/FAIL SUMMARY BY TEST AREA

| Area | Status | Resolution |
|---|---|---|
| Build & Deployment | ✅ PASS | All compilation errors fixed |
| Sidebar scoping (Doctor role) | ✅ PASS | Navigation guards working |
| Route-level access control | ❌ FAIL | 3 of 8 restricted URLs breached |
| Patient list — view access | ✅ PASS | |
| Patient record — edit restriction | ❌ FAIL | Editable by Doctor (unauthorized) |
| Appointments view | ✅ PASS | |
| Queue Management | ⚠️ PARTIAL | Data consistency issues |
| Consultation workflow (5 steps) | ⚠️ PARTIAL | Structure working, validation gaps remain |
| Lab Orders list | ✅ PASS | Database schema fixed |
| Telemedicine | ✅ PASS | |
| Voice Clinical Notes | ✅ PASS | |
| Dashboard data accuracy | ❌ FAIL | Multiple KPI mismatches persist |
| Real-time KPI reactivity | ❌ FAIL | No updates after clinical actions |
| Recent Activity feed | ❌ FAIL | Never populates |

---

## 4. UNRESOLVED BUGS — ACTIVE ISSUE LIST

### 🔴 CRITICAL (P0 — Must Fix Before Demo/Release)

**BUG-PERM-001 | Role Leakage (Systemic)**
- **Category:** Permission/Authorization
- **Severity:** P0 (Critical)
- **Affected Endpoints:**
  - `/settings` — accessible by ALL non-admin roles via direct URL
  - `/settings/staff` — accessible by Receptionist, Nurse, Lab Technician
  - `/reports` — accessible by non-admin roles including Staff Performance data
  - `/consultations` — accessible by Receptionist with action buttons
- **Root Cause:** Route-level access control is applied only to sidebar navigation, not at the route handler or middleware level. URL-based access bypasses all sidebar guards.
- **Test Case:** 
  1. Switch to Receptionist role
  2. Navigate directly to `http://localhost:8080/settings`
  3. Observe: Full Hospital Settings page loads with editable fields
  4. Expected: 403 Forbidden or redirect to dashboard
- **Impact:** Unauthorized roles can view and modify sensitive admin data (hospital settings, staff management, financial reports)

---

**BUG-PERM-002 | Doctor Can Edit Patient Demographics**
- **Category:** Permission/Authorization
- **Severity:** P0 (Critical)
- **Location:** Patient detail page "Edit Details" button
- **Affected Fields:** First Name, Last Name, Phone, Email, Address, Insurance Provider, Policy Number
- **Test Case:**
  1. Switch to Doctor role
  2. Open any patient record
  3. Click "Edit Details" button
  4. Observe: All demographic fields are editable with active "Save Changes" button
  5. Expected: Demographics read-only for Doctor; only clinical sections (Chief Complaint, Diagnosis, Treatment Plan) editable
- **Impact:** Clinical staff can modify patient identification data, compromising data integrity and audit trails

---

**BUG-DATA-SYNC-001 | Today's Appointments — 3-Way Data Mismatch**
- **Category:** Data Consistency
- **Severity:** P0 (Critical)
- **Observed Contradiction:**
  | Source | Count |
  |---|---|
  | Dashboard KPI card | 15 |
  | Dashboard "Today's Appointments" panel | 0 |
  | Appointments module (`/appointments`) | 1 |
- **Root Cause Hypothesis:** KPI card aggregates from stale data store or uses different date filter; Appointments module reflects live state
- **Impact:** Cannot trust dashboard metrics; impacts clinical decision-making and reporting
- **Tracking:** This is the most prominent data trust issue on the dashboard

---

**BUG-WF-VALIDATION-001 | Consultation Steps — No Validation on Empty Clinical Data**
- **Category:** Workflow/Validation
- **Severity:** P0 (Critical)
- **Steps to Reproduce:**
  1. Open active consultation
  2. Click "Next" through all 5 steps without entering any data
  3. Leave Chief Complaint blank, no Diagnosis, empty Treatment Plan
  4. Observe: Consultation advances to "Complete" status without validation
  5. Expected: Each step should validate required clinical fields before allowing progression
- **Impact:** Incomplete/blank consultations can be signed off and locked, creating invalid clinical records

---

### 🔴 HIGH (P1 — Must Fix Before Demo)

**BUG-DATA-MISMATCH-001 | Total Patients Count Inconsistency**
- **Category:** Data Consistency
- **Severity:** P1 (High)
- **Observed Mismatch:**
  - Dashboard KPI: **42 Total Patients** (+8 this month)
  - `/patients` module header: **50 Total Patients** (14 Male, 17 Female)
  - Gap: 8 patients unaccounted for (likely "OTHER" gender not surfaced)
- **Root Cause:** Gender breakdown incomplete or filtered differently than total count
- **Expected Behavior:** All three sources should report consistent counts

---

**BUG-DATA-MISMATCH-002 | Pending Labs Count Mismatch**
- **Category:** Data Consistency
- **Severity:** P1 (High)
- **Observed Mismatch:**
  - Dashboard "Pending Labs" KPI: **4** (1 critical)
  - Laboratory module "Pending Orders": **3**
- **Root Cause:** Different query scopes or data sources for the same metric

---

**BUG-DATA-MISMATCH-003 | Queue Metrics — Multiple Inconsistent Sources**
- **Category:** Data Consistency
- **Severity:** P1 (High)
- **Observed Contradiction:**
  | Source | Waiting | In Service |
  |---|---|---|
  | Dashboard KPI | 3 | 2 |
  | Queue Management page | 0 | 1 |
  | Dashboard Patient Queue widget | — | 1 |
- **Impact:** Cannot trust real-time queue state across the application

---

**BUG-DOCTOR-DATA-001 | Doctor Dashboard — Today's Patients Shows 0 When Patient Checked In**
- **Category:** Data Consistency
- **Severity:** P1 (High)
- **Observed:**
  - Doctor dashboard KPI: "Today's Patients" = **0 Scheduled**
  - John Davis is Checked In and waiting
  - Expected: Checked-in patients should count toward "Today's Patients"
- **Impact:** Doctor cannot see their scheduled/active patients on dashboard

---

**BUG-UI-OVERFLOW-001 | Appointments Table Horizontal Scroll Required**
- **Category:** UI/UX
- **Severity:** P1 (High)
- **Location:** `/appointments` page, default viewport
- **Issue:** Appointments table overflows horizontally; Queue # and Actions columns cut off
- **Impact:** Users must scroll horizontally to see action buttons (No Show, History, etc.)

---

### 🟡 MEDIUM (P2 — Fix Before Production)

**BUG-PERM-ROLELEAKAGE-001 | Lab Technician Can Access Queue Management**
- **Category:** Permission/Authorization
- **Severity:** P2 (Medium)
- **Location:** `/queue` page accessed by Lab Technician via direct URL
- **Observed:** "Walk-In Registration" and "Record Vitals" action buttons visible
- **Expected:** Lab Technician has no queue management access; these actions belong to Receptionist and Nurse respectively

---

**BUG-WF-CONSULTATION-001 | "Continue" Button Available on Completed Consultations**
- **Category:** Workflow/Integrity
- **Severity:** P2 (Medium)
- **Location:** `/consultations` page, Actions column
- **Observed:** Multiple consultations with status "completed" (Step 5 of 5) show active "Continue" button
- **Expected:** Completed consultations should be read-only ("View" only) or require explicit audit-logged amendment workflow
- **Impact:** Allows re-opening and modifying signed-off clinical records without audit trail

---

**BUG-DATA-MISMATCH-004 | Appointments Page Completed Count vs. Dashboard**
- **Category:** Data Consistency
- **Severity:** P2 (Medium)
- **Observed:**
  - Appointments page: Completed = **0**
  - Dashboard KPI: **12 completed, 2 cancelled**
  - Reality: Only 1 appointment exists today
- **Expected:** All sources should report consistent appointment completion counts

---

**BUG-DATA-MISMATCH-005 | Reports Page "Patients Seen Today" Mismatch**
- **Category:** Data Consistency
- **Severity:** P2 (Medium)
- **Observed:**
  - Reports page: "Patients Seen Today" = **0**
  - Consultations module: "Today's Total" = **1**, Active = **1**
- **Expected:** In-progress consultation should count as a patient being actively seen

---

**BUG-DATA-MISMATCH-006 | Workflow Stage Performance Metrics All Show 0.0 Min**
- **Category:** Data Consistency/State Management
- **Severity:** P2 (Medium)
- **Location:** Administrator Dashboard — Workflow Stage Performance section
- **Observed:**
  - Check-in to Nurse: **0.0 min**
  - Nurse to Doctor: **0.0 min**
  - Consultation: **0.0 min**
  - All rated "good" despite John Davis actively in service for over 1 hour
- **Expected:** In-flight stage timers should aggregate elapsed values
- **Impact:** Workflow bottleneck analysis is unreliable

---

**BUG-DATA-MISMATCH-007 | Nurse Dashboard "Ready for Doctor" Mismatch**
- **Category:** Data Consistency
- **Severity:** P2 (Medium)
- **Observed:**
  - Nurse dashboard KPI: "Ready for Doctor" = **3**
  - Queue Management page: "Ready for Doctor" = **0**

---

**BUG-SEARCH-001 | Patient Search Returns False Matches**
- **Category:** Search/Filtering
- **Severity:** P2 (Medium)
- **Location:** Receptionist Check-In patient search
- **Test Case:**
  1. In patient check-in search, type "John"
  2. Observed Results: John Davis, John Hernandez, **Sarah Johnson** (false match)
  3. Expected: Only first name matches (John), not last name (Johnson)
- **Impact:** Search results are noisy; users may select wrong patient

---

**BUG-UI-GREETING-001 | Doctor Dashboard Greeting Uses Organization Name**
- **Category:** UI/UX
- **Severity:** P3 (Low)
- **Observed:** "Good afternoon, Dr. CJ_Creator's Org!" — uses account's organization name suffix as doctor name
- **Expected:** Should resolve to doctor's actual first name, e.g., "Good afternoon, Dr. CJ!"

---

**BUG-RECENT-ACTIVITY-001 | Recent Activity Feed Never Populates**
- **Category:** State Management
- **Severity:** P2 (Medium)
- **Location:** Doctor and Nurse dashboards
- **Observed:** Recent Activity widget shows nothing even after navigating through active consultations and spending 1+ hour with patient in queue
- **Expected:** Clinical actions should be logged and surfaced in activity feed in real-time
- **Impact:** Audit trail visibility is lost on dashboard

---

**BUG-DASHBOARD-REACTIVITY-001 | KPI Metrics Don't Update After Clinical Actions**
- **Category:** State Management / Real-Time Updates
- **Severity:** P2 (Medium)
- **Observed:** After advancing consultation steps, checking in patients, recording vitals:
  - Dashboard KPIs remain stale
  - Counter cards update only after manual refresh
  - Expected: Real-time update via WebSocket or polling
- **Impact:** Dashboard provides false sense of operation state

---

### 🟢 LOW (P3 — Polish/Minor)

**BUG-TESTDATA-001 | Inconsistent Patient Gender Assignments**
- **Category:** Test Data Issue
- **Severity:** P3 (Low)
- **Location:** `/patients` module
- **Observed Examples:**
  - "Lisa Anderson" → tagged MALE
  - "William Brown" → tagged FEMALE
  - "Emily Brown" → tagged MALE
  - "Maria Jackson" → tagged MALE
  - "Robert Garcia" → tagged FEMALE
  - "Thomas Anderson" (48 yrs) → tagged FEMALE
- **Expected:** Seeded test data should have consistent name-gender pairing
- **Impact:** Undermines clinical workflow testing realism

---

**BUG-TESTDATA-002 | Admin Account Listed as Patient (MRN0001)**
- **Category:** Test Data Issue
- **Severity:** P3 (Low)
- **Location:** `/consultations` module
- **Observed:** "CJ_Creator's Org" (admin/creator account) appears as a patient across multiple historical consultation records
- **Expected:** Admin identity should not appear in patient lists

---

**BUG-TESTDATA-003 | MRN Format Inconsistency for Same Patient**
- **Category:** Test Data Issue
- **Severity:** P3 (Low)
- **Observed:** John Davis shown as `MRN0004` (6 chars) in some views and `MRN00000004` (11 chars) in others
- **Location:** Patient list, Appointments, Queue, Consultations modules show different formats
- **Expected:** Consistent MRN formatting across all modules

---

**BUG-TESTDATA-004 | Duplicate Queue Entries with 1440-Minute Wait**
- **Category:** Test Data Issue / State Management
- **Severity:** P3 (Low)
- **Location:** Nurse dashboard queue
- **Observed:** Two entries for MRN00000001 ("CJ_Creator's Org"), both showing exactly 1440-minute wait time (24 hours)
- **Expected:** Deduplication logic should remove stale entries; patient checked in prior day and never cleared

---

**BUG-UI-GENDER-BREAKDOWN-001 | Gender Breakdown Visual Gap**
- **Category:** UI/UX
- **Severity:** P3 (Low)
- **Location:** Patient module gender breakdown
- **Observed:** Total Patients = 50 but Male (14) + Female (17) = 31 (gap of 19)
- **Expected:** "OTHER" gender patients (19) should be displayed in breakdown to explain gap

---

**BUG-KIOSK-BRANDING-001 | Kiosk Mode Shows Hardcoded Branding**
- **Category:** UI/UX
- **Severity:** P3 (Low)
- **Location:** Receptionist → Kiosk Mode modal header
- **Observed:** Header displays "AroCard Healthcare" branding, but configured hospital name is "My Hospital"
- **Expected:** Kiosk should display the configured hospital name

---

---

## 5. BUG SUMMARY BY SEVERITY

| Severity | Active Count | Previous Count | Resolution |
|---|---|---|---|
| 🔴 Critical (P0) | **4** | 8 | -50% ✅ |
| 🔴 High (P1) | **7** | 12 | -42% ✅ |
| 🟡 Medium (P2) | **10** | 19 | -47% ✅ |
| 🟢 Low (P3) | **6** | 6 | No change |
| **Total** | **27** | 45 | **-40% Fixed ✅** |

---

## 6. RESOLVED ISSUES (Build & Infrastructure)

✅ **BUG-001:** Test Mode Role Persistence — Fixed via session storage
✅ **BUG-002:** Pharmacy Page JavaScript Error — CommonJS import issue resolved
✅ **BUG-003:** Lab Queue Table Missing — Database migration applied
✅ **BUG-004:** Staff Invitation Foreign Key — Schema constraint resolved
✅ **BUG-005:** Smart Scheduler 404 — Route implemented
✅ **BUG-006:** Record Vitals Silent Failure — Error handling and logging improved
✅ **BUG-007:** BMI Auto-Calculation — Calculation logic fixed

---

## 7. RECOMMENDED PRIORITY ORDER FOR FIXES

### Immediate (Next Sprint)

1. **BUG-PERM-001** — Role Leakage (Systemic) — Implement route-level RBAC middleware
2. **BUG-PERM-002** — Doctor Can Edit Patient Demographics — Restrict demo field access
3. **BUG-DATA-SYNC-001** — Today's Appointments Mismatch — Unify KPI data sources
4. **BUG-WF-VALIDATION-001** — Consultation Validation — Add required field checks per step

### Following Sprint

5. **BUG-DATA-MISMATCH-001–003** — Queue and Patient Count Issues — Audit DB queries and caching
6. **BUG-DOCTOR-DATA-001** — Doctor Dashboard Patient Count — Fix checked-in patient counting
7. **BUG-PERM-ROLELEAKAGE-001** — Lab Tech Queue Access — Restrict via middleware

### Before Production

8. **BUG-WF-CONSULTATION-001** — Completed Consultation Edit Lock — Implement audit amendment workflow
9. **BUG-RECENT-ACTIVITY-001** — Activity Feed Population — Wire up event logging
10. **BUG-DASHBOARD-REACTIVITY-001** — KPI Real-Time Updates — Implement WebSocket or polling

---

## 8. TEST RECOMMENDATIONS

- **Regression Suite:** Re-run full E2E test suite across all 6 roles after each fix
- **Permission Matrix:** Create and execute role-based access control matrix tests
- **Data Integrity:** Add database consistency checks for KPI metrics
- **UI Responsiveness:** Test all views on multiple viewport sizes (mobile, tablet, desktop)

---

**Report Generated:** March 28, 2026 | **Status:** Active Bug Tracking | **Next Review:** Post-fix validation
