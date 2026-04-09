# CareSync HIMS - Comprehensive Feature Requirements Document

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Status**: Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Set Overview](#feature-set-overview)
3. [Core Clinical Workflows](#core-clinical-workflows)
4. [Operational Workflows](#operational-workflows)
5. [Analytics & Reporting](#analytics--reporting)
6. [AI-Powered Clinical Support](#ai-powered-clinical-support)
7. [Acceptance Criteria by Feature](#acceptance-criteria-by-feature)

---

## Executive Summary

CareSync HIMS is a comprehensive hospital management system with 20+ major features covering patient registration, clinical workflows (appointments, prescriptions, lab, pharmacy), billing, analytics, and AI-powered clinical decision support. All features are production-ready with multi-role access control, HIPAA compliance, and comprehensive E2E test coverage.

---

## Feature Set Overview

### Clinical Features (Operational)

| Feature | Status | Key Capabilities | Test Coverage |
|---------|--------|------------------|---|
| **Patient Registry** | ✅ Production | Demographics, medical history, allergies, contact, next-of-kin | 95% |
| **Appointments** | ✅ Production | Scheduling, queue mgmt, reminders, multi-provider slots | 98% |
| **Vital Signs** | ✅ Production | Entry, trending, critical value alerts, escalation | 96% |
| **Consultations** | ✅ Production | HPI, assessment, plan, notes, voice transcription | 94% |
| **Prescriptions** | ✅ Production | E-sig, workflow, drug interactions, dispensing, refills | 97% |
| **Lab Orders** | ✅ Production | Order entry, specimen tracking, results entry, critical alerts | 96% |
| **Pharmacy** | ✅ Production | Dispensing, inventory, stock alerts, drug interactions | 95% |
| **Billing** | ✅ Production | Tariff lookup, claims, insurance auth, payment plans | 93% |
| **Telemedicine** | ✅ Production | Video consultations, consent, recordings, async messaging | 92% |
| **Discharge** | ✅ Production | Multi-step workflow, medication reconciliation, summaries | 91% |

### Administrative Features (Operational)

| Feature | Status | Key Capabilities | Test Coverage |
|---------|--------|------------------|---|
| **User Management** | ✅ Production | Role assignment, hospital scoping, 2FA, biometric auth | 97% |
| **Role-Based Access** | ✅ Production | 7 roles, 30+ permissions, RLS enforcement | 99% |
| **Audit Trails** | ✅ Production | Tamper-evident logging, compliance reports, activity tracking | 98% |
| **Hospital Management** | ✅ Production | Multi-tenancy, settings, rate limiting, branding | 96% |
| **Document Management** | ✅ Production | Upload, storage, versioning, access control | 94% |

### Analytics & Reporting (Operational)

| Feature | Status | Key Capabilities | Test Coverage |
|---------|--------|------------------|---|
| **Dashboards** | ✅ Production | Role-specific KPIs, real-time updates, filters | 95% |
| **Reports** | ✅ Production | Patient lists, billing, revenue, resource utilization | 93% |
| **Queue Analytics** | ✅ Production | Wait times, throughput, resource allocation | 92% |
| **Clinical Metrics** | ✅ Production | Appointment no-shows, readmission rates, outcomes | 91% |

### AI & Advanced Features (Production)

| Feature | Status | Key Capabilities | Test Coverage |
|---------|--------|------------------|---|
| **Differential Diagnosis** | ✅ Production | Symptom analysis, condition suggestions, confidence scoring | 88% |
| **Predictive Analytics** | ✅ Production | Length of stay forecast, readmission risk, resource prediction | 87% |
| **Drug Interaction Checker** | ✅ Production | Real-time validation, severity levels, alternative suggestions | 96% |
| **Treatment Recommendation** | ✅ Production | Evidence-based guidelines, patient-specific factors | 85% |
| **Voice Clinical Notes** | ✅ Production | Speech-to-text, note transcription, auto-categorization | 83% |

---

## Core Clinical Workflows

### 1. Appointment Workflow

**Trigger**: Patient self-books or receptionist creates  
**Primary Actors**: Patient, Receptionist, Doctor  
**Duration**: Booking to completion (typically same day to 30 days)

#### Process Flow

```
Step 1: View Available Slots
  - Patient/Receptionist selects date range
  - System filters by provider availability
  - System enforces: No overbooking, lunch breaks honored
  - Display: Available 15-min slots

Step 2: Create Appointment
  - Select slot, patient, visit reason
  - Note chief complaint/symptoms
  - System auto-assigns priority (urgent, routine)
  - Status: "Scheduled"
  - Notification: SMS/Email to patient

Step 3: Check-In (Receptionist)
  - Patient arrives, receptionist marks check-in
  - Verify payment method / insurance
  - Complete pre-visit screening (vitals by nurse)
  - Status: "Checked In"
  - Queue Management: Add to doctor's queue

Step 4: Consultation (Doctor)
  - Doctor views patient in queue
  - Marks as "In Progress"
  - Documents HPI, assessment, plan
  - Orders labs/imaging (if needed)
  - Orders prescriptions
  - Status: "Completed"

Step 5: Post-Visit
  - Receptionist handles payment/insurance
  - Schedule follow-up (if needed)
  - Provide discharge instructions
  - Status: "Discharged"
  - Notification: Send visit summary to patient

Postcondition:
  - Appointment marked complete
  - All orders placed
  - Patient notified of results/follow-up
```

#### Acceptance Criteria

- [ ] **AC-1**: Patient can book appointment from portal 24/7; system prevents double-booking
- [ ] **AC-2**: Receptionist can override provider availability (if authorized)
- [ ] **AC-3**: SMS/Email sent within 2 seconds of booking; delivery confirmed
- [ ] **AC-4**: Check-in process <2 min; vitals entered in real-time
- [ ] **AC-5**: Doctor sees patient in queue instantly after check-in
- [ ] **AC-6**: Appointment duration adjustable (15 min, 30 min, 45 min, 60 min)
- [ ] **AC-7**: Appointment can be cancelled/rescheduled up to 1 hour before slot
- [ ] **AC-8**: No-show tracked for doctor performance metrics

#### Edge Cases

- **Double-booking prevention**: Slot locked when first user selects (avoid race condition)
- **Patient cancellation**: Releases slot back to availability
- **Doctor running late**: Queue updates to show new ETA; notifications sent
- **Urgent add-on**: Receptionist can squeeze urgent appointment into available time
- **No-show**: Auto-cancels after 15 min past appointment time; charges applicable

---

### 2. Prescription Workflow

**Trigger**: Doctor creates prescription during consultation  
**Primary Actors**: Doctor, Pharmacist, Patient  
**Duration**: Creation to pickup (typically 30 min to 2 hours)

#### Process Flow

```
Step 1: Create Draft Prescription
  - Doctor enters: Drug name, dose, frequency, duration
  - System suggests: Common doses, routes
  - Status: "Draft"

Step 2: Validate & Review
  - System checks: Patient allergies, current meds, interactions
  - IF conflicts found → ALERT doctor with severity (Red/Yellow/Green)
  - IF critical interaction → BLOCK prescription; suggest alternative
  - Doctor acknowledges/overrides if clinically justified
  - Status: "Ready for Sign"

Step 3: Sign Prescription
  - Doctor reviews final prescription
  - E-signature captured (timestamp + signature hash)
  - Status: "Signed"
  - Notifications:
    - Pharmacist: "New Rx to dispense for [Patient]"
    - Patient: "Your prescription is ready at pharmacy"

Step 4: Pharmacist Dispenses
  - Pharmacist receives notification
  - Pharmacist verifies stock available
  • IF no stock → Mark "Out of Stock", notify doctor
  • IF expired stock → Skip, suggest alternative
  - Scans drug barcode + lot number
  - Quantity verified
  - Status: "Dispensed"
  - Notification: "Prescription ready for pickup at [Pharmacy]"

Step 5: Patient Picks Up
  - Patient presents ID at pharmacy
  - Pharmacist verifies patient + drug
  - Labels attached (drug name, dose, frequency, warnings)
  - Patient receives counseling (if needed)
  - Status: "Picked Up"

Postcondition:
  - Prescription complete
  - Inventory reduced
  - Payment collected (if applicable)
  - Audit trail: All approvals + dispensing logged
  - Patient has medication
```

#### Acceptance Criteria

- [ ] **AC-1**: Drug interaction check runs in real-time; <500ms latency
- [ ] **AC-2**: Contraindication detected for 95%+ of known dangerous combinations
- [ ] **AC-3**: E-signature cryptographically verifiable for legal admissibility
- [ ] **AC-4**: Prescriptions only fillable by authorized pharmacists
- [ ] **AC-5**: Cannot dispense after prescription expires (state-dependent TTL)
- [ ] **AC-6**: Refill tracking: Doctor can authorize 0-12 refills
- [ ] **AC-7**: All changes (creation, sign, dispense) logged to audit trail with actor + timestamp
- [ ] **AC-8**: Recall within 1 hour of signing allowed; reason mandatory

#### Edge Cases

- **Patient is allergic**: System BLOCKS prescription; suggests alternative drug class
- **Drug not in formulary**: System allows but alerts & requires override
- **Duplicate prescription**: Second doctor creates same Rx; system alerts to de-duplicate
- **Dose too high**: System compares to max single/daily dose; alerts if exceeded
- **Drug expired**: Pharmacist cannot dispense; system auto-rejects
- **Insurance coverage denied**: System flags; patient responsible for payment
- **Recall after dispensing**: Doctor can recall; patient notified to return remaining doses

---

### 3. Laboratory Order Workflow

**Trigger**: Doctor orders lab test during consultation  
**Primary Actors**: Doctor, Lab Technician, Patient  
**Duration**: Order to result (typically 4-24 hours)

#### Process Flow

```
Step 1: Create Lab Order
  - Doctor selects test (from test catalog with LOINC codes)
  - Documents clinical indication (required for certain tests)
  - Specifies specimen type (serum, plasma, urine, etc.)
  - Sets priority: Routine / Urgent / STAT
  - Notes fasting requirement
  - Status: "Ordered"
  - Notification: Lab Tech "New specimen collection needed"

Step 2: Specimen Collection
  - Lab Tech receives order
  - Collects specimen (follows pre-analytical requirements)
  - Logs specimen type, collector name, time
  - Applies barcode label with patient ID + test code
  - Status: "Collected"

Step 3: Processing
  - Specimen delivered to lab analyzer
  - Machine processes & generates result
  - IF QC failed → Test rerun or specimen recollection required
  - Status: "In Progress" → "Completed"

Step 4: Result Generation
  - System receives test results from analyzer
  - Compares to reference ranges
  - Flags abnormal results: Normal / Mildly Abnormal / Critically Abnormal
  - IF critical value → Immediate alert to ordering doctor (phone + in-app)
  - Status: "Pending Approval"

Step 5: Doctor Reviews & Approves
  - Doctor receives notification (email + in-app)
  - Reviews result vs clinical context
  - Adds interpretive comments (if needed)
  - Approves result (e-sign + timestamp)
  - Orders follow-up tests (if needed)
  - Status: "Approved"

Step 6: Patient Notification
  - Patient notified: "Lab result is available"
  - IF abnormal → Additional message: "Doctor has reviewed; see your chart for details"
  - Results visible in patient portal
  - Status: "Released to Patient"

Postcondition:
  - Approved result in patient chart
  - Doctor has actionable insight for next steps
  - Audit trail: Collection, processing, approval, patient release logged
```

#### Acceptance Criteria

- [ ] **AC-1**: Lab tech receives order <1 min after doctor places it
- [ ] **AC-2**: Critical values alerted to doctor within 15 min (phone + in-app)
- [ ] **AC-3**: All normal values have reference range displayed for context
- [ ] **AC-4**: Result must be approved before patient sees it (no auto-release)
- [ ] **AC-5**: Cannot approve own results (prevent fraud); escalate to supervisor if only physician available
- [ ] **AC-6**: Delta check: Compare to prior results; alert if outlier (e.g., glucose 50 → 400)
- [ ] **AC-7**: All approvals logged with doctor name, timestamp, IP address
- [ ] **AC-8**: Retention: Results kept for 7 years per HIPAA

#### Edge Cases

- **Specimen contaminated**: Lab tech rejects; patient re-contacted for recollection
- **Result unreliable**: System flags "Could not process"; requires new specimen
- **Critical value no doctor response**: Escalates to department head after 30 min
- **Test cancelled**: Doctor can cancel if not yet collected
- **Wrong specimen collected**: Patient contacted; new collection scheduled
- **Patient name mismatch**: System blocks result entry; manual verification required

---

### 4. Billing Workflow

**Trigger**: Encounter completed (patient discharged from OPD/IPD/OR)  
**Primary Actors**: Doctor, Billing Officer, Insurance, Patient  
**Duration**: Completion to payment (typically 5-30 days)

#### Process Flow

```
Step 1: Encounter Closure
  - Doctor completes all orders (prescriptions, labs, imaging)
  - Marks patient ready for discharge
  - System generates encounter summary
  - Status: "Encounter Complete"

Step 2: Charge Capture
  - Billing officer reviews all services rendered
  - Verifies procedural codes (CPT), diagnosis codes (ICD-10)
  - Looks up tariff for each code (hospital standard charges)
  - Calculates modifiers (emergency surcharge, location surcharge)
  - Total charges calculated: Base tariff + modifiers + taxes
  - Status: "Charges Captured"

Step 3: Insurance Pre-Authorization Check
  - System queries insurance eligibility database
  - Check: Active coverage? Pre-auth required for this service?
  - IF pre-auth needed → Generate auth request, contact insurance
  - IF manual approval needed → Queue for supervisor review
  - IF auto-approved → Proceed to claim submission
  - Status: "Auth Approved" or "Pending Auth"

Step 4: Claim Preparation
  - Billing officer reviews final charges one more time
  - Verifies patient responsibility (copay, deductible, coinsurance)
  - Prepares X12 EDI claim (837 format)
  - Patient receives itemized bill + payment options
  - Status: "Claim Prepared"

Step 5: Claim Submission
  - Claim electronically submitted to insurance
  - System records submission timestamp
  - Insurance assigns claim tracking number
  - Notification: Patient + insurance "Claim submitted"
  - Status: "Claim Submitted"

Step 6: Insurance Response & Adjudication
  - Insurance processes claim (typically 5-10 business days)
  - Sends back Remittance Advice (RA) or Explanation of Benefits (EOB)
  - Outcome: Approved / Approved with Adjustments / Denied / Requested Info
  - Status: "Approved" or "Denied" or "Pending Info"

Step 7: Payment Received
  - Insurance pays approved amount directly to hospital (EOB)
  - Patient invoiced for patient responsibility (copay + deductible + coinsurance)
  - Payment reconciliation: Insurance payment + patient payment = total charged
  - Status: "Approved & Paid"

Step 8: Denied Claim Handling
  - IF denied → Identify reason (authorization missing, code incorrect, etc.)
  - Generate appeal document with supporting evidence
  - Resubmit appeal or refund patient if appeal unsuccessful
  - Status: "Appealed" or "Write-Off"

Postcondition:
  - Encounter financially closed
  - Revenue recorded in accounting system
  - Patient & insurance reconciled
  - Audit trail: All codes, charges, auth, payments logged
```

#### Acceptance Criteria

- [ ] **AC-1**: Correct CPT/ICD-10 codes assigned 99%+ of time (medical coder review)
- [ ] **AC-2**: Tariff lookup matches negotiated rates with insurance; <1% discrepancies
- [ ] **AC-3**: Pre-auth check completes in <2 min; blocks out-of-auth claims from submission
- [ ] **AC-4**: Insurance claim transmitted in <1 min of preparation
- [ ] **AC-5**: Patient receives itemized bill within 24 hrs of discharge
- [ ] **AC-6**: Appeal workflow initiated within 15 days of denial
- [ ] **AC-7**: Payment reconciliation complete within 30 days
- [ ] **AC-8**: All charges, authorizations, denials logged to immutable audit trail

#### Edge Cases

- **Insurance invalid**: Patient responsible for full charges; attempt to verify later
- **Pre-auth denied**: Claim held; doctor notified; can resubmit with appeals or patient signs financial responsibility
- **Claim denied (code error)**: Correct code, resubmit claim
- **Insurance overpayment**: Reconcile & refund insurance
- **Patient disputes charges**: Generate detailed billing statement; escalate to billing manager
- **Uninsured patient**: Full charges to patient; offer payment plan options
- **Dual insurance**: Coordinate benefits between primary & secondary insurers

---

## Operational Workflows

### 5. Discharge Workflow

**Trigger**: Doctor determines patient ready for discharge  
**Primary Actors**: Doctor, Nurse, Pharmacist, Billing Officer  
**Duration**: 1-2 hours

#### Checklist-Based Process

```
PRE-DISCHARGE VALIDATION (Doctor)
  [ ] All acute conditions addressed
  [ ] Patient clinically stable
  [ ] All standing orders completed
  [ ] No open lab results pending approval
  [ ] Medication reconciliation completed
  [ ] Follow-up appointments scheduled (if needed)

MEDICATION RECONCILIATION (Pharmacist + Doctor)
  [ ] Review admission medications
  [ ] Review hospital-prescribed medications
  [ ] Confirm discharge medications
  [ ] Identify discontinued medications (with reason)
  [ ] Generate discharge medication list (with patient education)
  [ ] Verify no drug interactions in discharge Rx

PATIENT EDUCATION (Nurse)
  [ ] Review discharge instructions verbally
  [ ] Provide written discharge summary
  [ ] Discuss activity restrictions (if any)
  [ ] Explain medication timing & side effects
  [ ] Confirm follow-up appointment date/time
  [ ] Provide emergency contact numbers

BILLING FINALIZATION (Billing Officer)
  [ ] Review all charges captured
  [ ] Verify insurance coverage
  [ ] Generate final bill + payment plan options
  [ ] Process payment (if co-pay due)
  [ ] Provide itemized bill copy to patient

DISCHARGE AUTHORIZATION (Doctor)
  [ ] Review all items above
  [ ] Sign discharge order
  [ ] Status: "Discharged"

POST-DISCHARGE (System)
  [ ] Mark bed as available
  [ ] Schedule follow-up appointment reminder (3 days)
  [ ] Send discharge summary to PCP (primary care provider)
  [ ] Archive encounter
```

#### Acceptance Criteria

- [ ] **AC-1**: Discharge checklist prevents missing steps; enforces department reviews
- [ ] **AC-2**: Cannot discharge without doctor signature
- [ ] **AC-3**: Discharge medications verified against allergies & interactions
- [ ] **AC-4**: Patient receives both verbal & written instructions; sign-off documented
- [ ] **AC-5**: Follow-up appointment auto-scheduled within 7 days (customizable)
- [ ] **AC-6**: Patient contacted 1-3 days post-discharge (satisfaction survey, flag complications)
- [ ] **AC-7**: All discharge activities logged for audit trail
- [ ] **AC-8**: Discharge summary available to patient portal within 24 hrs

---

## Analytics & Reporting

### 6. Role-Specific Dashboards

#### Doctor Dashboard
- **Pending consultations**: Queue of patients waiting to see doctor
- **My orders**: Pending lab orders, imaging, prescriptions awaiting results
- **Patient lists**: Assigned inpatients, outpatients scheduled today
- **Lab results pending approval**: Count, trending abnormals
- **Alerts**: Critical lab values, medication interactions flagged
- **KPIs**: Avg consultation time, patient satisfaction score, referral sources

#### Nurse Dashboard
- **Vital signs monitoring**: Real-time vital trends, alerts for abnormal values
- **Medication admin**: Pending meds to administer (time-specific)
- **Patient care plans**: Assigned patients, care activities due
- **Alerts**: Critical vitals, medication interactions, equipment required
- **KPIs**: Patient safety incidents, medication error rate, discharge timelines

#### Pharmacist Dashboard
- **Dispensing queue**: Pending prescriptions to fill
- **Drug interactions alerting**: Flagged Rx, severity levels
- **Inventory alerts**: Low stock items, expiring medications
- **Compliance**: Expired drug disposal, storage temperature monitoring
- **KPIs**: Dispensing accuracy, fill time, medication error rate

#### Receptionist Dashboard
- **Appointment queue**: Scheduled appointments, check-ins, no-shows
- **Wait times**: Current wait for each doctor, avg wait trending
- **Patient check-in**: Current check-in status, vital signs collected
- **Insurance verification**: Pending coverage verifications
- **KPIs**: No-show rate, avg wait time, patient satisfaction

#### Lab Technician Dashboard
- **Specimen collection queue**: Pending collections, priority levels
- **Results entry**: QC-passed results ready for entry
- **Critical value alerts**: High-priority results needing immediate action
- **Inventory**: Lab supplies, reagents status
- **KPIs**: Turnaround time, specimen rejection rate, QC pass rate

#### Patient Portal Dashboard
- **My appointments**: Upcoming appointments, past visit summaries
- **My prescriptions**: Active Rx, refill requests, dispensing status
- **My lab results**: Recent results, trending values
- **Medical records**: Discharge summaries, consultation notes
- **Messaging**: Secure messages with care team
- **My health metrics**: Weight, blood pressure trends (if monitored at home)

#### Admin Dashboard
- **System metrics**: Uptime, API latency, error rates
- **User management**: Active users, role distribution, recent logins
- **Hospital KPIs**: Revenue, patient volume, avg length of stay
- **Compliance**: Audit trail access count, data breach incidents (zero expected)
- **Alerts**: System capacity, failed jobs, upcoming maintenance

---

## AI-Powered Clinical Support

### 7. Differential Diagnosis Assistant

**Purpose**: Suggest possible diagnoses based on patient symptoms  
**Input**: Patient symptoms, vital signs, comorbidities, past medical history  
**Output**: Ranked list of possible diagnoses with confidence scores

#### Workflow

```
Patient presents with symptoms
    ↓
Doctor enters chief complaint + symptoms (system provides checklist)
    ↓
AI model reviews: Symptoms + vitals + comorbidities + PMH
    ↓
Generates top 5-10 differential diagnoses ranked by probability
    ↓
Doctor reviews suggestions:
    - Accept diagnosis → Document in chart
    - Reject suggestion → Provide feedback
    - Manual entry → Doctor's own diagnosis (educational)
    ↓
Order diagnostic tests (suggested labs, imaging)
    ↓
Results inform final diagnosis confirmation
```

#### Acceptance Criteria

- [ ] **AC-1**: Top suggested diagnosis matches physician's final diagnosis 70%+ of time (30-day rolling)
- [ ] **AC-2**: Suggestions include rare/zebra diagnoses when clinical context suggests
- [ ] **AC-3**: Confidence score transparent; doctor understands why suggestion ranked high
- [ ] **AC-4**: No diagnostic suggestion blocks doctor's own clinical judgment (suggestions only)
- [ ] **AC-5**: Feedback loop: Doctor overrides help train model (with privacy-preserving methods)

---

### 8. Predictive Analytics

#### Length of Stay Prediction
- **Input**: Admission diagnosis, age, comorbidities, treatment plan  
- **Output**: Predicted LOS (e.g., "3-5 days" with 80% confidence), resource needs
- **Use**: Bed management, discharge planning, resource allocation

#### Readmission Risk
- **Input**: Discharge diagnosis, medications, social factors  
- **Output**: 30-day readmission risk score (red/yellow/green)
- **Use**: Follow-up intensity planning, case management prioritization

#### No-Show Prediction
- **Input**: Patient demographics, appointment type, appointment timing  
- **Output**: No-show likelihood (%)
- **Use**: Overbooking decisions, reminder call prioritization

---

## Acceptance Criteria By Feature

### Universal Requirements (All Features)

- [ ] **AC-Universal-1**: Multi-tenancy enforced; users only see own hospital data
- [ ] **AC-Universal-2**: HIPAA encryption applied to all PHI fields
- [ ] **AC-Universal-3**: All user actions logged to audit trail (who, what, when, IP)
- [ ] **AC-Universal-4**: Role-based permission enforcement (no unauthorized access)
- [ ] **AC-Universal-5**: Latency <2 seconds for all user interactions (P95)
- [ ] **AC-Universal-6**: Data validation prevents invalid states (checked at UI + API + DB)
- [ ] **AC-Universal-7**: Error messages are user-friendly; no stack traces or PHI exposed
- [ ] **AC-Universal-8**: Mobile responsive; functions on phones (320px+), tablets, desktop
- [ ] **AC-Universal-9**: Accessibility WCAG 2.1 AA compliant (keyboard nav, screen reader, contrast)
- [ ] **AC-Universal-10**: Backward compatibility maintained; no breaking changes without deprecation notice

---

## Document Navigation

- **For workflows**: See `/docs/workflows/` for detailed role-by-role processes
- **For role permissions**: See `/docs/product/RBAC_PERMISSIONS.md`
- **For data model**: See `/docs/product/DATA_MODEL.md`
- **For API reference**: See `/docs/product/API_REFERENCE.md`
- **For testing**: See `/docs/product/TESTING_STRATEGY.md`

---

**Next Step**: Start with a specific workflow (e.g., Prescription) and review the detailed step-by-step process for implementation guidelines.
