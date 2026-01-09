# Database Schema Documentation

## Overview

CareSync uses PostgreSQL via Supabase with Row Level Security (RLS) enabled on all tables.

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
       │              ┌────────┴────────┐
       │              │                 │
       ▼              ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ patient_queue│ │ prescriptions│ │  lab_orders  │
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
| role | TEXT | User role |
| department_id | UUID | FK to departments |
| specialization | TEXT | Medical specialty |
| license_number | TEXT | Professional license |
| is_active | BOOLEAN | Active status |
| avatar_url | TEXT | Profile image |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

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
| gender | ENUM | male/female/other |
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
| priority | ENUM | low/normal/urgent/emergency |
| status | ENUM | scheduled/checked_in/in_progress/completed/cancelled |
| reason_for_visit | TEXT | Visit reason |
| notes | TEXT | Notes |
| queue_number | INTEGER | Queue position |
| check_in_time | TIMESTAMPTZ | Check-in timestamp |
| room_number | TEXT | Assigned room |
| created_by | UUID | FK to profiles |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### consultations

Clinical encounters.

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
| provisional_diagnosis | TEXT[] | Working diagnosis |
| final_diagnosis | TEXT[] | Final diagnosis |
| treatment_plan | TEXT | Treatment notes |
| prescriptions | JSONB | Prescription data |
| lab_orders | JSONB | Lab order data |
| referrals | JSONB | Referral data |
| clinical_notes | TEXT | Additional notes |
| follow_up_date | DATE | Follow-up date |
| follow_up_notes | TEXT | Follow-up instructions |
| auto_save_data | JSONB | Draft data |
| last_auto_save | TIMESTAMPTZ | Last save time |
| started_at | TIMESTAMPTZ | Start time |
| completed_at | TIMESTAMPTZ | Completion time |
| created_at | TIMESTAMPTZ | Creation timestamp |
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
| prescription_number | TEXT | Unique Rx number |
| status | TEXT | pending/dispensed/cancelled |
| notes | TEXT | Instructions |
| valid_until | DATE | Expiry date |
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

Laboratory test orders.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| patient_id | UUID | FK to patients |
| consultation_id | UUID | FK to consultations |
| ordered_by | UUID | FK to profiles |
| test_name | TEXT | Test name |
| test_code | TEXT | Test code |
| test_category | TEXT | Category |
| priority | ENUM | low/normal/urgent/emergency |
| status | TEXT | ordered/collected/processing/completed |
| specimen_type | TEXT | Sample type |
| sample_type | TEXT | Collection container |
| results | JSONB | Test results |
| result_notes | TEXT | Result notes |
| normal_range | TEXT | Reference range |
| is_critical | BOOLEAN | Critical flag |
| critical_notified | BOOLEAN | Notification sent |
| collected_by | UUID | FK to profiles |
| collected_at | TIMESTAMPTZ | Collection time |
| processed_by | UUID | FK to profiles |
| completed_at | TIMESTAMPTZ | Completion time |
| ordered_at | TIMESTAMPTZ | Order time |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

---

## Billing Tables

### invoices

Patient invoices.

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

### invoice_items

Line items on invoices.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| invoice_id | UUID | FK to invoices |
| description | TEXT | Item description |
| item_type | TEXT | consultation/medication/lab/procedure |
| quantity | INTEGER | Quantity |
| unit_price | DECIMAL | Unit price |
| total | DECIMAL | Line total |
| created_at | TIMESTAMPTZ | Creation timestamp |

### payments

Payment transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| invoice_id | UUID | FK to invoices |
| amount | DECIMAL | Payment amount |
| payment_method | TEXT | cash/card/upi/insurance |
| reference_number | TEXT | Transaction reference |
| payment_date | TIMESTAMPTZ | Payment date |
| received_by | UUID | FK to profiles |
| notes | TEXT | Payment notes |
| created_at | TIMESTAMPTZ | Creation timestamp |

---

## Inventory Tables

### medications

Medication inventory.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| name | TEXT | Brand name |
| generic_name | TEXT | Generic name |
| category | TEXT | Drug category |
| form | TEXT | tablet/capsule/syrup/injection |
| strength | TEXT | Strength (e.g., "500mg") |
| unit | TEXT | Unit of measure |
| manufacturer | TEXT | Manufacturer |
| batch_number | TEXT | Batch number |
| expiry_date | DATE | Expiry date |
| current_stock | INTEGER | Current quantity |
| minimum_stock | INTEGER | Reorder level |
| unit_price | DECIMAL | Unit price |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

---

## Supporting Tables

### departments

Hospital departments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| name | TEXT | Department name |
| code | TEXT | Department code |
| description | TEXT | Description |
| head_of_department | UUID | FK to profiles |
| is_active | BOOLEAN | Active status |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |

### notifications

System notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | FK to hospitals |
| recipient_id | UUID | FK to profiles.user_id |
| sender_id | UUID | FK to profiles.user_id |
| type | TEXT | Notification type |
| category | TEXT | Category |
| title | TEXT | Title |
| message | TEXT | Message content |
| priority | TEXT | low/normal/high/urgent |
| is_read | BOOLEAN | Read status |
| read_at | TIMESTAMPTZ | Read timestamp |
| action_url | TEXT | Action link |
| metadata | JSONB | Additional data |
| expires_at | TIMESTAMPTZ | Expiry time |
| created_at | TIMESTAMPTZ | Creation timestamp |

### activity_logs

Audit trail.

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
| severity | TEXT | info/warning/critical |
| ip_address | TEXT | Client IP |
| user_agent | TEXT | Browser info |
| created_at | TIMESTAMPTZ | Timestamp |

---

## Monitoring Tables

### error_logs

Application error tracking and logging.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| message | TEXT | Error message |
| stack | TEXT | Error stack trace |
| url | TEXT | Page URL where error occurred |
| user_agent | TEXT | Browser user agent |
| user_id | UUID | FK to auth.users (optional) |
| timestamp | TIMESTAMPTZ | Error timestamp |
| severity | TEXT | low/medium/high/critical |
| context | JSONB | Additional error context |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### performance_logs

System performance monitoring.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | TEXT | slow_page_load/high_memory_usage/failed_requests/layout_shift |
| value | DECIMAL | Measured value |
| threshold | DECIMAL | Threshold value |
| page | TEXT | Page or component name |
| user_agent | TEXT | Browser user agent |
| timestamp | TIMESTAMPTZ | Measurement timestamp |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### system_metrics

System health and performance metrics.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| timestamp | TIMESTAMPTZ | Metric timestamp |
| service | TEXT | Service/component name |
| metric_name | TEXT | Metric identifier |
| value | DECIMAL | Metric value |
| status | TEXT | normal/warning/critical |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### system_alerts

Automated system alerts and notifications.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| rule_id | UUID | FK to alert_rules |
| severity | TEXT | low/medium/high/critical |
| message | TEXT | Alert message |
| timestamp | TIMESTAMPTZ | Alert timestamp |
| resolved_at | TIMESTAMPTZ | Resolution timestamp (optional) |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### alert_rules

Configurable alert rules for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Rule name |
| condition | TEXT | Metric condition to monitor |
| threshold | DECIMAL | Threshold value |
| severity | TEXT | low/medium/high/critical |
| enabled | BOOLEAN | Rule enabled status |
| created_at | TIMESTAMPTZ | Record creation timestamp |

---

## Enums

```sql
-- Gender types
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Priority levels
CREATE TYPE priority_level AS ENUM ('low', 'normal', 'urgent', 'emergency');

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

## Indexes

Key indexes for performance:

```sql
-- Patient lookups
CREATE INDEX idx_patients_mrn ON patients(mrn);
CREATE INDEX idx_patients_hospital ON patients(hospital_id);
CREATE INDEX idx_patients_user ON patients(user_id);

-- Appointment queries
CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- Consultation workflow
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_doctor ON consultations(doctor_id);

-- Notification delivery
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE is_read = false;

-- Error tracking
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity_timestamp ON error_logs(severity, timestamp DESC);
CREATE INDEX idx_error_logs_user_id ON error_logs(user_id);

-- Performance monitoring
CREATE INDEX idx_performance_logs_type_timestamp ON performance_logs(type, timestamp DESC);
CREATE INDEX idx_performance_logs_timestamp ON performance_logs(timestamp DESC);

-- System monitoring
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX idx_system_metrics_metric_name ON system_metrics(metric_name, timestamp DESC);
CREATE INDEX idx_system_alerts_timestamp ON system_alerts(timestamp DESC);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity, timestamp DESC);
```
