# Phase 3A: Comprehensive Implementation Index

**Status**: Phase 3A Complete Specification  
**Date**: March 13, 2026  
**Version**: 1.0  

---

## Overview

Phase 3A: Clinical Metrics Setup establishes production-ready observability for healthcare workflows with:
- ✅ 3 Health Check endpoints (liveness, readiness, Prometheus metrics)
- ✅ 4 Clinical SLOs with thresholds and acceptance tests
- ✅ Structured JSON logging with correlation IDs
- ✅ PHI-safe error tracking (Sentry integration)
- ✅ Metrics collection for 6+ clinical metrics
- ✅ Complete documentation and runbooks

---

## Documents Created

### 1. PHASE_3A_IMPLEMENTATION_SPEC.md (Main Reference)
**Content**: Complete specification with:
- Health check endpoint designs (3 endpoints)
- Clinical SLO definitions (4 SLOs)
- Architecture diagrams
- Structured logging spec
- Error tracking setup
- Implementation roadmap

**Use When**: 
- Planning Phase 3A timeline
- Understanding overall architecture
- Defining acceptance criteria

---

### 2. PHASE_3A_HEALTH_CHECK_GUIDE.md (Operational Guide)
**Content**: Deep dive on health checks with:
- Detailed endpoint explanations
- RLS policy warm-up verification
- Kubernetes integration patterns
- React hook (`useHealthCheck`) implementation
- Troubleshooting procedures

**Use When**:
- Implementing health check endpoints
- Setting up Kubernetes probes
- Debugging startup issues
- Testing RLS policies

---

### 3. PHASE_3A_SLO_DEFINITIONS.md (Testing Guide)
**Content**: Complete SLO specification with:
- 4 SLOs (registration, prescription, lab alert, appointment reminder)
- Acceptance criteria (BDD scenarios)
- Acceptance test cases (Vitest)
- P95 calculation examples
- SQL measurement queries
- Prometheus alert rules

**Use When**:
- Writing SLO acceptance tests
- Validating SLO metrics
- Setting up alerting thresholds
- Running P95 calculations

---

### 4. PHASE_3A_OBSERVABILITY_SETUP.md (Implementation Guide)
**Content**: Code implementations for:
- `MetricsCollector` service (complete)
- `StructuredLogger` service (complete)
- Lifecycle event logging (patient, prescription, lab, appointment)
- Performance event logging (slow queries, cache misses)
- Safety event logging (conflicts, RLS violations)
- Sentry integration with PHI masking
- Error boundary component

**Use When**:
- Building metrics services
- Implementing structured logging
- Setting up error tracking
- Integrating with Sentry

---

## Implementation Checklist

### Week 1: Health Checks (2 days)

**Day 1** (4 hours):
- [ ] `src/services/health-check.ts`
  - [ ] `getHealth()` function
  - [ ] `getReady()` function
  - [ ] `checkDatabase()` helper
  - [ ] `checkRLSPolicies()` helper
  - [ ] `checkAuthContext()` helper
  - [ ] `checkCache()` helper

- [ ] `src/middleware/health-check.ts`
  - [ ] Health check router
  - [ ] Route registration

- [ ] `src/server.ts`
  - [ ] Register health check routes

**Day 2** (3 hours):
- [ ] `src/hooks/useHealthCheck.ts`
  - [ ] Hook with polling (30s interval)
  - [ ] Query key management

- [ ] Admin dashboard integration
  - [ ] Health status panel
  - [ ] Check status indicators
  - [ ] Real-time updates

**Testing**:
- [ ] Manual: `curl http://localhost:3000/health`
- [ ] Manual: `curl http://localhost:3000/ready`
- [ ] Unit tests for each check function
- [ ] Integration test: health checks respond <100ms

---

### Week 2: Structured Logging (2 days)

**Day 1** (4 hours):
- [ ] `src/utils/logger.ts`
  - [ ] `StructuredLogger` class
  - [ ] JSON logging
  - [ ] Correlation ID generation
  - [ ] Context management

- [ ] `src/utils/lifecycle-events.ts`
  - [ ] `LifecycleEventLogger` class
  - [ ] Patient registration logging
  - [ ] Prescription creation logging
  - [ ] Lab order & result logging
  - [ ] Appointment confirmation logging

- [ ] `src/utils/performance-events.ts`
  - [ ] `PerformanceEventLogger` class
  - [ ] Slow query detection
  - [ ] Cache miss rate tracking
  - [ ] RLS policy performance

**Day 2** (3 hours):
- [ ] `src/utils/safety-events.ts`
  - [ ] `SafetyEventLogger` class
  - [ ] Medication conflict logging
  - [ ] Critical lab value logging
  - [ ] Prescription refusal logging
  - [ ] RLS violation logging

- [ ] `src/hooks/useLifecycleLogger.ts`
  - [ ] Logger hook factory

**Testing**:
- [ ] Unit tests: Logger creates valid JSON
- [ ] Unit tests: PHI not logged (names, IDs, diagnoses)
- [ ] Integration: Log messages in console (dev)
- [ ] Integration: Correlation IDs propagate across spans

---

### Week 3: Metrics & SLOs (3 days)

**Day 1** (4 hours):
- [ ] `src/services/metrics.ts`
  - [ ] `MetricsCollector` class
  - [ ] Gauge tracking (cache, users)
  - [ ] Counter tracking (requests, amendments)
  - [ ] Histogram tracking (latencies)
  - [ ] Prometheus exporter

- [ ] `src/middleware/metrics.ts`
  - [ ] HTTP metrics recording
  - [ ] `/metrics` endpoint

**Day 2** (4 hours):
- [ ] Hook metrics into workflows:
  - [ ] Patient registration → `recordRegistrationToAppointmentLatency()`
  - [ ] Prescription creation → `recordPrescriptionToDispensingLatency()`
  - [ ] Lab result → `recordLabCriticalAlertLatency()`
  - [ ] Appointment → `recordAppointmentToReminderLatency()`

- [ ] Write SLO acceptance tests:
  - [ ] Patient registration SLO test (Vitest)
  - [ ] Prescription dispensing SLO test (Vitest)
  - [ ] Lab critical alert SLO test (Vitest)
  - [ ] Appointment reminder SLO test (Vitest)

**Day 3** (3 hours):
- [ ] Integration tests:
  - [ ] `/metrics` endpoint returns valid Prometheus format
  - [ ] SLO metrics appear in export
  - [ ] P95 calculations correct

**Testing**:
- [ ] Manual: `curl http://localhost:3000/metrics`
- [ ] Parse output as Prometheus format
- [ ] Verify histogram buckets
- [ ] Run SLO acceptance tests

---

### Week 4: Error Tracking (2 days)

**Day 1** (4 hours):
- [ ] `npm install @sentry/react @sentry/tracing`

- [ ] `src/utils/sentry-sanitizer.ts`
  - [ ] PHI masking function
  - [ ] `sanitizeSentryEvent()` implementation
  - [ ] Sensitive pattern definitions

- [ ] `src/main.tsx`
  - [ ] Sentry initialization
  - [ ] `beforeSend` hook with sanitizer

**Day 2** (3 hours):
- [ ] `src/components/ErrorBoundary.tsx`
  - [ ] React error boundary
  - [ ] Error fallback UI

- [ ] Error capturing in workflows:
  - [ ] `captureClinicallySafeError()` in API calls
  - [ ] Sentry context for clinical information

**Testing**:
- [ ] Manual: Trigger error, check Sentry
- [ ] Verify PHI is masked (UHID, names, diagnoses)
- [ ] Verify context includes hospital_id, user_role
- [ ] Test error boundary components

---

## Quick Start: Running Phase 3A Locally

### 1. Start Service

```bash
cd care-harmony-hub
npm install  # If first time

# Terminal 1: Start development server
npm run dev
```

### 2. Verify Health Checks

```bash
# Terminal 2: Test endpoints
curl http://localhost:3000/health | jq
curl http://localhost:3000/ready | jq
curl http://localhost:3000/metrics | head -20
```

### 3. View Logs

```bash
# Logs appear in development console
# Look for JSON structures with:
# - timestamp, level, message
# - correlation_id, request_id
# - hospital_id, user_role
```

### 4. Run SLO Tests

```bash
# Terminal 3: Run acceptance tests
npm run test:unit tests/integration/slo-*.test.ts

# Or run specific SLO
npm run test:unit tests/integration/slo-patient-registration.test.ts
```

---

## Integration with Existing Phases

### Phase 2A: Audit Trail Integration

**How Phase 3A uses Phase 2A**:
```typescript
// When audit record created, log and increment metric
auditLogger.logAuditRecordCreated(auditId, action, resourceType);
metricsCollector.incrementAuditRecords(1);
```

**Metrics to track**:
- `audit_records_created` (counter)
- `prescription_amendment_count` (counter from Phase 2A)
- Latencies in audit trail creation

---

### Phase 2B: Feature Flags (Future Integration)

**When Phase 2B is complete**, add:
```typescript
// src/services/metrics.ts
recordFeatureFlagImpact(flagName: string, enabled: boolean, durationMs: number) {
  // Track performance delta of feature flag
  const metric = enabled ? 
    `feature_enabled#${flagName}_duration_ms` :
    `feature_disabled#${flagName}_duration_ms`;
  // ...
}
```

**Dashboards** will show flag impact on SLOs.

---

## Key Metrics Reference

### Gauges (Current Value)
```
app_up                           # 1 = healthy, 0 = down
cache_hit_ratio                  # 0-1 (percentage)
active_users{role="DOCTOR"}      # Count by role
```

### Counters (Always Increasing)
```
http_requests_total{...}         # By method, endpoint, status
prescription_amendment_count     # Phase 2A
audit_records_created            # Phase 2A
medication_conflict_detected_total
critical_lab_values_total
```

### Histograms (Distribution)
```
registration_to_appointment_latency_seconds       # SLO 1
prescription_to_dispensing_latency_seconds        # SLO 2
lab_critical_alert_latency_seconds                # SLO 3
appointment_to_reminder_latency_seconds           # SLO 4
http_request_duration_seconds{endpoint="/patients"}
```

---

## Alerting Strategy

### Critical Alerts (Immediate Action)
```yaml
- Lab critical value without timely alert (>5 min)
- RLS policy violation detected
- Prescription workflow failure
- Medication conflict not blocked
```

**Action**: Page on-call doctor/lead

### Warning Alerts (Next Shift)
```yaml
- Registration → appointment latency (>30 min, P95)
- Prescription → dispensing latency (>15 min, P95)
- Appointment → reminder latency (>10 min, P95)
- Slow database query (>1s)
- High cache miss rate (>30%)
```

**Action**: Create ticket, review logs

### Info Alerts (Dashboards Only)
```yaml
- New audit records created
- Patient registrations
- Lab orders created
- Feature flag changes
```

**Action**: Monitor trends

---

## FAQ & Troubleshooting

### Q: Health check fails with "RLS policy violated"

**A**: RLS policy is not scoping correctly.

1. Check policy in Supabase console:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'patients';
   ```

2. Verify it includes `hospital_id` scoping:
   ```sql
   (auth.hospital_id() = hospital_id)
   ```

3. Run test query:
   ```sql
   -- As authenticated user with hospital_id
   SELECT * FROM patients WHERE hospital_id = auth.hospital_id();
   ```

---

### Q: Metrics endpoint returns empty

**A**: No metrics have been recorded yet.

1. Verify middleware is hooked:
   ```typescript
   app.use(recordHttpMetrics); // Before routes
   ```

2. Make some requests:
   ```bash
   curl http://localhost:3000/health
   curl http://localhost:3000/patients
   ```

3. Check metrics again:
   ```bash
   curl http://localhost:3000/metrics
   ```

---

### Q: Sentry not receiving errors

**A**: Check DSN and beforeSend implementation.

1. Verify DSN in `.env`:
   ```bash
   VITE_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
   ```

2. Test with manual capture:
   ```typescript
   import * as Sentry from '@sentry/react';
   Sentry.captureMessage('Test message');
   ```

3. Check Sentry project dashboard

---

### Q: Logs not appearing

**A**: Structured logger outputs to console in development.

```typescript
// In development, logs go to console.log/console.error
// In production, they should be shipped to log aggregator

// Check console output:
console.log(JSON.stringify(logEntry)); // Should be valid JSON
```

---

## Performance Impact

### Health Checks
- `/health`: <50ms (no dependencies)
- `/ready`: <500ms (checks database, RLS, auth)
- No caching (always fresh)

### Metrics Recording
- HTTP metrics: <1ms per request (in-memory)
- Histogram bucketing: O(10) comparisons per value
- Export: <100ms (serialize in-memory data)

### Logging
- Sync console output: ~1-5ms per log
- Async shipping (if enabled): non-blocking

### Sentry
- Before-send sanitization: ~5-10ms
- Async upload: non-blocking

**Total overhead**: <20ms per request in typical usage

---

## Next Steps (Post Phase 3A)

### Immediate (Week 5)
- [ ] Deploy Phase 3A to staging
- [ ] Configure Prometheus scraper
- [ ] Create initial Grafana dashboards
- [ ] Set up alert rules

### Short Term (Weeks 6-8)
- [ ] Phase 2B: Feature Flag integration (if proceeding)
- [ ] Fine-tune SLO thresholds based on real data
- [ ] Add distributed tracing (OpenTelemetry)
- [ ] Create oncall runbooks

### Medium Term (Weeks 9-12)
- [ ] Advanced analytics (cohort analysis, funnel tracking)
- [ ] Machine learning alerting (anomaly detection)
- [ ] Custom dashboards per role
- [ ] Performance optimization initiatives

---

## Document Navigation

```
Phase 3A Documentation Structure:

PHASE_3A_IMPLEMENTATION_SPEC.md
├── Health Check Design
├── SLO Definitions
├── Structured Logging Spec
├── Error Tracking Setup
└── Roadmap

PHASE_3A_HEALTH_CHECK_GUIDE.md
├── /health endpoint (liveness)
├── /ready endpoint (readiness + RLS)
├── /metrics endpoint (Prometheus)
├── Kubernetes integration
└── Troubleshooting

PHASE_3A_SLO_DEFINITIONS.md
├── SLO 1: Patient Registration → Appointment
├── SLO 2: Prescription → Dispensing
├── SLO 3: Lab Critical → Alert
├── SLO 4: Appointment → Reminder
├── Acceptance Tests (Vitest)
└── Alert Rules

PHASE_3A_OBSERVABILITY_SETUP.md
├── Metrics Service (complete code)
├── Logger Service (complete code)
├── Lifecycle Events
├── Performance Events
├── Safety Events
├── Sentry Integration
└── Error Boundary

PHASE_3A_COMPREHENSIVE_INDEX.md (this file)
├── Overview & summary
├── Implementation checklist
├── Day-by-day task breakdown
├── Quick start guide
├── FAQ & troubleshooting
└── Next steps
```

---

## Success Criteria

Phase 3A is complete when:

✅ **Health Checks**
- `/health` responds <50ms always
- `/ready` validates RLS policy scoping
- `/metrics` exports Prometheus format

✅ **SLOs**
- All 4 SLOs tracked and visible in metrics
- P95 calculations match expected values
- Alerts trigger at thresholds

✅ **Logging**
- JSON logs with correlation_id
- Lifecycle events logged (patient, prescription, lab, appointment)
- Zero PHI in logs (names, UHIDs, diagnoses masked)

✅ **Error Tracking**
- Sentry receives errors with context
- PHI masked in Sentry events
- Error boundary prevents app crashes

✅ **Documentation**
- All 4 documents complete
- Acceptance tests passing
- Runbooks for on-call

---

**Document Version**: 1.0  
**Last Updated**: March 13, 2026  
**Status**: Ready for Implementation  
**Estimated Effort**: 40-50 hours across 4 weeks  
**Team Size**: 2 engineers (observability + QA)

---

## Quick Links

- 📊 [Health Check Guide](PHASE_3A_HEALTH_CHECK_GUIDE.md)
- 📈 [SLO Definitions](PHASE_3A_SLO_DEFINITIONS.md)
- 🔍 [Observability Setup](PHASE_3A_OBSERVABILITY_SETUP.md)
- 🏗️ [Main Spec](PHASE_3A_IMPLEMENTATION_SPEC.md)

---

For questions or clarifications, contact: CareSync Observability Team (observability@caresync.dev)
