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

- [ ] Playwright clinical smoke test on staging (needs staging credentials): penicillin-allergic patient + amoxicillin blocked at prescriber and pharmacist; edge outage forces override.
- [ ] Verify `phi-crypto` decryption works in the browser after the PERF-01 fetch patch. If it fails, every order for a patient with earlier encrypted prescriptions will require an override (safe, but noisy).
- [ ] Confirm nurse roles may UPDATE `patients.allergies` / `current_medications` under live RLS (S0-01 capture). On failure the nurse gets a warning toast; nothing is silently lost.
- [ ] Quick consultation drops prescriptions when "Send to Pharmacy" is unticked (pre-existing; now stated in the UI). Decide the intended behaviour.
- [ ] Consultation weight is labelled lbs but used inconsistently elsewhere (CLIN-09, S1-09); pediatric weight-based checks currently treat weight as unavailable and require override.
- [ ] Interaction coverage is the in-process critical-pair list only (RxNav retired); a maintained DDI source is S2-07.
