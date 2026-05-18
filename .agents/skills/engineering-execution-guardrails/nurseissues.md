## Nurse Role — End-to-End Issues Report

Here is every issue found across the Nurse flow, grouped by severity:

***

## 🔴 Critical Issues

### 1. Record Vitals — Patient Picker Returns No Patients at All [localhost](http://localhost:8080/dashboard)
- The "Record Vitals" quick action opens a modal where the **patient dropdown shows "No patients available"** and **no search query returns results** either
- Unlike other roles where the picker works after typing, the Nurse's Record Vitals patient picker is completely broken regardless of input
- A Nurse **cannot record vitals** via the primary "Record Vitals" quick action button

### 2. "Complete Prep & Notify Doctor" Button is Non-Functional [localhost](http://localhost:8080/dashboard)
- After clicking "Start Prep" on a queued patient and filling in vitals + chief complaint, clicking "Complete Prep & Notify Doctor" does **absolutely nothing** — no response, no toast, no error, no page change
- The core Nurse workflow of prepping a patient and handing off to the Doctor is **completely broken**
- The Prep Station tab continues to show "All Clear — No patients in the prep station" after the failed submission

### 3. Nurse Has Full "Start Consultation" Access — Wrong Role Permission [localhost](http://localhost:8080/consultations)
- Consultations page shows a **"+ Start Consultation" button** for the Nurse role
- Starting a clinical consultation is a Doctor-only action; Nurses should only be able to view existing consultations for handoff context, not initiate new ones

***

## 🟠 High Severity Issues

### 4. Record Vitals Modal — Search Field and Dropdown Are Disconnected [localhost](http://localhost:8080/dashboard)
- The "Patient Preparation" modal (opened by Record Vitals) has two separate elements: a search text box and a dropdown
- Typing in the search box does **not filter the dropdown** — they are functionally disconnected
- Typing in the search box only changes the message inside the dropdown to "No matching patients" but never surfaces results

### 5. Care Protocols Page — "No patients available for protocol assignment" [localhost](http://localhost:8080/nurse/protocols)
- The Care Protocols page at `/nurse/protocols` shows an empty patient dropdown with **no patients available**
- The entire page is just a patient selector with no protocol library, no pre-built checklists, no templates — no functional content at all
- A Nurse **cannot assign any care protocol** to any patient

### 6. Dashboard — Patient Queue Stat Card Shows 0 Despite 1 Patient in Queue [localhost](http://localhost:8080/dashboard)
- Dashboard stat card "Patients in Queue" = **0** but the Patient Queue section below shows **1 patient** (CJ_Creator's Org)
- The stat cards do not reflect the actual queue data visible on the same page

### 7. Queue Management — "Waiting" and "Ready for Doctor" Showing Same Patient Simultaneously [localhost](http://localhost:8080/queue)
- After Walk-In Registration, John Davis appears in **both** the "Waiting Queue" section and the "Ready for Doctor" section
- Stats show Waiting: 1 and Ready for Doctor: 1, but it's the same patient — these should be mutually exclusive states
- A newly checked-in patient should be in "Waiting", not "Ready for Doctor", until a nurse completes prep

### 8. Walk-In Check-In Skips Nurse Prep — Patient Goes Directly to "Ready" [localhost](http://localhost:8080/queue)
- After Confirm Registration, John Davis's status immediately shows **"Ready"** without going through any vitals recording or nurse prep
- The intended flow should be: Check-In → Nurse records vitals → Nurse marks Ready for Doctor. Steps 2 and 3 are being skipped entirely

***

## 🟡 Medium Severity Issues

### 9. Dashboard Patient Queue — Stale Test Data With Multiple Invalid Values [localhost](http://localhost:8080/dashboard)
- Patient "#3 CJ_Creator's Org" in the queue shows **three simultaneous data errors**:
  - Age: **"0 yrs"** (invalid)
  - Wait time: **"1440 min"** = 24 hours (clearly stale seed data)
  - Check-in time: **"3:22 PM"** when current time is 1 PM (future timestamp)
- Patient name **"CJ_Creator's Org"** is the account/org name used as a patient name

### 10. "Offline Vitals" Opens Same Modal as "Record Vitals" With No Distinction [localhost](http://localhost:8080/dashboard)
- Clicking "Offline Vitals" opens the identical broken "Patient Preparation" modal
- There is no differentiation between online and offline vitals recording — no offline mode toggle, no cached data workflow, no explanation of what "Offline" means

### 11. Mobile Entry — Patient ID is a Free-Text Field With No Validation [localhost](http://localhost:8080/dashboard)
- The "Quick Vitals Entry" modal uses a plain text **Patient ID field** (placeholder "P12345") with no patient lookup or validation
- A nurse can type any arbitrary string; there is no check that the ID exists in the system
- No Heart Rate field in this modal (present in Start Prep but missing here — inconsistent vitals set)

### 12. Mobile Entry — "RR (bpm)" Label Is Ambiguous [localhost](http://localhost:8080/dashboard)
- The Respiratory Rate field is labeled **"RR (bpm)"** — "RR" is a medical abbreviation that non-specialist staff may not recognize
- Should be spelled out as "Respiratory Rate (/min)" and the unit should be "/min" not "bpm"

### 13. Mobile Entry — Chief Complaint Labeled as "Optional notes" [localhost](http://localhost:8080/dashboard)
- In the Quick Vitals Entry modal, the Chief Complaint field uses placeholder text **"Optional notes..."** instead of "Chief Complaint"
- Inconsistent with the Start Prep modal where Chief Complaint is a required labeled field with an asterisk (*)

### 14. Administer Medication — No "Time of Administration" Field [localhost](http://localhost:8080/dashboard)
- The Record Medication Administration modal has Medication Name, Dosage, Route, Status, Notes — but **no timestamp/time of administration field**
- Time of administration is a critical safety field in medication records (required for MAR - Medication Administration Record)

### 15. Administer Medication — Free-Text Medication Name, Not Pulled from Prescriptions [localhost](http://localhost:8080/dashboard)
- Medication Name is a plain text field — a nurse can type any medication name (e.g., "Paracetamol") with no validation against the patient's active prescriptions
- Should auto-populate or suggest from the patient's current prescribed medications

### 16. Create Handover — No "Receiving Nurse" Field [localhost](http://localhost:8080/dashboard)
- The Create Shift Handover modal has Shift Type, Critical Patients, Pending Tasks — but **no field to specify who the handover is being handed to**
- Critical gap: handover records should identify both the outgoing and incoming nurse

### 17. Create Handover — Critical Patients Uses Free-Text Name [localhost](http://localhost:8080/dashboard)
- The "Critical Patients" section asks for a patient name as plain text — no search or lookup
- Should be a patient selector to ensure accuracy and link to the actual patient record

### 18. Create Handover — Validation Message Is Vague Toast, Not Inline Error [localhost](http://localhost:8080/dashboard)
- Submitting without any content shows a toast: **"Add notes, critical patients, or pending tasks before submitting"**
- No inline field highlighting, no clear indication of which section needs content

### 19. Pharmacy Sidebar Link Visible to Nurse Despite Access Denied [localhost](http://localhost:8080/pharmacy)
- The sidebar shows **"Pharmacy & Inventory > Pharmacy"** as a clickable link for the Nurse role
- Clicking it shows "Access Denied — Required roles: admin, pharmacist"
- Sidebar links that lead to access-denied pages should be hidden for roles that don't have access

### 20. Multiple Pages — Blank White Screen on Initial Navigation [localhost](http://localhost:8080/patients)
- Patients, Queue Management, Consultations, Pharmacy, Laboratory all start with a blank white page for ~4-5 seconds before rendering
- No loading skeleton or spinner shown — consistently appears broken on initial load across all modules

***

## 🔵 Low Severity / UX Issues

### 21. Blood Pressure Placeholder Labels Truncated in Start Prep Modal [localhost](http://localhost:8080/dashboard)
- Blood Pressure fields show placeholder text **"Systoli"** and **"Diasto"** (truncated from "Systolic" and "Diastolic")
- Caused by insufficient column width for placeholder text

### 22. Nurse Has "Register Patient" Button — Role Appropriateness Question [localhost](http://localhost:8080/patients)
- Patients page shows "Register Patient" button for the Nurse role
- Patient registration is a receptionist/admin function; Nurses should typically not be the ones creating new patient records

### 23. Dashboard Greeting Uses Account Name, Not Personal Name [localhost](http://localhost:8080/dashboard)
- Dashboard greeting says **"Good afternoon, CJ_Creator's!"** — uses the account/org name rather than the actual user's personal name
- The possessive apostrophe ("CJ_Creator's!") makes grammatically odd greeting text

### 24. Care Protocols — Page Accessible Via Sidebar But Not Listed in Sidebar Navigation [localhost](http://localhost:8080/nurse/protocols)
- Care Protocols navigates to `/nurse/protocols` — this URL is only reachable from the dashboard quick action, not from the sidebar
- The sidebar has no "Care Protocols" entry, making it undiscoverable without the dashboard button

***

## Summary Table

| # | Module | Issue | Severity |
|---|--------|--------|----------|
| 1 | Record Vitals | Patient picker returns 0 patients — nurse can't record vitals | 🔴 Critical |
| 2 | Start Prep | "Complete Prep & Notify Doctor" is non-functional | 🔴 Critical |
| 3 | Consultations | Nurse can Start Consultation — wrong role permission | 🔴 Critical |
| 4 | Record Vitals | Search field and dropdown are disconnected | 🟠 High |
| 5 | Care Protocols | No patients load; page has no content | 🟠 High |
| 6 | Dashboard | Stat card shows 0 patients but 1 exists in queue below | 🟠 High |
| 7 | Queue Management | Same patient appears in Waiting AND Ready for Doctor | 🟠 High |
| 8 | Walk-In Registration | Patient goes directly to "Ready" skipping nurse prep | 🟠 High |
| 9 | Dashboard Queue | Stale patient: 0 yrs, 1440 min wait, future check-in time | 🟡 Medium |
| 10 | Offline Vitals | Opens same broken modal as Record Vitals — no distinction | 🟡 Medium |
| 11 | Mobile Entry | Patient ID is free text with no lookup or validation | 🟡 Medium |
| 12 | Mobile Entry | "RR (bpm)" label is ambiguous; unit is wrong | 🟡 Medium |
| 13 | Mobile Entry | Chief Complaint labeled "Optional notes" — inconsistent | 🟡 Medium |
| 14 | Administer Medication | No time of administration field | 🟡 Medium |
| 15 | Administer Medication | Free-text medication name, not from prescriptions | 🟡 Medium |
| 16 | Create Handover | No "Receiving Nurse" field | 🟡 Medium |
| 17 | Create Handover | Critical Patients uses free-text, not patient lookup | 🟡 Medium |
| 18 | Create Handover | Vague toast validation instead of inline errors | 🟡 Medium |
| 19 | Sidebar | Pharmacy link visible to Nurse despite access denied | 🟡 Medium |
| 20 | All modules | Blank white screen on initial navigation (no loading state) | 🟡 Medium |
| 21 | Start Prep Modal | BP placeholders truncated to "Systoli" / "Diasto" | 🔵 Low |
| 22 | Patients | "Register Patient" button available to Nurse | 🔵 Low |
| 23 | Dashboard | Greeting uses account name not personal name | 🔵 Low |
| 24 | Care Protocols | Not in sidebar navigation — only accessible from dashboard | 🔵 Low |

**Total: 3 Critical · 5 High · 12 Medium · 4 Low = 24 issues found in the Nurse flow**