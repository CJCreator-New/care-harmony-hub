# 01: S0-01 Establish ground truth (live schema capture and replayable baseline)

Status: ready-for-human
Type: task
Roadmap: S0-01 (docs/repository-audit/IMPLEMENTATION_ROADMAP.md)
Issues: DB-03, DB-14, DB-21, ARCH-02
Blocks: S0-03, S0-04, S0-08, S1-01, S1-02, S1-04, S1-08, S5-01

## Goal

A migration history that rebuilds the production schema from an empty database, verified in CI, plus generated types that match production.

## Done (2026-11-05, agent)

- [x] `scripts/db/replay-migrations.mjs` + `scripts/db/supabase-compat-shim.sql`: execute the migrations on vanilla PostgreSQL in Supabase CLI order (`npm run db:replay`).
- [x] Executed evidence: 0/64 files apply in CLI order. Both hardening migrations are rejected by PostgreSQL (`cannot change name of input parameter "_user_id"`). See `supabase/baseline/REPLAY_FINDINGS_2026-11-05.md`.
- [x] `scripts/db/capture-live-schema.sh` (`npm run db:capture-live`): read-only, schema-only capture plus catalog inventories and a secrets scan. Tested against a local cluster.
- [x] `scripts/db/compare-migration-history.mjs`: live history vs repository files.
- [x] `scripts/db/build-baseline.mjs`: capture → single baseline migration. Tested: capture → build → replay from empty exits 0.
- [x] `.github/workflows/db-migration-replay.yml`: CI replay on migration changes. **Red until step 5 below.**
- [x] Runbook: `supabase/baseline/README.md`.

## Remaining (needs someone with production database access)

- [ ] Step 1: run `npm run db:capture-live` with `SUPABASE_DB_URL` (read-only role preferred).
- [ ] Step 2: review `SECRETS_SCAN.txt` and function bodies, then commit the capture folder.
- [ ] Step 3: run `compare-migration-history.mjs` and record the answers below.
- [ ] Step 4: build the baseline. `replay-migrations.mjs --migrations <dir-with-baseline> --stop-on-error` must exit 0.
- [ ] Step 5: squash PR (archive the old migrations, add the baseline, replace `types.ts`), then `supabase migration repair` on production.
- [ ] After the merge: `db-migration-replay` CI job is green. Mark the job as a required check (S1-07).

## Questions the capture must answer (fill in at step 3)

- Live versions recorded / repository files that never ran / live-only versions:
- Public tables with RLS off (DB-13):
- Does live `user_belongs_to_hospital` check `is_active`? (DB-03; expected: no)
- `anon`/`authenticated` EXECUTE on `purge_old_audit_logs_staging_only`? (DB-04)
- Invoice policies: who can read/update `invoices`? (DB-07)
- Storage policies on the `documents` / telemedicine buckets (DB-17, SECF-24):

## Comments
