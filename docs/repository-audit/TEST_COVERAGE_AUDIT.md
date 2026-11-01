# Testing & Quality Assurance Audit

> CareSync HIMS repository audit, 2026-11-01. Commit `43ab8f7`. **Never report an unexecuted test as passed.** Every result below states whether it was executed, and by whom.

## 1. Commands executed (lead auditor)

Environment: Linux container, Node v22.23.4, npm 10.9.9, Chromium and Playwright preinstalled, no Supabase credentials, no Deno, no k6.

| # | Command | Exit | Duration | Result |
|---|---|---|---|---|
| 1 | `HUSKY=0 npm ci --no-audit --no-fund` | 0 | ~3 min | 1,044 packages installed from the lockfile |
| 2 | `npm run type-check` (`tsc --noEmit`) | 0 | 1 s | **Vacuous.** Root `tsconfig.json` has `"files": []`; `--listFilesOnly` lists 0 source files (ARCH-01) |
| 3 | `npx tsc --noEmit -p tsconfig.app.json` | 2 | 48 s | **35 errors in 11 files** (TS2339 ×19, TS7006 ×10, TS2552 ×3, TS2741, TS2739, TS2724). Several are runtime defects: CLIN-26, CLIN-27, CLIN-28, CLIN-29, FUNC-33 |
| 4 | `npx eslint . -f json` | 0 | ~25 s | 0 errors, 243 warnings across 1,405 files (175 `react-hooks/exhaustive-deps`). Key rules are disabled (see MODULE_AUDIT §2) |
| 5 | `npm audit --json` | 1 | 50 s | 42 advisories: 1 critical, 9 high, 28 moderate, 4 low (OPS-19) |
| 6 | `npx vitest run` (default config) | 1 | 101 s | **222 files: 199 passed, 20 failed, 3 skipped. 3,142 tests: 3,074 passed, 39 failed, 29 skipped** (TEST-10) |
| 7 | `npx vite build` (stub env) | 0 | 39 s | Success. Initial load ≈308 KB gzip (PERFORMANCE_AUDIT §1) |
| 8 | `npx depcruise src/modules src/components/doctor src/components/nurse --config .dependency-cruiser.cjs` | 0 | 4 s | No violations (209 modules). Scope is about 10% of `src` (ARCH-11) |
| 9 | `node scripts/validate-migrations.mjs` | 0 | <1 s | "69/69 reversible". Text-pattern scan only; it cannot detect SQL that fails to apply (DB-03, DB-21) |
| 10 | `npx playwright test --list` (default config) | 1 | — | **0 tests in 0 files.** `SyntaxError`: missing exports `createTestAppointment` and `loginAs` from fixtures (TEST-01) |

Commands that **could not** be run, and why:

| Check | Reason |
|---|---|
| Playwright E2E execution | The default config collects 0 tests. The other configs need a live Supabase project with seeded users, or the DEV-only mock auth, which cannot exercise RLS or edge functions. |
| RLS / tenant-isolation tests against a database | No database credentials. `tests/api/rls-policies.test.ts` imports `query-helper.ts`, which throws without env. |
| Edge-function tests (Deno) | Deno is not installed. The only edge test file (`workflow-automation/index.test.ts`) is UTF-16 encoded and is wrongly collected by Vitest. |
| k6 load tests | k6 is not installed, and there is no staging target. |
| `scripts/validate-rls.ts` against the database | No credentials. Statically shown to pass on any error (OPS-02). |
| Docker image build | Not attempted (would pull base images). Statically shown to fail (`npm ci --only=production`, then `vite build`; OPS-05). |

### 1.1 Failing Vitest files (2026-11-01 run)

| File | Failures | Cause |
|---|---|---|
| `tests/unit/audit-log-viewer.test.tsx` | 12 | Component/test drift |
| `tests/unit/realtime-connection-status.test.tsx` | 7 | Component/test drift |
| `tests/security/discharge-workflow-scoping.test.ts` | 5 | Asserts on source text with double quotes; the code was reformatted to single quotes. The scoping itself is present (`discharge-workflow/index.ts:109-110`). |
| `tests/documentation/documentation-review.test.ts` | 5 | Docs drift |
| `tests/migration/data-integrity.test.ts` | 3 | Live-database test in the unit run |
| `tests/api/real-time.test.ts` | 2 | Live-backend dependency |
| `tests/unit/{discharge-workflow,drug-interactions,optimistic-locking,feature1-recurrence-ui,feature5-clinical-notes}` | suite errors (0 tests collected) | `vi.mock` factory hoisting errors |
| `tests/api/{rls-policies,database-queries}.test.ts`, `tests/integration/appointment-lifecycle.test.ts` | suite errors | `query-helper.ts` throws without Supabase env |
| `src/test/hooks/usePrescriptions.test.tsx` | 1 | Mock lacks `.select` for the new `medications` lookup (`usePrescriptions.ts:486`) |
| `supabase/functions/workflow-automation/index.test.ts` | suite error | UTF-16 BOM. A Deno test picked up by Vitest. |
| `tests/security/penetration/sql-injection.test.ts`, `tests/integration/lab-critical-alerts.test.ts`, `tests/performance/backend-performance-clean.test.ts` | 1 each | Mocked-response assumptions and timing/random-based assertions |

## 2. Test inventory and quality

### 0.2 Test inventory

| Runner / command | Files collected | Notes |
|---|---|---|
| `npm test` (`vitest`, default config) | **222** files | Includes one file that always fails (UTF-16 Deno test), 2 `describe.skip` files. |
| `npm run test:unit` (`vitest run src/test`) — the only unit stage in CI and deploy | **65** files / 887 tests (CI log) | 19 of these files (183 tests, ~21 %) are pure `expect(true).toBe(true)`. |
| vitest files never executed by any *active* workflow | **105** | tests/unit (51), tests/clinical (11), src/hooks (6), src/utils (6), tests/api (4), src/__tests__ (4), src/modules/*/tests (3), tests/rbac, tests/hipaa, tests/migration, tests/regression, tests/documentation, root tests/*.test.ts, … |
| Orphaned (no runner picks them up) | **11** | `tests/uat/user-acceptance.spec.ts`, `tests/compatibility/browser-compatibility.spec.ts`, `tests/usability/usability-testing.spec.ts` (Playwright specs outside `testDir`, excluded by vitest `**/*.spec.ts`), `tests/load-testing/performance.bench.ts` (config never referenced), 7 × `services/*/tests` (vitest excludes `services/**`). |
| Playwright default config (`playwright.config.ts`, testDir `tests/e2e`) | **0 tests** — config fails to load | Would be 674 tests / 104 files (chromium) ×5 projects once two broken imports are fixed. |
| `playwright.e2e-full.config.ts` | 155 tests / 6 files | Only suite that uses real Supabase auth; manual/soak only (soak broken). |
| `playwright.roles.config.ts` | 77 tests / 2 files | Mock auth; not in CI. |
| vitest files importing **no production code at all** | **74 of 222** (~1,255 of ~3,259 cases) | Logic re-implemented or literals asserted inside the test. |

Anti-pattern counts (all test files, excl. services/): `expect(true).toBe(true)` 201 occurrences in 27 files; `.skip(` 11 in 8 files; `.only(` 0; `.todo(` 0; `vi.mock('@/integrations/supabase/client')` in 50 files; `waitForTimeout` 102 (94 in e2e); `isVisible().catch(() => false)` 114 in e2e.

---

## 3. Missing test coverage matrix

### 3. Missing Test Coverage Matrix

Legend: **PR** = Present-real (exercises production code, can fail); **PM** = Present-mock-only (production code with Supabase/auth mocked, or mock auth in E2E); **M** = Missing (includes tautological/literal/re-implemented tests and source-grep "tests"). Suffixes: *(CI)* runs in an active workflow; *(no CI)* exists but no active workflow runs it; *(dark)* in the default Playwright config that currently loads 0 tests; *(manual)* only in `e2e-full`/roles config, not in CI.

| Module / workflow | Unit | Integration | E2E | Security | A11y | Performance |
|---|---|---|---|---|---|---|
| Auth / session | PR narrow: token storage `tests/security/auth-storage-security.test.ts` *(CI)*; AuthContext flow **M** (`src/test/integration/auth-flow.test.tsx` = `expect(true)`) | **M** (`tests/security/authentication.test.ts` always-true vs stub) | PM `tests/e2e/auth.spec.ts` *(dark, mock auth)*; PR `tests/e2e/tests/auth/auth-comprehensive.spec.ts` *(manual)* | **M** (session-timeout via source grep, `hipaa-compliance.test.ts:73`) | **M** (inline fixture in `wcag-compliance.test.tsx`) | M |
| RBAC route guards | PR `tests/unit/routeGuard.test.ts`, `permissionsMatrix.test.ts`, `tests/rbac/cross-system-parity.test.ts` *(no CI)*; `src/test/components/auth/RoleProtectedRoute.test.tsx` = `expect(true)` *(CI)* | M | PM `tests/e2e/framework/access-control.spec.ts` (77, mock auth) *(manual)*; `tests/e2e/tests/permissions/permission-matrix.spec.ts` *(manual)* | PR `tests/security/rbac-unification.test.ts` *(CI)*; `rbac-endpoint-audit.test.ts` = literals | M | n/a |
| RLS tenant isolation | M (`tests/unit/rls-security-audit.test.ts` `hasPolicy = true`; `tests/security/rls-enforcement.test.ts` literals) | M (`tests/integration/setup.ts` in-memory store) | PR partial `tests/e2e/tests/workflows/cross-role-data.spec.ts` *(manual)* | M (`tests/api/rls-policies.test.ts`, `p0-db-rls-gates.test.ts` vacuous; `scripts/validate-rls.ts` no-op) | n/a | M |
| Edge-function authz (45 fns) | M (only file is UTF-16 empty import) | M (`workflowAutomationEdgeFunction.test.ts` imports nothing from `supabase/functions`) | M | M (`tests/api/edge-functions.test.ts` always-true) | n/a | M |
| Prescribing / order safety (DDI, allergy, paediatric) | PR `tests/clinical/order-safety-engine.test.ts`, `fail-closed-ddi`, `pediatric-dosing`, `drug-allergy-conflict` *(no CI)* | PM `tests/integration/PrescriptionBuilder.integration.test.tsx` *(CI)* | PM `tests/e2e/doctor-workflow.spec.ts` *(dark)* | PR tenant-violation case in order-safety engine test *(no CI)*; Supabase adapter M | M | M |
| Dispensing state machine (ADR-0004) | PR `tests/clinical/prescription-dispensing-engine.test.ts` (6) *(no CI)*; PM `src/test/hooks/usePrescriptions.test.tsx` *(CI, currently failing)* | M (`dispenseTransaction.test.ts` re-implements) | PM `tests/e2e/prescription-approval-workflow.spec.ts` *(dark)* | M (no DB-level "only pharmacist can dispense" test) | M | M |
| Critical lab escalation (ADR-0005) | PR `tests/clinical/critical-lab-escalation-engine.test.ts` (5) *(no CI)*; `critical-lab-check.test.ts` re-implements edge fn | PM `tests/integration/lab-critical-alerts.test.ts` *(CI)* | PM `tests/e2e/laboratory.spec.ts` *(dark)* | M | M | M (alert-latency SLO metric not emitted) |
| NEWS2 / vitals | PR `src/modules/vital-signs/tests/vitalSigns.test.ts` (8) *(no CI)* | PM `tests/integration/VitalSignsForm.integration.test.tsx` *(CI)*; `vitalSignsCapture.test.ts` re-implements | M (no NEWS2 E2E) | M | M | M |
| Discharge pipeline (ADR-0003) | PR `src/modules/discharge-pipeline/tests/dischargePipeline.test.ts` (16), `tests/unit/workflow5DischargePipeline.test.ts` *(no CI)* | M (`SupabaseDischargeAdapter` untested) | PM `tests/e2e/tests/workflows/discharge-workflow.spec.ts` *(dark)* | M (`discharge-workflow-scoping.test.ts` source grep) | M | M |
| Billing calculations | PR `tests/unit/workflow7BillingRevenueCycle.test.ts`, `feature4-billing.test.ts` *(no CI)*; `billingService.unit.test.ts` re-implements | PM `tests/integration/billing-lifecycle.test.ts` *(CI)* | PM billing specs *(dark)* | M | M | M |
| Appointment recurrence | PR `tests/unit/feature1-recurrence.test.ts` (+UI) *(no CI)*; DST case skipped | M | M | n/a | M | M |
| Patient-portal data isolation | M (`src/test/patient-rbac.test.ts` = `expect(true)`) | M | PM `tests/e2e/patient-portal-workflow.spec.ts` *(dark)* | M (no patient-A-vs-patient-B RLS test) | M | n/a |
| 2FA (TOTP, backup codes) | M (source grep only, `p1-audit-remediation.test.ts:50-67`) | M | M | M (`verify-totp`, `generate-2fa-secret`, `verify-backup-code` untested) | M | n/a |
| Staff invitations | PM `src/test/integration/join-flow.test.tsx` (hook mocked) *(CI)* | M | M | M (rate-limit test asserts its own mock) | M | n/a |
| Audit logging | PR masking utils only `tests/hipaa/audit-trail.test.ts` *(no CI)*; `useAuditTrail.test.tsx` `describe.skip` | M (no DB trigger/immutability test) | PR partial `tests/e2e/tests/security/hipaa-security.spec.ts` *(manual)* | M (`audit-immutability.test.ts` source grep) | n/a | M |
| File upload / documents | M | M | M | M (no storage-bucket policy tests) | M | M |
| Offline / PWA | M | M | M (offline cases only in the two broken specs) | M (PHI in SW cache, OPS-14) | n/a | M |

**Headline:** of 17 critical workflows, **0 have real coverage at every layer**; **RLS tenant isolation, edge-function authz, 2FA, patient-portal isolation, file upload and offline/PWA have no real test at any layer**; the 9 domain modules that do have genuine unit tests (order safety, dispensing, critical-lab, NEWS2, discharge, billing, recurrence, route guard, permissions) are **not executed by any active CI workflow**; no Supabase adapter and no edge function has a test; and no E2E or security test currently runs against a real backend in CI.

## 4. Recommended test strategy (summary)

1. **Make the gates real first.** `type-check` → `tsc -p tsconfig.app.json`. Run the whole Vitest suite in CI. Fix Playwright collection. Require these checks on `main` (ARCH-01, TEST-01, TEST-02, OPS-01).
2. **Add a disposable Supabase stack for tests.** Use `supabase start` in CI (Docker) and apply the reconciled migrations. Add a pgTAP or Vitest RLS suite that signs in as each of the 7 roles across two tenants and asserts allow/deny on every PHI table. This is the single most valuable missing test (TEST-04).
3. **Add edge-function contract tests.** Use `deno test` with a local stack for authz (wrong tenant, wrong role, missing JWT) on each function (TEST-05).
4. **Test what the UI actually calls.** Component tests for TreatmentPlanStep, PrescriptionApprovalModal and the consultation completion that assert the safety behavior through the live import path, not through the deep modules alone (TEST-03, ARCH-04).
5. **Replace source-grep "security tests"** with behavioral tests (TEST-08) and delete tautological tests (TEST-03).
6. **Accessibility:** run axe on real routes in Playwright with zero critical violations as the gate (A11Y-16/TEST-07).
7. **Coverage thresholds:** start at the measured baseline and ratchet up. Track live-code coverage only (dead code excluded, ARCH-07).

## 5. Testing findings (TEST-xx)

### TEST-01: Default Playwright config loads zero tests — every `npm run test:e2e*` script fails at collection
- Severity: P1
- Category: Testing
- Status: CONFIRMED (executed)
- Module: tests/e2e
- Location: tests/e2e/comprehensive-workflows.spec.ts:2-3; tests/e2e/stress-and-edge-cases.spec.ts:2; tests/e2e/fixtures/auth.fixture.ts (exports); tests/e2e/fixtures/test-data.fixture.ts (exports); playwright.config.ts:6, 19-20, 33, 62-71
- Evidence:
  ```
  $ npx playwright test --list --project=chromium
  SyntaxError: The requested module './fixtures/test-data.fixture' does not provide an export named 'createTestAppointment'
  SyntaxError: The requested module './fixtures/auth.fixture' does not provide an export named 'loginAs'
  Total: 0 tests in 0 files          (exit 1; same for --grep "@smoke")
  Excluding those two files: Total: 674 tests in 104 files (31 @smoke, 22 @critical)
  ```
- Actual behavior / Expected behavior: Two specs import non-existent fixture exports; Playwright aborts loading the whole project, so `test:e2e`, `test:e2e:smoke`, `test:e2e:critical`, all role/browser scripts and the CI smoke job run nothing. The config also sets `headless: false` and `slowMo: 300` unconditionally (headed browsers cannot start on CI runners without Xvfb) and defines 5 browser projects. Expected: config loads in CI and smoke tests execute headless.
- Reproduction: `npx playwright test --list`.
- Root cause: Fixture API refactor without updating consumers; no CI job that would surface the error (smoke job is `continue-on-error`).
- Impact: The entire default E2E estate (~674 scenarios) provides zero regression protection.
- Recommendation: Fix or delete the two specs; `headless: isCI`, `slowMo` only locally; add a CI step `npx playwright test --list` that must pass; restrict CI to chromium.
- Effort: S
- Acceptance criteria: `npx playwright test --list` exits 0; CI smoke job runs ≥31 tests headless and fails on test failure.


### TEST-02: CI unit stage runs only `src/test`; the real clinical-engine, RBAC and module tests never execute in any active pipeline
- Severity: P1
- Category: Testing
- Status: CONFIRMED (vitest list + workflow reading)
- Module: package.json scripts / CI
- Location: package.json `"test:unit": "vitest run src/test"`; .github/workflows/ci-pipeline.yml:56; rls-validation.yml:126; deploy-production.yml:19; vitest.config.ts:12-20
- Evidence:
  ```
  vitest list --filesOnly            → 222 files
  vitest list --filesOnly src/test   → 65 files
  never run by an active workflow    → 105 files: tests/unit 51, tests/clinical 11, src/utils 6, src/hooks 6, tests/api 4, src/__tests__ 4, src/modules 3, …
  orphaned (no runner)               → 11 files (tests/uat, tests/compatibility, tests/usability/*.spec.ts, tests/load-testing/*.bench.ts, services/*/tests ×7)
  ```
- Actual behavior / Expected behavior: The genuinely valuable suites — `tests/clinical/order-safety-engine.test.ts`, `prescription-dispensing-engine.test.ts`, `critical-lab-escalation-engine.test.ts`, `fail-closed-ddi`, `pediatric-dosing`, `src/modules/{vital-signs,discharge-pipeline}/tests`, `tests/unit/routeGuard`, `permissionsMatrix`, `workflow7BillingRevenueCycle`, `feature1-recurrence` — exist but are only run by the retired `test-pyramid.yml` (`tests/unit`) or by nothing. Meanwhile the CI unit stage is 21 % tautologies (TEST-03). Three Playwright specs live outside any `testDir`; `vitest.load-testing.config.ts` is referenced by no script. Expected: `npm run test:unit` (and CI) runs all non-E2E vitest files; no orphans.
- Reproduction: `npx vitest list --filesOnly` vs `npx vitest list --filesOnly src/test`.
- Root cause: `test:unit` path filter predates the `tests/` tree; workflows copy that script.
- Impact: Regressions in fail-closed DDI checks, pharmacist-gated dispensing (ADR-0004) or critical-lab escalation (ADR-0005) would ship undetected.
- Recommendation: Change CI to `vitest run --project unit` with an explicit `include` covering `src/**` and `tests/{unit,clinical,rbac,hipaa,api,migration,regression}/**`; move/convert the 3 orphan specs into `tests/e2e` or delete; delete `services/*/tests` with the archived services.
- Effort: S
- Acceptance criteria: CI unit job reports ≥200 test files; the orphan list (`find` minus runner lists) is empty.


### TEST-03: Large share of the suite is tautological or tests code re-implemented inside the test
- Severity: P1
- Category: Testing
- Status: CONFIRMED
- Module: src/test, tests/unit, tests/security, tests/integration, tests/performance
- Location: src/test/doctor-rbac.test.ts:4-42 (and 18 sibling files listed below); tests/unit/rls-security-audit.test.ts:23-60; tests/security/rls-enforcement.test.ts:28-70; tests/security/owasp-top-10.test.ts:21-48; tests/security/authentication.test.ts:80-100; tests/unit/billingService.unit.test.ts:22-45; tests/clinical/critical-lab-check.test.ts:3-40; tests/performance/backend-performance.test.ts:49-57
- Evidence:
  ```
  src/test/doctor-rbac.test.ts:   it('doctor cannot access admin panel', () => { expect(true).toBe(true); });
  tests/unit/rls-security-audit.test.ts:  const hasPolicy = true; expect(hasPolicy).toBe(true);   (52 tests)
  tests/security/owasp-top-10.test.ts:    const query = 'SELECT * FROM patients WHERE name = ?'; expect(query).toContain('?');
  tests/security/authentication.test.ts:  mockFetch…mockResolvedValueOnce({ ok:false, status:429 }) … expect 6th to be 429
  tests/performance/backend-performance.test.ts: await new Promise(r => setTimeout(r, baseDelay + jitter)); … expect(duration).toBeLessThan(100)
  ```
- Actual behavior / Expected behavior: 19 files in the CI unit set consist solely of `expect(true).toBe(true)` (183 tests, ~21 % of the 887 CI unit tests) with names implying coverage of `RoleProtectedRoute`, `auth-flow`, `RealTimeDashboard`, `useAutomatedAlerts`, every role's RBAC, and "e2e" workflows: `src/test/{components,validation,role-basic,role-comprehensive,role-based-access,doctor-rbac,nurse-rbac,labtech-rbac,receptionist-rbac,patient-rbac}.test.*`, `src/test/components/{RealTimeDashboard,auth/RoleProtectedRoute}.test.tsx`, `src/test/e2e/{complete-workflow,patient-workflow,workflow-hooks}.test.*`, `src/test/integration/{auth-flow,workflow-integration}.test.*`, `src/test/hooks/{useAutomatedAlerts,minimal2}.test.tsx`. Security suites assert literals they define (`rls-enforcement` 25, `owasp-top-10` 35, `rls-security-audit` 52, `rbac-endpoint-audit` 40 — imports only sanitize/logger). Unit/integration "service" tests (`billingService`, `labService`, `patientService`, `prescriptionService`, `endpoints-*-api`, `dispenseTransaction`, `vitalSignsCapture`, `critical-lab-check`) re-implement logic locally; performance tests time `setTimeout`. Overall 74 of 222 vitest files (~1,255 of ~3,259 cases) import no production module. Expected: every test exercises production code and can fail when that code regresses.
- Reproduction: `grep -c "expect(true).toBe(true)"` per file; import scan (see audit notes).
- Root cause: Test-count targets ("Target: 30+ tests") rather than behaviour coverage; AI-generated placeholders.
- Impact: Coverage/test-count metrics and compliance claims (RBAC, RLS, OWASP, HIPAA) are inflated; reviewers believe RBAC/route guards are tested when they are not.
- Recommendation: Delete placeholder files (or convert to `it.todo` so they show as gaps); add a lint rule (`vitest/no-standalone-expect`, custom ESLint ban on `expect(true)` and literal-only assertions); require each test file to import from `@/`; replace re-implemented logic tests with tests of the real module.
- Effort: M
- Acceptance criteria: `grep -rE "expect\(true\)\.toBe\(true\)" src tests` returns 0; no vitest file lacks a production import (CI script check).


### TEST-04: Tenant isolation / RLS is never tested against a real database; "RLS" and "integration" tests pass vacuously
- Severity: P1
- Category: Testing
- Status: CONFIRMED (static + CI logs)
- Module: tests/api, tests/security, tests/integration, src/modules/*/adapters
- Location: tests/api/rls-policies.test.ts:6-71; tests/security/p0-db-rls-gates.test.ts:21-106; src/integrations/supabase/client.ts:8-10; tests/integration/setup.ts:1-40; .github/workflows/rls-validation.yml:155-160; src/modules/{order-safety,prescription-dispensing,critical-lab-escalation,discharge-pipeline}/adapters/Supabase*.ts
- Evidence:
  ```
  client.ts:9      const SUPABASE_URL = _url || (isTest ? 'https://stub.supabase.co' : '');
  rls-policies.test.ts:11  expect(data === null || data.length === 0 || error !== null).toBe(true);   // network error ⇒ pass
  rls-policies.test.ts:59  expect(blocked || empty || Array.isArray(data)).toBe(true);                  // always true
  rls-policies.test.ts:69  expect(error).toBeDefined();                                                  // null is defined
  p0-db-rls-gates.test.ts:37 // Test passes vacuously until T-04 migration is applied
  tests/integration/setup.ts:2  "mocks Supabase client so integration tests run without a live database connection"
  ```
- Actual behavior / Expected behavior: In test mode the client points at `stub.supabase.co`, so every network error counts as "blocked"; several assertions are logically always true; `if (user)` guards skip all assertions for anon; the "cross-hospital probe" queries a sentinel UUID that matches no rows regardless of RLS; nothing authenticates as Hospital A and attempts to read Hospital B. The CI "Integration Tests (DB + RLS)" job uses an in-memory store mock. No pgTAP/`supabase test db` suite exists, and none of the four deep modules' Supabase adapters has a test. Expected: RLS tests that sign in as real users of two hospitals (and as a patient) against a local Supabase with migrations applied, asserting zero cross-tenant rows for every PHI table and denied writes.
- Reproduction: static analysis; CI log for `tests/security/penetration/sql-injection.test.ts` shows `NetworkError: fetch failed` against the stub.
- Root cause: No disposable database in CI; tests written to "not fail" without one.
- Impact: The primary security control of a multi-tenant HIS (ADR-0001: "All access controls and tenant isolation enforced via Supabase PostgreSQL RLS") has no executable verification.
- Recommendation: Add `supabase/tests/*.sql` pgTAP tests (or vitest with two JWT-authenticated clients) run after `supabase db reset` in CI; matrix over PHI tables × roles × {same hospital, other hospital}; test each `Supabase*Adapter` against the same local DB.
- Effort: L
- Acceptance criteria: Removing the hospital predicate from any PHI table policy causes a CI failure; adapters have ≥1 round-trip test each.


### TEST-05: Edge functions (45) have no working tests; the only test file breaks `npm test`
- Severity: P2
- Category: Testing
- Status: CONFIRMED (executed)
- Module: supabase/functions
- Location: supabase/functions/workflow-automation/index.test.ts:1; tests/api/edge-functions.test.ts:4-40; tests/integration/workflowAutomationEdgeFunction.test.ts:1
- Evidence:
  ```
  $ file supabase/functions/workflow-automation/index.test.ts → UTF-16, little-endian … CRLF
  content: import { assertEquals } from 'https://deno.land/std@0.192.0/testing/asserts.ts';   (no tests)
  $ npx vitest run supabase/functions/workflow-automation/index.test.ts → Test Files 1 failed (1), Tests no tests
  tests/api/edge-functions.test.ts: expect(data !== undefined || error !== undefined).toBe(true);
  ```
- Actual behavior / Expected behavior: No Deno tests for any function (authorization via `_shared/authorize.ts`, hospital scoping, rate limiting, `verify-totp`, `phi-crypto`, `prescription-approval`, `critical-lab-check`, `validate-invitation-token`); the single file is an empty UTF-16 import that makes the default vitest run fail; API tests hit the stub with always-true assertions; the "edge function integration" test imports nothing from `supabase/functions`. Expected: `deno test` per function with role/tenant matrix, run in CI.
- Reproduction: commands above.
- Root cause: Deno runtime not integrated into the test toolchain.
- Impact: Server-side authorization for PHI-processing and clinical-safety functions is unverified; regressions ship via Lovable auto-deploy.
- Recommendation: Add `deno test --allow-env supabase/functions` job; extract handler logic into testable modules; delete/convert the UTF-16 file; exclude `supabase/functions/**` from vitest.
- Effort: M
- Acceptance criteria: CI runs `deno test` with ≥1 authz test (unauthenticated, wrong role, wrong hospital) per function that handles PHI.


### TEST-06: E2E suites are low-fidelity — mock auth, mocked APIs, assertion-free "checks", fixed sleeps; production code contains test seams
- Severity: P2
- Category: Testing
- Status: CONFIRMED (static) / LIKELY (anon-RLS effect)
- Module: tests/e2e, playwright configs, src/hooks/useStaffInvitations.ts
- Location: playwright.config.ts:62-70; playwright.roles.config.ts:31-38; tests/e2e/mock-data-workflow.spec.ts:89-98, 139-170; src/hooks/useStaffInvitations.ts:83-95; src/contexts/AuthContext.tsx:214-220
- Evidence:
  ```
  playwright.config.ts webServer.env: { TEST_MODE: 'true', VITE_E2E_MOCK_AUTH: 'true' }
  mock-data-workflow.spec.ts:89  const navVisible = await page.locator('nav, …').first().isVisible().catch(() => false);
                              90  if (navVisible) { console.log(`✓ Navigation menu visible`); }      // no assertion
  useStaffInvitations.ts:83  const isE2EMockMode = import.meta.env.VITE_E2E_MOCK_AUTH === 'true' ||
                         84       (typeof window !== 'undefined' && !!localStorage.getItem('e2e-mock-auth-user'));
  ```
- Actual behavior / Expected behavior: Default and roles configs run with client-side mock auth (Supabase requests go out as anon, so real data flows either fail under RLS or are replaced by `page.route` mocks in 17 files); 114 `isVisible().catch(() => false)` guards and log-only branches mean many tests cannot fail; 94 `waitForTimeout` calls; only `e2e-full` (155 tests) uses real login and it is not in CI. `useStaffInvitations` returns a fake invitation whenever a localStorage key is present — this branch ships in production builds (unlike the AuthContext guard). Expected: a small, deterministic E2E smoke set against a seeded local Supabase with real auth, web-first assertions, and no test branches in production code.
- Reproduction: static analysis.
- Root cause: E2E written to demo flows without backend fixtures.
- Impact: Cross-role clinical journeys (prescribe → dispense → administer; lab critical → escalate; discharge pipeline) have no trustworthy automated end-to-end check; a user can trigger the mock invitation path in production.
- Recommendation: Run `e2e-full` (headless) in CI against `supabase start` with seed SQL; ban `.catch(() => false)` + conditional-log patterns via ESLint (`playwright/no-conditional-in-test`, `playwright/no-wait-for-timeout`); gate `useStaffInvitations` mock path behind `!import.meta.env.PROD`.
- Effort: L
- Acceptance criteria: CI E2E job uses real Supabase auth; `eslint-plugin-playwright` recommended rules pass; `grep "e2e-mock-auth-user" src/hooks` returns nothing outside DEV-guarded code.


### TEST-07: Accessibility, performance and "infrastructure" tests test fixtures and YAML, not the application
- Severity: P3
- Category: Testing
- Status: CONFIRMED
- Module: tests/accessibility, tests/performance, tests/load-testing, k6
- Location: tests/accessibility/wcag-compliance.test.tsx:19-50; tests/accessibility/{aria-labels,keyboard-navigation}.test.tsx; tests/performance/infrastructure-performance.test.ts:9-40; tests/performance/frontend-performance.test.ts; tests/performance/load-test.js:26-27, 49-52, 93-112; vitest.performance.config.ts:76-77, 88-91
- Evidence:
  ```
  wcag-compliance.test.tsx: const LoginPage = () => (<div><h1>Login</h1><form>…</form></div>); … expect(await axe(container)).toHaveNoViolations();
  infrastructure-performance.test.ts: const hpaContent = fs.readFileSync(hpaFile,'utf-8'); expect(hpaContent).toContain('minReplicas:');
  load-test.js:52  { role: 'billing', … }   load-test.js:112  `${API_URL}/patients/${patient.id}`
  ```
- Actual behavior / Expected behavior: All three a11y files render inline mock markup (no app components); the only real axe checks (`tests/e2e/accessibility-wcag-audit.spec.ts`) are in the unloadable default Playwright config. "Performance" tests grep K8s manifests (which are themselves broken, OPS-05) or time simulated delays; k6 targets REST paths PostgREST doesn't serve, a non-canonical `billing` role, and sends no `apikey`; perf config uses removed vitest options (`threads`, `singleThread`, `coverage.lines`). Expected: axe on real pages/components (jest-axe on `LoginPage`, `PrescriptionBuilder`, etc.; Playwright axe per role dashboard), Lighthouse CI budgets on the built app, k6 against staging PostgREST/RPCs with realistic auth.
- Reproduction: static analysis.
- Root cause: Category quotas ("Phase 4: 150 tests") without targets.
- Impact: WCAG 2.1 AA conformance and performance SLOs are unmeasured; accessibility regressions in clinical forms go undetected.
- Recommendation: Replace with component-level jest-axe on real components and a Playwright axe smoke per role; Lighthouse CI on `vite preview`; rewrite k6 scenarios against staging; delete YAML-grep tests.
- Effort: M
- Acceptance criteria: a11y tests import from `@/pages`/`@/components`; an injected missing label on `LoginPage` fails CI.


### TEST-08: Security "verification" relies on grepping source text
- Severity: P3
- Category: Testing
- Status: CONFIRMED
- Module: tests/security
- Location: tests/security/p1-audit-remediation.test.ts:50-67; tests/security/hipaa-compliance.test.ts:57-85; tests/security/p0-audit-remediation.test.ts (8× readFileSync); tests/security/audit-immutability.test.ts; tests/security/discharge-workflow-scoping.test.ts
- Evidence:
  ```
  p1-audit-remediation.test.ts:62  expect(hookSource).toContain("supabase.functions.invoke('verify-totp'");
  hipaa-compliance.test.ts:74      const source = fs.readFileSync(path.resolve(process.cwd(), 'src/hooks/useSessionTimeout.ts'), 'utf8');
  ```
- Actual behavior / Expected behavior: 2FA enrolment, 30-minute session timeout, audit-log immutability and discharge scoping are "verified" by `toContain` on source strings — they pass if the string exists anywhere (even in dead code/comments) and break on harmless refactors. Expected: behavioural tests (fake timers for `useSessionTimeout`, mocked `functions.invoke` assertions for 2FA hooks, pgTAP for audit trigger immutability).
- Reproduction: static analysis.
- Root cause: Remediation tickets closed with "evidence" tests.
- Impact: False assurance on HIPAA technical safeguards (§164.312(a)(2)(iii) automatic logoff, §164.312(b) audit controls).
- Recommendation: Replace each source-grep with a behavioural test; keep grep checks, if desired, as ESLint rules instead.
- Effort: M
- Acceptance criteria: No file under `tests/security` uses `readFileSync` on `src/`.


### TEST-09: Test infrastructure hygiene — global mocks, skipped audit tests, empty flaky registry, no coverage thresholds
- Severity: P3
- Category: Testing
- Status: CONFIRMED
- Module: src/test/setup.ts, vitest configs, tests/flaky-registry.ts
- Location: src/test/setup.ts:5-56; src/hooks/__tests__/useAuditTrail.test.tsx:30; src/hooks/__tests__/useAmendmentPhase2B.test.tsx:46; src/test/integration/queue-degradation.test.ts:83, 140; src/test/integration/queue-degradation.test.tsx:40, 83; tests/unit/feature1-recurrence.test.ts:240; tests/flaky-registry.ts:37-50; vitest.config.ts:21-28; package.json `test:coverage`
- Evidence:
  ```
  setup.ts:20  vi.mock('crypto', () => ({ default: { randomBytes: vi.fn().mockReturnValue(Buffer.from('1234567890123456')), … digest: vi.fn().mockReturnValue('hashedvalue') …
  useAuditTrail.test.tsx:30  describe.skip('useAuditTrail', () => {
  feature1-recurrence.test.ts:240  it.skip('should handle DST transitions for weekly recurrence', () => {
  FLAKY_REGISTRY: [ /* only a commented example */ ]
  ```
- Actual behavior / Expected behavior: Every vitest file gets a fake Node `crypto` (constant random bytes/hash — affects `src/utils/webhookService.ts` signing) and a mocked `sonner`; audit-trail and amendment hooks are entirely skipped; DST recurrence and queue-degradation paths skipped; flaky registry is empty and only read by the retired workflow; no coverage thresholds and coverage only collected for `src/test`. Expected: targeted per-file mocks, no skipped safety/audit tests without a tracked ticket, coverage thresholds on `src/modules/**` and `src/lib/clinical/**`.
- Reproduction: static analysis.
- Root cause: Convenience global setup; skips added to get green runs.
- Impact: Audit logging and DST appointment generation can regress silently.
- Recommendation: Remove global `crypto` mock; un-skip or ticket each skip (link in `flaky-registry.ts`); set `coverage.thresholds` (e.g. 80 % lines for `src/modules/**`, `src/lib/clinical/**`) and collect over all unit tests.
- Effort: S
- Acceptance criteria: `grep -rn "describe.skip\|it.skip" src tests` returns only entries listed in the flaky registry; coverage job fails below threshold.

---

### TEST-10: `npm test` is red: 39 failing tests in 20 files, including source-string "security" tests broken by reformatting
- Severity: P2
- Category: Testing
- Status: CONFIRMED (`npx vitest run`, 2026-11-01: 3,142 tests, 39 failed, 29 skipped; 222 files, 20 failed)
- Module: Test suite
- Location: tests/security/discharge-workflow-scoping.test.ts:17-33; tests/unit/{discharge-workflow,drug-interactions,optimistic-locking,feature1-recurrence-ui,feature5-clinical-notes}.test.*; tests/api/{rls-policies,database-queries}.test.ts; src/test/hooks/usePrescriptions.test.tsx; supabase/functions/workflow-automation/index.test.ts
- Evidence:
  ```
  Test Files  20 failed | 199 passed | 3 skipped (222)
  Tests  39 failed | 3074 passed | 29 skipped (3142)
  AssertionError: expected 'import { serve } ...' to contain '.eq("id", payload.workflowId)'   (code uses single quotes)
  Error: [vitest] There was an error when mocking a module ... (5 suites collect 0 tests)
  Error: Missing required environment variables ... (query-helper.ts imported by API tests)
  ```
- Actual behavior: The default suite fails. The failures fall into four groups: brittle source-text assertions (the scoping exists at `supabase/functions/discharge-workflow/index.ts:109-110`), `vi.mock` hoisting errors that silently drop 5 suites, live-database tests mixed into the unit run, and component/test drift.
- Expected behavior: `npm test` is green and hermetic. Live-database tests sit behind a separate config and environment.
- Reproduction: `npx vitest run`.
- Root cause: No CI gate runs the full suite (TEST-02). Tests assert implementation text rather than behavior (TEST-08).
- Impact: A red suite is ignored, so real regressions are invisible.
- Recommendation: Fix or quarantine with owners. Convert source-grep tests into behavioral tests. Move live-database suites to `vitest.integration.config.ts`.
- Effort: M
- Acceptance criteria: `npx vitest run` exits 0 in CI on every PR.
