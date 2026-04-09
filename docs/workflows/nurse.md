# Nurse Workflow Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Nurses, nursing assistants, healthcare IT staff, developers implementing nurse features

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Nursing Station Dashboard](#nursing-station-dashboard)
3. [Patient Intake & Vitals](#patient-intake--vitals)
4. [Clinical Assessment](#clinical-assessment)
5. [Medication Administration](#medication-administration)
6. [Patient Discharge](#patient-discharge)
7. [Critical Alerts & Escalation](#critical-alerts--escalation)
8. [Common Tasks](#common-tasks)

---

## Role Overview

**Primary Responsibilities**: 
- Patient vital signs collection
- Pre-consultation patient preparation
- Medication administration & observation
- Patient education & discharge instruction
- Monitoring for clinical changes

**Permissions Held**:
- `vital_signs:create` - Record patient vital signs
- `vital_signs:read` - View patient vitals
- `patients:view` - View patient information & history
- `consultations:read` - View consultation notes
- `medications:administer` - Record medication administration
- `alerts:view` - See clinical alerts
- `alerts:acknowledge` - Acknowledge and respond to alerts

**Cannot Do**:
- View other hospitals' data
- Create diagnoses or assessments
- Order labs or prescriptions
- Approve anything
- Change patient billing

---

## Nursing Station Dashboard

### Station Layout

```
Nursing Station Screen

┌─────────────────────────────────────────┐
│ Clinic Status - April 8, 2026, 9:02 AM │
├─────────────────────────────────────────┤
│                                         │
│ Patient Queue                           │
│ ├─ ✓ John Smith (Room 304)             │
│ │  └─ Status: Checked in, vitals due   │
│ │  └─ Appointment: Dr. Chen 9:00 AM    │
│ │  └─ [Start Vitals]                   │
│ │                                      │
│ ├─ • Jane Doe (Waiting Room)           │
│ │  └─ Status: Waiting for room         │
│ │  └─ Appointment: Dr. Lee 9:30 AM     │
│ │  └─ [Assign Room]                    │
│ │                                      │
│ └─ • Bob Wilson (Kiosk Check-in)       │
│    └─ Status: Checked in, not assigned │
│    └─ [Get Vitals]                     │
│                                        │
│ ALERTS                                 │
│ ⚠️ John Smith - High BP (158/95)      │
│ 🔴 Alice Johnson - Temp 101.2°F (FEVER) │
│                                        │
│ Critical Values Pending Review:        │
│ └─ 0 items (all reviewed)             │
│                                        │
└─────────────────────────────────────────┘
```

### Quick Actions

```
[Get Next Patient] - Auto-assigns next waiting patient
[My Patients] - Show only patients currently under my care
[Alerts] - View all clinical alerts for today
[Critical Values] - Results flagged as abnormal
[Patient Search] - Search by name or room
[Messages] - Nurse-to-doctor communication
[Report End of Shift] - Clock out, hand off patients
```

---

## Patient Intake & Vitals

### Patient Arrival to Room

```
Nurse called to get patient from waiting room

Nurse: "John Smith?"

Patient stands and responds

Nurse:
"Hi John, I'm Sarah, your nurse today. 
Let's get you to your room and take some measurements."

Actions:
1. Scan patient's wristband (if in-patient) or ask for ID
2. Escort to assigned room
3. Get patient seated/positioned comfortably
4. Ask if bathroom access needed
5. Offer water
6. Explain what's happening:
   "I'm going to take your temperature, blood pressure, 
    and heart rate. This takes about 5 minutes."
```

### Vital Signs Collection

```typescript
// Screen: Vital Signs Entry

Patient: John Smith, Age 49
Room: 304
Appointment: Dr. Chen @ 9:00 AM

[Manual Entry] [Automated Devices] [Read from Equipment]

Starting vital signs collection:

1. Temperature (3 methods):
   [ ] Oral thermometer (most common)
   [ ] Temporal (forehead scan)
   [ ] Tympanic (ear)
   
   Result: 98.6°F ✓ Normal

2. Blood Pressure (left arm):
   Systolic: 138 mmHg
   Diastolic: 88 mmHg
   → ⚠️ ELEVATED (normal < 120/80)
   
   Nurse note: "Patient reports usual BP is 120s/80s"

3. Heart Rate (pulse):
   Rate: 72 bpm ✓ Normal

4. Respiratory Rate:
   16 breaths/min ✓ Normal

5. Oxygen Saturation (pulse oximeter):
   98% on room air ✓ Normal

6. Weight:
   179 lbs (81.3 kg)
   Last measurement: 180 lbs (3/15/26)
   → Changes: -1 lb since last visit ✓ Stable

Patient-Reported Information:
□ Pain level: 0/10 (none)
□ Nausea: No
□ Dizziness: No
□ Recent fall risk: No
□ New symptoms: No

Nurse clicks: [Save Vital Signs]

System:
├─ Records all vitals with timestamp
├─ Flags elevated BP (shows to doctor)
├─ Compares to previous visit (trends)
├─ Generates vital signs report for chart
└─ Sends notification to doctor's station
```

### Abnormal Vitals - Immediate Actions

```
IF CRITICAL VITAL DETECTED:

🔴 FEVER (Temperature > 101.5°F)
├─ Acknowledge to patient: "Your temp is a bit high"
├─ Ask: "Any chills? Night sweats? How long?"
├─ Document answers
├─ Notify doctor immediately (stat alert)
├─ May warrant triage assessment before consultation

🔴 SEVERE HYPERTENSION (BP > 180/110)
├─ Repeat BP in opposite arm
├─ Ask: "Do you have a history of high BP?"
├─ Ask: "Any chest pain, headache, vision changes?"
├─ If symptoms YES: Notify doctor stat (may need ER)
├─ If symptoms NO: Alert doctor before consultation

🔴 HYPOTENSION (BP < 90/60 with symptoms)
├─ Have patient lie down
├─ Ask: "Feeling dizzy? Lightheaded?"
├─ May need fluid resuscitation (doctor to decide)
├─ Alert doctor immediately

🔴 TACHYCARDIA (HR > 120 at rest)
├─ Repeat count
├─ Ask: "Are you anxious? Any chest pain?"
├─ If pain YES: Alert doctor stat (possible cardiac)
├─ If pain NO: Alert doctor before consultation

🔴 HYPOXIA (O2 sat < 92% on room air)
├─ Repeat measurement
├─ Ask patient to take deep breaths
├─ May place on supplemental oxygen (if doctor orders)
├─ Alert doctor immediately
└─ May need higher-level triage
```

---

## Clinical Assessment

### Pre-Consultation Assessment

**While patient still in room**, nurse performs quick assessment:

```
Start Pre-Consultation Assessment:

1. Patient Appearance:
   ☐ Alert and oriented
   ☐ Pale, flushed, or jaundiced?
   ☐ Grooming appropriate?
   ☐ Clothing clean, appropriate?

2. Mobility & Gait:
   ☐ Able to ambulate independently?
   ☐ Assistive devices (cane, walker)?
   ☐ Steady or unsteady gait?
   ☐ Falls risk? (If >2 factors: High falls risk)

3. Speech & Cognition:
   ☐ Speaks clearly, appropriate pace?
   ☐ Following commands?
   ☐ Oriented to person, place, time?
   ☐ Memory intact?

4. Respiratory Assessment:
   ☐ Breathing easy or labored?
   ☐ Any wheezing, coughing, shortness of breath?
   ☐ O2 saturation normal?

5. Cardiovascular:
   ☐ Skin warm, dry, normal color?
   ☐ Capillary refill < 2 seconds?
   ☐ Peripheral pulses palpable?

6. Abdomen:
   ☐ Distended or tender?
   ☐ Any visible abnormalities?

7. Extremities:
   ☐ Swelling, discoloration?
   ☐ Strength symmetric bilaterally?

Documentation:
"Patient alert and oriented x3. Breathing easily on room air.
Skin warm and dry. No acute distress. Able to ambulate independently.
Ready for consultation."

Nurse clicks [Conclude Pre-Consult Assessment]
```

### Communicating Concerns to Doctor

```
If nurse finds abnormality:

Nurse visits doctor before patient consultation:

"Dr. Chen, I wanted to let you know about John Smith in room 304.
His blood pressure is elevated (158/95), which is unusual for him.
He reports his usual is 120s/80s. Otherwise, vitals stable, 
patient feels well, denies chest pain. 
But wanted you to be aware."

Doctor's options:
1. "Thanks, I'll investigate during consultation" (common)
2. "Take BP again, have patient rest 5 min" (if very high)
3. "Check EKG, I'll review" (if concerned about cardiac)
4. "Notify me when patient is ready, I need to do it"

Nurse documents:
- What was communicated
- Doctor's response
- Any follow-up actions taken
```

---

## Medication Administration

### Pre-Medication Assessment

```
Doctor prescribes medication during consultation.
System sends notification to pharmacy.
Pharmacy fills and sends back: "Ready for pickup"

Nurse receives medication at nursing station with:
├─ Patient name, DOB
├─ Drug name, dose, route
├─ Frequency (once, twice daily, etc)
├─ Prescribing doctor signature
├─ Pharmacy verification stamp
└─ Timestamp filled

Before giving medication, nurse:
┌─ VERIFY: Right patient
├─ VERIFY: Right drug
├─ VERIFY: Right dose
├─ VERIFY: Right route
├─ VERIFY: Right time
├─ VERIFY: Right documentation
└─ CHECK: Any allergies or interactions?

5 Rights of Medication Administration ✓
```

### Administering Medication

```
Patient in room, medication ready:

Nurse: "John, the doctor prescribed Amoxicillin 
500mg for your infection. You'll take this orally 
(by mouth) twice daily with food for 7 days."

Patient: "Okay, any side effects I should know about?"

Nurse: "Most common is an upset stomach if taken without food. 
Take with breakfast and dinner. If you develop a rash, 
stop and call us immediately - you may be allergic."

Patient takes medication with water.

Nurse observes:
☑ Patient swallowed medication
☑ No adverse reaction (choking, coughing)
☑ Patient able to take oral medication

Documentation:
System screen shows:

Medication Administration Record (MAR)
├─ Patient: John Smith
├─ Drug: Amoxicillin 500mg
├─ Route: Oral
├─ Given by: Sarah (nurse)
├─ Time: 9:15 AM
├─ Patient response: Tolerated well, no adverse effects
└─ [Document and Continue]

Patient instruction sheet printed:
"Take Amoxicillin with food twice daily
Days: All 7 days (through Day 7)
Side effects: Call if rash develops
Refills: 0 (prescription as written)"
```

### Monitoring for Side Effects

```
After medication given:

Nurse observes for 5-10 minutes:
☐ Any unusual reactions?
☐ Difficulty breathing? (anaphylaxis risk)
☐ Rash appearing? (allergic reaction)
☐ Nausea or dizziness?
☐ Chest pain?

Patient education:
"Let me know if you feel anything unusual.
We'll be monitoring you. Likely you'll be 
fine - most people tolerate Amoxicillin well."

If adverse reaction occurs:
1. Stop medication exposure
2. Alert doctor immediately
3. Prepare for potential treatment:
   - Antihistamine (if mild rash)
   - Epinephrine (if anaphylaxis)
   - IV access (if needed)
4. Document thoroughly
5. May escalate to ER if severe
```

---

## Patient Discharge

### Discharge Planning

**During consultation**, doctor decides patient is ready to leave:

```
Doctor to patient:
"You're all set. The nurse will give you 
discharge instructions."

Nurse visits patient with discharge packet containing:
├─ Discharge Summary (what was done today)
├─ Medication Instructions
│  ├─ Drug name, dose, frequency
│  ├─ How to take
│  └─ When to stop
├─ Follow-up appointment details
├─ When to call doctor (warning signs)
└─ Contact numbers (clinic, after-hours, ER)
```

### Discharge Instructions - Verbal & Written

```
Nurse reviews with patient:

1. Medications:
   "You're taking Amoxicillin. Take it TWICE daily 
    with food for 7 days total. 
    Do NOT skip doses even if you feel better.
    Take all 7 days."
   
   Patient repeats back: "Twice daily with food for 7 days."
   
   Nurse: "Correct! Any questions?"

2. Activity:
   "Rest today. Avoid strenuous exercise for 3 days. 
    OK to do light activity like walking."

3. Diet:
   "Eat normally. Stay hydrated - drink plenty of water."

4. Wound Care (if applicable):
   "Keep the area clean and dry. Change dressing daily."

5. When to Call:
   "Call us if you develop:
    - Fever over 101°F
    - Rash or hives
    - Difficulty breathing
    - Severe pain
    - Any concerns"

6. Follow-up:
   "You have a follow-up with Dr. Chen in 1 week. 
    You should receive a confirmation call tomorrow."

Patient signs discharge form acknowledging:
☐ I understand discharge instructions
☐ I know when to call the doctor
☐ I have my medications
☐ I know my follow-up appointment
```

### Discharge Documentation

```
System: Discharge Summary

Patient: John Smith
Date of Discharge: April 8, 2026, 10:15 AM
Discharged by: Sarah (RN)
Appointment status: Completed

Discharge notes:
├─ Chief complaint: Acute bronchitis
├─ Findings: Fever, productive cough
├─ Treatment: Amoxicillin 500mg x7 days
├─ Patient education provided: ✓
├─ Discharge instructions given: ✓
├─ Follow-up arranged: Yes, 1 week with Dr. Chen
└─ Special instructions: Rest, hydration, medication compliance

Patient Status:
□ Stable for discharge
□ Discharged to home

Appointment closed:
- Status: Completed
- Duration: 45 minutes
- Discharged: 10:15 AM (on time)

[Confirm Discharge]
```

---

## Critical Alerts & Escalation

### Types of Alerts Nurses May Encounter

```
Alert Types:

🔴 CRITICAL VALUE ALERT
   Example: Temperature 104.5°F, BP 200/110
   Action: Notify doctor immediately (within 1 min)
   May need: Escalation to ER

🟠 HIGH VALUE ALERT
   Example: Temperature 102°F, BP 180/100
   Action: Notify doctor, escalate if worsening
   May need: Doctor before or during consultation

🟡 ABNORMAL VALUE ALERT
   Example: Temperature 101°F, BP 140/90
   Action: Alert doctor, document reason if expected
   May need: Discussion with patient

✅ NORMAL VALUE
   Example: Temperature 98.6°F, BP 120/80
   Action: None, routinely documented
```

### Critical Value Acknowledgment

```
Nurse sees alert: 🔴 Alice Johnson - TEMP 103.2°F

Nurse action:
1. Immediately assesses patient:
   "How are you feeling? Any chills?"
   
2. Takes repeat temperature:
   "Yes, confirmed 103.2°F"

3. Notifies doctor stat:
   [Alerts] → [Critical] → [Alice Johnson - FEVER]
   → [Notify Doctor]
   
   System sends:
   - Alert to doctor's pager
   - Alert to doctor's station
   - SMS to doctor's phone (if critical)
   - Adds to top of priority list

4. Documents assessment:
   "Patient reports feeling hot and has body aches.
    Vitals: Temp 103.2°F (confirmed repeat), 
    HR 98, BP 125/82, RR 18, O2 98%.
    Patient alert and oriented, in mild distress.
    Doctor contacted."

5. Escalation if needed:
   If patient's condition worsens (becomes altered, 
   difficult breathing, chest pain), don't wait for 
   doctor - page doctor STAT and consider ER transfer
```

### Escalation Protocol

```
When to escalate care:

IMMEDIATE ER ESCALATION (Stat):
├─ Chest pain with shortness of breath
├─ Altered mental status/confusion
├─ Severe difficulty breathing
├─ Loss of consciousness
├─ Severe allergic reaction
└─ Severe uncontrolled bleeding

Nurse action:
1. Call 911 or activate ER protocol
2. Notify doctor immediately
3. Stay with patient
4. Prepare for transport
5. Document everything

DOCTOR STAT NOTIFICATION (within 5 min):
├─ High fever (> 102°F) with confusion
├─ Severe hypertension (> 200/120)
├─ Severe hypotension (< 80/50) with dizziness
├─ Chest pain (any severity)
├─ Severe rash or allergic signs
└─ Any sudden clinical change

Doctor options:
a) Extend consultation to address issue
b) Order tests (EKG, labs, imaging)
c) Refer to ER
d) Send to hospital admission
```

---

## Common Tasks

### Task: Patient Reports Severe Pain Before Doctor

```
Patient in room: "I'm having really bad back pain right now."

Nurse assessment:
1. When did pain start? "Just now, during check-in"
2. Pain scale 1-10? "9/10, severe"
3. What makes it worse? "Moving makes it worse"
4. Any recent injury? "Lifted something heavy yesterday"
5. Any numbness/weakness? "No, just pain"

Nurse documents:
"Patient reports acute lower back pain 9/10 severity, 
started yesterday after lifting, worsens with movement. 
No numbness/weakness. Patient in moderate distress, 
grimacing. On pain scale 9/10.
Alert: Possible muscle strain vs disc issue - needs assessment."

Nurse notifies doctor:
"Dr. Chen, patient reports severe lower back pain started 
yesterday after lifting. He rates it 9/10. I don't see 
numbness or weakness, but significant pain with movement. 
Should we proceed with consultation or do we need 
X-ray first?"

Doctor response:
a) "Let me see him, might be muscle strain"
b) "Get X-ray first to rule out fracture"
c) "Send to ER for imaging"

Nurse action per doctor's direction.
```

### Task: Patient Having Anxiety During Vitals

```
Patient trembling during blood pressure check:

Patient: "I get nervous at the doctor's office."

Nurse recognizes: Vital signs will be artificially elevated 
(anxiety can raise BP/HR significantly)

Nurse action:
1. Reassure patient:
   "This is normal, many people feel anxious here. 
    Deep breathing helps. Let's try it."

2. Demonstrate deep breathing:
   "Breathe in slowly through your nose for 4 counts...
    hold for 4... out through your mouth for 4.
    Let's do that a few times."

3. Pause vitals for 3-5 min:
   "Let me give you a minute to relax, then I'll 
    retake your Blood pressure."

4. Retake BP/HR after patient calmed:
   "See how your BP is better now? That's your 
    actual reading when you're relaxed."

5. Document:
   "Initial BP reading 145/92 - patient anxious/trembling.
    After D/B ×3 & rest, recheck BP 128/80 - patient calm.
    Final vitals recorded: 128/80.
    Note: Patient has white coat hypertension."

6. Alert doctor:
   "Dr. Chen, FYI patient reports office anxiety. 
    Initial BP was up but normalized after relaxation. 
    Final BP 128/80."
```

---

## Shift Handoff

### End of Shift Process

```
At shift end (e.g., 5:00 PM), nurse:

[Report End of Shift]

System shows:
├─ Pending patients (not yet discharged)
│  └─ Any ongoing care issues?
├─ Abnormal vitals (require follow-up)
│  └─ Any patient with elevated BP still waiting?
├─ Medications administered
│  └─ Any that needed education?
└─ Alerts acknowledged
   └─ Any unresolved?

Nurse communicates to next shift nurse:

"I'm in the process of handing off 2 patients:

1. Room 304 - John Smith (Dr. Chen)
   - Completed consultation, discharged
   - Given Amoxicillin, understood instructions
   - No issues

2. Room 305 - Jane Doe (Dr. Lee)
   - Still in with doctor (~10 min remaining)
   - Vitals normal , no concerns
   - Will be discharged within 15 min

Any questions? Everything's been documented in the system."

System records shift hand-off:
- Who: [Night nurse name]
- Time: 5:00 PM
- Patients transitioned
- Outstanding issues: None
```

---

## Performance Metrics

Nurses tracked on:

| Metric | Target |
|--------|--------|
| Vital signs accuracy | 100% |
| Time to collect vitals | < 5 min |
| Patient satisfaction | 4.6/5 stars |
| Critical value detection | 100% |
| Medication admin errors | 0 |
| Patient education completion | 100% |

---

**Questions?** Contact nursing supervisor or reference [SYSTEM_ARCHITECTURE.md](../product/SYSTEM_ARCHITECTURE.md) for technical details.
