# CareSync Emergency Rollback Procedures
**Last Updated**: March 13, 2026  
**Severity Levels**: 🔴 Critical (rollback immediately) | 🟡 Major (evaluate rollback) | 🟢 Minor (patch in place)

---

## Table of Contents
1. [Emergency Decision Tree](#emergency-decision-tree)
2. [Feature Flag Kill-Switch (Fastest - < 1 min)](#feature-flag-kill-switch)
3. [Code Rollback (Fast - 5-10 min)](#code-rollback)
4. [Database Rollback (Slow - 10-30 min, last resort)](#database-rollback)
5. [Post-Incident Procedures](#post-incident-procedures)
6. [Prevention & Lessons Learned](#prevention--lessons-learned)

---

## Emergency Decision Tree

```
🚨 CRITICAL ISSUE DETECTED IN PRODUCTION
│
├─ Is error rate > 5%? OR latency p99 > 1s? OR patients can't register?
│  ├─ YES → Feature flag kill-switch (Step 1, < 1 min)
│  │         If still critical after 5 min → Code rollback (Step 2)
│  │         If data corrupted → Database rollback (Step 3, if reverted migration broke schema)
│  │
│  └─ NO → Check error logs
│          ├─ Looks like feature X issue? → Disable feature_x_v2 flag
│          ├─ API timeout issues? → Scale database / kill long-running queries
│          ├─ RLS policy error? → Database rollback (migration issue)
│          └─ Unknown? → Code rollback to previous stable version
│
└─ Timeline target:
   • Detection: < 5 min (monitoring alerts)
   • Decision: < 5 min (on-call review)
   • Start rollback: < 10 min
   • Back to stable: < 20 min (goal)
```

---

## Feature Flag Kill-Switch (🟢 Fastest Rollback)

**Time**: < 1 minute  
**Risk**: Very low (no code/schema changes, just feature flag)  
**Use when**: New feature causing issues, can be disabled in isolation

### Prerequisites
- [ ] You have Supabase dashboard access OR
- [ ] You have `SUPABASE_SERVICE_ROLE_KEY` in your .env

### Step 1: Identify Affected Flag
```bash
# SSH into production pod or use Supabase dashboard
# Query feature_flags table to find the problematic flag

SELECT 
  ff.hospital_id,
  ff.flag_name,
  ff.enabled,
  h.name as hospital_name
FROM feature_flags ff
JOIN hospitals h ON ff.hospital_id = h.id
WHERE ff.enabled = true;
```

**Find which flag to disable**:
- `doctor_flow_v2` — New doctor workflow issues?
- `lab_flow_v2` — Lab results problems?
- `nurse_flow_v2` — Nursing workflow broken?
- `pharmacy_flow_v2` — Prescription entry failing?
- `reception_flow_v2` — Check-in delays?
- `patient_portal_v2` — Patient portal unresponsive?

### Step 2: Disable Feature Flag (Surgical Strike)

**Option A: Disable for Specific Hospital** (If only one hospital affected):
```sql
UPDATE feature_flags 
SET enabled = false,
    updated_at = now()
WHERE flag_name = 'doctor_flow_v2'
AND hospital_id = '550e8400-e29b-41d4-a716-446655440000'  -- Replace with affected hospital UUID
AND enabled = true;

-- Verify:
SELECT flag_name, hospital_id, enabled FROM feature_flags 
WHERE flag_name = 'doctor_flow_v2';
```

**Option B: Disable Globally** (If all hospitals affected):
```sql
UPDATE feature_flags 
SET enabled = false,
    updated_at = now()
WHERE flag_name = 'doctor_flow_v2'
AND enabled = true;

-- Verify:
SELECT COUNT(*) as flags_disabled FROM feature_flags 
WHERE flag_name = 'doctor_flow_v2' AND enabled = false;
```

### Step 3: Verify Rollback
```bash
# 1. Check error rate in Grafana
#    → Should drop to < 2% within 5 minutes

# 2. Check user experience
#    → Users should fall back to legacy flow (which works)
#    → New v2 UI should not appear

# 3. Monitor logs for issues
#    → Look for RLS errors, null pointer exceptions, timeouts
#    → Should decrease significantly

# 4. Confirm with stakeholders
#    → "Is the system stable now?" (get verbal confirmation)
```

### Step 4: Update Incident Report
```markdown
## Incident Report

**Time of Detection**: 2026-03-13 15:30:00 UTC
**Time of Mitigation**: 2026-03-13 15:32:00 UTC (2 min)

**Flag Disabled**: doctor_flow_v2
**Hospitals Affected**: All (or specific: Hospital A, Hospital B)
**Error Rate Before**: 12%
**Error Rate After**: 1.2% (✅ back to normal)

**Issue**: Doctor workflow v2 caused prescriptions to not save
**Root Cause**: [TBD - investigate after incident]
```

### When NOT to Use Kill-Switch
- ❌ Feature is 100% of traffic (no fallback exists)
- ❌ Issue is unrelated to new feature (e.g., database down)
- ❌ Disabling flag breaks dependencies (another feature depends on it)

---

## Code Rollback (🟡 Faster Than Database)

**Time**: 5-10 minutes  
**Risk**: Low (Git history is clean; revert to last stable commit)  
**Use when**: Feature flag disable doesn't fix issue OR issue is code-related (not database)

### Prerequisites
- [ ] You have GitHub repository access with merge permissions
- [ ] Previous commit hash or version tag is known
- [ ] CI/CD pipeline can automatically deploy rollbacks

### Step 1: Identify Commit to Revert

**Option A: Revert to Previous Release Tag**
```bash
# Find recent stable release tags
git tag -l "v*" --sort=-version:refname | head -10

# Example output:
# v1.2.0 (stable, currently running)
# v1.1.9 (previous stable)
# v1.1.8

# Check which version is currently running
# Via GitHub: Settings → Deployments → Current release
# Via curl: curl https://app.caresync.com/api/version
```

**Option B: Revert Most Recent Commit** (if commit was just merged)
```bash
# View recent commits
git log --oneline -10

# Example:
# a1b2c3d Fix: doctor workflow issue (DON'T revert this, it's the fix)
# e4f5g6h Feat: doctor_flow_v2 (REVERT THIS)
# i7j8k9l Merge pull request #123 from feature/doctor-workflow

# Check what changed
git show e4f5g6h --stat
```

### Step 2: Create Revert Commit

**DO NOT** force-push or reset history. Use `git revert` (creates new commit):

```bash
# Revert the problematic commit
git revert e4f5g6h --no-edit

# This creates a commit like:
# "Revert 'Feat: doctor_flow_v2'"
# with message: "This reverts commit e4f5g6h"

# Push to main (or create PR for safety)
git push origin main
```

**OR Reset to Tag** (if no individual commit is problematic):
```bash
# If you want to revert all changes since v1.2.0:
git reset --hard v1.2.0
git push origin main --force-with-lease

# ⚠️ Only use --force if:
# • You're deployment lead with full authority
# • No other developers pushing to main at same time
# • You've warned the team via Slack: "Rolling back to v1.2.0"
```

### Step 3: Trigger Deployment

**Option A: GitHub Actions (Automatic)**
```bash
# After push to main, GitHub Actions will:
# 1. Run CI (tests)
# 2. Build
# 3. Deploy to production (if auto-deploy enabled)
# 
# Monitor: https://github.com/AroCord-HIMS/.../actions
#          Look for "Deploy Production" workflow
```

**Option B: Manual Deployment** (if auto-deploy disabled)
```bash
# SSH into deployment pod
ssh deploy@caresync-prod.internal

# Run deployment script
./scripts/deploy.sh production

# Or use Supabase CLI:
supabase deployment trigger --project=caresync-prod
```

### Step 4: Verify Rollback
```bash
# 1. Check version endpoint
curl https://app.caresync.com/api/version
# Should return: { version: "v1.2.0" }

# 2. Check error rate
# → Grafana dashboard → Error Rate panel
# → Should return to < 2% within 5 minutes

# 3. Monitor applications logs
tail -f /var/log/pod-name/production.log | grep -i error

# 4. Test critical flows
#    → Login as test doctor
#    → Create prescription (should work with v1.2.0)
#    → Check vitals entry (nurse flow)
#    → Verify pharmacy can dispense

# 5. Confirm with stakeholders
#    → "Production is stable. Code rolled back to v1.2.0"
```

### Step 5: Tag Disaster Version (for forensics)
```bash
# Tag the broken commit for post-mortem analysis
git tag -a disaster/v1.3.0-botched -m "Rolled back from v1.3.0 due to doctor_flow_v2 crash"
git push origin disaster/v1.3.0-botched

# This prevents the commit from being garbage-collected
# and helps you investigate the failure week later
```

### When to Use Code Rollback vs. Feature Flag
| Scenario | Kill-Switch | Code Rollback |
|----------|-------------|---------------|
| New feature broken | ✅ Prefer | Also OK |
| Bug in existing code | ❌ Won't help (flag doesn't exist) | ✅ Use this |
| API timeout / performance | ? Depends | ✅ If code caused it |
| Database schema broken | ❌ Won't help | ⚠️ Won't fully fix; may need DB rollback |

---

## Database Rollback (🔴 Last Resort - Slowest)

**Time**: 10-30 minutes (data restoration)  
**Risk**: Higher (must be reversible; requires backup)  
**Use when**: Migration broke schema OR caused data corruption

### Prerequisites
- [ ] Backup snapshot exists (pre-migration baseline)
- [ ] You have database admin access or DBA on-call
- [ ] Backup location known (e.g., s3://backups/caresync-2026-03-13.sql)
- [ ] Restore procedure tested in staging

### Step 1: Assess Migration Damage

```sql
-- Check for data corruption
-- ============================================================

-- 1. Do new columns have data?
SELECT COUNT(*) FROM prescriptions WHERE new_column IS NOT NULL;
-- If 0: migration likely broke insert logic, ROLLBACK

-- 2. Are there orphaned foreign keys?
SELECT COUNT(*) FROM patient_vitals pv 
LEFT JOIN patients p ON pv.patient_id = p.id 
WHERE p.id IS NULL;
-- If > 0: migration deleted patients, ROLLBACK IMMEDIATELY

-- 3. Are RLS policies preventing reads?
SELECT COUNT(*) FROM patients 
WHERE hospital_id = '550e8400-e29b-41d4-a716-446655440000';
-- If 0: RLS policy too strict, ROLLBACK

-- 4. Check transaction logs for failures
-- (via PostgreSQL pg_last_xact_id or audit log)
```

### Step 2: Inform Stakeholders
```
🚨 DATABASE ROLLBACK IN PROGRESS

Affected: All users in production
Expected Downtime: 15-30 minutes
Impact: Reverting to [pre-migration timestamp]

Status: Restoring from backup...
  [████████░░░░░░░░░░░░░░░] 40%

We'll post updates every 2 minutes.
```

### Step 3: Stop Write Traffic
```bash
# Prevent new writes while restoring
# Option A: Via Kong API gateway
curl -X POST http://kong:8001/routes/main-api/plugins \
  -d "name=rate-limiting" \
  -d "config.minute=1"  # Only 1 request per minute

# Option B: Put Nginx in maintenance mode
# (redirect all requests to maintenance page)

# Option C: Scale down write pods to 0
kubectl scale deployment api-write-only --replicas=0
```

### Step 4: Restore from Backup

**Via pg_restore** (PostgreSQL):
```bash
# 1. Ensure you have the backup file
ls -lh /backups/caresync-2026-03-13-pre-migration.sql.gz

# 2. Stop all connections to production database
# (via Supabase dashboard or psql)
psql -h prod.db -U admin -d caresync \
  <<EOF
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'caresync' AND pid != pg_backend_pid();
EOF

# 3. Restore from backup (this will DELETE current data and restore snapshot)
pg_recover --dbname caresync \
  --backup /backups/caresync-2026-03-13-pre-migration.sql.gz

# Typical output:
# Connected to caresync
# Restoring from backup snapshot...
# [████████████████████████] 100%  45.2 GB restored
# Database ready. 12,234 patients, 89,123 appointments restored.
```

**Via Supabase Dashboard** (easier):
```
1. Log in to https://supabase.com
2. Select caresync-prod project
3. Database → Backups
4. Click pre-migration snapshot (e.g., "2026-03-13 14:25:00")
5. Click "RESTORE THIS BACKUP"
6. Confirm: "Yes, restore caresync to this state"
7. Wait 15-30 minutes for restoration
8. Supabase will notify when ready
```

### Step 5: Verify Restored State
```bash
# 1. Count records (should match pre-migration count)
psql -h prod.db -U admin -d caresync <<EOF
SELECT 'patients' as tbl, COUNT(*) as cnt FROM patients
UNION ALL
SELECT 'prescriptions', COUNT(*) FROM prescriptions
UNION ALL
SELECT 'lab_results', COUNT(*) FROM lab_results
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments;
EOF

# Example output (should match your baseline):
# tbl              | cnt
# patients         | 12234
# prescriptions    | 45123
# lab_results      | 78945
# appointments     | 89123

# 2. Spot-check patient data (no corruption)
SELECT id, name, mrn, created_at FROM patients LIMIT 5;

# 3. Verify RLS still enforces
SELECT COUNT(*) FROM patients WHERE hospital_id = 'my-hospital-id';
# Should return patients from my hospital only

# 4. Check data integrity
SELECT COUNT(*) FROM appointments a 
RIGHT JOIN patients p ON a.patient_id = p.id;
# Should equal number of appointments (no orphans)
```

### Step 6: Resume Write Traffic
```bash
# Option A: Remove rate limit
curl -X DELETE http://kong:8001/routes/main-api/plugins/<plugin-id>

# Option B: Exit maintenance mode
# (update Nginx configuration and reload)

# Option C: Scale write pods back up
kubectl scale deployment api-write-only --replicas=3
```

### Step 7: Reapply The Fix (if migration was necessary)

Once data is restored and stable:

```bash
# 1. Fix the migration SQL
# → Remove the problematic ALTER TABLE DROP COLUMN
# → Use soft-deprecation instead:
ALTER TABLE patients ADD COLUMN old_phone_deprecated TEXT;
COMMENT ON COLUMN patients.old_phone_deprecated IS 'Deprecated in v1.3.0; removed in v2.0';

# 2. Create new migration file
# vim supabase/migrations/20260313000001_fixed_migration.sql

# 3. Deploy fixed migration
npm run migrate:rls
# or
npx supabase db push

# 4. Verify
npm run validate:rls  # Should pass
npm run test:integration  # Should pass

# 5. Re-deploy code
git push origin main  # Triggers CI/CD
```

### When Database Rollback Is Too Risky

❌ **Do NOT rollback database if**:
- Migration added a NEW column that users have filled with data (6+ hours)
  - Rollback would lose that user data
  - Instead: Fix the code/RLS and move forward

- High-consequence data was created post-migration (e.g., real patient records, billing data)
  - Example: 200 new prescriptions entered by doctors after migration
  - Rollback would lose those prescriptions
  - Instead: Patch forward or manually re-enter

✅ **Safe to rollback if**:
- Migration just completed (< 30 min ago, minimal user data written)
- No critical workflows operating (off-hours deployment)
- Backup is recent and verified (< 2 hours old)
- Data loss is acceptable (staging/dev environment)

---

## Post-Incident Procedures

### Immediate Actions (0-5 min after stability)

1. **Declare Incident Resolved**
   ```
   ✅ Production is now stable
   
   Rollback Summary:
   - Issue: Doctor workflow v2 caused 12% error rate
   - Action: Disabled doctor_flow_v2 feature flag
   - Duration: 2 minutes (10:32 AM - 10:34 AM UTC)
   - Status: All systems nominal (error rate 1.1%)
   
   Next: Post-mortem meeting at 4 PM UTC today
   ```

2. **Update Status Page** (if public)
   ```
   🟢 RESOLVED: Production Issue
   
   Incident resolved 2026-03-13 10:34 UTC after 7 minutes
   Root cause: Doctor workflow feature flag enabled too broadly
   Mitigation: Disabled flag temporarily pending investigation
   Impact: 450 doctors unable to enter prescriptions (7 minutes)
   ```

3. **Notify Stakeholders** (Slack #incidents channel)
   - Deployment lead
   - Clinical leads
   - Support team
   - Patient communication (if applicable)

### Within 1 Hour

4. **Gather Initial Data**
   - [ ] Screenshots of error logs
   - [ ] Grafana dashboard snapshots (error rate, latency)
   - [ ] User impact (how many affected, for how long)
   - [ ] RCA hypothesis (feature flag issue? code bug? database?)

5. **Preserve Evidence**
   - [ ] Tag disaster version: `git tag disaster/v1.3.0-issue-desc`
   - [ ] Save error logs: `tee -a /incidents/2026-03-13-incident.log < pod-logs`
   - [ ] Screenshot Grafana dashboard with error rate spike
   - [ ] Export database query results showing any anomalies

### Within 24 Hours

6. **Root Cause Analysis (RCA) Meeting**
   ```
   Attendees: DevOps, Backend Lead, QA, Clinical Lead, Product

   Questions to Answer:
   - Why did the feature flag enable cause 12% errors?
   - What validation gate missed this in staging?
   - Did the E2E smoke tests not catch this?
   - Should we have done phased rollout (10% → 50% → 100%)?
   - What process change prevents this?

   Output: Written RCA document
   ```

7. **RCA Document Template**
   ```markdown
   # Incident: Doctor Workflow v1.3.0 Failure
   
   **Date**: 2026-03-13  
   **Duration**: 7 minutes (10:28 AM - 10:35 AM UTC)  
   **Severity**: 🔴 Critical (12% error rate, doctors couldn't enter Rx)
   
   ## Timeline
   - 10:27 AM: Deployed v1.3.0 to production
   - 10:28 AM: Monitoring alert: Error rate 5% (feature flag enabled)
   - 10:30 AM: Error rate spiked to 12%
   - 10:32 AM: Decision: Disable doctor_flow_v2 flag
   - 10:34 AM: Error rate returned to 1%
   - 10:35 AM: All-clear, declared stable
   
   ## Root Cause
   The doctor_flow_v2 feature contained a bug:
   - Doctor prescription form expected `patient.mrn_new` field
   - Current production has `patient.mrn` (changed in migrations)
   - Migration didn't account for this; form crashed when loading patient
   
   ## Why Wasn't This Caught
   - E2E smoke tests ran against production schema (which had `patient.mrn`)
   - Staging migration had not run yet (out of sync)
   - Staging database was 2 weeks behind production
   - No pre-deployment staging smoke test
   
   ## Lessons Learned
   1. Always sync staging database schema with production before deployment
   2. Run E2E tests against staging schema, not prod schema
   3. Implement phased rollout for high-risk features (10% → 50% → 100%)
   4. Add pre-deployment checklist item: "Staging DB schema matches prod ✓"
   
   ## Action Items
   - [ ] Sync staging DB schema: `supabase diff production vs staging`
   - [ ] Add to deployment checklist: Staging schema verification
   - [ ] Implement phased rollout for next v2 feature
   - [ ] Create pre-deploy validation: `npm run validate:schema-mismatch`
   ```

### Within 1 Week

8. **Implement Preventive Measures**
   - Add failing test case to prevent regression
   - Update deployment checklist
   - Run incident drill (test rollback procedures locally)
   - Update runbooks based on what worked / didn't work

   ```bash
   # Example: Add regression test
   # tests/e2e/doctor-flow-v2-mrn.spec.ts
   test('Doctor form loads patient with correct MRN field', async ({ page }) => {
     await page.sign_in_as('doctor@testgeneral.com');
     await page.goto('/doctor/patients');
     await page.click('patient-card:has-text("John Doe")');
     
     // This MUST not crash:
     const form = await page.locator('[data-testid="prescription-form"]');
     await page.expect(form).toBeVisible();
     
     // Verify MRN field exists and is populated:
     const mrnField = await page.locator('[data-testid="patient-mrn"]');
     await page.expect(mrnField).toContainText(/[0-9]{6,}-[A-Z]/); // MRN format
   });
   ```

---

## Prevention & Lessons Learned

### Checklist for Future Deployments

- [ ] **Schema Sync**: Staging database matches production schema exactly
  ```bash
  supabase db diff prod vs staging --format json > schema-diff.json
  # If diff.json has changes, STOP deployment until resolved
  ```

- [ ] **Phased Rollout**: High-risk features start at 10% rollout
  ```
  doctor_flow_v2 = 10% (largest 1-2 hospitals) for 24 hours
  → Monitor error rate, user feedback
  → Then 50% for 24 hours
  → Then 100%
  ```

- [ ] **Staging Soak Time**: 24-hour green window in staging before prod
  ```
  Rules:
  - No P0 bugs in staging for 24 hours
  - >= 3 people manually tested in staging
  - Baseline metrics established (error rate, latency)
  ```

- [ ] **Feature Flag Defaults**: All new features OFF by default
  ```
  feature_flags table:
  - doctor_flow_v2: false (off until explicitly enabled)
  - lab_flow_v2: false
  - nurse_flow_v2: false
  ```

- [ ] **Kill-Switch Size**: Feature flags should be small, orthogonal
  ```
  ✅ GOOD: doctor_flow_v2 = entire new doctor workflow
           → Disable if doctor flow broken
  ❌ BAD: doctor_form_text_button_redesign = just button color
          → Disabling affects 10 other features
  ```

- [ ] **Rollback Drills**: Monthly test rollback procedures
  ```
  1st Friday of month:
  - Test feature flag kill-switch (disable and re-enable)
  - Test git revert (create fake commit, revert it)
  - Test database restore from backup
  - Document any issues / update runbook
  ```

### Metrics to Monitor Post-Deployment

```
First 24 hours:
- Error rate (target < 2%, alert if > 5%)
- p99 latency (target < 500ms, alert if > 1s)
- Feature flag rollout progress (track % of hospitals enabled)
- User feedback (Slack #support, direct messages)
- Database query performance (slow query log)

First 7 days:
- Sustained error rate (should trend down after initial issues)
- User adoption (% of doctors using new feature if applicable)
- Performance trends (any degradation over time?)
- Incident count (should be 0 for stable deployments)
```

---

## Contact & Escalation

### On-Call Rotation
- **Primary**: [Deployment Lead Name] — pagerduty.com/...
- **Secondary**: [DevOps Lead Name] — pagerduty.com/...
- **Clinical** (if patient safety issue): [Clinical Director] — ext. 4567

### Key Slack Channels
- `#incidents` — Real-time incident discussion
- `#deployments` — Pre/post deployment announcements
- `#alerts` — Automated alert notifications
- `#support` — Customer-facing issues

### War Room Bridge
- **Zoom Link**: caresync.zoom.us/incidents (always open during incident)
- **Phone Bridge**: +1-555-123-456 x999

---

**Last Updated**: March 13, 2026  
**Next Review**: After next P0 incident or quarterly (whichever first)  
**Maintained By**: DevOps Team / Deployment Lead
