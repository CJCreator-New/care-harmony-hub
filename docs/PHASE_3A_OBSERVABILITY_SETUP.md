# Phase 3A: Observability Setup - Metrics, Logging & Error Tracking

**Status**: Complete Implementation Guide  
**Date**: March 13, 2026  
**Scope**: Metrics collection, structured logging, Sentry integration

---

## Table of Contents
1. [Metrics Collector Service](#metrics-collector-service)
2. [Structured Logging Implementation](#structured-logging-implementation)
3. [Sentry Error Tracking Setup](#sentry-error-tracking-setup)
4. [Integration Checklist](#integration-checklist)
5. [Production Monitoring](#production-monitoring)

---

## Metrics Collector Service

### Architecture Overview

```
React Component/Hook
        ↓
Metrics Reporter
    (captures events)
        ↓
MetricsCollector Service
    (aggregates in memory)
        ↓
GET /metrics Endpoint
   (Prometheus format)
        ↓
Prometheus Scraper
    (every 30 seconds)
        ↓
Grafana Dashboard
    (visualizes trends)
```

### MetricsCollector Implementation

```typescript
// src/services/metrics.ts
export interface HistogramBuckets {
  [key: number]: number; // le -> count
}

interface MetricsRegistry {
  gauges: Map<string, number>;
  counters: Map<string, number>;
  histograms: Map<string, Map<number, number>>;
}

export class MetricsCollector {
  private registry: MetricsRegistry = {
    gauges: new Map(),
    counters: new Map(),
    histograms: new Map(),
  };

  private readonly defaultHistogramBuckets = [
    0.05,  // 50ms
    0.1,   // 100ms
    0.25,  // 250ms
    0.5,   // 500ms
    1.0,   // 1s
    2.5,   // 2.5s
    5.0,   // 5s
    10.0,  // 10s
    30.0,  // 30s
    Infinity,
  ];

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    endpoint: string,
    status: number,
    durationMs: number
  ) {
    // Counter: http_requests_total
    const counterKey = `http_requests_total#${method}#${endpoint}#${status}`;
    this.registry.counters.set(
      counterKey,
      (this.registry.counters.get(counterKey) || 0) + 1
    );

    // Histogram: http_request_duration_seconds
    this.recordHistogram(
      `http_request_duration_seconds#${endpoint}`,
      durationMs / 1000
    );
  }

  /**
   * Record histogram value with automatic bucketing
   */
  private recordHistogram(name: string, value: number) {
    if (!this.registry.histograms.has(name)) {
      this.registry.histograms.set(name, new Map());
      
      // Initialize buckets
      for (const bucket of this.defaultHistogramBuckets) {
        this.registry.histograms.get(name)!.set(bucket, 0);
      }
    }

    const buckets = this.registry.histograms.get(name)!;
    for (const bucket of this.defaultHistogramBuckets) {
      if (value <= bucket) {
        buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
      }
    }
  }

  /**
   * SLO 1: Patient Registration → First Appointment Latency
   */
  recordRegistrationToAppointmentLatency(seconds: number) {
    this.recordHistogram('registration_to_appointment_latency_seconds', seconds);
  }

  /**
   * SLO 2: Prescription → Dispensing Latency
   */
  recordPrescriptionToDispensingLatency(seconds: number) {
    this.recordHistogram('prescription_to_dispensing_latency_seconds', seconds);
  }

  /**
   * SLO 3: Lab Critical Alert Latency
   */
  recordLabCriticalAlertLatency(seconds: number) {
    this.recordHistogram('lab_critical_alert_latency_seconds', seconds);
  }

  /**
   * SLO 4: Appointment → Reminder Latency
   */
  recordAppointmentToReminderLatency(seconds: number) {
    this.recordHistogram('appointment_to_reminder_latency_seconds', seconds);
  }

  /**
   * Track cache hit rate (TanStack Query)
   */
  setCacheHitRatio(ratio: number) {
    this.registry.gauges.set('cache_hit_ratio', Math.min(ratio, 1.0));
  }

  /**
   * Track active users by role
   */
  setActiveUsersByRole(role: string, count: number) {
    this.registry.gauges.set(`active_users#${role}`, count);
  }

  /**
   * Phase 2A: Prescription amendments counter
   */
  incrementPrescriptionAmendments(count: number = 1) {
    const key = 'prescription_amendment_count';
    this.registry.counters.set(key, (this.registry.counters.get(key) || 0) + count);
  }

  /**
   * Audit trail counter
   */
  incrementAuditRecords(count: number = 1) {
    const key = 'audit_records_created';
    this.registry.counters.set(key, (this.registry.counters.get(key) || 0) + count);
  }

  /**
   * Medication interaction alerts
   */
  incrementMedicationConflicts(count: number = 1) {
    const key = 'medication_conflict_detected_total';
    this.registry.counters.set(key, (this.registry.counters.get(key) || 0) + count);
  }

  /**
   * Critical lab values
   */
  incrementCriticalLabValues(count: number = 1) {
    const key = 'critical_lab_values_total';
    this.registry.counters.set(key, (this.registry.counters.get(key) || 0) + count);
  }

  /**
   * Export metrics in Prometheus format
   */
  export(): string {
    const lines: string[] = [];

    // App up
    lines.push('# HELP app_up Application is up (1 = up, 0 = down)');
    lines.push('# TYPE app_up gauge');
    lines.push('app_up 1\n');

    // HTTP requests total
    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const [key, value] of this.registry.counters) {
      if (key.startsWith('http_requests_total')) {
        const [, method, endpoint, status] = key.split('#');
        lines.push(
          `http_requests_total{method="${method}",endpoint="${endpoint}",status="${status}"} ${value}`
        );
      }
    }
    lines.push('');

    // HTTP request duration histograms
    lines.push('# HELP http_request_duration_seconds Request latency in seconds');
    lines.push('# TYPE http_request_duration_seconds histogram');
    for (const [name, buckets] of this.registry.histograms) {
      if (name.startsWith('http_request_duration_seconds')) {
        const endpoint = name.split('#')[1];
        
        let sum = 0;
        let total = 0;
        const bucketValues = Array.from(buckets.values());
        
        for (const bucket of this.defaultHistogramBuckets) {
          const count = buckets.get(bucket) || 0;
          lines.push(
            `http_request_duration_seconds_bucket{endpoint="${endpoint}",le="${bucket === Infinity ? '+Inf' : bucket}"} ${count}`
          );
          sum += (bucket === Infinity ? 0 : bucket) * (count - total);
          total = count;
        }
        
        lines.push(`http_request_duration_seconds_sum{endpoint="${endpoint}"} ${sum}`);
        lines.push(`http_request_duration_seconds_count{endpoint="${endpoint}"} ${total}`);
      }
    }
    lines.push('');

    // Cache hit ratio
    if (this.registry.gauges.has('cache_hit_ratio')) {
      lines.push('# HELP cache_hit_ratio TanStack Query cache hit rate (0-1)');
      lines.push('# TYPE cache_hit_ratio gauge');
      lines.push(`cache_hit_ratio ${this.registry.gauges.get('cache_hit_ratio')}`);
      lines.push('');
    }

    // Active users by role
    lines.push('# HELP active_users Number of active users by role');
    lines.push('# TYPE active_users gauge');
    for (const [key, value] of this.registry.gauges) {
      if (key.startsWith('active_users')) {
        const role = key.split('#')[1];
        lines.push(`active_users{role="${role}"} ${value}`);
      }
    }
    lines.push('');

    // SLO Histograms
    const sloMetrics = [
      ['registration_to_appointment_latency_seconds', 'Patient registration to first appointment latency (seconds)'],
      ['prescription_to_dispensing_latency_seconds', 'Prescription creation to dispensing latency (seconds)'],
      ['lab_critical_alert_latency_seconds', 'Lab critical value to notification latency (seconds)'],
      ['appointment_to_reminder_latency_seconds', 'Appointment confirmation to reminder latency (seconds)'],
    ];

    for (const [metricName, help] of sloMetrics) {
      if (this.registry.histograms.has(metricName)) {
        lines.push(`# HELP ${metricName} ${help}`);
        lines.push(`# TYPE ${metricName} histogram`);
        
        const buckets = this.registry.histograms.get(metricName)!;
        let sum = 0;
        let total = 0;

        for (const bucket of this.defaultHistogramBuckets) {
          const count = buckets.get(bucket) || 0;
          lines.push(
            `${metricName}_bucket{le="${bucket === Infinity ? '+Inf' : bucket}"} ${count}`
          );
          sum += (bucket === Infinity ? 0 : bucket) * (count - total);
          total = count;
        }

        lines.push(`${metricName}_sum ${sum}`);
        lines.push(`${metricName}_count ${total}`);
        lines.push('');
      }
    }

    // Safety counters
    lines.push('# HELP prescription_amendment_count Total prescription amendments (Phase 2A)');
    lines.push('# TYPE prescription_amendment_count counter');
    lines.push(
      `prescription_amendment_count ${this.registry.counters.get('prescription_amendment_count') || 0}`
    );
    lines.push('');

    lines.push('# HELP audit_records_created Total audit trail entries created');
    lines.push('# TYPE audit_records_created counter');
    lines.push(
      `audit_records_created ${this.registry.counters.get('audit_records_created') || 0}`
    );
    lines.push('');

    lines.push('# HELP medication_conflict_detected_total Medication interaction conflicts detected');
    lines.push('# TYPE medication_conflict_detected_total counter');
    lines.push(
      `medication_conflict_detected_total ${this.registry.counters.get('medication_conflict_detected_total') || 0}`
    );
    lines.push('');

    lines.push('# HELP critical_lab_values_total Critical lab values detected');
    lines.push('# TYPE critical_lab_values_total counter');
    lines.push(
      `critical_lab_values_total ${this.registry.counters.get('critical_lab_values_total') || 0}`
    );

    return lines.join('\n');
  }
}

// Global singleton
export const metricsCollector = new MetricsCollector();
```

### Express Endpoint

```typescript
// src/middleware/metrics.ts
import { Request, Response } from 'express';
import { metricsCollector } from '../services/metrics';

export function getMetricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metricsCollector.export());
}

// Middleware to record HTTP metrics
export function recordHttpMetrics(req: Request, res: Response, next: Function) {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const endpoint = req.route?.path || req.path;
    
    // Don't record /metrics endpoint itself (would create feedback loop)
    if (endpoint !== '/metrics') {
      metricsCollector.recordHttpRequest(
        req.method,
        endpoint,
        res.statusCode,
        durationMs
      );
    }
  });

  next();
}
```

### Register in Express App

```typescript
// src/server.ts
import express from 'express';
import { recordHttpMetrics, getMetricsEndpoint } from './middleware/metrics';

const app = express();

// Record metrics for all HTTP requests
app.use(recordHttpMetrics);

// Metrics endpoint (no auth required)
app.get('/metrics', getMetricsEndpoint);

app.listen(3000);
```

---

## Structured Logging Implementation

### Logger Service

```typescript
// src/utils/logger.ts
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  spanId?: string;
  hospitalId?: string;
  userId?: string;
  userRole?: 'DOCTOR' | 'NURSE' | 'PHARMACIST' | 'LAB_TECH' | 'ADMIN' | 'RECEPTIONIST';
}

interface LogPayload {
  message: string;
  level?: 'info' | 'warn' | 'error' | 'debug';
  entityType?: string;
  entityId?: string;
  status?: 'success' | 'failure';
  errorCode?: string;
  durationMs?: number;
  metadata?: Record<string, any>;
}

interface StructuredLogEntry {
  timestamp: string;
  level: string;
  message: string;
  correlation_id: string;
  request_id: string;
  span_id: string;
  hospital_id?: string;
  user_id?: string;
  user_role?: string;
  duration_ms?: number;
  entity_type?: string;
  entity_id?: string;
  status?: string;
  error_code?: string;
  metadata?: Record<string, any>;
}

export class StructuredLogger {
  private context: Required<LogContext>;

  constructor(initialContext: LogContext = {}) {
    this.context = {
      correlationId: initialContext.correlationId || uuidv4(),
      requestId: initialContext.requestId || uuidv4(),
      spanId: initialContext.spanId || uuidv4(),
      hospitalId: initialContext.hospitalId || 'unknown',
      userId: initialContext.userId || 'anonymous',
      userRole: initialContext.userRole || 'ADMIN',
    };
  }

  /**
   * Update context (e.g., when user authenticates mid-request)
   */
  updateContext(partial: Partial<LogContext>) {
    this.context = { ...this.context, ...partial };
  }

  /**
   * Generate child context with new span ID
   */
  createSpan(operationName: string): StructuredLogger {
    const childLogger = new StructuredLogger({
      ...this.context,
      spanId: uuidv4(),
    });
    
    childLogger.debug(`Starting span: ${operationName}`);
    return childLogger;
  }

  /**
   * Core logging method
   */
  private log(payload: LogPayload) {
    // Clean numeric and boolean fields
    const cleanField = (value: any) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'string' && value.length === 0) return undefined;
      return value;
    };

    const logEntry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: payload.level || 'info',
      message: payload.message,
      correlation_id: this.context.correlationId,
      request_id: this.context.requestId,
      span_id: this.context.spanId,
      hospital_id: this.context.hospitalId !== 'unknown' ? this.context.hospitalId : undefined,
      user_id: this.context.userId !== 'anonymous' ? this.context.userId : undefined,
      user_role: this.context.userRole,
      duration_ms: cleanField(payload.durationMs),
      entity_type: payload.entityType,
      entity_id: payload.entityId,
      status: payload.status,
      error_code: payload.errorCode,
      metadata: cleanField(payload.metadata),
    };

    // Send to console (in production, ship to log aggregator)
    const output = JSON.stringify(logEntry);

    if (payload.level === 'error') {
      console.error(output);
      // In production: send to error monitoring (Sentry, etc)
    } else if (payload.level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }

    // Also ship to observability backend
    this.shipLog(logEntry);
  }

  /**
   * Ship to observability backend (placeholder)
   */
  private shipLog(entry: StructuredLogEntry) {
    // In production:
    // - Send to CloudWatch, DataDog, ELK, Loki, etc.
    // - Use batching to avoid overwhelming the network
    // - Implement circuit breaker pattern
  }

  // Public log methods

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

// Global root logger
export const rootLogger = new StructuredLogger({
  hospitalId: process.env.DEFAULT_HOSPITAL_ID,
});

/**
 * Factory function for creating loggers
 */
export function createLogger(context: LogContext): StructuredLogger {
  return new StructuredLogger(context);
}
```

### Lifecycle Event Logging

```typescript
// src/utils/lifecycle-events.ts
import { StructuredLogger } from './logger';
import { metricsCollector } from '../services/metrics';

export class LifecycleEventLogger {
  constructor(private logger: StructuredLogger) {}

  /**
   * Log patient registration
   */
  async logPatientRegistered(patientId: string, source: string) {
    const startTime = Date.now();
    
    this.logger.info('patient_registered', {
      entityType: 'patient',
      entityId: patientId,
      status: 'success',
      metadata: {
        registration_source: source, // 'mobile' | 'web' | 'in-person'
      },
    });

    // No metrics for registration (it's an event, not a timed operation)
  }

  /**
   * Log prescription created
   */
  async logPrescriptionCreated(
    prescriptionId: string,
    drugCount: number,
    durationMs: number
  ) {
    this.logger.info('prescription_created', {
      entityType: 'prescription',
      entityId: prescriptionId,
      status: 'success',
      durationMs,
      metadata: {
        drug_count: drugCount,
      },
    });
  }

  /**
   * Log lab order created
   */
  async logLabOrderCreated(
    labOrderId: string,
    testTypes: string[],
    durationMs: number
  ) {
    this.logger.info('lab_order_created', {
      entityType: 'lab_order',
      entityId: labOrderId,
      status: 'success',
      durationMs,
      metadata: {
        test_types: testTypes,
        test_count: testTypes.length,
      },
    });
  }

  /**
   * Log lab result with critical flag
   */
  async logLabResultRecorded(
    labResultId: string,
    testType: string,
    value: number,
    isCritical: boolean,
    durationMs: number
  ) {
    this.logger.info('lab_result_recorded', {
      entityType: 'lab_result',
      entityId: labResultId,
      status: 'success',
      durationMs,
      metadata: {
        test_type: testType,
        value,
        is_critical: isCritical,
      },
    });

    if (isCritical) {
      metricsCollector.incrementCriticalLabValues(1);
    }
  }

  /**
   * Log appointment confirmed
   */
  async logAppointmentConfirmed(
    appointmentId: string,
    reminderMethod: string,
    durationMs: number
  ) {
    this.logger.info('appointment_confirmed', {
      entityType: 'appointment',
      entityId: appointmentId,
      status: 'success',
      durationMs,
      metadata: {
        reminder_method: reminderMethod, // 'SMS' | 'EMAIL' | 'NONE'
      },
    });
  }

  /**
   * Log prescription amendment (Phase 2A)
   */
  async logPrescriptionAmended(
    prescriptionId: string,
    amendmentType: string,
    durationMs: number
  ) {
    this.logger.info('prescription_amended', {
      entityType: 'prescription',
      entityId: prescriptionId,
      status: 'success',
      durationMs,
      metadata: {
        amendment_type: amendmentType, // 'DOSAGE' | 'FREQUENCY' | 'DRUG' | etc
      },
    });

    metricsCollector.incrementPrescriptionAmendments(1);
  }

  /**
   * Log audit record created
   */
  async logAuditRecordCreated(
    auditId: string,
    action: string,
    resourceType: string
  ) {
    this.logger.debug('audit_record_created', {
      entityType: 'audit_record',
      entityId: auditId,
      metadata: {
        action,
        resource_type: resourceType,
      },
    });

    metricsCollector.incrementAuditRecords(1);
  }
}
```

### Performance Event Logging

```typescript
// src/utils/performance-events.ts
export class PerformanceEventLogger {
  constructor(private logger: StructuredLogger) {}

  /**
   * Log slow database query
   */
  logSlowQuery(queryType: string, durationMs: number, rowsReturned: number, filtersApplied: number) {
    if (durationMs > 1000) { // Alert if > 1 second
      this.logger.warn('query_slow', {
        durationMs,
        metadata: {
          query_type: queryType,
          rows_returned: rowsReturned,
          filters_applied: filtersApplied,
          threshold_ms: 1000,
        },
      });
    }
  }

  /**
   * Log high cache miss rate
   */
  logCacheMissRate(missRate: number, threshold: number = 0.30) {
    if (missRate > threshold) {
      this.logger.warn('cache_miss_rate_high', {
        metadata: {
          miss_rate: missRate.toFixed(3),
          threshold: threshold.toFixed(3),
          action: 'consider pre-warming cache',
        },
      });
    }
  }

  /**
   * Log slow RLS policy check
   */
  logRLSPolicySlow(durationMs: number, hospitalId: string) {
    if (durationMs > 500) {
      this.logger.warn('rls_policy_slow', {
        hospitalId,
        durationMs,
        metadata: {
          policy_check: 'hospital_id_scoping',
          expected_max_ms: 500,
        },
      });
    }
  }

  /**
   * Log N+1 query detection
   */
  logNPlusOneDetected(baseQuery: string, repeatQueryCount: number) {
    this.logger.warn('n_plus_one_query_detected', {
      metadata: {
        base_query: baseQuery,
        repeat_count: repeatQueryCount,
        recommendation: 'consider batch loading or JOIN',
      },
    });
  }
}
```

### Safety Event Logging

```typescript
// src/utils/safety-events.ts
export class SafetyEventLogger {
  constructor(private logger: StructuredLogger) {}

  /**
   * Log medication interaction conflict
   */
  logMedicationConflict(
    prescriptionId: string,
    conflict: { drug1: string; drug2: string; severity: string }
  ) {
    this.logger.error('medication_conflict_detected', {
      entityType: 'prescription',
      entityId: prescriptionId,
      status: 'failure',
      errorCode: 'DRUG_INTERACTION',
      metadata: {
        conflicting_drugs: [conflict.drug1, conflict.drug2],
        severity: conflict.severity,
      },
    });

    metricsCollector.incrementMedicationConflicts(1);
  }

  /**
   * Log critical lab value
   */
  logCriticalLabValue(
    labResultId: string,
    testType: string,
    value: number,
    normalRange: string
  ) {
    this.logger.error('critical_lab_value_detected', {
      entityType: 'lab_result',
      entityId: labResultId,
      metadata: {
        test_type: testType,
        value,
        normal_range: normalRange,
        action: 'physician_notified',
      },
    });
  }

  /**
   * Log prescription refusal (age, pregnancy, allergy, etc.)
   */
  logPrescriptionRefused(
    prescriptionId: string,
    reason: string,
    details: Record<string, any>
  ) {
    this.logger.error('prescription_refused', {
      entityType: 'prescription',
      entityId: prescriptionId,
      status: 'failure',
      errorCode: 'POLICY_VIOLATION',
      metadata: {
        refusal_reason: reason,
        ...details,
      },
    });
  }

  /**
   * Log RLS policy violation (data access violation)
   */
  logRLSViolation(
    action: string,
    resourceType: string,
    resourceId: string,
    attemptedHospitalId: string,
    userHospitalId: string
  ) {
    this.logger.error('rls_policy_violation_prevented', {
      status: 'failure',
      errorCode: 'RLS_POLICY_VIOLATION',
      metadata: {
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        attempted_hospital_id: attemptedHospitalId,
        user_hospital_id: userHospitalId,
      },
    });
  }

  /**
   * Log prescription amendment beyond medical bounds
   */
  logInvalidAmendment(
    prescriptionId: string,
    amendmentType: string,
    reason: string
  ) {
    this.logger.error('invalid_prescription_amendment', {
      entityType: 'prescription',
      entityId: prescriptionId,
      status: 'failure',
      errorCode: 'AMENDMENT_VIOLATION',
      metadata: {
        amendment_type: amendmentType,
        reason,
      },
    });
  }
}
```

### Creating Loggers in React Hooks

```typescript
// src/hooks/useLifecycleLogger.ts
import { useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import { createLogger } from '../utils/logger';
import { LifecycleEventLogger } from '../utils/lifecycle-events';

export function useLifecycleLogger() {
  const auth = useContext(AuthContext);
  
  const logger = useMemo(() => {
    const structuredLogger = createLogger({
      hospitalId: auth?.hospital?.id,
      userId: auth?.user?.id,
      userRole: auth?.user?.role,
    });
    
    return new LifecycleEventLogger(structuredLogger);
  }, [auth?.hospital?.id, auth?.user?.id, auth?.user?.role]);

  return logger;
}

// Usage in component
export function PatientRegistrationForm() {
  const lifecycleLogger = useLifecycleLogger();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (data: PatientData) => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Registration failed');

      const patient = await response.json();
      const durationMs = Date.now() - startTime;

      await lifecycleLogger.logPatientRegistered(patient.id, 'web');

      return patient;
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleRegister(formData);
    }}>
      {/* Form fields */}
    </form>
  );
}
```

---

## Sentry Error Tracking Setup

### Installation & Configuration

```bash
npm install @sentry/react @sentry/tracing
```

### Initialize in main.tsx

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import App from './App';

// Initialize Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions in dev
  integrations: [
    new BrowserTracing(),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of errors
  
  // PHI Masking
  beforeSend(event, hint) {
    return sanitizeSentryEvent(event);
  },
  
  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Random plugins/extensions
    'chrome-extension://',
    'moz-extension://',
  ],
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
```

### PHI Sanitization

```typescript
// src/utils/sentry-sanitizer.ts
import * as Sentry from '@sentry/react';

/**
 * Patterns that match PHI (Protected Health Information)
 */
const PHI_PATTERNS = [
  // UHID pattern (e.g., AP123456)
  { pattern: /\b[A-Z]{2}\d{6}\b/g, replacement: '[UHID]' },
  
  // Patient names (common patterns)
  { pattern: /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g, replacement: '[NAME]' },
  
  // SSN-like pattern
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' },
  
  // ICD-10 diagnosis codes
  { pattern: /ICD-10:[A-Z0-9.]+/g, replacement: '[DIAGNOSIS]' },
  
  // Drug names (flagged with "Drug:" prefix)
  { pattern: /Drug:\s*\w+/g, replacement: '[DRUG]' },
  
  // Phone numbers
  { pattern: /\+?1?\d{7,14}/g, replacement: '[PHONE]' },
  
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
];

/**
 * Recursively sanitize all strings in an object
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    let sanitized = value;
    for (const { pattern, replacement } of PHI_PATTERNS) {
      sanitized = sanitized.replace(pattern, replacement);
    }
    return sanitized;
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (value !== null && typeof value === 'object') {
    const sanitized: any = {};
    for (const [key, val] of Object.entries(value)) {
      // Also sanitize keys (e.g., "patient_name": "...")
      const sanitizedKey = sanitizeValue(key);
      sanitized[sanitizedKey] = sanitizeValue(val);
    }
    return sanitized;
  }
  
  return value;
}

/**
 * Sanitize entire Sentry event
 */
export function sanitizeSentryEvent(event: Sentry.Event): Sentry.Event | null {
  // Remove sensitive fields entirely
  const sanitized = { ...event };
  
  // Sanitize message
  if (sanitized.message) {
    sanitized.message = sanitizeValue(sanitized.message);
  }
  
  // Sanitize exception messages
  if (sanitized.exception) {
    sanitized.exception.values?.forEach((exception) => {
      if (exception.value) {
        exception.value = sanitizeValue(exception.value);
      }
    });
  }
  
  // Sanitize breadcrumbs
  if (sanitized.breadcrumbs) {
    sanitized.breadcrumbs = sanitized.breadcrumbs.map((breadcrumb) => ({
      ...breadcrumb,
      message: breadcrumb.message ? sanitizeValue(breadcrumb.message) : undefined,
      data: breadcrumb.data ? sanitizeValue(breadcrumb.data) : undefined,
    }));
  }
  
  // Sanitize contexts
  if (sanitized.contexts) {
    sanitized.contexts = sanitizeValue(sanitized.contexts);
  }
  
  // Sanitize tags (keep as-is, should be non-PHI)
  // Sanitize extra context
  if (sanitized.extra) {
    sanitized.extra = sanitizeValue(sanitized.extra);
  }
  
  return sanitized;
}

/**
 * Capture error with clinical context
 */
export function captureClinicallySafeError(
  error: Error,
  context: {
    hospitalId?: string;
    userRole?: string;
    entityType?: string;
    entityId?: string;
    operationType?: string;
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
        operation_type: context.operationType,
      },
    },
    tags: {
      entity_type: context.entityType,
      error_code: context.errorCode,
      severity: determineErrorSeverity(context.errorCode),
    },
  });
}

/**
 * Determine error severity for alerting
 */
function determineErrorSeverity(errorCode?: string): string {
  const criticalCodes = [
    'RLS_POLICY_VIOLATION',
    'PRESCRIPTION_WORKFLOW_FAILURE',
    'CRITICAL_LAB_UNNOTIFIED',
    'MEDICATION_CONFLICT',
  ];
  
  if (criticalCodes.includes(errorCode || '')) {
    return 'critical';
  }
  
  const warnCodes = [
    'SLOW_QUERY',
    'HIGH_CACHE_MISS',
    'RLS_POLICY_SLOW',
  ];
  
  if (warnCodes.includes(errorCode || '')) {
    return 'warning';
  }
  
  return 'info';
}
```

### Error Boundary Component

```typescript
// src/components/ErrorBoundary.tsx
import * as Sentry from '@sentry/react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Capture to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-6 bg-red-50 border border-red-200 rounded">
            <h2 className="text-red-800 font-bold mb-2">Something went wrong</h2>
            <p className="text-red-700 text-sm mb-4">Our team has been notified. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Functional wrapper
export function ErrorBoundaryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

---

## Integration Checklist

### Backend Setup
- [ ] Create `src/services/metrics.ts` with `MetricsCollector` class
- [ ] Create `src/middleware/metrics.ts` with `recordHttpMetrics` middleware
- [ ] Register `/metrics` endpoint in Express app
- [ ] Test metrics endpoint: `curl http://localhost:3000/metrics`

### Logging Setup
- [ ] Create `src/utils/logger.ts` with `StructuredLogger` class
- [ ] Create `src/utils/lifecycle-events.ts` for patient/prescription/lab events
- [ ] Create `src/utils/performance-events.ts` for slow query detection
- [ ] Create `src/utils/safety-events.ts` for medication conflicts, RLS violations
- [ ] Create `src/hooks/useLifecycleLogger.ts` for React integration
- [ ] Update existing API endpoints to log lifecycle events

### Error Tracking Setup
- [ ] Install Sentry packages: `npm install @sentry/react @sentry/tracing`
- [ ] Create `src/utils/sentry-sanitizer.ts` with PHI masking
- [ ] Initialize Sentry in `src/main.tsx`
- [ ] Create `src/components/ErrorBoundary.tsx` for React error capture
- [ ] Set `VITE_SENTRY_DSN` in `.env`

### SLO Tracking
- [ ] Hook metrics collection into patient registration flow
- [ ] Hook metrics collection into prescription-dispensing flow
- [ ] Hook metrics collection into lab critical alert flow
- [ ] Hook metrics collection into appointment reminder flow
- [ ] Create test harness for SLO validation

### Monitoring Setup
- [ ] Set up Prometheus scraper (point to `/metrics` endpoint)
- [ ] Create Prometheus alert rules for SLO thresholds
- [ ] Create Grafana dashboards for each role
- [ ] Configure Sentry project (from UI)
- [ ] Set Sentry alert rules for critical errors

---

## Production Monitoring

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 30s
  evaluation_interval: 15s
  external_labels:
    cluster: 'caresync-prod'
    region: 'us-east-1'

scrape_configs:
  - job_name: 'caresync-api'
    static_configs:
      - targets: ['api.caresync.com:3000']
    metrics_path: '/metrics'
    scheme: 'https'
    basic_auth:
      username: 'prometheus'
      password: '${PROMETHEUS_PASSWORD}'
```

### Alert Rules

```yaml
# alert-rules.yml
groups:
  - name: clinical_slos
    interval: 30s
    rules:
      - alert: RegistrationAppointmentLatency
        expr: histogram_quantile(0.95, registration_to_appointment_latency_seconds) > 1800
        for: 5m
        annotations:
          severity: warning
          summary: "Patient registration → appointment >30 min"
          action: "Contact intake supervisor"

      - alert: PrescriptionDispensingLatency
        expr: histogram_quantile(0.95, prescription_to_dispensing_latency_seconds) > 900
        for: 5m
        annotations:
          severity: warning
          summary: "Prescription dispensing >15 min"
          action: "Contact pharmacy manager"

      - alert: CriticalLabAlertLatency
        expr: histogram_quantile(0.95, lab_critical_alert_latency_seconds) > 300
        for: 1m
        annotations:
          severity: critical
          summary: "Critical lab alert >5 minutes"
          action: "Escalate to chief medical officer"

      - alert: CriticalLabWithoutAlert
        expr: increase(critical_lab_values_without_alert_total[5m]) > 0
        annotations:
          severity: critical
          summary: "Critical lab value without timely alert"
          action: "Immediate escalation"
```

---

**Document Version**: 1.0  
**Last Updated**: March 13, 2026
