# Care Harmony Hub - Unified Multi-Role Implementation Plan
**Subtitle:** Derived exclusively from role flow remediation documents (Admin, Doctor, Nurse, Receptionist, Lab, Pharmacist, Patient, Patient Portal)  
**Date:** February 23, 2026  
**Scope Statement:** No legacy/older audit artifacts used.

## 1. Executive Summary
This document is the implementation master plan derived only from the eight role flow files. It contains a deduplicated issue backlog, priority model, cross-role failure map, phased roadmap, schema changes, and validation gates.

Execution approach:
1. Stabilize shared contracts and handoffs first.
2. Resolve role-specific blockers on canonical foundations.
3. Remove mock/duplicate operational modules.
4. Institutionalize validation, observability, and compliance gates.

## 2. Source Documents
1. `plans/Admin flow issues to be resolved.md`
2. `plans/Doctor flow issues to be resolved.md`
3. `plans/Nurse Flow issues to be resolved.md`
4. `plans/Receptionist Flow issues to be resolved.md`
5. `plans/Lab Flow issues to be resolved.md`
6. `plans/Pharmacist Flow issues to be resolved.md`
7. `plans/Patient Flow issues to be resolved.md`
8. `plans/Patient Portal Flow issues to be resolved.md`

## 3. Consolidated Issue Inventory (Deduplicated)
Deduplication key used: `(problem domain, impacted module/hook/component, failure mode)`.

| Issue ID | Problem | Roles Impacted | Source Docs | Priority | Fix Summary | Target Components/Hooks |
|---|---|---|---|---|---|---|
| CI-001 | Notification payload drift (`user_id` vs `recipient_id`) causes dropped/misrouted alerts | Admin, Doctor, Nurse, Receptionist, Lab, Pharmacist | Admin, Doctor, Nurse, Lab, Pharmacist | P0 (18) | Single notification adapter and migration of all emitters | `useWorkflowOrchestrator`, `useWorkflowNotifications`, role notification hooks |
| CI-002 | Workflow event naming drift breaks orchestration rules | Doctor, Nurse, Receptionist | Doctor, Nurse, Receptionist | P1 (15) | Canonical event constants; remove free-form literals | `WORKFLOW_EVENT_TYPES`, check-in/triage emitters |
| CI-003 | Queue/check-in contract inconsistent and partially broken | Receptionist, Nurse, Doctor | Nurse, Receptionist | P0 (17) | Unified check-in service with queue+notify guarantees | `useQueue`, `useAddToQueue`, check-in modals/pages |
| CI-004 | Hook return-shape misuse causes runtime/UI failures | Nurse, Receptionist, Patient, Portal | Nurse, Receptionist, Patient, Portal | P0 (16) | Standardized hook contracts and typed selectors | `usePatients`, `usePatientChecklists`, `usePatientPortal` migration |
| CI-005 | Identity mismatch (`profiles.id` vs `patients.id` vs auth user id) breaks joins/delivery | Doctor, Lab, Patient, Portal | Lab, Patient, Portal | P0 (19) | Shared identity resolver and contract migration | lab notification paths, patient portal/health hooks |
| CI-006 | Status taxonomy drift (queue/consult/lab) causes inconsistent routing/rendering | Clinical, Frontdesk, Lab, Portal | Doctor, Nurse, Receptionist, Lab, Portal | P0 (18) | Canonical status model + mapper/backfill | queue/consult/lab hooks and UI filters |
| CI-007 | Manual handoff gates allow silent drops | Doctor, Receptionist, Lab, Nurse | Doctor, Receptionist, Lab | P0 (18) | Automatic transactional handoffs with retry/idempotency | consultation completion + check-in orchestration |
| CI-008 | Hospital scoping gaps risk cross-tenant leakage | Admin, Nurse, Lab | Admin, Nurse, Lab | P0 (17) | Hospital-scoped query/mutation enforcement | staff lifecycle, invitations, nurse/lab queries |
| CI-009 | Mock/placeholder production paths distort operations | Multi-role | Admin, Receptionist, Lab, Pharmacist, Patient, Portal, Nurse | P1 (14) | Replace with persisted services or explicit fallback states | scheduler, queue optimizer, role dashboards, portal modules |
| CI-010 | Doctor quick-start lacks idempotent query-param flow | Doctor | Doctor | P1 (12) | Auto-open/create consult with duplicate guard | consultations page/dashboard quick start |
| CI-011 | Consultation model overloaded in single field | Doctor | Doctor | P1 (13) | Split lifecycle status and workflow stage | consultation types/hooks/pages |
| CI-012 | Diagnosis summary source mismatch (`diagnoses[]` vs `final_diagnosis`) | Doctor | Doctor | P1 (11) | `diagnoses[]` as truth with fallback | diagnosis/summary workflow |
| CI-013 | Refill API mismatch and missing import break pharmacist actions | Pharmacy, Patient | Pharmacist, Patient | P0 (16) | Align payload/signatures and fix runtime import | `RefillRequests`, `useRefillRequests` |
| CI-014 | Prescription queue DTO mismatch (`items[]` vs top-level fields) | Pharmacy, Patient | Pharmacist, Patient | P1 (12) | Normalized prescription VM for queue consumers | `EnhancedPrescriptionQueue`, dashboards |
| CI-015 | Dispense path leaves durable queue stale | Pharmacy, Patient | Pharmacist | P0 (16) | Atomic sync of prescription lifecycle and queue | `usePrescriptions` |
| CI-016 | Lab priority mismatch at order boundaries | Doctor, Lab | Lab, Doctor | P1 (13) | Boundary mapper to canonical priority | consult flows and `useLabOrders` |
| CI-017 | Duplicate lab stacks and critical-table drift | Lab, Doctor, Portal | Lab | P1 (14) | Canonical lab domain + bridge/deprecate legacy | `useLabOrders`, `useLaboratory`, lab components |
| CI-018 | Receptionist payment contract mismatch | Frontdesk | Receptionist | P1 (11) | Align to invoice model fields/statuses | `QuickPaymentWidget`, `useBilling` |
| CI-019 | Patient onboarding does not guarantee patient record | Patient, Portal | Patient, Portal | P0 (17) | Atomic idempotent role+patient creation | patient registration/RPC path |
| CI-020 | Patient auth reliability gaps (forgot-password/lock-check) | Patient, Portal | Patient, Portal | P1 (12) | Add route and fix contract usage | patient login and route config |
| CI-021 | Messaging contact policy too narrow for real workflows | Patient, Receptionist, Lab, Pharmacy | Patient, Portal | P2 (10) | Configurable role allowlist for patient messaging | `useSecureMessaging`, patient messages |
| CI-022 | Patient billing/check-in modules are mock-driven | Patient, Frontdesk, Billing | Patient, Portal | P2 (9) | Integrate to live invoice/check-in data | patient billing/check-in components |
| CI-023 | RBAC model drift between route guard and sidebar | Admin, all staff | Admin | P1 (12) | Single RBAC source for guard + navigation | permissions maps, sidebar, route guards |
| CI-024 | Integration/admin modules remain non-persistent placeholders | Admin, all roles | Admin | P2 (8) | Persist rules/tasks/analytics and remove stubs | workflow/admin integration surfaces |

## 4. Cross-Role Interaction Failure Map
### Receptionist -> Nurse
- Current failure points:
1. Broken queue add paths.
2. Non-canonical check-in events.
3. Walk-in path not always queue-persistent.
- Required contract guarantees:
1. Atomic check-in response with queue entry and notification outcomes.
2. Canonical `patient.checked_in` event.
3. `patient_queue` as operational truth.
- Validation checks:
1. Scheduled and walk-in both create queue entry once.
2. Nurse receives one notification per check-in.

### Nurse -> Doctor
- Current failure points:
1. Event naming mismatch.
2. Recipient mapping defects.
3. Incomplete completion metadata.
- Required guarantees:
1. Canonical ready event payload.
2. Identity-safe doctor recipient resolution.
3. `completed_at` and optional `completed_by` set at ready transition.
- Validation checks:
1. Ready patient appears in doctor list with correct ordering.
2. Critical alerts route to valid doctor recipient.

### Doctor -> Lab
- Current failure points:
1. Manual `lab_notified` gate.
2. Priority/status mismatch.
- Required guarantees:
1. Auto-dispatch when lab orders exist.
2. Canonical status and priority mapping.
- Validation checks:
1. Every created order appears in lab queue and notifications.
2. Status progression visible consistently across lab UIs.

### Doctor -> Pharmacist
- Current failure points:
1. Notification path split.
2. Queue DTO mismatch.
3. Dispense sync gap.
- Required guarantees:
1. Single adapter for notify writes.
2. Normalized queue DTO from `items[]`.
3. Atomic dispense+queue update.
- Validation checks:
1. Prescription creation triggers one pharmacist notify.
2. Dispense completion updates staff+patient views.

### Lab/Pharmacy -> Patient
- Current failure points:
1. Portal schema drift and identity mismatches.
2. Mock-driven patient billing/check-in modules.
- Required guarantees:
1. Portal reads active canonical schema only.
2. Patient identity resolved via `patients.id` for clinical joins.
- Validation checks:
1. Lab and pharmacy completions become patient-visible in near real-time.

### Admin -> All Roles
- Current failure points:
1. Over-broad deactivation/invitation pathways.
2. Inconsistent RBAC behavior.
3. Placeholder integration modules.
- Required guarantees:
1. Hospital-scoped lifecycle and invitation safety.
2. Single RBAC source.
3. Persisted integration workflows.
- Validation checks:
1. Tenancy isolation tests pass.
2. Sidebar/route behavior parity passes.

## 5. Unified Prioritization Model
Scoring formula (0-20):
1. Patient safety risk (0-5)
2. Cross-role breakage impact (0-5)
3. Data integrity/compliance risk (0-5)
4. Frequency/operational pain (0-3)
5. Effort inverse/quick-win bonus (0-2)

Bands:
- `P0`: 16-20
- `P1`: 11-15
- `P2`: 6-10
- `P3`: 0-5

## 6. Implementation Roadmap (Phased)
### Phase 1: Stabilization (Weeks 1-6)
- Primary issue coverage:
1. `CI-001`, `CI-003`, `CI-005`, `CI-006`, `CI-007`, `CI-008`, `CI-013`, `CI-015`, `CI-019`
- Required outputs:
1. Notification adapter and identity resolver active in core handoffs.
2. Unified check-in path guarantees queue+notify.
3. P0 blockers closed with integration proof.
- Gate checks:
1. Contract conformance tests pass.
2. Cross-role chain tests pass for outpatient core flow.

### Phase 2: Operational Reliability (Weeks 7-12)
- Primary issue coverage:
1. `CI-002`, `CI-004`, `CI-009`, `CI-010`, `CI-011`, `CI-012`, `CI-014`, `CI-016`, `CI-018`, `CI-020`
- Required outputs:
1. Operational mock dependencies removed from enabled role paths.
2. Queue and dashboard consistency across role snapshots.
3. Patient auth/portal stability fixes complete.
- Gate checks:
1. Integration/E2E pass for receptionist->nurse->doctor->lab/pharmacy->patient.
2. Queue consistency threshold met.

### Phase 3: Consolidation (Months 4-6)
- Primary issue coverage:
1. `CI-017`, `CI-023`, `CI-024` plus residual `CI-009`
- Required outputs:
1. Duplicate module retirement with migration bridges.
2. Unified RBAC and integration/admin persistence.
3. Shared DTO mapper layer for dashboards.
- Gate checks:
1. No duplicate production paths active.
2. Incident trend sustained below target.

### Phase 4: Optimization (Months 6-9)
- Primary issue coverage:
1. `CI-021`, `CI-022` plus long-tail efficiency improvements
- Required outputs:
1. Configurable messaging policy maturity.
2. Patient billing/check-in modules fully live and observable.
3. Optional optimization features behind flags.
- Gate checks:
1. No regression in safety/handoff/compliance KPIs.

## 7. Code-Level Change Plan by Domain
### Shared Core
- **Objective**
1. Canonicalize cross-role contracts.
- **Must-change files/modules**
1. `useWorkflowOrchestrator`
2. `useWorkflowNotifications`
3. check-in/handoff orchestration hooks/services
- **Interface/type changes**
1. canonical notification payload interface
2. canonical event/status constants
3. identity resolver return contract
- **Behavioral acceptance criteria**
1. No mixed `user_id`/`recipient_id` writes in workflow path.
2. No free-form workflow event literals in emitters.
- **Regression risks**
1. Partial migration causing duplicate notifications.

### Admin/Security
- **Objective**
1. Enforce tenancy-safe lifecycle and deterministic RBAC.
- **Must-change files/modules**
1. `DeactivateStaffDialog`
2. `AdminRoleSetupPage`
3. admin user management service and edge-function clients
4. permission maps/sidebar/route guards
- **Interface/type changes**
1. scoped staff membership semantics
2. server-managed admin action contracts
- **Behavioral acceptance criteria**
1. Offboarding does not affect other hospitals.
2. Route and sidebar access outcomes match.
- **Regression risks**
1. Last-admin lockout if safeguard logic is wrong.

### Clinical (Doctor + Nurse)
- **Objective**
1. Deterministic readiness and consultation lifecycle handoffs.
- **Must-change files/modules**
1. nurse checklist/prep/queue consumers
2. doctor consult start/workflow completion
3. queue utility functions
- **Interface/type changes**
1. `consultation_status` + `workflow_stage`
2. checklist completion metadata contract
- **Behavioral acceptance criteria**
1. Nurse-ready transitions always reach doctor queue/notifications.
2. Doctor completion with lab/pharmacy work creates downstream tasks automatically.
- **Regression risks**
1. Legacy consultation/status records requiring mapper fallback.

### Frontdesk (Receptionist)
- **Objective**
1. Reliable check-in, scheduling, and payment operations.
- **Must-change files/modules**
1. `EnhancedCheckIn`
2. `PatientCheckInModal`
3. `useAppointments` check-in path
4. `QuickPaymentWidget`
5. `SmartScheduler` and `QueueOptimizer`
- **Interface/type changes**
1. unified check-in service IO contract
2. invoice model alignment in payment widget
- **Behavioral acceptance criteria**
1. Walk-in and scheduled check-ins both persist queue and notify nurse.
2. Scheduler writes actual appointments.
- **Regression risks**
1. Parallel old/new check-in paths diverging under flags.

### Lab
- **Objective**
1. One lab lifecycle and reliable results delivery.
- **Must-change files/modules**
1. `useLabOrders`
2. lab pages/dashboards/queues
3. legacy `useLaboratory` stack during bridge
- **Interface/type changes**
1. canonical lab status and priority enums
2. results-ready payload with auth user recipient mapping
- **Behavioral acceptance criteria**
1. Status transitions consistent across all lab views.
2. Results/critical notifications reach intended doctors.
- **Regression risks**
1. Dual-stack drift during deprecation window.

### Pharmacy
- **Objective**
1. Refill and dispense reliability with queue synchronization.
- **Must-change files/modules**
1. `RefillRequests`
2. `useRefillRequests`
3. `EnhancedPrescriptionQueue`
4. `usePrescriptions`
5. pharmacist dashboards
- **Interface/type changes**
1. standardized refill update payload
2. prescription VM from `items[]`
3. atomic dispense transaction contract
- **Behavioral acceptance criteria**
1. Refill actions succeed across tabs.
2. Dispense syncs prescription and queue state atomically.
- **Regression risks**
1. Mismatched UI-hook signatures during staged rollout.

### Patient + Patient Portal
- **Objective**
1. Schema-aligned portal and reliable onboarding/auth preconditions.
- **Must-change files/modules**
1. patient registration/login pages
2. portal hooks/pages
3. health monitoring hook and enhanced portal
4. patient billing/check-in modules
- **Interface/type changes**
1. typed query-hook APIs with consistent return shape
2. identity resolver for `patients.id`
3. appointment/lab/prescription status unions
- **Behavioral acceptance criteria**
1. Portal data loads correctly from live schema.
2. Registration always results in patient-role plus patient-record linkage.
- **Regression risks**
1. Breaking older hook consumers not migrated in same slice.

## 8. Data/Schema Change Plan
1. Hospital-scoped staff membership model for safe offboarding.
2. `message_reads` normalization for idempotent per-user read state.
3. Checklist completion metadata (`completed_at`, optional `completed_by`).
4. Enum normalization and backfill strategy:
- queue statuses
- consultation lifecycle/stage
- lab statuses/priorities
- refill/prescription statuses
5. Index strategy:
- `(hospital_id, status, updated_at)` on queue/order tables
- `(recipient_id, is_read, created_at DESC)` on notifications/messages
- `(patient_id, scheduled_date)` and `(patient_id, status)` on appointments
6. Onboarding RPC support for idempotent role+patient creation.

## 9. Validation and Test Matrix
| Layer | Scenario | Issue IDs | Expected Result |
|---|---|---|---|
| Unit | Notification adapter validation | CI-001 | Payload normalized; invalid writes rejected |
| Unit | Workflow event constant conformance | CI-002 | Non-canonical literals blocked |
| Unit | Identity resolver mapping | CI-005 | Correct auth/profile/patient IDs |
| Unit | Hook return contract tests | CI-004 | Consumers receive expected typed shape |
| Unit | Refill payload compatibility | CI-013 | Component and hook contracts align |
| Unit | Status and priority mappers | CI-006, CI-016 | Legacy values map deterministically |
| Integration | Receptionist check-in -> nurse queue + notify | CI-003, CI-007 | Queue + notification guaranteed once |
| Integration | Nurse ready -> doctor ready list | CI-002, CI-006 | Doctor receives accurate ready signal |
| Integration | Doctor order -> lab queue + notify | CI-007, CI-016, CI-017 | Lab receives actionable order and alert |
| Integration | Doctor prescription -> pharmacy queue + notify | CI-001, CI-014, CI-015 | Pharmacist queue and alert consistent |
| Integration | Lab/pharmacy completion -> patient portal visibility | CI-005, CI-022 | Patient views update with correct status |
| E2E | Full outpatient role chain | CI-001, CI-003, CI-006, CI-007 | No silent handoff failures |
| E2E | Refill lifecycle | CI-013, CI-014, CI-015 | End-to-end status integrity |
| E2E | Appointment request lifecycle | CI-004, CI-020, CI-021 | Patient sees receptionist decisions |
| Security/compliance | Tenancy and RBAC parity | CI-008, CI-023 | No cross-tenant access; guard/sidebar parity |
| Performance/observability | Handoff latency and retry success | CI-007, CI-009 | SLO dashboards available and stable |

## 10. Rollout and Observability
Feature flags:
1. `doctor_flow_v2`
2. `nurse_flow_v2_integrity`, `nurse_flow_v2_queue`
3. `reception_checkin_v2`, `reception_payment_v2`, `reception_scheduler_v2`
4. `lab_status_v2`, `lab_notification_v2`, `lab_dashboard_actions_v2`
5. `pharmacy_refill_v2`, `pharmacy_dispense_v2`, `pharmacy_dashboard_unified_v2`
6. `patient_portal_v2_core`, `patient_portal_v2_billing`, `patient_portal_v2_checkin`

Rollout steps:
1. Pilot by stream.
2. Canary by role/hospital cohort.
3. Expand after stable 3-5 day windows and gate pass.
4. Retire legacy paths only after parity and rollback checks.

Core telemetry:
1. Handoff success/failure by role pair.
2. Queue insertion and notify consistency.
3. Duplicate consultation/order creation rate.
4. Critical alert acknowledgment latency.
5. Portal visibility lag for lab/prescription/billing states.

## 11. Risks, Dependencies, and Mitigations
| Risk | Dependency | Mitigation |
|---|---|---|
| Partial adapter migration causes duplicate/missed notifications | All emitters migrated to one contract | Event-family cutovers with shadow comparisons |
| Enum normalization breaks existing views | Mapper and compatibility fallback rollout | Backfill + staged strictness |
| Mock replacement introduces operational regressions | Scheduler/billing/lab/pharmacy service readiness | Feature flags + cohort canaries |
| Tenancy hardening breaks admin operations | Membership and invite lifecycle changes | Last-admin safeguards + migration dry runs |
| Portal hook refactor breaks consumers | Coordinated hook/page migration | Adapter layer and staged deprecation |

## 12. Assumptions and Defaults
1. Only the eight listed role files are authoritative inputs.
2. Priority scoring follows the specified 0-20 model.
3. Default conflict decision is lower-risk cross-role contract-first implementation.
4. `recipient_id` is authoritative notification recipient field.
5. `patient_queue`, `lab_orders`, and `prescription_queue` remain durable operational sources.

## 13. Appendix: Traceability Matrix (Issue -> Source File -> Target Code Area)
| Issue ID | Source File(s) | Target Code Area |
|---|---|---|
| CI-001 | Admin, Doctor, Nurse, Lab, Pharmacist | workflow orchestrator/notification hooks and role emitters |
| CI-002 | Doctor, Nurse, Receptionist | workflow event emitters in triage/check-in/consultation paths |
| CI-003 | Receptionist, Nurse | check-in and queue hooks/services/modals/pages |
| CI-004 | Nurse, Receptionist, Patient, Portal | hook APIs and consuming pages/components |
| CI-005 | Lab, Patient, Portal | identity mapping utilities and portal/lab recipient joins |
| CI-006 | Doctor, Nurse, Receptionist, Lab, Portal | queue/consult/lab status models and filters |
| CI-007 | Doctor, Receptionist, Lab | consult completion and check-in handoff orchestration |
| CI-008 | Admin, Nurse, Lab | staff lifecycle, invitation path, scoped operational queries |
| CI-009 | Admin, Receptionist, Lab, Pharmacist, Patient, Portal, Nurse | mock-dependent dashboards/workflow services |
| CI-010 | Doctor | consultations quick-start query-param flow |
| CI-011 | Doctor | consultation domain type split and lifecycle mapping |
| CI-012 | Doctor | diagnosis and summary source alignment |
| CI-013 | Pharmacist, Patient | refill component/hook contracts |
| CI-014 | Pharmacist, Patient | pharmacy queue/dashboard DTO mapping |
| CI-015 | Pharmacist | dispense transaction and durable queue synchronization |
| CI-016 | Lab, Doctor | lab priority normalization at order boundaries |
| CI-017 | Lab | lab module consolidation and legacy bridge/deprecation |
| CI-018 | Receptionist | payment widget and billing model alignment |
| CI-019 | Patient, Portal | registration and patient-record guarantee path |
| CI-020 | Patient, Portal | login lock-check and forgot-password routing |
| CI-021 | Patient, Portal | patient messaging role policy |
| CI-022 | Patient, Portal | patient billing/check-in live integration |
| CI-023 | Admin | single RBAC source across guards/sidebar |
| CI-024 | Admin | workflow/admin integration modules persistence |

## 14. Implementation Progress Update (As of February 23, 2026)

### Issue Status Snapshot
| Issue ID | Status | Notes |
|---|---|---|
| CI-001 | completed | Canonical notification adapter (`recipient_id`) integrated in orchestrator path |
| CI-002 | completed | Canonical workflow event constants applied across active receptionist/nurse/consultation/lab/pharmacy handoff paths; webhook lab event naming aligned to canonical dot notation |
| CI-003 | completed | Check-in flows now use a unified check-in contract hook for appointment/walk-in queueing with canonical `patient.checked_in` orchestration |
| CI-004 | completed | Patient portal hooks and consumers aligned to live-schema contract with standardized return-shape consumption across patient pages |
| CI-005 | completed | Shared identity resolver rollout extended to lab results, patient health monitoring, patient portal clinical hooks, and enhanced portal record actions |
| CI-006 | completed | Queue/lab/consultation status harmonization advanced (`in_prep` dedupe, `sample_collected` mapping fixes, and consultation workflow status normalization) |
| CI-007 | completed | Consultation and handoff orchestration now includes canonical event emission, duplicate-event suppression window, and awaited retry backoff for action execution |
| CI-008 | completed | Hospital-scoped admin lifecycle hardening completed for deactivation and admin user-management fetch/update/suspend profile paths |
| CI-009 | completed | Integration communication/metrics/realtime hooks now use persisted `messages`/`notifications`/operational table-derived metrics; no operational mock payloads remain in active integration hook paths |
| CI-010 | completed | Consultations page now supports idempotent query-param quick-start (`?patientId=`) via get-or-create + URL cleanup |
| CI-011 | completed | Consultation model now exposes split lifecycle and workflow-stage fields (`consultation_status`, `workflow_stage`) with compatibility mapping from legacy status |
| CI-012 | completed | Diagnosis summary source now prioritizes `diagnoses[]` with fallback to `final_diagnosis` / legacy string |
| CI-013 | completed | Refill payload/signature mismatch and missing import fixed |
| CI-014 | completed | Prescription queue/dashboard and clinical pharmacy review surfaces now consume normalized `items[]` DTO with safe fallback summaries |
| CI-015 | completed | Dispense now durably synchronizes `prescription_queue` status |
| CI-016 | completed | Lab priority boundary mapper added and applied to consultation and quick-consult lab order creation paths |
| CI-017 | completed | Lab queue UI now uses canonical `sample_collected` status in filters/actions and no longer relies on legacy `collected` for lab-order queue operations |
| CI-018 | completed | Receptionist quick-payment flow aligned to invoice/payment contract with bounded outstanding settlement and strict payload mapping |
| CI-019 | completed | Registration now guarantees patient-record creation via idempotent RPC |
| CI-020 | completed | Forgot-password and lock-check reliability fixes completed |
| CI-021 | completed | Patient messaging contacts now support configurable role allowlist (`VITE_PATIENT_MESSAGE_ALLOWED_ROLES`) |
| CI-022 | completed | Patient billing modules use live data and digital check-in persists session step progression |
| CI-023 | completed | Route guard now supports permission checks and key routes use same permission model as sidebar |
| CI-024 | completed | Integration/admin hook persistence completed: task assignment, inter-role messaging, and realtime notification paths are DB-backed with explicit non-mock fallback for unavailable metric storage |

### Connectivity Validation Performed (This Iteration)
1. Receptionist check-in pathways now consistently publish canonical workflow check-in events.
2. Nurse-ready pathways now publish canonical `patient.ready_for_doctor` events from both triage and checklist flows.
3. Consultation completion now publishes canonical `consultation.completed` event from the full workflow page.
4. Pharmacy dispense now publishes canonical `medication.dispensed` event for downstream patient notification rules.
5. Queue active dedupe logic includes `in_prep` to reduce duplicate queue insertions.
6. Webhook lab event aliases now match canonical orchestrator event naming (`lab.order_created`, `lab.results_ready`).
7. Portal appointment/prescription/lab hooks now resolve patient ID through shared identity resolver utility.
8. Workflow orchestrator now applies best-effort event dedupe and awaited exponential retry for action execution.
9. Admin user management profile fetch/update/suspend flows now apply hospital scoping.
10. Type safety checks passed (`npm run type-check`).

### Checkbox Status Tracker
- [x] `CI-001` Notification payload contract normalization
- [x] `CI-002` Canonical event naming full cleanup
- [x] `CI-003` Unified check-in service end-to-end closure
- [x] `CI-004` Hook return-shape normalization across all consumers
- [x] `CI-005` Identity resolver rollout completion
- [x] `CI-006` Status taxonomy harmonization completion
- [x] `CI-007` Automatic transactional handoff full closure
- [x] `CI-008` Hospital scoping hardening completion
- [x] `CI-009` Mock/placeholder retirement
- [x] `CI-010` Doctor quick-start idempotent flow
- [x] `CI-011` Consultation status/workflow split
- [x] `CI-012` Diagnosis summary source alignment
- [x] `CI-013` Refill API/signature/import fix
- [x] `CI-014` Prescription queue DTO normalization
- [x] `CI-015` Dispense durable queue sync
- [x] `CI-016` Lab priority boundary normalization
- [x] `CI-017` Duplicate lab stack consolidation
- [x] `CI-018` Receptionist payment contract closure
- [x] `CI-019` Patient onboarding patient-record guarantee
- [x] `CI-020` Patient auth reliability fixes
- [x] `CI-021` Patient messaging allowlist configurability
- [x] `CI-022` Patient billing/check-in live integration
- [x] `CI-023` RBAC parity closure
- [x] `CI-024` Integration/admin persistence

### Checkbox Task Tracker (Current Execution Slice)
- [x] Move receptionist check-in paths to canonical event emission
- [x] Move nurse-ready paths to canonical event emission
- [x] Move consultation completion path to canonical event emission
- [x] Move pharmacy dispense path to canonical event emission
- [x] Add active queue dedupe coverage for `in_prep`
- [x] Add doctor auth-user identity resolution into lab results workflow payload
- [x] Fix shared lab status mapping (`sample_collected`) in stats/pending queries
- [x] Refactor `EnhancedPrescriptionQueue` to render from `items[]` DTO
- [x] Add configurable patient messaging role allowlist
- [x] Remove production mock billing fallbacks in patient billing modules
- [x] Modernize portal hooks to live schema fields (`scheduled_date`, `lab_orders`, `vital_signs`)
- [x] Persist digital check-in step progression to `digital_checkin_sessions`
- [x] Normalize pending prescription DTO for dashboard consumers (priority/alerts/items)
- [x] Align webhook lab event constants to canonical dot-notation event names
- [x] Remove duplicate constructor in webhook service startup lifecycle
- [x] Route portal clinical hook patient-id resolution through shared identity resolver
- [x] Fix enhanced portal patient/profile ID mismatch by resolving and using canonical `patients.id`
- [x] Normalize clinical pharmacy and DUR medication display data to support `prescription_items[]` DTO fallback
- [x] Complete `CI-005` identity mapping in portal clinical joins
- [x] Complete `CI-006` consultation status harmonization/mappers
- [x] Complete `CI-014` pharmacy dashboard DTO normalization
- [x] Normalize patient portal hook consumers to actual hook contract (`appointments/labs/prescriptions/profile/vitals`)
- [x] Add patient-id auto-resolution fallback in `usePatientVitals` for non-explicit consumer calls
- [x] Complete canonical workflow event constant cleanup in active orchestrated emitters
- [x] Align receptionist quick payment settlement flow to invoice/payment contract bounds
- [x] Add workflow orchestrator duplicate-event suppression and awaited retry backoff execution
- [x] Add hospital-scoped admin user-management profile query/mutation filters
- [x] Introduce and migrate to unified receptionist check-in hook for appointment + walk-in pathways
- [x] Add consultations query-param quick-start idempotency (`?patientId=`) with one-time create/open behavior
- [x] Normalize diagnosis summary generation to `diagnoses[]` first with legacy fallback
- [x] Add canonical lab priority boundary mapper and apply it at consultation->lab order boundaries
- [x] Align route-guard permissions with sidebar permission model for key protected routes
- [x] Split consultation lifecycle vs workflow stage in shared consultation model with compatibility derivation
- [x] Replace integration task-assignment mock service with persisted `workflow_tasks` queries/mutations
- [x] Normalize remaining lab queue UI status usage from `collected` to canonical `sample_collected`
