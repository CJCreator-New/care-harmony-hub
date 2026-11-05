# CI required checks

Owner: repository admin. Audit: S1-07, OPS-01, OPS-03, SECF-27, OPS-02, TEST-01, TEST-02, TEST-10, OPS-19, OPS-11.

The workflows in `.github/workflows/` no longer contain `continue-on-error: true` or `|| true` in any gating step. A failing gate fails the job.

**OPS-03 status:** the literal provider-key gate is in place. A literal `sk-`, `sk-proj-` or `sk-ant-` key (`\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}`) fails the source scan (`npm run security:client-secrets`), the built-bundle scan (`npm run security:bundle-secrets`, which runs `--bundle`), and gitleaks (rule `provider-api-key-literal` in `.gitleaks.toml`). Findings print file and line only. The gitleaks rule was not run in the change that added it, because the gitleaks binary and container were unavailable there. A gitleaks run in CI is still needed to confirm the rule.

Branch protection is not configured by the repository. An operator must enable it in GitHub. The existing ruleset `protection` (id 17399861) has an empty `include` list, so it applies to no branch. Target `main` (`~DEFAULT_BRANCH`), then require the checks below.

## 1. Checks to require on `main`

Each name is the job `name:` in the workflow file. GitHub shows it in the PR checks list, and the branch-protection picker lists it under the same name.

| Required check name | Workflow file | Blocks on |
|---|---|---|
| `CI required gates` | `ci-pipeline.yml` | Any listed gate below not `success`. Requiring this alone is sufficient. |
| `Type check` | `ci-pipeline.yml` | `tsc` on `tsconfig.app.json` and `tsconfig.node.json`, plus a guard that at least 900 `src/` files are checked |
| `Lint` | `ci-pipeline.yml` | `npm run lint` |
| `Architecture boundaries` | `ci-pipeline.yml` | `npm run lint:boundaries` |
| `Migration reversibility` | `ci-pipeline.yml` | `npm run validate:migrations` on every PR |
| `Unit tests (vitest)` | `ci-pipeline.yml` | `npx vitest run` (the whole default suite, not only `src/test`) |
| `Client secret source scan` | `ci-pipeline.yml` | `npm run security:client-secrets` |
| `Dependency audit (runtime, high and critical)` | `ci-pipeline.yml` | `npm audit --omit=dev --audit-level=high` |
| `Security tests (vitest)` | `ci-pipeline.yml` | `npm run test:security` |
| `Accessibility tests (vitest)` | `ci-pipeline.yml` | `npm run test:accessibility` |
| `Build` | `ci-pipeline.yml` | `npm run build` |
| `Bundle canary scan` | `ci-pipeline.yml` | Canary build, then `security:bundle-secrets` on the output |
| `E2E smoke (Playwright, chromium)` | `ci-pipeline.yml` | Spec collection (`playwright test --list`), then `@smoke` tests |
| `gitleaks (new commits)` | `secret-scan.yml` | Any secret in the commits a PR or push adds |

Requiring the individual checks as well as `CI required gates` is harmless and makes the failing gate visible in the PR. A gate that is skipped counts as a failure in `CI required gates`, so that job is the one to rely on.

## 2. Do not require yet

| Check | Why not |
|---|---|
| `Replay migrations from empty (CLI order)` (`db-migration-replay.yml`) | Runs only when `supabase/migrations/**` or `supabase/pending-migrations/**` changes. A required check that does not run leaves the PR pending. It also fails on the historical migration history (DB-03, confirmed by replay). Require it after the S0-01 baseline replaces the history (`supabase/baseline/README.md`, step 5). |
| `gitleaks (tree + full history)` (`secret-scan.yml`) | Runs only on the weekly schedule and on manual dispatch, so it can never be a PR check. It is expected to fail until the history purge in `docs/operations/SECRET_ROTATION_AND_HISTORY_PURGE.md` is done. |
| `Docker build and push` (`ci-pipeline.yml`) | A publish step, runs only on push to `main` or `develop`. It is not a gate. |
| `Deploy Production` (`deploy-production.yml`) | Runs on release only. Not changed by S1-07. OPS-04 covers it. |

There is no RLS gate. The previous RLS job was removed because `scripts/validate-rls.ts` cannot fail for an RLS reason (OPS-02): `tsx` is not a dependency, per-table errors become P1, and the script exits 0 against an unreachable database. Do not mark an RLS check as required until OPS-02 is fixed.

The GPL licence check was also removed. Its `npm ls | grep GPL` could never fail (OPS-03). A real licence gate needs a tool that is not installed.

## 3. Expected state on the first run

The gates now report the truth. These checks are expected to be red on current `main` until the linked work lands:

| Check | Expected reason | Tracking |
|---|---|---|
| `Unit tests (vitest)` | 39 failing tests in 20 files, plus live-database suites in the default run | TEST-10, TEST-02 |
| `E2E smoke (Playwright, chromium)` | `tests/e2e/comprehensive-workflows.spec.ts` and `stress-and-edge-cases.spec.ts` import fixture exports that do not exist, so Playwright loads zero tests. The config also sets `headless: false` (the job works around this with `xvfb-run`). | TEST-01 |
| `Dependency audit (runtime, high and critical)` | Production dependencies include 1 critical and several high advisories (DOMPurify via jsPDF, zod, react-router-dom) | OPS-19 |
| `Accessibility tests (vitest)` | Not yet run on the current tree in CI | TEST-03 / UI audit |

The checks not listed above were run locally and pass: type check, lint boundaries, client-secret source scan, bundle canary scan, migration reversibility.

## 4. Pinned actions

All actions use a full major version tag (`@v4`, `@v5`, `@v3`), not `@main` or `@master`. The gitleaks container image is pinned to `v8.21.2`.
