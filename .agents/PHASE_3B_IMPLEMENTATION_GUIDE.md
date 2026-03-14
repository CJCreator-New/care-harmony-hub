# Phase 3B: Observability Integration — Complete Implementation Guide

**Status**: ✅ **Phase 3B Framework Complete** — Ready for deployment and integration

---

## What Has Been Delivered (8 Components)

### 1. ✅ OpenTelemetry Client-side Instrumentation
**File**: `src/utils/telemetry.ts`

Provides:
- W3C Trace Context propagation
- Browser span creation for clinical workflows
- OTLP HTTP export to collector
- Auto-instrumentation of document load, fetch, XHR
- Metric recording for SLI tracking

**Key Functions**:
```typescript
initializeTelemetry(config)      // Init telemetry on app startup
getTracer(name)                   // Get global tracer for creating spans
createClinicalSpan(name, attrs)  // Create span for clinical operations
createAPISpan(endpoint, method)  // Create span for API calls
recordClinicalMetric(name, value, attrs)  // Record SLI metrics
```

### 2. ✅ Correlation ID & Trace Context Management
**File**: `src/utils/correlationId.ts`

Provides:
- Session-scoped correlation IDs (format: `hosp_{hospitalId}_{timestamp}_{random}`)
- W3C Trace Context parsing and generation
- Automatic fetch interceptor for header injection
- PHI-safe event logging

**Key Functions**:
```typescript
getCorrelationId()               // Get/generate correlation ID
correlatedFetch(url, init)       // Fetch with auto-correlation
registerFetchInterceptor()       // Register global fetch override
createClinicalContext(ctx)       // Create clinical context with correlation
logClinicalEvent(type, details)  // Log event with correlation ID
```

### 3. ✅ Clinical SLO Definitions
**File**: `src/config/clinicalSLOs.ts`

Defines 9 clinical SLOs with:
- Target latencies (p95/p99 percentiles)
- Warning & critical thresholds
- Escal escalation rules (PagerDuty, Slack)
- Patient safety criticality flags

**SLOs Defined**:
1. Patient Registration (<5 min)
2. Patient Search (<2 sec) — Infrastructure critical
3. Consultation Start (<30 min)
4. Prescription Creation (<5 min) — **CRITICAL**
5. Prescription Dispensing (<15 min) — **CRITICAL**
6. Lab Order (<5 min)
7. Lab Critical Value (<5 min) — **CRITICAL**
8. Appointment Reminder (<10 min)
9. Vital Signs Recording (<5 sec) — **CRITICAL**

### 4. ✅ Prometheus Alerting Rules
**File**: `monitoring/clinical-alerts.yaml`

45+ alerting rules across 5 groups:
- **Patient Safety Critical** (immediate escalation)
  - Lab critical value alert delay
  - Prescription dispensing blocked
  - Vital signs recording failures
  - Medication interactions

- **SLO Warnings** (performance degradation)
  - Patient search latency
  - Prescription creation latency
  - Lab order latency
  - Consultation wait times

- **System Health** (infrastructure)
  - DB connection pool exhaustion
  - RLS policy execution time
  - API error rate
  - Cache hit rate

- **Audit & Security** (compliance)
  - RLS violations
  - Unauthorized amendments
  - Encryption key rotation

- **Async Workflows** (queue & batch)
  - Appointment reminder queue
  - Billing batch processing

### 5. ✅ OpenTelemetry Collector Configuration
**File**: `monitoring/otel-collector-config.yaml`

Receiver → Processor → Exporter pipeline:
- **Receivers**: OTLP/HTTP (4318), Prometheus scraping
- **Processors**: Batch, memory limiter, resource detection
- **Exporters**: Jaeger (tracing), Prometheus (metrics), Loki (logs)

Docker deployment:
```bash
docker run -d \
  -p 4317:4317 -p 4318:4318 \
  -p 8889:8889 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otel/config.yaml \
  otel/opentelemetry-collector:latest \
  --config=/etc/otel/config.yaml
```

### 6. ✅ Edge Function Tracing Instrumentation
**File**: `supabase/functions/_shared/tracing.ts`

Provides:
- Request span creation with W3C Trace Context
- Correlation ID extraction from headers
- Clinical metric recording
- Error tracking with span context
- Graceful error handling

**Usage in Edge Function**:
```typescript
import { withTracing } from '../_shared/tracing.ts';

const handler = async (req: Request): Promise<Response> => {
  return withTracing(req, 'create-prescription', async (ctx) => {
    const body = await req.json();
    // ctx.correlationId, ctx.traceParent available
    const rx = await createPrescription(body);
    recordClinicalMetric('prescription_create_latency', timeMs, {
      prescription_id: rx.id,
    });
    return new Response(JSON.stringify({
      ...rx,
      ...getTracingHeaders(ctx),
    }));
  });
};
```

### 7. ✅ Grafana Dashboards (4 Role-Based)
**Location**: `monitoring/grafana/dashboards/`

#### **Clinical Dashboard** (`clinical-dashboard.json`)
For: Doctors
Metrics:
- Prescription creation latency (p95)
- Lab critical value alert latency (p99)
- Patient search latency (p95)
- Active prescriptions (24h)
- Medication interaction detections
- Consultation wait times

#### **Pharmacy Dashboard** (`pharmacy-dashboard.json`)
For: Pharmacists
Metrics:
- Prescription queue depth (gauge)
- Dispensing latency (p95)
- Dispensing rate (rx/min)
- Blocked prescriptions (24h)
- Block reasons breakdown
- Stock alerts

#### **Lab Dashboard** (`lab-dashboard.json`)
For: Lab Technicians
Metrics:
- Unacknowledged critical values
- Critical value alert latency (p99)
- Specimen processing time (p95)
- Pending specimens
- Critical value timeline
- Acknowledgment latency

#### **Admin Dashboard** (`admin-slo-dashboard.json`)
For: Hospital Admins
Metrics:
- Overall SLO compliance (24h)
- Patient safety critical SLOs table
- Database health (connection % usage)
- API error rate
- Cache hit rate
- RLS policy execution time
- SLO compliance by workflow trend
- RLS violations (5m)

### 8. ✅ PHI-Safe Error Tracking
**File**: `src/utils/errorTracking.ts`

Integration with Sentry/Glitchtip:
- Automatic PHI masking (patient names, UHIDs, diagnoses)
- Correlation ID injection into error context
- Hospital-scoped error grouping
- Sanitized breadcrumb trails
- Clinical error categorization

**Key Functions**:
```typescript
initErrorTracking(options)       // Init Sentry with PHI masking
captureException(error, ctx)     // Capture with context
captureMessage(msg, level, ctx)  // Log message
setErrorTrackingUser(user)       // Set user context
clearErrorTrackingUser()         // Clear on logout
```

---

## Integration Checklist

### PHASE 3B.1 — React Component Integration
**Estimated Time**: 3-4 hours

- [ ] Import and initialize telemetry in `src/main.tsx`
  ```typescript
  import { initializeTelemetry } from '@/utils/telemetry';
  import { registerFetchInterceptor } from '@/utils/correlationId';
  import { initErrorTracking } from '@/utils/errorTracking';
  
  // On app startup
  initializeTelemetry({
    serviceName: 'care-sync-frontend',
    version: '1.2.0',
    hospitalId: hospital?.id,
    userId: user?.id,
    userRole: user?.role,
  });
  
  registerFetchInterceptor();
  initErrorTracking({ dsn: process.env.VITE_SENTRY_DSN });
  ```

- [ ] Add telemetry to key workflows
  - PatientPrescriptionsPage: Wrap `createPrescription` call
  - LaboratoryPage: Wrap `recordLabResult` call
  - AppointmentsPage: Wrap `createAppointment` call
  - Example:
    ```typescript
    const span = createClinicalSpan('prescription.create', {
      'patient.id': patientId,
      'hospital.id': hospitalId,
    });
    try {
      const rx = await supabase.from('prescriptions').insert([...]);
      recordClinicalMetric('prescription_create_latency', Date.now() - start, {
        prescription_id: rx.id,
      });
      span.setStatus('OK');
    } catch (e) {
      span.recordException(e);
      captureException(e, { context: 'prescription.create', severity: 'error' });
    } finally {
      span.end();
    }
    ```

- [ ] Wrap all Supabase/fetch calls with correlation propagation
  - Already handled by `registerFetchInterceptor()` ✓

- [ ] Add user context to error tracking on login
  ```typescript
  setErrorTrackingUser({
    userId: user.id,
    hospitalId: hospital.id,
    userRole: user.role,
  });
  ```

### PHASE 3B.2 — Instrument Edge Functions
**Estimated Time**: 2-3 hours

- [ ] Apply `withTracing` wrapper to all mutation functions
  - Examples: `create-prescription`, `record-lab-result`, `create-appointment`, `store-2fa-secret`
  
- [ ] Record clin clinical metrics for each workflow
  - Prescription creation/dispensing latency
  - Lab processing latency
  - Appointment confirmation latency

- [ ] Add correlation ID logging to database mutations
  ```typescript
  const { data, error } = await supabase
    .from('prescriptions')
    .insert([{
      ...prescription,
      correlation_id: ctx.correlationId,
      trace_id: ctx.traceId,
    }]);
  ```

### PHASE 3B.3 — Deploy Observability Stack
**Estimated Time**: 1-2 hours

- [ ] Deploy OpenTelemetry Collector
  ```bash
  docker-compose -f docker-compose.yml up -d otel-collector jaeger prometheus grafana
  ```

- [ ] Configure Prometheus
  - Add `clinical-alerts.yaml` rules file
  - Configure AlertManager for Slack/PagerDuty integration

- [ ] Import Grafana dashboards
  - Login to Grafana (admin/admin)
  - Administration → Data Sources → Add Prometheus
  - Dashboards → Import → Upload JSON files
  - Set up Slack/PagerDuty notification channels

- [ ] Configure alerting
  - PagerDuty integration for critical SLO breaches
  - Slack integration for warnings
  - Email for non-critical alerts

### PHASE 3B.4 — Test End-to-End Tracing
**Estimated Time**: 2-3 hours

- [ ] Create test workflow with observable spans
  - Patient registration → Prescription creation → Pharmacy dispensing
  - Validate correlation ID flows through all layers

- [ ] Verify metrics appear in Prometheus
  - Query: `caresync_prescription_creation_latency_ms`
  - Verify p95/p99 percentiles

- [ ] Validate Grafana visualizations
  - Check all dashboard panels load data
  - Verify thresholds align with alerts

- [ ] Test alerting
  - Manually trigger SLO breach
  - Verify PagerDuty/Slack notifications fire

---

## Deployment Steps

### 1. Add OpenTelemetry Packages
```bash
npm install
# OTel packages already added to package.json in Phase 3B.1
```

### 2. Update Environment Variables
Add to `.env` and `.env.production`:
```bash
VITE_OTLP_ENDPOINT=http://otel-collector:4318
VITE_SENTRY_DSN=https://examplePublicKey@sentry.io/yourProjectId
VITE_ENV=production
```

### 3. Docker Compose Stack
Add to `docker-compose.prod.yml`:
```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8889:8889"
    volumes:
      - ./monitoring/otel-collector-config.yaml:/etc/otel/config.yaml
    command: --config=/etc/otel/config.yaml
    depends_on:
      - jaeger
      - prometheus

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "14250:14250"

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/clinical-alerts.yaml:/etc/prometheus/clinical-alerts.yaml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

### 4. Start Observability Stack
```bash
docker-compose -f docker-compose.prod.yml up -d jaeger prometheus grafana otel-collector
```

### 5. Access Dashboards
- **Grafana**: http://localhost:3000 (admin/admin)
- **Jaeger**: http://localhost:16686
- **Prometheus**: http://localhost:9090

---

## Key Metrics to Monitor

### Patient Safety Critical SLOs
- ⚠️ **Lab Critical Value Alert Latency**: < 5 min (p99)
  - Alert if p99 > 5 min → Page doctor immediately
- ⚠️ **Prescription Dispensing Latency**: < 15 min (p95)
  - Alert if p95 > 15 min → Page pharmacist
- ⚠️ **Vital Signs Recording**: < 5 sec (p95)
  - Alert if p95 > 5 sec → Investigate DB/API

### Infrastructure Critical SLOs
- ⚠️ **Patient Search Latency**: < 2 sec (p95)
  - Alert if p95 > 2 sec → Investigate database query performance
- ⚠️ **RLS Policy Execution**: < 10 ms (p95)
  - Alert if p95 > 10 ms → Review RLS policies

### Operational Metrics
- 🔵 **API Error Rate**: < 2% (5m average)
- 🔵 **Database Connection Pool**: < 90%
- 🔵 **Cache Hit Rate**: > 70%
- 🔵 **Uptime**: > 99.9%

---

## Troubleshooting

### Traces Not Appearing in Jaeger
1. Verify OTel Collector is running: `docker logs otel-collector`
2. Check frontend console for errors: `console.error('Telemetry'...`
3. Verify OTLP endpoint is accessible from browser
4. Check Jaeger UI: http://localhost:16686

### Metrics Not in Prometheus
1. Verify Prometheus scrape jobs: http://localhost:9090/targets
2. Check Prometheus config: `monitoring/prometheus.yml`
3. Verify exporters in OTel config: `monitoring/otel-collector-config.yaml`

### Alerts Not Firing
1. Check AlertManager status in Prometheus UI
2. Verify alert rules loaded: http://localhost:9090/alerts
3. Check Grafana notification channels configuration
4. Test webhooks manually

---

## Next Steps (After Deployment)

### Phase 4A: Healthcare UI Audit
- Accessibility compliance (WCAG 2.1 AA)
- Usability testing with clinical staff
- Dark mode for 24/7 operations

### Phase 4B: Frontend Enhancements
- Advanced search filters (NLP-powered patient search)
- Clinical decision support integration
- Mobile app synchronization

### Phase 5: Comprehensive Validation
- End-to-end scenario testing (all 8 user roles)
- Load testing (1000+ concurrent users)
- Disaster recovery procedures

### Phase 6: Staged Rollout
- Canary deployment (10% → 25% → 100%)
- Feature flags for gradual enablement
- A/B testing for new workflows

---

## Success Criteria

✅ **Phase 3B is complete when**:
1. All correlation IDs flow through React → Edge Functions → PostgreSQL
2. All 9 clinical SLOs have active monitoring dashboards
3. All critical alerts are configured and tested
4. Trace latency < 500ms from span creation to Jaeger
5. No PHI appears in error logs (Sentry audit passed)
6. Doctors/pharmacists/lab techs using dashboards for decision-making

**Estimated Total Implementation Time**: 8-10 hours
**Current Status**: Framework complete, ready for integration ✅

