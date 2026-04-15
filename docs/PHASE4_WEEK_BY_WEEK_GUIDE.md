# Phase 4 Week-by-Week Execution Guide (May 13 - Jun 3)

**Status Date**: April 10, 2026  
**Phase Duration**: 4 weeks (Weeks 13-16)  
**Goal**: Achieve <500ms p95 response times across backend, frontend, and infrastructure  
**Success Metrics**: 200+ performance tests passing, 10x load test validated, SLA confirmed

---

## Phase 4 Overview: Performance Optimization Sprint

**Objective**: Parallel optimization across 3 workstreams:
- **Backend**: Query optimization, connection pooling, database indexing (Week 13)
- **Frontend**: Bundle size reduction, Web Vitals optimization (Weeks 14-15)
- **Infrastructure**: Caching strategies, load balancing, Kubernetes scaling (Weeks 14-15)
- **Integration**: 10x load testing, end-to-end performance validation (Week 16)

**Executing Team**:
- **Backend Workstream Lead**: Senior Database Engineer
- **Frontend Workstream Lead**: Performance Engineer
- **Infrastructure Workstream Lead**: DevOps Lead
- **QA Lead**: Phase 4 Overall Coordinator

---

## Week 13 (May 13-17): Backend Query Optimization & Database Performance

**Primary Goal**: Reduce query latency by 60%, achieve <100ms p95 for common queries  
**Owner**: Senior Database Engineer + Backend Team (3 engineers)  
**Success Criteria**: Backend performance tests green (50 tests), p95 latency <100ms

### Backend Workstream Daily Flow

**Monday May 13 (Kickoff)**
- [ ] 9:30 AM: Phase 4 kickoff meeting (all teams)
- [ ] 10:00 AM: Backend team strategy session (1 hour)
  - Review current query baselines (`src/hooks/` query logs)
  - Assign 15 top slow queries to optimize
  - Establish local performance testing environment
- [ ] 11:00 AM: Clone performance test suite → run baseline
  - `npm run test:performance:backend -- --baseline`
  - Document current p50/p95/p99 latencies
- [ ] Deliverable: Baseline Report including:
  - Top 15 slow queries (ranked by impact)
  - Current p50/p95/p99 latencies per query
  - Optimization roadmap (indexed fields, materialized views, connection pooling)

**Tuesday-Thursday (May 14-16): Parallel Optimization Sprints**

**Task 1: Query Optimization (3 engineers, parallel)**

*Engineer A: Appointment & Scheduling Queries (5 queries)*
- [ ] Identify N+1 patterns in appointment list queries
- [ ] Add missing indexes: `(hospital_id, status, date)`
- [ ] Implement query result caching (1-hour TTL)
- [ ] Test: Appointment list query p95: 50ms → 15ms (expected 70% improvement)
- **Test**: `npm run test:performance:backend -- --test "appointment-list"`
- **Acceptance**: p95 latency <20ms confirmed

*Engineer B: Patient Search & EMR Access (5 queries)*
- [ ] Optimize full-text search on patient records
- [ ] Add composite index: `(hospital_id, patient_status, search_vector)`
- [ ] Implement pagination for large result sets
- [ ] Cache patient frequency lists (top 100 patients per hospital)
- **Test**: `npm run test:performance:backend -- --test "patient-search"`
- **Acceptance**: p95 latency <50ms confirmed

*Engineer C: Prescription & Lab Result Queries (5 queries)*
- [ ] Denormalize prescription status into separate materialized view
- [ ] Add view refresh trigger (15-minute interval)
- [ ] Optimize lab result aggregation queries
- [ ] Batch insert optimization for bulk lab uploads
- **Test**: `npm run test:performance:backend -- --test "lab-results"`
- **Acceptance**: Bulk insert 1000 records in <5sec

**Task 2: Connection Pooling & Query Execution**
- [ ] Review Supabase connection pool settings (currently 10 connections)
- [ ] Analyze connection utilization under load
- [ ] Adjust pool size if needed (target: 80% utilization at peak)
- [ ] Implement prepared statement caching
- [ ] Test connection pool stability (50+ concurrent requests)
- **Acceptance**: 0 connection pool exhaustion errors under 100 concurrent users

**Task 3: Database Configuration Tuning**
- [ ] Review PostgreSQL configuration (shared_buffers, effective_cache_size)
- [ ] Analyze query execution plans (EXPLAIN ANALYZE)
- [ ] Enable query statistics collection (if not already enabled)
- [ ] Document optimization decisions in DR wiki
- **Acceptance**: All top 15 queries have optimal execution plans (no sequential scans on large tables)

**Friday May 17 Gate Review (Backend Checkpoint)**

**Gate Criteria**:
| Criterion | Target | Current (Baseline) | Status |
|-----------|--------|-------------------|--------|
| Backend Tests Passing | 50/50 | ? | [ ] |
| Query p95 Latency | <100ms | ? (baseline) | [ ] |
| Connection Pool Stability | 0 errors | ? | [ ] |
| Index Coverage | Top 15 queries indexed | ? | [ ] |

**If CONDITIONAL/BLOCKED**:
- [ ] Identify which optimizations underperformed
- [ ] Allocate Week 14 Friday for remediation
- [ ] Adjust frontend/infrastructure timelines if backend blocks them

---

## Week 14-15 (May 20-27): Frontend & Infrastructure Parallel Optimization

**Primary Goal**: Reduce frontend bundle size by 40%, enable 100 concurrent users with <500ms p95  
**Executing Teams**:
- **Frontend Team** (2 engineers): Bundle optimization, Web Vitals
- **Infrastructure Team** (2 engineers): Caching, load balancing, Kubernetes scaling

### Frontend Workstream (Week 14-15, Parallel)

**Owner**: Performance Engineer  
**Success Criteria**: Frontend tests green (50 tests), bundle size <500KB gzipped, LCP <2.5s

#### Week 14: Bundle & Asset Optimization

**Monday May 20 - Wednesday May 22**

**Task F1: Code Splitting & Lazy Loading**
- [ ] Audit current route structure in `src/App.tsx`
- [ ] Implement lazy loading for patient, pharmacy, lab, billing modules
- [ ] Add loading boundaries (Suspense fallback UI)
- [ ] Measure bundle impact per route: -10KB target per route
- **Test**: `npm run test:performance:frontend -- --test "code-split-impact"`
- **Acceptance**: Initial bundle <500KB gzipped (currently ~650KB)

**Task F2: Dependency Optimization**
- [ ] Audit package.json for unused dependencies
- [ ] Identify heavy dependencies (React components, date libraries)
- [ ] Consider tree-shaking friendly alternatives (e.g., date-fns vs moment)
- [ ] Replace/remove 5+ heavy dependencies
- **Impact**: -50KB gzipped expected
- **Acceptance**: Bundle <550KB after dependency swaps

**Task F3: Asset Compression**
- [ ] Enable Brotli compression (frontend build)
- [ ] Optimize images (compress PNG/JPG by 20% without quality loss)
- [ ] Minify and tree-shake CSS/JS
- **Impact**: -30KB gzipped expected
- **Acceptance**: Total bundle <500KB gzipped target

#### Week 15: Web Vitals & Performance Metrics

**Thursday May 23 - Friday May 24**

**Task F4: Core Web Vitals Optimization**
- [ ] Measure current LCP (Largest Contentful Paint)
- [ ] Identify slow-loading images or components
- [ ] Implement progressive image loading
- [ ] Defer non-critical JavaScript
- **Target**: LCP <2.5s (currently ~4s estimated)
- **Test**: `npm run test:performance:frontend -- --test "core-web-vitals"`
- [ ] Measure FID (First Input Delay): target <100ms
- [ ] Measure CLS (Cumulative Layout Shift): target <0.1

**Task F5: React Component Performance**
- [ ] Profile React render overhead (React DevTools Profiler)
- [ ] Identify unnecessary re-renders
- [ ] Implement `useMemo()` / `useCallback()` for expensive renders
- [ ] Optimize list rendering (virtualization if >100 items)
- **Impact**: 30-50% render time improvement
- **Acceptance**: Patient list rendering <500ms for 1000 rows

**Friday May 24 Frontend Gate Checkpoint**

**Gate Criteria**:
| Criterion | Target | Status |
|-----------|--------|--------|
| Frontend Tests Passing | 50/50 | [ ] |
| Bundle Size (gzipped) | <500KB | [ ] |
| LCP | <2.5s | [ ] |
| FID | <100ms | [ ] |
| CLS | <0.1 | [ ] |

---

### Infrastructure Workstream (Week 14-15, Parallel)

**Owner**: DevOps Lead  
**Success Criteria**: Infrastructure tests green (50 tests), 100 concurrent users supported, <10% error rate

#### Week 14-15: Caching & Load Balancing

**Monday May 20 - Wednesday May 22: Caching Strategy**

**Task I1: Redis Caching Implementation**
- [ ] Identify 20 high-frequency queries for caching
  - Patient lists (hospital-scoped)
  - Appointment availability (per day, per doctor)
  - Drug/Lab test master data
  - Insurance tariff tables
- [ ] Implement Redis caching layer (TTL-based invalidation)
  - Patient list cache: 5-minute TTL
  - Appointment slots: 15-minute TTL (refresh after booking)
  - Master data: 1-hour TTL
- [ ] Add cache invalidation on writes (on_update trigger)
- **Test**: `npm run test:performance:infrastructure -- --test "cache-hit-rate"`
- **Acceptance**: >70% cache hit rate for hot queries, <50ms latency on cache hits

**Task I2: CDN Configuration**
- [ ] Enable Cloudflare CDN for static assets
- [ ] Configure edge caching rules
  - Images: 30-day cache
  - JS/CSS: 7-day cache (with versioning)
  - HTML: 1-hour cache (check on each request)
- [ ] Set up cache purge on deployment (automatic)
- **Impact**: Reduce asset load latency by 70%

#### Thursday May 23 - Friday May 24: Load Balancing & Scaling

**Task I3: Kubernetes Horizontal Pod Autoscaling**
- [ ] Review current HPA configuration (currently 2-10 replicas)
- [ ] Set CPU threshold to 70% utilization
- [ ] Set memory threshold to 80% utilization
- [ ] Test autoscaling under load: 10 → 20 replicas (at 100 concurrent users)
- **Acceptance**: Autoscale triggers within 30sec, new pods ready within 60sec

**Task I4: Load Balancer Configuration**
- [ ] Review Kong/Nginx health checks (currently /health endpoint)
- [ ] Add readiness checks (/ready endpoint checks DB connectivity)
- [ ] Implement connection draining (30sec timeout on pod termination)
- [ ] Test load balancer failover: kill pod → traffic reroutes <1sec
- **Acceptance**: 0 dropped connections during pod failure

**Friday May 24 Infrastructure Gate Checkpoint**

**Gate Criteria**:
| Criterion | Target | Status |
|-----------|--------|--------|
| Infrastructure Tests Passing | 50/50 | [ ] |
| Cache Hit Rate | >70% | [ ] |
| HPA Response Time | <30sec | [ ] |
| Load Balancer Failover | <1sec | [ ] |
| 100 Concurrent Users | p95 <500ms | [ ] |

---

## Week 16 (Jun 3): 10x Load Testing & Integration Validation

**Primary Goal**: Validate all optimizations under 10x production load (1000 concurrent users)  
**Owner**: QA Lead + All Workstream Leads  
**Success Criteria**: 10x load test passing, <500ms p95 response time, <1% error rate

### 10x Load Test Execution Plan

**Monday Jun 3 (Load Test Execution Day)**

**Pre-Test Setup (Sunday evening Jun 2)**
- [ ] Verify all Week 14-15 optimizations deployed to staging
- [ ] Reset database to clean state (remove test data)
- [ ] Verify monitoring/alerting is active (Prometheus, Grafana, logs)
- [ ] Dry run: 100 concurrent users for 5 minutes
- [ ] Verify no errors, all metrics capturing

**Monday Jun 3 - Morning: Light Load Test (100 users)**
- [ ] Execute: `npm run test:performance:load -- --users 100 --duration 10m`
- [ ] Monitor in real-time dashboards (Grafana)
- [ ] Verify p95 latency <500ms
- [ ] Document results
- [ ] **Acceptance**: p95 <500ms at 100 users

**Monday Jun 3 - Midday: Medium Load Test (500 users)**
- [ ] Execute: `npm run test:performance:load -- --users 500 --duration 10m`
- [ ] Monitor for resource exhaustion (CPU, memory, connections)
- [ ] Document p50/p95/p99 latencies
- [ ] **Acceptance**: p95 <500ms at 500 users, <2% error rate

**Monday Jun 3 - Afternoon: 10x Load Test (1000 users)**
- [ ] Execute: `npm run test:performance:load -- --users 1000 --duration 15m`
- [ ] Real-time monitoring: watch for performance degradation
- [ ] Document critical observations:
  - Response time curve (does it stay flat or degrade?)
  - Error rate progression
  - Resource utilization (CPU, memory, DB connections)
  - Auto-scaling behavior (replicas spun up)
- [ ] **Acceptance Criteria**:
  - p95 latency <500ms (or document justified exception)
  - Error rate <1%
  - 0 503 errors from load balancer
  - 0 database connection exhaustion

**Monday Jun 3 - Evening: Results Analysis & Documentation**
- [ ] Generate load test report:
  - Latency distribution chart (p50/p75/p95/p99)
  - Throughput(requests/sec over time)
  - Error rate breakdown
  - Resource utilization graphs
  - Auto-scaling behavior log
- [ ] Compare to Phase 3 baseline (if available)
- [ ] Identify any remaining bottlenecks
- [ ] Document lessons learned

### Final Gate Review (Week 16 Completion)

**Criteria for Phase 4 Completion**:

| Criterion | Target | Status |
|-----------|--------|--------|
| Backend Tests | 50/50 passing | [ ] |
| Frontend Tests | 50/50 passing | [ ] |
| Infrastructure Tests | 50/50 passing | [ ] |
| 10x Load Test | <500ms p95 @ 1000 users | [ ] |
| Load Test Error Rate | <1% | [ ] |
| Auto-Scaling | Triggered, pods ready | [ ] |
| Monitoring/Alerts | All configured | [ ] |
| Security | No new vulns introduced | [ ] |

**GO/NO-GO Decision**:

**GO** (Phase 5 Begins):
- All 200+ tests passing
- p95 <500ms at 1000 concurrent users
- <1% error rate
- Auto-scaling functional
- Security review: 0 high/critical issues

**NO-GO** (Extend Phase 4 or Pause):
- If p95 >500ms at 1000 users → investigate bottleneck → remediate
- If 5%+ error rate → identify issue source → fix
- Typically can remediate in 3-7 days (adjust Phase 5 timeline)

---

## Performance Baselines & Targets

### Backend Query Performance

| Query Type | Current (Baseline) | Target | Workstream |
|------------|-------------------|--------|-----------|
| Patient List (1000 patients) | 200ms | <50ms | Backend |
| Appointment Availability | 150ms | <30ms | Backend |
| Prescription Search | 300ms | <80ms | Backend |
| Lab Results Aggregation | 250ms | <60ms | Backend |
| **Overall DB p95** | **~250ms** | **<100ms** | Backend |

### Frontend Performance

| Metric | Current (Baseline) | Target | Workstream |
|--------|-------------------|--------|-----------|
| Bundle Size (gzipped) | ~650KB | <500KB | Frontend |
| LCP (Largest Contentful Paint) | ~4.0s | <2.5s | Frontend |
| FID (First Input Delay) | ~150ms | <100ms | Frontend |
| CLS (Cumulative Layout Shift) | ~0.2 | <0.1 | Frontend |
| **Initial Load** | **~5sec** | **<3sec** | Frontend |

### Infrastructure Performance

| Metric | Current (Baseline) | Target | Workstream |
|--------|-------------------|--------|-----------|
| Cache Hit Rate | ~40% | >70% | Infrastructure |
| CDN Response Time | ~500ms | <100ms | Infrastructure |
| Load Balancer Failover | ~5sec | <1sec | Infrastructure |
| HPA Response Time | ~90sec | <30sec | Infrastructure |
| **Concurrent Users Supported** | **50-75** | **1000+** | Infrastructure |

### Combined End-to-End

| Metric | Current (Baseline) | Target | Test |
|--------|-------------------|--------|------|
| p50 latency (50 users) | ~200ms | <150ms | Load test |
| p95 latency (100 users) | ~800ms | <300ms | Load test |
| **p95 latency (1000 users)** | **Not tested** | **<500ms** | 10x load test |
| Error rate @ peak | ~3% | <1% | Load test |
| Throughput @ peak | ~50 req/sec | >200 req/sec | Load test |

---

## Resource Allocation

| Role | Week 13 | Week 14 | Week 15 | Week 16 | Total Hours |
|------|--------|--------|--------|---------|------------|
| Backend Lead | 40 | 10 | 10 | 8 | 68 |
| Frontend Engineer (2) | 0 | 40 | 40 | 8 | 88 |
| DevOps Lead | 0 | 40 | 40 | 8 | 88 |
| QA Lead | 20 | 20 | 20 | 30 | 90 |
| **Total** | **60** | **110** | **110** | **54** | **334** |

---

## Success Criteria: Phase 4 Complete

✅ All 200+ performance tests passing  
✅ Backend queries optimized (p95 <100ms)  
✅ Frontend bundle <500KB gzipped  
✅ Infrastructure scales to 1000+ concurrent users  
✅ 10x load test validates <500ms p95  
✅ Error rate <1% under peak load  
✅ Auto-scaling functional and documented  
✅ Monitoring/alerting operational  
✅ 0 high/critical security vulnerabilities introduced  
✅ Phase 5 execution unblocked (Jun 10)

