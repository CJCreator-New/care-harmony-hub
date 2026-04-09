# Receptionist Workflow Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Receptionists, healthcare IT staff, developers implementing receptionist features

---

## Table of Contents

1. [Role Overview](#role-overview)
2. [Daily Workflow](#daily-workflow)
3. [Patient Check-In](#patient-check-in)
4. [Appointment Management](#appointment-management)
5. [Patient Registration](#patient-registration)
6. [Insurance Verification](#insurance-verification)
7. [Queue Management](#queue-management)
8. [Common Tasks](#common-tasks)

---

## Role Overview

**Primary Responsibility**: Patient check-in, appointment coordination, insurance verification

**Permissions Held**:
- `appointments:view_all` - See all hospital appointments
- `appointments:update_status` - Change appointment status (scheduled → checked_in)
- `patients:view` - View patient information
- `patients:create` - Register new patients
- `patients:update_basic` - Update contact info, phone, email
- `insurance:verify` - Check insurance eligibility
- `hospital:view_queue` - See patient queue in real-time

**Cannot Do**:
- View medical records/consultations
- Create prescriptions
- Order labs
- Approve anything
- Create user accounts
- Change billing

---

## Daily Workflow

### Login & Dashboard

```
1. Login to CareSync at 7:45 AM (before clinic opens)
   └─ Receptionist-specific dashboard loads

2. Dashboard shows:
   ├─ Today's Appointments (total count)
   │  └─ Scheduled: 15, Checked In: 0, Completed: 0
   ├─ Waiting Room Queue (empty at start)
   ├─ Insurance Verification Status (how many verified)
   ├─ No-Show Rate Today (starting at 0%)
   └─ Team On Duty (which doctors, nurses working today)

3. Morning Tasks:
   [ ] Verify first 5 appointments have confirmed contact info
   [ ] Check insurance for high-risk (out-of-network) patients
   [ ] Print check-in forms for walk-ins area
   [ ] Test check-in kiosks (if available)
```

### Throughout the Day

```
Typical hourly pattern:

8:00-9:00 AM: Pre-clinic setup
  └─ Review all appointments for that hour
  └─ Verify insurance for next 5 appointments
  └─ Update phone numbers if patient called to reschedule

9:00-12:00 PM: Morning clinic
  └─ Patients arrive
  └─ Check-in each patient
  └─ Route to waiting area or direct to nurse
  └─ Answer phone calls (reschedule, cancel)
  └─ Handle walk-ins (fit into schedule if possible)

12:00-1:00 PM: Lunch (coverage by second receptionist)
  └─ First receptionist takes break
  └─ Coverage receptionist continues check-ins

1:00-5:00 PM: Afternoon clinic
  └─ Same process as morning
  └─ Close out day: verify no appointments missed
  └─ Generate missed appointment report
  └─ Handoff to evening staff (if applicable)
```

---

## Patient Check-In

### Pre-Arrival Preparation

**One day before appointment**:
```
System automatically:
├─ Sends patient SMS reminder (if opted in)
├─ Sends patient email reminder
├─ Flags any insurance issues (shows in receptionist dashboard)
└─ Prepares check-in form draft
```

**Receptionist reviews**:
```
For each appointment tomorrow:
├─ Patient has confirmed phone number? (call if not)
├─ Insurance current? (check, verify if expired)
├─ New patient? (have ID ready, gather info)
├─ Special needs? (mobility, language interpreter, etc)
└─ History of no-shows? (may call as reminder)
```

### Check-In Process (2-3 min per patient)

#### Step 1: Patient Arrival

```
Patient arrives at reception desk

Receptionist greets:
"Hi! Welcome to [Hospital Name]. Can I get your name?"

Patient says: "John Smith"

Receptionist searches system:
Click [Check-In] → Search "John Smith"

System shows:
├─ John Smith (DOB: 1975-05-20, Age 49)
├─ Appointment: Today @ 2:00 PM with Dr. Sarah Chen
├─ Status: Scheduled (checkmark)
├─ Insurance: Blue Cross Plan A (verified ✓)
└─ Last Visit: January 15, 2026
```

#### Step 2: Verify Identity & Insurance

```
Receptionist:
"I see you have an appointment with Dr. Chen at 2 PM. 
Can I see your insurance card and ID?"

Patient provides:
├─ Driver's License (front & back photographed)
└─ Insurance Card (front & back photographed)

System shows:
Insurance Verification
├─ Member ID: 123456789
├─ Group: ABC123
├─ Copay (office visit): $25
├─ Deductible: $1000 (met: $800, remaining: $200)
├─ Coverage: ACTIVE until December 31, 2026
└─ ✓ VERIFIED
```

#### Step 3: Update Contact Info

```
Receptionist:
"Is your phone number still (555) 123-4567?"

Patient: "Yes, that's correct."

If patient says no:
├─ Update phone number
├─ Offer SMS appointment reminders?
└─ Offer SMS lab result notifications?

Receptionist checks:
"Can we have your email for notifications?"

Patient provides: john.smith@example.com
└─ Email updated in system
```

#### Step 4: Confirm Chief Complaint

```
Receptionist:
"What brings you in today?"

Patient: "Annual checkup"

Receptionist updates:
├─ Chief Complaint: "Annual checkup" (if not from appointment)
├─ Any changes to medications? Y/N
├─ Any new allergies? Y/N
└─ Emergency contact still accurate? Y/N

Patient answers questions on tablet/form
```

#### Step 5: Complete Check-In

```
System shows:
✓ Insurance verified
✓ Identity confirmed
✓ Contact info current
✓ Chief complaint confirmed

Receptionist clicks: [Complete Check-In]

System:
├─ Updates appointment status: Scheduled → Checked In
├─ Records check-in time: 2:00 PM (on time +0 min)
├─ Sends notification to nurse station
├─ Triggers waiting room assignment (room, expected wait)
└─ Records timestamp (for no-show calculation)

Patient sees on screen:
"✓ Check-in complete
Room assignment: Waiting Room B
Expected wait: 10 minutes
Please have a seat"

Receptionist tells patient:
"Thank you! The nurse will call for you shortly. 
Please have a seat in the waiting room."
```

### Walk-In Patients

```
Unscheduled patient arrives:

Receptionist:
"Hi there! Do you have an appointment today?"

Patient: "No, I'm a walk-in."

Receptionist checks:
┌─ Is there availability today?
├─ Check open appointment slots (real-time)
├─ Which doctor has shortest wait?
└─ Can we fit walk-in within next 30 min?

If YES - available slot:
├─ Create new appointment
├─ Set as "Walk-in" appointment type
├─ Proceed with check-in as above

If NO - fully booked:
├─ Offer next available (tomorrow)
├─ Offer urgent care referral (if medically urgent)
├─ Take contact info, offer callback when slot opens
```

---

## Appointment Management

### Viewing Daily Schedule

```
[Appointments] → [Today's Schedule]

Shows timeline view:

8:00 AM  └─ Patient: John Smith | Dr. Chen (Cardiology)
         └─ Status: Scheduled | Arrived: ✓ 8:02 AM

8:30 AM  └─ Patient: Jane Doe | Dr. Lee (Internal Med)
         └─ Status: Scheduled | Insurance: ⚠️ OUT OF NETWORK

9:00 AM  └─ Patient: Bob Wilson | Dr. Chen (Cardiology)
         └─ Status: Checked In | Arrived: ✓ 8:58 AM
         └─ Wait time: 2 min (ahead of schedule)

9:30 AM  └─ Patient: Alice Johnson | Dr. Chen (Cardiology)
         └─ Status: NO-SHOW (Scheduled 9:30, not arrived by 9:45)
         └─ Recommendation: Create follow-up call task

10:00 AM └─ Patient: Charlie Brown | Dr. Lee (Internal Med)
         └─ Status: Consultation In Progress (doctor with patient)
...
```

### Rescheduling Appointments

```
Patient calls: "I need to move my 2 PM appointment."

Receptionist:
1. Looks up appointment
2. Pulls up availability for that doctor
3. Offers options:
   "Dr. Chen is available tomorrow at 10 AM or Friday at 3 PM.
    Which works better?"
4. Patient selects: "Friday at 3 PM"
5. Click [Reschedule] → Select time → [Confirm]

System:
├─ Updates appointment time
├─ Cancels old appointment slot (frees up)
├─ Sends SMS reminder to new appointment
├─ Updates all scheduled notifications
└─ Logs reschedule reason (for analytics)
```

### Canceling Appointments

```
Patient: "I need to cancel my appointment."

Receptionist:
1. Finds appointment in system
2. Clicks [Cancel]
3. Selects reason:
   ├─ Patient request
   ├─ Doctor scheduling conflict
   ├─ Insurance issue
   └─ Other

System shows:
If cancel within 24 hours:
  "Cancellation fee: $25 (waived if first time)"

Receptionist tells patient:
"Your appointment is canceled. 
Feel free to call back to reschedule."

System:
├─ Frees up time slot
├─ Cancels SMS reminders
├─ Sends cancellation confirmation
├─ Updates no-show tracking
```

---

## Patient Registration

### New Patient Registration

```
First-time patient arrives:

Receptionist:
"Welcome! Are you a new patient here?"

Patient: "Yes, first time."

Receptionist pulls up registration form:
[New Patient Registration]

Information to Collect:
├─ Personal Information
│  ├─ Full name (first, middle, last)
│  ├─ Date of birth
│  ├─ Sex/Gender
│  └─ Phone, email, address
│
├─ Emergency Contact
│  ├─ Name, relationship
│  └─ Phone number
│
├─ Insurance Information
│  ├─ Primary insurance card (scan/photo)
│  ├─ Secondary insurance (if any)
│  └─ Copay info
│
├─ Medical History (Brief)
│  ├─ Known conditions
│  ├─ Current medications
│  ├─ Allergies (CRITICAL - ask twice)
│  └─ Previous surgeries
│
└─ Consent & Privacy
   ├─ ☐ Consent to electronic records
   ├─ ☐ Consent to SMS reminders (optional)
   └─ ☐ HIPAA privacy acknowledgment

Time: Typically 10-15 minutes for complete registration
```

### Documenting New Patient

```
System generates:
├─ Patient ID (auto-generated UUID)
├─ Medical record number (MRN)
├─ Hospital account setup
├─ Initial patient record with
│  ├─ Demographics
│  ├─ Allergies (flagged if present)
│  ├─ Emergency contact
│  └─ Insurance on file

Receptionist action:
1. Review all entered information
2. Click [Create Patient Record]
3. Patient receives welcome packet with:
   ├─ New patient instructions
   ├─ Hospital policies
   ├─ Appointment confirmation
   └─ Patient portal login credentials
```

---

## Insurance Verification

### Verifying Insurance Before Appointment

```
Receptionist sees ⚠️ on appointment:

Yellow ⚠️: Insurance needs verification
Red ⚠️: Insurance issue found

Receptionist clicks on insurance alert:

[Insurance Verification Status]
├─ Member ID: 123456789
├─ Insurance Company: Blue Cross
├─ Last Verified: 30 days ago
├─ Status: OUT OF NETWORK
│  └─ This doctor is not in patient's network
│  └─ Patient may have higher copay
│  └─ Recommend calling patient to confirm
└─ [Verify Now] button

Clicking [Verify Now]:
├─ System contacts insurance company
├─ Real-time eligibility check
├─ Returns: Active/Inactive, Copay, Deductible
├─ Shows: In-Network status for this doctor
└─ Updates patient record with verification time
```

### Communicating Insurance Issues to Patient

```
Receptionist calls patient:

"Hi John, I'm calling about your appointment tomorrow with Dr. Chen.
I noticed our records show your insurance might not include Dr. Chen.
Can you confirm you still want to proceed?"

Patient options:
1. "Yes, go ahead" → Proceed with appointment, note in chart
2. "No, cancel" → Cancel appointment, free up slot
3. "Let me check my policy" → Reschedule call, mark for follow-up

Receptionist documents conversation:
├─ What was discussed
├─ Patient decision
├─ Contact method (phone)
└─ Time called
```

---

## Queue Management

### Real-Time Waiting Room

```
[Queue Management] → [Today's Queue]

Visual Board shows:

Waiting Room A              Waiting Room B
├─ John Smith              ├─ Jane Doe
│  └─ With: Dr. Chen       │  └─ With: Dr. Lee
│  └─ Wait: 5 min          │  └─ Wait: 10 min
│  └─ [In Progress]        │  └─ [Next to be called]
│
├─ Bob Wilson              └─ (empty)
│  └─ With: Dr. Chen
│  └─ Wait: 15 min
│  └─ [Waiting for room]
│
└─ Alice Johnson
   └─ With: Dr. Chen
   └─ Wait: 22 min
   └─ [Waiting for room]

Average Wait Time: 12 minutes
Room Availability: 1/3 open
Expected Discharge: 3-4 more patients by 5 PM
```

### Notifying Patients

```
When patient ready to see doctor:

System sends notification:
├─ In-app notification (if patient has app)
├─ SMS text: "Your doctor is ready. Room 304."
└─ Call to waiting area (PA system)
```

### Managing Wait Times

```
If wait time exceeds 30 minutes:

Receptionist:
1. Reviews which patients have been waiting longest
2. Checks doctor's status (still in consultation, or between patients?)
3. If delay unavoidable:
   ├─ Updates wait time estimate on display
   ├─ Calls patient in waiting room (apologize, provide ETA)
   ├─ Offers water, refresh
   └─ Documents delay reason

If multiple patients delayed:
└─ Alert nurse supervisor or clinic manager
```

---

## Common Tasks

### Task: Process a Canceled Insurance Card During Check-In

```
Patient arrives for appointment.
Receptionist attempts to scan insurance card.
System shows: "CARD DECLINED - NOT ON FILE"

Receptionist:
1. Asks patient: "Can I see your insurance card again?"
2. Scans new card
3. Enters member ID manually if scan fails
4. System verifies new insurance:
   ├─ Different plan than (on file)? [Confirm update]
   ├─ Coverage active? Yes/No
   └─ Copay amount? X

Options:
a) New insurance verified → Continue check-in
b) Insurance invalid → Tell patient:
   "It looks like your insurance isn't coming through.
    When you're done with your visit, can you call 
    your insurance company? We'll process the bill 
    after they confirm coverage."
c) No insurance → Proceed with appointment, 
   patient pays out-of-pocket or sets up payment plan
```

### Task: Respond to Walk-In Request During Fully Booked Day

```
Walk-in patient arrives: "Can I see a doctor today?"

Receptionist:
1. Checks today's schedule:
   └─ All doctors fully booked with only 5 min breaks
   
2. Checks tomorrow:
   └─ Dr. Lee has opening at 10 AM tomorrow
   
3. Offers patient:
   "I'm sorry, all doctors are booked today.
    I can fit you in tomorrow at 10 AM with Dr. Lee.
    Does that work?"
   
   If Yes:
   ├─ Create appointment for tomorrow 10 AM
   ├─ Take patient's phone number for confirmation
   └─ Provide check-in confirmation
   
   If No:
   ├─ Offer urgent care referral (if medically urgent)
   ├─ Take patient name, call when next opening
   └─ Get other location's hours for walk-in clinics
```

### Task: Handle No-Show Patient (Patient Doesn't Arrive)

```
Appointment scheduled: 2:00 PM
Current time: 2:15 PM
Patient not checked in

Receptionist:
1. At 2:10 PM, calls patient:
   "Hi John, just confirming your appointment 
    is at 2 PM today. Are you running late?"
   
   If patient answers:
   a) "I forgot, can I reschedule?"
      └─ Reschedule to available slot
   
   b) "I'm on my way, be there in 5 min"
      └─ Note in system, wait
   
   c) No answer
      └─ Leave voicemail, try again at 2:20 PM
   
   d) "I'm not coming" (cancels)
      └─ Mark as "Patient Cancellation", free up slot

2. If still no-show by 2:30 PM:
   └─ Mark appointment as "No-Show"
   └─ Notify doctor (appointment slot now free)
   └─ System flags patient for follow-up call

3. After clinic closes:
   └─ Generate no-show report
   └─ Schedule follow-up call for next day
   └─ Update patient's no-show history (3+ no-shows = talk to management)
```

---

## Performance Metrics

Receptionists are tracked on:

| Metric | Target | How Used |
|--------|--------|----------|
| Check-in accuracy | 100% | No data entry errors |
| Insurance verification rate | 95%+ | Done before check-in |
| Average check-in time | < 3 min | Patient satisfaction |
| Patient arrival on time | > 90% | Appointment adherence |
| Patient satisfaction (receptionist) | 4.5/5 stars | Quality of service |
| No-show follow-up | 24 hours | Retention |

Monthly reporting:
```
Receptionist Performance Report – April 2026

Check-ins completed: 847
Accuracy rate: 99.8% ✓
Avg time per check-in: 2.5 min ✓
Insurance verifications: 821/847 (96.9%) ✓
Patient satisfaction: 4.7/5 ✓
No-shows handled: 12 follow-ups completed ✓
```

---

## Quick Reference

| Need | Action |
|------|--------|
| Check-in patient | [Check-In] search by name, verify insurance, confirm details |
| Reschedule appt | [Appointments] click patient, [Reschedule], select new time |
| Cancel appt | [Appointments] click patient, [Cancel], select reason |
| New patient | [New Patient] collect info, create record, send welcome packet |
| Insurance issue | Call patient ASAP, explain situation, offer options |
| Patient late | Call at 10 min, confirm they're coming, note ETA |
| No-show | Call at check-in time, if no answer, mark no-show at 30 min mark |
| Walk-in | Check availability, schedule if open, offer other times if full |

---

**Questions?** Contact clinic management or reference [SYSTEM_ARCHITECTURE.md](../product/SYSTEM_ARCHITECTURE.md) for technical details.
