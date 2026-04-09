# Laboratory Technician Workflow Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Laboratory technicians, phlebotomists, medical laboratory scientists, healthcare IT staff

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Laboratory Dashboard](#laboratory-dashboard)
3. [Specimen Collection](#specimen-collection)
4. [Test Processing](#test-processing)
5. [Quality Control](#quality-control)
6. [Result Entry & Verification](#result-entry--verification)
7. [Critical Value Alerts](#critical-value-alerts)
8. [Common Tasks](#common-tasks)

---

## Role Overview

**Primary Responsibilities**:
- Receive and process lab orders from physicians
- Collect blood & body fluid specimens from patients
- Prepare samples and run diagnostic tests
- Enter test results into system
- Flag critical/abnormal values
- Ensure quality control procedures
- Maintain equipment calibration

**Permissions Held**:
- `lab_orders:view_all` - See all pending lab orders
- `lab_orders:assign` - Mark order as in-progress
- `specimens:record` - Log specimen collection
- `lab_results:enter` - Input test results
- `lab_results:flag_critical` - Mark critical values
- `quality_control:run` - Perform QC procedures
- `equipment:calibrate` - Record instrument calibration

**Cannot Do**:
- Create lab orders (only doctors)
- Approve final results (only medical director/supervising physician)
- Order lab equipment
- Change test methodologies without approval
- View other hospitals' data

---

## Laboratory Dashboard

### Morning Lab Workflow

```
Lab Tech Dashboard — Tuesday, April 8, 2026, 7:00 AM

PENDING LAB ORDERS (Received overnight + AM orders)

URGENT (Stat/STAT orders - within 1 hour)
├─ 1. CBC + Differential - Patient: John Smith
│    Order time: 6:45 AM (15 min ago)
│    Specimen: Blood (serum tube)
│    Priority: 🔴 STAT
│    Status: ⏳ AWAITING COLLECTION
│    [COLLECT SPECIMEN]
│
├─ 2. Troponin (Cardiac marker) - Patient: Michael Johnson
│    Order time: 6:30 AM (30 min ago)
│    Specimen: Blood (EDTA tube)
│    Priority: 🔴 STAT (Chest pain complaint)
│    Status: ⏳ AWAITING COLLECTION
│    [COLLECT SPECIMEN]
│
└─ 3. Blood Glucose - Patient: Sarah Davis
     Order time: 6:20 AM (40 min ago)
     Specimen: Blood (capillary - finger stick)
     Priority: 🟠 URGENT (1 hour)
     Status: ⏳ AWAITING COLLECTION
     [COLLECT SPECIMEN]

ROUTINE (Next 4-6 hours)
├─ CBC - Patient: Robert Wilson
├─ Comprehensive Metabolic Panel - Patient: Jane Doe
├─ Lipid Panel - Patient: Alice Johnson
├─ Thyroid Function Tests - Patient: Charlie Brown
└─ [SHOW MORE ORDERS]

COLLECTION IN PROGRESS
├─ Blood culture (aerobic & anaerobic) - Room 105
│  Collected: 6:50 AM
│  Status: ⏳ In Q.C. check
│
└─ Urinalysis - Room 203
   Collected: 6:52 AM
   Status: ⏳ Awaiting processing

RESULTS NEEDING ENTRY
├─ Glucose level: 95 mg/dL (complete)
├─ Potassium: 4.2 mEq/L (complete)
└─ [3 more results pending data entry]

CRITICAL VALUES ALERT (from previous results)
└─ CBC: White blood cell count 18.5 K/μL (HIGH - normal <11)
   Patient: Margaret Smith, Order ID: ord-12345
   Status: 🔴 FLAGGED - Doctor notified at 6:45 AM
   [CONFIRM ALERT SENT]

LAB METRICS
├─ Orders pending: 12
├─ Specimens in processing: 5
├─ Results entered today: 23
├─ Critical alerts: 1 active
└─ Equipment status: ✓ All instruments calibrated
```

---

## Specimen Collection

### Phlebotomy Collection Process (Blood Draw)

```
Lab Tech receives order: CBC + Differential for John Smith
Patient location: Room 101 (or waiting area)

PREPARATION

Tech prepares supplies:
├─ Sterile gloves
├─ Tourniquet (elastic band)
├─ Alcohol pads (70% isopropyl alcohol)
├─ Gauze pads
├─ Bandage
├─ Specimen tubes (labeled by test):
│  ├─ SST (serum separator tube - gold cap) for serum tests
│  ├─ EDTA tube (lavender cap) for CBC
│  ├─ Heparin tube (green cap) for plasma tests
│  └─ Culture bottles (aerobic & anaerobic) for blood cultures
│
└─ Sharps container (for needle disposal)

PATIENT VERIFICATION & CONSENT

Tech: "Hi, I'm the lab tech. I need to draw some blood 
for your tests. Can I verify your name and date of birth?"

Patient: "I'm John Smith, born May 20, 1975."

Tech verifies:
✓ Patient name: John Smith
✓ DOB: 5/20/1975
✓ Matches tube labels
✓ Patient identified with wristband (hospital ID #hosp-123)

Tech explains: "I'm going to draw blood from your arm. 
You might feel a small pinch. Let me know if you feel faint."

Patient consents (already consented in system during order placement).

VENIPUNCTURE (Blood Draw)

Tech steps:

1. Select vein
   ├─ Ask patient: "Do you have a preferred arm?"
   ├─ Look for prominent vein inside elbow
   ├─ Palpate (feel) vein for size & depth
   └─ Use non-dominant arm preferably

2. Prepare site
   ├─ Clean with alcohol pad
   ├─ Use circular motion, outward
   ├─ Let dry (~30 seconds) for disinfection
   └─ Don't touch the area again before insertion

3. Apply tourniquet
   ├─ Place tourniquet above elbow
   ├─ Tighten but not too much (you should slide one finger under)
   ├─ Leave on for <2 minutes (prolonged causes hemoconcentration)
   └─ Tell patient: "This might feel snug."

4. Draw blood with needle
   ├─ Insert needle at 15-30° angle
   ├─ Insert until flashback seen (blood in hub)
   ├─ Release tourniquet immediately
   ├─ Collect blood into tubes IN ORDER:
   │  1st: Culture bottles (fastest fill first)
   │  2nd: Blue top (coagulation, if needed)
   │  3rd: SST (serum separator)
   │  4th: EDTA/lavender (CBC)
   │  5th: Other tubes as ordered
   │
   ├─ Invert each tube 5-8 times gently (helps maintain ratio)
   └─ Remove needle, apply pressure with gauze

5. Post-collection
   ├─ Apply pressure to puncture site (2-3 minutes)
   ├─ Apply pressure dressing or bandage
   ├─ Tell patient: "Keep pressure on site. You can remove 
   │   the bandage in 30 minutes."
   └─ Dispose needle in sharps container

SPECIMEN LABELING

Each tube labeled with:
├─ Patient name: JOHN SMITH
├─ Patient DOB: 5/20/1975
├─ Patient ID: hosp-123
├─ Test type: CBC + Differential
├─ Collection time: 7:15 AM
├─ Collected by: Jane (initials)
├─ Specimen type: Blood/Serum/Plasma
└─ Tube type: EDTA (lavender cap)

SPECIMEN LOG ENTRY

System entry:
├─ Patient: John Smith (ID verified)
├─ Order: CBC + Differential
├─ Specimen type: Whole blood (EDTA)
├─ Collection time: 7:15 AM
├─ Volume adequate: Yes (3 mL)
├─ Hemolysis: No (blood looks clear, not pink)
├─ Clotting: No (no visible clots)
├─ Lipemia: None (blood not cloudy)
├─ Collected by: Jane
├─ Status: ✓ ACCEPTED FOR PROCESSING
└─ [CONFIRM ENTRY]

System updates:
├─ Order status: Collection Complete → Ready for Processing
├─ Specimen tracking: QC check next
└─ Notifies lab analyzer: "Specimen ready"
```

### Urine Specimen Collection

```
Order: Urinalysis (UA) - Patient: Jane Doe

Patient given sterile container & instructions:

COLLECTION INSTRUCTIONS (Midstream clean-catch)

1. Wash hands and genital area with soap & water
2. For women: Spread labia, wipe urethral area front to back
3. For men: Retract foreskin if present, wipe head of penis
4. Urinate first bit into toilet
5. Collect next portion in sterile cup
6. Remove cup, urinate rest into toilet
7. Cap container immediately
8. Wipe exterior with tissue
9. Deliver to lab promptly

Patient completes collection and brings to lab.

Lab Tech receives specimen:

Verification:
├─ Patient name on cup: JANE DOE
├─ Patient ID: hosp-456
├─ Collection time: 9:30 AM
├─ Specimen appears: Clear, pale yellow (normal)
├─ No contamination
├─ Volume: ~45 mL (adequate)
└─ ✓ ACCEPTED

If specimen is contaminated or inadequate:
"This specimen appears contaminated (visible particles). 
We need a fresh clean-catch specimen. Can you try again?"

System logs:
├─ Specimen received: 9:35 AM
├─ Collection: Midstream clean-catch method
├─ Status: Received, ready for testing
└─ [CONFIRM]
```

---

## Test Processing

### Running Tests on Lab Analyzer

```
Specimen: CBC + Differential for John Smith
Specimen received: 7:20 AM
Status: QC passed, ready for testing

Tech places specimen on analyzer:

ANALYZER SETUP

1. Verify analyzer is ready
   ├─ Touch screen power: ✓ ON
   ├─ Display: ✓ Normal operation
   ├─ QC results: ✓ Within range (checked at shift start)
   └─ Supplies stocked: ✓ Sufficient

2. Load specimen onto analyzer
   ├─ Tube placed in specimen carousel
   ├─ Scan barcode (tube label)
   ├─ Verify patient name: JOHN SMITH ✓
   ├─ Verify test ordered: CBC ✓
   └─ Run order confirmed

3. Analyzer runs test automatically
   ├─ Aspirates blood from tube (small volume)
   ├─ Adds reagents automatically
   ├─ Processes through optical reader
   ├─ Measures: CBC count (WBC, RBC, Hemoglobin, Hematocrit)
   ├─ Performs differential: (Neutrophils, Lymphocytes, Monocytes, Eosinophils, Basophils)
   ├─ Run time: ~3-5 minutes
   └─ Results displayed on screen

RESULTS GENERATED

Complete Blood Count (CBC) + Differential

Patient: John Smith (DOB: 5/20/1975)
Order: CBC + Differential
Test ID: CBC-2026-045678
Analyzer: Sysmex XN-550
Analysis time: 7:25 AM

RESULTS:

WBC (White Blood Cells): 7.5 K/μL        [Reference: 4.5-11.0]
RBC (Red Blood Cells): 5.2 M/μL          [Reference: 4.5-5.9]
Hemoglobin (Hgb): 15.2 g/dL              [Reference: 13.5-17.5]
Hematocrit (Hct): 45.6%                  [Reference: 41-53%]
MCV (Corpuscular Volume): 88 fL          [Reference: 80-100]
Platelets: 220 K/μL                      [Reference: 150-400]

DIFFERENTIAL:

Neutrophils: 60%                          [Reference: 50-70%]
Lymphocytes: 30%                          [Reference: 20-40%]
Monocytes: 7%                             [Reference: 3-8%]
Eosinophils: 2%                           [Reference: 0-4%]
Basophils: 1%                             [Reference: 0-2%]

INTERPRETATION:
✓ All values within normal range
✓ No abnormal flags
Status: NORMAL

Tech action:
[REVIEW RESULTS] → [APPROVE FOR PHYSICIAN REVIEW] → [SEND TO EHR]
```

---

## Quality Control

### Daily QC Procedures

```
Lab Tech arrives: 7:00 AM start time

SHIFT START QC (Before running patient samples)

Procedure for each analyzer:

1. Hematology Analyzer (CBC machine)
   
   Tech performs known sample test:
   ├─ QC material: Commercial control samples (normal, low, high values)
   ├─ Run Level 1 (normal range): Expected results within ±2 SD
   ├─ Results from this morning:
   │  ├─ WBC: 7.4 K/μL (expected 7.5 ± 0.5 = 7.0-8.0) ✓ IN RANGE
   │  ├─ Hemoglobin: 15.0 g/dL (expected 15.1 ± 0.3 = 14.8-15.4) ✓ IN RANGE
   │  ├─ Platelets: 220 K/μL (expected 225 ± 15 = 210-240) ✓ IN RANGE
   │  └─ Conclusion: ✓ PASS - Machine calibrated correctly
   │
   └─ If results OUT OF RANGE:
      ├─ Run QC again (may be operator error)
      ├─ If still fails: Calibrate machine
      ├─ Document in QC log: "Morning QC failed, recalibrated at 7:05 AM"
      └─ After calibration, rerun QC to verify PASS

2. Chemistry Analyzer (Metabolic panel machine)
   
   Same process:
   ├─ Run QC samples (normal level)
   ├─ Check glucose, electrolytes, kidney function values
   ├─ All results in range: ✓ PASS
   └─ Machine ready for patient samples

3. Urinalysis Analyzer
   ├─ Run QC sample (simulated urine dipstick)
   ├─ Verify: pH, specific gravity, glucose, protein, etc.
   ├─ All normal: ✓ PASS
   └─ Ready for testing

QC DOCUMENTATION

Each analyzer log entry:
├─ Date: April 8, 2026
├─ Analyzer: Sysmex XN-550 (CBC)
├─ Time: 7:05 AM
├─ QC Level: 1 (Normal)
├─ Results: All in range (specific values logged)
├─ Tech initials: JD (Jane Doe)
├─ Status: ✓ PASS
└─ Next QC due: Daily (tomorrow 7:00 AM)

REMEDIAL ACTION (If QC Fails)

Scenario: Chemistry analyzer QC shows glucose 110 (expected 100 ± 5)

Tech action:
1. Repeat QC run → Result: glucose 109 (still high)
2. Run analyzer calibration:
   ├─ Clean analyzer internal pathways
   ├─ Run calibration reference material
   ├─ Analyzer recaliberates
3. Rerun QC → Result: glucose 101 (now in range) ✓ PASS
4. Document:
   "Chemistry analyzer out of calibration. Recalibrated at 7:10 AM.
    QC results now within range. All patient samples processed after 
    this time are acceptable."
5. Analyzer released for patient samples
```

---

## Result Entry & Verification

### Manual Result Entry (For Non-Automated Tests)

```
Test: Manual microscopy - Differential WBC count
(Some labs still perform manual differentials for critical samples)

Lab tech examines blood smear under microscope:

Specimen: Patient Michael Johnson
Test: Manual peripheral blood smear - WBC differential

Tech counts 100 white blood cells and identifies:
├─ Neutrophils: 68 cells (68%)
├─ Lymphocytes: 22 cells (22%)
├─ Monocytes: 8 cells (8%)
├─ Eosinophils: 2 cells (2%)
├─ Basophils: 0 cells (0%)
└─ Total: 100 cells (100%)

Also notes:
├─ Abnormal WBC: None observed
├─ Schistocytes: None
├─ Other RBC abnormalities: None
└─ Platelet estimate: Adequate (visual)

SYSTEM DATA ENTRY

Tech opens result entry screen:

LAB RESULT ENTRY - MANUAL DIFFERENTIAL

Patient: Michael Johnson (ID: hosp-789)
Order: CBC + Manual Differential
Specimen: Blood - EDTA
Collection time: 6:35 AM
Analysis time: 7:40 AM
Analyzer: Microscope (Manual count)

Data fields:

Neutrophils: 68 %
Lymphocytes: 22 %
Monocytes: 8 %
Eosinophils: 2 %
Basophils: 0 %

Clinical comments:
"Differential performed via manual microscopy of blood smear.
No abnormal cells observed. Platelet estimate adequate."

[VALIDATE] → System checks:
✓ All percentages add to 100%
✓ All values within normal range
✓ No critical values

[SUBMIT FOR VERIFICATION]
```

### Result Verification by Medical Director

```
PHYSICIAN VERIFICATION PROCESS

Lab results submitted for approval:

Queue of results awaiting physician signature:

├─ CBC (John Smith) - All normal, ready to verify
├─ Metabolic Panel (Jane Doe) - Glucose HIGH, needs review
├─ Urinalysis (Sarah Davis) - All normal
├─ Blood Culture (Michael Johnson) - Pending (culture grows overnight)
└─ Lipid Panel (Robert Wilson) - All normal

Supervising Physician (Dr. Clinical Lab): 
Reviews flagged results:

METABOLIC PANEL - Jane Doe

Results:
├─ Glucose: 280 mg/dL [Reference: 70-100] ⚠️ HIGH
├─ Bicarbonate: 24 mEq/L [Reference: 22-28] ✓
├─ Creatinine: 1.1 mg/dL [Reference: 0.7-1.3] ✓
├─ BUN: 18 mg/dL [Reference: 7-20] ✓
└─ Electrolytes: All normal ✓

Doctor's review:
"High glucose makes sense - patient has diabetes per chart.
Ordered fasting so this is expected. No concern.
All other electrolytes normal. Kidney function normal.
Proceed with release to EHR."

[PHYSICIAN APPROVES RESULT]

Once physician approves:
├─ Result marked as: ✓ VERIFIED
├─ Result released to patient EHR
├─ Notification sent to ordering doctor
├─ Result available to patient (if patient portal enabled)
└─ Lab result document generated & filed
```

---

## Critical Value Alerts

### Identifying and Reporting Critical Values

```
Definition: Critical values (panic values) are results that 
indicate life-threatening conditions requiring immediate action.

CRITICAL VALUE THRESHOLDS

Example critical values:

Hematology:
├─ Hemoglobin: <6.0 or >20 g/dL
├─ WBC: <2.0 or >30 K/μL
├─ Platelets: <20 K/μL
└─ PT/INR: >3.0 (on warfarin therapy)

Chemistry:
├─ Glucose: <40 or >500 mg/dL
├─ Potassium: <2.5 or >6.5 mEq/L
├─ Sodium: <120 or >160 mEq/L
├─ Calcium: <6.0 or >13 mg/dL
└─ Troponin (cardiac): Elevated >0.04 ng/mL (AMI indicator)

Blood Gas:
├─ pH: <7.20 or >7.60
├─ pO2: <50 mmHg
└─ pCO2: >70 mmHg

SYSTEM DETECTION & ALERT

When result entered, system checks against critical thresholds:

Lab Result: Potassium 2.3 mEq/L (Reference: 3.5-5.0)

System analysis:
├─ Value: 2.3 mEq/L
├─ Threshold: <2.5 considered critical LOW
├─ Result is: CRITICAL VALUE
└─ Trigger: ALERT PROTOCOL

ALERT PROTOCOL ACTIVATION

System automatically:

1. Flags result as CRITICAL
2. Blocks result from auto-release (requires physician verification)
3. Sends alerts:
   ├─ Lab director: Immediate notice
   ├─ Ordering physician: Immediate call/SMS
   ├─ Nursing station: Stat notification
   └─ EHR: Displays alert to all users viewing patient

4. Lab tech action:
   ├─ Read screen alert: "CRITICAL POTASSIUM 2.3"
   ├─ Manually verify result accuracy:
   │  ├─ Check specimen tube label: Correct patient? ✓
   │  ├─ Check specimen integrity: No hemolysis? ✓
   │  ├─ Check collection time: Recent? ✓
   │  └─ Run retest on analyzer to confirm
   │
   ├─ If retest confirms: 2.3 mEq/L (second measurement confirms)
   │  └─ Tech initiates STAT communication protocol
   │
   └─ If retest disagrees (e.g., shows 4.2 normal):
      └─ Original specimen likely hemolyzed
      └─ Request recollection
      └─ Document: "Original specimen hemolyzed - recollection requested"

LAB-TO-PHYSICIAN COMMUNICATION (Critical Values)

If critical value confirmed, Tech/Director calls physician immediately:

"Dr. Chen, this is Dr. [Lab director] from the lab. 
CRITICAL ALERT on patient Jane Doe: 
Potassium level is critically LOW at 2.3 mEq/L. 
This was just received. Recommend STAT EKG and possible IV potassium replacement.
I'm releasing this result to the EHR now."

System timestamps:
├─ Result flag time: 8:45 AM
├─ Critical alert generated: 8:45 AM
├─ Doctor notified: 8:46 AM
├─ In EHR: 8:46 AM
└─ Physician action: [Documented in patient chart]

CRITICAL VALUE LOG

System maintains log:
├─ Patient: Jane Doe (ID: hosp-456)
├─ Result: Potassium 2.3 mEq/L
├─ Result time: 8:45 AM
├─ Critical threshold: <2.5
├─ Severity: CRITICAL LOW
├─ Ordered by: Dr. Sarah Chen
├─ Notification time: 8:46 AM
├─ Physician response: [Auto-logged if physician enters action]
└─ Status: Resolved or Ongoing (tracked)
```

---

## Common Tasks

### Task: Blood Culture Shows Growth (Possible Infection)

```
Specimen: Blood culture (aerobic bottle)
Received: Yesterday 3:00 PM
Incubation: Overnight in media at 37°C

Day 2 (Next morning): 8:00 AM check

System alert: "BLOOD CULTURE POSITIVE - Growth detected"

Lab tech observes:
├─ Culture bottle: Turbidity visible (cloudiness from bacterial growth)
├─ Growth signal: Automated system flagged bottle as "POSITIVE"
└─ Preliminary result: Gram stain needed to identify organism

Tech performs Gram stain:
1. Take sample from positive culture
2. Smear on slide
3. Apply Gram stain (multiple steps)
4. Examine under microscope
5. Result: Gram-positive cocci in clusters (appears like Staphylococcus)

Preliminary Gram stain result:
├─ Organism morphology: Gram-positive cocci
├─ Arrangement: Clusters (suggesting Staphylococcus)
├─ Estimated: Coagulase-positive organism likely
└─ Preliminary ID: Suggestive of Staph aureus

System entry:

BLOOD CULTURE PRELIMINARY RESULT

Patient: Michael Johnson (ID: hosp-789)
Specimen: Blood culture (aerobic)
Collection: Yesterday 3:00 PM
Culture positive time: 8:00 AM (17 hours)
Gram stain result: Gram-positive cocci in clusters
Preliminary ID: Presumptive Staphylococcus aureus

Clinical significance: POSITIVE BLOOD CULTURE
Indicates probable cardiovascular or systemic infection

Pathway forward:
├─ Send culture to microbiology for:
│  ├─ Definitive organism identification
│  ├─ Antibiotic susceptibility testing (culture grows another 24 hours)
│  └─ Final report in 48-72 hours (full ID + sensitivities)
│
├─ Alert ordering physician: POSITIVE BLOOD CULTURE
├─ Notify infection prevention
└─ System flags for physician review

Final result (72 hours later):
├─ Organism ID: Staphylococcus aureus
├─ MSSA (methicillin-sensitive): Susceptible to standard beta-lactams
├─ Susceptibilities:
│  ├─ Oxacillin: Susceptible
│  ├─ Cepephalosporins: Susceptible
│  ├─ Vancomycin: Susceptible
│  └─ Rifampin: Susceptible
│
└─ Physician uses sensitivities to adjust antibiotics accordingly
```

### Task: Request for Stat Test During Night Shift

```
Scenario: 2:00 AM, lab tech on night shift
Admission to ER: Patient with chest pain
Doctor needs: Troponin (cardiac marker) STAT

Lab Tech on duty receives request:

STAT LAB ORDER - TROPONIN

Patient: Robert Wilson
Presenting issue: Chest pain, possible heart attack
Order time: 2:05 AM
Specimen needed: Blood (serum)
Priority: 🔴 STAT (within 30 minutes)

Tech action:

1. Review order in system
   ├─ Patient ID confirmed
   ├─ Order verified
   └─ Specimen type: Serum (SST tube)

2. Notify phlebotomist on night shift
   "John, I need a STAT collection on Robert Wilson in the ER. 
    Troponin for possible MI. Can you draw?"
   
   Phlebotomist: "Yes, heading over now."

3. Tech prepares analyzer
   ├─ Troponin testing reagent ready
   ├─ Analyzer warmed up
   ├─ QC already run today
   └─ Ready to accept specimen

4. Phlebotomist collects specimen
   ├─ Patient ID verified
   ├─ Blood collected: 2:08 AM
   ├─ Tube labeled: TROPONIN
   └─ Delivered to lab

5. Tech processes specimen STAT
   ├─ Specimen received: 2:10 AM
   ├─ No delay for Q.C. (already done)
   ├─ Specimen placed on analyzer: 2:11 AM
   ├─ Test runs: ~3 minutes
   └─ Results: 2:14 AM

RESULTS:

High-sensitivity Troponin I: 0.08 ng/mL [Reference: <0.04]
Status: 🔴 ELEVATED (abnormal)
Result: POSITIVE for myocardial injury

6. Tech immediately notifies:
   ├─ Phones ER physician: "Troponin is elevated at 0.08. 
      Concerning for MI."
   ├─ Enters result in EHR
   ├─ Sets status to STAT (so alerts propagate immediately)
   └─ Lab director notified

7. Physician action:
   ├─ Activates MI protocol
   ├─ Orders EKG, cardiology consult
   ├─ Begins anticoagulation therapy
   └─ Orders serial troponins (repeat in 3 hours)

Time from order to result: 9 minutes (within STAT requirement)
Patient care significantly improved by rapid testing
```

---

**Key Reference**: 
- See [API_REFERENCE.md](../product/API_REFERENCE.md) for lab orders and results data structures
- Contact lab director for policy questions or unusual specimens

**Emergency Contacts**:
- Lab Director: [On-call list in hospital system]
- Quality Assurance: ext. 4567
- Infection Control: ext. 2891
