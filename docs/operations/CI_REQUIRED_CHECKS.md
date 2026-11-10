# CI required checks

Owner: repository admin. Audit: S1-07, OPS-01, OPS-03, SECF-27, OPS-02, TEST-01, TEST-02, TEST-10, OPS-19, OPS-11.

The workflows in `.github/workflows/` no longer contain `continue-on-error: true` or `|| true` in any gating step. A failing gate fails the job.

**OPS-03 status:** the literal provider-key gate is in place. A literal `sk-`, `sk-proj-` or `sk-ant-` key (`\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}`) fails the source scan (`npm run security:client-secrets`), the built-bundle scan (`npm run security:bundle-secrets`, which runs `--bundle`), and gitleaks (rule `provider-api-key-literal` in `.gitleaks.toml`). Findings print file and line only. The gitleaks rule was not run in the change that added it, because the gitleaks binary and container were unavailable there. A gitleaks run in CI is still needed to confirm the rule.

Branch protection is not configured by the repository. An operator must enable it in GitHub. The existing ruleset `protection` (id 17399861) has an empty `include` list, so it applies to no branch. Target `main` (`~DEFAULT_BRANCH`), then require the checks below.

## 1. Checks to require on `main`

Each name is the job `name:` in the workflow file. GitHub shows it in the PR checks list, and the branch-protection picker lists it under the same name.

| Required check name                             | Workflow file     | Blocks on                                                                                                                                    |
| ----------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `CI required gates`                             | `ci-pipeline.yml` | Any listed gate below not `success`. Requiring this alone is sufficient.                                                                     |
| `Type check`                                    | `ci-pipeline.yml` | `tsc` on `tsconfig.app.json` and `tsconfig.node.json`, plus a guard that every tracked non-test file under `src/` is in the set `tsc` checks |
| `Lint`                                          | `ci-pipeline.yml` | `npm run lint`                                                                                                                               |
| `Architecture boundaries`                       | `ci-pipeline.yml` | `npm run lint:boundaries`                                                                                                                    |
| `Migration reversibility`                       | `ci-pipeline.yml` | `npm run validate:migrations` on every PR                                                                                                    |
| `Unit tests (vitest)`                           | `ci-pipeline.yml` | `npm run test:unit:all` (`vitest run`, the whole default suite, not only `src/test`)                                                         |
| `Client secret source scan`                     | `ci-pipeline.yml` | `npm run security:client-secrets`                                                                                                            |
| `Dependency audit (runtime, high and critical)` | `ci-pipeline.yml` | `npm audit --omit=dev --audit-level=high`                                                                                                    |
| `Security tests (vitest)`                       | `ci-pipeline.yml` | `npm run test:security`                                                                                                                      |
| `Accessibility tests (vitest)`                  | `ci-pipeline.yml` | `npm run test:accessibility` (the layout and accessibility-primitive tests under `src/test/components`, which render real components)        |
| `Build`                                         | `ci-pipeline.yml` | `npm run build`                                                                                                                              |
| `Bundle canary scan`                            | `ci-pipeline.yml` | Canary build, then `security:bundle-secrets` on the output                                                                                   |
| `E2E smoke (Playwright, chromium)`              | `ci-pipeline.yml` | Spec collection (`playwright test --list`, fails if the total is 0), then `@smoke` tests                                                     |
| `gitleaks (new commits)`                        | `secret-scan.yml` | Any secret in the commits a PR or push adds                                                                                                  |

Requiring the individual checks as well as `CI required gates` is harmless and makes the failing gate visible in the PR. A gate that is skipped counts as a failure in `CI required gates`, so that job is the one to rely on.

## 2. Do not require yet

| Check                                                                  | Why not                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Replay migrations from empty (CLI order)` (`db-migration-replay.yml`) | Runs only when `supabase/migrations/**` or `supabase/pending-migrations/**` changes. A required check that does not run leaves the PR pending. It also fails on the historical migration history (DB-03, confirmed by replay). Require it after the S0-01 baseline replaces the history (`supabase/baseline/README.md`, step 5). |
| `gitleaks (tree + full history)` (`secret-scan.yml`)                   | Runs only on the weekly schedule and on manual dispatch, so it can never be a PR check. It is expected to fail until the history purge in `docs/operations/SECRET_ROTATION_AND_HISTORY_PURGE.md` is done.                                                                                                                        |
| `Docker build and push` (`ci-pipeline.yml`)                            | A publish step, runs only on push to `main` or `develop`. It is not a gate.                                                                                                                                                                                                                                                      |
| `Deploy Production` (`deploy-production.yml`)                          | Runs on release only. Not changed by S1-07. OPS-04 covers it.                                                                                                                                                                                                                                                                    |

There is no RLS gate. The previous RLS job was removed because `scripts/validate-rls.ts` cannot fail for an RLS reason (OPS-02): `tsx` is not a dependency, per-table errors become P1, and the script exits 0 against an unreachable database. Do not mark an RLS check as required until OPS-02 is fixed.

The GPL licence check was also removed. Its `npm ls | grep GPL` could never fail (OPS-03). A real licence gate needs a tool that is not installed.

## 3. State of the gates

Last checked 2026-11-10 on Node 22, after the codebase cleanup on branch `claude/codebase-audit-cleanup-tzigos`.

The pipeline runs on Node 22. `dependency-cruiser` 18 and `lint-staged` 17 do not run on Node 20, so `Architecture boundaries` failed on every run while the pipeline pinned Node 20.

| Check                                                                                              | State                                | Notes                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Type check`                                                                                       | Passes locally                       | The guard compares the files `tsc` checks with the tracked non-test files under `src/` (568 of 568). The earlier fixed threshold of 900 files could not be met.                                                                                                            |
| `Lint`, `Architecture boundaries`, `Migration reversibility`, `Client secret source scan`, `Build` | Pass locally                         |                                                                                                                                                                                                                                                                            |
| `Unit tests (vitest)`                                                                              | Passes locally                       | 172 files, 2216 passed, 49 skipped (suites gated on a live backend).                                                                                                                                                                                                       |
| `Security tests (vitest)`, `Accessibility tests (vitest)`                                          | Pass locally                         |                                                                                                                                                                                                                                                                            |
| `E2E smoke (Playwright, chromium)`                                                                 | 31 of 31 `@smoke` tests pass locally | Two specs that imported fixture exports that never existed were removed; they made Playwright load zero tests. The job is pinned to `ubuntu-24.04` because Playwright 1.58 has no browser build for the newer `ubuntu-latest` image. Not yet confirmed on a GitHub runner. |
| `Dependency audit (runtime, high and critical)`                                                    | **Fails**                            | 8 runtime advisories remain (1 critical in `dompurify`, high in `zod`, `nanoid`, `postcss`, `source-map-js`; moderate in `react-router`). Down from 25 after unused packages were removed. Needs a dependency upgrade (OPS-19).                                            |
| `Bundle canary scan`                                                                               | Passes locally                       |                                                                                                                                                                                                                                                                            |

## 4. Pinned actions and permissions

All actions use a full major version tag (`@v4`, `@v5`, `@v3`), not `@main` or `@master`. The gitleaks container image is pinned to `v8.21.2`. SHA pinning of actions is not done; it is an operator decision.

Every workflow except `deploy-production.yml` sets `permissions: contents: read` at the top level. Only `docker-build` raises a scope (`packages: write`). `ci-pipeline.yml` cancels superseded runs for pull requests only, so a push to `main` or `develop` is always evaluated.

`deploy-production.yml` is not part of S1-07. It has no top-level `permissions` block, and it still runs `npm run test:unit`, which keeps the old `src/test` subset. Its deploy gating (`if:` on env values) needs review under OPS-04.
