# CareSync HIMS - Role-Based Workflows & User Journeys

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026

---

## Quick Reference: Domain-Specific Workflows

### Index to Workflow Documents

| Role | Workflows | Pages | Document |
|------|-----------|-------|----------|
| **Patient** | Self-serve portal, book appointments, view records | 3-5 | [Patient Workflows](./workflows/patient.md) |
| **Receptionist** | Appointments, check-in, insurance verification | 4-6 | [Receptionist Workflows](./workflows/receptionist.md) |
| **Doctor** | Consultations, orders, approvals | 5-8 | [Doctor Workflows](./workflows/doctor.md) |
| **Nurse** | Vital signs, medication admin, care plans | 4-7 | [Nurse Workflows](./workflows/nurse.md) |
| **Pharmacist** | Dispensing, inventory, drug interactions | 3-5 | [Pharmacist Workflows](./workflows/pharmacist.md) |
| **Lab Technician** | Specimen collection, results entry, QC | 3-5 | [Lab Tech Workflows](./workflows/lab_technician.md) |
| **Admin** | User management, settings, compliance | 6-10 | [Admin Workflows](./workflows/admin.md) |

---

## Cross-Role Journey Maps

### Journey 1: Patient Appointment to Doctor Consultation

```
START: Patient wants appointment
    ↓
PATIENT (Portal): Browse available doctors + slots
PATIENT (Portal): Book appointment → Choose date/time/reason
    ↓
SYSTEM: Send confirmation SMS/Email to patient
    ↓
DAY OF APPOINTMENT
    ↓
PATIENT (Clinic): Arrive 15 min early
RECEPTIONIST: Verify identity + insurance
RECEPTIONIST: Mark check-in; assign queue #
NURSE: Take vitals
    ↓
DOCTOR: View patient in queue
DOCTOR: Call patient into consultation room
DOCTOR: Document HPI (History of Present Illness)
DOCTOR: Perform examination
DOCTOR: Document assessment + plan
DOCTOR: Order labs/imaging (if needed)
DOCTOR: Write prescriptions (if needed)
DOCTOR: Mark consultation complete
    ↓
NURSE: Provide discharge instructions
RECEPTIONIST: Handle payment/billing
    ↓
END: Patient leaves clinic
    ↓
24-48 HRS LATER:
PATIENT (Portal): View consultation notes
NURSE: Follow-up call (if needed)
    ↓
END: Complete
```

### Journey 2: Doctor Order to Lab Result to Patient Notification

```
DURING CONSULTATION:
DOCTOR: Reviews symptoms → Decides to order lab test
DOCTOR: Selects test type (e.g., Complete Blood Count)
DOCTOR: Specifies clinical indication + specimen requirements
DOCTOR: Mark as priority (Routine / Urgent / STAT)
    ↓
IMMEDIATELY:
SYSTEM: Notification to Lab Tech Queue
LAB TECH: Receives alert "New specimen collection needed"
    ↓
DURING LAB PROCESSING (4-24 HRS):
LAB TECH: Schedules specimen collection (patient contacted if needed)
LAB TECH: Collects specimen + barcodes + logs collector/time
LAB TECH: Transports to analyzer
ANALYZER: Runs test + generates results
SYSTEM: Compares to reference ranges → Flags abnormals
    ↓
CRITICAL VALUE? → Immediate Phone Alert to Doctor
NORMAL? → Pending approval workflow
    ↓
DOCTOR: Reviews result in patient chart
DOCTOR: Compares to prior results + clinical context
DOCTOR: Adds assessment (if needed)
DOCTOR: Approves result
    ↓
SYSTEM: Patient notified "Lab result available"
    ↓
PATIENT (Portal): Views result within 30 min
PATIENT (Portal): Sees doctor's assessment + next steps
    ↓
END: Patient informed
```

### Journey 3: Doctor Prescription Order to Patient Pickup

```
DURING CONSULTATION:
DOCTOR: Reviews patient medications + allergies (system validates)
DOCTOR: Creates prescription (drug + dose + frequency)
    ↓
SYSTEM: Checks Drug Interactions (vs other meds + allergies)
  IF NO CONFLICTS → Green light
  IF YELLOW FLAG → Alert doctor; doctor acknowledges
  IF RED FLAG → Block; suggest alternative
    ↓
DOCTOR: Reviews prescription
DOCTOR: E-signs (timestamp + cryptographic signature)
STATUS: Signed
    ↓
SYSTEM: 
  - Notifications: Pharmacist + Patient ("Rx ready at pharmacy")
  - Audit log: Doctor signature + timestamp
    ↓
PHARMACIST (Pharmacy):
  - Queue updated with new Rx
  - Verifies drug in stock
  - IF out of stock → Contacts doctor
  - IF in stock → Scans barcode + lot number
  - Prepares medication + labels
  - Status: Dispensed
    ↓
SYSTEM: Patient notified "Ready for pickup at [Pharmacy]"
    ↓
PATIENT: Arrives at pharmacy with ID
PHARMACIST: Verifies patient identity
PHARMACIST: Provides medication + counseling
PHARMACIST: Confirms patient understands usage
    ↓
Status: Picked Up
AUDIT: All steps logged (who, what, when, signature)
    ↓
END: Patient has medication
```

---

## Detailed Workflow: Doctor Consultation

### Step-by-Step Process

#### 1. Patient Arrives (Check-In)

```
T-15 min: Patient checks in at receptionist
  - Receptionist verifies ID + insurance
  - Updates demographics (address, phone, emergency contact)
  - Reviews allergy list (confirm still accurate)
  - Marks status: "Checked In"
  - Prints patient summary card (demographics, allergies, meds)

T-10 min: Nurse takes vitals
  - BP, HR, Temp, RR, O2 sat
  - Weight, height (if first visit)
  - Screens: Pain level, mobility, safety concerns
  - System compares to prior results:
    - Yellow alert if abnormal trend
    - Red alert if critically abnormal (e.g., BP 180/110)
  - Nurse documents findings in patient chart
```

#### 2. Doctor Consultation

```
T+0 min: Doctor views patient in queue
  - Queue shows: [Patient Name] | [Age] | [Reason] | [Wait Time]
  - Doctor clicks → Patient chart loads
  - Chart displays:
    - Demographics, allergies, current medications
    - Recent vitals (just taken by nurse)
    - Past medical history
    - Prior relevant notes (searchable)

T+0-1 min: Doctor reviews chart before entering room
  - Glances at vitals: Any red flags?
  - Allergies confirmed
  - Meds cross-checked

T+1-15 min: In-room consultation
  - Greets patient, explains reason for visit
  - Takes "History of Present Illness" (HPI):
    * When did symptoms start?
    * What makes it better/worse?
    * Any associated symptoms?
  - Physical examination (documented via keyboard or voice)
  - Differential diagnosis (system suggests if enabled)

T+15 min: Assessment & Plan

ASSESSMENT: Doctor's interpretation
  - Primary diagnosis (ICD-10 code)
  - Comorbidities relevant to chief complaint
  - Clinical reasoning documented

PLAN: What happens next
  1. Orders (if needed):
     - Lab tests (with clinical indication)
     - Imaging (with indication)
     - Specialist referrals
  2. Prescriptions (with drug interaction check):
     - Drug name + dose + route + frequency + duration
  3. Patient instructions:
     - Activity restrictions
     - Diet modifications
     - When to follow up
  4. Follow-up:
     - Schedule next appointment (if needed)
     - Timeline for result review

T+18 min: Close consultation
  - Nurse notes any discharge instructions
  - Mark in EHR: "Consultation Complete"
  - Patient checks out
```

#### 3. Post-Visit (Next 24 Hours)

```
LAB RESULTS ENTRY:
  - Lab tech enters results from analyzer
  - Critical values flagged → Doctor immediate alert
  - Non-critical results → Pending doctor review

LAB APPROVAL:
  - Doctor reviews result vs clinical context
  - IF matches expected finding → Approve, add note
  - IF unexpected → Order additional tests, add note
  - Status: Approved → Patient notified

PRESCRIPTION FULFILLMENT:
  - Pharmacist dispenses Rx
  - Patient notifies to pickup
  - Patient visits pharmacy

FOLLOW-UP:
  - If urgent concerns → Nurse calls patient same day
  - If routine → Patient portal updated with visit summary
  - If referral → Specialist receives referral electronically
```

---

## High-Priority Workflows (Patient Safety Focused)

### Critical Value Alert Workflow

```
Lab Result with Critical Value Detected
    ↓
IMMEDIATE (< 1 min):
  - Alert to doctor (phone call OR in-app alert)
  - Alert to ordering physician specifically
  - Escalation if no response in 5 min
    ↓
DOCTOR RESPONSE (5-15 min):
  - Doctor views result + patient chart
  - Decision: Immediate action? (e.g., admit to hospital)
  - Document decision in chart
    ↓
IF EMERGENCY:
  - Admit patient to ICU
  - Transfer from clinic to ED
  - Notify family
    ↓
IF MANAGEABLE:
  - Call patient with guidance
  - Schedule urgent follow-up appt
  - Email visit instructions
    ↓
AUDIT LOG (Immutable):
  - Time critical value detected
  - Doctor notified at [timestamp]
  - Doctor acknowledged at [timestamp]
  - Action taken: [description]
  - Result: Patient outcome (positive, investigating, etc.)
```

### Drug Interaction Alert Workflow

```
Doctor enters prescription for patient already on meds
    ↓
SYSTEM CHECKS:
  - Drug vs patient's active medications
  - Drug vs patient's allergies
  - Drug vs patient's renal/hepatic function (if applicable)
    ↓
NO INTERACTION FOUND:
  - Green light: "Safe to prescribe"
  - Doctor continues to sign
    ↓
YELLOW FLAG (Consider but OK):
  - Alert: "Monitor for side effects X, Y, Z"
  - Doctor acknowledges
  - System logs acknowledgment
  - Doctor continues to sign
    ↓
RED FLAG (Dangerous):
  - BLOCK: "Cannot prescribe: Life-threatening interaction"
  - Suggest alternative drug class
  - Doctor can override ONLY with:
    - Chief complaint documented (why necessary despite risk)
    - Supervisor approval (if junior doctor)
    - Patient consent documented
    ↓
If override justified:
  - Additional safety measures documented
  - Pharmacist alerted (double-check before dispensing)
  - Close monitoring recommended (patient called in 24h)
```

---

## Workflow Troubleshooting

### Common Issues & Resolutions

| Issue | Root Cause | Resolution |
|-------|-----------|-----------|
| Doctor can't see patient allergies | Allergies not entered during registration | Receptionist updates allergies BEFORE consultation |
| Prescription won't go through | Drug not in hospital formulary | Doctor selects alternative or requests exception |
| Lab results not appearing | Lab tech hasn't entered results | Check lab analyzer status; if down, manual entry needed |
| Critical value alert not sent | Doctor's phone # not in system | Admin updates contact info immediately |
| Patient says appointment was cancelled but system shows scheduled | Patient no-show not marked | Manual review + communication with patient |

---

## Workflow Constraints & SLAs

### Service Level Agreements (SLAs)

| Workflow Event | Target Time | Hard Limit |
|---|---|---|
| Check-in to vitals done | 10 min | 15 min |
| Patient checked in to doctor starting visit | 30 min | 45 min |
| Consultation completion to discharge | 20 min | 30 min |
| Lab critical value → Doctor alert | 1 min | 5 min |
| Lab critical value → Doctor acknowledgment | 15 min | 30 min |
| Prescription signed to pharmacist notification | 30 sec | 1 min |
| Pharmacist dispense to patient notification | 5 min | 10 min |
| Patient self-book verification email | 10 sec | 30 sec |

### Capacity Constraints

| Resource | Capacity | Utilization Target |
|---|---|---|
| Doctor appointment slots | 40/day (15-min slots) | 85% (34 appointments) |
| Lab specimens/day | 500 | 90% (450) |
| Pharmacy transactions/day | 1000 | 80% (800) |

---

## Documentation Navigation

### For Feature Implementation

- **Starting feature**: See [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md)
- **Data model**: See [DATA_MODEL.md](./DATA_MODEL.md)
- **API details**: See [API_REFERENCE.md](./API_REFERENCE.md)
- **Testing**: See [TESTING_STRATEGY.md](./TESTING_STRATEGY.md)

### For Role-Specific Details

- Create individual workflow markdown files in `/docs/workflows/`:
  - `patient.md`
  - `receptionist.md`
  - `doctor.md`
  - `nurse.md`
  - `pharmacist.md`
  - `lab_technician.md`
  - `admin.md`

---

**Next**: Pick a specific workflow and implement it end-to-end (frontend + backend + tests).
