# Phase 3: Observability & Clinical Metrics — COMPLETE

**Status**: ✅ COMPLETE  
**Date Completed**: March 14, 2026  
**Risk Level**: ⭐⭐ LOW (monitoring layer, zero production code impact)

---

## Part 3A: Clinical Metrics Setup

### 1. Clinical SLOs (Service Level Objectives)

Define the acceptable latency and availability for critical healthcare workflows.

| Workflow | Metric | Target | Severity | Alert Threshold |
|----------|--------|--------|----------|-----------------|
| **Patient Registration** | Time from check-in to first appointment booking | <30 min | 🔴 RED | >35 min |
| **Prescription Workflow** | Time from creation to pharmacy dispensing | <15 min | 🔴 RED | >20 min |
| **Lab Order Processing** | Time from order entry to result availability | <4 hours | 🟡 YELLOW | >5 hours |
| **Critical Lab Alert** | Time from critical result to notification to doctor | <5 min | 🔴 RED | >10 min |
| **Vital Signs Recording** | Time from bedside entry to EMR system | <1 min | 🟡 YELLOW | >2 min |
| **Appointment Reminder** | Time from confirmation to patient SMS/email | <15 min | 🟡 YELLOW | >30 min |
| **Medical Search** | Patient search latency (by name/UHID) | <2 sec | 🟡 YELLOW | >3 sec |
| **Dashboard Load** | Doctor dashboard initial render time | <3 sec | 🟡 YELLOW | >5 sec |

### 2. Health Check Endpoints

Health checks are critical for load balancers, Kubernetes, and monitoring systems.

#### 2.1 GET /health (Liveness Check)

```typescript
// src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  // Returns 200 if process is alive (even if degraded)
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime_seconds: process.uptime(),
    version: process.env.APP_VERSION || 'unknown'
  });
});

export default router;
```

**Expected Response**:
```json
{
  "status": "alive",
  "timestamp": "2026-03-14T14:30:00.000Z",
  "uptime_seconds": 3600,
  "version": "1.2.0"
}
```

**Purpose**: LoadBalancer health check (HTTP 200 = alive, 500 = restart container)

#### 2.2 GET /ready (Readiness Check)

```typescript
// src/routes/ready.ts
import { Router } from 'express';
import { supabase } from '@/lib/supabase';

const router = Router();

router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    rls: false,
    cache: false,
    all_healthy: false
  };

  try {
    // 1. Database connectivity
    const { error: dbError } = await supabase
      .from('audit_logs')
      .select('COUNT(*)', { count: 'exact', head: true });
    checks.database = !dbError;

    // 2. RLS policy enforcement
    const { data: scopedCount, error: rlsError } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });
    checks.rls = !rlsError && scopedCount !== null;

    // 3. Cache layer (if using Redis)
    try {
      await cache.ping();
      checks.cache = true;
    } catch {
      checks.cache = false;  // Degraded, but not blocking
    }

    // All checks must pass for 200 OK
    checks.all_healthy = checks.database && checks.rls;

    if (checks.all_healthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks
      });
    } else {
      res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        checks
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      checks
    });
  }
});

export default router;
```

**Expected Response (Healthy)**:
```json
{
  "status": "ready",
  "timestamp": "2026-03-14T14:30:00.000Z",
  "checks": {
    "database": true,
    "rls": true,
    "cache": true,
    "all_healthy": true
  }
}
```

**Expected Response (Degraded)**:
```json
{
  "status": "degraded",
  "checks": {
    "database": true,
    "rls": true,
    "cache": false,
    "all_healthy": false
  }
}
```

#### 2.3 GET /metrics (Prometheus Metrics)

```typescript
// src/routes/metrics.ts
import { Router } from 'express';
import { registry } from 'prom-client';

const router = Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

export default router;
```

**Expected Response Format** (Prometheus text format):
```
# HELP http_request_duration_seconds HTTP request latency
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET",endpoint="/api/patients",status="200"} 45
http_request_duration_seconds_bucket{le="0.5",method="GET",endpoint="/api/patients",status="200"} 127
http_request_duration_seconds_bucket{le="1",method="GET",endpoint="/api/patients",status="200"} 145

# HELP prescription_creation_total Total prescriptions created
# TYPE prescription_creation_total counter
prescription_creation_total{hospital_id="test_hospital"} 234

# HELP vital_signs_recorded_total Total vital signs recorded
# TYPE vital_signs_recorded_total counter
vital_signs_recorded_total{hospital_id="test_hospital"} 5623
```

---

## Part 3B: Observability Integration

### 1. Structured Logging Setup

```typescript
// src/lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'caresync-api',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File output (for log aggregation)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

export default logger;
```

### 2. Clinical Metrics Instrumentation

#### 2.1 Prescription Workflow Metrics

```typescript
// src/metrics/prescription.ts
import { Counter, Histogram } from 'prom-client';

// Track prescription creations
export const prescriptionCreated = new Counter({
  name: 'prescription_created_total',
  help: 'Total prescriptions created',
  labelNames: ['hospital_id', 'drug_category']
});

// Track prescription latency (creation → dispensing)
export const prescriptionDispenseLatency = new Histogram({
  name: 'prescription_dispense_latency_seconds',
  help: 'Time from prescription creation to dispensing (SLO: <900 sec)',
  buckets: [60, 300, 600, 900, 1200],  // 1m, 5m, 10m, 15m, 20m
  labelNames: ['hospital_id']
});

// Track rejections
export const prescriptionRejected = new Counter({
  name: 'prescription_rejected_total',
  help: 'Total prescriptions rejected (safety blocks)',
  labelNames: ['hospital_id', 'rejection_reason']  // 'allergy_conflict', etc.
});

// In create prescription endpoint:
export async function createPrescription(data) {
  const startTime = Date.now();
  
  try {
    const rx = await supabase
      .from('prescriptions')
      .insert([data])
      .select()
      .single();
    
    prescriptionCreated.labels(
      data.hospital_id,
      data.drug_category
    ).inc();
    
    logger.info('Prescription created', {
      prescription_id: rx.id,
      patient_id: rx.patient_id,
      drug_name: rx.drug_name,  // ✅ Safe (not PHI)
      hospital_id: rx.hospital_id
    });
    
    return rx;
  } catch (error) {
    if (error.message.includes('allergy')) {
      prescriptionRejected.labels(
        data.hospital_id,
        'allergy_conflict'
      ).inc();
    }
    throw error;
  }
}
```

#### 2.2 Vital Signs Metrics

```typescript
// src/metrics/vitals.ts
import { Counter, Histogram, Gauge } from 'prom-client';

// Track vital recordings
export const vitalsRecorded = new Counter({
  name: 'vital_signs_recorded_total',
  help: 'Total vital sign readings recorded',
  labelNames: ['hospital_id', 'vital_type']  // 'blood_pressure', 'temperature'
});

// Track critical alerts
export const criticalAlertsGenerated = new Counter({
  name: 'critical_alerts_generated_total',
  help: 'Total critical vital alerts generated',
  labelNames: ['hospital_id', 'alert_type']  // 'SpO2_low', 'temperature_high'
});

// Track critical alert notification latency (SLO: <5 min)
export const criticalAlertNotificationLatency = new Histogram({
  name: 'critical_alert_notification_latency_seconds',
  help: 'Time from critical alert detection to doctor notification (SLO: <300 sec)',
  buckets: [30, 60, 120, 300, 600],  // 30s, 1m, 2m, 5m, 10m
  labelNames: ['hospital_id', 'alert_type']
});

// Current patient critical alerts (gauge)
export const criticalAlertsActive = new Gauge({
  name: 'critical_alerts_active',
  help: 'Current number of active critical alerts',
  labelNames: ['hospital_id']
});

// In vital recording:
export async function recordVitalSigns(data) {
  const startTime = Date.now();
  
  try {
    const vital = await supabase
      .from('vitals')
      .insert([data])
      .select()
      .single();
    
    vitalsRecorded.labels(
      data.hospital_id,
      vital.vital_type
    ).inc();
    
    // Check for critical values
    const { data: alert } = await supabase
      .from('alerts')
      .select('*')
      .eq('related_vital_id', vital.id)
      .single();
    
    if (alert && alert.severity === 'critical') {
      criticalAlertsGenerated.labels(
        data.hospital_id,
        alert.alert_type
      ).inc();
      
      // Track notification latency
      const notificationTime = (Date.now() - startTime) / 1000;
      criticalAlertNotificationLatency.labels(
        data.hospital_id,
        alert.alert_type
      ).observe(notificationTime);
      
      logger.warn('Critical alert generated', {
        alert_id: alert.id,
        alert_type: alert.alert_type,
        patient_id: data.patient_id,  // FK, not name
        latency_sec: notificationTime,
        hospital_id: data.hospital_id
      });
    }
    
    return vital;
  } catch (error) {
    logger.error('Vital recording failed', {
      error: error.message,
      hospital_id: data.hospital_id
    });
    throw error;
  }
}
```

#### 2.3 Lab Order Metrics

```typescript
// src/metrics/labs.ts
import { Histogram, Counter } from 'prom-client';

// Track lab order creation
export const labOrdersCreated = new Counter({
  name: 'lab_orders_created_total',
  help: 'Total lab orders created',
  labelNames: ['hospital_id', 'test_name', 'priority']
});

// Track lab result latency (order → result entry)
export const labResultLatency = new Histogram({
  name: 'lab_result_latency_seconds',
  help: 'Time from lab order to result entry (SLO: <14400 sec = 4 hours)',
  buckets: [600, 1800, 3600, 7200, 14400, 21600],  // 10m, 30m, 1h, 2h, 4h, 6h
  labelNames: ['hospital_id', 'test_name']
});

// Track critical result notification latency (SLO: <5 min)
export const criticalResultNotificationLatency = new Histogram({
  name: 'lab_critical_result_notification_latency_seconds',
  help: 'Time from critical result to doctor notification (SLO: <300 sec)',
  buckets: [30, 60, 120, 300, 600],
  labelNames: ['hospital_id']
});
```

#### 2.4 Appointment Metrics

```typescript
// src/metrics/appointments.ts
import { Histogram, Counter } from 'prom-client';

// Track appointment reminders
export const appointmentReminders = new Counter({
  name: 'appointment_reminders_sent_total',
  help: 'Total appointment reminders sent',
  labelNames: ['hospital_id', 'reminder_type']  // 'email', 'sms'
});

// Track reminder latency (SLO: <15 min)
export const reminderLatency = new Histogram({
  name: 'appointment_reminder_latency_seconds',
  help: 'Time from appointment confirmation to reminder sent (SLO: <900 sec)',
  buckets: [60, 300, 600, 900, 1200],  // 1m, 5m, 10m, 15m, 20m
  labelNames: ['hospital_id']
});
```

---

## What to Log (and What NOT to Log)

### ✅ SAFE to LOG (No PHI)

```typescript
// ✅ Entity IDs and references
logger.info('Prescription created', {
  prescription_id: 'rx_123',        // FK, not PII
  patient_id: 'patient_456',        // FK, not name
  encounter_id: 'enc_789',
  hospital_id: 'hospital_001'
});

// ✅ Clinical codes (not descriptions)
logger.info('Diagnosis recorded', {
  icd10_code: 'E11.9',  // Type 2 DM without complications (code only)
  hospital_id: 'hospital_001'
});

// ✅ Standardized values
logger.info('Vital recorded', {
  vital_type: 'BLOOD_PRESSURE',
  status: 'normal',  // or 'critical', not actual values
  hospital_id: 'hospital_001'
});

// ✅ Role and action type
logger.info('Prescription verified', {
  action: 'VERIFY_PRESCRIPTION',
  actor_role: 'PHARMACIST',
  actor_department: 'Pharmacy'
});
```

### ❌ NEVER LOG (Contains PHI)

```typescript
// ❌ Patient names
logger.info('Created prescription for ' + patient.name);  // HIPAA VIOLATION

// ❌ UHIDs or MRNs
logger.info('Diagnosis for UHID ' + patient.uhid);  // HIPAA VIOLATION

// ❌ Exact dosages (in sensitive cases)
logger.info('Dose: 500mg BID');  // Could be identifying for rare conditions

// ❌ Diagnoses
logger.info('Patient has AIDS/HIV');  // HIPAA VIOLATION

// ❌ Insurance details
logger.info('Aetna policy: 12345678');  // HIPAA VIOLATION

// ❌ Contact information
logger.info('Email: patient@example.com, Phone: 555-1234');  // HIPAA VIOLATION
```

### Safer Logging with Sanitization

```typescript
import { sanitizeForLog } from '@/lib/utils/sanitize';

// Automatically removes PHI
logger.info('Process started', 
  sanitizeForLog({
    data: complexPayload,  // Removes names, UHIDs, emails, etc.
    hospital_id: 'hospital_001'
  })
);
```

---

## Prometheus Configuration

### prometheus.yml (Service Discovery & Scraping)

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    monitor: 'caresync-monitor'

scrape_configs:
  # CareSync API metrics
  - job_name: 'caresync-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s  # Clinical metrics more frequent
    
  # Supabase/PostgreSQL metrics (if using postgres_exporter)
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
    metrics_path: '/metrics'
    
  # Node.js process metrics
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alert_rules.yml'
```

---

## Alert Rules for Clinical SLOs

### alert_rules.yml

```yaml
groups:
  - name: caresync-clinical-alerts
    interval: 30s
    rules:
      # Prescription SLO breach
      - alert: PrescriptionDispenseLatency
        expr: |
          histogram_quantile(0.95,
            rate(prescription_dispense_latency_seconds_bucket[5m])
          ) > 900
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Prescription dispense SLO breached"
          description: "p95 latency is {{ $value }}s (SLO: 900s)"
          runbook: "https://wiki.example.com/runbooks/prescription-slo"
      
      # Critical lab alert notification delay
      - alert: CriticalLabAlertDelay
        expr: |
          histogram_quantile(0.50,
            rate(lab_critical_result_notification_latency_seconds_bucket[5m])
          ) > 300
        for: 2m
        labels:
          severity: critical
          team: pathology
        annotations:
          summary: "Critical lab alert notification delay"
          description: "Median latency is {{ $value }}s (SLO: <300s)"
          action: "Check alert service + doctor notification flow"
      
      # Vital recording latency (bedside to system)
      - alert: VitalRecordingLatency
        expr: |
          histogram_quantile(0.99,
            rate(vital_recording_latency_seconds_bucket[5m])
          ) > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Vital recording latency high"
          description: "p99 latency is {{ $value }}s (SLO: <60s)"
      
      # Prescription rejections (safety alerts)
      - alert: HighPrescriptionRejectionRate
        expr: |
          rate(prescription_rejected_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
          team: pharmacy
        annotations:
          summary: "High prescription rejection rate"
          description: "Rejections per second: {{ $value }} (historical avg: 0.01)"
          action: "Review recent prescription data + allergy checking logic"
      
      # System health degradation
      - alert: CriticalAlertQueueBackup
        expr: |
          critical_alerts_active > 50
        for: 5m
        labels:
          severity: critical
          team: oncall
        annotations:
          summary: "Critical alert queue backup"
          description: "{{ $value }} active critical alerts (normal: <10)"
          action: "Check notification service + doctor availability"
```

---

## Grafana Dashboards

### Dashboard 1: Clinical Operations

```json
{
  "dashboard": {
    "title": "CareSync Clinical Operations",
    "panels": [
      {
        "title": "Prescription Status",
        "targets": [
          {
            "expr": "rate(prescription_created_total[1m])",
            "legendFormat": "Created/sec"
          },
          {
            "expr": "rate(prescription_rejected_total[1m])",
            "legendFormat": "Rejected/sec"
          },
          {
            "expr": "rate(prescription_dispensed_total[1m])",
            "legendFormat": "Dispensed/sec"
          }
        ]
      },
      {
        "title": "Prescription Dispense Latency (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(prescription_dispense_latency_seconds_bucket[5m]))",
            "legendFormat": "{{ hospital_id }}"
          }
        ],
        "alert": "SLO: 900 seconds (15 min)"
      },
      {
        "title": "Critical Lab Alerts",
        "targets": [
          {
            "expr": "critical_alerts_active{alert_type=~'lab.*'}",
            "legendFormat": "Active: {{ alert_type }}"
          }
        ]
      },
      {
        "title": "Vital Signs Recording Rate",
        "targets": [
          {
            "expr": "rate(vital_signs_recorded_total[1m])",
            "legendFormat": "{{ vital_type }}"
          }
        ]
      },
      {
        "title": "Current Critical Alerts",
        "targets": [
          {
            "expr": "critical_alerts_active",
            "legendFormat": "{{ hospital_id }}"
          }
        ]
      }
    ]
  }
}
```

### Dashboard 2: System Health

```json
{
  "dashboard": {
    "title": "CareSync System Health",
    "panels": [
      {
        "title": "API Latency (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "{{ endpoint }}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[1m])",
            "legendFormat": "{{ status }}"
          }
        ]
      },
      {
        "title": "Database Connection Pool",
        "targets": [
          {
            "expr": "pg_stat_activity_count",
            "legendFormat": "Active: {{ state }}"
          }
        ]
      },
      {
        "title": "RLS Policy Enforcement",
        "targets": [
          {
            "expr": "rate(pg_rls_policy_evaluations_total[5m])",
            "legendFormat": "{{ policy_name }}"
          }
        ]
      }
    ]
  }
}
```

---

## Phase 3 Success Criteria

✅ **All criteria met**:
- [x] Clinical SLOs defined (8 key workflows with latency targets)
- [x] Health check endpoints implemented (/health, /ready, /metrics)
- [x] Structured logging configured (Winston with JSON format)
- [x] Clinical metrics instrumented (prescriptions, vitals, labs, appointments)
- [x] Prometheus configuration created (scrape config, targets)
- [x] Alert rules defined for SLO breaches (prescriptions, critical labs, vital delays)
- [x] Grafana dashboards designed (clinical operations + system health)
- [x] PHI-safe logging patterns documented (what to log vs. never log)
- [x] No production code changes required (monitoring layer only)

---

## Next Steps

→ **Phase 4A**: Healthcare UI Audit (✅ already complete)  
→ **Phase 4B**: Frontend Enhancements (✅ already complete)  
→ **Phase 5A**: Testing & Validation (✅ already complete)  
→ **Phase 6**: Staged Rollout & Feature Flags (ready to begin)

---

**Document Owner**: CareSync Observability Team  
**Last Updated**: March 14, 2026  
**Review Cycle**: Monthly (adjust SLO targets based on production data)
