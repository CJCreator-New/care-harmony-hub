# Doctor Workflow Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Doctors, healthcare IT staff, developers implementing doctor features

---

## Table of Contents

1. [Doctor Dashboard](#doctor-dashboard)
2. [Patient Consultation Workflow](#patient-consultation-workflow)
3. [Prescription Management](#prescription-management)
4. [Vital Signs & Clinical Assessment](#vital-signs--clinical-assessment)
5. [Lab Order Management](#lab-order-management)
6. [Referrals & Consultations](#referrals--consultations)
7. [Quick Actions & Shortcuts](#quick-actions--shortcuts)
8. [Common Tasks](#common-tasks)

---

## Doctor Dashboard

### Daily Login & Initial View

**Time**: ~2 minutes  
**Objective**: Access patient queue and today's schedule

**Steps**:
1. **Login**
   ```
   Visit https://hospital.caresync.local/login
   Email: doctor@hospital.com
   Password: [secure password]
   ```

2. **Dashboard Loads**
   - Shows today's date and time
   - Hospital name verified in header
   - User role shown: "Doctor"
   - Customizable dashboard widgets

3. **Right Sidebar**
   - `My Appointments Today` (count badge)
   - `Pending Lab Results` (count badge with critical alerts)
   - `Prescription Approvals Needed` (count badge)
   - `Critical Alerts` (real-time, updates sub-ms)
   
### Dashboard Widgets

| Widget | Updated | Notes |
|--------|---------|-------|
| Patient Queue | Per check-in | Shows patients checked in, waiting |
| Upcoming Appointments | Real-time | Next 5 appointments in next 2 hours |
| Lab Results | Real-time | Sorted: Pending > Critical > Normal |
| Prescriptions Awaiting Approval | Real-time | From other doctors/nurses |
| Team On Duty | Per 15 min | Other doctors, nurses, pharmacists logged in |
| Missed Follow-ups | Daily | Patients who missed appointment |

---

## Patient Consultation Workflow

### Pre-Consultation (Receptionist → Doctor)

**Triggered by**: Patient check-in at reception  
**Time**: Instant  
**Source**: Receptionist marks patient as "checked in"

**Doctor sees**:
- Patient card appears in "Checked In" column
- Patient vitals collected by nurse (if already done)
- Patient's chief complaint noted
- Insurance verified ✓ or ⚠ (warning if unverified)

### Consultation Flow

#### Step 1: Start Consultation (1-2 min)

```
Action: Doctor clicks "Start Consultation" on patient card

System does:
- Creates consultation_session record with:
  - start_time: NOW
  - doctor_id: loggedInDoctor.id
  - patient_id: patientId
  - hospital_id: hospital.id
- Locks patient from other providers
- Sets appointment status to "consultation_in_progress"

Doctor sees:
- Full patient panel on left
- Blank consultation form on right
```

**Permission required**: `consultations:create`  
**RLS check**: Patient's hospital_id matches doctor's hospital_id

#### Step 2: Review Patient History (2-3 min)

```
Left Panel Sections:
├── Demographics
│   ├── Name, DOB, Age, Sex
│   ├── Phone, Email
│   ├── Emergency contact
│   └── Insurance (encrypted in DB)
│
├── Medical History (expanded on demand)
│   ├── Past diagnoses
│   ├── Chronic conditions
│   ├── Surgeries with dates
│   └── Hospitalizations
│
├── Allergies & Alerts
│   ├── Drug allergies (RED = contraindicated)
│   ├── Food allergies
│   ├── Environmental allergies
│   └── CRITICAL ALERTS (drug interactions, etc)
│
├── Current Medications
│   ├── From prescriptions_active view
│   ├── Dosages, frequencies
│   └── Link to prescribing doctor
│
├── Recent Vitals (last 7 days)
│   ├── Temperature
│   ├── Blood pressure
│   ├── Heart rate
│   ├── Respiratory rate
│   ├── O2 saturation
│   └── Weight (for dosing calculations)
│
└── Previous Consultations (last 5)
    ├── Date, doctor, chief complaint
    ├── Assessment, plan
    └── Outcomes
```

**How to navigate**:
- Click section header to expand/collapse
- Click any field to see details/history
- `[View Full History]` button opens modal with 1+ years data

#### Step 3: Enter Chief Complaint & HPI (3-5 min)

```typescript
// Form section 1: History of Present Illness
Field: Chief Complaint
- Required, max 200 chars
- Autocomplete suggestions (common: headache, fever, cough, etc.)
- Example: "Persistent cough for 3 days, productive"

Field: Duration
- Required, dropdown: hours/days/weeks/months
- Displays human-readable: "3 days" = "72 hours"

Field: Onset
- Required, date/time picker
- Defaults to 3 days ago

Field: Severity (Visual Scale)
- Scale: 1 (none) to 10 (worst possible pain)
- Slider, large font for patient comfortability
- Example: "Pain is 7/10"

Field: Associated Symptoms
- Checkbox list with common related symptoms
- Can add custom symptoms
- Examples for cough: fever, chills, body ache, fatigue

Field: Progression
- Did symptoms improve? worsen? stay same?
- Timeline helper: "Started Oct 15, worsened Oct 17"

Field: What Tried
- Any over-the-counter medications?
- Home remedies?
- When did symptoms start improving/worsening after treatment?
```

#### Step 4: Physical Examination (3-5 min)

```typescript
// Auto-populated from recent vitals (nurse collected)
Section: Vital Signs (Read-only, from past 2 hours)
- Temperature: 101.5°F (ELEVATED = red background)
- Blood pressure: 140/90 mmHg (HIGH = yellow background)
- Heart rate: 98 bpm (normal)
- Respiratory rate: 18 breaths/min (normal)
- O2 saturation: 96% (normal)
- Weight: 75 kg (updated 2 days ago)

// Doctor can override if rechecked
[Recalculate Vitals?]
- Clicks to enter new readings
- System validates: BP shouldn't change >20 in 2 hours (alert if does)

// Examination findings
Section: Physical Exam
Field: General Appearance
- Normal / Alert & oriented / Distressed / Other

Field: Respiratory
- Lung sounds: Clear / Wheezes / Crackles / Other
- Work of breathing: Normal / Labored

Field: Cardiovascular
- Heart rate: Regular / Irregular
- Murmurs: Yes / No

Field: Abdomen
- Tender: Yes / No / Location
- Distended: Yes / No
- Bowel sounds: Present / Absent

Field: Extremities
- Edema: Yes / No / Location & Grade (1+, 2+, 3+, 4+)
- Cyanosis: Yes / No

Field: Neurologic
- Consciousness: Alert / Confused / Drowsy / Unresponsive
- Orientation: Alert & Oriented x3 / x2 / x1
- focal deficits: Yes / No / Location
```

#### Step 5: Assessment & Diagnosis (3-5 min)

```typescript
// Assessment section
Section: Assessment

// AI POWERED: Doctor gets differential diagnosis suggestions
[Ask AI for Differential Diagnosis]
- Button triggers AI clinical engine
- Shows: diagnosis options ranked by likelihood
  1. "Acute bronchitis" (confidence: 92%)
  2. "Pneumonia" (confidence: 78%)
  3. "Asthma exacerbation" (confidence: 64%)
- Doctor can accept, modify, or ignore suggestions
- AI explanation: "Patient age 45, fever 101.5°F, productive cough suggests..."

Field: Primary Diagnosis
- Required, searchable dropdown
- ICD-10 codes linked (auto append to documentation)
- Examples: J20 (Acute bronchitis), J18 (Pneumonia), J45 (Asthma)

Field: Differential Diagnoses
- Optional, multiple entries
- Helps documentation reviewer understand reasoning

Field: Assessment Notes
- Free text, max 500 chars
- Why this diagnosis? Key findings supporting it?

// AI POWERED: Drug interaction check happens here
[Check for Drug Interactions]
- System checks proposed medications against:
  - Current medications
  - Drug allergies
  - Medical history (contraindications)
- Results:
  - GREEN: Safe to use
  - YELLOW: Use caution, interaction possible
  - RED: CONTRAINDICATED, block prescription
```

#### Step 6: Plan & Treatment (5-10 min)

```typescript
// Treatment plan section
Section: Plan

// Medication prescription
Subsection: Medications
- [+ Add Medication]
  
  Each medication entry:
  ├── Drug Name (searchable, required)
  ├── Dose (required, e.g., "500 mg")
  ├── Unit (dropdown: mg, ml, units, etc.)
  ├── Frequency (dropdown: once daily, twice daily, etc.)
  ├── Route (dropdown: oral, IV, IM, topical, etc.)
  ├── Duration (e.g., "7 days" or "until resolved")
  ├── Quantity (auto-calculated: dose × frequency × days)
  ├── Instructions (e.g., "Take with food", "Avoid dairy")
  ├── Refills (0-11 options)
  ├── [AI: Check Interactions] → Green/Yellow/Red alert
  └── [Delete] button
  
  Note: AI is ALWAYS run for drug interactions before submission

// Lab orders
Subsection: Lab Orders
- [+ Order Lab Test]
  
  Each lab order:
  ├── Test Name (searchable, e.g., "CBC", "CMP", "TSH")
  ├── Urgency (dropdown: Routine, Stat)
  ├── Specimen Type (auto-filled, e.g., "Blood")
  ├── Special Instructions (e.g., "Fasting")
  ├── Date Needed By (defaults to "ASAP", can set future date)
  └── [Delete] button

// Imaging orders
Subsection: Imaging
- [+ Order Imaging]
  
  Each imaging order:
  ├── Imaging Type (searchable, e.g., "Chest X-Ray", "CT Scan")
  ├── Urgency (Routine / Stat)
  ├── Indication (chief complaint context)
  ├── Contrast (if applicable, Yes/No)
  └── [Delete] button

// Referrals
Subsection: Referrals
- [+ Refer to Specialist]
  
  Each referral:
  ├── Specialty (searchable, e.g., "Cardiology", "ENT")
  ├── Urgency (Routine / Soon / STAT)
  ├── Reason (free text, e.g., "Cardiac risk assessment")
  └── [Delete] button

// Procedures
Subsection: Procedures
- [+ Schedule Procedure]
  
  Each procedure:
  ├── Procedure Name (searchable)
  ├── Urgency (Routine / Stat)
  ├── Preferred Date
  ├── Special Preparation
  └── [Delete] button

// Patient instructions
Subsection: Patient Instructions
- Free text area (max 1000 chars)
- Examples:
  - "Take all medications as prescribed"
  - "Rest for 2-3 days"
  - "Return to ER if fever > 103°F or breathing worsens"
  - "Follow up with primary care in 1 week"

// Follow-up
Subsection: Follow-up
- When: required (dropdown: 1 day, 3 days, 1 week, 2 weeks, 1 month, 3 months)
- Who: dropdown
  - Same doctor (default)
  - Another doctor at hospital
  - Primary care (sends referral)
  - Specialist (sends referral)
- Notes: (e.g., "Reassess cough, check labs")
```

#### Step 7: Review & Sign (2-3 min)

```
Preview Section:
[Summary of entire consultation visible]

Before signing, required validations:
✓ Chief complaint entered
✓ At least one assessment entered
✓ Follow-up date set
✓ If medications: Drug interactions checked
✓ If sensitive meds: Reason and justification documented

Action: [Sign Consultation]
- Uses doctor's e-signature (PIN or password)
- Timestamp recorded
- Becomes immutable (can't edit, only add addendums)

After signing:
- Consultation locked
- Prescriptions auto-sent to pharmacy (if any)
- Lab orders auto-sent to lab system (if any)
- Patient receives notification:
  * In-app notification
  * SMS (if opted in)
  * Email (if opted in)
- Consultation available in patient's medical record
- Billing system receives charges (if encounter charged)
```

**Permissions required**:
- `consultations:sign` for e-signature
- `prescriptions:create` if writing prescriptions
- `lab_orders:create` if ordering labs
- `referrals:create` if making referrals

---

## Prescription Management

### Creating Prescriptions (During Consultation)

**Already covered in Step 6: Plan & Treatment**

### Approving Prescriptions (From Other Doctors)

**Scenario**: Another doctor created prescription; needs senior doctor approval

**Steps**:
1. Doctor sees badge on dashboard: `Prescriptions Awaiting (5)`
2. Clicks badge → Approval queue opens
3. Views prescription with:
   - Patient name, DOB, allergies
   - Drug name, dose, frequency
   - Prescribing doctor
   - Reason
   - Patient's current medications (for interaction check)

4. Doctor reviews:
   - ✓ Approve → Prescription sent to pharmacy
   - ✗ Reject → Returned to prescriber with reason
   - ? Request more info → Sends message to prescriber

**Permission required**: `prescriptions:approve`

### Modifying Active Prescriptions

**Scenario**: Patient's medication needs adjustment

**Steps**:
1. Click on prescription in patient's medication list
2. Choose action:
   - Edit (changes dose/frequency)
   - Renew (continues past end date)
   - Discontinue (stops medication)

3. For Edit:
   - New dose, frequency, instructions entered
   - Drug interaction re-checked
   - New e-signature required
   - Old prescription marked "discontinued"
   - New prescription created with reason

4. For Discontinue:
   - Reason required (e.g., "Symptoms resolved", "Adverse effect")
   - e-signature required
   - Pharmacy notified
   - Patient receives notification

**Permission required**: `prescriptions:modify`, `prescriptions:sign`

---

## Vital Signs & Clinical Assessment

### Reviewing Vitals Collected by Nurse

**When**: During consultation, vitals already collected

**Location**: Left panel, "Recent Vitals" section

**How to use**:
- Vitals auto-populate from last 2 hours
- Shows trend: ↑ (worse), ↓ (better), → (stable) with color coding
- Click any vital → View 30-day history graph
- Compare to patient's baseline (flagged if abnormal)

### If Vitals Need Re-checking

**During consultation**:
1. Click `[Recalculate Vitals?]` button
2. Enter new readings for vitals that changed
3. System validates (alerts if BP changed >20 mmHg, etc.)
4. Recorded with timestamp and doctor name

### AI-Powered Critical Value Alerts

**Automatic**: If any vital is critically abnormal
- Temperature > 103°F or < 95°F → RED alert
- Systolic BP > 180 or < 80 → RED alert
- Heart rate > 120 or < 40 → RED alert
- O2 saturation < 92% → RED alert
- Respiratory rate > 30 or < 10 → RED alert

**Doctor sees**:
- RED badge on dashboard
- Detailed alert with suggested actions
- Alert remains until acknowledged

**Doctor action**:
1. Read alert
2. Acknowledge if expected (e.g., "Patient with fever, monitoring")
3. Take action if needed (escalate, call patient, admit, etc.)

---

## Lab Order Management

### Ordering Labs (During Consultation)

**Already covered in Step 6: Plan & Treatment**

### Reviewing Lab Results

**When**: Results come in from lab

**Doctor notified by**:
- Badge on dashboard: `Pending Lab Results (3)`
- Real-time notification (sub-ms Supabase realtime update)
- Optional: SMS alert if critical value

**Steps**:
1. Click badge → Lab results queue
2. View result with:
   - Patient name, test date
   - Lab test name (e.g., "Complete Blood Count")
   - Individual values (e.g., WBC: 7.2 K/uL)
   - Reference ranges (e.g., "4.5-11.0 K/uL")
   - Flags: H (high), L (low), C (critical)
   - Technician name who entered results

3. Evaluate:
   - GREEN: Normal, no action
   - YELLOW: Slightly abnormal, monitor
   - RED: Critical, requires immediate action

4. Approve result:
   - Click `[Approve Result]`
   - Requires e-signature
   - Result locked, becomes part of record
   - Patient notified via app/SMS/email

5. If concerning result:
   - Create new consultation note
   - Order follow-up labs
   - Refer to specialist
   - Admit to hospital

**Permission required**: `lab_results:approve`

---

## Referrals & Consultations

### Making Specialist Referrals

**During consultation**:
- Add to "Referrals" section (Step 6)
- Choose specialty, urgency, reason
- Auto-sends to specialist with patient info

### Receiving Consultation Requests

**Scenario**: Another doctor wants your opinion

**Doctor sees**: Badge `Consultations Requested (2)`

**Steps**:
1. Click badge → View consultation request
2. Contains:
   - Referring doctor, specialty
   - Patient info
   - Chief complaint, exam findings
   - Specific question (e.g., "Rule out cardiac cause")
   - Access to full patient record

3. Respond:
   - Review records, maybe see patient
   - Document consultation note
   - Recommendations for referring doctor
   - e-signature required

**Permission required**: `consultations:create` (when documenting), `consultations:read` (when viewing)

---

## Quick Actions & Shortcuts

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | Open quick search (patient, medication, etc.) |
| `Cmd/Ctrl + N` | New consultation |
| `Cmd/Ctrl + S` | Save consultation draft |
| `Cmd/Ctrl + Enter` | Sign & submit consultation |
| `Cmd/Ctrl + R` | Start new referral |

### Speed Features

**Quick Consultation** (for simple visits):
- Click patient → Opens simple form
- Chief complaint → Diagnosis → Plan
- 2-minute completion time

**Repeat Prescription**:
- Click patient → Medications tab
- Click on past prescription → `[Repeat Same]`
- Defaults to same dose/frequency, confirm and sign

**Copy from Previous**:
- Click patient → Consultations tab
- Click past consultation → `[Use as Template]`
- Populates form with same structure, doctor edits as needed

---

## Common Tasks

### Task: Patient Comes In With Flu-like Symptoms

**Expected workflow**: 8-10 minutes

```
1. Login to dashboard [1 min]
   └─ See patient in checked-in queue

2. Start consultation [1 min]
   └─ Create consultation_session

3. Review history [2 min]
   └─ Check allergies, current meds, past respiratory infections

4. Enter HPI [2 min]
   └─ Chief: "Fever, cough, body ache × 2 days"
   └─ Onset: 2 days ago
   └─ Fever: 101°F, severity 6/10
   └─ Associated: chills, fatigue

5. Review vitals [1 min]
   └─ Already collected by nurse: Temp 101.5°, BP 120/78, HR 88

6. Assessment [1 min]
   └─ Use AI: suggests viral URI, influenza
   └─ Primary diagnosis: J11 (Influenza)

7. Plan [2 min]
   └─ Acetaminophen 500mg Q6H
   └─ Check interaction: OK
   └─ Lab (optional): Rapid flu test
   └─ Patient education: Rest, hydration, return if worsens
   └─ Follow-up: 3 days (reassess if symptoms persistent)

8. Sign & submit [1 min]
   └─ e-signature
   └─ System sends to pharmacy, notifies patient
```

**Total time**: 8-10 minutes  
**Permissions checked**: consultations:create, prescriptions:create, consultations:sign

### Task: Approve Pending Prescription from Colleague

**Expected workflow**: 3-5 minutes

```
1. See badge: "Prescription Approvals (1)" [instant notice]

2. Click badge → View prescription [1 min]
   ├─ Patient: John Smith, DOB 1975-05-20, Age 49
   ├─ Drug: Lisinopril 10mg daily
   ├─ Allergies: Penicillin
   ├─ Current meds: Metoprolol, Atorvastatin
   ├─ Prescriber: Dr. Sarah Chen
   ├─ Reason: "Hypertension management"

3. Check interactions [1 min]
   └─ System shows: Green - No interactions found

4. Review clinical appropriateness [1-2 min]
   └─ Patient is 49, has hypertension history
   └─ Lisinopril is standard first-line agent
   └─ Dosing appropriate

5. Approve [1 min]
   └─ Click [Approve]
   └─ e-signature
   └─ System sends to pharmacy
```

**Total time**: 3-5 minutes  
**Permission required**: prescriptions:approve

---

## Common Issues & Troubleshooting

| Issue | Solution |
|-------|----------|
| "Patient not found" | Check spelling, ask receptionist for ID |
| Drug interaction warning appears | Review AI recommendation, discuss with pharmacist if unsure |
| Can't save consultation | Ensure chief complaint & diagnosis filled |
| Critical value alert | Review immediately, call patient if concerning |
| E-signature fails | Try again, restart browser if persists |

---

## Compliance & Best Practices

✅ **Always**:
- Review allergy list before prescribing
- Use AI to check drug interactions
- Document assessment clearly
- Set appropriate follow-up dates
- Sign consultations before leaving patient

❌ **Never**:
- Prescribe without reviewing allergies
- Skip drug interaction check for routine meds (AI catches most)
- Leave consultations unsigned
- Modify old consultations (add addendum instead)
- Share patient data outside secure system

---

**Questions or issues?** Contact IT support or reference [SYSTEM_ARCHITECTURE.md](../product/SYSTEM_ARCHITECTURE.md) for technical details.
