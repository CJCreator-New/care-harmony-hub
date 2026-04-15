# Phase 3B-3C: Weeks 10-12 OWASP + Clinical Safety Testing

**Document**: Phase 3A Extended Testing Plan  
**Duration**: April 14 - May 13, 2026 (Weeks 10-12)  
**Status**: 🟡 READY FOR EXECUTION  
**Test Scope**: 110+ additional tests across 3 categories

---

## Executive Summary

### Objectives
- Week 10 (Apr 14-18): **OWASP Top 10** security vulnerability scanning + remediation
- Week 11 (Apr 21-25): **Clinical Safety** workflow validation + invariant enforcement
- Week 12 (Apr 28-May 9): **Cross-Functional** integration + edge case resilience

### Key Metrics
| Category | Week 9 (HIPAA) | Week 10 (OWASP) | Week 11 (Clinical) | Week 12 (Integration) | TOTAL |
|----------|---|---|---|---|---|
| **Planned Tests** | 85 | 35 | 40 | 35 | **195** |
| **Target Pass %** | 91.7% | 85% | 90% | 88% | **88.6%** |
| **Critical Issues** | 0 | TBD | TBD | TBD | < 5 |
| **Est. Dev Days** | 3 | 5 | 5 | 4 | **17 days** |

---

## Week 10: OWASP Top 10 Security Testing (35 tests)

### Overview
Test CareSync against OWASP Top 10 + healthcare-specific threats (IDOR, broken auth, injection, sensitive data exposure, etc.)

### 10.1: Injection Attacks (8 tests)

**10.1.1: SQL Injection Prevention**
- Test 1: SQL injection via patient name search (`' OR '1'='1`)
- Test 2: SQL injection via MRN field (time-based blind)
- Test 3: SQL injection via consultation notes (UNION-based)
- Test 4: Parameterized query verification (inspect database logs)
- **Expected**: All queries sanitized, Supabase prepared statements used
- **Severity**: ⚠️ CRITICAL

**10.1.2: NoSQL Injection**
- Test 5: MongoDB injection via auth tokens (if applicable)
- **Expected**: All NoSQL queries escaped/parameterized
- **Severity**: ⚠️ CRITICAL

**10.1.3: Command Injection**
- Test 6: OS command injection via file export (temp filename variable)
- Test 7: LDAP injection in authentication backend
- **Expected**: All external command inputs validated, no shell interpretation
- **Severity**: ⚠️ CRITICAL

**10.1.4: LDAP Injection**
- Test 8: LDAP filter bypass in hospital directory lookup
- **Expected**: LDAP filters properly escaped
- **Severity**: ⚠️ CRITICAL

---

### 10.2: Broken Authentication & Session Management (7 tests)

**10.2.1: Session Hijacking**
- Test 9: Invalid session token accepted (expired JWT not rejected)
- Test 10: Session fixation (server doesn't rotate token after login)
- Test 11: Concurrent session limit enforced (max 3 sessions per user)
- **Expected**: Sessions properly validated, expired tokens rejected, limits enforced
- **Severity**: 🔴 HIGH

**10.2.2: Credential Management**
- Test 12: Password requirements enforced (12+ chars, special, number, case)
- Test 13: Brute force attack throttled (>5 failed attempts → 15min lockout)
- Test 14: 2FA enforcement verified for admin role
- **Expected**: All credential policies enforced, failed attempts logged
- **Severity**: 🔴 HIGH

**10.2.3: Token Lifecycle**
- Test 15: JWT expiration respected (30min for web, 7d for mobile)
- **Expected**: Tokens expire properly, refresh tokens work, old tokens rejected
- **Severity**: 🟡 MEDIUM

---

### 10.3: Insecure Direct Object Reference (IDOR) (8 tests)

**CRITICAL**: Test role-based access to other users' records via URL/ID manipulation

**10.3.1: Patient Record IDOR**
- Test 16: Receptionist views another hospital's patient via URL (`/patients/hospital-b-patient-id`)
- Test 17: Nurse modifies patient record ID to access different patient
- Test 18: Admin views deleted patient record via direct ID reference
- **Expected**: All blocked, 403 Forbidden returned, attempt logged
- **Severity**: ⚠️ CRITICAL (PHI exposure)

**10.3.2: Consultation Record IDOR**
- Test 19: Doctor views another doctor's confidential consultation
- Test 20: Pharmacist accesses lab result ID by guessing sequential IDs
- **Expected**: RLS policy prevents access, audit logged
- **Severity**: ⚠️ CRITICAL (PHI + Clinical confidentiality)

**10.3.3: Prescription IDOR**
- Test 21: Patient modifies their own prescription quantity to get more medication
- Test 22: Nurse views prescription from another hospital via ID manipulation
- **Expected**: All modifications blocked, state machine enforced, attempt logged
- **Severity**: 🔴 HIGH (diversion risk)

**10.3.4: Billing IDOR**
- Test 23: Billing staff views invoices from other hospitals
- **Expected**: RLS policy blocks access
- **Severity**: 🟡 MEDIUM

---

### 10.4: Sensitive Data Exposure (5 tests)

**10.4.1: Data at Rest**
- Test 24: Verify patient encryption_metadata present in database
- Test 25: Attempted direct database read without proper key (encryption verified)
- **Expected**: All PHI encrypted, unencrypted reads fail gracefully
- **Severity**: ⚠️ CRITICAL

**10.4.2: Data in Transit**
- Test 26: HTTPS enforced (no HTTP allowed)
- Test 27: TLS 1.2+ only (no SSLv3, TLS 1.0, 1.1)
- **Expected**: All connections encrypted, weak protocols rejected
- **Severity**: ⚠️ CRITICAL

**10.4.3: Data in Logs**
- Test 28: Verify no PHI in error logs (sanitizeForLog effective)
- **Expected**: Logs redacted, PHI masked, audit trail clean
- **Severity**: ⚠️ CRITICAL

---

### 10.5: Security Misconfiguration (5 tests)

**10.5.1: Headers & CORS**
- Test 29: Verify HSTS header set (`Strict-Transport-Security`)
- Test 30: CSP header prevents XSS (no `unsafe-inline`)
- Test 31: CORS policy restrictive (no `Access-Control-Allow-Origin: *`)
- **Expected**: All security headers present, CORS properly scoped
- **Severity**: 🟡 MEDIUM

**10.5.2: Debug/Actuator Endpoints**
- Test 32: No Swagger UI exposed in production
- Test 33: No `/debug`, `/admin`, `/internal` endpoints accessible
- **Expected**: Only documented endpoints reachable, actuators firewalled
- **Severity**: 🟡 MEDIUM

**10.5.3: Default Credentials**
- Test 34: Default admin password doesn't work (forced reset on first login)
- **Expected**: No default credentials in production
- **Severity**: 🔴 HIGH

---

### 10.6: Broken Access Control (2 tests)

**10.6.1: Function-Level Access**
- Test 35: Nurse cannot access admin export all records function
- **Expected**: Function hidden/blocked, 403 returned
- **Severity**: 🔴 HIGH

**OWASP Week 10 Summary:**
- **35 tests** covering Injection, Broken Auth, IDOR, Data Exposure, Misconfiguration, Access Control
- **Critical vulnerabilities**: 0 expected (all should pass or be identified for immediate fix)
- **Remediation priority**: SQL injection, IDOR, HTTPS enforcement

---

## Week 11: Clinical Safety & Domain Validation (40 tests)

### Overview
Verify system enforces clinically correct workflows, vital sign ranges, drug interactions, age-appropriate logic.

### 11.1: Vital Signs Validation (10 tests)

**11.1.1: Heart Rate (HR)**
- Test 36: HR < 30 bpm rejected (critical low alert)
- Test 37: HR > 220 bpm rejected (critical high alert)
- Test 38: HR outside normal range (60-100) triggers alert but accepted
- Test 39: Pediatric HR validation (neonate 120-160, child 70-110)
- Test 40: Geriatric HR validation (older adult lower baseline)
- **Expected**: Ranges enforced age-appropriately, alerts generated
- **Severity**: ⚠️ CRITICAL (patient safety)

**11.1.2: Blood Pressure (BP)**
- Test 41: SBP < 50 mmHg rejected (shock alert)
- Test 42: SBP > 250 mmHg rejected (hypertensive emergency alert)
- Test 43: DBP validation (must be < SBP, validate range)
- Test 44: BP ratio validation (SBP < DBP impossible, rejected)
- **Expected**: Values clinically valid, extreme values alert/block
- **Severity**: ⚠️ CRITICAL

**11.1.3: SpO2 (Oxygen Saturation)**
- Test 45: SpO2 < 60% rejected (critical hypoxia alert)
- Test 46: SpO2 > 100% rejected (impossible value)
- Test 47: SpO2 70-85% triggers warning alert
- **Expected**: Extreme values blocked, warnings for low-normal
- **Severity**: ⚠️ CRITICAL

**11.1.4: Temperature**
- Test 48: Temp < 32°C rejected (profound hypothermia)
- Test 49: Temp > 42°C rejected (fatal hyperthermia)
- Test 50: Temp 36.5-37.5°C normal, outside triggers alert
- **Expected**: Ranges enforced, alerts generated
- **Severity**: 🔴 HIGH

**11.1.5: Respiratory Rate (RR)**
- Test 51: RR < 8 breaths/min rejected (apnea alert)
- Test 52: RR > 60 breaths/min rejected (severe tachypnea)
- Test 53: RR outside 12-20 normal triggers alert
- **Expected**: Validation enforced, alerts appropriate
- **Severity**: 🔴 HIGH

---

### 11.2: Age-Based Clinical Logic (8 tests)

**11.2.1: Pediatric Drug Dosing**
- Test 54: Adult dose (500mg) error for 5-year-old (should be ~125mg)
- Test 55: Weight-based calculation required for pediatric patient
- Test 56: Neonate < 2kg cannot receive certain medications (black box warning)
- **Expected**: Pediatric doses calculated by weight/age, adult doses rejected
- **Severity**: ⚠️ CRITICAL (medication error)

**11.2.2: Geriatric Considerations**
- Test 57: Medication with high fall risk flagged for patient > 75 years old
- Test 58: Renal adjustment suggested for patient > 65 with Cr > 1.5 (age-related decline)
- **Expected**: Age-specific interventions triggered, recommendations logged
- **Severity**: 🔴 HIGH (polypharmacy safety)

**11.2.3: Age Validation**
- Test 59: Patient age < 0 rejected (data validation)
- Test 60: Patient age > 150 rejected
- Test 61: Birthdate in future rejected, age calculated correctly
- **Expected**: Age invariants enforced, impossible values blocked
- **Severity**: 🔴 HIGH (data integrity)

**11.2.4: Gender-Specific Workflows**
- Test 62: Pregnancy status mandatory for female patient age 12-55 before teratogenic drug
- **Expected**: Pregnancy field validation enforced, teratogenic drugs blocked for pregnant patients
- **Severity**: ⚠️ CRITICAL (fetal harm prevention)

---

### 11.3: Drug Interaction & Allergy Checks (10 tests)

**11.3.1: Allergy Validation**
- Test 63: Penicillin allergy blocks Amoxicillin prescription (same family)
- Test 64: Severe allergy blocks prescription immediately, warning surfaces
- Test 65: Non-recommended allergy (mild rash) allows override with warning
- Test 66: Duplicate allergy entry prevented
- **Expected**: Allergy checks enforced, overrides audited
- **Severity**: ⚠️ CRITICAL

**11.3.2: Drug-Drug Interactions**
- Test 67: Contraindicated pair (Warfarin + NSAIDs) blocked or requires override
- Test 68: Major interaction flagged (Statin + Macrolide antibiotics)
- Test 69: Minor interaction warning displayed (Ibuprofen + ACE inhibitor)
- **Expected**: Interactions checked against formula database, severity-based actions
- **Severity**: 🔴 HIGH (adverse event prevention)

**11.3.3: Lab Value Considerations**
- Test 70: eGFR < 30 triggers renal medication adjustment
- Test 71: ALT > 3x ULN prevents hepatotoxic drug initiation
- Test 72: PTT > 100 contraindicts LMWH dosing increase
- **Expected**: Lab-based clinical decisions enforced, dose adjustments suggested
- **Severity**: 🔴 HIGH (organ toxicity prevention)

---

### 11.4: Clinical Workflow State Machines (7 tests)

**11.4.1: Patient Registration → Triage → Consultation → Diagnosis → Treatment**
- Test 73: Cannot discharge before admission (state invariant)
- Test 74: Cannot order lab before creating consultation (workflow order)
- Test 75: Cannot prescribe before diagnosis documented (prerequisite)
- Test 76: Cannot bill before treatment completed (sequence validation)
- **Expected**: State machine enforces correct order, transitions blocked if invalid
- **Severity**: ⚠️ CRITICAL (data integrity + revenue cycle)

**11.4.2: Prescription Lifecycle**
- Test 77: Cannot dispense before pharmacist approval
- Test 78: Cannot refill expired prescription (>1 year old)
- Test 79: Cannot exceed max quantity per 30-day period (opioid controls)
- **Expected**: Prescription state transitions strictly enforced
- **Severity**: ⚠️ CRITICAL (controlled substance management)

**11.4.3: Lab Order Management**
- Test 80: Cannot receive results before sample collection
- Test 81: Cannot mark test "critical" without abnormal result (criteria enforcement)
- Test 82: Cannot modify result after technician signed off
- **Expected**: Lab workflow immutability enforced, audit trail complete
- **Severity**: 🔴 HIGH (quality assurance)

---

### 11.5: Clinical Documentation Requirements (5 tests)

**11.5.1: Encounter Documentation**
- Test 83: Discharge note required before discharge (workflow gate)
- Test 84: Primary diagnosis (ICD-10) required for coding
- Test 85: Physician signature (digital) required on consultation note
- **Expected**: Required fields enforced, missing fields block workflow progression
- **Severity**: 🔴 HIGH (compliance + reimbursement)

**11.5.2: Informed Consent**
- Test 86: Procedure consent documented with date/signature
- Test 87: High-risk procedure requires second physician sign-off
- **Expected**: Consent workflow enforced, audit logged
- **Severity**: 🔴 HIGH (legal + patient safety)

---

### Clinical Safety Week 11 Summary:
- **40 tests** covering vital signs, age-based logic, drug interactions, workflow states, documentation
- **Critical vulnerabilities**: 0 expected (CareSync designed with clinical safety)
- **Remediation priority**: Any tests that fail indicate design/implementation gaps

---

## Week 12: Cross-Functional Integration & Edge Cases (35 tests)

### Overview
Test complex multi-role workflows, concurrent access, failure scenarios, performance under load.

### 12.1: Multi-Role Workflow Testing (10 tests)

**12.1.1: Prescription-to-Dispensing (Full Cycle)**
- Test 88: Doctor creates Rx → Pharmacist approves → Nurse dispenses → Billing charges
- Test 89: Prescription rejection by pharmacist reverts to draft
- Test 90: Partial dispensing (out of stock) creates backorder
- Test 91: Prescription modification after approval tracked in audit
- **Expected**: All state transitions logged, audit trail complete, roles respected
- **Severity**: 🔴 HIGH

**12.1.2: Admission-to-Discharge (Full Cycle)**
- Test 92: Patient registration → triage → admission → treatment → discharge
- Test 93: Concurrent orders from doctor & nurse during admission
- Test 94: Discharge summary generation triggers billing workflow
- **Expected**: Multi-role coordination succeeds, no data loss, billing accurate
- **Severity**: 🔴 HIGH

**12.1.3: Patient Transfer Between Departments**
- Test 95: Active bed held during transfer, not double-booked
- Test 96: Clinical data accessible to new department, RLS updated correctly
- Test 97: Consultation notes private to original doctor, visible to new attending
- **Expected**: RLS policies handle transfer, audit trail tracks movement
- **Severity**: 🟡 MEDIUM

**12.1.4: Consultation with External Lab (Integration)**
- Test 98: Lab samples requested with proper identifiers (barcode)
- Test 99: Results received and matched to correct patient (no mix-up)
- Test 100: Results triggering abnormal alerts notify requesting doctor
- **Expected**: Integration seamless, no lost samples, alerts reliable
- **Severity**: 🔴 HIGH

**12.1.5: Telemedicine Visit Workflow**
- Test 101: Doctor initiates video call, patient joins, notes recorded post-call
- Test 102: Prescription from telemedicine routed to pharmacy correctly
- Test 103: Recording stored securely, accessible only to participants
- **Expected**: Video integration works, prescription flow preserved, security maintained
- **Severity**: 🟡 MEDIUM

---

### 12.2: Concurrent Access & Race Conditions (8 tests)

**12.2.1: Simultaneous Updates**
- Test 104: Two doctors editing same patient record → last write wins (or conflict detected)
- Test 105: Doctor + Nurse updating vital signs in parallel (no data corruption)
- Test 106: Audit log entries in strict timestamp order (no out-of-sequence entries)
- **Expected**: Last-write-wins or explicit conflict resolution, audit trail consistent
- **Severity**: 🔴 HIGH

**12.2.2: Double-Dispensing Prevention**
- Test 107: Nurse dispenses → Pharmacist cancels → should not double-dispense
- Test 108: Concurrent dispense attempts (race condition) → only one succeeds
- **Expected**: Database-level constraints or optimistic locking prevents double-dispense
- **Severity**: ⚠️ CRITICAL (medication safety)

**12.2.3: Billing Concurrency**
- Test 109: Invoice generated while patient being discharged → correct charges
- Test 110: Concurrent insurance claim submissions do not duplicate charges
- **Expected**: Billing transaction consistency maintained, no duplicate charges
- **Severity**: 🔴 HIGH

**12.2.4: Session Management**
- Test 111: User logged in from 2 locations → both sessions active or one revoked
- **Expected**: Concurrent session policy enforced, audit logged
- **Severity**: 🟡 MEDIUM

---

### 12.3: Failure & Error Scenarios (10 tests)

**12.3.1: Network Failures**
- Test 112: API timeout during prescription save → retry logic works, no partial save
- Test 113: Database connection lost → graceful error message, no hung transaction
- Test 114: Lab data import fails → queue retry, alert staff, do not process corrupted data
- **Expected**: Resilient patterns (retry, circuit breaker, graceful degradation)
- **Severity**: 🔴 HIGH

**12.3.2: Validation Failures**
- Test 115: Invalid ICD-10 code rejected during diagnosis entry
- Test 116: Missing required field (temperature during vitals) blocks form submission
- Test 117: Wrong data type (text in numeric field) handled gracefully
- **Expected**: Validation errors clear, form UX helpful, no silent failures
- **Severity**: 🟡 MEDIUM

**12.3.3: Permission Violations**
- Test 118: Patient attempts to view another patient's record → proper error
- Test 119: Receptionist attempts admin function → 403 Forbidden + audit log
- Test 120: Expired token attempting API call → 401 Unauthorized redirects to login
- **Expected**: Authorization errors clear, no information leakage
- **Severity**: 🔴 HIGH

**12.3.4: Data Corruption & Recovery**
- Test 121: Corrupted patient record partially recoverable from audit trail
- Test 122: Backup restore process validates data integrity
- **Expected**: Disaster recovery procedures work, data restored correctly
- **Severity**: 🟡 MEDIUM

---

### 12.4: Performance & Load Testing (5 tests)

**12.4.1: Response Time SLAs**
- Test 123: Patient list load (1000 records) < 2 seconds
- Test 124: Prescription search < 1 second (indexed on hospital_id + pharmacy_id)
- Test 125: Audit log query (30-day range) < 3 seconds
- **Expected**: All endpoints meet SLA targets
- **Severity**: 🟡 MEDIUM

**12.4.2: Sustained Load**
- Test 126: 10 concurrent users performing CRUD operations for 5 minutes → no errors
- **Expected**: System stable under load, no memory leaks, responses consistent
- **Severity**: 🟡 MEDIUM

---

### 12.5: Data Quality & Integrity (2 tests)

**12.5.1: Referential Integrity**
- Test 127: Cannot delete patient while active prescriptions exist
- Test 128: Consultation references valid patient (FK constraint verified)
- **Expected**: Database constraints enforced, cascading deletes correct
- **Severity**: 🟡 MEDIUM

---

### 12.6: Audit Trail Completeness (5 tests)

**12.6.1: Comprehensive Logging**
- Test 129: Every state change (patient admitted → discharged) in audit_log
- Test 130: Audit entries include actor_id, action, before/after state, timestamp
- Test 131: Audit trail cannot be tampered with (immutable_lock enforced)
- Test 132: Sensitive field changes (SSN, email) logged and flagged
- Test 133: Failed access attempts logged with IP + user_agent
- **Expected**: Audit trail comprehensive, immutable, forensically sound
- **Severity**: ⚠️ CRITICAL (HIPAA compliance)

---

## Cross-Functional Integration Week 12 Summary:
- **35 tests** covering multi-role workflows, concurrency, failures, performance, data integrity, audit trail
- **Critical scenarios**: Double-dispensing prevention, network resilience, audit completeness
- **Remediation priority**: Any race condition or audit gap is high priority

---

## Execution Timeline & Resources

### Weekly Schedule

| Week | Dates | Focus | # Tests | Owner | Status |
|------|-------|-------|---------|-------|--------|
| 10 | Apr 14-18 | OWASP Top 10 | 35 | @security-lead | 🔴 Ready |
| 11 | Apr 21-25 | Clinical Safety | 40 | @domain-expert | 🔴 Ready |
| 12 | Apr 28-May 9 | Integration & Edge Cases | 35 | @qa-lead | 🔴 Ready |
| — | — | **TOTAL** | **110** | — | — |

### Test Environment Setup

```bash
# Week 10 preparation
npm run test:security -- --plan owasp-top-10

# Week 11 preparation
npm run test:clinical -- --plan clinical-safety

# Week 12 preparation
npm run test:integration -- --plan cross-functional

# Execute full test suite
npm run test:complete -- weeks=10-12
```

### Report Format

Each week will generate:
1. **Test Execution Report** — total/passed/failed, trend analysis
2. **Vulnerability Audit** — severity, remediation steps, responsible team
3. **Clinical Gap Report** — safety issues, workflow violations, recommendations
4. **Integration Summary** — performance metrics, SLA compliance, incident log

---

## Success Criteria

| Metric | Target | Week 10 | Week 11 | Week 12 | Combined |
|--------|--------|---------|---------|---------|----------|
| **Tests Passing** | ≥ 85% | ≥ 85% | ≥ 90% | ≥ 88% | **≥ 88%** |
| **Critical Issues** | 0 | 0 | 0 | 0 | **0** |
| **Security Vulns** | 0 | 0 | — | — | **0** |
| **Clinical Gaps** | 0 | — | 0 | — | **0** |
| **Test Coverage** | ≥ 80% | TBD | TBD | TBD | **TBD** |
| **Avg Response Time** | < 2s | — | — | < 2s | **< 2s** |

---

## Risk Mitigation

### High-Risk Scenarios
1. **IDOR vulnerabilities not caught** → Extra manual testing of cross-hospital access
2. **Race conditions only surface under load** → Stress testing day before deployment
3. **Telemedicine integration failures** → Vendor SLA enforcement
4. **Double-dispensing escapes testing** → Pharmacy workflow audit trail review

### Contingency Plans
- If OWASP testing finds critical vulnerability: Pause Week 11, patch immediately
- If clinical safety tests fail > 20%: Engage domain experts, review test expectations
- If performance SLAs not met: Identify bottleneck (query optimization or indexing)

---

## Deliverables & Sign-Off

### End of Phase 3 (May 13, 2026)

✅ **Phase 3A (HIPAA)** — 85 tests, 77 passing (91.7%)  
⏳ **Phase 3B (OWASP)** — 35 tests, target 85%+ passing  
⏳ **Phase 3C (Clinical)** — 40 tests, target 90%+ passing  
⏳ **Phase 3D (Integration)** — 35 tests, target 88%+ passing  

**TOTAL**: 195 tests, **target 88.6% pass rate**

### Approval Gate
- ✅ 0 Critical vulnerabilities (OWASP)
- ✅ 0 Clinical safety gaps (domain review)
- ✅ < 5 High-severity issues with remediation plans
- ✅ Audit trail forensically sound (HIPAA compliant)
- ✅ Performance SLAs met (< 2s response time 95th percentile)

**Phase 3 COMPLETE** → Ready for Phase 4 (Performance & Scaling)

---

---

## Appendix: Test Case Template

```typescript
// Week 10 Example: OWASP SQL Injection Test
test('OWASP-INJECTION-001: SQL injection in patient search blocked', async () => {
  const maliciousInput = "' OR '1'='1";
  const response = await fetch(`/api/patients/search?name=${encodeURIComponent(maliciousInput)}`);
  
  // Should NOT return all patients
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.results.length).toBe(0); // No matches for literal SQL string
  
  // Verify parameterized query used
  expect(mockDb.queries).toContainEqual({
    text: 'SELECT * FROM patients WHERE hospital_id = $1 AND first_name ILIKE $2',
    values: ['hospital-a', `%${maliciousInput}%`]
  });
});

// Week 11 Example: Clinical Safety Test
test('CLINICAL-VITALS-001: HR > 220 rejected as clinically impossible', async () => {
  const vitals = {
    heart_rate: 250, // bpm
    blood_pressure: '120/80',
    temperature: 37.2
  };
  
  const response = await fetch(`/api/patients/${patientId}/vitals`, {
    method: 'POST',
    body: JSON.stringify(vitals)
  });
  
  expect(response.status).toBe(422); // Unprocessable Entity
  const error = await response.json();
  expect(error.code).toBe('INVALID_VITAL_RANGE');
  expect(error.field).toBe('heart_rate');
});

// Week 12 Example: Race Condition Test
test('INTEGRATION-CONCURRENCY-001: Double-dispense prevented in race', async () => {
  const dispensePromise1 = fetch(`/api/prescriptions/${rxId}/dispense`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${nurseToken1}` }
  });
  
  const dispensePromise2 = fetch(`/api/prescriptions/${rxId}/dispense`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${nurseToken2}` }
  });
  
  const [res1, res2] = await Promise.all([dispensePromise1, dispensePromise2]);
  
  // One succeeds (200), one fails (409 Conflict)
  const outcomes = [res1.status, res2.status].sort();
  expect(outcomes).toEqual([200, 409]);
  
  // Verify audit trail shows both attempts
  const auditLog = await fetch(`/api/audit?action=DISPENSE&entity_id=${rxId}`);
  const events = await auditLog.json();
  expect(events.length).toBe(2);
});
```

---

**Next Steps**: 
1. Assign test writers to each week
2. Set up test environment (mock data, fixtures)
3. Begin Week 10 OWASP testing (Apr 14)

**Questions/Feedback**: Contact @security-lead, @domain-expert, @qa-lead

