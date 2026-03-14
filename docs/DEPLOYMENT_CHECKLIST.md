# CareSync Deployment Checklist
**Version Control**: Please update version number and date before each deployment

---

## Pre-Deployment Sign-Off

### Deployment Information
- **Release Version**: _________________________ (e.g., v1.3.0)
- **Previous Version**: _________________________ (e.g., v1.2.0)
- **Deployment Date/Time**: _________________________ UTC
- **Deployment Lead**: _________________________ (on-call for rollback)
- **Clinical Stakeholder Reviewer**: _________________________ (name)

---

## Phase 1: Code & Testing ✅

### ✓ Unit Tests & Coverage
- [ ] All unit tests passing: `npm run test:unit`
- [ ] Coverage ≥ 80%: `npm run test:coverage`
- [ ] No new test exclusions (xdescribe, xit, skip)
- [ ] Test results logged: `test-results/` directory

**Sign-off**: _________________ (QA Lead)

### ✓ Type Safety
- [ ] TypeScript strict mode clean: `npm run type-check`
- [ ] No `@ts-ignore` comments added
- [ ] All new functions have explicit type annotations
- [ ] No `any` types introduced

**Sign-off**: _________________ (Tech Lead)

### ✓ Code Quality
- [ ] ESLint passing: `npm run lint`
- [ ] No new console.log statements in production code
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] No debug code (debugger, console.debug, etc.)
- [ ] Code review completed (≥ 1 approver)

**Sign-off**: _________________ (Code Reviewer)

### ✓ Security & Dependencies
- [ ] npm audit clean: `npm audit` (no critical vulnerabilities)
- [ ] No GPL or restricted licenses in dependencies
- [ ] Dependency updates have passing tests
- [ ] Security tests passing: `npm run test:security`
- [ ] OWASP compliance checked (no hardcoded secrets)

**Sign-off**: _________________ (Security Team)

---

## Phase 2: Integration & E2E Testing ✅

### ✓ Smoke Tests (5-minute critical paths)
- [ ] E2E smoke tests passing: `npm run test:e2e:smoke`
- [ ] All `@critical` tests passing: `npm run test:e2e:critical`
- [ ] Tests run in staging environment verified
- [ ] No flaky test failures (run 2× if any failed)

**Critical User Journeys Verified**:
- [ ] Patient self-registration → Account creation
- [ ] Doctor login → Dashboard load → Prescription workflow
- [ ] Nurse vitals entry → Triage flow
- [ ] Pharmacy order creation → Dispensing flow
- [ ] Lab results entry → Provider notification

**Sign-off**: _________________ (QA Automation)

### ✓ Integration Tests
- [ ] Integration tests passing: `npm run test:integration`
- [ ] Supabase edge functions responding correctly
- [ ] Database queries return expected data
- [ ] No N+1 query issues detected

**Sign-off**: _________________ (Backend Review)

### ✓ Accessibility & Cross-Browser
- [ ] Accessibility tests passing: `npm run test:accessibility`
- [ ] WCAG 2.1 Level AA compliance verified
- [ ] No new color contrast issues
- [ ] Tested in Chrome, Firefox (if applicable)

**Sign-off**: _________________ (QA)

---

## Phase 3: Database & RLS ✅ (🔒 CRITICAL)

### ✓ RLS Policy Validation
- [ ] RLS validation passing: `npm run validate:rls`
- [ ] All patient-critical tables have hospital_id column
- [ ] All RLS policies use hospital isolation function
- [ ] No anonymous read/write access to PHI tables
- [ ] Multi-hospital isolation verified in staging

**Patient-Critical Tables Verified** (46 total):
- [ ] `patients`, `patient_vitals`, `consultations`, `prescriptions`, `lab_results`
- [ ] `billing_records`, `patient_documents`, `appointments`, `invoices`
- [ ] `pharmacy_orders`, `inventory_items`, `lab_orders`, `telemedicine_sessions`
- [ ] All others: See [docs/PHASE_1A_DELIVERABLE_README.md](../docs/PHASE_1A_DELIVERABLE_README.md#46-patient-critical-tables)

**Sign-off**: _________________ (Security Lead)

### ✓ Migration Reversibility
- [ ] Migration validation passing: `npm run validate:migrations`
- [ ] No DROP COLUMN operations (use soft-deprecation)
- [ ] All migrations are backward-compatible
- [ ] Migration dry-run successful on staging: ✓

**Database Migration**:
- Migration file: __________________________ (e.g., 20260313000001_new_schema.sql)
- Lines changed: __________________________ 
- Tables affected: __________________________

**Sign-off**: _________________ (DBA / Database Reviewer)

### ✓ Data Integrity
- [ ] Staging database backup taken (snapshot_pre_v1.3.0)
- [ ] Database integrity checks passed (no orphaned FKs)
- [ ] Production database has equivalent schema to staging
- [ ] No data loss expected on migration rollback

**Sign-off**: _________________ (DBA)

---

## Phase 4: Environment & Secrets ✅

### ✓ Environment Configuration
- [ ] `.env.production` verified (secrets NOT in git)
- [ ] All required secrets present in GitHub Secrets
- [ ] No hardcoded URLs or API keys in code
- [ ] Staging environment verified separate from production
- [ ] Database URLs point to correct environments

**Secrets Verification**:
- [ ] VITE_SUPABASE_URL (production)
- [ ] VITE_SUPABASE_ANON_KEY (public, safe)
- [ ] SUPABASE_SERVICE_ROLE_KEY (service-only, must not log)
- [ ] SUPABASE_ACCESS_TOKEN (migrations only)
- [ ] API keys for 3rd-party services (e.g., Twilio, SendGrid)

**Sign-off**: _________________ (DevOps / Secrets Admin)

### ✓ Feature Flags Ready
- [ ] New features gated behind feature flags (if applicable)
- [ ] Feature flag rollout plan documented
- [ ] Kill-switch procedure tested and documented
- [ ] High-risk features have < 100% rollout initially

**Feature Flags to Enable**:
```
Flag Name                | Initial Rollout | Rollout Phase
______________________|_________________|_________________________
______________________|_________________|_________________________
______________________|_________________|_________________________
```

**Sign-off**: _________________ (Product Lead / Clinical Lead)

---

## Phase 5: Clinical Review & Domain Expert Sign-Off ✅

### ✓ Workflow & Clinical Safety
- [ ] Clinical workflows reviewed for correctness
- [ ] Medications/dosages use validated therapeutic ranges
- [ ] Lab result interpretations reviewed by pathologist
- [ ] Patient safety features functional (allergy alerts, drug interactions)
- [ ] No changes to critical clinical workflows without approval

**Clinical Changes in This Release**:
- __________________________ (describe)
- __________________________ (describe)

**Sign-off**: _________________ (Clinical Domain Expert)

### ✓ Billing & Compliance
- [ ] Billing calculations verified (tariff, insurance, discounts)
- [ ] Insurance claim generation tested
- [ ] Co-pay logic correct for applicable policies
- [ ] Audit trail enabled for billing changes

**Sign-off**: _________________ (Billing / Finance Lead)

---

## Phase 6: Monitoring & Alerting ✅

### ✓ Observability Ready
- [ ] Grafana dashboards deployed for new features
- [ ] Prometheus alert rules configured
- [ ] Error rate baseline established (e.g., target < 2%)
- [ ] Latency SLA defined (API response time, page load)
- [ ] Clinical metrics dashboard ready (not just infra)

**Key Metrics to Monitor**:
- [ ] API error rate (target < 2%)
- [ ] Database query latency (p99 < 500ms)
- [ ] RLS policy violations (0 expected)
- [ ] Feature flag rollout progress
- [ ] Patient data access audit events

**Rollback Alert Threshold**:
- Error rate > ____________ % (suggest 5%)
- Latency p99 > ____________ ms (suggest 1000ms)
- Critical feature unavailable for > ____________ min (suggest 5 min)

**Sign-off**: _________________ (DevOps / Observability)

### ✓ Log Aggregation
- [ ] PHI not logged (verified via Datadog/ELK audit)
- [ ] Sensitive information (passwords, tokens) not in logs
- [ ] Structured logging for debugging (correlation IDs, user context)
- [ ] Log retention policy enforced (30 days prod, 7 days staging)

**Sign-off**: _________________ (Compliance / Security)

---

## Phase 7: Staging Verification ✅

### ✓ Staging Smoke Test
- [ ] Run full smoke test suite on staging: `npm run test:e2e:smoke`
- [ ] All critical paths passing in staging
- [ ] Staging has been green for ≥ 24 hours
- [ ] No critical P0 issues detected in staging

**Staging Test Duration**: Started _____________ (date) at _____________ (time)
**Duration**: _____________ hours
**Issues Found**: _____________ (critical: _____________, major: _____________, minor: _____________)

### ✓ Multi-Hospital Isolation (if applicable)
- [ ] Hospital A patients NOT visible to Hospital B users
- [ ] Hospital A prescriptions do NOT appear in Hospital B pharmacy
- [ ] Lab results scoped correctly by hospital
- [ ] Billing records isolated by hospital

**Hospitals Tested**: Hospital 1: _____________, Hospital 2: _____________

**Sign-off**: _________________ (QA / Security)

---

## Phase 8: Approvals & Go/No-Go ✅

### ✓ Approval Chain
- [ ] Tech Lead review & sign-off: _________________ Date: _______
- [ ] QA Lead sign-off: _________________ Date: _______
- [ ] Clinical/Domain Expert sign-off: _________________ Date: _______
- [ ] DevOps/Deployment Lead sign-off: _________________ Date: _______
- [ ] **2nd Maintainer approval** (GitHub PR): _________________ Date: _______

### ✓ Deployment Authorization
- [ ] No critical issues blocking deployment
- [ ] Stakeholders informed of deployment window
- [ ] Communication plan in place (Slack, email, status page)
- [ ] Rollback lead on-call during deployment

**Deployment Window**:
- **Start Time**: _________________________ UTC
- **Expected Duration**: _________________________ minutes
- **Rollback Buffer**: Keep extra 30 min for rollback if needed

**Communication**:
- [ ] Status page message scheduled
- [ ] Slack #deployments notified
- [ ] Hospital admins given notice (if applicable)
- [ ] Customer support briefed on changes

### ✓ Final Go/No-Go Decision

**DECISION**: 
- [ ] **GO** — All checks passed. Authorized for production deployment.
- [ ] **NO-GO** — Critical issue found. STOP. Do not deploy.
  - Reason: ___________________________________________________________
  - Action: Rollback staging and retry later

**Approved By**: _________________________ (Deployment Authority)  
**Date/Time**: _________________________ UTC  
**Signature**: _________________________ 

---

## Post-Deployment (Complete within 1 hour of go-live)

### ✓ Health Check
- [ ] Application responding at production URL
- [ ] Database queries returning data
- [ ] RLS policies enforcing correctly (manual spot check)
- [ ] API latency < 500ms (p95)
- [ ] Error rate < 2%
- [ ] No P0 incidents detected

**Health Check Run By**: _________________________ Time: _______

### ✓ Monitoring & Alerts
- [ ] Grafana dashboards showing data
- [ ] Alert rules firing (test trigger if needed)
- [ ] No unexpected error spikes
- [ ] Feature flag rollout monitoring active
- [ ] Audit log growth normal

**Monitoring Verified By**: _________________________ Time: _______

### ✓ Clinical Walkthrough (if changes to clinical features)
- [ ] Clinical staff can sign in
- [ ] Doctor can view prescribed medications
- [ ] Lab tech can enter results
- [ ] Nursing can record vitals
- [ ] Patient portal accessible

**Walkthrough Verified By**: _________________________ Time: _______

### ✓ 24-Hour Post-Deployment Review
- [ ] No critical incidents in first 24 hours
- [ ] Metrics stable (error rate, latency)
- [ ] Feature flag rollout progressing as planned
- [ ] Customer feedback positive (if applicable)
- [ ] Database performance optimal

**Scheduled For**: _________________________ (date, next day)
**Reviewed By**: _________________________

---

## Rollback Procedures

**If Critical Issues Detected** (See [docs/ROLLBACK_PROCEDURES.md](../docs/ROLLBACK_PROCEDURES.md) for detailed steps):

### Emergency Rollback Step 1: Disable Feature Flag (< 1 min)
```bash
# If the issue is isolated to a new feature:
UPDATE feature_flags 
SET enabled = false 
WHERE flag_name = 'xxxxx_v2' AND hospital_id = '<hospital-uuid>';
```

### Emergency Rollback Step 2: Revert Code (5-10 min)
```bash
git revert HEAD --no-edit
npm run build
# Deploy via GitHub Actions (manual trigger)
```

### Emergency Rollback Step 3: Revert Database (only if data corrupted, 10-30 min)
```bash
# Restore staging snapshot (taken before migration)
pg_restore ...
```

**Rollback Authorized By**: _________________________ Time: _______  
**Rollback Completed By**: _________________________ Time: _______  
**Back to Known-Good State**: _________________________ Time: _______

---

## Sign-Off Sheet

### Final Deployment Sign-Off

| Role | Name | Signature | Date/Time |
|------|------|-----------|-----------|
| **Deployment Lead** | _________________ | _________________ | _________________ |
| **Tech Lead** | _________________ | _________________ | _________________ |
| **QA Lead** | _________________ | _________________ | _________________ |
| **Clinical Expert** | _________________ | _________________ | _________________ |
| **DevOps** | _________________ | _________________ | _________________ |

---

## Appendix: Issue Tracker Template

Use this template to create a GitHub issue for the deployment, linking this checklist:

```markdown
# Deployment: v1.3.0 → Production
- **Release Date**: [date]
- **Deployment Lead**: @username
- **Checklist**: See attached DEPLOYMENT_CHECKLIST.md

## Changes in This Release
- [Feature 1]
- [Feature 2]
- [Bug fix 1]

## Pre-Deployment Tests
- Unit tests: ✅ Passing
- E2E smoke: ✅ Passing
- RLS validation: ✅ Passing
- Migration reversibility: ✅ Passing

## Approval Sign-Offs
- [ ] Tech Lead: @reviewer1
- [ ] QA Lead: @reviewer2
- [ ] Clinical Expert: @clinical
- [ ] 2nd Maintainer: @maintainer2

## Post-Deployment Verification
- [ ] Health check completed
- [ ] Metrics normal
- [ ] No critical incidents
```

---

**Document Version**: 1.0  
**Last Updated**: March 13, 2026  
**Referenced in**: [PHASE_1B_CI-CD_SAFETY_GATES_ANALYSIS.md](./PHASE_1B_CI-CD_SAFETY_GATES_ANALYSIS.md)
