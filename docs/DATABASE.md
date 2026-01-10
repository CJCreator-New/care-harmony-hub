# Database Schema Documentation

## Overview

CareSync uses PostgreSQL via Lovable Cloud (Supabase) with Row Level Security (RLS) enabled on all 46+ tables. All tables are hospital-scoped for multi-tenancy.

---

## Entity Relationship Diagram

```
                                 ┌──────────────┐
                                 │   hospitals  │
                                 └──────┬───────┘
                                        │
           ┌────────────────┬───────────┼───────────┬────────────────┐
           │                │           │           │                │
           ▼                ▼           ▼           ▼                ▼
    ┌──────────┐     ┌──────────┐ ┌──────────┐ ┌──────────┐  ┌──────────────┐
    │ profiles │     │ patients │ │departments│ │medications│  │hospital_     │
    └────┬─────┘     └────┬─────┘ └──────────┘ └──────────┘  │resources     │
         │                │                                   └──────────────┘
         │                │
    ┌────┴────────────────┴────┐
    │                          │
    ▼                          ▼
┌──────────────┐        ┌──────────────┐
│ appointments │◄───────│ consultations│
└──────┬───────┘        └──────┬───────┘
       │                       │
       │              ┌────────┴────────┬────────────────┐
       │              │                 │                │
       ▼              ▼                 ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ patient_queue│ │ prescriptions│ │  lab_orders  │ │triage_assess │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

                    Reference Tables
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  icd10_codes │ │   cpt_codes  │ │  loinc_codes │
    └──────────────┘ └──────────────┘ └──────────────┘

                    Integration Tables
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │task_assignments│ │  care_gaps  │ │activity_logs │
    └──────────────┘ └──────────────┘ └──────────────┘
```

---

## Core Tables

### hospitals

Primary organization entity.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Hospital name |
| address | TEXT | Street address |
| city | TEXT | City |
| state | TEXT | State/Province |
| zip | TEXT | Postal code |
| phone | TEXT | Contact number |
| email | TEXT | Contact email |
| license_number | TEXT | Medical license |
| logo_url | TEXT | Logo image URL |
| settings | JSONB | Hospital settings |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### profiles

User profiles linked to auth.users.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| hospital_id | UUID | FK to hospitals |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| email | TEXT | Email address |
| phone | TEXT | Phone number |
| department_id | UUID | FK to departments |
| specialization | TEXT | Medical specialty |
| license_number | TEXT | Professional license |
| is_staff | BOOLEAN | Staff flag |
| avatar_url | TEXT | Profile image |
| failed_login_attempts | INTEGER | Security tracking |
| two_factor_enabled | BOOLEAN | 2FA status |
| two_factor_secret | TEXT | Encrypted 2FA secret |
| backup_codes | TEXT[] | Recovery codes |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### user_roles

Role assignments for users (supports multiple roles).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| role | TEXT | Role name |
| created_at | TIMESTAMPTZ | Assignment date |

### patients

Patient records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| user_id | UUID | FK to auth.users (portal) |
| mrn | TEXT | Medical Record Number |
| first_name | TEXT | First name |
| last_name | TEXT | Last name |
| date_of_birth | DATE | Birth date |
| gender | ENUM | male/female/other/prefer_not_to_say |
| phone | TEXT | Phone number |
| email | TEXT | Email address |
| address | TEXT | Street address |
| city | TEXT | City |
| state | TEXT | State |
| zip | TEXT | Postal code |
| blood_type | TEXT | Blood group |
| allergies | TEXT[] | Known allergies |
| chronic_conditions | TEXT[] | Chronic diseases |
| current_medications | JSONB | Active medications |
| insurance_provider | TEXT | Insurance company |
| insurance_policy_number | TEXT | Policy number |
| insurance_group_number | TEXT | Group number |
| emergency_contact_name | TEXT | Emergency contact |
| emergency_contact_phone | TEXT | Emergency phone |
| emergency_contact_relationship | TEXT | Relationship |
| is_active | BOOLEAN | Active status |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Registration date |
| updated_at | TIMESTAMPTZ | Last update |

---

## Clinical Tables

### appointments

Appointment scheduling.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| doctor_id | UUID | FK to profiles |
| scheduled_date | DATE | Appointment date |
| scheduled_time | TIME | Appointment time |
| duration_minutes | INTEGER | Duration |
| appointment_type | TEXT | Type (follow-up, new, etc.) |
| priority | ENUM | low/normal/high/urgent/emergency |
| status | ENUM | scheduled/checked_in/in_progress/completed/cancelled/no_show |
| reason_for_visit | TEXT | Visit reason |
| notes | TEXT | Notes |
| queue_number | INTEGER | Queue position |
| check_in_time | TIMESTAMPTZ | Check-in timestamp |
| room_number | TEXT | Assigned room |
| waitlist_position | INTEGER | Waitlist position |
| reminder_sent | BOOLEAN | Reminder status |
| reminder_sent_at | TIMESTAMPTZ | Reminder timestamp |
| follow_up_required | BOOLEAN | Follow-up flag |
| cancellation_reason | TEXT | If cancelled |
| created_by | UUID | FK to profiles |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### consultations

Clinical encounters with SOAP format.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| doctor_id | UUID | FK to profiles |
| nurse_id | UUID | FK to profiles |
| appointment_id | UUID | FK to appointments |
| status | ENUM | pending/in_progress/completed/cancelled |
| current_step | INTEGER | Workflow step (1-5) |
| chief_complaint | TEXT | Presenting complaint |
| history_of_present_illness | TEXT | HPI details |
| symptoms | TEXT[] | Symptom list |
| vitals | JSONB | Vital signs |
| physical_examination | JSONB | Exam findings |
| diagnoses | JSONB | Structured diagnoses with ICD-10 |
| provisional_diagnosis | TEXT[] | Working diagnosis |
| final_diagnosis | TEXT[] | Final diagnosis |
| treatment_plan | TEXT | Treatment notes |
| prescriptions | JSONB | Prescription data |
| lab_orders | JSONB | Lab order data |
| referrals | JSONB | Referral data |
| clinical_notes | TEXT | Additional notes |
| handoff_notes | TEXT | Handoff documentation |
| follow_up_date | DATE | Follow-up date |
| follow_up_notes | TEXT | Follow-up instructions |
| auto_save_data | JSONB | Draft data |
| last_auto_save | TIMESTAMPTZ | Last save time |
| lab_notified | BOOLEAN | Lab notification sent |
| pharmacy_notified | BOOLEAN | Pharmacy notification sent |
| billing_notified | BOOLEAN | Billing notification sent |
| started_at | TIMESTAMPTZ | Start time |
| completed_at | TIMESTAMPTZ | Completion time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### triage_assessments

Nurse triage with ESI scoring.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| appointment_id | UUID | FK to appointments |
| queue_entry_id | UUID | FK to patient_queue |
| nurse_id | UUID | FK to profiles |
| esi_level | INTEGER | ESI level 1-5 |
| chief_complaint | TEXT | Presenting complaint |
| vital_signs | JSONB | Vitals at triage |
| symptoms | JSONB | Symptom assessment |
| pain_level | INTEGER | Pain scale 0-10 |
| immediate_attention_required | BOOLEAN | Emergency flag |
| high_risk_flags | TEXT[] | Risk indicators |
| notes | TEXT | Triage notes |
| created_at | TIMESTAMPTZ | Assessment time |
| updated_at | TIMESTAMPTZ | Last update |

### prescriptions

Medication prescriptions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| consultation_id | UUID | FK to consultations |
| patient_id | UUID | FK to patients |
| prescribed_by | UUID | FK to profiles |
| status | TEXT | pending/verified/dispensed/cancelled |
| priority | TEXT | normal/urgent/stat |
| notes | TEXT | Instructions |
| drug_interactions | JSONB | Detected interactions |
| allergy_alerts | JSONB | Allergy warnings |
| verification_required | BOOLEAN | Pharmacist review needed |
| verified_by | UUID | FK to profiles |
| verified_at | TIMESTAMPTZ | Verification time |
| dispensed_by | UUID | FK to profiles |
| dispensed_at | TIMESTAMPTZ | Dispensing time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### prescription_items

Individual prescription items.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| prescription_id | UUID | FK to prescriptions |
| medication_id | UUID | FK to medications |
| medication_name | TEXT | Drug name |
| dosage | TEXT | Dosage (e.g., "500mg") |
| frequency | TEXT | Frequency (e.g., "BID") |
| duration | TEXT | Duration (e.g., "7 days") |
| quantity | INTEGER | Quantity to dispense |
| instructions | TEXT | Special instructions |
| is_dispensed | BOOLEAN | Dispensed status |
| created_at | TIMESTAMPTZ | Creation timestamp |

### lab_orders

Laboratory test orders with LOINC integration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| consultation_id | UUID | FK to consultations |
| ordered_by | UUID | FK to profiles |
| test_name | TEXT | Test name |
| test_code | TEXT | Test code (LOINC) |
| test_category | TEXT | Category |
| priority | ENUM | low/normal/high/urgent/emergency |
| status | TEXT | ordered/collected/processing/completed |
| specimen_type | TEXT | Sample type |
| sample_type | TEXT | Collection container |
| results | JSONB | Test results |
| result_notes | TEXT | Result notes |
| normal_range | TEXT | Reference range |
| is_critical | BOOLEAN | Critical flag |
| critical_notified | BOOLEAN | Notification sent |
| critical_notified_at | TIMESTAMPTZ | Notification time |
| collected_by | UUID | FK to profiles |
| collected_at | TIMESTAMPTZ | Collection time |
| processed_by | UUID | FK to profiles |
| completed_at | TIMESTAMPTZ | Completion time |
| ordered_at | TIMESTAMPTZ | Order time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

---

## Reference Tables

### icd10_codes

ICD-10 diagnosis codes.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| code | TEXT | ICD-10 code |
| short_description | TEXT | Short description |
| long_description | TEXT | Full description |
| category | TEXT | Code category |
| chapter | TEXT | ICD-10 chapter |
| is_billable | BOOLEAN | Billable flag |
| created_at | TIMESTAMPTZ | Creation timestamp |

### cpt_codes

CPT billing codes.

| Column | Type | Description |
|--------|------|-------------|
| code | TEXT | CPT code (PK) |
| description | TEXT | Code description |
| category | TEXT | Service category |
| base_fee | DECIMAL | Base fee amount |
| hospital_id | UUID | FK to hospitals (for custom fees) |
| created_at | TIMESTAMPTZ | Creation timestamp |

### loinc_codes

LOINC laboratory codes.

| Column | Type | Description |
|--------|------|-------------|
| code | TEXT | LOINC code (PK) |
| component | TEXT | Test component |
| property | TEXT | Property measured |
| time_aspect | TEXT | Timing |
| system_type | TEXT | Body system |
| scale_type | TEXT | Measurement scale |
| unit | TEXT | Unit of measure |
| reference_range | JSONB | Normal ranges |
| hospital_id | UUID | FK to hospitals |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## Integration Tables

### task_assignments

Cross-role task management.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| title | TEXT | Task title |
| description | TEXT | Task details |
| assigned_by | UUID | FK to profiles |
| assigned_to | UUID | FK to profiles |
| patient_id | UUID | FK to patients (optional) |
| priority | TEXT | low/normal/high/urgent |
| status | TEXT | pending/in_progress/completed/cancelled |
| due_date | TIMESTAMPTZ | Due date |
| completed_at | TIMESTAMPTZ | Completion time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### care_gaps

Population health tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| measure_type | TEXT | Care measure type |
| measure_name | TEXT | Measure name |
| due_date | DATE | Due date |
| completed_date | DATE | Completion date |
| status | TEXT | open/closed/overdue |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### activity_logs

Comprehensive audit trail.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| user_id | UUID | FK to profiles.user_id |
| action_type | TEXT | Action performed |
| entity_type | TEXT | Entity affected |
| entity_id | UUID | Entity ID |
| old_values | JSONB | Previous values |
| new_values | JSONB | New values |
| details | JSONB | Additional details |
| severity | TEXT | info/warning/error/critical |
| ip_address | TEXT | Client IP |
| user_agent | TEXT | Browser info |
| created_at | TIMESTAMPTZ | Timestamp |

---

## Billing Tables

### invoices

Patient invoices with CPT integration.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| consultation_id | UUID | FK to consultations |
| appointment_id | UUID | FK to appointments |
| invoice_number | TEXT | Invoice number |
| status | TEXT | draft/pending/paid/partial/cancelled |
| subtotal | DECIMAL | Subtotal amount |
| tax | DECIMAL | Tax amount |
| discount | DECIMAL | Discount amount |
| total | DECIMAL | Total amount |
| paid_amount | DECIMAL | Amount paid |
| due_date | DATE | Payment due date |
| notes | TEXT | Invoice notes |
| created_by | UUID | FK to profiles |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### insurance_claims

Insurance claim tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| invoice_id | UUID | FK to invoices |
| claim_number | TEXT | Claim number |
| insurance_provider | TEXT | Provider name |
| policy_number | TEXT | Policy number |
| group_number | TEXT | Group number |
| claim_amount | DECIMAL | Claimed amount |
| approved_amount | DECIMAL | Approved amount |
| paid_amount | DECIMAL | Paid amount |
| patient_responsibility | DECIMAL | Patient owes |
| status | TEXT | pending/submitted/approved/denied/paid |
| diagnosis_codes | TEXT[] | ICD-10 codes |
| procedure_codes | TEXT[] | CPT codes |
| denial_reason | TEXT | If denied |
| submitted_at | TIMESTAMPTZ | Submission date |
| reviewed_at | TIMESTAMPTZ | Review date |
| paid_at | TIMESTAMPTZ | Payment date |
| notes | TEXT | Claim notes |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

---

## Enums

```sql
-- Gender types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

-- Priority levels
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent', 'emergency');

-- Appointment status
CREATE TYPE appointment_status AS ENUM (
  'scheduled', 'confirmed', 'checked_in', 'in_progress', 
  'completed', 'cancelled', 'no_show'
);

-- Consultation status
CREATE TYPE consultation_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled'
);
```

---

## Row Level Security (RLS)

All tables have hospital-scoped RLS policies:

```sql
-- Standard hospital isolation pattern
CREATE POLICY "hospital_isolation" ON table_name
  FOR ALL
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Patient self-access pattern
CREATE POLICY "patient_own_records" ON patients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

---

## Table Count Summary

| Category | Tables | Description |
|----------|--------|-------------|
| Core | 4 | hospitals, profiles, user_roles, patients |
| Clinical | 8 | appointments, consultations, prescriptions, prescription_items, lab_orders, vital_signs, medical_records, documents |
| Nursing | 4 | patient_queue, patient_prep_checklists, medication_administrations, triage_assessments |
| Billing | 5 | invoices, invoice_items, payments, payment_plans, insurance_claims |
| Inventory | 2 | medications, suppliers |
| Reference | 3 | icd10_codes, cpt_codes, loinc_codes |
| Integration | 3 | task_assignments, care_gaps, notifications |
| Security | 2 | activity_logs, messages |
| Admin | 3 | departments, hospital_resources, doctor_availability |
| Portal | 2 | appointment_requests, prescription_refill_requests |
| **Total** | **46+** | |

---

## Indexes

Key indexes for performance:

```sql
-- Patient lookups
CREATE INDEX idx_patients_mrn ON patients(mrn);
CREATE INDEX idx_patients_hospital ON patients(hospital_id);

-- Appointment queries
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- Activity log queries
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_action ON activity_logs(action_type);

-- Lab order queries
CREATE INDEX idx_lab_orders_status ON lab_orders(status);
CREATE INDEX idx_lab_orders_critical ON lab_orders(is_critical);
```
