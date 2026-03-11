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

### Unified Check-in Error Handling
- Front-desk check-in now catches mutation failures inside `useUnifiedCheckIn()` instead of letting them escape uncaught to the caller.
- Failed check-ins surface an explicit toast error and return `null`, so the UI can stop safely without entering a half-complete state.
- Workflow priority during check-in is narrowed to the supported workflow priority union and no longer relies on unsafe casts.

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
- If a workflow side effect fails after retries, the failure is persisted to `workflow_action_failures`, exposed in the Workflow Dashboard, and escalated through the maintenance routine if it remains unresolved.

## Access & Scope
- Hospital-scoped via RLS; no cross-hospital visibility.
- Reception manages patient-facing data for the hospital only.
