# Item 1.3: 24hr Staging Soak Test — Setup & Execution

**Status:** ✅ READY TO EXECUTE  
**Owner:** GitHub Copilot  
**Effort:** 4 hours setup + 24 hours execution (parallel)  
**Dependency:** Staging environment must be stable

---

## Overview

The soak test validates system stability under sustained load by running the critical-path E2E suite repeatedly for 24 hours. It will:

✅ Execute all clinical workflows (admission, prescription, lab order, discharge)  
✅ Test all roles (doctor, nurse, pharmacist, etc.)  
✅ Monitor RLS policy performance  
✅ Detect memory leaks in long-running services  
✅ Validate Realtime subscriptions under load  

---

## Pre-Execution Checklist

- [ ] Staging environment is deployed and **healthy** (`npm run health-check`)
- [ ] Test data exists: patients, doctors, appointments, prescriptions
- [ ] GitHub Actions runners have capacity (or local machine available)
- [ ] Monitoring tools are accessible (Supabase metrics, application logs)
- [ ] Team notified: soak test will run for next 24 hours

---

## Option A: GitHub Actions (Recommended for Production)

This runs in CI/CD, doesn't tie up developer machine, and auto-archives results.

### Step 1: Create Soak Test Workflow File

Create `.github/workflows/soak-test.yml`:

```yaml
name: 24hr Staging Soak Test

on:
  workflow_dispatch:  # Manual trigger from Actions tab
    inputs:
      environment:
        description: "Target environment (staging or production)"
        required: true
        default: "staging"
        type: choice
        options:
          - staging
          - production

jobs:
  soak:
    name: 24hr Soak Test
    runs-on: ubuntu-latest-xl  # XL runner = more CPU/memory
    timeout-minutes: 1500  # 25 hours
    permissions:
      contents: read
      actions: read

    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.ref }}

      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run 24hr soak test
        env:
          PLAYWRIGHT_TEST_BASE_URL: https://staging.caresync-hims.com
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          echo "🚀 Starting 24hr soak test at $(date)"
          
          # Run critical-path tests in parallel with infinite retries to fill 24 hours
          npx playwright test \
            tests/e2e/tests/workflows/critical-path.spec.ts \
            --config=playwright.e2e-full.config.ts \
            --workers=4 \
            --retries=1000 \
            --reporter=html,json \
            --timeout=60000
          
          echo "✅ Soak test completed at $(date)"

      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: soak-test-results-${{ github.run_id }}
          path: playwright-report/
          retention-days: 30

      - name: Generate summary report
        if: always()
        run: |
          echo "## 🏁 Soak Test Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **Start Time**: $(date -d '-24 hours' -u)" >> $GITHUB_STEP_SUMMARY
          echo "- **End Time**: $(date -u)" >> $GITHUB_STEP_SUMMARY
          echo "- **Duration**: 24 hours" >> $GITHUB_STEP_SUMMARY
          echo "- **Results**: See artifact `soak-test-results-${{ github.run_id }}`" >> $GITHUB_STEP_SUMMARY
```

### Step 2: Trigger Soak Test

1. Go to: **GitHub** → **Actions** tab
2. Select workflow: **"24hr Staging Soak Test"**
3. Click **Run workflow** button
4. Select environment: **staging**
5. Click **Run workflow**

**Expected:** Workflow starts; you see job queued/running

### Step 3: Monitor Progress

1. Watch the workflow run in **Actions** tab
2. Check logs in real-time by clicking the running job
3. Look for output like:
   ```
   🚀 Starting 24hr soak test at Thu Apr 18 10:30:00 UTC 2026
   [chromium] > 1024 tests passed in 6m42s
   [chromium] > 2048 tests passed in 13m15s
   ...
   ```

### Step 4: Download Results (After 24 Hours)

1. Workflow completes automatically
2. Go to **Actions** → Click the completed run
3. Scroll to **Artifacts** section
4. Download `soak-test-results-XXXXX`
5. Extract and open `index.html` in browser

---

## Option B: Local Machine (For Quick Testing)

Run soak test locally for shorter duration (4-8 hours) to validate setup.

### Step 1: Start Test Locally

```bash
cd c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub

# Ensure staging/local environment variables are set
export PLAYWRIGHT_TEST_BASE_URL=https://staging.caresync-hims.com
export VITE_SUPABASE_URL=your_supabase_url
export VITE_SUPABASE_ANON_KEY=your_anon_key

# Start soak test (will run until you stop it with Ctrl+C)
npm run test:e2e -- tests/e2e/tests/workflows/critical-path.spec.ts \
  --config=playwright.e2e-full.config.ts \
  --workers=4 \
  --retries=1000
```

### Step 2: Monitor in Real-Time

Output shows progress:
```
✓ [chromium] › critical-path.spec.ts (1/4) - patient admission workflow
✓ [chromium] › critical-path.spec.ts (2/4) - prescription order workflow  
✓ [chromium] › critical-path.spec.ts (3/4) - lab result notification
✓ [chromium] › critical-path.spec.ts (4/4) - discharge workflow
...
[Repeats continuously]
```

### Step 3: Monitor System Resources

**In separate terminal**, watch for resource issues:

```bash
# Monitor CPU, memory, disk
watch -n 5 'df -h && free -h && top -bn1 | head -20'

# Watch Supabase connection pool
tail -f logs/supabase-connections.log

# Monitor application logs
tail -f logs/app.log
```

### Step 4: Stop Test

```bash
# Press Ctrl+C to stop gracefully
# Test will finish current iteration, then exit
```

---

## During Soak Test: What to Monitor

### ✅ Performance Metrics (Should Stay Stable)

| Metric | Baseline | During Soak | Threshold |
|--------|----------|-------------|-----------|
| Response Time P50 | 200ms | 200-250ms | < 500ms |
| Response Time P95 | 500ms | 500-700ms | < 1000ms |
| Error Rate | 0% | < 1% | < 2% |
| Memory Usage | Stable | Slightly increase | < 20% growth |
| DB Connection Pool | 20/100 | 60-80/100 | < 95/100 |

### 🔴 Red Flags (Stop Test & Investigate)

- Response time increases > 50% from baseline
- Error rate > 5%
- Memory continuously growing (memory leak detected)
- DB connections maxing out (> 90/100)
- Supabase RLS policies timing out
- Application crashes or hanging

### 📊 Where to Check Metrics

1. **Supabase Dashboard:**
   - Go to: Monitoring → Database
   - Watch: Connection pool, query performance, RLS policy timing

2. **Application Logs:**
   - Check for: Errors, timeouts, warnings
   - Look in: `docker logs` or application error tracking (Sentry)

3. **System Metrics:**
   - CPU: Should stay below 80%
   - Memory: Shouldn't grow continuously
   - Disk: Check free space (E2E tests create artifacts)

---

## After 24 Hours: Analyze Results

### Step 1: Collect Artifacts

```bash
# If using GitHub Actions:
# 1. Download soak-test-results ZIP from Actions tab
# 2. Extract it

# If running locally:
# Results already in ./playwright-report/
```

### Step 2: Review HTML Report

1. Open: `playwright-report/index.html` in browser
2. Review summary:
   - Total tests run
   - Pass rate (should be > 95%)
   - Failed tests (if any)
   - Flaky tests (inconsistent failures)

### Step 3: Create Soak Test Results Document

```markdown
# Soak Test Results — April 18, 2026

**Duration:** 24 hours  
**Environment:** Staging  
**Start:** [DATE TIME]  
**End:** [DATE TIME]  

## Summary

- **Total Tests Run:** [NUMBER]
- **Pass Rate:** [PERCENTAGE]%
- **Failed:** [NUMBER] tests
- **Flaky:** [NUMBER] tests

## Performance Baseline

| Workflow | P50 | P95 | Max |
|----------|-----|-----|-----|
| Patient Admission | 180ms | 420ms | 890ms |
| Prescription Order | 150ms | 380ms | 720ms |
| Lab Result | 120ms | 280ms | 540ms |
| Discharge | 220ms | 580ms | 1200ms |

## Issues Found

- [ ] No critical issues
- [ ] [List any issues found]

## Sign-Off

- [ ] Ops team reviewed
- [ ] Performance acceptable
- [ ] Ready for production deployment
```

### Step 4: Archive Results

```bash
# Save results for compliance audit
mkdir -p docs/soak-test-results/2026-04-18
cp -r playwright-report/* docs/soak-test-results/2026-04-18/
git add docs/soak-test-results/
git commit -m "docs: archive soak test results from April 18, 2026"
```

---

## Success Criteria for Item 1.3

✅ **Item 1.3 is COMPLETE when:**

1. Soak test ran for **24 consecutive hours**
2. Pass rate was **> 95%**
3. No critical errors (P0) encountered
4. Response time P95 remained stable (< 1 second)
5. Memory didn't leak (stable over 24hr)
6. RLS policy performance acceptable (< 50ms per query)
7. Results documented and archived
8. Team approved results for production

---

## If Issues Are Found

### Memory Leak Detected

```bash
# Check for event listeners not being cleaned up
grep -r "addEventListener\|subscribe" src/ --include="*.ts" --include="*.tsx" | grep -v "removeEventListener\|unsubscribe"

# Check for useEffect cleanup
grep -r "useEffect" src/ --include="*.tsx" -A 3 | grep -v "return"
```

### Response Time Degradation

```bash
# Check database query times
select 
  query,
  mean(duration),
  max(duration),
  stddev(duration)
from pg_stat_statements
group by query
order by mean(duration) desc
limit 20;
```

### RLS Policy Slow

```sql
explain (analyze, buffers)
select * from prescriptions 
where hospital_id = (select hospital_id from profiles where user_id = auth.uid());
```

---

## Quick Reference: Commands

```bash
# Local soak test (short)
npm run test:e2e -- tests/e2e/tests/workflows/critical-path.spec.ts --workers=4

# Local soak test (24 hours)
npm run test:e2e -- tests/e2e/tests/workflows/critical-path.spec.ts --workers=4 --retries=1000

# View last results
open playwright-report/index.html

# Validate RLS policies during test
npm run validate:rls
```

---

## Timeline

```
Time | Action
-----|-------
T+0h | Start soak test (GitHub Actions or local)
T+6h | Check: no memory leaks, error rate < 1%
T+12h | Check: response times stable, no degradation
T+18h | Check: Realtime subscriptions healthy, no connection issues
T+24h | Collect results, generate report
T+25h | Review results, team sign-off
T+26h | ✅ Tier 1 complete, ready for production
```

---

## Next Step After Item 1.3

Once soak test passes → **Tier 1 Complete** ✅

Then proceed to [Tier 2: Type Safety](ENHANCEMENT_MASTER_PLAN.md#tier-2--code-quality--type-safety)

---

**Status:** Ready to execute  
**Blocker:** None  
**Duration:** 24 hours
