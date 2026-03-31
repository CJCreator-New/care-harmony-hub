# Workflow Integration Quick Reference Card

**Purpose:** Quick lookup for developers using the enhanced workflow system  
**Audience:** Frontend engineers, edge function developers, QA testers  
**Updated:** March 31, 2026

---

## Quick Facts

| Feature | Requirement | Status |
|---------|-------------|--------|
| Hospital-scope validation | ✅ Automatic | Production-ready |
| Audit context (high-risk actions) | 📋 Explicit | Use when updating status, escalating, or triggering functions |
| Idempotency keys | ✅ Auto-generated | Edge functions deduplicate automatically |
| Change reason logging | 📋 Explicit | Required for all high-risk mutations |
| Notification canonicalization | 🟡 In progress | Use `recipient_id`, not `user_id` |

---

## Common Use Cases

### 1️⃣ Trigger a Simple Workflow Event (Low-Risk)

**Scenario:** Receptionist checks in a patient.

```typescript
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';

const MyComponent = () => {
  const { triggerWorkflow } = useWorkflowOrchestrator();

  const handleCheckIn = async (patientId: string) => {
    await triggerWorkflow({
      type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
      patientId,
      sourceRole: 'receptionist',
      data: {
        timestamp: new Date().toISOString(),
        location: 'reception',
      },
      priority: 'normal',
    });
  };

  return <button onClick={() => handleCheckIn(patientId)}>Check In</button>;
};
```

✅ **What happens automatically:**
- Hospital scope validated (uses `useAuth().hospital.id`)
- Event logged to `workflow_events`
- Matching rules executed
- Notifications sent to assigned roles

---

### 2️⃣ Update Patient Status (High-Risk — Requires Audit Context)

**Scenario:** Doctor marks patient ready for consultation after vitals check.

```typescript
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES, type AuditContext } from '@/hooks/useWorkflowOrchestrator';

const ConsultationPrep = ({ patientId, patientName }: Props) => {
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const { profile } = useAuth();

  const handleReadyForDoctor = async () => {
    const auditContext: AuditContext = {
      action_type: 'patient_status_transition',
      performed_by: profile.user_id,
      hospital_id: hospital.id,
      patient_id: patientId,
      change_reason: 'Vitals stable: BP 120/80, HR 82, Temp 98.6°F. Patient ready for doctor.',  // ← REQUIRED
      resource_type: 'patient',
      before_state: { status: 'in_prep' },
      after_state: { status: 'in_service' },
    };

    await triggerWorkflow(
      {
        type: WORKFLOW_EVENT_TYPES.PATIENT_READY_FOR_DOCTOR,
        patientId,
        sourceRole: 'nurse',
        data: { vital_signs_checked: true },
        priority: 'high', // Escalate priority for doctor notification
      },
      auditContext  // ← Pass audit context
    );

    toast.success(`${patientName} is ready for consultation`);
  };

  return <button onClick={handleReadyForDoctor}>Ready for Doctor</button>;
};
```

⚠️ **Important requirements:**
- **MUST** include `change_reason` (e.g., clinical rationale, why state was changed)
- **MUST** match hospital from `useAuth()`
- Reason logged in `workflow_event` audit trail for forensic investigation

---

### 3️⃣ Send a Role-Based Notification

**Scenario:** Lab result ready → notify ordering doctor.

```typescript
import { WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import { sendNotification } from '@/services/notificationAdapter';

const LabResultPublished = async (labOrderId: string, doctorId: string) => {
  const { hospital } = useAuth();

  // ✅ Use canonical `recipient_id` (NOT user_id)
  await sendNotification({
    hospital_id: hospital.id,
    recipient_id: doctorId,  // ← Canonical field
    sender_id: currentUserId,
    title: 'Lab Results Ready',
    message: `New lab results available for your patient`,
    type: 'clinical',
    priority: 'high',
    metadata: {
      lab_order_id: labOrderId,
      event_type: WORKFLOW_EVENT_TYPES.LAB_RESULTS_READY,
      source_role: 'lab_technician',
    },
  });
};
```

✅ **Canonical format:**
- Use `recipient_id` (not `user_id`)
- Always include `hospital_id`
- Add metadata for audit trail

---

### 4️⃣ Handle Cross-Role Handoff (E2E Workflow)

**Scenario:** Doctor creates & signs discharge order → pharmacist verifies → patient updates.

```typescript
// 1. Doctor creates discharge order
const DischargeOrder = ({ patientId }: Props) => {
  const { triggerWorkflow } = useWorkflowOrchestrator();
  const { hospital, profile } = useAuth();

  const handleCreateDischarge = async (medicationList: Medication[]) => {
    const auditContext: AuditContext = {
      action_type: 'discharge_initiated',
      performed_by: profile.user_id,
      hospital_id: hospital.id,
      patient_id: patientId,
      change_reason: 'Patient clinically stable. Sent to pharmacist for med verification.',
      resource_type: 'discharge_order',
    };

    await triggerWorkflow(
      {
        type: WORKFLOW_EVENT_TYPES.CONSULTATION_COMPLETED,
        patientId,
        sourceRole: 'doctor',
        data: {
          medications: medicationList,
          discharge_type: 'standard',
        },
        priority: 'high',
      },
      auditContext
    );
  };

  return <button onClick={handleCreateDischarge}>Sign & Discharge</button>;
};

// 2. Pharmacist verifies (via edge function workflow-automation)
// 3. Billing completes
// 4. Patient sees discharge summary
```

---

## Error Handling

### ❌ "High-risk action '...' requires audit context"

**Cause:** You tried to update status without providing audit context.  
**Fix:**
```typescript
// ❌ WRONG
await triggerWorkflow({
  type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
  data: { status: 'in_service' },  // ← High-risk!
});

// ✅ RIGHT
await triggerWorkflow(
  {
    type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
    data: { status: 'in_service' },
  },
  {
    action_type: 'status_update',
    performed_by: userId,
    hospital_id: hospitalId,
    patient_id: patientId,
    change_reason: 'Clinical justification here',  // ← Add reason
    resource_type: 'patient',
  }
);
```

### ❌ "Patient hospital scope mismatch"

**Cause:** Patient record belongs to different hospital than your session.  
**Fix:** Verify hospital scope match:
```typescript
const { hospital } = useAuth();  // ← Your hospital

// Step 1: Check patient hospital before update
const { data: patient } = await supabase
  .from('patients')
  .select('hospital_id')
  .eq('id', patientId)
  .single();

if (patient.hospital_id !== hospital.id) {
  console.error('Cannot update patient: hospital mismatch');
  return;  // ← Prevent cross-hospital mutation
}

// Step 2: Safe to trigger workflow
await triggerWorkflow(...);
```

### ⚠️ "Duplicate request detected: idempotency_key=..."

**This is OK!** Idempotency working as designed:
- First request: Task created
- Retry request: Task NOT duplicated (same result returned)
- Check logs: Should see `workflow_action_deduplication` record

---

## High-Risk Action Types

| Action Type | Requires Audit Context | Example |
|---|---|---|
| `create_task` | ❌ No | Nurse assigns follow-up task |
| `send_notification` | ❌ No | System notifies doctor |
| `update_status` | ✅ **YES** | Patient status: `in_prep` → `in_service` |
| `trigger_function` | ✅ **YES** | Call discharge-workflow function |
| `escalate` | ✅ **YES** | Escalate lab critical alert |

---

## Testing Your Workflow

### Unit Test Template
```typescript
import { renderHook, act } from '@testing-library/react';
import { useWorkflowOrchestrator } from '@/hooks/useWorkflowOrchestrator';
import * as workflowContracts from '@/lib/workflow/contracts';

describe('useWorkflowOrchestrator', () => {
  it('requires audit context for status updates', async () => {
    const { result } = renderHook(() => useWorkflowOrchestrator());

    await act(async () => {
      try {
        // ❌ Should fail: no audit context
        await result.current.triggerWorkflow({
          type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
          patientId: 'test-id',
          data: { status: 'in_service' },
        });
        fail('Should have thrown error');
      } catch (e: any) {
        expect(e.message).toContain('audit context');
      }
    });
  });

  it('accepts status updates with audit context', async () => {
    const { result } = renderHook(() => useWorkflowOrchestrator());

    const auditContext: AuditContext = {
      action_type: 'test',
      performed_by: 'test-user',
      hospital_id: 'test-hospital',
      patient_id: 'test-patient',
      change_reason: 'Testing',
      resource_type: 'patient',
    };

    await act(async () => {
      // ✅ Should succeed with audit context
      await result.current.triggerWorkflow(
        {
          type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
          patientId: 'test-id',
          data: { status: 'in_service' },
        },
        auditContext
      );
    });

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        audit_context: expect.objectContaining({
          change_reason: 'Testing',
        }),
      })
    );
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test('doctor can mark patient ready for consultation', async ({ page, context }) => {
  // 1. Login as doctor
  await page.goto('/login');
  await page.fill('input[name="email"]', 'doctor@hospital.test');
  await page.fill('input[name="password"]', 'password');
  await page.click('button:has-text("Sign In")');

  // 2. Select patient from queue
  await page.goto('/doctor/queue');
  await page.click('button:has-text("Patient Name")');

  // 3. Trigger status update
  await page.click('button:has-text("Ready for Consultation")');

  // 4. Verify audit trail was created
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('action_type', 'patient_status_update')
    .eq('resource_id', patientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  expect(auditLogs.change_reason).toBeTruthy();
  expect(auditLogs.before_state).toBe({ status: 'in_prep' });
  expect(auditLogs.after_state).toBe({ status: 'in_service' });
});
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| [src/hooks/useWorkflowOrchestrator.ts](src/hooks/useWorkflowOrchestrator.ts) | Main hook for workflow dispatch |
| [src/lib/workflow/contracts.ts](src/lib/workflow/contracts.ts) | Type definitions & validators |
| [src/lib/workflow/queueTransitions.ts](src/lib/workflow/queueTransitions.ts) | Queue state machine |
| [src/services/notificationAdapter.ts](src/services/notificationAdapter.ts) | Canonical notification sendNotification |
| [supabase/functions/workflow-automation/index.ts](supabase/functions/workflow-automation/index.ts) | Rule execution engine |
| [supabase/functions/discharge-workflow/index.ts](supabase/functions/discharge-workflow/index.ts) | Discharge multi-step workflow |

---

## Best Practices

✅ **DO:**
- Always pass `hospital_id` from `useAuth()`
- Include `change_reason` for status/escalation actions
- Add metadata with `event_type`, `patient_id`, `source_role`
- Test error paths (cross-hospital, missing reason, duplicate)
- Log workflow transitions for troubleshooting

❌ **DON'T:**
- Use `user_id` for notifications (use `recipient_id`)
- Skip hospital-scope validation on state mutations
- Hardcode role/permission strings (use constants from `permissions.ts`)
- Trust frontend validation alone (server will reject anyway)
- Retry failed workflow actions without checking idempotency logs

---

## Rate Limits & Performance

- **Workflow events per patient:** 100/minute (tracked by `patient_id`)
- **Notifications per user:** 1000/hour (tracked by `recipient_id`)
- **Workflow rule executions:** 10,000/hour per hospital
- **Audit log writes:** 50,000/hour per hospital

⚠️ If hitting limits, check for:
- Runaway event triggers (loop detection)
- Duplicate message fan-outs (notification adapter issue)
- Inefficient rule conditions (trigger_conditions evaluation)

---

## FAQ

**Q: Can I override a clinical safety gate?**  
A: Not yet (planned for Phase 4). Contact workflow team for break-glass procedure.

**Q: How do I audit who changed a patient's status?**  
A: Query `audit_logs` table:
```sql
SELECT * FROM audit_logs 
WHERE resource_id = 'patient-id' 
  AND action_type = 'patient_status_update'
ORDER BY created_at DESC;
```

**Q: What if my notification isn't delivered?**  
A: Check:
1. Recipient is correct role (filter in `send_notification`)
2. Hospital ID matches (ABAC filter)
3. Notification priority isn't `low` (may be deprioritized)
4. User's notification settings allow the channel

**Q: Can I see workflow execution history?**  
A: Yes:
```sql
SELECT * FROM workflow_events 
WHERE patient_id = 'patient-id'
ORDER BY created_at DESC;
```

---

**Questions?** Reach out to #hims-platform Slack channel  
**Bug Report?** File issue with workflow logs attached
