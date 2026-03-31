# Workflow Integration Master Plan

## Objective
Unify cross-role clinical and operational workflows under one canonical contract so that state transitions, notifications, and audit logs are consistent, secure, and observable across Receptionist, Nurse, Doctor, Lab Technician, Pharmacist, Admin, and Patient interactions.

## Scope
- In scope: role handoffs, workflow events, queue and consultation transitions, notification fan-out, audit requirements, realtime consistency.
- Out of scope: new feature modules not already in current role workflows.

## Architectural Baseline
- Event dispatcher: `src/hooks/useWorkflowOrchestrator.ts`
- Event contract: `src/lib/workflow/contracts.ts`
- Queue transition policy: `src/lib/workflow/queueTransitions.ts`
- Notification adapter: `src/services/notificationAdapter.ts`
- Route and permission controls: `src/routes/routeDefinitions.tsx`, `src/components/auth/RoleProtectedRoute.tsx`, `src/lib/permissions.ts`
- Server orchestration: `supabase/functions/workflow-automation/index.ts`, `supabase/functions/discharge-workflow/index.ts`

## Canonical Patient Journey
1. Receptionist performs patient check-in and queue placement.
2. Nurse records vitals and prep completion.
3. Doctor performs consultation and creates lab/prescription actions.
4. Lab Technician processes orders and publishes results.
5. Pharmacist verifies and dispenses medication.
6. Billing/reception completes checkout and payment closure.
7. Patient-facing records reflect finalized outcomes.

## Phase Plan

### Phase 1: Contract and Transition Foundation
- Standardize event taxonomy and payload fields.
- Introduce centralized queue transition guard logic.
- Ensure all queue mutation hooks enforce legal transitions.
- Status: Completed (initial implementation).

### Phase 2: Authorization and ABAC Convergence
- Unify role checks at route and mutation boundaries.
- Enforce hospital-scoped and role-scoped workflow mutations server-side.
- Add explicit denial behavior and logs for invalid transitions.
- Status: In progress (server-side guardrails implemented for core discharge + workflow automation paths).

### Phase 3: Notification Contract Convergence
- Canonicalize recipient semantics to `recipient_id`.
- Preserve backward compatibility for legacy payloads where needed.
- Add adapter-level validation to fail fast on invalid payloads.
- Status: Started.

### Phase 4: Clinical and Forensic Safety
- Require audit context for high-risk state mutations.
- Enforce required clinical fields before state advancement.
- Separate break-glass flows with mandatory reason capture.
- Status: Planned.

### Phase 5: Realtime and KPI Consistency
- Consolidate subscriptions and cleanup lifecycles.
- Align dashboard KPIs to canonical event/state sources only.
- Add idempotency strategy for duplicate submissions.
- Status: Planned.

### Phase 6: Validation and Rollout
- Execute role-chain E2E journeys and policy deny tests.
- Verify append-only audit behavior for critical transitions.
- Roll out progressively by hospital scope and monitor SLA metrics.
- Status: Planned.

## Verification Gates
- Type safety gate: `npx tsc -p tsconfig.app.json --noEmit`
- Build gate: `npm run build`
- Workflow gate: transition allow/deny tests by role and state
- Security gate: route + mutation authorization checks
- Audit gate: high-risk transitions include actor/hospital/reason context

## Implementation Log
- Added canonical workflow contracts in `src/lib/workflow/contracts.ts`.
- Added queue transition policy in `src/lib/workflow/queueTransitions.ts`.
- Wired orchestration hook to canonical contracts.
- Enforced queue transition guards in queue mutation hooks.
- Hardened notification adapter to normalize recipient fields via canonical `recipient_id` with legacy `user_id` fallback.
- Enforced hospital-scope mismatch rejection in `workflow-automation` edge function for all supported actions.
- Added server-side queue transition validation in `workflow-automation` for `update_status` actions targeting `patient_queue`.
- Added denied transition logging to `workflow_execution_logs` for illegal queue status changes.
- Hardened `discharge-workflow` mutation paths with hospital-scope ABAC checks, finalized-state guard rails, denied-action activity logging, and required cancellation reason capture.

## Risks and Mitigations
- Risk: Drift between frontend guards and server mutation behavior.
  - Mitigation: Mirror transition logic in edge functions and add shared tests.
- Risk: Legacy payload producers still using non-canonical recipient fields.
  - Mitigation: Adapter normalization plus migration checklist for callers.
- Risk: Incomplete audit context for high-risk transitions.
  - Mitigation: Enforce audit metadata requirements in orchestration path.

## Ownership
- Workflow architecture: Platform + Clinical workflow maintainers
- Authorization: Security/RBAC maintainers
- Audit/compliance: Compliance + backend maintainers
- Validation: QA automation + role-based UAT owners
