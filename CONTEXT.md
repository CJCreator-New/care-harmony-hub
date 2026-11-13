# CareHarmony HIMS

CareHarmony HIMS is an enterprise hospital information management system orchestrating clinical workflows, multi-role care coordination, and healthcare administration on a pure Supabase-native architecture.

## Core Architectural Invariants

- **Pure Supabase-Native Backend**: All backend logic, authorization, and data lifecycle management reside strictly in PostgreSQL (Row-Level Security, triggers, stored procedures) and Deno Edge Functions. Standalone external application microservices are explicitly forbidden (ADR-0007).
- **Fail-Closed Clinical Safety**: Ambiguous or failing drug-interaction checks, allergy mismatches, or missing vitals halt non-emergency fulfillment automatically.
- **Strict Role Boundaries**: Seven canonical roles with explicit separation of billing concerns from direct clinical observation.
- **Unified Branding**: Single canonical platform name is **CareHarmony HIMS**.

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
A shared, priority-ordered department pool (patient_queue) storing arriving patients (status: 'waiting' | 'in_consultation' | 'completed') supporting both doctor self-claim and triage nurse direct routing (ADR-0012). Check-in from front-desk reception automatically generates a waiting queue item.
_Avoid_: Nurse triage queue, waiting room list

**Offline Clinical Queue**:
A local encrypted IndexedDB synchronization queue capturing routine nurse vitals and progress notes during network drops, with fail-closed gating for high-risk medication, discharge, or billing operations (ADR-0013).
_Avoid_: Unconstrained offline writes, offline prescribing

**Concurrent Discharge Staging**:
A parallelized preparation phase of the 4-stage discharge pipeline allowing pharmacy prescription reconciliation and receptionist billing finalization to run concurrently once the doctor signs, gated by an inviolable final nursing release lock (ADR-0014).
_Avoid_: Uncoordinated discharge, non-sequential checkout

**Moderated Portal Appointment**:
An appointment workflow where self-registered Tier-1 patient bookings enter 'pending_confirmation' for receptionist verification before calendar slot blocking (ADR-0015).
_Avoid_: Unfiltered self-booking, instant calendar locks

**Emergency Triage Bypass**:
An explicit, audited clinical pathway allowing a physician or triage nurse to initiate consultation or emergency intervention on a patient immediately, bypassing routine vital signs intake while logging a mandatory clinical rationale.
_Avoid_: Unchecked walk-in, skip triage

**Consultation**:
A documented clinical encounter between a patient and a doctor, encompassing clinical notes, differential diagnoses, orders, and treatment recommendations. Completing a consultation encounter updates clinical records but does NOT initiate patient discharge.
_Avoid_: Visit, appointment session, doctor meeting

**Discharge Order**:
An explicit, physician-initiated clinical order that triggers the 4-stage sequential discharge state machine (doctor ➔ pharmacist ➔ billing ➔ nurse ➔ completed).
_Avoid_: Routine consultation sign-off, check-out

**Lab Order**:
A physician-initiated diagnostic request progressing through ordered ➔ collected ➔ in_progress ➔ completed.
_Avoid_: Test requisition, diagnostic request

**Critical Lab Alert**:
An automated clinical safety escalation triggered when lab results breach physiological limits, dispatching immediate notifications across an escalation chain (primary ➔ on_call ➔ er_staff) alongside a persistent browser modal requiring signed clinician acknowledgment.
_Avoid_: High-priority test, panic value

**Critical Lab Escalation Queue**:
A durable, automated background escalation mechanism that monitors unacknowledged critical lab alerts and advances notifications from the ordering doctor to on-call staff (5 minutes) and the emergency department (10 minutes) with SMS/pager dispatch.
_Avoid_: Polling alert list, manual follow-up

**Prescription Approval Workflow**:
A strict clinical verification state machine (initiated ➔ pending_approval ➔ approved ➔ dispensed ➔ completed) requiring mandatory pharmacist review before medications can be dispensed from the pharmacy.
_Avoid_: Script, drug order, manual dispensing

**Emergency Floor Stock Override**:
A controlled exception to the standard pharmacy dispensing gate allowing immediate administration of STAT/emergency medication from floor stock without pre-dispense pharmacist approval, triggering an immutable audit trail and requiring retrospective pharmacist reconciliation within 2 hours.
_Avoid_: Off-book dispensing, unverified drug administration

**Patient Portal Two-Tier Identity**:
A safety model for online patient registration: unverified patients can schedule and view future appointments, but access to historical clinical notes, lab results, and medication records remains locked until verified in-person or via authenticated hospital staff confirmation.
_Avoid_: Immediate full record unmasking, unverified patient access

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
