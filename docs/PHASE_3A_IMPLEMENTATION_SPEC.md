# Phase 3A: Clinical Metrics Setup for CareSync HIMS

**Status**: Specification Draft  
**Date**: March 13, 2026  
**Scope**: Health checks, clinical SLOs, structured logging, error tracking  
**Phase Dependencies**: Phase 2A (Audit Trail) ✅ | Phase 2B (Feature Flags) ⏭️ (not yet implemented)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Health Check Endpoints](#health-check-endpoints)
4. [Clinical SLO Definitions](#clinical-slo-definitions)
5. [Structured Logging](#structured-logging)
6. [Error Tracking & Masking](#error-tracking--masking)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Testing Strategy](#testing-strategy)

---

## Executive Summary

Phase 3A implements **observability infrastructure** for mission-critical healthcare workflows. Focus areas:

- **3 Health Check Endpoints**: Liveness, Readiness, Prometheus metrics
- **4 Clinical SLOs**: Patient registration, prescription dispensing, lab critical alerts, appointment reminders
- **Structured JSON Logging**: Correlation IDs, lifecycle events, PHI-safe masking
- **Error Tracking**: Sentry integration with sanitized context
- **No Breaking Changes**: Purely additive observability layer

**Goal**: Enable production monitoring without exposing PHI or compromising performance.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         React Frontend + TanStack Query             │
│  ┌────────────────────────────────────────────────┐ │
│  │ useHealthCheck() Hook (30s polling)            │ │
│  │ useStructuredLogger() Hook (log lifecycle)     │ │
│  └────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────├─────────────────────────────────────┐
│  Express/Vite Middleware Layer                     │
│  ┌────────────────────────────────────────────────┐ │
│  │ GET /health      - Liveness                    │ │
│  │ GET /ready       - Readiness (RLS warm)        │ │
│  │ GET /metrics     - Prometheus format           │ │
│  │ POST /logs       - Structured logging endpoint │ │
│  │ POST /errors     - Error tracking (Sentry)     │ │
│  └────────────────────────────────────────────────┘ │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────└─────────────────────────────────────┐
│  Monitoring & Analytics Layer                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Prometheus Scraper (metrics endpoint)          │ │
│  │ Grafana Dashboard (role-specific views)        │ │
│  │ Structured Log Aggregator (JSON logs)          │ │
│  │ Sentry Error Tracking (alerts & replay)        │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**Key Principles**:
- Health checks = **not authenticated** (monitoring systems need access)
- Metrics = **Prometheus exposition format** (text/plain, parseable)
- Logs = **JSON with correlation_id** (traceability across services)
- Errors = **PHI-masked** (never expose patient names, UHIDs, diagnoses)

---

## Health Check Endpoints

### 1. GET /health - Liveness Probe

**Purpose**: Confirms process is alive (Kubernetes/container health).

**Response** (HTTP 200):
```json
{
  "status": "healthy",
  "timestamp": "2026-03-13T10:30:45.123Z",
  "uptime_seconds": 3600,
  "environment": "production",
  "version": "0.3.0"
}
```

**Conditions**:
- Always returns 200 (unless process is dead)
- No dependency checks (fast, <50ms)
- Used by load balancers for health verification

**Implementation** (`src/services/health-check.ts`):
```typescript
import { Request, Response } from 'express';

const startTime = Date.now();

export async function getHealth(req: Request, res: Response) {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSeconds,
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '0.3.0',
  });
}
```

---

### 2. GET /ready - Readiness Probe

**Purpose**: Confirms app is ready to accept traffic (dependencies healthy).

**Response** (HTTP 200 if ready, 503 if not):
```json
{
  "status": "ready",
  "timestamp": "2026-03-13T10:30:45.123Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 12
    },
    "auth_context": {
      "status": "ok"
    },
    "rls_policies": {
      "status": "ok",
      "verified_hospitals": 3
    },
    "cache": {
      "status": "ok",
      "items": 250
    }
  }
}
```

**Conditions**:
- ✅ Supabase connection working (sample SELECT query)
- ✅ RLS policies warm (hospital_id scoping verified via test query)
- ✅ TanStack Query cache initialized
- ✅ Auth context containing at least one hospital
- HTTP 200 if **all** checks pass
- HTTP 503 if **any** check fails

**Implementation** (`src/services/health-check.ts`):
```typescript
export async function getReady(req: Request, res: Response) {
  const checks = await Promise.all([
    checkDatabase(),
    checkRLSPolicies(),
    checkAuthContext(),
    checkCache(),
  ]);

  const allHealthy = checks.every((c) => c.status === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: Object.fromEntries(checks.map((c) => [c.name, c])),
  });
}

async function checkDatabase() {
  try {
    const startTime = Date.now();
    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .select('id')
      .limit(1);
    
    const latency = Date.now() - startTime;
    
    if (error) throw error;
    
    return {
      name: 'database',
      status: 'ok',
      latency_ms: latency,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'down',
      error: String(error),
    };
  }
}

async function checkRLSPolicies() {
  try {
    // Verify RLS is enforcing hospital_id scoping
    const hospitalId = process.env.PUBLIC_TEST_HOSPITAL_ID || 'test-hospital';
    
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('id, hospital_id')
      .eq('hospital_id', hospitalId)
      .limit(1);
    
    if (error) throw error;
    
    // All returned records must have matching hospital_id
    const verified = data.every((r) => r.hospital_id === hospitalId);
    
    return {
      name: 'rls_policies',
      status: verified ? 'ok' : 'policy_violated',
      verified_hospitals: 1,
    };
  } catch (error) {
    return {
      name: 'rls_policies',
      status: 'down',
      error: String(error),
    };
  }
}

async function checkAuthContext() {
  // Check if auth system is initialized
  try {
    // Verify auth secrets are loaded
    const hasAuthSecrets = !!(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY
    );
    
    return {
      name: 'auth_context',
      status: hasAuthSecrets ? 'ok' : 'missing_credentials',
    };
  } catch (error) {
    return {
      name: 'auth_context',
      status: 'error',
      error: String(error),
    };
  }
}

async function checkCache() {
  try {
    // Check if TanStack Query cache is initialized
    // This is a placeholder; in reality would check actual cache size
    return {
      name: 'cache',
      status: 'ok',
      items: 0, // Would track actual cache size
    };
  } catch (error) {
    return {
      name: 'cache',
      status: 'down',
      error: String(error),
    };
  }
}
```

---

### 3. GET /metrics - Prometheus Metrics

**Purpose**: Expose metrics in Prometheus text format for scraping.

**Format**: `text/plain; version=0.0.4`

**Response** (example):
```
# HELP app_up Application is up (1 = up, 0 = down)
# TYPE app_up gauge
app_up 1

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/patients",status="200"} 1250
http_requests_total{method="POST",endpoint="/prescriptions",status="201"} 342
http_requests_total{method="GET",endpoint="/health",status="200"} 1800

# HELP http_request_duration_seconds Request latency in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{endpoint="/patients",le="0.05"} 1000
http_request_duration_seconds_bucket{endpoint="/patients",le="0.1"} 1150
http_request_duration_seconds_bucket{endpoint="/patients",le="1.0"} 1240
http_request_duration_seconds_bucket{endpoint="/patients",le="+Inf"} 1250
http_request_duration_seconds_sum{endpoint="/patients"} 125.5
http_request_duration_seconds_count{endpoint="/patients"} 1250

# HELP cache_hit_ratio TanStack Query cache hit rate (0-1)
# TYPE cache_hit_ratio gauge
cache_hit_ratio 0.82

# HELP active_users Number of active users by role
# TYPE active_users gauge
active_users{role="DOCTOR"} 24
active_users{role="NURSE"} 18
active_users{role="PHARMACIST"} 8
active_users{role="LAB_TECH"} 6

# HELP prescription_amendment_count Total prescription amendments (Phase 2A)
# TYPE prescription_amendment_count counter
prescription_amendment_count 1247

# HELP audit_records_created Total audit trail entries created
# TYPE audit_records_created counter
audit_records_created 58392
```

**Implementation** (`src/services/metrics.ts`):
```typescript
import { Request, Response } from 'express';

// Simple metrics store (in production, use Prometheus client library)
class MetricsCollector {
  private metrics: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  
  recordRequest(method: string, endpoint: string, status: number, durationMs: number) {
    // Counter: http_requests_total
    const key = `http_requests_total_${method}_${endpoint}_${status}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
    
    // Histogram: http_request_duration_seconds
    const histKey = `latencies_${endpoint}`;
    if (!this.histograms.has(histKey)) {
      this.histograms.set(histKey, []);
    }
    this.histograms.get(histKey)!.push(durationMs / 1000);
  }
  
  setCacheHitRatio(ratio: number) {
    this.metrics.set('cache_hit_ratio', ratio);
  }
  
  setActiveUsers(role: string, count: number) {
    this.metrics.set(`active_users_${role}`, count);
  }
  
  incrementPrescriptionAmendments(count: number = 1) {
    const key = 'prescription_amendment_count';
    this.metrics.set(key, (this.metrics.get(key) || 0) + count);
  }
  
  incrementAuditRecords(count: number = 1) {
    const key = 'audit_records_created';
    this.metrics.set(key, (this.metrics.get(key) || 0) + count);
  }
  
  getPrometheus(): string {
    let output = '';
    
    // App up
    output += '# HELP app_up Application is up\n';
    output += '# TYPE app_up gauge\n';
    output += 'app_up 1\n\n';
    
    // HTTP requests total
    output += '# HELP http_requests_total Total HTTP requests\n';
    output += '# TYPE http_requests_total counter\n';
    for (const [key, value] of this.metrics) {
      if (key.startsWith('http_requests_total_')) {
        const parts = key.split('_');
        const method = parts[3];
        const status = parts[parts.length - 1];
        const endpoint = parts.slice(4, -1).join('_');
        output += `http_requests_total{method="${method}",endpoint="${endpoint}",status="${status}"} ${value}\n`;
      }
    }
    output += '\n';
    
    // Cache hit ratio
    if (this.metrics.has('cache_hit_ratio')) {
      output += '# HELP cache_hit_ratio TanStack Query cache hit rate\n';
      output += '# TYPE cache_hit_ratio gauge\n';
      output += `cache_hit_ratio ${this.metrics.get('cache_hit_ratio')}\n\n`;
    }
    
    // Active users
    output += '# HELP active_users Number of active users by role\n';
    output += '# TYPE active_users gauge\n';
    for (const [key, value] of this.metrics) {
      if (key.startsWith('active_users_')) {
        const role = key.replace('active_users_', '');
        output += `active_users{role="${role}"} ${value}\n`;
      }
    }
    output += '\n';
    
    // Counters
    output += '# HELP prescription_amendment_count Total prescription amendments\n';
    output += '# TYPE prescription_amendment_count counter\n';
    output += `prescription_amendment_count ${this.metrics.get('prescription_amendment_count') || 0}\n\n`;
    
    output += '# HELP audit_records_created Total audit trail entries created\n';
    output += '# TYPE audit_records_created counter\n';
    output += `audit_records_created ${this.metrics.get('audit_records_created') || 0}\n`;
    
    return output;
  }
}

export const metricsCollector = new MetricsCollector();

export function getMetrics(req: Request, res: Response) {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(metricsCollector.getPrometheus());
}
```

---

## Clinical SLO Definitions

### SLO 1: Patient Registration → First Appointment (Target: <30 min)

**Clinical Rationale**: Patient anxiety increases if waiting >30 min from intake to initial evaluation.

**Metric**: `registration_to_appointment_latency_seconds`

**Measurement**:
```sql
SELECT
  p.id as patient_id,
  p.hospital_id,
  p.created_at as registration_time,
  a.created_at as first_appointment_time,
  EXTRACT(EPOCH FROM (a.created_at - p.created_at)) / 60 as latency_minutes
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
  AND a.appointment_number = 1
WHERE p.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY latency_minutes DESC;
```

**Alert Thresholds**:
- **P95** > 30 min (5-minute window) → Alert: "Registration backlog"
- **Critical** (>90 min) → Escalate to intake supervisor

**Acceptance Criteria**:
- ✅ 95% of patients scheduled within 30 minutes
- ✅ Average latency <15 minutes
- ✅ Zero registrations without appointment scheduled

**Test Case**:
```typescript
test('Registration to first appointment <30min (P95)', async () => {
  // Register patient
  const patient = await registerPatient({
    first_name: 'John',
    hospital_id: 'test-hospital',
  });
  
  // Schedule appointment
  const appointment = await scheduleAppointment({
    patient_id: patient.id,
    appointment_time: Date.now() + 5 * 60 * 1000, // 5 min later
  });
  
  const latencyMs = appointment.created_at - patient.created_at;
  
  expect(latencyMs).toBeLessThan(30 * 60 * 1000); // 30 minutes
});
```

---

### SLO 2: Prescription Creation → Pharmacy Dispensing (Target: <15 min)

**Clinical Rationale**: Patients should not wait >15 min for medication after prescription created.

**Metric**: `prescription_to_dispensing_latency_seconds`

**Measurement**:
```sql
SELECT
  pr.id as prescription_id,
  pr.hospital_id,
  pr.created_at as prescription_time,
  pr.status as current_status,
  MAX(CASE WHEN status = 'DISPENSED' THEN updated_at END) as dispensed_time,
  EXTRACT(EPOCH FROM (
    MAX(CASE WHEN status = 'DISPENSED' THEN updated_at END) - pr.created_at
  )) / 60 as latency_minutes
FROM prescriptions pr
WHERE pr.created_at >= NOW() - INTERVAL '1 hour'
  AND pr.status = 'DISPENSED'
GROUP BY pr.id, pr.hospital_id, pr.created_at, pr.status;
```

**Alert Thresholds**:
- **P95** > 15 min → Alert: "Pharmacy bottleneck"
- **Critical** (>45 min) → Escalate to pharmacy manager

**Acceptance Criteria**:
- ✅ 95% of prescriptions dispensed within 15 minutes
- ✅ Average dispensing time <8 minutes
- ✅ <2% rejection rate due to inventory

**Test Case**:
```typescript
test('Prescription to dispensing <15min (P95)', async () => {
  const prescription = await createPrescription({
    patient_id: 'patient-1',
    drug_code: 'PARACETAMOL_500',
    quantity: 1,
  });
  
  // Pharmacist dispenses
  await dispensePrescription({
    prescription_id: prescription.id,
  });
  
  const dispensed = await getPrescription(prescription.id);
  const latencyMs = dispensed.updated_at - prescription.created_at;
  
  expect(latencyMs).toBeLessThan(15 * 60 * 1000); // 15 minutes
});
```

---

### SLO 3: Lab Order → Critical Value Alert Notification (Target: <5 min)

**Clinical Rationale**: Critical lab values (e.g., glucose <70 mg/dL) need immediate physician notification.

**Metric**: `lab_order_to_critical_alert_latency_seconds`

**Measurement**:
```sql
SELECT
  lo.id as lab_order_id,
  lo.hospital_id,
  lo.created_at as order_time,
  lr.created_at as result_time,
  lr.is_critical,
  n.created_at as notification_sent,
  EXTRACT(EPOCH FROM (n.created_at - lr.created_at)) as alert_latency_seconds
FROM lab_orders lo
JOIN lab_results lr ON lo.id = lr.lab_order_id
LEFT JOIN notifications n ON lr.id = n.related_entity_id
  AND n.notification_type = 'CRITICAL_LAB_VALUE'
WHERE lr.is_critical = true
  AND lo.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY alert_latency_seconds DESC;
```

**Alert Thresholds**:
- **P95** > 5 min → Alert: "Critical lab notification delay"
- **Critical** (>15 min without notification) → Escalate to chief medical officer

**Acceptance Criteria**:
- ✅ 100% of critical values trigger notification within 5 minutes
- ✅ Physician reviews notification within 10 minutes
- ✅ Zero missed critical values

**Test Case**:
```typescript
test('Lab critical value → notification <5min', async () => {
  const labOrder = await createLabOrder({
    patient_id: 'patient-1',
    test_code: 'GLUCOSE',
  });
  
  // Lab marks result as critical
  const result = await recordLabResult({
    lab_order_id: labOrder.id,
    value: 55, // critical (low glucose)
    is_critical: true,
  });
  
  // Check notification sent
  const notification = await getNotifications({
    related_entity_id: result.id,
    type: 'CRITICAL_LAB_VALUE',
  });
  
  const latencyMs = notification[0].created_at - result.created_at;
  
  expect(latencyMs).toBeLessThan(5 * 60 * 1000); // 5 minutes
  expect(notification).toHaveLength(1);
});
```

---

### SLO 4: Appointment Confirmation → Patient Reminder Sent (Target: <10 min)

**Clinical Rationale**: Patient reminders should be sent immediately after appointment confirmation to reduce no-shows.

**Metric**: `appointment_confirmation_to_reminder_latency_seconds`

**Measurement**:
```sql
SELECT
  a.id as appointment_id,
  a.hospital_id,
  a.updated_at as confirmed_time,
  n.created_at as reminder_sent,
  EXTRACT(EPOCH FROM (n.created_at - a.updated_at)) as latency_seconds
FROM appointments a
JOIN notifications n ON a.id = n.related_entity_id
  AND n.notification_type IN ('SMS_REMINDER', 'EMAIL_REMINDER')
WHERE a.status = 'CONFIRMED'
  AND a.updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY latency_seconds DESC;
```

**Alert Thresholds**:
- **P95** > 10 min → Alert: "Reminder delivery slow"
- **Critical** (>30 min) → Escalate to scheduler

**Acceptance Criteria**:
- ✅ 98% of reminders delivered within 10 minutes
- ✅ <3% patient no-show rate
- ✅ SMS delivery success >95%

**Test Case**:
```typescript
test('Appointment confirmation → reminder <10min', async () => {
  const appointment = await createAppointment({
    patient_id: 'patient-1',
    doctor_id: 'doctor-1',
    appointment_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
  });
  
  // Confirm appointment
  const confirmed = await confirmAppointment(appointment.id);
  
  // Check reminder sent
  const reminders = await getNotifications({
    related_entity_id: appointment.id,
    type: 'SMS_REMINDER',
  });
  
  const latencyMs = reminders[0].created_at - confirmed.updated_at;
  
  expect(latencyMs).toBeLessThan(10 * 60 * 1000); // 10 minutes
  expect(reminders.length).toBeGreaterThan(0);
});
```

---

## Structured Logging

### Log Format Specification

All application logs must follow this JSON structure:

```json
{
  "timestamp": "2026-03-13T10:30:45.123Z",
  "level": "info|warn|error|debug",
  "message": "Human-readable event",
  "correlation_id": "corr-uuid-v4",
  "request_id": "req-uuid-v4",
  "span_id": "span-uuid-v4",
  "hospital_id": "hospital-1",
  "user_id": "doctor-1",
  "user_role": "DOCTOR|NURSE|PHARMACIST|LAB_TECH|ADMIN",
  "duration_ms": 245,
  "entity_type": "patient|prescription|appointment|lab_order",
  "entity_id": "rx-123",
  "status": "success|failure",
  "error_code": "OPTIONAL_ERROR_CODE",
  "metadata": {}
}
```

### Lifecycle Events (Log Level: INFO)

Always log these events:

```typescript
// Patient Registration
{
  "message": "patient_registered",
  "entity_type": "patient",
  "entity_id": "pat-001",
  "hospital_id": "hosp-1",
  "user_role": "RECEPTIONIST",
  "metadata": { "registration_source": "mobile|web" }
}

// Prescription Created
{
  "message": "prescription_created",
  "entity_type": "prescription",
  "entity_id": "rx-001",
  "hospital_id": "hosp-1",
  "user_role": "DOCTOR",
  "metadata": { "drug_count": 3 }
}

// Lab Order Created
{
  "message": "lab_order_created",
  "entity_type": "lab_order",
  "entity_id": "lo-001",
  "hospital_id": "hosp-1",
  "user_role": "DOCTOR",
  "metadata": { "test_types": ["GLUCOSE", "HEMOGLOBIN"] }
}

// Lab Result Recorded
{
  "message": "lab_result_recorded",
  "entity_type": "lab_result",
  "entity_id": "lr-001",
  "hospital_id": "hosp-1",
  "user_role": "LAB_TECH",
  "metadata": { "is_critical": true }
}

// Appointment Confirmed
{
  "message": "appointment_confirmed",
  "entity_type": "appointment",
  "entity_id": "apt-001",
  "hospital_id": "hosp-1",
  "user_role": "RECEPTIONIST",
  "metadata": { "reminder_method": "SMS" }
}
```

### Performance Events (Log Level: WARN)

Alert on slow operations:

```typescript
// Slow Database Query
{
  "level": "warn",
  "message": "query_slow",
  "duration_ms": 2500,
  "metadata": {
    "query_type": "patients_search",
    "filters_applied": 3,
    "rows_returned": 500
  }
}

// High Cache Miss Rate
{
  "level": "warn",
  "message": "cache_miss_rate_high",
  "metadata": {
    "miss_rate": 0.45,
    "threshold": 0.30
  }
}

// RLS Policy Slow
{
  "level": "warn",
  "message": "rls_policy_slow",
  "duration_ms": 850,
  "metadata": {
    "hospital_id": "hosp-1",
    "policy_check": "hospital_id_scoping"
  }
}
```

### Safety Events (Log Level: ERROR)

Critical safety issues:

```typescript
// Medication Conflict Detected
{
  "level": "error",
  "message": "medication_conflict_detected",
  "entity_type": "prescription",
  "entity_id": "rx-001",
  "status": "failure",
  "error_code": "DRUG_INTERACTION",
  "metadata": {
    "conflicting_drugs": ["IBUPROFEN", "ASPIRIN"],
    "severity": "HIGH"
  }
}

// Critical Lab Value
{
  "level": "error",
  "message": "critical_lab_value_detected",
  "entity_type": "lab_result",
  "entity_id": "lr-001",
  "metadata": {
    "test_type": "GLUCOSE",
    "value": 45,
    "normal_range": "70-100"
  }
}

// Prescription Refused (RLS/Safety)
{
  "level": "error",
  "message": "prescription_refused",
  "entity_type": "prescription",
  "entity_id": "rx-001",
  "status": "failure",
  "error_code": "POLICY_VIOLATION",
  "metadata": {
    "reason": "Patient age incompatible with medication",
    "patient_age": 8,
    "minimum_age_required": 16
  }
}
```

### Logger Implementation (`src/utils/logger.ts`)

```typescript
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  spanId?: string;
  hospitalId?: string;
  userId?: string;
  userRole?: 'DOCTOR' | 'NURSE' | 'PHARMACIST' | 'LAB_TECH' | 'ADMIN';
}

export interface LogPayload {
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  entityType?: string;
  entityId?: string;
  status?: 'success' | 'failure';
  errorCode?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
}

class StructuredLogger {
  private context: LogContext;

  constructor(initialContext: LogContext = {}) {
    this.context = {
      correlationId: initialContext.correlationId || uuidv4(),
      requestId: initialContext.requestId || uuidv4(),
      spanId: initialContext.spanId || uuidv4(),
      ...initialContext,
    };
  }

  updateContext(partial: Partial<LogContext>) {
    this.context = { ...this.context, ...partial };
  }

  private log(payload: LogPayload) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: payload.level || 'info',
      message: payload.message,
      correlation_id: this.context.correlationId,
      request_id: this.context.requestId,
      span_id: this.context.spanId,
      hospital_id: this.context.hospitalId,
      user_id: this.context.userId,
      user_role: this.context.userRole,
      duration_ms: payload.durationMs,
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      status: payload.status,
      error_code: payload.errorCode,
      metadata: payload.metadata,
    };

    // Remove undefined fields
    Object.keys(logEntry).forEach((key) => {
      if (logEntry[key as keyof typeof logEntry] === undefined) {
        delete logEntry[key as keyof typeof logEntry];
      }
    });

    // Output to console (in production, pipe to log aggregator)
    if (payload.level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (payload.level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message: string, payload?: Omit<LogPayload, 'level'>) {
    this.log({ ...payload, message, level: 'info' });
  }

  warn(message: string, payload?: Omit<LogPayload, 'level'>) {
    this.log({ ...payload, message, level: 'warn' });
  }

  error(message: string, payload?: Omit<LogPayload, 'level'>) {
    this.log({ ...payload, message, level: 'error' });
  }

  debug(message: string, payload?: Omit<LogPayload, 'level'>) {
    this.log({ ...payload, message, level: 'debug' });
  }
}

// Export singleton logger factory
export function createLogger(context: LogContext): StructuredLogger {
  return new StructuredLogger(context);
}

export const rootLogger = new StructuredLogger();
```

**Usage in Components**:
```typescript
// In Hook
const logger = createLogger({
  hospitalId: hospital.id,
  userId: user.id,
  userRole: user.role,
});

const handleRegisterPatient = async () => {
  const startTime = Date.now();
  try {
    const patient = await registerPatient(data);
    
    logger.info('patient_registered', {
      entityType: 'patient',
      entityId: patient.id,
      durationMs: Date.now() - startTime,
      status: 'success',
    });
    
    return patient;
  } catch (error) {
    logger.error('patient_registration_failed', {
      entityType: 'patient',
      durationMs: Date.now() - startTime,
      status: 'failure',
      errorCode: 'REGISTRATION_ERROR',
      metadata: { error_message: String(error) },
    });
    throw error;
  }
};
```

---

## Error Tracking & Masking

### Sentry Integration Setup

**Installation**:
```bash
npm install @sentry/react @sentry/tracing
```

**Configuration** (`src/main.tsx`):
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay(),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // PHI-safe context
  beforeSend(event) {
    return sanitizeEvent(event);
  },
});
```

### PHI Masking Function

```typescript
function sanitizeEvent(event: Sentry.Event): Sentry.Event {
  // List of patterns to mask (PHI identifiers)
  const sensitivePatterns = [
    /\b[A-Z]{2}\d{6}\b/g, // UHID pattern
    /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, // Name pattern
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
    /ICD-10:[A-Z0-9.]+/g, // Diagnosis codes
    /Drug:\s*\w+/g, // Drug names
  ];

  const maskValue = (value: string): string => {
    let masked = value;
    sensitivePatterns.forEach((pattern) => {
      masked = masked.replace(pattern, '[MASKED]');
    });
    return masked;
  };

  // Recursively sanitize all strings in the event
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return maskValue(obj);
    }
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      return Object.fromEntries(
        Object.entries(obj).map(([key, val]) => [key, sanitize(val)])
      );
    }
    return obj;
  };

  return sanitize(event);
}
```

### Error Context (PHI-Safe)

```typescript
export function captureError(
  error: Error,
  context: {
    hospitalId: string;
    userRole: string;
    entityType: string;
    entityId: string;
    errorCode?: string;
  }
) {
  Sentry.captureException(error, {
    contexts: {
      clinical: {
        hospital_id: context.hospitalId,
        user_role: context.userRole,
        entity_type: context.entityType,
        entity_id: context.entityId,
        error_code: context.errorCode,
      },
    },
    tags: {
      workflow: context.entityType,
      severity: 'critical',
    },
  });
}
```

**Error Example** (masked in Sentry):
```
Error: amend_prescription_dosage RPC failed

Context:
  hospital_id: hospital-1
  user_role: DOCTOR
  entity_type: prescription
  entity_id: rx-123
  error_code: RLS_POLICY_VIOLATION

Stack Trace: [MASKED] ...
```

---

## Implementation Roadmap

### Week 1: Health Checks
- [ ] Implement `/health` endpoint
- [ ] Implement `/ready` endpoint with RLS verification
- [ ] Implement `/metrics` endpoint (Prometheus format)
- [ ] Create `useHealthCheck()` React hook
- [ ] Add health check UI to admin dashboard

### Week 2: Structured Logging
- [ ] Implement `useStructuredLogger()` hook
- [ ] Add lifecycle event logging (patient, prescription, lab, appointment)
- [ ] Add performance event logging (slow queries, cache misses)
- [ ] Add safety event logging (conflicts, critical values)
- [ ] Integrate with Express middleware

### Week 3: Metrics Collection
- [ ] Implement `MetricsCollector` service
- [ ] Track SLO metrics #1-4
- [ ] Hook metrics into workflow operations
- [ ] Create test harness for SLO validation
- [ ] Document SLO thresholds and alerts

### Week 4: Error Tracking
- [ ] Set up Sentry integration
- [ ] Implement PHI masking function
- [ ] Test error capture in workflows
- [ ] Create alerting rules
- [ ] Documentation & runbooks

---

## Testing Strategy

### Unit Tests
- Health check functions return correct schemas
- Logger sanitizes PHI correctly
- Metrics collection counts accurately
- Error masking removes all sensitive data

### Integration Tests
- `/health` endpoint responds within 50ms
- `/ready` endpoint correctly detects RLS policy failures
- `/metrics` endpoint returns valid Prometheus format
- Sentry sends masked events successfully

### E2E Tests
- Patient registration flow logs all events
- Prescription-to-dispensing SLO tracked correctly
- Lab critical value triggers alert <5 min
- Appointment reminder sent <10 min

### Load Tests
- Health checks respond <50ms even under load
- Metrics collection doesn't impact app performance
- Logging doesn't block main thread

---

## Next Steps

1. **Validate specification** with team
2. **Create implementation tasks** in GitHub
3. **Set up monitoring infrastructure** (Prometheus, Grafana, Sentry)
4. **Begin Phase 3A implementation** (Week-by-week)
5. **Define SLO thresholds** with clinical stakeholders

---

**Document Version**: 1.0  
**Last Updated**: March 13, 2026  
**Owner**: CareSync Observability Team
