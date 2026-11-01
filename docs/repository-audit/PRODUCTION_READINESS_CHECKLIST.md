# Production Readiness Checklist

> CareSync HIMS repository audit, 2026-11-01. Commit `43ab8f7`. Status legend:
> - ✅ met, with evidence
> - ⚠️ partially met
> - ❌ not met
> - ❔ cannot be determined from the repository
>
> Each line cites the issue IDs that block it. **Current verdict: NOT production-ready for PHI.** 7 of 75 items are fully met.

## 1. Security & privacy

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 1.1 | Tenant isolation enforced in the database for every PHI table | ❌ | DB-01, DB-02, DB-09, DB-13 |
| 1.2 | Tenant isolation enforced in every service-role edge function | ❌ | EDGE-01, EDGE-06, EDGE-07, EDGE-08, EDGE-13, EDGE-14 |
| 1.3 | Role-based access enforced server-side (not only in UI) | ❌ | DB-02, DB-07, DB-10, FUNC-33, SECF-07 |
| 1.4 | MFA enforced server-side for privileged roles | ❌ | EDGE-05, SECF-01, SECF-02, ARCH-06 |
| 1.5 | Password policy, lockout, re-authentication for sensitive changes | ❌ | SECF-13, SECF-14, SECF-15 |
| 1.6 | Session lifetime and idle timeout enforced server-side | ⚠️ | Client-only idle logout (SECF-26). Tokens in sessionStorage (SECF-23) |
| 1.7 | No secrets in client bundle or repository (including history) | ❌ | SECF-03, SECF-19, SECF-20, OPS-13 |
| 1.8 | Secret scanning and push protection enabled | ❌ | OPS-16 (no scanning configured) |
| 1.9 | PHI not persisted on devices after logout | ❌ | SECF-04, SECF-05, SECF-06 |
| 1.10 | PHI excluded from logs and telemetry | ❌ | SECF-12, EDGE-17, EDGE-21 |
| 1.11 | Field-level encryption with key management and no decryption oracle | ❌ | EDGE-04, CLIN-05 |
| 1.12 | Audit trail complete, append-only, tenant-scoped, not forgeable | ❌ | DB-04, DB-08, EDGE-09 |
| 1.13 | Security headers and CSP at the real production host | ❔ / ❌ | Only an unused `nginx.conf` defines them, and it has defects (SECF-17). The Lovable host config is not in the repo. |
| 1.14 | Dependencies free of high/critical runtime advisories | ❌ | OPS-19 (1 critical, 9 high) |
| 1.15 | No wildcard or credentialed CORS on first-party APIs | ✅ | Edge functions use an allow-list (SECURITY_AUDIT §5). Kong config is not on the runtime path (SECF-19) |
| 1.16 | Mock/test auth cannot be enabled in production builds | ✅ | Verified by a production build with the flag set (SECF prior-claim table). Residual test code remains in prod (SECF-22) |
| 1.17 | Storage buckets scoped by tenant and role | ❌ | DB-17, SECF-24 |
| 1.18 | BAAs in place for third parties receiving PHI (AI, SMS, email) | ❔ | Not determinable. Client-side AI calls would bypass any BAA (SECF-03) |
| 1.19 | External penetration test with no open High findings | ❌ | Not performed |

## 2. Clinical safety

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 2.1 | Allergy and DDI checks on every prescribing and verification surface, fail-closed | ❌ | CLIN-01, CLIN-02, CLIN-14 |
| 2.2 | Critical lab values escalate automatically (5/10-minute ladder) | ❌ | EDGE-03 |
| 2.3 | Deterioration scoring (NEWS2) correct where clinicians see it | ❌ | CLIN-08, CLIN-12 |
| 2.4 | Medication administration guards (schedule, double-dose, BCMA) | ❌ | CLIN-13, CLIN-29 |
| 2.5 | Pharmacist-gated dispensing enforced in data layer | ❌ | CLIN-03, DB-10 |
| 2.6 | Pediatric dosing correct and wired | ❌ | CLIN-15, EDGE-19 |
| 2.7 | AI output clearly non-authoritative and not auto-written to the record | ❌ | CLIN-18 |
| 2.8 | Units explicit and consistent across roles | ❌ | CLIN-09 |
| 2.9 | Clinical safety case / hazard log signed by a clinical safety officer | ❔ | No hazard log found in the repo |

## 3. Functional completeness of core journeys

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 3.1 | Hospital onboarding and staff invitation | ❌ | FUNC-03, FUNC-21, EDGE-24 |
| 3.2 | Patient self-registration and portal | ❌ | DB-15, FUNC-30 |
| 3.3 | Scheduling without double booking, TZ-correct | ❌ | FUNC-12, FUNC-14 |
| 3.4 | Consultation documentation saved reliably and completed atomically | ❌ | CLIN-06, CLIN-07, CLIN-26 |
| 3.5 | Billing totals, tax, discounts and payments correct and auditable | ❌ | FUNC-05, FUNC-06, FUNC-07, FUNC-08, FUNC-33 |
| 3.6 | Discharge pipeline completes, including rejection and AMA paths | ❌ | CLIN-11, CLIN-28 |
| 3.7 | No mock or simulated data presented as real in production | ❌ | FUNC-11, FUNC-18, EDGE-10, CLIN-18 |
| 3.8 | No destructive QA tooling in production | ❌ | FUNC-10, ARCH-14 |
| 3.9 | Frontend–backend contract complete (no missing tables, RPCs or functions) | ❌ | DB-14, EDGE-20 |
| 3.10 | Login and core navigation work | ✅ | FUNCTIONAL_AUDIT feature table; rendered for all 7 roles in mock mode |

## 4. Data management

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 4.1 | Migrations replayable from scratch and identical to production | ❌ | DB-03, DB-21 |
| 4.2 | Generated types match the live schema | ❌ | DB-14, ARCH-02 |
| 4.3 | Point-in-time recovery enabled; restore drill performed | ❔ / ❌ | DB-18, OPS-08 |
| 4.4 | Soft delete and retention policy for PHI | ❌ | DB-11, DB-12 |
| 4.5 | Clinical state machines enforced by constraints/triggers | ❌ | DB-10 |
| 4.6 | Indexes on tenant and foreign-key filters; RLS performance reviewed | ⚠️ | DB-20 |

## 5. Quality engineering

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 5.1 | Type checking covers the application and blocks merges | ❌ | ARCH-01 (0 files checked), 35 real errors |
| 5.2 | Unit suite green and run in CI on every PR | ❌ | TEST-10, TEST-02 |
| 5.3 | E2E suite collects and runs against a real backend | ❌ | TEST-01, TEST-06 |
| 5.4 | RLS / tenant isolation tests against a real database | ❌ | TEST-04 |
| 5.5 | Edge-function authorization tests | ❌ | TEST-05 |
| 5.6 | Accessibility tests on real routes | ❌ | A11Y-16 / TEST-07 |
| 5.7 | Lint passes | ✅ | 0 errors. Rules are relaxed (MODULE_AUDIT §2) |
| 5.8 | Production build succeeds | ✅ | `vite build` exit 0, 39 s |
| 5.9 | Module boundary checks | ⚠️ | Pass, but cover about 10% of `src` (ARCH-11) |

## 6. Delivery & operations

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 6.1 | Protected `main` with required checks | ❌ | OPS-01 |
| 6.2 | CI gates are blocking (no `continue-on-error` and no `\|\| true`) | ❌ | OPS-03 |
| 6.3 | Automated deploy of DB, edge functions and frontend with environments and approvals | ❌ | OPS-04, OPS-07 |
| 6.4 | Separate staging/test Supabase project | ❌ | OPS-17, SECF-21 |
| 6.5 | Pinned runtime (Node LTS) and pinned CI actions | ❌ | OPS-10, OPS-12 |
| 6.6 | Container/hosting artifacts build and match the architecture | ❌ | OPS-05, ARCH-16 |
| 6.7 | Monitoring, alerting and SLOs wired to production | ❌ | OPS-09, PERF-12 |
| 6.8 | Error tracking with sourcemaps and PHI scrubbing | ⚠️ | Sentry wired (triple init). No sourcemaps. Scrubbing gaps (SECF-12, PERF-12) |
| 6.9 | Disaster-recovery runbook executable and tested | ❌ | OPS-08 |
| 6.10 | Rollback procedure documented and rehearsed | ❌ | OPS-07 |
| 6.11 | Health check endpoint | ✅ | `supabase/functions/health-check` exists. `nginx.conf` `/health` (unused) |

## 7. Usability & accessibility

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 7.1 | WCAG 2.1 AA contrast | ❌ | A11Y-01, A11Y-02 |
| 7.2 | Keyboard and screen-reader operability of critical flows | ❌ | A11Y-03, A11Y-04, A11Y-06, A11Y-08 |
| 7.3 | Errors never shown as valid data | ❌ | UX-01 |
| 7.4 | Confirmation for irreversible actions | ❌ | UX-02 |
| 7.5 | Responsive at 390 px | ⚠️ | UX-07 |
| 7.6 | Route-level code splitting and acceptable initial payload | ✅ | ≈308 KB gzip initial (PERFORMANCE_AUDIT §1) |

## 8. Documentation & governance

| # | Item | Status | Evidence / blocking issues |
|---|---|---|---|
| 8.1 | Architecture docs match implementation | ❌ | REPOSITORY_ARCHITECTURE §9 discrepancies |
| 8.2 | ADRs reflect and are enforced by code | ⚠️ | ARCHITECTURAL_DECISIONS.md §1 |
| 8.3 | Prior audit claims verified | ❌ | 16 of 21 "resolved" tickets reopened (IMPLEMENTATION_ROADMAP §4) |
| 8.4 | Domain glossary (CONTEXT.md) consistent with code | ⚠️ | FUNC-32 |
| 8.5 | HIPAA risk analysis, data retention and incident response documented | ❔ | Not found. `docs/HIPAA_COMPLIANCE.md` is descriptive only |

**Tally (75 items):**
- ✅ 7 met: 1.15, 1.16, 3.10, 5.7, 5.8, 6.11, 7.6.
- ⚠️ 7 partial.
- ❔ 5 not determinable from the repository (2 of them also ❌ for the in-repo part).
- ❌ 56 not met.

## 9. CI/CD and infrastructure detail

### 9.1 Workflow inventory (what actually runs)

#### 0.1 Workflow inventory (what actually runs)

| Workflow | Trigger | Last 100 runs (2026-07-01 → 2026-10-26) | What it really gates |
|---|---|---|---|
| `ci-pipeline.yml` | PR + push to main/develop | 9 runs, **0 success** | `test:unit` (src/test only), `test:security`, build. a11y `\|\| true`, Codecov/Sonar `continue-on-error`. Summary job fails only on unit/security/build. |
| `rls-validation.yml` | PR + push to main/develop + dispatch | 9 runs, **0 success** | RLS job dies with `tsx: not found` (exit 127); integration = in-memory mocks; e2e-smoke masked by `continue-on-error`; GPL/audit checks are no-ops. |
| `docker-build.yml` | PR + push (path-filtered) | 1 run, 0 success | Frontend image fails (`addgroup: group 'nginx' in use`). Builds archived microservices. |
| `deploy-production.yml` | release published + dispatch | 5 runs, 0 success | Only `supabase db push`; no frontend/edge-function deploy. |
| `automated-testing.yml` | nightly cron | 50 runs, 0 success (last run 2026-08-19) | Informational; everything `continue-on-error`. Node 18. |
| `phase4-performance-tests.yml` | weekly cron | 15 runs, 0 success | Fails at container init (`supabase/supabase` image does not exist) and `download-artifact@v3` auto-fail. |
| `soak-test.yml` | dispatch | 11 runs, 0 success (0 s each) | Invalid workflow file → GitHub records a failed run on every push. |
| `ci.yml`, `ci-cd.yml`, `test-pyramid.yml` | `workflow_dispatch` only ("retired") | — | Dead duplicates; `ci-cd.yml` "deploys" with `echo`. |

Run events in the last 100 runs: **push 35, schedule 65, pull_request 0**. Only one PR has ever been opened (#1, 2026-05-18). The single repository ruleset (`protection`, id 17399861) has `ref_name.include: []` (targets no branch) and contains only `deletion` + `non_fast_forward` rules — no required status checks, no required reviews.

### 9.2 Infrastructure and operations findings (OPS-xx)

#### OPS-01: Nothing gates merges to `main` — ruleset targets no branch, all work is pushed directly, CI has been red for 4+ months
- Severity: P1
- Category: Infrastructure
- Status: CONFIRMED
- Module: Repository governance / CI
- Location: GitHub ruleset `protection` (id 17399861); `.github/workflows/ci-pipeline.yml:3-7`; `.github/workflows/rls-validation.yml:4-9`
- Evidence:
  ```
  gh api repos/<owner>/care-harmony-hub/rulesets/17399861
  "conditions": {"ref_name": {"exclude": [], "include": []}}, "rules": [{"type":"deletion"},{"type":"non_fast_forward"}]
  gh run list -L 100 → push: 35, schedule: 65 (pull_request: 0); every workflow 0 success
  ```
- Actual behavior / Expected behavior: Actual — ruleset with empty `include` applies to no branch; no required status checks or reviews; developers push straight to `main` (only 1 PR ever); every workflow on `main` has failed continuously since at least 2026-07-01 so "red" is the normal state and carries no signal. Expected — `main` protected with required PR review and required checks (unit, security, build, RLS) that are green on `main`.
- Reproduction: `gh api repos/<owner>/care-harmony-hub/rulesets/17399861`; `gh run list -L 100 --json workflowName,conclusion,event`.
- Root cause: Ruleset created without `~DEFAULT_BRANCH` target; CI never brought to green, so no check could be made "required".
- Impact: Any change — including RLS migrations and clinical-safety logic — reaches the production branch (which Lovable deploys) with zero automated or human gate. The "All Security Gates Passed" job text ("2+ maintainers", "Clinical expert reviewed") is unenforced.
- Recommendation: Fix the ruleset to include `~DEFAULT_BRANCH` (and `develop`), require PRs with ≥1 review (CODEOWNERS for `supabase/migrations/**`, `src/modules/**`), and require a small set of *working* checks (see OPS-02/03, TEST-01/02). First get one workflow green on `main`, then mark it required.
- Effort: S
- Acceptance criteria: Direct push to `main` is rejected; a PR cannot merge unless `ci-pipeline / unit-tests`, `security-scan`, `build` and the RLS job succeed; last 10 `main` runs of the required workflow are green.


#### OPS-02: RLS validation "BLOCKING" gate cannot fail for an RLS reason — script crashes per table, passes on any DB, skips without secrets, and is not even installed
- Severity: P1
- Category: Security
- Status: CONFIRMED (executed locally + CI logs)
- Module: CI security gates / `scripts/validate-rls.ts`
- Location: scripts/validate-rls.ts:15-21, 62-69, 72-76, 89-101, 107-112; .github/workflows/rls-validation.yml:40-55; .github/workflows/deploy-production.yml:23-29; .github/workflows/ci-pipeline.yml:117-122; package.json `"validate:rls": "tsx scripts/validate-rls.ts"`
- Evidence:
  ```
  $ SUPABASE_URL=http://127.0.0.1:9 SUPABASE_SERVICE_ROLE_KEY=dummy npx tsx scripts/validate-rls.ts
  🟡 [P1] patients: Validation error: supabase.rpc(...).catch is not a function   (…×18 tables)
  ✅ PASS: No P0 findings. Review P1/P2 before next staging cycle.
  CI (rls-validation.yml, run 34571040563): "sh: 1: tsx: not found" → "Process completed with exit code 127" → next step prints "✅ RLS validation PASSED"
  ```
- Actual behavior / Expected behavior: (1) `tsx` is not a dependency (`node_modules/.bin/tsx` absent) so `npm run validate:rls` exits 127 in `rls-validation.yml`; (2) where invoked via `npx tsx`, `supabase.rpc(...)` returns a PostgrestBuilder with no `.catch` (verified `typeof builder.catch === 'undefined'`) so every table is downgraded to a P1 "Validation error" and the script exits 0 against any database, even an unreachable one; (3) with `CI` set and no secrets (all fork PRs, any repo without secrets) it `process.exit(0)`; (4) it queries `information_schema.columns` through PostgREST (not exposed), never inspects `pg_policies`, and the "permissive policy" findings are hard-coded strings; (5) the "Report RLS validation status" step tests `$?` in a fresh shell, so it always prints PASSED. Expected: a gate that fails when a PHI table lacks RLS or has a permissive/unscoped policy.
- Reproduction: Command above; `ls node_modules/.bin/tsx`; `gh run view 34571040563 --log-failed`.
- Root cause: Untested gate script; tooling dependency missing; error handling converts all errors into non-blocking severities.
- Impact: The only automated tenant-isolation control for a multi-hospital PHI system is a no-op; `deploy-production.yml` labels it "BLOCKING — pre-prod" which creates false assurance.
- Recommendation: Add `tsx` to devDependencies; rewrite the check as SQL run against a disposable DB (`supabase start && supabase db reset` in CI) querying `pg_class.relrowsecurity` and `pg_policies` (fail on missing RLS, `USING (true)`, or policies not referencing hospital scope); treat any query error as failure; fail (not skip) when required env is missing on non-fork events; delete the `$?` status step.
- Effort: M
- Acceptance criteria: Script exits non-zero when run against an unreachable DB; a test migration that disables RLS on `patients` makes the CI job fail; the job is green on current `main` only if all PHI tables pass.


#### OPS-03: Remaining CI gates are neutralised (`continue-on-error`, `|| true`, no-op checks, wrong coverage file)
- Severity: P1
- Category: Testing
- Status: CONFIRMED (static + CI logs)
- Module: CI workflows
- Location: .github/workflows/rls-validation.yml:186-207, 132, 235-241, 261-283; .github/workflows/ci-pipeline.yml:56, 61-68, 99, 101-112, 154; .github/workflows/test-pyramid.yml:181
- Evidence:
  ```
  rls-validation.yml:204  run: npm run test:e2e:smoke
  rls-validation.yml:205  continue-on-error: true
  CI log (E2E Smoke Tests): "Error: http://localhost:8080 is already used ... set reuseExistingServer:true" → job reported ✓
  rls-validation.yml:241  npm ls --depth=0 2>/dev/null | grep -i "GPL" && { ...exit 1; } || echo "✅ No GPL licenses detected"
  ci-pipeline.yml:56      npm run test:unit -- --coverage --reporter=json --outputFile=coverage.json   # → uploaded to Codecov as "coverage"
  ```
- Actual behavior / Expected behavior: E2E smoke job crashes (dev server started with `npm run dev &` on 8080 while the wait loop polls 5173 and never fails; Playwright `webServer` then refuses the occupied port) yet is green; `npm ls` output contains no license data so the GPL gate can never fail; `dependency-security` result is listed in `needs` but never checked by `all-gates-passed`; `npm audit … || true/|| echo`; a11y tests `|| true/|| echo`; Codecov receives the vitest *test-result* JSON (not coverage) with `continue-on-error` and `fail_ci_if_error: false`; Sonar step uses `if: env.SONAR_TOKEN != ''` where `SONAR_TOKEN` is defined only in the step's own `env` (LIKELY never true; observed "skipped" in run 34673812011); flaky-registry gate `continue-on-error`. Expected: every check either blocks or is explicitly labelled informational and kept out of the "gates" job.
- Reproduction: Read the listed lines; `gh run view 34673812009 --log | grep "already used"`.
- Root cause: Gates added to make pipelines "pass" rather than fixed.
- Impact: Dashboards and the "All Security Gates Passed" summary misreport E2E, a11y, dependency and licence status; vulnerable or GPL dependencies, a11y regressions and broken user journeys merge unnoticed.
- Recommendation: Remove `continue-on-error`/`|| true` from gating steps; start the app via Playwright `webServer` only (or set `E2E_BASE_URL`/`reuseExistingServer`); use `license-checker --failOn GPL` or `npx license-checker-rseidelsohn`; `npm audit --audit-level=high` without fallback (with an allowlist file); upload `coverage/lcov.info`; move Sonar token presence to job-level env; check every `needs` result in the summary job.
- Effort: M
- Acceptance criteria: Introducing a failing smoke test, a GPL dependency, a high-severity advisory or an axe violation each turns the PR check red; Codecov shows line coverage for `src/`.


#### OPS-04: `deploy-production.yml` does not deploy the application; real production deploy (Lovable) is outside any pipeline
- Severity: P1
- Category: Infrastructure
- Status: CONFIRMED (what it does) / LIKELY (deploy step always skipped)
- Module: Release pipeline
- Location: .github/workflows/deploy-production.yml:3-6, 19, 23-29, 30-37, 38-44; README.md:99, 202
- Evidence:
  ```
  - name: Deploy to Production
    if: env.SUPABASE_PROJECT_ID != '' && env.SUPABASE_ACCESS_TOKEN != ''
    env: { SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}, SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }} }
    run: |
      npx supabase link --project-ref $SUPABASE_PROJECT_ID
      npx supabase db push
  ```
- Actual behavior / Expected behavior: On release, the workflow runs `test:unit` (src/test only), build, strict tsc, the no-op RLS gate (OPS-02) and then, at most, `supabase db push` of migrations straight to production — no `--dry-run`, no `SUPABASE_DB_PASSWORD` (non-interactive `db push` needs it), no backup/PITR checkpoint, no `supabase functions deploy` for the 45 edge functions, and no frontend publish (the build artifact is discarded). The step `if:` references env vars defined only in that same step, which GitHub does not expose to the step's own `if` (LIKELY → step skipped and the job "succeeds" having deployed nothing); same for Health Check. Approval relies on the `production` environment whose protection rules could not be verified (API 403). History: 5 runs, 0 success. The actual production path is Lovable Cloud auto-publish of frontend, migrations and functions, which runs no tests. Expected: one documented pipeline that (a) gates on green CI, (b) requires approval, (c) takes a backup/PITR marker, (d) applies migrations, (e) deploys edge functions, (f) publishes the frontend, (g) smoke-tests and can roll back.
- Reproduction: static analysis; `gh run list --workflow deploy-production.yml`.
- Root cause: Two competing deploy mechanisms (Lovable vs GitHub Actions) with neither owning the full release.
- Impact: Schema changes can reach production out-of-band from code (migration/version skew), edge functions with authz fixes may never be deployed (or deployed untested via Lovable), and there is no auditable release record — a HIPAA change-management gap.
- Recommendation: Decide the system of record (ADR). If Lovable remains the publisher, make GitHub the gate (required checks + ruleset) and remove `deploy-production.yml`'s migration push; if GitHub owns releases, add job-level env for secret checks, `supabase db push --dry-run` + approval, `supabase functions deploy`, frontend publish, smoke test, and a recorded backup timestamp.
- Effort: M
- Acceptance criteria: A release produces an auditable run that shows migrations, functions and frontend versions deployed (or the workflow is deleted and the ADR documents Lovable as the only path with required pre-merge checks).


#### OPS-05: Container/K8s artefacts are broken and contradict ADR-0001 (Supabase-native SPA)
- Severity: P2
- Category: Infrastructure
- Status: CONFIRMED (Docker build failure from CI log; K8s by static analysis)
- Module: Dockerfile / docker/kubernetes / .deployment/kubernetes
- Location: Dockerfile:3, 12, 21, 28-29, 50; docker/kubernetes/deployments/app-deployment.yaml:33, 37, 51-66, 69-71; docker/kubernetes/service.yaml:16, 20, 25-63; docker/kubernetes/ingress.yaml:12-13; .deployment/kubernetes/kubernetes-deployment.yaml:58-82, 137, 296, 441; docs/adr/0001-supabase-native-backend.md
- Evidence:
  ```
  docker-build run 34365064826: "addgroup: group 'nginx' in use" → buildx failed
  "npm warn EBADENGINE package: 'vite@7.3.5'" (node:18-alpine; vite requires ^20.19 || >=22.12)
  Dockerfile:12  RUN npm ci --only=production     # vite/typescript are devDependencies → build cannot run
  app-deployment.yaml: containerPort: 8080, livenessProbe /health/live, readinessProbe /health/ready, runAsUser: 1000
  nginx.conf:24 listen 80;   only location /health exists
  ```
- Actual behavior / Expected behavior: Frontend image cannot build (duplicate `nginx` group, Node 18, prod-only install). Even if built, K8s would CrashLoop: container listens on 80 while probes/Service target 8080, probe paths don't exist, `runAsUser 1000` ≠ image user 1001, `readOnlyRootFilesystem` without a writable `/run` for nginx pid; Service maps 443→8443 (nothing listens); Ingress and HPA defined twice (ingress.yaml + service.yaml, hpa.yaml + app-deployment.yaml); ingress allows `cors-allow-origin: "*"`; image `care-harmony-hub:latest` with no registry. `.deployment/kubernetes` adds backend/job-processor/Datadog deployments for services that don't exist and a `Secret` with literal `${VAR}` placeholders (kubectl does not substitute), injecting `SUPABASE_SERVICE_ROLE_KEY` into pods. Expected: per ADR-0001, either delete these artefacts or keep one working, tested static-hosting image.
- Reproduction: `gh run view 34365064826 --log-failed`; static analysis.
- Root cause: Microservice-era infra left in place after the architecture decision.
- Impact: Operators following `docs/DEPLOYMENT.md` (which instructs `docker-compose -f docker-compose.prod.yml up -d`) cannot deploy; `tests/performance/infrastructure-performance.test.ts` "validates" these files by grep, creating false confidence.
- Recommendation: Move Kong/compose/K8s/.deployment/services to an `archive/` folder (or delete) and remove `docker-build.yml`; if a container is wanted for self-hosting: `FROM node:22-alpine`, `npm ci` (all deps), `nginxinc/nginx-unprivileged` base listening on 8080, probes on `/health`, pinned digests.
- Effort: M
- Acceptance criteria: `docker build .` succeeds in CI; or the artefacts are removed and ADR-0001 links to the archive; no doc instructs deploying Kong/microservices.


#### OPS-06: Compose files commit default credentials and expose Kong Admin API / Grafana / Postgres on all interfaces
- Severity: P2
- Category: Security
- Status: CONFIRMED
- Module: docker-compose*.yml
- Location: docker-compose.yml:10, 19, 21, 49, 73, 92, 95-96, 113, 118-119, 194, 208, 212; docker-compose.dev.yml:12, 40; docker-compose.prod.yml:6-13, 21, 78, 317, 344, 367, 387
- Evidence:
  ```
  docker-compose.yml:19   - KONG_PG_PASSWORD=<REDACTED>
  docker-compose.yml:95   - JWT_SECRET=<REDACTED>
  docker-compose.yml:96   - ENCRYPTION_KEY=<REDACTED>
  docker-compose.yml:212  - GF_SECURITY_ADMIN_PASSWORD=<REDACTED: well-known default>
  docker-compose.yml:10   - "8001:8001"    # Admin API port   (KONG_ADMIN_LISTEN=0.0.0.0:8001)
  ```
- Actual behavior / Expected behavior: Hard-coded DB/JWT/encryption secrets and a default Grafana admin password; Kong Admin API (unauthenticated in OSS) and Postgres 5432/Redis 6379 published on the host; `:latest` tags for Prometheus/Grafana/Loki/Alertmanager; the prod compose also publishes Kong admin 8001/8444/8002. `./supabase/migrations` is mounted into a plain `postgres:15` initdb (migrations depend on Supabase `auth` schema and will fail). Expected: no committed secrets, admin interfaces bound to 127.0.0.1 or not published, pinned images.
- Reproduction: static analysis.
- Root cause: Archived microservice stack retained with demo values.
- Impact: Anyone running these files on a reachable host exposes a fully writable gateway admin API and DB with known passwords; values may be reused elsewhere.
- Recommendation: Archive/delete per OPS-05; if kept, use `${VAR:?required}` with an `.env` not in git, remove admin port mappings, pin image digests.
- Effort: S
- Acceptance criteria: `grep -rE "PASSWORD=[^$]|SECRET=[^$]" docker-compose*.yml` returns nothing; no admin port bound to 0.0.0.0.


#### OPS-07: Deploy / rollback / backup scripts referenced by package.json and docs are missing or non-functional
- Severity: P2
- Category: Infrastructure
- Status: CONFIRMED
- Module: scripts, deploy-prod.sh, rollback.sh, deploy.bat, validate-staging-readiness.sh
- Location: package.json scripts `deploy:staging`, `deploy:production`, `backup`, `rollback`, `health-check`, `test:release:gates`; deploy-prod.sh:83, 110, 126, 153, 312; rollback.sh:54; validate-staging-readiness.sh (whole file); deploy.bat:6-33
- Evidence:
  ```
  MISSING scripts/deploy.sh  MISSING scripts/backup.sh  MISSING scripts/rollback.sh  MISSING scripts/health-check.sh
  test:release:gates -> npm run test:e2e:full   (script does not exist)
  deploy-prod.sh:110  npm run migrate || {        (no "migrate" script)
  deploy-prod.sh:126  PORT=$PROD_GREEN_PORT npm run preview > /tmp/green-server.log 2>&1 &
  deploy-prod.sh:312  echo "  - Grafana: http://localhost:3000 (admin/${GRAFANA_PASSWORD})"
  ```
- Actual behavior / Expected behavior: `npm run deploy:production|backup|rollback|health-check` fail immediately. `deploy-prod.sh deploy` aborts on the missing `migrate` script; otherwise it would serve production from `vite preview` (ignores `PORT`), sed-edit `/etc/nginx`, and toggle `PHASE_6_ENABLED` via `supabase secrets set` — a variable consumed nowhere in `src/` or `supabase/functions/` (kill switch is fictional). The default path launches the archived docker-compose microservices and prints the Grafana admin password to stdout/CI logs. `rollback.sh:54` `pkill -f "PORT=3001"` can never match (env vars aren't in argv). `validate-staging-readiness.sh` only checks file existence/grep counts and unconditionally prints "✅ READY FOR STAGING DEPLOYMENT". `deploy.bat` tells operators to paste 2025 migrations into the SQL editor of a hard-coded project ref. Expected: scripts that match the Lovable/Supabase architecture or none at all.
- Reproduction: `node -e` scan of package.json scripts (see audit notes); static analysis.
- Root cause: Scripts written aspirationally ("BLOCKER #3 … March 31, 2026") and never executed.
- Impact: During an incident the documented rollback/backup commands do not exist or do nothing; secrets leak to logs; staging sign-off is meaningless.
- Recommendation: Delete the fictional scripts and npm aliases; replace with a short runbook using real commands (Lovable "restore version", `supabase backups list|restore --timestamp`, `supabase functions deploy <fn>@<prev>`); never echo secrets.
- Effort: S
- Acceptance criteria: Every `npm run` alias resolves to an existing file/script; rollback runbook has been executed once in staging with recorded timings.


#### OPS-08: Disaster-recovery runbook describes a non-existent architecture and uses Supabase CLI commands that do not exist
> **Consolidation note:** this finding duplicates **DB-18** and is kept for its evidence. The register counts it once, under DB-18.

- Severity: P1
- Category: Infrastructure
- Status: CONFIRMED
- Module: docs/operations
- Location: docs/operations/DISASTER_RECOVERY_RUNBOOK.md:3, 37-53, 74-120, 249-300; docs/DEPLOYMENT.md:63-66
- Evidence:
  ```
  RTO Target: <15 minutes | RPO Target: <5 minutes
  ├── Frontend (Vercel CDN) ├── Edge Functions (Deno Deploy) └── Monitoring (Datadog)
  SECONDARY REGION (us-west-2) ├── PostgreSQL Replica … SELECT pg_promote();
  supabase backup ls --remote            supabase db restore --backup-id=$BACKUP_ID
  $ npx supabase backups --help → SUBCOMMANDS: list, restore ("Restore to a specific timestamp using PITR")
  ```
- Actual behavior / Expected behavior: Runbook assumes Vercel, Deno Deploy, Datadog, a self-managed us-west-2 streaming replica (`pg_promote` is impossible on managed Supabase), K8s deployments `caresync-backend`/`caresync-job-processor`, Zoom/Twilio failover — none exist per ADR-0001 (Lovable + Supabase). Backup commands `supabase backup ls` / `supabase db restore --backup-id` are not CLI commands (real: `supabase backups list`, `supabase backups restore --timestamp`, PITR add-on required). RTO/RPO targets have no evidence (PITR enablement, drill records). Expected: a runbook built on the real platform, with tested restore steps and measured RTO/RPO.
- Reproduction: `npx supabase backups --help`; static analysis.
- Root cause: Template runbook not adapted to the platform.
- Impact: In a data-loss or ransomware event for a hospital system, responders would follow commands that fail; RPO may actually be 24 h (daily backups) rather than 5 min, a material HIPAA contingency-plan (§164.308(a)(7)) gap.
- Recommendation: Rewrite around Supabase PITR (confirm add-on enabled), Lovable version rollback, edge-function redeploy, storage bucket backup, and auth config export; schedule quarterly restore drills into a scratch project and record RTO/RPO.
- Effort: M
- Acceptance criteria: Runbook commands execute successfully in a drill; drill log shows achieved RTO/RPO; PITR status documented.


#### OPS-09: Monitoring/alerting stack is not wired to anything that runs in production
- Severity: P2
- Category: Infrastructure
- Status: CONFIRMED
- Module: monitoring/**, src/services/metrics.ts
- Location: monitoring/prometheus.yml:5-6, 15-104; monitoring/alertmanager.yml:2-5, 16-19, 33-48; monitoring/clinical-alerts.yaml:19-23, 36-40; docker-compose.yml:215-226; src/services/metrics.ts:109, 324-352
- Evidence:
  ```
  prometheus.yml   rule_files: - "alert_rules.yml"         (clinical-alerts.yaml never loaded)
  scrape targets: kong:8001, clinical-service:3003, patient-service:3001, postgres:5432 (raw PG port), kafka:9092 …
  alertmanager.yml smtp_auth_password: '<placeholder>'  api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
  route match alertname 'HighErrorRate'  (no rule defines it; rules are KongHighErrorRate / MicroserviceHighErrorRate)
  clinical-alerts.yaml expr: caresync_lab_critical_value_latency_ms_bucket   (metric emitted nowhere in src/ or supabase/)
  ```
- Actual behavior / Expected behavior: Prometheus scrapes only archived microservices and non-exporter ports; patient-safety alerts (critical-value delay, dispensing blocked) reference metrics no code emits and aren't loaded; frontend "Prometheus" metrics live in browser memory; Alertmanager receivers are placeholders; Loki/Promtail configs referenced by compose do not exist; Grafana provisioning mounts point at wrong paths. Expected: alerting on the real runtime (Supabase logs/metrics endpoint, edge-function logs, Sentry for the SPA) with at least critical-lab-notification latency and edge-function error-rate alerts routed to on-call.
- Reproduction: static analysis; `grep -rn caresync_lab_critical_value_latency src supabase` → no hits.
- Root cause: Monitoring designed for the abandoned microservice architecture.
- Impact: No one is paged when critical-lab escalation or edge functions fail; clinical SLO dashboards are empty.
- Recommendation: Use Supabase's Prometheus-compatible metrics endpoint + log drains, Sentry alerts (DSN already supported), and emit clinical SLO events to a table/edge function that an alert can query; delete dead scrape configs.
- Effort: L
- Acceptance criteria: A synthetic failure of `critical-lab-check` raises an alert in the on-call channel within 5 minutes.


#### OPS-10: Node.js runtime is unpinned and inconsistent; CI/Docker use EOL Node 18/20 while deps require ≥20.19/22.12
- Severity: P2
- Category: Infrastructure
- Status: CONFIRMED
- Module: CI / Docker / package.json
- Location: package.json (no `engines`, no `.nvmrc`); .github/workflows/automated-testing.yml:18,45,…; phase4-performance-tests.yml:73,135; ci.yml/ci-cd.yml (node 18); ci-pipeline.yml, rls-validation.yml, deploy-production.yml, soak-test.yml (node 20); Dockerfile:3; Dockerfile.dev:2
- Evidence:
  ```
  vite engines  { node: '^20.19.0 || >=22.12.0' }   eslint { node: '^20.19.0 || ^22.13.0 || >=24' }   jsdom { node: '^20.19.0 || ^22.12.0 || >=24.0.0' }
  docker-build log: "npm warn EBADENGINE package: 'vite@7.3.5'"   (node:18-alpine)
  @types/node ^22.16.5 ; local dev v22.23.4
  ```
- Actual behavior / Expected behavior: Three Node majors across CI/Docker; Node 18 (EOL 2025-04) cannot run Vite 7; Node 20 reached EOL 2026-04. Expected: single pinned LTS (22) via `engines` + `.nvmrc`, used by every workflow (`node-version-file: .nvmrc`) and Dockerfile.
- Reproduction: `node -e "console.log(require('./node_modules/vite/package.json').engines)"`.
- Root cause: Workflows copy-pasted at different times; no engines field.
- Impact: Non-reproducible builds; nightly/perf jobs cannot build; security patches missing on EOL runtime.
- Recommendation: Add `"engines": {"node": ">=22.12 <23"}` and `.nvmrc` = 22; set `engine-strict=true` in `.npmrc`; update all workflows/Dockerfiles.
- Effort: S
- Acceptance criteria: `grep -rn "node-version: '1[0-9]'\|node-version: '20'" .github` returns nothing; `docker build` and all workflows use Node 22.


#### OPS-11: Broken, retired and duplicate workflows produce permanent red noise
- Severity: P3
- Category: Infrastructure
- Status: CONFIRMED
- Module: .github/workflows
- Location: soak-test.yml:20, 22; phase4-performance-tests.yml:56-65, 119-130, 185; docker-build.yml:11-16, 70-81, 102-106, 127-145; ci.yml, ci-cd.yml:42-43, test-pyramid.yml (dispatch-only)
- Evidence:
  ```
  soak-test.yml:22  timeout-minutes: ${{ fromJson(inputs.duration_hours) * 65 }}   → "This run likely failed because of a workflow file issue" (11 runs, 0 s)
  soak-test.yml:20  runs-on: ubuntu-latest-xl
  phase4 log: "pull access denied for supabase/supabase, repository does not exist"
  phase4 annotation: "automatically failed because it uses a deprecated version of actions/download-artifact: v3"
  docker-build.yml:133 sed -i "s|build:|image: ghcr.io/.../caresync-clinical-service:latest|g" docker-compose.yml
  ```
- Actual behavior / Expected behavior: GitHub expressions have no arithmetic, so `soak-test.yml` is invalid and fails on every push; a 24 h soak also exceeds the 6 h hosted-job limit and `ubuntu-latest-xl` is not a standard label. Phase-4 uses a non-existent image and a deprecated artifact action. `docker-build.yml` pushes images on `pull_request`, Trivy scans only the archived `clinical-service`, and `update-compose` replaces every `build:` with the clinical-service image (corrupting compose) then tries to push to `main`. Three "retired" workflows remain (`ci-cd.yml` "deploys" with `echo`). Expected: only maintained workflows in `.github/workflows`.
- Reproduction: `gh run list --workflow soak-test.yml`; `gh run view 40360588699 --log-failed`.
- Root cause: Workflows generated per "phase" and never maintained.
- Impact: Alert fatigue; masks real failures; wastes runner minutes.
- Recommendation: Delete `ci.yml`, `ci-cd.yml`, `test-pyramid.yml`, `docker-build.yml` (or fix per OPS-05), and `soak-test.yml`/`phase4` until a staging target exists; if soak is kept, run k6 against staging with ≤6 h duration.
- Effort: S
- Acceptance criteria: Every workflow file in `.github/workflows` has had a successful run in the last 30 days or is removed.


#### OPS-12: Supply-chain hygiene — unpinned `@master` actions, deprecated actions, no least-privilege `permissions:`
- Severity: P2
- Category: Security
- Status: CONFIRMED
- Module: .github/workflows
- Location: ci-pipeline.yml:104; docker-build.yml:103; phase4-performance-tests.yml:185, 210; soak-test.yml:119; ci-pipeline.yml / rls-validation.yml / automated-testing.yml / phase4 / deploy-production.yml (no top-level `permissions:`)
- Evidence:
  ```
  ci-pipeline.yml:104   uses: SonarSource/sonarcloud-github-action@master
  docker-build.yml:103  uses: aquasecurity/trivy-action@master
  actions/github-script@v6, actions/download-artifact@v3, actions/checkout@v3 (retired files)
  ```
- Actual behavior / Expected behavior: Mutable `@master` refs execute whatever the third party pushes, with access to `SONAR_TOKEN`/`GITHUB_TOKEN`; `sonarcloud-github-action` is deprecated upstream; no workflow-level `permissions: contents: read`, so the token gets the repo default (possibly write-all). Expected: SHA-pinned actions (Dependabot for updates) and explicit minimal permissions.
- Reproduction: static analysis.
- Root cause: No action-pinning policy.
- Impact: A compromised action could exfiltrate secrets (incl. service-role keys passed in the same jobs) or push to the repo.
- Recommendation: Pin all actions to full commit SHAs; replace Sonar action with `SonarSource/sonarqube-scan-action@<sha>`; add top-level `permissions: contents: read` and elevate per job; enable Dependabot for `github-actions`.
- Effort: S
- Acceptance criteria: `grep -rnE "uses: [^@]+@(master|main|v[0-9]+)$" .github/workflows` returns nothing; every workflow declares `permissions`.


#### OPS-13: Service-role key exposed to PR-triggered code; CI build uses wrong env names
- Severity: P2
- Category: Security
- Status: LIKELY (whether the unsuffixed secret is the production key cannot be verified)
- Module: ci-pipeline.yml / rls-validation.yml
- Location: .github/workflows/ci-pipeline.yml:3-7, 95-96, 117-122, 183-187; .github/workflows/rls-validation.yml:42-45, 157-160; .github/workflows/test-pyramid.yml:21-22
- Evidence:
  ```
  ci-pipeline.yml (on: pull_request) security-scan:
    run: npx tsx scripts/validate-rls.ts
    env: SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}     # rls-validation.yml uses ..._DEV
  ci-pipeline.yml:186-187  VITE_SUPABASE_URL / VITE_SUPABASE_KEY   (app reads VITE_SUPABASE_PUBLISHABLE_KEY)
  ```
- Actual behavior / Expected behavior: The unsuffixed `SUPABASE_SERVICE_ROLE_KEY` (same name used by `deploy-production.yml` under `environment: production`; `rls-validation.yml` deliberately uses a `_DEV` variant) is injected into a step that executes repository code from any same-repo PR branch after `npm ci` of all dependencies (and `npx tsx` fetched at runtime). A malicious/compromised branch or dependency can exfiltrate an RLS-bypassing key. Separately, the CI build uses `VITE_SUPABASE_KEY`/`VITE_SUPABASE_ANON_KEY`, which the app does not read, so the uploaded `dist` artifact is unconfigured. Expected: PR workflows only see a dev-project key (or none, using a local Supabase); production secrets only in an approval-gated environment.
- Reproduction: static analysis.
- Root cause: Secret naming not separated by environment.
- Impact: Potential full PHI read/write across all tenants if the production key leaks.
- Recommendation: Move the prod key to the `production` environment only; use local `supabase start` for PR checks; rename build env to `VITE_SUPABASE_PUBLISHABLE_KEY`; document the env contract.
- Effort: S
- Acceptance criteria: No `pull_request`-triggered job references a non-`_DEV` service-role secret; repo-level secrets list contains no production keys.


#### OPS-14: PWA runtime-caches Supabase API (PHI) responses for 24 h and never purges them on logout
> **Consolidation note:** this finding duplicates **SECF-04** and is kept for its evidence. The register counts it once, under SECF-04.

- Severity: P1
- Category: Security
- Status: LIKELY (config + code read; not executed in browser)
- Module: vite.config.ts (VitePWA/Workbox), AuthContext logout
- Location: vite.config.ts:40-67; src/contexts/AuthContext.tsx:296-340
- Evidence:
  ```
  urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i, handler: 'NetworkFirst',
  options: { cacheName: 'supabase-api', expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 } }
  urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i, handler: 'CacheFirst', … maxAgeSeconds: 60*60*24*7
  logout(): removes localStorage keys, clearSentryUser(), supabase.auth.signOut()  — no caches.delete('supabase-api')
  ```
- Actual behavior / Expected behavior: Every GET to PostgREST (patients, prescriptions, lab results) is stored in Cache Storage keyed by URL only (Authorization header not part of key); storage objects (documents/images) cached 7 days CacheFirst. Logout does not clear these caches. On a shared ward workstation, a subsequent user going offline (or any NetworkFirst fallback after a network error) can be served the previous user's PHI for the same URL; PHI persists on disk after logout. Expected: never cache authenticated API/storage responses (or cache only explicitly non-PHI reference data) and purge all caches on logout/session expiry.
- Reproduction: Build, log in as user A, view a patient list, log out, go offline, log in as user B (mock) and load the same route; inspect DevTools → Cache Storage `supabase-api`.
- Root cause: Generic PWA recipe applied to a PHI application.
- Impact: Cross-user PHI disclosure and PHI at rest on shared clinical devices (HIPAA §164.312(a)(2)(iv)/(c)).
- Recommendation: Remove the two `runtimeCaching` entries (or restrict to public reference endpoints with `NetworkOnly` for `/rest/v1/` and `/storage/v1/object/authenticated`); call `caches.delete` for runtime caches in `logout` and session-timeout; add a Playwright test asserting Cache Storage is empty after logout. (Coordinate with the security/PWA auditor — may duplicate.)
- Effort: S
- Acceptance criteria: After logout, `await caches.keys()` contains no `supabase-*` caches; API responses are not present in Cache Storage at any time.


#### OPS-15: Production security headers are defined only in an unused nginx.conf; that config itself has defects
> **Consolidation note:** this finding duplicates **SECF-17** and is kept for its evidence. The register counts it once, under SECF-17.

- Severity: P2
- Category: Security
- Status: SUSPECTED (production headers depend on Lovable hosting, not visible in repo) / CONFIRMED (nginx.conf content)
- Module: nginx.conf, hosting
- Location: nginx.conf:16-21, 30-33, 36-38, 41-45; index.html:24-27; vite.config.ts:151-158; public/ (no `_headers`)
- Evidence:
  ```
  nginx.conf:21  Content-Security-Policy "… script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; … font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
  index.html:27  <link href="https://fonts.googleapis.com/css2?family=…" rel="stylesheet" />
  nginx.conf:30-32 location ~* \.(js|css|…)$ { expires 1y; add_header Cache-Control "public, immutable"; }
  ```
- Actual behavior / Expected behavior: The real host (Lovable) has no headers config in the repo, so CSP/HSTS/X-Frame-Options in production are unverified (dev server sets them; nginx image is never deployed). In nginx.conf: CSP blocks the Google Fonts the app loads and any Sentry/GlitchTip/OTLP endpoint; `'unsafe-inline' 'unsafe-eval'` negate XSS protection; `add_header` inside `location` blocks drops all server-level security headers for assets and `/health`; `sw.js`/`registerSW.js` match the 1-year `immutable` rule and `index.html` has no `no-cache`, risking stale app shells; deprecated `X-XSS-Protection`; `server_tokens` not disabled. Expected: verified production headers (curl evidence) and a CSP that matches actual origins without `unsafe-eval`.
- Reproduction: `curl -sI https://<prod-domain>/` (not possible from audit sandbox); static analysis of nginx.conf.
- Root cause: Header policy authored for a hosting path that isn't used.
- Impact: Clickjacking/XSS hardening possibly absent in production; stale-shell issues after deploys if nginx is ever used.
- Recommendation: Capture production response headers; configure them at the actual host (Lovable custom domain/proxy or a CDN rule); fix nginx with `include` of a shared headers snippet per location, `location = /index.html` and `/sw.js` with `Cache-Control: no-cache`, CSP with font/Sentry origins and no `unsafe-eval`.
- Effort: S
- Acceptance criteria: `curl -I` on production shows CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, `nosniff`; securityheaders.com grade ≥ A.


#### OPS-16: Secrets hygiene — historical `.env` with PHI encryption key, client-bundle `VITE_*` secrets, no secret scanning
> **Consolidation note:** this finding duplicates **SECF-03** and is kept for its evidence. The register counts it once, under SECF-03.

- Severity: P2
- Category: Security
- Status: CONFIRMED (history/static); overlaps with security auditor
- Module: git history, src/** env usage, .husky
- Location: commit ff2ea46 `.env` (removed in 791c933); src/services/ai/clinicalAIService.ts:7,12; src/services/ai/predictiveAnalyticsService.ts:6; src/utils/smsService.ts:56; src/hooks/useAIMetrics.ts:185; scripts/seed-e2e-data.mjs:11-12, 18; scripts/create-test-users.js:52-112, 152; .env.test:7; .husky/pre-commit
- Evidence:
  ```
  git show ff2ea46:.env → VITE_ENCRYPTION_KEY="<REDACTED>"  VITE_API_KEY="<REDACTED>"  VITE_SUPABASE_PUBLISHABLE_KEY="<REDACTED>"
  smsService.ts:56  this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN || null;
  clinicalAIService.ts:12  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY
  seed-e2e-data.mjs:12  process.env.SUPABASE_ANON_KEY || '<REDACTED JWT>'
  ```
- Actual behavior / Expected behavior: A `.env` containing a "PHI field-level encryption key" was committed (still in history; shallow clone shows ≥1 commit); code expects provider secrets (OpenAI, Anthropic, Twilio auth token, Lovable API key) as `VITE_*` vars, which Vite inlines into the public JS bundle if set; seed scripts embed a fallback JWT and a shared test password; no gitleaks/trufflehog in CI or pre-commit. Expected: no secrets in history or bundle; provider calls via edge functions; automated secret scanning.
- Reproduction: `git log --all --oneline -- .env`; `git show ff2ea46:.env` (values redacted here).
- Root cause: Client-side integration shortcuts; no scanning.
- Impact: Any configured provider key is public; historical encryption key could decrypt data if it was ever used.
- Recommendation: Rotate anything that was in the historical `.env`; purge history (`git filter-repo`) per `scripts/scrub-git-secrets.ps1`; move provider calls server-side; add `gitleaks` to pre-commit and CI; add a build-time check that fails if `VITE_*(SECRET|TOKEN|API_KEY)` vars are defined for production.
- Effort: M
- Acceptance criteria: `gitleaks detect` on full history is clean; `dist/` contains no provider keys; CI has a secret-scanning job.


#### OPS-17: Tests and seed scripts run against whatever Supabase `.env` points to — the single Lovable (production) project — with no isolated test backend
> **Consolidation note:** this finding duplicates **SECF-21** and is kept for its evidence. The register counts it once, under SECF-21.

- Severity: P2
- Category: Infrastructure
- Status: SUSPECTED (depends on developer `.env`; repo has one project ref and no test project/local stack in CI)
- Module: tests/security/*, tests/api/*, tests/e2e/global-setup-seed.ts, scripts/seed-*.mjs, scripts/create-test-users.js
- Location: supabase/config.toml:1; tests/security/authentication.test.ts:10-13; tests/e2e/global-setup-seed.ts:41-43, 280-301; scripts/create-test-users.js:17-28, 40; scripts/seed-test-data.mjs:51-68
- Evidence:
  ```
  config.toml:1  project_id = "<project-ref>"       (only project referenced anywhere)
  authentication.test.ts:10  await supabase.auth.signUp({ email: 'test@example.com', password })
  global-setup-seed.ts:282   supabaseQuery('profiles', staffJwt, 'POST', { user_id, hospital_id, … })
  create-test-users.js       createClient(envVars.VITE_SUPABASE_URL, serviceRoleKey) → admin.createUser(… password: '<REDACTED>')
  ```
- Actual behavior / Expected behavior: Vitest loads `.env` in test mode, so locally `npm run test:security` / `test:api` call `auth.signUp`, PostgREST and edge functions on the developer's configured project; Playwright `e2e-full` global setup creates hospitals/profiles/roles; seed scripts create users with a shared password using the service-role key. For a Lovable project this is the production backend. In CI the same tests silently hit `stub.supabase.co` (see TEST-04). Expected: tests target a disposable local Supabase (`supabase start`) or a dedicated staging project, and scripts refuse to run against production.
- Reproduction: static analysis; inspect `.env` on a developer machine.
- Root cause: No environment separation for testing.
- Impact: Synthetic users/patients/role grants with known passwords in production; test traffic in audit logs; potential privilege paths (seeded admin users).
- Recommendation: Add `supabase start && supabase db reset` to CI and a `.env.test` pointing to `http://127.0.0.1:54321`; guard scripts with `if (url.includes(PROD_REF)) throw`; audit production for `@test`/`TestPass` accounts.
- Effort: M
- Acceptance criteria: Seed/test scripts abort with a clear error when pointed at the production ref; CI integration/security suites run against a local Supabase.


#### OPS-18: Local quality gates are thin and code-reviewer tooling is unwired
- Severity: P4
- Category: Technical debt
- Status: CONFIRMED
- Module: .husky, .lintstagedrc, .code-reviewer.json
- Location: .husky/pre-commit:1-3; .lintstagedrc:1-3; .code-reviewer.json:59-64; package.json `review:*`, `validate:all`
- Evidence:
  ```
  .husky/pre-commit: npx lint-staged / npm run type-check / npm run lint:boundaries
  .lintstagedrc: { "*": "prettier --ignore-unknown --write" }
  ```
- Actual behavior / Expected behavior: Pre-commit runs prettier on every staged file (incl. SQL migrations) and a full `tsc`, but no ESLint, no related tests, no secret scan; `.code-reviewer.json` (`failOnSeverity: high`) is not invoked by any workflow; `validate:all` uses `npm run test` (watch mode in a TTY). Expected: fast staged-file ESLint + `vitest related --run` + gitleaks.
- Reproduction: static analysis.
- Root cause: Hooks assembled ad hoc.
- Impact: Low; slower commits without corresponding protection.
- Recommendation: lint-staged: `eslint --max-warnings=0` for `*.{ts,tsx}`, `vitest related --run`; add gitleaks; drop or wire the code-reviewer config.
- Effort: S
- Acceptance criteria: Committing a file with an ESLint error or a fake AWS key is blocked locally.

---

#### OPS-19: 42 known-vulnerable dependency versions, including runtime packages (critical DOMPurify via jsPDF, React Router open redirect)
- Severity: P2
- Category: Security
- Status: CONFIRMED (`npm audit --json`, 2026-11-01)
- Module: Dependencies
- Location: package.json; package-lock.json
- Evidence:
  ```
  { info: 0, low: 4, moderate: 28, high: 9, critical: 1, total: 42 }
  critical dompurify (transitive) — DOMPurify IN_PLACE hook removal XSS
  moderate react-router-dom (direct) — open redirect via backslash / open redirect leading to XSS
  high zod (direct), vite (direct), postcss (direct), @faker-js/faker (direct)
  ```
- Actual behavior: Runtime-reachable advisories (dompurify through jspdf's HTML export, react-router-dom, zod) ship in the production bundle. The `overrides` pin `dompurify ^3.3.1`, which is still in the affected range. CI runs `npm audit` with `|| true` (OPS-03).
- Expected behavior: There are no high or critical advisories in runtime dependencies, and the audit gate blocks on them.
- Reproduction: `npm audit --json`.
- Root cause: No dependency update cadence or blocking audit gate.
- Impact: XSS and open-redirect exposure in a PHI application. Build-time advisories affect developer machines and CI.
- Recommendation: `npm audit fix` for the non-major fixes; bump the dompurify override, react-router-dom and zod (assess the v4 migration). Add Renovate/Dependabot and a blocking `npm audit --omit=dev --audit-level=high` in CI.
- Effort: M
- Acceptance criteria: `npm audit --omit=dev --audit-level=high` exits 0 in CI.
