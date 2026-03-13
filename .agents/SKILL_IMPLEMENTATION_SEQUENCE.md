# CareSync Skills Implementation Sequence

**Goal**: Enhance the app incrementally using the 5 newly enhanced skills without breaking current functionality.

**Approach**: Phase-by-phase with validation checkpoints. Each phase can be rolled back independently.

---

## Phase 1: Foundation Setup (Week 1) ⚙️

**Risk Level**: ⭐ VERY LOW (non-breaking, local only)

### 1A: Developer Onboarding Baseline

**Skill**: hims-onboarding-helper

**Prompt to use**:
```
Using the hims-onboarding-helper skill, help me:
1. Verify our 15-minute local setup works for a new developer
2. Create test logins for each role (doctor, nurse, pharmacist, lab, receptionist, patient)
3. Identify gaps in "healthcare development checklist" for our current codebase
4. Document which database tables need inspection before starting feature work
```

**What to check**:
- [ ] Clone → npm install → Supabase → Users → Dev completes in 15 min
- [ ] Test logins work for all 6 roles + admin
- [ ] RLS prevents doctor from seeing other hospital data
- [ ] Database inspection script runs without errors

**Deliverable**: README with copy-paste commands for new team members

---

### 1B: CI/CD Safety Gates

**Skill**: hims-devops-guardian

**Prompt to use**:
```
Using the hims-devops-guardian skill, help me:
1. Create an npm script "npm run validate:rls" to check RLS policies
2. List all environment gates we MUST have (pre-commit, PR, staging, prod)
3. Identify which deployment gates are missing from our current pipeline
4. Show me how to do zero-downtime feature flag rollout for new pharmacy features
```

**What to check**:
- [ ] `npm run validate:rls` runs without errors
- [ ] All patient data tables have hospital_id scoping
- [ ] RLS policies use current_hospital_id() function
- [ ] CI/CD pipeline blocks PRs until lint + test pass
- [ ] No private keys in env files (using .env.local only)

**Deliverable**: `.github/workflows/rls-validation.yml` + deployment checklist doc

---

## Phase 2: Data Integrity (Week 2) 📋

**Risk Level**: ⭐⭐ LOW (audit system only, no patient data changes)

### 2A: Audit Trail Implementation

**Skill**: hims-audit-trail

**Prompt to use**:
```
Using the hims-audit-trail skill, help me:
1. Identify which workflows MUST have audit trails (prescription, discharge, billing, lab results)
2. Create an audit table schema for "prescription_audit" with amendment support
3. Show me exactly how to log a prescription APPROVAL (actor, timestamp, reason)
4. Show the pattern for recording a dosage AMENDMENT (correction without overwriting)
5. List 10 code review checkpoints I should enforce when adding audit logs
```

**What to check**:
- [ ] Audit tables are append-only (no UPDATE allowed)
- [ ] Amendment pattern stores both original AND correction with timestamp
- [ ] Each audit record includes: hospital_id, actor_id, actor_role, change_reason
- [ ] No sensitive fields in audit log (no dosage amounts, diagnoses, patient names)
- [ ] Compliance fields: actor_department, patient_consent_reference if applicable

**Deliverable**: Migration file + audit insert trigger + example prescription amendment query

---

### 2B: Audit Integration (Non-Breaking)

**Skill**: hims-audit-trail

**Prompt to use**:
```
Using the hims-audit-trail skill, help me:
1. Add audit logging to prescription APPROVAL workflow without changing the API
2. Add audit logging to patient DISCHARGE without affecting billing
3. Add audit logging to billing ADJUSTMENT with reason capture
4. Show me how to test audit logs without breaking existing tests
```

**What to check**:
- [ ] All CREATE/UPDATE/DELETE operations have corresponding audit rows
- [ ] No patient-facing API changes (audit is backend-only)
- [ ] Existing tests pass (audit logging doesn't break them)
- [ ] Audit records visible in database but not exposed to frontend yet

**Deliverable**: 5-10 audit insert statements + test cases for amendment workflow

---

## Phase 3: Observability (Week 3) 📊

**Risk Level**: ⭐⭐ LOW (monitoring layer, zero production impact)

### 3A: Clinical Metrics Setup

**Skill**: hims-observability

**Prompt to use**:
```
Using the hims-observability skill, help me:
1. Define clinical SLOs for our key workflows:
   - Patient registration to first appointment (target: <30 min)
   - Prescription creation to pharmacy dispensing (target: <15 min)
   - Lab order to critical value alert (target: <5 min)
2. Create health check endpoints:
   - /health (liveness: Server running?)
   - /ready (readiness: Can accept requests?)
   - /metrics (Prometheus format)
3. Show me which metrics are patient safety critical (RED require alerting immediately)
4. Show me what NEVER to log (PHI patterns to avoid)
```

**What to check**:
- [ ] Health endpoints respond in <100ms
- [ ] Metrics endpoint exports Prometheus format
- [ ] No UHID, patient names, diagnoses in logs
- [ ] Critical metrics have alert thresholds set
- [ ] Role-specific dashboards (doctor vs nurse vs admin views)

**Deliverable**: Health check endpoints + Prometheus config + alert rules YAML

---

### 3B: Observability Integration (Non-Breaking)

**Skill**: hims-observability

**Prompt to use**:
```
Using the hims-observability skill, help me:
1. Add latency tracking to prescription creation workflow
2. Add queue depth metric to pharmacy workflow
3. Add critical alert rate metric to lab result processing
4. Wire all metrics to existing Prometheus + Grafana
5. Create a "Clinical Operations" dashboard showing SLOs
```

**What to check**:
- [ ] Metrics collected without adding >50ms to API responses
- [ ] No performance regression (load test shows <2% impact)
- [ ] Grafana dashboards show real-time data
- [ ] Alerts trigger correctly for SLO breaches

**Deliverable**: Metrics instrumentation + Grafana dashboards

---

## Phase 4: Frontend Safety & Design (Week 4) 🎨

**Risk Level**: ⭐⭐ LOW (UI polish, no logic changes)

### 4A: Healthcare UI Audit

**Skill**: frontend-design

**Prompt to use**:
```
Using the frontend-design skill, help me:
1. Audit our medication entry form:
   - Is dosage large enough to read? (target: ≥16px)
   - Are drug interaction warnings visible in RED?
   - Are allergy flags prominent?
   - Can pharmacist scan barcode?
2. Audit our lab results page:
   - Are abnormal values in RED/bold?
   - Do we show 30-day trends?
   - Are critical alerts immediate?
3. Audit role-specific visibility:
   - Can patient see all their data but NOT billing details?
   - Can doctor see prescriptions but NOT pharmacy queue?
   - Can nurse see vital signs on tablets (responsive)?
4. Audit accessibility:
   - No color-only indicators (color-blind safe)
   - All interactive elements are 48x48px minimum
   - Can all workflows be done with keyboard (no mouse required)
```

**What to check**:
- [ ] All dosage/medication fields: font ≥16px, red warnings present, allergy flags visible
- [ ] All lab results: abnormal values RED/bold, trends shown, critical alerts immediate
- [ ] Role visibility correct (run with test logins from Phase 1)
- [ ] Color palette correct: Alert red #DC2626, Warning orange #F97316, Success green #059669
- [ ] WCAG AAA accessible: <16 errors in axe DevTools

**Deliverable**: Accessibility audit report + component updates list

---

### 4B: Frontend Enhancements (Non-Breaking)

**Skill**: frontend-design

**Prompt to use**:
```
Using the frontend-design skill, help me:
1. Improve medication entry form with larger dosage field + interaction warnings
2. Improve lab results display with color-coded abnormality + trends
3. Improve vital signs display with large current value + out-of-range warnings
4. Ensure all forms use consistent CareSync color palette
5. Add WCAG AAA accessibility: 48px buttons, keyboard navigation, high contrast
6. Show me healthcare anti-patterns to REMOVE (decorative animations, tiny fonts, missing confirmations)
```

**What to check**:
- [ ] Screenshots compare before/after UI improvements
- [ ] No new components added (only styling changes to existing ones)
- [ ] Existing tests pass (UI change shouldn't break logic)
- [ ] Mobile/tablet responsive (test on iPad)
- [ ] Dark mode working correctly

**Deliverable**: 5-10 component improvements + responsive design fixes

---

## Phase 5: Testing & Validation (Week 5) ✅

**Risk Level**: ⭐ VERY LOW (testing layer, zero production code changes)

### 5A: Comprehensive Validation

**Run these commands in sequence**:

```bash
# 1. Type safety (CareSync uses strict TypeScript)
npm run type-check

# 2. Linting + formatting
npm run lint
npm run format

# 3. Unit tests (all should pass)
npm run test:unit

# 4. Integration tests (database layer)
npm run test:integration

# 5. Security tests (OWASP checks)
npm run test:security

# 6. Accessibility tests (WCAG AAA)
npm run test:accessibility

# 7. E2E smoke tests (critical paths)
npm run test:e2e:smoke

# 8. RLS validation (Phase 1B gates)
npm run validate:rls

# 9. Performance audit (no >50ms regressions)
npm run test:performance
```

**What to check**:
- [ ] All tests pass with 0 failures
- [ ] Type-check shows 0 errors (not just warnings)
- [ ] RLS validation passes for all tables
- [ ] Accessibility audit <16 errors
- [ ] Performance benchmarks within acceptable range

---

## Phase 6: Staged Rollout (Week 6+) 🚀

**Risk Level**: ⭐⭐⭐ MEDIUM (production traffic, but feature-flagged)

### 6A: Feature Flag Rollout

**Skill**: hims-devops-guardian

**Prompt to use**:
```
Using the hims-devops-guardian skill, help me:
1. Create feature flags for enhanced pharmacy workflow (gradual 10% → 50% → 100%)
2. Create feature flags for audit trail logging (hospital-by-hospital rollout)
3. Create feature flags for new clinical metrics (department-by-department)
4. Create feature flags for frontend UI improvements (gradual, by role)
5. Show me how to monitor each rollout (what metrics to watch)
6. Show me how to instant-rollback if issues detected
```

**What to check**:
- [ ] Feature flags control all new functionality
- [ ] Day 1 rollout: 10% of users (staging hospital)
- [ ] Day 3 rollout: 50% of users (2-3 more hospitals)
- [ ] Day 7 rollout: 100% of users (all hospitals)
- [ ] Metrics dashboard shows SLO compliance during rollout
- [ ] Instant rollback plan documented

---

### 6B: Production Monitoring

**Skill**: hims-observability

**Prompt to use**:
```
Using the hims-observability skill, help me:
1. Create alert rules for:
   - Prescription creation SLO breach (>15 min to dispensing)
   - Critical lab alert delay (>5 min without alert sent)
   - Audit table growth anomaly (suggests excessive mutations)
2. Create on-call runbook:
   - "SLO Breached" → what to check first
   - "Critical Alert Delayed" → troubleshooting steps
   - "Unexpected RLS Error" → recovery steps
3. Create daily/weekly SLO report
```

**What to check**:
- [ ] Alerts trigger correctly (test by injecting delays)
- [ ] Runbooks are clear enough for on-call engineer at 2am
- [ ] SLO reports show compliance % (target: >99.5% for critical paths)

---

## Master Checklist: Week-by-Week

### Week 1 ✏️
- [ ] **Phase 1A**: 15-min onboarding tested, test logins created
- [ ] **Phase 1B**: `npm run validate:rls` implemented, CI/CD gates added

### Week 2 📋
- [ ] **Phase 2A**: Audit schema created, 4 workflows tracked
- [ ] **Phase 2B**: Audit logging added (backend-only), no API changes

### Week 3 📊
- [ ] **Phase 3A**: Health endpoints live (`/health`, `/ready`, `/metrics`)
- [ ] **Phase 3B**: Clinical metrics integrated with Prometheus + Grafana

### Week 4 🎨
- [ ] **Phase 4A**: Accessibility audit completed, issues documented
- [ ] **Phase 4B**: UI improvements deployed (medication, labs, vitals)

### Week 5 ✅
- [ ] All tests pass: unit, integration, security, accessibility, E2E, RLS
- [ ] Type-check: 0 errors, 0 warnings
- [ ] Performance: no >50ms regression

### Week 6+ 🚀
- [ ] Feature flags created for all changes
- [ ] Day 1: 10% rollout (staging)
- [ ] Day 3: 50% rollout (2-3 hospitals)
- [ ] Day 7: 100% rollout (all hospitals)
- [ ] SLO dashboard shows >99.5% compliance
- [ ] Alert rules firing correctly

---

## Risk Mitigation

### Rollback Plan

| Phase | Rollback Instructions |
|-------|---|
| 1A | Delete test logins / reset `.env.local` |
| 1B | Disable RLS validation in CI (revert commit) |
| 2A/2B | Drop audit tables / revert migrationss |
| 3A/3B | Disable health endpoints / remove metrics |
| 4A/4B | Revert CSS / restore original components |
| 6A/6B | Toggle feature flag OFF instantly |

**Key**: Phases 1-5 are **fully reversible** with zero production risk. Phase 6 is gradual rollout with instant feature flag rollback.

---

## Success Criteria

✅ **All phases complete when**:
1. `npm run test:*` passes 100% (all test suites)
2. `npm run type-check` shows 0 errors
3. `npm run validate:rls` shows all tables properly scoped
4. Clinical SLOs achieved (prescription <15min, lab <5min, registration <30min)
5. Accessibility audit <16 WCAG AAA errors
6. Feature flags deployed with >99.5% uptime during rollout
7. Audit logs show all critical workflows tracked
8. New developers can onboard in 15 minutes

---

## Questions to Ask Per Phase

### Phase 1A (Onboarding)
- "Are there any new roles added since last update? (Lab tech? Billing clerk?)"
- "Do we test on iPad/tablet for nurses?"
- "Are there any OFFLINE scenarios (no internet)?"

### Phase 1B (DevOps)
- "Which Supabase tables are patient-critical (must have hospital_id scoping)?"
- "Do we have secrets rotation enabled in staging/prod?"
- "What's our current deployment frequency? (daily? weekly?)"

### Phase 2A/2B (Audit)
- "Are amendments allowed for prescriptions after dispensing?"
- "For billing adjustments, who can approve and by what reason?"
- "Do we need C-level audit access (CFO, Chief Medical Officer)?"

### Phase 3A/3B (Observability)
- "What's the slowest workflow today? (Should be tracked as priority metric)"
- "Are there any on-call escalation procedures we need to automate?"
- "Do we have Slack/PagerDuty integration?"

### Phase 4A/4B (Design)
- "Which component gets the most user complaints? (Start there)"
- "Do we have any accessibility audit from compliance team?"
- "Are there mobile/tablet-only workflows?"

### Phase 6A/6B (Rollout)
- "Which hospital should be 'canary' (10% rollout)?"
- "Who approves feature flag toggles? (PM? CTO? Both?)"
- "What's acceptable downtime for rollback? (seconds? minutes?)"

---

## Files to Create

By end of all phases, you'll have added:

```
.github/workflows/
  └── rls-validation.yml (Phase 1B)

src/hooks/
  ├── useAuditLog.ts (Phase 2A)
  └── useClinicalMetrics.ts (Phase 3A)

supabase/migrations/
  ├── audit-trail-tables.sql (Phase 2A)
  └── health-check-rls.sql (Phase 3A)

docs/
  ├── ONBOARDING_VALIDATED.md (Phase 1A)
  ├── AUDIT_TRAIL_IMPLEMENTATION.md (Phase 2A)
  ├── CLINICAL_SLO_METRICS.md (Phase 3A)
  ├── DESIGN_IMPROVEMENTS.md (Phase 4B)
  └── ROLLOUT_STRATEGY.md (Phase 6A)

monitoring/
  ├── alert-rules-clinical.yml (Phase 3B)
  └── slo-dashboard.json (Phase 3B)
```

---

## Communication / Stakeholder Updates

| Week | Update Message |
|------|---|
| 1 | "Enhanced developer onboarding (15-min setup) + RLS safety gates in CI/CD" |
| 2 | "Added audit logging to prescription, discharge, billing workflows (backend-only, no patient impact)" |
| 3 | "Clinical SLO metrics live: prescription <15min, lab <5min, registration <30min" |
| 4 | "Frontend improvements for medication entry, lab results, accessibility (WCAG AAA)" |
| 5 | "All tests passing: 100% unit, integration, security, accessibility, E2E + RLS validation" |
| 6+ | "Staged rollout: 10% → 50% → 100% with instant rollback capability" |

---

## Next: Run These Prompts

Ready to start? Use these exact prompts with the skills:

1. **Phase 1A** → Use this prompt with `hims-onboarding-helper`
2. **Phase 1B** → Use this prompt with `hims-devops-guardian`
3. **Phase 2A** → Use this prompt with `hims-audit-trail`
4. **Phase 3A** → Use this prompt with `hims-observability`
5. **Phase 4A** → Use this prompt with `frontend-design`
6. **Phase 5A** → Run the bash commands in order
7. **Phase 6A/6B** → Use these prompts with `hims-devops-guardian` + `hims-observability`

