# 02: S0-07 Fail-closed clinical decision support on the live prescribing path

Status: ready-for-human
Type: task
Roadmap: S0-07 (docs/repository-audit/IMPLEMENTATION_ROADMAP.md)
Issues: CLIN-01, CLIN-02, CLIN-14, ARCH-04, CLIN-08
Blocks: S1-09

## Done (2026-11-05, agent; branch `ccr-2602d823-jeymkf`, not merged)

- [x] Prescribers (consultation workflow, quick consultation) and pharmacists (approval modal) use `useOrderSafety` + `OrderSafetyPanel`. CLIN-01, ARCH-04.
- [x] Allergies, home medications and active prescriptions loaded from the patient record (`usePatientClinicalContext`); encrypted item names decrypted via `phi-crypto`. Any load or decrypt failure becomes a data gap that requires a documented override (fail closed).
- [x] Overrides persisted with reason, actor role, receipt id in `prescriptions.allergy_alerts` / `drug_interactions` (schema `order-safety/v1`); pharmacist sees the prescriber's rationale. Audit rows go to `activity_logs`. CLIN-02.
- [x] Actor (tenant + role) derived from `AuthContext`, not passed by callers.
- [x] Pediatric: correct doses/day for interval frequencies; missing weight or unparseable dose requires override. Route never guessed.
- [x] NEWS2: `fromVitalsRecord` maps snake_case / "120/80" vitals; the doctor screen and sidebar now score the same as nurse intake. CLIN-08.
- [x] Intake allergies/medications merged into `patients.allergies` / `current_medications` from PatientPrepModal, UnifiedPatientPrepPanel, RecordVitalsModal and EnhancedTriagePanel (additive only). CLIN-14.
- [x] Legacy `usePrescriptionSafety`, `PrescriptionSafetyAlerts` and the self-contained legacy test removed; DUR tests in `tests/unit/workflow3PharmacyDispensing.test.ts` ported to the engine.
- [x] Verification: clinical suite + new tests pass; full vitest failing set identical to pre-S0-07 baseline (48 pre-existing failures, 0 new); `tsc -p tsconfig.app.json` no new errors (4 fewer); `vite build` OK; `lint:boundaries` clean; eslint 0 errors on changed files.

## Remaining

- [x] Playwright staging smoke test written (`tests/e2e/staging/`, `npm run test:e2e:staging:clinical`); refuses production hosts, blocks writes. **Not yet run against staging** (needs a non-production project, accounts and fixtures; see its README).
- [x] PERF-01: the fetch interceptor's `x-correlation-id` header broke browser calls to edge functions (CORS preflight), confirmed in headless Chromium against a stub; it now tags same-origin requests only, and `_shared/cors.ts` allows the header (takes effect on function redeploy). The decrypt call now passes the patient as resource context (phi-crypto refuses non-admins without it). Live check still needed: `phi-crypto` returns 200 from the deployed site; `CORS_ALLOWED_ORIGINS` includes the production origin.
- [x] Nurse UPDATE on `patients`: likely allowed ("Staff can update patients", migrations only). An RLS-filtered update (0 rows) is now reported as not saved. Live check after S0-01; optional RPC for atomic merge + audit row.
- [x] Quick consultation drops prescriptions when "Send to Pharmacy" is unticked. Fixed: a saved prescription is a pharmacy order (queue entry + ADR-0004 workflow; no "not routed" status), so completion is now blocked with a message until the doctor ticks "Send to Pharmacy" or removes the prescriptions. Same for lab orders / "Send to Lab" and for a typed-but-not-added row. Test: `tests/clinical/quick-consultation-unsent-orders.test.tsx`.
- [x] Consultation weight units (CLIN-09 weight/height/temperature part of S1-09). Step 1 stores `weight_unit` (kg/lb), `height_unit` (cm/in) and `temperature_unit` next to each value; "Use these vitals" copies nurse weight/height with the unit cleared (`vital_signs` has no unit column and its writers disagree), so the doctor must state it. `verifiedWeightKg` (vital-signs) feeds `usePatientClinicalContext({ weightKg })` in the consultation workflow only when the unit is known. Test: `tests/clinical/consultation-weight-units.test.tsx`. Still open: quick consultation has no weight input (pediatric weight-based orders there still require override); `vital_signs` itself has no unit column.
- [ ] Interaction coverage is the in-process critical-pair list only (RxNav retired); a maintained DDI source is S2-07.
