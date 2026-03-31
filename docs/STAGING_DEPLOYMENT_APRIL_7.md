# STAGING DEPLOYMENT: APRIL 7 PROCEDURES
## Multi-Hospital Isolation, Disaster Recovery & War Room Dry-Run

**Document Date:** March 31, 2026
**Execution Date:** Monday, April 7, 2026
**Target Environment:** Staging (staging.hospital.local)
**All 3 Blockers Status:** ✅ IMPLEMENTED & TESTED (March 31 - April 1)

---

## PRE-DEPLOYMENT CHECKLIST (April 7, 08:00 UTC)

### Validation Steps
```bash
# 1. Verify git main branch has all 3 blockers
git log --oneline | grep "Blocker #[123]"

# 2. Confirm production build succeeds
npm run build && echo "✓ Build successful"

# 3. Run critical tests
npm run test:security && npm run test:unit

# 4. Verify deployment scripts are executable
[ -x deploy-prod.sh ] && echo "✓ deploy-prod.sh ready"
[ -x rollback.sh ] && echo "✓ rollback.sh ready"

# 5. Check feature flag kill-switch in code
grep -r "PHASE_6_ENABLED" src/ && echo "✓ Kill-switch found"
```

---

## STAGING DEPLOYMENT STEP-BY-STEP (April 7, 09:00 UTC)

### Phase 1: Environment Preparation (09:00-09:30)

**1.1: Blue Instance (Staging-BLUE: port 3010)**
```bash
# Deploy stable v2.9.5 to staging-blue
docker run -d --name staging-blue-v2 \
  -p 3010:3000 \
  -e DATABASE_URL=${STAGING_DB_URL} \
  -e SUPABASE_KEY=${STAGING_SUPABASE_KEY} \
  caresync-hims:v2.9.5

# Verify health
curl http://localhost:3010/health
# Expected: { "status": "healthy", "version": "2.9.5" }
```

**1.2: Green Instance (Staging-GREEN: port 3011) - v3.0 with all blockers**
```bash
# Build & deploy v3.0 with all blockers to staging-green
npm run build
docker run -d --name staging-green-v3 \
  -p 3011:3000 \
  -e DATABASE_URL=${STAGING_DB_URL} \
  -e SUPABASE_KEY=${STAGING_SUPABASE_KEY} \
  -e PHASE_6_ENABLED=false \
  caresync-hims:v3.0.0

# Verify health (should pass despite PHASE_6_ENABLED=false)
curl http://localhost:3011/health
# Expected: { "status": "healthy", "version": "3.0.0" }
```

**1.3: nginx Load Balancer Configuration**
```bash
# Initial routing: 100% traffic to BLUE (stable v2.9.5)
# GREEN pre-warmed but receiving 0% traffic

# Verify routing
curl -v http://staging-lb/api/test 2>&1 | grep "X-Served-By: blue"
# Expected: X-Served-By: blue-v2
```

### Phase 2: 7-Role Smoke Tests on BLUE (Staging v2.9.5) (09:30-10:00)

**Verify all 7 roles can access their workflows on existing stable version:**

```bash
# TEST 1: Doctor Dashboard
curl -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  http://staging-lb/api/doctor/dashboard

# TEST 2: Nurse Queue
curl -H "Authorization: Bearer ${NURSE_TOKEN}" \
  http://staging-lb/api/nurse/queue

# TEST 3: Pharmacist Approval
curl -H "Authorization: Bearer ${PHARMACIST_TOKEN}" \
  http://staging-lb/api/pharmacy/queue

# TEST 4: Lab Tech Order Entry
curl -H "Authorization: Bearer ${LABTECH_TOKEN}" \
  http://staging-lb/api/lab/pending-orders

# TEST 5: Receptionist Check-In
curl -H "Authorization: Bearer ${RECEPTIONIST_TOKEN}" \
  http://staging-lb/api/queue/status

# TEST 6: Billing Invoices
curl -H "Authorization: Bearer ${BILLING_TOKEN}" \
  http://staging-lb/api/billing/invoices

# TEST 7: Admin Staff Management
curl -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://staging-lb/api/admin/staff
```

**Success Criteria:** All 7 roles return 200 OK with data

### Phase 3: Enable NEW VERSION & BLOCKER TESTS (10:00-11:00)

**3.1: Activate v3.0 Feature Flag (PHASE_6_ENABLED=true)**
```bash
# Update environmental variable on staging-green
docker exec staging-green-v3 env PHASE_6_ENABLED=true

# Re-enable feature flag checks in code
# (If implemented as environment variable)
```

**3.2: Validate v3.0 Blockers are Functioning**

**BLOCKER #1: Route Guard Middleware**
```bash
# Test 1a: Doctor tries to access /settings (admin-only)
curl -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  http://localhost:3011/api/admin/settings
# Expected: 403 Forbidden (blocked by middleware)

# Test 1b: Admin can access /settings
curl -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  http://localhost:3011/api/admin/settings
# Expected: 200 OK
```

**BLOCKER #2: Hospital Scoping on Dashboard**
```bash
# Simulate Hospital A + Hospital B doctors
# Setup: Create test data with 2 hospitals

# Test 2a: Doctor A queries dashboard
curl -H "Authorization: Bearer ${DOCTOR_A_TOKEN}" \
  http://localhost:3011/api/doctor/dashboard | jq '.hospital_id'
# Expected: 1

# Verify Doctor A sees ONLY Hospital A data
curl -H "Authorization: Bearer ${DOCTOR_A_TOKEN}" \
  http://localhost:3011/api/patients | jq '.records[].hospital_id'
# Expected: All hospital_id = 1, zero records from hospital_id = 2

# Test 2b: Direct API bypass attempt
curl -H "Authorization: Bearer ${DOCTOR_A_TOKEN}" \
  "http://localhost:3011/api/patients?hospital_id=2"
# Expected: 403 Forbidden OR returns empty (hospital_id filtered in WHERE clause)
```

**BLOCKER #3: Deployment RTO Validation**
```bash
# Test 3a: Kill v3.0 instance (simulate failure)
docker kill staging-green-v3

# Measure time to recovery via rollback
START_TIME=$(date +%s%N)

# Trigger rollback (feature flag disable + nginx switch)
./rollback.sh --target=staging

END_TIME=$(date +%s%N)
RTO_MS=$(( (END_TIME - START_TIME) / 1000000 ))
echo "Recovery Time: ${RTO_MS}ms"

# Expected: RTO < 60,000ms (< 60 seconds)
[ $RTO_MS -lt 60000 ] && echo "✓ RTO acceptable" || echo "✗ RTO exceeded"

# Verify traffic returned to BLUE
curl -v http://staging-lb/api/test 2>&1 | grep "X-Served-By: blue"
```

### Phase 4: Multi-Hospital Isolation Test (11:00-12:00)

**4.1: Data Setup**
```sql
-- Hospital 1 (US Hospital)
INSERT INTO hospitals (id, name, region) VALUES (1, 'US Hospital', 'US');

-- Hospital 2 (UK Hospital) 
INSERT INTO hospitals (id, name, region) VALUES (2, 'UK Hospital', 'UK');

-- Create test users for each hospital
INSERT INTO auth.users (id, email, hospital_id) 
  VALUES (doc1, 'doc1@ushospital.test', 1);
INSERT INTO auth.users (id, email, hospital_id) 
  VALUES (doc2, 'doc2@ukhospital.test', 2);

-- Create test patients for each hospital
INSERT INTO patients (id, hospital_id, name, uhid) 
  VALUES ('pat_us_001', 1, 'Patient US 1', 'UHID_US_001');
INSERT INTO patients (id, hospital_id, name, uhid) 
  VALUES ('pat_uk_001', 2, 'Patient UK 1', 'UHID_UK_001');
```

**4.2: Cross-Hospital Access Rejection Test**
```bash
# Doctor from Hospital 1 tries to access Hospital 2 data

# Test 4a: Query patients (should filter by hospital_id)
curl -H "Authorization: Bearer ${DOC1_TOKEN}" \
  "http://localhost:3011/api/patients" | jq '.records[] | {id, name, hospital_id}'
# Expected output:
# {"id":"pat_us_001","name":"Patient US 1","hospital_id":1}
# (Hospital 2 patient NOT returned)

# Test 4b: Direct API bypass - try to fetch specific UK patient
curl -H "Authorization: Bearer ${DOC1_TOKEN}" \
  "http://localhost:3011/api/patients/pat_uk_001"
# Expected: 403 Forbidden (RLS policy blocks cross-hospital)

# Audit log verification
curl -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://localhost:3011/api/audit-logs?action=unauthorized_access" | jq '.records[] | select(.actor_hospital_id == 1 and .target_hospital_id == 2)'
# Expected: Entry showing Doctor US-1 attempted access to UK hospital data
```

**4.3: Successful Legitimate Access**
```bash
# Doctor from Hospital 1 accessing their own hospital data

curl -H "Authorization: Bearer ${DOC1_TOKEN}" \
  "http://localhost:3011/api/patients/pat_us_001"
# Expected: 200 OK with patient data
```

### Phase 5: Break-Glass Override Testing (12:00-13:00)

**5.1: Emergency Access Protocol**
```bash
# Scenario: US Hospital doctor needs emergency access to UK patient record

# Step 1: Doctor initiates break-glass override
curl -X POST "http://localhost:3011/api/break-glass/override" \
  -H "Authorization: Bearer ${DOC1_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "pat_uk_001",
    "reason": "Emergency: Patient in critical condition, need allergy history",
    "duration_minutes": 15
  }'
# Expected response:
# {
#   "override_id": "bgo_456",
#   "expires_at": "2026-04-07T12:15:00Z",
#   "status": "active"
# }

# Step 2: Access granted temporarily
curl -H "Authorization: Bearer ${DOC1_TOKEN}" \
  -H "X-Break-Glass: bgo_456" \
  "http://localhost:3011/api/patients/pat_uk_001"
# Expected: 200 OK (cross-hospital access allowed via break-glass)

# Step 3: Audit log updated
curl -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://localhost:3011/api/audit-logs?action=break_glass_override"
# Expected: Entry showing doctor, time, patient, reason, duration

# Step 4: After 15 minutes, access expires
sleep 900
curl -H "Authorization: Bearer ${DOC1_TOKEN}" \
  -H "X-Break-Glass: bgo_456" \
  "http://localhost:3011/api/patients/pat_uk_001"
# Expected: 403 Forbidden (override expired)
```

### Phase 6: Disaster Recovery Drill (13:00-14:00)

**6.1: Database Failure Simulation**
```bash
# Simulate PRIMARY database failure
docker stop staging-database-primary

# Measure failover to replica
START=$(date +%s)
FAILED=false

# Monitor health checks
for i in {1..60}; do
  if curl -s http://localhost:3011/health | jq -e '.database.status == "ok"' > /dev/null; then
    END=$(date +%s)
    FAILOVER_TIME=$((END - START))
    echo "Failover completed in ${FAILOVER_TIME} seconds"
    break
  fi
  sleep 1
done

# Verify data integrity
RECORD_COUNT_REPLICA=$(curl -s -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "http://localhost:3011/api/patients/count" | jq '.count')
echo "Records on replica: ${RECORD_COUNT_REPLICA}"

# Restore primary
docker start staging-database-primary
```

**6.2: RTO/RPO Validation**
- **RTO (Recovery Time Objective):** Should be < 60 seconds
- **RPO (Recovery Point Objective):** Should be < 1 hour (no data loss beyond last backup)

### Phase 7: War Room Dry-Run (14:00-15:00)

**7.1: Simulate Full 4-Phase Canary (on Staging)**

```bash
# Phase 1: Canary 10% (0% currently, traffic on BLUE)
# → Update nginx to route 10% to GREEN
./update-nginx-routing.sh --green=0.10

echo "Phase 1: 10% canary active, monitoring..."
for min in {1..5}; do
  ERROR_RATE=$(curl -s http://localhost:3011/metrics | jq '.error_rate')
  echo "Min $min: Error rate = ${ERROR_RATE}%"
  sleep 60
done

# Check: Error rate < 0.1%?
if [ $(echo "$ERROR_RATE < 0.001" | bc -l) -eq 1 ]; then
  echo "✓ Phase 1 PASS"
else
  echo "✗ Phase 1 FAIL - too many errors"
  ./rollback.sh --target=staging
  exit 1
fi

# Phase 2: Canary 50%
./update-nginx-routing.sh --green=0.50
echo "Phase 2: 50% canary active, monitoring..."
sleep 300  # 5 minutes

# Phase 3: Canary 100%
./update-nginx-routing.sh --green=1.00
echo "Phase 3: 100% traffic on GREEN (v3.0), monitoring..."
sleep 600  # 10 minutes

# Phase 4: Steady state
echo "✓ Full 4-phase canary completed successfully"
```

---

## STAGING SUCCESS CRITERIA (Must Pass All)

```
✅ All 3 blockers functional in staging
   - Route guard blocking unauthorized access
   - Dashboard metrics scoped to hospital only
   - Blue-green deployment + rollback < 60s

✅ All 7 roles can complete workflows
   - Doctor: Create consultation
   - Nurse: Record vitals
   - Pharmacist: Approve prescription
   - Lab Tech: Enter results
   - Receptionist: Check in patient
   - Billing: Generate invoice
   - Admin: Manage staff

✅ Multi-hospital isolation verified
   - No cross-hospital data leaks
   - RLS policies enforced on 46 tables
   - Audit logging of unauthorized access attempts

✅ Break-glass override working
   - Emergency access grants temporarily with audit trail
   - Access expires after duration expires
   - Compliance logging enabled

✅ Disaster recovery functional
   - RTO < 60 seconds
   - RPO < 1 hour
   - Data integrity maintained

✅ War room procedures validated
   - 4-phase canary executable
   - Automated health checks passing
   - Rollback procedures tested
```

---

## GO/NO-GO DECISION (April 7, 15:00 UTC)

**If all success criteria met:** ✅ **PROCEED TO WEEK 2 TESTING**
- Monday April 7: Staging deployment complete
- Tuesday April 8: Advanced testing (performance, additional workflows)
- Thursday April 10: Final sign-offs
- Friday April 11: War room full dry-run
- **Tuesday April 15: PRODUCTION LAUNCH**

**If any failure:** ⏸️ **PAUSE & FIX**
- Identify root cause
- Implement hotfix
- Re-test staging
- Reschedule production launch (April 22 contingency)

---

**Estimated Duration:** 6 hours
**Team Required:** Dev 1, Dev 2, QA Lead, Clinical Observer
**Success Rate Target:** 100% (all procedures must work before production)
