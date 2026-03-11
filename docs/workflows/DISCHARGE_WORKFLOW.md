# Patient Discharge Workflow

## Workflow: patient-discharge

**Trigger**: Doctor initiates discharge for a patient after clinical clearance.

**Roles involved**:
- Doctor: starts the workflow and receives returns from pharmacy rejection
- Pharmacist: performs medication reconciliation clearance
- Billing: finalizes invoice before physical discharge
- Nurse: completes physical discharge checklist

Note:
- The current CareSync RBAC set does not expose a standalone `billing` role.
- This scaffold maps the billing step to `receptionist` or `admin` server-side until a dedicated billing role exists.

**Steps**:
1. Doctor: `initiate` discharge -> workflow created, state moves to `pharmacist`
2. Pharmacist: `approve` medication reconciliation -> state moves to `billing`
3. Billing: `approve` invoice finalized -> state moves to `nurse`
4. Nurse: `approve` physical discharge checklist -> state moves to `completed`

**Rejection behavior**:
1. Pharmacist: `reject` with reason -> state moves back to `doctor`
2. Billing: `reject` with reason -> state moves back to `pharmacist`
3. Nurse: `reject` with reason -> state moves back to `billing`

**Terminal states**:
- `completed`
- `cancelled`

**Notifications**:
- Doctor initiation inserts Realtime-backed `notifications` rows for pharmacists
- Pharmacist approval inserts notifications for billing
- Billing approval inserts notifications for nurses
- Any rejection inserts notifications for the previous role with the rejection reason

**Audit events**:
- Every transition inserts:
  - one row into `discharge_workflow_audit`
  - one row into `activity_logs`

## Data Model

### `discharge_workflows`
- hospital-scoped workflow state
- current step, status, rejection reason, metadata
- realtime-enabled for UI queue updates

### `discharge_workflow_audit`
- immutable transition log
- actor, role, action, from step, to step, reason
- realtime-enabled for timeline updates

## Edge Function

Function: `supabase/functions/discharge-workflow/index.ts`

Supported actions:
- `initiate`
- `approve`
- `reject`
- `cancel`

Server-side guarantees:
- role checks enforced against `user_roles`
- rejection reason required for reject actions
- audit trail written on each state transition
- next-role notifications inserted after each forward transition or rejection return

## React Hook

Hook: `src/hooks/useDischargeWorkflow.ts`

Provides:
- single workflow query
- audit timeline query
- current-role work queue query
- mutations for initiate, approve, reject, cancel
- realtime invalidation for workflow and audit updates

## Expected UX Pattern

1. Doctor starts discharge from consultation or inpatient chart
2. Pharmacist sees pending discharge in their queue
3. Billing sees discharge only after pharmacy approval
4. Nurse sees discharge only after billing approval
5. Timeline shows each transition with actor and timestamp
6. Rejection reason is visible to the returned step owner
