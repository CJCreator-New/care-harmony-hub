# PHASE 5: FEATURE COMPLETENESS & ENHANCEMENT
## Comprehensive Execution Plan & Roadmap

**Project**: CareSync HIMS  
**Phase**: 5 (Features)  
**Status**: PLANNING  
**Target Completion**: April 22-29, 2026 (2-week sprint)  
**Team Capacity**: 85% allocation (7 people)  
**CTO Approval Status**: Pending Phase 5 plan review

---

## EXECUTIVE SUMMARY

Phase 5 implements 6 high-priority features that enable critical clinical workflows and patient engagement. These features build on Phase 4's performance foundation and extend functionality across all user roles.

### Feature Overview

| # | Feature | Priority | Effort | Duration | Roles |
|---|---------|----------|--------|----------|-------|
| 1 | Appointment Recurrence & No-Show Tracking | **P0** | High | 5 days | Receptionist, Patient |
| 2 | Telemedicine Integration & Video | **P0** | Very High | 7 days | Doctor, Patient, Nurse |
| 3 | Prescription Refill Workflows | **P0** | Medium | 4 days | Pharmacist, Patient, Doctor |
| 4 | Billing Enhancements | **P1** | High | 6 days | Billing, Patient, Admin |
| 5 | Clinical Notes Workflows | **P1** | Medium | 4 days | Doctor, Nurse |
| 6 | Role Workflow Validation | **P1** | Medium | 3 days | QA Lead |
| | **TOTAL** | | **Very High** | **29 person-days** | All |

**Timeline**: 2-week sprint with parallel workstreams  
**Critical Path**: Telemedicine (7 days) + Billing (6 days)  
**Production Ready**: April 29, 2026  

---

## FEATURE 1: APPOINTMENT RECURRENCE & NO-SHOW TRACKING

### Overview
Patients can book recurring appointments (weekly, bi-weekly, monthly) with automatic slot reservations. System tracks attendance and flags no-shows for follow-up.

### Business Value
- ✅ Reduces manual rebooking effort by 60%
- ✅ Improves clinic slot utilization by 25%
- ✅ Enables proactive patient follow-up
- ✅ Revenue impact: +5% average visit increase

### Detailed Breakdown

#### 1.1 Recurrence Scheduling Engine (4 days)
**Owner**: Backend Lead  
**Deliverables**:
- [ ] DB schema: `appointment_recurrence_patterns` table
  - Pattern type: daily, weekly, bi-weekly, monthly, custom
  - Start/end dates, exceptions, max occurrences
  - RLS policies scoped to hospital
  - Audit trail for changes

- [ ] Database migration (Migration #42)
  ```sql
  CREATE TABLE public.appointment_recurrence_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    pattern_type TEXT CHECK (pattern_type IN ('daily','weekly','bi_weekly','monthly','custom')),
    recurrence_rule JSONB NOT NULL DEFAULT '{}',
    start_date DATE NOT NULL,
    end_date DATE,
    max_occurrences INTEGER,
    exceptions JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE public.appointment_recurrence_patterns ENABLE ROW LEVEL SECURITY;
  ```

- [ ] Edge Function: `generate-recurring-appointments`
  - Triggered daily at midnight (scheduled job)
  - Calculates next 30 days of recurring appointments
  - Creates appointment records with status='scheduled'
  - Sends confirmation emails to patients
  - Logs audit events for each creation
  - Error handling: retry on failure, max 3 attempts

- [ ] Helper utilities: `recurrence.utils.ts`
  - Calculate next occurrence date
  - Detect scheduling conflicts
  - Apply exceptions (holidays, manual blocks)
  - Generate iCal format for calendar export

**Tests** (12 tests):
- [ ] Create daily recurrence (3 tests: success, conflict detect, end-of-month)
- [ ] Create weekly recurrence (3 tests: day selection, timezone, DST)
- [ ] Exception handling (3 tests: holiday, manual block, multi-exception)
- [ ] Edge cases (3 tests: past date, max occurrences, invalid pattern)

**Success Criteria**:
- ✅ All 12 tests passing
- ✅ Conflicts detected 100% of the time
- ✅ Edge Functions deploy without errors
- ✅ Zero race conditions on concurrent creation

**Dependencies**: None (independent)

---

#### 1.2 No-Show Tracking & Reporting (3 days)
**Owner**: Backend Lead (shared from 1.1)  
**Deliverables**:
- [ ] DB schema: `appointment_no_shows` table
  - Tracks attendance, system-flagged no-shows
  - Reason codes: no-show, cancelled, rescheduled, completed
  - Follow-up action status (pending, sent, ignored)

- [ ] Enhanced `appointments` table
  - Add `attended_at` and `attended_by` columns (timestamp + staff ID)
  - Add `no_show_flagged_at` column
  - Add `follow_up_contact_sent` boolean

- [ ] Edge Function: `mark-no-show`
  - Triggered 15 mins after scheduled time with no check-in
  - Auto-notifies receptionist
  - Flags patient for follow-up
  - Updates appointment status → 'no_show'
  - Logs audit event with reason code

- [ ] Helper: `no-show-analytics.utils.ts`
  - Calculate no-show rate per patient (%, trend)
  - Generate no-show report by time slot, doctor, specialty
  - Identify high-risk patients (>3 no-shows in 6 months)
  - Export CSV for clinic review

**Tests** (10 tests):
- [ ] No-show detection (3 tests: auto-flag, manual flag, edge time)
- [ ] Notifications (3 tests: receptionist, patient, doctor)
- [ ] Analytics (2 tests: rate calculation, trend detection)
- [ ] Edge cases (2 tests: multiple no-shows, cancelled recovery)

**Success Criteria**:
- ✅ All 10 tests passing
- ✅ No-show flagged within 1 minute of trigger
- ✅ Notifications delivered <5 seconds
- ✅ Analytics queries return <500ms

**Dependencies**: 1.1 (Recurrence Engine) ← Must complete first

---

#### 1.3 Frontend: Recurrence UI & Patient Experience (3 days)
**Owner**: Frontend Lead  
**Deliverables**:
- [ ] `AppointmentRecurrenceModal.tsx` (250 lines)
  - Dropdown: pattern type (daily, weekly, bi-weekly, monthly)
  - Date picker: start date, end date
  - Configuration per pattern (e.g., "every Monday & Wednesday")
  - Exception management (add blocked dates)
  - Preview of next 5 occurrences
  - Accessible form design (ARIA labels, keyboard nav)

- [ ] `useRecurringAppointments()` hook (180 lines)
  - Create/update/delete recurrence patterns
  - Fetch upcoming recurring appointments
  - Apply exceptions
  - Error boundaries with user-friendly messages
  - Optimistic updates with rollback

- [ ] Enhanced `AppointmentDetail.tsx`
  - Show "Recurs: Every Monday" label
  - Link to recurrence editor
  - Display no-show history (last 5)
  - Manual mark-as-attended option

- [ ] `NoShowReport.tsx` component (200 lines)
  - Table: patient, specialty, date, reason, follow-up
  - Filters: date range, status, reason code
  - Actions: mark as contacted, re-book, export CSV
  - Real-time updates via Supabase subscription

- [ ] `PatientRecurrenceManager.tsx` (180 lines)
  - Patient dashboard: view all recurring appointments
  - Pause/resume recurrence (soft cancel)
  - View attendance history
  - One-click snooze (skip next 2 weeks)

**Tests** (15 tests):
- [ ] Modal creation (3 tests: pattern select, date validation, preview)
- [ ] Hook functionality (4 tests: CRUD, fetch, exceptions, errors)
- [ ] Component rendering (4 tests: detail view, report table, patient manager)
- [ ] Accessibility (2 tests: keyboard nav, screen reader)
- [ ] Edge cases (2 tests: timezone handling, DST transitions)

**Success Criteria**:
- ✅ 95% accessibility score (WCAG)
- ✅ All 15 tests passing
- ✅ <150ms component render time
- ✅ Form validation prevents invalid patterns

**Dependencies**: 1.1, 1.2 (Backend must complete first)

---

#### 1.4 Integration Tests & E2E Workflows (2 days)
**Owner**: QA Lead  
**Deliverables**:
- [ ] E2E Test: "Patient books recurring appointment"
  - Patient opens appointment booking
  - Selects recurring option (weekly)
  - Sets dates: April 15 - June 15
  - Confirms: 9 appointments created
  - Receives confirmation email
  - Verifies in patient dashboard

- [ ] E2E Test: "No-show detection & follow-up"
  - Booking exists for 2:00 PM
  - System waits 15 minutes past time
  - No check-in detected
  - Receptionist notified
  - Appointment flagged as no-show
  - Patient sees in history

- [ ] Integration test suite (8 tests):
  - Recurrence + slot availability
  - Recurrence + multi-doctor scheduling
  - No-show + billing (don't charge if no-show)
  - Concurrent recurrence creation (race condition check)
  - Deletion cascade (remove pattern → all generated appointments)
  - Edit recurrence (apply to future only)
  - Timezone handling across regions
  - Calendar export (iCal format)

- [ ] Stress test: 1000 recurring appointment generations
  - Confirm <10 second execution
  - Verify no race conditions

**Tests** (12 tests):
- [ ] 3 E2E workflows above
- [ ] 8 integration tests
- [ ] 1 stress test

**Success Criteria**:
- ✅ All 12 tests passing
- ✅ E2E workflows complete in <5 minutes
- ✅ 1000 appointment generation in <10 seconds
- ✅ Zero data corruption scenarios

**Dependencies**: 1.1, 1.2, 1.3

---

### Feature 1: Summary

| Task | Days | Owner | Status |
|------|------|-------|--------|
| 1.1 - Recurrence Engine | 4 | Backend Lead | Not Started |
| 1.2 - No-Show Tracking | 3 | Backend Lead | Dependent on 1.1 |
| 1.3 - Frontend UI | 3 | Frontend Lead | Dependent on 1.1, 1.2 |
| 1.4 - E2E Tests | 2 | QA Lead | Dependent on 1.1, 1.2, 1.3 |
| **Feature 1 Total** | **5 days** | **3 people** | **Sequential** |

**Critical Path**: 1.1 → 1.2 → 1.3 → 1.4  
**Parallelization**: 1.1 (Backend) can start day 1 while 1.2 continues  
**Production Ready**: Day 5 (April 19)

---

## FEATURE 2: TELEMEDICINE INTEGRATION & VIDEO CONFERENCING

### Overview
Doctors and patients conduct video consultations through integrated WebRTC with Zoom/Twilio, secure recording, chat, and prescription workflow integration.

### Business Value
- ✅ Expands patient reach (remote consultations)
- ✅ Reduces no-shows (more convenient)
- ✅ Revenue impact: +15% consultations
- ✅ Operational efficiency: saves clinic space

### Detailed Breakdown

#### 2.1 Telemedicine Backend Architecture (3 days)
**Owner**: Backend Lead (new resource)  
**Deliverables**:
- [ ] Telemedicine provider integration (choose: Zoom or Twilio)
  - API client setup with OAuth/API keys
  - Meeting creation with JWT tokens
  - Participant management (host, guest permissions)
  - Recording setup with encryption
  - Webhook listeners for lifecycle events

- [ ] DB schema: `telehealth_sessions` table
  ```sql
  CREATE TABLE public.telehealth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    appointment_id UUID NOT NULL REFERENCES appointments(id),
    meeting_id TEXT UNIQUE NOT NULL,
    host_id UUID NOT NULL REFERENCES profiles(id), -- doctor
    guest_id UUID NOT NULL REFERENCES profiles(id), -- patient
    status TEXT CHECK (status IN ('scheduled','in_progress','ended','no_show')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    recording_url TEXT,
    recording_encrypted BOOLEAN DEFAULT true,
    participant_count INTEGER DEFAULT 0,
    chat_enabled BOOLEAN DEFAULT true,
    screen_share_enabled BOOLEAN DEFAULT true,
    notes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE public.telehealth_sessions ENABLE ROW LEVEL SECURITY;
  ```

- [ ] Edge Functions:
  - `create-meeting`: Generate Zoom/Twilio meeting, issue JWT tokens
  - `end-meeting`: Archive recording, encrypt, store URL
  - `recording-webhook`: Handle provider recording completion
  - `participant-left`: Track participant drop-off
  - `session-analytics`: Collect metrics (duration, quality, participants)

- [ ] Helper utilities: `telehealth.utils.ts`
  - Generate secure meeting links with expiration
  - Verify user permissions (doctor can host, patient can join)
  - Encrypt/decrypt recording storage
  - Calculate video quality metrics (bitrate, packet loss)
  - Generate session report (duration, participants, issues)

**Tests** (12 tests):
- [ ] Meeting creation (3 tests: doc initiates, patient joins, JWT validation)
- [ ] Recording (3 tests: start, end, encryption verify)
- [ ] Permissions (2 tests: only doctor can host, only patient can join)
- [ ] Webhook handling (2 tests: recording delivered, participant left)
- [ ] Edge cases (2 tests: dropped connection, concurrent host attempts)

**Success Criteria**:
- ✅ All 12 tests passing
- ✅ Meeting creation <2 seconds
- ✅ JWT tokens valid for exact duration
- ✅ Recording encrypted at rest
- ✅ Webhook events processed within 5 seconds

**Dependencies**: None (parallel with other features)

---

#### 2.2 Real-Time Chat & Screen Sharing (2 days)
**Owner**: Backend Lead (continuation from 2.1)  
**Deliverables**:
- [ ] DB schema: `telehealth_messages` table
  - Encrypted chat messages during session
  - Message type: text, image, document
  - Sender/receiver, timestamp, read status

- [ ] RLS policies: Hospital-scoped, session-participants-only access

- [ ] Supabase Realtime integration
  - Subscribe to session messages in real-time
  - Broadcast participant join/leave
  - Broadcast screen share start/stop
  - Type-safe message payloads

- [ ] Helper: `chat.encryption.ts`
  - Encrypt messages end-to-end (patient key + doctor key mandatory)
  - Decrypt on client side only
  - Audit log (encrypted messages still logged)

- [ ] Helper: `screen-share.utils.ts`
  - Verify screen share permissions
  - Track when screen share starts/stops
  - Capture screen share timestamps for replay

**Tests** (8 tests):
- [ ] Real-time messages (3 tests: send/receive, encryption, delivery)
- [ ] Screen share (2 tests: start, stop, timestamps)
- [ ] Permissions (2 tests: verify participants, reject non-participant)
- [ ] Edge cases (1 test: network interruption during chat send)

**Success Criteria**:
- ✅ All 8 tests passing
- ✅ Messages appear <200ms
- ✅ Encryption/decryption <100ms
- ✅ Screen share toggle <500ms

**Dependencies**: 2.1

---

#### 2.3 Prescription Issuance During Telemedicine (2 days)
**Owner**: Backend Lead (continuation from 2.2)  
**Deliverables**:
- [ ] Enhanced `prescriptions` table
  - Add `telehealth_session_id` foreign key
  - Add `prescribed_during_session` boolean
  - Add `session_recording_reference` URL
  - Audit fields: `version`, `signed_at`

- [ ] Workflow: Doctor issues prescription during session
  1. Doctor opens prescription modal (in video window)
  2. Selects medication, dosage, instructions
  3. Patient sees real-time preview on their side
  4. Doctor clicks "Issue Prescription"
  5. System creates prescription record
  6. Patient receives notification
  7. Prescription sent to patient's pharmacy
  8. Audit log includes session reference

- [ ] Edge Function: `issue-telehealth-prescription`
  - Verify doctor is active in session
  - Create prescription with session reference
  - Send pharmacy notification
  - Store session recording link with prescription (for audit)
  - Log action to audit trail

**Tests** (6 tests):
- [ ] Prescription creation (2 tests: success, session verification)
- [ ] Notifications (2 tests: patient gets notification, pharmacy gets request)
- [ ] Audit (1 test: session reference stored, recording link included)
- [ ] Edge cases (1 test: prescription after session ended)

**Success Criteria**:
- ✅ All 6 tests passing
- ✅ Prescription issued <1 second
- ✅ Patient notification <5 seconds
- ✅ Audit trail includes session reference

**Dependencies**: 2.1, 2.2

---

#### 2.4 Frontend: Patient & Doctor UI Components (3 days)
**Owner**: Frontend Lead  
**Deliverables**:
- [ ] `TelehealthWaitingRoom.tsx` (200 lines)
  - Countdown: meeting starts in X minutes
  - Test audio/video (camera, microphone, speakers)
  - Check internet speed (alert if poor)
  - Virtual background toggle
  - Join meeting button (disabled until doctor joins)

- [ ] `TelehealthVideoConsultation.tsx` (400 lines)
  - Video grid (doctor + patient)
  - Mute/unmute audio controls
  - Camera on/off toggle
  - Screen share button (doctor only)
  - Chat panel (encrypted messages)
  - Timer: session duration
  - Prescription counter (shows count issued)
  - End meeting button

- [ ] `DoctorPrescriptionIssueModal.tsx` (250 lines)
  - Within video window
  - Open from doctor's side only
  - Drug selection with autocomplete
  - Dosage, instructions, quantity
  - Patient sees live preview
  - Issue button → creates prescription
  - Success toast + close

- [ ] `useTelehealthSession()` hook (200 lines)
  - Initialize video connection
  - Join/leave meeting
  - Send/receive messages
  - Track session duration
  - Handle disconnections with auto-reconnect
  - Error boundaries (network issues, device errors)

- [ ] `useVideoDevicePermissions()` hook (100 lines)
  - Request camera/microphone
  - Handle permission denial
  - Test device input/output
  - Fallback to audio-only if camera fails

**Tests** (18 tests):
- [ ] Waiting room (3 tests: render, device test, meeting start)
- [ ] Video UI (4 tests: controls, timer, chat, prescription counter)
- [ ] Prescription modal (4 tests: render, drug select, issue prescription, close)
- [ ] Hooks (4 tests: join/leave, messages, session tracking, reconnect)
- [ ] Accessibility (2 tests: keyboard nav, screen reader)
- [ ] Edge cases (1 test: device permission denied)

**Success Criteria**:
- ✅ 95% accessibility score
- ✅ All 18 tests passing
- ✅ Video renders <1 second
- ✅ Chat messages <200ms latency
- ✅ Prescription modal opens <500ms

**Dependencies**: 2.1, 2.2, 2.3

---

#### 2.5 Notifications & Appointment Reminders (2 days)
**Owner**: Backend Lead  
**Deliverables**:
- [ ] Enhanced appointment notifications
  - SMS: "Your telehealth appointment with Dr. X is in 30 minutes. Join here: [link]"
  - Email: Appointment details + join link + instructions
  - Push notification: Browser push with join button

- [ ] Edge Function: `send-telehealth-reminders`
  - Triggered at -30 min, -10 min, -1 min
  - Send SMS + email + push
  - Generate secure join link (expires after session)
  - Include troubleshooting tips
  - Track delivery

- [ ] `NotificationServices.ts` enhancement
  - Template: Appointment reminder with Zoom/Twilio link
  - No-op if patient already joined (check session status)
  - Retry on delivery failure (max 3 times)

**Tests** (6 tests):
- [ ] SMS delivery (2 tests: content correct, timing)
- [ ] Email delivery (2 tests: HTML template, link generation)
- [ ] Push notification (1 test: render on device)
- [ ] Edge cases (1 test: patient already joined, no redundant reminders)

**Success Criteria**:
- ✅ All 6 tests passing
- ✅ Reminders sent at exact time (-30 min, -10 min, -1 min)
- ✅ SMS delivery <10 seconds
- ✅ Join links expire after session

**Dependencies**: 2.1

---

#### 2.6 Integration Tests & E2E Workflows (2 days)
**Owner**: QA Lead  
**Deliverables**:
- [ ] E2E Test: "Doctor and patient conduct telemedicine appointment"
  1. Patient receives SMS reminder (30 min before)
  2. Patient clicks join link → waiting room
  3. Patient waits for doctor
  4. Doctor receives notification → joins
  5. Video connection established
  6. Doctor sees patient, patient sees doctor
  7. Doctor enables screen share
  8. Doctor issues prescription during video
  9. Patient sees prescription preview
 10. Doctor ends meeting
 11. Recording processed and encrypted
 12. Prescription sent to patient's pharmacy

- [ ] E2E Test: "Patient no-show to telemedicine appointment"
  1. Appointment scheduled
  2. Reminder SMS sent
  3. No join detected (timeout)
  4. System marks as no-show
  5. Receptionist notified
  6. Patient marked as no-show

- [ ] Integration tests (10 tests):
  - Video connection establishment
  - Chat encryption/decryption
  - Screen share toggle
  - Prescription creation + notification
  - Recording completion + encryption
  - Multi-participant handling (3+ doctor + patient)
  - Reconnection after drop
  - Browser compatibility (Chrome, Firefox, Safari)
  - Mobile responsiveness (tablet)
  - International timezone handling

- [ ] Performance tests:
  - Video quality at various bandwidth levels
  - Chat latency under load
  - Concurrent session scalability (100+ sessions)

**Tests** (15 tests):
- [ ] 2 E2E workflows
- [ ] 10 integration tests
- [ ] 3 performance tests

**Success Criteria**:
- ✅ All 15 tests passing
- ✅ E2E workflows complete in <10 minutes
- ✅ Video quality >720p on 5 Mbps connection
- ✅ 100+ concurrent sessions with <100ms latency

**Dependencies**: 2.1 through 2.5

---

### Feature 2: Summary

| Task | Days | Owner | Status |
|------|------|-------|--------|
| 2.1 - Backend Architecture | 3 | Backend Lead | Not Started |
| 2.2 - Chat & Screen Share | 2 | Backend Lead | Dependent on 2.1 |
| 2.3 - Prescription Issuance | 2 | Backend Lead | Dependent on 2.2 |
| 2.4 - Frontend UI | 3 | Frontend Lead | Dependent on 2.1, 2.3 |
| 2.5 - Notifications | 2 | Backend Lead | Dependent on 2.1 |
| 2.6 - E2E Tests | 2 | QA Lead | Dependent on all above |
| **Feature 2 Total** | **7 days** | **4 people** | **Parallel workstreams** |

**Critical Path**: 2.1 → 2.2 → 2.3 → (2.4 in parallel) → 2.6  
**Parallelization**: 2.5 can start after 2.1, 2.4 can start after 2.3  
**Production Ready**: Day 7 (April 21)

---

## FEATURE 3: PRESCRIPTION REFILL WORKFLOWS

### Overview
Patients request prescription refills online. Pharmacists review and approve/deny with messaging. Doctors can set auto-refill policies.

### Business Value
- ✅ Increases medication compliance
- ✅ Reduces pharmacy call volume
- ✅ Patient convenience (hassle-free refills)
- ✅ Revenue impact: +10% prescription volume

### Detailed Breakdown

#### 3.1 Backend: Refill Request Workflow (2 days)
**Owner**: Backend Lead  
**Deliverables**:
- [ ] DB schema: `prescription_refill_requests` table
  ```sql
  CREATE TABLE public.prescription_refill_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id),
    patient_id UUID NOT NULL REFERENCES patients(id),
    pharmacist_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('requested','reviewing','approved','denied','dispensed')),
    request_reason TEXT,
    pharmacy_notes JSONB DEFAULT '{}',
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ALTER TABLE public.prescription_refill_requests ENABLE ROW LEVEL SECURITY;
  ```

- [ ] Workflow state machine:
  - Patient creates refill request (status='requested')
  - Pharmacist receives notification (status='reviewing')
  - Pharmacist reviews and approves (status='approved') or denies (status='denied')
  - If approved, pharmacy processes refill
  - Patient notified of approval/denial
  - Prescription record updated with new refill

- [ ] Edge Function: `create-refill-request`
  - Verify prescription is eligible for refill (has refills remaining)
  - Check if recent refill request exists (prevent duplicate)
  - Create refill request record
  - Notify pharmacist: "Refill request from [Patient Name] for [Drug]"
  - Log audit event
  - Send confirmation to patient (SMS/Email)

- [ ] Edge Function: `approve-refill`
  - Verify pharmacist has permission
  - Check all drug interactions (if multi-med)
  - Create new dispensation record
  - Decrement prescription refills count
  - Notify patient: "Your refill is ready for pickup"
  - Mark as 'dispensed' if patient has already picked up
  - Log audit event with pharmacist ID

- [ ] Edge Function: `deny-refill`
  - Verify pharmacist has permission
  - Require denial reason (e.g., "Patient medication review needed", "Doctor must confirm dosage change")
  - Notify patient with reason
  - Suggest alternatives (contact doctor, schedule consultation)
  - Log audit event with reason

**Tests** (10 tests):
- [ ] Request creation (2 tests: success, duplicate prevention)
- [ ] Workflow transitions (3 tests: request→reviewing, approve, deny)
- [ ] Eligibility check (2 tests: refills remaining, drug interactions)
- [ ] Notifications (2 tests: pharmacist notification, patient notification)
- [ ] Edge cases (1 test: concurrent refill requests)

**Success Criteria**:
- ✅ All 10 tests passing
- ✅ Request creation <1 second
- ✅ Pharmacist notification <5 seconds
- ✅ Duplicate detection 100% accurate
- ✅ Drug interaction check <500ms

**Dependencies**: None (independent)

---

#### 3.2 Doctor: Auto-Refill Policies (1 day)
**Owner**: Backend Lead (continuation from 3.1)  
**Deliverables**:
- [ ] DB schema: `prescription_auto_refill_policies` table
  - Policy rule: medication, max-refills, approval-required
  - Metadata: created by, last reviewed, notes

- [ ] API endpoint: `POST /api/v1/prescriptions/{id}/auto-refill-policy`
  - Doctor can set auto-refill for any prescription
  - Options:
    - Auto-approve all refills (pharmacist still reviews for safety)
    - Require pharmacist approval each time
    - Expire after N refills

- [ ] Workflow: When refill requested with auto-refill policy
  1. Check policy: auto-approve or review
  2. If auto-approve: immediately approve (still run drug checks)
  3. If review: queue for pharmacist (expedited)
  4. Notify patient of status

- [ ] Edge Function: `process-auto-refill`
  - Check policy
  - Run drug interaction check
  - If safe, approve immediately
  - If safety concern, escalate to pharmacist
  - Log audit (auto-approved vs. escalated)

**Tests** (4 tests):
- [ ] Policy creation (1 test: doctor can set policy)
- [ ] Auto-approval (2 tests: approve if safe, escalate if concern)
- [ ] Audit (1 test: log shows auto-approved)

**Success Criteria**:
- ✅ All 4 tests passing
- ✅ Auto-approval <1 second
- ✅ Safety escalation <1 second
- ✅ Audit fields populated

**Dependencies**: 3.1

---

#### 3.3 Frontend: Patient Refill UI (2 days)
**Owner**: Frontend Lead  
**Deliverables**:
- [ ] `PrescriptionRefillModal.tsx` (180 lines)
  - Display medication (name, dosage, strength)
  - Show refills remaining
  - Optional reason for refill (e.g., "Running low", "Lost prescription")
  - Confirm button → creates refill request
  - Success: notification "Refill requested. Your pharmacist will review."
  - Loading state + error handling

- [ ] `MyPrescriptionsPanel.tsx` enhancement
  - List all active prescriptions
  - Show refills remaining per script
  - "Request Refill" button for each
  - Status: eligible, not-eligible (max refills reached)
  - "Recent refills" section (last 5)

- [ ] `RefillStatusNotifications.tsx` (120 lines)
  - Real-time updates: refill approved/denied/ready-for-pickup
  - Toast notification + in-app alert
  - If denied: show reason + suggest alternatives
  - If approved: show pickup location, estimated time

- [ ] `usePrescriptionRefill()` hook (150 lines)
  - Request refill (mutation)
  - Fetch refill history
  - Subscribe to refill status changes
  - Error handling (max refills reached, drug interactions flagged)

**Tests** (12 tests):
- [ ] Modal (3 tests: render, request creation, success message)
- [ ] Prescription panel (2 tests: list prescriptions, refills remaining)
- [ ] Notifications (3 tests: approved, denied, ready-for-pickup)
- [ ] Hook (2 tests: request refill, fetch history)
- [ ] Accessibility (1 test: keyboard nav + screen reader)
- [ ] Edge cases (1 test: no refills remaining)

**Success Criteria**:
- ✅ 95% accessibility
- ✅ All 12 tests passing
- ✅ Modal renders <500ms
- ✅ Real-time updates <1 second

**Dependencies**: 3.1, 3.2

---

#### 3.4 Frontend: Pharmacist Refill Review UI (1 day)
**Owner**: Frontend Lead (continuation from 3.3)  
**Deliverables**:
- [ ] `PharmacistRefillQueue.tsx` (250 lines)
  - Pending refill requests table
  - Columns: patient name, medication, quantity, reason, time requested
  - Sort/filter: by patient, medication, urgency
  - Row click → refill details drawer

- [ ] `RefillReviewDrawer.tsx` (200 lines)
  - Patient info, medication details
  - Previous refills (last 3)
  - Drug interactions check (display results)
  - Notes from previous pharmacist reviews
  - Buttons: "Approve" + "Deny"
  - If deny: dropdown for reason + text area for notes

- [ ] `useRefillQueue()` hook (120 lines)
  - Fetch pending refills
  - Subscribe to new refill requests (real-time)
  - Approve refill (mutation)
  - Deny refill with reason (mutation)
  - Mark as dispensed

**Tests** (8 tests):
- [ ] Queue table (2 tests: render all, filter/sort)
- [ ] Review drawer (3 tests: show details, approve, deny)
- [ ] Hook (2 tests: fetch queue, subscribe to updates)
- [ ] Alerts (1 test: drug interaction warning)

**Success Criteria**:
- ✅ All 8 tests passing
- ✅ Queue loads <1 second
- ✅ Real-time updates <1 second
- ✅ Approve/deny action <500ms

**Dependencies**: 3.1, 3.2

---

#### 3.5 Integration Tests & E2E (1 day)
**Owner**: QA Lead  
**Deliverables**:
- [ ] E2E Test: "Patient requests refill, pharmacist approves"
  1. Patient views prescriptions
  2. Clicks "Request Refill" for aspirin
  3. Enters reason: "Running low"
  4. Submits request
  5. Pharmacist receives notification
  6. Pharmacist opens refill queue
  7. Clicks aspirin refill request
  8. Reviews drug interactions (checks pass)
  9. Clicks "Approve"
 10. Patient receives SMS: "Your refill is ready"
 11. Patient marks as picked up

- [ ] E2E Test: "Doctor sets auto-refill, patient requests"
  1. Doctor edits prescription
  2. Sets "Auto-refill" policy
  3. Patient requests refill
  4. System auto-approves (drug check passes)
  5. Patient notified immediately

- [ ] Integration tests (5 tests):
  - Refill eligibility check
  - Drug interaction detection
  - Concurrent refill requests (race condition)
  - Pharmacy notification delivery
  - Audit trail generation

**Tests** (8 tests):
- [ ] 2 E2E workflows
- [ ] 5 integration tests
- [ ] 1 stress test (100 concurrent refill requests)

**Success Criteria**:
- ✅ All 8 tests passing
- ✅ E2E workflows <5 minutes
- ✅ 100 concurrent refills processed <10 seconds
- ✅ Zero race conditions

**Dependencies**: 3.1 through 3.4

---

### Feature 3: Summary

| Task | Days | Owner | Status |
|------|------|-------|--------|
| 3.1 - Backend Workflow | 2 | Backend Lead | Not Started |
| 3.2 - Auto-Refill Policies | 1 | Backend Lead | Dependent on 3.1 |
| 3.3 - Patient UI | 2 | Frontend Lead | Dependent on 3.1 |
| 3.4 - Pharmacist UI | 1 | Frontend Lead | Dependent on 3.1 |
| 3.5 - E2E Tests | 1 | QA Lead | Dependent on all above |
| **Feature 3 Total** | **4 days** | **3 people** | **Sequential** |

**Critical Path**: 3.1 → 3.2 → 3.3 → 3.4 → 3.5  
**Parallelization**: 3.3 and 3.4 can run in parallel after 3.1  
**Production Ready**: Day 4 (April 18)

---

## FEATURE 4: BILLING ENHANCEMENTS

### Overview
Advanced copay calculation, insurance claim submission, coverage verification, and revenue audit trails.

### Business Value
- ✅ Reduces billing errors
- ✅ Faster insurance claim processing
- ✅ Improves revenue cycle (fewer rejections)
- ✅ Revenue impact: +8% revenue recovery

### Detailed Breakdown

#### 4.1 Copay & Insurance Coverage Calculation Engine (3 days)
**Owner**: Billing Lead (new resource)  
**Deliverables**:
- [ ] DB schema: Enhanced `billing_records`
  - Add: `insurance_plan_id`, `coverage_percentage`, `copay_amount`, `deductible_remaining`
  - Add: `claim_status`, `claim_submission_date`, `claim_denial_reason`
  - Add: `calculated_by`, `calculation_verified`

- [ ] DB schema: `insurance_plans` table
  - Insurance provider, plan name, coverage limits
  - Copay rules: per-visit, per-service, per-prescription
  - Deductible: annual amount, used amount, reset date
  - Out-of-pocket maximum
  - Pre-authorization requirements

- [ ] Edge Function: `calculate-patient-cost`
  - Input: patient_id, service_code, service_amount
  - Lookup insurance plan
  - Check deductible: if not met, apply to service cost
  - Calculate coverage %, apply copay
  - Result: patient_responsibility, insurance_responsibility
  - Handle no-insurance case (self-pay)
  - Log calculation with timestamps

- [ ] Helper: `insurance.calculation.ts`
  - Verify copay eligibility (some services waived)
  - Calculate deductible application (applies before coverage %)
  - Handle tiered deductibles (e.g., $20 for primary, $50 for specialist)
  - Check annual/lifetime limits
  - Generate calculation audit trail

**Tests** (15 tests):
- [ ] Basic copay (3 tests: with deductible, with coverage, no insurance)
- [ ] Complex scenarios (3 tests: tiered copay, annual limit reached, OOP max)
- [ ] Edge cases (3 tests: unknown insurance plan, future deductible, mid-year reset)
- [ ] Calculation accuracy (3 tests: copay %, deductible application, final amount)
- [ ] Audit (3 tests: log calculation, verify, timestamp)

**Success Criteria**:
- ✅ All 15 tests passing
- ✅ Calculation accuracy: 100% match with insurance plan specs
- ✅ Calculation time <500ms
- ✅ Audit trail complete and auditable

**Dependencies**: None (independent)

---

#### 4.2 Insurance Claim Generation & Submission (2 days)
**Owner**: Billing Lead (continuation from 4.1)  
**Deliverables**:
- [ ] DB schema: `insurance_claims` table
  - Claim ID (unique per insurance provider)
  - Associated billing records (foreign key)
  - Status: draft, submitted, accepted, denied, appealed, paid
  - Submission date, acceptance date, denial reason
  - Provider response XML/JSON

- [ ] Edge Function: `generate-claim`
  - Collect billable services for date range
  - Group by insurance plan
  - Generate claim in insurance format (EDI 837 or provider-specific)
  - Verify all required fields present
  - Create claim record with status='draft'
  - Log generation

- [ ] Edge Function: `submit-claim`
  - Verify claim is complete
  - Connect to insurance provider API
  - Submit claim electronically
  - Receive confirmation ID
  - Update claim status='submitted'
  - Send billing admin notification
  - Log submission with provider response

- [ ] Helper: `claim.formatter.ts`
  - Format EDI 837 structure (if required by provider)
  - Map CareSync fields to insurance fields
  - Validate required fields per provider
  - Generate provider-specific claim format (e.g., Zoom claims, CVS claims)

- [ ] Helper: `claim.validator.ts`
  - Verify all required claim fields
  - Check patient eligibility (current insurance)
  - Verify billing codes match insurance plan
  - Detect duplicate claim submissions

**Tests** (12 tests):
- [ ] Claim generation (3 tests: single service, multi-service, unknown code)
- [ ] Submission (3 tests: submit to provider, receive confirmation, failed submit)
- [ ] Validation (2 tests: verify required fields, detect duplicates)
- [ ] Format (2 tests: EDI 837 format, provider-specific format)
- [ ] Error handling (2 tests: invalid claim, provider timeout)

**Success Criteria**:
- ✅ All 12 tests passing
- ✅ Claim generation <2 seconds
- ✅ Submission <5 seconds (including network)
- ✅ Provider confirmation received and logged
- ✅ Duplicate prevention 100%

**Dependencies**: 4.1

---

#### 4.3 Pre-Authorization & Coverage Verification (2 days)
**Owner**: Billing Lead (continuation from 4.2)  
**Deliverables**:
- [ ] DB schema: `pre_authorizations` table
  - Service code, patient, insurance plan
  - Authorization number, validity dates
  - Approved amount, actual charged amount
  - Status: pending, approved, denied, expired

- [ ] Edge Function: `verify-coverage`
  - Input: patient_id, service_code
  - Call insurance provider eligibility API
  - Check if service requires pre-auth
  - Return: coverage % , copay, deductible, pre-auth required
  - Cache result for 24 hours (reduce API calls)
  - Log verification with timestamp

- [ ] Edge Function: `request-pre-authorization`
  - Input: patient_id, service_code, estimated_amount, provider
  - Call insurance provider pre-auth API
  - Provide clinical justification (if required)
  - Receive authorization number + validity dates
  - Create pre_authorizations record
  - Notify doctor: "Pre-auth approved for [Service] until [Date]"
  - Log request with response

- [ ] Helper: `coverage.cache.ts`
  - Cache eligibility/coverage info (Redis)
  - TTL: 24 hours
  - Invalidate on manual refresh
  - Track cache hit rate

**Tests** (10 tests):
- [ ] Coverage verification (3 tests: covered service, not covered, unknown plan)
- [ ] Pre-auth request (3 tests: approved, denied, pending)
- [ ] Caching (2 tests: cache hit, cache refresh)
- [ ] Edge cases (2 tests: expired pre-auth, service limit reached)

**Success Criteria**:
- ✅ All 10 tests passing
- ✅ Coverage verification <1 second (cached)
- ✅ Pre-auth request <5 seconds (API call)
- ✅ Cache hit rate >80%
- ✅ Expired pre-auth detected 100%

**Dependencies**: 4.1, 4.2

---

#### 4.4 Revenue Audit & Reconciliation (2 days)
**Owner**: Billing Lead (continuation from 4.3)  
**Deliverables**:
- [ ] DB schema: `billing_audit_trails` table
  - Transaction: service provided, claimed, paid
  - Timestamp, amounts, status
  - Discrepancies: claimed vs. paid, reason

- [ ] Edge Function: `generate-revenue-audit-report`
  - Input: date range, provider (optional)
  - Collect all billing records for range
  - Group by: insurance provider, status, billing code
  - Calculate: total claimed, total paid, variance
  - Identify: unpaid claims, denied claims, payment delays
  - Generate CSV/PDF report

- [ ] Data warehouse query: Revenue metrics
  - Total revenue: services, insurance paid, patient paid
  - Revenue by provider, specialty, billing code
  - Claim acceptance rate (paid / submitted)
  - Average days to payment
  - Denial rate + top denial reasons
  - Revenue trend (month-over-month)

- [ ] Dashboard: `BillingAuditDashboard.tsx`
  - KPIs: total revenue, claim acceptance rate, denied claims
  - Charts: revenue trend, claim status breakdown
  - Table: detailed claim log with status
  - Filters: date, provider, status
  - Export to CSV/PDF

**Tests** (10 tests):
- [ ] Report generation (3 tests: date range, group by provider, variance calc)
- [ ] Metrics accuracy (3 tests: revenue sum, claim rate %, trend)
- [ ] Dashboard (2 tests: render, filters/export)
- [ ] Edge cases (2 tests: no data for range, partial payment)

**Success Criteria**:
- ✅ All 10 tests passing
- ✅ Report generation <5 seconds
- ✅ Metrics accuracy 100%
- ✅ Dashboard loads <1 second

**Dependencies**: 4.1, 4.2, 4.3

---

#### 4.5 Frontend: Billing Admin UI (2 days)
**Owner**: Frontend Lead  
**Deliverables**:
- [ ] `BillingDashboard.tsx` (300 lines)
  - Revenue KPIs: daily, monthly, YTD
  - Chart: revenue trend + claim acceptance rate
  - Alert: pending claims, denied claims, overdue payments
  - Quick actions: view denials, submit claims, verify coverage

- [ ] `ClaimManagementPanel.tsx` (250 lines)
  - Table: all claims with status
  - Columns: claim ID, patient, service, amount, status, submission date
  - Filters: status, date range, provider
  - Actions: resubmit claim, view denial reason, appeal
  - Bulk actions: export, print EOB

- [ ] `CoverageVerificationTool.tsx` (150 lines)
  - Patient lookup (search by ID or name)
  - Select service
  - Click "Verify Coverage"
  - Display: coverage %, copay, deductible, pre-auth needed
  - "Request Pre-Auth" button if needed

- [ ] `RevenueAuditReport.tsx` (200 lines)
  - Date range picker
  - Group by: provider (default), specialty, code
  - Report table with totals
  - Variance calculation: claimed vs. paid
  - Export to CSV/PDF buttons

**Tests** (12 tests):
- [ ] Dashboard (3 tests: KPI display, chart render, alerts)
- [ ] Claim panel (3 tests: table, filters, actions)
- [ ] Coverage tool (2 tests: lookup, verify)
- [ ] Report (2 tests: generate, export)
- [ ] Accessibility (2 tests: keyboard nav, screen reader)

**Success Criteria**:
- ✅ 95% accessibility
- ✅ All 12 tests passing
- ✅ Dashboard loads <1 second
- ✅ Report export <2 seconds

**Dependencies**: 4.1 through 4.4

---

#### 4.6 Integration Tests & E2E (1 day)
**Owner**: QA Lead  
**Deliverables**:
- [ ] E2E Test: "Service billing, coverage verification, claim submission"
  1. Patient receives service (clinic visit)
  2. Billing record created with amount
  3. System verifies insurance coverage
  4. Copay calculated + applied
  5. Claim generated
  6. Claim submitted to insurance provider
  7. Provider returns confirmation ID
  8. Status updated to 'submitted'
  9. Billing admin receives notification
 10. Days later: insurance provider sends claim paid notification
 11. Payment applied to revenue

- [ ] Integration tests (8 tests):
  - Copay calculation accuracy (verified vs. insurance)
  - Claim format (EDI 837 validation)
  - Provider integration (API responses)
  - Pre-auth workflow (request, approval, usage)
  - Claim denial handling (retry, appeal)
  - Payment reconciliation (received vs. claimed)
  - Revenue audit accuracy
  - Multi-provider scenarios

- [ ] Performance tests:
  - 1000 claims generated in <30 seconds
  - Coverage verification cache effectiveness
  - Report generation with 10k claims

**Tests** (12 tests):
- [ ] 1 E2E workflow
- [ ] 8 integration tests
- [ ] 3 performance tests

**Success Criteria**:
- ✅ All 12 tests passing
- ✅ E2E workflow <10 minutes
- ✅ 1000 claims in <30 seconds
- ✅ Report generation with 10k claims <10 seconds
- ✅ Accuracy 100%

**Dependencies**: 4.1 through 4.5

---

### Feature 4: Summary

| Task | Days | Owner | Status |
|------|------|-------|--------|
| 4.1 - Copay Calculation | 3 | Billing Lead | Not Started |
| 4.2 - Claim Generation | 2 | Billing Lead | Dependent on 4.1 |
| 4.3 - Pre-Auth & Coverage | 2 | Billing Lead | Dependent on 4.2 |
| 4.4 - Audit & Reconciliation | 2 | Billing Lead | Dependent on 4.3 |
| 4.5 - Billing Admin UI | 2 | Frontend Lead | Dependent on 4.1-4.4 |
| 4.6 - E2E Tests | 1 | QA Lead | Dependent on all above |
| **Feature 4 Total** | **6 days** | **3 people** | **Sequential** |

**Critical Path**: 4.1 → 4.2 → 4.3 → 4.4 → 4.5 → 4.6  
**Production Ready**: Day 6 (April 20)

---

## FEATURE 5: CLINICAL NOTES WORKFLOWS

### Overview
Doctor creates/signs clinical notes, nurse adds observations, complete audit trail with signatures and timestamps.

### Business Value
- ✅ Improves care coordination (documentation + communication)
- ✅ Legal compliance (authenticated signatures)
- ✅ Audit trail for malpractice defense
- ✅ Revenue impact: +3% (billable documentation services)

### Detailed Breakdown

#### 5.1 Backend: Clinical Notes with Signatures (2 days)
**Owner**: Backend Lead  
**Deliverables**:
- [ ] DB schema: `clinical_notes` table
  - Encounter reference (appointment_id)
  - Created by (doctor), last edited by
  - Content (JSONB for structured data + rich text)
  - Status: draft, signed, archived
  - Signatures: doctor_signature (timestamp + fingerprint), nurse_counter_signature (optional)
  - Audit: created_at, updated_at, version

- [ ] DB schema: `clinical_note_versions` table
  - Track all edits (audit trail)
  - Version number, editor, timestamp, change summary
  - Previous/current content diff

- [ ] RLS policies:
  - Doctor can create/edit their own notes (before signing)
  - Only doctor can sign their note
  - Nurse can add observations (append-only section)
  - Once signed, immutable (no edits)
  - Patient can view their own notes

- [ ] Edge Function: `sign-clinical-note`
  - Verify doctor owns note + can sign
  - Generate signature (timestamp + digital fingerprint)
  - Mark status='signed'
  - Make note immutable (future edits create new version)
  - Notify patient: "Doctor [Name] completed your visit notes"
  - Log audit event with signature

- [ ] Edge Function: `add-nurse-observation`
  - Append observation (cannot modify existing content)
  - Timestamp + nurse ID
  - Send doctor notification: "[Nurse] added observation to your note"
  - Log audit event

**Tests** (10 tests):
- [ ] Note creation (2 tests: doctor creates, retrieves)
- [ ] Signing (2 tests: sign note, immute after signing)
- [ ] Nurse observations (2 tests: append observation, no edit)
- [ ] Audit trail (2 tests: version tracking, immutable log)
- [ ] Permissions (2 tests: only doctor can sign, nurse can observe)

**Success Criteria**:
- ✅ All 10 tests passing
- ✅ Signature generation <500ms
- ✅ Immutability enforced (0 unauthorized edits)
- ✅ Audit trail complete

**Dependencies**: None (independent)

---

#### 5.2 Frontend: Doctor & Nurse UI (2 days)
**Owner**: Frontend Lead  
**Deliverables**:
- [ ] `ClinicalNoteEditor.tsx` (300 lines)
  - Rich text editor (bold, italic, lists, tables)
  - Template sections: CC (chief complaint), HPI (history), PE (exam), Assessment, Plan
  - Auto-save every 30 seconds (draft mode)
  - Sign button (locked until all required sections filled)
  - View previous notes (patient history)
  - Full-screen edit mode for long notes

- [ ] `ClinicalNoteSignModal.tsx` (120 lines)
  - Confirm note content before signing
  - "By clicking Sign below, I certify this note is accurate and complete"
  - Checkbox acceptance required
  - Sign button → triggers signature
  - Show signature timestamp after completion

- [ ] `NurseObservationPanel.tsx` (150 lines)
  - Display signed note (read-only)
  - "Add Observation" button
  - Text area for observation
  - Timestamp + nurse name auto-filled
  - Submit → appends to note
  - View all observations (list)

- [ ] `ClinicalNoteViewer.tsx` (180 lines)
  - Patient-facing note viewer (minimal legal text removed for clarity)
  - Printable format
  - View version history (with diffs)
  - Note: "This note was signed by Dr. [Name] on [Date]"

- [ ] `useClinicalNote()` hook (150 lines)
  - Fetch note by encounter ID
  - Save draft (auto-save)
  - Sign note (mutation)
  - Add observation (mutation)
  - Subscribe to note updates (nurse observations)

**Tests** (14 tests):
- [ ] Editor (3 tests: render, auto-save, template sections)
- [ ] Sign modal (2 tests: render, sign action)
- [ ] Observation panel (3 tests: add observation, display, permissions)
- [ ] Viewer (2 tests: render, print)
- [ ] Hook (2 tests: fetch, mutations)
- [ ] Accessibility (2 tests: keyboard nav, screen reader)

**Success Criteria**:
- ✅ 95% accessibility
- ✅ All 14 tests passing
- ✅ Editor renders <500ms
- ✅ Auto-save every 30s <1 second
- ✅ Signature UI <200ms

**Dependencies**: 5.1

---

#### 5.3 Integration Tests & E2E (1 day)
**Owner**: QA Lead  
**Deliverables**:
- [ ] E2E Test: "Doctor creates, edits, signs clinical note"
  1. Doctor opens encounter
  2. Clicks "Create Note"
  3. Fills in note sections (CC, HPI, PE, Assessment, Plan)
  4. Note auto-saves every 30 seconds
  5. Doctor edits Assessment section
  6. All required sections filled
  7. "Sign Note" button enabled
  8. Doctor clicks "Sign Note"
  9. Modal: confirms content + requires checkbox
  10. Doctor checks checkbox + clicks "Sign"
 11. Signature timestamp recorded
 12. Note status changed to 'signed'
 13. Patient notified via SMS/Email
 14. Nurse views note (read-only) + adds observation
 15. Observation appended to note
 16. Note version history shows all changes

- [ ] E2E Test: "Note immutability after signing"
  1. Note is signed
  2. Doctor attempts to edit
  3. Error: "Signed notes cannot be edited. Create a new addendum."
  4. Doctor creates new note version (addendum)
  5. Links to original note

- [ ] Integration tests (6 tests):
  - Note versioning + diffs
  - Audit trail accuracy
  - Permission enforcement (doctor sign only, nurse observe only)
  - Immutability after signing
  - Notification delivery
  - Patient viewing permissions

**Tests** (9 tests):
- [ ] 2 E2E workflows
- [ ] 6 integration tests
- [ ] 1 stress test (1000 concurrent note saves)

**Success Criteria**:
- ✅ All 9 tests passing
- ✅ E2E workflows <5 minutes
- ✅ 1000 concurrent note saves <30 seconds (no race conditions)
- ✅ Immutability 100% enforced

**Dependencies**: 5.1, 5.2

---

### Feature 5: Summary

| Task | Days | Owner | Status |
|------|------|-------|--------|
| 5.1 - Backend Signatures | 2 | Backend Lead | Not Started |
| 5.2 - Frontend UI | 2 | Frontend Lead | Dependent on 5.1 |
| 5.3 - E2E Tests | 1 | QA Lead | Dependent on 5.1, 5.2 |
| **Feature 5 Total** | **4 days** | **3 people** | **Sequential** |

**Critical Path**: 5.1 → 5.2 → 5.3  
**Production Ready**: Day 4 (April 18)

---

## FEATURE 6: ROLE WORKFLOW VALIDATION

### Overview
Comprehensive testing of all Phase 5 features across all 7 user roles (Doctor, Nurse, Receptionist, Pharmacist, Patient, Billing, Admin).

### Business Value
- ✅ Production confidence
- ✅ Prevents role-specific bugs
- ✅ Ensures multi-role workflows function correctly

### Detailed Breakdown

#### 6.1 Role-Based E2E Workflows (3 days)
**Owner**: QA Lead  
**Deliverables**:
- [ ] E2E Workflow: **Patient Journey - Appointment → Telemedicine → Refill**
  1. **Receptionist**: Books recurring appointment (weekly, 4 weeks)
  2. **Patient**: Receives appointment reminder SMS
  3. **Patient**: Clicks join link for telemedicine appointment
  4. **Patient**: Joins waiting room
  5. **Doctor**: Joins telemedicine session
  6. **Patient**: Sees doctor via video
  7. **Doctor**: Screen shares notes
  8. **Doctor**: Issues prescription during call
  9. **Patient**: Sees prescription preview
  10. **Pharmacist**: Receives refill request from patient
  11. **Pharmacist**: Reviews drug interactions
  12. **Pharmacist**: Approves refill
  13. **Patient**: Notified refill is ready

- [ ] E2E Workflow: **Doctor → Clinical Notes → Nurse Observation**
  1. **Doctor**: Creates clinical note with exam findings
  2. **Doctor**: Signs note (immutable)
  3. **Nurse**: Adds observation to signed note
  4. **Patient**: Receives notification about signed note
  5. **Patient**: Views note (redacted legal text)
  6. **Billing Admin**: Views note for billing code assignment

- [ ] E2E Workflow: **Billing Process - Service → Insurance → Payment**
  1. **Doctor**: Provides service (exam, prescription, etc.)
  2. **Billing Admin**: Creates billing record
  3. **Billing Admin**: Verifies insurance coverage
  4. **System**: Calculates copay
  5. **Billing Admin**: Generates claim
  6. **System**: Submits claim to insurance
  7. **Insurance**: Responds with acceptance
  8. **Billing Admin**: Tracks claim status
  9. **System**: Receives payment from insurance
  10. **Billing Admin**: Reconciles payment
 11. **Patient**: Receives bill for copay (if applicable)

- [ ] E2E Workflow: **No-Show Handling - Appointment → Cancellation → Reschedule**
  1. **Receptionist**: Books appointment
  2. **Patient**: Receives reminder
  3. **Patient**: Does NOT show up (no check-in)
  4. **System**: Flags as no-show after 15 minutes
  5. **Receptionist**: Notified of no-show
  6. **Receptionist**: Marks as no-show + sends follow-up message
  7. **Patient**: Receives follow-up message
  8. **Patient**: Reschedules appointment
  9. **Receptionist**: Books new appointment (no conflicts)

- [ ] E2E Workflow: **Role Separation - Pharmacist vs Doctor vs Patient**
  - Pharmacist cannot create billing records (only review)
  - Doctor cannot approve refills (only pharmacist)
  - Patient cannot see other patients' notes
  - Admin has full visibility but limited edit capability

**Tests** (10+ E2E scenarios):
- [ ] Complete workflows above
- [ ] Role separation validations
- [ ] Permission enforcement
- [ ] Data isolation by hospital

**Success Criteria**:
- ✅ All 10+ E2E tests passing
- ✅ Each workflow <10 minutes
- ✅ Zero unauthorized data access
- ✅ Role permissions 100% enforced

**Dependencies**: Features 1-5 completed

---

#### 6.2 Cross-Role Notification & Communication (1 day)
**Owner**: QA Lead  
**Deliverables**:
- [ ] Notification matrix validation
  - When patient books appointment → receptionist notified
  - When doctor signs note → patient notified
  - When pharmacist approves refill → patient notified
  - When no-show flagged → receptionist notified
  - When claim denied → billing admin notified

- [ ] Test suite (8 tests):
  - Each role receives correct notifications
  - No cross-hospital notifications
  - Notification content is accurate
  - Multi-channel delivery (SMS, email, in-app)
  - Retry on delivery failure

**Tests** (8 tests):
- [ ] 6 notification scenarios
- [ ] 1 permission test (no cross-hospital)
- [ ] 1 delivery retry test

**Success Criteria**:
- ✅ All 8 tests passing
- ✅ Notifications delivered <5 seconds
- ✅ Content accuracy 100%
- ✅ Zero cross-hospital data leak

**Dependencies**: Features 1-5 completed

---

#### 6.3 Accessibility & Device Compatibility (1 day)
**Owner**: QA Lead  
**Deliverables**:
- [ ] Accessibility audit (WCAG 2.1 AA)
  - Test keyboard navigation for all Phase 5 features
  - Screen reader compatibility (NVDA, JAWS, VoiceOver)
  - Color contrast validation
  - Form label association
  - Focus indicators

- [ ] Device compatibility
  - Desktop: Chrome, Firefox, Safari (latest 2 versions)
  - Mobile: iOS Safari, Chrome Android (latest versions)
  - Tablet responsiveness
  - Touch interactions

- [ ] Test suite (12 tests):
  - 4 accessibility workflows
  - 6 cross-browser tests
  - 2 device/OS combinations

**Tests** (12 tests):
- [ ] 4 accessibility workflows (per major feature)
- [ ] 6 cross-browser compatibility
- [ ] 2 mobile/tablet responsiveness

**Success Criteria**:
- ✅ WCAG 2.1 AA compliance (automated + manual test)
- ✅ 100% keyboard navigable
- ✅ Screen reader fully functional
- ✅ All browsers/devices rendering correctly
- ✅ Touch interactions functional on mobile

**Dependencies**: Features 1-5 frontend components

---

#### 6.4 Performance & Load Testing (1 day)
**Owner**: QA Lead  
**Deliverables**:
- [ ] Load test scenarios
  - 100 concurrent users (Phase 5 features)
  - Appointment booking surge (100 bookings in 5 minutes)
  - Telemedicine session creation (50 concurrent)
  - Refill request processing (200 concurrent requests)
  - Billing claim submission (500 claims in 1 minute)

- [ ] Performance baselines
  - API response time <500ms (p95)
  - UI render time <1 second
  - Database query time <100ms (avg)
  - Real-time notification delivery <5 seconds

- [ ] Test suite (5 tests):
  - Concurrent user load
  - Surge testing (appointment booking)
  - Telemedicine session scaling
  - Refill processing throughput
  - Claim submission batch processing

**Tests** (5 tests):
- [ ] 5 load scenarios above

**Success Criteria**:
- ✅ All 5 load tests passing
- ✅ >99% success rate under load
- ✅ API response time <500ms (p95)
- ✅ Zero data corruption under load
- ✅ Graceful degradation if limits exceeded

**Dependencies**: Features 1-5 completed

---

#### 6.5 Security & Data Privacy (1 day)
**Owner**: QA Lead  
**Deliverables**:
- [ ] Security test suite
  - Role-based access control (RBAC)
  - Row-level security (RLS) by hospital
  - PHI encryption (at rest, in transit)
  - Audit trail immutability
  - Session management (XSS, CSRF prevention)

- [ ] Data privacy tests
  - Patient data not leaked to other patients
  - Staff data scoped to own hospital
  - Billing data access restricted to billing role
  - Admin visibility without edit capability

- [ ] Test suite (8 tests):
  - 3 RBAC scenarios
  - 3 RLS/data isolation
  - 2 encryption & audit

**Tests** (8 tests):
- [ ] RBAC enforced
- [ ] RLS prevents cross-hospital access
- [ ] PHI protected
- [ ] Audit trail immutable
- [ ] Session attacks prevented
- [ ] Data isolation verified
- [ ] Encryption in transit
- [ ] Encryption at rest

**Success Criteria**:
- ✅ All 8 security tests passing
- ✅ Zero unauthorized data access attempts succeed
- ✅ All PHI encrypted
- ✅ Audit trail 100% complete & immutable

**Dependencies**: Features 1-5 completed

---

### Feature 6: Summary

| Task | Days | Owner | Status |
|------|------|-------|--------|
| 6.1 - Role E2E Workflows | 3 | QA Lead | Not Started |
| 6.2 - Notifications | 1 | QA Lead | Dependent on 1-5 |
| 6.3 - Accessibility | 1 | QA Lead | Dependent on 1-5 |
| 6.4 - Performance | 1 | QA Lead | Dependent on 1-5 |
| 6.5 - Security | 1 | QA Lead | Dependent on 1-5 |
| **Feature 6 Total** | **3 days** | **1 person** | **Sequential** |

**Critical Path**: 6.1 → 6.2 → 6.3 → 6.4 → 6.5  
**Production Ready**: Day 3 (April 17)

---

## PHASE 5: OVERALL EXECUTION ROADMAP

### Timeline Overview

```
Week 1 (April 15-19, 2026):
  Mon: 1.1 (Recurrence engine), 2.1 (Telemedicine backend), 3.1 (Refill backend), 4.1 (Copay calc), 5.1 (Clinical notes signing)
  Tue: 1.2 (No-show tracking), 2.2 (Chat/screen share), 3.2 (Auto-refill), 4.2 (Claim gen)
  Wed: 1.3 (Recurrence UI), 2.3 (Prescription during tele), 3.3 (Patient refill UI), 4.3 (Pre-auth)
  Thu: 1.4 (E2E tests), 2.4 (Doctor/patient UI), 3.4 (Pharmacist UI), 4.4 (Audit)
  Fri: Feature 1 complete ✅, Feature 5 complete ✅, 2.5 (Notifications), 3.5 (E2E tests)

Week 2 (April 22-29, 2026):
  Mon: 2.6 (Telemedicine E2E), 4.5 (Billing UI)
  Tue: Feature 3 complete ✅, Feature 4 complete ✅
  Wed: 4.6 (Billing E2E), 5.2 (Clinical notes UI)
  Thu: Feature 2 complete ✅
  Fri: Feature 6 complete ✅ (Role validation)

Production Ready: April 29, 2026 ✅
```

### Parallel Workstreams Diagram

```
Backend Track:
  |-- Feature 1.1 (Recurance) ──┬── 1.2 (No-show) ──┬─ 1.3 (Frontend depends)
  |-- Feature 2.1 (Tele backend)── 2.2 (Chat) ──────── 2.3 (Prescription in tele)
  |-- Feature 3.1 (Refill WF) ──────── 3.2 (Auto-refill)
  |-- Feature 4.1 (Copay) ──── 4.2 (Claims) ── 4.3 (Pre-auth) ── 4.4 (Audit)
  |-- Feature 5.1 (Notes signing)

Frontend Track:
  |-- Feature 1.3 (Recurrence UI) ──── 1.4 (E2E) ──┐
  |-- Feature 2.4 (Video UI) ────── 2.6 (E2E) ────┤
  |-- Feature 3.3 (Patient UI) ──┬── 3.4 (Pharmacist UI) ── 3.5 (E2E) ──┤
  |-- Feature 4.5 (Billing UI) ──┬────────────── 4.6 (E2E) ──────┤
  |-- Feature 5.2 (Notes UI) ──────── 5.3 (E2E) ──────────┤
  └─ Feature 6 (Role validation = system E2E)

QA Track:
  |-- Feature 1.4 (E2E) ──┐
  |-- Feature 2.6 (E2E) ──┤
  |-- Feature 3.5 (E2E) ──┤
  |-- Feature 4.6 (E2E) ──┼── Feature 6 (Role workflows) ──┬── 6.2 (Notifications)
  |-- Feature 5.3 (E2E) ──┤                                ├── 6.3 (Accessibility)
                          └────────────────────────────────┼── 6.4 (Performance)
                                                           └── 6.5 (Security)
```

### Resource Allocation

| Role | Days | Features | Capacity |
|------|------|----------|----------|
| Backend Lead | 14 | 1.1, 1.2, 2.1-2.3, 2.5, 3.1, 3.2, 4.1-4.3, 5.1 | 100% |
| Backend Lead #2 | 8 | 4.4, additional support | 57% |
| Frontend Lead | 13 | 1.3, 2.4, 3.3, 3.4, 4.5, 5.2 | 93% |
| Billing Lead | 11 | 4.1-4.4, 4.6 support | 79% |
| QA Lead | 15 | 1.4, 2.6, 3.5, 4.6, 5.3, 6.1-6.5 | 100% |
| **Total** | **61 person-days** | **All 6 features** | **Shared: 7 people** |

**Team Capacity**: 7 people × 2 weeks × 5 days = 70 person-days available  
**Phase 5 Requires**: 61 person-days  
**Slack**: 9 person-days (13% buffer for issues/testing)  

---

### Risk & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Telemedicine provider issues | Medium | High | Parallel Zoom + Twilio setup, fallback to calling |
| Insurance API integration delays | Medium | Medium | Pre-test with sandbox, fallback to manual claim submission |
| Concurrent refill requests race condition | Low | Medium | Locks on prescription record, extensive race testing |
| Role permission bugs in E2E | Medium | High | Early permission testing (week 1), automated permission matrix |
| Performance degradation under load | Low | High | Load testing week 2, optimize queries, scale database read replicas |
| Accessibility compliance | Medium | Medium | Weekly accessibility audits, WCAG checklist |
| Team capacity shortfall | Low | High | Cross-train frontend on backend, extend timeline if needed |

### Success Criteria

**Phase 5 is COMPLETE when:**
1. ✅ All 6 features implemented (1 through 6)
2. ✅ All tests passing: >95% success rate (>57 core tests + 30+ E2E scenarios)
3. ✅ Role validation complete: 7 roles tested across all features
4. ✅ Performance baseline met: <500ms p95, >99% success rate under load
5. ✅ Security audit passed: 0 critical vulnerabilities
6. ✅ Accessibility: WCAG 2.1 AA compliance
7. ✅ Production deployment ready: All infrastructure validated
8. ✅ Documentation complete: User guides, API docs, runbooks

---

## APPROVAL & NEXT STEPS

**CTO Approval Status**: ⏳ **Pending**  
**Phase 5 Kickoff**: April 15, 2026 (TODAY - Planning phase)  
**Phase 5 Development Start**: April 15, 2026 (5:00 PM - After plan approval)  
**Expected Production Ready**: April 29, 2026 ✅  

### Action Items for CTO Review

- [ ] Review resource allocation (61 person-days feasible?)
- [ ] Confirm telemedicine provider decision (Zoom vs. Twilio vs. both)
- [ ] Approve timeline (14-day sprint compresses to 10 working days)
- [ ] Confirm Phase 6 readiness (production deployment planned for May)
- [ ] Authorize any overtime if needed

### Next Steps (After Approval)

1. **Day 1 (Tue Apr 15)**: Engineering standup, assign task ownership
2. **Day 2-14**: Execute Features 1-5 per timeline
3. **Day 15-16**: Role validation (Feature 6)
4. **Day 17**: Production deployment staging
5. **Day 18-19**: Final production validation
6. **Day 20**: Production launch

---

**Document Status**: READY FOR CTO REVIEW  
**Prepared by**: GitHub Copilot  
**Date**: April 15, 2026  
**Distribution**: CTO, Project Lead, Tech Leaders, Phase Owners  
