# Pharmacist Workflow Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Pharmacists, pharmacy technicians, healthcare IT staff

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Pharmacy Dashboard](#pharmacy-dashboard)
3. [Prescription Review & Approval](#prescription-review--approval)
4. [Drug Interaction Checking](#drug-interaction-checking)
5. [Medication Dispensing](#medication-dispensing)
6. [Patient Counseling](#patient-counseling)
7. [Refill Management](#refill-management)
8. [Common Tasks](#common-tasks)

---

## Role Overview

**Primary Responsibilities**:
- Review prescriptions for safety & appropriateness
- Check for drug interactions, allergies, contraindications
- Approve or reject prescriptions
- Counsel patients on medication use
- Manage refills and authorized generics
- Track controlled substances

**Permissions Held**:
- `prescriptions:view_all` - See all prescriptions for hospital
- `prescriptions:approve` - Approve or reject prescriptions
- `prescriptions:modify_dose` - Suggest/make minor dose adjustments
- `medications:dispense` - Record medication dispensing
- `patients:view` - View patient information & allergies
- `drug_interaction:check` - Run interaction database
- `controlled_substances:track` - Manage Schedule II-V drugs

**Cannot Do**:
- Create prescriptions (only doctors/nurses)
- View other hospitals' data
- Change appointments or patient records (except medication info)
- Approve outside their license scope

---

## Pharmacy Dashboard

### Incoming Prescription Queue

```
Pharmacy System Screen

PRESCRIPTION QUEUE
Today: Tuesday, April 8, 2026, 2:15 PM

NEW PRESCRIPTIONS (Pending Approval)
├─ 1. Metformin 500mg BID × 30 days
│    Patient: John Smith (DOB: 1975-05-20)
│    Prescriber: Dr. Sarah Chen
│    Time received: 2:10 PM (5 min ago)
│    Status: ⏳ AWAITING PHARMACIST REVIEW
│    [VIEW & APPROVE]
│
├─ 2. Lisinopril 10mg daily × 90 days (3 refills)
│    Patient: Jane Doe (DOB: 1962-03-15)
│    Prescriber: Dr. James Lee
│    Time received: 2:05 PM (10 min ago)
│    Status: ⏳ AWAITING PHARMACIST REVIEW
│    [VIEW & APPROVE]
│
└─ 3. Amoxicillin 500mg BID × 7 days
     Patient: Robert Wilson (DOB: 1980-12-01)
     Prescriber: Dr. Sarah Chen
     Time received: 1:55 PM (20 min ago)
     Status: ⏳ AWAITING PHARMACIST REVIEW
     [VIEW & APPROVE]

REJECTED PRESCRIPTIONS (Needs Doctor Contact)
├─ Warfarin + Aspirin (High bleeding risk)
│  Patient: Alice Johnson
│  Prescriber: Dr. Lee
│  Issue: Drug interaction
│  Status: 🔴 NEEDS DOCTOR CALLBACK
│  Suggested: "Consider alternative anticoagulant or remove aspirin"
│  [CONTACT DR. LEE]
│
└─ Metformin (Patient has CKD stage 4)
   Patient: Charlie Brown
   Prescriber: Dr. Chen
   Issue: Contraindicated with renal function
   Status: 🔴 NEEDS DOCTOR CALLBACK
   [CONTACT DR. CHEN]

READY TO DISPENSE (Approved, Waiting for Patient)
└─ Lisinopril 10mg (Jane Doe) - Approved 1:30 PM
   Filled by: Tom (Tech)
   Status: ✓ READY FOR PICKUP or DELIVERY
   [MARK PICKED UP] [SCHEDULE DELIVERY]

CURRENT WORKFLOW METRICS
├─ Average approval time: 3 minutes
├─ Prescriptions pending: 3
├─ Customer wait time: 5 minutes average
└─ Interaction alerts: 1 active
```

---

## Prescription Review & Approval

### Step-by-Step Prescription Review

```
Pharmacist clicks: [VIEW & APPROVE]
On: Metformin 500mg BID × 30 days

Screen opens:

PRESCRIPTION REVIEW

PATIENT INFORMATION
├─ Name: John Smith
├─ DOB: May 20, 1975 (Age 49)
├─ Hospital ID: hosp-123
├─ Allergies: NKDA (No Known Drug Allergies) ✓
├─ Renal Function: eGFR 78 ml/min (Normal) ✓
└─ Hepatic Function: Normal ✓

PRESCRIPTION DETAILS
├─ Drug: Metformin hydrochloride
├─ Dose: 500 mg
├─ Route: Oral
├─ Frequency: Twice daily (morning & evening)
├─ Duration: 30 days
├─ Quantity: 60 tablets (30 days × 2 daily)
├─ Refills: 3 authorized
├─ Prescriber: Dr. Sarah Chen (MD, valid license)
├─ Timestamp: April 8, 2026, 2:10 PM
└─ E-signature: ✓ Verified

CLINICAL CONTEXT
├─ Chief Complaint: Annual checkup
├─ Diagnosis: Type 2 Diabetes (E11.9)
├─ Recent Labs: HbA1c 7.2%, Glucose 145 mg/dL
└─ Current Meds:
    • Lisinopril 10mg daily
    • Atorvastatin 20mg daily

DRUG INTERACTION CHECK (AI-powered)
├─ Metformin + Lisinopril: ✓ SAFE
├─ Metformin + Atorvastatin: ✓ SAFE
├─ Metformin + Allergies: ✓ SAFE (NKDA)
├─ Renal function: ✓ SAFE (eGFR 78, safe for Metformin)
└─ Overall Risk: ✓ LOW

DOSE APPROPRIATENESS
├─ Standard dose for Type 2 DM: 500-2000mg daily ✓
├─ Patient's dose: 1000mg daily (within range)
├─ Start low approach? Patient seems appropriate for this dose
└─ ✓ APPROPRIATE

PHARMACY ASSESSMENT

Pharmacist thinking:
"49-year-old with T2DM,  newly diagnosed or dose adjustment?
Normal renal/hepatic function. On ACE inhibitor & statin - 
good cardiovascular protection. Metformin appropriate first-line.
Dose reasonable. No interactions. No contraindications."

DECISION OPTIONS:

[✓ APPROVE] - Prescription is appropriate
[⚠️ APPROVE WITH CAUTION] - Approve but needs patient counseling
[? CONTACT PRESCRIBER] - Have questions, call doctor
[✗ REJECT] - Do not fill, return to prescriber
```

### Approving Prescription

```
Pharmacist clicks: [✓ APPROVE]

System shows:

PHARMACIST APPROVAL FORM

Pharmacist Name: Susan Rodriguez (RPH)
License #: RPH-45732
Approval Time: April 8, 2026, 2:13 PM

Clinical Notes (optional):
"Patient new to Metformin. Ensure counseling on 
gastrointestinal side effects. Take with food. 
Monitor for lactic acidosis symptoms (rare)."

[CONFIRM APPROVAL]

System:
├─ Records approval with pharmacist signature
├─ Sends to pharmacy floor: "Metformin ready to fill"
├─ Notifies pharmacy technician
├─ Adds to "Ready to Dispense" queue
├─ Timestamp: 2:13 PM (3 min from receipt)
├─ Sends notification to patient:
│  "Your prescription for Metformin is ready!
│   Pick up at pharmacy or we can delivery."
└─ Updates doctor's record (prescription filled)
```

### Rejecting Prescription (Example: Drug Interaction)

```
Pharmacist reviews: Warfarin + Aspirin combo

Drug Interaction Check Results:

🔴 MAJOR INTERACTION DETECTED

Warfarin (anticoagulant - blood thinner)
  + Aspirin (antiplatelet - blood thinner)
  = INCREASED BLEEDING RISK

Both drugs thin blood. Together = too much bleeds risk.
Normal: Acceptable if monitored closely, but not standard.
Alternative: Usually choose ONE or the other.

INTERACTION SEVERITY: 🔴 MAJOR
RECOMMENDATION: Contact prescriber for clarification

Pharmacist action:

[? CONTACT PRESCRIBER]

System opens call dialog:

PRESCRIPTION REQUIRES PHARMACIST REVIEW

Patient: Alice Johnson
Prescriber: Dr. James Lee
Issue: Significant drug interaction
Prescriber's phone: [Auto-filled from system]

Pharmacist calls:
"Hi Dr. Lee, Susan from pharmacy calling about 
Alice Johnson's prescription. I'm seeing both 
Warfarin and Aspirin together. That combo increases 
bleeding risk significantly. Did you want to keep both, 
or did you mean to choose one?"

Doctor responds:
a) "Oh, that was a mistake - remove Aspirin"
   → Pharmacist updates: Reject Aspirin, approve Warfarin
   
b) "Yes, I want both - patient needs both"
   → Pharmacist documents: "Prescriber aware of interaction,
      approved despite major interaction. Patient on close monitoring."
   → Approve both with clinical note
   
c) "Let me check the chart and call you back"
   → Pharmacist waits for callback

System records:
├─ Interaction detected: Yes
├─ Doctor notified: Yes, time: 2:15 PM
├─ Doctor decision: Initial Aspirin removed per doctor
├─ Final decision: Approve Warfarin only
├─ Clinical note: "Interaction flagged, doctor removed aspirin"
└─ Approved: Warfarin only
```

---

## Drug Interaction Checking

### AI-Powered Interaction Engine

```
System automatically checks:

For every new prescription, system asks:

1. Patient Allergies?
   └─ Is drug in allergy list? → BLOCK if yes

2. Current Medications?
   ├─ Check each combination
   ├─ Database: 250,000+ documented interactions
   ├─ Categorize: Safe, Caution, Contraindicated
   └─ Alert if Major/Moderate interaction found

3. Medical Conditions?
   ├─ Patient has kidney disease? → Adjust dose or block if contraindicated
   ├─ Patient has liver disease? → Flag hepatotoxic drugs
   ├─ Pregnancy? → Check pregnancy category (A/B/C/D/X)
   └─ Age considerations? (pediatric, geriatric dosing)

4. Renal/Hepatic Function?
   ├─ Calculate: Is standard dose safe for this patient?
   ├─ CrCl (creatinine clearance) < 30? → May need dose adjustment
   └─ LFTs elevated? → Flag hepatotoxic drugs

Example Alert:

MODERATE INTERACTION DETECTED ⚠️

Drug: Metformin
+ Current med: Alcohol (patient reports social use)
= Increased lactic acidosis risk (rare but serious)

RECOMMENDATION: 
Advise patient to limit alcohol to <2 drinks/week
Counsel on lactic acidosis symptoms

PHARMACIST OPTIONS:
[✓ Approve + Counsel] - Fill with counseling
[⚠️ Contact Doctor] - Ask if doctor aware
[✗ Reject] - Do not fill
```

### Pharmacist Review of AI Flags

```
Process:

AI flags potential issues (80-90% accuracy)
↓
Pharmacist reviews each flag (10-20% false positives)
↓
Pharmacist decides: Approve, approve with counseling, or contact doctor
↓
Decision recorded with rationale

Pharmacist might override AI if:
- Interaction is mild and expected (e.g., mild constipation)
- Benefit outweighs risk (e.g., patient really needs both drugs)
- Prescriber specifically documents awareness of issue

Pharmacist must NOT override AI if:
- Allergy match (never)
- Contraindicated in renal/hepatic disease with no clearance from doctor
- Looks like prescriber error (wrong dose, wrong frequency)
```

---

## Medication Dispensing

### Filling Prescription

```
Prescription: Metformin 500mg × 60 tablets
Approved by: Susan Rodriguez
Approved time: 2:13 PM

Notification to pharmacy floor:

READY TO FILL
Patient: John Smith, DOB: 5/20/1975
Drug: Metformin HCl 500mg tablets
Qty: 60 tablets
Filled by: Tom (Pharmacy Tech)
Time started: 2:14 PM

Pharmacy Tech Tom:
1. Selects correct medication bin (M-section, Metformin)
2. Verifies: 500mg strength ✓
3. Counts: 60 tablets
4. Verifies count is correct (uses automated counter if available)
5. Labels bottle with:
   ├─ Patient name: JOHN SMITH
   ├─ DOB: 5/20/1975 (for verification)
   ├─ Drug: Metformin 500mg
   ├─ Directions: Take one tablet twice daily with food
   ├─ Qty: 60 tablets
   ├─ Refills: 3 remaining
   ├─ Filled date: 4/8/26
   ├─ Expiration: 4/8/27 (1 year)
   ├─ Prescriber: Dr. Sarah Chen
   ├─ Pharmacy: [Hospital Pharmacy]
   └─ ⚠️ TAKE WITH FOOD (in red)

6. Places in bag with:
   ├─ Prescription label (on bottle)
   ├─ Patient information sheet (printed)
   ├─ Counseling note from pharmacist (if needed)
   └─ Receipt (copies to patient, doctor, insurance)

7. Ready for pickup
   Status is set to: ✓ READY FOR PATIENT PICKUP
```

### Dispensing to Patient

```
Patient John Smith arrives at pharmacy pickup window:

Pharmacy tech: "Hi, I have your prescription ready. 
Can I see your ID?"

Patient shows ID.

Tech verifies:
"John Smith, date of birth May 20, 1975?"
Patient: "Yes, that's me."

Tech checks:
✓ Name on bottle matches patient
✓ DOB on bottle matches ID
✓ Right medication, right quantity

Tech explains:
"This is Metformin 500mg. Take one tablet twice a day 
with food. The information sheet inside has more details. 
Any questions?"

Patient: "What if I forget a dose?"

Tech: "Take it as soon as you remember, unless it's 
almost time for the next dose. Don't double dose."

Record dispensing:
├─ Patient: John Smith (verified by ID)
├─ Drug: Metformin 500mg × 60 tabs
├─ Dispensed by: Tom (Tech), verified by Susan (RPH)
├─ Time: 2:20 PM
├─ Method: Patient pickup
├─ Patient counseled: Yes
└─ [CONFIRM DISPENSING]

System:
├─ Removes from pharmacy queue
├─ Records dispensing in patient's record
├─ Updates patient's medication list (now "current")
├─ Notifies doctor: "Prescription filled and dispensed"
└─ Sends summary to patient (email or SMS)
```

---

## Patient Counseling

### Medication Education

```
When pharmacist counseling needed (new medication or major change):

Pharmacist calls patient or patient visits window:

METFORMIN COUNSELING

Pharmacist: "Hi John, I'm Susan, the pharmacist. 
I want to make sure you know how to use your 
Metformin safely and effectively."

1. How to Take:
   "This medication is taken TWICE daily - morning and evening. 
    Take it WITH FOOD to reduce stomach upset. 
    Don't skip doses. The more consistent, the better it works."
   
   Patient repeats: "Twice daily with food"

2. Expected Effects:
   "Metformin helps lower your blood sugar. 
    It can take a few weeks to see full effect. 
    Keep taking it even if you feel fine."

3. Side Effects (Common):
   "Some people feel a bit of stomach upset, especially 
    at first. That usually goes away. These are common 
    and usually not serious. Take with food to help."
   
   Common side effects:
   - Nausea/stomach upset (most common)
   - Diarrhea or constipation
   - Headache
   - Metallic taste (temporary)

4. Red Flag Symptoms (Call Doctor Immediately):
   "These are rare, but if you develop:
    - Severe muscle pain or weakness
    - Difficulty breathing
    - Dizziness or lightheadedness
    - Severe abdominal pain
    → Call your doctor or go to ER
    
    These could be signs of lactic acidosis (very rare)."

5. Diet & Lifestyle:
   "Metformin works best with healthy diet and exercise. 
    Continue any dietary changes your doctor recommended."

6. Interactions:
   "Avoid excessive alcohol (more than 2 drinks a few times a week).
    Let us know if you start any new medications."

7. Refills:
   "You have 3 refills authorized. Call when you're low, 
    and we'll have it ready within 24 hours."

8. Questions?
   "Do you have any questions about how to take this?"
   
   Patient: "If I miss a dose, can I double up?"
   Pharmacist: "No, just take the next dose as scheduled. 
    Never double dose."

Counseling documented:
├─ Patient: John Smith
├─ Medication: Metformin 500mg
├─ Counselor: Susan Rodriguez (RPH)
├─ Time: 2:22 PM
├─ Topics covered: Dosing, side effects, red flags, interactions
├─ Patient understanding: Good (repeated back key points)
└─ [CONFIRM COUNSELING PROVIDED]
```

---

## Refill Management

### Patient Refill Requests

```
Patient John Smith:
"I'm running low on my Lisinopril. Can I get a refill?"

Options:
1. Refill already authorized (3 refills on prescription)
   └─ Pharmacist reviews:
      ├─ Last filled: 3 months ago
      ├─ Should be low now (expected timing) ✓
      ├─ Medical conditions unchanged
      ├─ No new allergies
      ├─ Check if dose adjustment needed
      └─ [APPROVE REFILL]

   System:
   ├─ Refills remaining: 2 (was 3)
   ├─ Fills prescription
   ├─ Dispenses to patient
   └─ Notifies doctor: "Refill filled"

2. No refills remaining
   └─ Pharmacist calls doctor:
      "Dr. Chen, patient John Smith needs refill of Lisinopril 10mg.
       Original prescription has no refills remaining. 
       Should I fill for another 90 days?"
      
      Doctor: "Yes, 90 days, 3 refills"
      
      Pharmacist enters new authorization
      Fills prescription
      Dispenses to patient

3. Therapeutic refill (emergency)
   └─ Emergency refill allowed (72-hour supply) if:
      ├─ Prescription has no refills left
      ├─ Medication is essential (cardiac meds, diabetes, etc)
      ├─ Doctor unreachable (after hours, weekend)
      └─ Patient will pick up proper refill within 72 hours
      
      Pharmacist documents:
      "Therapeutic refill: 72-hour emergency supply pending
       doctor authorization. Patient to return Monday for
       refilled prescription."
```

---

## Common Tasks

### Task: Dose Appears Too High for Patient's Weight

```
Prescription reviewed:
Patient: Charlie Brown, Weight: 95 lbs (43 kg), Age: 8

Drug: Amoxicillin 500mg BID × 10 days

Pharmacist concern:
"This is 1000mg daily for an 8-year-old weighing 95 lbs.
Standard peds dosing for amoxicillin is 25-45 mg/kg/day.
For 43 kg: 43 × 25 = 1075 mg (upper range, OK)
But this seems high for pediatric practice. 
Let me verify prescriber meant pediatric strength."

Pharmacist calls doctor:
"Dr. Lee, I have Amoxicillin 500mg for Charlie Brown, age 8.
That's 1000mg daily total. Just want to confirm you meant 
this dosing for an 8-year-old?"

Doctor: "Oh, let me check the chart... Yes, should be 
Amoxicillin ORAL SUSPENSION 250mg/5ml, one teaspoon twice daily."

Pharmacist: "Got it, so 250mg twice daily, not 500mg tablets. 
I'll fill as oral suspension. That's about 5 ml twice daily."

Pharmacist action:
[CONTACT PRESCRIBER] → Discussion → [MODIFY DOSE]
├─ Original: Amoxicillin 500mg tab BID
├─ Corrected: Amoxicillin oral susp 250mg/5ml BID (1 tsp)
├─ Filled: 100ml bottle (approximately 10 days supply)
└─ Note: "Prescriber clarified pediatric dosing - filled as suspension"
```

---

## Controlled Substance Tracking

### Schedule II Medication Management

```
Prescription for: Oxycodone 10mg, #30 tablets
Patient: Post-surgical pain control
Prescriber: Dr. Sarah Chen

For controlled substances (Schedule II-V):

SPECIAL REQUIREMENTS:
├─ E-prescription or handwritten with specific info
├─ DEA number of prescriber verified
├─ Patient ID verified (photo required)
├─ No refills allowed (Schedule II)
├─ Minimum info on script:
│  ├─ Patient name & address
│  ├─ Drug name, dose, quantity
│  ├─ Doctor name, DEA#
│  ├─ Doctor signature (wet signature for hard copy)
│  └─ Date (cannot be post-dated)
│
├─ Dispensing logged in controlled substance registry
├─ Serial number tracked
└─ Patient ID must match perfectly

Pharmacist verification:

[VERIFY CONTROLLED SUBSTANCE REQUIREMENT]

Checklist:
☑ E-prescription with valid DEA#? YES
☑ Patient ID matches prescription? YES (John Smith, DOB 5/20/75)
☑ Dose & quantity reasonable? YES (10mg × 30 = typical post-op)
☑ Patient has no other controlled substance fills in past 30 days? YES
☑ DEA prescriber list valid? YES
☑ No flags in state prescription monitoring program (PMP)? YES

[APPROVE FOR DISPENSING]

Log entry:
├─ Date: April 8, 2026, 2:45 PM
├─ Drug: Oxycodone 10mg tablets
├─ Qty: 30 (marked as "final")
├─ Patient: John Smith (verified ID)
├─ Prescriber: Dr. Sarah Chen (DEA-checked)
├─ Pharmacist: Susan Rodriguez
├─ Dispensed to: Patient
└─ Registry entry: Complete, serial #: CS-2026-003456
```

---

**Key Contact Numbers**:
- Poison Control: 1-800-222-1222
- DEA (suspicious scripts): 1-800-882-9539
- State Board of Pharmacy: [varies by state]

**Questions?** Contact pharmacy director or reference [API_REFERENCE.md](../product/API_REFERENCE.md) for prescription data structure.
