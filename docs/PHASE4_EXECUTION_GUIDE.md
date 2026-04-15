# Phase 4 Execution Guide - Performance Optimization Track
**Effective Date**: May 13, 2026  
**Duration**: 4 weeks (May 13 - June 3)  
**Status**: 🚀 Ready to Execute

---

## Quick Start - For Team Members

### What is Phase 4?
Performance optimization of CareSync HIMS across 3 domains:
- **Backend**: Query optimization, database indexing, connection pooling
- **Frontend**: Bundle size reduction, code splitting, React rendering optimization
- **Infrastructure**: Kubernetes scaling, caching, CDN, load balancing

### Success Criteria
- ✅ Backend: All queries <200ms p95 (currently baseline-measuring)
- ✅ Frontend: Bundle <300KB gzipped, LCP <2.5s
- ✅ Infrastructure: 10x concurrent users handled smoothly
- ✅ Load test: <500ms p95 under peak load, <1% error rate

### Timeline at a Glance
```
Week 13 (May 13-17): Backend performance sprint
Week 14-15 (May 20-27): Frontend + infrastructure parallel
Week 16 (Jun 3): 10x load test execution
```

---

## Running the Test Suites

### Prerequisites
```bash
# Ensure dependencies installed
npm install

# Verify Node version (16.x or higher)
node --version

# Check Vitest installation
npm list vitest

# Optional: Install k6 for load testing
# MacOS: brew install k6
# Windows: choco install k6
# Linux: sudo apt-get install k6
```

### All Performance Tests
```bash
# Run all performance tests (full suite)
npm run test:performance

# Expected output: 200+ tests, 60s timeout
# Watch for failures and p95 timing metrics
```

### Domain-Specific Tests

#### Backend Performance (50 tests)
```bash
npm run test:performance:backend

# What it tests:
# - Query performance baselines (<200ms)
# - N+1 query detection
# - Database index validation
# - Connection pool behavior
# - Complex query optimization

# File: tests/performance/backend-performance.test.ts
```

#### Frontend Performance (50 tests)
```bash
npm run test:performance:frontend

# What it tests:
# - Bundle size (<300KB gzipped)
# - Code splitting validation
# - React rendering optimization
# - Web Vitals (LCP, FID, CLS)
# - Asset optimization (WebP, fonts)

# File: tests/performance/frontend-performance.test.ts
```

#### Infrastructure Performance (50 tests)
```bash
npm run test:performance:infrastructure

# What it tests:
# - Kubernetes HPA scaling
# - Database read replicas
# - Redis caching behavior
# - CDN header validation
# - Load balancing, SLO monitoring

# File: tests/performance/infrastructure-performance.test.ts
```

#### Load Testing (k6 Script)
```bash
# Production-like load test (100 concurrent users, 5.5 min duration)
npm run test:load

# Simulates 6 clinical workflows:
# - Patient dashboard access (25 users)
# - Prescription creation (20 users)
# - Lab results viewing (20 users)
# - Billing/payment (15 users)
# - Audit trail queries (10 users)
# - Appointment scheduling (10 users)

# File: tests/performance/load-test.js

# Success criteria:
# - p95 response time <500ms ✅
# - Error rate <1% ✅
# - Login success rate >95% ✅
```

#### Staging Load Test
```bash
# Run load test against staging environment
npm run test:load:staging

# Set custom base URL:
# BASE_URL=https://your-staging-url k6 run tests/performance/load-test.js
```

### Coverage Report
```bash
# Generate coverage report for performance tests
npm run test:performance:coverage

# Output: coverage/index.html
# View in browser: open coverage/index.html
```

---

## Weekly Execution Plan

### Week 13: Backend Optimization (May 13-17)
**Focus**: Query performance and database efficiency

**Daily Standup** (9:00 AM UTC):
- Mon (13): Kickoff, baseline measurements
- Tue (14): Query analysis, slow query log review
- Wed (15): Index strategy discussion
- Thu (16): Connection pool tuning
- Fri (17): Results review, blockers identification

**Execution Steps**:

1. **Monday (May 13) - Kickoff & Baseline**
   ```bash
   npm run test:performance:backend
   # Record all baseline timings - these become targets
   # Expected: ~50 tests, baseline metrics capture
   ```

2. **Tue-Wed (May 14-15) - Query Optimization**
   - Identify slow queries (>200ms)
   - Add appropriate database indexes
   - Run baseline test again: `npm run test:performance:backend`
   - Target: 80%+ queries <200ms

3. **Thu (May 16) - Connection Pool Tuning**
   - Review pool size configuration
   - Test under concurrent load (10+ simultaneous)
   - Run: `npm run test:performance:backend`
   - Target: No pool exhaustion errors

4. **Friday (May 17) - Results & Gate**
   ```bash
   npm run test:performance:backend
   npm run test:performance:coverage | grep backend
   ```
   - Decision: Proceed to Week 14 if >80% <200ms ✅

**Success Metrics**:
- [ ] 80%+ queries <200ms
- [ ] No N+1 queries detected
- [ ] Connection pool passing
- [ ] Weekly review document updated

---

### Week 14-15: Frontend + Infrastructure (May 20-27)
**Focus**: Code optimization and cloud infrastructure scaling

**Frontend Track** (May 20-22):
```bash
npm run test:performance:frontend
# Focus on:
# - Bundle optimization (<300KB)
# - Code splitting validation
# - React rendering memoization
```

**Infrastructure Track** (May 20-22, parallel):
```bash
npm run test:performance:infrastructure
# Focus on:
# - Kubernetes HPA scaling (2-10 pods)
# - Database read replica failover
# - Redis cache configuration
```

**Load Test Prep** (May 23-24):
```bash
# Staging dry-run
npm run test:load:staging
# Identify any infrastructure issues before production load
```

**Success Metrics**:
- [ ] Frontend bundle <300KB
- [ ] LCP <2.5s
- [ ] Kubernetes scales to 10 pods smoothly
- [ ] Redis cache hit rate >80%
- [ ] Load test pr staging passes

---

### Week 16: 10x Load Test (June 3)
**Focus**: Production capacity validation

**Monday (Jun 3) - Full Load Test**:
```bash
# Production load test (100 concurrent users)
npm run test:load

# Alternative: Against staging first
npm run test:load:staging

# Success criteria (ALL must pass):
# ✅ p95 response time <500ms
# ✅ Error rate <1%
# ✅ Login success >95%
# ✅ Database connection pooling stable
# ✅ Kubernetes pods scaling correctly
```

**Success Dashboard** (Expected Output):
```
Checks: 4 passed, 0 failed
HTTP Request Duration: p95=425ms ✅
Error Rate: 0.8% ✅
Auth Success Rate: 97.3% ✅
Database Connections: Max 45/50 ✅
Kubernetes Pods: Scaled to 8 pods ✅
```

**Post-Test Steps**:
1. Review logs for any errors
2. Collect performance metrics
3. Document any tuning applied
4. Create Phase 4 completion report
5. **Gate Decision: Ready for Phase 5?** ✅

---

## Troubleshooting Guide

### Backend Performance Tests Failing

**Problem**: Tests show >200ms queries
```bash
# Debug slow queries
npm run test:performance:backend -- --reporter=verbose

# Check database slow query log
# Look for queries taking >150ms
# Add indexes as needed
```

**Solution**:
1. Identify slow query in test output
2. Review query plan: `EXPLAIN ANALYZE [query]`
3. Add missing indexes
4. Re-run: `npm run test:performance:backend`

---

### Frontend Bundle Size Exceeded

**Problem**: Bundle >300KB
```bash
# Analyze bundle
npm run build
# Check dist/index.js size

# Debug with source maps
npm run build -- --sourcemap
```

**Solution**:
1. Identify large dependencies: `npm ls --depth=2`
2. Implement code splitting (route-based)
3. Lazy load heavy components (React.lazy)
4. Re-run: `npm run test:performance:frontend`

---

### Load Test High Error Rate

**Problem**: Error rate >1%
```bash
# Run with verbose output
k6 run --vus=50 tests/performance/load-test.js

# Check against staging first
npm run test:load:staging
```

**Solution**:
1. Reduce concurrent users initially (VUS=50)
2. Check database connection pool
3. Verify Kubernetes HPA scaling
4. Check cache hit rates
5. Gradually increase load

---

### Kubernetes Not Scaling

**Problem**: Pods not scaling to 10
```bash
# Check HPA status
kubectl get hpa
kubectl describe hpa caresync-hpa

# Check metrics server
kubectl get deployment metrics-server -n kube-system

# View pod events
kubectl describe pod caresync-[pod-id]
```

**Solution**:
1. Verify resource requests/limits are set
2. Check HPA min/max replicas
3. Verify metrics-server is running
4. Apply resource limits: `kubectl apply -f k8s/resource-limits.yaml`

---

## Weekly Status Template

Create a file: `docs/PHASE4_WEEK_[13-16]_EXECUTION.md`

```markdown
# Phase 4 Week [X] Execution Report
**Week**: [13-16]  
**Dates**: [Start-End]  
**Status**: 🚀 In Progress

## Test Results
- Backend: [X/50] passing ✅
- Frontend: [X/50] passing ✅
- Infrastructure: [X/50] passing ✅
- Load Tests: [p95 timing] ✅

## Issues Fixed
- [Issue 1]: [Resolution]
- [Issue 2]: [Resolution]

## Blockers
- [Blocker]: [Resolution plan]

## Next Week
- [Task 1]
- [Task 2]
- [Decision]: Gate ready? ✅/❌
```

---

## Automated Test Execution (GitHub Actions)

Phase 4 performance tests run **automatically every Monday at 10 AM UTC**:

```yaml
# File: .github/workflows/phase4-performance-tests.yml
# Runs 4 test domains in parallel
# Artifacts: performance-results-{backend,frontend,infra,load}.json
# Notifications: Slack #phase4-performance
```

**Manual Trigger** (Anytime):
```bash
# From VS Code terminal
gh workflow run phase4-performance-tests.yml

# View results
gh workflow view phase4-performance-tests
```

---

## Sign-Off Checklist

**Week 13 (Backend) Sign-Off**:
- [ ] Backend tests passing (>80% <200ms)
- [ ] Database indexes optimized
- [ ] Connection pooling validated
- [ ] No N+1 queries detected
- [ ] Week 13 report filed

**Week 14-15 (Frontend+Infra) Sign-Off**:
- [ ] Frontend bundle <300KB
- [ ] Web Vitals meeting targets
- [ ] Kubernetes scaling validated
- [ ] Redis cache operational
- [ ] Week 14-15 report filed

**Week 16 (Load Test) Sign-Off**:
- [ ] Load test <500ms p95 ✅
- [ ] Error rate <1% ✅
- [ ] Login success >95% ✅
- [ ] All metrics captured
- [ ] Phase 4 completion report filed
- [ ] **GATE DECISION: Ready for Phase 5?** ✅

---

## Team Responsibilities

| Role | Responsibility | Tasks |
|------|-----------------|-------|
| **Backend Lead** | Query optimization | Run backend tests, analyze slow queries, add indexes |
| **Frontend Lead** | Bundle optimization | Run frontend tests, implement code splitting |
| **DevOps Lead** | Infrastructure tuning | Run infra tests, Kubernetes scaling, cache setup |
| **QA Lead** | Load testing | Coordinate k6 execution, collect metrics |
| **Project Lead** | Gate decisions | Weekly reviews, blockers resolution |

---

## Success Criteria (GATE REQUIREMENTS)

**Phase 4 completion requires ALL of the following**:

- ✅ Backend: 80%+ queries <200ms p95
- ✅ Frontend: Bundle <300KB, LCP <2.5s
- ✅ Infrastructure: 10 pods scaling smoothly
- ✅ Load test: <500ms p95, <1% error rate, >95% login success
- ✅ Zero critical vulnerabilities
- ✅ 100% of performance tests passing or documented as intentional

**IF ALL MET**: ✅ **APPROVED FOR PHASE 5 (June 10)**

**IF BLOCKED**: Determine root cause and create remediation plan

---

## Questions?

- **Technical Support**: #phase4-performance Slack channel
- **Escalation**: Project Lead → CTO
- **Documentation**: See /docs/tests/performance/README.md

