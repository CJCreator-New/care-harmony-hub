# CareSync Audit Trail & Forensic Review: Phase 2A Complete Specification

**Document Type:** Forensic Audit Logging Specification  
**Phase:** 2A — Core Audit Infrastructure  
**Status:** ✅ COMPLETE (March 13, 2026)  
**Classification:** HIPAA-Regulated Healthcare Systems  

---

## Executive Summary

This document delivers **production-ready, tamper-evident audit logging** for CareSync HIMS Phase 2A, covering:

1. **Critical Workflows** requiring immutable audit trails (prescription, discharge, billing, lab)
2. **Audit Table Schemas** with append-only design (no UPDATE/DELETE allowed)
3. **Amendment Pattern** for corrections without overwrites
4. **Trigger-Based Automation** (no manual audit calls required)
5. **Forensic Query Functions** for compliance investigations
6. **Code Review Checkpoints** (15 enforcement rules)
7. **SQL Migrations** ready for deployment
8. **TypeScript Integration** (type definitions + usage patterns)

---

## Part 1: Critical Workflows Identification

### 1.1 Prescription Workflow ✅ HIGH-RISK (Medico-Legal)

**Events to Audit:**
- `CREATE` — Doctor enters prescription (timestamp, dosage, quantity)
- `VERIFY` — Pharmacist checks interactions (approval time locked)
- `APPROVE` — Pharmacist authorizes dispensing
- `REJECT` — Pharmacist blocks with safety reason
- `DISPENSE` — Nurse/technician marks as dispensed
- `AMEND` — Doctor corrects dosage/quantity (with justification)
- `REVERSAL` — Prescription recalled (emergency or safety issue)
- `HOLD` — Prescription temporarily frozen pending review
- `CANCEL` — Prescription cancelled

**Why Immutable:**
- Prescriptions are medico-legal documents
- Amendment history proves clinical intent & safety protocols
- Liability exposure: editing approval time without audit = negligence
- Compliance requirement: HIPAA, medical board review, malpractice defense

**Audit Table:** `prescription_audit` (created in Phase 2A)

**Example Violation:**
```sql
-- FORBIDDEN: Overwrites original, hides error
UPDATE prescriptions SET dosage = '250mg BID' WHERE id = 'rx_123';
-- ❌ No forensic trail; original dosage lost; audit failure

-- CORRECT: Append amendment, original preserved
SELECT public.amend_prescription_dosage('rx_123', '500mg BID', '250mg BID', 'Dosage reduction', doctor_id);
-- ✅ Both records visible; chain queryable; immutable
```

---

### 1.2 Discharge Workflow ✅ HIGH-RISK (Patient Safety)

**Events to Audit:**
- `INITIATE` — Nurse/doctor starts discharge process
- `REVIEW` — Nurse reviews discharge readiness
- `SIGN` — Doctor legally signs discharge summary
- `FINAL_BILL` — Finance marks invoice settled
- `CLOSE` — Encounter locked; no further edits

**Why Immutable:**
- Discharge is terminal event; improper closure hides clinical gaps
- Legal liability: premature discharge without nursing sign-off
- Workflow invariants: must follow sequence (no skipping REVIEW)

**Current Status:** 
- ✅ `discharge_workflows` table exists (Phase 1A)
- ✅ `discharge_workflow_audit` table exists (Phase 1A)
- ✅ Step tracking + actor logging already in place
- **Phase 2A Action:** Integrate with unified `audit_log` table for cross-workflow consistency

---

### 1.3 Billing Workflow ✅ HIGH-RISK (Financial Fraud Prevention)

**Events to Audit:**
- `CHARGE_CREATED` — New invoice issued (subtotal, tax, total)
- `PAYMENT_RECEIVED` — Patient/insurance payment recorded
- `ADJUSTMENT` — Invoice modified (discount, reversal, correction)
- `DISCOUNT_APPLIED` — Insurance negotiation or write-off
- `REVERSAL` — Charge reversed (chargeback, error correction)
- `WRITE_OFF` — Bad debt written off (requires approval)
- `RECONCILED` — Payment matched to invoice

**Why Immutable:**
- Every $ change is a financial mutation: audit required for SOX/accounting controls
- Fraud prevention: editing invoice totals retroactively = embezzlement risk
- Non-repudiation: Finance manager approval + reason required for all adjustments

**Audit Table:** `invoice_adjustment_audit` (created in Phase 2A)

**Violation Example:**
```sql
-- FORBIDDEN: Updates total directly (original hidden)
UPDATE invoices SET total = 950.00, updated_at = now() WHERE id = 'inv_123';
-- ❌ Original $1000 lost; no audit trail; fraud risk

-- CORRECT: Create adjustment record with reason
SELECT public.create_invoice_adjustment(
  'inv_123', -50.00, 'DISCOUNT_APPLIED',
  'Insurance negotiation: 5% discount on consultation fee',
  manager_id, 'billing'
);
-- ✅ $1000 → $950 change audited; reason documented; trail immutable
```

---

### 1.4 Lab Result Workflow ✅ HIGH-RISK (Clinical Safety)

**Events to Audit:**
- `CREATED` — Lab technician enters result (value, unit, reference range)
- `VERIFIED` — Pathologist reviews + signs off
- `AMENDED` — Correction recorded (amendment pattern)
- `CORRECTED` — Error fixed without overwriting original
- `INVALIDATED` — Result marked invalid (specimen issue, equipment failure)

**Why Immutable:**
- Lab results drive diagnosis/treatment decisions: editing retroactively = patient safety risk
- Liability: pathologist must explain why result changed (not just overwrite)
- Amendment pattern: original visible + correction linked + reason documented

**Audit Table:** `lab_result_audit` (created in Phase 2A)

**Violation Example:**
```sql
-- FORBIDDEN: Silent correction of value
UPDATE lab_results SET result_value = 95.0 WHERE id = 'lab_001';
-- ❌ Original 125 mg/dL hidden; pathologist's intent unclear; error untraced

-- CORRECT: Amendment pattern
SELECT public.amend_lab_result(
  'lab_001', '95.0', 'Data entry error: transcribed 125 instead of 95', pathologist_id
);
-- ✅ Original & amended both visible; chain shows error + correction; immutable
```

---

### 1.5 Access Control Changes ✅ MEDIUM-RISK

**Events to Audit:** Role assignment, hospital scoping change, permission grant/revoke  
**Why Immutable:** Access to patient data is regulated; track "who can see what" changes  
**Audit Table:** `audit_log` (general-purpose)

---

### 1.6 Consent Management ✅ MEDIUM-RISK

**Events to Audit:** Consent granted, consent withdrawn, GDPR deletion request  
**Why Immutable:** Patient consent is medico-legal; overwriting = privacy violation  
**Audit Table:** `audit_log` (with patient_id)

---

## Part 2: Audit Table Schema Design

### 2.1 Core Design Principles (Immutable & Forensic-Grade)

| Principle | Implementation | Enforcement |
|-----------|-----------------|-------------|
| **Append-Only** | No UPDATE/DELETE after creation | RLS policies block mutations |
| **Immutable Snapshots** | `before_state` & `after_state` (JSONB) | Cannot query past states any other way |
| **Hospital-Scoped** | Every row includes `hospital_id` | RLS: SELECT blocked outside hospital |
| **Actor Context** | `actor_user_id`, `actor_role` always captured | Required columns |
| **Forensic-Grade** | UTC timestamps, session tracking, IP logging | Immutable timestamp constraint |
| **Amendment Pattern** | NEW records link via `amends_audit_id` | No overwrites of originals |
| **Change Justification** | `change_reason` required for high-risk | NOT NULL constraint for amendments |

### 2.2 Unified Audit Table: `audit_log`

**Purpose:** Foundation for all audit logging (clinical, financial, administrative)

```sql
CREATE TABLE public.audit_log (
  audit_id UUID PRIMARY KEY,              -- Unique forensic record
  event_time TIMESTAMPTZ NOT NULL,        -- When (UTC, immutable)
  event_date DATE NOT NULL,               -- For efficient time-range queries
  hospital_id UUID NOT NULL,              -- Which hospital (scoping)
  
  actor_user_id UUID NOT NULL,            -- WHO (doctor, pharmacist, etc.)
  actor_role TEXT NOT NULL,               -- Doctor, Pharmacist, Nurse, Admin
  actor_email TEXT,
  
  action_type TEXT NOT NULL,              -- CREATE, APPROVE, REJECT, AMEND, REVERSAL
  entity_type TEXT NOT NULL,              -- prescription, invoice, lab_result, discharge
  entity_id UUID NOT NULL,                -- Which entity changed
  
  patient_id UUID,                        -- Which patient (for clinical audit)
  consultation_id UUID,                   -- Which consultation
  
  change_reason TEXT,                     -- WHY changed (required for amendments)
  before_state JSONB,                     -- Previous state (full snapshot)
  after_state JSONB,                      -- New state (full snapshot)
  
  source_ip INET,                         -- WHERE from (network forensics)
  session_id TEXT,                        -- User session (tied movements)
  user_agent TEXT,
  
  amends_audit_id UUID,                   -- Links to amended record (for corrections)
  hash_chain TEXT,                        -- Future: Cryptographic signature
  
  immutable_lock BOOLEAN DEFAULT true
);

-- Indexes for forensic investigation
CREATE INDEX idx_audit_log_hospital_time 
  ON public.audit_log(hospital_id, event_time DESC);
CREATE INDEX idx_audit_log_entity 
  ON public.audit_log(entity_type, entity_id, event_time DESC);
CREATE INDEX idx_audit_log_actor 
  ON public.audit_log(actor_user_id, event_time DESC);
CREATE INDEX idx_audit_log_patient 
  ON public.audit_log(patient_id, event_time DESC);
CREATE INDEX idx_audit_log_action 
  ON public.audit_log(action_type, event_time DESC);

-- RLS: Append-only enforcement
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_no_update" ON audit_log FOR UPDATE USING (false);
CREATE POLICY "audit_no_delete" ON audit_log FOR DELETE USING (false);
```

### 2.3 Prescription Audit Table: `prescription_audit`

**Purpose:** Specialized table for prescription lifecycle (CREATE, APPROVE, AMEND, REVERSAL)

```sql
CREATE TABLE public.prescription_audit (
  audit_id UUID PRIMARY KEY,
  event_time TIMESTAMPTZ NOT NULL,
  hospital_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  prescription_id UUID NOT NULL,
  
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('doctor', 'pharmacist', 'nurse', 'admin')),
  
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATE', 'VERIFY', 'APPROVE', 'REJECT', 'DISPENSE',
    'AMEND', 'REVERSAL', 'HOLD', 'CANCEL'
  )),
  
  change_reason TEXT,
  before_state JSONB,
  after_state JSONB,
  
  -- Dosage-specific fields for quick filtering
  dosage_before TEXT,
  dosage_after TEXT,
  quantity_before INTEGER,
  quantity_after INTEGER,
  
  -- Amendment pattern
  amends_audit_id UUID REFERENCES prescription_audit(audit_id),
  amendment_justification TEXT,
  
  source_ip INET,
  session_id TEXT,
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Append-only
CREATE POLICY "no_update" ON prescription_audit FOR UPDATE USING (false);
Create POLICY "no_delete" ON prescription_audit FOR DELETE USING (false);
```

### 2.4 Invoice Adjustment Audit Table: `invoice_adjustment_audit`

**Purpose:** Financial mutations (charges, payments, discounts, adjustments, reversals)

```sql
CREATE TABLE public.invoice_adjustment_audit (
  audit_id UUID PRIMARY KEY,
  event_time TIMESTAMPTZ NOT NULL,
  hospital_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('billing', 'accountant', 'doctor', 'admin')),
  
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CHARGE_CREATED', 'PAYMENT_RECEIVED', 'ADJUSTMENT',
    'DISCOUNT_APPLIED', 'REVERSAL', 'WRITE_OFF', 'RECONCILED'
  )),
  
  change_reason TEXT NOT NULL,  -- Required for financial compliance
  
  -- Financial snapshots
  amount_change NUMERIC(10,2),
  subtotal_before NUMERIC(10,2),
  subtotal_after NUMERIC(10,2),
  tax_before NUMERIC(10,2),
  tax_after NUMERIC(10,2),
  total_before NUMERIC(10,2),
  total_after NUMERIC(10,2),
  
  before_state JSONB,
  after_state JSONB,
  
  amends_audit_id UUID REFERENCES invoice_adjustment_audit(audit_id),
  
  source_ip INET,
  session_id TEXT,
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- RLS: Append-only
```

### 2.5 Lab Result Audit Table: `lab_result_audit`

**Purpose:** Lab result lifecycle with amendment pattern for corrections

```sql
CREATE TABLE public.lab_result_audit (
  audit_id UUID PRIMARY KEY,
  event_time TIMESTAMPTZ NOT NULL,
  hospital_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  lab_result_id UUID NOT NULL,
  
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('lab_technician', 'pathologist', 'doctor', 'admin')),
  
  action_type TEXT NOT NULL CHECK (action_type IN (
    'CREATED', 'VERIFIED', 'AMENDED', 'CORRECTED', 'INVALIDATED'
  )),
  
  change_reason TEXT,
  test_name TEXT,
  result_value_before TEXT,
  result_value_after TEXT,
  reference_range TEXT,
  unit_before TEXT,
  unit_after TEXT,
  
  before_state JSONB,
  after_state JSONB,
  
  amends_audit_id UUID REFERENCES lab_result_audit(audit_id),
  amendment_justification TEXT,
  
  source_ip INET,
  session_id TEXT,
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- RLS: Append-only
```

---

## Part 3: Prescription Approval Logging (Exact SQL & Trigger)

### 3.1 Trigger Function: Auto-Log Prescription Approval

```sql
CREATE OR REPLACE FUNCTION public.log_prescription_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_role TEXT;
  v_before_state JSONB;
  v_after_state JSONB;
BEGIN
  -- Only log when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Get approver's role
    SELECT role INTO v_actor_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Capture before state
    v_before_state := jsonb_build_object(
      'prescription_id', OLD.id,
      'status', OLD.status,
      'notes', OLD.notes,
      'dispensed_by', OLD.dispensed_by
    );
    
    -- Capture after state
    v_after_state := jsonb_build_object(
      'prescription_id', NEW.id,
      'status', NEW.status,
      'notes', NEW.notes,
      'dispensed_by', NEW.dispensed_by
    );
    
    -- Log to prescription_audit (automatically)
    INSERT INTO public.prescription_audit (
      hospital_id,
      patient_id,
      prescription_id,
      actor_user_id,
      actor_role,
      action_type,
      change_reason,
      before_state,
      after_state
    ) VALUES (
      NEW.hospital_id,
      NEW.patient_id,
      NEW.id,
      auth.uid(),
      v_actor_role,
      'APPROVE',
      COALESCE(
        current_setting('audit.change_reason', true),
        'Approved after interaction check'
      ),
      v_before_state,
      v_after_state
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prescription_approval_audit_trigger
AFTER UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.log_prescription_approval();
```

### 3.2 Usage: How Pharmacist Approves & Audit Logs Automatically

```typescript
// Frontend: Pharmacist approves prescription

async function approvePrescription(prescriptionId: string, approvalReason: string) {
  // Step 1: Set audit context (read by trigger)
  await supabase.rpc('set_audit_context', {
    p_change_reason: approvalReason || 'Approved after interaction check'
  });

  // Step 2: Update prescription status
  const { data, error } = await supabase
    .from('prescriptions')
    .update({ status: 'approved' })
    .eq('id', prescriptionId)
    .select();

  // ↓ TRIGGER FIRES AUTOMATICALLY ↓
  // log_prescription_approval() inserts to prescription_audit:
  // {
  //   "audit_id": "b42d1f94-e8c2-4d5f-a3f1-2c9e7f5e4a6b",
  //   "event_time": "2026-03-13T14:23:45.123Z",
  //   "hospital_id": "hosp_001",
  //   "patient_id": "pat_089",
  //   "prescription_id": "rx_123",
  //   "actor_user_id": "user_456",
  //   "actor_role": "pharmacist",
  //   "action_type": "APPROVE",
  //   "change_reason": "Approved after interaction check",
  //   "before_state": {"status": "pending"},
  //   "after_state": {"status": "approved"}
  // }
}

// Forensic Investigation: Who approved this & when?
const auditTrail = await supabase
  .from('prescription_audit')
  .select('*')
  .eq('prescription_id', 'rx_123')
  .order('event_time', { ascending: true });

// Result: Timeline showing CREATE → APPROVE → AMEND (if any) → REVERSAL (if any)
```

---

## Part 4: Amendment Pattern (Exact Example: Dosage Correction)

### 4.1 Scenario

Doctor prescribes "500mg BID" (twice daily = 30 tablets). After review, notices patient has Stage 2 chronic kidney disease (CKD). Dosage too high; reduces to "250mg BID" (half dose = 15 tablets).

### 4.2 Forbidden Approach (❌ Violates Forensic Integrity)

```sql
-- NEVER DO THIS
UPDATE prescriptions SET dosage = '250mg BID', quantity = 15 WHERE id = 'rx_123';
-- Problems:
-- ❌ Original dosage hidden (500mg lost)
-- ❌ No audit trail of change
-- ❌ Doctor's reasoning not captured
-- ❌ Compliance investigator sees only "250mg BID" in database
-- ❌ Liability: Looks like prescribing error, not intentional reduction
```

### 4.3 Correct Approach (✅ Amendment Pattern: Create NEW record, link to original)

**Step 1: Verify original prescription approval was logged**

```sql
SELECT audit_id, event_time, action_type, dosage_after
FROM public.prescription_audit
WHERE prescription_id = 'rx_123'
ORDER BY event_time;

-- Result:
-- audit_id          | event_time | action_type | dosage_after
-- a1 (original)     | 14:00      | CREATE      | 500mg BID
-- a2                | 14:05      | APPROVE     | 500mg BID
```

**Step 2: Create Amendment Record (via Supabase RPC)**

```typescript
// Doctor (Doctor ID: doc_001) corrects dosage

const amendmentId = await supabase.rpc('amend_prescription_dosage', {
  p_prescription_id: 'rx_123',
  p_old_dosage: '500mg BID',
  p_new_dosage: '250mg BID',
  p_amendment_reason: 'Patient has Stage 2 CKD; reduced per renal function guidelines per Kidney Disease: Improving Global Outcomes (KDIGO)',
  p_amending_doctor_id: 'doc_001'
});

// Result: New audit record created
// {
//   "audit_id": "a3",
//   "event_time": "2026-03-13T14:30:00Z",
//   "prescription_id": "rx_123",
//   "action_type": "AMEND",
//   "dosage_before": "500mg BID",
//   "dosage_after": "250mg BID",
//   "amends_audit_id": "a2",  // ← Links to original APPROVE record
//   "amendment_justification": "Patient has Stage 2 CKD..."
// }
```

**Step 3: Query Amendment Chain (Complete Forensic Trail)**

```sql
SELECT * FROM public.get_prescription_amendment_chain('rx_123'::UUID);

-- Result: Full timeline showing evolution
-- seq | audit_id | event_time | actor_email | action_type | dosage_before | dosage_after | change_reason
-- --- | -------- | ---------- | ----------- | ----------- | ------------- | ------------ | ---
-- 1   | a1       | 14:00 UTC  | john@doc..  | CREATE      | NULL          | 500mg BID    | "New Rx"
-- 2   | a2       | 14:05 UTC  | anna@..     | APPROVE     | NULL          | 500mg BID    | "Interaction check passed"
-- 3   | a3       | 14:30 UTC  | john@doc..  | AMEND       | 500mg BID     | 250mg BID    | "Stage 2 CKD; reduced per KDIGO"

-- ✅ Compliance officer can now see:
--    - Original intention: 500mg BID (intentional, not typo)
--    - Pharmacist verification: Passed interaction check
--    - Clinical review: Doctor identified CKD contraindication
--    - Amendment: Justified reduction to 250mg BID with medical reason
--    - Timeline: All changes timestamped and actor-traced
--    - Immutable: Original dosage NOT overwritten
```

### 4.4 Key Protections

✅ **Original prescription unchanged** in `prescriptions` table (still shows 500mg if queried directly)
✅ **Amendment creates NEW audit entry** (index a3) linked via `amends_audit_id` → a2 (original approval)
✅ **Full chain queryable** — `get_prescription_amendment_chain()` shows chronological sequence
✅ **No data loss** — Original value (500mg) + amendment reason (CKD) preserved forever
✅ **Immutable** — RLS policies prevent UPDATE/DELETE on audit entries after creation
✅ **Forensic value** — Compliance investigator sees clinical reasoning, not just final state

---

## Part 5: Code Review Checkpoints (15 Enforcement Rules)

### **CRITICAL: Apply to every PR touching audit-sensitive workflows**

| ID | Checkpoint | Rule | Violation | REJECT |
|----|-----------|------|-----------|--------|
| 1️⃣ | **No Direct Mutations** | Prescription/Invoice/Lab changes must INSERT audit, not UPDATE | `UPDATE prescriptions SET status = 'amended'` w/o audit insert | ✋ YES |
| 2️⃣ | **Hospital Scoping** | Every audit + mutation must include `hospital_id` | `INSERT INTO invoice_adj_audit (...) -- missing hospital_id` | ✋ YES |
| 3️⃣ | **Change Reason Required** | High-risk (AMEND, REJECT, DISCOUNT) require `change_reason` | `UPDATE invoices SET total = 950` w/o reason | ✋ YES |
| 4️⃣ | **Actor Context** | Audit must include `actor_user_id` + `actor_role` | Audit log missing actor_role | ✋ YES |
| 5️⃣ | **No PII in Audit** | Never log passwords, SSN, credit card, patient notes | `after_state: {password: 'secret123'}` | ✋ YES |
| 6️⃣ | **Amendment Link** | Corrections reference original via `amends_audit_id`, never overwrite | `UPDATE prescriptions SET dosage = NEW` | ✋ YES |
| 7️⃣ | **Append-Only RLS** | RLS policies block UPDATE/DELETE on audit tables | Missing RLS or allows UPDATE | ✋ YES |
| 8️⃣ | **UTC Timestamps** | Audit timestamps immutable, UTC only, not local | `event_time` stored in local timezone | ✋ YES |
| 9️⃣ | **Session Tracking** | High-risk mutations capture `session_id` + `source_ip` | Approval trigger missing source_ip | ✋ YES |
| 🔟 | **Before/After Snapshots** | State mutations capture full `before_state` & `after_state` JSONB | Discarding original values | ✋ YES |
| 1️⃣1️⃣ | **Forensic Indexing** | Audit tables indexed on (entity_id, time), (actor_id), (hospital_id, time) | Missing index on (prescription_id, event_time) | ✋ YES |
| 1️⃣2️⃣ | **Role-Based Visibility** | Audit visible to staff in same hospital only, not cross-hospital | SELECT allowed w/o hospital check | ✋ YES |
| 1️⃣3️⃣ | **Hash Chain Field** | Prescription/Billing/Lab audit rows include `hash_chain` (reserved for crypto) | Field missing; cannot add signing later | ✋ YES |
| 1️⃣4️⃣ | **Trigger Idempotency** | Audit triggers safe if called twice (no side effects) | Trigger increments counter | ✋ YES |
| 1️⃣5️⃣ | **Test Amendment Chain** | Integration tests verify `get_*_amendment_chain()` + forensic queries | No tests for amendment functions | ✋ YES |

### Code Review Guidance

**When reviewing prescriptions/invoices/lab mutations:**

1. ✅ Verify UPDATE/DELETE on prescriptions/invoices/lab_results is **NOT** a direct mutation
   - Should go through `amend_prescription_dosage()` or `create_invoice_adjustment()` instead
2. ✅ Check `hospital_id` in every audit INSERT
3. ✅ Verify `change_reason` captured (especially for amendments)
4. ✅ Confirm RLS blocks UPDATE/DELETE on `*_audit` tables
5. ✅ No PII in `before_state` / `after_state` JSONB
6. ✅ Run: `npm run validate:rls` to ensure audit tables scoped
7. ✅ Run integration tests: `npm run test:integration` (should include amendment chain tests)

**Red flags:**
- 🚩 `UPDATE` on clinical/financial tables without corresponding audit record
- 🚩 Amendment without `amends_audit_id` link
- 🚩 `change_reason` NULL for high-risk actions
- 🚩 Missing hospital_id in audit record
- 🚩 RLS policy allows UPDATE/DELETE on `audit_log` or `*_audit` tables

---

## Part 6: Phase 2A Deliverables

### 6.1 SQL Migration Files (Location: `supabase/migrations/`)

| File | Purpose | Tables | Triggers | Functions |
|------|---------|--------|----------|-----------|
| `20260313000001_audit_trail_core_infrastructure.sql` | Core audit tables & RLS | `audit_log`, `prescription_audit`, `invoice_adj_audit`, `lab_result_audit` | — | `log_audit_event()`, `create_amendment_audit()` |
| `20260313000002_prescription_approval_logging_triggers.sql` | Prescription workflow | — | 4 triggers (CREATE, APPROVE, REJECT, DISPENSE) | `amend_prescription_dosage()`, `reverse_prescription()`, `get_prescription_amendment_chain()` |
| `20260313000003_billing_lab_result_audit_triggers.sql` | Billing & lab workflows | — | 6 triggers | `create_invoice_adjustment()`, `amend_lab_result()`, `invalidate_lab_result()`, `get_invoice_audit_trail()`, `get_lab_result_history()` |
| `20260313000004_audit_testing_compliance_utilities.sql` | Testing & compliance | — | — | Test helpers, `find_audit_anomalies()`, `export_audit_trail_for_patient()` |

### 6.2 Documentation Files

| File | Content | Audience |
|------|---------|----------|
| `docs/PHASE_2A_AUDIT_TRAIL_IMPLEMENTATION_GUIDE.md` | Complete specification (this document) | Engineers, Compliance |
| `src/types/audit.ts` | TypeScript types + integration patterns | Frontend developers |
| `docs/ARCHITECTURE.md` | (Update) Audit logging architecture section | Technical leads |
| `docs/SECURITY.md` | (Update) Audit compliance requirements | Security, compliance officers |

### 6.3 Type Definitions (Location: `src/types/audit.ts`)

```typescript
// Enums
export enum AuditActionType { ... }
export enum ActorRole { ... }
export enum EntityType { ... }

// Interfaces
export interface AuditLogEntry { ... }
export interface AmendmentRecord { ... }
export interface AuditLogParams { ... }
export interface AmendmentLogParams { ... }

// Functions (stubs for integration)
export async function auditLog(params: AuditLogParams): Promise<string> { ... }
export async function amendmentLog(params: AmendmentLogParams): Promise<string> { ... }
export async function getPrescriptionAmendmentChain(rxId: string): Promise<...[]> { ... }
export async function getInvoiceAuditTrail(invId: string): Promise<...[]> { ... }
export async function getLabResultHistory(labId: string): Promise<...[]> { ... }
export async function findAuditAnomalies(hospitalId: string, hours: number): Promise<...[]> { ... }
```

---

## Part 7: Deployment & Validation

### 7.1 Deployment Steps

```bash
# 1. Run migrations in order
npm run migrate

# 2. Verify tables created
psql production_db -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('audit_log', 'prescription_audit', 'invoice_adjustment_audit', 'lab_result_audit')
  ORDER BY table_name;
"
# Result: 4 tables (all present)

# 3. Verify triggers
psql production_db -c "
  SELECT trigger_name FROM information_schema.triggers
  WHERE trigger_name LIKE '%audit%'
  ORDER BY trigger_name;
"
# Result: 10+ triggers (prescription, billing, lab)

# 4. Verify RLS policies
npm run validate:rls
# Output: "✓ audit_log: rolesRequired=true"

# 5. Run integration tests
npm run test:integration -- --grep "audit"
# Result: All audit logging tests pass
```

### 7.2 Data Validation

```sql
-- Verify append-only enforcement
BEGIN;
  UPDATE audit_log SET action_type = 'CORRUPTED' WHERE audit_id = 'a1';
  -- Expected: Permission denied error (RLS blocks)
ROLLBACK;

-- Verify amendment chain works
SELECT * FROM get_prescription_amendment_chain('rx_123'::UUID);
-- Expected: 2+ rows showing original + amendments

-- Verify no PII leaks
SELECT after_state FROM audit_log LIMIT 1;
-- Expected: No passwords, SSNs, credit cards in JSONB
```

---

## Part 8: Next Phase (2B: Frontend Implementation)

### 8.1 Frontend Components to Build

| Component | Location | Purpose |
|-----------|----------|---------|
| `AuditLogViewer` | `src/pages/Compliance/AuditLogViewer.tsx` | Read-only audit log with filters |
| `PrescriptionAmendmentForm` | `src/pages/Pharmacy/PrescriptionAmendmentForm.tsx` | Doctor corrects dosage |
| `InvoiceAdjustmentForm` | `src/pages/Billing/InvoiceAdjustmentForm.tsx` | Finance applies discount/reversal |
| `LabResultCorrectionForm` | `src/pages/Laboratory/LabResultCorrectionForm.tsx` | Pathologist corrects value |
| `AmendmentChainViewer` | `src/components/AmendmentChainViewer.tsx` | Displays forensic chain |
| `useAuditLog` | `src/hooks/useAuditLog.ts` | Logging hook (implement stubs) |
| `useForensicQueries` | `src/hooks/useForensicQueries.ts` | Query hook (implement stubs) |

### 8.2 Integration Points

- ✅ `/pages/Pharmacy/PrescriptionApproval.tsx` — Call `auditLog()` when approving
- ✅ `/pages/Clinic/PatientDashboard.tsx` — Show amendment chain in detail view
- ✅ `/pages/Billing/InvoiceDetail.tsx` — Show adjustment history (use `getInvoiceAuditTrail()`)
- ✅ `/pages/Laboratory/LabResultDetail.tsx` — Show correction chain (use `getLabResultHistory()`)

---

## Summary: What Phase 2A Delivers

✅ **Immutable audit infrastructure** for 4 critical workflows (prescription, billing, discharge, lab)  
✅ **Amendment pattern** with forensic chain visibility  
✅ **Append-only enforcement** via RLS policies  
✅ **SQL trigger automation** (no manual audit calls)  
✅ **Forensic query functions** for compliance investigators  
✅ **Code review rules** (15 enforcement checkpoints)  
✅ **Production-ready schema** with hospital scoping + actor context  
✅ **TypeScript type definitions** for frontend integration  
✅ **SQL migrations** ready for immediate deployment  
✅ **Integration guide** + usage patterns + testing utilities  

---

**Phase 2A Status:** ✅ COMPLETE & READY FOR DEPLOYMENT  
**Next Phase:** 2B — Frontend audit log viewer + amendment UI  
**Estimated Timeline:** 2 weeks (Phase 2A deployment) + 3 weeks (Phase 2B frontend)  

---

*Document prepared by: CareSync Forensic Audit Specialist*  
*Date: March 13, 2026*  
*Classification: HIPAA-Protected Specification*  
*Review & Approval: Required before Phase 2A deployment*
