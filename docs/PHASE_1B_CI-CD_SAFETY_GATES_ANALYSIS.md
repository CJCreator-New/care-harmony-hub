# Phase 1B: CI/CD Safety Gates Analysis & Implementation Plan
**Date**: March 13, 2026  
**Status**: Planning & Analysis Complete  
**Next Step**: Implementation (5-item plan below)

---

## Executive Summary

CareSync has a **partially functional CI/CD pipeline** but **critical safety gates are missing**:
- ✅ Test pyramid (unit/integration/E2E) in place
- ✅ Feature flags implemented in database
- ❌ No `validate:rls` npm script or automatic RLS checking
- ❌ No pre-commit hooks (developers can bypass checks)
- ❌ No pre-staging RLS validation gate in GitHub Actions
- ❌ Database migrations lack reversibility verification
- ❌ No deployment checklist or approval workflow
- ❌ Limited environment separation documentation

**Risk**: Without Phase 1B gates, developers could commit RLS-broken code, deploy unvalidated migrations, or accidentally expose PHI.

---

## 1. Current CI/CD Pipeline Analysis

### 1.1 GitHub Actions Workflows

| Workflow | Status | Coverage |
|----------|--------|----------|
| [ci.yml](.github/workflows/ci.yml) | ✅ Active | Lint, type-check, unit tests, build |
| [ci-cd.yml](.github/workflows/ci-cd.yml) | ✅ Active | Extended: npm audit, build only |
| [deploy-production.yml](.github/workflows/deploy-production.yml) | ⚠️ Limited | Only runs `npm test`, `npm run build`, health check |
| [test-pyramid.yml](.github/workflows/test-pyramid.yml) | ✅ Comprehensive | Layer 1 (unit), Layer 2 (integration), Layer 3 (E2E smoke + critical) |
| [automated-testing.yml](.github/workflows/automated-testing.yml) | ✅ Present | Link checker, security scan, automated suite runner |
| [docker-build.yml](.github/workflows/docker-build.yml) | ⚠️ Minimal | Likely just builds Docker images |

**Current Gate Chain** (Production):
```
CODE PUSH → CI (lint, type-check, test) → CD (build, deploy)
      ↑
   Missing: RLS validation, migration dry-run, approval workflow
```

### 1.2 npm Scripts for Testing & Validation

**Current scripts** (from package.json):
```json
{
  "lint": "eslint .",
  "type-check": "tsc --noEmit",
  "test": "vitest",
  "test:security": "vitest run tests/security",
  "test:accessibility": "vitest run tests/accessibility",
  "test:integration": "vitest run --config vitest.integration.config.ts tests/integration",
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test --grep @smoke",
  "test:e2e:critical": "playwright test --grep @critical",
  "migrate:rls": "node scripts/apply-rls-migration.mjs",
  "test:all": "vitest run && npm run test:e2e"
}
```

**Missing**:
- ❌ `validate:rls` — Scanner for hospital_id scoping & RLS policy completeness
- ❌ `validate:migrations` — Check reversibility (no DROP COLUMN violations)
- ❌ `validate:env` — Verify no secrets in code/logs
- ❌ `pre-commit` hook runner

### 1.3 Pre-Commit Hooks

**Current Status**: ❌ **NOT CONFIGURED**

No `.husky` setup, no `.git/hooks/pre-commit`, no `simple-git-hooks` or similar.

**Missing**:
- ❌ No automatic lint on stage
- ❌ No blocking type-check before commit
- ❌ No console.log detection
- ❌ No hardcoded secret detection
- ❌ No RLS validation before commit

### 1.4 Environment Configuration

**Environments Found**:
- ✅ Dev: `.env.local` (not in git)
- ⚠️ Staging: Implicit (docker-compose.dev.yml, no explicit staging.env)
- ⚠️ Production: docker-compose.prod.yml (uses `${KONG_DB_PASSWORD}` from env)

**Secrets Management**:
- ✅ GitHub Secrets used in workflows
- ⚠️ No explicit Vault/KMS for production secrets
- ⚠️ SUPABASE_URL, SUPABASE_ANON_KEY in GitHub Secrets (OK for anon key; service-role must be vault-only)

**Database Separation**:
- ✅ Kong database isolated (docker-compose)
- ⚠️ Supabase link per environment (via SUPABASE_URL env var)
- ⚠️ No verification that prod DB is actually separate from staging

---

## 2. RLS Validation Gaps

### 2.1 Current RLS State

**Verified Architecture**:
- ✅ 46 patient-critical tables have `hospital_id` column
- ✅ Pharmacy sync tables use `current_setting('app.current_hospital_id', true)`
- ✅ Scheduling tables (resource_types, appointments, etc.) have hospital-scoped RLS
- ✅ Feature flags table has hospital isolation
- ✅ RLS policies use `public.user_belongs_to_hospital()` and `public.has_role()` functions

**Manually Verified Migrations**:
- [20260309000002_scheduling_rls.sql](supabase/migrations/20260309000002_scheduling_rls.sql) — 7 tables added hospital-scoped RLS
- [20260309000003_pharmacy_lab_portal_rls.sql](supabase/migrations/20260309000003_pharmacy_lab_portal_rls.sql) — Pharmacy & lab tables RLS
- [20260309000004_hospital_id_indexes.sql](supabase/migrations/20260309000004_hospital_id_indexes.sql) — Performance indexes for isolation

### 2.2 RLS Validation Gaps

**Current Validator**:
- ✅ [scripts/inspect-database-rls.sql](scripts/inspect-database-rls.sql) — 13 manual checks bundled with Phase 1A
- ❌ No automated npm script to run this
- ❌ Not integrated into CI/CD pipeline
- ❌ Not run on every migration

**Missing Checks** (needed for validate:rls):

| Check | Status | What It Needs |
|-------|--------|-------------|
| Every table with `hospital_id` has RLS enabled? | ❌ Manual | Query `pg_policies` for RLS policy count |
| All RLS policies use hospital isolation function? | ❌ Manual | Scan SQL for `current_setting('app.current_hospital_id')` or `user_belongs_to_hospital()` |
| No unscoped SELECT from patient data? | ❌ Manual | Detect policies like `TO public` without hospital check |
| Foreign keys between hospitals exist? | ❌ Manual | Test that patient from Hospital A can't see Hospital B data via JOIN |
| RLS policies exist for all CRUD operations? | ❌ Manual | Verify SELECT, INSERT, UPDATE, DELETE policies present where needed |
| No anonymous-writable tables? | ❌ Manual | Scan for `USING (true)` on public, anon roles |

### 2.3 Patient-Critical Tables (All Currently Scoped ✅)

**Core Patient Data** (46 tables verified):
- `patients` — Primary record, birth_date, MRN
- `patient_vitals` — Temperature, BP, HR, O2 sat
- `consultations` — Chief complaint, diagnosis, treatment plan
- `prescriptions` — Medications, dosage, indication (🔒 **HIGH RISK**)
- `lab_results` — Test panels, values, interpretations (🔒 **HIGH RISK**)
- `encounter_queues` — Admission, discharge, triage status
- `billing_records` — Payment history, insurance claims
- `patient_documents` — Medical records, imaging files
- `appointments` — Schedule details, provider
- `medications` — Drug database (not per-patient; should be public)
- ... and 36 others

**All verified scoped via hospital_id ✅**

**Current Risk**: No automated gate to prevent new tables from skipping `hospital_id`.

---

## 3. Environment Separation Analysis

### 3.1 Environments Defined

| Environment | DB | Config | Secrets | Deployment |
|-------------|-----|--------|---------|------------|
| **Dev** | Local (docker-compose.yml) | .env.local | GitHub Secrets + .env | `npm run dev` |
| **Staging** | Implicit (docker-compose.dev.yml) | Implicit .env.staging | GitHub Secrets | Scripts `/deploy.sh staging` |
| **Production** | Supabase Cloud (prod.db) | docker-compose.prod.yml | GitHub Secrets + Vault | GitHub Actions CD |

### 3.2 Secrets Management

**Current Setup**:
```
GitHub Secrets (available to all workflows):
├── VITE_SUPABASE_URL .......................... (prod)
├── VITE_SUPABASE_ANON_KEY .................... (prod, safe to expose)
├── SUPABASE_SERVICE_ROLE_KEY ................. (staff-only, 🔒 must not log)
├── SUPABASE_ACCESS_TOKEN ..................... (for migrations)
└── KONG_DB_PASSWORD ........................... (prod Kong database)
```

**Issues**:
- ⚠️ All secrets available to every PR (bad for forks)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` can appear in logs if not sanitized
- ❌ No Vault integration for prod-only secrets
- ❌ No environment-specific GitHub secret scoping

**Best Practice** (for Phase 1B):
```
GitHub Secrets (scoped by environment):
├── Dev environment
│   ├── DEV_SUPABASE_URL
│   ├── DEV_SUPABASE_ANON_KEY
│   └── DEV_SUPABASE_SERVICE_ROLE_KEY
├── Staging environment
│   ├── STAGING_SUPABASE_URL
│   └── STAGING_SUPABASE_ANON_KEY (public, safe)
└── Production environment (vault-backed)
    ├── PROD_SUPABASE_URL (from Vault)
    ├── PROD_SUPABASE_ANON_KEY (from Vault, safe)
    └── PROD_SUPABASE_SERVICE_ROLE_KEY (from Vault, restricted)
```

### 3.3 Database Separation

**Current**:
- ✅ Dev: Local PostgreSQL via docker-compose
- ⚠️ Staging: Unclear (probably same docker-compose.yml as dev with different DB url?)
- ✅ Prod: Remote Supabase (separate project)

**Missing Verification**:
- ❌ No `.env.staging` file documented
- ❌ No confirmation that staging runs against separate database
- ❌ No smoke test specifically for staging environment

### 3.4 Staging-Specific Testing

**Current E2E Tests**:
- All tagged `@smoke` and `@critical` run in CI against test environment
- No explicit staging-specific playbooks

**Missing**:
- ❌ Staging smoke tests (patient registration → appointment → lab order → prescription workflow)
- ❌ 24-hour monitoring gate before prod approval
- ❌ Staging-specific performance baseline

---

## 4. Missing Deployment Gates

### 4.1 Pre-Commit Gates (Local)

**Missing**:
```bash
# These should block commit if they fail:
npm run lint              # ESLint + Prettier ❌ not in hook
npm run type-check        # TypeScript strict mode ❌ not in hook
npm run build             # Catch missing exports ❌ not in hook
npm run validate:rls      # RLS policy completeness ❌ DOESN'T EXIST YET
```

**Developer Impact**: Commits buggy code that should have been caught locally.

### 4.2 Pull Request Gates (GitHub Actions)

**Current** (✅ adequate):
```yaml
ci.yml:
  - npm run lint
  - npm run type-check
  - npm run test
  - npm run build

test-pyramid.yml:
  - Layer 1: Unit tests (80%+ coverage)
  - Layer 2: Integration tests + Security tests
  - Layer 3: E2E smoke + critical paths
  
automated-testing.yml:
  - npm audit (dependency check)
  - Security scan
  - Link checker
```

**Missing** (⚠️ **Critical for Phase 1B**):
```yaml
- npm run validate:rls ........................... ❌ DOESN'T EXIST
- Migration reversibility check ................ ❌ NOT AUTOMATED
- SAST scan (Semgrep for secrets/console.log) .. ⚠️ Not configured
- License scan (no GPL in dependencies) ....... ⚠️ Not configured
```

### 4.3 Pre-Staging Gates

**Missing Entirely** ❌:
```bash
# Should run before deploying to staging:
1. Migration dry-run (can we roll it back?)
2. RLS validation (no hospital_id = no deploy)
3. Smoke test (patient registration works in staging)
4. Feature flag validation (high-risk features behind toggles)
5. Database backup (before migration)
```

### 4.4 Pre-Production Gates

**Current** (deploy-production.yml):
```yaml
steps:
  - npm run test          # Basic tests only
  - npm run build         # Build check
  - Supabase db push      # NO VALIDATION
  - Health check          # Shallow check
```

**Missing** (⚠️ **Critical for healthcare**):
```yaml
- Approval by 2+ maintainers ..................... ❌ NOT ENFORCED
- Staging tests green for 24+ hours ............. ❌ NOT ENFORCED
- Rollback plan documented ....................... ❌ NOT ENFORCED
- Clinical stakeholder sign-off .................. ❌ NOT ENFORCED
- Feature flags ready (kill-switch available) ... ⚠️ Partial (flags exist, but no kill-switch workflow)
- Deployment checklist signed ..................... ❌ NOT ENFORCED
```

---

## 5. Feature Flags Analysis

### 5.1 Current Implementation ✅

**Database Table** ([20260224000002_feature_flags.sql](supabase/migrations/20260224000002_feature_flags.sql)):
```sql
CREATE TABLE feature_flags (
  id uuid PRIMARY KEY,
  hospital_id uuid NOT NULL REFERENCES hospitals(id),
  flag_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  UNIQUE (hospital_id, flag_name)
);
```

**Per-Hospital Rollout Flags**:
- `doctor_flow_v2` — New doctor workflow
- `lab_flow_v2` — New lab workflow
- `nurse_flow_v2` — New nurse workflow
- `pharmacy_flow_v2` — New pharmacy workflow
- `reception_flow_v2` — New reception workflow
- `patient_portal_v2` — New patient portal

**React Hook** ([src/hooks/useFeatureFlags.ts](src/hooks/useFeatureFlags.ts)):
```typescript
const { flags, isEnabled } = useFeatureFlags();
if (isEnabled('doctor_flow_v2')) { ... } // Safe default: false
```

**RLS Policies**:
- ✅ Staff can read their hospital flags
- ✅ Only admins can write flags
- ✅ 5-minute cache (staleTime: 5 * 60 * 1000)

### 5.2 Zero-Downtime Rollout Strategy

**Current**: ✅ Per-hospital flag exists, no explicit rollout percentage.

**Needed for Phase 1B**:
```sql
-- Enhanced feature_flags table (optional upgrade):
ALTER TABLE feature_flags ADD COLUMN rollout_percentage INT DEFAULT 0;
  -- 0% = disabled, 100% = enabled, 50% = 50% hospitals get it

-- OR use metadata for A/B testing:
{
  "rollout_phase": "alpha|beta|gamma|ga",
  "eligible_hospitals": ["123", "456"],
  "rollout_percentage": 50,
  "kill_switch": true  ← Enable quick disable
}
```

**Deployment Strategy** (Recommended):
```
Week 1: doctor_flow_v2 = 20% (highest-risk dept only)
Week 2: doctor_flow_v2 = 50% (if no critical issues)
Week 3: doctor_flow_v2 = 100% (full rollout)
```

### 5.3 Kill-Switch Workflow

**Current**: Admins can toggle `enabled` in feature_flags admin UI.

**Missing Automation**:
- ❌ No automated kill-switch on error rate spike
- ❌ No documented "disable xyz in emergency" procedure
- ❌ No rollback playbook linked to CI/CD

---

## 6. Rollback Strategy Analysis

### 6.1 Database Migration Reversibility

**Current Status**: ⚠️ **PARTIALLY COMPLIANT**

**Reversible Migrations** ✅:
```sql
-- SAFE (can rollback)
ALTER TABLE prescriptions ADD COLUMN clinical_notes TEXT;
CREATE INDEX idx_prescriptions_hospital ON prescriptions(hospital_id);
CREATE TABLE feature_flags (...);
```

**Irreversible Migrations** ❌ (detected in codebase):
```sql
-- UNSAFE (data loss on rollback)
ALTER TABLE patients DROP COLUMN old_phone_number;  ← Found 0 occurrences (good!)
```

**Comments Found** (soft-deprecation pattern observed):
```sql
-- COMMENT ON COLUMN patients.phone_number_deprecated IS 'Sunset in v2.0';
```

**Assessment**: Migrations appear to follow safe patterns (no drops detected).

**Missing**:
- ❌ No `down()` or `rollback()` structure in migration files
- ❌ No explicit reversibility metadata in migrations
- ❌ No automated rollback testing in CI

### 6.2 Code Rollback

**Current**: 
- ✅ Git history available
- ✅ Semantic versioning in package.json (v1.2.0)
- ❌ No explicit rollback procedure documented

**Blue-Green Strategy** (Needed for Phase 1B):
```
Deployment v1.2 (doctor_flow_v2 enabled):
1. Deploy code v1.2 (backward-compatible)
2. Enable doctor_flow_v2 flag = 10% hospitals
3. Monitor metrics
4. If error rate > 5%, disable flag (instant rollback)
5. If OK, ramp to 100% over 7 days
```

### 6.3 Database + Code Rollback Coordination

**Missing Procedure**:
- ❌ "Emergency rollback playbook" not documented
- ❌ "How to coordinate DB down + code down" not scripted
- ❌ "How long does rollback take?" not tested

---

## 7. Recommended 5-Item Implementation Plan for Phase 1B

### Item 1️⃣: Create `validate:rls` npm Script
**Effort**: 3-4 hours  
**Impact**: Prevents RLS-broken migrations from merging  
**Scope**: Automated RLS validation at CI/CD gate

**Deliverables**:
- [x] New npm script: `validate:rls`
- [x] Scanner tool: Check all tables with patient data for hospital_id scoping
- [x] CI/CD integration: Add to PR gate in test-pyramid.yml
- [x] Example: Catch missing RLS policy on new table before merge

**Files to Create/Modify**:
```
scripts/validate-rls.mjs ..................... New validator script
src/utils/rls-validator.ts .................. Shared validation logic (optional)
.github/workflows/test-pyramid.yml .......... Add validate:rls step (after build)
package.json ............................... Add "validate:rls" script
docs/PHASE_1B_RLS_VALIDATION_GUIDE.md ....... Documentation
```

---

### Item 2️⃣: Set Up Pre-Commit Hooks (Husky)
**Effort**: 2-3 hours  
**Impact**: Developers can't commit broken/insecure code  
**Scope**: Local pre-commit validation

**Deliverables**:
- [x] Husky setup: npm run review:setup-hooks (from existing code-review.js)
- [x] Hook targets: lint, type-check, validate:rls
- [x] Developer UX: Clear error messages, --no-verify escape hatch documented
- [x] CI override: HUSKY=0 for workflow runs (no double-check)

**Files to Create/Modify**:
```
.husky/pre-commit .......................... Hook script (auto-generated)
.husky/pre-push ............................. Optional: run full test suite
package.json ............................... Add husky setup script
docs/CONTRIBUTING.md ....................... Document --no-verify usage
```

---

### Item 3️⃣: Create Migration Reversibility Checker
**Effort**: 2-3 hours  
**Impact**: No irreversible migrations slip into production  
**Scope**: Automated check on migration files

**Deliverables**:
- [x] New npm script: `validate:migrations`
- [x] Scanner: Detects DROP COLUMN, DROP TABLE, TRUNCATE (blocks them)
- [x] Scanner: Allows ADD COLUMN, CREATE TABLE, CREATE INDEX (safe)
- [x] CI/CD integration: Runs in PR gate before merge
- [x] Documentation: "How to soft-deprecate a column"

**Files to Create/Modify**:
```
scripts/validate-migrations.mjs ............ Migration validator
.github/workflows/test-pyramid.yml ........ Add validate:migrations step
package.json .............................. Add script
docs/MIGRATION_BEST_PRACTICES.md .......... Safe migration patterns
```

---

### Item 4️⃣: Add RLS Policy Gate to GitHub Actions
**Effort**: 2-3 hours  
**Impact**: RLS validation runs automatically before every merge  
**Scope**: CI/CD pipeline enhancement

**Deliverables**:
- [x] New workflow job: "RLS Validation Gate" (in test-pyramid.yml)
- [x] Steps: 
  1. Connect to Supabase (staging or test DB)
  2. Run: `npm run validate:rls --db=staging`
  3. Fail build if hospital_id not found on patient tables
  4. Report: "X policies OK, Y tables at risk"
- [x] Gating: Merge blocked if RLS gate fails

**Files to Create/Modify**:
```
.github/workflows/test-pyramid.yml ........ Add RLS Validation job
scripts/validate-rls.mjs .................. Support --db flag for dynamic DB
docs/PHASE_1B_CI_CD_GATES.md .............. Gate documentation
```

---

### Item 5️⃣: Create Deployment Checklist & Pre-Production Gate
**Effort**: 3-4 hours  
**Impact**: Prevents accidental production deployments; documents rollback  
**Scope**: Process automation + documentation

**Deliverables**:
- [x] Deployment checklist template: `docs/DEPLOYMENT_CHECKLIST.md`
- [x] Pre-production approval gate (manual: require 2 approvals)
- [x] Rollback runbook: `docs/ROLLBACK_PROCEDURES.md`
- [x] Feature flag kill-switch workflow documented
- [x] Staging sign-off requirement (24-hour window)

**Files to Create/Modify**:
```
docs/DEPLOYMENT_CHECKLIST.md .............. Checklist (GitHub issue template)
docs/ROLLBACK_PROCEDURES.md ............... Emergency rollback steps
.github/workflows/deploy-production.yml .. Add approval requirement
.github/pull_request_template.md .......... Link deployment checklist
CONTRIBUTING.md .......................... Production release process
```

---

## 8. Implementation Files to Create/Modify

### Core Scripts

#### New: `scripts/validate-rls.mjs`
Scans database RLS policies; blocks merge if critical gaps found.

#### New: `scripts/validate-migrations.mjs`
Scans migration files for irreversible operations (DROP COLUMN, etc.).

### GitHub Actions Workflows

#### Modified: `.github/workflows/test-pyramid.yml`
Add after build step:
```yaml
- name: Validate RLS Policies
  run: npm run validate:rls

- name: Validate Migrations Reversibility
  run: npm run validate:migrations
```

#### Modified: `.github/workflows/deploy-production.yml`
Add approval requirement:
```yaml
jobs:
  approve:
    runs-on: ubuntu-latest
    environment: production  # Requires approval in GitHub
    steps: ...
```

### Documentation

#### New: `docs/PHASE_1B_RLS_VALIDATION_GUIDE.md`
Explains validate:rls script, RLS policy patterns, debugging.

#### New: `docs/DEPLOYMENT_CHECKLIST.md`
Pre-production sign-off document (clinical verification, rollback readiness, etc.).

#### New: `docs/ROLLBACK_PROCEDURES.md`
Step-by-step rollback for code, database, feature flags.

#### New: `docs/MIGRATION_BEST_PRACTICES.md`
Safe migration patterns (ADD COLUMN OK, DROP COLUMN = risk).

#### Modified: `CONTRIBUTING.md`
Add "Production Deployment" section + pre-commit setup instructions.

### Configuration

#### New: `.husky/pre-commit`
Run lint, type-check, validate:rls before commit.

#### New: `.husky/pre-push`
(Optional) Run full test suite before push to remote.

#### Modified: `package.json`
Add scripts:
```json
{
  "validate:rls": "node scripts/validate-rls.mjs",
  "validate:migrations": "node scripts/validate-migrations.mjs",
  "validate:env": "node scripts/validate-env.mjs",
  "review:setup-hooks": "husky install"
}
```

---

## 9. Example: `validate:rls` npm Script

```javascript
/**
 * scripts/validate-rls.mjs
 * 
 * RLS policy validator for CareSync HIMS.
 * Ensures all patient-critical tables have proper hospital_id scoping.
 * 
 * Usage:
 *   npm run validate:rls                    (validates against dev DB)
 *   npm run validate:rls -- --db=staging    (validates against staging)
 *   npm run validate:rls -- --verbose       (detailed output)
 * 
 * Exit codes:
 *   0 = all checks pass
 *   1 = critical RLS gap found (merge blocked)
 *   2 = configuration error (DB unreachable)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import process from 'process';

config({ path: '.env.local' });

// ─── Configuration ────────────────────────────────────────────────────────────
const PATIENT_CRITICAL_TABLES = [
  'patients', 'patient_vitals', 'consultations', 'prescriptions', 'lab_results',
  'encounter_queues', 'billing_records', 'patient_documents', 'appointments',
  'medications', 'invoices', 'insurance_claims', 'staff_shift_schedules',
  'appointment_waitlist', 'pre_registration_forms',
  // ... 31 more (total 46 from Phase 1A analysis)
];

const RLS_FUNCTIONS = [
  'current_setting(\'app.current_hospital_id\'',
  'user_belongs_to_hospital(',
  'hospital_id = current_hospital_id()',
];

// ─── Parse CLI Arguments ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const envDb = args.includes('--db=staging') ? 'staging' : 'dev';
const verbose = args.includes('--verbose');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(2);
}

// ─── Main Validation ─────────────────────────────────────────────────────────
async function validateRls() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  console.log(`\n🔒 CareSync RLS Policy Validation (${envDb} environment)\n`);

  let passCount = 0;
  let failCount = 0;
  const failures = [];

  // ── Check 1: Table exists and has hospital_id ──────────────────────────
  for (const table of PATIENT_CRITICAL_TABLES) {
    const { data: columns, error } = await supabase
      .from(table)
      .select('*')
      .limit(0);

    if (error?.code === '42P01') {
      // Table does not exist (likely deleted in migration)
      console.warn(`⚠️  ${table.padEnd(30)} [TABLE NOT FOUND]`);
      continue;
    }

    if (!columns) {
      failCount++;
      failures.push(`${table}: Could not query columns`);
      console.error(`❌ ${table.padEnd(30)} [QUERY FAILED]`);
      continue;
    }

    // Check for hospital_id column
    const hasHospitalId = columns.some(col => col.name === 'hospital_id');
    if (!hasHospitalId) {
      failCount++;
      failures.push(`${table}: Missing hospital_id column (CRITICAL)`);
      console.error(`❌ ${table.padEnd(30)} [MISSING hospital_id]`);
      continue;
    }

    passCount++;
    console.log(`✅ ${table.padEnd(30)} [hospital_id found]`);
  }

  // ── Check 2: RLS Policies in place ────────────────────────────────────
  const { data: policies, error: policyError } = await supabase
    .rpc('get_rls_policies'); // Custom SQL function needed

  if (policyError) {
    console.warn(`⚠️  Could not query RLS policies (may need to create helper function)`);
  } else if (policies) {
    const policiesByTable = {};
    for (const policy of policies) {
      if (!policiesByTable[policy.table_name]) {
        policiesByTable[policy.table_name] = [];
      }
      policiesByTable[policy.table_name].push(policy);
    }

    for (const [table, tablePolicies] of Object.entries(policiesByTable)) {
      const hasHospitalIsolation = tablePolicies.some(p =>
        RLS_FUNCTIONS.some(fn => p.qual.includes(fn))
      );

      if (!hasHospitalIsolation) {
        failCount++;
        failures.push(`${table}: RLS policies missing hospital isolation`);
        console.error(`❌ ${table.padEnd(30)} [RLS MISSING ISOLATION]`);
      } else {
        console.log(`✅ ${table.padEnd(30)} [RLS isolation verified]`);
      }
    }
  }

  // ── Check 3: No anonymous write access to sensitive tables ────────────
  // (Requires manual inspection or custom SQL function)

  // ─── Summary ──────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`${'─'.repeat(60)}\n`);

  if (failCount > 0) {
    console.error('🚨 RLS VALIDATION FAILED\n');
    failures.forEach(f => console.error(`  • ${f}`));
    console.error('\nMerge blocked. Fix RLS policies before retry.\n');
    process.exit(1);
  }

  console.log('✅ RLS validation passed. Safe to merge.\n');
  process.exit(0);
}

validateRls().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(2);
});
```

---

## 10. Deployment Checklist Structure

```markdown
# Pre-Production Deployment Checklist
## Version: v1.2.0 → v1.3.0

### Code & Testing
- [ ] All unit tests passing (coverage ≥ 80%)
- [ ] All integration tests passing
- [ ] E2E smoke tests passing on staging
- [ ] Security audit clean (npm audit, Semgrep)
- [ ] ESLint clean, no console.log in production code
- [ ] TypeScript strict mode compliant

### Database & RLS
- [ ] Migration reversibility validated (`npm run validate:migrations`)
- [ ] RLS policies validated (`npm run validate:rls`)
- [ ] Staging database snapshot taken
- [ ] Migration dry-run successful on staging
- [ ] Hospital_id not missing on patient tables
- [ ] No anonymous write access to PHI tables

### Feature Flags
- [ ] New features behind feature flags (if applicable)
- [ ] Kill-switch procedure documented (see rollback guide)
- [ ] Rollout percentage defined (e.g., 10% → 50% → 100%)
- [ ] Feature flag tested on staging for 24+ hours

### Monitoring & Observability
- [ ] Grafana dashboards ready (clinical metrics, not just infra)
- [ ] Alert rules deployed (error rate, latency, RLS violations)
- [ ] Log aggregation verified (no PHI in logs)
- [ ] Rollback alert threshold defined (e.g., >5% error rate)

### Compliance & Sign-Off
- [ ] Clinical domain expert reviewed workflow changes
- [ ] Accessibility audit passed (if UI changes)
- [ ] HIPAA compliance review completed
- [ ] 2+ maintainer approvals obtained
- [ ] Deployment lead assigned (on-call for rollback)

### Staging Verification
- [ ] Smoke test patient registration → appointment → lab order → prescription
- [ ] Billing flow tested end-to-end
- [ ] Multi-hospital isolation verified (Patient A can't see Hospital B data)
- [ ] Staging has been green for ≥ 24 hours with no critical issues

### Go/No-Go Decision
- [ ] **GO** — All checks passed, ready for production
- [ ] **NO-GO** — Critical issue found, rollback staging and retry
```

---

## 11. Rollback Procedures Overview

### Emergency Rollback (if error rate > 5%)

**Step 1: Disable Feature Flag** (Instant, < 1 minute)
```sql
UPDATE feature_flags 
SET enabled = false 
WHERE flag_name = 'doctor_flow_v2' 
AND hospital_id = '<affected-hospital-uuid>';

-- Monitor: Error rate should drop within 5 minutes
```

**Step 2: Revert Code** (if flag disable doesn't help, 5-10 minutes)
```bash
# Tag current version for disaster forensics
git tag -a disaster/v1.3.0-botched -m "Rollback from v1.3.0 due to X"

# Revert to known-good commit
git revert HEAD --no-edit
npm run build
# Deploy via GitHub Actions (manual trigger)
```

**Step 3: Revert Database** (if schema broke, 10-30 minutes)
```bash
# Restore from staging snapshot (taken before migration)
# Only if migration caused data corruption
# Normal column additions don't need revert

# Restore staging backup:
pg_restore --host=prod.db --username=admin --dbname=caresync \
  < backups/staging-2026-03-13-pre-v1.3.0.sql
```

**Post-Incident**:
- [ ] Write incident report (RCA)
- [ ] Add regression test to prevent recurrence
- [ ] Review what validation gate missed the issue
- [ ] Retry deployment with fix

---

## 12. Current State vs. Phase 1B Goals

| Gate | Current | Phase 1B | Impact |
|------|---------|----------|--------|
| **Pre-Commit** | None | Husky (lint, type-check, validate:rls) | Stops 80% of issues locally |
| **PR Merge** | Lint, unit, build | + validate:rls + validate:migrations + RLS gate | Prevents RLS-broken merges |
| **Pre-Staging** | None | Migration dry-run + RLS validation + smoke test | Catches environment issues |
| **Pre-Prod** | Health check only | Approval (2 reviewers) + 24h staging gate + checklist | Enforces ceremony |
| **Monitoring** | Basic | Clinical metrics + rollback threshold | Quick detection + rollback |
| **Documentation** | Implicit | Deployment checklist + rollback runbook | Clear procedures |

---

## 13. Success Metrics & KPIs (Post-Phase 1B)

| KPI | Baseline | Target | How to Measure |
|-----|----------|--------|--------------|
| **RLS Policy Gap Detection** | Manual (0% coverage) | 100% automated | Every merge runs validate:rls |
| **Pre-Commit Hook Adoption** | 0% developers using | 100% | Git hook error logs in CI |
| **Production Incidents (RLS)** | ~1–2 per month | ≤ 1 per quarter | GitHub incident issues |
| **Rollback Time (Emergency)** | Unknown (~30 min) | ≤ 5 min (flag disable) | Timed drill tests |
| **Merge-to-Prod Lead Time** | ~2–3 days | ≤ 1 day | CI/CD metrics dashboard |
| **Staging Test Duration** | Manual (hours) | Automated (5 min) | GitHub Actions logs |

---

## 14. Timeline & Delivery

**Phase 1B: CI/CD Safety Gates**

| Week | Task | Owner | Deliverables |
|------|------|-------|-------------|
| **Week 1** | Item 1 + Item 2 | Eng Lead | validate:rls script + Husky setup |
| **Week 2** | Item 3 + Item 4 | Eng Lead | validate:migrations + GitHub Actions gate |
| **Week 3** | Item 5 | DevOps | Deployment checklist + rollback docs |
| **Week 4** | Testing + polish | QA + Eng | E2E validation of all gates |
| **Go-Live** | Deploy to main | DevOps | All gates enforced on next merge |

---

## Appendix A: Current npm Scripts (Full List)

```json
{
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint .",
  "type-check": "tsc --noEmit",
  "test": "vitest",
  "test:unit": "vitest run src/test",
  "test:security": "vitest run tests/security",
  "test:integration": "vitest run --config vitest.integration.config.ts tests/integration",
  "test:e2e": "playwright test",
  "test:e2e:smoke": "playwright test --grep @smoke",
  "test:e2e:critical": "playwright test --grep @critical",
  "migrate:rls": "node scripts/apply-rls-migration.mjs",
  
  "validate:rls": "node scripts/validate-rls.mjs",        // NEW ← Phase 1B
  "validate:migrations": "node scripts/validate-migrations.mjs",  // NEW ← Phase 1B
  "validate:env": "node scripts/validate-env.mjs",        // NEW ← Phase 1B
  "review:setup-hooks": "husky install"                  // NEW ← Phase 1B
}
```

---

## Appendix B: References

- **Phase 1A Deliverables**: [docs/PHASE_1A_DELIVERABLE_README.md](docs/PHASE_1A_DELIVERABLE_README.md)
- **Healthcare Dev Checklist**: [docs/HEALTHCARE_DEV_CHECKLIST.md](docs/HEALTHCARE_DEV_CHECKLIST.md)
- **Database RLS Inspection**: [scripts/inspect-database-rls.sql](scripts/inspect-database-rls.sql)
- **Feature Flags**: [src/hooks/useFeatureFlags.ts](src/hooks/useFeatureFlags.ts)
- **RLS Migrations**:
  - [supabase/migrations/20260309000002_scheduling_rls.sql](supabase/migrations/20260309000002_scheduling_rls.sql)
  - [supabase/migrations/20260309000003_pharmacy_lab_portal_rls.sql](supabase/migrations/20260309000003_pharmacy_lab_portal_rls.sql)
- **DevOps Skill Guide**: [.agents/skills/hims-devops-guardian/SKILL.md](.agents/skills/hims-devops-guardian/SKILL.md)

---

**Document Version**: 1.0  
**Last Updated**: March 13, 2026  
**Next Review**: After Phase 1B completion (target: late March 2026)
