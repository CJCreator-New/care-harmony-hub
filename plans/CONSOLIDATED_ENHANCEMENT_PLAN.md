# Care Harmony Hub - Consolidated Enhancement Plan

**Document Version:** 3.0  
**Last Updated:** February 23, 2026  
**Plan Basis:** `plans/FLOWS_UNIFIED_IMPLEMENTATION_PLAN.md` and the eight role flow remediation files  
**Execution Horizon:** 6-9 months  
**Program Mode:** Contract-first stabilization, then operational hardening, then consolidation, then optimization

## Executive Summary
This plan is now execution-complete and phase-sequenced. It translates the unified issue backlog into work packages with owners, dependencies, gates, and measurable completion criteria.

Program goals:
1. Remove cross-role handoff failures in live operational paths.
2. Standardize statuses, events, identity resolution, and notification payload contracts.
3. Eliminate production-impacting mock/placeholder flows.
4. Enforce tenancy, security, and HIPAA validation gates in each release phase.

## Program Streams and Ownership
1. `Shared Platform` - contracts, identity, notifications, handoff orchestration.
2. `Admin/Security` - staff lifecycle, invitation integrity, RBAC parity, tenancy controls.
3. `Clinical` - doctor and nurse readiness/consultation/handoff reliability.
4. `Frontdesk` - receptionist check-in, scheduler, payment and queue integrity.
5. `Lab` - lab order lifecycle consistency, critical alerts, doctor result delivery.
6. `Pharmacy` - refill/dispense contract and queue synchronization.
7. `Patient Portal` - patient identity linkage, schema-aligned hooks/pages, onboarding reliability.

## Backlog Reference
Authoritative deduplicated backlog and traceability IDs: `CI-001` through `CI-024` in `plans/FLOWS_UNIFIED_IMPLEMENTATION_PLAN.md`.

## Phase-by-Phase Execution Update

## Phase 0 - Program Control and Baseline (Week 0-1)
**Objective:** freeze drift and establish measurable baselines.

### Work Packages
1. Finalize canonical contracts ADRs:
- event names
- status enums
- notification payload
- identity resolution map
2. Register feature flags by stream.
3. Baseline metrics collection:
- handoff latency by role pair
- notification success/failure rate
- queue insertion consistency
- portal data visibility lag
4. Create gate checklists used in every phase.

### Issues Addressed
- Foundation for all `CI-*` items.

### Dependencies
1. Stream leads assigned.
2. Access to telemetry dashboards/log sinks.

### Exit Criteria
1. ADRs approved and published.
2. Feature flags created for all streams.
3. Baseline captured for at least 5 business days.

## Phase 1 - Stabilization (Weeks 1-6)
**Objective:** close P0/P1 blockers affecting safety, handoff integrity, and data correctness.

### Work Packages by Stream
1. `Shared Platform`
- Implement canonical contracts module and notification adapter.
- Add identity resolver utility and migrate critical recipient/patient lookups.
- Enforce canonical workflow event constants in emitters.
- Target issues: `CI-001`, `CI-002`, `CI-005`, `CI-006`, `CI-007`.

2. `Admin/Security`
- Hospital-scoped offboarding; prevent cross-hospital role mutation.
- Replace client admin auth actions with edge-function calls.
- Route invitation writes through scoped server-safe path.
- Align route guards and sidebar from one RBAC source.
- Target issues: `CI-008`, `CI-023`.

3. `Clinical`
- Nurse hook shape fixes and checklist completion metadata reliability.
- Canonical nurse-to-doctor ready event emission and alert recipient fixes.
- Doctor quick-start idempotency and consultation lifecycle/stage split.
- Remove manual lab handoff gate (`lab_notified`) from completion logic.
- Target issues: `CI-003`, `CI-004`, `CI-007`, `CI-010`, `CI-011`, `CI-012`.

4. `Frontdesk`
- Replace broken queue-add path with unified check-in service.
- Ensure walk-in and appointment check-in always notify nurse.
- Target issues: `CI-003`, `CI-007`.

5. `Lab`
- Normalize status and priority mappings at boundaries.
- Fix doctor recipient identity mapping for results/critical alerts.
- Target issues: `CI-006`, `CI-016`, `CI-017`.

6. `Pharmacy`
- Refill payload/signature alignment.
- Missing import/runtime correction in refill hook.
- Ensure dispense updates durable queue state.
- Target issues: `CI-013`, `CI-015`.

7. `Patient Portal`
- Replace stale tables/fields and hook contract drift.
- Guarantee patient record creation in self-registration path.
- Fix forgot-password route and account lock-check contract usage.
- Target issues: `CI-004`, `CI-019`, `CI-020`.

### Phase 1 Release Gates
1. Contract gate: no mixed notification schema in critical flows.
2. Handoff gate: receptionist->nurse->doctor chain passes integration tests.
3. Tenant gate: scoped offboarding and invitation mutation tests pass.
4. Security gate: PHI logging scan and role access regression pass.

### Exit Criteria
1. All P0 items closed: `CI-001`, `CI-003`, `CI-005`, `CI-006`, `CI-007`, `CI-008`, `CI-013`, `CI-015`, `CI-019`.
2. No silent drops in core outpatient E2E handoff chain.
3. Notification adapter used by orchestrator and role emitters on core paths.

## Phase 2 - Operational Reliability (Weeks 7-12)
**Objective:** remove operational mocks and enforce durable cross-role consistency.

### Work Packages by Stream
1. `Frontdesk`
- Persist smart scheduler bookings.
- Align payment widget with invoice model.
- Move queue optimizer to `patient_queue` contract.
- Target issues: `CI-009`, `CI-018`.

2. `Lab`
- Add real action handlers in lab dashboards.
- Align queue controls to canonical status transitions.
- Consolidate critical alert channel/table behavior.
- Target issues: `CI-009`, `CI-017`.

3. `Pharmacy`
- Normalize queue DTO from `items[]`.
- Unify dashboard behavior and remove mock metrics.
- Target issues: `CI-009`, `CI-014`.

4. `Patient Portal`
- Repair portal billing/check-in modules to live data.
- Expand appointment/lab/prescription visibility consistency.
- Target issues: `CI-021`, `CI-022`.

5. `Shared Platform`
- Add retry + idempotency for handoff event writes.
- Target issues: supports `CI-001`, `CI-007`, `CI-015`.

### Phase 2 Release Gates
1. Mock gate: no mock data in operational decisions for enabled streams.
2. Queue gate: patient/lab/prescription queue parity checks pass.
3. Integration gate: doctor->lab/pharmacy and completion->patient visibility pass.

### Exit Criteria
1. All P1 blockers complete or actively in verified rollout.
2. Queue consistency mismatch rate below agreed threshold.
3. Dashboard counts converge for same snapshot across role views.

## Phase 3 - Consolidation and Integrity Hardening (Months 4-6)
**Objective:** retire duplicate modules and standardize mutation/read models.

### Work Packages
1. Declare authoritative module per domain and deprecate legacy duplicates.
2. Introduce shared DTO mapper layer for all role dashboards.
3. Standardize optimistic updates with rollback and retry classification.
4. Build observability dashboards for dropped-handoff rate and retry recovery.

### Issues Addressed
- `CI-009`, `CI-017`, `CI-024`, plus residual contract drift from `CI-004`/`CI-006`.

### Exit Criteria
1. Duplicate production paths retired or hard-disabled behind flags.
2. Incident rate and handoff failure trend remain low for 4+ weeks.

## Phase 4 - Optimization and Compliance Maturity (Months 6-9)
**Objective:** optimize only after stable and compliant core workflows.

### Work Packages
1. Non-blocking predictive prioritization for queue assistance.
2. Extend automation surfaces with strict contract gates.
3. Institutionalize recurring RLS and access audits.
4. Complete evidence loop for training, DR, and incident readiness.

### Exit Criteria
1. No KPI regression after optimization enablement.
2. Compliance evidence pack generated for each release cycle.

## Data and Schema Program (Cross-Phase)
1. Membership and tenancy hardening:
- `staff_memberships` style scoped active/inactive model.
2. Message read normalization:
- `message_reads` table for idempotent per-user read state.
3. Checklist audit semantics:
- reliable `completed_at` and optional `completed_by`.
4. Enum normalization and backfill:
- queue/consultation/lab/refill status harmonization.
5. Indexing for high-frequency paths:
- `(hospital_id, status, updated_at)` on queue/order tables
- `(recipient_id, is_read, created_at DESC)` on notifications/messages
- `(patient_id, scheduled_date)` and `(patient_id, status)` for patient-facing appointment reads.

## HIPAA and Security Validation Gates
Applied at each release milestone:
1. Access control: route + query role-path tests.
2. Audit controls: immutable handoff and PHI-touch events.
3. Integrity: contract tests and DB constraint checks for statuses/events.
4. Transmission/logging: no PHI in client logs; secure transport defaults verified.
5. Authentication: MFA policy checks for privileged/clinical roles.
6. Tenancy: no cross-hospital read/write leakage in policy tests.

## Test and Validation Matrix (Execution)
1. Unit:
- contract adapter validation
- identity resolver
- status/event mapping
2. Integration:
- receptionist check-in -> nurse visibility
- nurse ready -> doctor list + notify
- doctor order -> lab/pharmacy queue + notify
- lab/pharmacy completion -> patient portal visibility
3. E2E:
- full outpatient chain
- refill lifecycle
- appointment request lifecycle
- failure/retry/idempotency paths
4. Performance:
- handoff latency SLO
- queue query latency
- notification retry success rate

## Milestones and Status Model
1. `M1` (Week 6): Tier-1 blockers closed, contract baseline live.
2. `M2` (Week 12): operational reliability metrics stable and mock-critical paths removed.
3. `M3` (Month 6): duplicate module consolidation complete with sustained low incidents.
4. `M4` (Month 9): optimization enabled without safety/compliance regressions.

Status values for each work package:
- `not_started`
- `in_progress`
- `blocked`
- `ready_for_rollout`
- `rolled_out`
- `verified`

## Governance and Cadence
1. Weekly architecture review for drift exceptions.
2. Bi-weekly cross-role integration review.
3. Sprint-end artifacts required:
- risk register delta
- HIPAA evidence checklist
- cross-role test report
- migration/backfill verification report

## Risks and Mitigations
1. Partial contract migrations causing dual behavior.
- Mitigation: event-family cutovers with temporary compatibility adapters.
2. Legacy path removal breaking hidden dependencies.
- Mitigation: shadow telemetry and phased deprecation.
3. Multi-stream rollout masking regressions.
- Mitigation: role-based canaries and per-stream SLO alerts.

## Current Program Snapshot
1. Phase 0: completed and signed off.
2. Phase 1: in progress (connectivity-first tranche active).
3. Phase 2-4: sequenced behind remaining Phase 1 closure items.

## Completed Implementation Update (As of February 23, 2026)
Status values: `completed`, `in_progress`, `not_started`.

### Connectivity-First Implementation Progress
1. `CI-001` (`completed`)
- Canonical notification adapter is active in orchestrator flow.

2. `CI-003` (`completed`)
- Receptionist check-in flows now emit canonical `patient.checked_in` workflow event in both:
  - `src/components/receptionist/EnhancedCheckIn.tsx`
  - `src/components/receptionist/PatientCheckInModal.tsx`
- Both pathways now share a unified check-in contract hook for appointment and walk-in processing.
- File:
  - `src/hooks/useUnifiedCheckIn.ts`

3. `CI-007` (`completed`)
- Quick consultation handoff moved to canonical orchestrator events for:
  - `prescription.created`
  - `lab.order_created`
  - `consultation.completed`
- File:
  - `src/components/consultations/QuickConsultationModal.tsx`
- Additional canonical handoff coverage now active in:
  - `src/pages/consultations/ConsultationWorkflowPage.tsx` (`consultation.completed`)
  - `src/components/nurse/EnhancedTriagePanel.tsx` (`patient.ready_for_doctor`)
  - `src/components/nurse/PatientPrepChecklistCard.tsx` (`patient.ready_for_doctor`)
  - `src/components/pharmacist/PrescriptionQueue.tsx` (`medication.dispensed`)

4. `CI-006` (`completed`)
- Queue dedupe logic updated to treat `in_prep` as active and prevent duplicate queue entries.
- File:
  - `src/hooks/useQueue.ts`

5. `CI-002` (`completed`)
- Webhook service lab event constants aligned with canonical workflow naming:
  - `lab.order_created`
  - `lab.results_ready`
- File:
  - `src/utils/webhookService.ts`

6. `CI-005` (`completed`)
- Patient portal appointment/prescription/lab hooks now resolve patient ID via shared identity resolver.
- File:
  - `src/hooks/usePatientPortal.ts`
- Enhanced portal health record actions and records tab now use canonical `patients.id` instead of `profile.id`.
- File:
  - `src/pages/patient/EnhancedPortalPage.tsx`

7. `CI-013`, `CI-015`, `CI-019`, `CI-020` (`completed`)
- Previous tranche fixes remain intact and validated.

8. `CI-014` (`completed`)
- Clinical pharmacy and DUR review surfaces now use normalized `prescription_items[]` DTO fallback for medication display.
- Files:
  - `src/hooks/useClinicalPharmacy.ts`
  - `src/hooks/useDrugUtilizationReview.ts`
  - `src/components/pharmacist/ClinicalServices.tsx`

9. `CI-006` (`completed`)
- Consultation workflow statuses normalized to canonical stage statuses and legacy compatibility mapping.
- Queue optimizer status normalization aligned to canonical queue statuses (`in_prep`, `in_service`) with legacy fallback support.
- Files:
  - `src/hooks/useConsultations.ts`
  - `src/utils/consultationTransformers.ts`
  - `src/components/receptionist/QueueOptimizer.tsx`

10. `CI-004` (`completed`)
- Patient portal hook consumers now follow hook contracts directly (`appointments/loading`, `labResults/loading`, `prescriptions/loading`, `profile/loading`, `vitals/loading`) without React Query-style destructuring drift.
- `usePatientVitals` now resolves patient ID via shared resolver when caller does not pass explicit `patientId`.
- Files:
  - `src/pages/patient/PatientAppointmentsPage.tsx`
  - `src/pages/patient/PatientLabResultsPage.tsx`
  - `src/pages/patient/PatientMedicalHistoryPage.tsx`
  - `src/pages/patient/PatientPrescriptionsPage.tsx`
  - `src/hooks/usePatientPortal.ts`

11. `CI-018` (`completed`)
- Receptionist quick payment now enforces outstanding-invoice bounds and uses strict invoice/payment payload mapping.
- Files:
  - `src/components/receptionist/QuickPaymentWidget.tsx`

12. `CI-007` (`completed`)
- Workflow orchestrator now enforces best-effort duplicate event suppression and awaited exponential retry backoff for action execution.
- File:
  - `src/hooks/useWorkflowOrchestrator.ts`

13. `CI-008` (`completed`)
- Admin user-management profile fetch/update/suspend flows now apply hospital-scoped filtering.
- Files:
  - `src/hooks/useAdminUserManagement.ts`
  - `src/utils/adminUserManagementService.ts`

14. `CI-010` (`completed`)
- Consultations page now supports idempotent quick-start via `?patientId=` query param, auto-creating/opening consultation once and clearing the URL param.
- File:
  - `src/pages/consultations/ConsultationsPage.tsx`

15. `CI-012` (`completed`)
- Diagnosis summary generation now prefers `diagnoses[]` with fallback to `final_diagnosis` / legacy diagnosis string.
- Files:
  - `src/pages/consultations/ConsultationWorkflowPage.tsx`
  - `src/components/patient/AfterVisitSummaryGenerator.tsx`

16. `CI-016` (`completed`)
- Canonical lab priority boundary mapper added and applied to consultation lab-order creation paths.
- Files:
  - `src/utils/labPriority.ts`
  - `src/pages/consultations/ConsultationWorkflowPage.tsx`
  - `src/components/consultations/QuickConsultationModal.tsx`

17. `CI-023` (`completed`)
- Role-based route guard now supports permission checks and key protected routes are aligned with sidebar permission requirements.
- Files:
  - `src/components/auth/RoleProtectedRoute.tsx`
  - `src/App.tsx`

18. `CI-011` (`completed`)
- Consultation model now exposes split lifecycle and workflow-stage fields (`consultation_status`, `workflow_stage`) with compatibility derivation from legacy status values.
- Files:
  - `src/hooks/useConsultations.ts`
  - `src/utils/consultationTransformers.ts`

19. `CI-024` (`completed`)
- Integration/admin persistence is completed across task assignment (`workflow_tasks`), inter-role messaging (`messages`), and user realtime updates (`notifications`) with no mock payload path left in active integration hooks.
- File:
  - `src/hooks/useIntegration.ts`

20. `CI-017` (`completed`)
- Lab queue UI status usage is fully aligned to canonical `sample_collected` in enhanced lab order queue filters/actions.
- File:
  - `src/components/lab/EnhancedLabOrderQueue.tsx`

### Validation Completion (This Iteration)
1. Type safety validation passed: `npm run type-check`.

### Remaining Work
1. No remaining items in this tracked CI set (`CI-001` through `CI-024` all completed in tracker).

### Checkbox Status Tracker
- [x] `CI-001`
- [x] `CI-002`
- [x] `CI-003`
- [x] `CI-004`
- [x] `CI-005`
- [x] `CI-006`
- [x] `CI-007`
- [x] `CI-008`
- [x] `CI-009`
- [x] `CI-010`
- [x] `CI-011`
- [x] `CI-012`
- [x] `CI-013`
- [x] `CI-014`
- [x] `CI-015`
- [x] `CI-016`
- [x] `CI-017`
- [x] `CI-018`
- [x] `CI-019`
- [x] `CI-020`
- [x] `CI-021`
- [x] `CI-022`
- [x] `CI-023`
- [x] `CI-024`

### Checkbox Task Tracker (Connectivity Program)
- [x] Receptionist check-in event contract consolidation
- [x] Nurse-ready event contract consolidation
- [x] Consultation completion event contract consolidation
- [x] Pharmacy dispense event contract consolidation
- [x] Queue dedupe update for `in_prep`
- [x] Lab results workflow payload includes resolved doctor auth-user identity (`CI-005` slice)
- [x] Shared lab status mapping fixed to `sample_collected` in stats/pending queries (`CI-006` slice)
- [x] Enhanced pharmacy queue now renders medication data from `items[]` (`CI-014` slice)
- [x] Patient messaging contacts now support configurable role allowlist (`CI-021`)
- [x] Patient billing components now default to live query data with no production mock fallback (`CI-022` slice)
- [x] Patient portal schema alignment updated for appointments/labs/vitals/prescriptions (`CI-004` slice)
- [x] Digital check-in workflow now persists current step/session progress (`CI-022` slice)
- [x] Pending prescription DTO normalized for dashboard queue consumers (`CI-014` slice)
- [x] Webhook lab event constants aligned to canonical dot-notation names (`CI-002` slice)
- [x] Duplicate constructor removed from webhook service lifecycle (`CI-002` slice)
- [x] Patient portal clinical hooks use shared identity resolver for patient-id lookup (`CI-005` slice)
- [x] Enhanced portal record actions now resolve/use `patients.id` (`CI-005` slice)
- [x] Clinical pharmacy and DUR medication summaries normalized for `prescription_items[]` compatibility (`CI-014` slice)
- [x] Identity resolver rollout completion (`CI-005`)
- [x] Status harmonization completion (`CI-006`)
- [x] Pharmacy DTO normalization completion (`CI-014`)
- [x] Patient portal page consumers normalized to actual hook return contracts (`CI-004` slice)
- [x] `usePatientVitals` fallback identity resolution added for non-explicit patient-id calls (`CI-004` slice)
- [x] Receptionist quick-payment payload and settlement bounds aligned with invoice model (`CI-018` slice)
- [x] Workflow orchestrator dedupe window and awaited retry backoff implemented (`CI-007` slice)
- [x] Hospital-scoped admin user-management profile filters implemented (`CI-008` slice)
- [x] Unified receptionist check-in contract hook implemented and adopted in modal/check-in panel (`CI-003` slice)
- [x] Consultations page query-param quick-start flow implemented with idempotent create/open behavior (`CI-010` slice)
- [x] Diagnosis summary source normalized to `diagnoses[]` with fallback logic (`CI-012` slice)
- [x] Canonical lab-priority boundary mapper applied to consultation handoff order paths (`CI-016` slice)
- [x] Route guard permission checks aligned to shared sidebar permission model (`CI-023` slice)
- [x] Consultation lifecycle/workflow-stage split exposed in shared consultation model (`CI-011` slice)
- [x] Integration task-assignment workflow moved from mock to persisted DB-backed operations (`CI-024` slice)
- [x] Enhanced lab queue surface status model aligned to canonical `sample_collected` status (`CI-017` slice)
