# GitHub Actions Soak Test — Trigger & Monitor Guide

**Status:** 🟢 Ready to Execute  
**Workflow File:** `.github/workflows/soak-test.yml` (already created)  
**Manual Action Required:** YES (you must trigger via GitHub UI)

---

## 🎯 Quick Start: Trigger 24hr Soak Test

### Step 1: Go to GitHub Actions (2 minutes)

```
1. Open: https://github.com/AroCord-HIMS/care-harmony-hub/actions
   (Or navigate to your repository → Actions tab)

2. Left sidebar → Find workflow: "24hr Staging Soak Test"
   (If not visible, refresh page)

3. Click on the workflow name to open it
```

### Step 2: Trigger Workflow (1 minute)

```
1. Look for button in top-right: "Run workflow" (may say "This workflow has a workflow_dispatch trigger")

2. Click "Run workflow" button
   - A dropdown menu appears

3. Configure settings:
   - Duration: Enter "24" (hours)
   - Workers: Enter "4" (parallel test runners)
   - Branch: Ensure "main" is selected

4. Click: "Run workflow" button (green button at bottom of dropdown)
   ✅ Workflow is now queued!
```

### Step 3: Monitor Execution (Real-time)

```
1. You'll see a new row appear in the workflow run list
   - Status: "queued" → "in progress" → "completed"

2. Click on the run to view details:
   - Job name: "Soak Test - 24hrs"
   - Status indicator: yellow (running) → green (success)

3. View live logs:
   - Click: "Soak Test - 24hrs" job link
   - Scroll down to see real-time test output
   - Look for progress like:
     ✓ [chromium] › critical-path.spec.ts (1/4)
     ✓ [chromium] › critical-path.spec.ts (2/4)
     ...
```

---

## 📊 Monitoring During 24 Hours

### Check-In Schedule

| Time | Checkpoint | What to Look For |
|------|-----------|------------------|
| **6h** | Mid-morning | Error rate < 1%, response times stable |
| **12h** | Noon | No memory growth, DB connections < 80/100 |
| **18h** | Evening | Performance consistent, no P0 errors |
| **24h** | Done! | Collect results, verify pass rate > 95% |

### Where to Check Metrics

**Option A: GitHub Actions Logs**
- Go to: Actions → Click the running job
- Scroll down to see output like:
  ```
  [chromium] > 1024 tests passed in 6m42s
  [chromium] > 2048 tests passed in 13m15s
  ```

**Option B: Supabase Metrics Dashboard**
- Go to: https://app.supabase.com → Project → Monitoring
- Watch: Database connections, query performance, RLS policy timing

**Option C: Application Logs**
- Check: Real-time error tracking (Sentry, if configured)
- Look for: Any spike in P0 errors or timeouts

### Red Flags (Stop & Investigate)

If you see these, **STOP the workflow immediately**:

```
🔴 ERROR RATE > 5%
   → Action: Stop workflow
   → Check: Application logs for crash dumps
   → Investigate: Database query performance

🔴 RESPONSE TIME > 2 SECONDS
   → Action: Monitor for 30 more minutes
   → Check: Database connection pool (Supabase dashboard)
   → If continues: Stop and investigate DB query performance

🔴 MEMORY GROWING CONTINUOUSLY
   → Action: Stop workflow immediately
   → Investigate: JavaScript event listener cleanup
   → Check: useEffect cleanup functions in React components

🔴 DATABASE CONNECTIONS > 90/100
   → Action: Stop workflow
   → Reason: Connection pool exhaustion could cause cascading failures
   → Fix: Reduce worker count or increase connection pool
```

### How to Stop Workflow (if needed)

```
1. Go to: GitHub → Actions → Running job
2. Click: "Cancel workflow" button (red, top-right)
3. Confirm: "Cancel this workflow run"
4. Wait: Job stops gracefully (may take 1-2 minutes)
```

---

## 📥 After 24 Hours: Collect Results

### Step 1: Check Workflow Completion (5 min)

```
1. Go to: GitHub → Actions
2. Find the "24hr Staging Soak Test" run
3. Status should show: ✅ Completed successfully
   (Green checkmark)
```

### Step 2: Download Test Results (3 min)

```
1. Click on the completed workflow run
2. Scroll down to: "Artifacts" section
3. You'll see one artifact: "soak-test-results-XXXXX" 
   (XXXXX is the run ID)
4. Click: Download (green button)
   - Downloads as ZIP file (~50-200MB depending on duration)
```

### Step 3: Extract & Analyze Results (10 min)

```
Windows:
1. Right-click ZIP → Extract All
2. Choose folder: Desktop or Downloads
3. Open extracted folder

Then:
1. Find file: playwright-report/index.html
2. Right-click → Open with → Browser
3. View HTML report:
   - Total tests run (goal: 2000+)
   - Pass rate (goal: > 95%)
   - Failed tests (should be minimal)
   - Flaky tests (occasional failures)
```

### Step 4: Review Performance Summary

The HTML report shows:
```
✅ Tests Passed: [NUMBER]
❌ Tests Failed: [NUMBER]
⚠️  Tests Flaky: [NUMBER]

Performance Metrics:
- Median response time: [X]ms
- Max response time: [X]ms
- Tests per minute: [X]
```

### Step 5: Document Results

Create or update `docs/SOAK_TEST_RESULTS_APRIL_2026.md`:

```markdown
# Soak Test Results — April 18-19, 2026

## Execution Details
- **Duration:** 24 hours
- **Start Time:** April 18, 2026, 2:00 PM UTC
- **End Time:** April 19, 2026, 2:00 PM UTC
- **Environment:** Staging
- **GitHub Run ID:** [Copy from URL]

## Results Summary
- **Total Tests Run:** [NUMBER]
- **Pass Rate:** [PERCENTAGE]%
- **Failed Tests:** [NUMBER]
- **Flaky Tests:** [NUMBER]

## Performance Baseline
- **Response Time P50:** [X]ms
- **Response Time P95:** [X]ms
- **Error Rate:** [X]%
- **Memory Usage:** Stable / Leak Detected
- **DB Connections Peak:** [X]/100

## Critical Findings
- [ ] No critical issues
- [ ] [List any issues found]

## Sign-Off
- [ ] Tech Lead reviewed results
- [ ] Performance acceptable
- [ ] Ready for production deployment

**Status:** ✅ APPROVED
```

---

## 🔄 Alternative: Quick Local Validation (Optional)

If you want to **quickly test the workflow** before running 24 hours:

```bash
cd c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub

# Run local soak test for 2-4 hours (not 24)
npm run test:e2e -- tests/e2e/tests/workflows/critical-path.spec.ts \
  --workers=4 \
  --retries=100
```

This validates the same test suite locally in a shorter timeframe.

---

## 📋 Pre-Trigger Checklist

Before clicking "Run workflow", confirm:

- [ ] Staging environment deployed and responsive
- [ ] Test data seeded (patients, doctors, appointments)
- [ ] GitHub Actions runner capacity available
- [ ] Team notified: system will run heavy tests for 24 hours
- [ ] No deployments scheduled during test window
- [ ] Monitoring tools accessible (Supabase, Sentry, etc.)
- [ ] Storage space available (15GB+ for logs)

---

## 🆘 Troubleshooting

### Workflow Doesn't Appear in GitHub Actions

**Problem:** "24hr Staging Soak Test" workflow not visible  
**Solution:**
1. Refresh page: Ctrl+R or Cmd+R
2. Check branch: Workflows run on commits to "main" branch
3. Verify file exists: `.github/workflows/soak-test.yml` in repository
4. Commit & push the workflow file if needed

### Workflow Fails Immediately

**Problem:** Workflow shows red X after a few seconds  
**Solution:**
1. Click the failed run to view logs
2. Look for error messages like:
   - "SUPABASE_URL secret not configured"
   - "Playwright browsers not installed"
3. Check GitHub repository secrets:
   - Go to: Settings → Secrets and variables → Actions
   - Verify: SUPABASE_URL, SUPABASE_ANON_KEY, SERVICE_ROLE_KEY exist

### Tests Run Too Fast (Finishes in < 1 hour)

**Problem:** Expected 24 hours but finished in 1 hour  
**Solution:**
1. Retries setting may be too low (set to 1000 for 24hr)
2. Worker count may be too high (max 4 workers recommended)
3. Next run: Adjust workflow parameters in dropdown

### Can't Find Results Artifact

**Problem:** "Artifacts" section empty after workflow completion  
**Solution:**
1. Workflow may have failed silently
2. Check workflow logs for errors
3. Results expire after 30 days (check date)
4. Try re-running workflow

---

## 📞 Support References

| Document | Purpose |
|----------|---------|
| [TIER1_ITEM13_SOAK_TEST.md](../TIER1_ITEM13_SOAK_TEST.md) | Detailed soak test setup guide |
| [TIER1_EXECUTION_CHECKLIST.md](../TIER1_EXECUTION_CHECKLIST.md) | Overall Tier 1 execution guide |
| [TIER1_COMPLETION_SUMMARY.md](../TIER1_COMPLETION_SUMMARY.md) | Tier 1 status & sign-off checklist |
| `.github/workflows/soak-test.yml` | Workflow configuration file |

---

## ✅ Summary

**To trigger the 24hr soak test:**

1. Go to GitHub → Actions tab
2. Select: "24hr Staging Soak Test"
3. Click: "Run workflow"
4. Set: Duration = 24, Workers = 4
5. Click: "Run workflow" (green button)
6. Monitor every 6 hours
7. After 24 hours: Download & review results

**Estimated Timeline:**
- T+0: Trigger workflow (1 min)
- T+24h: Collect results (5 min)
- T+24.5h: Review & document (10 min)

**When Complete:** ✅ Item 1.3 Done → Tier 1 Complete → Production Deployment Approved 🚀

---

**Status:** Ready to trigger  
**Blocker:** None  
**Next Action:** Follow steps above to trigger workflow
