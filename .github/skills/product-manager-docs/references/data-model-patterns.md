# Data Model Patterns for HIMS

Common data model patterns and schema design guidance for CareSync HIMS.

## Core Principles

1. **Immutability & Audit**: Clinical decisions recorded forever; never deleted, only voided with reason
2. **Encryption**: All PHI encrypted at rest; PII encrypted or masked in logs
3. **Denormalization for performance**: Critical data cached in frequently-accessed tables
4. **Soft deletes**: Mark deleted, record timestamp & actor; never hard-delete
5. **Audit trail**: Separate log table captures all changes (old_value, new_value, actor, timestamp)

---

## Base Tables

### `patients` Table

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Demographics
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender CHAR(1) NOT NULL CHECK (gender IN ('M', 'F', 'O')), -- Male, Female, Other
  
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(20),
  
  -- Medical History
  drug_allergies JSONB DEFAULT '[]'::jsonb, -- [{drug: "Penicillin", reaction: "anaphylaxis"}, ...]
  medical_conditions JSONB DEFAULT '[]'::jsonb, -- [{condition: "Diabetes", diagnosed_date: "2020-01-15"}, ...]
  
  -- Encryption
  encryption_metadata JSONB DEFAULT '{}', -- {key_version: 1, algorithm: "AES-256-GCM"}
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID NOT NULL,
  deleted_at TIMESTAMP,
  deleted_by UUID,
  
  CONSTRAINT no_empty_name CHECK (length(trim(first_name)) > 0),
  CONSTRAINT valid_age CHECK (date_of_birth < CURRENT_DATE - INTERVAL '0 years')
);

CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_deleted_at ON patients(deleted_at); -- For soft-delete queries
```

### `users` Table (Hospital Staff)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Credentials
  email VARCHAR(255) NOT NULL UNIQUE,
  hashed_password VARCHAR(255),
  
  -- Profile
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128) NOT NULL,
  role VARCHAR(64) NOT NULL CHECK (role IN ('Doctor', 'Nurse', 'Pharmacist', 'Lab Technician', 'Billing', 'Admin')),
  
  -- Specialization (if applicable)
  specialization VARCHAR(256), -- e.g., "Cardiology", "Pediatrics"
  license_number VARCHAR(64),
  license_expiry DATE,
  
  -- Permissions
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  deleted_at TIMESTAMP,
  
  CONSTRAINT valid_license_date CHECK (license_expiry > CURRENT_DATE OR license_expiry IS NULL)
);

CREATE INDEX idx_users_hospital_id ON users(hospital_id);
CREATE INDEX idx_users_role ON users(role);
```

---

## Prescription Workflow

### `prescriptions` Table

```sql
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  encounter_id UUID NOT NULL REFERENCES encounters(id), -- Medical visit context
  
  -- Patient & Prescriber
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id), -- Prescriber
  
  -- Drug Details
  drug_code VARCHAR(64) NOT NULL, -- SNOMED/RxNorm code or local ID
  drug_name VARCHAR(255) NOT NULL,
  dose_value NUMERIC(10, 3) NOT NULL CHECK (dose_value > 0),
  dose_unit VARCHAR(32) NOT NULL, -- "mg", "ml", "units"
  frequency VARCHAR(128) NOT NULL, -- "twice daily", "every 8 hours"
  duration_days INTEGER, -- NULL = indefinite (chronic)
  route VARCHAR(32) DEFAULT 'Oral', -- "Oral", "IV", "IM", "TopicalINFUSION", etc.
  special_instructions TEXT,
  
  -- Interaction Flags (denormalized for perf)
  has_drug_interactions BOOLEAN DEFAULT false,
  has_allergy_conflict BOOLEAN DEFAULT false,
  interaction_notes JSONB DEFAULT '{}'::jsonb,
  
  -- Status Workflow
  status VARCHAR(32) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Signed', 'Dispensed', 'Picked Up', 'Recalled', 'Expired')),
  
  -- Signing
  signed_at TIMESTAMP,
  signed_by UUID REFERENCES users(id),
  signature_hash VARCHAR(512), -- Cryptographic signature for legal admissibility
  
  -- Dispensing
  dispensed_at TIMESTAMP,
  dispensed_by UUID REFERENCES users(id), -- Pharmacist
  lot_number VARCHAR(128),
  expiry_date DATE,
  
  -- Recall (if applicable)
  recalled_at TIMESTAMP,
  recalled_by UUID REFERENCES users(id),
  recall_reason VARCHAR(512),
  
  -- Encryption
  encryption_metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID,
  
  CONSTRAINT check_signature_when_signed CHECK (
    (status = 'Signed' AND signed_by IS NOT NULL AND signature_hash IS NOT NULL) OR
    (status != 'Signed')
  ),
  CONSTRAINT check_dispense_after_sign CHECK (
    (status IN ('Dispensed', 'Picked Up') AND signed_by IS NOT NULL) OR
    (status NOT IN ('Dispensed', 'Picked Up'))
  )
);

CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor_id ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_signed_at ON prescriptions(signed_at);
```

### `prescription_audit_log` Table

```sql
CREATE TABLE prescription_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  
  -- Action
  action VARCHAR(64) NOT NULL CHECK (action IN ('created', 'modified', 'signed', 'dispensed', 'recalled', 'viewed')),
  
  -- Actor
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role VARCHAR(64) NOT NULL,
  
  -- Changes
  old_values JSONB, -- Snapshot of fields before change
  new_values JSONB, -- Snapshot after change
  change_reason VARCHAR(512), -- Why recall? Why modify?
  
  -- Security
  ip_address INET,
  user_agent VARCHAR(512),
  
  -- Timestamp
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Immutable
  CONSTRAINT no_update CHECK (true) -- Never update; only insert
);

CREATE INDEX idx_rx_audit_log_prescription_id ON prescription_audit_log(prescription_id);
CREATE INDEX idx_rx_audit_log_timestamp ON prescription_audit_log(timestamp);
CREATE INDEX idx_rx_audit_log_actor_id ON prescription_audit_log(actor_id);
```

---

## Lab Order & Result Workflow

### `lab_orders` Table

```sql
CREATE TABLE lab_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  encounter_id UUID REFERENCES encounters(id),
  
  -- Patient & Orderer
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID NOT NULL REFERENCES users(id), -- Ordering physician
  
  -- Order Details
  test_code VARCHAR(64) NOT NULL, -- LOINC code
  test_name VARCHAR(255) NOT NULL,
  test_category VARCHAR(64), -- "Hematology", "Chemistry", "Microbiology"
  priority VARCHAR(32) DEFAULT 'Routine' CHECK (priority IN ('Routine', 'Urgent', 'STAT')),
  
  -- Clinical Context
  clinical_indication TEXT, -- Why test being ordered?
  fasting_required BOOLEAN DEFAULT false,
  special_instructions TEXT,
  
  -- Status
  status VARCHAR(32) DEFAULT 'Ordered' CHECK (status IN ('Ordered', 'Collected', 'In Progress', 'Completed', 'Reviewed', 'Cancelled')),
  
  -- Specimen
  specimen_type VARCHAR(64), -- "Serum", "Plasma", "Whole Blood"
  specimen_collected_at TIMESTAMP,
  specimen_collected_by UUID REFERENCES users(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  cancelled_at TIMESTAMP,
  cancelled_by UUID,
  cancelled_reason VARCHAR(512)
);

CREATE INDEX idx_lab_orders_patient_id ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_doctor_id ON lab_orders(doctor_id);
CREATE INDEX idx_lab_orders_status ON lab_orders(status);
```

### `lab_results` Table

```sql
CREATE TABLE lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID NOT NULL REFERENCES lab_orders(id),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  -- Result Value
  test_result_value NUMERIC(20, 6),
  test_result_unit VARCHAR(32),
  test_normal_range_min NUMERIC(20, 6),
  test_normal_range_max NUMERIC(20, 6),
  result_status VARCHAR(32) CHECK (result_status IN ('Normal', 'Abnormal', 'Critical', 'Delta Check Fail')),
  
  -- Interpretation
  reference_lab VARCHAR(255), -- Which lab ran test
  result_timestamp TIMESTAMP NOT NULL,
  performed_by UUID REFERENCES users(id), -- Lab technician
  
  -- Review & Approval
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id), -- Physician
  approval_status VARCHAR(32) CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
  review_notes TEXT,
  
  -- Notification
  patient_notified_at TIMESTAMP,
  notification_method VARCHAR(32), -- "SMS", "Email", "Portal"
  
  -- Encryption
  encryption_metadata JSONB DEFAULT '{}',
  
  -- Immutable
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT check_approval CHECK (
    (approval_status = 'Approved' AND reviewed_by IS NOT NULL) OR
    (approval_status != 'Approved')
  )
);

CREATE INDEX idx_lab_results_patient_id ON lab_results(patient_id);
CREATE INDEX idx_lab_results_approved_by ON lab_results(reviewed_by);
CREATE INDEX idx_lab_results_status ON lab_results(result_status);
```

---

## Billing Workflow

### `billing_encounters` Table

```sql
CREATE TABLE billing_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  encounter_id UUID NOT NULL REFERENCES encounters(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  -- Insurance
  primary_insurance_plan VARCHAR(255),
  primary_member_id VARCHAR(128),
  secondary_insurance_plan VARCHAR(255),
  secondary_member_id VARCHAR(128),
  
  -- Billing Details
  encounter_start TIMESTAMP NOT NULL,
  encounter_end TIMESTAMP,
  total_charges NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Deductible & Cost Sharing
  deductible_applied NUMERIC(12, 2) DEFAULT 0,
  patient_copay NUMERIC(12, 2) DEFAULT 0,
  patient_coinsurance NUMERIC(12, 2) DEFAULT 0,
  patient_total_owed NUMERIC(12, 2) DEFAULT 0,
  
  -- Claim Status
  claim_submitted_at TIMESTAMP,
  claim_status VARCHAR(32) CHECK (claim_status IN ('Draft', 'Submitted', 'Approved', 'Disputed', 'Paid', 'Denied')),
  insurance_payment_amount NUMERIC(12, 2) DEFAULT 0,
  insurance_paid_at TIMESTAMP,
  
  -- Denial / Dispute
  denial_reason VARCHAR(512),
  appeal_status VARCHAR(32),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_billing_encounters_patient_id ON billing_encounters(patient_id);
CREATE INDEX idx_billing_encounters_claim_status ON billing_encounters(claim_status);
```

### `billing_line_items` Table

```sql
CREATE TABLE billing_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_encounter_id UUID NOT NULL REFERENCES billing_encounters(id),
  
  -- Service Code
  cpt_code VARCHAR(10) NOT NULL, -- e.g., "99213" for office visit
  cpt_description VARCHAR(255),
  icd10_code VARCHAR(10), -- Diagnosis code
  
  -- Charges
  unit_price NUMERIC(12, 2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  line_total NUMERIC(12, 2) NOT NULL,
  
  -- Insurance Approval
  prior_auth_required BOOLEAN DEFAULT false,
  prior_auth_approved BOOLEAN,
  prior_auth_number VARCHAR(64),
  
  -- Status
  paid BOOLEAN DEFAULT false,
  note TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_billing_line_items_cpt_code ON billing_line_items(cpt_code);
```

---

## Audit Log Strategy

### Pattern: Event Sourcing Lite

Instead of storing final state, also maintain event log:

```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(64) NOT NULL, -- "prescription.signed", "patient.created", "claim.denied"
  entity_type VARCHAR(64) NOT NULL, -- "prescription", "patient", "claim"
  entity_id UUID NOT NULL,
  hospital_id UUID NOT NULL,
  
  -- Actor
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_role VARCHAR(64),
  
  -- Change Details
  old_state JSONB, -- Full object before change
  new_state JSONB, -- Full object after change
  metadata JSONB DEFAULT '{}', -- Additional context
  
  -- Security Context
  ip_address INET,
  user_agent VARCHAR(512),
  
  -- Timestamp (immutable)
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Immutable constraint (prevent updates)
  CONSTRAINT no_updates CHECK (true)
);

CREATE INDEX idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_hospital ON audit_events(hospital_id);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_events_timestamp ON audit_events(created_at);
```

---

## Schema Best Practices

| Practice | Why | Example |
|----------|-----|---------|
| **Soft deletes** | Never hard-delete clinical records; adds `deleted_at`, `deleted_by` | Patient marked inactive, not deleted |
| **Immutable event log** | Change history must be forensically sound | `CONSTRAINT no_update CHECK (true)` |
| **Denormalized flags** | Cache critical flags for perf (drug interactions, abnormal results) | `has_drug_interactions` in prescription |
| **Encryption metadata** | Track encryption key version for agile key rotation | `encryption_metadata JSONB` |
| **Timezone handling** |Always store UTC; convert on client | `created_at TIMESTAMP at time zone 'UTC'` |
| **Status enums** | Strict enum prevents invalid states | `status VARCHAR(32) CHECK (status IN ('Draft', 'Signed', ...))` |
| **Referential integrity** | FK constraints catch data corruption | `doctor_id UUID REFERENCES users(id)` |

---

## Performance Considerations

- **Indexes on status, timestamps**: Lab results queried by status and date range
- **Partition large tables**: `audit_events` partitioned by month for faster purges
- **Materialized views**: Summary tables for dashboard queries (don't recompute on every view)
- **Read replicas**: Critical queries on read-only replicas to avoid blocking writes

---

## Privacy Patterns

- **PII masking in logs**: Never log full SSN, credit card number
- **Encryption at rest**: All PHI encrypted; only decrypted in-session
- **Audit log encryption**: Audit events themselves not encrypted (must be searchable), but referrer restricted
- **Data minimization**: Only store fields needed for clinical care + legal retention

---

**Questions?** Consult CareSync HIMS Technical Architecture or contact Database Lead.
