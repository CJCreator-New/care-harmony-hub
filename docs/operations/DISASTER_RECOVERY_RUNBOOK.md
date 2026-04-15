# PHASE 6: DISASTER RECOVERY (DR) RUNBOOK
**Last Updated**: April 15, 2026 | **Maintained By**: DevOps Team  
**RTO Target**: <15 minutes | **RPO Target**: <5 minutes

---

## TABLE OF CONTENTS
1. [Overview & Contacts](#overview--contacts)
2. [DR Procedures](#dr-procedures)
3. [Service Failover Procedures](#service-failover-procedures)
4. [Recovery Verification](#recovery-verification)
5. [Escalation Path](#escalation-path)

---

## OVERVIEW & CONTACTS

### RTO/RPO Targets
| Service | RTO | RPO | Tier |
|---------|-----|-----|------|
| Patient Data (Database) | 15 min | 5 min | P1 Critical |
| Telehealth (Zoom/Twilio) | 5 min | 0 min (stateless) | P1 Critical |
| Billing System | 30 min | 15 min | P2 High |
| Frontend (Web UI) | 10 min | 0 min (CDN) | P2 High |

### Key Contacts
```
ONCALL SRE:     Page immediately for any P1 incident
DevOps Lead:    Contact for deployment decisions
CTO:            Final escalation for go/no-go decisions
Clinical PM:    Notify clinical team of any downtime
Security Team:  Immediate notification for security incidents
```

### Critical Systems Layout
```
PRIMARY REGION (us-east-1)
├── Supabase PostgreSQL (Primary)
├── Frontend (Vercel CDN)
├── Edge Functions (Deno Deploy)
└── Monitoring (Datadog)

SECONDARY REGION (us-west-2)
├── PostgreSQL Replica (Read-only, standby)
├── Cold Standby Backend
└── Manual failover required

PROVIDER FAILOVERS
├── Zoom API (Primary telehealth provider)
├── Twilio WebRTC (Failover provider - auto)
├── Stripe (Payment processing)
└── SendGrid (Email notifications)
```

---

## DR PROCEDURES

### 🔴 PROCEDURE 1: DATABASE FAILOVER (PRIMARY REGION DOWN)

**Trigger Condition**: 
- Database unreachable (psql timeout >30s)
- Connection pool exhausted
- Replication lag >5 min
- Error rate >50% on database queries

**Decision Point**: 
- If secondary is in sync: **FAILOVER (5-10 min downtime)**
- If secondary is behind: **ROLLBACK to last known good + manual recovery**

#### Step 1: Verify Disaster (1 min)
```bash
# SSH to monitoring bastion
ssh -i ~/.ssh/dr-key monitoring-bastion.caresync.local

# Check primary database status
psql $PRIMARY_DB_URL -c "SELECT now();" || echo "PRIMARY DEAD"

# Check replication lag
psql $SECONDARY_DB_URL -c "SELECT extract(seconds FROM now() - pg_last_wal_receive_lsn_time());"
# If lag < 60 seconds: SAFE TO FAILOVER
# If lag > 60 seconds: DO NOT FAILOVER - contact CTO
```

#### Step 2: Pause All Writes (30 sec)
```bash
# Temporarily stop background job processors
kubectl scale deployment caresync-job-processor --replicas=0

# Verify frontend is sending traffic only to read replicas
kubectl set env deployment/caresync-backend \
  DATABASE_MODE=read-only \
  CIRCUIT_BREAKER=open

# Wait for in-flight requests to complete
sleep 30
```

#### Step 3: Promote Secondary Database (2 min)
```bash
# Connect to secondary
psql $SECONDARY_DB_URL -U postgres

# Promote replica to primary
SELECT pg_promote();

# Verify promotion
SELECT pg_is_in_recovery();  -- Must return FALSE

# New connection string:
export PRIMARY_DB_URL="postgresql://user:pass@secondary-now-primary.db.internal/caresync"
```

#### Step 4: Update Application Configuration (1 min)
```bash
# Update Supabase connection string (rotated via Vault)
kubectl set env deployment/caresync-backend \
  DATABASE_URL=$NEW_PRIMARY_DB_URL \
  DATABASE_MODE=read-write \
  CIRCUIT_BREAKER=closed

# Wait for pods to restart with new config
kubectl rollout status deployment/caresync-backend --timeout=5m
```

#### Step 5: Enable Replica Cascade (3 min)
```bash
# Start replication from new primary to new secondary
# (using PostgreSQL streaming replication setup)

# Verify replication lag is <5 sec
watch -n 1 'psql $NEW_PRIMARY_DB_URL \
  -c "SELECT now() - pg_last_xact_replay_timestamp() as replication_lag;"'

# Once lag stabilized < 5 sec: SUCCESS
```

#### Step 6: Restore Normal Operations (2 min)
```bash
# Scale up job processors
kubectl scale deployment caresync-job-processor --replicas=3

# Monitor error rates from dashboards
# Target: Return to <1% error rate within 5 minutes

# Announce recovery in Slack #incidents
echo "🟢 Database failover COMPLETE. Service restored."
```

**Total Time**: 10 min  
**Patient Impact**: Brief (requests queued, no data loss)

---

### 🔴 PROCEDURE 2: TELEHEALTH PROVIDER FAILOVER (ZOOM DOWN)

**Trigger Condition**:
- Zoom API returns >5% 5xx errors
- Session establishment >50% failure rate
- Zoom status page shows major outage

**Automatic Action**: System automatically routes to Twilio  
**Manual Recovery**: Below steps

#### Step 1: Verify Zoom Outage (1 min)
```bash
# Check Zoom status page
curl https://status.zoom.us/api/v2/status.json | jq '.status.indicator'
# Expected: "degraded" or "major"

# Test Zoom API directly
curl -H "Authorization: Bearer $ZOOM_JWT" \
  https://api.zoom.us/v2/users/me 2>&1 | grep -i error

# Check app error logs for Zoom failures
datadog_tail 'service:caresync error:"Zoom"' --last 5m
```

#### Step 2: Activate Twilio Failover (2 min)
```bash
# Verify Twilio is operational
curl -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json

# System auto-routes to Twilio (no manual action needed)
# But verify the feature flag is enabled:
kubectl get configmap caresync-feature-flags -o jsonpath='{.data.telehealth_provider}'
# Should show: "twilio_primary"

# If not auto-routing, manually activate:
kubectl patch configmap caresync-feature-flags \
  -p '{"data":{"telehealth_provider":"twilio_primary"}}'
```

#### Step 3: Notify Active Sessions (1 min)
```bash
# Send reconnect links to patients with active Zoom sessions
psql $PRIMARY_DB_URL -c "
  SELECT patient_email, session_id FROM telehealth_sessions
  WHERE provider = 'zoom' AND status = 'active'
  AND ended_at IS NULL;
" | while read email session; do
  # Send reconnect notification with Twilio link
  sendgrid_email "$email" \
    --subject "Your video session has been transferred" \
    --template reconnect_session \
    --data "{\"session_id\": \"$session\"}"
done
```

#### Step 4: Verify Twilio Operation (3 min)
```bash
# Monitor Twilio session establishment
datadog_query 'metric:twilio.session.duration{*}' --from 5m

# Check error rate on Twilio calls
datadog_query 'avg:twilio.error_rate{*}' --should_be '<1%'

# Manually test end-to-end telehealth session
# (use test patient account)
curl -X POST https://caresync.local/api/telehealth/test-session \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"provider":"twilio"}'
```

#### Step 5: Restore Zoom Connection (Once Zoom recovers)
```bash
# Zoom status page shows "All Systems Operational"
curl https://status.zoom.us/api/v2/status.json | jq '.status.indicator'
# Expected: "none"

# Test Zoom API again
curl -H "Authorization: Bearer $ZOOM_JWT" \
  https://api.zoom.us/v2/users/me | jq '.id'

# Switch provider back to Zoom
kubectl patch configmap caresync-feature-flags \
  -p '{"data":{"telehealth_provider":"zoom_primary"}}'

# Monitor mixed sessions (some Zoom, some Twilio) for 15 min
# Verify no errors in logs
```

**Total Time**: 5 min  
**Patient Impact**: Session may drop briefly, automatic reconnect with Twilio

---

### 🔴 PROCEDURE 3: FULL SYSTEM RECOVERY FROM BACKUP

**Trigger Condition**:
- Ransomware or data corruption detected
- Multi-region failure (unlikely but critical)
- Need to restore to point-in-time before incident

**RTO**: 30-60 minutes  
**RPO**: Last automated backup (daily at 2 AM UTC)

#### Step 1: Declare Disaster (Immediate)
```bash
# Page CTO + Security Team immediately
pagerduty_incident \
  --title "CRITICAL: Initiating DR from backup" \
  --severity P1 \
  --responders '@cto,@security-lead'

# Stop all write operations
kubectl scale deployment caresync-backend --replicas=0
kubectl scale deployment caresync-job-processor --replicas=0
sleep 10
```

#### Step 2: Verify Backup Integrity (5 min)
```bash
# List available backups (Supabase + AWS S3)
supabase backup ls --remote

# Get latest backup before incident
BACKUP_ID=$(supabase backup ls --remote | head -1 | awk '{print $1}')
echo "Using backup: $BACKUP_ID"

# Restore to temporary database for verification
supabase db restore \
  --backup-id=$BACKUP_ID \
  --remote \
  --dry-run  # This won't actually restore yet

# Verify: No errors in dry-run
```

#### Step 3: Restore Database (10-15 min)
```bash
# WARNING: This will overwrite current database!
# Confirm with CTO before proceeding

supabase db restore \
  --backup-id=$BACKUP_ID \
  --remote \
  --verbose

# Monitor restore progress
watch -n 5 'supabase backup info $BACKUP_ID --remote'

# Expected: "Status: RESTORED" when complete
```

#### Step 4: Clear Compromised Cache/Sessions (3 min)
```bash
# Invalidate all active sessions (force re-auth)
redis-cli FLUSHALL  # Clears entire cache + sessions

# This will require all users to log back in
# Send notification to clinical team
```

#### Step 5: Restore Application Services (5 min)
```bash
# Scale backend back up
kubectl scale deployment caresync-backend --replicas=3
kubectl scale deployment caresync-job-processor --replicas=2

# Wait for health checks
kubectl rollout status deployment/caresync-backend --timeout=10m

# Verify database connectivity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM patients;" || echo "FAILED"
```

#### Step 6: Verify Data Integrity (10 min)
```bash
# Run data consistency checks
npm run db:verify-integrity

# Check for missing rows from backup time to incident
npm run db:audit-integrity --from=$BACKUP_TIME

# Compare patient count, appointment count, billing transactions
# Report discrepancies to CTO + Clinical team
```

#### Step 7: Gradual Traffic Restoration (10 min)
```bash
# Start with read-only mode
kubectl exec -it deployment/caresync-backend \
  -- npx ts-node --eval "process.env.CIRCUIT_BREAKER='read_only'"

# Monitor error rates for 2 min
# Should see: 0% errors on read operations

# Enable write operations phase-by-phase:
# Phase 1: Patient read/write (2 min)
# Phase 2: Appointment read/write (2 min)
# Phase 3: Everything else (2 min)

kubectl set env deployment/caresync-backend CIRCUIT_BREAKER=closed
```

**Total Time**: 45-60 min  
**Patient Impact**: 45 min+ downtime, loss of ~1 hour of data (since last backup)

---

## SERVICE FAILOVER PROCEDURES

### Insurance Provider Failover (Tertiary Concern)
If insurance EDI processing fails:
```bash
# Queue claims to local database
# Retry submission with exponential backoff (1h, 4h, 1d, 3d, 7d)
# Notify billing team to manually investigate
# No patient-facing impact
```

### Backup Provider Failover (Email/SMS)
If SendGrid fails:
```bash
# Switch to AWS SES backup
# Patient notifications may be delayed by 30-60 min
# No critical functionality blocked
```

---

## RECOVERY VERIFICATION

### Post-Recovery Checklist

After ANY failover, verify:

```
[ ] Database replication lag < 5 seconds
    psql $DB_URL -c "SELECT now() - pg_last_xact_replay_timestamp();"

[ ] Frontend loads and responds <500ms p95
    curl -w "Time: %{time_total}s" https://caresync.local

[ ] Telehealth can establish sessions
    /api/telehealth/health?action=test_session

[ ] Patients can view their records
    /api/patients/$TEST_PATIENT_ID

[ ] Appointments can be created
    POST /api/appointments with test data

[ ] Billing calculations work
    POST /api/billing/calculate with test invoice

[ ] No alerts firing on dashboards
    datadog_query 'status:alert' --should_return 0

[ ] Error rate < 1%
    datadog_query 'avg:trace.flask.request.errors{*}' --should_be '<1%'

[ ] Active user count normal
    datadog_query 'count_unique:user_id' --compare_to_baseline

[ ] SLO status: GREEN (all 4 SLOs met)
    Dashboard: Datadog SLO Status
```

### Communication Template

Once recovery verified:

```
FROM:        @oncall-sre
TO:          #incidents, @cto, @clinical-team, @hospital
SUBJECT:     RECOVERY COMPLETE: [SERVICE] Failover Successful

Timeline:
- 14:00 UTC: Incident detected (error rate spike >50%)
- 14:02 UTC: Failover initiated
- 14:12 UTC: Service online
- 14:15 UTC: Verification complete

Impact:
- Downtime: 12 minutes
- Data Loss: None (RTO <15min, RPO <5min both met)
- Affected Users: ~150 (those with active sessions)
- Patient Notifications: Sent automatically

Root Cause: [To be determined in post-incident review]

Next Steps:
- Post-incident review in 24 hours
- Prevention measure implementation in 72 hours
```

---

## ESCALATION PATH

### On-Call Escalation (Automated)

```
Minute 0:    Issue detected → Page SRE (on-call)
Minute 5:    No response from SRE → Page DevOps Lead
Minute 10:   No response from DevOps → Page CTO
Minute 15:   P1 incident declared → Notify Hospital Leadership
```

### Decision Tree

```
Is database reachable?
├─ YES → Check replication lag
│  ├─ lag < 60 sec → PROCEED WITH FAILOVER
│  └─ lag > 60 sec → DO NOT FAILOVER (call CTO)
└─ NO → Check backup integrity
   ├─ OK → RESTORE FROM BACKUP (call CTO first)
   └─ CORRUPT → MANUAL RECOVERY (incident commander leads)
```

---

## TEST SCHEDULE

- **Weekly** (Monday 2 AM UTC): Automated backup verification
- **Monthly** (First Friday): Telehealth provider failover dry-run
- **Quarterly** (First Monday of quarter): Full database failover test

---

## CONTACT REFERENCE

```
# In ~/.bashrc or ~/.zshrc for quick access:

alias page-sre="pagerduty incident create --service caresync --urgency high"
alias page-cto="pagerduty incident create --service leadership --urgency critical"
alias dr-verify="npm run db:verify-integrity && npm run app:health-check"
alias dr-backup-list="supabase backup ls --remote"
```

---

**Last Tested**: [TBD - First DR drill scheduled for April 22]  
**Next Review**: May 1, 2026 (before go-live)

🚀 **This runbook will be tested live on April 22 during Phase 6 Week 2.**
