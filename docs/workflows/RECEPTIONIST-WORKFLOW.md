# Receptionist Role Workflow (2026)

## Overview
The Receptionist role manages patient intake, scheduling, and front-desk operations. This workflow reflects all recent enhancements, including AI scheduling and queue management.

**Back to consolidated:** [CONSOLIDATED_ROLE_WORKFLOWS.md](../CONSOLIDATED_ROLE_WORKFLOWS.md#receptionist-workflow)

---

## 1. Login & Access
- Secure login via `receptionist.{name}@hospital.com` (RBAC enforced)
- Dashboard displays appointments, walk-ins, and alerts

## 2. Patient Check-in
- Register new patients or check-in existing ones
- Digital form completion and signature capture
- Automated patient check-in with biometric verification (pending)
- Assign patient to queue (real-time updates)

## 3. Appointment Scheduling
- Book, reschedule, or cancel appointments
- AI-driven scheduling suggestions (pending)
- Real-time queue optimization (pending)
- Multilingual support for communications (pending)

## 4. Communication & Coordination
- Notify clinical staff of patient arrivals
- Manage waiting area and patient flow
- Provide information and support to patients

---

## Technical Notes
- All actions logged (HIPAA compliance)
- Real-time updates via Supabase Realtime
- Pending: AI scheduling, biometric check-in, queue optimization, multilingual support

## Automation & Notifications
- Check-in and scheduling events can trigger queue updates and staff notifications via workflow rules.
- Appointment changes send patient notifications; escalations for long waits can create tasks for nursing/admin when rules are enabled.
- No automatic retries on failed actions; confirm notifications/queue updates if behavior seems off.

## Access & Scope
- Hospital-scoped via RLS; no cross-hospital visibility.
- Reception manages patient-facing data for the hospital only.
