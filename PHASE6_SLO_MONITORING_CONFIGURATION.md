# Phase 6: SLO Monitoring & Observability Configuration
**Deployment Date**: April 22, 2026 | **Go-Live**: June 1, 2026

---

## MONITORING ARCHITECTURE

**Stack**:
- **Logs**: Supabase Logs → Datadog
- **Metrics**: Prometheus → Datadog
- **Traces**: OpenTelemetry → Datadog
- **Alerts**: PagerDuty (P1: 5-min, P2: 15-min, P3: 30-min escalation)
- **Dashboards**: Datadog + Grafana

---

## SERVICE LEVEL OBJECTIVES (SLOs)

### ✅ AVAILABILITY SLO

**Target**: 99.9% uptime (≤43.2 min downtime/month)

**Measured By**:
```
(Successful Requests / Total Requests) × 100
```

**SLI Thresholds**:
- ✅ GREEN: >99.9% (downtime <44 min/month)
- 🟡 YELLOW: 99.5-99.9% (downtime 44-216 min/month)
- 🔴 RED: <99.5% (downtime >216 min/month)

**Alert Policy**:
- P1 Alert: >5% error rate (fires immediately)
- P2 Alert: 1-5% error rate (fires if sustained >5 min)
- P3 Alert: 0.5-1% error rate (fires if sustained >15 min)

### ⚡ PERFORMANCE SLO

**Target**: <500ms p95 latency for all endpoints

**Measured By**:
```
Percentile(Response Time, 95th) < 500ms
```

**SLI Breakdown** (by feature):
- Appointments CRUD: <100ms (local DB queries)
- Telehealth Session Start: <500ms (external provider calls)
- Billing Calculation: <10ms (cached, high-volume)
- Clinical Notes Retrieval: <200ms (with history)
- Prescription Issuance: <300ms (pharmacy notification async)

**Alert Policy**:
- P2 Alert: p95 latency >500ms for 5+ consecutive requests
- P3 Alert: p99 latency >1000ms for 10+ consecutive requests

### 💾 DATA DURABILITY SLO

**Target**: 99.99% - RPO <5 min, RTO <15 min

**Measured By**:
```
(Successful Backups / Scheduled Backups) × 100
```

**Alert Policy**:
- P1 Alert: Backup failure (immediate)
- P2 Alert: Backup delayed >15 min (after 15 min)
- P3 Alert: Backup taking >2x normal time (after 2 hours)

### 📋 SECURITY EVENT SLO

**Target**: Zero security breaches (100% detection for OWASP Top 10)

**Measured By**:
- RLS policy violations blocked: 100%
- Unauthorized access attempts rejected: 100%
- Injection attacks blocked: 100%
- PHI encryption validation: 100%

**Alert Policy**:
- P1 Alert: RLS bypass detected (immediate escalation to security team)
- P1 Alert: Unusual access pattern (3+ failed auth in 1 min)
- P2 Alert: High volume of 401/403 errors (>50/min)

---

## METRICS TO TRACK

### 1. ENDPOINT LATENCY METRICS

```yaml
metrics:
  - name: "http_request_duration_seconds"
    labels:
      - endpoint: "/api/appointments", "/api/telehealth", "/api/prescriptions", etc.
      - method: "GET", "POST", "PUT", "DELETE"
      - status: "200", "400", "500", etc.
    quantiles: ["p50", "p95", "p99"]
    alert_threshold_p95: 500ms

  - name: "edge_function_duration_seconds"
    labels:
      - function: "generate-recurring-appointments", "issue-telehealth-prescription", etc.
      - status: "success", "error"
    quantiles: ["p50", "p95", "p99"]
    alert_threshold_p95: 1000ms

  - name: "supabase_query_duration_seconds"
    labels:
      - table: "appointments", "patients", "prescriptions", etc.
      - operation: "select", "insert", "update", "delete"
    quantiles: ["p50", "p95", "p99"]
    alert_threshold_p95: 100ms
```

### 2. ERROR RATE METRICS

```yaml
metrics:
  - name: "http_requests_total"
    labels:
      - endpoint
      - method
      - status
    alert_thresholds:
      - 5xx_errors: ">5% for 1 min" → P1
      - 4xx_errors: ">20% for 5 min" → P2
      - any_errors: ">1% for 15 min" → P3

  - name: "edge_function_errors"
    labels:
      - function
      - error_type: "timeout", "validation", "authorization", etc.
    alert_thresholds:
      - error_rate: ">5%" → P2

  - name: "database_errors"
    labels:
      - operation: "query", "transaction", "replication"
      - error_type: "connection_lost", "timeout", "constraint_violation"
    alert_thresholds:
      - connection_errors: "any" → P1 (immediate)
```

### 3. RESOURCE UTILIZATION METRICS

```yaml
metrics:
  - name: "database_connections_active"
    alert_threshold: ">80% of max_connections"

  - name: "database_disk_usage_percent"
    alert_threshold: ">90%"

  - name: "memory_usage_percent"
    labels:
      - service: "frontend", "backend", "edge_functions"
    alert_threshold: ">85%"

  - name: "cpu_usage_percent"
    labels:
      - service
    alert_threshold: ">90% sustained for 5 min"

  - name: "edge_function_invocations_per_minute"
    labels:
      - function
    alert_threshold: ">1000/min (rate limiting breach)"
```

### 4. CLINICAL WORKFLOW METRICS

```yaml
metrics:
  - name: "appointment_completion_time_minutes"
    description: "Time from scheduled start to completion"
    alert_threshold: ">2x average" → P3

  - name: "telehealth_session_duration_minutes"
    description: "Actual video session duration"
    alert_threshold: "Session dropped/reconnected"

  - name: "prescription_issuance_latency_seconds"
    description: "Time from doctor action to patient notification"
    alert_threshold: ">300s" → P3

  - name: "billing_claim_submission_time_hours"
    description: "Time from appointment to EDI 837 submission"
    alert_threshold: ">24 hours" → P2

  - name: "clinical_note_signature_time_hours"
    description: "Time from note creation to doctor signature"
    alert_threshold: ">72 hours" → P3
```

### 5. SECURITY & COMPLIANCE METRICS

```yaml
metrics:
  - name: "authentication_failures_per_minute"
    labels:
      - failure_type: "invalid_credentials", "expired_token", "missing_token"
    alert_threshold: ">10/min" → P1

  - name: "authorization_violations_per_minute"
    description: "RLS policy rejections"
    labels:
      - user_role: "receptionist", "doctor", "nurse", "billing"
      - resource: "patient_record", "prescription", "billing_data"
    alert_threshold: ">5/min" → P1

  - name: "phi_access_log"
    description: "Audit trail of PHI access"
    labels:
      - user_id
      - patient_id
      - action: "read", "write", "export"
      - timestamp

  - name: "encryption_validation_failures"
    description: "Failed PHI encryption/decryption"
    alert_threshold: ">0" → P1

  - name: "unusual_access_patterns"
    description: "Deviation from normal user behavior"
    alert_threshold: "triggered by ML anomaly detection" → P2
```

---

## DATADOG DASHBOARD CONFIGURATION

### Dashboard 1: SLO Overview (Main Monitoring)

**Title**: "CareSync HIMS - Production SLO Status"
**Refresh**: 30 seconds

**Widgets**:
1. **Availability Status** (Big Number)
   - Query: `avg:http.request.success_rate{*}`
   - Color: Green (>99.9%), Yellow (99.5-99.9%), Red (<99.5%)
   - Target: 99.9%

2. **API Latency - P95** (Time Series)
   - Query: `p95:http.request.duration_seconds{*} by {endpoint}`
   - Threshold: 500ms (red line)
   - Grouped by: endpoint

3. **Error Rate** (Time Series)
   - Query: `rate(http.requests.total{status=~"5.."}[1m])`
   - Threshold: 5% (P1 alert)

4. **Database Replication Lag** (Gauge)
   - Query: `avg:database.replication.lag_seconds`
   - Threshold: <1 second

5. **Telehealth Session Health** (Status)
   - Query: `count:telehealth.sessions{status=active}`
   - Alert: If active sessions = 0

6. **Active Users** (Big Number)
   - Query: `count:distinct(user_id)`
   - Rolling 5-min average

### Dashboard 2: Clinical Workflow Performance

**Title**: "CareSync HIMS - Clinical Workflows"
**Refresh**: 60 seconds

**Widgets**:
1. **Appointment Completion Time** (Histogram)
   - Query: `histogram:appointment.completion_time_minutes`
   - Show: p50, p95, p99

2. **Telehealth Session Success Rate** (Gauge)
   - Query: `avg:telehealth.session.success_rate`
   - Target: >99%

3. **Prescription Issuance Latency** (Time Series)
   - Query: `p95:prescription.issuance_latency_seconds`
   - Grouped by: hospital_id

4. **Billing Claim Submission Rate** (Counter)
   - Query: `rate(billing.claims_submitted[1h])`
   - Target: >95% within 24 hours

5. **Clinical Note Aging** (Bar Chart)
   - Query: `count:clinical_notes{signature_status!=signed}`
   - Alert: Unsigned notes >72 hours old

### Dashboard 3: Security & Audit

**Title**: "CareSync HIMS - Security Events"
**Refresh**: 30 seconds

**Widgets**:
1. **Authentication Failures** (Time Series)
   - Query: `rate(auth.failures[1m]) by {failure_type}`
   - Alert: >10/min

2. **Authorization Violations** (Time Series)
   - Query: `rate(rls.violations[1m]) by {user_role}`
   - Alert: Immediate P1

3. **PHI Access Audit Log** (Table)
   - Query: Show recent PHI access events
   - Columns: user_id, patient_id, action, timestamp, result

4. **Unusual Access Patterns** (Anomaly Detection)
   - Uses: ML-based anomaly detection
   - Alert: Deviation >2σ from baseline

5. **Compliance Status** (Status Widget)
   - Query: `avg:compliance.hipaa_check_status`
   - Target: 100% compliant

### Dashboard 4: Infrastructure & Resources

**Title**: "CareSync HIMS - Infrastructure"
**Refresh**: 60 seconds

**Widgets**:
1. **Database CPU Usage** (Gauge + Time Series)
   - Query: `avg:postgresql.cpu_percent`
   - Threshold: 90% (alert)

2. **Database Memory Usage** (Gauge + Time Series)
   - Query: `avg:postgresql.memory_percent`
   - Threshold: 85% (alert)

3. **Database Connections** (Gauge)
   - Query: `avg:postgresql.connections_active`
   - Max: Show against max_connections

4. **Disk Usage** (Gauge)
   - Query: `avg:postgresql.disk_percent`
   - Threshold: 90%

5. **Edge Function Invocations** (Time Series)
   - Query: `rate(edge_function.invocations[1m]) by {function}`
   - Threshold overlay: Rate limit (1000/min)

6. **Container Restart Count** (Counter)
   - Query: `count:container.restarts`
   - Alert: >0 in production

---

## ALERTING POLICIES

### P1 (Critical) - 5-minute escalation
```
- Error rate >5% for 1 consecutive minute
- Availability <99.9% (ongoing)
- Response time p95 >1000ms (sustained)
- Database connection lost
- Authentication/Authorization failures >10/min
- RLS policy violations (any)
- PHI encryption failures (any)
- Production deployment failed
- Backup failure (same day)
```

### P2 (High) - 15-minute escalation
```
- Error rate 1-5% for 5 consecutive minutes
- Response time p95 >500ms for 5 min
- Database replication lag >10 seconds
- Disk usage >90%
- Memory usage >85%
- Unusual access patterns detected
- Billing claim failure rate >5%
- Clinical note unsigned >72 hours
```

### P3 (Medium) - 30-minute escalation
```
- Error rate 0.5-1% for 15 consecutive minutes
- Response time p99 >1000ms
- Disk usage 80-90%
- Memory usage 75-85%
- Appointment completion time >2x average
- Backup delayed >15 min
- Database query slow (>1 second p95)
- API rate limiting approaching threshold
```

---

## ONCALL RUNBOOK SNIPPETS

### "Availability < 99.9%" Alert
```
1. Check: Is error rate abnormally high?
   - If 5xxx errors: Check logs for service crashes
   - If 4xxx errors: Check for validation/auth issues
   
2. Check: What endpoints are failing?
   - If appointments: Check database connection
   - If telehealth: Check provider connection (Zoom/Twilio)
   - If billing: Check EDI service

3. Actions:
   - If database: Trigger failover to secondary region
   - If network: Check DNS, firewall rules
   - If service: Restart affected containers (check drain first)
   
4. Communication: Notify status page update + clinical team
```

### "Telehealth Session Failed" Alert
```
1. Check: Provider status
   - Zoom API status page: https://status.zoom.us
   - Twilio status page: https://status.twilio.com
   
2. If provider down: Trigger automatic failover to backup
   - System should auto-failover to Twilio if Zoom fails
   - If manual failover needed: /ops/failover-telehealth-provider
   
3. Restore user: Send reconnect link to patient
   
4. Post-incident: Review logs for rootcause
```

### "High Error Rate (>5%)" Alert
```
1. Immediate action:
   - Drain new requests (k8s rolling restart)
   - Verify: No recent deployments
   - Check: Database query errors in logs
   
2. Investigation:
   - Query: What endpoint has highest error rate?
   - If recent code change: Rollback immediately
   - If database issue: Check replication lag
   
3. Recovery:
   - Fix root cause OR rollback to last known good state
   - Revert drain (scale back up)
   - Monitor error rate for 5 min (should drop to <1%)
```

---

## DEPLOYMENT READINESS CHECKLIST

- [ ] Prometheus scrape jobs configured for all services
- [ ] Datadog dashboards created and tested
- [ ] Alert policies configured in PagerDuty
- [ ] Oncall rotation established (2 engineers 24/7)
- [ ] Runbooks tested via dry-run simulations
- [ ] Team training completed (dev + ops)
- [ ] Production monitoring confirmed live
- [ ] Baseline metrics established (normal behavior)
- [ ] SLO targets agreed upon with clinical team
- [ ] Incident response procedure approved

**Target Completion**: May 1, 2026  
**Go-Live Date**: June 1, 2026 ✅
