# User Stories by Role — CareSync AI
## AroCord Hospital Information Management System

**Version**: 2.0  
**Last Updated**: 2025-07-17  
**Format**: Agile user stories with acceptance criteria  
**Statuses**: ✅ Done | 🔄 In Progress | ⏳ Planned | P0/P1/P2

---

## Role Overview

| Role | Primary Goal | Key Actions |
|------|-------------|-------------|
| **Admin** | Manage hospital operations and configuration | User management, analytics, settings |
| **Doctor** | Provide excellent patient care | Access records, write clinical notes, order labs |
| **Nurse** | Monitor and support patient care | Vitals, medication administration, care plans |
| **Receptionist** | Manage patient flow and scheduling | Register patients, appointments, billing |
| **Pharmacist** | Safe and accurate medication dispensing | Prescriptions, drug checks, inventory |
| **Lab Technician** | Process specimens and deliver results | Orders, sample tracking, result entry |
| **Patient** | Understand and manage own health | View records, appointments, results |

---

## Epic 1: Authentication & Access Control

### US-AUTH-01 ✅ Done (P0)
**As a** hospital staff member,  
**I want to** log in with my email and password and select my role,  
**So that** I access only the features and data relevant to my clinical role.

**Acceptance Criteria**:
- [ ] Login form validates email format and password minimum length
- [ ] Role selection screen shows only roles the user is assigned to
- [ ] Selecting "Remember my choice" persists role preference in localStorage
- [ ] Invalid credentials show accessible error alert with `aria-live="assertive"`
- [ ] Successful login redirects to role-specific dashboard

### US-AUTH-02 ✅ Done (P0)
**As a** system,  
**I want to** enforce row-level security on every Supabase query,  
**So that** a doctor at Hospital A can never read data from Hospital B.

**Acceptance Criteria**:
- [ ] Every table has RLS policy scoped to `hospital_id`
- [ ] Role-based policies prevent cross-role access (e.g., patient cannot see pharmacist notes)
- [ ] All unauthorized access attempts are logged to audit table
- [ ] RLS tests pass in Supabase migration validation

### US-AUTH-03 ⏳ Planned — Q1 (P1)
**As a** hospital staff member,  
**I want** automatic session timeout after 30 minutes of inactivity,  
**So that** unattended workstations do not expose PHI.

**Acceptance Criteria**:
- [ ] Session expires after 30 minutes of inactivity
- [ ] Warning modal shown at 25 minutes: "Your session will expire in 5 minutes"
- [ ] User can extend session by clicking "Stay logged in"
- [ ] Expired sessions redirect to login with toast: "Session expired for security"

---

## Epic 2: Patient Management

### US-PAT-01 ✅ Done (P0)
**As a** receptionist,  
**I want to** register a new patient with demographics and contact information,  
**So that** they have a verified identity before receiving care.

**Acceptance Criteria**:
- [ ] Registration form validates required fields: name, DOB, gender, phone
- [ ] Duplicate detection warns if patient with same name+DOB already exists
- [ ] PHI fields encrypted before storage via `useHIPAACompliance()`
- [ ] `encryption_metadata` persisted alongside patient record
- [ ] New patient appears in patient list with unique hospital-scoped ID

### US-PAT-02 ✅ Done (P0)
**As a** doctor,  
**I want to** view a patient's complete medical history in one place,  
**So that** I can make informed clinical decisions quickly.

**Acceptance Criteria**:
- [ ] Patient record shows: demographics, allergies, diagnoses, medications, labs, notes
- [ ] Timeline view orders events chronologically (most recent first)
- [ ] PHI is decrypted only for authorized roles (Doctor, Nurse, Admin)
- [ ] Loading state shown while decrypting; skeleton pattern used
- [ ] All PHI view events logged to HIPAA audit table with user + timestamp

### US-PAT-03 ⏳ Planned — Q1 (P1)
**As a** patient,  
**I want to** view my own medical records and upcoming appointments,  
**So that** I can be an active participant in my care.

**Acceptance Criteria**:
- [ ] Patient portal shows own demographics, diagnoses, medications, upcoming appointments
- [ ] Patient cannot view other patients' records (enforced by RLS)
- [ ] Sensitive diagnoses (HIV, mental health) only shown with explicit consent flag
- [ ] Patient can download their record as PDF
- [ ] All portal access logged to audit table

---

## Epic 3: Appointment Scheduling

### US-APPT-01 ✅ Done (P0)
**As a** receptionist,  
**I want to** schedule a patient appointment with a specific doctor,  
**So that** we avoid double-booking and ensure proper doctor availability.

**Acceptance Criteria**:
- [ ] Receptionist can select doctor + date + time slot
- [ ] System rejects booking if doctor already has appointment at that time (conflict detection)
- [ ] Appointment confirmation shown with appointment ID
- [ ] Doctor dashboard shows new appointment immediately (optimistic update)

### US-APPT-02 ⏳ Planned — Q2 (P1)
**As a** patient,  
**I want to** receive an SMS/email reminder 24 hours before my appointment,  
**So that** I do not forget and the no-show rate decreases.

**Acceptance Criteria**:
- [ ] Automated reminder sent 24h before appointment time
- [ ] Reminder includes: doctor name, date, time, location
- [ ] Patient can reply to SMS to confirm or cancel
- [ ] Cancellation removes appointment and notifies reception dashboard

### US-APPT-03 ⏳ Planned — Q2 (P1)
**As a** doctor,  
**I want to** view my daily appointment schedule in a calendar view,  
**So that** I can prepare for each consultation and manage my time.

**Acceptance Criteria**:
- [ ] Calendar shows booked slots, available slots, and blocked time
- [ ] Clicking appointment shows patient summary panel
- [ ] Doctor can note consultation start/end time
- [ ] Overdue appointments (> 30 min past scheduled) highlighted in amber

---

## Epic 4: Electronic Health Records (EHR)

### US-EHR-01 ⏳ Planned — Q2 (P0)
**As a** doctor,  
**I want to** create a structured clinical note (SOAP format) linked to a patient visit,  
**So that** care continuity is maintained across provider handoffs.

**Acceptance Criteria**:
- [ ] Note has Subjective, Objective, Assessment, Plan sections
- [ ] ICD-10 search allows typing code or description for Diagnosis field
- [ ] Note attached to specific appointment / encounter
- [ ] Auto-save every 30 seconds (no data loss on accidental navigation)
- [ ] Note accessible to Nurse and other treating doctors (same hospital)
- [ ] Note PHI encrypted; accessible only to authorized roles

### US-EHR-02 ⏳ Planned — Q2 (P0)
**As a** nurse,  
**I want to** record patient vitals (BP, HR, temp, SpO₂, weight),  
**So that** the care team has current physiological data for decision-making.

**Acceptance Criteria**:
- [ ] Vitals entry form validates normal ranges (flags abnormal values for review)
- [ ] Critical vitals (e.g., SpO₂ < 90%) trigger immediate in-app alert to treating doctor
- [ ] Vitals timeline chart shown on patient record (last 30 days)
- [ ] Vitals entry logged with nurse ID and timestamp

### US-EHR-03 ⏳ Planned — Q2 (P1)
**As a** doctor,  
**I want to** add, verify, and update patient allergy records,  
**So that** the pharmacy system can automatically alert on contraindicated drugs.

**Acceptance Criteria**:
- [ ] Allergy form accepts drug name, reaction type, severity level
- [ ] Allergies prominently displayed in patient header (always visible, red badge)
- [ ] Drug allergy data feeds into pharmacy prescription check
- [ ] Adding allergy logs to HIPAA audit trail

---

## Epic 5: Pharmacy Management

### US-PHARM-01 ⏳ Planned — Q2 (P0)
**As a** pharmacist,  
**I want to** receive and review prescriptions digitally from the doctor's EHR order,  
**So that** manual handoffs and illegible paper prescriptions are eliminated.

**Acceptance Criteria**:
- [ ] Prescription appears in pharmacist queue immediately after doctor submits
- [ ] Pharmacist sees: drug, dose, route, frequency, duration, prescribing doctor
- [ ] Pharmacist can query stock level before dispensing
- [ ] Verification step requires pharmacist to confirm before dispensing

### US-PHARM-02 ⏳ Planned — Q2 (P0)
**As a** pharmacist,  
**I want** automatic drug interaction and allergy alerts when reviewing a prescription,  
**So that** I can prevent adverse medication events.

**Acceptance Criteria**:
- [ ] System checks new drug against patient's existing medications for known interactions
- [ ] System checks new drug against patient's allergy record
- [ ] Alert dialog is non-dismissable without explicit "Acknowledge and Override with reason"
- [ ] All overridden alerts logged with pharmacist ID, timestamp, and override reason

### US-PHARM-03 ⏳ Planned — Q2 (P1)
**As a** pharmacist,  
**I want to** track drug inventory with low-stock alerts,  
**So that** critical medications are never out of stock.

**Acceptance Criteria**:
- [ ] Each drug has current stock quantity tracked per dispensing event
- [ ] Low-stock alert triggered when quantity falls below configurable threshold
- [ ] Weekly inventory report available for export (PDF/CSV)
- [ ] Controlled substances tracked in separate log with extra authentication step

---

## Epic 6: Laboratory Management

### US-LAB-01 ⏳ Planned — Q2 (P0)
**As a** doctor,  
**I want to** order lab tests electronically from the patient record,  
**So that** I can track test status without chasing down paper forms.

**Acceptance Criteria**:
- [ ] Lab order form lists test catalog (searchable by name/code)
- [ ] Order attached to patient + encounter + ordering doctor
- [ ] Lab technician receives order immediately in their queue
- [ ] Doctor receives real-time status changes (ordered → in progress → resulted)

### US-LAB-02 ⏳ Planned — Q2 (P0)
**As a** lab technician,  
**I want to** enter test results and flag critical values,  
**So that** doctors are immediately notified when action is needed.

**Acceptance Criteria**:
- [ ] Results form includes value + unit + reference range
- [ ] Values outside reference range automatically flagged as abnormal
- [ ] Critical values (e.g., K+ > 6.5 mEq/L) trigger immediate push notification to ordering doctor
- [ ] "Critical Acknowledged" confirmation required from doctor within 30 minutes
- [ ] All result entries logged with lab tech ID, instrument ID, timestamp

### US-LAB-03 ⏳ Planned — Q2 (P1)
**As a** patient,  
**I want to** view my lab results in the patient portal once released by the doctor,  
**So that** I can understand my health status without waiting for a follow-up visit.

**Acceptance Criteria**:
- [ ] Doctor must explicitly "Release to patient" for each result set
- [ ] Patient portal shows results with plain-language interpretation (where AI provides it)
- [ ] Critical values include a guidance note: "Contact your doctor immediately"
- [ ] Results cannot be released before doctor review (enforced workflow)

---

## Epic 7: Admin & Analytics

### US-ADMIN-01 ✅ Done (P0)
**As a** hospital administrator,  
**I want to** view a real-time dashboard with hospital-wide KPIs,  
**So that** I can identify operational issues before they impact patient care.

**Acceptance Criteria**:
- [ ] Dashboard shows: total patients, today's appointments, pending lab results, pharmacy queue depth
- [ ] Stats update in real-time (Supabase Realtime subscriptions)
- [ ] Charts show 7-day and 30-day trends
- [ ] Export button generates PDF summary for board reports

### US-ADMIN-02 ⏳ Planned — Q1 (P0)
**As a** hospital administrator,  
**I want to** manage staff user accounts (create, assign roles, deactivate),  
**So that** only current staff have system access.

**Acceptance Criteria**:
- [ ] Admin can invite staff by email; invitation emails use hospital branding
- [ ] Admin assigns one or more roles per staff member
- [ ] Deactivated users lose access immediately (session invalidated)
- [ ] User management log tracks all admin actions (create/modify/deactivate)

### US-ADMIN-03 ⏳ Planned — Q3 (P1)
**As a** hospital administrator,  
**I want to** run and schedule compliance and operational reports,  
**So that** regulatory submissions and board meetings are not manual scrambles.

**Acceptance Criteria**:
- [ ] Report types: daily census, weekly revenue, HIPAA audit log, lab TAT, pharmacy usage
- [ ] Scheduling: run now / schedule weekly/monthly with email delivery
- [ ] Export formats: PDF and CSV
- [ ] Reports scoped strictly to own hospital_id (no cross-tenant data)
