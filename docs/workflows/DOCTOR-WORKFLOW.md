# Doctor Role Workflow (2026)

## Overview
The Doctor role is central to patient care, diagnosis, and treatment. This workflow reflects all recent enhancements, including advanced AI, RBAC, and integrated analytics.

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
