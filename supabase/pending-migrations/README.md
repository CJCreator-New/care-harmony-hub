# Pending migrations

SQL in this folder is **not applied automatically**. The Supabase CLI reads only `supabase/migrations/`, and the Lovable sync does the same, so nothing here reaches a database until an operator moves it.

The folder exists because the live schema has not been reconciled with the migration history yet (roadmap task **S0-01**; see `docs/repository-audit/IMPLEMENTATION_ROADMAP.md`). Until the live baseline exists, a new migration in `supabase/migrations/` could be applied to a database whose shape nobody has verified. Fixes that need schema changes wait here, written to be idempotent, and are promoted once S0-01 is done.

## Files

| File | Task | What it does |
|---|---|---|
| `20261105000001_critical_lab_escalation_queue.sql` | S0-08 (EDGE-03, CLIN-10) | Makes the Critical Lab Escalation Queue work: `lab_critical_alerts` keyed to `lab_orders`, fail-closed `review_required` severity, one open alert per order, acknowledgement columns, non-recursive RLS; `lab_alert_escalations` with a `processing` status, retry bookkeeping and one row per (alert, level); `on_call_schedule`; append-only `lab_critical_alert_events` audit rows from triggers; a pg_cron job (every minute) that calls the `critical-lab-check` worker through pg_net with a secret read from Vault. |

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

## Known defect in an older file

`supabase/migrations/tier4_2_4_lab_workflows.sql` does not apply on its own: its policies cast `'lab_manager'` and `'er_staff'` to `app_role`, which has neither value. Its seed rows also use wrong LOINC codes for potassium (`2757-9`) and troponin (`1975-2`, which is total bilirubin). The pending migration does not depend on that file. It creates or repairs every table it needs, and it adds no seed rows.
