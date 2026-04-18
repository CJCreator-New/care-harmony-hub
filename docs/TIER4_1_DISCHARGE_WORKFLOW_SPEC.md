# TIER 4.1 IMPLEMENTATION PLAN — Patient Discharge Workflow

**Status:** Planning Phase  
**Estimated Duration:** 12 hours  
**Owner:** GitHub Copilot  
**Using:** workflow-creator skill, hims-domain-expert skill

---

## Executive Summary

Implement a **multi-role discharge workflow** that guides patients through 6 coordinated steps: clinical clearance → medication reconciliation → financial clearance → discharge → checkout. Each step requires sign-off from specific roles (doctor, nurse, pharmacist, billing) with real-time notifications and state machine enforcement.

**Clinical Safety Invariants:**
- ✅ Discharge cannot complete until all clinical tasks are done
- ✅ Outstanding medications must be reconciled before discharge
- ✅ Financial obligations reviewed before checkout
- ✅ Every role change is audit-logged for compliance
- ✅ No step can be skipped or bypassed (enforced server-side)

---

## Workflow Specification

### Workflow: Patient Discharge

**Trigger:** Doctor clicks "Mark Ready for Discharge" button on admission detail page  
**Roles Involved:**
- Doctor: Initiates discharge, performs clinical clearance
- Nurse: Confirms clinical tasks, vitals stable
- Pharmacist: Reconciles discharge medications
- Billing: Reviews outstanding balance, generates invoice
- Receptionist: Conducts checkout, files discharge paperwork

**Steps:**
```
1. [Doctor] Mark For Discharge → status: pending_review, step: 1
2. [Doctor] Clinical Clearance → status: clinical_cleared, step: 2
3. [Nurse] Confirm Clinical Tasks → status: nurse_confirmed, step: 3
4. [Pharmacist] Medication Reconciliation → status: med_reconciled, step: 4
5. [Billing] Financial Review → status: financial_cleared, step: 5
6. [Receptionist] Checkout & Paperwork → status: discharged, step: 6
7. [Receptionist] Mark Complete → status: finalized, step: 7 [TERMINAL]

Cancellation Path:
- [Doctor/Nurse] Cancel Discharge → status: cancelled, reason: <text>
```

**Terminal States:**
- `finalized` — Discharge fully complete, patient checked out, all tasks done
- `cancelled` — Discharge aborted, patient returned to active admission

**Notifications:**
- Step 1→2: Real-time alert to Doctor (UI refresh)
- Step 2→3: Notification sent to Nurse (in-app + optional Slack)
- Step 3→4: Notification sent to Pharmacist (in-app + optional Slack)
- Step 4→5: Notification sent to Billing (in-app + optional Slack)
- Step 5→6: Notification sent to Receptionist (in-app + optional Slack)
- Step 6→7: Admission marked `discharged_completed`, audit event logged

**Audit Events:**
- `discharge_initiated` — Doctor starts process
- `discharge_clinical_cleared` — Doctor clears clinically
- `discharge_nurse_confirmed` — Nurse confirms stable
- `discharge_med_reconciled` — Pharmacist reconciles meds
- `discharge_financial_cleared` — Billing approves
- `discharge_checkout_completed` — Receptionist completes
- `discharge_finalized` — Workflow complete
- `discharge_cancelled` — Workflow abandoned, reason captured

---

## Domain Expert Review: Clinical Safety Invariants

### 1. Clinical Clearance Requirements (Step 2)

**Doctor must verify:**
- [ ] Patient is clinically stable (vital signs normal)
- [ ] No outstanding clinical interventions pending
- [ ] Allergy/contraindication reconciliation complete
- [ ] Any active infections/complications resolved or managed outpatient

**Clinical Validation Rules:**
```
IF patient's last_observation(vital_signs) > 2 hours ago:
  WARN: "Vital signs stale — recent vitals required before discharge clearance"
  
IF patient has status = 'isolation' or 'precaution':
  REQUIRE: confirmation that discharge setting supports precautions
  
IF patient has active_allergies with severity = 'severe':
  REQUIRE: doctor to explicitly acknowledge in discharge notes
```

### 2. Medication Reconciliation (Step 4)

**Pharmacist must verify:**
- [ ] All inpatient meds reviewed and documented as "continue", "discontinue", or "changed"
- [ ] Discharge prescription matches hospital formulary + patient insurance
- [ ] Dosage adjustments appropriate for discharge setting (e.g., IV → oral equivalents)
- [ ] Drug interactions checked (no concurrent use of conflicting meds) — uses Item 4.5
- [ ] Quantity appropriate for outpatient duration (typically 30 days)

**Pharmacy Validation Rules:**
```
IF discharge_prescription is IV formulation:
  REQUIRE: pharmacist to convert to oral equivalent with documented rationale
  
IF patient age < 2 years and discharge_medication in geriatric_doses:
  ALERT: "Pediatric patient — verify dose is age-appropriate"
  
IF hospital_formulary does NOT include discharge_medication:
  REQUIRE: pharmacist to note alternative + reason for substitution
```

### 3. Financial Clearance (Step 5)

**Billing must verify:**
- [ ] Outstanding balance reviewed and either paid or payment plan arranged
- [ ] Insurance pre-authorization obtained if needed for discharge setting
- [ ] Post-discharge copay instructions provided
- [ ] Discharge codes entered into billing system (diagnosis, procedures, dispo)

**Billing Validation Rules:**
```
IF admission_balance > 0:
  REQUIRE: billing to either receive payment or create payment plan
  ALLOW: discharge_blocked = true if no payment arrangement

IF insurance_plan requires_prior_auth for discharge_setting (e.g., skilled nursing):
  REQUIRE: prior auth obtained OR patient assumes financial responsibility
```

### 4. Checkout Requirements (Step 6)

**Receptionist must verify:**
- [ ] Patient has discharge paperwork (summary, meds, follow-up appts)
- [ ] Patient acknowledges understanding of discharge instructions
- [ ] Transportation arranged if needed
- [ ] Follow-up appointments scheduled (primary care, specialist if indicated)
- [ ] Patient contact info updated for post-discharge follow-up

**Checkout Validation Rules:**
```
IF discharge_destination = 'facility' (SNF, rehab):
  REQUIRE: facility acceptance confirmed + patient transport arranged

IF patient age >= 65 AND no_followup_scheduled:
  ALERT: "Recommend scheduling post-discharge geriatric assessment"
  
IF patient lives alone AND requires_assistance:
  WARN: "Consider home health or outpatient support services"
```

---

## Database Schema

### Table: discharge_workflows

```sql
CREATE TABLE public.discharge_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE RESTRICT,
  admission_id UUID NOT NULL REFERENCES admissions(id) ON DELETE RESTRICT,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  
  -- Workflow state
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN (
      'pending_review',
      'clinical_cleared',
      'nurse_confirmed',
      'med_reconciled',
      'financial_cleared',
      'discharged',
      'finalized',
      'cancelled'
    )),
  current_step INTEGER NOT NULL DEFAULT 1,
  cancellation_reason TEXT,
  
  -- Step-specific data (JSONB for flexibility)
  clinical_notes JSONB DEFAULT '{}',
  medication_reconciliation JSONB DEFAULT '{}',
  financial_details JSONB DEFAULT '{}',
  checkout_details JSONB DEFAULT '{}',
  
  -- Signoffs (track who approved each step)
  doctor_clearance_by UUID REFERENCES profiles(id),
  doctor_clearance_at TIMESTAMPTZ,
  nurse_confirmed_by UUID REFERENCES profiles(id),
  nurse_confirmed_at TIMESTAMPTZ,
  pharmacist_reconciliation_by UUID REFERENCES profiles(id),
  pharmacist_reconciliation_at TIMESTAMPTZ,
  billing_clearance_by UUID REFERENCES profiles(id),
  billing_clearance_at TIMESTAMPTZ,
  receptionist_checkout_by UUID REFERENCES profiles(id),
  receptionist_checkout_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_discharge_workflows_admission ON discharge_workflows(admission_id);
CREATE INDEX idx_discharge_workflows_hospital ON discharge_workflows(hospital_id);
CREATE INDEX idx_discharge_workflows_status ON discharge_workflows(status);
CREATE INDEX idx_discharge_workflows_patient ON discharge_workflows(patient_id);

-- Row-level security
ALTER TABLE public.discharge_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discharge_workflows_hospital_scope" ON public.discharge_workflows
  FOR SELECT USING (
    hospital_id = (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "discharge_workflows_insert" ON public.discharge_workflows
  FOR INSERT WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()) AND
    auth.uid() IN (
      SELECT user_id FROM user_roles 
      WHERE role IN ('doctor', 'admin')
    )
  );

CREATE POLICY "discharge_workflows_update" ON public.discharge_workflows
  FOR UPDATE USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

-- Auto-update timestamp
CREATE TRIGGER discharge_workflows_update_timestamp
  BEFORE UPDATE ON discharge_workflows
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Audit log trigger
CREATE OR REPLACE FUNCTION log_discharge_workflow_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    action_type,
    resource_type,
    resource_id,
    performed_by,
    hospital_id,
    details
  ) VALUES (
    'discharge_workflow_' || NEW.status,
    'discharge_workflow',
    NEW.id,
    auth.uid(),
    NEW.hospital_id,
    jsonb_build_object(
      'previous_status', OLD.status,
      'new_status', NEW.status,
      'current_step', NEW.current_step,
      'cancellation_reason', NEW.cancellation_reason
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER discharge_workflows_audit_log
  AFTER UPDATE ON discharge_workflows
  FOR EACH ROW
  EXECUTE FUNCTION log_discharge_workflow_change();
```

### Table: discharge_workflow_tasks (Optional for granular checklist)

```sql
CREATE TABLE public.discharge_workflow_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discharge_workflow_id UUID NOT NULL REFERENCES discharge_workflows(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  task_category TEXT NOT NULL CHECK (task_category IN ('clinical', 'medication', 'financial', 'checkout')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'na')),
  assigned_to UUID REFERENCES profiles(id),
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_discharge_workflow_tasks_workflow ON discharge_workflow_tasks(discharge_workflow_id);
CREATE INDEX idx_discharge_workflow_tasks_status ON discharge_workflow_tasks(status);
```

---

## Edge Function: Orchestrator

**File:** `supabase/functions/discharge-workflow/index.ts`

**Purpose:** Handle state transitions with role validation and audit logging

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DischargeAction {
  workflowId: string;
  action: string; // 'clinical_clear', 'nurse_confirm', 'med_reconcile', etc.
  actorId: string;
  notes?: string;
  details?: Record<string, any>;
}

// State machine definition
const TRANSITIONS: Record<string, Record<string, { newStatus: string; newStep: number }>> = {
  'pending_review': {
    'clinical_clear': { newStatus: 'clinical_cleared', newStep: 2 },
    'cancel': { newStatus: 'cancelled', newStep: 0 },
  },
  'clinical_cleared': {
    'nurse_confirm': { newStatus: 'nurse_confirmed', newStep: 3 },
    'cancel': { newStatus: 'cancelled', newStep: 0 },
  },
  'nurse_confirmed': {
    'med_reconcile': { newStatus: 'med_reconciled', newStep: 4 },
    'cancel': { newStatus: 'cancelled', newStep: 0 },
  },
  'med_reconciled': {
    'financial_clear': { newStatus: 'financial_cleared', newStep: 5 },
    'cancel': { newStatus: 'cancelled', newStep: 0 },
  },
  'financial_cleared': {
    'checkout': { newStatus: 'discharged', newStep: 6 },
    'cancel': { newStatus: 'cancelled', newStep: 0 },
  },
  'discharged': {
    'finalize': { newStatus: 'finalized', newStep: 7 },
    'cancel': { newStatus: 'cancelled', newStep: 0 },
  },
};

// Role permissions for each action
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'clinical_clear': ['doctor', 'admin'],
  'nurse_confirm': ['nurse', 'admin'],
  'med_reconcile': ['pharmacist', 'admin'],
  'financial_clear': ['billing', 'admin'],
  'checkout': ['receptionist', 'admin'],
  'finalize': ['receptionist', 'admin'],
  'cancel': ['doctor', 'nurse', 'admin'],
};

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { workflowId, action, actorId, notes, details } = await req.json() as DischargeAction;

    if (!workflowId || !action || !actorId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    // 1. Fetch workflow
    const { data: workflow, error: fetchError } = await supabase
      .from('discharge_workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (fetchError || !workflow) {
      return new Response(
        JSON.stringify({ error: 'Workflow not found' }),
        { status: 404 }
      );
    }

    // 2. Validate state transition
    const transitions = TRANSITIONS[workflow.status];
    if (!transitions || !transitions[action]) {
      return new Response(
        JSON.stringify({
          error: `Invalid transition: ${workflow.status} -[${action}]-> ?`,
          currentStatus: workflow.status,
        }),
        { status: 400 }
      );
    }

    // 3. Fetch actor's role (server-side validation)
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', actorId)
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'User role not found' }),
        { status: 403 }
      );
    }

    // 4. Check role permission
    const allowedRoles = ROLE_PERMISSIONS[action];
    if (!allowedRoles.includes(userRole.role)) {
      return new Response(
        JSON.stringify({
          error: `Forbidden: ${userRole.role} cannot perform ${action}`,
          requiredRoles: allowedRoles,
        }),
        { status: 403 }
      );
    }

    // 5. Apply state transition
    const { newStatus, newStep } = transitions[action];
    const updateData: Record<string, any> = {
      status: newStatus,
      current_step: newStep,
    };

    // Track who performed each step
    if (action === 'clinical_clear') {
      updateData.doctor_clearance_by = actorId;
      updateData.doctor_clearance_at = new Date().toISOString();
      updateData.clinical_notes = {
        ...workflow.clinical_notes,
        cleared_at: new Date().toISOString(),
        notes,
      };
    } else if (action === 'nurse_confirm') {
      updateData.nurse_confirmed_by = actorId;
      updateData.nurse_confirmed_at = new Date().toISOString();
    } else if (action === 'med_reconcile') {
      updateData.pharmacist_reconciliation_by = actorId;
      updateData.pharmacist_reconciliation_at = new Date().toISOString();
      updateData.medication_reconciliation = {
        ...workflow.medication_reconciliation,
        ...details,
        reconciled_at: new Date().toISOString(),
      };
    } else if (action === 'financial_clear') {
      updateData.billing_clearance_by = actorId;
      updateData.billing_clearance_at = new Date().toISOString();
      updateData.financial_details = {
        ...workflow.financial_details,
        ...details,
      };
    } else if (action === 'checkout') {
      updateData.receptionist_checkout_by = actorId;
      updateData.receptionist_checkout_at = new Date().toISOString();
      updateData.checkout_details = {
        ...workflow.checkout_details,
        ...details,
      };
    } else if (action === 'cancel') {
      updateData.cancellation_reason = notes || 'Unknown';
    }

    const { data: updatedWorkflow, error: updateError } = await supabase
      .from('discharge_workflows')
      .update(updateData)
      .eq('id', workflowId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 6. Notify next actor (via Realtime)
    const nextRoles = getNextRoles(newStatus);
    if (nextRoles.length > 0) {
      await supabase.channel(`discharge:${workflowId}`).send({
        type: 'broadcast',
        event: 'step_advanced',
        payload: {
          workflowId,
          status: newStatus,
          step: newStep,
          nextRoles,
          message: `Discharge workflow advanced to ${newStatus}`,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        workflow: updatedWorkflow,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Discharge workflow error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
});

function getNextRoles(status: string): string[] {
  const roleMap: Record<string, string[]> = {
    'pending_review': ['doctor'],
    'clinical_cleared': ['nurse'],
    'nurse_confirmed': ['pharmacist'],
    'med_reconciled': ['billing'],
    'financial_cleared': ['receptionist'],
    'discharged': ['receptionist'],
    'finalized': [],
  };
  return roleMap[status] || [];
}
```

---

## React Hook: useDischargeWorkflow

**File:** `src/hooks/useDischargeWorkflow.ts`

**Purpose:** Manage discharge workflow state and transitions on client side

```typescript
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActivityLog } from '@/hooks/useActivityLog';
import { toast } from 'sonner';

export interface DischargeWorkflow {
  id: string;
  hospital_id: string;
  admission_id: string;
  patient_id: string;
  status: 'pending_review' | 'clinical_cleared' | 'nurse_confirmed' | 'med_reconciled' | 'financial_cleared' | 'discharged' | 'finalized' | 'cancelled';
  current_step: number;
  clinical_notes?: Record<string, any>;
  medication_reconciliation?: Record<string, any>;
  financial_details?: Record<string, any>;
  checkout_details?: Record<string, any>;
  [key: string]: any;
}

export function useDischargeWorkflow(admissionId: string) {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();

  const [workflow, setWorkflow] = useState<DischargeWorkflow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch existing workflow or create new one
  const fetchWorkflow = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('discharge_workflows')
        .select('*')
        .eq('admission_id', admissionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setWorkflow(data as DischargeWorkflow || null);
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error(`Failed to load discharge workflow: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [admissionId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!workflow?.id) return;

    const channel = supabase
      .channel(`discharge:${workflow.id}`)
      .on('broadcast', { event: 'step_advanced' }, ({ payload }) => {
        setWorkflow((prev) => (prev ? { ...prev, ...payload } : null));
        toast.info(`Discharge workflow updated: ${payload.status}`);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workflow?.id]);

  // Transition workflow to next step
  const advanceWorkflow = useCallback(
    async (action: string, notes?: string, details?: Record<string, any>) => {
      if (!workflow) {
        toast.error('Workflow not loaded');
        return null;
      }

      try {
        setIsTransitioning(true);

        const { data, error: transitionError } = await supabase.functions.invoke(
          'discharge-workflow',
          {
            body: {
              workflowId: workflow.id,
              action,
              actorId: user?.id,
              notes,
              details,
            },
          }
        );

        if (transitionError) throw transitionError;

        setWorkflow(data.workflow as DischargeWorkflow);

        await logActivity({
          actionType: `discharge_${action}`,
          entityType: 'discharge_workflow',
          entityId: workflow.id,
          details: { action, notes },
        });

        toast.success(`Discharge workflow advanced: ${action}`);
        return data.workflow;
      } catch (err) {
        const error = err as Error;
        toast.error(`Workflow action failed: ${error.message}`);
        return null;
      } finally {
        setIsTransitioning(false);
      }
    },
    [workflow, user?.id, logActivity]
  );

  // Create new discharge workflow
  const initiateDischarge = useCallback(
    async (admissionId: string, patientId: string) => {
      try {
        setIsTransitioning(true);

        const { data, error: createError } = await supabase
          .from('discharge_workflows')
          .insert([
            {
              admission_id: admissionId,
              patient_id: patientId,
              initiated_by: user?.id,
              status: 'pending_review',
              current_step: 1,
              hospital_id: user?.hospital_id,
            },
          ])
          .select()
          .single();

        if (createError) throw createError;

        setWorkflow(data as DischargeWorkflow);

        await logActivity({
          actionType: 'discharge_initiated',
          entityType: 'discharge_workflow',
          entityId: data.id,
          details: { admission_id: admissionId },
        });

        toast.success('Discharge workflow initiated');
        return data;
      } catch (err) {
        const error = err as Error;
        toast.error(`Failed to initiate discharge: ${error.message}`);
        return null;
      } finally {
        setIsTransitioning(false);
      }
    },
    [user?.id, user?.hospital_id, logActivity]
  );

  // Cancel discharge workflow
  const cancelDischarge = useCallback(
    async (reason: string) => {
      if (!workflow) return null;
      return advanceWorkflow('cancel', reason);
    },
    [workflow, advanceWorkflow]
  );

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  return {
    workflow,
    isLoading,
    isTransitioning,
    error,
    fetchWorkflow,
    advanceWorkflow,
    initiateDischarge,
    cancelDischarge,
  };
}
```

---

## React Component: DischargeWorkflowCard

**File:** `src/components/discharge/DischargeWorkflowCard.tsx`

**Purpose:** Display workflow status and step-specific forms

Components needed:
- `DischargeInitiateButton.tsx` — Starts workflow
- `ClinicalClearanceForm.tsx` — Doctor verification form
- `NurseConfirmationForm.tsx` — Nurse vital signs checklist
- `MedicationReconciliationForm.tsx` — Pharmacist med review
- `FinancialReviewForm.tsx` — Billing final check
- `CheckoutForm.tsx` — Receptionist final handoff

---

## Testing Strategy

**Test File:** `tests/unit/discharge-workflow.test.ts`

Test cases to cover:
1. **Initialization**
   - Create discharge workflow
   - Fetch existing workflow
   - Handle not found

2. **State Machine**
   - Valid transitions succeed
   - Invalid transitions rejected
   - No transitions allowed from terminal states

3. **Role Permissions**
   - Doctor can only perform 'clinical_clear'
   - Nurse can only perform 'nurse_confirm'
   - Pharmacist can only perform 'med_reconcile'
   - Billing can only perform 'financial_clear'
   - Receptionist can only perform 'checkout'
   - Any role can 'cancel' (except in finalized state)

4. **Audit Logging**
   - Every transition logged to audit_logs
   - Correct action_type recorded
   - Performed_by tracked
   - Details include old/new status

5. **Real-time Notifications**
   - Next actor receives broadcast notification
   - Workflow state updates in real-time
   - Notification contains correct step + status

6. **Clinical Safety**
   - Cannot discharge without clinical clearance
   - Cannot checkout without financial review
   - Cancellation reason captured
   - Stale workflow detection (>24h in same step)

---

## Implementation Sequence

**Phase 1: Database (1 hour)**
- Create `discharge_workflows` table with RLS
- Create `discharge_workflow_tasks` table
- Add moddatetime trigger
- Add audit logging trigger

**Phase 2: Edge Function (2 hours)**
- Implement state machine logic
- Add role permission checks
- Add audit logging calls
- Test transitions locally

**Phase 3: React Hook (2 hours)**
- Implement `useDischargeWorkflow`
- Add real-time subscription
- Add error handling
- Add activity logging

**Phase 4: React Components (4 hours)**
- Create `DischargeWorkflowCard`
- Create step-specific forms (5 components)
- Add role-based visibility
- Add validation per step

**Phase 5: Integration & Testing (3 hours)**
- Wire components into admission detail page
- Create unit + integration tests (30+ test cases)
- Test cross-role workflows
- Verify audit trail

---

## Acceptance Criteria

- ✅ Discharge workflow table created with RLS + audit triggers
- ✅ Edge Function handles all state transitions with role validation
- ✅ React hook manages workflow state and real-time updates
- ✅ UI displays step-by-step form (different per role)
- ✅ All transitions logged to audit trail
- ✅ Clinical safety invariants enforced (no skip-step, no bypass)
- ✅ Real-time notifications work (broadcast channel)
- ✅ 30+ test cases passing
- ✅ TypeScript strict mode: 0 errors
- ✅ Git committed with descriptive message

---

**Status:** Ready for Implementation Phase  
**Next:** Begin Phase 1 (Database schema)  
**Estimated Completion:** 12 hours from start
