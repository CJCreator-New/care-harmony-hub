# TIER 4 — Clinical Workflow Polish: Implementation Plan

**Status:** Planning (Pre-Implementation Domain Review)  
**Date:** April 18, 2026  
**Total Effort:** 50 hours across 5 items  
**Owner:** GitHub Copilot + Domain Expert Review  
**Dependency:** Tier 1-3 complete ✅  
**Risk Level:** 🔴 HIGH (Clinical workflows — patient safety critical)

---

## 📋 HIMS Clinical Domain Review — Tier 4 Overview

**Clinical Priority Assessment:**

| Item | Clinical Risk | Patient Safety Impact | Workflow Complexity | 
|------|---------------|----------------------|-------------------|
| 4.1 Discharge | 🟠 Medium | Moderate (wrong discharge state) | High (multi-role approval) |
| 4.2 Lab Notification | 🔴 HIGH | Critical (delayed critical results) | High (real-time alerting) |
| 4.3 Optimistic Locking | 🟠 Medium | Moderate (concurrent edit conflicts) | Low (DB-level logic) |
| 4.4 Critical Lab Alerts | 🔴 HIGH | Critical (life-threatening values) | High (auto-page, escalation) |
| 4.5 Drug Interaction | 🔴 HIGH | Critical (adverse events, death) | Medium (external API integration) |

**Recommended Implementation Sequence:**
1. **4.3 Optimistic Locking** (8h) — Foundation for safe concurrent editing
2. **4.1 Discharge Workflow** (12h) — Core workflow pattern, lower safety risk
3. **4.5 Drug Interaction** (9h) — Critical but well-bounded external integration
4. **4.2 Lab Notification** (10h) — Real-time alerting, requires lab context from 4.4
5. **4.4 Critical Lab Alerts** (10h) — Highest complexity, ties into 4.2

**Why this sequence?**
- Start with foundational (4.3) to prevent concurrent edit bugs
- Move to workflow pattern (4.1) before more complex workflows
- Drug interactions (4.5) is safer than lab notifications (4.2)
- Lab alerts (4.4) depend on understanding lab workflows from 4.2

---

## 4.1: Discharge Workflow State Machine (12 hours)

### Clinical Domain Analysis

**Discharge Safety Invariants:**
1. **Patient must be admitted before discharge** — Impossible state: discharged without admission record
2. **All clinical tasks must be complete** — Discharge cannot proceed if labs pending, imaging pending, consults outstanding
3. **Medication reconciliation required** — Doctor must verify all medications; pharmacist must verify; patient must sign
4. **Financial clearance required** — Billing must verify insurance claims settled, copay collected
5. **Discharge summary must be written** — Cannot discharge without clinical summary document

**Age-Specific Considerations:**
- **Pediatric patients (< 18 years):** Parent/guardian must sign discharge consent
- **Mental health holds (involuntary):** Legal authority required to discharge
- **Substance abuse:** May have mandatory follow-up requirements

**High-Risk Scenarios:**
- ❌ Doctor marks "discharged" but meds not picked up (patient leaves with wrong meds)
- ❌ Financial clearance skipped due to "ready to go" urgency (hospital loss)
- ❌ Medication reconciliation not finalized (patient takes wrong dose at home)
- ✅ Proper state machine prevents all of above

### Workflow Specification

```
## Workflow: Patient Discharge

**Trigger**: Doctor clicks "Mark Ready for Discharge" button
**Roles involved**: 
  - Doctor: initiates, writes summary, signs off
  - Nurse: verifies clinical completeness, collects vital signs
  - Pharmacist: reconciles medications
  - Billing: verifies payment/insurance
  - Receptionist: final checkout, print discharge paperwork

**States**: pending_review → clinical_cleared → med_reconciled → financial_cleared → discharged → finalized

**Steps**:
1. Doctor: Write discharge summary + click "Request Discharge" → Status = pending_clinical_review
   - Audit: logActivity(actionType: 'discharge_initiated', details: {discharge_summary_id})
2. Nurse: Review readiness checklist:
   - [ ] All labs/imaging completed
   - [ ] All consults finalized
   - [ ] Vitals stable (HR, BP, SpO2, RR in normal range for patient)
   - [ ] Pain controlled
   - Click "Clinical Clear" → Status = clinical_cleared
   - Audit: logActivity(actionType: 'discharge_clinical_cleared')
3. Pharmacist: Medication reconciliation:
   - [ ] Verify all current medications
   - [ ] Compare with admission medications (identify stopped/changed)
   - [ ] Check drug interactions (via RxNorm API — see 4.5)
   - [ ] Print medication list for patient
   - Click "Medications Reconciled" → Status = med_reconciled
   - Audit: logActivity(actionType: 'discharge_meds_reconciled')
4. Billing: Financial verification:
   - [ ] Insurance verified/approved
   - [ ] Outstanding balance collected
   - [ ] Discharge clearance from financial system
   - Click "Financial OK" → Status = financial_cleared
   - Audit: logActivity(actionType: 'discharge_financial_cleared')
5. Receptionist: Final checkout:
   - [ ] Print discharge paperwork + summaries
   - [ ] Have patient/guardian sign discharge form
   - [ ] Provide appointment follow-up info
   - Click "Discharge Complete" → Status = discharged
   - Audit: logActivity(actionType: 'discharge_completed')
6. System: Auto-finalize after 24hr or manual:
   - Update admission record: {discharge_at: now(), discharge_type: 'home'}
   - Archive discharge record
   - Send to billing/EMR
   - Status = finalized
   - Audit: logActivity(actionType: 'discharge_finalized')

**Terminal states**: discharged, cancelled

**Rollback logic**: If any step fails:
  - Doctor can cancel with "Discharge Cancelled" → Status reverts to pending_review
  - Reason logged: {reason, cancelled_by, timestamp}

**Notifications**:
  - Step 1→2: Notify nurses room is pending discharge review
  - Step 2→3: Notify pharmacist discharge approved
  - Step 3→4: Notify billing discharge ready for financial check
  - Step 4→5: Notify receptionist patient ready for checkout
  - Step 5: Email patient follow-up instructions

**Audit events**: All steps logged with logActivity() + timestamps
```

### DB Schema

```sql
-- Discharge workflows state machine
CREATE TABLE public.discharge_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  initiated_by UUID NOT NULL REFERENCES profiles(id),
  
  -- State machine
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'clinical_cleared', 'med_reconciled', 
                       'financial_cleared', 'discharged', 'finalized', 'cancelled')),
  current_step INTEGER NOT NULL DEFAULT 1,
  
  -- Clinical data
  discharge_summary TEXT,
  discharge_summary_signed_by UUID REFERENCES profiles(id),
  discharge_summary_signed_at TIMESTAMPTZ,
  
  -- Clinical clearance
  clinical_cleared_by UUID REFERENCES profiles(id),
  clinical_cleared_at TIMESTAMPTZ,
  
  -- Med reconciliation
  medications_reconciled_by UUID REFERENCES profiles(id),
  medications_reconciled_at TIMESTAMPTZ,
  
  -- Financial clearance
  financial_cleared_by UUID REFERENCES profiles(id),
  financial_cleared_at TIMESTAMPTZ,
  
  -- Final checkout
  discharged_by UUID REFERENCES profiles(id),
  discharged_at TIMESTAMPTZ,
  patient_signature_collected_at TIMESTAMPTZ,
  
  -- Follow-up
  followup_appointment_id UUID REFERENCES appointments(id),
  followup_instructions TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policy — hospital-scoped read/update
ALTER TABLE public.discharge_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY discharge_workflows_hospital_scope ON public.discharge_workflows
  USING (hospital_id = (SELECT hospital_id FROM auth.jwt() WHERE role = 'authenticated' LIMIT 1));

-- Indexes for performance
CREATE INDEX idx_discharge_workflows_hospital_admission 
  ON public.discharge_workflows(hospital_id, admission_id);
CREATE INDEX idx_discharge_workflows_status 
  ON public.discharge_workflows(hospital_id, status);
CREATE INDEX idx_discharge_workflows_patient 
  ON public.discharge_workflows(hospital_id, patient_id);

-- Updated_at trigger
CREATE TRIGGER discharge_workflows_update_timestamp 
BEFORE UPDATE ON public.discharge_workflows
FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);
```

### Edge Function: `discharge-workflow`

```typescript
// supabase/functions/discharge-workflow/index.ts
// Orchestrates discharge state transitions with role-based validation

export const allowedTransitions: Record<string, string[]> = {
  pending_review: ['clinical_cleared', 'cancelled'],
  clinical_cleared: ['med_reconciled', 'pending_review'],
  med_reconciled: ['financial_cleared', 'pending_review'],
  financial_cleared: ['discharged', 'pending_review'],
  discharged: ['finalized'],
  finalized: [],
  cancelled: [],
};

export const roleActions: Record<string, string[]> = {
  doctor: ['pending_review', 'clinical_cleared', 'cancelled'],
  nurse: ['clinical_cleared', 'pending_review'],
  pharmacist: ['med_reconciled'],
  billing_staff: ['financial_cleared'],
  receptionist: ['discharged'],
  admin: ['finalized', 'cancelled'],
};

// Server-side role check + state validation
// Sends audit log + realtime notification on every transition
```

### React Hook & Component

```typescript
// src/hooks/useDischargeWorkflow.ts
export function useDischargeWorkflow(admissionId: string) {
  const { discharge, isLoading, error, advanceStep } = useDischargeWorkflow(admissionId);
  
  // Real-time subscription to workflow changes
  // Renders multi-step form with role-based fields
  // Each step shows checklist items before "Clear" button appears
}

// src/components/discharge/DischargeForm.tsx
// Multi-step form showing:
// Step 1: Doctor discharge summary
// Step 2: Nurse clinical readiness checklist
// Step 3: Pharmacist med reconciliation
// Step 4: Billing financial verification
// Step 5: Receptionist final checkout
```

---

## 4.2: Lab-Result Notification Workflow (10 hours)

### Clinical Domain Analysis

**Lab Result Criticality Levels:**

| Level | Response Time | Action | Example |
|-------|---|--------|---------|
| 🔴 Critical | **Immediate** (< 5 min) | Auto-page ordering doctor + ER | K+ < 2.5 (cardiac risk), Glucose > 600 |
| 🟠 Urgent | < 30 min | In-app alert + SMS | WBC > 25k (infection), Hb < 7 (severe anemia) |
| 🟡 High | < 2 hr | In-app notification | Elevated creatinine, abnormal ECG |
| 🟢 Normal | Same day | Routine email | Routine chemistry, normal pathology |

**Clinical Safety Invariants:**
1. **Critical values must auto-notify** — No human delay between lab validation and notification
2. **Doctor must acknowledge critical result** — Cannot auto-close; requires explicit action
3. **Patient consent must be verified** — Before sending any patient-visible result
4. **Follow-up must be trackable** — What actions did doctor take after critical lab?
5. **All notifications must be audited** — Who notified whom, when, via what channel

**High-Risk Scenarios:**
- ❌ Critical lab result sits in inbox, doctor doesn't check (patient deteriorates at home)
- ❌ Patient sees result before doctor (panic, self-harm, inappropriate self-treatment)
- ❌ Critical value threshold misconfigured (false positives OR missed critical values)
- ❌ On-call doctor not receiving notifications (escalation breaks)
- ✅ Proper state machine + auto-escalation prevents all

### Workflow Specification (CRITICAL WORKFLOWS — See 4.4 for integration)

```
## Workflow: Lab Result Notification

**Trigger**: Lab technician submits result in lab system
**Roles involved**:
  - Lab Tech: Submits result, validates QC
  - Lab Supervisor: Approves for release
  - Ordering Doctor: Reviews + acts
  - On-Call Doctor: Escalation if ordering doctor unavailable
  - Patient: Receives patient-safe summary

**Critical Path**:
1. Lab Tech: Enter result → Auto-QC validation
2. Lab Supervisor: Review result against reference ranges → Flag if critical
3. IF CRITICAL (from critical lab ranges table):
   - Auto-page ordering doctor (SMS + in-app)
   - 5-minute timeout: if no ack → page on-call
   - 15-minute timeout: if no ack → page ER
4. Ordering Doctor: Review + take action (order imaging, medication, admission, etc.)
5. IF patient consent verified: Send patient-safe notification via patient portal
6. System: Archive result, mark notification sent in audit log

**Audit requirements**: 
- Who submitted result + when
- Lab validation + when
- Who received notification + when + acknowledgement
- Who acted on result + what action
- Who viewed result (doctor, patient, etc.) + when
```

### Integration with 4.4 (Critical Lab Alerts)

Items 4.2 and 4.4 are **tightly coupled**:
- **4.2** handles "lab result entered, who notifies and how"
- **4.4** handles "what are critical ranges, escalation, auto-paging"

They share: `lab_critical_ranges` table, notification logic, escalation rules

---

## 4.3: Optimistic Locking on Prescriptions (8 hours)

### Clinical Domain Analysis

**Prescription Edit Conflicts — Race Conditions:**

**Scenario 1: Pharmacist filling + Doctor changing dose simultaneously**
```
13:00:00 Doctor loads Rx (version=1): Amoxicillin 500mg
13:00:05 Pharmacist loads Rx (version=1): Amoxicillin 500mg
13:00:10 Doctor edits to 1000mg (allergy update found) → UPDATE WHERE version=1 → ✅ version becomes 2
13:00:12 Pharmacist tries to mark "dispensed" → UPDATE WHERE version=1 → ❌ CONFLICT (version=2 now)
          Should NOT silently use old dose (500mg)!
          Pharmacist must re-fetch and reconcile changes
```

**Without optimistic locking:**
- Pharmacist's "dispensed" status overwrites doctor's dose change
- Patient gets 500mg but records show 1000mg
- **Adverse event possible** — dosage mismatch

**With optimistic locking:**
- Conflict detected at DB level
- Pharmacist must re-check prescription before proceeding
- **Safe** — forces human reconciliation

### Implementation Pattern

```sql
-- Add version column to prescriptions
ALTER TABLE prescriptions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Conflict detection on update
UPDATE prescriptions 
SET 
  dose = $1, 
  version = version + 1, 
  updated_at = now()
WHERE id = $2 AND version = $3  -- $3 is client's current version
RETURNING *;

-- If UPDATE returns 0 rows → version conflict occurred
-- Client must:
-- 1. Re-fetch current prescription (version N)
-- 2. Show doctor current dose + pharmacist changes
-- 3. Ask user to merge/reconcile
-- 4. Retry with new version number
```

### React Hook

```typescript
export function usePrescriptionOptimisticLock(prescriptionId: string) {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [conflictError, setConflictError] = useState<ConflictError | null>(null);

  const updatePrescription = useCallback(async (updates: Partial<Prescription>) => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .update({ ...updates, version: prescription!.version + 1 })
        .eq('id', prescriptionId)
        .eq('version', prescription!.version)  // Optimistic lock check
        .select()
        .single();

      if (error?.code === 'NO_ROWS_AFFECTED') {
        // Version conflict — re-fetch and show merge UI
        const { data: current } = await supabase
          .from('prescriptions')
          .select()
          .eq('id', prescriptionId)
          .single();
        
        setConflictError({
          type: 'version_conflict',
          currentVersion: current?.version,
          yourVersion: prescription?.version,
          message: 'Prescription was modified by someone else. Review and retry.',
        });
        return;
      }

      setPrescription(data);
      setConflictError(null);
    } catch (err) {
      toast.error('Failed to update prescription');
    }
  }, [prescription, prescriptionId]);

  return { prescription, updatePrescription, conflictError };
}
```

---

## 4.4: Critical Lab Value Alert System (10 hours)

### Clinical Domain Analysis — CRITICAL SAFETY

**Reference Range Management:**

Lab values vary by:
- **Age group** (neonatal/infant/child/adult/elderly have different normals)
- **Gender** (Hb, ferritin differ; pregnancy state)
- **Lab method** (different analyzers have different calibrations)
- **Units** (mg/dL vs mmol/L — must standardize)

**Critical Value Examples** (ICU alert thresholds):
```
Glucose: < 40 mg/dL OR > 500 mg/dL → Neuro emergency
K+:      < 2.5 mEq/L OR > 6.5 mEq/L → Cardiac arrhythmia risk
Na+:     < 120 OR > 160 mEq/L → Neuro emergency (seizures, coma)
Hb:      < 5 g/dL OR > 20 g/dL → Oxygen crisis
pO2:     < 50 mmHg → Severe hypoxemia
RBC: < 1.5 × 10^6/µL → Transfusion needed
WBC: < 1.0 or > 40 × 10^3/µL → Immune emergency
pH: < 6.8 or > 7.8 → Severe acidosis/alkalosis
```

**Age-Specific Critical Values:**
```
Neonates (0-28 days):
- Glucose: < 30 or > 150 (different than adults due to brain metabolism)
- Hb: < 10 (normal for neonate; not "critical" by adult standards)

Pediatric (1-18 years):
- Age-stratified reference ranges for everything
- Medication doses differ dramatically

Elderly (> 75 years):
- Renal function decline (eGFR < 30 = critical)
- Dehydration thresholds lower
```

### DB Schema: Critical Ranges & Escalation

```sql
CREATE TABLE public.lab_critical_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  
  -- Lab test definition
  loinc_code TEXT NOT NULL,  -- e.g. "2345-7" for glucose
  lab_name TEXT NOT NULL,    -- e.g. "Glucose"
  unit TEXT NOT NULL,        -- e.g. "mg/dL"
  
  -- Age-stratified critical ranges
  age_group TEXT NOT NULL    -- 'neonatal' | 'infant' | 'child' | 'adult' | 'elderly'
    CHECK (age_group IN ('neonatal', 'infant', 'child', 'adult', 'elderly')),
  age_min_days INTEGER,      -- Minimum age (in days) for this group
  age_max_days INTEGER,      -- Maximum age
  
  -- Critical value thresholds
  critical_low NUMERIC,
  critical_high NUMERIC,
  warning_low NUMERIC,
  warning_high NUMERIC,
  
  -- Notification settings
  notification_recipients TEXT[] DEFAULT ARRAY['ordering_doctor', 'on_call'],
  escalation_enabled BOOLEAN DEFAULT TRUE,
  escalation_delay_sec INTEGER DEFAULT 300, -- 5 minutes
  escalation_target TEXT DEFAULT 'er_charge_nurse',  -- If doctor doesn't ack
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit trail for critical alerts
CREATE TABLE public.lab_critical_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  lab_result_id UUID NOT NULL REFERENCES lab_results(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  
  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('critical', 'urgent', 'high')),
  alert_value NUMERIC NOT NULL,
  critical_range_id UUID REFERENCES lab_critical_ranges(id),
  
  -- Notifications
  ordering_doctor_notified_at TIMESTAMPTZ,
  ordering_doctor_acknowledged_at TIMESTAMPTZ,
  ordering_doctor_acknowledged_by UUID REFERENCES profiles(id),
  
  on_call_notified_at TIMESTAMPTZ,
  on_call_acknowledged_at TIMESTAMPTZ,
  on_call_acknowledged_by UUID REFERENCES profiles(id),
  
  -- Escalation
  escalated_to_er_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Follow-up action
  action_taken TEXT,  -- e.g. 'imaging_ordered', 'medication_prescribed', 'admission'
  action_taken_by UUID REFERENCES profiles(id),
  action_taken_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_lab_critical_alerts_patient 
  ON public.lab_critical_alerts(hospital_id, patient_id);
CREATE INDEX idx_lab_critical_alerts_unacknowledged
  ON public.lab_critical_alerts(hospital_id, ordering_doctor_acknowledged_at)
  WHERE ordering_doctor_acknowledged_at IS NULL;
```

### Edge Function: Auto-Escalation

```typescript
// supabase/functions/critical-lab-alert/index.ts

// On lab result insert:
// 1. Check against critical ranges (age-specific)
// 2. If critical: Auto-create alert + notifications
// 3. Auto-page ordering doctor (SMS + in-app)
// 4. 5-min timer: If no ack → page on-call
// 5. 15-min timer: If still no ack → alert ER charge nurse
// 6. Log every step to lab_critical_alerts table
```

---

## 4.5: Drug Interaction Check in Prescription Flow (9 hours)

### Clinical Domain Analysis — CRITICAL SAFETY

**Drug Interaction Severity & Examples:**

| Severity | Example | Clinical Risk | Action |
|----------|---------|---|------|
| 🔴 **Contraindicated** | ACE inhibitor + Potassium supplement | Hyperkalemia → cardiac arrest | **BLOCK** prescribing |
| 🔴 **Major** | Warfarin + NSAIDs | Severe bleeding | **WARN** + require override reason |
| 🟠 **Moderate** | Simvastatin + Clarithromycin | Myopathy, rhabdo | **WARN** + monitoring recommend |
| 🟡 **Minor** | Metformin + Contrast dye | Lactic acidosis risk | **INFO** only |

**Age/Renal/Hepatic Adjustments:**
- Elderly (age > 75): Many drugs accumulate (reduced clearance)
- Renal failure (eGFR < 30): Aminoglycosides, NSAIDs contraindicated
- Pregnancy: Teratogenic drugs must be blocked (ACE inhibitors, tetracyclines, etc.)
- Breastfeeding: Passes to infant (radiocontrast, lithium contraindicated)

**High-Risk Scenarios:**
- ❌ Prescriber unaware of patient's home medications (pharmacy fills separately)
- ❌ Duplicate therapy (patient on two statins simultaneously)
- ❌ Missed renal/hepatic adjustment (toxic drug accumulation)
- ❌ Contraindicated drug-disease interaction (NSAIDs in heart failure)
- ✅ Real-time DUR check prevents all

### Integration Points

**Data Source Options:**
1. **RxNorm API** (free, US-focused, limited interactions)
2. **DrugBank** (offline DB, comprehensive, requires licensing)
3. **Micromedex** (commercial, most comprehensive, high cost)

**Recommendation for MVP:** Use **RxNorm API** for MVP phase

### DB Schema: Interaction Cache

```sql
-- Cache interaction checks to avoid repeated API calls
CREATE TABLE public.drug_interaction_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Drug pair (normalized to canonical RxCUI codes)
  drug1_rxcui TEXT NOT NULL,
  drug2_rxcui TEXT NOT NULL,
  
  -- Interaction details (from RxNorm API)
  severity TEXT CHECK (severity IN ('contraindicated', 'major', 'moderate', 'minor')),
  description TEXT,
  mechanism TEXT,
  management_recommendation TEXT,
  
  -- Cache TTL (refresh every 90 days)
  cached_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '90 days',
  
  PRIMARY KEY (drug1_rxcui, drug2_rxcui)
);

-- Prescription history for interaction checks
CREATE TABLE public.prescription_interaction_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  
  -- What was checked
  checked_at TIMESTAMPTZ DEFAULT now(),
  current_medications JSONB,  -- List of active drugs at check time
  new_drug_rxcui TEXT,
  
  -- Results
  interactions_found TEXT[] DEFAULT ARRAY[]::TEXT[],
  highest_severity TEXT,
  recommended_action TEXT,
  
  -- Physician override
  overridden BOOLEAN DEFAULT FALSE,
  override_reason TEXT,
  override_by UUID REFERENCES profiles(id),
  override_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Edge Function: DUR Check

```typescript
// supabase/functions/check-drug-interactions/index.ts

// On prescription create:
// 1. Get patient's active medications (from prescriptions table)
// 2. For each active drug, check against new drug via RxNorm API
// 3. Check for:
//    - Contraindications (block immediately)
//    - Major interactions (warn, require override)
//    - Renal/hepatic adjustments (based on eGFR, LFTs)
//    - Pregnancy/breastfeeding conflicts
// 4. Return interaction summary
// 5. If major/contraindicated: UI shows warning + requires "Override reason"
// 6. Log override to prescription_interaction_checks for audit
```

### React Component: Drug Interaction Warning

```typescript
// src/components/prescription/DrugInteractionChecker.tsx

export function DrugInteractionChecker({ prescription }: Props) {
  const [interactions, setInteractions] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [canPrescribe, setCanPrescribe] = useState(true);

  // On drug selected → check interactions
  // Show:
  // - Green ✓ if no interactions
  // - Yellow ⚠️ if minor/moderate (allow prescribe)
  // - Red 🔴 if major (warn) or contraindicated (block)
  // - Require override reason for major interactions
}
```

---

## 📊 Tier 4 Implementation Roadmap

**Phase 1: Foundation (Week 1)**
- [ ] 4.3: Optimistic Locking (8h) — DB + hook
- [ ] Create `lab_critical_ranges` table for 4.4 and 4.5

**Phase 2: Workflows (Weeks 2-3)**
- [ ] 4.1: Discharge Workflow (12h) — Full multi-role flow
- [ ] 4.5: Drug Interactions (9h) — RxNorm integration + cache

**Phase 3: Alerting (Weeks 4)**
- [ ] 4.2: Lab Notifications (10h) — Integrates with 4.4
- [ ] 4.4: Critical Lab Alerts (10h) — Auto-escalation + paging

**Total:** 5 weeks = 50 hours

---

## ✅ Clinical Safety Checklist (Before ANY Implementation)

### Domain Expert Sign-Off Required

- [ ] **Reference Range Accuracy**
  - [ ] Critical values per item 4.4 reviewed by pathologist/lab director
  - [ ] Age-stratified ranges verified for pediatric/neonatal
  - [ ] Unit conversions verified (mg/dL vs mmol/L)

- [ ] **Workflow State Machines** (items 4.1, 4.2, 4.4)
  - [ ] No impossible states (discharge before admission, etc.)
  - [ ] Terminal states unreachable from each other
  - [ ] Rollback scenarios identified and tested
  - [ ] Role permissions: server-side validation (not just client)

- [ ] **Drug Interactions** (item 4.5)
  - [ ] RxNorm/DrugBank data source approved by pharmacy director
  - [ ] Contraindicated list matches institutional policy
  - [ ] Pregnancy/renal/hepatic adjustments comprehensive
  - [ ] Override audit trail complete (who, when, why)

- [ ] **Encryption & PHI**
  - [ ] All prescription data encrypted (via useHIPAACompliance)
  - [ ] Interaction logs don't leak medication history
  - [ ] Audit trails include only necessary details (not full drug names in some contexts)

- [ ] **Compliance & Licensing**
  - [ ] Drug interaction data licensed appropriately (RxNorm vs commercial)
  - [ ] Critical value definitions comply with CLIA standards
  - [ ] Discharge workflows match CMS discharge planning requirements

---

## 📝 Next Steps (User Decision Required)

**Option 1: Proceed with Implementation**
```bash
# Start with 4.3 (foundational, lowest risk)
# Then move to 4.1, 4.5, 4.2, 4.4 in sequence
```

**Option 2: Request Clinical Expert Review First**
```
Use runSubagent with hims-domain-expert skill to:
- Validate reference ranges
- Verify workflow invariants
- Confirm drug interaction data source
- Review critical safety scenarios
```

**Recommendation:** ⚠️ **Request clinical expert review for items 4.2, 4.4, 4.5** (critical values, alerting, drug interactions) before implementation. Item 4.3 can proceed immediately (DB pattern, lower risk).

---

**Document Status:** Planning Complete  
**Ready for:** User decision on clinical review vs immediate implementation  
**Last Updated:** April 18, 2026
