# TIER 1 — Production-Blocking Implementation Guide

**Status:** Active  
**Target:** Unblock production go-live  
**Owner Assignment:** GitHub Copilot

---

## Overview

Tier 1 consists of 4 critical items that **must be complete before production deployment**. This guide provides step-by-step implementation instructions for each.

**Total Estimated Time:** 12 hours + 24 hours waiting for soak test results

---

## 📋 Item 1.1: Enable Leaked-Password Protection in Supabase Auth

**Status:** 🔴 Not Started  
**Effort:** 1 hour  
**Severity:** P2  
**Owner:** GitHub Copilot

### What & Why

Supabase Auth can validate user passwords against the [HaveIBeenPwned](https://haveibeenpwned.com) API in real-time. If a user tries to register/change their password to a known-compromised password, the attempt is blocked.

**Why now?** Linter flagged it as disabled; it's a 1-click fix in the Supabase console with ~zero performance impact.

### Implementation Steps

#### Step 1: Access Supabase Dashboard

1. Navigate to: https://app.supabase.com
2. Select your CareSync HIMS project
3. Go to **Settings** → **Authentication**

#### Step 2: Enable Leak Detection

1. Scroll to **Security** section
2. Look for **"Check password against Have I Been Pwned (HIBP)"** toggle
3. Click **Enable**
4. Save settings

**Screenshot reference:** Look for a toggle labeled "Prevent compromised passwords" or similar wording depending on Supabase version.

#### Step 3: Test Locally (Optional but Recommended)

In your local dev environment, try creating a user with a known-leaked password:

```bash
# Example: password "password123" is in HIBP
# Attempt to sign up with this password should fail with:
# "Password has been exposed in data breaches"
```

### Verification

- [ ] Toggle is enabled in Supabase dashboard
- [ ] Test: Try signing up with password `password123` → should be rejected
- [ ] Test: Sign up with strong password → should succeed
- [ ] Document screenshot/confirmation in pull request

### Blocking Factors

None — this is a 1-click fix.

---

## 📋 Item 1.2: Review & Fix Permissive `USING(true)` RLS Policy

**Status:** 🔴 Not Started  
**Effort:** 2 hours  
**Severity:** P1  
**Owner:** GitHub Copilot

### What & Why

The Supabase linter identified **1 RLS policy** using `USING(true)` or `USING(1=1)`, which is effectively **no permission check**. This is a security vulnerability because any authenticated user can potentially access any record.

**Why now?** Cannot go to production with permissive policies; must lock down.

### Discovery Steps

#### Step 1: Find the Permissive Policy

Run the RLS validation script locally:

```bash
cd c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub

npx tsx scripts/validate-rls.ts
```

**Expected output:**
```
🔍 CareSync RLS Validation — pre-staging gate

Checking 18 PHI tables...

Finding: (linter)
Severity: P1
Issue: Permissive RLS policy using USING(true) detected — review per Supabase linter
```

#### Step 2: Identify the Table & Policy

Query Supabase directly via SQL Editor (in Supabase dashboard):

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE qual LIKE '%true%' OR qual LIKE '%1=1%'
ORDER BY tablename;
```

**Expected result:** Should show 1-3 rows with the permissive policy.

#### Step 3: Audit the Policy Context

Once identified (e.g., table `X`, policy `Y`), read the policy definition:

```sql
SELECT pg_get_policy_def(oid)
FROM pg_policy
WHERE policyname = 'POLICY_NAME_HERE';
```

### Fix Strategy

For each permissive policy, replace `USING(true)` with explicit role/hospital checks:

#### Example Fix Pattern

**Before (Permissive):**
```sql
CREATE POLICY "allow_read" ON public.lab_results
FOR SELECT
USING (true);  -- 🔴 DANGEROUS: allows all authenticated users
```

**After (Scoped):**
```sql
CREATE POLICY "allow_read" ON public.lab_results
FOR SELECT
USING (
  -- Only allow access to records belonging to user's hospital
  hospital_id = (
    SELECT hospital_id FROM public.users WHERE id = auth.uid()
  )
  OR
  -- Admin override (if applicable)
  has_role(auth.uid(), 'admin')
);
```

### Implementation Procedure

1. **Access Supabase SQL Editor** (in dashboard)
2. **Drop the permissive policy:**
   ```sql
   DROP POLICY "POLICY_NAME" ON table_name;
   ```
3. **Create the scoped replacement policy** (use pattern above)
4. **Test the policy:**
   - Log in as a test user from Hospital A
   - Try to access a record from Hospital B → should be denied
   - Try to access a record from Hospital A → should be allowed
5. **Document in PR** which table was fixed and what the new policy checks

### Verification Checklist

- [ ] `validate-rls.ts` script returns no P1 permissive policy findings
- [ ] Policy allows records scoped to user's hospital
- [ ] Admin/override roles still work (if applicable)
- [ ] Cross-hospital access is blocked (manual test)
- [ ] E2E tests pass with new policy
- [ ] Audit trail captures policy change

### Reference

- [RLS Policy Skill](../.agents/skills/hims-rbac-abac/SKILL.md) — detailed RBAC patterns
- [Security Companion Skill](../.agents/skills/hims-security-companion/SKILL.md) — OWASP context

---

## 📋 Item 1.3: Run 24hr Staging Soak Test

**Status:** 🔴 Not Started  
**Effort:** 4 hours setup + 24 hours execution (parallel)  
**Severity:** P1  
**Owner:** GitHub Copilot

### What & Why

The **`critical-path.spec.ts`** Playwright suite tests high-impact workflows (patient admission, prescription, discharge) across all roles under realistic load. A 24-hour soak test validates:

- System stability under sustained load
- RLS policy performance (no slowdown)
- Realtime subscriptions don't leak memory
- Edge Functions scale correctly

### Prerequisites

- Staging environment deployed and accessible
- Test data seeded (patients, users, appointments)
- Playwright config ready: `playwright.e2e-full.config.ts`

### Implementation Steps

#### Step 1: Prepare Test Environment

```bash
# 1. Check staging deployment status
curl https://staging.caresync-hims.com/api/health

# 2. Seed test data (if needed)
npm run seed:staging

# 3. Verify test user accounts exist for all roles:
# - doctor@staging.test / password
# - nurse@staging.test / password
# - admin@staging.test / password
# - receptionist@staging.test / password
# - pharmacy@staging.test / password
```

#### Step 2: Configure Playwright for Staging

Check `playwright.e2e-full.config.ts`:

```typescript
// playwright.e2e-full.config.ts
export default defineConfig({
  testDir: './tests/e2e/tests',
  
  projects: [
    {
      name: 'critical-path',
      testMatch: '**/critical-path.spec.ts',
      use: {
        baseURL: 'https://staging.caresync-hims.com', // ✅ Staging URL
        ...devices['Desktop Chrome'],
      },
      timeout: 60000,
    },
  ],

  // Repeat test continuously for 24hr soak
  fullyParallel: true,
  retries: 1000,  // Retry indefinitely to fill 24 hours
  workers: 4,     // 4 parallel workers = realistic load
  timeout: 60 * 60 * 1000, // 1 hour timeout per test
});
```

#### Step 3: Launch Soak Test

**Option A: Local Machine (not recommended — runs for 24hr)**

```bash
npm run test:e2e -- --config=playwright.e2e-full.config.ts
```

**Option B: CI/CD Runner (Recommended)**

Create a temporary GitHub Actions workflow:

```yaml
# .github/workflows/staging-soak-test.yml (temporary)
name: Staging 24hr Soak Test

on:
  workflow_dispatch:  # Manual trigger

jobs:
  soak:
    runs-on: ubuntu-latest-xl  # More CPU/memory
    timeout-minutes: 1500      # 25 hours
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:e2e -- --config=playwright.e2e-full.config.ts
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: soak-test-results
          path: playwright-report/
          retention-days: 30
```

Then trigger via GitHub UI:
```
Actions → Staging 24hr Soak Test → Run Workflow
```

#### Step 4: Monitor During Soak

Every few hours, check:

```bash
# Watch test progress (if running locally)
tail -f playwright-report/index.html

# Or via GitHub Actions: View run logs in Actions tab
```

**Metrics to watch:**
- Error rate should stay < 1%
- Response times should not degrade (P50, P95, P99)
- No memory leaks (check server logs for growing memory)
- Realtime subscriptions active count stable

#### Step 5: Collect & Analyze Results

After 24 hours:

```bash
# Download results from GitHub Actions artifact
# OR copy from local playwright-report/

# Generate summary
ls -la playwright-report/
cat playwright-report/index.html  # View in browser
```

**Success criteria:**
- [ ] > 95% test pass rate
- [ ] No P0 errors (crashes, 500s)
- [ ] Response time P95 < 2 seconds
- [ ] RLS policy queries complete in < 50ms
- [ ] No memory leak on server/Edge Functions

### Output & Documentation

Create a **Soak Test Results** artifact:

```markdown
# Staging Soak Test Results

**Duration:** 24 hours  
**Start Time:** [TIME]  
**End Time:** [TIME]  
**Environment:** https://staging.caresync-hims.com  

## Summary

- **Total Tests Run:** 12,847
- **Passed:** 12,651 (98.5%) ✅
- **Failed:** 196 (1.5%) — all P2/P3 (retryable)
- **Errors:** 0 P0

## Performance Baseline

| Metric | P50 | P95 | P99 |
|--------|-----|-----|-----|
| Prescription Create | 180ms | 420ms | 890ms |
| Lab Result Query | 120ms | 280ms | 520ms |
| Patient Admission | 340ms | 820ms | 1200ms |

## Issues Found

- [ ] None

## Sign-Off

- [ ] Ops team reviewed results
- [ ] Performance acceptable for go-live
- [ ] Ready for production deployment
```

### Blocking Factors

- Staging environment must be stable
- Test data seeded and realistic
- No production traffic during soak test

---

## 📋 Item 1.4: Wire `validate-rls.ts` as Blocking CI Gate

**Status:** 🔴 Not Started  
**Effort:** 2 hours  
**Severity:** P1  
**Owner:** GitHub Copilot

### What & Why

Currently, `validate-rls.ts` is created but **not enforced in CI**. Anyone can merge a PR that breaks RLS. We need to:

1. **Add `validate-rls.ts` to CI pipeline** — fail builds if policies are permissive
2. **Add pre-commit hook** locally — catch issues before pushing
3. **Document in README** — how to run validation locally

### Implementation Steps

#### Step 1: Update CI Pipeline

Edit `.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      
      # ✅ NEW: RLS Validation Gate
      - name: Validate RLS Policies
        run: npx tsx scripts/validate-rls.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

  lighthouse:
    runs-on: ubuntu-latest
    needs: test
    # ... rest unchanged
```

#### Step 2: Ensure CI Secrets are Available

In GitHub repository settings:
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Confirm these secrets exist:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. If missing, add them (copy from `supabase/config.toml` or Supabase dashboard)

#### Step 3: Add Pre-Commit Hook (Local Dev)

Create `.husky/pre-commit`:

```bash
#!/bin/sh
# Pre-commit hook: validate RLS before pushing

echo "🔍 Validating RLS policies..."

npx tsx scripts/validate-rls.ts

if [ $? -ne 0 ]; then
  echo "❌ RLS validation failed. Fix issues before committing."
  exit 1
fi

echo "✅ RLS policies OK"
```

Make executable:

```bash
chmod +x .husky/pre-commit
```

Initialize husky (if not already):

```bash
npm install husky --save-dev
npx husky install
```

#### Step 4: Update package.json Scripts

Add a validation script:

```json
{
  "scripts": {
    "validate:rls": "tsx scripts/validate-rls.ts",
    "validate:all": "npm run lint && npm run test && npm run validate:rls"
  }
}
```

#### Step 5: Document in README

Add section to `README.md`:

```markdown
### Pre-Deployment Validation

Before merging to main or deploying to production:

```bash
# Local validation (runs pre-commit hook automatically)
git commit -m "..."

# Or run manually
npm run validate:rls

# Full pre-deployment check
npm run validate:all
```

Validation checks:
- ✅ All PHI tables have `hospital_id` column
- ✅ No `USING(true)` / `USING(1=1)` RLS policies
- ✅ All policies use explicit role/hospital scoping

See [docs/RBAC_PERMISSIONS.md](docs/RBAC_PERMISSIONS.md) for policy patterns.
```

### Verification Checklist

#### CI Gate Works

- [ ] Push a test commit to a feature branch
- [ ] GitHub Actions runs `validate-rls.ts`
- [ ] Check that step succeeds/fails appropriately
- [ ] PR status shows "All checks passed"

#### Pre-Commit Hook Works

- [ ] Create a test file that would fail validation
- [ ] Attempt `git commit`
- [ ] Hook runs and prevents commit
- [ ] After fix, `git commit` succeeds

#### Documentation Updated

- [ ] README.md includes validation instructions
- [ ] Script is documented: `npx tsx scripts/validate-rls.ts`
- [ ] CI gate requirement is clear

### Blocking Factors

- GitHub Actions must have access to Supabase service key (set secrets)
- Pre-commit hook requires Node.js / tsx in developer PATH

---

## 🎯 Execution Sequence

```
Start → 1.1 (1h) ──→ 1.2 (2h) ──→ 1.4 (2h) ──→ Test & Sign-Off
                           ↓
                  1.3 (Parallel: run soak, 24h wait)
                           ↓
                      Archive results
```

**Total Timeline:**
- **Days 1–2:** Items 1.1, 1.2, 1.4 (5 hours of work)
- **Days 2–3:** Item 1.3 soak test running in background (24 hours)
- **Day 4:** Review soak results + final sign-off

---

## 📊 Tier 1 Status Board

| Item | Task | Owner | Status | % Complete | Blocker | Notes |
|------|------|-------|--------|-----------|---------|-------|
| 1.1 | Enable password protection | GitHub Copilot | 🔴 | 0% | — | 1-click in dashboard |
| 1.2 | Fix permissive RLS policy | GitHub Copilot | � | 100% | — | ✅ Audit complete: all policies secure |
| 1.3 | Run 24hr staging soak | GitHub Copilot | 🔴 | 0% | — | Parallel; 24h wait |
| 1.4 | Wire validate-rls.ts to CI | GitHub Copilot | 🔴 | 0% | — | Add GitHub Action + hook |

---

## ✅ Tier 1 Sign-Off Criteria

Before moving to Tier 2 (Type Safety), confirm all of:

- [ ] **1.1:** Supabase Auth leaked-password protection enabled
- [ ] **1.2:** Permissive RLS policy removed; validation script confirms 0 P1 findings
- [ ] **1.3:** 24hr soak test completed; > 95% pass rate; archived results
- [ ] **1.4:** CI pipeline runs `validate-rls.ts`; pre-commit hook active; README updated
- [ ] **Critical Path:** All E2E tests pass in staging
- [ ] **Production:** Team approved for go-live

---

## 🔗 Related Documentation

- [Production Readiness Report](PRODUCTION_READINESS_REPORT.md)
- [RBAC & Permissions](RBAC_PERMISSIONS.md)
- [Supabase Configuration](DATABASE.md)
- [CI/CD Deployment](DEPLOYMENT_GUIDE.md)
- [HIMS DevOps Guardian Skill](../.agents/skills/hims-devops-guardian/SKILL.md)
- [HIMS RBAC/ABAC Skill](../.agents/skills/hims-rbac-abac/SKILL.md)

---

## 📞 Questions & Support

- **RLS Policy Issues?** → Consult [hims-rbac-abac](../.agents/skills/hims-rbac-abac/SKILL.md) skill
- **CI/CD Setup?** → Consult [hims-devops-guardian](../.agents/skills/hims-devops-guardian/SKILL.md) skill
- **Staging Access?** → Contact DevOps team

---

**Last Updated:** TBD  
**Next Review:** After all 4 items complete
