# S0-07 clinical safety smoke test (staging only)

`clinical-safety.smoke.spec.ts` is the Playwright check required by audit roadmap item S0-07. It runs against a deployed **staging** app. It never starts a local server and never runs against production.

| Test | What it proves |
|---|---|
| (a) prescriber | A patient with `Penicillin allergy` and `PCN` on record gets an allergy finding for each term when amoxicillin is added on the consultation Treatment Plan step. **Next** is refused ("Cannot continue: document a clinical override…") and nothing is sent. |
| (a) pharmacist | For a pending amoxicillin prescription, the approval modal shows both allergy findings. **Approve & Release to Dispense** stays disabled, and a note under 10 characters cannot be documented. The modal is then cancelled. |
| (b) partial outage | The order-safety read of the patient's prior prescriptions is aborted with `page.route`. The finding "Fail-Closed CDS: Safety screening incomplete" appears and **Next** is refused. A 9-character rationale is rejected. After a rationale of at least 10 characters is documented, **Next** tries to send the consultation (the write itself is blocked by the guard). |
| (b) total outage | The patient record read (allergies, home medications) is aborted. The panel shows "Safety screening unavailable: order blocked", offers no override field, and **Next** is refused. |
| (c) NEWS2 parity | A nurse enters HR 140, BP 80/50, RR 30, SpO2 85 in Patient Preparation. The nurse's computed NEWS2 is read from the captured submission (expected 12, `high`). The doctor's consultation is then loaded with the nurse's stored vitals record. The header badge and the sidebar badge must both show the same score and risk. |

## Safety of the run

- **Skipped** unless the variables below are set. Each group lists the missing variable names (never values) as its skip reason.
- **Refuses to run** (config load fails) when `E2E_STAGING_BASE_URL` or `E2E_STAGING_SUPABASE_URL` is a production host:
  - the Supabase project in `supabase/config.toml` (`project_id`);
  - `app.caresync.com` / `caresync.com`;
  - anything listed in `E2E_PRODUCTION_HOSTS` or `E2E_PRODUCTION_SUPABASE_REFS`.
- At runtime, every browser request to one of those hosts is aborted and fails the test. If `E2E_STAGING_SUPABASE_URL` is set, requests to any other `*.supabase.co` host are aborted and fail the test too. This catches a staging front end that was built against the production Supabase project. Credentials are never sent to a blocked host.
- **No clinical writes.** Every Supabase REST write (`POST`/`PATCH`/`PUT`/`DELETE`, and RPCs not named `get_*`, `check_*` and similar) is aborted. Three things are allowed through:
  - inserts into the append-only `activity_logs` and `audit_logs`, so the staging audit trail shows the test's activity;
  - `phi-crypto` decrypt calls;
  - other edge-function calls, which are not intercepted.

  The nurse's `complete_patient_prep` RPC and the critical-vitals `notifications` insert are captured and answered locally. Encrypt calls are aborted.
- No patients, consultations or prescriptions are created. The staging fixtures below stay the same across runs.

## Environment variables

| Variable | Required for | Notes |
|---|---|---|
| `E2E_STAGING_BASE_URL` | all | Staging app origin, e.g. `https://staging.example.org` |
| `E2E_STAGING_PATIENT_ID` | all | UUID of the pre-provisioned test patient |
| `E2E_STAGING_PATIENT_MRN` | all | That patient's MRN (used to find queue rows) |
| `E2E_STAGING_CONSULTATION_ID` | prescriber, NEWS2 | In-progress consultation for the test patient |
| `E2E_STAGING_DOCTOR_EMAIL` / `_PASSWORD` | prescriber, NEWS2 | Doctor account |
| `E2E_STAGING_PHARMACIST_EMAIL` / `_PASSWORD` | pharmacist | Pharmacist account |
| `E2E_STAGING_NURSE_EMAIL` / `_PASSWORD` | NEWS2 | Nurse account |
| `E2E_STAGING_SUPABASE_URL` | optional, recommended | Supabase URL the staging build uses; enables the strict host check |
| `E2E_PRODUCTION_HOSTS`, `E2E_PRODUCTION_SUPABASE_REFS` | optional | Extra comma-separated hosts or project refs to refuse |
| `E2E_CHROMIUM_EXECUTABLE_PATH` | optional | Use a preinstalled Chromium instead of the one pinned by `@playwright/test` |
| `E2E_STAGING_TRACE` | optional | Set to keep traces on failure. Traces contain auth tokens and patient data, so do not upload them publicly. |

Keep the credentials in the CI secret store (GitHub environment `staging`). Do not put them in `.env` files that are committed.

## Staging data setup (one time, by an operator)

All accounts and records must be in the same hospital (tenant) of a **non-production** Supabase project. `.env.staging.example` notes that no dedicated staging project exists yet; until one does, use the dev/preview project, never production. Use synthetic data only.

1. **Staff accounts:** a doctor, a pharmacist and a nurse. Each must be active, have its role assigned, and have **no 2FA** (the login step cannot answer a TOTP prompt). Do not reuse shared demo accounts (S0-11).
2. **Test patient:**
   - an adult `date_of_birth` (a missing DOB adds a "screening incomplete" finding);
   - `allergies = {"Penicillin allergy","PCN"}`;
   - empty `current_medications`.

   Any earlier prescriptions must be decryptable by `phi-crypto` in staging. Otherwise every order gets a "screening incomplete" finding. Test (a) still passes in that case, but the result is noisy.
3. **Consultation** (`E2E_STAGING_CONSULTATION_ID`):
   - for the test patient, in the doctor's hospital;
   - `status` not `completed`;
   - `current_step >= 4`, with steps 1–3 filled in (chief complaint, an exam finding, a diagnosis);
   - no prescriptions.

   The easiest way to create it is to walk a consultation to the Treatment Plan step in the app and stop there.
4. **Pending prescription:**
   - for the test patient, `status = 'pending'`;
   - one item `Amoxicillin`, `500 mg`, readable in the pharmacist queue at `/pharmacy` (searchable by MRN).

   The test never approves it, so it stays pending. The easiest way to create it is to complete a separate consultation once with amoxicillin and a documented override.
5. **Nurse queue entry:**
   - a `patient_queue` row for the test patient with status `waiting`, `called` or `in_prep`;
   - no `patient_prep_checklists` row with `ready_for_doctor = true` for that entry.

   It must show **Start Prep** on the nurse dashboard. The test's submission is never stored, so the entry is reusable.

## Run

```bash
# Against staging (operator machine or CI job with the staging secrets)
E2E_STAGING_BASE_URL=... E2E_STAGING_PATIENT_ID=... npm run test:e2e:staging:clinical

# With a preinstalled Chromium instead of the version pinned by @playwright/test
E2E_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npm run test:e2e:staging:clinical
```

Without the variables, all 5 tests are reported as skipped and the exit code is 0. The default `playwright.config.ts` ignores this folder.

## Limits

- The phi-crypto outage branch is the same fail-closed path as the prior-prescriptions outage: both become a data gap that requires an override. The test simulates the prescriptions read rather than phi-crypto decrypt, because aborting decrypt also breaks loading the consultation itself.
- NEWS2 parity uses the nurse's real submission payload, injected into the doctor's consultation read. It does not prove that staging persists nurse vitals onto the consultation.
- A passing run is evidence for S0-07 sign-off. It does not replace the clinician sign-off required by gate G1.
