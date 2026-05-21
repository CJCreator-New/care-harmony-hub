Here is the **consolidated CareSync HIMS — End-to-End QA Master Report**, combining all findings from all 5 roles into a single, structured document.

***

# CareSync HIMS — Consolidated End-to-End QA Report

**Date:** May 18, 2026 | **Environment:** localhost:8080 | **Tester:** Automated E2E Review
**Roles Covered:** Receptionist · Pharmacist · Doctor · Nurse · Administrator

***

## Severity Legend
- 🔴 **Critical** — Blocks core workflow, data loss risk, compliance/safety concern
- 🟠 **High** — Major functional failure, significant user impact
- 🟡 **Medium** — Functional gap or confusing UX
- 🔵 **Low** — Polish, copy, or minor cosmetic issue

***

## ROLE 1 — RECEPTIONIST

| ID | Sev | Page / Feature | Issue Description |
|----|-----|---------------|-------------------|
| R-01 | 🔵 | Dashboard | Greeting displays org handle ("Good morning, CJ_Creator's!") instead of the user's real name |
| R-02 | 🟠 | Book Appointment | Doctor dropdown is empty — no doctors listed for selection; appointment cannot be assigned to a doctor |
| R-03 | 🟡 | Patient Check-in | "Check In Patient" search returns inconsistent results depending on query pattern |
| R-04 | 🟡 | Appointment Card | "Latest Scheduled Appointments" label shows "Showing Apr 24 appointments" — date-hardcoded, not dynamic |
| R-05 | 🟡 | Walk-in Queue | Queue counter on dashboard does not update after check-in without a page refresh |
| R-06 | 🔵 | Patient Registration | No field for patient photo capture/upload |

***

## ROLE 2 — PHARMACIST

| ID | Sev | Page / Feature | Issue Description |
|----|-----|---------------|-------------------|
| P-01 | 🔴 | Prescription Queue | "Pending Rx" count shows 0 even when doctors have issued prescriptions — cross-role data sync is broken |
| P-02 | 🔴 | Dispensing | Dispense action completes with a single click, with no pharmacist double-check / confirmation step — patient safety risk |
| P-03 | 🟡 | Dispensing | No drug interaction warning shown when dispensing multiple medications to the same patient |
| P-04 | 🟡 | Inventory | Low-stock alert is displayed but does not block dispensing when stock quantity is 0 |
| P-05 | 🟡 | Inventory — Add Item | Expiry date field accepts past dates without validation or warning |
| P-06 | 🔵 | Billing Integration | After dispensing, no invoice is auto-generated — revenue stays ₹0.00 |

***

## ROLE 3 — DOCTOR

| ID | Sev | Page / Feature | Issue Description |
|----|-----|---------------|-------------------|
| D-01 | 🟠 | Dashboard KPI | "Patients Seen Today" counter stays at 0 after completing consultations — KPI not updating |
| D-02 | 🟠 | Prescription Flow | Prescriptions written during a consultation do not appear in the Pharmacist's queue (root cause of P-01) |
| D-03 | 🟡 | Consultation — Diagnosis | ICD-10 code field is free-text with no lookup or validation against real ICD-10 codes |
| D-04 | 🟡 | Lab Orders | Lab orders created in a consultation do not link results back to the patient chart |
| D-05 | 🟡 | Consultation | "Chief Complaint" text field has no character limit |
| D-06 | 🔵 | Consultation | "Follow-up Date" field accepts past dates without a warning |
| D-07 | 🔵 | Voice Notes | Direct URL `/voice-notes` returns 404; correct path is `/doctor/voice-notes` — broken deep link |

***

## ROLE 4 — NURSE

| ID | Sev | Page / Feature | Issue Description |
|----|-----|---------------|-------------------|
| N-01 | 🔴 | Record Vitals | **Critical validation bug:** Submitting the "Record Vital Signs" form with pre-filled default values (e.g., 120/80 BP, 37°C temp) fires "is required" errors on all fields — form is completely unsubmittable even with valid data present |
| N-02 | 🔴 | Administer Medication | After selecting a patient, Medication Name shows "No active prescriptions found" — doctor-prescribed medications are invisible to Nurse; the Doctor→Nurse medication administration handoff is entirely broken |
| N-03 | 🟠 | Create Handover | "Receiving Nurse" dropdown is empty — no nurses available to select; shift handover cannot be completed |
| N-04 | 🟠 | Offline Vitals | "Offline Vitals" button opens the identical modal as "Record Vitals" — there is no distinct offline-capable flow; the button label is misleading |
| N-05 | 🟡 | Care Protocols | "Choose a patient" dropdown in Care Protocols is empty — protocols cannot be assigned to any patient |
| N-06 | 🟡 | Mobile Entry | "Quick Vitals Entry" modal pre-fills Patient ID with hardcoded test value "P12345" — test data exposed in UI |
| N-07 | 🟡 | Dashboard KPI | "Vitals Recorded" counter stays at 0 after successfully recording vitals |
| N-08 | 🔵 | Dashboard Layout | The "Management" section (right column of the Overview tab) renders as a blank white panel — content is missing or failed to load |

***

## ROLE 5 — ADMINISTRATOR

| ID | Sev | Page / Feature | Issue Description |
|----|-----|---------------|-------------------|
| A-01 | 🔴 | Invite Staff | "Send Invitation" on Step 3 of the Invite Staff wizard throws a generic Error toast and fails silently — staff cannot be onboarded via invitation at all |
| A-02 | 🟠 | Staff Management | Active Staff count shows 0 on dashboard; Staff Management page shows "No staff members found" — users performing actions in the system are not counted as active staff |
| A-03 | 🟠 | Reports — Appointments | Reports > Appointments tab shows "No appointment data available" even though the Admin dashboard shows 2 scheduled appointments — data inconsistency between views |
| A-04 | 🟡 | Reports — Revenue | "Today's Revenue: ₹0.00" despite consultations and prescriptions being completed — clinical activity is not triggering revenue capture |
| A-05 | 🟡 | Reports — Staff Performance | Staff Performance chart attributes all clinical activity to the org name "CJ_Creator's Org" instead of individual staff members |
| A-06 | 🟡 | Activity Logs | All audit trail entries show USER = "System" — individual user attribution not working; this is a HIPAA audit trail concern |
| A-07 | 🟡 | Test Mode Switcher | "Reset to Actual Role" option does not dismiss the Test Mode banner — UI continues to display "Test Mode: Nurse" after clicking reset |
| A-08 | 🔵 | Activity Logs | IP Address column shows "0.0.0.0" for all entries — real client IP is not being captured |
| A-09 | 🔵 | Hospital Settings | License Number field displays hardcoded test value "HOSP-2024-TEST-001" — should be blank or prompt during first-time setup |
| A-10 | 🔵 | Dashboard | "Latest Scheduled Appointments" shows static label "Showing Apr 24 appointments" — not dynamically tied to the current date |
| A-11 | 🔵 | System Monitoring | "Active Users: 47" displayed in a single-user test environment — value appears to be seeded/fake data |

***

## CROSS-ROLE & SYSTEM-WIDE ISSUES

| ID | Sev | Area | Issue Description |
|----|-----|------|-------------------|
| X-01 | 🔴 | Clinical Data Flow | **Doctor → Pharmacist pipeline broken:** Prescriptions written in consultation never appear in the Pharmacist pending queue |
| X-02 | 🔴 | Clinical Data Flow | **Doctor → Nurse medication handoff broken:** Nurse "Administer Medication" cannot see any active prescriptions for a patient |
| X-03 | 🔴 | Form Validation | **Shared validation bug** across Nurse Vitals and Admin Invite: validation fires even when fields contain valid values — likely a misconfigured form library (React Hook Form / Zod schema mismatch) |
| X-04 | 🟠 | KPI Accuracy | All role dashboards show stale or zeroed KPI counters (Vitals Recorded, Patients Seen, Pending Rx, etc.) — counters do not refresh after actions without a full page reload |
| X-05 | 🟠 | Audit Trail | USER field = "System" across all activity log entries — individual user tracking not implemented; HIPAA compliance risk |
| X-06 | 🟡 | Revenue Lifecycle | No clinical action (consultation, prescription, dispensing) auto-generates an invoice — billing is entirely disconnected from clinical workflow |
| X-07 | 🟡 | Test/Seed Data | Hardcoded test values visible in production UI: Patient ID "P12345", License "HOSP-2024-TEST-001", Invoice total ₹2.00 |
| X-08 | 🔵 | URL Routing | Workflow Dashboard navigates to `/integration/workflow` but the sidebar links to `/workflow` — redirect works but is inconsistent |

***

## CONSOLIDATED SUMMARY SCORECARD

| Role | 🔴 Critical | 🟠 High | 🟡 Medium | 🔵 Low | **Total** |
|------|------------|--------|----------|-------|----------|
| Receptionist | 0 | 1 | 3 | 2 | **6** |
| Pharmacist | 2 | 0 | 3 | 1 | **6** |
| Doctor | 0 | 2 | 3 | 2 | **7** |
| Nurse | 2 | 2 | 3 | 1 | **8** |
| Administrator | 1 | 2 | 4 | 4 | **11** |
| Cross-Role / System | 3 | 2 | 2 | 1 | **8** |
| **Grand Total** | **8** | **9** | **18** | **11** | **46** |

***

## TOP 10 PRIORITY FIXES (Launch Blockers)

| Priority | ID | Fix Required |
|----------|----|-------------|
| 1 | X-01, P-01, D-02 | Fix prescription data sync so Doctor-written prescriptions appear in Pharmacist queue |
| 2 | X-02, N-02 | Fix medication handoff so Nurse can view and administer doctor-prescribed medications |
| 3 | X-03, N-01 | Fix form validation bug that rejects valid/pre-filled field values in Nurse Vitals and Admin Invite |
| 4 | A-01 | Fix "Send Invitation" failure — staff onboarding is completely non-functional |
| 5 | P-02 | Add pharmacist double-confirmation step before dispensing — patient safety requirement |
| 6 | X-05, A-06 | Implement individual user attribution in audit logs (currently all = "System") — HIPAA |
| 7 | N-03 | Populate "Receiving Nurse" dropdown so shift handover can be completed |
| 8 | R-02 | Populate Doctor dropdown in Book Appointment modal |
| 9 | X-04 | Fix real-time KPI counter refresh across all role dashboards |
| 10 | X-06 | Connect clinical workflow (consultations, dispensing) to invoice auto-generation |

***

## ACTION TODO LIST

Track progress here by checking items off as they are completed.

### P0 - Launch Blockers
- [x] X-01 - Fix Doctor → Pharmacist prescription sync so prescriptions appear in the Pharmacist queue.
- [x] P-01 - Fix the Pending Rx count so it reflects issued prescriptions.
- [ ] D-02 - Ensure prescriptions written during consultation reach the Pharmacist queue.
- [ ] X-02 - Fix Doctor → Nurse medication handoff so prescribed medications are visible to Nurses.
- [ ] N-02 - Make doctor-prescribed medications visible in Administer Medication.
- [ ] X-03 - Fix the shared validation bug affecting Nurse Vitals and Admin Invite.
- [ ] N-01 - Make Record Vital Signs submit correctly when valid pre-filled values are present.
- [ ] A-01 - Fix Send Invitation so Step 3 completes without a generic error toast.
- [ ] P-02 - Add pharmacist double-confirmation before dispensing.
- [ ] X-05 - Implement individual user attribution in activity logs.
- [ ] A-06 - Replace USER = System in activity logs with the actual user.
- [ ] N-03 - Populate the Receiving Nurse dropdown in shift handover.
- [ ] R-02 - Populate the Doctor dropdown in Book Appointment.
- [ ] X-04 - Refresh KPI counters in real time across all role dashboards.
- [ ] X-06 - Connect clinical workflow to invoice auto-generation.

### Receptionist
- [ ] R-01 - Replace the org-handle greeting with the user's real name.
- [ ] R-03 - Make Patient Check-in search consistent across query patterns.
- [ ] R-04 - Replace the static Latest Scheduled Appointments label with a dynamic date.
- [ ] R-05 - Refresh the walk-in queue counter after check-in without a reload.
- [ ] R-06 - Add patient photo capture or upload to registration.

### Pharmacist
- [ ] P-03 - Show drug interaction warnings when dispensing multiple medications.
- [ ] P-04 - Block dispensing when stock quantity is 0.
- [ ] P-05 - Reject past expiry dates in Inventory > Add Item.
- [ ] P-06 - Generate an invoice automatically after dispensing.

### Doctor
- [ ] D-01 - Update Patients Seen Today after completed consultations.
- [ ] D-03 - Replace free-text ICD-10 entry with lookup and validation.
- [ ] D-04 - Link lab orders and results back to the patient chart.
- [ ] D-05 - Add a character limit to Chief Complaint.
- [ ] D-06 - Warn when Follow-up Date is in the past.
- [ ] D-07 - Fix the /voice-notes deep link so it routes to /doctor/voice-notes.

### Nurse
- [ ] N-04 - Separate Offline Vitals from the standard Record Vitals flow.
- [ ] N-05 - Populate the patient dropdown in Care Protocols.
- [ ] N-06 - Remove the hardcoded P12345 test value from Quick Vitals Entry.
- [ ] N-07 - Refresh the Vitals Recorded counter after save.
- [ ] N-08 - Restore the blank Management panel content in the dashboard.

### Administrator
- [ ] A-02 - Fix Active Staff counts and Staff Management population.
- [ ] A-03 - Make Reports > Appointments match dashboard appointment data.
- [ ] A-04 - Reflect completed clinical activity in Today's Revenue.
- [ ] A-05 - Attribute Staff Performance to individual staff members.
- [ ] A-07 - Make Reset to Actual Role dismiss the Test Mode banner.
- [ ] A-08 - Capture and display real client IP addresses in Activity Logs.
- [ ] A-09 - Remove the hardcoded hospital license test value from settings.
- [ ] A-10 - Make Latest Scheduled Appointments dynamic on the admin dashboard.
- [ ] A-11 - Replace the seeded Active Users valuee with live environment data.

### Cross-Role / System
- [ ] X-07 - Remove hardcoded test values from production UI.
- [ ] X-08 - Align Workflow Dashboard routing with the sidebar link.

### Progress Snapshot

| Section | Total | Completed | Remaining |
|---------|-------|-----------|-----------|
| Launch Blockers | 15 | 1 | 14 |
| Receptionist | 5 | 0 | 5 |
| Pharmacist | 4 | 0 | 4 |
| Doctor | 6 | 0 | 6 |
| Nurse | 5 | 0 | 5 |
| Administrator | 9 | 0 | 9 |
| Cross-Role / System | 2 | 1 | 1 |
| **Grand Total** | **46** | **1** | **45** |