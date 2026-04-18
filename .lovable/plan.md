
# Production Readiness Plan — CareSync HIMS

Applying the **hims-devops-guardian** and **hims-browser-test-automation** skills to validate production readiness.

## Current State Assessment

**What exists:**
- Blue-green deploy scripts (`deploy-prod.sh`, `rollback.sh`, `test-deployment.sh`)
- GitHub Actions workflow (`.github/workflows/deploy-production.yml`)
- Playwright E2E framework (phased: setup → auth → permissions → workflows → security)
- Supabase RLS with hospital scoping, `has_role` SECURITY DEFINER, `activity_logs` audit
- 2FA TOTP, feature flags (`useFeatureFlags`), AI Gateway integration
- TypeScript build passes; Supabase edge functions deployed

**Gaps blocking production (from skill audit):**
1. TS strict mode is **disabled** + 16 files have `@ts-nocheck` — masks real bugs
2. Test files excluded from build — coverage signal lost
3. No automated RLS validation script in CI (`npm run validate:rls` referenced but missing)
4. E2E `roles.fixture.ts` exists but workflow chain tests untested against current build
5. No staging soak (24hr) evidence before prod cutover
6. Feature flag kill-switches not verified end-to-end
7. Database migration reversibility not audited

---

## Plan: 4-Phase Production Hardening

### Phase 1 — Build Integrity Audit (DevOps Guardian)
- Inventory all 16 `@ts-nocheck` files; categorize as (a) safe to leave, (b) needs proper typing
- Re-enable strict TS in `tsconfig.app.json` for `src/lib/**` and `src/utils/**` only (isolate strict zones)
- Add `npm run type-check:strict` as CI gate (warns, doesn't block)
- Verify no `console.log` or hardcoded secrets via Semgrep scan

### Phase 2 — RLS & Security Validation (DevOps Guardian)
- Create `scripts/validate-rls.ts` that asserts:
  - Every patient-data table has `hospital_id` column + RLS policy
  - All policies reference `current_hospital_id()` or `has_role()`
  - No `FOR ALL TO public` policies on PHI tables
- Wire into `.github/workflows/deploy-production.yml` as pre-staging gate
- Run Supabase linter; document remediation for each finding

### Phase 3 — E2E Workflow Coverage (Browser Test Automation)
- Verify `tests/e2e/fixtures/roles.fixture.ts` authenticates all 7 roles
- Add critical-path workflow tests:
  - Patient registration → consultation → prescription → pharmacy dispense → billing
  - RBAC violation tests (receptionist blocked from pharmacy queue, nurse blocked from billing)
  - Concurrent prescription edit (optimistic lock validation)
  - Session expiry mid-workflow recovery
- Run `playwright.e2e-full.config.ts` against current build; capture failure report
- Fix or document each failure with severity (P0/P1/P2)

### Phase 4 — Deployment Safety Drill (DevOps Guardian)
- Execute `bash test-deployment.sh` and confirm all 10 test sections pass
- Dry-run `deploy-prod.sh` against staging (BLUE → GREEN swap)
- Trigger `rollback.sh` and measure RTO (target: <1 min)
- Verify feature flag kill-switch: toggle `PHASE_6_ENABLED=false` and confirm v2 components fall back to v1
- Audit last 10 migrations for reversibility (no `DROP COLUMN`, no destructive `ALTER`)
- Produce **Production Readiness Report** with go/no-go checklist

---

## Deliverables

| Artifact | Purpose |
|----------|---------|
| `scripts/validate-rls.ts` | Automated RLS gate in CI |
| `tests/e2e/tests/workflows/critical-path.spec.ts` | End-to-end clinical workflow coverage |
| `docs/PRODUCTION_READINESS_REPORT.md` | Go/no-go checklist with evidence |
| `docs/MIGRATION_REVERSIBILITY_AUDIT.md` | Schema change risk log |
| Updated `.github/workflows/deploy-production.yml` | RLS + strict-TS gates added |

## Out of Scope
- New clinical features (focus is hardening, not building)
- Performance load testing (separate effort)
- HIPAA legal sign-off (requires compliance officer)

## Estimated Effort
~12 hours total: Phase 1 (2h) + Phase 2 (3h) + Phase 4 (3h) + Phase 3 (4h)
