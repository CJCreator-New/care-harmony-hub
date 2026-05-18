## Doctor Role — End-to-End Issues Report

Here is every issue found across the Doctor flow, tested in order:

***

## 🔴 Critical Issues

### 1. Consultation — Start Consultation Patient Search is Completely Broken [localhost](http://localhost:8080/consultations)
- Clicking "Start Consultation" shows "No patients found matching '[query]'" for **any** search term, including known patients like "Thomas"
- A Doctor **cannot start a new consultation** via this modal — the patient search returns zero results regardless of input
- Root cause appears to be a different data-fetching path than the Appointments modal (which does work)

### 2. Complete Consultation → Database Error: Missing `workflow_events` Table [localhost](http://localhost:8080/consultations)
- On completing Step 5 (Summary & Handoff), the system throws: **"Workflow error: Could not find the table 'public.workflow_events' in the schema cache"**
- The consultation itself completes, but the workflow event cannot be persisted — the consultations list also briefly stalls on "Loading..." after this error
- This table is missing from the database schema entirely

### 3. `__ENCRYPTED__v1` Tokens Displayed as Raw Text [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- **4 instances** across Step 5 (Summary & Handoff):
  - Chief Complaint → `__ENCRYPTED__v1`
  - Clinical Notes field → `__ENCRYPTED__v1`
  - SOAP Notes — Subjective (S) field → `__ENCRYPTED__v1`
  - (Same pattern in SOAP — O, A, P fields are blank/empty)
- Encrypted data tokens are **not being decrypted** before display — they render as literal strings in the doctor-facing UI
- This directly contradicts the "HIPAA Compliant" claim on the Voice Clinical Notes page

### 4. Pharmacy Page — Blank White Screen (No Access Denied, No Error) [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- Navigating to `/pharmacy` as a Doctor renders a **completely blank page** with no sidebar, no content, no error message
- Should either show an "Access Denied" screen or be hidden from navigation entirely
- Instead it silently fails — a security and UX concern

***

## 🟠 High Severity Issues

### 5. Appointments — Patient Picker Shows "No patients available" on Initial Load [localhost](http://localhost:8080/appointments)
- The Schedule Appointment modal shows "No patients available" until the user types a search query
- Inconsistent with a proper UX — patient list should populate automatically (all 50 patients) so doctors can browse without needing to know the exact name

### 6. Appointments — Doctor Dropdown Only Shows 1 Doctor ("Dr. CJ_Creator's Org") [localhost](http://localhost:8080/appointments)
- The appointment doctor selector only has one option despite the system supposedly having multiple staff
- Reflects the underlying Staff Management data issue (0 registered staff in the DB)

### 7. Appointments — List View Toggle Non-Functional [localhost](http://localhost:8080/appointments)
- Clicking "List" view button does nothing — the calendar view persists with no change
- Confirmed in Doctor role (also broken in Admin role)

### 8. Consultations — Prescriptions "+" Button is Non-Functional [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- On Step 4 (Treatment Plan), clicking "+" next to Prescriptions does nothing — no row added, no modal opened
- A Doctor **cannot add any prescription** during the consultation workflow

### 9. Telemedicine — Patient Selector Dropdown is Non-Functional [localhost](http://localhost:8080/telemedicine)
- "Start New Call" modal's patient dropdown doesn't open when clicked — no options appear
- Doctor cannot initiate a telemedicine call

### 10. Telemedicine — No Validation When Starting Call Without a Patient [localhost](http://localhost:8080/telemedicine)
- Clicking "Start Call" with no patient selected shows no validation error — the dialog simply stays open silently
- Missing required field validation

### 11. AI Differential Diagnosis — Silently Fails [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- Clicking "Generate AI Suggestions" on Step 3 (Diagnosis) does nothing — no loading state, no suggestions, no error message
- Complete silent failure of an AI feature

### 12. CareSync AI Assistant Panel — Persistently Overlaps Patient Info Sidebar [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- The CareSync AI Assistant panel repeatedly opens and overlaps the right-side Patient Info panel throughout the consultation workflow
- It doesn't auto-dismiss and obscures critical patient data (allergies, chronic conditions, current medications)
- Triggered inconsistently — appears and disappears across steps

***

## 🟡 Medium Severity Issues

### 13. Dashboard — "My Performance" Stats Disconnected from Live Data [localhost](http://localhost:8080/appointments)
- "My Performance" tab shows 18 daily patient throughput, 96% completion rate, "Top 5% in Department"
- These are **hardcoded/seeded performance numbers** that do not reflect actual data (Today's Patients = 0, Consultations Completed = 0 on Clinical Overview)
- Creates a false sense of performance data

### 14. Consultations List — "Using latest seeded consultation date" Debug Text in UI [localhost](http://localhost:8080/consultations)
- After completing a consultation, the 4th stat card changes to **"Latest Activity (Apr 7) — 1 — Using latest seeded consultation date"**
- This is internal seed/debug text exposed directly in the production interface

### 15. Consultations List — "1 stale" Label Under Active Count [localhost](http://localhost:8080/consultations)
- After completing Joseph Jones' consultation, Active shows **"0 — 1 stale"**
- "Stale" is technical jargon that is meaningless to a clinical user; should be "Overdue" or "Inactive"

### 16. Consultation Completion — Date Not Updated to Today [localhost](http://localhost:8080/consultations)
- The completed consultation for Joseph Jones still shows "Started: Apr 7, 2:15 PM" even though it was completed on Apr 24
- The consultation start date reflects the original seed date, not the actual current session date

### 17. Prescription Column Headers Truncated [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- On Step 4 Treatment Plan, the Prescription table headers read "Medicat[ion]", "Frequen[cy]", "Duration" — truncated due to limited column width
- No tooltip or full-text fallback

### 18. Treatment Plan Notes — Required But Not Marked as Such [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- The "Treatment Plan Notes" field is mandatory (clicking Next without it shows "Treatment Plan is required"), but the field has **no asterisk (*) or visual required indicator**
- Doctors will repeatedly hit this error without understanding why

### 19. Handoff — "Notify Pharmacy/Lab" Checkboxes Active When No Rx/Labs Exist [localhost](http://localhost:8080/consultations/f994cdaf-3c5a-4214-bb2c-6d28ba20426f)
- "Notify Pharmacy (for prescriptions)" and "Notify Laboratory (for lab orders)" checkboxes are enabled even when Prescriptions = 0 and Lab Orders = 0
- These should be automatically greyed out/disabled if there's nothing to send

### 20. Laboratory — "No patients available" on Initial Load in New Lab Order Modal [localhost](http://localhost:8080/laboratory)
- Same pattern as Appointments and Consultations — patient list doesn't populate unless you type
- Consistent UX bug across all patient-picker modals

### 21. Laboratory — TEST and CATEGORY Fields Both Show Same Value [localhost](http://localhost:8080/laboratory)
- John Davis's CBC order shows "CBC" in both the TEST column and the CATEGORY column
- Category should reflect the test category (e.g., Hematology) not duplicate the test name

### 22. Queue Management — Newly Scheduled Appointment Not Added to Queue [localhost](http://localhost:8080/queue)
- After scheduling an appointment for Thomas Anderson (Apr 24, 09:00), the Queue Management page continues to show 0 patients
- No automatic queue creation or patient check-in flow is triggered

***

## 🔵 Low Severity / UX Issues

### 23. Doctor Has "Register Patient" Button — Role Mismatch [localhost](http://localhost:8080/consultations)
- The Patients page shows a "Register Patient" button for the Doctor role
- Patient registration is typically a receptionist/admin task; Doctors shouldn't be registering new patients in a well-governed HIMS

### 24. Telemedicine, Voice Clinical Notes, Laboratory — Blank White Screen on Initial Navigation [localhost](http://localhost:8080/voice-clinical-notes)
- All three pages show a blank white page with generic title "CareSync AI | Comprehensive Hospital Management System" for ~3-5 seconds before rendering
- No skeleton/loading state is shown — appears broken until content loads

### 25. Business Operations — Section Visible in Sidebar Despite Doctor Having No Access [localhost](http://localhost:8080/billing)
- "Business Operations" appears as a non-expandable section in Doctor's sidebar
- Since Doctor cannot access Billing, Kiosk, or Reports, the entire section should be hidden from the sidebar to avoid confusion

### 26. Voice Clinical Notes — Always "Disconnected" on Load [localhost](http://localhost:8080/voice-clinical-notes)
- Voice input shows "disconnected" state immediately on page load with no explanation of why or how to resolve beyond "click Start Recording"
- No indication whether this is a permissions issue, a server issue, or expected behavior

***

## Summary Table

| # | Module | Issue | Severity |
|---|--------|--------|----------|
| 1 | Consultations | Start Consultation patient search broken — 0 results always | 🔴 Critical |
| 2 | Consultations | DB error on Complete: `workflow_events` table missing | 🔴 Critical |
| 3 | Consultations | `__ENCRYPTED__v1` tokens shown as plain text in Step 5 | 🔴 Critical |
| 4 | Pharmacy | Blank white screen instead of Access Denied | 🔴 Critical |
| 5 | Appointments | Patient picker empty on load — requires typing to see patients | 🟠 High |
| 6 | Appointments | Only 1 doctor available in dropdown | 🟠 High |
| 7 | Appointments | List View toggle non-functional | 🟠 High |
| 8 | Consultations | Prescriptions "+" button does nothing | 🟠 High |
| 9 | Telemedicine | Patient dropdown doesn't open | 🟠 High |
| 10 | Telemedicine | No validation when starting call without a patient | 🟠 High |
| 11 | Consultations | AI Differential Diagnosis silently fails | 🟠 High |
| 12 | Consultations | AI Assistant panel persists and overlaps patient info | 🟠 High |
| 13 | Dashboard | Performance stats hardcoded, not from live data | 🟡 Medium |
| 14 | Consultations | "Using latest seeded consultation date" debug text in UI | 🟡 Medium |
| 15 | Consultations | "1 stale" — technical jargon in clinical UI | 🟡 Medium |
| 16 | Consultations | Completed consultation shows original seeded start date | 🟡 Medium |
| 17 | Consultations | Prescription column headers truncated | 🟡 Medium |
| 18 | Consultations | Required "Treatment Plan Notes" not marked with asterisk | 🟡 Medium |
| 19 | Consultations | Notify Pharmacy/Lab checkboxes active with 0 Rx/Labs | 🟡 Medium |
| 20 | Laboratory | Patient picker empty on initial load | 🟡 Medium |
| 21 | Laboratory | TEST and CATEGORY columns show duplicate values | 🟡 Medium |
| 22 | Queue | Scheduling appointment doesn't populate queue | 🟡 Medium |
| 23 | Patients | "Register Patient" button shown to Doctor — role mismatch | 🔵 Low |
| 24 | Telemedicine/Voice/Lab | Blank white screen on navigation before page loads | 🔵 Low |
| 25 | Sidebar | "Business Operations" visible to Doctor despite no access | 🔵 Low |
| 26 | Voice Notes | Voice always "disconnected" — no clear resolution path | 🔵 Low |

**Total: 4 Critical · 8 High · 10 Medium · 4 Low = 26 issues found in the Doctor flow**