# Patient Workflow (2026)

## Overview
Patients use the portal for appointments, refills, results, billing, and messaging. This workflow reflects current capabilities with scoped access to their own records only.

**Back to consolidated:** [CONSOLIDATED_ROLE_WORKFLOWS.md](../CONSOLIDATED_ROLE_WORKFLOWS.md#patient-workflow)

---

## 1. Access & Profile
- Secure login; view only own records.
- Manage profile, contacts, insurance.

## 2. Appointments
- Schedule/reschedule/cancel; pick provider/time.
- Receive confirmations and reminders.

## 3. Visits & Follow-up
- Check-in (in-clinic); receive instructions and discharge summaries.
- View visit notes and follow-up tasks.

## 4. Prescriptions & Refills
- Request refills; track prescription ready status.
- View medication instructions and counseling notes.

## 5. Lab Results
- Receive notification when results are ready; view reports.
- Message providers with questions.

## 6. Billing
- View charges, pay bills, download receipts.

## 7. Messaging
- Secure messaging with care team; attachments allowed where enabled.

## Technical Notes
- RLS restricts all data to the patient’s own records; no cross-patient visibility.
- Notifications limited to the patient’s items (appointments, labs, prescriptions, billing).
- Pending: richer education content, offline-friendly PWA flows, and SMS fallbacks where permitted.

## Automation & Notifications
- Receives appointment confirmations/changes, lab-results-ready, prescription-ready, and billing-due notifications.
- Requests (refills, messages) create tasks/notifications for staff when rules are configured.
- No automatic retries on failed notifications; recheck in-app notifications if an expected alert is missing.
