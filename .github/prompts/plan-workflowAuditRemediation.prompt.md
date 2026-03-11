## Plan: Comprehensive Workflow Audit & Remediation

**TL;DR** — A 5-sprint, 30-day plan to audit, harden, and monitor all 19 workflow event types across 6 clinical hooks. Discovery revealed **12 confirmed, codebase-verified issues** ranging from silent queue degradation to unimplemented cooldown logic, missing error persistence, and duplicate event firing. Each issue is prioritized by severity with a specific file target and concrete fix.

---

## Confirmed Issue Register

| ID | Severity | Category | Location | Problem |
|----|----------|----------|----------|---------|
| WF-01 | **HIGH** | Error Handling | `src/hooks/useUnifiedCheckIn.ts` | `checkInAppointment.mutateAsync()` has no try/catch — errors propagate uncaught to the caller |
| WF-02 | **HIGH** | Type Safety | `src/hooks/useUnifiedCheckIn.ts` | `priority as any` cast bypasses the `WorkflowEvent` priority union type |
| WF-03 | **HIGH** | Data Loss | `src/hooks/useLabOrders.ts` | `lab_queue` miss gracefully degrades but writes nothing to any durable store — lab orders can be silently lost |
| WF-04 | **MEDIUM** | Data Loss | `src/hooks/usePrescriptions.ts` | Same silent degradation pattern for `prescription_queue` |
| WF-05 | **HIGH** | Duplicate Events | `src/hooks/useBilling.ts` + `src/pages/consultations/ConsultationWorkflowPage.tsx` | `INVOICE_CREATED` fires from two places; 30 s global dedup window doesn't guarantee deduplication |
| WF-06 | **MEDIUM** | Logic Gap | `src/hooks/useWorkflowOrchestrator.ts` | `cooldown_minutes` column on `workflow_rules` table is never read — per-rule cooldowns are completely ignored |
| WF-07 | **MEDIUM** | Error Persistence | `src/hooks/useWorkflowOrchestrator.ts` | `processing_error` column on `workflow_events` table exists but is never written to on failure |
| WF-08 | **MEDIUM** | Missing Event | `src/hooks/useVitalSigns.ts` | `PATIENT_READY_FOR_DOCTOR` is defined but never fired — no automated handoff trigger between vitals completion and consultation start |
| WF-09 | **LOW** | Data Model | `src/components/consultations/steps/SummaryStep.tsx` | Dual field naming `diagnoses` vs `final_diagnosis` causes inconsistent summary display |
| WF-10 | **LOW** | Data Model | `src/components/consultations/steps/SummaryStep.tsx` + `ConsultationWorkflowPage.tsx` | Form state uses `medication` but DB schema expects `medication_name`; field mismatch on prescription persist |
| WF-11 | **LOW** | Unimplemented | `src/hooks/useWorkflowOrchestrator.ts` | `trigger_function` action type in `WorkflowAction` union has no implementation in `executeSingleAction` |
| WF-12 | **LOW** | Test Gap | `tests/e2e/` + `src/test/` | No tests for `workflow_action_failures` retry path, bottleneck detection RPC, or queue degradation compensating writes |

---

## Phase 1 — Audit & Catalog (Days 1–5)
*Goal: Verify all findings, produce event dependency map, surface real production failures*

1. Query `workflow_action_failures` in staging — group by `action_type` + `event_type` to find highest-frequency real failures
2. Audit `workflow_rules` seed data — verify each of the 19 `WORKFLOW_EVENT_TYPES` has at least one active rule; list which have no rules at all
3. Verify all 5 Supabase RPCs used by `WorkflowDashboard` (`get_workflow_performance_metrics()`, `get_role_performance_stats()`, `calculate_user_workloads()`, `detect_workflow_bottlenecks()`) execute without error
4. Produce event dependency matrix: event type → firing hook → DB write → target role notification → downstream action

---

## Phase 2 — Critical Fixes (Days 6–12)
*Goal: WF-01 through WF-07 resolved. Parallel where noted.*

5. **Fix WF-01/02** — Add try/catch to `useUnifiedCheckIn.checkIn()`; replace `priority as any` with explicit narrowing to `WorkflowEvent['priority']` union. (`src/hooks/useUnifiedCheckIn.ts`)
6. **Fix WF-03** *(parallel with 5)* — On `lab_queue` miss, write a compensating `workflow_tasks` record instead of silently continuing. (`src/hooks/useLabOrders.ts`)
7. **Fix WF-04** *(parallel with 5)* — Same compensating `workflow_tasks` write for `prescription_queue` miss. (`src/hooks/usePrescriptions.ts`)
8. **Fix WF-05** — Determine canonical emitter: `ConsultationWorkflowPage.tsx` keeps its `INVOICE_CREATED` trigger; `useBilling.ts` fires only when `consultationId` is absent (standalone invoice). Add an explicit guard. (`src/hooks/useBilling.ts`)
9. **Fix WF-06** — In `triggerWorkflow()`, after fetching the matched rule, read `rule.cooldown_minutes` and enforce it as the per-rule dedup window, replacing the hardcoded 30 s global. (`src/hooks/useWorkflowOrchestrator.ts`)
10. **Fix WF-07** *(parallel with 9)* — In the `catch` block of `triggerWorkflow()`, write `getErrorMessage(error)` to `workflow_events.processing_error` for that event record. (`src/hooks/useWorkflowOrchestrator.ts`)

---

## Phase 3 — Data Model & Feature Completeness (Days 13–18)
*Goal: WF-08 through WF-11 resolved*

11. **Fix WF-08** — In `useVitalSigns.ts` `onSuccess`, after firing `VITALS_RECORDED`, check if the patient has an active consultation in `waiting` status; if so, also fire `PATIENT_READY_FOR_DOCTOR`. Add a matching `workflow_rules` migration record.
12. **Fix WF-09** — Standardize `ConsultationWorkflowPage.tsx` `formData` to use `final_diagnosis[]` exclusively; remove `diagnoses` alias; update `SummaryStep.tsx` to read only `final_diagnosis`.
13. **Fix WF-10** — Normalize prescription objects in `formData` to use `medication_name` to match the DB column; update `SummaryStep.tsx` display and the `createPrescription.mutateAsync` payload mapping.
14. **Fix WF-11** — Implement `trigger_function` case in `executeSingleAction`: call the Supabase Edge Function named in `action.metadata.function_name` with `event.data` as the request body. (`src/hooks/useWorkflowOrchestrator.ts`)
15. **Add `workflow_rules` migration** covering all 19 event types, ensuring every event has at least one seed rule per hospital. (`supabase/migrations/`)

---

## Phase 4 — Test Coverage & UI Monitoring (Days 19–25)
*Goal: All WF-12 gaps closed; monitoring surfaces failures in the UI*

16. **Unit tests WF-01/02** — Mock `checkInAppointment` failure; assert `toast.error` is shown and the error does not propagate silently. New file: `src/test/hooks/useUnifiedCheckIn.test.ts`
17. **Integration tests WF-03/04** — Mock `lab_queue`/`prescription_queue` missing error; assert a compensating `workflow_tasks` record is inserted. New file: `src/test/integration/queue-degradation.test.ts`
18. **Extend orchestrator tests WF-06/07** — Assert per-rule cooldown is enforced; assert `processing_error` is written on failure. Extend `src/hooks/__tests__/useWorkflowOrchestrator.test.tsx`
19. **E2E test for retry path** — Simulate an action failing 3 times; assert `workflow_action_failures` record is created and the admin notification is sent. New file: `tests/e2e/tests/workflows/action-failure-retry.spec.ts`
20. **Wire bottleneck detection UI** — Connect `detect_workflow_bottlenecks()` RPC output to `WorkflowPerformanceMonitor` in `src/pages/workflow/WorkflowOptimizationPage.tsx`
21. **Add action failures panel to WorkflowDashboard** — Display unresolved `workflow_action_failures` rows with `action_type`, `event_type`, `retry_attempts`, `error_message`, and a "Mark Resolved" button. (`src/pages/integration/WorkflowDashboard.tsx`)
22. **Add queue depth display** — Show `prescription_queue` and `lab_queue` row counts in the WorkflowDashboard Overview tab.

---

## Phase 5 — Documentation & Maintenance Protocol (Days 26–30)

23. Update `docs/workflows/DOCTOR-WORKFLOW.md` — add prescription field naming, queue degradation behavior, and retry logic.
24. Update `docs/workflows/RECEPTIONIST-WORKFLOW.md` — document unified check-in error handling.
25. Update `docs/MAINTENANCE.md` — add weekly `workflow_action_failures` review procedure; monthly rules effectiveness review via WorkflowDashboard analytics.
26. Add a Supabase `pg_cron` job (or Edge Function) to auto-escalate unresolved `workflow_action_failures` older than 1 hour to the admin role.

---

## Verification Checklist

1. `npm run build` — zero errors
2. `npm run test:unit` — all new unit tests pass; existing orchestrator tests unchanged
3. `npm run test:integration` — queue degradation tests pass
4. `npm run test:e2e` — `action-failure-retry.spec.ts` passes
5. **Manual**: complete a consultation → query `workflow_events` and confirm exactly ONE `invoice.created` row
6. **Manual**: open WorkflowDashboard → confirm unresolved action failures panel renders
7. **Manual**: record vitals for a patient with an active consultation → verify `patient.ready_for_doctor` event fires and a notification arrives
8. **DB query**: `SELECT trigger_event FROM workflow_rules GROUP BY trigger_event` — confirm all 19 event types have at least one active rule

---

## Resource Roles

| Role | Responsibility |
|------|---------------|
| Frontend dev | WF-01–05, WF-09–10, UI steps 20–22 |
| Full-stack dev | WF-06–08, WF-11, WF-03–04 compensating writes |
| QA/test engineer | All Phase 4 test files |
| DBA / Supabase | Phase 5 step 26 (pg_cron), migration step 15 |

---

## Open Decisions

1. **WF-05 dual emitter** — Plan assumes `ConsultationWorkflowPage` is canonical and `useBilling.ts` gets a `consultationId` guard. Confirm this is acceptable, or prefer removing the trigger from `ConsultationWorkflowPage` entirely.
2. **WF-08 trigger location** — Plan fires `PATIENT_READY_FOR_DOCTOR` inside `useVitalSigns.ts` with a consultation status lookup. Alternatively it could be fired explicitly from the nurse dashboard. Which is preferred?
3. **WF-11 edge function name** — Is `trigger_function` intended to call real edge functions in `supabase/functions/`? Or should it be removed as dead code?
