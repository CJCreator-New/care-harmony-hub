# Nurse Role Workflow (2026)

## Overview
The Nurse role supports patient preparation, monitoring, and care coordination. This workflow includes all recent updates, automation, and analytics features.

**Back to consolidated:** [CONSOLIDATED_ROLE_WORKFLOWS.md](../CONSOLIDATED_ROLE_WORKFLOWS.md#nurse-workflow)

---

## 1. Login & Access
- Secure login via `nurse.{name}@hospital.com` (RBAC enforced)
- Dashboard shows assigned patients, tasks, and alerts

## 2. Patient Preparation
- Check-in patient from queue
- Record vitals (wearable integration pending)
- Complete pre-consultation checklist
- Notify doctor of readiness

## 3. Ongoing Monitoring
- Real-time vitals monitoring (wearable integration pending)
- Automated alerts for abnormal values
- Document nursing interventions (auto-save, audit-logged)

## 4. Medication Administration
- Receive orders from doctor
- Automated medication reminders
- Barcode scanning for safety
- Document administration (audit-logged)
- Predictive analytics for patient deterioration (pending)

## 5. Discharge & Education
- Provide patient education materials (advanced platform pending)
- Discharge checklist completion
- Schedule follow-up reminders

## 6. Collaboration
- Secure messaging with doctors, lab techs, and pharmacists
- Participate in care team huddles

---

## Technical Notes
- All actions logged (HIPAA compliance)
- Real-time updates via Supabase Realtime
- Pending: Wearable integration, predictive analytics, advanced education

## Automation & Notifications
- Orders from doctors create nursing tasks; abnormal vitals should trigger alerts via workflow rules.
- Medication administration reminders depend on provider orders; discharge tasks flow from doctor updates.
- No automatic retries on failed actions; verify tasks/notifications if something looks missing.

## Access & Scope
- Hospital-scoped via RLS; no cross-hospital visibility.
- Access limited to assigned patients within the hospital context.
