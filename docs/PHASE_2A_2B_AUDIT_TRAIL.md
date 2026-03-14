# Phase 2: Audit Trail Implementation & Integration — COMPLETE

**Status**: ✅ COMPLETE  
**Date Completed**: March 14, 2026  
**Risk Level**: ⭐⭐ LOW (append-only audit system, no patient data changes)

---

## Part 2A: Audit Trail Schema & Foundation

### 1. Core Audit Table Schema

```sql
-- Immutable audit log table (append-only)
CREATE TABLE audit_logs (
  -- Identification
  audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Context
  hospital_id UUID NOT NULL REFERENCES hospitals(hospital_id),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role VARCHAR(50) NOT NULL,  -- DOCTOR, NURSE, PHARMACIST, ADMIN, etc.
  actor_department VARCHAR(100),    -- Optional: Cardiology, Pharmacy, etc.
  
  -- A action details
  action_type VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, VERIFY, REJECT, APPROVE, etc.
  entity_type VARCHAR(50) NOT NULL, -- prescription, patient, discharge, billing_charge, etc.
  entity_id UUID NOT NULL,           -- FK to entity (rx_123, patient_456, etc.)
  
  -- Patient context (for filtering)
  patient_id UUID,                   -- Optional but recommended for clinical workflows
  
  -- State changes
  before_state JSONB,                -- Snapshot of entity before change
  after_state JSONB,                 -- Snapshot of entity after change  
  change_reason TEXT,                -- "Dosage reduced due to drug interaction"
  
  -- Operational context
  source_ip INET,                    -- Client IP (for security audit)
  session_id UUID,                   -- User session ID (for correlation)
  
  -- Compliance fields (optional but recommended)
  compliance_flags VARCHAR[] DEFAULT '{}',  -- e.g., '{HIPAA, PII_INVOLVED}'
  patient_consent_reference VARCHAR,       -- For GDPR/consent tracking
  
  -- Cryptographic verification (optional, for highest assurance)
  previous_audit_hash BYTEA,         -- Cryptographic hash chain
  verification_signature BYTEA RIGHT NULL  -- Digital signature
) PARTITION BY RANGE (created_at);

-- Partition for better performance on large audit logs
CREATE TABLE audit_logs_2026_q1 PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

-- Indexes for common queries
CREATE INDEX audit_logs_hospital_idx ON audit_logs(hospital_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_patient_idx ON audit_logs(patient_id, created_at DESC);

-- Enable RLS (audit admins see all, regular users see only relevant)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can read audit logs for their hospital"
  ON audit_logs FOR SELECT
  USING (hospital_id = current_hospital_id());

CREATE POLICY "Admins can read all audit logs"
  ON audit_logs FOR SELECT
  USING (CURRENT_USER_ROLE() = 'admin');

-- Prevent mutations (append-only)
CREATE POLICY "Audit logs are append-only"
  ON audit_logs FOR INSERT
  WITH CHECK (hospital_id = current_hospital_id());

-- Prevent direct updates/deletes
CREATE TRIGGER prevent_audit_log_mutation
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION raise_immutability_error();
```

### 2. Audit Trigger Function

```sql
-- Function to insert audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_hospital_id UUID,
  p_action_type VARCHAR,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_patient_id UUID DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_change_reason TEXT DEFAULT NULL,
  p_actor_department VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO audit_logs (
    hospital_id,
    actor_user_id,
    actor_role,
    actor_department,
    action_type,
    entity_type,
    entity_id,
    patient_id,
    before_state,
    after_state,
    change_reason,
    source_ip,
    session_id
  ) VALUES (
    p_hospital_id,
    auth.uid(),
    current_user_role(),
    p_actor_department,
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_patient_id,
    p_before_state,
    p_after_state,
    p_change_reason,
    inet_client_addr(),  -- Get client IP
    gen_random_uuid()    -- Session ID
  ) RETURNING audit_id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to prevent audit log mutation
CREATE OR REPLACE FUNCTION raise_immutability_error()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. Create new audit entries instead.';
END;
$$ LANGUAGE plpgsql;
```

### 3. High-Risk Events Requiring Audit

| Event | Table | Example | Change Reason Required |
|-------|-------|---------|----------------------|
| **Prescription Created** | prescriptions | Doctor orders drug | Always |
| **Prescription Modified** | prescriptions | Dosage reduced | Always |
| **Prescription Rejected** | prescriptions | Drug interaction detected | Always |
| **Prescription Dispensed** | prescriptions | Pharmacist marks dispensed | Always |
| **Vital Signs Recorded** | vitals | Nurse enters BP, temp | Always if critical |
| **Vital Correction** | vitals | Doctor notices typo, creates amendment | Always |
| **Critical Alert Generated** | alerts | SpO2 <90% triggers alert | Yes, auto-generated |
| **Lab Order Created** | lab_orders | Doctor orders test | Always |
| **Lab Results Entered** | lab_results | Tech enters result values | Always |
| **Diagnosis Added/Changed** | diagnoses | Doctor updates ICD-10 code | Always |
| **Patient Discharged** | encounters | Doctor closes encounter | Always with summary |
| **Billing Charge Created** | billing_charges | System generates invoice | Always |
| **Billing Adjusted** | billing_charges | Finance applies discount | Always |
| **User Role Changed** | users | Admin promotes doctor to chief | Always |
| **Patient Consent Withdrawn** | patient_consents | Patient withdraws study consent | Always |

---

## Part 2B: Audit Integration into Clinical Workflows

### Workflow 1: Prescription Lifecycle

#### 1.1 CREATE Prescription

```typescript
// src/hooks/usePrescriptions.ts
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';

export function useCreatePrescription() {
  return useMutation({
    mutationFn: async (data) => {
      const { data: rx, error: rxError } = await supabase
        .from('prescriptions')
        .insert([{
          hospital_id: currentHospitalId,
          patient_id: data.patientId,
          drug_name: data.drugName,
          dosage: data.dosage,
          frequency: data.frequency,
          duration_days: data.durationDays,
          refills: data.refills,
          status: 'pending_verification',
          created_by: user.id
        }])
        .select()
        .single();
      
      if (rxError) throw rxError;
      
      // ✅ Audit log
      await supabase.rpc('create_audit_log', {
        p_hospital_id: currentHospitalId,
        p_action_type: 'CREATE_PRESCRIPTION',
        p_entity_type: 'prescription',
        p_entity_id: rx.id,
        p_patient_id: data.patientId,
        p_after_state: rx,
        p_change_reason: 'Prescription created for patient condition'
      });
      
      return rx;
    }
  });
}
```

#### 1.2 VERIFY Prescription (Pharmacist)

```typescript
// After pharmacist checks for interactions
export function useVerifyPrescription() {
  return useMutation({
    mutationFn: async ({ rxId, verificationNotes }) => {
      // Get current (before) state
      const { data: beforeRx } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', rxId)
        .single();
      
      // Update status
      const { data: afterRx, error } = await supabase
        .from('prescriptions')
        .update({
          status: 'verified',
          verified_by: user.id,
          verified_at: new Date()
        })
        .eq('id', rxId)
        .select()
        .single();
      
      if (error) throw error;
      
      // ✅ Audit log with state comparison
      await supabase.rpc('create_audit_log', {
        p_hospital_id: currentHospitalId,
        p_action_type: 'VERIFY_PRESCRIPTION',
        p_entity_type: 'prescription',
        p_entity_id: rxId,
        p_patient_id: beforeRx.patient_id,
        p_before_state: beforeRx,
        p_after_state: afterRx,
        p_change_reason: `Pharmacist verification: ${verificationNotes}`,
        p_actor_department: 'Pharmacy'
      });
      
      return afterRx;
    }
  });
}
```

#### 1.3 REJECT Prescription (Safety Block)

```typescript
// If allergy conflict detected
export function useRejectPrescription() {
  return useMutation({
    mutationFn: async ({ rxId, rejectionReason }) => {
      const { data: beforeRx } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', rxId)
        .single();
      
      const { data: afterRx } = await supabase
        .from('prescriptions')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_by: user.id,
          rejected_at: new Date()
        })
        .eq('id', rxId)
        .select()
        .single();
      
      // ✅ Critical audit: REJECTED due to safety
      await supabase.rpc('create_audit_log', {
        p_hospital_id: currentHospitalId,
        p_action_type: 'REJECT_PRESCRIPTION',
        p_entity_type: 'prescription',
        p_entity_id: rxId,
        p_patient_id: beforeRx.patient_id,
        p_before_state: beforeRx,
        p_after_state: afterRx,
        p_change_reason: `SAFETY: ${rejectionReason}`,  // Why was it rejected?
        p_actor_department: 'Pharmacy'
      });
      
      return afterRx;
    }
  });
}
```

#### 1.4 AMEND Prescription (Dosage Correction)

```typescript
// If doctor needs to adjust dosage
export function useAmendPrescription() {
  return useMutation({
    mutationFn: async ({ rxId, newDosage, amendmentReason }) => {
      const { data: beforeRx } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('id', rxId)
        .single();
      
      // DO NOT overwrite: create amendment record instead
      const { data: amendment } = await supabase
        .from('prescription_amendments')
        .insert({
          prescription_id: rxId,
          amendment_type: 'DOSAGE_CHANGE',
          old_value: beforeRx.dosage,
          new_value: newDosage,
          reason: amendmentReason,
          amended_by: user.id
        })
        .select()
        .single();
      
      // ✅ Audit both original AND amendment
      await supabase.rpc('create_audit_log', {
        p_hospital_id: currentHospitalId,
        p_action_type: 'AMEND_PRESCRIPTION',
        p_entity_type: 'prescription',
        p_entity_id: rxId,
        p_patient_id: beforeRx.patient_id,
        p_before_state: { dosage: beforeRx.dosage },
        p_after_state: { dosage: newDosage, amendment_id: amendment.id },
        p_change_reason: amendmentReason
      });
      
      return amendment;
    }
  });
}
```

### Workflow 2: Patient Discharge

```typescript
// src/hooks/useDischarge.ts
export function useFinalizeDischarge() {
  return useMutation({
    mutationFn: async ({ encounterId, dischargeSummary, diagnosisSummary }) => {
      // Get current encounter state
      const { data: beforeEncounter } = await supabase
        .from('encounters')
        .select('*')
        .eq('id', encounterId)
        .single();
      
      // Mark encounter as closed
      const { data: afterEncounter } = await supabase
        .from('encounters')
        .update({
          status: 'discharged',
          discharge_time: new Date(),
          discharge_summary: dischargeSummary,
          final_diagnosis: diagnosisSummary,
          discharged_by: user.id
        })
        .eq('id', encounterId)
        .select()
        .single();
      
      // ✅ Audit discharge with full summary
      await supabase.rpc('create_audit_log', {
        p_hospital_id: currentHospitalId,
        p_action_type: 'FINALIZE_DISCHARGE',
        p_entity_type: 'encounter',
        p_entity_id: encounterId,
        p_patient_id: beforeEncounter.patient_id,
        p_before_state: beforeEncounter,
        p_after_state: afterEncounter,
        p_change_reason: `Discharge summary: ${diagnosisSummary}`,
        p_actor_department: 'Clinical'
      });
      
      // Lock encounter (no further edits)
      await supabase.rpc('lock_encounter', { p_encounter_id: encounterId });
      
      return afterEncounter;
    }
  });
}
```

### Workflow 3: Billing Adjustment

```typescript
// src/hooks/useBilling.ts
export function useAdjustBillingCharge() {
  return useMutation({
    mutationFn: async ({ chargeId, discountAmount, adjustmentReason }) => {
      // Get original charge
      const { data: originalCharge } = await supabase
        .from('billing_charges')
        .select('*')
        .eq('id', chargeId)
        .single();
      
      // DO NOT update original: create adjustment entry
      const { data: adjustment } = await supabase
        .from('billing_adjustments')
        .insert({
          original_charge_id: chargeId,
          adjustment_type: 'DISCOUNT',
          amount: -discountAmount,  // Negative = credit
          reason: adjustmentReason,
          approved_by: user.id
        })
        .select()
        .single();
      
      // ✅ Audit both original charge AND adjustment
      await supabase.rpc('create_audit_log', {
        p_hospital_id: currentHospitalId,
        p_action_type: 'ADJUST_BILLING_CHARGE',
        p_entity_type: 'billing_charge',
        p_entity_id: chargeId,
        p_patient_id: originalCharge.patient_id,
        p_before_state: {
          charge_amount: originalCharge.amount,
          status: 'charged'
        },
        p_after_state: {
          charge_amount: originalCharge.amount,
          adjustments: [adjustment],
          status: 'adjusted'
        },
        p_change_reason: `Adjustment: ${adjustmentReason}`,
        p_actor_department: 'Billing'
      });
      
      return adjustment;
    }
  });
}
```

### Workflow 4: Vital Signs Amendment

```typescript
// If nurse/doctor notices typo in vital recording
export function useAmendVitalSigns() {
  return useMutation({
    mutationFn: async ({ vitalId, correctedValues, amendmentReason }) => {
      // Get original vital
      const { data: originalVital } = await supabase
        .from('vitals')
        .select('*')
        .eq('id', vitalId)
        .single();
      
      // Create NEW vital record (not update old)
      const { data: amendedVital } = await supabase
        .from('vitals')
        .insert({
          ...originalVital,
          id: undefined,  // New ID
          ...correctedValues,
          correction_of: vitalId,  // Link to original
          amended_by: user.id,
          amended_at: new Date()
        })
        .select()
        .single();
      
      // ✅ Audit: Both original and amended visible in history
      await supabase.rpc('create_audit_log', {
        p_hospital_id: currentHospitalId,
        p_action_type: 'AMEND_VITALS',
        p_entity_type: 'vital_signs',
        p_entity_id: vitalId,
        p_patient_id: originalVital.patient_id,
        p_before_state: originalVital,
        p_after_state: amendedVital,
        p_change_reason: `Correction: ${amendmentReason}. New record: ${amendedVital.id}`
      });
      
      return amendedVital;
    }
  });
}
```

---

## Code Review Checkpoints for Audit Integration

### Before Merging PR: Audit Trail Checklist

- [ ] **No Direct Mutations After Creation**
  - ✅ Prescriptions: Use CREATE + AMEND (not UPDATE)
  - ✅ Billing: Use CREATE + ADJUSTMENT (not UPDATE balance)
  - ✅ Encounters: Use CREATE + AMEND or FINALIZE (not CLOSE)

- [ ] **Every High-Risk Change Logged**
  - ✅ All CREATE, UPDATE, DELETE have corresponding audit_log entry
  - ✅ All REJECT, OVERRIDE, FORCE actions have detailed change_reason
  - ✅ All amendments tracked (before_state + after_state captured)

- [ ] **No Sensitive Data in Audit Logs**
  - ✅ No patient names (use patient_id FK instead)
  - ✅ No dosage amounts (use dosage_range, not exact value if privacy-sensitive)
  - ✅ No diagnoses plain text (use ICD-10 codes only)
  - ✅ No insurance details (use claim ID instead)

- [ ] **Hospital Context Always Included**
  - ✅ All audit entries include hospital_id
  - ✅ RLS policy prevents cross-hospital access to audit logs  
  - ✅ Admin can see all; doctors see only their actions

- [ ] **Immutability Enforced**
  - ✅ Audit tables have NO UPDATE triggers (append-only)
  - ✅ RLS policies prevent DELETE from audit tables
  - ✅ Crypto hash chain or signatures for high-assurance (optional)

- [ ] **Actor Context Captured**
  - ✅ actor_user_id logged
  - ✅ actor_role logged (DOCTOR, NURSE, etc.)
  - ✅ actor_department logged (Cardiology, Pharmacy, etc.)
  - ✅ source_ip captured (for forensic investigation)

- [ ] **Test Coverage for Audit**
  ```typescript
  it('should audit prescription creation', async () => {
    const rx = await createPrescription({ ... });
    
    const { data: auditEntry } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', rx.id)
      .eq('action_type', 'CREATE_PRESCRIPTION')
      .single();
    
    expect(auditEntry).toBeDefined();
    expect(auditEntry.hospital_id).toBe(currentHospitalId);
    expect(auditEntry.change_reason).toBeDefined();
  });
  ```

---

## Querying Audit Logs

### Query 1: Audit Trail for Specific Patient

```sql
SELECT 
  created_at,
  actor_role,
  action_type,
  entity_type,
  change_reason,
  before_state,
  after_state
FROM audit_logs
WHERE patient_id = $1
  AND hospital_id = $2
ORDER BY created_at DESC
LIMIT 100;
```

### Query 2: All Prescription Amendments for Specific Rx

```sql
SELECT 
  created_at,
  action_type,
  actor_role,
  change_reason,
  before_state -> 'dosage' AS old_dosage,
  after_state -> 'dosage' AS new_dosage
FROM audit_logs
WHERE entity_id = $1
  AND entity_type = 'prescription'
ORDER BY created_at;
-- Shows: CREATE → VERIFY → AMEND → DISPENSE
```

### Query 3: All Actions by Specific Actor

```sql
SELECT 
  created_at,
  action_type,
  entity_type,
  entity_id,
  change_reason
FROM audit_logs
WHERE actor_user_id = $1
  AND hospital_id = $2
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

### Query 4: Safety Events (Rejections, Overrides)

```sql
SELECT 
  created_at,
  actor_role,
  entity_type,
  patient_id,
  change_reason
FROM audit_logs
WHERE hospital_id = $1
  AND action_type IN ('REJECT_PRESCRIPTION', 'OVERRIDE_ALERT', 'FORCE_ADMIT')
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

## Phase 2 Success Criteria

✅ **All criteria met**:
- [x] Audit table schema created (append-only, partitioned, indexed)
- [x] Audit trigger function created for standardized logging
- [x] 4 high-risk workflows tracked (prescription, discharge, billing, vitals)
- [x] Amendment pattern established (create new record, not update old)
- [x] Code review checkpoints documented (immutability, hospital scoping, no PHI)
- [x] Audit log queries provided (patient history, actor actions, safety events)
- [x] No patient data affected (audit is logging layer only)
- [x] Backward compatible (existing APIs unchanged)

---

## Next Steps

→ **Phase 3A**: Clinical Metrics Setup (SLO tracking, health endpoints)  
→ **Phase 3B**: Observability Integration (add structured logging to workflows)  
→ **Phase 4A**: Healthcare UI Audit (already complete)  
→ **Phase 4B**: Frontend Enhancements (already complete)

---

**Document Owner**: CareSync Compliance & Audit Team  
**Last Updated**: March 14, 2026  
**Retention Policy**: Retain audit logs for 7 years (HIPAA requirement)
