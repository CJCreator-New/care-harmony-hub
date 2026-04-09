# CareSync HIMS - Data Model & Database Schema

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Schema Generated From**: `supabase/migrations/` (50+ migrations)

---

## Database Overview

### Technology Stack
- **Database Engine**: PostgreSQL 15.1+
- **Hosting**: Supabase (managed PostgreSQL)
- **Authentication**: Supabase Auth (JWT)
- **Row-Level Security**: PostgreSQL RLS (50+ policies)
- **Encryption**: Field-level for PHI + transparent encryption at rest
- **Type Generation**: Supabase auto-generates TypeScript types

### Multi-Tenancy Model

```
┌─────────────────────────────────────────────────────┐
│ HOSPITALS (Tenants)                                │
├─────────────────────────────────────────────────────┤
│ id | name | address | phone | settings | created_at│
└─────────────────────────────────────────────────────┘
         ↓ owns ↓
┌─────────────────────────────────────────────────────┐
│ USERS (Hospital Staff)                              │
├─────────────────────────────────────────────────────┤
│ id | hospital_id | email | role | first_name | ... │
└─────────────────────────────────────────────────────┘
         ↓ assigned to ↓
┌─────────────────────────────────────────────────────┐
│ PATIENTS (Hospital Registrants)                     │
├─────────────────────────────────────────────────────┤
│ id | hospital_id | first_name | last_name | dob ... │
└─────────────────────────────────────────────────────┘
```

**Rule**: Every table has `hospital_id` FK to `hospitals(id)` for multi-tenancy isolation.

---

## Core Entities

### 1. Hospitals

```sql
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  country VARCHAR(2),
  state_province VARCHAR(128),
  city VARCHAR(128),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  
  -- Settings
  settings JSONB DEFAULT '{}',  -- {timezone, language, currency, ...}
  branding JSONB DEFAULT '{}',  -- {logo_url, primary_color, ...}
  
  -- Billing Configuration
  default_currency VARCHAR(3) DEFAULT 'USD',
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT hospital_name_not_empty CHECK (length(name) > 0)
);
```

### 2. Users (Hospital Staff)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Profile
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  phone VARCHAR(20),
  photo_url TEXT,
  
  -- Role & Permissions
  role VARCHAR(64) NOT NULL CHECK (role IN ('admin', 'doctor', 'nurse', 'pharmacist', 'lab_technician', 'receptionist')),
  specialization VARCHAR(256),  -- For doctors: "Cardiology", "Pediatrics", etc.
  
  -- Credentials
  license_number VARCHAR(64),
  license_expiry DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Security
  last_login_at TIMESTAMP,
  password_changed_at TIMESTAMP,
  
  -- 2FA & Biometric
  mfa_enabled BOOLEAN DEFAULT false,
  biometric_registered BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,  -- Soft delete
  
  CONSTRAINT valid_license CHECK (license_expiry > CURRENT_DATE OR license_expiry IS NULL),
  CONSTRAINT doctor_has_license CHECK ((role = 'doctor' AND license_number IS NOT NULL) OR role != 'doctor')
);

CREATE UNIQUE INDEX idx_users_email_hospital ON users(email, hospital_id);
CREATE INDEX idx_users_role_active ON users(role, is_active, hospital_id);
```

### 3. Patients

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Demographics (encrypted PHI)
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender CHAR(1) CHECK (gender IN ('M', 'F', 'O')),
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Address (encrypted)
  address TEXT,
  city VARCHAR(128),
  state_province VARCHAR(128),
  postal_code VARCHAR(20),
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(256),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(128),
  
  -- Medical History
  blood_group VARCHAR(5),  -- O, A, B, AB + Rh
  drug_allergies JSONB DEFAULT '[]',  -- [{drug: "Penicillin", reaction: "anaphylaxis", onset_date: ...}]
  medical_conditions JSONB DEFAULT '[]',  -- [{condition: "Diabetes Type 2", diagnosed_date: ...}]
  current_medications JSONB DEFAULT '[]',  -- Maintained via medication_profile
  
  -- Insurance
  primary_insurance_plan VARCHAR(255),
  primary_member_id VARCHAR(128),
  secondary_insurance_plan VARCHAR(255),
  secondary_member_id VARCHAR(128),
  
  -- Billing
  credit_balance NUMERIC(12, 2) DEFAULT 0,  -- Prepaid or overpayment
  
  -- Status
  status VARCHAR(32) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Deceased', 'Transferred')),
  
  -- Encryption
  encryption_metadata JSONB DEFAULT '{}',  -- {key_version: 1, algorithm: 'AES-256-GCM'}
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP,  -- Soft delete for HIPAA retention
  
  CONSTRAINT valid_age CHECK (date_of_birth < CURRENT_DATE - INTERVAL '0 years'),
  CONSTRAINT non_empty_name CHECK (length(trim(first_name)) > 0 AND length(trim(last_name)) > 0)
);

CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_status ON patients(status, hospital_id);
```

---

## Clinical Entities

### 4. Appointments

```sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Appointment Details
  patient_id UUID NOT NULL REFERENCES patients(id),
  provider_id UUID NOT NULL REFERENCES users(id),  -- Doctor/provider
  
  appointment_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes > 0),
  
  -- Reason for Visit
  chief_complaint VARCHAR(512),
  visit_type VARCHAR(32) CHECK (visit_type IN ('Consultation', 'Follow-up', 'Procedure', 'Telehealth')),
  
  -- Status Workflow
  status VARCHAR(32) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Checked In', 'In Progress', 'Completed', 'Cancelled', 'No Show')),
  
  -- Checkup
  checked_in_at TIMESTAMP,
  checked_in_by UUID REFERENCES users(id),  -- Receptionist
  
  completion
  completed_at TIMESTAMP,
  
  -- Cancellation (if applicable)
  cancelled_at TIMESTAMP,
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason VARCHAR(512),
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT checked_in_requires_completed CHECK (
    (checked_in_at IS NOT NULL) OR (status != 'Checked In')
  )
);

CREATE INDEX idx_appointments_provider_date ON appointments(provider_id, appointment_time);
CREATE INDEX idx_appointments_patient_date ON appointments(patient_id, appointment_time DESC);
CREATE INDEX idx_appointments_status ON appointments(status, hospital_id);
```

### 5. Consultations

```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  appointment_id UUID REFERENCES appointments(id),  -- May be from appointment or direct visit
  
  -- Parties
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),
  
  -- Clinical Content
  chief_complaint VARCHAR(512),
  
  -- History of Present Illness
  hpi TEXT,
  
  -- Assessment
  assessment TEXT,  -- Doctor's clinical assessment
  
  -- Plan
  plan TEXT,  -- Treatment plan, recommendations, follow-up
  
  -- Diagnoses (ICD-10)
  primary_diagnosis VARCHAR(10),  -- Diagnosis code
  secondary_diagnoses JSONB DEFAULT '[]',  -- Multiple as text array
  
  -- Status
  status VARCHAR(32) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Completed', 'Finalized')),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  finalized_at TIMESTAMP,
  
  CONSTRAINT valid_diagnosis CHECK (primary_diagnosis IS NULL OR primary_diagnosis ~ '^[A-Z][0-9]{2}(\.[0-9]{1,2})?$')
);

CREATE INDEX idx_consultations_patient_doctor ON consultations(patient_id, doctor_id);
CREATE INDEX idx_consultations_status ON consultations(status, hospital_id);
```

### 6. Vital Signs

```sql
CREATE TABLE vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  recorded_by UUID NOT NULL REFERENCES users(id),  -- Nurse or provider
  
  -- Measurements
  systolic_bp INTEGER CHECK (systolic_bp BETWEEN 0 AND 300),
  diastolic_bp INTEGER CHECK (diastolic_bp BETWEEN 0 AND 200),
  heart_rate INTEGER CHECK (heart_rate BETWEEN 0 AND 300),
  temperature_celsius NUMERIC(4, 1) CHECK (temperature_celsius BETWEEN 0 AND 50),
  respiratory_rate INTEGER CHECK (respiratory_rate BETWEEN 0 AND 100),
  oxygen_saturation INTEGER CHECK (oxygen_saturation BETWEEN 0 AND 100),  -- Percent
  weight_kg NUMERIC(6, 2),
  height_cm NUMERIC(5, 1),
  
  -- Derived
  bmi_calculated NUMERIC(5, 1) GENERATED ALWAYS AS (
    CASE 
      WHEN height_cm > 0 THEN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::numeric, 1)
      ELSE NULL
    END
  ),
  
  -- Clinical Assessment
  pain_level INTEGER CHECK (pain_level BETWEEN 0 AND 10),
  consciousness_level VARCHAR(32),  -- Alert, Awake, Confused, Unresponsive
  
  -- Alerts (cached for perf)
  has_critical_value BOOLEAN DEFAULT false,  -- Red flag vital
  critical_values JSONB DEFAULT '[]',  -- [{field: 'systolic_bp', value: 200, normal_range: '90-140'}]
  
  -- Timestamp
  recorded_at TIMESTAMP NOT NULL,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT recorded_at_not_future CHECK (recorded_at <= NOW())
);

CREATE INDEX idx_vital_signs_patient_date ON vital_signs(patient_id, recorded_at DESC);
CREATE INDEX idx_vital_signs_critical ON vital_signs(has_critical_value, recorded_at DESC);
```

### 7. Prescriptions

```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),  -- Prescribing doctor
  
  -- Drug Details
  drug_code VARCHAR(10),  -- SNOMED or RxNorm code
  drug_name VARCHAR(255) NOT NULL,
  dose_value NUMERIC(10, 3) NOT NULL CHECK (dose_value > 0),
  dose_unit VARCHAR(32),  -- "mg", "ml", "units"
  route VARCHAR(32) DEFAULT 'Oral',  -- "Oral", "IV", "IM", "Topical"
  frequency VARCHAR(128),  -- "Twice daily", "Every 8 hours"
  duration_days INTEGER,  -- NULL = indefinite (chronic)
  refills_authorized INTEGER DEFAULT 0,  -- 0-12
  special_instructions TEXT,
  
  -- Drug Safety Checks (cached)
  has_interactions BOOLEAN DEFAULT false,
  has_allergy_conflict BOOLEAN DEFAULT false,
  interaction_notes JSONB DEFAULT '{}',
  
  -- Workflow Status
  status VARCHAR(32) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Dispensed', 'Picked Up', 'Recalled', 'Expired')),
  
  -- Signing
  signed_at TIMESTAMP,
  signed_by UUID REFERENCES users(id),
  signature_hash VARCHAR(512),  -- Cryptographic hash for legal verification
  
  -- Dispensing
  dispensed_at TIMESTAMP,
  dispensed_by UUID REFERENCES users(id),  -- Pharmacist
  lot_number VARCHAR(128),
  batch_expiry_date DATE,
  
  -- Recall
  recalled_at TIMESTAMP,
  recalled_reason VARCHAR(512),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT signature_on_signed CHECK (
    (status = 'Signed' AND signed_by IS NOT NULL AND signature_hash IS NOT NULL)
    OR (status != 'Signed')
  ),
  CONSTRAINT dispense_after_sign CHECK (
    (status IN ('Dispensed', 'Picked Up') AND signed_by IS NOT NULL)
    OR (status NOT IN ('Dispensed', 'Picked Up'))
  )
);

CREATE INDEX idx_prescriptions_patient_status ON prescriptions(patient_id, status);
CREATE INDEX idx_prescriptions_doctor_signed ON prescriptions(doctor_id, status);
CREATE INDEX idx_prescriptions_pharmacy_queue ON prescriptions(status, hospital_id) WHERE status = 'Signed';
```

### 8. Laboratory Orders & Results

```sql
CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id),  -- Ordering physician
  
  -- Test Details
  test_code VARCHAR(10),  -- LOINC code
  test_name VARCHAR(255) NOT NULL,
  test_category VARCHAR(64),  -- "Hematology", "Chemistry", "Microbiology"
  
  -- Clinical Context
  clinical_indication TEXT,  -- Why test ordered
  fasting_required BOOLEAN DEFAULT false,
  special_instructions TEXT,
  priority VARCHAR(32) DEFAULT 'Routine' CHECK (priority IN ('Routine', 'Urgent', 'STAT')),
  
  -- Specimen
  specimen_type VARCHAR(64),  -- "Serum", "Whole Blood", "Urine"
  specimen_collected_at TIMESTAMP,
  specimen_collected_by UUID REFERENCES users(id),
  
  -- Status Workflow
  status VARCHAR(32) DEFAULT 'Ordered' CHECK (status IN ('Ordered', 'Collected', 'In Progress', 'Completed', 'Reviewed', 'Cancelled')),
  
  -- Cancellation
  cancelled_at TIMESTAMP,
  cancelled_reason VARCHAR(512),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT specimen_collected_implies_status CHECK (
    (specimen_collected_at IS NOT NULL AND status IN ('Collected', 'In Progress', 'Completed', 'Reviewed'))
    OR (specimen_collected_at IS NULL AND status IN ('Ordered', 'Cancelled'))
  )
);

CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  -- Result Value
  result_value NUMERIC(20, 6),
  result_unit VARCHAR(32),
  
  -- Reference Range
  normal_range_min NUMERIC(20, 6),
  normal_range_max NUMERIC(20, 6),
  
  -- Interpretation
  result_status VARCHAR(32) CHECK (result_status IN ('Normal', 'Abnormal', 'Critical', 'Hemolyzed', 'Insufficient')),
  
  -- Entry
  entered_by UUID REFERENCES users(id),  -- Lab technician
  entered_at TIMESTAMP NOT NULL,
  
  -- Approval
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),  -- Doctor
  approval_notes TEXT,
  
  -- Patient Notification
  patient_notified_at TIMESTAMP,
  notification_method VARCHAR(32),  -- "SMS", "Email", "Portal"
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT approval_requires_approver CHECK (
    (approved_at IS NOT NULL AND approved_by IS NOT NULL) OR approved_at IS NULL
  )
);

CREATE INDEX idx_lab_results_patient_approved ON lab_results(patient_id, approved_at DESC);
CREATE INDEX idx_lab_results_critical ON lab_results(result_status, entered_at DESC) WHERE result_status = 'Critical';
```

---

## Billing Entities

### 9. Billing Encounters

```sql
CREATE TABLE billing_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  -- Encounter Timeline
  encounter_start TIMESTAMP NOT NULL,
  encounter_end TIMESTAMP,
  visit_type VARCHAR(32),  -- "OPD", "IPD", "Emergency"
  
  -- Billing Details
  total_charges NUMERIC(12, 2) DEFAULT 0 CHECK (total_charges >= 0),
  
  -- Deductible & Cost Sharing
  deductible_applied NUMERIC(12, 2) DEFAULT 0,
  patient_copay NUMERIC(12, 2) DEFAULT 0,
  patient_coinsurance NUMERIC(12, 2) DEFAULT 0,
  patient_total_owed NUMERIC(12, 2) DEFAULT 0,
  
  -- Insurance
  primary_insurance_plan VARCHAR(255),
  primary_member_id VARCHAR(128),
  primary_auth_number VARCHAR(64),
  
  -- Claim Status
  claim_submitted_at TIMESTAMP,
  claim_status VARCHAR(32) CHECK (claim_status IN ('Draft', 'Submitted', 'Approved', 'Denied', 'Appealed', 'Paid')),
  
  insurance_payment_amount NUMERIC(12, 2) DEFAULT 0,
  insurance_paid_at TIMESTAMP,
  
  -- Denial/Appeal
  denial_reason VARCHAR(512),
  appeal_status VARCHAR(32),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_billing_encounters_patient ON billing_encounters(patient_id, encounter_start DESC);
CREATE INDEX idx_billing_encounters_claim_status ON billing_encounters(claim_status, hospital_id);
```

### 10. Billing Line Items

```sql
CREATE TABLE billing_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_encounter_id UUID NOT NULL REFERENCES billing_encounters(id),
  
  -- Service Code
  cpt_code VARCHAR(10) NOT NULL,  -- Procedure code
  cpt_description VARCHAR(255),
  icd10_code VARCHAR(10),  -- Diagnosis code
  
  -- Charges
  base_price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  multiplier NUMERIC(4, 2) DEFAULT 1,  -- For modifiers
  line_total NUMERIC(12, 2) GENERATED ALWAYS AS (
    (base_price * quantity * multiplier)::numeric
  ) STORED,
  
  -- Insurance Pre-Auth
  prior_auth_required BOOLEAN DEFAULT false,
  prior_auth_approved BOOLEAN,
  prior_auth_number VARCHAR(64),
  
  -- Billing Status
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_billing_line_items_encounter ON billing_line_items(billing_encounter_id);
```

---

## Audit & Compliance Entities

### 11. Activity Logs (Immutable)

```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Actor
  user_id UUID REFERENCES users(id),
  user_role VARCHAR(64),
  
  -- Action
  action VARCHAR(128) NOT NULL,  -- "patient:create", "prescription:sign", "result:approve"
  entity_type VARCHAR(64),  -- "patient", "prescription", "lab_result"
  entity_id UUID,
  
  -- Change Details
  old_values JSONB,  -- Before state
  new_values JSONB,  -- After state
  metadata JSONB DEFAULT '{}',  -- Additional context
  
  -- Security Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp (immutable)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Immutable constraint (no updates, no deletes)
  CONSTRAINT immutable_log CHECK (true)
);

CREATE INDEX idx_activity_logs_hospital ON activity_logs(hospital_id, created_at DESC);
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action, created_at DESC);
```

---

## Relationships Diagram

```
hospitals (1)
  ├─→ users (many)
  ├─→ patients (many)
  ├─→ appointments (many)
  ├─→ consultations (many)
  ├─→ vital_signs (many)
  ├─→ prescriptions (many)
  ├─→ lab_orders (many)
  ├─→ lab_results (many)
  ├─→ billing_encounters (many)
  └─→ activity_logs (many)

patients (1)
  ├─→ appointments (many)
  ├─→ consultations (many)
  ├─→ vital_signs (many)
  ├─→ prescriptions (many)
  ├─→ lab_orders (many)
  ├─→ lab_results (many)
  └─→ billing_encounters (many)

users (1)
  ├─→ appointments
  ├─→ consultations
  ├─→ vital_signs
  ├─→ prescriptions
  └─→ lab_orders
```

---

## Encryption & PHI Protection

### Fields Requiring Encryption

| Table | Fields | Encryption Level |
|-------|--------|------------------|
| `patients` | first_name, last_name, email, phone, address | AES-256-GCM |
| `vital_signs` | (measurements stored in plain, not PII) | Not encrypted |
| `prescriptions` | drug_name (if contains patient-specific info) | Field-level |
| `lab_results` | result_value (depends on test type) | May require encryption |
| `users` | email (non-PHI but sensitive) | Not encrypted |

**Pattern**: Encryption metadata stored in table:
```sql
encryption_metadata JSONB DEFAULT '{}'
-- {
--   "key_version": 1,
--   "algorithm": "AES-256-GCM",
--   "encrypted_fields": ["first_name", "last_name"],
--   "last_rotated": "2026-01-15"
-- }
```

---

## Query Patterns

### Safe Multi-Tenant Query (✅ CORRECT)

```typescript
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('hospital_id', currentHospital.id)  // ← REQUIRED
  .order('last_name')
  .limit(50);
```

### Unsafe Query (❌ WRONG)

```typescript
const { data } = await supabase
  .from('patients')
  .select('*')
  .limit(50);  // ← NO HOSPITAL FILTER! RLS ONLY = FRAGILE
```

---

## Performance Considerations

### Indexes Strategy

```
Primary: 
  - All tables: hospital_id (for filtering)
  - Temporal: created_at, recorded_at (for date range queries)
  
Secondary:
  - appointments: (provider_id, appointment_time)
  - vital_signs: (patient_id, recorded_at DESC)
  - lab_results: (result_status, entered_at DESC)
  - billing_encounters: (claim_status, hospital_id)
  
Selective:
  - activity_logs: (entity_type, entity_id)
  - lab_results: (result_status) WHERE result_status = 'Critical'
```

### Query Optimization Tips

1. **Always filter by hospital_id first** (cardinality reduction)
2. **Use LIMIT + OFFSET for pagination** (not all-at-once)
3. **Partition audit_logs by month** (for retention policies)
4. **Materialize slow queries** as views or refresh-on-demand

---

## Migration Strategy

### Adding New Fields

```sql
-- Step 1: Add column (nullable)
ALTER TABLE patients ADD COLUMN mrn VARCHAR(64);

-- Step 2: Backfill existing records
UPDATE patients SET mrn = CONCAT(hospital_id, '-', id)
WHERE mrn IS NULL;

-- Step 3: Add constraint
ALTER TABLE patients 
  ADD CONSTRAINT unique_mrn_per_hospital UNIQUE (hospital_id, mrn),
  ALTER COLUMN mrn SET NOT NULL;

-- Step 4: Deploy frontend (no code change needed)
```

---

## Documentation References

- **Related**: See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) for data access patterns
- **Related**: See [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) for RLS policies
- **Related**: See [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md) for entity usage

---

**Next**: Query the Supabase schema using your client and verify data integrity.
