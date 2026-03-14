# Phase 3A Quick Reference Card v1.0

**CareSync HIMS Clinical Metrics Setup**  
**Prepared**: March 13, 2026  
**Status**: Ready for Implementation

---

## Health Check Endpoints at a Glance

| Endpoint | Purpose | Response | Code |
|----------|---------|----------|------|
| `GET /health` | **Liveness Probe** - Is process alive? | `{ status, uptime_seconds }` | Always 200 |
| `GET /ready` | **Readiness Probe** - Can accept traffic? | `{ checks: { db, rls, auth, cache } }` | 200 or 503 |
| `GET /metrics` | **Prometheus Metrics** - Observable data | `text/plain` Prometheus format | 200 |

---

## 4 Clinical SLOs Summary

| # | SLO | Target | Alert | Critical | Implementation Effort |
|---|-----|--------|-------|----------|--------------------------|
| 1 | **Patient Registration** → First Appointment | <30 min | >30 min | >90 min | 2 hours |
| 2 | **Prescription Created** → Dispensed | <15 min | >15 min | >45 min | 2 hours |
| 3 | **Lab Critical Value** → Alert Sent | <5 min | >5 min | >15 min | 2 hours |
| 4 | **Appointment Confirmed** → Reminder Sent | <10 min | >10 min | >30 min | 2 hours |

---

## Logging Template

```json
{
  "timestamp": "2026-03-13T10:30:45.123Z",
  "level": "info|warn|error|debug",
  "message": "prescription_created",
  "correlation_id": "uuid",
  "hospital_id": "hosp-1",
  "user_role": "DOCTOR",
  "duration_ms": 245,
  "entity_type": "prescription",
  "entity_id": "rx-123",
  "status": "success|failure",
  "metadata": {}
}
```

**Never Log**: Patient names, UHIDs, diagnoses, medication names

---

## Metrics Export (Sample)

```
app_up 1
http_requests_total{method="POST",endpoint="/prescriptions",status="201"} 342
cache_hit_ratio 0.82
active_users{role="DOCTOR"} 24
registration_to_appointment_latency_seconds_bucket{le="1800"} 490
prescription_amendment_count 1247
audit_records_created 58392
```

---

## Sentry Error Masking

### Before (PHI Exposed ❌)
```
Error: Patient AP123456 medication conflict
Stack: Drug MORPHINE + ASPIRIN interaction
```

### After (PHI Masked ✅)
```
Error: Patient [UHID] medication conflict
Stack: Drug [DRUG] + [DRUG] interaction
Context: hospital_id=hosp-1, user_role=DOCTOR
```

---

## Implementation Checklist

### Phase 3A Deliverables
- [ ] **Health Checks** (3 endpoints)
  - [ ] `/health` service + middleware
  - [ ] `/ready` service + RLS check
  - [ ] `/metrics` service + Prometheus export
  - [ ] `useHealthCheck()` React hook

- [ ] **Structured Logging** (5 logger classes)
  - [ ] `StructuredLogger` service
  - [ ] `LifecycleEventLogger`
  - [ ] `PerformanceEventLogger`
  - [ ] `SafetyEventLogger`
  - [ ] Hooks for React integration

- [ ] **Metrics Collection** (4 SLOs)
  - [ ] `MetricsCollector` service
  - [ ] Hook into patient registration flow
  - [ ] Hook into prescription flow
  - [ ] Hook into lab critical flow
  - [ ] Hook into appointment reminder flow

- [ ] **Error Tracking**
  - [ ] Sentry initialization
  - [ ] PHI masking function
  - [ ] Error boundary component
  - [ ] Error context in workflows

- [ ] **Testing**
  - [ ] SLO acceptance tests (Vitest)
  - [ ] Health check tests
  - [ ] Logger tests (JSON format, PHI check)
  - [ ] Sentry masking tests

---

## Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────┐
│  React App + TanStack Query                     │
│  ┌─────────────────────────────────────────────┐│
│  │ Components                                   ││
│  │ ├─ useHealthCheck()        (admin panel)    ││
│  │ ├─ useLifecycleLogger()    (all workflows)  ││
│  │ └─ usePerformanceLogger()  (queries)        ││
│  └─────────────────────────────────────────────┘│
└──────────────┬──────────────────────────────────┘
               │ (HTTP)
┌──────────────▼──────────────────────────────────┐
│  Express/Vite Backend                           │
│  ┌─────────────────────────────────────────────┐│
│  │ GET /health   - Liveness                    ││
│  │ GET /ready    - Readiness (RLS warm)        ││
│  │ GET /metrics  - Prometheus format           ││
│  │ POST /logs    - Structured logging (future) ││
│  └─────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────┐│
│  │ Metrics Service                              ││
│  │ ├─ recordHttpRequest()  (HTTP metrics)      ││
│  │ ├─ recordSLOLatency()   (4 SLOs)            ││
│  │ └─ export()             (Prometheus)        ││
│  └─────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────┐│
│  │ Logger Service                               ││
│  │ ├─ LifecycleEventLogger  (patient, Rx, lab)││
│  │ ├─ PerformanceEventLogger (slow queries)    ││
│  │ └─ SafetyEventLogger     (conflicts, RLS)   ││
│  └─────────────────────────────────────────────┘│
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  Monitoring & Analytics                        │
│  ├─ Prometheus (scrapes /metrics every 30s)   │
│  ├─ Grafana (visualizes dashboards)            │
│  ├─ Log Aggregator (JSON logs)                 │
│  └─ Sentry (error tracking + replay)           │
└──────────────────────────────────────────────────┘
```

---

## Key Files to Create

| File | Purpose | Lines | Language |
|------|---------|-------|----------|
| `src/services/health-check.ts` | 3 endpoint implementations | 200 | TypeScript |
| `src/services/metrics.ts` | MetricsCollector class | 350 | TypeScript |
| `src/utils/logger.ts` | StructuredLogger class | 250 | TypeScript |
| `src/utils/lifecycle-events.ts` | Event logging | 150 | TypeScript |
| `src/utils/sentry-sanitizer.ts` | PHI masking | 120 | TypeScript |
| `src/hooks/useHealthCheck.ts` | Admin dashboard hook | 80 | TypeScript |
| `tests/integration/slo-*.test.ts` | 4 acceptance tests | 400 | Vitest |

**Total**: ~1550 lines of implementation code

---

## 4-Week Implementation Timeline

```
Week 1: Health Checks (Days 1-2)
├─ Day 1: services/health-check.ts + middleware (4h)
├─ Day 2: useHealthCheck hook + admin panel (3h)
└─ Test: curl /health, /ready, /metrics

Week 2: Structured Logging (Days 3-4)
├─ Day 3: Logger service + lifecycle events (4h)
├─ Day 4: Performance & safety events + hooks (3h)
└─ Test: Check JSON logs in console

Week 3: Metrics & SLOs (Days 5-7)
├─ Day 5: MetricsCollector service (4h)
├─ Day 6: Hook into workflows + acceptance tests (4h)
├─ Day 7: Integration tests + P95 validation (3h)
└─ Test: curl /metrics | grep prescription_to_dispensing

Week 4: Error Tracking (Days 8-9)
├─ Day 8: Sentry setup + PHI masking (4h)
├─ Day 9: Error boundary + integrations (3h)
└─ Test: Trigger error, verify Sentry masks PHI

Total: 40-50 hours | 2 engineers
```

---

## Common Commands

### Local Testing
```bash
# Health checks
curl http://localhost:3000/health | jq
curl http://localhost:3000/ready | jq
curl http://localhost:3000/metrics

# Run SLO tests
npm run test:unit tests/integration/slo-*.test.ts

# Check logs (should be JSON)
npm run dev 2>&1 | grep correlation_id
```

### Production Monitoring
```bash
# View Prometheus metrics
curl https://api.caresync.com/metrics | head -50

# Check Sentry errors
# Open: https://sentry.io/organizations/caresync/

# Grafana dashboard
# Open: https://grafana.caresync.com/d/phase-3a-overview
```

---

## Integration Points

### Phase 2A (Audit Trail) ✅ Connected
- Audit records increment `audit_records_created` counter
- Prescription amendments increment `prescription_amendment_count`
- Logged with entity IDs for traceability

### Phase 2B (Feature Flags) 🚀 Ready
- When Phase 2B complete, add feature flag performance tracking
- Dashboards will show flag impact on SLOs
- Conditional logging based on flag state

---

## Success Criteria

✅ Health checks respond <100ms (liveness + readiness)  
✅ RLS policies verified as part of readiness check  
✅ All 4 SLOs measured and displayed in metrics  
✅ Logs contain no PHI (names, UHIDs, diagnoses)  
✅ Errors masked in Sentry (UHID, drugs, diagnoses)  
✅ <20ms overhead per request  
✅ Prometheus format compatible  
✅ All acceptance tests passing  

---

## Troubleshooting

| Problem | Check | Fix |
|---------|-------|-----|
| `/ready` returns 503 | Each health check status | Fix RLS policy / DB connection |
| No metrics showing | Is middleware hooked? | Add `app.use(recordHttpMetrics)` |
| Logs missing | Console output? | Check `NODE_ENV` setting |
| Sentry not receiving errors | DSN in `.env`? | Set `VITE_SENTRY_DSN` + test send |

---

## Documents Reference

| Document | Purpose | Read When |
|----------|---------|-----------|
| [PHASE_3A_IMPLEMENTATION_SPEC.md](PHASE_3A_IMPLEMENTATION_SPEC.md) | Complete specification | Planning phase |
| [PHASE_3A_HEALTH_CHECK_GUIDE.md](PHASE_3A_HEALTH_CHECK_GUIDE.md) | Health check details | Building endpoints |
| [PHASE_3A_SLO_DEFINITIONS.md](PHASE_3A_SLO_DEFINITIONS.md) | SLO acceptance tests | Writing tests |
| [PHASE_3A_OBSERVABILITY_SETUP.md](PHASE_3A_OBSERVABILITY_SETUP.md) | Code implementations | Coding services |
| [PHASE_3A_COMPREHENSIVE_INDEX.md](PHASE_3A_COMPREHENSIVE_INDEX.md) | Navigation + checklist | Task management |

---

## Key Metrics to Monitor

### Service Health
- `app_up` (1 = healthy, 0 = down)
- `/health` response time (<50ms target)
- `/ready` response time (<500ms target)

### Clinical SLOs
- `registration_to_appointment_latency_seconds` (P95 <30 min)
- `prescription_to_dispensing_latency_seconds` (P95 <15 min)
- `lab_critical_alert_latency_seconds` (P95 <5 min)
- `appointment_to_reminder_latency_seconds` (P95 <10 min)

### System Health
- `cache_hit_ratio` (target >80%)
- `active_users{role}` (by role breakdown)
- `http_requests_total` (request volume)

### Safety & Compliance
- `medication_conflict_detected_total` (should be 0 after block)
- `critical_lab_values_total` (track alerts)
- `audit_records_created` (compliance tracking)

---

## Contacts & Resources

**Observability Lead**: [Your Name]  
**QA Lead**: [QA Name]  
**DevOps Lead**: [DevOps Name]  

**Sentry Project**: https://sentry.io/organizations/caresync/  
**Prometheus**: http://localhost:9090 (local dev)  
**Grafana**: http://localhost:3001 (local dev)  

---

**Phase 3A Status**: ✅ Complete Specification  
**Ready to**: Start implementation  
**Estimated Effort**: 40-50 hours  
**Team Size**: 2 engineers  

---

*Document Version: 1.0*  
*Last Updated: March 13, 2026*  
*Classification: Internal Use - CareSync HIMS*
