# Pending migrations

SQL in this folder is **not applied automatically**. The Supabase CLI reads only `supabase/migrations/`, and the Lovable sync does the same, so nothing here reaches a database until an operator moves it.

The folder exists because the live schema has not been reconciled with the migration history yet (roadmap task **S0-01**; see `docs/repository-audit/IMPLEMENTATION_ROADMAP.md`). Until the live baseline exists, a new migration in `supabase/migrations/` could be applied to a database whose shape nobody has verified. Fixes that need schema changes wait here, written to be idempotent, and are promoted once S0-01 is done.

## Files

| File | Task | What it does |
|---|---|---|
| `20261105000001_critical_lab_escalation_queue.sql` | S0-08 (EDGE-03, CLIN-10) | Makes the Critical Lab Escalation Queue work: `lab_critical_alerts` keyed to `lab_orders`, fail-closed `review_required` severity, one open alert per order, acknowledgement columns, non-recursive RLS; `lab_alert_escalations` with a `processing` status, retry bookkeeping and one row per (alert, level); `on_call_schedule`; append-only `lab_critical_alert_events` audit rows from triggers; a pg_cron job (every minute) that calls the `critical-lab-check` worker through pg_net with a secret read from Vault. |
| `20261105000002_mfa_backup_codes_and_aal2.sql` | S0-10 (EDGE-05, EDGE-25, SECF-01, SECF-02) | **A.** `mfa_backup_codes` (peppered HMAC hashes, salt, pepper id, `used_at`) and `mfa_backup_code_attempts`, with no client access; service-role RPCs `consume_mfa_backup_code` (atomic single use, 5 failures / 15 min lockout) and `replace_mfa_backup_codes`; `my_mfa_backup_codes_remaining()` for the UI. **B.** Trigger `profiles_guard_privileged_columns`: end users cannot change `two_factor_*`, `hospital_id`, `is_active`, `is_staff`, `role` or the lockout columns. **C.** `public.mfa_satisfied()`: true at `aal2`, or when the caller has no admin/doctor role. **D.** RESTRICTIVE policy `mfa_aal2_required` on the PHI tables. **Section D must be reconciled against the S0-01 capture** (see below). Tests: `tests/s0-10/`. |

## Promoting a file (after S0-01)

1. Confirm the prerequisites listed at the top of the file exist in the captured live baseline. The file checks them itself and aborts if any is missing.
2. Replay it on top of the baseline locally. It must exit 0, and applying it twice must also exit 0:

   ```bash
   mkdir -p /tmp/pending-check
   cp supabase/migrations/<baseline>.sql /tmp/pending-check/
   cp supabase/pending-migrations/20261105000001_critical_lab_escalation_queue.sql /tmp/pending-check/
   node scripts/db/replay-migrations.mjs --migrations /tmp/pending-check --stop-on-error --out /tmp/pending-report
   ```

3. Give it a version later than the baseline, `git mv` it into `supabase/migrations/`, and open a PR.
4. After it is applied, regenerate `src/integrations/supabase/types.ts`.

## Operator steps for 20261105000001 (critical-lab escalation)

Never commit any of these values.

1. **Edge function secret.** Generate a random value of at least 32 characters and set it on the function:
   `npx supabase secrets set CRITICAL_LAB_WORKER_SECRET=<value>`.
2. **Vault secrets** (SQL editor, as the project owner):

   ```sql
   select vault.create_secret('https://<project-ref>.supabase.co/functions/v1/critical-lab-check', 'critical_lab_worker_url');
   select vault.create_secret('<same value as CRITICAL_LAB_WORKER_SECRET>', 'critical_lab_worker_secret');
   -- Needed while critical-lab-check has verify_jwt = true in supabase/config.toml:
   -- the project's legacy anon key (a JWT) lets the request through the gateway.
   -- The function itself trusts only the secret header on the worker path.
   -- (A non-JWT publishable key does not pass verify_jwt; with only those keys,
   -- set verify_jwt = false for this function instead. It checks user JWTs itself.)
   select vault.create_secret('<legacy anon key>', 'critical_lab_worker_gateway_key');
   ```

3. **Extensions.** Enable `pg_cron` and `pg_net` in the dashboard if the migration reported them as unavailable. Then re-run the migration's last block, or the whole file (it is idempotent), to schedule the `critical-lab-escalation-worker` job.
4. **Check the job.** Run `select * from cron.job where jobname = 'critical-lab-escalation-worker';` and, after a minute, `select * from net._http_response order by created desc limit 5;`. A 401 means the worker secret does not match.
5. **On-call roster.** Fill `on_call_schedule` with `tier = 'on_call'` and `tier = 'er'` rows for each hospital. With no roster row, a level falls back to the hospital's admins, and the delivery log records that.
6. **SMS/pager.** The function's pager hook does nothing until `CRITICAL_LAB_PAGER_WEBHOOK_URL` and `CRITICAL_LAB_PAGER_WEBHOOK_TOKEN` are set. Point it only at a provider, or a relay to one, that is covered by a BAA. The message carries no PHI: only a short alert reference.
7. **Staging drill.** Enter a critical potassium value (for example 6.9) and do not acknowledge it. Expect: one row in `lab_critical_alerts`; three rows in `lab_alert_escalations`; the primary row `dispatched` within seconds; the on-call row at about 5 minutes and the ER row at about 10 minutes; a `notifications` row for each recipient; and `lab_critical_alert_events` rows for each step. Acknowledge the alert and confirm the remaining rows become `cancelled`.

## 20261105000002 (S0-10: MFA backup codes and aal2 enforcement)

### What changed in the edge functions (same commit series)

| Function | Now |
|---|---|
| `generate-2fa-secret`, `verify-2fa`, `verify-totp`, `store-2fa-secret` | **410 Gone.** TOTP is Supabase Auth MFA (`supabase.auth.mfa.enroll / challenge / verify`). The custom secret, verify and store code was removed to reduce attack surface (EDGE-05, EDGE-12). |
| `generate-backup-codes` (new) | POST, user JWT that must carry `aal: "aal2"`. Returns `{ success, codes }` once: 10 codes of 10 RFC 4648 base32 characters (50 bits each). Stores only HMAC-SHA-256 hashes keyed with `BACKUP_CODE_PEPPER`; a new set invalidates the unused old ones. |
| `verify-backup-code` | POST `{ code }`, user JWT (aal1 is fine: the user lost their device). Response `{ success: boolean }` (plus `error` when false; 429 with `retryAfterSeconds` when locked). On success it deletes the user's TOTP factors with the service role, so the user must enroll again; at aal1 an admin/doctor then sees no PHI until they do. |

The pure logic is in `supabase/functions/_shared/backupCodes.ts` (unit tests: `tests/security/backupCodes.test.ts`).

### Deployment order

Deploy in this order. Pushing to `main` deploys edge functions through Lovable, so merge the pieces together or in this order:

1. **Secrets** (step 1 below), before anything else.
2. **This migration** (after S0-01 promotes it). `verify-backup-code` and `generate-backup-codes` call `consume_mfa_backup_code` / `replace_mfa_backup_codes` and read `mfa_backup_codes`. Without the migration both return 500 (they fail closed). In that window nobody can recover with a backup code.
3. **Client on Supabase MFA** (the separate client change). Do not deploy the 410 functions before it: the current client still calls `generate-2fa-secret`, `verify-totp` and `store-2fa-secret`, so 2FA setup breaks, and users whose profile says 2FA is enabled cannot complete the login TOTP modal.
4. **Every admin and doctor enrolls a Supabase MFA factor before section D is live.** At aal1 they see 0 rows in the PHI tables. The old custom TOTP secrets in `two_factor_secrets` do not carry over: Supabase MFA cannot import them. Old backup codes (in `two_factor_secrets.backup_codes`) stop working too; users create new ones with `generate-backup-codes`.

### Operator steps

Never commit any of these values.

1. **Pepper.** Generate at least 32 random characters and set it on the functions:
   `npx supabase secrets set BACKUP_CODE_PEPPER=$(openssl rand -base64 48)`.
   Optional: `BACKUP_CODE_PEPPER_ID` (default `p1`). The pepper is not in the database, so a database dump alone cannot be brute-forced. Losing it invalidates every stored code.
   **Rotation:** set the new value as `BACKUP_CODE_PEPPER` with a new `BACKUP_CODE_PEPPER_ID` (for example `p2`). Move the old value to `BACKUP_CODE_PEPPER_PREVIOUS` with `BACKUP_CODE_PEPPER_PREVIOUS_ID=p1`. Old codes keep working until users regenerate. Remove the previous pepper when `select count(*) from mfa_backup_codes where pepper_id = 'p1' and used_at is null` is 0, or accept that those codes stop working.
2. **Auth settings.** In the dashboard (Authentication → Multi-Factor), enable TOTP enrollment and verification.
3. **Reconcile section D** against the S0-01 capture before promoting. The block adds one RESTRICTIVE policy per table instead of rewriting the unknown live policies. PostgreSQL ANDs restrictive policies with the permissive ones, so the result is "existing policies AND `mfa_satisfied()`". Check:
   - the table list (candidates to add: `documents`, `patient_consents`, `medication_administrations`, `telemedicine_sessions`, `shift_handovers`, `appointments`, `insurance_claims`, `invoices`);
   - that RLS is enabled on each table (`live_rls_summary.tsv`). The migration only warns when it is off (DB-13, S0-04);
   - edge functions that query these tables with a user-JWT client now need an aal2 token for admin/doctor callers;
   - whether writes should also need aal2. The policy is `FOR ALL`; narrow it to `FOR SELECT` only for a reviewed reason.
4. **Known client impact of section B** (S0-03 owns the fix): `PatientRegisterPage` sets `hospital_id` on self-registration and `AdminRepairTool` sets `hospital_id`. Both now fail with 42501 and must move to server code. `create-hospital-admin` and `accept-invitation-signup` use the service role or SECURITY DEFINER RPCs and are not affected.
5. **Staging check.** As a doctor with a verified factor: sign in (aal1) and confirm `GET /rest/v1/patients` returns `[]`. Complete `mfa.verify` (aal2) and confirm rows return. Call `generate-backup-codes` at aal1 (expect 403) and at aal2 (expect 10 codes). Sign in fresh, submit one code to `verify-backup-code` twice in parallel: expect exactly one `{"success":true}`, and `auth.mfa.listFactors()` is empty afterwards. As any user, `PATCH /rest/v1/profiles?user_id=eq.<self>` with `{"two_factor_enabled":true}` must return 403.

### Local test (no credentials needed)

`tests/s0-10/00000000000000_fixture.sql` is a minimal stand-in for the live schema (profiles, user_roles, seven PHI tables with hospital-membership policies, five users). `tests/s0-10/99999999999999_assertions.sql` checks the behaviour and raises on any failure. With the replay harness (applies the migration twice):

```bash
mkdir -p /tmp/s010 && rm -f /tmp/s010/*.sql
cp supabase/pending-migrations/tests/s0-10/00000000000000_fixture.sql /tmp/s010/
cp supabase/pending-migrations/20261105000002_mfa_backup_codes_and_aal2.sql /tmp/s010/
cp supabase/pending-migrations/20261105000002_mfa_backup_codes_and_aal2.sql /tmp/s010/20261105000003_reapply_same_file.sql
cp supabase/pending-migrations/tests/s0-10/99999999999999_assertions.sql /tmp/s010/
node scripts/db/replay-migrations.mjs --migrations /tmp/s010 --stop-on-error --out /tmp/s010-report
# expect: 4/4 applied; failures: 0 defect ...
```

To see the individual `PASS` lines, run the same files with `psql -v ON_ERROR_STOP=1 -1 -f` against a scratch database that has `scripts/db/supabase-compat-shim.sql` applied. For the concurrent double-submit test, open two sessions as `service_role`. In session A run `BEGIN; SELECT consume_mfa_backup_code(<user>, ARRAY[<hash>]);` and keep the transaction open. In session B run the same call: it waits on A's lock. When A commits, B returns `{"status":"invalid"}`, and exactly one row has `used_at` set.

## Known defect in an older file

`supabase/migrations/tier4_2_4_lab_workflows.sql` does not apply on its own: its policies cast `'lab_manager'` and `'er_staff'` to `app_role`, which has neither value. Its seed rows also use wrong LOINC codes for potassium (`2757-9`) and troponin (`1975-2`, which is total bilirubin). The pending migration does not depend on that file. It creates or repairs every table it needs, and it adds no seed rows.
