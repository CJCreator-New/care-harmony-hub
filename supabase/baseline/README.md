# Live-schema baseline (audit task S0-01)

The migrations in `supabase/migrations/` cannot rebuild the production database. Replaying them from empty fails on the first file, and the 2026-03 and 2026-09 hardening migrations are rejected by PostgreSQL. The evidence is in [REPLAY_FINDINGS_2026-11-05.md](./REPLAY_FINDINGS_2026-11-05.md). The only trustworthy description of the database is therefore the live database itself.

This folder holds the procedure and the artifacts for replacing the migration history with a **baseline captured from production**, after which every new migration must replay cleanly in CI. Related audit items: DB-03, DB-14, DB-21 and ARCH-02 (the repository audit register, removed; see git history), and ADR-0007 (proposed).

## Tools

| Script | Needs | Does |
|---|---|---|
| `scripts/db/replay-migrations.mjs` (`npm run db:replay`) | PostgreSQL ≥15 server binaries. No credentials. | Applies the migrations to a throwaway cluster in Supabase CLI order and reports every failing file, classified as defect / ordering / cascade / environment. Modes: `--stop-on-error` (CLI-faithful), `--multipass` (diagnostic), `--migrations <dir>`. |
| `scripts/db/supabase-compat-shim.sql` | — | Minimal Supabase objects (`auth`, `storage`, roles, realtime publication) for the replay. **Never apply this to a Supabase project.** |
| `scripts/db/capture-live-schema.sh` (`npm run db:capture-live`) | `SUPABASE_DB_URL`, `pg_dump`/`psql` at least as new as the server | Read-only, schema-only capture of the live database plus catalog inventories (migration history, RLS, SECURITY DEFINER grants, storage, auth triggers) and a secrets scan. |
| `scripts/db/compare-migration-history.mjs` | a capture | Lists which repository migrations ran live, which never ran, and which live versions have no file. |
| `scripts/db/build-baseline.mjs` | a capture | Turns the capture into a single `<version>_live_baseline.sql` migration. It strips psql meta-commands and session `SET`s, then folds in auth triggers, storage buckets and policies. |

## Procedure

Steps 1–3 are read-only and safe to run at any time. Step 5 changes migration *history bookkeeping* in production (not the schema). It needs a reviewed PR and a maintenance note.

### 1. Capture (operator with database access)

Use a read-only role where possible. Create one once in the SQL editor (pick and store a strong password; do not commit it):

```sql
CREATE ROLE audit_reader LOGIN PASSWORD '<choose-a-strong-password>' NOINHERIT;
GRANT pg_read_all_data TO audit_reader;          -- catalog + schema visibility (no writes)
GRANT USAGE ON SCHEMA supabase_migrations TO audit_reader;
GRANT SELECT ON supabase_migrations.schema_migrations TO audit_reader;
```

If your plan does not allow granting `pg_read_all_data`, use the project's standard `postgres` connection string instead. The script only issues `pg_dump --schema-only` and catalog `SELECT`s (pg_dump takes brief `ACCESS SHARE` locks; run it outside peak hours).

Then, from a machine with PostgreSQL client tools at least as new as the server major version:

```bash
export SUPABASE_DB_URL='postgresql://audit_reader:...@<pooler-host>:5432/postgres?sslmode=require'   # never committed or printed
# optional, to regenerate types without Docker:
export SUPABASE_PROJECT_REF=<project-ref> SUPABASE_ACCESS_TOKEN=<personal access token>
npm run db:capture-live            # writes supabase/baseline/live-<UTC date>/
```

### 2. Review the capture for secrets

Read `SECRETS_SCAN.txt` and skim function bodies in `live_public_schema.sql`. Function bodies can embed keys. Redact or rotate anything found **before** committing. The capture contains schema only, never row data.

### 3. Compare and record the drift

```bash
node scripts/db/compare-migration-history.mjs supabase/baseline/live-<date>/live_migration_history.tsv \
  --md supabase/baseline/live-<date>/HISTORY_DIFF.md
awk -F'\t' '$2 == "f"' supabase/baseline/live-<date>/live_rls_summary.tsv      # public tables with RLS off
```

Answer these from the capture and record the answers in the S0-01 ticket (removed with `.scratch/`; see git history):

- Which tables in `live_rls_summary.tsv` have RLS off (DB-13)?
- Does `user_belongs_to_hospital` in the dump check `is_active` (DB-03)?
- Do `anon`/`authenticated` hold EXECUTE on `purge_old_audit_logs_staging_only` (`live_security_definer.tsv`, DB-04)?
- Which audit "fixes" never ran (`HISTORY_DIFF.md`)?

These answers turn several "Likely" findings into Confirmed or closed.

Then commit the capture folder in a PR titled `chore(db): capture live schema <date>`.

### 4. Build the baseline and verify it replays

```bash
node scripts/db/build-baseline.mjs supabase/baseline/live-<date> --version <YYYYMMDDHHMMSS>
mkdir -p /tmp/baseline-check && cp supabase/baseline/live-<date>/<version>_live_baseline.sql /tmp/baseline-check/
node scripts/db/replay-migrations.mjs --migrations /tmp/baseline-check --stop-on-error --out /tmp/baseline-report
```

The replay must exit 0. If it does not, fix the builder, not the dump. Choose a version later than every version in `live_migration_history.tsv`.

### 5. Squash (reviewed PR plus one production bookkeeping command)

1. `git mv supabase/migrations/*.sql supabase/migrations_archive/`, and move `supabase/migrations/legacy` and `supabase/migrations/phase5` there too. The CLI only reads `supabase/migrations/`.
2. Add the built `<version>_live_baseline.sql` to `supabase/migrations/`.
3. Copy `types.generated.ts` over `src/integrations/supabase/types.ts`, and remove the `query-helper` path remap in `tsconfig.app.json` as a follow-up (ARCH-02, roadmap S2-03).
4. Run `npm run db:replay -- --stop-on-error`. It must exit 0. CI runs it too (`.github/workflows/db-migration-replay.yml`).
5. After the PR merges, tell the production migration history that the baseline is already applied and the archived versions are retired, so `supabase db push` never re-runs them:

   ```bash
   npx supabase migration repair --db-url "$SUPABASE_DB_URL_ADMIN" --status applied <baseline-version>
   npx supabase migration repair --db-url "$SUPABASE_DB_URL_ADMIN" --status reverted <each archived version listed in live_migration_history.tsv>
   ```

   This only edits `supabase_migrations.schema_migrations`. It does not run any DDL.

### 6. Rules from now on

- Every schema change is a new migration on top of the baseline. **Never edit an applied migration.**
- To change a function's parameter names or return type, use `DROP FUNCTION … ; CREATE FUNCTION …`, not `CREATE OR REPLACE` (the root cause of DB-03).
- Each migration must pass `npm run db:replay -- --stop-on-error` locally and in CI before merge.
- Re-capture after any emergency change made in the dashboard, so drift is caught (`compare-migration-history.mjs` shows live-only versions).

## What S0-01 does *not* do

S0-01 does not re-apply the intended hardening: active-user checks, the billing boundary, audit immutability. Those become **new** migrations on top of the baseline in S0-03 and S0-04, written and tested against the real schema. The archived files are history, not a to-do list.
