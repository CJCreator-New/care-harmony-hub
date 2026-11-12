# Database Documentation

## Database Schema

### `patients` table

Source: `supabase/migrations/20260204000011_misc.sql`.

- `id` (primary key, UUID)
- `hospital_id` (foreign key to `hospitals`, required)
- `user_id` (foreign key to `auth.users`, optional; set when the patient has a portal login)
- `mrn` (medical record number; unique per hospital)
- `first_name`, `last_name`, `date_of_birth`, `gender`
- `email`, `phone`, `address`, `city`, `state`, `zip`
- `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`
- `insurance_provider`, `insurance_policy_number`, `insurance_group_number`
- `allergies`, `chronic_conditions` (text arrays), `current_medications` (JSONB), `blood_type`, `notes`
- `is_active`, `created_at`, `updated_at`

Constraint: `UNIQUE (hospital_id, mrn)`.

### Prescriptions Table

- prescription_id (primary key)
- patient_id (foreign key)
- doctor_id (foreign key)
- medication_id (foreign key)
- dosage
- frequency
- duration
- created_at
- status

### Lab Orders Table

- order_id (primary key)
- patient_id (foreign key)
- test_type
- ordered_by (foreign key)
- specimen_type
- status
- collected_at

### Pharmacy Inventory Table

- inventory_id (primary key)
- medication_id (foreign key)
- quantity_available
- expiration_date
- location

### Staff Table

- staff_id (primary key)
- first_name
- last_name
- email
- role (doctor, nurse, pharmacist, lab_technician, admin)
- license_number
- department
- hospital_id (foreign key)
- is_active

### `appointments` table

Source: `supabase/migrations/20260204000011_misc.sql`.

- `id` (primary key, UUID)
- `hospital_id` (foreign key to `hospitals`, required)
- `patient_id` (foreign key to `patients`, required, cascades on delete)
- `doctor_id` (foreign key to `profiles`)
- `scheduled_date`, `scheduled_time`, `duration_minutes` (default 30)
- `appointment_type`, `reason_for_visit`, `notes`
- `status`: `scheduled`, `checked_in`, `in_progress`, `completed`, `cancelled`, `no_show`
- `priority`: `low`, `normal`, `high`, `urgent`, `emergency`
- `check_in_time`, `start_time`, `end_time`, `queue_number`
- `created_by` (foreign key to `profiles`), `created_at`, `updated_at`

### `consultations` table

Source: `supabase/migrations/20260204000011_misc.sql`. A consultation is the five-step clinical workflow for one visit.

- `id` (primary key, UUID)
- `hospital_id` (foreign key to `hospitals`, required)
- `appointment_id` (foreign key to `appointments`, optional)
- `patient_id` (foreign key to `patients`, required, cascades on delete)
- `doctor_id` (foreign key to `profiles`, required)
- `nurse_id` (foreign key to `profiles`, optional)
- `status`: `pending`, `patient_overview`, `clinical_assessment`, `treatment_planning`, `final_review`, `handoff`, `completed`
- `current_step` (integer, default 1)
- Step 1, patient overview: `vitals` (JSONB), `chief_complaint`, `history_of_present_illness`
- Step 2, clinical assessment: `physical_examination` (JSONB), `symptoms`, `provisional_diagnosis`
- Step 3, treatment planning: `final_diagnosis`, `treatment_plan`, `prescriptions` (JSONB), `lab_orders` (JSONB), `referrals` (JSONB)
- Step 4, final review: `clinical_notes`, `follow_up_date`, `follow_up_notes`
- Step 5, handoff: `handoff_notes`, `pharmacy_notified`, `lab_notified`, `billing_notified`
- Metadata: `started_at`, `completed_at`, `auto_save_data` (JSONB), `last_auto_save`, `created_at`, `updated_at`

## Data Relationships

Foreign key relationships:

- `patients` -> `hospitals`
- `appointments` -> `patients`
- `appointments` -> Doctor (`profiles`)
- `consultations` -> `appointments` (optional)
- `consultations` -> `patients`
- `consultations` -> Doctor and Nurse (`profiles`)
- Prescriptions -> Patient
- Prescriptions -> Doctor (via staff)
- Prescriptions -> Medication
- Lab Orders -> Patient
- Lab Orders -> Doctor (via staff)
- Lab Orders -> Nurse (via staff)
- Pharmacy Inventory -> Medication
- Staff -> Hospital

## Indexing Strategy

Indexes created on:

- patient_id (frequently searched)
- doctor_id (workflow filtering)
- hospital_id (data scoping)
- status columns (filtering)
- created_at (sorting)
