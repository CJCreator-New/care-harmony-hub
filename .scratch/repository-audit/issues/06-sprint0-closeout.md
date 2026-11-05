# 06: Sprint 0 close-out — what is in code, what is operator work

Status: ready-for-human

All Sprint 0 code work is on `main` (merged from `ccr-2602d823-jeymkf`). Verified before merge: `npm run type-check` exit 0 (919 files); vitest 4022 tests, the same 48 pre-existing failures as before Sprint 0, no new ones; boundaries clean; build OK; client-secret and canary-bundle scans clean; service worker caches no Supabase responses.

## Pending migrations (apply in order, after S0-01 baseline, on staging first)
1. `20261105000005_neutralize_destructive_endpoints.sql` — no dependencies; apply now (audit-purge RPC is anon-callable until then).
2. `20261105000001_critical_lab_escalation_queue.sql` (S0-08)
3. `20261105000002_mfa_backup_codes_and_aal2.sql` (S0-10) — every admin/doctor enrolled MFA first
4. `20261105000003_lock_tenant_key.sql` (S0-03)
5. `20261105000004_role_aware_rls.sql` (S0-04) — run its pre-flight queries; dry run in abort mode
Each has a README (`supabase/pending-migrations/<number>.README.md` or the shared README).

## Operator actions (priority order)
1. Delete production test accounts and the test tenant (S0-11 runbook §3).
2. Enable TOTP MFA and "Confirm email" in Supabase Auth.
3. Rotate keys (S0-11 runbook), revoke provider keys ever set in Lovable env (S0-09).
4. Set function secrets: `BACKUP_CODE_PEPPER`, `CRITICAL_LAB_WORKER_SECRET`, `NOTIFICATION_FROM_ADDRESS`; redeploy functions; `supabase functions delete backup-manager`.
5. S0-01 live capture → baseline → apply the migrations above.
6. On-call rota, BAA pager provider, critical-lab staging drill (S0-08); sign off the telephone SOP.
7. Staging smoke test `npm run test:e2e:staging:clinical` (S0-07).
8. GitHub secret scanning + push protection; history purge last.
