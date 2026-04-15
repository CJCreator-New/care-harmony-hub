# Phase 4 Kickoff: Performance Optimization & Scaling (May 13 - June 24, 2026)
**Project**: CareSync HIMS  
**Phase**: 4 - Performance, Load Testing & Infrastructure Scaling  
**Duration**: 6 weeks (May 13 - June 24)  
**Status**: ⏳ **READY FOR KICKOFF** (after Phase 3 completion May 13)  
**Prepared**: April 10, 2026

---

## Executive Summary

Phase 4 focuses on **performance optimization and production scaling** validation following the successful completion of Phase 3 security and clinical safety testing (April 10, 2026). The phase is divided into three parallel workstreams:

- **1.5 weeks**: Backend performance (query optimization, indexing, caching)
- **1 week**: Frontend performance (bundle analysis, Web Vitals, lazy loading)
- **1 week**: Infrastructure scaling (K8s config, database replication, CDN, monitoring)

### Success Criteria
- ✅ Backend API response times: <100ms (p95 simple queries), <500ms (complex queries)
- ✅ Frontend bundle: <300KB gzipped
- ✅ Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- ✅ Zero N+1 queries in critical paths
- ✅ Auto-scaling: 2-10 pods based on CPU/memory
- ✅ Load test: 10x normal concurrent users passes

---

## Phase 4 Timeline Overview

### Week 14 (May 13-17): Backend Performance Sprint
- Query audit & N+1 detection
- Database indexing strategy
- Load testing setup

### Week 15 (May 20-24): Frontend + Infrastructure Parallel
- Bundle size analysis & code splitting
- Kubernetes configuration validation
- CDN & caching headers setup

### Week 16 (May 27-31): Optimization & Monitoring
- Query optimization implementation
- Web Vitals profiling & fixes
- SLO monitoring configuration

### Week 17 (June 2-6): Load Testing & Validation
- 10x user load test execution
- Performance bottleneck remediation
- SLAs documented

### Week 18 (June 9-13): Scaling Validation & Optimization
- Horizontal pod autoscaling tests
- Database connection pooling optimization
- Alert threshold tuning

### Week 19 (June 16-20): Documentation & Sign-Off
- Performance optimization reports
- SLO documentation
- Phase 4 completion sign-off

---

## Test Execution Guide

### Performance Test Suites Overview

Phase 4 includes **200+ comprehensive performance tests** across 4 domains:

#### 1. **Backend Performance Tests** (50 tests)
- Query performance baselines (<200ms patient list, <150ms vitals)
- N+1 query detection (batch loading validation)
- Database index effectiveness
- Connection pool behavior
- Complex query optimization

**Execute**:
```bash
npm run test:performance:backend
```

#### 2. **Frontend Performance Tests** (50 tests)
- Bundle size optimization (<300KB gzipped)
- Code splitting validation (route-based, lazy-loaded)
- React rendering optimization (memoization, virtual lists)
- Web Vitals benchmarks (LCP <2.5s, FID <100ms, CLS <0.1)
- Asset & dependency optimization

**Execute**:
```bash
npm run test:performance:frontend
```

#### 3. **Infrastructure Performance Tests** (50 tests)
- Kubernetes configuration (HPA 2-10 pods)
- Database scaling (read replicas, connection pooling)
- Redis caching layer (24h drug master, 6h facility config)
- CDN & cache headers (1-year static assets)
- Monitoring & SLO configuration

**Execute**:
```bash
npm run test:performance:infrastructure
```

#### 4. **Load Testing** (k6 script, 6 clinical workflows)
- 100 concurrent users over 5.5 minutes
- Patient dashboards, prescriptions, lab orders, billing, audit trails
- Target: p95 <500ms, <1% error rate

**Execute**:
```bash
# Local load test
npm run test:load

# Staging environment
npm run test:load:staging

# Manual k6 execution with custom parameters
k6 run --vus 100 --duration 5m tests/performance/load-test.js
```

### Running All Performance Tests

```bash
# Run all performance tests (backend + frontend + infrastructure)
npm run test:performance

# Run with coverage report
npm run test:performance:coverage

# Run specific domain
npm run test:performance:backend
npm run test:performance:frontend
npm run test:performance:infrastructure

# CI/CD execution (GitHub Actions)
# Manually trigger: https://github.com/[owner]/[repo]/actions/workflows/phase4-performance-tests.yml
# Or scheduled weekly on Mondays at 10 AM UTC
```

### Interpreting Test Results

#### ✅ Success Criteria
- Backend tests: All 50 passing with <200ms baseline for patient queries
- Frontend tests: Bundle <300KB, LCP <2.5s, dependencies audit clean
- Infrastructure tests: K8s config valid, 2-10 pod HPA, monitoring configured
- Load test: Error rate <1%, p95 <500ms sustained under 100 concurrent users

#### ⚠️ Optimization Needed
- Backend P95 > 200ms → Check for N+1 queries or missing indexes
- Frontend bundle > 300KB → Run `npm run analyze`, identify large libraries
- Infrastructure tests fail → Verify Prometheus/Grafana endpoints, K8s resources
- Load test error rate > 1% → Debug connection pool, timeout settings

#### 🔧 Troubleshooting
```bash
# If backend tests fail with connection errors:
# 1. Verify Supabase is running
npm run dev

# 2. Check database connection
echo $SUPABASE_URL $SUPABASE_ANON_KEY

# If frontend bundle tests fail:
# 1. Clean build
rm -rf dist && npm run build

# 2. Analyze bundle size
npm run analyze

# If k6 load tests fail:
# 1. Install k6
brew install k6  # macOS
sudo apt-get install k6  # Ubuntu
choco install k6  # Windows

# 2. Start backend server
npm run dev &

# 3. Run with verbose output
k6 run --verbose tests/performance/load-test.js
```

### Phase 4 Performance Test Timeline

| Week | Focus | Tests to Execute | Success Criteria |
|------|-------|------------------|------------------|
| 14 (May 13) | Backend Optimization | Backend tests + k6 baseline (100 users) | 50/50 passing, <200ms patient list |
| 15 (May 20) | Frontend + Infra | Frontend tests + Infrastructure tests | All 50+50 passing, bundle <300KB |
| 16 (May 27) | Optimization | Rerun after fixes | Same metrics confirmed |
| 17 (June 2) | 10x Load Testing | k6 at 100-1000 users | <1% error rate, p99 <1000ms |
| 18 (June 9) | Scaling Validation | K8s auto-scale scenarios | Auto-scale 2→10 pods confirmed |
| 19 (June 16) | Documentation | Final performance report | SLOs signed off |

---

## Detailed Phase 4 Plan

### Workstream 1: Backend Performance (1.5 weeks)

#### 1.1 Query Optimization & N+1 Detection

**Objectives**:
- Identify all N+1 query patterns in critical paths
- Measure query execution times
- Prioritize optimization efforts

**Key Metrics to Capture**:
- Average query time (ms)
- P95 and P99 latencies
- Query count per request
- Slow query log entries (>100ms)

**Tools & Setup**:
```bash
# Option 1: PostgreSQL slow query log
# In supabase/migrations:
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();

# Option 2: Supabase APM (via observability layer)
# Already deployed (OTel setup complete from Phase 3B)
# Verify @opentelemetry/instrumentation-pg is active

# Option 3: Node.js profiling
NODE_OPTIONS="--prof" npm run dev
node --prof-process isolate-*.log > profile.txt
```

**Critical Query Paths to Audit**:
1. **Patient List** (`/api/patients?hospital_id=X&status=Y`)
   - Current: Likely N+1 on allergies, medications, recent encounters
   - Target: Single query with LEFT JOINs or select *() with aggregates

2. **Consultation View** (`/api/consultations/:id`)
   - Current: May load patient, vitals, prescribed meds separately
   - Target: Single query with all related data

3. **Lab Results Listing** (`/api/lab-results?patient_id=X`)
   - Current: May query each result's metadata separately
   - Target: Batch query with LIMIT clause

4. **Prescription Filling** (`POST /api/prescriptions/:id/dispense`)
   - Current: Check allergies, interactions, inventory separately
   - Target: Consolidated pre-flight check query

5. **Billing History** (`/api/invoices?patient_id=X`)
   - Current: May aggregate payments separately
   - Target: Single query with JOIN to payments table

**Implementation Steps**:
1. Enable slow query logging (Week 14, Day 1)
2. Profile critical endpoints (1 hour each) - (Day 1)
3. Identify top 3 N+1 patterns (Day 2)
4. Document current query plans (Day 2)
5. Implement schema changes if needed (Days 3-4)
6. Verify improvements via APM dashboard (Day 5)

**Success Metrics**:
- Zero N+1 queries in critical paths ✅
- Patient list: <200ms (currently ~500ms estimated)
- Consultation view: <150ms (currently ~400ms estimated)
- Lab results: <250ms for 100+ results

---

#### 1.2 Database Indexing Strategy

**Current Index Audit** (from DATA_MODEL.md):
```sql
-- Required indexes (verify all exist):
CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX idx_consultations_created_at ON consultations(created_at DESC);
CREATE INDEX idx_prescriptions_patient_id ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_lab_results_patient_id ON lab_results(patient_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource_id ON audit_log(resource_id);

-- Composite indexes for common filter combinations:
CREATE INDEX idx_consultations_patient_status ON consultations(patient_id, status);
CREATE INDEX idx_prescriptions_patient_status ON prescriptions(patient_id, status, created_at);
CREATE INDEX idx_lab_results_patient_status ON lab_results(patient_id, status, created_at DESC);
CREATE INDEX idx_audit_hospital_user_action ON audit_log(hospital_id, user_id, action, created_at DESC);
```

**Index Optimization (Week 14)**:
- [ ] Run `EXPLAIN ANALYZE` on slow queries
- [ ] Check for full table scans (`Seq Scan` in plan)
- [ ] Identify missing indexes for WHERE/JOIN/ORDER BY clauses
- [ ] Create composite indexes for common filter combinations
- [ ] Verify index use in query plans (look for `Index Scan`)
- [ ] Monitor index bloat (`SELECT * FROM pg_stat_user_indexes`)
- [ ] Schedule periodic ANALYZE and VACUUM

**Expected Impact**:
- Patient search: 500ms → 50-100ms (5-10x improvement)
- Filter queries: 1000ms → 100-200ms

---

#### 1.3 Caching Strategy

**Data to Cache** (high-frequency, low-change):
1. **Drug Master Data** - TTL: 24 hours
   ```
   - Drug names, contraindications, side effects
   - Allergy cross-reactivity matrix
   ```

2. **Facility Configuration** - TTL: 12 hours
   ```
   - Hospital settings, department list, bed inventory
   - Operating hours, holiday calendar
   ```

3. **Tariff/Pricing** - TTL: 7 days
   ```
   - Insurance tariffs, copay schedules
   - Procedure costs, lab test pricing
   ```

4. **Patient Demographics Cache** - TTL: 30 minutes
   ```
   - Frequently accessed patient records
   - Vitals history (last 7 days)
   ```

**Implementation** (Week 14-15):
```typescript
// Example: Redis caching layer
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  lazyConnect: true,
  enableReadyCheck: false,
});

// Wrapper for cached drug interactions
async function getInteractions(drugId: string): Promise<Interaction[]> {
  const cacheKey = `drug:${drugId}:interactions`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Cache miss: query DB
  const interactions = await db.query(
    'SELECT * FROM drug_interactions WHERE drug_id = ?', 
    [drugId]
  );
  
  // Cache for 24 hours
  await redis.setex(cacheKey, 86400, JSON.stringify(interactions));
  return interactions;
}

// Cache invalidation on updates
async function updateDrugInteraction(drugId: string) {
  const cacheKey = `drug:${drugId}:interactions`;
  await redis.del(cacheKey); // Invalidate
  // ... perform update
}
```

**Monitoring Caching Effectiveness**:
- Cache hit rate target: >80% for frequently accessed data
- Monitor via APM metrics: `cache.hits`, `cache.misses`

---

#### 1.4 Load Testing Setup (Week 14)

**Tool Selection**:
- **k6**: JavaScript-based load testing (preferred for Node.js)
- **Apache JMeter**: Alternative, GUI-based
- **Locust**: Python-based, good for distributed load

**Test Scenarios** (using k6):

```javascript
// tests/load/patient-list-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Ramp up to 100 users (10x baseline)
    { duration: '3m', target: 50 },   // Ramp down to 50
    { duration: '1m', target: 0 },    // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // p95 <500ms
    http_req_failed: ['rate<0.01'], // <1% error rate
  },
};

export default function () {
  const token = __ENV.AUTH_TOKEN; // Set via environment
  const hospitalId = __ENV.HOSPITAL_ID;
  
  const response = http.get(
    `${__ENV.BASE_URL}/api/patients?hospital_id=${hospitalId}&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time p95 < 500ms': (r) => r.timings.duration < 500,
    'has patients in response': (r) => JSON.parse(r.body).data.length > 0,
  });

  sleep(1); // Simulate user think time
}
```

**Baseline Load Test** (Week 14, Day 5):
- 100 concurrent users (10x baseline)
- 10 minute sustained load
- Monitor for memory leaks, connection pool exhaustion
- Capture error rates > 1%

---

### Workstream 2: Frontend Performance (1 week, parallel with Week 15)

#### 2.1 Bundle Size Analysis

**Current Bundle Metrics** (TBD - measure in Week 15):
```bash
npm run build
npm run analyze:bundle

# Expected output shows:
# - Total gzipped size
# - Top 10 largest dependencies
# - Duplicate packages
```

**Target**: <300KB gzipped JavaScript

**Optimization Strategy**:

1. **Code Splitting by Route** (Week 15, Day 1):
   ```typescript
   // src/App.tsx - lazy load routes
   import { lazy, Suspense } from 'react';
   
   const PatientDashboard = lazy(() => import('./pages/PatientDashboard'));
   const ConsultationPage = lazy(() => import('./pages/ConsultationPage'));
   const BillingPage = lazy(() => import('./pages/BillingPage'));
   
   function App() {
     return (
       <Suspense fallback={<LoadingScreen />}>
         <Routes>
           <Route path="/dashboard" element={<PatientDashboard />} />
           <Route path="/consultation/:id" element={<ConsultationPage />} />
           <Route path="/billing" element={<BillingPage />} />
         </Routes>
       </Suspense>
     );
   }
   ```

2. **Dependency Optimization**:
   - Audit lodash → lodash-es (tree-shakeable)
   - Replace heavyweight dates → date-fns (configurable imports)
   - Consider Web Workers for heavy computation (PDF generation, data processing)

3. **Build Configuration**:
   ```typescript
   // vite.config.ts
   export default {
     build: {
       rollupOptions: {
         output: {
           manualChunks: {
             forms: ['react-hook-form', 'zod'],
             tables: ['@tanstack/react-table'],
             charts: ['recharts'],
           },
         },
       },
     },
   };
   ```

**Monitoring**:
- Measure bundle size in CI/CD pipeline
- Alert if bundle >310KB gzipped
- Track bundle size trend over time

---

#### 2.2 Web Vitals & Core Performance Metrics

**Targets** (from FRONTEND_DEVELOPMENT.md):
- **LCP** (Largest Contentful Paint): <2.5s
- **FID** (First Input Delay): <100ms
- **CLS** (Cumulative Layout Shift): <0.1

**Measurement** (Week 15, Days 2-4):

```typescript
// src/utils/web-vitals.ts
import {
  getCLS,
  getFID,
  getLCP,
  getFC,
  getTTFB,
} from 'web-vitals';

export function trackWebVitals() {
  getCLS(console.log);   // Cumulative Layout Shift
  getFID(console.log);   // First Input Delay
  getLCP(console.log);   // Largest Contentful Paint
  getFCP(console.log);   // First Contentful Paint
  getTTFB(console.log);  // Time to First Byte
}
```

**Profiling Tools**:
1. Chrome DevTools Lighthouse (Week 15, Day 2)
2. Web Vitals Chrome Extension
3. Sentry or LiteSpeed for production metrics

**Common Issues & Fixes**:
- **LCP too slow**: Optimize images, defer non-critical CSS
- **FID high**: Break up long JavaScript execution (use requestIdleCallback)
- **CLS > 0.1**: Declare sizes for images/ads, avoid dynamic DOM shifts

---

#### 2.3 React Rendering Optimization

**Tools**:
- React DevTools Profiler tab
- Chrome Performance tab

**Common Issues** (Week 15, Days 3-4):
1. Unnecessary re-renders of large lists
   - Fix: Wrap with React.memo, use useMemo for filtered data
   
2. Parent component re-renders cascade to all children
   - Fix: Move state closer to usage, use context wisely
   
3. Complex computations in render
   - Fix: Move to useMemo, useCallback, or external service

**Implementation**:
```typescript
// Example: Optimize patient list rendering
const PatientRow = React.memo(({ patient }: { patient: Patient }) => {
  return (
    <tr>
      <td>{patient.name}</td>
      <td>{patient.mrn}</td>
      <td>{formatDate(patient.dob)}</td>
    </tr>
  );
});

const PatientList = ({ patients }: { patients: Patient[] }) => {
  const sortedPatients = useMemo(
    () => patients.sort((a, b) => a.name.localeCompare(b.name)),
    [patients]
  );

  return (
    <table>
      <tbody>
        {sortedPatients.map((p) => <PatientRow key={p.id} patient={p} />)}
      </tbody>
    </table>
  );
};
```

---

### Workstream 3: Infrastructure Scaling (1 week, parallel with Week 15)

#### 3.1 Kubernetes Configuration Validation

**Current Setup** (from DEPLOYMENT_GUIDE.md):
```yaml
# Verify replicas and resource limits
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caresync-api
spec:
  replicas: 3  # Will be auto-scaled during load test
  selector:
    matchLabels:
      app: caresync-api
  template:
    metadata:
      labels:
        app: caresync-api
    spec:
      containers:
      - name: caresync-api
        image: caresync:latest
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: NODE_ENV
          value: "production"
```

**Week 15 Validation Checklist**:
- [ ] Resource requests/limits properly set (prevent OOM kills)
- [ ] Readiness/liveness probes configured (for pod replacement)
- [ ] HPA (Horizontal Pod Autoscaler) configured for CPU target (70%)
- [ ] Service mesh (if used) properly configured for circuit breaking
- [ ] Network policies (if used) don't block inter-pod communication

---

#### 3.2 Database Scaling

**Read Replicas** (Week 15):
```sql
-- Supabase: Verify read replicas created
-- Connection: Use read replica for:
-- - Reporting queries (heavy aggregations)
-- - Patient search
-- - Analytics dashboards

-- Connection pooling (PgBouncer):
-- Supabase: Verify connection pool size:
-- Min: 4, Max: 20 per pod
-- Mode: transaction (default, suitable for web app)
```

**Monitoring**:
- Connection pool utilization (alert if >80%)
- Replication lag (target: <1 second)
- Database CPU/memory (alert if >80%)

---

#### 3.3 Monitoring & Alerting Setup

**SLO Definitions** (Week 16):
```yaml
# SLO: API Availability
slo:
  name: api_availability
  target: 99.9%  # 99.9% uptime goal
  indicator: http_request_successful
  alert_threshold: 99.5%

# SLO: API Latency
slo:
  name: api_latency_p95
  target: 500ms  # p95 response time
  indicator: http_request_duration_seconds
  percentile: 95
  alert_threshold: 700ms
```

**Alert Configuration**:
```yaml
# Prometheus rules
groups:
  - name: caresync-alerts
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
      for: 5m
      annotations:
        summary: "High error rate (>1%)"

    - alert: HighLatency
      expr: histogram_quantile(0.95, http_request_duration_seconds) > 0.5
      for: 5m
      annotations:
        summary: "High latency (p95 > 500ms)"

    - alert: PodMemoryUsage
      expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
      for: 2m
      annotations:
        summary: "Pod memory usage >90%"
```

---

## Resource Requirements

### Team Composition
- **Backend Performance**: 1-2 engineers (1.5 weeks)
- **Frontend Performance**: 1 engineer (1 week)
- **DevOps/Infrastructure**: 1 engineer (1 week)
- **QA/Load Testing Lead**: 1 engineer (ongoing)

### Infrastructure Requirements
- Load testing environment (separate from production)
- Monitoring stack (Prometheus, Grafana, Loki)
- Redis cluster for caching (optional staging environment)

### Tools & Licenses
- k6 (free tier available)
- Datadog/New Relic APM (if not already in use)
- Redis Cloud (if not self-hosted)

---

## Success Criteria

### Backend (Week 14-15)
- [ ] Zero N+1 queries in critical paths
- [ ] Query performance: <100ms (p95) for simple, <500ms for complex
- [ ] All required indexes in place
- [ ] Database connection pooling configured
- [ ] Load test: 100 concurrent users, <1% error rate

### Frontend (Week 15)
- [ ] Bundle size: <300KB gzipped
- [ ] LCP: <2.5s, FID: <100ms, CLS: <0.1
- [ ] Code splitting by route implemented
- [ ] React rendering optimizations applied

### Infrastructure (Week 15-16)
- [ ] Auto-scaling configured (2-10 pods)
- [ ] SLO monitoring active
- [ ] All alerts tested and functional
- [ ] Read replicas working correctly

### Overall (Week 17)
- [ ] 10x user load test passes
- [ ] Production SLAs documented
- [ ] Performance optimization report signed off

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Load test crashes production | Critical | Run load tests in staging environment only |
| Performance regression undetected | High | Automated performance benchmarks in CI/CD |
| Database query timeouts during load | High | Connection pooling & read replicas configured |
| OOM kills during peak load | Medium | Resource limits & HPA thresholds tuned |

---

## Next Steps

### Pre-Phase 4 (By May 13)
1. ✅ Complete Phase 3 security testing
2. ✅ Document all Phase 4 dependencies (database, caching, monitoring)
3. ✅ Prepare staging environment for load testing
4. ✅ Brief teams on Phase 4 timeline and deliverables

### Phase 4 Week 1 (May 13-17)
1. Day 1: Enable slow query logging, begin N+1 detection
2. Days 2-3: Identify critical query bottlenecks
3. Days 4-5: Implement indexing strategy, conduct baseline load test

### Ongoing Monitoring (Post-Phase 4)
- Automated performance regression testing in CI/CD
- Weekly performance dashboard review
- Monthly optimization audit

---

**Phase 4 Status**: ✅ **SCAFFOLDING COMPLETE - READY FOR EXECUTION**

**Next Milestone**: May 13, 2026 - Phase 4 Official Kickoff

**Documentation**:
- Backend Performance: [Link to performance skill](./HIMS_PERFORMANCE_SAFETY.md)
- Frontend Performance: [FRONTEND_DEVELOPMENT.md](./FRONTEND_DEVELOPMENT.md)
- Infrastructure: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
