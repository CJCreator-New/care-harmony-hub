# 07: Roadmap S1-09 — clinical data correctness fixes

Status: partly fixed (client-side work on `ccr-2602d823-jeymkf`; server parts and UI-owned parts remain)

Source: `docs/repository-audit/IMPLEMENTATION_ROADMAP.md` (S1-09) and the `### <ID>:` entries in `FUNCTIONAL_AUDIT.md` and `SECURITY_AUDIT.md`.

Verification run on the branch head after these commits:
- `npm run type-check`: exit 0.
- `npm run lint:boundaries`: exit 0, no dependency violations.
- `npx vitest run --exclude '.claude/**'`: 4092 tests (4022 before). The failing entries are the same 48 as on the clean base `d43d39e`; no new failures.

Scope rules followed: nothing under `supabase/`; nothing under `src/components/nurse/*`, `src/components/lab/*`, `src/components/labs/*`, `src/lib/security/*`, `src/modules/offline-store/*`, `src/components/dashboard/*`; no new dependencies or env vars.

## Per-issue status

| Issue | Sev | Status | Commit | Test(s) |
|---|---|---|---|---|
| CLIN-05 PHI field round-trip | P1 | partly fixed (client); server remaining | `9dcd32d` | `src/test/phi/encryptedRecordFields.test.ts` › "decrypts with the record as the authorisation resource, so the chief complaint is readable"; › "keeps the ciphertext of other fields when an addendum writes only clinical_notes" |
| EDGE-04 phi-crypto decryption oracle | P1 | server-side remaining | none | none (the oracle is in `supabase/functions/phi-crypto`, out of scope) |
| CLIN-06 autosave overwrites form state | P1 | partly fixed | `ef66b13` | `src/test/hooks/consultationFormHydration.test.ts` › "does not re-hydrate when the same consultation is refetched after an autosave"; › "selects the diagnoses and encryption_metadata columns the form needs" |
| CLIN-09 mixed vital units | P2 | partly fixed | `3364e13` | `src/test/components/consultationVitalsUnits.test.ts` › "a nurse 37.0 °C reading reads 98.6 °F after switching the unit to °F"; › "70 kg reads about 154.3 lb after switching to lb" |
| CLIN-12 NEWS2 inputs incomplete | P2 | partly fixed (module); UI remaining | `bbbef77` | `src/modules/vital-signs/tests/news2Inputs.test.ts` › "SpO2 Scale 2 at 88% on air scores 0"; › "reports an incomplete NEWS2 when a parameter is missing" |
| CLIN-13 eMAR schedule and double dose | P2 | partly fixed | `9382824` | `src/test/nurse/medicationDoseGuard.test.ts` › "blocks a second administration of the same dose inside the interval"; › "allows the next dose once the interval has passed" |
| CLIN-15 pediatric engines diverge | P2 | partly fixed | `3e06cb5`, `ab42914` | `src/test/utils/pediatricDosingEngine.test.ts` › "counts the prescribed q6h frequency, not the rule default"; `src/modules/order-safety/tests/pediatricEngine.test.ts` › "q4h acetaminophen is counted as 6 doses a day…" |
| EDGE-19 pediatric-dosing absolute cap | P2 | partly fixed (client engines); server remaining | `ab42914` | `src/modules/order-safety/tests/pediatricEngine.test.ts` › "caps the weight-based daily limit at the absolute paediatric maximum (EDGE-19)"; › "hard-stops a paediatric daily dose above the absolute adult maximum (EDGE-19)" |
| CLIN-16 lab ranges ignore age and sex | P2 | partly fixed | `110d8e7` | `src/modules/critical-lab-escalation/tests/labPanels.test.ts` › "does not treat a neonatal potassium of 6.3 mmol/L as a critical panic value"; › "shows a male haemoglobin of 12.5 g/dL as low"; › "does not map \"Fasting Lipid Profile\" to any panel by substring" |
| CLIN-21 telehealth notes not persisted | P2 | partly fixed (no false success); persistence remaining | `f9be4ea` | `src/test/components/telemedicine/SessionNotes.test.tsx` › "does not claim the notes were saved when nothing is connected to store them"; › "reports success only after the onSave handler receives the notes" |

## What each row means

### CLIN-05 (partly fixed)
- Fixed: the consultation detail presets select `encryption_metadata`; consultation and prescription-item decryption passes the row as the authorisation resource (`decryptRecordFields`); a partial update merges with the stored metadata (`mergeEncryptionMetadata`) instead of replacing it; a refused decryption shows `[Encrypted]`, not the storage token.
- Remaining, server side: phi-crypto should merge metadata with `||`; the prescription header is still inserted before its items are encrypted (`usePrescriptions` create path); a create-prescription RPC would make this atomic.

### EDGE-04 (server-side remaining)
- The probe that authorises `decrypt` still checks a caller-chosen `resourceId`, and the key is one global key with no AAD. Only the edge function can fix this. The client now sends the true resource, which is necessary but not sufficient.
- Required server work: decrypt by `table/column/ids` loaded with the caller's RLS client, AAD bound to `table|column|row_id|hospital_id`, per-tenant DEKs with `key_version`, and a mandatory audit insert.

### CLIN-06 (partly fixed)
- Fixed: the workflow page hydrates its form once per consultation id (`shouldHydrateConsultationForm`), so autosave refetches no longer reset the step, ICD-10 selections or in-progress text. `diagnoses` is now selected.
- Remaining: `useUpdateConsultation` still strips columns the database lacks and reports success (it should fail visibly). This depends on the schema decision in S0-01. The `icd_code: 'UNSPECIFIED'` fallback is unchanged and applies only when structured diagnoses are absent.

### CLIN-09 (partly fixed)
- Verified from S0-07: `verifiedWeightKg`, unit toggles and the unit-stated copy rule are present.
- Fixed: switching the temperature or weight unit converts the entered value (`switchTemperatureUnit`, `switchWeightUnit`, `kgToLb`, `lbToKg`).
- Remaining: the height unit toggle is not converted; `src/components/nurse` (RecordVitalsModal, PatientPrepModal) still writes kg/cm and lb/in into the unit-less `vital_signs` columns; the weight display in both units is not implemented.

### CLIN-12 (partly fixed; module side only)
- Fixed: `confusion` is a consciousness level (C of ACVPU; scored 3); SpO2 Scale 2 is scored by `spo2Scale`; `evaluateVitalSigns` returns `isComplete` and `missingParameters`; the adapter keeps an explicit "no oxygen" answer.
- Remaining (owned by `src/components/nurse`): PatientPrepModal does not collect consciousness or O2; RecordVitalsModal does not use the module and has no plausibility bounds. Consumers should show `missingParameters` when `isComplete` is false.

### CLIN-13 (partly fixed)
- Verified: the Simulate Scanner button and the BCMA gap are in `src/components/nurse/BarcodeVerificationModal.tsx`, which is out of scope.
- Fixed: a second administration is blocked until the dose interval derived from the prescribed frequency has passed (`administrationBlock`); the handler refuses it too; the "today" counter uses the local calendar day.
- Remaining: a `dose_schedule` table generated at dispense; administrations storing `prescription_item_id` and `scheduled_time`; removal of the simulate button (components/nurse); drug-barcode scanning; authenticated witness co-signature; the status vocabulary (`administered` vs `given`).
- Test-first note: the guard helper and its tests were written together, not red-first, because the defect is absence of a guard. The page wiring is the behavioural fix.

### CLIN-15 (partly fixed)
- Verified: `getDosesPerDay` already maps q4h to 6, q6h to 4, q8h to 3 and q12h to 2 (the module-side frequency arithmetic in the audit is fixed; pinned by test).
- Fixed: the util `validatePediatricDose` used the rule default (`dosesPerDay`) instead of the prescribed frequency; it now uses `getDosesPerDay(frequency)`.
- Remaining: `src/utils/pediatricDosingEngine.ts`, the module engine and `supabase/functions/pediatric-dosing` and `prescription-approval` are still separate copies (the single-engine recommendation is not done). The util's hard stop is at 2x adult caps while the module now hard-stops above the adult daily maximum. Unconfigured drugs still return no finding in the module (fail-open), while the util fails closed; the audit does not define which drugs are "unknown", so this was not changed. `PediatricDosingCard` is still not mounted and the live prescribing path has no weight-based check. TreatmentPlanStep does not capture a structured dose or unit.

### EDGE-19 (partly fixed)
- Fixed in the module engine: the weight-based daily ceiling is capped at the rule's absolute paediatric daily maximum; overdose checks run before the age-minimum warning; a daily dose above the absolute adult maximum is a hard stop.
- Remaining: the util does not apply the absolute daily cap (`maxSafeDailyDose` is still weight-only there); `supabase/functions/pediatric-dosing` (`maxSafeDaily = weightKg * rule.maxSafeDailyMgPerKg`, `details: err.message`) needs the same change server side.

### CLIN-16 (partly fixed)
- Fixed: `evaluateLabPanel` / `evaluateNumericParameter` take an optional patient context (age, sex); haemoglobin uses male and female adult ranges; neonates have their own haemoglobin and potassium ranges; `matchLabPanel` matches whole words or phrases, so "Fasting Lipid Profile", "PTH" and "Gastrin" no longer map to a panel.
- Remaining: `src/components/lab/StructuredResultEntryModal.tsx` (out of scope) does not yet pass the patient's age and sex; troponin hs assays (ng/L) still use ng/mL thresholds; ranges are not yet read from `lab_critical_ranges`.

### CLIN-21 (partly fixed)
- Fixed: without an `onSave` handler, SessionNotes reports that the notes were not saved instead of "Session notes saved"; success is shown only after the handler receives the notes.
- Remaining: `VideoCallModal` does not persist notes to a consultation; `TelehealthPrescriptionIssuance` is unmounted and depends on missing edge functions and tables; telehealth prescriptions must go through the standard approval workflow.

## Not changed (outside this task)
- Anything under `supabase/` (EDGE-04, the server parts of CLIN-05, CLIN-15 and EDGE-19).
- Components owned by other work: `src/components/nurse/*`, `src/components/lab/*`, `src/components/labs/*`.
