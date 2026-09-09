# CareSync HIMS

CareSync is an enterprise hospital information management system orchestrating clinical workflows, multi-role care coordination, and healthcare administration on a Supabase-native architecture.

## Language

### Roles

**User Role**:
One of seven canonical system access classifications (admin, doctor, nurse, receptionist, pharmacist, lab_technician, patient) that govern permissions, navigation, and workflow transitions.
_Avoid_: User type, profile level, account type, super_admin

**Admin**:
The hospital administrator responsible for staff provisioning, system configuration, compliance reporting, and audit log inspection.
_Avoid_: Superuser, IT admin, manager

**Doctor**:
The licensed physician with clinical authority to perform consultations, record diagnoses, order laboratory investigations, and prescribe medications.
_Avoid_: Provider, clinician, physician

**Nurse**:
The clinical staff member responsible for patient intake, recording vital signs, administering medications, executing care protocols, and triage queue management.
_Avoid_: Medical assistant, caregiver, sister

**Receptionist**:
The front-desk administrative staff member who registers patients, books appointments, executes check-in, and handles front-desk billing and copay collections.
_Avoid_: Front desk clerk, receptionist-biller, registrar

**Pharmacist**:
The licensed medication specialist responsible for prescription review, drug-drug interaction safety checks, inventory dispensing, and medication reconciliation.
_Avoid_: Chemist, druggist, dispensary staff

**Lab Technician**:
The laboratory specialist responsible for specimen accessioning, running diagnostic assays, recording test results, and escalating critical values.
_Avoid_: Lab tech, pathologist, tester

**Patient**:
The individual receiving care whose protected health information (PHI), clinical history, appointments, and prescriptions are managed with hospital-scoped access and available via the patient portal.
_Avoid_: Client, consumer, customer

### Workflows & Lifecycle States

**Patient Queue**:
A shared, priority-ordered department pool (patient_queue) storing arriving patients (status: 'waiting' | 'in_consultation' | 'completed') accessible to both triage nurses and physicians.
_Avoid_: Nurse triage queue, waiting room list

**Consultation**:
A documented clinical encounter between a patient and a doctor, encompassing clinical notes, differential diagnoses, orders, and treatment recommendations.
_Avoid_: Visit, appointment session, doctor meeting

**Lab Order**:
A physician-initiated diagnostic request progressing through ordered ➔ collected ➔ in_progress ➔ completed.
_Avoid_: Test requisition, diagnostic request

**Critical Lab Alert**:
An automated clinical safety escalation triggered when lab results breach physiological limits, dispatching immediate notifications across an escalation chain (primary ➔ on_call ➔ er_staff).
_Avoid_: High-priority test, panic value

**Critical Lab Escalation Queue**:
A durable, automated background escalation mechanism that monitors unacknowledged critical lab alerts and advances notifications from the ordering doctor to on-call staff (5 minutes) and the emergency department (10 minutes) with SMS/pager dispatch.
_Avoid_: Polling alert list, manual follow-up

**Prescription Approval Workflow**:
A strict clinical verification state machine (initiated ➔ pending_approval ➔ approved ➔ dispensed ➔ completed) requiring mandatory pharmacist review before medications can be dispensed.
_Avoid_: Script, drug order, manual dispensing

**Fail-Closed Clinical Decision Support (CDS)**:
A non-negotiable clinical safety invariant where any failure, timeout, or ambiguity in drug interaction or allergy checking blocks automated order fulfillment, demanding an explicit physician override and logged clinical rationale.
_Avoid_: Fail-open alert, passive warning, advisory notification

**Front-Desk Billing**:
Financial workflows handled at reception covering invoice generation, copayment processing, and initial charge recording.
_Avoid_: Cashiering, bookkeeping

**Billing Boundary**:
The strict architectural and database row-level security boundary that restricts billing and invoice access exclusively to admin and receptionist roles, forbidding access to clinical roles (doctor, nurse).
_Avoid_: Clinical billing access, physician invoice review

**Discharge Workflow**:
A strictly sequential 4-stage state machine (doctor ➔ pharmacist ➔ billing ➔ nurse ➔ completed) with reverse-step rejection rollback ensuring clinical clearance, medication reconciliation, financial settlement, and physical release.
_Avoid_: Checkout, release flow, concurrent clearance

**Patient Portal Access**:
Immediate, real-time access for verified patients to view their own finalized appointments, dispensed prescriptions, and completed laboratory results via tenant-isolated RLS policies.
_Avoid_: Embargoed portal, gated patient view
