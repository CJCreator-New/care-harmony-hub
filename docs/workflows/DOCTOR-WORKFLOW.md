# Doctor Role Workflow (2026)

## Overview
The Doctor role is central to patient care, diagnosis, and treatment. This workflow reflects all recent enhancements, including advanced AI, RBAC, and integrated analytics.

**Back to consolidated:** [CONSOLIDATED_ROLE_WORKFLOWS.md](../CONSOLIDATED_ROLE_WORKFLOWS.md#doctor-workflow)

---

## 1. Login & Access
- Secure login via `doctor.{name}@hospital.com` (RBAC enforced)
- Biometric authentication (pending)
- Dashboard displays patient queue, alerts, and analytics

## 2. Patient Consultation
- Select patient from queue (real-time updates)
- Review patient history, vitals, and lab results (integrated with nurse/lab tech modules)
- Use AI-powered diagnostic suggestions (basic implemented, advanced pending)
- Document findings and treatment plan (auto-save, audit-logged)

## 3. Orders & Prescriptions
- Place lab orders and prescriptions (role-scoped forms)
- E-prescribing with drug interaction checks
- Automated alerts for critical results
- Integration with pharmacist and lab tech workflows

### Prescription Field Standard
- Consultation and prescription payloads now persist `medication_name` as the canonical field.
- Any older `medication` draft state is normalized before persistence.
- Doctor-facing summaries and downstream pharmacy handoff views now read `medication_name` consistently.

### Queue Degradation Behavior
- If `lab_queue` is missing in an older deployment, the lab order still persists to `lab_orders`.
- If `prescription_queue` is missing in an older deployment, the prescription still persists to `prescriptions`.
- In both cases, the system creates a compensating `workflow_tasks` record so the handoff is still durable and reviewable.

### Workflow Retry Behavior
- Workflow side effects such as notifications and secondary task fan-out are best-effort and no longer block core consultation completion.
- Retry-exhausted failures are written to `workflow_action_failures`.
- Failures older than 1 hour are escalated to admin via the workflow failure escalation maintenance routine.

## 4. Collaboration & Handover
- Secure messaging with nurses, lab techs, and pharmacists
- Handover notes and care plans (audit-logged)
- Peer benchmarking dashboard (pending)

## 5. Discharge & Follow-up
- Discharge summary auto-generated
- Schedule follow-up (AI scheduling pending)
- Patient education resources (integrated, advanced pending)

## 6. Analytics & Quality
- Access to personal and department analytics
- Review performance metrics, patient outcomes
- Participate in quality improvement (feedback loop)

---

## Technical Notes
- All actions logged (HIPAA compliance)
- Real-time updates via Supabase Realtime
- Role-based feature toggles
- Pending: Advanced AI, biometric auth, peer benchmarking

## Automation & Notifications
- Events from consultations, orders, and critical labs create tasks/notifications via workflow rules.
- Critical lab values notify doctor; prescription creation notifies pharmacy; consult tasks notify nursing when applicable.
- Failed workflow actions are persisted for review, surfaced in the Workflow Dashboard, and escalated if unresolved beyond the maintenance threshold.

## Access & Scope
- Hospital-scoped via RLS; no cross-hospital visibility.
- Patient data limited to the hospital; follow least-privilege policies for role actions.
