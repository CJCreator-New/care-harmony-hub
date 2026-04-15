# Phase 4: Performance Testing Suite

This directory contains comprehensive performance testing scaffolds for CareSync HIMS, organized by domain:

## 📁 Test Files

### 1. **backend-performance.test.ts** (50 tests)
Backend query performance, N+1 detection, database indexing, and connection pooling.

**Test Categories:**
- Query Performance Baselines (5 tests)
- N+1 Query Detection (5 tests)
- Database Index Validation (5 tests)
- Connection Pool Behavior (5 tests)
- Complex Query Optimization (5 tests)

**Key Scenarios:**
- Patient list queries (<200ms target)
- Vital signs with patient data (<150ms target)
- Lab results pagination (<250ms target)
- Prescription history retrieval (<300ms target)
- Audit trail filtering (<200ms target)

**Quick Run:**
```bash
npm run test:performance -- tests/performance/backend-performance.test.ts
```

---

### 2. **load-test.js** (k6 Load Testing)
Load testing with 100 concurrent users simulating real clinical workflows.

**Test Scenarios:**
- Patient Dashboard Workflow (doctor/nurse/receptionist)
- Prescription Management (doctor only)
- Lab Orders & Results (doctor/technician)
- Billing Operations (billing role)
- Audit Trail Queries (compliance)
- Appointment Scheduling (all roles)

**Configuration:**
- Warm-up: 10 users × 30s
- Ramp-up: 50 users × 1m
- Full load: 100 users × 2m
- Sustain: 100 users × 2m
- Ramp-down: 0 users × 30s

**Thresholds:**
- HTTP response time: p95 < 500ms, p99 < 1000ms
- Error rate: < 1%
- Patient list duration: p95 < 200ms
- Login success: > 95%
- Prescription order success: > 95%

**Quick Run:**
```bash
# Install k6 (if not already installed)
# macOS: brew install k6
# Ubuntu: sudo apt-get install k6
# Windows: choco install k6

# Run full load test
k6 run tests/performance/load-test.js

# With custom API URL
k6 run --env BASE_URL=https://staging.caresync.local tests/performance/load-test.js

# Generate JSON report
k6 run --out json=load-test-results.json tests/performance/load-test.js
```

**Interpreting Results:**
- ✅ All metrics pass thresholds → Ready for production
- ⚠️ P95 latency > 500ms → Need database optimization or caching
- ❌ Error rate > 1% → Debug deployment issues or connection pool exhaustion

---

### 3. **frontend-performance.test.ts** (50 tests)
Frontend bundle optimization, code splitting, React rendering, and Web Vitals.

**Test Categories:**
- Bundle Size Optimization (5 tests)
- Code Splitting Validation (5 tests)
- React Rendering Optimization (5 tests)
- Web Vitals Benchmarks (5 tests)
- Asset & Image Optimization (5 tests)
- Dependency Analysis (5 tests)
- Build Configuration Validation (5 tests)

**Key Targets:**
- Main bundle: <300KB gzipped
- LCP: <2.5s
- FID: <100ms
- CLS: <0.1
- No duplicate dependencies

**Quick Run:**
```bash
# Build production bundle first
npm run build

# Run tests
npm run test:performance -- tests/performance/frontend-performance.test.ts
```

**Recommendations:**
- If bundle > 300KB: Run `npm run analyze` to identify large libraries
- If LCP > 2.5s: Optimize critical path resources, lazy-load heavy components
- If CLS > 0.1: Add fixed dimensions to images, reserve space for ads/modals

---

### 4. **infrastructure-performance.test.ts** (50 tests)
Kubernetes, database scaling, Redis caching, CDN, monitoring, and disaster recovery.

**Test Categories:**
- Kubernetes Deployment (5 tests)
- Database Scaling & Connection Pool (5 tests)
- Redis Caching Layer (5 tests)
- CDN & Cache Headers (5 tests)
- Monitoring & SLO Configuration (5 tests)
- Load Balancing (5 tests)
- Disaster Recovery (5 tests)

**Key Validations:**
- HPA: 2 minimum pods, 10 maximum pods
- Connection pool: 50 connections (10 pods × 5 connections)
- Cache TTLs: Drug master 24h, facility config 6h, sessions Redis
- Redis: Accessible from all backend pods
- Monitoring: Prometheus, Grafana, alerts for SLO violations

**Quick Run:**
```bash
npm run test:performance -- tests/performance/infrastructure-performance.test.ts
```

---

## 🚀 Running All Performance Tests

### Sequential Execution (Full Suite)
```bash
npm run test:performance
```

### Parallel Execution (Faster)
```bash
npm run test:performance -- --run --threads
```

### With Coverage Report
```bash
npm run test:performance -- --coverage
```

---

## 📊 Phase 4 Performance SLOs

### Backend Performance
| Metric | Target | Status |
|--------|--------|--------|
| Query P95 (simple) | <100ms | TBD |
| Query P95 (complex) | <500ms | TBD |
| Zero N+1 queries | Baseline | TBD |
| Connection pool reuse | >90% | TBD |

### Frontend Performance
| Metric | Target | Status |
|--------|--------|--------|
| Bundle size | <300KB gzipped | TBD |
| LCP | <2.5s | TBD |
| FID | <100ms | TBD |
| CLS | <0.1 | TBD |
| Code splitting | 7+ chunks | TBD |

### Infrastructure Performance
| Metric | Target | Status |
|--------|--------|--------|
| Auto-scaling | 2-10 pods | TBD |
| Load handle | 10x baseline | TBD |
| Error rate | <1% | TBD |
| P99 latency | <1000ms | TBD |

---

## 🔍 Performance Investigation Guide

### High Database Latency
1. Enable slow query logging: `SET log_min_duration_statement = 100;`
2. Run queries in `tests/performance/backend-performance.test.ts` individually
3. Check EXPLAIN ANALYZE for missing indexes
4. Verify connection pool isn't exhausted: `SELECT count(*) FROM pg_stat_activity;`

### High Frontend Bundle Size
1. Run `npm run build` with analysis:
   ```bash
   npm run build -- --analyze
   ```
2. Check for duplicate libraries in `node_modules`
3. Verify CSS is properly tree-shaken
4. Consider lazy-loading heavy features (charts, reporting)

### High CPU or Memory Usage
1. Check pod resource limits in `docker/kubernetes/deployments/*.yaml`
2. Monitor with: `kubectl top pods`
3. Profile with OpenTelemetry APM
4. Check for memory leaks in React components

### Scaling Issues
1. Verify HPA metrics: `kubectl get hpa`
2. Check pod readiness probes responding in <5s
3. Monitor database connections under load (should stay <pool limit)
4. Test with `npm run test:load` at 10x, 20x user load

---

## 📅 Phase 4 Timeline

### Week 14: Backend Optimization (May 13-17)
- Execute backend performance tests
- Fix N+1 queries and add missing indexes
- Set up Redis caching layer
- Baseline load test (100 users)

### Week 15: Frontend Optimization (May 20-24)
- Execute frontend performance tests
- Code split and lazy-load routes
- Optimize bundle with tree-shaking
- Profile React rendering

### Week 15-17: Infrastructure Scaling (May 20 - June 1)
- Validate Kubernetes HPA
- Test database read replicas
- Set up CDN caching headers
- Deploy SLO monitoring

### Week 19: Load Testing & Validation (June 3-9)
- Execute 10x load test (100 → 1000 concurrent users)
- Verify auto-scaling works
- Test failure scenarios (pod crashes, network issues)
- Document achieved SLOs

---

## 🛠️ Troubleshooting

### Tests Fail to Connect to Backend
```bash
# Make sure backend is running
npm run dev

# Check API endpoint
echo $API_URL
# Should output: http://localhost:54321/rest/v1 (local)
```

### k6 Load Test Errors
```bash
# Common error: "insufficient memory"
# Solution: Reduce VU count or duration

# View real-time metrics
k6 run --summary-export=summary.json tests/performance/load-test.js
```

### Bundle Size Tests Fail
```bash
# Make sure production build is fresh
rm -rf dist
npm run build

# Check bundle size
ls -lh dist/assets/*.js | head
```

---

## 📚 Resources

- **Vitest Docs**: https://vitest.dev
- **k6 Docs**: https://k6.io/docs
- **Kubernetes HPA**: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- **Web Vitals**: https://web.dev/vitals/
- **OpenTelemetry**: https://opentelemetry.io

---

## 📝 Notes

- All tests are scaffolded to pass with reasonable defaults
- Update thresholds in test files as you optimize
- Phase 4 validation starts **May 13, 2026**
- Success criteria: 98.1% tests passing, SLOs met, zero critical issues
