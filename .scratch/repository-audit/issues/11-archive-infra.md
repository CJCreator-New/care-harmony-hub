# 11: S2-06 archive non-runtime infrastructure (ADR-0001)

Status: ready-for-human

Branch: `worktree-agent-a41be9cada8987179`, based on `a0371b6`. Nothing pushed; `main` untouched.
`supabase/` and `src/` are unchanged, and `package.json` dependencies are unchanged.

## Per issue

| Issue | Status | Resolution |
|---|---|---|
| ARCH-16 | done | `services/`, `kong.yml`, compose files, `monitoring/`, k8s manifests, `deploy-prod.sh` and `mobile-app/` moved under `archive/`. `archive/README.md` explains why and how to restore. No CI workflow referenced a moved path (`grep -rn services/ .github/` is empty). README links to the archive or to existing docs. The prompt files, `skills-lock.json`, `.kilo` and `.lovable/plan.md` were not moved (not in S2-06 scope; see follow-ups). |
| OPS-05 | done | Same move. Root `Dockerfile` kept because CI builds it; its fix-or-delete decision belongs to S5-01. |
| DB-19 | done (archived) | The parallel schema in `archive/services/*/migrations` and `archive/services/*/supabase/migrations` is archived with the services. No migration under `supabase/` was changed or deleted. |
| SECF-19 | done | Kong config had no wildcard origin or literal key before this change (S0-11). Remaining fixes: `CORS_ORIGIN` default `*` changed to `http://localhost:5173` in the appointment and clinical services (both use `credentials: true`), and the k8s ingress `cors-allow-origin: "*"` changed to the exact production origin. `git grep -n vercel.app` in code now returns only the exact production origin `https://care-harmony-hub.vercel.app` in `archive/kong.yml`. Docs also mention the origin, and audit docs quote the old wildcard. No wildcard origin remains. |
| OPS-06 | done | No literal credential in the moved files (`${VAR:?}` placeholders throughout; scan for JWT, Stripe, AWS, Slack, PEM and Loggly formats is clean). Grafana, Prometheus, Alertmanager, Loki, Kafka and the clinical port in `archive/docker-compose.yml` now bind to `127.0.0.1`. Kong admin, Postgres and Redis were already loopback-bound. |

## Moved paths (`git mv`, 152 renames, history kept)

| Original | Archived to |
|---|---|
| `services/` (incl. `services/*/migrations`, `services/*/supabase/migrations`, Dockerfiles) | `archive/services/` |
| `mobile-app/` | `archive/mobile-app/` |
| `kong.yml` | `archive/kong.yml` |
| `docker-compose.yml`, `docker-compose.prod.yml`, `docker-compose.dev.yml` | `archive/` |
| `monitoring/` | `archive/monitoring/` |
| `.deployment/` | `archive/.deployment/` |
| `docker/` (kubernetes manifests) | `archive/docker/` |
| `deploy-prod.sh` | `archive/deploy-prod.sh` |
| `scripts/render-kong-config.sh`, `scripts/init-kong.sh`, `scripts/test-rate-limiting.{sh,ps1}`, `scripts/test-response-caching.{sh,ps1}` | `archive/scripts/` |

The layout mirrors the root, so relative paths inside archived files still resolve on restore.

## Updated references

| File | Change |
|---|---|
| `vitest.config.ts` | `exclude` `services/**` to `archive/**`. Otherwise archived `*.test.ts` would run. |
| `vitest.integration.config.ts` | same exclude change |
| `.gitignore` | `services/**/dist/` to `archive/services/**/dist/`; comment path for `render-kong-config.sh` |
| `.gitleaks.toml` | comment path only. The regexes are unanchored, so they still match `archive/docker-compose*.yml` and `archive/scripts/test-*.sh`. |
| `.env.example` | comment paths |
| `validate-staging-readiness.sh` | `deploy-prod.sh` check now reads `archive/deploy-prod.sh`. It still passes, but the echo says it is archived. |
| `rollback.sh` | hint text `bash deploy-prod.sh deploy` to `bash archive/deploy-prod.sh deploy` |
| `scripts/validate-caching.ps1` | hint text path |
| `README.md` | Option 1 (compose) removed; prerequisites and docs hub updated. Broken links fixed: Architecture, API, Contributing, Changelog rows, the `PHASES_*`/`CHANGELOG` lines, and the skill/IMPLEMENTATION_GUIDE hub links. Archive row added. |
| `docs/INDEX.md` | new "Archive" section linking `../archive/README.md` |
| `docs/DEPLOYMENT.md` | compose deploy command replaced with an archive note |
| `docs/product/SYSTEM_ARCHITECTURE.md` | dev-start compose steps removed |
| `docs/operations/SECRET_ROTATION_AND_HISTORY_PURGE.md` | section 4.3, the checklist grep and the template-rendering note now use `archive/` paths. The per-secret history table still lists pre-move locations on purpose. |
| `docs/ENHANCEMENT_MASTER_PLAN.md` | `mobile-app/` path |

Left as is, on purpose: `docs/adr/0001` (ADRs are not rewritten), `docs/repository-audit/*` (audit snapshots), `docs/PRODUCTION_READINESS_REPORT.md` (dated report), and `src/services/*` (unrelated).

## Verification (this branch)

| Check | Before (`a0371b6`) | After |
|---|---|---|
| `npm run type-check` | exit 0 | exit 0 |
| `npm run lint:boundaries` | exit 0 (229 modules, 813 deps) | exit 0 |
| `node scripts/security/check-client-secrets.mjs` | exit 0 | exit 0 |
| `npm run build` (stub `VITE_SUPABASE_URL` / publishable key) | not run | exit 0 |
| `npx vitest run --exclude '.claude/**'` failing entries | 48 unique FAIL entries | 53 unique; 5 new (below) |
| `scripts/link-checker.mjs` (repo-wide) | 166 broken links | 166, unchanged; none in README or archive (the checker does not scan README; see follow-ups) |

Vitest, 5 new failing entries:

- `tests/performance/infrastructure-performance.test.ts`, 4 entries: INFRA-K8S-004, INFRA-MON-001, INFRA-MON-002 and INFRA-MON-004. These assert that `docker/kubernetes` and `monitoring/` exist at the repo root, so they fail now because those paths are archived. The test is not owned by this change and was not edited.
- `tests/performance/frontend-performance.test.ts` PERF-DEP-005: a 15 s timeout inside `npm audit`. It passes when the file runs alone (`npx vitest run tests/performance/frontend-performance.test.ts`, exit 0). This is a timing flake under full-suite load, not caused by the move, since the root lockfile is unchanged.

Reference grep after the change (excluding `archive/`, `docs/repository-audit`, `docs/adr`, lockfiles, `src/`, `supabase/`) leaves only historical or generic text, plus the follow-ups below.

## Follow-ups (not done here)

1. `tests/performance/infrastructure-performance.test.ts` (4 new failures; line ~420 reads `kong.yml`). Archive or delete these cases under S2-02, or point them at `archive/`.
2. `scripts/start-local-db.sh` and `.ps1`, docker-compose mode: they still start the root `docker-compose.yml`, which no longer exists at root.
3. `scripts/phase1-backend-audit.mjs` (line 249) reports on the `services/` directory, which no longer exists at root.
4. `tests/performance/README.md:207` cites `docker/kubernetes/deployments/*.yaml`.
5. Root `Dockerfile` and `Dockerfile.dev` (`node:18`, below the Vite 7 engine floor) need the S5-01 hosting decision. `docker build .` was not run here.
6. `eslint.config.js` does not ignore `archive/`, so archived TypeScript is still linted by `npm run lint`, as `services/` was before. Adding `**/archive/**` to `ignores` is a one-line follow-up outside this ownership.
7. ARCH-16 items outside S2-06 scope: `Prompt for review.md`, `prompt for testing`, `skills-lock.json`, `.kilo/`, `.lovable/plan.md`. Not moved.
8. The repo-wide link checker reports 166 broken links, all in other docs (`docs/COMPREHENSIVE_AUDIT_REPORT.md` 96, `docs/ENHANCEMENT_MASTER_PLAN.md` 23, `docs/SYSTEM_ARCHITECTURE.md` 14, and others). None is in the README or the archive. Pre-existing; not addressed here.
9. The README's `/hospital/signup` link is an app route, not a file, so it is intentionally not a file link.
