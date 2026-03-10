---
name: workflow-creator
description: 'Designs and scaffolds clinical and administrative workflows for CareSync HIMS. Covers multi-role approval chains, Supabase Edge Function triggers, real-time event bus patterns, and React hook orchestration. Use when asked to create a new workflow, automate a clinical process, design a multi-step approval flow, or wire up cross-role notifications. Produces a workflow spec with a step-by-step execution plan, DB schema changes, edge function stubs, and React integration code.'
argument-hint: 'Name the workflow to create (e.g. "patient-discharge", "lab-result-notify", "prescription-approval"). Optionally specify roles involved: admin | doctor | nurse | receptionist | pharmacist | lab-tech | patient.'
---

# CareSync — Workflow Creator Skill

Designs and scaffolds end-to-end workflows for CareSync. Output is a workflow spec with DB triggers, Edge Function stubs, React hook wiring, and role-gate patterns — ready to implement.

## When to Use

- "Create a workflow for [process]"
- "Automate [clinical/admin task]"
- "Design an approval chain for [feature]"
- "Wire up notifications when [event] happens"
- "How should [multi-role process] work in CareSync?"

---

## Workflow Anatomy

Every CareSync workflow has 4 layers:

| Layer | Technology | Location |
|-------|-----------|----------|
| **Trigger** | DB event / user action / schedule | Supabase migration or React hook |
| **Orchestration** | Edge Function or DB function | `supabase/functions/` |
| **State** | Supabase table + RLS | `supabase/migrations/` |
| **UI** | React hook + component | `src/hooks/` + `src/components/` |

---

## Step 1 — Workflow Specification

Before writing any code, produce a spec block:

```markdown
## Workflow: <name>

**Trigger**: <what starts it — user action, DB insert, schedule>
**Roles involved**: <list of roles and their actions>
**Steps**:
1. <Actor>: <action> → <state transition>
2. <Actor>: <action> → <state transition>
...
**Terminal states**: completed | cancelled | failed
**Notifications**: <who gets notified at which step>
**Audit events**: <logActivity actionType per step>
```

---

## Step 2 — DB Schema

### State table pattern
```sql
CREATE TABLE public.<workflow_name>_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  patient_id UUID REFERENCES patients(id),
  initiated_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','cancelled','failed')),
  current_step INTEGER NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.<workflow_name>_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<workflow_name>_hospital_scope" ON public.<workflow_name>_workflows
  USING (hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid()));
```

Rules:
- Always include `hospital_id` — multi-tenant requirement
- `status` must use a CHECK constraint, never free-text
- Never use `USING (true)` — see HIPAA Domain 5
- Add `updated_at` trigger via `moddatetime` extension

---

## Step 3 — Edge Function Orchestrator

File: `supabase/functions/<workflow-name>/index.ts`

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { workflowId, action, actorId } = await req.json();

  const { data: workflow, error } = await supabase
    .from('<workflow_name>_workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (error || !workflow) {
    return new Response(JSON.stringify({ error: 'Workflow not found' }), { status: 404 });
  }

  const allowed = getAllowedActions(workflow.status, workflow.current_step);
  if (!allowed.includes(action)) {
    return new Response(JSON.stringify({ error: 'Invalid transition' }), { status: 400 });
  }

  // Enforce role server-side — never trust client
  const { data: actor } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', actorId)
    .single();

  if (!getAllowedRoles(action).includes(actor?.role)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const next = getNextState(workflow, action);
  await supabase.from('<workflow_name>_workflows').update(next).eq('id', workflowId);

  // Audit log — required for every state change
  await supabase.from('audit_logs').insert({
    action_type: `<workflow_name>_${action}`,
    resource_type: '<workflow_name>_workflow',
    resource_id: workflowId,
    performed_by: actorId,
    hospital_id: workflow.hospital_id,
    details: { previous_status: workflow.status, new_status: next.status },
  });

  // Notify next actor via realtime
  await supabase.channel(`workflow:${workflowId}`).send({
    type: 'broadcast',
    event: 'step_advanced',
    payload: { workflowId, step: next.current_step, status: next.status },
  });

  return new Response(JSON.stringify({ success: true, workflow: next }), { status: 200 });
});
```

---

## Step 4 — React Hook

File: `src/hooks/use<WorkflowName>Workflow.ts`

```ts
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/utils/auditLogger';
import { toast } from 'sonner';

export function use<WorkflowName>Workflow(workflowId: string) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [workflowState, setWorkflowState] = useState(null);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`workflow:${workflowId}`)
      .on('broadcast', { event: 'step_advanced' }, ({ payload }) => {
        setWorkflowState(payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [workflowId]);

  const advanceStep = useCallback(async (action: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('<workflow-name>', {
        body: { workflowId, action, actorId: user?.id },
      });

      if (error) throw error;

      await logActivity({
        actionType: `<workflow_name>_${action}`,
        resourceType: '<workflow_name>_workflow',
        resourceId: workflowId,
        details: { action },
      });

      return data;
    } catch (err) {
      toast.error('Workflow action failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, workflowId]);

  return { advanceStep, isLoading, workflowState };
}
```

---

## Common CareSync Workflow Templates

| Workflow | Trigger | Roles | Key Steps |
|----------|---------|-------|-----------|
| `patient-discharge` | Doctor marks ready | Doctor → Nurse → Billing → Receptionist | Clinical clearance → Medication reconciliation → Invoice → Checkout |
| `lab-result-notify` | Lab tech submits result | Lab Tech → Doctor → Patient | Result entry → Critical value check → Doctor review → Patient notification |
| `prescription-approval` | Doctor creates Rx | Doctor → Pharmacist | Rx created → DUR check → Pharmacist verify → Dispense |
| `ot-scheduling` | Surgeon requests slot | Surgeon → OT Coordinator → Anesthesiologist | Request → Slot allocation → Pre-op checklist → Confirmation |
| `insurance-claim` | Billing initiates | Billing → Admin → Insurer | Claim draft → Admin review → Submission → Adjudication tracking |
| `telemedicine-session` | Patient books | Patient → Receptionist → Doctor | Booking → Consent gate → Queue → Session → Notes |

---

## Checklist Before Finalizing Any Workflow

- [ ] `hospital_id` present on state table and all RLS policies
- [ ] No `USING (true)` policies
- [ ] `logActivity` called at every state transition with specific `actionType`
- [ ] Role check enforced server-side in Edge Function (not only client)
- [ ] PHI fields encrypted before storage (`encryptField` + `encryption_metadata`)
- [ ] Consent verified before workflows that share data externally or start telemedicine
- [ ] Real-time channel cleaned up on component unmount
- [ ] Terminal states (`completed`, `cancelled`, `failed`) are unreachable from each other
- [ ] Edge Function registered in `supabase/config.toml`
