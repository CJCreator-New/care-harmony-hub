# Patient Portal Workflow Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Patients, healthcare IT staff, developers implementing patient features

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Patient Dashboard](#patient-dashboard)
3. [Booking Appointments](#booking-appointments)
4. [Pre-Visit Preparation](#pre-visit-preparation)
5. [Viewing Medical Records](#viewing-medical-records)
6. [Managing Medications](#managing-medications)
7. [Understanding Billing](#understanding-billing)
8. [Telemedicine Visits](#telemedicine-visits)
9. [Accessibility & Support](#accessibility--support)

---

## Getting Started

### Creating Your Account

**How to register**:
1. Visit: `https://patient.caresync.local/register`
2. Enter email address
3. Verify email (click link in email)
4. Create password (minimum 12 characters, 1 number, 1 special character)
5. Provide:
   - Full name (first, last)
   - Date of birth
   - Phone number (optional, for SMS notifications)
   - Hospital preference

6. Review privacy & consent forms:
   - ✓ I consent to electronic health records storage
   - ✓ I consent to SMS appointment reminders
   - ✓ I have read the privacy policy

7. Click `[Create Account]`

**Next**: You'll be directed to dashboard

### Logging In

```
1. Visit: https://patient.caresync.local/login
2. Email: [your email]
3. Password: [your password]
4. Click [Login]

First time? You'll see:
- Onboarding tour (can skip)
- Set up emergency contact
- Upload insurance card (optional)
- Complete medical history questionnaire
```

### Two-Factor Authentication (2FA)

**Recommended for security**:
1. Go to Settings → Security
2. Click `[Enable 2FA]`
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter 6-digit code to confirm

**On login**:
- After entering password, prompted for 6-digit code
- Code changes every 30 seconds
- If lost, use backup code (saved during setup)

---

## Patient Dashboard

### Daily View

**What you see**:

```
┌─────────────────────────────────────────────┐
│ Welcome, John Smith                    [⚙️] │
├─────────────────────────────────────────────┤
│                                             │
│  Upcoming Appointments                      │
│  ├─ Dr. Sarah Chen - Cardiology             │
│  │  📅 April 15, 2026 @ 2:00 PM            │
│  │  📍 Building A, Room 304                │
│  │  [Confirm] [Cancel]                    │
│  │                                         │
│  └─ Dr. James Lee - Primary Care           │
│     📅 April 22, 2026 @ 10:00 AM           │
│     📍 Telehealth                          │
│     [Confirm] [Start Video] [Reschedule]   │
│                                             │
│  Recent Lab Results         [See All →]     │
│  ├─ Complete Blood Count      ✓ Normal     │
│  └─ Metabolic Panel          ✓ Normal      │
│                                             │
│  Current Prescriptions       [Manage →]     │
│  ├─ Lisinopril 10mg (1 refill left)        │
│  ├─ Atorvastatin 20mg (Ongoing)            │
│  └─ Aspirin 81mg (Ongoing)                 │
│                                             │
│  Account Balance                            │
│  Amount Due: $150.00          [Pay Now]    │
│                                             │
└─────────────────────────────────────────────┘
```

### Sidebar Menu

| Section | What You Can Do |
|---------|---|
| **Dashboard** | Home, quick view of key info |
| **Appointments** | View, book, reschedule, cancel |
| **Medical Records** | View consultations, test results, prescriptions |
| **Medications** | Track active drugs, refill requests, pharmacy contact |
| **Lab Results** | View past and current test results |
| **Billing** | View charges, invoices, make payments |
| **Messages** | Read messages from doctors, nurses |
| **Telemedicine** | Start video visit with doctor |
| **Settings** | Account, notifications, insurance, emergency contact |

---

## Booking Appointments

### Step 1: Search Doctors & Specialties

```
1. Click [Appointments] in sidebar

2. View appointment options:
   - By Specialty (Cardiology, Internal Medicine, etc.)
   - By Doctor (see available doctors)
   - By Location (different buildings/clinics)

3. Filter:
   - Next 7 days / 14 days / 30 days
   - Morning / Afternoon / Evening
   - In-person / Telemedicine

4. View doctor profile:
   - Name, specialty, experience
   - Patient ratings (1-5 stars)
   - Insurance accepted
   - Typical wait time
```

### Step 2: Select Available Time

```
Doctor: Dr. Sarah Chen (Cardiology) ⭐ 4.8/5

Available Times:
Monday, April 14
├─ 9:00 AM - Available
├─ 9:30 AM - Available
├─ 10:00 AM - Booked
├─ 2:00 PM - Available    ← Usually shortest wait

Tuesday, April 15
├─ 8:00 AM - Available
├─ 10:00 AM - Available
└─ 3:30 PM - Available

[Select: Tuesday, April 15 @ 10:00 AM]
```

### Step 3: Confirm Booking

```
Appointment Summary:
├─ Doctor: Dr. Sarah Chen (Cardiology)
├─ Date: Tuesday, April 15, 2026
├─ Time: 10:00 AM
├─ Location: Building A, Room 304
├─ Type: In-person
├─ Reason: Annual checkup
├─ Insurance: Accepted (Blue Cross Plan A)
└─ Estimated Cost: $0 (copay waived for preventive)

[✓ Confirm] [✗ Cancel] [← Back]

After confirmation:
✓ Appointment locked
✓ Confirmation email sent
✓ SMS reminder at 24 hours before
✓ SMS reminder at 2 hours before
```

### Step 4: Pre-Visit Preparation

**Before appointment**:
1. Complete `[Pre-visit Form]` (opens 7 days before)
   - New symptoms since last visit?
   - Medication changes?
   - Recent hospitalizations?

2. Receive appointment reminder
   - Email: 24 hours before
   - SMS: 2 hours before (if opted in)

3. Start your visit
   - 15 min early: Go to check-in desk
   - 5 min early: Online? `[Start Telemedicine]` button appears

### Rescheduling or Canceling

```
My Appointments

Appointment: Dr. Sarah Chen (Cardiology)
Tuesday, April 15, 2026 @ 10:00 AM
[Confirm] [Reschedule] [Cancel]

Clicking [Reschedule]:
- Shows available times within next 30 days
- Must reschedule at least 24 hours before
- Can reschedule same doctor or different doctor in specialty

Clicking [Cancel]:
- Before 24 hours: Cancels free, no penalty
- Within 24 hours: Cancellation fee ($25) applies, waived if first time
```

---

## Pre-Visit Preparation

### Pre-Visit Questionnaire

**Opens 7 days before appointment**

```
Pre-Visit Form for Dr. Sarah Chen (Cardiology)

1. Chief Complaint
   [ ] Annual checkup
   [ ] Follow-up visit
   [ ] New symptoms
   [ ] Other: ________

2. Symptoms Since Last Visit?
   ├─ [ ] Chest pain
   ├─ [ ] Shortness of breath
   ├─ [ ] Dizziness
   ├─ [ ] Palpitations
   ├─ [ ] Other: ________
   
   If yes, describe: [________________]

3. New Medications?
   [ ] Yes [ ] No
   
   If yes:
   ├─ Drug name: [__________]
   ├─ Dose: [__________]
   ├─ When started: [__________]

4. Recent Hospitalizations?
   [ ] Yes [ ] No
   
   If yes: [________________]

5. Any Lab Work Done Recently?
   [ ] Yes (attached) [ ] Yes (at other hospital)
   [ ] No

[Submit Form]
```

**Purpose**: Helps doctor prepare, shortens visit time

### What to Bring

**In-Person Visits**:
- Insurance card (front & back)
- Photo ID (driver's license, passport)
- List of current medications (or bring bottles)
- Recent medical records from other doctors (if referring)

**Telemedicine Visits**:
- Stable internet connection
- Well-lit room
- Microphone & camera working
- Have insurance info ready

---

## Viewing Medical Records

### Consultation Notes

```
[Medical Records] → [Consultations]

Consultation: Annual Checkup
Date: January 15, 2026
Doctor: Dr. Sarah Chen

[View Full Note]
├─ Chief Complaint: Annual checkup, feeling well
├─ History: No new symptoms
├─ Vital Signs:
│  ├─ Temperature: 98.6°F
│  ├─ Blood Pressure: 120/80 mmHg
│  └─ Heart Rate: 72 bpm
├─ Assessment: Healthy, no acute issues
├─ Plan:
│  ├─ Continue current medications
│  ├─ Annual labs ordered
│  └─ Routine follow-up in 1 year
│
[Download PDF] [Print]
```

### Lab Results

```
[Medical Records] → [Lab Results]

Test: Complete Blood Count
Date Collected: January 20, 2026
Date Completed: January 22, 2026
Status: ✓ Approved

[View Results]
├─ WBC: 7.2 (Normal)
├─ RBC: 4.8 (Normal)
├─ Hemoglobin: 14.5 (Normal)
├─ Hematocrit: 43% (Normal)
└─ Platelets: 250 (Normal)

Interpretation: All values within normal range

[Download PDF]
```

### Prescriptions History

```
[Medical Records] → [Prescriptions]

Current Prescriptions:
├─ Lisinopril 10mg daily (Dr. Chen, 1 refill left)
├─ Atorvastatin 20mg daily (Dr. Chen, No refills)
└─ Aspirin 81mg daily (Dr. Chen, No refills)

Past Prescriptions:
├─ Amoxicillin 500mg (Completed Jan 2026)
└─ Ibuprofen 400mg (Expired Dec 2025)

[Request Refill] [View Details] [Download PDF]
```

---

## Managing Medications

### Requesting Refills

```
Current Medications:
Lisinopril 10mg daily
├─ Prescribed by: Dr. Sarah Chen
├─ Refills remaining: 1
├─ Last filled: March 15, 2026
├─ Next due: April 15, 2026
└─ [Request Refill]

When you click [Request Refill]:
✓ Sent to pharmacy
✓ Takes 1-2 business days
✓ SMS/email notification when ready
✓ Can pick up at pharmacy or have delivered
```

### Medication Reminders

```
Settings → Notifications → Medication Reminders

[ ] Enable medication reminders
[ ] Remind me at 8:00 AM
[ ] Remind me at 6:00 PM

Active Reminders:
├─ Lisinopril @ 8:00 AM daily
├─ Atorvastatin @ 8:00 PM daily
└─ Aspirin @ 8:00 AM daily

Receive via:
[ ] App notification
[ ] SMS text
[ ] Email

[Save Preferences]
```

---

## Understanding Billing

### Viewing Your Bill

```
[Billing] → [Invoices]

Invoice #INV-2026-001234
Date: April 1, 2026
Patient: John Smith
Insurance: Blue Cross Plan A

Services:
├─ Office visit (99213 - Level 3) ........... $150.00
├─ EKG (93040) .............................. $75.00
└─ Lab work (80053) ......................... $50.00
                                Limited Budget ────────
                                    Total: $275.00
Less: Insurance payment .................... -$200.00
                                    ────────
Patient responsibility (copay) ............ $25.00
Less: Patient payment (3/15/26) .......... -$25.00
                                    ────────
Amount Due: $0.00 ✓ Paid

[View Itemized] [Download PDF] [Email Invoice]
```

### Making Payments

```
Amount Due: $150.00

[Payment Options]
├─ Credit Card
├─ Debit Card
├─ Bank Account (ACH)
└─ Insurance claim (auto-submitted)

Payment Method: [Credit Card ▼]
Card Number: [________________]
Exp Date: [__/____]
CVV: [____]

Amount: $150.00
[Process Payment] [Save Card for Future]

✓ Payment successful
✓ Confirmation sent via email
```

### Insurance Information

```
Settings → Insurance

Primary Insurance:
├─ Plan: Blue Cross Blue Shield
├─ Member ID: 123456789
├─ Group Number: ABC123
├─ Copay (office visit): $25
├─ Deductible: $1,000 (met: $800)
└─ [Update Card]

[Submit Insurance Claim Manually]
(Usually auto-submitted; use only if needed)
```

---

## Telemedicine Visits

### Starting a Video Visit

```
[Telemedicine] or click in Appointments

Upcoming Telemedicine Visit:
Dr. James Lee - Primary Care
📅 April 22, 2026 @ 2:00 PM

Waiting Room:
- You're checked in
- Dr. Lee will join shortly
- [Start Video] button active 5 min before appointment

Click [Start Video]:
✓ Browser opens video conference
✓ Microphone/camera permission request
✓ "Allow" to continue
✓ Connected to waiting room
✓ Wait for doctor to join (typically <2 min)
```

### During Video Visit

```
Video Conference Interface:
┌─────────────────────────────┐
│ Dr. James Lee [📹] [🔊]    │
│                             │
│ [Your video in corner]      │
│ [🎤] [📹] [💬] [⏹️ End]    │
└─────────────────────────────┘

Controls:
- [🎤] Mute/unmute microphone
- [📹] Turn camera on/off
- [💬] Chat (for privacy questions)
- [⏹️] End call (only after consultation done)

Visit runs like:
1. Doctor greets you
2. Discusses symptoms/concerns
3. May ask you to move camera (show throat, etc.)
4. Provides assessment & plan
5. Sends prescription or referral
6. Schedule follow-up if needed
```

### Technical Issues

| Issue | Fix |
|-------|-----|
| "No video" | Check camera is enabled in browser settings |
| "No audio" | Check microphone enabled, not muted |
| "Frozen video" | Refresh browser, rejoin meeting |
| "Disconnected" | Reconnect to Wi-Fi, click [Rejoin] |
| "Can't find appointment" | Check time zone, refresh page |

---

## Accessibility & Support

### Accessibility Features

```
Settings → Accessibility

[ ] Large text (increase font size 150%)
[ ] High contrast mode (dark background, light text)
[ ] Screen reader support (for vision-impaired)
[ ] Closed captions (for hearing-impaired)
[ ] Keyboard navigation (no mouse required)

Language: [English ▼]
- English
- Spanish (Español)
- Mandarin (中文)
- Arabic (العربية)
```

### Getting Help

| Need | Contact | Response Time |
|------|---------|---|
| **Appointment issue** | Chat → Patient Support | <30 min |
| **Billing question** | Billing department | 1-2 hours |
| **Technical issue** | IT support link | 30 min |
| **Medical question** | Message doctor | 24-48 hours |
| **Emergency** | Call 911 or hospital hotline | Immediate |

### Patient Support Chat

```
[Help] → [Chat with Support]

Chat Interface:
"Hi! How can we help?"

Common Questions:
- How do I reschedule an appointment?
- Where's my lab result?
- How much do I owe?
- Can I get a copy of my medical record?

Type your question or choose from list above.
Average wait: 2 minutes for agent
```

---

## FAQs for Patients

### Appointments

**Q: Can I cancel my appointment and rebook at a different time?**
A: Yes! Click [Reschedule] to move to different time. Must be done 24 hours before appointment to avoid cancellation fee.

**Q: What if I'm late to my appointment?**
A: Show up anyway! For in-person, check in at desk. For telemedicine, click [Rejoin] if you miss video room. Doctor will wait 15 minutes.

### Medical Records

**Q: How long are my medical records kept?**
A: Indefinitely. We retain your complete medical history for legal/compliance reasons.

**Q: Can I download my records to share with another doctor?**
A: Yes! Click [Download PDF] on any record (consultation, lab result, prescription). Share as needed.

### Prescriptions

**Q: Why can't I refill my prescription online?**
A: Some medications require doctor review (e.g., controlled substances, antibiotics). Your doctor will respond within 1-2 business days.

**Q: How do I know if my prescription is ready?**
A: You'll get SMS and email notification. Also visible in [Medications] section.

### Billing

**Q: Why is my bill higher than I expected?**
A: Itemized charges include facility fee, supplies, labs, etc. Click [Itemized] to see breakdown. Contact billing if questions.

**Q: What if I can't pay the full amount?**
A: Contact billing department to discuss payment plan options.

---

## Privacy & Security

✅ **Your privacy is protected**:
- All data encrypted in transit (HTTPS) and at rest
- Hospital-specific isolation (can't see other hospital's patients)
- Two-factor authentication available
- Login attempts monitored

✅ **What you control**:
- Who can see your records (family members can request access)
- Communication preferences (email, SMS, app only)
- Appointment notifications
- Which doctors have access

❌ **Never share**:
- Your login credentials
- 2FA codes
- Confirmation links from emails

✅ **Report security issues**:
- Suspicious login? Click [Report Security Issue] or email: security@caresync.local
- Unusual charge? Contact billing immediately

---

**Questions?** Contact Patient Support at support@caresync.local or reference [SYSTEM_ARCHITECTURE.md](../product/SYSTEM_ARCHITECTURE.md) for technical details.
