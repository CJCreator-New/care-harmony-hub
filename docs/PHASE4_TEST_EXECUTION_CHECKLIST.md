# Phase 4 Test Execution Checklist
**Quick-Reference Guide for Running All Performance Tests**  
**Effective**: May 13, 2026  
**Target Audience**: Backend, Frontend, DevOps, QA teams

---

## 🎯 Pre-Execution Checklist

Before running ANY tests, complete these:

- [ ] **Environment Setup**
  - [ ] Node version ≥16.x: `node --version`
  - [ ] npm installed: `npm --version`
  - [ ] Dependencies refreshed: `npm install`
  - [ ] Test config exists: `vitest.performance.config.ts` present

- [ ] **Database & Services**
  - [ ] PostgreSQL running and accessible
  - [ ] Supabase services operational
  - [ ] Redis cache available
  - [ ] API endpoints responding

- [ ] **GitHub & Tracking**
  - [ ] GitHub branch is up-to-date
  - [ ] No uncommitted changes in test files
  - [ ] Assigned to Phase 4 workstream in GitHub Project

---

## ⚙️ Test Execution Flow (Choose Your Path)

### Option A: Run ALL Tests at Once (Full Suite)
**Use when**: Running complete validation or end-of-week gate  
**Duration**: ~15-20 minutes  
**Command**:
```bash
npm run test:performance
```
**Success Criteria**:
- [ ] All 200+ tests pass or clearly marked as expected failures
- [ ] No crashes or timeouts
- [ ] Performance metrics captured

**Troubleshooting**: If failing, run individual domains (Options B-E) to identify blocker

---

### Option B: Backend Performance Tests (50 tests)
**Use when**: Optimizing queries, indexing, or connection pooling  
**Duration**: ~5-7 minutes  
**Command**:
```bash
npm run test:performance:backend
```
**Tests Included**:
- [ ] Query performance baselines (<200ms)
- [ ] N+1 query detection
- [ ] Database index validation
- [ ] Connection pool behavior
- [ ] Complex query optimization

**Success Criteria**:
- [ ] ≥80% of tests passing
- [ ] Query p95 <200ms baseline established
- [ ] No connection pool exhaustion errors

**Output to Review**:
```
✓ Query: Patient List (95ms)
✓ Query: Vital Signs (145ms)
✓ N+1 Detection: Prevented 12 extra queries
✓ Index Performance: +45% improvement
```

---

### Option C: Frontend Performance Tests (50 tests)
**Use when**: Optimizing bundle, code splitting, or React rendering  
**Duration**: ~5-7 minutes  
**Command**:
```bash
npm run test:performance:frontend
```
**Tests Included**:
- [ ] Bundle size optimization (<300KB gzipped)
- [ ] Code splitting validation
- [ ] React rendering memoization
- [ ] Web Vitals (LCP, FID, CLS)
- [ ] Asset optimization

**Success Criteria**:
- [ ] Bundle <300KB gzipped
- [ ] LCP <2.5 seconds
- [ ] Code splitting reducing initial JS

**Output to Review**:
```
✓ Bundle Size: 285KB (Target: <300KB) ✅
✓ LCP: 2.1s (Target: <2.5s) ✅
✓ Code Splitting: 4 chunks, 85KB initial ✅
✓ CLS: 0.08 (Target: <0.1) ✅
```

---

### Option D: Infrastructure Performance Tests (50 tests)
**Use when**: Tuning Kubernetes, caching, or load balancing  
**Duration**: ~5-7 minutes  
**Command**:
```bash
npm run test:performance:infrastructure
```
**Tests Included**:
- [ ] Kubernetes HPA scaling (2-10 pods)
- [ ] Database read replica failover
- [ ] Redis cache configuration
- [ ] CDN & cache headers
- [ ] Load balancing & monitoring

**Success Criteria**:
- [ ] Kubernetes scales to 10 pods without errors
- [ ] Database read replicas functional
- [ ] Cache hit rate >80%

**Output to Review**:
```
✓ K8s Scaling: 2→10 pods in 45s ✅
✓ Read Replicas: Failover in 2.1s ✅
✓ Cache Hit Rate: 87% ✅
✓ CDN Headers: 1-year expiry validated ✅
```

---

### Option E: Load Testing (Simulation)
**Use when**: Validating system under peak concurrent load  
**Duration**: ~8-10 minutes  
**Command**:
```bash
npm run test:load
```
**Prerequisites**:
- [ ] k6 installed (`k6 version`)
- [ ] Target environment stable
- [ ] No other load tests running

**Simulates**:
- [ ] 100 concurrent users
- [ ] 6 clinical workflows
- [ ] 5.5 minute test duration

**Success Criteria**:
- [ ] p95 response <500ms ✅
- [ ] Error rate <1% ✅
- [ ] Login success >95% ✅

**Output to Review**:
```
Checks: 4 passed, 0 failed
Data Received: 245 MB
Data Sent: 12 MB
Duration: 5m 32s
Requests: 15,432 completed, 0 failed
   http_req_duration: p95=425ms ✅
   http_errors: 0.8% ✅
   Login Success: 97.2% ✅
```

**Staging Variant** (dry-run before production):
```bash
npm run test:load:staging
```

---

## 📊 Performance Metrics Reference

### Backend Targets (Week 13)
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Query p95 | <200ms | TBD | ⏳ |
| N+1 Detected | <10 per page | TBD | ⏳ |
| Connection Pool | 50 max | TBD | ⏳ |
| Index Hit Rate | >95% | TBD | ⏳ |

### Frontend Targets (Weeks 14-15)
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Bundle (gzip) | <300KB | TBD | ⏳ |
| LCP | <2.5s | TBD | ⏳ |
| FID | <100ms | TBD | ⏳ |
| CLS | <0.1 | TBD | ⏳ |

### Load Test Targets (Week 16)
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| p95 Response | <500ms | TBD | ⏳ |
| Error Rate | <1% | TBD | ⏳ |
| Login Success | >95% | TBD | ⏳ |
| Throughput | 1000+ req/s | TBD | ⏳ |

---

## 🐛 When Tests Fail (Troubleshooting)

### Backend Tests Failing

**Problem**: Query timing >200ms
```bash
# Step 1: Run with verbose output
npm run test:performance:backend -- --reporter=verbose

# Step 2: Check slow query log
# Review database slow query log

# Step 3: Add indexes
# ALTER TABLE patients ADD INDEX idx_hospital_id (hospital_id);

# Step 4: Re-run
npm run test:performance:backend
```

---

### Frontend Tests Failing

**Problem**: Bundle >300KB
```bash
# Step 1: Check current size
npm run build
ls -lh dist/index.js

# Step 2: Analyze bundle
npm run build -- --sourcemap

# Step 3: Identify large deps
npm ls --depth=2 | grep -E "^├|^└"

# Step 4: Implement code splitting
# Use React.lazy() for route components

# Step 5: Re-run
npm run test:performance:frontend
```

---

### Infrastructure Tests Failing

**Problem**: Kubernetes not scaling
```bash
# Step 1: Check HPA status
kubectl get hpa
kubectl describe hpa caresync-hpa

# Step 2: Verify metrics server
kubectl get deployment metrics-server -n kube-system

# Step 3: Apply resource limits
kubectl apply -f k8s/resource-limits.yaml

# Step 4: Re-run
npm run test:performance:infrastructure
```

---

### Load Test High Error Rate

**Problem**: Error rate >1%
```bash
# Step 1: Run with lower concurrency
k6 run --vus=50 tests/performance/load-test.js

# Step 2: Dry-run against staging
npm run test:load:staging

# Step 3: Check database connections
# Verify connection pool not exhausted

# Step 4: Increase gradually
k6 run --vus=75 tests/performance/load-test.js
k6 run --vus=100 tests/performance/load-test.js (full test)
```

---

## ✅ Weekly Execution Checklist

### Week 13: Backend Sprint (May 13-17)

**Monday (May 13) - Kickoff**
- [ ] Run baseline: `npm run test:performance:backend`
- [ ] Record all query timings
- [ ] Identify queries >200ms
- [ ] Document findings

**Tuesday-Wednesday (May 14-15) - Optimization**
- [ ] Analyze slow queries
- [ ] Add database indexes
- [ ] Re-run: `npm run test:performance:backend`
- [ ] Verify >80% <200ms

**Thursday (May 16) - Connection Pool**
- [ ] Review pool config
- [ ] Test under concurrent load
- [ ] Re-run: `npm run test:performance:backend`
- [ ] Verify no exhaustion errors

**Friday (May 17) - Week Gate**
- [ ] Final run: `npm run test:performance:backend`
- [ ] Generate coverage: `npm run test:performance:coverage`
- [ ] Document results
- [ ] **Gate Decision**: Proceed to Week 14? ✅/❌

---

### Week 14-15: Frontend + Infrastructure (May 20-27)

**Monday-Wednesday (May 20-22) - Parallel Tracks**
- [ ] Frontend: `npm run test:performance:frontend`
- [ ] Infrastructure: `npm run test:performance:infrastructure`
- [ ] Address failures for each track
- [ ] Re-run after fixes

**Thursday-Friday (May 23-24) - Load Test Prep**
- [ ] Dry-run: `npm run test:load:staging`
- [ ] Identify any infrastructure issues
- [ ] Document findings
- [ ] Prepare for Week 16 full load test

---

### Week 16: Load Test & Gate (June 3)

**Monday (June 3) - Full Load Test**
- [ ] Final checks: infrastructure ready? ✅
- [ ] Run full load test: `npm run test:load`
- [ ] Capture all metrics
- [ ] Document results
- [ ] **GATE DECISION**: Ready for Phase 5? ✅/❌

---

## 📋 Results Recording Template

Use this for each test run:

```markdown
# [Week X] [Domain] Test Results
**Date**: [Date]  
**Executor**: [Name]  
**Test**: [Backend/Frontend/Infrastructure/Load]

## Pass/Fail Summary
- Tests: [X]/[Y] passing
- Success Rate: [%]

## Key Metrics
- [Metric 1]: [Value] (Target: [Target])
- [Metric 2]: [Value] (Target: [Target])

## Issues Found
- [Issue 1]: [Description]
- [Issue 2]: [Description]

## Fixes Applied
- [Fix 1]: [Resolution]
- [Fix 2]: [Resolution]

## Next Steps
- [ ] [Action 1]
- [ ] [Action 2]

## Gate Decision
Proceed to next phase? ✅ / ❌
```

---

## 🚀 Quick Command Reference

| Command | Use Case | Duration |
|---------|----------|----------|
| `npm run test:performance` | Full suite validation | 15-20m |
| `npm run test:performance:backend` | Query optimization | 5-7m |
| `npm run test:performance:frontend` | Bundle optimization | 5-7m |
| `npm run test:performance:infrastructure` | K8s/cache tuning | 5-7m |
| `npm run test:performance:coverage` | Coverage report | 8-10m |
| `npm run test:load` | Peak load validation | 8-10m |
| `npm run test:load:staging` | Pre-prod dry-run | 8-10m |

---

## 📞 Getting Help

**Test Fails? Check**:
1. Troubleshooting section above ⬆️
2. `docs/PHASE4_EXECUTION_GUIDE.md` (detailed)
3. `tests/performance/README.md` (test documentation)
4. Slack: `#phase4-performance`

**Still Stuck?**:
- Post error in GitHub issue with label `phase4-blocker`
- Tag @DevOpsLead or @ProjectLead for escalation
- 24-hour response SLA for blockers

---

## ✨ Pro Tips

1. **Parallel Execution**: Run frontend + infrastructure tests simultaneously in different terminals
2. **Before/After Metrics**: Capture baseline before optimization, then final after
3. **Incremental Load**: Start with `--vus=50` for load tests, then increase gradually
4. **Early Mornings**: Run full suite early in week to identify issues early
5. **Slack Updates**: Share results in #phase4-performance after each run

---

**Last Updated**: April 10, 2026  
**Next Update**: May 13, 2026 (Week 13 Kickoff)

