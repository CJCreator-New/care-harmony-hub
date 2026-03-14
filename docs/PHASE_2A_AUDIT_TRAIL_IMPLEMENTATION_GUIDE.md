# CareSync Phase 2A: Audit Trail & Forensic Implementation Guide

## Part 1: Critical Workflows Requiring Immutable Audit Trails

### 1.1 Prescription Workflow ✓ HIGH-RISK
- **Events to audit:** CREATE, VERIFY, APPROVE, REJECT, DISPENSE, AMEND, REVERSAL, HOLD
- **Why immutable:** Doctor prescriptions are medico-legal documents. Amendment history proves intent & safety protocols.
- **Violation example:** Pharmacist edits approval time without audit = liability exposure.
- **Audit table:** `prescription_audit` (tracks all dosage changes, approval chains, rejections)

### 1.2 Discharge Workflow ✓ HIGH-RISK
- **Events to audit:** INITIATE, REVIEW (nurse), SIGN (doctor, legal signature), FINAL_BILL, CLOSE
- **Why immutable:** Discharge is the terminal event; improper closure hides clinical gaps.
- **Violation example:** Patient leaves hospital prematurely without nursing sign-off = patient safety risk.
- **Current status:** `discharge_workflows` + `discharge_workflow_audit` already in schema (reviewed in Phase 1B)

### 1.3 Billing Workflow ✓ HIGH-RISK (Financial Fraud Prevention)
- **Events to audit:** CHARGE_CREATED, PAYMENT_RECEIVED, ADJUSTMENT, DISCOUNT_APPLIED, REVERSAL, WRITE_OFF, RECONCILED
- **Why immutable:** Invoice adjustments are financial mutations: discounts, refunds, write-offs require non-repudiation.
- **Violation example:** Finance staff creates payment record then deletes it = embezzlement risk.
- **Audit table:** `invoice_adjustment_audit` (every $ change with actor, reason, before/after totals)

### 1.4 Lab Result Workflow ✓ HIGH-RISK (Clinical Safety)
- **Events to audit:** CREATED, VERIFIED, AMENDED, CORRECTED, INVALIDATED
- **Why immutable:** Lab results drive diagnosis/treatment decisions. Editing results retroactively hides errors.
- **Violation example:** Pathologist changes lab value 125→95 without amendment record = hide data error.
- **Audit table:** `lab_result_audit` (value corrections use amendment pattern, originals remain)

### 1.5 Access Control Changes ✓ MEDIUM-RISK
- **Events to audit:** Role assignment, hospital scoping change, permission grant/revoke
- **Why immutable:** Access to patient data is regulated. Track "who can see what" changes.
- **Use table:** `audit_log` (general-purpose: actor_role changes)

### 1.6 Consent Management ✓ MEDIUM-RISK
- **Events to audit:** Consent granted, consent withdrawn, GDPR deletion request
- **Why immutable:** Patient consent is medico-legal. Overwriting consent = privacy violation.
- **Use table:** `audit_log` (with patient_id: tracks consent state changes)

---

## Part 2: Production-Ready Audit Table Schema

### 2.1 Core Design Principles

✅ **Append-Only**: No UPDATE/DELETE after creation (RLS policies enforce)  
✅ **Immutable Snapshots**: `before_state` & `after_state` as full JSONB  
✅ **Hospital-Scoped**: Every audit row includes `hospital_id` (multi-tenant isolation)  
✅ **Actor Context**: `actor_user_id`, `actor_role` always captured  
✅ **Forensic-Grade**: Timestamps (UTC), session tracking, IP logging  
✅ **Amendment Pattern**: Corrections create NEW records, link via `amends_audit_id`  
✅ **Change Justification**: `change_reason` required for high-risk actions  

### 2.2 Schema Reference: `prescription_audit`

```sql
CREATE TABLE public.prescription_audit (
  audit_id UUID PRIMARY KEY,              -- Unique forensic record
  event_time TIMESTAMPTZ NOT NULL,        -- When (UTC)
  hospital_id UUID NOT NULL,              -- Which hospital (scoping)
  patient_id UUID NOT NULL,               -- Which patient
  prescription_id UUID NOT NULL,          -- Which prescription
  
  actor_user_id UUID NOT NULL,            -- Who (doctor, pharmacist, etc.)
  actor_role TEXT NOT NULL,               -- Doctor, Pharmacist, Admin
  
  action_type TEXT NOT NULL,              -- CREATE, APPROVE, REJECT, AMEND, REVERSAL
  change_reason TEXT,                     -- Why (required for amendments)
  
  -- State snapshots for forensic recovery
  before_state JSONB,                     -- Previous state
  after_state JSONB,                      -- New state
  
  -- Key fields for quick filtering
  dosage_before TEXT,                     -- "500mg BID"
  dosage_after TEXT,                      -- "250mg BID"
  quantity_before INTEGER,                -- Stock count before
  quantity_after INTEGER,                 -- Stock count after
  
  -- Amendment linkage (for corrections)
  amends_audit_id UUID REFERENCES prescription_audit(audit_id),
  amendment_justification TEXT,           -- Why corrected
  
  -- Network & session tracking
  source_ip INET,                         -- Forensic: Where from
  session_id TEXT,                        -- Forensic: User session
  
  -- Immutability
  hash_chain TEXT,                        -- Future: Cryptographic proof
  created_at TIMESTAMPTZ NOT NULL
);

-- RLS: Append-only enforcement
-- No UPDATE or DELETE allowed (RLS policies block)
-- SELECT/INSERT allowed for hospital staff
```

### 2.3 Schema Reference: `invoice_adjustment_audit`

```sql
CREATE TABLE public.invoice_adjustment_audit (
  audit_id UUID PRIMARY KEY,
  event_time TIMESTAMPTZ NOT NULL,
  
  hospital_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  invoice_id UUID NOT NULL,
  
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL,               -- billing, accountant, admin
  
  action_type TEXT NOT NULL,              -- CHARGE_CREATED, ADJUSTMENT, DISCOUNT_APPLIED, REVERSAL, WRITE_OFF
  change_reason TEXT NOT NULL,            -- "Insurance negotiation", "Billing error correction"
  
  -- Financial snapshots
  amount_change NUMERIC(10,2),            -- Delta: +1000 or -50
  subtotal_before NUMERIC(10,2),
  subtotal_after NUMERIC(10,2),
  tax_before NUMERIC(10,2),
  tax_after NUMERIC(10,2),
  total_before NUMERIC(10,2),            -- "$1000.00"
  total_after NUMERIC(10,2),             -- "$950.00"
  
  before_state JSONB,
  after_state JSONB,
  
  amends_audit_id UUID REFERENCES invoice_adjustment_audit(audit_id),
  
  source_ip INET,
  session_id TEXT,
  hash_chain TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- Key: NEVER UPDATE invoice.total directly.
--      Always create NEW adjustment_audit row.
-- Example: Invoice $1000 → $950 discount
--   → old approach (BANNED): UPDATE invoices SET total=950
--   → new approach:          INSERT INTO invoice_adjustment_audit (...) with before/after
```

### 2.4 Amendment Pattern (Example: Dosage Correction)

**Scenario:** Doctor prescribed "500mg BID", pharmacist questions dosage. Doctor confirms it should be "250mg BID" (reduces quantity by half).

**FORBIDDEN approach:**
```sql
-- DON'T DO THIS
UPDATE prescriptions SET dosage = '250mg BID' WHERE id = 'rx_123';
-- ❌ Original dosage hidden; no forensic trail; audit trail lost
```

**CORRECT approach:**
```sql
-- DO THIS
-- Step 1: Keep original prescription unchanged
-- Step 2: Create amendment audit record
SELECT public.amend_prescription_dosage(
  p_prescription_id := 'rx_123'::UUID,
  p_old_dosage := '500mg BID',
  p_new_dosage := '250mg BID',
  p_amendment_reason := 'Pharmacist safety review: reduced to minimize drug interaction risk',
  p_amending_doctor_id := auth.uid()
);

-- Result: 2 audit records now exist
-- 1. Original APPROVE: "APPROVE ... 500mg BID ..."
-- 2. Amendment:        "AMEND ... 500mg BID → 250mg BID [reason] [amends_audit_id=1]"

-- Query to see full chain:
SELECT * FROM public.get_prescription_amendment_chain('rx_123'::UUID);
-- Returns:
--   seq  | audit_id | event_time | actor_role | action_type | dosage_before | dosage_after | reason
--   ---- | -------- | ---------- | ---------- | ----------- | ------------- | ------------ | ------
--   1    | a1       | 2026-03-13 | pharmacist | APPROVE     | NULL          | 500mg BID    | "Approved after interaction check"
--   2    | a2       | 2026-03-13 | doctor     | AMEND       | 500mg BID     | 250mg BID    | "Pharmacist review: reduced to minimize drug interaction..."
```

---

## Part 3: Prescription Approval Logging (SQL Example)

### 3.1 Trigger: Auto-log prescription approvals

When a pharmacist approves a prescription:

```sql
-- Pharmacist approves prescription via application
-- Application sets audit context:
SELECT public.set_audit_context(
  p_change_reason := 'Approved after interaction check',
  p_rejection_reason := NULL
);

-- Then updates prescription status
UPDATE public.prescriptions
SET status = 'approved'
WHERE id = 'rx_123'
  AND hospital_id = auth.hospital_id();

-- ↓ This triggers the audit logging automatically ↓

-- TRIGGER fires: public.log_prescription_approval()
-- Logs INSERT to prescription_audit:
-- {
--   "audit_id": "b42d1f94-...",
--   "event_time": "2026-03-13T14:23:45.123Z",
--   "hospital_id": "hosp_001",
--   "patient_id": "pat_089",
--   "prescription_id": "rx_123",
--   "actor_user_id": "user_456",
--   "actor_role": "pharmacist",
--   "action_type": "APPROVE",
--   "change_reason": "Approved after interaction check",
--   "before_state": {"status": "pending", "notes": "Check for interactions"},
--   "after_state": {"status": "approved", "notes": "Check for interactions"},
--   "source_ip": "203.0.113.42",
--   "session_id": "sess_abc123",
--   "created_at": "2026-03-13T14:23:45.123Z"
-- }
```

### 3.2 Forensic Query: "Who approved this prescription and when?"

```sql
-- As compliance officer: audit trail for prescription rx_123
SELECT 
  pa.audit_id,
  pa.event_time,
  p.email AS pharmacist_email,
  pa.actor_role,
  pa.action_type,
  pa.change_reason,
  pa.source_ip,
  pa.before_state ->> 'status' AS old_status,
  pa.after_state ->> 'status' AS new_status
FROM public.prescription_audit pa
LEFT JOIN public.profiles p ON pa.actor_user_id = p.id
WHERE pa.prescription_id = 'rx_123'::UUID
ORDER BY pa.event_time;

-- Result:
-- audit_id | event_time | pharmacist_email | actor_role | action_type | change_reason | source_ip | old_status | new_status
-- -------- | ---------- | ---------------- | ---------- | ----------- | ------------- | --------- | ---------- | ----------
-- a1       | 2026-03-13 | doc@hosp.com     | doctor     | CREATE      | New Rx        | 203...42  | NULL       | pending
-- a2       | 2026-03-13 | anna@pharm.com   | pharmacist | APPROVE     | Interaction.. | 203...42  | pending    | approved
```

---

## Part 4: Amendment Pattern (Dosage Correction Example)

### 4.1 Scenario

Doctor enters "500mg BID" (twice daily). After review, realizes it should be "250mg BID" to avoid drug interaction with current medications.

### 4.2 Standard (Append-Only) Process

```sql
-- Step 1: Doctor corrects dosage
SELECT public.amend_prescription_dosage(
  p_prescription_id := 'rx_123'::UUID,
  p_old_dosage := '500mg BID',
  p_new_dosage := '250mg BID',
  p_amendment_reason := 'Interaction with metformin identified; reduced dose per pharmacist recommendation',
  p_amending_doctor_id := auth.uid()  -- Doctor making correction
);
-- Returns: new_audit_id (e.g., 'b42d2f94-...')

-- Step 2: Verify amendment chain (forensic view)
SELECT * FROM public.get_prescription_amendment_chain('rx_123'::UUID);

-- Result:
-- seq | audit_id | event_time | actor_email | action_type | dosage_before | dosage_after | change_reason | amendment_justification
-- --- | -------- | ---------- | ----------- | ----------- | ------------- | ------------ | ------------- | -----------------------
-- 1   | a1       | 2026-03-... | john@doc... | CREATE      | NULL          | 500mg BID    | New Rx        | (null)
-- 2   | a2       | 2026-03-... | anna@ph... | APPROVE     | NULL          | 500mg BID    | Verified      | (null)
-- 3   | a3       | 2026-03-... | john@doc... | AMEND       | 500mg BID     | 250mg BID    | Dosage..      | Interaction with metformin...
```

### 4.3 Key Design Points

✅ **Original prescription unchanged** — still shows 500mg (in prescriptions table)
✅ **Amendment creates NEW audit entry** — linked via `amends_audit_id` → original audit (a2)
✅ **Full chain visible** — compliance officer sees: CREATE (250) → APPROVE → AMEND (250)→correction
✅ **No data loss** — original value + amendment reason preserved forever
✅ **Immutable** — RLS policies prevent UPDATE/DELETE of audit entries

---

## Part 5: Code Review Checkpoints (10+ Enforcement Rules)

### **CRITICAL: Apply these rules to every PR touching audit-sensitive code**

| # | Checkpoint | Rule | Violation Example | Action |
|---|-----------|------|------------------|--------|
| 1 | **No Direct Mutations** | Prescription/Invoice/LabResult changes must audit, not UPDATE | `UPDATE prescriptions SET status = 'amended'` without audit insert | REJECT PR |
| 2 | **Hospital Scoping** | Every audit row + clinical mutation must include `hospital_id` | `INSERT INTO invoice_adjustment_audit (...) -- missing hospital_id` | REJECT PR |
| 3 | **Change Reason Required** | High-risk actions (AMEND, REVERSE, DISCOUNT) require `change_reason` | `UPDATE invoices SET total = 950` without reason | REJECT PR |
| 4 | **Actor Context** | Audit must include `actor_user_id` + `actor_role` | Audit log missing actor_role | REJECT PR |
| 5 | **No PII in Audit** | Never log passwords, SSN, credit card, patient notes in audit payloads | `after_state: {password: 'abc123'}` | REJECT PR |
| 6 | **Amendment Link** | Corrections must reference original via `amends_audit_id`, not overwrite | `UPDATE prescriptions SET dosage = NEW` | REJECT PR |
| 7 | **Append-Only Enforcement** | RLS policies must block UPDATE/DELETE on audit tables | Missing policy or policy allows UPDATE | REJECT PR |
| 8 | **Timestamp Consistency** | Audit timestamps immutable, UTC only | `event_time` stored in local time | REJECT PR |
| 9 | **Session Tracking** | High-risk mutations must capture `session_id` + `source_ip` | Approve trigger missing source_ip population | REJECT PR |
| 10 | **Before/After Snapshots** | State mutations must capture full `before_state` & `after_state` JSONB | Discarding original values, only storing new | REJECT PR |
| 11 | **Forensic Indexing** | Audit tables must have indexes on (entity_id, event_time), (actor_user_id), (hospital_id, event_time) | Missing index on prescription_audit(prescription_id, event_time) | REJECT PR |
| 12 | **Role-Based Visibility** | Audit logs visible via RLS to staff in same hospital, not cross-hospital | Audit policy allows SELECT without hospital check | REJECT PR |
| 13 | **Hash Chain** | Prescription/Billing/Lab audit rows must include `hash_chain` field (reserved for cryptographic signatures) | Field missing; cannot add crypto verification later | REJECT PR |
| 14 | **Trigger Idempotency** | Audit triggers must be idempotent (safe if called twice) | Trigger increments counter or relies on side effects | REJECT PR |
| 15 | **Testing: Amendment Chain** | Every repository must test `amend_*` function + query chain | No tests for `get_prescription_amendment_chain()` | REJECT PR |

---

## Part 6: Implementation Checklist for Phase 2A

### Phase 2A: Core Audit Infrastructure

- [ ] **Migration 1**: Deploy core audit tables (`audit_log`, `prescription_audit`, `invoice_adjustment_audit`, `lab_result_audit`)
  - Run: `npm run migrate` (applies all .sql files in chronological order)
  - Verify: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('audit_log', 'prescription_audit', ...)`

- [ ] **Migration 2**: Deploy triggers for prescription lifecycle (CREATE, APPROVE, REJECT, DISPENSE)
  - Verify: `\df log_prescription_*` shows 4 trigger functions

- [ ] **Migration 3**: Deploy triggers for billing adjustments & payments
  - Verify: `SELECT COUNT(*) FROM invoice_adjustment_audit` (should be empty pre-test)

- [ ] **Migration 4**: Deploy lab result audit triggers
  - Verify: Triggers appear in system catalog

- [ ] **Add to RLS Validator** (`scripts/validate-rls.mjs`)
  - Ensure audit tables scoped by hospital_id
  - Confirm RLS policies block UPDATE/DELETE on audit tables

- [ ] **Frontend: Audit Log Viewer** (Read-Only)
  - Component: `src/pages/Compliance/AuditLogViewer.tsx`
  - Filters: Hospital, date range, entity type (prescription/invoice/lab), actor role
  - Display: `audit_log_summary` view with sorted columns

### Phase 2B: Amendment UI + Forensic Workflows

- [ ] **Prescription Amendment UI**
  - Form: Doctor corrects dosage with reason
  - Backend: Call `amend_prescription_dosage()` function
  - Show: Amendment chain in prescription detail view

- [ ] **Invoice Adjustment UI**
  - Form: Finance manager applies discount/reversal with justification
  - Backend: Call `create_invoice_adjustment()` function
  - Show: Full adjustment chain before/after amounts

- [ ] **Lab Result Correction**
  - Form: Pathologist corrects value with reason
  - Backend: Call `amend_lab_result()` function

- [ ] **Forensic Queries Dashboard**
  - Display: `get_prescription_amendment_chain()`, `get_invoice_audit_trail()`, `get_lab_result_history()`
  - Export: CSV/PDF for regulatory requests

---

## Part 7: Example: Full Prescription Workflow with Audit

### Scenario: Patient Admits to Hospital, Doctor Prescribes Antibiotics

#### 1. Doctor creates prescription

```javascript
// frontend: Prescription form submitted
const prescriptionData = {
  patient_id: 'pat_089',
  medication_name: 'Amoxicillin',
  dosage: '500mg BID',
  duration: '7 days',
  quantity: 14
};

// backend: INSERT prescription
const { data: prescription, error } = await supabase
  .from('prescriptions')
  .insert([prescriptionData]);

// ↓ Trigger fires: log_prescription_creation()
// ↓ INSERT to prescription_audit: action_type='CREATE'
```

#### 2. Pharmacist reviews & verifies interaction

```javascript
// frontend: Pharmacist view
// Check: Does patient have drug allergies? LactoseIntolerant? Concurrent meds?

// Result: No interactions found, safe to approve
const approvalData = {
  status: 'approved',
  notes: 'Interaction check passed'
};

// backend: SET audit context + update
await supabase.rpc('set_audit_context', {
  p_change_reason: 'Approved after interaction check',
  p_rejection_reason: null
});

await supabase
  .from('prescriptions')
  .update(approvalData)
  .eq('id', prescription.id);

// ↓ Trigger fires: log_prescription_approval()
// ↓ INSERT to prescription_audit: action_type='APPROVE'
```

#### 3. (Later) Doctor realizes 500mg is too high

```javascript
// Doctor reviews chart, notices patient has renal impairment
// Email to pharmacist: "Please reduce to 250mg BID"

// backend: Amendment
const amendmentId = await supabase.rpc('amend_prescription_dosage', {
  p_prescription_id: prescription.id,
  p_old_dosage: '500mg BID',
  p_new_dosage: '250mg BID',
  p_amendment_reason: 'Patient has Stage 2 CKD; reduced dose per renal function guidelines',
  p_amending_doctor_id: auth.uid()
});

// ↓ Function inserts to prescription_audit: action_type='AMEND'
// ↓ Links to original APPROVE record via amends_audit_id
// ↓ Updates prescription status to 'amended'
```

#### 4. Compliance officer audits (18 months later)

```sql
-- Regulatory request: "Show all amendments to prescriptions Jan-March 2026"
SELECT 
  p.patient_name,
  pa.prescription_id,
  pa.actor_email,
  pa.action_type,
  pa.event_time,
  pa.dosage_before,
  pa.dosage_after,
  pa.change_reason
FROM prescription_audit pa
LEFT JOIN patients p ON pa.patient_id = p.id
LEFT JOIN profiles pr ON pa.actor_user_id = pr.id
WHERE pa.hospital_id = 'hosp_001'
  AND pa.event_time >= '2026-01-01'
  AND pa.event_time < '2026-04-01'
  AND pa.amends_audit_id IS NOT NULL  -- Only amendments
ORDER BY pa.event_time;
```

---

## Part 8: Deployment Validation Checklist

Before Phase 2A is marked complete:

- [ ] All 3 migration files deployed successfully
- [ ] No syntax errors in triggers/functions
- [ ] RLS policies confirmed: audit tables are append-only
- [ ] At least 1 integration test confirms audit logging triggers
- [ ] Forensic query functions tested (return expected amendment chains)
- [ ] Code review team briefed on 15 checkpoint rules above
- [ ] Documentation updated in ARCHITECTURE.md + SECURITY.md
- [ ] Metrics: Track audit rows inserted per hour (expect spike during initial load)

---

## Summary: What Phase 2A Delivers

✅ **Immutable audit infrastructure** for 4 critical workflows (prescription, discharge, billing, lab)  
✅ **Amendment pattern** with forensic chain visibility (corrections don't erase originals)  
✅ **Append-only enforcement** via RLS (no UPDATE/DELETE on audit tables)  
✅ **SQL trigger automation** (no need to manually audit every change)  
✅ **Forensic query functions** (compliance officers query full amendment chains)  
✅ **Code review rules** (15 checkpoints to prevent audit bypass)  
✅ **Production-ready schema** with hospital scoping + actor context  

Next phase (2B): Frontend audit log viewer, amendment UI, forensic dashboards.

---

*Document Author: CareSync Forensic Audit Specialist*  
*Date: March 13, 2026*  
*Phase: 2A — Audit Trail Core Infrastructure*
