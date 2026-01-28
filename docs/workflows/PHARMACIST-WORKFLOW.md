# Pharmacist Role Workflow (2026)

## Overview
The Pharmacist role ensures safe medication dispensing, patient counseling, and medication management. This workflow includes all recent automation and analytics features.

**Back to consolidated:** [CONSOLIDATED_ROLE_WORKFLOWS.md](../CONSOLIDATED_ROLE_WORKFLOWS.md#pharmacist-workflow)

---

## 1. Login & Access
- Secure login via `pharmacist.{name}@hospital.com` (RBAC enforced)
- Dashboard shows pending prescriptions, alerts, and inventory

## 2. Prescription Processing
- Receive e-prescriptions from doctors
- Automated drug interaction and allergy checks
- Prepare and dispense medications (robotic automation pending)
- Document dispensing (audit-logged)

## 3. Patient Counseling
- Provide medication instructions and education (platform pending)
- Address patient questions and concerns
- Document counseling sessions

## 4. Inventory & Safety
- Monitor inventory levels (automated tracking)
- Automated alerts for low stock or recalls
- Medication safety analytics (advanced pending)
- Integration with external pharmacy networks (pending)

---

## Technical Notes
- All actions logged (HIPAA compliance)
- Real-time updates via Supabase Realtime
- Pending: Robotic dispensing, advanced analytics, education platform, external integration

## Automation & Notifications
- New prescriptions create pharmacy tasks/notifications; drug interaction flags may notify doctors when enabled.
- Dispense completion can notify patients (ready for pickup) via configured rules.
- No automatic retries on failed actions; monitor pharmacy tasks/notifications for completion.

## Access & Scope
- Hospital-scoped via RLS; no cross-hospital visibility.
- Access constrained to hospital’s prescriptions, inventory, and related patient records.
