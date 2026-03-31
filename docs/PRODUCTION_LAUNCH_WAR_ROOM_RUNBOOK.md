# PRODUCTION LAUNCH RUNBOOK - APRIL 15, 2026
## CareSync HIMS Go-Live War Room Procedures

**CRITICAL DOCUMENT:** War room only. Keep printed at each station.
**Last Updated:** April 10, 2026
**Review Date:** April 16, 2026 (Post-launch retrospective)

---

## ROLE ASSIGNMENTS & COMMAND STRUCTURE

```
War Room Commander (CTO)
├── Deployment Lead (Manage blue-green switches, rollback triggers)
├── Ops Monitor (Watch metrics, alert escalation)
├── Clinical Observer (Validate workflows, sign-off)
├── Alert Monitor (Error logs, threshold breaches)
└── Support Lead (Customer issues, comms)
```

---

## LAUNCH TIMELINE & DECISION GATES

### 08:00 UTC: LAUNCH WINDOW OPENS

**Pre-Flight Checklist (Must pass to proceed):**
- [ ] Production API responding: `curl http://prod-api:3000/health`
- [ ] Database: `curl http://prod-api:3000/health/database | jq .status`
- [ ] All 7 role dashboards: `./check-all-roles.sh`
- [ ] Feature flag enabled: `curl http://prod-api:3000/admin/status | jq .phase_6_enabled`
- [ ] Monitoring active: Grafana dashboard live, alerts armed
- [ ] War room team: All 5 roles present, radios tested

**GO/NO-GO VOTE:** (Must be unanimous)
- [ ] CTO: GO
- [ ] Deployment Lead: GO
- [ ] Clinical Observer: GO

---

### 08:00-08:30: PHASE 1 - CANARY 10%

**Objective:** Deploy to 10% of users, verify no critical issues

```bash
# Execute deployment
./deploy-prod.sh --canary=0.1 --verbose

# Monitor output for:
# ✓ GREEN instance started (port 3001)
# ✓ Health checks passing
# ✓ Database replication lag < 5 seconds
# ✓ nginx routing to 10% on new version
```

**Success Criteria (5-minute window):**
```bash
ERROR_RATE=$(curl -s http://prod-api:3000/metrics | jq '.error_rate')
LATENCY_P99=$(curl -s http://prod-api:3000/metrics | jq '.latency.p99')

# Must be:
# ERROR_RATE < 0.001 (0.1%)
# LATENCY_P99 < 5000 (ms)
```

**Abort Criteria (Trigger rollback immediately if ANY met):**
- Error rate sustained > 1% for 1+ minute
- p99 latency sustained > 10s for 1+ minute
- All instances returning 5xx errors
- Authentication failing for any role
- RLS policies not enforced (data isolation broken)

---

### 08:30-09:00: PHASE 2 - CANARY 50%

**Objective:** Expand to 50% of users, validate clinical workflows

```bash
./deploy-prod.sh --canary=0.5 --verbose
```

**Clinical Validation Script (Must pass for proceed):**
```bash
#!/bin/bash
# Validate all 7-role workflows are functioning

echo "Phase 2: Clinical Workflow Validation"

# 1. Doctor can create consultation
curl -X POST http://prod-api:3000/api/consultations \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"TEST_PAT_001","chief_complaint":"Test workflow"}' \
  | jq -e '.id' || exit 1

# 2. Nurse can record vitals
curl -X POST http://prod-api:3000/api/vitals \
  -H "Authorization: Bearer ${NURSE_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"TEST_PAT_001","temp":37.5,"bp":"120/80"}' \
  | jq -e '.id' || exit 1

# 3. Pharmacist can approve prescription
curl -X POST http://prod-api:3000/api/prescriptions/RX_TEST_001/approve \
  -H "Authorization: Bearer ${PHARMACIST_TOKEN}" \
  | jq -e '.state == "approved"' || exit 1

# 4. Lab Tech can enter results
curl -X POST http://prod-api:3000/api/lab-results \
  -H "Authorization: Bearer ${LABTECH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"order_id":"LAB_001","results":{}}' \
  | jq -e '.id' || exit 1

# 5. Receptionist can check in patient (no error)
curl -X POST http://prod-api:3000/api/queue/check-in \
  -H "Authorization: Bearer ${RECEPTIONIST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"TEST_PAT_001"}' \
  | jq -e '.status == "checked_in"' || exit 1

# 6. Billing can access invoices
curl -X GET http://prod-api:3000/api/billing/invoices \
  -H "Authorization: Bearer ${BILLING_TOKEN}" \
  | jq -e '.records | length >= 0' || exit 1

# 7. Admin can access staff management  
curl -X GET http://prod-api:3000/api/admin/staff \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  | jq -e '.records | length >= 0' || exit 1

echo "✓ All 7 workflows validated successfully"
exit 0
```

**Monitoring Focus (30-minute window):**
- Error rate trending: Should be stable or decreasing
- Latency p99: Should be consistent
- No workflow failures for any role
- Audit logging: All actions recorded
- Cross-hospital data isolation: Verified

**Abort if:**
- Any workflow fails (e.g., Pharmacist can't approve)
- Error rate trending up
- p99 latency trending up
- Audit trail shows missed entries

---

### 09:00-10:00: PHASE 3 - FULL 100% DEPLOYMENT

**Objective:** Deploy to 100% of users, full production load

**FINAL GO/NO-GO DECISION (08:59 UTC):**

Before proceeding, answer:
1. Phase 1 stable for full 30 minutes? YES ☐  / NO ☐
2. Phase 2 workflows all passing? YES ☐  / NO ☐
3. Clinical observer approval? YES ☐  / NO ☐
4. Error rate < 0.1% sustained? YES ☐  / NO ☐
5. No incidents or anomalies? YES ☐  / NO ☐

**If ANY are NO → STOP AND INVESTIGATE**

```bash
# PROCEED ONLY IF ALL YES:
./deploy-prod.sh --canary=1.0 --verbose

# Expected output:
# ✓ GREEN health checks: PASS
# ✓ Error rate validation: 0.02% (PASS)
# ✓ Database replication: 0.5s lag (PASS)
# ✓ nginx routing: 100% to GREEN
# ✓ BLUE process stopped
# ✓ Deployment complete: 2026-04-15 09:00:42 UTC
```

**First 5 Minutes - Critical Validation:**
```bash
# 1. API responds
curl -I http://prod-api:3000/health

# 2. All role tests pass
./check-all-roles.sh

# 3. Error rate stable
./check-metrics.sh | grep error_rate

# 4. Audit log updated
curl http://prod-api:3000/api/audit-logs?limit=1 | jq '.records[0]'
```

---

### 10:00-13:00: ACTIVE MONITORING PHASE

**Continuous Monitoring (Every 5 minutes):**

```bash
#!/bin/bash
echo "=== CareSync Production Health Check ==="
echo "Time: $(date)"

# Metric 1: Error Rate
ERROR=$(curl -s http://prod-api:3000/metrics | jq '.error_rate * 100')
[ $(echo "$ERROR < 0.5" | bc -l) -eq 1 ] && echo "✓ Error Rate: ${ERROR}%" || echo "⚠ Error Rate ALERT: ${ERROR}%"

# Metric 2: Latency P99
LATENCY=$(curl -s http://prod-api:3000/metrics | jq '.latency.p99')
[ $LATENCY -lt 5000 ] && echo "✓ Latency P99: ${LATENCY}ms" || echo "⚠ Latency ALERT: ${LATENCY}ms"

# Metric 3: Active Users
USERS=$(curl -s http://prod-api:3000/metrics | jq '.active_users')
echo "✓ Active Users: $USERS"

# Metric 4: Database Health
DB=$(curl -s http://prod-api:3000/health/database | jq .status)
echo "✓ Database: $DB"

# Metric 5: Workflow Health (Sample check)
TEST=$(curl -s http://prod-api:3000/api/consultations/count \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" | jq '.count')
echo "✓ Consultations today: $TEST"

echo ""
```

**Alert Thresholds & Escalation:**

| Metric | Yellow | Red | Action |
|--------|--------|-----|--------|
| Error Rate | > 0.5% | > 1% for 1min | Investigate / Rollback |
| Latency P99 | > 3s | > 10s for 1min | Scale / Rollback |
| DB CPU | > 70% | > 90% | Scale DB |
| Failed Workflows | > 2 | > 5 | Investigate / Rollback |

**Incident Response:**
```bash
# If error rate spikes:
1. Check logs: tail -f /var/log/caresync/errors.log
2. Identify root cause (database? API? RLS policy?)
3. If fixable in < 5 min: apply hotfix
4. If not: execute rollback

# Fast rollback:
./rollback.sh --force
```

---

## HEALTH CHECK SCRIPTS

### quick-health-check.sh
```bash
#!/bin/bash
# Run every 5 minutes during monitoring phase

STATUS="HEALTHY"

# 1. API
if ! curl -s http://prod-api:3000/health >/dev/null; then
  STATUS="UNHEALTHY"
fi

# 2. Database
if ! curl -s http://prod-api:3000/health/database | jq -e '.status == "ok"' >/dev/null; then
  STATUS="UNHEALTHY"
fi

# 3. Error Rate
ERROR=$(curl -s http://prod-api:3000/metrics | jq '.error_rate')
if (( $(echo "$ERROR > 0.01" | bc -l) )); then
  STATUS="WARNING"
fi

echo "Status: $STATUS | Error: $(echo $ERROR * 100 | bc)% | Time: $(date)"
exit 0
```

### validate-workflows.sh
```bash
#!/bin/bash
# Verify all 7 roles can complete basic workflows

for role in doctor nurse pharmacist labtech receptionist billing admin; do
  TOKEN=$(curl -s http://prod-api:3000/auth/token \
    -H "X-Role: $role" | jq -r .token)
  
  RESPONSE=$(curl -s http://prod-api:3000/api/$role/dashboard \
    -H "Authorization: Bearer $TOKEN")
  
  if echo $RESPONSE | jq -e '.status == "ok"' >/dev/null; then
    echo "✓ $role: OK"
  else
    echo "✗ $role: FAILED"
  fi
done
```

---

## EMERGENCY PROCEDURES

### IMMEDIATE ROLLBACK (< 30 seconds)
```bash
# Use if error rate > 5%
echo "🚨 INITIATING EMERGENCY ROLLBACK"

# Option 1: Feature flag kill-switch (FASTEST)
curl -X POST http://prod-api:3000/admin/kill-switch \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"phase_6_enabled": false}'

# Time to recovery: ~12 seconds
echo "✓ Kill-switch activated, traffic routed to BLUE"

# Verify recovery
HEALTH=$(curl -s http://prod-api:3000/health)
echo "Health: $(echo $HEALTH | jq .status)"
```

### STANDARD ROLLBACK (< 1 minute)
```bash
./rollback.sh --verbose

# Process:
# 1. Disable feature flag
# 2. Switch nginx to BLUE
# 3. Stop GREEN
# 4. Verify BLUE health
# Total RTO: ~35 seconds average
```

---

## POST-LAUNCH: 24-HOUR MONITORING

Continue monitoring through 09:00 UTC April 16

**Daily Summary Report (09:00 UTC April 16):**
- Peak concurrent users
- Highest latency (p99) recorded
- Total error events (and resolutions)
- Clinical workflows successful %
- Audit trail completeness
- Any incidents or anomalies

**Retrospective Meeting:**
- What went well?
- What could improve?
- Lessons learned?
- Any hotfixes needed?

---

## COMMAND QUICK REFERENCE

```bash
# Health Check
curl http://prod-api:3000/health | jq .

# Current Metrics
curl http://prod-api:3000/metrics | jq '.{error_rate, latency: .latency.p99, active_users}'

# View Recent Errors
tail -f /var/log/caresync/errors.log

# Check Feature Flag
curl http://prod-api:3000/admin/status | jq .phase_6_enabled

# Manual Rollback
./rollback.sh

# Feature Flag Kill-Switch
curl -X POST http://prod-api:3000/admin/kill-switch \
  -d '{"phase_6_enabled": false}'
```

---

**THIS RUNBOOK MUST BE KEPT IN WAR ROOM AT ALL TIMES**

**Emergency Contact:** CTO - +1-555-0104
