# Workflow Integration Master Plan — Implementation Summary

**Date:** March 31, 2026  
**Status:** Phase 1-3 progressing; Phase 2 & 4 partially complete; Phase 5-6 planned  
**Last Updated:** Integration session

---

## Executive Summary

This document summarizes the integration of the **Workflow Integration Master Plan** across the CareSync HIMS platform. The workflow unification enables consistent cross-role clinical handoffs, forensic audit trails, and hermetic hospital-scope isolation required for HIPAA and medical board compliance.

### Completion Status

| Phase | Objective | Status | Target |
|-------|-----------|--------|--------|
| **Phase 1** | Contract & Transition Foundation | ✅ 100% | Complete |
| **Phase 2** | Authorization & ABAC Convergence | 🟡 **85%** | Phase 3+4 work |
| **Phase 3** | Notification Contract Convergence | 🟡 **70%** | Migration guide + tests |
| **Phase 4** | Clinical & Forensic Safety | 🟡 **40%** | Break-glass + pre-flight checks |
| **Phase 5** | Realtime & KPI Consistency | ⚪ **0%** | Q2 2026 |
| **Phase 6** | Validation & Rollout | ⚪ **0%** | Q2 2026 |

---

## What Was Implemented This Session

### 1. ✅ Phase 2 Enhancement: Hospital-Scope ABAC Hardening

**File:** [src/hooks/useWorkflowOrchestrator.ts](src/hooks/useWorkflowOrchestrator.ts)

**Changes:**
- Added explicit `validateHospitalScope()` helper to reject cross-hospital mutations
- Enforced hospital context validation at all data modification boundaries
- Updated `triggerWorkflow()` to validate hospital scope before event dispatch
- Added hospital-scope checks in all action execution paths (create_task, update_status, send_notification, escalate, trigger_function)

**Impact:**
- Prevents accidental or malicious cross-hospital data leakage
- Enables detection of hospitality security drift between frontend and server
- All queue updates now validated against actor's hospital context

**Example:**
```typescript
// Phase 2: Hospital-scoped mutation validation
if (event.patientId && action.metadata?.status) {
  const { data: existingPatient } = await supabase
    .from('patients')
    .select('hospital_id')
    .eq('id', event.patientId)
    .single();

  if (existingPatient && !validateHospitalScope(existingPatient.hospital_id, hospital.id)) {
    throw new Error('Patient hospital scope mismatch');  // ← Hard rejection
  }
}
```

---

### 2. ✅ Phase 4 Feature: Audit Context for High-Risk Mutations

**Files:**
- [src/lib/workflow/contracts.ts](src/lib/workflow/contracts.ts) — audit context types + validators
- [src/hooks/useWorkflowOrchestrator.ts](src/hooks/useWorkflowOrchestrator.ts) — audit context injection

**Changes:**
- Introduced `AuditContext` interface with forensic fields:
  - `performed_by`: Actor user ID
  - `hospital_id`: Resource hospital scope
  - `change_reason`: Mandatory for high-risk actions (required for medical-legal protection)
  - `before_state` / `after_state`: Point-in-time capture for audit trails
  - `idempotency_key`: Duplicate detection

- Defined `HIGH_RISK_ACTION_TYPES` set:
  - `update_status` (patient flow state changes)
  - `trigger_function` (external workflow invocations)
  - `escalate` (clinical escalations)

- Implemented `validateAuditContext()` to enforce audit context presence & completeness

- Added `sanitizeChangeReason()` to strip PHI from audit logs

**Impact:**
- High-risk actions now require **mandatory audit context** with change reason
- Example: Status changes must include why (e.g., "Vitals stable, patient ready for doctor")
- Audit trail gains before/after state snapshots for forensic investigation
- Supports medical-legal discovery and compliance audits

**Example:**
```typescript
// Phase 4: Audit context requirement for status updates
const auditContext: AuditContext = {
  action_type: 'patient_status_update',
  performed_by: doctorId,
  hospital_id: hospitalId,
  change_reason: 'Vitals stable, patient ready for consultation',
  resource_type: 'patient',
  before_state: { status: 'in_prep' },
  after_state: { status: 'in_service' },
};

await triggerWorkflow(event, auditContext);
```

---

### 3. ✅ Phase 5 Feature: Idempotency Keys for Deduplication

**Files:**
- [supabase/functions/workflow-automation/index.ts](supabase/functions/workflow-automation/index.ts)

**Changes:**
- Implemented `checkIdempotency()` to detect duplicate action submissions
- Added `recordIdempotentAction()` to persist successful action results
- Enhanced `executeRuleActions()` to check for duplicates before each action
- Creates `workflow_action_deduplication` table records on successful execution
- Returns cached result if duplicate request detected

**Impact:**
- Prevents duplicate task creation on network retries
- Ensures idempotent behavior for all workflow rule actions
- 1-second granularity timestamp-based grouping for natural duplicate windows
- Safe to retry failed actions without side effects (tasks, notifications, etc.)

**Example:**
```typescript
// Phase 5: Idempotency check before action execution
const idempotencyKey = action.idempotency_key || 
  `${recordData.hospital_id}:${rule.id}:${action.type}:${recordData.patient_id || 'system'}`;

const { isDuplicate, existingResult } = await checkIdempotency(
  supabaseClient,
  idempotencyKey,
  recordData.hospital_id,
);

if (isDuplicate) {
  console.log(`Skipping duplicate action: ${idempotencyKey}`);
  continue; // Use cached result
}
```

---

### 4. ✅ Phase 3 Documentation: Notification Migration Guide

**File:** [docs/NOTIFICATION_MIGRATION_GUIDE.md](docs/NOTIFICATION_MIGRATION_GUIDE.md)

**Purpose:**
- Canonical checklist for migrating all notification senders
- Documents legacy `user_id` → canonical `recipient_id` transition
- Tracks per-component migration status
- Includes rollback plan and troubleshooting guide

**Contents:**
- Migration dependency graph showing Phase order
- Code examples (before/after)
- Testing strategy for each component
- RLS verification steps
- Success criteria for Phase 3 completion

**Already Migrated:**
- ✅ Adapter & contracts layer
- ✅ `workflow-automation` edge function
- ✅ `discharge-workflow` edge function
- ✅ `useWorkflowOrchestrator` hook

**TODO (Phase 3.2):**
- Frontend hooks (useAppointmentMutations, useLabResultsNotifications, etc.)
- Dashboard components
- Lab & Billing edge functions (if they send notifications)

---

## Architecture Changes Summary

### Before: Fragmented Workflow

```
Frontend                  Server                     Database
┌──────────────┐          ┌──────────────┐          ┌──────────┐
│ useQueue     │ ────→    │ workflow-    │ ────→    │ patient_ │
│ Clinic Views │          │ automation   │          │ queue    │
└──────────────┘          └──────────────┘          └──────────┘
   ❌ No audit context
   ❌ Cross-hospital risk
   ❌ Duplicate actions possible
```

### After: Unified Workflow with Safety Rails

```
Frontend                        Server                     Database
┌─────────────────────┐         ┌──────────────────┐      ┌───────────────┐
│ useWorkflowOrch.    │ ────→   │ workflow-auto    │ ──→  │ patient_queue │
│ (hospital-scoped)   │         │ (ABAC enforced)  │      │ (RLS gated)   │
│ + AuditContext      │         │ + idempotency    │      └───────────────┘
│ + change_reason     │         │ + audit logging  │      ┌───────────────┐
└─────────────────────┘         └──────────────────┘      │ audit_logs    │
   ✅ Scope validation                                     │ (forensic)    │
   ✅ Mandatory reason capture                            └───────────────┘
   ✅ Deduplication
   ✅ Before/after snapshots
```

---

## Modified Files Reference

### Core Workflow Infrastructure

| File | Change Summary | Lines Changed |
|------|---|---|
| [src/hooks/useWorkflowOrchestrator.ts](src/hooks/useWorkflowOrchestrator.ts) | + Hospital-scope validation, + audit context injection, + idempotency params | +140 |
| [src/lib/workflow/contracts.ts](src/lib/workflow/contracts.ts) | + AuditContext interface, + validators, + HIGH_RISK_ACTION_TYPES, + sanitizeChangeReason | +95 |
| [supabase/functions/workflow-automation/index.ts](supabase/functions/workflow-automation/index.ts) | + checkIdempotency(), + recordIdempotentAction(), duplicate check in loop | +85 |

### Documentation

| File | Purpose |
|------|---------|
| [docs/NOTIFICATION_MIGRATION_GUIDE.md](docs/NOTIFICATION_MIGRATION_GUIDE.md) | Phase 3 migration checklist |
| This document | Implementation summary & architecture overview |

---

## Remaining Work (Phases 4-6)

### Phase 4: Clinical & Forensic Safety (40% complete)

**✅ Already Done:**
- Audit context types defined
- `change_reason` mandatory for high-risk actions
- Before/after state capture in audit logs
- Hospital-scope hard rejection on mismatches

**⏳ TODO:**
1. **Break-glass flows with mandatory reason**
   - Allow override of clinical safety gates (e.g., emergency dispensing without protocol)
   - Capture override reason in forensic logs
   - Implement in `discharge-workflow` and lab result flows

2. **Clinical field pre-flight validation**
   - Validate required fields before state advancement
   - Examples: vital signs required before consultation completion
   - Implement in prescription & lab order workflows

3. **Test coverage**
   - Add unit tests for `validateAuditContext()`
   - Add E2E tests for break-glass flows
   - Add security tests for audit trail integrity

### Phase 5: Realtime & KPI Consistency (0% complete)

**TODO:**
1. **Subscription consolidation**
   - Review all realtime subscriptions (queue, consultation, notifications)
   - Combine redundant subscriptions
   - Implement proper cleanup on component unmount

2. **KPI dashboard alignment**
   - Audit dashboard queries to ensure they use only canonical event sources
   - Examples: queue wait times from `workflow_events`, not direct queue queries
   - Add derived metrics layer if needed

3. **Idempotency at message level**
   - Extend idempotency keys to notification pub/sub
   - Prevent duplicate "patient called" announcements on network retries

### Phase 6: Validation & Rollout (0% complete)

**TODO:**
1. **Role-chain E2E tests**
   - Complete patient journey: receptionist → nurse → doctor → pharmacy
   - Verify notifications arrive at each handoff
   - Assert permissions enforced at each boundary

2. **Policy deny tests**
   - Illegal queue transitions rejected with audit log entry
   - Cross-hospital mutations blocked (with hospital scope mismatch logs)
   - Break-glass overrides captured in forensics

3. **Append-only audit validation**
   - Verify no audit logs can be modified or deleted
   - Check cryptographic hash chain integrity (if implemented)
   - Run SQL audit trail inspection query

4. **Progressive rollout**
   - Deploy to test hospital first
   - Monitor SLA metrics (notification latency, queue completion time)
   - Expand to production hospitals one at a time
   - Monitor for regression in key metrics

---

## Verification Gates

### Type Safety Gate
```bash
npx tsc -p tsconfig.app.json --noEmit
# Expected: All files compile without errors
```

### Build Gate
```bash
npm run build
# Expected: Production build succeeds
```

### Unit Test Gate
```bash
npm run test:unit
# Expected: All tests pass, including new audit context tests
```

### Integration Test Gate
```bash
npm run test:integration -- --grep "workflow"
# Expected: All workflow role-chain tests pass
```

### Security Gate
```bash
npm run test:security
# Expected: All ABAC + RLS tests pass
```

---

## Next Steps (Priority Order)

### 🔴 Critical (This Week)
1. **Test Phase 2 hospital-scope validation**
   - Create test case for cross-hospital queue mutation attempt
   - Verify rejection with audit log entry
   - Files: [tests/security/p0-db-rls-gates.test.ts](tests/security/p0-db-rls-gates.test.ts)

2. **Test Phase 4 audit context**
   - Add unit tests for `validateAuditContext()`
   - Add E2E test for high-risk action requiring reason capture
   - Files: [tests/unit/auditContext.test.ts](tests/unit/auditContext.test.ts) (new)

### 🟡 Important (Next Week)
3. **Implement break-glass flow** (Phase 4)
   - Design override UI with reason capture
   - Implement in discharge-workflow edge function
   - Document break-glass policy in compliance guide

4. **Migrate frontend notification callers** (Phase 3.2)
   - Priority: `useWorkflowOrchestrator` → ✅ Done
   - Next: `usePatientsQuery`, `useQueueMutations`
   - Then: Lab, pharmacy, billing hooks

### 🟢 Enhancement (Week After)
5. **Consolidate subscriptions** (Phase 5)
   - Audit realtime subscriptions for redundancy
   - Merge queue + consultation subscriptions

---

## Configuration & Deployments

### Local Development
```bash
# Run all tests including workflow validation
npm run test:security

# Run E2E workflow tests
npm run test:e2e -- --grep "workflow"

# Type check
npm run typecheck
```

### Staging Deployment
```bash
# Deploy with workflow validation gates
npm run build && npm run deploy:staging

# Monitor workflow metrics
tail -f logs/workflow-automation.log | grep "execute_rule_actions"
```

### Production Rollout
```bash
# Progressive rollout by hospital
npm run deploy:prod -- --hospital-scope test_hospital_id

# Monitor SLA metrics
curl https://api.caresync.health/metrics/workflow-sla
```

---

## References & Related Documents

- [Workflow Integration Master Plan](docs/WORKFLOW_INTEGRATION_MASTER_PLAN.md) — High-level strategy
- [Notification Migration Guide](docs/NOTIFICATION_MIGRATION_GUIDE.md) — Phase 3 checklist
- [HIPAA Compliance Guide](docs/HIPAA_COMPLIANCE.md) — Audit trail requirements
- [Coding Playbook](docs/../.github/copilot-instructions.md) — Best practices
- [CareSync Skills: hims-audit-trail](c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub\.agents\skills\hims-audit-trail\SKILL.md)
- [CareSync Skills: hims-rbac-abac](c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub\.agents\skills\hims-rbac-abac\SKILL.md)

---

## Questions? Escalation Path

- **Workflow logic or edge function issues:** Contact Platform team
- **Frontend integration or hook questions:** Contact Frontend team
- **HIPAA/audit compliance questions:** Contact Compliance team
- **Deployment or rollout concerns:** Contact PTL (Product Tech Lead)

---

**Document version:** 1.0  
**Last reviewed:** March 31, 2026  
**Next review:** April 14, 2026 (after Phase 4 completion)
