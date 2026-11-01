# End-to-End Functional Audit

> CareSync HIMS repository audit, 2026-11-01. Commit `43ab8f7`. Workflows were traced from page to component, hook, service/module, and on to the Supabase table, RPC or edge function. Evidence comes from static tracing, executable probes of repository modules (run in a scratch area, nothing committed) and the lead's compiler and test runs.
> **No end-to-end run against a live backend was possible.** The default Playwright config collects 0 tests (TEST-01), and there are no Supabase credentials. Anything that depends on deployed schema is marked LIKELY or SUSPECTED.

## 1. Headline

**The product's clinical-safety remediation exists, but mostly in code that the user interface never calls.** The deep modules (`src/modules/*`), the fixed hooks (`useDrugInteractionChecker`, the hardened 2FA hook) and the fail-closed allergy logic are covered by passing tests. The screens clinicians actually use still import the legacy implementations (CLIN-01, ARCH-04, ARCH-06). On top of that:
- The type gate is vacuous (ARCH-01) and 34 live files run under `@ts-nocheck` (ARCH-03). Together they hid a set of runtime defects that the compiler reports as soon as it is pointed at the app (CLIN-26 to CLIN-29).
- Many operational flows end at tables, RPCs or edge functions that do not exist (DB-14, EDGE-20).

## 2. Feature status overview (all modules)

| Area | Working | With limitations | Partial | Broken | Not implemented / simulated |
|---|---|---|---|---|---|
| Auth & onboarding | Login | Invitations | Profile/settings | Hospital signup (FUNC-03), patient self-registration (DB-15/FUNC-01), 2FA enforcement (SECF-01/02) | — |
| Consultation | — | ICD-10 capture | Autosave round-trip (CLIN-06) | Completion (CLIN-07, CLIN-26), NEWS2 badge (CLIN-08) | AI support simulated (CLIN-18) |
| Prescribing / CDS | — | — | Override persistence (CLIN-02) | Live allergy/DDI checks (CLIN-01) | Pediatric dosing in live flow (CLIN-15), telehealth Rx (CLIN-21) |
| Pharmacy | — | — | Approval state machine (CLIN-03) | Stock decrement (CLIN-04), amendment (CLIN-20) | — |
| Laboratory | — | Result entry, critical detection (CLIN-16) | Acknowledgment | Specimen rejection (CLIN-17) | Escalation ladder (EDGE-03) |
| Nursing | — | Vitals capture (CLIN-09, CLIN-12) | eMAR (CLIN-13) | Dashboard eMAR shortcut (CLIN-29) | — |
| Discharge | — | Forward path | — | Initiation modal (CLIN-28), rejection/AMA (CLIN-11) | — |
| Reception / scheduling | — | Check-in (FUNC-16) | Slots / smart scheduler, no-show (FUNC-14, FUNC-15) | Appointment-request approval (FUNC-13), double booking (FUNC-12) | Kiosk (FUNC-11), recurrence (FUNC-23) |
| Billing | — | Payments, invoice numbering (FUNC-06, FUNC-07) | Insurance claims (FUNC-09, EDGE-10) | Tax/discount persistence (FUNC-05), unbilled charges (FUNC-08), adjustments (FUNC-33) | Online payments (mock Stripe) |
| Admin | Hospital settings, activity logs | Reports (FUNC-28) | Monitoring dashboards (FUNC-18) | Staff list (FUNC-04), audit-log and health pages crash (FUNC-17) | — |
| Destructive admin tools | — | — | — | Test-data cleanup deletes real data (FUNC-10) | — |
| Patient portal | — | Portal (FUNC-30) | Appointment requests | — | Online payments |
| Inventory / suppliers | Inventory | — | Purchase orders (FUNC-22) | — | — |
| Telemedicine / messaging | — | — | Video (FUNC-24), staff messaging (FUNC-20) | Session notes (CLIN-21) | — |

The per-feature tables with file:line evidence are in §4 (clinical) and §5 (operational).

## 3. Cross-module issues (only visible when modules interact)

1. **Allergies never reach the safety check.** Nurse-intake allergies and home medications are stored where the prescriber's check does not read them. The pharmacist query never selects allergies, so all three checkpoints (nurse, prescriber, pharmacist) can pass an allergen (CLIN-14, CLIN-01).
2. **Consultation completion is a non-atomic client-side saga.** It writes the consultation, then orders, the queue, appointments and an invoice. Failures partway through leave partial state:
   - lab orders fail on the database enum (CLIN-07);
   - the doctor is refused invoice creation by the billing boundary (FUNC-25);
   - all of the patient's future appointments are marked completed (CLIN-19);
   - the hook then throws a ReferenceError (CLIN-26).
3. **Vitals units and keys differ between nurse and doctor screens** (°F/°C, lb/kg, snake_case/camelCase). The doctor's NEWS2 is therefore wrong (CLIN-08, CLIN-09).
4. **Billing double-counts and under-records.** Unbilled-charge import re-proposes billed items (FUNC-08). Payments under-record multi-tender (FUNC-06). Adjustments bypass the server (FUNC-33). Currency is ₹ in the UI and $ in notifications (FUNC-29).
5. **The frontend–backend contract has broken.** The UI calls 18 non-existent edge functions and 16 undefined RPCs, and queries 66 undefined tables (EDGE-20, DB-14). The CORS-blocking fetch patch would break the remaining edge calls in browsers (PERF-01).

## 4. Clinical workflows: feature status and findings (CLIN)

Scope: read-only trace of the clinical workflows in `/home/user/care-harmony-hub` (UI page → hook → service/module → Supabase table/edge function). Vocabulary follows `CONTEXT.md` (Consultation, Patient Queue, Lab Order, Critical Lab Alert, Prescription Approval Workflow, Fail-Closed CDS, Discharge Workflow).

Method: static tracing plus behavioural probes. The probes were vitest files in the scratchpad that import repo code through the `@` alias; no repo file was modified. I also ran `npx vitest run tests/clinical src/modules`: 14 files and 132 tests passed. These tests cover the deep modules and the utils. As shown below, most of those modules and utils are **not on the live UI path**, so a green suite says little about production behaviour.

Status legend: CONFIRMED means seen in code or in a probe. LIKELY means strong static evidence that was not executed. SUSPECTED means it needs runtime verification.

---

### Prior-claim verification (docs/COMPREHENSIVE_AUDIT_REPORT.md §5, .scratch/audit-remediation/issues/02,03,11,12,13,14,17)

| Claim (issue) | Claimed | Verified outcome | Evidence |
|---|---|---|---|
| 02 / CLIN-001: allergy normalisation | resolved | **Fixed only in dead code.** `checkDrugAllergyConflict` (`src/utils/clinicalValidation.ts`) is normalised, but its only consumer `useClinicalValidation` is not imported by any component. The live paths (consultation, pharmacist approval) use `checkPrescriptionSafety` in `src/hooks/usePrescriptionSafety.ts`, which is still unnormalised. A probe returned `isSafe:true` for `'Penicillin allergy'`, `'PCN'`, `'Penicillins'`, `'NSAID'`, `'Sulfa drugs'` and `'sulfonamides'`. | CLIN-01 |
| 11 / CLIN-004: frontend DDI wired to edge function | resolved | **Fixed in isolation and not wired.** `src/hooks/useDrugInteractionChecker.ts:118` does invoke `drug-interaction-check` and fail closed, but no component or page imports the hook. The live UI uses a hardcoded 10-pair table. A probe found no interaction for Sildenafil+Nitroglycerin, Warfarin(new)+Ibuprofen(current), Tramadol+Sertraline or Clarithromycin+Simvastatin. | CLIN-01 |
| 03 / CLIN-002: durable escalation queue and worker | resolved | **Not effective.** Rows are inserted only after the alert insert succeeds, and that insert fails: it selects non-existent `profiles.full_name/phone_number`, uses an FK to `lab_results` while the UI passes `lab_orders.id`, puts text into a NUMERIC column, and uses severity values that violate the CHECK. Nothing schedules `process_escalations`. The worker writes `status:"escalated"` (not allowed by the CHECK) and dispatches no notification. The "verification" test is a source-string `toContain` grep. | CLIN-10 |
| 12 / CLIN-003: age-group ranges and fail-closed | resolved | **Not effective.** The edge function queries `age_group` values `neonate/pediatric/adolescent`, but the table vocabulary is `neonatal/infant/child/adult/geriatric`. There is no gender filter even though the table is unique per gender, so `.maybeSingle()` errors. The fail-closed severity `unverified_review_required` violates the `lab_critical_alerts.severity` CHECK, so the alert insert fails. `tests/clinical/critical-lab-check.test.ts` re-implements the logic inline and never touches the edge function. The UI evaluator (`labPanels.ts`) is adult-only and unisex. | CLIN-10, CLIN-16 |
| 13 / CLIN-005: pediatric dosing engine | resolved | **Not in the live flow, and the copies diverge.** `PediatricDosingCard` is not mounted anywhere. `pediatric-dosing` and `prescription-approval` are never invoked from `src/`. There are four divergent engines with dosing-frequency arithmetic errors (q4h→5/day, q6h→3/day). | CLIN-15 |
| 14 / RBAC-001: PharmacistRBACManager | resolved | **Fixed with caveats, and off the enforcement path.** It now queries `user_roles`. However, the literal `userId === 'default-pharmacist'` grants pharmacist in every environment, `.maybeSingle()` denies multi-role users, and the only consumer (`src/hooks/usePharmacistOperations.ts`) is unused by the UI. The real gate is RLS, which lets doctors UPDATE `prescriptions`. | CLIN-03 |
| 17 / SEC-009/REL-002: discharge hospital scoping and row locking | resolved | **Partly true.** The edge function pins `hospital_id` and uses the `FOR UPDATE` RPC with an optimistic fallback. However, the RPC is `SECURITY DEFINER` and granted to `authenticated` with a caller-supplied `p_hospital_id`, and the table UPDATE RLS allows any hospital member, so both role gating and sequence can be bypassed. Rejection/resubmit and AMA are broken. | CLIN-11 |
| Report §5.1 `scheduleEscalation` console.log stub | flagged | Replaced by a DB insert, but the ladder still never fires (see 03). | CLIN-10 |
| Report §5.3 client-only pediatric dosing (2 drugs) | flagged | The card now uses a 6-drug engine but is still client-only and is unmounted. | CLIN-15 |

---

### Feature Status

| # | Feature | Status | Key evidence (file:line) |
|---|---|---|---|
| 1 | Consultation 5-step workflow, step persistence, autosave | **Partially implemented** (round-trip loses data) | `src/pages/consultations/ConsultationWorkflowPage.tsx:176-203,314-344`; `src/lib/queryColumns.ts:26` |
| 1a | ICD-10 diagnosis capture | **Working with limitations** (69 seeded codes; codes lost after autosave) | `supabase/migrations/20260204000011_misc.sql:2415`; `ConsultationWorkflowPage.tsx:185,557` |
| 1b | Orders from consultation and completion | **Broken** (routine/STAT lab orders fail on the DB enum; non-atomic) | `ConsultationWorkflowPage.tsx:622-633,743-779` |
| 1c | Patient Queue / appointment sync on completion | **Working with limitations** (updates are too broad) | `ConsultationWorkflowPage.tsx:636-649` |
| 2 | Live prescribing allergy/DDI CDS (ADR-0005 fail-closed) | **Broken** | `src/hooks/usePrescriptionSafety.ts:111-135`; `ConsultationWorkflowPage.tsx:466,1193` |
| 2a | Clinical override reason persistence | **Partially implemented** | `ConsultationWorkflowPage.tsx:681-714`; `src/lib/hooks/pharmacy/usePrescriptions.ts:554,669` |
| 2b | `order-safety` module, `useOrderSafety`, `useDrugInteractionChecker`, `PrescriptionBuilder` | **Not implemented in UI** (test-only) | no importer outside `tests/` (grep) |
| 2c | Pediatric weight-based dosing | **Not implemented** in the live flow; 4 inconsistent engines | `src/modules/order-safety/core/pediatricEngine.ts:155-156,229`; `src/utils/pediatricDosingEngine.ts:94` |
| 3 | Pharmacist approval (ADR-0004 state machine) | **Partially implemented** (UI button gating only) | `src/modules/prescription-dispensing/PrescriptionDispensingEngine.ts:56`; `usePrescriptions.ts:398-418` |
| 3a | Dispensing and inventory decrement | **Broken** for consultation prescriptions (qty 0); non-atomic | `src/components/pharmacist/PrescriptionQueue.tsx:438`; `usePrescriptions.ts:516-540` |
| 3b | `hooks/usePharmacy.ts` vs `lib/hooks/pharmacy/usePharmacy.ts` | Byte-identical duplicate. `src/hooks/usePrescriptions.ts` is a divergent, unused copy | `diff` = identical |
| 4 | Lab Order → collection → result entry | **Working with limitations** (rejection status violates CHECK; sample tracking disconnected) | `src/pages/laboratory/LaboratoryPage.tsx:320`; `src/components/lab/SampleTracking.tsx:50` |
| 4a | Critical value detection (UI) | **Working with limitations** (adult unisex ranges; keyword panel matcher misfires) | `src/modules/critical-lab-escalation/core/labPanels.ts:58,105,273,283` |
| 4b | Critical Lab Escalation Queue (5/10-min ladder) | **Not implemented in practice**: no timer/cron drives it and the edge function fails before enqueueing | `supabase/functions/critical-lab-check/index.ts:163,187,344,424` |
| 4c | Critical alert acknowledgment | **Partially implemented** (lab read-back recorded; escalation-ack path broken) | `LaboratoryPage.tsx:533-558`; `critical-lab-check/index.ts:77,87` |
| 5 | NEWS2 scoring tables (module) | **Working correctly** for RCP Scale 1 (RR, SpO2 S1, air/O2, SBP, HR, ACVPU→3, temp, 0/1-4/≥3-single/5-6/≥7). Missing Scale 2 and the "new confusion" level | `src/modules/vital-signs/core/news2.ts:9-109` |
| 5a | NEWS2 shown to the doctor (consultation badge, banner, sidebar) | **Broken** (key mismatch, always ≈0) | `ConsultationWorkflowPage.tsx:140`; `PatientSidebar.tsx:48` |
| 5b | Nurse vitals capture | **Working with limitations** (`RecordVitalsModal` bypasses the module; no ACVPU/O2 inputs) | `src/components/nurse/RecordVitalsModal.tsx:206`; `PatientPrepModal.tsx:113-124` |
| 5c | Medication administration (eMAR) | **Partially implemented** (no schedule, no double-dose guard, simulated BCMA) | `src/pages/nurse/NurseMedicationsPage.tsx:86-142`; `BarcodeVerificationModal.tsx:52-56,122` |
| 6 | Discharge forward path (doctor→pharmacist→billing→nurse) | **Working with limitations** (clearances are self-attested) | `supabase/functions/discharge-workflow/index.ts:240-335` |
| 6a | Discharge rejection rollback and resubmission | **Broken** (dead-end at `doctor`) | `discharge-workflow/index.ts:40-44,249`; `DoctorDischargeQueue.tsx:66` |
| 6b | AMA discharge | **Broken** | `DoctorDischargeQueue.tsx:44`; `discharge-workflow/index.ts:547` |
| 6c | Discharge concurrency and role gating | **Working with limitations** (RPC/RLS bypass) | `supabase/migrations/20260909000004_discharge_workflow_row_locking.sql:17,56` |
| 7 | Telehealth prescription issuance | **Not implemented** (component unmounted, backend missing); session notes not persisted | `src/components/telemedicine/SessionNotes.tsx:41`; `TelehealthPrescriptionIssuance.tsx:224,276` |
| 7a | Prescription amendment | **Broken** (RPC signature mismatch) | `src/components/audit/AmendmentModal.tsx:112-122` |
| 7b | Consultation signed addendum | **Working with limitations** (mutable text append) | `ConsultationWorkflowPage.tsx:359-406` |
| 7c | AI clinical support | **Simulated** (keyword rules, hardcoded confidences, `Math.random` likelihoods); only partially labelled | `AIConsultationAssistant.tsx:44-90`; `useAIClinicalSupport.ts:39-79`; `DifferentialDiagnosisEngine.tsx:180` |

---

### CLIN-01: Live prescribing CDS is the unfixed legacy matcher, ignores home medications and never fails closed
- Severity: P0
- Category: Functional
- Status: CONFIRMED (probe output plus static trace)
- Module: Prescribing / order safety (consultation step 4, quick consultation, pharmacist approval)
- Location: src/hooks/usePrescriptionSafety.ts:111-135,158; src/components/consultations/steps/TreatmentPlanStep.tsx:100-133; src/pages/consultations/ConsultationWorkflowPage.tsx:455-471,1193; src/lib/queryColumns.ts:8; src/components/pharmacy/PrescriptionApprovalModal.tsx:51,72; src/lib/hooks/pharmacy/usePrescriptions.ts:106; src/components/consultations/QuickConsultationModal.tsx:125-136
- Evidence:
  ```
  usePrescriptionSafety.ts:119  const mappedDrugs = ALLERGY_DRUG_MAPPINGS[normalizedAllergy] || [];
  queryColumns.ts:8  detail: '... blood_type, allergies, chronic_conditions, emergency_contact_name ...'   // no current_medications
  usePrescriptions.ts:106  patient:patients(id, first_name, last_name, mrn, user_id),               // no allergies
  probe: {"allergy":"Penicillin allergy","med":"Amoxicillin","alerts":[],"isSafe":true}
  probe: {"allergy":"PCN","med":"Amoxicillin","alerts":[],"isSafe":true}  {"allergy":"NSAID","med":"Ibuprofen","alerts":[],"isSafe":true}
  probe: {"a":"Warfarin","b":"Ibuprofen","ddi":[]}  {"a":"Sildenafil","b":"Nitroglycerin","ddi":[]}
  ```
- Actual behavior:
  - Every live prescribing surface calls the local `checkPrescriptionSafety`. It does an exact dictionary lookup on the lowercased allergy string (keys such as `'penicillin'` and `'nsaids'`), so common chart phrasings produce no alert.
  - DDI checking is a 10-pair substring table plus SSRI/MAOI and NSAID+anticoagulant special cases. A new anticoagulant against a current NSAID is not detected.
  - `consultation.patient.current_medications` is never selected, so `patientMedications` is always `[]` and checks run only among drugs prescribed in the same encounter.
  - The pharmacist `PrescriptionApprovalModal` reads `prescription.patient.allergies`, but the query never selects `allergies`, so the pharmacist-level allergy check is always empty.
  - `QuickConsultationModal` creates prescriptions with no check at all.
  - No path invokes the `drug-interaction-check` edge function, and none fails closed. The fixed implementations (`clinicalValidation.checkDrugAllergyConflict`, `useDrugInteractionChecker`, the `order-safety` module) have no UI importer.
- Expected behavior: Per CONTEXT.md, Fail-Closed CDS and ADR-0005 §3: normalised allergen-class matching, full home-medication list, edge or RxNorm DDI with fail-closed on error, and the same check repeated at pharmacist verification.
- Reproduction: Chart a patient with allergy "Penicillin allergy" or "PCN". Start a consultation and prescribe Amoxicillin: no alert. Complete the consultation. In Pharmacy, open "Review & Approve": no allergy alert, and approve is enabled.
- Root cause: The remediation was applied to parallel implementations the UI never imports. The column presets omit `current_medications` and `allergies`.
- Impact: A documented penicillin, NSAID or sulfa allergy can pass the prescriber, pharmacist and nurse checkpoints unflagged, which can cause anaphylaxis. Major DDIs with chronic home medications (warfarin, nitrates, MAOIs) are invisible.
- Recommendation: Route all three surfaces (TreatmentPlanStep, QuickConsultationModal, PrescriptionApprovalModal) through `useOrderSafety` / `createOrderSafetyEngine` from `@/modules/order-safety`, and make it the single CDS entry point. Add `current_medications` to `PATIENT_COLUMNS.detail` and `allergies,current_medications` to the prescription query. Delete `checkPrescriptionSafety` or reduce it to a facade over the module. Block submission when the engine returns `CDSUnavailableFailClosedError`.
- Effort: M
- Acceptance criteria: (1) "Penicillin allergy", "PCN" and "penicillins" each block Amoxicillin at the prescriber and pharmacist steps. (2) A home medication of warfarin plus newly prescribed ibuprofen raises a major interaction. (3) With the edge function unreachable, consultation completion requires an override. (4) A grep shows no UI importer of `checkPrescriptionSafety`.

### CLIN-02: Mandatory override gate never fires for allergy conflicts, and override rationales are lost
- Severity: P1
- Category: Functional
- Status: CONFIRMED
- Module: Prescribing / override audit
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:466,533,681-714; src/hooks/usePrescriptionSafety.ts:163; src/hooks/useConsultations.ts:537-556; src/lib/hooks/pharmacy/usePrescriptions.ts:398-418,544-555,663-670; src/components/pharmacy/PrescriptionApprovalModal.tsx:101-107
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:466  safety.allergyAlerts.some((a: any) => a.severity === 'critical')
  usePrescriptionSafety.ts:163      severity: isCrossReactive ? 'moderate' : 'severe',
  usePrescriptions.ts:554           notes: notesWithWitness,     // = opts?.notes || null
  usePrescriptions.ts:669           notes: notesBlock,
  ```
- Actual behavior:
  - The completion gate requires `severity === 'critical'`, but `checkPrescriptionSafety` only emits `'severe'` or `'moderate'`. Even a direct allergy match therefore completes without an override; only SSRI+MAOI triggers the gate.
  - When an override is typed, `clinical_override_reason` is not a `consultations` column, so `useUpdateConsultation` silently strips it. The next refetch then wipes it from form state (see CLIN-06).
  - The rationale reaches `prescriptions.notes` and `activity_logs` only. Dispense overwrites `prescriptions.notes` with `opts.notes || null`, and clarification overwrites it with the inquiry block.
  - The pharmacist's DUR override text is passed only to `engine.approve`, which never runs (CLIN-03), so it is never persisted.
- Expected behavior: Any severe or critical allergy, or any contraindicated interaction, requires a rationale. The rationale is stored immutably and linked to the order, and pharmacist overrides are persisted.
- Reproduction: Prescribe Amoxicillin to a patient whose allergy is stored as "penicillin". The "Safety Alert" badge shows, but Next/Complete succeeds with no override box. Then dispense the prescription and observe that `prescriptions.notes` is null.
- Root cause: A severity vocabulary mismatch between the gate and the checker; the override is stored in a free-text column that later writes overwrite; there is no override table.
- Impact: The ADR-0005 "explicit physician override and logged clinical rationale" control is ineffective, and the medico-legal audit trail is lost.
- Recommendation: Gate on `severe|critical|contraindicated`. Persist overrides to `break_glass_overrides` (or a dedicated `prescription_overrides` table) with prescription and item IDs. Make the dispense and clarify writes append rather than replace. Persist the pharmacist `notes` on approval.
- Effort: S
- Acceptance criteria: A direct allergy match blocks completion until a rationale of at least 15 characters is entered. After dispense and clarification, both the prescriber and pharmacist override texts are retrievable for the prescription.

### CLIN-03: ADR-0004 pharmacist-gated state machine is never persisted or enforced at the data layer
- Severity: P1
- Category: Functional
- Status: CONFIRMED (static; DB behaviour LIKELY)
- Module: Prescription Approval Workflow (prescription-dispensing)
- Location: src/modules/prescription-dispensing/PrescriptionDispensingEngine.ts:56-64; src/modules/prescription-dispensing/adapters/SupabasePrescriptionAdapter.ts:66-75,90-115; src/lib/hooks/pharmacy/usePrescriptions.ts:306-323,392-418,591-610; supabase/migrations/20260325_create_prescription_approval_workflows.sql:20-21,44-49; supabase/migrations/20260204000011_misc.sql:651,716-719; src/components/pharmacist/PrescriptionQueue.tsx:120,339-346
- Evidence:
  ```
  PrescriptionDispensingEngine.ts:56  const workflowId = `pwf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  20260325_...sql:15  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  20260325_...sql:48  hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  usePrescriptions.ts:408  console.warn('[useApprovePrescription] Workflow advance failed:', err);
  misc.sql:719  AND (has_role(auth.uid(), 'pharmacist') OR has_role(auth.uid(), 'doctor') OR has_role(auth.uid(), 'admin')));
  PrescriptionQueue.tsx:120  if (selectedPrescription.status === 'pending' && approvalWorkflow?.status !== 'approved') {
  ```
- Actual behavior:
  - **Workflow rows are never created.** `engine.initiate` upserts a non-UUID `id` into a UUID primary key, and the RLS policy compares `profiles.id` (a random UUID) to `auth.uid()`; either fails the insert. `useCreatePrescription` swallows the error as "graceful degradation".
  - **Approve and dispense skip the engine.** `getWorkflowByPrescriptionId` returns null, so both hooks write `prescriptions.status` directly (`'verified'`, `'dispensed'`).
  - **No transition rule exists in the database.** `prescriptions.status` is free TEXT with no CHECK or trigger, and RLS lets doctors UPDATE prescriptions. The hooks' `prescriptions:write` permission is also held by `doctor` (`src/lib/permissions.ts`).
  - **The UI does not enforce the gate either.**
    - The "Details" button for any status other than pending/verified/partially_dispensed opens the same `PrescriptionDispensingModal`.
    - `handleDispense` only blocks `status === 'pending'`.
    - As a result, a `pending_clarification`, `dispensed` or `amended` prescription can be dispensed again, with a second inventory deduction.
  - The module allows `doctor` to `dispense` (`stateMachine.ts` `isClinicalStaff`).
  - `partially_dispensed` is not in the workflow CHECK list.
  - The audit table `prescription_approval_workflow_audit` does not exist. `logTransition`'s try/catch never sees PostgREST errors, so audit entries are silently dropped.
- Expected behavior: initiated → pending_approval → approved → dispensed → completed is enforced server-side (trigger or RPC), only pharmacists can approve, and dispensing a non-approved order is rejected by the database.
- Reproduction: Create a prescription from a consultation and query `prescription_approval_workflows`: it has 0 rows. As a pharmacist, send an "Inquiry" (status `pending_clarification`), click "Details", tick the checks and press "Complete Dispense": the status becomes `dispensed`.
- Root cause: Client-generated string IDs, an RLS identity mix-up (`profiles.id` vs `auth.uid()`), swallowed errors, and no DB-level transition guard.
- Impact: Drugs can be released without pharmacist verification or while a clarification is open, and double dispensing is possible. The ADR-0004 guarantee is false.
- Recommendation: Let the DB generate IDs (drop `id` from the upsert). Fix the RLS to `user_belongs_to_hospital(auth.uid(), hospital_id)`. Move transitions into a `SECURITY DEFINER` RPC that checks role and current status `FOR UPDATE`, plus a BEFORE UPDATE trigger on `prescriptions.status`. Remove doctors from the prescriptions UPDATE policy for status. Never open the dispensing modal for non-dispensable statuses. Fail the mutation when the workflow transition fails.
- Effort: L
- Acceptance criteria: (1) A workflow row exists for each new prescription. (2) A doctor's PostgREST UPDATE `status='dispensed'` is rejected. (3) Dispensing a `pending_clarification` or `dispensed` prescription returns an error and does not change stock.

### CLIN-04: Inventory decrement on dispense is ineffective for consultation prescriptions and is not atomic
- Severity: P1
- Category: Functional
- Status: CONFIRMED (static)
- Module: Pharmacy dispensing / inventory
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:693-699; src/components/pharmacist/PrescriptionQueue.tsx:438; src/components/pharmacy/PrescriptionDispensingModal.tsx:181-189,406-414; src/lib/hooks/pharmacy/usePrescriptions.ts:484-541,548-558
- Evidence:
  ```
  PrescriptionQueue.tsx:438            quantity: item.quantity ?? 0,
  PrescriptionDispensingModal.tsx:188  const availableStock = match ? match.current_stock : 999;
  PrescriptionDispensingModal.tsx:414  : Math.min(status.item.quantity, Math.max(0, val)),
  usePrescriptions.ts:524              newStock: Math.max(0, medMatch.current_stock - item.dispensedQuantity),
  usePrescriptions.ts:533              await supabase.from('medications').update({ current_stock: deduction.newStock, ...
  ```
- Actual behavior:
  - **Quantity is never captured.** The consultation and quick-consult item payloads have no `quantity`, so the dispensing modal maps it to 0 and clamps the dispensed quantity input to `max=0`. The `dispensedQuantity > 0` branch never runs: no stock check, no deduction, and status `dispensed`. Controlled substances are recorded as dispensed with quantity 0.
  - **Unmatched names count as fully stocked.** Medications not found by exact name are shown as 999 in stock and are not deducted. Encrypted names (`'[Encrypted]'`, see CLIN-05) never match.
  - **Deductions are not atomic.** When quantities do exist, the deduction is a client read-modify-write (lost update under concurrent dispensing), update errors are ignored, and it runs before the prescription status update with no rollback.
- Expected behavior: Prescriptions carry a quantity and units. Stock is decremented atomically (`UPDATE ... SET current_stock = current_stock - $n WHERE current_stock >= $n`, or an RPC) in the same transaction as the status change.
- Reproduction: Complete a consultation with one prescription, then dispense it from the Pharmacy queue. The quantity field is 0 and `medications.current_stock` is unchanged.
- Root cause: The prescribing UI lacks quantity and unit fields; stock logic runs on the client; matching is by fuzzy name.
- Impact: Stock-outs that inventory does not show, controlled-drug register discrepancies, and wrong reorder triggers.
- Recommendation: Add quantity and unit (or derive them from dose × frequency × duration) at prescribing. Link items to `medication_id`. Implement a `dispense_prescription(p_id, items jsonb)` RPC that locks rows, validates status and stock, and decrements in one transaction.
- Effort: M
- Acceptance criteria: Dispensing a consultation-created prescription reduces `current_stock` by the dispensed quantity. Two concurrent dispenses of the last unit produce one success and one stock error.

### CLIN-05: PHI field-encryption round-trip makes saved clinical narratives and medication lines unreadable or lost
- Severity: P1
- Category: Functional
- Status: LIKELY (static trace is deterministic; which failure mode applies depends on whether `phi-crypto` is deployed, so this needs runtime verification)
- Module: Consultation persistence, prescription items (cross-cutting)
- Location: src/hooks/useConsultations.ts:222-246,513-533; src/lib/queryColumns.ts:26; src/lib/hooks/pharmacy/usePrescriptions.ts:69-90,224-239; supabase/functions/phi-crypto/index.ts:171,214-227; src/pages/consultations/ConsultationWorkflowPage.tsx:377-383
- Evidence:
  ```
  useConsultations.ts:528   (updates as any)[field] = `__ENCRYPTED__${encrypted.keyVersion}`;
  useConsultations.ts:532   (updates as any).encryption_metadata = encMeta;          // only fields in THIS update
  queryColumns.ts:26        detail: 'id, hospital_id, ... auto_save_data, last_auto_save, created_at, updated_at'   // no encryption_metadata, no diagnoses
  useConsultations.ts:239   decrypted[field] = await fieldEncryption.decryptField(encData);   // no resourceType/resourceId
  phi-crypto/index.ts:226   error: "Forbidden: resourceType and resourceId are required for non-admin decryption",
  ```
- Actual behavior: There are three failure modes, depending on deployment:
  - (a) **phi-crypto works.**
    - Consultation narrative fields are stored as the placeholder `__ENCRYPTED__<v>`.
    - The read query never selects `encryption_metadata`, so after the first autosave refetch the doctor sees `__ENCRYPTED__1` in Chief Complaint and the other narrative boxes.
    - Any later partial update replaces the whole `encryption_metadata` with only the fields being written; the signed addendum writes only `clinical_notes`. The ciphertext of the other fields is then permanently lost.
    - Prescription items do select metadata, but `decryptField` is called without resource context. `phi-crypto` returns 403 for non-admins, so pharmacists, nurses and doctors see `[Encrypted]` as the medication name and dose.
  - (b) **phi-crypto unavailable.** `encryptFields` throws, so every consultation save fails. Prescription creation fails after the header row is inserted, leaving an orphan `pending` prescription with no items in the pharmacy queue.
- Expected behavior: Encrypted fields round-trip to authorised clinicians, and partial updates merge the metadata.
- Reproduction: As a doctor, type a chief complaint and wait 1.5 s for the autosave. The field shows `__ENCRYPTED__...`. Open the Pharmacy queue as a pharmacist: medication names show `[Encrypted]`.
- Root cause: The column preset omits `encryption_metadata`; decryption calls omit `{resourceType, resourceId}`; metadata is overwritten rather than merged; the header insert happens before encryption.
- Impact: Clinical record content becomes unreadable or destroyed. Pharmacists and nurses cannot identify the drug, so dispensing, the eMAR and CDS (CLIN-01) all operate on placeholder text.
- Recommendation: Select `encryption_metadata`. Pass `{resourceType:'consultations'|'prescription_items', resourceId}` to `decryptFields`. Merge metadata server-side (`encryption_metadata = encryption_metadata || $new`). Encrypt before inserting the header, or wrap creation in an RPC.
- Effort: M
- Acceptance criteria: After autosave and reload, the doctor sees the plaintext chief complaint. A pharmacist sees plaintext medication names. Adding an addendum does not change the decryptability of the other fields.

### CLIN-06: Consultation autosave refetch overwrites local form state (ICD-10 codes, override reason and step position are lost)
- Severity: P1
- Category: Functional
- Status: CONFIRMED (static)
- Module: Consultation workflow
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:176-203,314-344,551-560; src/hooks/useConsultations.ts:545-562; src/lib/queryColumns.ts:26
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:178  setActiveStep(consultation.current_step);
  ConsultationWorkflowPage.tsx:185  diagnoses: (consultation as any).diagnoses || [],
  ConsultationWorkflowPage.tsx:557  icd_code: 'UNSPECIFIED',
  useConsultations.ts:562           queryClient.invalidateQueries({ queryKey: ['consultation', data.id] });
  ```
- Actual behavior: Every 1.5-second autosave invalidates the query. The refetched `consultation` object then re-runs the `[consultation]` effect, which rebuilds `formData` and resets `activeStep`. As a result:
  - `diagnoses` (structured ICD-10) is not in the selected columns, so the selected diagnoses vanish from step 3. At completion the code falls back to `final_diagnosis` strings with `icd_code:'UNSPECIFIED'`, and the invoice and clinical record lose the ICD-10 codes.
  - Non-column fields (`clinical_override_reason`, `soap_*`, `cpt_codes`, `clinical_reasoning`) are stripped on save (missing-column retry loop at useConsultations.ts:537-556) and then wiped from state.
  - A doctor who pressed "Previous" is moved back to `current_step`.
  - Keystrokes typed during the save round-trip are overwritten.
- Expected behavior: Autosave does not replace in-progress local state. All UI fields map to persisted columns.
- Reproduction: In step 3, add an ICD-10 code and wait 2 s; the card disappears. Complete the consultation and inspect `consultations.diagnoses`: it contains `UNSPECIFIED`.
- Root cause: Server state is used as the form's source of truth on every refetch; the column preset is incomplete; the update hook silently strips unknown fields.
- Impact: Coding and billing errors, lost override documentation (CLIN-02), and documentation friction that encourages workarounds.
- Recommendation: Initialise `formData` only once per consultation ID (or when the server `updated_at` is newer than the last local edit). Add `diagnoses` to the preset. Add columns (or `auto_save_data` JSON) for SOAP, override, CPT and reasoning. Make the update hook fail instead of silently stripping columns.
- Effort: M
- Acceptance criteria: A selected ICD-10 code survives autosave and appears in `consultations.diagnoses` after completion. The override text persists across a page reload. Autosave never changes `activeStep`.

### CLIN-07: Consultation completion is non-atomic; routine/STAT lab orders fail on the DB enum, and orders are duplicated
- Severity: P1
- Category: Functional
- Status: CONFIRMED (static; enum per migration and generated types)
- Module: Consultation completion / Lab Order creation
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:622-633,743-779,207-228; src/utils/labPriority.ts:3-8; supabase/migrations/20260204000011_misc.sql:13,567; src/components/consultations/steps/TreatmentPlanStep.tsx:186-200,208-219,704-706
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:751  priority: mapToCanonicalLabPriority(order.priority) as any,   // 'routine' | 'urgent' | 'stat'
  misc.sql:13   CREATE TYPE public.priority_level AS ENUM ('low', 'normal', 'high', 'urgent', 'emergency');
  ConsultationWorkflowPage.tsx:743  for (const order of formData.lab_orders) {        // includes isSubmitted orders
  TreatmentPlanStep.tsx:198         const updatedOrders = [...labOrders];             // stale closure inside submitAll loop
  ```
- Actual behavior:
  - **Completion order.** The consultation is marked `completed` first (line 622). Prescriptions, lab orders, invoice and tasks are then created client-side in sequence.
  - **Lab inserts fail.** The default lab priority `'routine'` and `'stat'` are invalid `priority_level` values (the `as any` and `@ts-nocheck` hide this), so the insert fails. The `throw err` skips invoice and task creation and the success redirect, leaving a completed consultation with no lab orders.
  - **Duplicates.** Orders already sent via the step-4 "Submit" button (`isSubmitted:true`) are created again at completion.
  - **Submit All loses flags.** "Submit All" rebuilds from a stale `labOrders`, so only the last order keeps `isSubmitted`.
  - **Double completion.** The Ctrl+Enter shortcut calls `handleNextStep` without checking `isCompleting`, so a double keypress can create duplicate prescriptions.
- Expected behavior: Completion is a single server transaction (RPC) that creates orders idempotently and fails as a whole.
- Reproduction: Add a lab order with "Routine" priority and complete the consultation. The toast shows "Failed to send lab orders..."; the consultation is completed and `lab_orders` has no row.
- Root cause: Two divergent priority mappers, type checking disabled, and client-side orchestration without idempotency keys.
- Impact: Ordered investigations silently never reach the laboratory, causing missed or delayed diagnoses, duplicate venepunctures, or a missing invoice.
- Recommendation: Use one mapper to `priority_level` (routine→normal, stat→emergency). Skip orders where `isSubmitted`. Move completion into a `complete_consultation` RPC with idempotency. Guard the shortcut with `isCompleting`.
- Effort: M
- Acceptance criteria: Completing with routine, urgent and STAT labs creates exactly one row each. Any failure leaves the consultation not completed.

### CLIN-08: NEWS2 shown to the doctor is computed from mismatched keys and reads ≈0/LOW for deteriorating patients
- Severity: P1
- Category: Functional
- Status: CONFIRMED (probe)
- Module: Vital signs / consultation header, deterioration banner, PatientSidebar
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:137-141,1011-1097; src/components/consultations/PatientSidebar.tsx:46-49; src/components/consultations/steps/ChiefComplaintStep.tsx:33-49; src/modules/vital-signs/types.ts (VitalSignsInput camelCase)
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:140  return evaluateVitalSigns(v);   // v = { temperature, heart_rate, blood_pressure:'80/50', respiratory_rate, oxygen_saturation }
  probe: {"shape":"consultation snake_case","total":0,"risk":"low","sub":{"respirationRate":0,"oxygenSaturation":0,...},"critical":false}
  probe: {"shape":"camelCase","total":12,"risk":"high"}
  ```
- Actual behavior: Consultation vitals are stored with snake_case keys and BP as a combined string. `evaluateVitalSigns` reads `heartRate`, `bloodPressureSystolic`, `respiratoryRate` and `oxygenSaturation`, so only `temperature` is scored. A patient with HR 140, SBP 80, RR 30 and SpO2 85% shows a green "NEWS2: 0 (LOW)" badge, and the "CLINICAL DETERIORATION ALERT" (≥5) never renders. Single-parameter red scores (`low_medium`) are not styled by any UI (grep found no `low_medium` handling).
- Expected behavior: NEWS2 is computed from the actual vitals; a single score of 3 and totals of 5 or more raise visible escalation prompts.
- Reproduction: In step 1 enter HR 140, BP 80/50, RR 30, SpO2 85. The header badge shows NEWS2 0 (LOW).
- Root cause: There is no adapter between the consultation vitals shape and the module input contract.
- Impact: False reassurance on the doctor's primary screen for exactly the patients NEWS2 exists to catch.
- Recommendation: Add a `fromConsultationVitals()` adapter in the vital-signs module (split BP, map keys, carry the unit) and use it in both call sites. Surface `low_medium` as amber "urgent ward review".
- Effort: S
- Acceptance criteria: The vitals above render NEWS2 ≥ 12 HIGH with the banner. A unit test covers the snake_case input.

### CLIN-09: Mixed and unlabelled vital units between nurse and doctor screens
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Vitals / consultation
- Location: src/components/consultations/steps/ChiefComplaintStep.tsx:35-49,108,165,174; src/components/nurse/RecordVitalsModal.tsx:456; src/components/nurse/PatientPrepModal.tsx:81,271; src/components/consultations/PatientSidebar.tsx:191; src/modules/vital-signs/core/evaluator.ts:36
- Evidence:
  ```
  ChiefComplaintStep.tsx:108  Temperature (°F)      ...:165  <Label>Weight (lbs)</Label>
  ChiefComplaintStep.tsx:35   patch.temperature = latestVitals.temperature.toString();   // nurse value in °C, no conversion
  PatientSidebar.tsx:191      <span ...>{vitals.temperature}°C</span>
  probe: {"shape":"F temp no unit","total":2,"valid":false}
  ```
- Actual behavior:
  - Nurses record °C, kg and cm. The doctor's step-1 form labels °F, lbs and inches, and "Use Nurse Vitals" copies the raw numbers across, so 37.0 appears under "°F" and 70 kg under "lbs".
  - The sidebar labels the same field °C. The evaluator defaults to Celsius, so a doctor-entered 98.6 °F scores 2 NEWS2 points and fails plausibility.
  - No unit is persisted with `consultations.vitals`.
- Expected behavior: One canonical unit system is stored (SI), with explicit conversion only at display.
- Reproduction: Record nurse vitals with temperature 37.0 and weight 70, open the consultation and click "Use Nurse Vitals".
- Root cause: Inconsistent UI labels and no unit metadata.
- Impact: Misreading temperatures, and weight confusion between lbs and kg, which is a classic 2.2× dosing-error source once weight-based dosing is wired (CLIN-15).
- Recommendation: Store `{value, unit}` or SI only, convert in the form, and pass `temperatureUnit` to the evaluator.
- Effort: S
- Acceptance criteria: Nurse 37.0 °C displays as 98.6 °F in the °F field and as 37.0 °C in the sidebar. Weight shows correctly in both units.

### CLIN-10: Critical Lab Escalation Queue (5/10-minute ladder) is non-functional end to end
> **Consolidation note:** this finding duplicates **EDGE-03** and is kept for its evidence. The register counts it once, under EDGE-03.

- Severity: P1
- Category: Functional
- Status: CONFIRMED (static, multiple independent break-points); deployment of tier4 migrations SUSPECTED
- Module: Lab / critical-lab-escalation / `critical-lab-check` edge function
- Location: src/pages/laboratory/LaboratoryPage.tsx:413,428-445; supabase/functions/critical-lab-check/index.ts:77,87,103-127,161-171,185-209,344-347,424-442; supabase/migrations/tier4_2_4_lab_workflows.sql:127-134,170-185; supabase/migrations/20260909000001_harden_invoices_and_active_user_rls.sql:83-101; src/modules/critical-lab-escalation/CriticalLabEscalationEngine.ts:47,180
- Evidence:
  ```
  LaboratoryPage.tsx:432/438  labResultId: target.id, ... result_value: data.criticalSummary || data.resultNotes || 'CRITICAL_ALERT',
  critical-lab-check:163      .select("id, full_name, email, phone_number, hospital_id")   // profiles has first_name,last_name,phone
  tier4_2_4:127/131/134       lab_result_id UUID NOT NULL REFERENCES lab_results(id) ... result_value NUMERIC NOT NULL ... CHECK (severity IN ('critical_high','critical_low','warning'))
  critical-lab-check:117      .update({ status: "escalated", processed_at: now })   // CHECK allows pending|dispatched|acknowledged|cancelled|failed
  critical-lab-check:424      await supabase.realtime.getSubscription(`doctor:${doctor.id}:alerts`)?.send({
  ```
- Actual behavior:
  - **Alert creation fails, in order of occurrence:**
    1. The primary doctor lookup selects non-existent columns and returns 404 "Primary doctor not found".
    2. Even if the lookup were fixed, the alert insert fails: the FK points to `lab_results` but the UI passes a `lab_orders.id`; the text summary goes into a NUMERIC column, and `parseFloat` of the summary gives NaN, which would grade as "normal" when a range exists; and the fail-closed severity values are outside the CHECK.
    3. As a result, the `lab_alert_escalations` rows are never inserted.
  - **Nothing drives the ladder.** There is no pg_cron job, no scheduled function and no client timer. `process_escalations` and `engine.processDueEscalations` have no caller (grep).
  - **The worker and acknowledge actions also fail.** The worker would write a status disallowed by the CHECK and send no notification. The acknowledge action writes the non-existent columns `acknowledged_at/acknowledged_by` and updates a non-existent table `critical_lab_alerts`.
  - **Notifications are placeholders.** `notifyDoctor` uses a non-existent supabase-js API (throws, then is caught), and SMS and email are `console.log` placeholders.
  - **Failures are invisible in the UI.** `functions.invoke` errors are not inspected; the UI shows "15-Minute Closed-Loop Notification Protocol Initiated" and sets `critical_notified: true` before anyone is notified.
  - **Client-side alert access is likely broken.** `lab_critical_alerts` RLS is self-referential (likely "infinite recursion" on SELECT) and uses `profiles.id = auth.uid()`.
  - **What still works.** The only notification that reaches the doctor is the client-side `triggerWorkflow(LAB_CRITICAL_ALERT)` (it depends on `workflow_rules` and is in-app only), plus the manual lab read-back modal.
- Expected behavior: Per ADR-0005 §4 and CONTEXT "Critical Lab Escalation Queue": a durable alert, primary notification at 0 min, on-call at 5 min, ED at 10 min via SMS/pager, and cancellation on acknowledgment.
- Reproduction: Enter K+ 6.9 via Structured Result Entry and inspect `lab_critical_alerts` and `lab_alert_escalations`: no rows. The edge function logs show the profiles column error.
- Root cause: The edge function, schema and UI were written to different contracts, and the "durable worker" was never scheduled.
- Impact: Panic values for absent or offline physicians are not escalated, contrary to Joint Commission NPSG 02.03.01 critical-results timeliness.
- Recommendation:
  - Fix the contract: pass `lab_order_id`, a numeric analyte value and the analyte code per critical parameter.
  - Select `first_name,last_name,phone`, and align the severity and status vocabularies with the CHECKs (or migrate the CHECKs).
  - Schedule `process_escalations` with pg_cron every minute using the service role across all hospitals, and dispatch via `send-notification` plus SMS.
  - Fix the table name and columns in the acknowledge action, and replace the self-referencing RLS.
  - Surface invoke errors in the UI.
- Effort: L
- Acceptance criteria: (1) K+ 6.9 creates one alert, a primary notification and on_call/er queue rows. (2) Without acknowledgment, on_call is notified at about 5 min and ER at about 10 min (verified with the cron runner). (3) Acknowledgment cancels pending rows. (4) An integration test runs against the real edge function.

### CLIN-11: Discharge rejection rollback dead-ends, AMA discharge is broken, and the sequential/role guarantees are bypassable
- Severity: P1
- Category: Functional
- Status: CONFIRMED (static)
- Module: Discharge Workflow (ADR-0003)
- Location: supabase/functions/discharge-workflow/index.ts:40-50,249-257,386-394,545-556,676-704; src/components/discharge/DoctorDischargeQueue.tsx:38-52,64-73; supabase/migrations/20260311000003_patient_discharge_workflow.sql:8-10,26,60-80; supabase/migrations/20260909000004_discharge_workflow_row_locking.sql:17,56; src/modules/discharge-pipeline/core/stateMachine.ts:34-35
- Evidence:
  ```
  discharge-workflow:40   const NEXT_STEP = { pharmacist: 'billing', billing: 'nurse', nurse: 'completed' } // no 'doctor'
  discharge-workflow:249  if (!(currentStep in NEXT_STEP)) {           // -> 400 for step 'doctor'
  DoctorDischargeQueue.tsx:66  await approveStep({ workflowId, metadata });  // "Remediate & Resubmit"
  DoctorDischargeQueue.tsx:44  const workflowId = (draft as any)?.id || (draft as any)?.data?.id;  // response is {success, workflow}
  discharge-workflow:547  current_step: 'completed_ama',   // CHECK: ('doctor','pharmacist','billing','nurse','completed','cancelled')
  row_locking.sql:56      GRANT EXECUTE ON FUNCTION public.transition_discharge_workflow TO authenticated, service_role;
  ```
- Actual behavior:
  - **Rollback dead-ends.** Pharmacist rejection, or any "clinical" rejection, moves the workflow to `doctor`. The doctor's "Remediate & Resubmit" calls `approve`, which the edge function rejects with 400 because `doctor` is not in `NEXT_STEP`. The workflow can only be cancelled. The deep module's `NEXT_STEP` does include `doctor → pharmacist`, so the tests pass while production diverges.
  - **AMA is silently converted.** `workflowId` is read from the wrong response shape, so `dischargeAMA` is never called and the AMA request becomes a normal discharge with no feedback. If it were called, `completed_ama` violates both CHECKs (409 "conflict"), and the audit `transition_action 'discharge_ama'` violates the audit CHECK (the insert error is unchecked).
  - **Role gating can be bypassed.** `transition_discharge_workflow` is `SECURITY DEFINER`, executable by any authenticated user, with caller-supplied `p_hospital_id` and `p_next_step`. The `discharge_workflows_hospital_update` RLS lets any hospital member UPDATE `current_step` directly. Either way, `STEP_ROLE_MAP` can be skipped (for example, a nurse jumping from pharmacist to completed).
  - **Clearances are self-attested.** Billing clearance is a dropdown not linked to `invoices`, and medication reconciliation is metadata only.
  - **No duplicate guard.** Initiation does not check for an existing in-progress workflow or that the patient belongs to `actor.hospitalId`.
- Expected behavior: Per ADR-0003, reverse-step rejection returns to the previous discipline, which can resubmit. AMA is supported. Transitions are only possible through the role-checked path.
- Reproduction: Initiate a discharge, reject it as pharmacist, then as doctor click "Review & Remediate" and resubmit. The toast shows "Workflow cannot be approved from its current state".
- Root cause: The edge function and the module state machine diverge; constraints were not migrated for AMA; the RPC grant is too broad.
- Impact: Discharges stall and need cancel-and-restart, the audit chain breaks, and AMA discharges are mis-recorded. Patients could be released without pharmacy or billing clearance through a direct RPC or UPDATE.
- Recommendation: Add `doctor: 'pharmacist'` to the edge `NEXT_STEP`, or better, have the edge function import the shared state machine. Migrate the CHECKs for `completed_ama` and `discharge_ama`. Read `data.workflow.id`. Revoke EXECUTE from `authenticated` (service_role only), or derive hospital and role from `auth.uid()` inside the RPC. Restrict the table UPDATE RLS to service_role. Verify invoice settlement before billing approval.
- Effort: M
- Acceptance criteria: Reject → doctor resubmit → pharmacist works. AMA ends with `status='completed_ama'` and an audit row. A nurse's direct `rpc('transition_discharge_workflow')` call is denied.

### CLIN-12: NEWS2 inputs are incomplete (no ACVPU "C", no supplemental-O2 capture, no SpO2 Scale 2; missing values score 0)
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Vital signs (module and nurse capture)
- Location: src/modules/vital-signs/types.ts:10; src/modules/vital-signs/core/news2.ts:18-24,61; src/modules/vital-signs/core/evaluator.ts:109-122; src/components/nurse/PatientPrepModal.tsx:113-124; src/components/nurse/RecordVitalsModal.tsx:206-232
- Evidence:
  ```
  types.ts:10        export type ConsciousnessLevel = 'alert' | 'voice' | 'pain' | 'unresponsive';
  evaluator.ts:121   supplementalOxygen: !!input.supplementalOxygen,
  PatientPrepModal.tsx:113  const evaluation = evaluateVitalSigns({ temperature: ..., heartRate: ..., ... })   // no consciousness / supplementalOxygen
  news2.ts:10        if (rate === null || !Number.isFinite(rate)) return 0;
  ```
- Actual behavior: The scoring tables were checked line by line against RCP NEWS2 (2017) for Scale 1, air/O2 (2), SBP, pulse, consciousness (3) and temperature, plus the aggregate bands 0, 1-4, single-3, 5-6 and ≥7. **The tables are correct.** The gaps are in the inputs:
  - "New confusion" (the C of ACVPU) cannot be recorded.
  - SpO2 Scale 2 for hypercapnic patients is absent, so a COPD patient at 88% scores 3 instead of 0.
  - `PatientPrepModal` never collects consciousness or O2. Every stored `news2_score` assumes Alert and room air, which under-scores by up to 5.
  - Missing parameters silently score 0, with no "incomplete NEWS2" flag.
  - `RecordVitalsModal` (dashboard, queue page) does not use the module at all: no plausibility bounds and no NEWS2.
- Expected behavior: All 7 parameters are required, or an incomplete score is clearly flagged. ACVPU includes C. Scale 2 is selectable per patient.
- Reproduction: In nurse prep, for an unresponsive patient on 4 L O2 with otherwise normal vitals, the stored `news2_score` is 0 (expected 5).
- Root cause: The module contract allows omission, and the UIs don't collect the fields.
- Impact: Under-triage of deteriorating patients and hypoxic or confused patients missed; over-triage of COPD patients.
- Recommendation: Add `'confusion'` to `ConsciousnessLevel`, add `spo2Scale: 1|2`, and return `isComplete` and `missingParameters`. Add ACVPU and O2 controls to both nurse modals and route `RecordVitalsModal` through `evaluateVitalSigns`.
- Effort: M
- Acceptance criteria: Confusion scores 3. Scale 2 at 88% on air scores 0. Missing RR yields `isComplete=false` and a UI warning. RecordVitalsModal rejects HR 1200.

### CLIN-13: eMAR has no dose schedule or double-administration guard, and BCMA can be satisfied by a "Simulate Scanner Scan" button
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Nurse medication administration
- Location: src/pages/nurse/NurseMedicationsPage.tsx:72-83,86-142,160-186,307-308; src/components/nurse/BarcodeVerificationModal.tsx:42-56,119-122; supabase/migrations/20260204000011_misc.sql:2050,2056-2057
- Evidence:
  ```
  NurseMedicationsPage.tsx:131  if (item.isPRN) return false;     // filteredScheduled never consults `administrations`
  BarcodeVerificationModal.tsx:52-54  const handleSimulateScan = () => { setScannedInput(expectedBarcode); setHasScanned(true);
  NurseMedicationsPage.tsx:174  status: payload.status || 'administered',   // DB comment: given, refused, held, not_given
  ```
- Actual behavior:
  - **No scheduling.** "Scheduled" items are every line of any dispensed or partially dispensed prescription, with no due time, frequency expansion or end date (duration is ignored). After administration the item stays listed with "Administer" active, so nothing prevents double dosing.
  - **Administrations aren't linked to orders.** `prescription_item_id` and `scheduled_time` are never written, so administrations can't be reconciled to an order line or time slot. The MAR query is unscoped beyond RLS and `.limit(100)`.
  - **BCMA can be bypassed.** BCMA checks only the patient wristband, and a production "Simulate Scanner Scan" button auto-fills the expected value. There is no medication barcode scan, the Five Rights are self-ticked, and the high-alert witness is free text with no authenticated co-signature (`witness_id` null).
  - **Status vocabulary drifts** from the DB (`administered/withheld` vs `given/held`).
  - **"Today" counters use the UTC date.**
- Expected behavior: Scheduled dose slots are generated from the order. Each slot is administered at most once within a window, with early/late warnings. BCMA scans both patient and drug. Witnesses co-sign authenticated.
- Reproduction: Administer a scheduled item; it remains in "Scheduled" and can be administered again immediately.
- Root cause: The eMAR is a flat list of prescriptions with no dose-instance model.
- Impact: Duplicate doses (for example of insulin or opioids), missed doses, and a weak five-rights audit.
- Recommendation: Introduce `medication_schedule` (dose instances) generated at dispense or verification. Enforce a unique (instance) administration. Remove the simulate button outside the demo flag. Add a drug-barcode step and witness re-authentication.
- Effort: L
- Acceptance criteria: A second administration of the same dose instance is blocked. The simulate button is absent in production builds. Administrations store `prescription_item_id` and `scheduled_time`.

### CLIN-14: Nurse-intake allergies and home medications never reach the CDS; prep failure paths can drop vitals and alerts silently
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static); RPC FK failure SUSPECTED
- Module: Nurse intake → doctor / CDS
- Location: src/components/nurse/PatientPrepModal.tsx:150-215; src/components/nurse/RecordVitalsModal.tsx:219-224; supabase/migrations/20260220000001_fix_complete_patient_prep.sql:20,40-42,75-79; src/hooks/useConsultations.ts:429-441
- Evidence:
  ```
  fix_complete_patient_prep.sql:77  CASE WHEN p_allergies IS NOT NULL AND p_allergies <> '' THEN 'Allergies: ' || p_allergies END,
  RecordVitalsModal.tsx:222         vitals.allergies ? `Allergies: ${vitals.allergies}` : null,          // into vital_signs.notes
  PatientPrepModal.tsx:197-199      await supabase.from('notifications').insert({ ... recipient_id: queueEntry.assigned_to ?? queueEntry.assigned_doctor_id,
  ```
- Actual behavior:
  - **Allergies and medications stay as free text.** Allergies and current medications captured by nurses go only into free-text `patient_prep_checklists.notes` or `vital_signs.notes`. They are then seeded into the doctor's chief complaint text, but `patients.allergies` and `current_medications` are never updated, so the CDS (CLIN-01) never sees them.
  - **The fallback path drops data.** If `complete_patient_prep` errors with a "function" or P0001 class error, the fallback marks the patient `ready_for_doctor` but does not store vitals, allergies or medications.
  - **The critical-vitals alert is unverified.** The notification insert may have a null recipient, its error is unchecked, and the toast still says "Doctor alerted immediately!".
  - **The RPC may always fail (SUSPECTED).** It inserts `recorded_by = auth.uid()` into an FK to `profiles(id)`, which would make every prep fail with an FK error.
  - **Status mismatch.** The RPC sets the queue to `in_service`; the fallback sets `waiting`. CONTEXT.md names `in_consultation`.
- Expected behavior: Structured allergy and medication reconciliation writes to the patient record, and failure paths are explicit.
- Reproduction: Complete nurse prep with allergy "penicillin", then prescribe Amoxicillin in the consultation (the patient record's allergies are empty): no alert.
- Root cause: The intake data model is free text.
- Impact: Known allergies documented at triage are invisible to prescribing safety checks.
- Recommendation: Write a structured allergy list to `patients.allergies` (with a reconciliation prompt), make the fallback store vitals or fail loudly, and check the notification insert result.
- Effort: M
- Acceptance criteria: An allergy entered at prep appears in `patients.allergies` and triggers CLIN-01 checks. A prep failure shows an error and does not mark the patient `ready_for_doctor`.

### CLIN-15: Four divergent pediatric dosing engines, none on the live prescribing path, with frequency arithmetic errors
- Severity: P2
- Category: Functional
- Status: CONFIRMED (probe)
- Module: order-safety / pediatric dosing
- Location: src/modules/order-safety/core/pediatricEngine.ts:150-160,183-185,229-249; src/utils/pediatricDosingEngine.ts:94,120-121; supabase/functions/pediatric-dosing/index.ts:161; supabase/functions/prescription-approval/index.ts:175-181; src/components/prescriptions/PediatricDosingCard.tsx (no importer)
- Evidence:
  ```
  pediatricEngine.ts:155  if (f === 'q4-6h' || f === 'q4h') return 5;      // q4h = 6/day
  pediatricEngine.ts:156  if (f === 'q6-8h' || f === 'q6h') return 3;      // q6h = 4/day; q8h/q12h fall to rule default
  utils/pediatricDosingEngine.ts:94  const dosesPerDay = rule.dosesPerDay;  // prescribed frequency ignored (also edge fn :161)
  prescription-approval:179  const doseMg = item.dose_mg || 0;           // column does not exist
  probe: {"case":"module ibuprofen 260mg q6h 20kg","finding":null,"mgkgday":39}   // true 52 mg/kg/day = 130% of max
  probe: {"case":"amox 3000mg BID 60kg","util_hard":true,"module_hard":false,"module_sev":"SERIOUS"}
  ```
- Actual behavior:
  - **Not wired.** `PediatricDosingCard` is not mounted, neither edge function is invoked from `src/`, and `useOrderSafety` is unused. The live flow has **no** weight-based dosing check.
  - **Frequency arithmetic is wrong.** The module under-counts q4h (5 instead of 6 doses) and q6h (3 instead of 4); the util and the edge function ignore the prescribed frequency entirely. Ibuprofen 13 mg/kg q6h (130% of the ceiling) therefore passes in both.
  - **Age check masks the hard stop.** Below the minimum age, the module returns early with only an age finding, so the 200% hard stop is never evaluated for young infants.
  - **The module fails open** for unconfigured drugs (`return {}`), while the util fails closed.
  - **Caps differ.** The util hard-stops at 2× adult caps; the module doesn't.
  - **Unit-blind.** All engines take `doseMg` with no mcg or mL handling, and prescriptions carry dose only as a free-text string.
- Expected behavior: A single dosing engine on the live path, frequency parsed correctly (qNh = 24/N), and fail-closed for unknown pediatric drugs.
- Reproduction: Run the probe (scratchpad `probe/peds.probe.test.ts`), or prescribe for a 20 kg child from the consultation UI and observe that no check exists.
- Root cause: The remediation added parallel copies rather than wiring one engine.
- Impact: The issue-13 claim is false. Pediatric overdoses (for example acetaminophen q4h) are not caught.
- Recommendation: Delete the util, edge and DUR copies (keep the edge function as a thin wrapper over the shared module if server enforcement is needed). Fix `getDosesPerDay` with a regex `q(\d+)h → 24/n`. Evaluate hard and override limits before the age warning. Return a fail-closed finding for unconfigured drugs. Capture structured dose and units in TreatmentPlanStep and call the module.
- Effort: M
- Acceptance criteria: q4h→6, q6h→4, q8h→3, q12h→2. A 1-month-old with a 250% dose is a hard stop. The same inputs give identical results via UI, module and edge function.

### CLIN-16: Lab reference and critical ranges ignore age and sex, and the keyword panel matcher picks wrong panels
- Severity: P2
- Category: Functional
- Status: CONFIRMED (probe)
- Module: critical-lab-escalation / Structured Result Entry
- Location: src/modules/critical-lab-escalation/core/labPanels.ts:55-62,100-106,162-169,250-300; src/components/lab/StructuredResultEntryModal.tsx:63-74
- Evidence:
  ```
  labPanels.ts:58   normalMin: 12.0,   // Hgb single unisex range 12.0-17.5
  labPanels.ts:105  criticalHigh: 6.2, // K+ adult panic applied to neonates
  labPanels.ts:273  lower.includes('pt') ||      labPanels.ts:283  lower.includes('ast') ||
  probe: {"t":"Fasting Lipid Profile","panel":"lft"} {"t":"Parathyroid Hormone (PTH)","panel":"coag"} {"t":"Gastrin","panel":"lft"}
  ```
- Actual behavior:
  - **No patient context.** `evaluateLabPanel` takes no age or sex. A neonate with Hgb 21 g/dL or K+ 6.3 is flagged as a panic value (false alarm), while a male with Hgb 12.5 shows as normal (missed anemia).
  - **Wrong panels.** Substring matching maps Lipid→LFT, PTH→Coag and Gastrin→LFT, so the tech is shown wrong analyte fields.
  - **Unit mismatch.** "Troponin I (High-Sensitivity)" uses ng/mL thresholds, while hs assays report ng/L.
- Expected behavior: Ranges keyed by test code, age band and sex, with panels resolved by catalogue code rather than substring.
- Reproduction: Open Structured Result Entry for "Fasting Lipid Profile"; the ALT/AST/bilirubin fields appear.
- Root cause: A hardcoded adult table and a substring matcher.
- Impact: Alarm fatigue from false panics, missed abnormalities, and transcription into wrong fields.
- Recommendation: Use `lab_critical_ranges` (with gender and age_group) or a typed reference table, pass patient DOB and sex into the evaluator, and match panels by test code.
- Effort: M
- Acceptance criteria: Neonatal K+ 6.3 is not critical. Male Hgb 12.5 is low. "Fasting Lipid Profile" maps to no panel or a lipid panel.

### CLIN-17: Lab order lifecycle — specimen rejection violates the status CHECK; sample tracking is disconnected from orders
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Lab Order lifecycle / sample tracking
- Location: src/pages/laboratory/LaboratoryPage.tsx:317-366; supabase/migrations/20260204000011_misc.sql:568; src/components/lab/SampleTracking.tsx:46-60,98-113; supabase/migrations/20260204000005_laboratory.sql:172
- Evidence:
  ```
  LaboratoryPage.tsx:320  status: 'sample_rejected',
  misc.sql:568  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sample_collected', 'in_progress', 'completed', 'cancelled')),
  SampleTracking.tsx:50   sample_id: `LAB-${new Date().getFullYear()}-${String((samples?.length || 0) + 1).padStart(3, '0')}`,
  laboratory.sql:172      sample_id TEXT NOT NULL UNIQUE,
  ```
- Actual behavior:
  - **Rejection fails.** Specimen rejection fails at the DB, so the automatic redraw order is never created (the error throws before it).
  - **Tracking is disconnected.** `SampleTracking` (`/laboratory/automation`) writes `lab_samples` with no `lab_order_id`.
  - **Sample IDs collide.** IDs come from a client count and are globally unique, so they collide across hospitals and under concurrency.
  - **Vocabulary drift.** `pending/sample_collected` in the code vs `ordered/collected` in CONTEXT.md.
- Expected behavior: Rejection is a valid state with a linked redraw. Samples reference orders. IDs come from a DB sequence.
- Reproduction: Reject a specimen in the Laboratory page; the update returns a check-constraint error.
- Root cause: Status vocabulary not migrated; a parallel sample model.
- Impact: Rejected specimens remain "collected" with no redraw, delaying results.
- Recommendation: Add `sample_rejected` to the CHECK (or a separate rejection table), add `lab_order_id` to `lab_samples`, and generate `sample_id` server-side, unique per hospital.
- Effort: S
- Acceptance criteria: Rejection succeeds and creates the redraw. A sample is linked to its order. Two hospitals can each create LAB-2026-001.

### CLIN-18: AI clinical support is simulated (keyword rules, fixed or random confidences) and feeds directly into the record
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: AI clinical support
- Location: src/components/consultations/AIConsultationAssistant.tsx:27-90,165; src/hooks/useAIClinicalSupport.ts:39-79,90-127,196-241; src/components/consultations/steps/DiagnosisStepEnhanced.tsx:80-101; src/components/ai/DifferentialDiagnosisEngine.tsx:180; src/services/ai/predictiveAnalyticsService.ts:399-461; nginx.conf:36-37
- Evidence:
  ```
  AIConsultationAssistant.tsx:44  // Simulate API call to Edge Function for AI analysis
  AIConsultationAssistant.tsx:55  value: 'Common Cold (J00)',          // for "fever" or "headache", confidence 0.85
  useAIClinicalSupport.ts:39      const response = await fetch('/api/ai/differential-diagnosis', {   // no such route; nginx try_files -> index.html
  DiagnosisStepEnhanced.tsx:87/89 icd_code: diagnosis.icd10_code || "AI-SUGGESTED", type: structuredDiagnoses.length === 0 ? "primary" : "differential",
  DifferentialDiagnosisEngine.tsx:180  likelihood: Math.max(0.1, Math.random() * 0.9),
  ```
- Actual behavior:
  - **No real AI calls.** Every `/api/ai/*` call fails (no backend route), so hardcoded keyword fallbacks with fixed confidences (0.85, 0.92, 0.70...) are shown as "AI".
  - **Misleading suggestion on the live screen.** The consultation sidebar "AROCORD AI Assistant" suggests "Common Cold (J00), 85% Match" for fever or headache, and "Add to Diagnosis" writes it into `final_diagnosis`.
  - **AI output becomes the primary diagnosis.** The "Generate AI Suggestions" button inserts results straight into the structured diagnosis list, as primary when the list is empty.
  - **Fabricated figures.** `predictPatientRisk` returns a fixed 0.65 risk and inserts it into `predictive_alerts`. The feature-flagged `DifferentialDiagnosisEngine` shows `Math.random` likelihoods.
  - **The labelling is weak.** The only caveat is a small "Pro Tip: AI suggestions are for guidance only"; nothing discloses that the outputs are rule-based or simulated.
- Expected behavior: Either real model output with provenance, or a clearly labelled "rule-based suggestion (no AI)" with no fabricated confidence. Suggestions require explicit accept and are never auto-assigned as primary.
- Reproduction: Type "fever" in the chief complaint; after about 2.5 s the sidebar shows "Common Cold (J00) 85% Match".
- Root cause: Demo scaffolding left in production paths.
- Impact: Anchoring bias (fever with headache can be meningitis), fabricated risk data persisted, and regulatory exposure (CDS transparency).
- Recommendation: Remove the confidences, label the output "rule-based, not AI", gate the assistant behind the `ai_clinical_tools` flag, require explicit per-item acceptance with type defaulting to `differential`, and stop inserting simulated `predictive_alerts`.
- Effort: S
- Acceptance criteria: No UI shows a numeric confidence not produced by a model. AI-sourced diagnoses are stored with `source:'ai'` and never default to primary.

### CLIN-19: Consultation completion over-reaches — future appointments and other queue entries are closed
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Consultation ↔ Patient Queue / appointments
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:636-649; src/hooks/useConsultations.ts:417-424,628-652
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:644-648  await supabase.from('appointments').update({ status: 'completed' })
      .eq('patient_id', consultation.patient_id).in('status', ['confirmed', 'checked_in', 'in_progress']);
  ConsultationWorkflowPage.tsx:637-641  .from('patient_queue').update({ status: 'completed', ... }).eq('patient_id', ...).in('status', ['in_service','called','waiting'])
  ```
- Actual behavior: On completion:
  - Every confirmed appointment for the patient, including future follow-ups, is marked `completed`.
  - Every active `patient_queue` row for the patient, in any department, is closed.
  - The writes are not scoped by hospital, `consultation.appointment_id` or queue entry, and their errors are ignored.
  - `useGetOrCreateConsultation` uses `.maybeSingle()` on a non-hospital-scoped "not completed" query, so multiple open consultations throw.
  - Queue statuses (`in_service`, `called`, `in_prep`) diverge from CONTEXT.md (`in_consultation`).
- Expected behavior: Update only the linked appointment and queue entry.
- Reproduction: Book a follow-up for next week (confirmed), then complete today's walk-in consultation; the follow-up status becomes `completed`.
- Root cause: Updates keyed on `patient_id`.
- Impact: Follow-up visits drop off reminders and worklists, so patients miss follow-up; other departments' queues are corrupted.
- Recommendation: Use `.eq('id', consultation.appointment_id)` and the queue entry ID, scope by `hospital_id`, check errors, and align the queue vocabulary with CONTEXT.md.
- Effort: S
- Acceptance criteria: Completing a consultation leaves future appointments and unrelated queue rows unchanged.

### CLIN-20: Prescription amendment always fails, and its design would orphan the order
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Clinical amendments (prescriptions)
- Location: src/components/audit/AmendmentModal.tsx:112-122; supabase/migrations/20260313000002_prescription_approval_logging_triggers.sql:233-306
- Evidence:
  ```
  AmendmentModal.tsx:114/120  p_item_id: currentItem.id, ... p_amendment_justification: formData.amendmentJustification,
  20260313000002:233-239  amend_prescription_dosage(p_prescription_id, p_old_dosage, p_new_dosage, p_amendment_reason, p_amending_doctor_id)
  20260313000002:299      SET status = 'amended',
  ```
- Actual behavior:
  - **The call always fails.** The client passes 9 named arguments to a 5-argument function, so PostgREST cannot resolve the function.
  - **The RPC would orphan the order.** Even if called, it never updates `prescription_items.dosage`, so the dispensed dose is unchanged. It sets `prescriptions.status='amended'`, which no pharmacy or eMAR list handles, so the order disappears from worklists.
  - **No authorisation.** The RPC is `SECURITY DEFINER` with no role or hospital check, and `p_amending_doctor_id` is caller-supplied.
- Expected behavior: The amendment atomically updates the item, re-enters pharmacist verification and records an audit row.
- Reproduction: Open "Amend" in the Pharmacy queue and submit; you get a "Could not find the function ..." error.
- Root cause: The RPC and client were developed separately.
- Impact: Dose corrections cannot be recorded, which pushes staff to verbal or paper workarounds.
- Recommendation: Align the signature. Update the item, set the status back to `pending` (re-verification), and derive the actor from `auth.uid()` with a role and hospital check.
- Effort: S
- Acceptance criteria: An amendment changes the item dosage, returns the Rx to pending verification and writes an audit row; non-doctors are rejected.

### CLIN-21: Telehealth: session notes and prescriptions are never persisted; the issuance component is unmounted and has no backend
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Telemedicine
- Location: src/components/telemedicine/SessionNotes.tsx:21,41-42; src/components/telemedicine/VideoCallModal.tsx:723; src/components/features/telehealth/TelehealthPrescriptionIssuance.tsx:167,190,208,224,276
- Evidence:
  ```
  SessionNotes.tsx:41-42  onSave?.(notes); toast.success('Session notes saved');
  VideoCallModal.tsx:723  {showNotes && <SessionNotes appointmentId={appointmentId} patientId={patient?.id || ''} />}   // no onSave
  TelehealthPrescriptionIssuance.tsx:224  supabase.functions.invoke('check-drug-interactions', ...)   // function not in supabase/functions
  ```
- Actual behavior: The notes in the video call (chief complaint, assessment, free-text "Prescriptions") are discarded, while the toast says "saved". `TelehealthPrescriptionIssuance` has no importer and depends on edge functions (`check-drug-interactions`, `issue-telehealth-prescription`) and tables (`telehealth_sessions`, `hospital_formulary`, `patient_allergy_profiles`) that do not exist.
- Expected behavior: Telehealth notes become a Consultation, and prescriptions go through the standard Prescription Approval Workflow.
- Reproduction: Start a video call, type notes and press Save, then close: nothing is stored.
- Root cause: Unwired component props and stub components.
- Impact: Lost clinical documentation and prescriptions communicated outside the system.
- Recommendation: Wire `onSave` to create or update a `consultations` row and route prescriptions through `useCreatePrescription` (with CLIN-01 CDS). Delete or finish the issuance component.
- Effort: M
- Acceptance criteria: Notes saved in a call appear on the patient's consultation history. No success toast appears without persistence.

### CLIN-22: The "immutable signed addendum" on a finalized consultation is a mutable append to `clinical_notes`
- Severity: P3
- Category: Functional
- Status: CONFIRMED (static)
- Module: Clinical notes / addenda
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:359-406,1232-1240,1304-1305; supabase/migrations (no immutability trigger on `consultations`)
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:377-383  const updatedNotes = (formData.clinical_notes || consultation.clinical_notes || '') + addendumBlock;
      await updateConsultation.mutateAsync({ id, clinical_notes: updatedNotes });
  ConsultationWorkflowPage.tsx:1304  This consultation is finalized. All amendments are appended as an immutable, audit-stamped addendum
  ```
- Actual behavior:
  - **Not immutable.** The addendum is text concatenated into `clinical_notes`, which any later update can rewrite.
  - **Finalized records stay editable.** No DB trigger prevents edits to `status='completed'` consultations via the API, and the "signature" is just the profile name in text.
  - **Risk of reverse-appending placeholders.** If `formData.clinical_notes` holds the decrypted `[Encrypted]` or the `__ENCRYPTED__` placeholder (CLIN-05), the placeholder is appended to and the original note is lost.
- Expected behavior: Addenda go in a separate append-only table, and finalized consultations are write-protected.
- Reproduction: Add an addendum, then PATCH `consultations.clinical_notes` via the API; the change succeeds.
- Root cause: No addendum model.
- Impact: Medico-legal integrity of finalized records.
- Recommendation: Create a `consultation_addenda` table (insert-only RLS, signer = `auth.uid()`) and a BEFORE UPDATE trigger that blocks edits to completed consultations except status-neutral metadata.
- Effort: S
- Acceptance criteria: An UPDATE of a completed consultation's narrative is rejected. Addenda are listed separately with signer and timestamp.

### CLIN-23: ICD-10 catalogue is a 69-code seed; search breaks on punctuation
- Severity: P3
- Category: Functional
- Status: CONFIRMED (static); punctuation breakage LIKELY
- Module: Diagnosis coding
- Location: supabase/migrations/20260204000011_misc.sql:2381-2516; src/hooks/useICD10Codes.ts:15-18; src/lib/medical/ICD10Service.ts:4
- Evidence:
  ```
  useICD10Codes.ts:16-17  query = query.or(`code.ilike.%${searchTerm}%,short_description.ilike.%${searchTerm}%,long_description.ilike.%${searchTerm}%`);
  (seed) INSERT INTO public.icd10_codes ... 69 rows
  ```
- Actual behavior:
  - **Tiny catalogue.** Step 3 searches a 69-row table, so most diagnoses return "No ICD-10 codes found".
  - **Duplicate catalogue.** The separate 1,154-line hardcoded `ICD10Service.ts` is used only by voice and suggestion widgets.
  - **Search breaks on punctuation.** User text is interpolated unescaped into the PostgREST `or()` grammar, so commas or parentheses break the query.
  - **No billability check.** Non-billable category codes are not prevented.
- Expected behavior: A full ICD-10(-CM) catalogue with safe search.
- Recommendation: Load the full code set, escape or quote the search (or use an RPC with `ILIKE $1`), and enforce `is_billable` for the primary diagnosis.
- Reproduction: Search "fracture, femur": an error or no results.
- Root cause: Seed data only.
- Impact: Doctors cannot code most encounters, so diagnoses fall back to free text or 'UNSPECIFIED'.
- Effort: M
- Acceptance criteria: Searching "S72" returns femoral fracture codes; "fracture, femur" returns results without error.

### CLIN-24: Type safety is disabled on core clinical paths, and duplicate or dead implementations mask defects
> **Consolidation note:** this finding duplicates **ARCH-03** and is kept for its evidence. The register counts it once, under ARCH-03.

- Severity: P3
- Category: Technical debt
- Status: CONFIRMED (static)
- Module: Cross-module
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:1; src/hooks/useLabOrders.ts:1; src/lib/hooks/pharmacy/usePrescriptions.ts:1; src/hooks/usePharmacy.ts (identical to src/lib/hooks/pharmacy/usePharmacy.ts); src/hooks/usePrescriptions.ts (divergent, no importer); src/components/doctor/PrescriptionBuilder.tsx (tests only); src/hooks/useClinicalValidation.ts (no importer)
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:1  // @ts-nocheck
  useLabOrders.ts:1               // @ts-nocheck
  lib/hooks/pharmacy/usePrescriptions.ts:1  // @ts-nocheck
  $ diff src/hooks/usePharmacy.ts src/lib/hooks/pharmacy/usePharmacy.ts && echo IDENTICAL_usePharmacy  ->  IDENTICAL_usePharmacy
  ```
- Actual behavior: The three most safety-critical files compile without type checking, which hides the enum mismatch (CLIN-07), missing columns (CLIN-06) and response-shape bugs (CLIN-11). Parallel copies (CDS, pediatric dosing, pharmacy hooks, discharge state machine) mean tests exercise code the UI never runs.
- Expected behavior: Strict types on clinical paths, with one implementation per concern exercised by both UI and tests.
- Reproduction: static analysis.
- Root cause: Incremental remediation by duplication.
- Impact: Defects ship undetected while the test suites stay green.
- Recommendation: Remove `@ts-nocheck` from the three files and regenerate `src/integrations/supabase/types.ts` (it lacks `lab_critical_alerts`, `discharge_workflows` and `prescription_approval_workflows`). Delete the dead copies. Add a dependency-cruiser rule that forbids `checkPrescriptionSafety`.
- Effort: M
- Acceptance criteria: `tsc --noEmit` passes for those files. The duplicate hooks are removed. An integration test renders ConsultationWorkflowPage against the order-safety module.

### CLIN-25: UTC "today" and date-only parsing in clinical time logic
- Severity: P3
- Category: Functional
- Status: CONFIRMED (static)
- Module: eMAR, lab stats, consultation seeding, on-call lookup
- Location: src/pages/nurse/NurseMedicationsPage.tsx:308; src/hooks/useConsultations.ts:430-436; supabase/functions/critical-lab-check/index.ts:379; src/pages/consultations/ConsultationWorkflowPage.tsx:602
- Evidence:
  ```
  NurseMedicationsPage.tsx:308  a.administered_at?.startsWith(new Date().toISOString().split('T')[0])
  useConsultations.ts:430       const today = new Date().toISOString().split('T')[0];
  critical-lab-check:379        const today = new Date().toISOString().split("T")[0];
  ```
- Actual behavior: "Today" boundaries use UTC. For UTC+5:30 sites, doses given between 00:00 and 05:29 local count toward the previous day; the on-call roster lookup uses the UTC date; and `new Date('YYYY-MM-DD')` follow-up dates render one day early for UTC-negative sites. There is no medication schedule yet (CLIN-13), so no dose-timing logic exists to be timezone-correct.
- Expected behavior: Hospital-timezone-aware day boundaries (a hospital timezone setting).
- Reproduction: static analysis.
- Root cause: Naive ISO string slicing.
- Impact: Wrong daily dose counts and the wrong on-call physician selected near midnight.
- Recommendation: Store a hospital IANA timezone and compute boundaries with `date-fns-tz`; in SQL, use `(now() AT TIME ZONE hospital_tz)::date`.
- Effort: S
- Acceptance criteria: A dose at 02:00 IST counts as today's in the MAR stats, and the on-call lookup uses the local date.

### Additional clinical findings from lead verification (CLIN-26 to CLIN-29)

### CLIN-26: Completing a consultation throws `ReferenceError: queryClient is not defined` after the database update
- Severity: P1
- Category: Functional
- Status: CONFIRMED (tsc -p tsconfig.app.json: TS2552 ×3; code read)
- Module: Consultations
- Location: src/hooks/useConsultations.ts:611-660 (onSuccess at :654-656)
- Evidence:
  ```
  src/hooks/useConsultations.ts(654,9): error TS2552: Cannot find name 'queryClient'. Did you mean 'useQueryClient'?
  queryClient.invalidateQueries({ queryKey: ['queue'] });
  ```
- Actual behavior: In `useAdvanceConsultationStep`, when the next status is `completed` the `onSuccess` handler fires a queue update and then references an undeclared `queryClient`. The handler throws. TanStack Query v5 then treats the mutation as failed (the error reaches `onError`/`mutateAsync` callers) even though the consultation row is already completed. The success toast never shows, and the `queue`, `patients-ready-for-doctor` and `nurse-queue` caches are not invalidated, so stale queues remain on screen.
- Expected behavior: Completion reports success, and the dependent queues refresh.
- Reproduction: Advance any consultation to the final step and complete it. Watch the console and the toast.
- Root cause: A missing `const queryClient = useQueryClient()` in this hook. It is not caught because `npm run type-check` checks zero files (ARCH-01).
- Impact: Clinicians see an error for a completed encounter, may retry and duplicate downstream orders (see CLIN-07), and queues show patients who have already been seen.
- Recommendation: Add `useQueryClient()` to the hook, and make the type-check gate real.
- Effort: S
- Acceptance criteria: A component test that completes a consultation asserts the success toast and the three invalidations. `tsc -p tsconfig.app.json` reports no TS2552 errors.


### CLIN-27: Deep-module hooks build the clinical actor from fields that do not exist (`profile.role`, `user.role`, `user.hospital_id`)
- Severity: P1
- Category: Functional
- Status: CONFIRMED (tsc TS2339; code read). Runtime effect LIKELY.
- Module: Prescription dispensing / critical lab escalation / order safety (src/modules)
- Location: src/modules/prescription-dispensing/usePrescriptionDispensing.ts:75-83; src/modules/critical-lab-escalation/useCriticalLabEscalation.ts:52-61; src/modules/order-safety/useOrderSafety.ts:84-92
- Evidence:
  ```
  const role = (profile?.role || (user as any)?.role || 'pharmacist') as string;
  const hospitalId = profile?.hospital_id || (user as any)?.hospital_id || 'default-hospital';
  ```
- Actual behavior: AuthContext exposes `roles`/`primaryRole`, not `profile.role`. Supabase's `User.role` is the Postgres role (`'authenticated'`). The actor role therefore resolves to `'authenticated'`, and the module role gates (pharmacist-only approval, doctor-targeted alerts) reject legitimate users or target nobody. When `profile` is null, the tenant becomes the literal `'default-hospital'`. These hooks are live through `usePrescriptionApprovalWorkflow`, `useCriticalLabAlerts` and `LaboratoryPage`.
- Expected behavior: The actor is derived from `primaryRole` / `roles` and `profile.hospital_id`. When either is missing the hook fails closed and makes no default-tenant call.
- Reproduction: Static. Log in as a pharmacist. The engine receives `role: 'authenticated'`.
- Root cause: Interface drift between AuthContext and the modules, hidden by `as any` casts and the vacuous type-check.
- Impact: Role-gated clinical workflows silently malfunction. A default-tenant fallback is a latent cross-tenant bug.
- Recommendation: Add a typed `useClinicalActor()` in one place and remove the `as any` fallbacks and `'default-hospital'`.
- Effort: S
- Acceptance criteria: The hooks compile without casts. A unit test with a pharmacist AuthContext yields `actor.role === 'pharmacist'`. A missing hospital yields an error state, not a request.


### CLIN-28: "Initiate discharge" modal calls `.filter`/`.find` on a paginated object and crashes
- Severity: P1
- Category: Functional
- Status: LIKELY (tsc TS2339 on the union type; code read)
- Module: Discharge pipeline
- Location: src/components/discharge/InitiateDischargeModal.tsx:93-101
- Evidence:
  ```
  error TS2339: Property 'filter' does not exist on type 'never[] | { patients: never[]; total: number; ... } | { patients: Patient[]; ... }'
  const filteredPatients = (patients || []).filter((p) => { ... });
  ```
- Actual behavior: `usePatients` returns a paginated `{ patients, total, ... }` object. Once data loads, `.filter` on that object throws a TypeError and the modal (or page) falls into the error boundary, which blocks the first step of the ADR-0003 discharge pipeline.
- Expected behavior: Use `data?.patients ?? []`.
- Reproduction: Open the discharge workflow page and click Initiate Discharge once patients have loaded.
- Root cause: The hook's return shape changed without updating consumers. The type error is hidden by the vacuous type-check.
- Impact: Doctors cannot start discharges from this entry point.
- Recommendation: Fix the accessor. Add a render test with the paginated mock shape.
- Effort: S
- Acceptance criteria: The modal renders and filters with a paginated `usePatients` result. No TS2339 remains.


### CLIN-29: Nurse dashboard opens the medication administration modal without the prescription, patient or administer handler
- Severity: P2
- Category: Functional
- Status: LIKELY (tsc TS2739; code read)
- Module: Nursing / eMAR
- Location: src/components/dashboard/NurseDashboard.tsx:281-284; src/components/nurse/MedicationAdministrationModal.tsx:42-66
- Evidence:
  ```
  <MedicationAdministrationModal open={isMedModalOpen} onOpenChange={setIsMedModalOpen} />
  // props require: prescription, patient, onAdminister
  ```
- Actual behavior: The dashboard shortcut opens an empty modal. Confirming calls the undefined `onAdminister` and throws, so nothing is recorded.
- Expected behavior: The shortcut either selects a due medication first or navigates to the eMAR page.
- Reproduction: As a nurse, use the dashboard's medication administration action.
- Root cause: Props contract drift, unchecked by the type gate.
- Impact: A dead-end in a medication-safety workflow. Nurses may believe a dose was charted when it was not.
- Recommendation: Route to `/hospital/nurse/medications` or pass a selected prescription and patient.
- Effort: S
- Acceptance criteria: No TS2739. The dashboard action leads to a working administration flow with the record persisted.

## 5. Operational workflows and routing: feature status, route inventory and findings (FUNC)

- Auditor scope: onboarding, admin, receptionist, billing, patient portal, telemedicine, messaging, notifications, inventory and suppliers, documents, queue, workflow dashboards, routing and navigation, mock detection, error handling.
- Repo HEAD: `43ab8f7`. This was a read-only audit. Static analysis was backed by small esbuild/node runs of repository modules in the scratchpad, and existing vitest files were run (5 files, 35 passed).
- Vocabulary follows `CONTEXT.md`: User Role, Admin, Receptionist, Patient Queue, Front-Desk Billing, Billing Boundary, Patient Portal Access.
- "Migrations" means `supabase/migrations/**` (including `legacy/`). Where a finding depends on the deployed DB matching the migrations, it says so. `src/integrations/supabase/types.ts` (generated types) was used as a second source and agrees in every case cited.

---

### (a) Feature status

| # | Feature | Status | Key evidence (file:line) |
|---|---|---|---|
| 1 | Hospital signup (`/hospital/signup`) | **Broken** (hospital step fails; recoverable via `/hospital/account-setup`) | `src/pages/hospital/SignupPage.tsx:109,200-216`; `src/contexts/AuthContext.tsx:754-755,787`; FUNC-03 |
| 2 | Staff password login | Working correctly | `src/contexts/AuthContext.tsx:542-575` |
| 3 | 2FA enrolment (mandatory admin/doctor) | Working with limitations (can be disabled from profile) | `src/routes/routeDefinitions.tsx:173`; `src/pages/settings/UserProfilePage.tsx:21-28`; FUNC-26 |
| 4 | 2FA verification at login | **Broken** (not enforced) | `src/pages/hospital/LoginPage.tsx:81,110-114`; `routeDefinitions.tsx:210-216`; FUNC-02 |
| 5 | Forgot / reset password | Working with limitations | `ForgotPasswordPage.tsx:50-52`; `ResetPasswordPage.tsx:83-99` |
| 6 | Staff invitation (create / link / accept) | Working with limitations (no email is sent; the onboarding wizard is broken) | `src/hooks/useStaffInvitations.ts:103-112`; `StaffOnboardingWizard.tsx:148`; FUNC-21 |
| 7 | Role assignment / edit staff | Needs runtime verification (relies on the "Admins can manage roles in their hospital" RLS) | `src/components/staff/EditStaffModal.tsx:122-163`; `migrations/20260613100405_…sql:42-56` |
| 8 | Staff directory (`/settings/staff`) | **Broken** for staff onboarded through the app (`is_staff` is never set) | `StaffManagementPage.tsx:125-129`; FUNC-04 |
| 9 | Profile page (`/profile`) | Partially implemented (read-only; Change Password does nothing) | `UserProfilePage.tsx:190-192`; FUNC-26 |
| 10 | Hospital settings (`/settings`) | Working correctly | `HospitalSettingsPage.tsx:122-163` |
| 11 | Activity logs (`/settings/activity`) | Working correctly | `src/components/audit/AuditLogViewer.tsx:84` |
| 12 | Audit log viewer (`/settings/audit-logs`) | **Broken** (crashes on render) | `src/pages/admin/AuditLogViewer.tsx:64-67`; FUNC-17 |
| 13 | System health (`/settings/health`) | **Broken** (crashes on render) | `src/pages/admin/SystemHealthDashboard.tsx:66-71`; FUNC-17 |
| 14 | System monitoring (`/settings/monitoring`) | Partially implemented (hardcoded metrics) | `src/components/monitoring/MonitoringDashboard.tsx:75-84,146-160`; FUNC-18 |
| 15 | Reports (`/reports`) | Working with limitations (real data; revenue attribution and row caps) | `src/hooks/useReports.ts:109-114,177-178`; FUNC-28 |
| 16 | Admin dashboard analytics / Performance tab | Partially implemented (hardcoded) | `src/components/analytics/StaffPerformanceMetrics.tsx:38-58`; FUNC-18 |
| 17 | Staff-side patient registration (`PatientRegistrationModal`) | Working with limitations (no duplicate detection) | `src/components/patients/PatientRegistrationModal.tsx:170-222`; FUNC-27 |
| 18 | Patient self-registration (`/patient-register`) | **Broken** | `src/pages/patient/PatientRegisterPage.tsx:198`; `migrations/20260224000001_register_patient_atomic.sql:36,42,56`; FUNC-01 |
| 19 | Check-in (appointment and walk-in) to `patient_queue` | Working with limitations (not atomic) | `src/lib/hooks/appointments/useAppointments.ts:376-427`; `src/hooks/useUnifiedCheckIn.ts:66-101`; FUNC-16 |
| 20 | Kiosk self check-in (`/kiosk`) | **Not implemented** (mock) | `src/components/receptionist/CheckInKiosk.tsx:58,98-104`; FUNC-11 |
| 21 | Queue management (`/queue`) | Working correctly (needs runtime verification) | `src/hooks/useQueue.ts:113,209-258` |
| 22 | Staff appointment booking | Working with limitations (no conflict or double-booking check) | `ScheduleAppointmentModal.tsx:95-97`; `useAppointments.ts:201-214`; FUNC-12 |
| 23 | Doctor availability / slot generation (`/scheduling`) | Partially implemented (wrong weekday west of UTC; duplicate slots; no nav entry) | `src/lib/hooks/appointments/useDoctorAvailability.ts:197-198,214-268`; FUNC-14 |
| 24 | Smart scheduler (`/scheduler`, `/receptionist/smart-scheduler`) | Partially implemented (slots are never marked booked) | `src/components/receptionist/SmartScheduler.tsx:44-60`; FUNC-12 |
| 25 | Recurring appointments | **Not implemented** (all recurrence UI is dead code) | `src/components/features/**`; `src/lib/recurrence.utils.ts`; FUNC-23 |
| 26 | No-show / cancel / reschedule | Partially implemented | `src/pages/appointments/AppointmentsPage.tsx:155-161,503-528`; `AppointmentCalendarView.tsx:43-67`; FUNC-15 |
| 27 | Patient appointment requests (portal) | Partially implemented (approval never creates an appointment) | `src/lib/hooks/appointments/useAppointmentRequests.ts:194-204,240-253`; FUNC-13 |
| 28 | Invoice creation | **Broken** for tax and discount (the saved total differs from the displayed total) | `src/components/billing/CreateInvoiceModal.tsx:124-127,179-191`; `src/hooks/useBilling.ts:273-275`; FUNC-05 |
| 29 | Payment recording (multi-tender) | Working with limitations (calculation and concurrency defects) | `src/components/billing/EnhancedPaymentModal.tsx:118-121`; `useBilling.ts:375-391`; FUNC-06 |
| 30 | Invoice numbering | Working with limitations (race, no uniqueness constraint) | `migrations/20260204000011_misc.sql:874-889`; FUNC-07 |
| 31 | "Unbilled charges" import | **Broken** (re-proposes already-billed items) | `src/hooks/useUnbilledCharges.ts:38-45,70-77`; FUNC-08 |
| 32 | Insurance claims | Partially implemented (local CRUD works; provider submission is a mock with a schema mismatch) | `src/hooks/useInsuranceClaims.ts:57-68,212-225`; `supabase/functions/insurance-integration/index.ts:121-137,170-189`; FUNC-09 |
| 33 | Online / patient card payments | **Not implemented** (mock Stripe; UI not routed) | `src/utils/paymentService.ts:1-33`; FUNC-30 |
| 34 | `billing.calculator.ts`, `edi837.builder.ts`, `billingValidator.ts` | Not implemented (dead code with latent defects) | FUNC-31 |
| 35 | Patient portal (own data) | Working with limitations (status filters differ from CONTEXT.md) | `src/lib/hooks/patients/usePatientPortal.ts:106-115,175-184,258-266`; FUNC-30 |
| 36 | Patient messages (`/patient/messages`) | Working with limitations (no navigation entry) | FUNC-19 |
| 37 | Staff messaging (`/messages`) | Partially implemented (patient-only contacts; receptionist excluded) | `src/pages/messaging/DoctorMessagesPage.tsx:37`; FUNC-20 |
| 38 | Telemedicine video | Needs runtime verification (real WebRTC over Supabase broadcast; STUN-only) | `src/components/telemedicine/VideoCallModal.tsx:379-383,455-463`; FUNC-24 |
| 39 | Notifications (`/notifications`, bell) | Working with limitations (some `action_url` values 404) | `src/hooks/useWorkflowNotifications.ts:330`; FUNC-19 |
| 40 | Inventory and low stock | Working correctly (the `check-low-stock` edge function needs runtime verification) | `src/hooks/useMedications.ts:97-99`; `ReorderSystemCard.tsx:28` |
| 41 | Suppliers / purchase orders | Partially implemented (receiving does not update stock; no navigation entry) | `src/hooks/useSuppliers.ts:240-251`; FUNC-22 |
| 42 | Documents (upload/list/delete) | Working correctly | `src/hooks/useDocumentUpload.ts:47-82` |
| 43 | Integration workflow dashboard | Partially implemented (missing RPC; hardcoded 85%) | `src/hooks/useWorkflowAutomation.ts:260`; `WorkflowDashboard.tsx:806`; FUNC-18 |
| 44 | Workflow optimization page | Partially implemented (missing RPCs; no layout; no navigation entry) | `WorkflowPerformanceMonitor.tsx:18,34`; FUNC-17/19 |
| 45 | Routing: 404, Access Denied, lazy-load error boundary | Working correctly | `routeDefinitions.tsx:700`; `RoleProtectedRoute.tsx:74-146`; `App.tsx:111-124` |

### (b) Route inventory

**Counts** (from `src/routes/routeDefinitions.tsx` and `src/config/routeManifest.ts`):

| Metric | Count |
|---|---|
| Route definitions | **102**: 32 redirects, 17 public or auth-gate, 52 role-protected, 1 fallback `*` |
| Redirect targets that resolve to a real route | 32 / 32 |
| Sidebar (manifest) items | 37 live (+1 commented out: `/scheduler`, "BUG-005") |
| Sidebar links to non-existent routes | **0** |
| Role-protected routes **not** in the sidebar | 16 (2 are `:id` detail routes) |
| Orphan routes (no sidebar entry and no in-app link) | **10**: `/suppliers`, `/scheduling`, `/patient/messages`, `/workflow/discharge`, `/workflow/optimization`, `/testing`, `/scheduler`, `/hospital/nurse/medications`, `/hospital/doctor/dashboard`, `/hospital/pharmacy/queue` (reachable only via the `/pharmacy/queue` redirect) |
| Pages in `src/pages` (non-test `.tsx`) | 79: 69 routed, **10 unrouted (dead)** |
| Routed stub or mock pages | 3: `/kiosk`, `/hospital/doctor/dashboard`, `/hospital/pharmacy/queue` |
| Routes that crash on render | 2: `/settings/audit-logs`, `/settings/health` |
| Protected routes without `DashboardLayout` | 4: `/settings/audit-logs`, `/settings/health`, `/workflow/optimization`, `/consultations/mobile` |
| Distinct broken in-app link targets | 7 in live code (`/hospital/patients`, `/hospital/pharmacy/prescription/:id`, `/pharmacy/prescriptions/:id`, `/patient/billing`, `/reception`, `/doctor`, `/records`), plus 4 in dead code |
| Role or guard mismatches | nurse on `/appointments`; 2 feature flags enforced only in the manifest; sidebar uses all roles while the guard uses the primary role; receptionist has no messaging route |

Unrouted (dead) pages: `src/pages/Index.tsx`, `audit/AuditDashboard.tsx`, `dashboard/LabTATDashboard.tsx`, `dashboard/PharmacyInventoryDashboard.tsx`, `dashboard/WardCensusDashboard.tsx`, `messaging/LabTechMessagesPage.tsx`, `messaging/NurseMessagesPage.tsx`, `messaging/PharmacistMessagesPage.tsx`, `messaging/ReceptionistMessagesPage.tsx`, `settings/CodeReviewDashboard.tsx`.

**Guards.** Role-protected routes pass through two layers: (1) `checkRouteAccess` (`src/middleware/routeGuard.ts:47-74`), a longest-prefix match on manifest and explicit configs that applies the manifest `requiredPermission` (for example, `/laboratory/automation` needs `laboratory` and `/nurse/protocols` needs `vitals:write`); and (2) `allowedRoles` plus `requiredPermission` in `withRoleAccess`. The matrix below was computed by running both layers for every role (esbuild bundle of `routeGuard.ts` and `permissions.ts`).

Role abbreviations: A = admin, D = doctor, N = nurse, R = receptionist, P = pharmacist, L = lab technician, Pt = patient.

| Path | Page component | Allowed roles (route) | Perm / flag | In sidebar? | Guard | Notes |
|---|---|---|---|---|---|---|
| /hospital | LandingPage | anonymous only | - | no | PublicRoute |  |
| /hospital/login | LoginPage | anonymous only | - | no | PublicRoute | 2FA modal unmounted by the PublicRoute redirect (FUNC-02) |
| /hospital/signup | SignupPage | anonymous only | - | no | PublicRoute | hospital creation step fails (FUNC-03) |
| /hospital/forgot-password | ForgotPasswordPage | anonymous only | - | no | PublicRoute |  |
| /hospital/reset-password | ResetPasswordPage | open | - | no | none | after reset, navigating to /login bounces to /dashboard |
| /hospital/select-role | RoleSelectionPage | authenticated, multi-role pending | - | no | RoleSelectionRoute |  |
| /hospital/two-factor-setup | MandatoryTwoFactorSetupPage | authenticated, 2FA pending | - | no | TwoFactorSetupRoute |  |
| /hospital/join/:token | JoinPage | anonymous only | - | no | PublicRoute | new users only |
| /quick-access | QuickAccessPage | open | - | no | none | links to login with ?role= |
| /patient-register | PatientRegisterPage | anonymous only | - | no | PublicRoute | BROKEN: register_patient RPC (FUNC-01) |
| /patient-login | PatientLoginPage | anonymous only | - | no | PublicRoute |  |
| /hospital/profile-setup | ProfileSetupPage | any authenticated | - | no | ProtectedRoute |  |
| /hospital/role-setup | AdminRoleSetupPage | any authenticated | - | no | ProtectedRoute | the 2FA gate pre-empts it for a new admin |
| /hospital/account-setup | AccountSetupPage | open | - | no | none | page guards itself |
| /dashboard | Dashboard | any authenticated | - | yes | ProtectedRoute |  |
| /profile | UserProfilePage | any authenticated | - | no (avatar menu) | ProtectedRoute | Change Password button does nothing |
| /notifications | NotificationsPage | any authenticated | - | no (bell) | ProtectedRoute |  |
| /patients | PatientsPage | A,D,N,R | patients | yes | RoleProtectedRoute+routeGuard |  |
| /patients/:id | PatientProfilePage | A,D,N,R | - | no | RoleProtectedRoute+routeGuard |  |
| /appointments | AppointmentsPage | A,D,N,R | appointments | yes | RoleProtectedRoute+routeGuard | nurse is listed but denied (no `appointments` permission) |
| /consultations | ConsultationsPage | A,D,N | consultations:read | yes | RoleProtectedRoute+routeGuard |  |
| /consultations/mobile | MobileConsultationPage | A,D | - | no | RoleProtectedRoute+routeGuard | no DashboardLayout |
| /consultations/:id | ConsultationWorkflowPage | A,D,N | - | no | RoleProtectedRoute+routeGuard |  |
| /pharmacy | PharmacyPage | A,P | pharmacy | yes | RoleProtectedRoute+routeGuard |  |
| /hospital/doctor/dashboard | DoctorDashboard | D | - | no | RoleProtectedRoute+routeGuard | STUB: hardcoded stats; links to /hospital/patients (404) |
| /hospital/pharmacy/queue | PharmacyQueuePage | P | - | no | RoleProtectedRoute+routeGuard | STUB: hardcoded mock prescriptions; target of the /pharmacy/queue redirect |
| /hospital/nurse/medications | NurseMedicationsPage | N | - | no | RoleProtectedRoute+routeGuard | orphan (no navigation entry) |
| /pharmacy/clinical | ClinicalPharmacyPage | A,P | clinical-pharmacy | yes | RoleProtectedRoute+routeGuard |  |
| /queue | QueueManagementPage | A,D,N,R | queue:read | yes | RoleProtectedRoute+routeGuard |  |
| /laboratory | LaboratoryPage | A,D,N,L | lab:read | yes | RoleProtectedRoute+routeGuard |  |
| /laboratory/automation | LabAutomationPage | A,L | (manifest: laboratory) | yes | RoleProtectedRoute+routeGuard |  |
| /radiology | RadiologyPage | A,D,N,L | lab:read | yes | RoleProtectedRoute+routeGuard |  |
| /billing | BillingPage | A,R | billing:read | yes | RoleProtectedRoute+routeGuard | see FUNC-05 to FUNC-09 |
| /inventory | InventoryPage | A,P | inventory:read | yes | RoleProtectedRoute+routeGuard |  |
| /reports | ReportsPage | A | reports | yes | RoleProtectedRoute+routeGuard | real data, 1000-row cap |
| /patient/appointments | PatientAppointmentsPage | Pt | appointments:read | yes | RoleProtectedRoute+routeGuard |  |
| /patient/prescriptions | PatientPrescriptionsPage | Pt | prescriptions:read | yes | RoleProtectedRoute+routeGuard |  |
| /patient/lab-results | PatientLabResultsPage | Pt | lab:read | yes | RoleProtectedRoute+routeGuard |  |
| /patient/medical-history | PatientMedicalHistoryPage | Pt | (manifest: portal) | yes | RoleProtectedRoute+routeGuard |  |
| /patient/portal | EnhancedPortalPage | Pt | portal | yes | RoleProtectedRoute+routeGuard |  |
| /patient/messages | PatientMessagesPage | Pt | - | no | RoleProtectedRoute+routeGuard | orphan (no navigation entry) |
| /messages | DoctorMessagesPage | A,D,N,P,L | - | no | RoleProtectedRoute+routeGuard | linked only from the doctor dashboard; patient-only contacts for every staff role |
| /telemedicine | TelemedicinePage | A,D,N | telemedicine:read | yes | RoleProtectedRoute+routeGuard | STUN-only WebRTC |
| /settings | HospitalSettingsPage | A | settings | yes | RoleProtectedRoute+routeGuard |  |
| /settings/staff | StaffManagementPage | A | staff-management | yes | RoleProtectedRoute+routeGuard | list is empty for invited staff (FUNC-04) |
| /settings/performance | StaffPerformancePage | A | staff-performance | yes | RoleProtectedRoute+routeGuard |  |
| /settings/activity | ActivityLogsPage | A | activity-logs | yes | RoleProtectedRoute+routeGuard |  |
| /settings/monitoring | SystemMonitoringPage | A | system-monitoring | yes | RoleProtectedRoute+routeGuard | hardcoded metrics |
| /settings/health | SystemHealthDashboard | A | system-health | yes (flag system_health) | RoleProtectedRoute+routeGuard | CRASH: hasPermission undefined; no layout; flag enforced only in sidebar |
| /settings/audit-logs | AuditLogViewer | A | audit-logs | yes (flag audit_logs) | RoleProtectedRoute+routeGuard | CRASH: hasPermission undefined; no layout; flag enforced only in sidebar |
| /ai-demo | AIDemoPage | A,D | - / flag:ai_demo | yes | RoleProtectedRoute+routeGuard+FeatureFlagRoute |  |
| /differential-diagnosis | DifferentialDiagnosisPage | A,D | - / flag:ai_clinical_tools | yes | +FeatureFlagRoute |  |
| /treatment-recommendations | TreatmentRecommendationsPage | A,D | - / flag:ai_clinical_tools | yes | +FeatureFlagRoute |  |
| /treatment-plan-optimization | TreatmentPlanOptimizationPage | A,D | - / flag:ai_clinical_tools | yes | +FeatureFlagRoute |  |
| /predictive-analytics | PredictiveAnalyticsPage | A,D | - / flag:ai_analytics | yes | +FeatureFlagRoute |  |
| /length-of-stay-forecasting | LengthOfStayForecastingPage | A,D | - / flag:ai_analytics | yes | +FeatureFlagRoute |  |
| /resource-utilization-optimization | ResourceUtilizationOptimizationPage | A,D | - / flag:ai_analytics | yes | +FeatureFlagRoute |  |
| /voice-clinical-notes | VoiceClinicalNotesPage | A,D,N | (manifest: voice-clinical-notes) | yes | RoleProtectedRoute+routeGuard |  |
| /suppliers | SuppliersPage | A,P | - | no | RoleProtectedRoute+routeGuard | orphan (no navigation entry) |
| /scheduling | SchedulingPage | A,D,R | - | no | RoleProtectedRoute+routeGuard | orphan; wrong weekday west of UTC |
| /documents | DocumentsPage | A,D,N,R | - | no | RoleProtectedRoute+routeGuard | reachable only from global search results |
| /scheduler | SmartSchedulerPage | A,R | - | no | RoleProtectedRoute+routeGuard | removed from the sidebar (BUG-005) but still routed |
| /receptionist/smart-scheduler | SmartSchedulerPage | A,R | - | no | RoleProtectedRoute+routeGuard | linked from the receptionist dashboard; slots are never marked booked |
| /kiosk | KioskPage | A,R | patients | yes | RoleProtectedRoute+routeGuard | MOCK: 3 hardcoded patients; check-in is not persisted |
| /nurse/protocols | NurseCareProtocolsPage | A,N | (manifest: vitals:write) | yes | RoleProtectedRoute+routeGuard |  |
| /integration/workflow | WorkflowDashboard | A,D,N,R,P,L | workflow-dashboard | yes | RoleProtectedRoute+routeGuard | get_workflow_metrics RPC missing; hardcoded 85% |
| /workflow/optimization | WorkflowOptimizationPage | A,D,N,R,P,L | - | no | RoleProtectedRoute+routeGuard | orphan; no DashboardLayout; missing RPCs |
| /workflow/discharge | DischargeWorkflowPage | A,D,N,R,P | - | no | RoleProtectedRoute+routeGuard | orphan (no navigation entry) |
| /testing | TestingDashboardPage | A | - / flag:testing_dashboard | no | +FeatureFlagRoute | orphan |
| `*` | NotFound | any | - | - | none | basic 404 page using a full-reload `<a href="/">` |

### (c) Mock and placeholder sweep

These counts cover non-test source under `src/**/*.ts(x)`, excluding `test`, `__tests__`, `mocks`, and `e2e` paths.

| Pattern | Hits | Files | Notes |
|---|---|---|---|
| `Math.random` | 136 | 54 | Most are ID or jitter generation. About 70 drive **data**: `testDataSeeder.ts` (seeding), `InsuranceVerificationCard.tsx:56-61` (dead), `useScheduling.ts:385-390` insurance verify (no callers), `MultiResourceScheduler.tsx:87-95` (dead), `LabAutomationPanel.tsx:73-95` (live, lab), `predictiveAnalyticsService.ts` (dead), `wardManagementService.ts` (dead), `usePerformanceMonitoring.ts:165-166` (live: PerformanceDashboard). Security-relevant: `src/lib/hooks/auth/useTwoFactorAuth.ts:23` generates a TOTP secret with `Math.random`, and `adminUserManagementService.ts:302` generates passwords with it (handed to the security auditor) |
| `setTimeout(` | 92 | 68 | Simulated API latency: `QueueOptimizer.tsx:56,63,127` (live), `WorkflowOrchestrationPanel.tsx:117,130` (live), `InsuranceVerificationCard.tsx:52` (dead), `usePerformanceMonitoring.ts:161` |
| `mock` / `Mock` | 322 | 62 | Live and user-visible: `CheckInKiosk.tsx:58`, `PharmacyQueuePage.tsx:21`, `MonitoringDashboard.tsx:75,146`, `WorkflowOrchestrationPanel.tsx:86`, `paymentService.ts:1-33` (mock Stripe), `insurance-integration` edge function `:141,169` |
| `TODO` / `FIXME` | 9 / 4 | 3 / 2 | Live: `AppointmentCalendarView.tsx:48,57,66` (reschedule, cancel, and edit only log) |
| "coming soon" | 3 | 3 | `PatientProfilePage.tsx:288` (document upload), `RecordVitalsModal.tsx:759`, landing `VideoModal.tsx:37` |
| "not implemented" | 0 | 0 | |
| Empty `onClick={() => {}}` | 0 | 0 | But `UserProfilePage.tsx:190` has a "Change Password" `<Button>` with no `onClick` |
| `console.log(` | 94 | 34 | Live handler that only logs: `AppointmentCalendarView.tsx:115` (drag-drop reschedule) |
| Hardcoded stats or arrays rendered as real | not counted | n/a | `StaffPerformanceMetrics.tsx:38-58`, `DoctorDashboard.tsx(pages):24-37`, `WorkflowDashboard.tsx:806`, `MonitoringDashboard.tsx:76-84,148-159` |
| Data-layer references with no backing object | n/a | n/a | 49 tables referenced by `.from()` are absent from migrations (most in dead code; live: `staff` in `useActivityLogsPaginated.ts:222`). 14 RPCs are missing (live in scope: `get_workflow_metrics`, `get_workflow_performance_metrics`, `get_role_performance_stats`). 17 invoked edge functions are missing (all from dead billing, payment, or telehealth code) |

The most user-visible instances are: Kiosk (sidebar); Admin Dashboard Performance tab, Testing tab, and Workflows tab; System Monitoring; Receptionist dashboard Queue Optimizer and Calendar actions; Pharmacist `/pharmacy/queue` redirect target; Integration dashboard "Response Rate 85%".

### (d) Error handling, loading, empty states, validation, double submit

- **Toasts on failure:** present in nearly every mutation hook (`useBilling`, `useAppointments`, `useDoctorAvailability`, `useSuppliers`, `useDocumentUpload`). There are silent-failure exceptions:
  - `useRecordPayment` ignores the invoice `update` error (`useBilling.ts:385-391`).
  - `useUnbilledCharges` swallows all errors (`:64-66,96-98,128-130,166-168`).
  - Insurance submission returns `null` on failure but still shows "Claim submitted" (`useInsuranceClaims.ts:72-75,239`).
  - `testDataSeeder.cleanup()` never checks the Supabase `error` results (`testDataSeeder.ts:382-389`).
- **Loading and empty states:** present on the main pages (`AppointmentsPage`, `BillingPage`, `PatientLabResultsPage`, `NotificationsPage`). Failing RPCs render "--" in workflow metrics.
- **Double-submit protection:** present on Signup, Login, Invoice create (`CreateInvoiceModal.tsx:544`), Payment (`EnhancedPaymentModal.tsx:330`), Registration (`PatientRegistrationModal.tsx:701`), and Check-in. Missing on `AppointmentsPage` Cancel and No Show (`AppointmentsPage.tsx:512-528`), which also have no confirmation. Nothing is idempotent server-side (no idempotency keys on payments or invoices).
- **Optimistic updates:** only the generic `src/hooks/useOptimisticMutation.ts`, which has rollback. No unsafe optimistic updates were found.
- **Zod schemas in `src/lib/schemas`:** all 4 (`formValidation`, `labOrderSchema`, `patientRegistrationSchema`, `prescriptionSchema`) are imported **only by dead components** (`PatientRegistrationModal.STANDARDIZED.tsx`, `EnhancedPatientRegistrationForm.tsx`, `EnhancedLabOrderForm.tsx`, `EnhancedPrescriptionForm.tsx`). Live forms use weaker inline schemas (FUNC-27).
- **Lazy loading and errors:** an `ErrorBoundary` keyed by pathname wraps `Suspense` (`App.tsx:111-124`) and offers a reload. This works.
- **Existing tests give false confidence:**
  - `src/test/integration/signup-flow.test.tsx:24` mocks `AuthContext`, so FUNC-03 is invisible to it.
  - `tests/integration/smartSchedulerBooking.test.ts:35-37` tests an in-file fake `SlotService`, not `SmartScheduler`.
  - `tests/unit/feature1-recurrence.test.ts` passes but covers none of the FUNC-23 edge cases.
  - `tests/unit/audit-log-viewer.test.tsx` covers only CSV utilities, not page render.

---

### Findings

### FUNC-01: Patient self-registration always fails: `register_patient` RPC targets schema that does not exist
> **Consolidation note:** this finding duplicates **DB-15** and is kept for its evidence. The register counts it once, under DB-15.

- Severity: P1
- Category: Functional
- Status: CONFIRMED (static, against migrations and generated types)
- Module: Patient portal / onboarding
- Location: src/pages/patient/PatientRegisterPage.tsx:148,198-221; supabase/migrations/20260224000001_register_patient_atomic.sql:36,42,56,68; supabase/migrations/20260204000011_misc.sql:48-55,58-63
- Evidence:
  ```
  -- register_patient_atomic.sql
  36:  SELECT id INTO v_role_id FROM roles WHERE name = 'patient' LIMIT 1;
  42:  INSERT INTO user_roles (user_id, role_id)
  56:  JOIN profiles pr ON pr.id = p.profile_id
  -- misc.sql (actual schema)
  51:  role app_role NOT NULL,          -- user_roles has no role_id
  62:  mrn TEXT NOT NULL,               -- patients: user_id (not profile_id), hospital_id NOT NULL
  ```
  No `CREATE TABLE … roles` exists in any migration. `types.ts` has no `roles` table, no `register_patient`, and no `patients.profile_id`.
- Actual behavior / Expected behavior: Actual: `supabase.auth.signUp` succeeds first (line 148), then `rpc('register_patient')` raises `relation "roles" does not exist`. The user sees "Registration Failed", but an auth account remains with no `patient` role, no `patients` row, and no MRN. Because the email is now taken, retrying fails. `PatientLoginPage` requires a `patient` role, so the person can never log in. Expected: atomic creation of the role and the patient record, using `user_roles(role)` and `patients(user_id, hospital_id, mrn)`.
- Reproduction: Open `/patient-register`, complete all 4 steps, and submit. Observe the RPC error and the orphaned `auth.users` row.
- Root cause: The RPC was written against a different schema (`roles` lookup table, `role_id`, `profile_id`). It also omits NOT NULL `mrn` and allows a NULL `hospital_id` when no hospital code is given.
- Impact: The Patient Portal Access self-onboarding path in CONTEXT.md is entirely unavailable. Each attempt leaves an orphaned auth account (and a profile row from the signup trigger).
- Recommendation: Rewrite `register_patient` to insert `user_roles(user_id, role, hospital_id)` with `'patient'`, insert `patients(user_id, hospital_id, mrn = generate_mrn(hospital_id), …)`, and require a resolved hospital (reject when the hospital code is missing or invalid). Move `signUp` and the RPC into one edge function, or delete the auth user on failure as `accept-invitation-signup` does. Add a DB-level integration test.
- Effort: M
- Acceptance criteria: A new patient registered with a valid hospital code can log in at `/patient-login` and sees `/patient/portal`. A failed registration leaves no `auth.users` row. The RPC exists in `types.ts`.

### FUNC-02: Login 2FA verification is not enforced: the session is fully usable before the TOTP check, and PublicRoute redirects past the modal
> **Consolidation note:** this finding duplicates **SECF-02** and is kept for its evidence. The register counts it once, under SECF-02.

- Severity: P1
- Category: Security
- Status: LIKELY (deterministic bypass by direct navigation; the redirect race needs runtime confirmation)
- Module: Onboarding / authentication
- Location: src/pages/hospital/LoginPage.tsx:81,99-114,128-136; src/routes/routeDefinitions.tsx:210-216,317-324,92-176; src/contexts/AuthContext.tsx:450-455,805-812,937
- Evidence:
  ```
  LoginPage.tsx:81   const { error } = await login(data.email, data.password);   // signInWithPassword -> full session
  LoginPage.tsx:110  const requires2FA = await checkTwoFactorRequired(user.id);
  LoginPage.tsx:113  setShowTwoFactorModal(true);
  routeDefinitions.tsx:212  if (isAuthenticated) { return <Navigate to={... '/dashboard'} replace />;
  AuthContext.tsx:937       isAuthenticated: !!session,
  ```
  `src/` has no AAL or `aal2` check and no "2FA verified" flag (grep `getAuthenticatorAssuranceLevel|aal2|twoFactorVerified` returns nothing).
- Actual behavior / Expected behavior: Actual: once the password is accepted, `onAuthStateChange` sets `session`, so `isAuthenticated` becomes true. `PublicRoute` around `LoginPage` then redirects to `/dashboard` and unmounts the page, so the TOTP modal never appears or disappears. `ProtectedRoute` checks only `pendingTwoFactor` (2FA *enrolled*?), not whether the code was *verified* in this session. Even if the modal renders, typing `/dashboard` bypasses it. Expected: PHI routes are inaccessible until TOTP verification succeeds in the current session.
- Reproduction: Enable 2FA for an admin. Log out, log in with email and password, and observe the redirect to `/dashboard` without a code (or navigate there manually while the modal is open).
- Root cause: 2FA is a custom edge-function check (`verify-totp`) run after a full password session exists, with no session-bound state checked by route guards. `PublicRoute` treats any session as fully authenticated.
- Impact: 2FA, which is mandatory for admin and doctor per `MandatoryTwoFactorSetupPage`, provides no protection at login. A stolen password gives full PHI access.
- Recommendation: Use Supabase MFA (`auth.mfa.enroll/challenge/verify`) and gate `ProtectedRoute` and RLS on `aal2` for privileged roles. Alternatively, persist a server-validated "mfa_verified" claim (edge function issues it; RLS or the guard checks it). Exempt the login page from the `PublicRoute` redirect while `pendingMfa`.
- Effort: M
- Acceptance criteria: With 2FA enabled, after the password step any protected route redirects to the TOTP step until verification succeeds. RLS denies PHI reads for a session at `aal1`.

### FUNC-03: Hospital signup cannot create the hospital: stale `createHospitalAndProfile` closure returns "Not authenticated"
- Severity: P1
- Category: Functional
- Status: LIKELY
- Module: Onboarding (hospital signup)
- Location: src/pages/hospital/SignupPage.tsx:109,189,200-216,223; src/contexts/AuthContext.tsx:727-787 (754-755); src/routes/routeDefinitions.tsx:325-332
- Evidence:
  ```
  SignupPage.tsx:109  const { signup, createHospitalAndProfile } = useAuth();
  SignupPage.tsx:200  const { error: hospitalError } = await createHospitalAndProfile({ ... });
  SignupPage.tsx:213  description: 'Account created but hospital setup failed. Please contact support.',
  AuthContext.tsx:754 const effectiveUserId = user?.id ?? session?.user?.id;
  AuthContext.tsx:755 if (!effectiveUserId) return { error: new Error('Not authenticated') };
  ```
- Actual behavior / Expected behavior: Actual: `handleSubmit` captures the `createHospitalAndProfile` from the render where `user` and `session` were `null`. After `signup()` resolves, that closure still sees `null`, so it returns "Not authenticated" and shows "Setup Failed … contact support". With email confirmation disabled, `PublicRoute` has usually already unmounted the page and redirected to `/dashboard`, which then sends the user to `/hospital/account-setup`, where they must re-enter all hospital data. With confirmation enabled there is no session at all. The success path to `/hospital/role-setup` (line 223) is unreachable outside E2E mock mode. Expected: the hospital is created in the same submit, and the user lands on 2FA enrolment and then role setup.
- Reproduction: With real Supabase (`VITE_E2E_MOCK_AUTH` unset), sign up a new hospital and observe the "Setup Failed" toast and the redirect to account setup. `src/test/integration/signup-flow.test.tsx:24` mocks `AuthContext`, so it cannot catch this.
- Root cause: The function reads React state from a stale closure instead of the `userId` returned by `signup()` (which already returns `{ userId }`). Placing the signup form under `PublicRoute` adds an unmount race.
- Impact: Every real hospital signup starts with a misleading error and lost input. The onboarding funnel depends on undocumented recovery behaviour.
- Recommendation: Make `createHospitalAndProfile` take an explicit `userId` (or call `supabase.auth.getUser()` inside it). Pass `signup()`'s `userId` from `SignupPage`. Do one server-side call (`create-hospital-admin`) that performs signup and hospital creation together. Exempt `/hospital/signup` from the `PublicRoute` redirect while a submit is in flight.
- Effort: S
- Acceptance criteria: A real-mode signup creates `hospitals`, `profiles.hospital_id`, and `user_roles(admin)` in one submit, with no error toast. An integration test without a mocked `AuthContext` covers this.

### FUNC-04: Staff Management lists no staff for anyone onboarded through the app (`profiles.is_staff` is never set)
- Severity: P1
- Category: Functional
- Status: LIKELY (static; seeded environments mask it)
- Module: Admin / staff management
- Location: src/pages/settings/StaffManagementPage.tsx:125-129; supabase/migrations/20260205000001_accept_staff_invitation.sql:29-36; supabase/migrations/20260205000002_hospital_admin_role.sql:50-53; supabase/migrations/20260204000011_misc.sql:1840-1841; supabase/migrations/20260222000001_fix_dashboard_stats_rpc.sql:63
- Evidence:
  ```
  StaffManagementPage.tsx:126  .select('id, user_id, first_name, ...')
  StaffManagementPage.tsx:129  .eq('is_staff', true);
  misc.sql:1841  ADD COLUMN IF NOT EXISTS is_staff boolean DEFAULT false;
  accept_staff_invitation.sql:29  INSERT INTO public.profiles (user_id, first_name, last_name, email, hospital_id)   -- no is_staff
  ```
  The only writer of `is_staff: true` is `scripts/seed-test-data.mjs:197`.
- Actual behavior / Expected behavior: Actual: the hospital admin (created by `create_hospital_with_admin`) and every invited staff member (created by `accept_staff_invitation`) have `is_staff = false`. The Staff list shows empty, so Edit and Deactivate are unreachable. The dashboard-stats RPC "activeStaff" also counts 0. Expected: every user with a non-patient role appears in the staff list.
- Reproduction: Sign up a hospital, invite a nurse, and accept the invite. `/settings/staff` shows the invitation as accepted but the staff list is empty.
- Root cause: `is_staff` was added later, but neither SECURITY DEFINER onboarding function nor any trigger sets it.
- Impact: Admins cannot manage, edit roles of, or deactivate staff. Staff KPIs read zero.
- Recommendation: Set `is_staff = true` in `create_hospital_with_admin` and `accept_staff_invitation`. Backfill `UPDATE profiles SET is_staff = true WHERE user_id IN (SELECT user_id FROM user_roles WHERE role <> 'patient')`. Alternatively, derive staff membership from `user_roles` in the query.
- Effort: S
- Acceptance criteria: After accepting an invitation, the user appears in `/settings/staff` with the correct role, and the admin appears as well.

### FUNC-05: Invoice modal shows discount and 5% GST, but the saved invoice has `tax = 0` and `discount = 0`
- Severity: P1
- Category: Functional
- Status: CONFIRMED
- Module: Billing (Front-Desk Billing)
- Location: src/components/billing/CreateInvoiceModal.tsx:54,119-127,179-191,486-501; src/hooks/useBilling.ts:272-275
- Evidence:
  ```
  CreateInvoiceModal.tsx:124  const TAX_RATE = 0.05; // 5% GST
  CreateInvoiceModal.tsx:127  const total = subtotal - discountAmount + taxAmount;      // shown as "Total Due"
  CreateInvoiceModal.tsx:180  createInvoice.mutate({ patientId, items: ..., notes, dueDate }   // no discount / tax
  useBilling.ts:273  const tax = 0;
  useBilling.ts:274  const discount = 0;
  ```
- Actual behavior / Expected behavior: Actual: the receptionist sees, for example, subtotal ₹1,000, discount 10%, GST ₹45, Total Due ₹945. The persisted `invoices.total` is ₹1,000 with `tax = 0` and `discount = 0`. The patient is charged a different amount from the one quoted, and GST is never recorded. Expected: the server persists the same subtotal, discount, tax, and total that the UI showed (discount applied before tax, rounded to 2 dp).
- Reproduction: Create an invoice with a 10% discount. Compare the modal's Total Due with the `invoices.total` and `tax` columns, the BillingPage list, and the receipt.
- Root cause: The mutation API has no tax or discount parameters, and the totals are recomputed client-side with constants.
- Impact: Revenue and GST misstatement, patient disputes, and tax-compliance exposure. Every invoice with a discount is overcharged, and every invoice is under-taxed.
- Recommendation: Pass `discountPercent` (or amount) to `useCreateInvoice`. Compute totals server-side in an RPC using integer paise and banker's or half-up rounding. Make the tax rate configurable per hospital (`hospitals.settings`) and per item (GST exemptions for healthcare services). Return the canonical totals and display them.
- Effort: M
- Acceptance criteria: For any items, discount, and tax input, `invoices.total` equals the total displayed before submit, and `tax` and `discount` are persisted. Unit and integration tests cover rounding at 0.005 boundaries.

### FUNC-06: Payment recording under-records multi-cash tenders, can leave fully paid invoices "partial", and is non-atomic and race-prone
- Severity: P1
- Category: Functional
- Status: CONFIRMED (executed the repository's `calculateSplitPaymentSummary` together with the modal's per-tender formula)
- Module: Billing / payments
- Location: src/components/billing/EnhancedPaymentModal.tsx:115-147; src/hooks/useBilling.ts:358-391; src/lib/clinical/billingCycleRules.ts:347-387; src/components/billing/InvoiceAdjustmentModal.tsx:121-138
- Evidence:
  ```
  EnhancedPaymentModal.tsx:119  tender.method === 'cash' && summary.changeDue > 0
  EnhancedPaymentModal.tsx:120    ? Math.max(0.01, tender.amount - summary.changeDue)   // change subtracted from EVERY cash tender
  useBilling.ts:382  const newPaidAmount = (invoice.paid_amount || 0) + amount;
  useBilling.ts:383  const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'partial';
  $ node pay.cjs
  two cash tenders 60+60 on balance 100 -> changeDue 20 recorded 80 isFullySettled true
  total 300.3 paid 100.1 + 200.2 = 300.29999999999995 -> status partial
  ```
- Actual behavior / Expected behavior: Actual:
  - (1) With two or more cash tenders, the change is deducted from each cash tender. ₹100 paid as 60 + 60 records only ₹80, and the invoice stays "partial" with ₹20 phantom outstanding.
  - (2) JS float accumulation (`100.1 + 200.2`) leaves `status = 'partial'` while the stored `paid_amount` (numeric(10,2)) equals the total.
  - (3) `paid_amount` is a read-modify-write across two requests. Concurrent payments (two terminals, or a retry from `withBillingRateLimit`) lose updates.
  - (4) The invoice `update` error is ignored, so a payment row can exist without the invoice moving.
  - (5) A mid-loop failure over tenders leaves some tenders recorded and shows "Payment failed", inviting a double charge on retry. There is no idempotency key.
  - (6) Refunds (`InvoiceAdjustmentModal.tsx:121-138`) decrement `paid_amount` without inserting a negative `payments` row, so the ledger and the invoice diverge.

  Expected: a single server-side, transactional "apply payment(s)" with integer minor units, change computed once, idempotency, and a ledger-derived `paid_amount`.
- Reproduction: Open an invoice with a ₹100 balance, add two Cash tenders of ₹60, and process. The invoice shows ₹80 paid and status Partial.
- Root cause: Client-side money math in floats, per-tender change application, and no DB function, trigger, or constraint deriving `paid_amount` from `payments`.
- Impact: Incorrect balances and receipts, patients chased for paid amounts, cash-drawer reconciliation mismatches, and possible double charges.
- Recommendation: Create an RPC `record_payments(invoice_id, tenders[], idempotency_key)` that locks the invoice row (`FOR UPDATE`), inserts payments, recomputes `paid_amount = SUM(payments.amount)` and status with numeric comparison, and rejects overpayment of non-cash tenders. Apply change only to the cash total once. Record refunds as negative payments.
- Effort: M
- Acceptance criteria: 60 + 60 cash on ₹100 records ₹100 with change ₹20. ₹100.10 + ₹200.20 on ₹300.30 yields `paid`. Two concurrent ₹50 payments on ₹100 yield `paid_amount = 100`. Replaying the same idempotency key creates no new rows.

### FUNC-07: Invoice numbers are not guaranteed unique, and invoice creation is non-atomic
- Severity: P2
- Category: Database
- Status: CONFIRMED (static)
- Module: Billing
- Location: supabase/migrations/20260204000011_misc.sql:874-889 (active definition), :766-784 (table without a UNIQUE constraint); supabase/migrations/20260204000003_billing.sql:10-27 (earlier format); src/hooks/useBilling.ts:263-310
- Evidence:
  ```
  misc.sql:884  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  misc.sql:887  invoice_num := 'INV-' || LPAD(next_number::TEXT, 6, '0');
  misc.sql:772  invoice_number text NOT NULL,          -- no UNIQUE (hospital_id, invoice_number)
  billing.sql:25 invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(...)
  ```
- Actual behavior / Expected behavior: Actual: two receptionists creating invoices concurrently get the same `MAX + 1` and both inserts succeed, producing duplicate invoice numbers. If any invoice carries the earlier `INV-YYYYMMDD-NNNN` format (from the billing.sql definition), `CAST('20260101-0001' AS INTEGER)` throws and all invoice creation fails for that hospital. The header and the items are separate inserts (`useBilling.ts:278,309`), so an items failure leaves an empty invoice. Expected: gap-tolerant but unique numbering from a per-hospital sequence or counter row, enforced by a UNIQUE constraint, with header and items in one transaction.
- Reproduction: Static: two concurrent `generate_invoice_number` calls return the same value. No constraint rejects the second insert.
- Root cause: A MAX-based generator without locking, two conflicting definitions, and no constraint.
- Impact: Duplicate invoice numbers break audit trails, GST invoice-series compliance, and payment matching.
- Recommendation: Add `UNIQUE (hospital_id, invoice_number)` and a `hospital_invoice_counters` row updated with `UPDATE … RETURNING`. Move invoice and item creation into one RPC.
- Effort: S
- Acceptance criteria: 50 parallel invoice creations produce 50 distinct numbers, and the DB rejects any duplicate insert.

### FUNC-08: "Unbilled clinical charges" re-imports already-billed items (and non-dispensed prescriptions), auto-selected
- Severity: P1
- Category: Functional
- Status: LIKELY
- Module: Billing (charge capture)
- Location: src/hooks/useUnbilledCharges.ts:38-45,70-77,103-110; src/components/billing/CreateInvoiceModal.tsx:108-115,143-176; src/lib/clinical/billingCycleRules.ts:266
- Evidence:
  ```
  useUnbilledCharges.ts:44   .eq('status', 'completed')          // labs: no "billed" filter
  useUnbilledCharges.ts:72   .from('prescriptions') ... .eq('patient_id', patientId)   // ANY status
  CreateInvoiceModal.tsx:111 setSelectedUnbilledIds(unbilledCharges.map((c) => c.id));   // auto-select all
  ```
- Actual behavior / Expected behavior: Actual: the "unbilled" list is simply the latest 10 completed labs, 10 prescriptions of any status (including rejected or cancelled), and 5 completed consultations. Nothing records that a charge was invoiced: invoice items carry no `source_id`, and no `billed_at` exists. Every new invoice for the patient pre-selects the same charges again. Prices come from a hardcoded tariff table, not hospital-configured rates. Expected: a charge-capture ledger with source linkage, status `unbilled` to `billed`, and only dispensed medications billable.
- Reproduction: Complete a lab, invoice it via Import, then open Create Invoice again for the same patient. The same lab is proposed and selected.
- Root cause: No persistent charge entity or billed marker. This is a UI-only heuristic.
- Impact: Systematic double billing and billing for undispensed medication. This puts revenue integrity and patient trust at risk.
- Recommendation: Introduce `charges(source_type, source_id, invoice_item_id, status)` and create a charge on lab completion, dispense, or consultation completion. Link `invoice_items.charge_id` and mark charges billed in the invoice RPC (FUNC-07). Filter prescriptions to `dispensed`. Load tariffs from a per-hospital price list.
- Effort: L
- Acceptance criteria: After a charge is invoiced, it never appears again as unbilled. Rejected or undispensed prescriptions never appear.

### FUNC-09: Insurance claim "submission" and "status" are simulated, and the edge function writes columns that do not exist
- Severity: P2
- Category: Functional
- Status: LIKELY
- Module: Billing / insurance claims
- Location: src/hooks/useInsuranceClaims.ts:53-75,202-240,250-270; supabase/functions/insurance-integration/index.ts:100-152,155-189
- Evidence:
  ```
  index.ts:122  .from('insurance_claims').insert({ id: claimId, ... provider_name, service_codes, total_amount, service_date, edi_data ...
  index.ts:141  // Mock submission to insurance - in production, send to actual clearinghouse
  index.ts:169  // Mock status check - in production, query insurance API
  index.ts:175  approved_amount: claim.total_amount * 0.8, // 80% coverage
  ```
  The `insurance_claims` columns in `types.ts` are `claim_amount`, `insurance_provider`, `procedure_codes`, and so on. There is no `total_amount`, `provider_name`, `service_codes`, `edi_data`, or `processed_date`.
- Actual behavior / Expected behavior: Actual: the client marks the claim `submitted`, then the edge function tries to insert a **second** claim row with non-existent columns. The insert fails, the edge function returns 500, and the client swallows it and shows "Claim submitted". "Refresh status" fabricates `status = 'processed'` with `approved_amount = NaN → null`. No clearinghouse or EDI 837 is sent (`src/lib/edi837.builder.ts` is unused). Expected: either a real clearinghouse integration, or the UI clearly labels claims as internal-tracking only and never fabricates adjudication.
- Reproduction: Submit a claim and inspect the edge function logs (insert error). Refresh status: the claim becomes "processed".
- Root cause: The edge function was written against a different schema and left as a mock.
- Impact: Staff believe claims were filed and adjudicated, receivables are misreported, and claims may never reach payers.
- Recommendation: Remove the fabricated status path. Pass `claim_id` to the edge function and update the existing row. Align column names. Integrate a real clearinghouse (or NHCX in India) behind a feature flag. Surface failures to the user.
- Effort: L
- Acceptance criteria: Submitting a claim never creates a second row. Failures show an error. Status changes only from a real payer response or a manual entry.

### FUNC-10: Production admin dashboard exposes "Test Data" seed and cleanup; cleanup deletes real hospital data by `hospital_id`
> **Lead severity adjustment:** raised to **P0**. One click in the production admin UI deletes every patient, appointment, invoice, payment, profile and role row for the hospital, with no confirmation dialog and no DEV-only gating (verified at src/components/admin/TestDataSeederCard.tsx:58-66 and src/utils/testDataSeeder.ts:376-389). Irreversible PHI and financial data loss outweighs the RLS uncertainty.

- Severity: P1
- Category: Functional
- Status: LIKELY (blast radius depends on deployed RLS and FK; per migrations, `appointments` and `patient_queue` are deletable by any hospital staff)
- Module: Admin dashboard
- Location: src/components/dashboard/AdminDashboard.tsx:111,146-149; src/components/admin/TestDataSeederCard.tsx:31-37,61-66,125,138; src/utils/testDataSeeder.ts:376-389; supabase/migrations/20260204000011_misc.sql:316-318,365-367
- Evidence:
  ```
  TestDataSeederCard.tsx:138  <p><strong>Cleanup:</strong> Removes all test data while preserving real data</p>
  testDataSeeder.ts:385  await supabase.from('patient_queue').delete().eq('hospital_id', this.hospitalId);
  testDataSeeder.ts:386  await supabase.from('appointments').delete().eq('hospital_id', this.hospitalId);
  testDataSeeder.ts:389  await supabase.from('patients').delete().eq('hospital_id', this.hospitalId);
  misc.sql:316  CREATE POLICY "Staff can manage appointments" ON public.appointments FOR ALL USING (user_belongs_to_hospital(...))
  ```
- Actual behavior / Expected behavior: Actual: the Admin Dashboard's always-visible "Testing" tab (no DEV or flag gate) offers "Seed" (inserts 50 fake patients, 12 staff, and 25 appointments into the real hospital) and "Cleanup Data". Cleanup has no confirmation. It deletes **all** rows for the hospital in `activity_logs`, `payments`, `invoices`, `patient_queue`, `appointments`, `user_roles`, `profiles`, and `patients`, not just seeded rows. RLS blocks some tables (activity_logs is immutable), but the live Patient Queue and unreferenced appointments are deletable. Errors are not checked, so it reports "All test data has been removed". Expected: test tooling absent from production builds, and seeded data tagged and deleted by tag.
- Reproduction: Static: Admin → Dashboard → Testing → Cleanup Data issues a `DELETE … WHERE hospital_id = X` on each table.
- Root cause: Developer tooling shipped in the production component tree. Cleanup is scoped by hospital, not by a seed marker.
- Impact: One mis-click by an admin can wipe the day's appointment book and the live patient queue. Seeding pollutes production PHI tables with fake patients.
- Recommendation: Render `TestDataSeederCard` only when `import.meta.env.DEV` or behind the `testing_dashboard` flag, and also block it server-side. Tag seeded rows (`is_test_data` or `seed_batch_id`) and delete only those through an admin-only RPC. Add a typed confirmation.
- Effort: S
- Acceptance criteria: A production build contains no seed or cleanup UI. In dev, cleanup removes only rows with the seed marker.

### FUNC-11: Kiosk self check-in is a mock (3 hardcoded patients; nothing persisted)
- Severity: P1
- Category: Functional
- Status: CONFIRMED
- Module: Receptionist / check-in
- Location: src/components/receptionist/CheckInKiosk.tsx:58-83,85-91,98-104; src/pages/receptionist/KioskPage.tsx:11-23; src/config/routeManifest.ts:391-398
- Evidence:
  ```
  CheckInKiosk.tsx:57  // Mock patient data
  CheckInKiosk.tsx:58  const mockPatients: Patient[] = [ { id: "1", firstName: "John", lastName: "Smith", ... mrn: "MRN001234" },
  CheckInKiosk.tsx:98  const handleConfirm = () => { setCurrentStep("complete"); if (selectedPatient) { onCheckIn(selectedPatient.id) }
  KioskPage.tsx:13     toast({ title: 'Patient checked in', description: `Kiosk flow completed for patient ${patientId}.` });
  ```
- Actual behavior / Expected behavior: Actual: the sidebar "Kiosk" (admin and receptionist) searches only John Smith, Sarah Johnson, and Michael Brown. "Check-in" shows a success toast but creates no `patient_queue` entry and does not update the appointment. Expected: real patient lookup with identity verification (DOB plus MRN or phone) and `useUnifiedCheckIn`.
- Reproduction: Open `/kiosk`, search for a real patient (no results), select "John Smith", and confirm. The success toast appears and `/queue` is unchanged.
- Root cause: Prototype UI wired into a routed page.
- Impact: Front-desk staff or patients believe check-in happened, but the patient never enters the Patient Queue.
- Recommendation: Replace `mockPatients` with `useSearchPatients` and wire `onCheckIn` to `useUnifiedCheckIn`. Until then, remove the route and sidebar item.
- Effort: M
- Acceptance criteria: A kiosk check-in of a real patient creates a `patient_queue` row with status `waiting`. No hardcoded patients remain in the bundle.

### FUNC-12: Double booking is possible: no doctor-time conflict check, and time slots are never marked booked
- Severity: P1
- Category: Functional
- Status: CONFIRMED (static; no client or DB code sets `is_booked`)
- Module: Appointments / scheduling
- Location: src/components/appointments/ScheduleAppointmentModal.tsx:95-97,179-191; src/lib/hooks/appointments/useAppointments.ts:201-214; src/components/receptionist/SmartScheduler.tsx:27,44-60; src/lib/hooks/appointments/useDoctorAvailability.ts:214-221,266-268; supabase/migrations/20260204000011_misc.sql:1438-1449
- Evidence:
  ```
  ScheduleAppointmentModal.tsx:95  const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) => ["00","30"].map(...)).flat();
  useAppointments.ts:203           .from('appointments').insert({ ...appointmentData, hospital_id, created_by })   // no overlap check
  SmartScheduler.tsx:47            await createAppointment.mutateAsync({ ..., scheduled_time: selectedRawSlot.time, ... })  // slot left is_booked=false
  ```
  `grep -rn "is_booked: true" src supabase` and `grep is_booked supabase/migrations` (other than the column DDL) both return nothing. `time_slots` has no UNIQUE on `(doctor_id, slot_date, start_time)`, and `appointments` has no exclusion constraint.
- Actual behavior / Expected behavior: Actual:
  - The staff modal allows any half-hour from 00:00 to 23:30 (including past times today) regardless of doctor availability or existing appointments.
  - The Smart Scheduler books from `time_slots` but never flips `is_booked`, so the same slot stays offered and can be booked again.
  - Regenerating slots deletes only unbooked rows and re-inserts all of them, creating duplicates at booked times.

  Expected: booking claims a slot atomically (`UPDATE time_slots SET is_booked = true … WHERE is_booked = false RETURNING`), and a DB constraint prevents overlapping appointments per doctor.
- Reproduction: Book the same doctor at 10:00 for two patients via `/appointments` (both succeed). Book the same slot twice in `/receptionist/smart-scheduler`.
- Root cause: Availability, slots, and appointments are three disconnected models. There is no server-side booking transaction.
- Impact: Overbooked clinics, long waits, and patient complaints. Slot availability shown to staff is wrong.
- Recommendation: Add a `book_appointment(slot_id, patient_id, …)` RPC with row locking that links `time_slots.appointment_id`. Add `EXCLUDE USING gist (doctor_id WITH =, tstzrange(start, end) WITH &&) WHERE status NOT IN ('cancelled','no_show')`. Drive the modal's time picker from `useTimeSlots`. Release the slot on cancel or no-show.
- Effort: M
- Acceptance criteria: A second booking for an overlapping doctor time is rejected with a clear message. A booked slot disappears from the Smart Scheduler. Cancelling frees the slot.

### FUNC-13: Patient appointment requests: "Approve" never creates an appointment, and "Auto-approve" queries non-existent columns
- Severity: P1
- Category: Functional
- Status: LIKELY
- Module: Patient portal / receptionist
- Location: src/lib/hooks/appointments/useAppointmentRequests.ts:194-204,240-253,261-279; src/components/dashboard/ReceptionistDashboard.tsx:80-96,246; supabase/migrations/20260204000011_misc.sql:1309
- Evidence:
  ```
  useAppointmentRequests.ts:196  .from('appointment_requests').update({ status, reviewed_by, reviewed_at: ..., updated_at: ... })
  misc.sql:1309  created_appointment_id UUID REFERENCES public.appointments(id),     -- never written anywhere in src
  useAppointmentRequests.ts:247  insurance_status,
  useAppointmentRequests.ts:248  last_visit,                                       -- not columns of patients (types.ts)
  ```
- Actual behavior / Expected behavior: Actual: approving a request only flips its status. No `appointments` row is created, so the patient sees "approved" while nothing exists on the schedule. "Auto-approve" selects `patients.insurance_status` and `last_visit`, which do not exist. PostgREST errors and nothing happens (if the columns were tolerated, every request would be **rejected** as ineligible). Expected: approval creates the appointment (with slot claim, see FUNC-12), stores `created_appointment_id`, and notifies the patient.
- Reproduction: As a patient, request an appointment. As a receptionist, approve it. `/appointments` has no entry, and the patient's Appointments tab has none either.
- Root cause: Only half the workflow was implemented, and the auto-approval rules reference fields that were never added.
- Impact: Portal booking silently fails end to end, causing missed visits and front-desk confusion.
- Recommendation: Implement an `approve_appointment_request(request_id, slot)` RPC that creates the appointment and links it. Remove or fix the auto-approval rules using real fields (for example, the last completed appointment date). Never auto-reject without review.
- Effort: M
- Acceptance criteria: Approving a request yields exactly one appointment visible to the patient and staff, and `created_appointment_id` is set.

### FUNC-14: Slot generation uses the wrong weekday in timezones west of UTC (`new Date('YYYY-MM-DD').getDay()`)
- Severity: P2
- Category: Functional
- Status: CONFIRMED (executed)
- Module: Scheduling (doctor availability)
- Location: src/lib/hooks/appointments/useDoctorAvailability.ts:197-206; src/pages/scheduling/SchedulingPage.tsx:137-139
- Evidence:
  ```
  useDoctorAvailability.ts:197  const targetDate = new Date(date);       // date = 'yyyy-MM-dd' -> parsed as UTC midnight
  useDoctorAvailability.ts:198  const dayOfWeek = targetDate.getDay();    // local weekday
  $ TZ=America/New_York node -e "new Date('2026-11-02').getDay()"  -> 0 (Sunday; 2026-11-02 is Monday)
  $ TZ=Asia/Kolkata ... -> 1
  ```
- Actual behavior / Expected behavior: Actual: for any browser at a negative UTC offset, slots for date D are generated from the availability of D−1's weekday, or the request fails with "No availability set for this day". IST (the ₹ default) is unaffected. Expected: weekday derived from the calendar date independent of browser TZ, ideally in the hospital's configured timezone.
- Reproduction: Set the OS timezone to America/New_York, give a doctor Monday availability only, and generate slots for a Monday. The error "No availability set for this day" appears.
- Root cause: Date-only ISO strings parse as UTC, while `getDay()` is local. There is also no hospital timezone model; the same gap exists in reminders (`supabase/functions/appointment-reminders/index.ts:48-50` uses the UTC "tomorrow").
- Impact: Incorrect or missing slots for non-IST deployments, and reminders sent for the wrong day near midnight.
- Recommendation: Use `parseISO(date)` from date-fns (local) or `getUTCDay()` consistently. Add `hospitals.timezone` and compute schedule dates and reminders in it (date-fns-tz).
- Effort: S
- Acceptance criteria: Slot generation for a Monday uses Monday availability in UTC−5, UTC, and UTC+5:30 (parameterised test with `TZ`).

### FUNC-15: No-show handling is inverted; cancel has no confirmation; reschedule is not implemented
- Severity: P2
- Category: Functional
- Status: CONFIRMED
- Module: Appointments (receptionist)
- Location: src/pages/appointments/AppointmentsPage.tsx:155-161,503-528,550-563; src/components/receptionist/AppointmentCalendarView.tsx:43-67,111-116,321-322
- Evidence:
  ```
  AppointmentsPage.tsx:503  {appointment.status === "scheduled" && ( ... Check In ... Cancel ... )}
  AppointmentsPage.tsx:522  {appointment.status === "checked_in" && ( <Button ... onClick={() => onMarkNoShow(appointment.id)}>No Show</Button>
  AppointmentCalendarView.tsx:48  // TODO: Implement reschedule functionality
  AppointmentCalendarView.tsx:115 console.log('Rescheduling appointment:', draggedAppointment.id, ...
  ```
- Actual behavior / Expected behavior: Actual: "No Show" is offered only **after** a patient is checked in, never for `scheduled` appointments whose patient did not arrive. Marking a checked-in patient as no-show leaves their `patient_queue` entry `waiting`. Cancel is one click with no reason and no confirmation, and does not release slots. The receptionist dashboard calendar's Reschedule and Cancel buttons and its drag-and-drop only log. No reschedule capability exists anywhere in the live UI. Expected: no-show on scheduled appointments past their start plus a grace period (optionally automatic), queue cleanup, a cancel reason and confirmation, and a reschedule action.
- Reproduction: On `/appointments`, a past `scheduled` appointment has only Check In and Cancel. On the dashboard calendar, click Reschedule and nothing happens.
- Root cause: The UI state machine is mis-specified, and the calendar actions are placeholders.
- Impact: No-show metrics are unreliable, phantom queue entries appear, slots stay unavailable, and staff must cancel and recreate appointments to reschedule.
- Recommendation: Show No Show for `scheduled` (and hide it for `checked_in` unless the queue entry is removed in the same transaction). Add a cancel dialog with reason. Implement reschedule through the booking RPC (FUNC-12). Remove the placeholder buttons until they are implemented.
- Effort: M
- Acceptance criteria: A scheduled appointment can be marked no-show. The patient never appears in the queue afterwards. Reschedule moves the appointment and frees the old slot.

### FUNC-16: Check-in is non-atomic (appointment marked `checked_in` before the queue insert) and uses a UTC "today" window
- Severity: P2
- Category: Functional
- Status: LIKELY
- Module: Receptionist / Patient Queue
- Location: src/lib/hooks/appointments/useAppointments.ts:369-427
- Evidence:
  ```
  useAppointments.ts:376  .from('appointments').update({ status: 'checked_in', check_in_time: ..., queue_number: queueNumber })
  useAppointments.ts:391  const today = new Date().toISOString().split('T')[0];
  useAppointments.ts:415  .from('patient_queue').insert({ ... status: 'waiting', ... });
  useAppointments.ts:427  if (queueInsertError) throw queueInsertError;
  ```
- Actual behavior / Expected behavior: Actual: if the queue insert fails (RLS, network, constraint), the appointment is already `checked_in` with a queue number. The UI then hides "Check In" (only "No Show" remains, see FUNC-15), so the patient can never be queued from this screen. A queue number is consumed before the duplicate check. The "already in today's queue" check uses the UTC date, so in IST before 05:30 it can reuse yesterday's open entry, and in the US after 19:00 it misses today's. Expected: a single RPC that updates the appointment and inserts the queue row in one transaction, idempotent per appointment.
- Reproduction: Simulate a `patient_queue` insert failure, for example by temporarily revoking insert.
- Root cause: Multi-step client orchestration with no transaction, and a local or UTC date mix-up.
- Impact: Patients are stranded "checked in" but invisible to triage nurses and doctors (Patient Queue).
- Recommendation: Create a `check_in_appointment(appointment_id)` SECURITY DEFINER RPC with `ON CONFLICT (appointment_id) DO NOTHING` on `patient_queue`, using the hospital timezone for "today".
- Effort: S
- Acceptance criteria: Every check-in either fully succeeds (appointment `checked_in` plus one queue row) or fully fails, and repeated clicks create a single queue row.

### FUNC-17: Admin `/settings/audit-logs` and `/settings/health` crash on render (`hasPermission` is not returned by `usePermissions`)
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static; `// @ts-nocheck` in all three files hides the type error)
- Module: Admin / audit, system health
- Location: src/pages/admin/AuditLogViewer.tsx:1,64-67; src/pages/admin/SystemHealthDashboard.tsx:1,66-71,76; src/hooks/usePermissions.ts:1,34-48; src/hooks/useActivityLogsPaginated.ts:220-224
- Evidence:
  ```
  AuditLogViewer.tsx:64        const { hasPermission } = usePermissions();
  AuditLogViewer.tsx:67        const hasAuditPermission = hasPermission('audit-logs');   // TypeError: hasPermission is not a function
  usePermissions.ts:34-48      return { can, canAny, canAll, canInAnyRole, canInPrimaryRole, permissions, ... }   // no hasPermission
  SystemHealthDashboard.tsx:76 const response = await fetch('/functions/v1/health-check', {   // relative to SPA origin
  ```
- Actual behavior / Expected behavior: Actual: both pages throw during render, and the route-level ErrorBoundary shows the crash screen. Secondary defects:
  - Both pages render without `DashboardLayout`, so the user loses navigation.
  - The audit filter options query the non-existent table `staff` with `.throwOnError()` (line 222), so the filter dropdowns would be empty.
  - The health check fetches a relative `/functions/v1/…`, which nginx serves as the SPA HTML (`nginx.conf` has no proxy), so `response.json()` fails.
  - The sidebar hides these items behind the `audit_logs` and `system_health` flags, but the routes do not enforce the flags.

  Expected: the pages render inside the layout, use `can('audit-logs')`, call `supabase.functions.invoke('health-check')`, and derive the user list from `profiles` or `user_roles`.
- Reproduction: Enable the `audit_logs` flag, log in as admin, and open Administration → Audit Logs. The ErrorBoundary appears.
- Root cause: Hook API drift, masked by `@ts-nocheck` (66 files in `src` use it).
- Impact: Compliance audit-log review via this page is unavailable. `/settings/activity` still works as an alternative.
- Recommendation: Replace `hasPermission` with `can`, wrap the pages in `DashboardLayout`, fix the health-check call and the staff query, and add `featureFlag` to `withRoleAccess` for these routes. Remove `@ts-nocheck` and fix the surfaced errors, starting with route pages.
- Effort: S
- Acceptance criteria: Both routes render for admin with the sidebar visible. `tsc --noEmit` passes without `@ts-nocheck` on these files. A render test exists for each page.

### FUNC-18: Admin, monitoring, and workflow dashboards display hardcoded or simulated figures as live data
- Severity: P2
- Category: Functional
- Status: CONFIRMED
- Module: Admin / analytics / workflow dashboards
- Location: src/components/monitoring/MonitoringDashboard.tsx:75-84,146-160; src/components/analytics/StaffPerformanceMetrics.tsx:38-58; src/pages/integration/WorkflowDashboard.tsx:806; src/components/admin/WorkflowOrchestrationPanel.tsx:86-131; src/components/receptionist/QueueOptimizer.tsx:52-64,126-127; src/hooks/useWorkflowAutomation.ts:260; src/components/workflow/WorkflowPerformanceMonitor.tsx:18,34; src/pages/doctor/DoctorDashboard.tsx:24-37; src/pages/pharmacy/PharmacyQueuePage.tsx:21-38
- Evidence:
  ```
  MonitoringDashboard.tsx:75  // Mock data - in production, this would come from monitoring service
  MonitoringDashboard.tsx:77  uptime: 99.9, responseTime: 245, errorRate: 0.02, activeUsers: 47, ...
  StaffPerformanceMetrics.tsx:39  { name: 'Patient Throughput', value: role === 'nurse' ? 18 : 24, peerAverage: 15, ... },
  WorkflowDashboard.tsx:806   <span className="font-medium">85%</span>        // "Response Rate"
  WorkflowOrchestrationPanel.tsx:117  await new Promise(resolve => setTimeout(resolve, 1000)); return { ...rule, id: Math.random()... }
  QueueOptimizer.tsx:56       await new Promise(resolve => setTimeout(resolve, 1000)); toast.success('Resource redeployment applied successfully');
  ```
- Actual behavior / Expected behavior: Actual:
  - System Monitoring always shows 99.9% uptime, 47 active users, and fixed "slowest endpoints".
  - The Admin Dashboard Performance tab shows fixed throughput, completion, and satisfaction values plus a fixed radar and trend chart.
  - The Workflows tab "creates" and "toggles" rules in memory only.
  - The Receptionist "Apply change" and "Trigger prep" buttons show success without doing anything.
  - The Integration dashboard shows a constant 85% response rate, and its metrics show "--" because the RPCs `get_workflow_metrics`, `get_workflow_performance_metrics`, and `get_role_performance_stats` do not exist.
  - `/hospital/doctor/dashboard` (24, 12, 5, 3) and `/hospital/pharmacy/queue` (hardcoded prescriptions "Test Patient" and "Jane Doe"; the target of the `/pharmacy/queue` redirect) are stubs.

  `/reports` and `/settings/performance` do use real data. Expected: real metrics, or an explicit "demo / not connected" state.
- Reproduction: Open `/settings/monitoring` on an empty hospital. It still reports 47 active users.
- Root cause: Prototype placeholders left in production components.
- Impact: Admins make staffing and operational decisions on fabricated numbers, and simulated actions erode trust.
- Recommendation: Remove or flag the placeholder widgets, implement the missing RPCs, and replace constants with queries (`activity_logs`, `appointments`, `patient_queue`). Delete the stub routes or point them at real pages.
- Effort: M
- Acceptance criteria: A grep for `Mock data`, `Simulate API call`, and literal KPI constants in live components returns none. Each KPI traces to a query or RPC.

### FUNC-19: Navigation gaps: 10 orphan routes, 7 broken in-app link targets, 10 dead pages, and stub routes reachable by redirect
- Severity: P2
- Category: UI/UX
- Status: CONFIRMED (string comparison of every `navigate()`, `to=`, `href`, and `action_url` literal against route patterns)
- Module: Routing & navigation
- Location: src/config/routeManifest.ts (no entries for /suppliers, /scheduling, /patient/messages, /messages, /documents, /workflow/*); src/pages/doctor/DoctorDashboard.tsx:45,52; src/pages/pharmacy/PharmacyQueuePage.tsx:43; src/hooks/useAmendmentAlert.tsx:133; src/hooks/useWorkflowNotifications.ts:330; src/components/landing/NavigationHeader.tsx:210,218,234; src/routes/routeDefinitions.tsx:302
- Evidence:
  ```
  DoctorDashboard.tsx:45        onClick={() => navigate('/hospital/patients')}          // no such route -> 404
  PharmacyQueuePage.tsx:43      window.location.href = `/hospital/pharmacy/prescription/${prescriptionId}`;
  useAmendmentAlert.tsx:133     window.location.href = `/pharmacy/prescriptions/${alert.prescription_id}`;   // global toast action
  useWorkflowNotifications.ts:330  action_url: '/patient/billing',                      // no patient billing route
  routeDefinitions.tsx:302      { path: '/pharmacy/queue', element: <Navigate to="/hospital/pharmacy/queue" replace /> },
  ```
- Actual behavior / Expected behavior: Actual:
  - Operational pages with no navigation entry: Suppliers and Purchase Orders, Doctor Availability (`/scheduling`), Patient Messages, Discharge Workflow, Workflow Optimization, Nurse Medications, and the Testing dashboard. Messages (staff) is linked only from the doctor dashboard, and Documents only from global search.
  - The pharmacist "Review" toast for prescription amendments and the patient invoice notification lead to 404.
  - Ten pages in `src/pages` are never routed (list in section (b)), including four role-specific messaging hubs.

  Expected: every routed page reachable from navigation or a contextual link, every link resolving, and dead pages deleted.
- Reproduction: As a pharmacist, wait for a prescription amendment toast and click Review (404). As a patient, click the "Invoice Generated" notification (404).
- Root cause: Manifest and routes evolved separately, with no automated link check.
- Impact: Features are effectively invisible (suppliers, scheduling setup, patient messages), and safety-relevant review actions dead-end.
- Recommendation: Add the missing manifest entries (role-gated). Add `/patient/billing` (or retarget to `/patient/portal?tab=billing`) and a `/pharmacy?prescription=:id` deep link. Delete the stub pages and dead pages. Add a unit test asserting every literal navigation target matches a route (the scan script used here can be adapted).
- Effort: S
- Acceptance criteria: A link-check test passes with 0 unresolved targets, every protected route is either in the manifest or explicitly allow-listed as contextual, and `src/pages` has 0 unrouted files.

### FUNC-20: Role and guard mismatches between manifest, route guard, and sidebar; messaging excludes receptionists and staff-to-staff contact
- Severity: P2
- Category: Functional
- Status: CONFIRMED (computed by executing `checkRouteAccess` and `permissions` for all roles)
- Module: Routing / RBAC / messaging
- Location: src/components/layout/GroupedSidebar.tsx:72-88; src/components/auth/RoleProtectedRoute.tsx:60-63; src/routes/routeDefinitions.tsx:440-446,539-547,573-580; src/lib/permissions.ts:72-88; src/config/routeManifest.ts:94-101,345-364; src/pages/messaging/DoctorMessagesPage.tsx:37
- Evidence:
  ```
  GroupedSidebar.tsx:72  const resolvedRoles = testRole ? [testRole] : roles.length > 0 ? roles : ...   // ALL roles
  RoleProtectedRoute.tsx:60  const effectiveRoles = persistedTestRole ? [...] : (primaryRole ? [primaryRole] : roles);  // primary only
  matrix: /appointments  nurse:DENY!   (listed in allowedRoles; lacks 'appointments' permission)
  DoctorMessagesPage.tsx:37  useMessageContacts({ includePatients: true, includeStaff: false });
  ```
- Actual behavior / Expected behavior: Actual:
  - (1) A multi-role user (for example doctor plus receptionist, acting as doctor) sees Billing and Kiosk in the sidebar and gets "Access Denied" on click.
  - (2) Nurses are listed for `/appointments` in both the route and the manifest but are always denied. The sidebar hides the item, so the declared intent and the effective policy disagree.
  - (3) The `system_health` and `audit_logs` flags gate only the sidebar, not the routes.
  - (4) `/messages` serves `DoctorMessagesPage` to admin, nurse, pharmacist, and lab technician with **patient-only** contacts, so staff-to-staff messaging is impossible. The receptionist has no messaging route although `ReceptionistMessagesPage` exists, unrouted.

  Expected: the sidebar and the guard evaluate the same role set, the manifest is the single source of truth for roles, permissions, and flags, and the messaging route is role-appropriate.
- Reproduction: Give a user roles [doctor, receptionist] and select doctor. Click Billing in the sidebar and observe Access Denied.
- Root cause: Three partially overlapping sources (routeDefinitions `allowedRoles`, manifest, and `routeGuard` explicit list) plus different role resolution in the sidebar and the guard.
- Impact: Confusing denials, inability to coordinate between staff via messages, and a nurse workflow gap if nurses are meant to view the day's appointments.
- Recommendation: Generate `protectedRoutes` from `routeManifest` (roles, permission, flag) and have the sidebar use the same `effectiveRoles` as the guard. Decide the nurse appointments policy and align permissions. Route `/messages` to a role-aware hub with `includeStaff: true` and include the receptionist.
- Effort: M
- Acceptance criteria: For every role and route pair, "visible in sidebar" implies "guard allows" (a test over the matrix). Nurse, pharmacist, and receptionist can message staff.

### FUNC-21: Staff invitation flow: no email is sent although the UI says "sent"; the onboarding wizard fails on an FK; status uniqueness blocks re-invites
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static)
- Module: Onboarding / staff invitation
- Location: src/hooks/useStaffInvitations.ts:82-101,103-112,205-224; src/components/staff/StaffInviteModal.tsx:136-140; src/pages/settings/StaffManagementPage.tsx:216-219; src/components/admin/StaffOnboardingWizard.tsx:143-148; supabase/migrations/20260204000011_misc.sql:498,506; supabase/functions/accept-invitation-signup/index.ts:8-13,104-118
- Evidence:
  ```
  StaffInviteModal.tsx:136       Invitation Sent!              // no email dispatch anywhere (no send-email call, no DB trigger)
  StaffOnboardingWizard.tsx:148  invited_by: user.id,          // auth.users id
  misc.sql:498   invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  misc.sql:506   CONSTRAINT unique_pending_invitation UNIQUE (hospital_id, email, status)
  useStaffInvitations.ts:84  (typeof window !== 'undefined' && !!localStorage.getItem('e2e-mock-auth-user'));
  ```
- Actual behavior / Expected behavior: Actual:
  - (1) Invitations are link-only. The admin must copy and share the link, but the toasts say "Invitation Sent!" and "A new invitation has been sent".
  - (2) The Admin Dashboard "Onboard staff" wizard inserts `invited_by = auth uid` into an FK on `profiles.id` (a different UUID), causing an FK violation. It also silently keeps only the first of several selected roles and discards the name and custom message.
  - (3) `UNIQUE(hospital_id, email, status)` makes a second cancellation (or a second acceptance) for the same email fail.
  - (4) Accepting requires creating a **new** auth user, so existing accounts (for example a patient who becomes staff, or staff moving hospitals) cannot accept.
  - (5) `acceptInvitation(token, userId)` sends a body that the edge function's zod schema rejects. It is dead but misleading.
  - (6) In production builds, a stray `e2e-mock-auth-user` localStorage key makes `createInvitation` return a fake success with no DB row.

  Expected: email delivery via `send-email`, a working wizard, uniqueness only on pending invitations, and support for existing users.
- Reproduction: Admin Dashboard → Onboard staff → submit, and observe the FK error toast. Invite x@, cancel, re-invite, cancel again, and observe the unique violation.
- Root cause: An incomplete feature plus a schema constraint on the wrong columns.
- Impact: Onboarding friction, invitees never notified, and admins unable to manage the invitation lifecycle.
- Recommendation: Invoke `send-email` on create and resend. Use `profile.id` in the wizard and create one invitation per role (or support role arrays). Replace the constraint with a partial unique index `WHERE status = 'pending'`. Add an "existing user" accept path. Gate the E2E bypass with `!import.meta.env.PROD`. Delete `acceptInvitation`.
- Effort: M
- Acceptance criteria: The invitee receives an email. The wizard creates an invitation. Repeated cancel and re-invite cycles succeed. Existing users can accept.

### FUNC-22: Receiving a purchase order does not update inventory stock or `received_quantity`
- Severity: P2
- Category: Functional
- Status: CONFIRMED (static; no client update and no DB trigger on `purchase_orders`)
- Module: Inventory & suppliers
- Location: src/hooks/useSuppliers.ts:232-251
- Evidence:
  ```
  useSuppliers.ts:240  if (status === 'received') {
  useSuppliers.ts:241    updates.received_at = new Date().toISOString();
  useSuppliers.ts:242    updates.received_by = profile?.id;
  useSuppliers.ts:246  .from('purchase_orders').update(updates)
  ```
  `grep -i "ON public.purchase_orders" migrations | grep trigger` returns nothing.
- Actual behavior / Expected behavior: Actual: marking an order "received" changes only its status. `medications.current_stock` and `purchase_order_items.received_quantity` stay unchanged, so low-stock alerts persist and stock is understated. Expected: receiving (full or partial) increments stock per item, with lot and expiry capture, atomically.
- Reproduction: Create a PO for 100 units of a low-stock drug and mark it received. Inventory still shows the old stock.
- Root cause: The receiving workflow was never implemented.
- Impact: Inventory figures are wrong, reorders are duplicated, and pharmacists cannot rely on low-stock alerts. `/suppliers` is also unreachable from navigation (FUNC-19).
- Recommendation: Create a `receive_purchase_order(po_id, items[{item_id, qty, lot, expiry}])` RPC that updates stock and records `inventory_transactions`. Add a UI for partial receipt.
- Effort: M
- Acceptance criteria: Receiving 100 units increases `current_stock` by 100 and sets `received_quantity`, and partial receipts are supported.

### FUNC-23: Recurring appointments are not implemented (UI is dead code), and `recurrence.utils` has DST/calendar and conflict-detection defects
- Severity: P3
- Category: Functional
- Status: CONFIRMED (executed in TZ=America/New_York)
- Module: Scheduling / recurrence
- Location: src/lib/recurrence.utils.ts:44-58,85-93,101-111; src/components/features/** (all 10 files unused); src/components/appointments/RecurringAppointmentModal.tsx (unused)
- Evidence:
  ```
  recurrence.utils.ts:53   nextDate = addMonths(currentDate, rule.interval || 1);      // chains from previous occurrence
  recurrence.utils.ts:107  isBefore(newDate, apt.end) && isAfter(newDate, apt.start)   // strict: equal start not a conflict
  $ node rec.cjs
  monthly from Jan31: Sat Jan 31 2026 | Sat Feb 28 2026 | Sat Mar 28 2026 | Tue Apr 28 2026 | Thu May 28 2026
  weekly Mon+Wed rule: Mon Mar 02 2026 | Mon Mar 09 2026 | ...        (dayOfWeek ignored)
  conflict same start: false
  ```
- Actual behavior / Expected behavior: Actual:
  - No live page imports any recurrence UI, so recurring series cannot be created.
  - In the utility, monthly recurrences drift (31st, then 28th forever), `dayOfWeek` and `monthlyOn` are ignored, `CUSTOM` yields only the start date, an exception on the start date is not applied, and conflict detection misses identical start times and any overlap where the new appointment starts before an existing one.
  - Times use the browser's local zone. date-fns `addDays` preserves wall-clock time across DST, which is correct for local-zone users but wrong for staff in a different zone from the hospital.

  The existing tests (`tests/unit/feature1-recurrence.test.ts`) pass but do not cover these cases. Expected: an RFC 5545-style rule (rrule) anchored to the series start in the hospital timezone, and interval-overlap detection.
- Reproduction: Run the snippet above (esbuild bundle of `src/lib/recurrence.utils.ts`).
- Root cause: A homegrown recurrence engine with incomplete rules, never integrated.
- Impact: Feature gap today. If the utility is wired up as-is, it would produce wrong dates and double bookings.
- Recommendation: Either delete the dead feature or implement it with the `rrule` library anchored at `startDate`, with overlap as `start < existingEnd && end > existingStart`, using the hospital timezone. Persist series in `recurring_appointments`.
- Effort: M
- Acceptance criteria: Monthly on the 31st yields Jan 31, Feb 28, Mar 31, Apr 30. A weekly Mon/Wed rule yields both days. A same-start overlap is detected. Tests cover a DST transition week.

### FUNC-24: Telemedicine uses real WebRTC but is STUN-only with a one-shot offer; the doctor UI shows "connected" before the patient answers
- Severity: P2
- Category: Functional
- Status: SUSPECTED (needs runtime verification across NATs)
- Module: Telemedicine
- Location: src/components/telemedicine/VideoCallModal.tsx:379-383,421-468; src/components/telemedicine/PatientVideoCallModal.tsx:19-23,78-93
- Evidence:
  ```
  VideoCallModal.tsx:381  { urls: 'stun:stun.l.google.com:19302' },          // no TURN servers anywhere in src
  VideoCallModal.tsx:456  const offer = await pc.createOffer(); ... channel.send({ event: 'offer', ... })
  VideoCallModal.tsx:463  setIsConnected(true);                              // before any answer
  PatientVideoCallModal.tsx:88  .on('broadcast', { event: 'offer' }, ...)    // only if already subscribed
  ```
- Actual behavior / Expected behavior: Actual: the doctor's offer is broadcast once on subscribe (`broadcast.self: false`, no persistence). A patient who opens `PatientAppointmentsPage` after the doctor starts the call never receives it. The doctor's UI shows Connected and runs the timer anyway. Without TURN, calls fail behind symmetric NAT or corporate and hospital firewalls. Expected: a join and ready handshake (re-send the offer on the patient's "ready" event), connection state driven by `pc.connectionState`, and TURN credentials (for example from an edge function).
- Reproduction: The doctor starts a call and the patient opens the page 10 s later. No incoming call appears, but the doctor sees Connected.
- Root cause: Minimal signalling over Supabase Realtime broadcast.
- Impact: Unreliable teleconsultations and misleading call duration and recording state.
- Recommendation: Add the "ready" and offer-resend protocol, configure TURN, and set `isConnected` on `connectionState === 'connected'`. Consider a private Realtime channel with authorization (the channel name is just `telemedicine:${appointmentId}`).
- Effort: M
- Acceptance criteria: The call connects regardless of join order. The doctor UI shows Connected only after ICE completes. A test behind restrictive NAT succeeds via TURN.

### FUNC-25: Consultation completion tries to create an invoice as the doctor, which the `billing:write` check rejects (Billing Boundary conflict)
- Severity: P2
- Category: Functional
- Status: LIKELY
- Module: Billing hand-off from consultation
- Location: src/pages/consultations/ConsultationWorkflowPage.tsx:781-826; src/hooks/useBilling.ts:257-259; src/lib/permissions.ts:42-71
- Evidence:
  ```
  ConsultationWorkflowPage.tsx:800  const invoice = await createInvoice.mutateAsync({ patientId: ..., consultationId: id, items: invoiceItems, ...
  useBilling.ts:257  if (!hasPermission(primaryRole ?? undefined, 'billing:write')) {
  useBilling.ts:258    throw new Error('You do not have permission to create invoices');
  ```
  The doctor permission list (`permissions.ts:42-71`) has no `billing:*`.
- Actual behavior / Expected behavior: Actual: when a doctor ticks "Notify billing" in the Summary step, the workflow shows "Failed to create invoice for this consultation: You do not have permission…". No invoice and no INVOICE_CREATED notification follow. The default item price is `consultation_fee || 0`. Expected (per CONTEXT.md Billing Boundary): doctors do not create invoices. Completion should emit a charge or notification to reception (a charge-capture record), and the receptionist invoices it.
- Reproduction: As a doctor, complete a consultation with "Notify billing" checked.
- Root cause: The consultation workflow calls billing mutations directly, contradicting the RBAC model.
- Impact: The clinical-to-billing hand-off fails, and charges are lost or depend on manual follow-up.
- Recommendation: Replace the direct invoice creation with a charge-capture insert (see FUNC-08) and a workflow event to receptionists. Keep invoice creation within admin and receptionist.
- Effort: S
- Acceptance criteria: Completing a consultation as a doctor never calls invoice mutations, and the receptionist sees the new unbilled charge.

### FUNC-26: Profile and settings gaps: Change Password does nothing, no profile edit, 2FA can be disabled by mandatory roles, and the post-reset redirect bounces
- Severity: P3
- Category: Functional
- Status: CONFIRMED
- Module: Profile / settings / auth
- Location: src/pages/settings/UserProfilePage.tsx:21-28,47-56,190-192; src/lib/hooks/auth/useTwoFactorAuth.ts:116-140; src/contexts/AuthContext.tsx:805-812; src/pages/hospital/ResetPasswordPage.tsx:95-99
- Evidence:
  ```
  UserProfilePage.tsx:190  <Button variant="outline">
  UserProfilePage.tsx:192    Change Password            // no onClick
  ResetPasswordPage.tsx:98   navigate('/hospital/login');   // session still active -> PublicRoute sends to /dashboard
  ```
- Actual behavior / Expected behavior: Actual:
  - `/profile` is read-only (no name, phone, or avatar edit), and "Change Password" is inert.
  - Admins and doctors can disable 2FA here. The mandatory gate re-applies only after a reload or the next login, because the profile is not reloaded after `disable()`.
  - After a password reset, the "redirect to login" lands on `/dashboard` because the recovery session persists.
  - When `profile` is null, the page renders "Profile not found" without the layout.

  Expected: password change (`auth.updateUser` with current-password re-auth), profile edit, disable blocked when `two_factor_required`, and sign-out after reset.
- Reproduction: Click Change Password and nothing happens.
- Root cause: Unfinished page.
- Impact: Users cannot rotate passwords in-app (a compliance expectation), and the 2FA policy is weakened.
- Recommendation: Implement a password change dialog. Hide or disable "Disable 2FA" when `profile.two_factor_required`. Call `signOut()` before navigating after a reset.
- Effort: S
- Acceptance criteria: A user can change their password from `/profile`. Admin and doctor cannot disable 2FA. After a reset, the user lands on the login form.

### FUNC-27: Staff patient registration has no duplicate-patient detection or DOB plausibility check; three registration implementations; shared zod schemas unused
- Severity: P3
- Category: Functional
- Status: CONFIRMED
- Module: Receptionist / patient registration
- Location: src/components/patients/PatientRegistrationModal.tsx:39-62,170-222; src/components/receptionist/EnhancedPatientRegistrationForm.tsx (unused); src/components/patients/PatientRegistrationModal.STANDARDIZED.tsx (unused); src/lib/schemas/*.ts
- Evidence:
  ```
  PatientRegistrationModal.tsx:42   date_of_birth: z.string().min(1, 'Date of birth is required'),   // future DOB accepted
  PatientRegistrationModal.tsx:172  const { data: mrnData, ... } = await supabase.rpc('generate_mrn', {...});
  PatientRegistrationModal.tsx:218  await supabase.from('patients').insert({ ...finalPatientData, ... })   // no lookup by name+DOB/phone
  ```
  `grep -ril "duplicate.*patient|findDuplicate|checkDuplicate" src` finds no patient-matching logic.
- Actual behavior / Expected behavior: Actual: re-registering the same person (same name, DOB, and phone) silently creates a second MRN. DOB can be in the future. If `encryptPHI` throws, registration proceeds unencrypted (line 214, logged as a warning). Three separate registration implementations exist (modal: live; EnhancedPatientRegistrationForm: dead; STANDARDIZED: dead). The stronger shared `PatientRegistrationSchema` (address, phone, age cross-field) is used only by the dead ones. Expected: pre-insert duplicate search (name plus DOB, phone, or national ID) with a merge or "use existing" prompt, DOB ≤ today, and one registration component using the shared schema.
- Reproduction: Register "Asha Rao, 1990-01-01, 9876543210" twice. Two MRNs are created.
- Root cause: No master-patient-index logic, and duplicated components.
- Impact: Split medical records (a patient safety and billing risk), plus maintenance overhead.
- Recommendation: Add a `find_potential_duplicates` RPC (trigram on names plus exact DOB and phone) and a confirmation step. Consolidate onto one form with `src/lib/schemas/patientRegistrationSchema.ts`. Fail closed on PHI encryption errors (coordinate with the security audit).
- Effort: M
- Acceptance criteria: Registering a probable duplicate shows the existing record(s) and requires an explicit override. A future DOB is rejected. Only one registration component remains.

### FUNC-28: Reports revenue is attributed by invoice creation date and silently capped by PostgREST row limits; legacy report and analytics engines are dead and broken
- Severity: P3
- Category: Functional
- Status: LIKELY
- Module: Reports / analytics
- Location: src/hooks/useReports.ts:109-114,177-178; src/utils/reportingEngine.ts:52,217,236,301,406,424; src/utils/analyticsEngine.ts:79,122,128
- Evidence:
  ```
  useReports.ts:110  .from('invoices').select('paid_amount').eq('hospital_id', ...).gte('created_at', startOfToday)...
  useReports.ts:177  const sumRevenue = (data) => data?.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0) || 0;
  reportingEngine.ts:217  .from('billing')     // table does not exist; module has no importers
  ```
- Actual behavior / Expected behavior: Actual: "Revenue today, this week, this month" sums `paid_amount` of invoices **created** in the period. Cash received today against last month's invoice is excluded, and partial payments are attributed to the creation date. The unpaginated `select` returns at most the PostgREST max-rows setting (1000 by default), so busy hospitals under-report without warning. The counts use `head: true` and are correct. `reportingEngine.ts` and `analyticsEngine.ts` have no importers and query the non-existent tables `billing`, `staff`, `staff_shifts`, `expenses`, `reports`, `report_templates`, and `scheduled_reports`. Expected: revenue from `payments.payment_date` (cash basis) or invoice totals (accrual), clearly labelled, and computed by an aggregate RPC.
- Reproduction: Record a payment today on an invoice created yesterday. Today's revenue stays 0.
- Root cause: Aggregation done client-side over raw rows.
- Impact: Misleading financial KPIs for admins.
- Recommendation: Add `get_revenue_summary(hospital_id, from, to, basis)` SQL using `SUM()` over `payments`. Delete the dead engines.
- Effort: S
- Acceptance criteria: Revenue for a period equals `SUM(payments.amount)` with `payment_date` in the period, and is correct with more than 1000 rows.

### FUNC-29: Currency inconsistency: UI uses ₹ (INR) while notifications, SMS, and the `payments` default use `$` / USD
- Severity: P3
- Category: Functional
- Status: CONFIRMED
- Module: Billing / notifications
- Location: src/lib/currency.ts:8-9; src/hooks/useWorkflowNotifications.ts:327; src/hooks/useNotificationTriggers.ts:135; src/utils/notificationManager.ts:197; src/utils/smsService.ts:140; supabase/migrations/20260204000003_billing.sql:45-46
- Evidence:
  ```
  currency.ts:8                  export const CURRENCY_SYMBOL = '₹';
  useWorkflowNotifications.ts:327  message: `Your invoice of $${invoiceAmount.toFixed(2)} is ready for payment.`,
  billing.sql:46                 currency text NOT NULL DEFAULT 'USD',
  ```
- Actual behavior / Expected behavior: Actual: the patient sees "₹945.00" on screen and "$945.00" in the notification. Expected: a single currency source (a hospital setting) used everywhere, including server-side messages.
- Reproduction: Generate an invoice notification to a patient.
- Root cause: Hardcoded `$` in template strings, with `formatCurrency` not used.
- Impact: Patient confusion and unprofessional communications. This could be read as a different amount.
- Recommendation: Use `formatCurrency` in all message templates, add `hospitals.currency_code`, and align the `payments.currency` default.
- Effort: S
- Acceptance criteria: A grep for `\$\$\{` in money templates returns nothing, and notifications show the hospital currency.

### FUNC-30: Patient portal shows all prescription and appointment statuses (CONTEXT.md limits it to dispensed and finalized); patient online payment is a mock and unrouted
- Severity: P3
- Category: Functional
- Status: CONFIRMED
- Module: Patient portal
- Location: src/lib/hooks/patients/usePatientPortal.ts:106-115,175-184,258-266,824-901; src/pages/patient/PatientPrescriptionsPage.tsx:120-135; supabase/migrations/20260204000001_core_schema.sql:199-230; src/utils/paymentService.ts:15-33,122-160; src/components/patient/PatientBilling.tsx:82-95 (unused); src/hooks/usePatientPortal.ts (duplicate)
- Evidence:
  ```
  usePatientPortal.ts:183  .eq('patient_id', patientRecordId)        // prescriptions: no status filter
  core_schema.sql:199      CREATE POLICY "Patients can view their own prescriptions" ON public.prescriptions FOR SELECT USING (EXISTS(... p.user_id = auth.uid()))   // no status predicate
  paymentService.ts:28     export const loadStripe = async (key?: string) => { ... return mockStripe; };   // always the mock, even with a key
  ```
- Actual behavior / Expected behavior: Actual:
  - Patients see pending, rejected, and cancelled prescriptions and every appointment status. RLS enforces ownership only, not the CONTEXT.md "dispensed / finalized / completed" visibility, so the API returns them regardless of the UI.
  - Lab result *values* are correctly hidden until `completed` (`PatientLabResultsPage.tsx:58`), but the rows (test names and pending status) are visible.
  - `/patient/billing` does not exist, and `PatientBilling` and `PatientBillingAccess` (with a "Pay Now" button) are unrouted. Their `paymentService` returns a mock Stripe that always "succeeds" and invokes 7 non-existent edge functions (`create-payment-intent`, `refund-payment`, and others).
  - `src/hooks/usePatientPortal.ts` is a byte-identical duplicate of `src/lib/hooks/patients/usePatientPortal.ts`. Only the latter is used.

  Expected: either align CONTEXT.md or filter in RLS (preferred) or the views. No mock payment code in the bundle.
- Reproduction: As a patient with a rejected prescription, open `/patient/prescriptions` and see it listed.
- Root cause: Visibility rules not encoded in RLS. Payment integration never built.
- Impact: Patients may see non-final clinical decisions. There is no online payment capability, and the mock could mislead if wired up.
- Recommendation: Add status predicates to the patient SELECT policies (or patient-facing views) per CONTEXT.md, and decide on the pending-lab visibility rule. Delete `paymentService` mock and the dead billing components, or implement a real gateway (Razorpay or Stripe) via an edge function. Delete `src/hooks/usePatientPortal.ts`.
- Effort: M
- Acceptance criteria: A patient API query for prescriptions returns only `dispensed` or `completed`. No `mockStripe` remains in the production bundle.

### FUNC-31: Large dead, duplicate, and unbacked code surface obscures what is live
> **Consolidation note:** this finding duplicates **ARCH-07** and is kept for its evidence. The register counts it once, under ARCH-07.

- Severity: P3
- Category: Technical debt
- Status: CONFIRMED
- Module: Cross-cutting
- Location: src/components/features/** (10 files, 0 external importers); src/lib/billing.calculator.ts; src/lib/edi837.builder.ts; src/utils/billingValidator.ts (only via unused `useBillingValidation`); src/hooks vs src/lib/hooks (22 same-name pairs, 15 identical); 10 unrouted pages; src/utils/reportingEngine.ts; src/utils/analyticsEngine.ts; src/hooks/useAdminDashboardMetrics.ts (via unused `components/admin/AdminDashboard.tsx`)
- Evidence:
  ```
  pairs=22 identical=15                       (diff -w of src/lib/hooks/** vs src/hooks/<same name>)
  0 src/components/features/billing/BillingDashboard.tsx      (importer count)
  billing.calculator.ts:44  if (serviceCharge < 100) return 20;      // tiered copay can exceed the charge
  billing.calculator.ts:64  const deductibleApplied = Math.min(amount, remainingDeductible);  // negative when deductibleMet > annual
  ```
- Actual behavior / Expected behavior: Actual: about 30 or more modules look production-ready (billing dashboards, invoice PDF generator, claim UI, recurrence, telehealth Rx, EDI 837, insurance calculator) but are never reachable. They reference 49 tables, 14 RPCs, and 17 edge functions that do not exist. The billing calculator has latent bugs: a tiered copay of ₹20 on a ₹10 service, and a negative deductible when `deductibleMet > annual_deductible`. Duplicated hooks such as `usePatients`, `useAppointments`, and `usePrescriptions` have **diverged**, so fixes land in one copy only. Expected: a single canonical implementation per concern, with dead code removed.
- Reproduction: Static: importer counts and diffs (commands in the audit notes).
- Root cause: Parallel rewrites without cleanup.
- Impact: Reviewers and testers assume features exist, fixes go to the wrong copy, bundle bloat, and false test confidence (tests target dead modules).
- Recommendation: Delete `src/components/features/**`, the dead pages, the dead engines, and the duplicate `src/hooks/*` copies (re-export from `src/lib/hooks` during migration). Add `knip` or `ts-prune` to CI. If insurance cost-sharing is needed, fix the calculator first (clamp copay ≤ charge, clamp remaining deductible ≥ 0, use integer paise).
- Effort: M
- Acceptance criteria: `knip` reports 0 unused files in `src/components`, `src/pages`, and `src/utils`. No same-name hook exists in both `src/hooks` and `src/lib/hooks`.

### FUNC-32: Glossary drift: CONTEXT.md Patient Queue statuses differ from code and DB
- Severity: P4
- Category: Technical debt
- Status: CONFIRMED
- Module: Domain docs / Patient Queue
- Location: CONTEXT.md (Patient Queue: `'waiting' | 'in_consultation' | 'completed'`); supabase/migrations/20260204000011_misc.sql:189; src/hooks/useQueue.ts:113,209,227,252
- Evidence:
  ```
  misc.sql:189   status TEXT DEFAULT 'waiting', -- waiting, called, in_service, completed
  useQueue.ts:113  .in('status', ['waiting', 'called', 'in_prep', 'in_service'])
  ```
- Actual behavior / Expected behavior: Actual: the code uses `called`, `in_prep`, and `in_service`, while CONTEXT.md says `in_consultation`. There is no CHECK constraint on `patient_queue.status`. Expected: CONTEXT.md and the DB CHECK constraint match the implemented state machine.
- Reproduction: Static.
- Root cause: Documentation not updated, and no DB enum or constraint.
- Impact: Integration and report authors use the wrong status names, and invalid statuses can be written.
- Recommendation: Update CONTEXT.md and add `CHECK (status IN ('waiting','called','in_prep','in_service','completed','cancelled'))`.
- Effort: S
- Acceptance criteria: CONTEXT.md lists the same statuses as the CHECK constraint, and inserting an unknown status fails.

### Additional operational finding from lead verification (FUNC-33)

### FUNC-33: Invoice adjustments and refunds are authorized by a hardcoded client-side manager PIN and written directly to `invoices`
- Severity: P1
- Category: Security
- Status: CONFIRMED (static analysis; code read in full)
- Module: Billing / invoice adjustments
- Location: src/components/billing/InvoiceAdjustmentModal.tsx:72-73, 102-118, 125-139; src/pages/billing/BillingPage.tsx:699
- Evidence:
  ```
  const isManagerOrAdmin =
    profile?.role === 'admin' || profile?.role === 'billing_manager' || managerPin === '<REDACTED 4-digit PIN>';
  ...
  await supabase.from('invoices').update({ total: newTotal, discount: ..., status: newStatus, notes: [...] }).eq('id', invoice.id);
  ```
- Actual behavior: `Profile` has no `role` field (AuthContext.tsx:21-32), so the role branch never matches. The only way to authorize a manager discount, write-off or refund is a 4-digit PIN that is hardcoded in source and shipped in the public JS bundle. The authorization is client-side only. The write is a direct PostgREST `UPDATE` of `total`/`discount`/`paid_amount`/`status`, which any user allowed to update invoices by RLS can perform without the modal. Refunds decrement `paid_amount` without a payments/refund ledger row. The audit entry (`logActivity`) is written in a separate, non-transactional call after the update. `billing_manager` is not one of the 7 canonical roles (ADR-0002).
- Expected behavior: Adjustments and refunds go through a server-side RPC/edge function. That function checks the caller's role from `user_roles` (admin, plus receptionist within limits), requires a second-person approval stored server-side, writes an adjustment/refund ledger row and the audit record in the same transaction, and keeps no secret in client code.
- Reproduction: Static. Open Billing as a receptionist, choose Adjust on any invoice, enter the PIN from the bundle: the discount or refund is applied.
- Root cause: Financial authorization was implemented as UI logic. Profile/role typing drift is hidden by `@ts-nocheck` and the vacuous type-check (ARCH-01/ARCH-03).
- Impact: Revenue leakage and fraud risk (unauthorized write-offs/refunds), ledger/invoice divergence, and audit trail gaps for financial events.
- Recommendation: Remove the PIN. Create an `adjust_invoice(p_invoice_id, p_type, p_amount, p_reason)` SECURITY DEFINER RPC with an explicit role check and `SET search_path`, which writes `invoice_adjustments` and `audit_logs` atomically. Revoke direct UPDATE on `invoices.total/discount/paid_amount` from clients (column privileges or a trigger).
- Effort: M
- Acceptance criteria: No PIN literal in `src/`. A receptionist without approval cannot change `invoices.total` via REST (RLS/column-privilege test). Every adjustment produces exactly one ledger row and one audit row in the same transaction.
