# CareSync HIMS - Security Review Checklist

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**For**: Security reviewers, developers, DevOps, compliance officers

---

## Table of Contents

1. [Pre-Deployment Security Checklist](#pre-deployment-security-checklist)
2. [Code Review Security Checks](#code-review-security-checks)
3. [Data Protection Checklist](#data-protection-checklist)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Security](#api-security)
6. [Infrastructure Security](#infrastructure-security)
7. [Incident Response Procedures](#incident-response-procedures)

---

## Pre-Deployment Security Checklist

### Before Every Release

```
□ Secrets & Credentials
  □ No hardcoded passwords, API keys, or tokens in code
  □ Secret manager (AWS Secrets, Vault) configured correctly
  □ Previous secrets rotated
  □ Environment variables verified
    - [ ] DB_URL uses vault reference (not plaintext)
    - [ ] API_KEYS are random, 32+ chars
    - [ ] JWT_SECRET rotated in last 90 days

□ Code Scanning
  □ Run static analysis: npm run lint
  □ Run security scan: npm run test:security
  □ Review SAST (static application security testing) results
  □ Address all HIGH and CRITICAL findings
  □ LOW findings documented with justification

□ Dependency Versions
  □ Run: npm audit
  □ Update vulnerable dependencies
  □ No known critical vulnerabilities in npm audit report
  □ Lock file committed (for reproducible builds)

□ OWASP Top 10 Verification
  □ A1: Injection → Parameterized queries, input validation
  □ A2: Broken authentication → JWT validation, 2FA tested
  □ A3: Sensitive data exposure → HTTPS enforced, encryption verified
  □ A4: XML External Entities → Not applicable (no XML parsing)
  □ A5: Broken access control → RBAC tested, RLS policies verified
  □ A6: Security misconfiguration → Config audited, defaults secure
  □ A7: XSS → React auto-escapes, CSP headers set
  □ A8: Insecure deserialization → No pickle/Marshal, using JSON
  □ A9: Using components with known vulnerabilities → npm audit clean
  □ A10: Insufficient logging → Audit trail complete, sensitive data not logged

□ Database Security
  □ All user-facing queries use parameterized statements
  □ RLS policies enabled on all sensitive tables
  □ Test RLS: Non-admin user cannot access other hospitals
  □ Audit trail table has append-only policy
  □ All PHI columns use encryption-at-rest where applicable
  □ Backups encrypted, tested for corruption
  □ SQL injection tests passed (SQLMap results reviewed)

□ Data Encryption
  □ Encryption keys stored in vault (not in code)
  □ Key rotation policy in place (90-day rotation)
  □ All PHI encrypted in transit (TLS 1.2+)
  □ All PHI encrypted at rest (AES-256-GCM)
  □ Encryption metadata persisted for audit
  □ Encryption/decryption tested end-to-end

□ API Security
  □ Rate limiting enforced (100-1000 req/min by endpoint)
  □ CORS configured (whitelist only legitimate origins)
  □ CSRF protection enabled
  □ API keys rotated
  □ OAuth scopes are minimal (least privilege)
  □ Request validation (no oversized payloads)

□ Frontend Security
  □ No sensitive data in localStorage (use sessionStorage or memory)
  □ No API keys exposed in bundle
  □ CSP headers strict (no unsafe-inline)
  □ Clickjacking protection (X-Frame-Options: DENY)
  □ XSS protection (Content-Security-Policy header)
  □ No console.log() of sensitive data (use sanitizeForLog)

□ DevOps & Infrastructure
  □ HTTPS/TLS enforced (redirect 80 → 443)
  □ SSL certificate valid (not self-signed in prod)
  □ Firewall rules reviewed (only necessary ports)
  □ DDoS protection enabled (CloudFlare, AWS Shield, etc)
  □ Monitoring & alerting configured
  □ Incident response plan reviewed
  □ Backup restore tested in last 30 days
  □ Disaster recovery runbook up to date

□ Compliance & Legal
  □ HIPAA compliance verified:
    - [ ] Business Associate Agreements signed
    - [ ] Audit trail complete
    - [ ] Breach notification plan ready
    - [ ] Data retention policy enforced
  □ GDPR compliance verified (if EU users):
    - [ ] Right to be forgotten implemented
    - [ ] Consent tracking enabled
    - [ ] Data processing agreement signed
  □ Security policy documented and reviewed
  □ Third-party vendor security assessed
```

---

## Code Review Security Checks

### When Reviewing a Pull Request

```
Security Review Checklist:

□ Input Validation
  ✓ All user inputs validated (length, format, type)
  ✓ Server-side validation (not just frontend)
  ✓ Whitelist approach (allow good data, reject bad)
  ✗ WRONG: Blacklist approach (block known bad patterns)
  
  Example ✓ GOOD:
  const email = z.string().email().parse(userInput);
  
  Example ✗ WRONG:
  if (!userInput.includes('<script>')) process(userInput);

□ Output Encoding
  ✓ HTML entities escaped in rendered text
  ✓ React auto-escapes by default (safe)
  ✓ JSON responses properly formatted
  
  Example ✓ GOOD:
  <div>{userText}</div>  // React escapes
  
  Example ✗ WRONG:
  <div dangerouslySetInnerHTML={{__html: userText}} />

□ SQL Injection Prevention
  ✓ Parameterized queries used (no string concatenation)
  ✓ ORM (Supabase PostgREST) handles escaping
  
  Example ✓ GOOD:
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId);  // Parameterized: safe
  
  Example ✗ WRONG:
  const query = `SELECT * FROM patients WHERE id = '${patientId}'`;
  // SQL injection vulnerable!

□ Authentication & Tokens
  ✓ JWT token validation on every request
  ✓ Token expiry enforced (< 1 hour for access, < 7 days refresh)
  ✓ Token refresh doesn't require password
  ✓ Logout clears tokens properly
  
  Example ✓ GOOD:
  const decoded = verify(token, JWT_SECRET);
  if (Date.now() > decoded.exp * 1000) throw 'Token expired';
  
  Example ✗ WRONG:
  // Accepting token without expiry check
  const decoded = jwt.decode(token);

□ Authorization (RBAC)
  ✓ Permission checked before action
  ✓ Checked at all 3 layers (frontend, API, database)
  
  Example ✓ GOOD:
  // Frontend UX
  if (!hasPermission('prescriptions:approve')) return null;
  
  // API validation
  if (!user.permissions.includes('prescriptions:approve'))
    return 403 Forbidden;
  
  // Database RLS policy
  CREATE POLICY "Only pharmacist can approve"
  ON prescriptions
  WHERE (approved_by_role = 'pharmacist');
  
  Example ✗ WRONG:
  // Only frontend check
  if (!userRole === 'pharmacist') return null;
  // Any API call bypasses this!

□ Sensitive Data Handling
  ✓ PHI never logged in plaintext
  ✓ sanitizeForLog() used for sensitive data
  ✓ No SSN, credit card in console or errors
  ✓ Exception messages don't expose internal details
  
  Example ✓ GOOD:
  logger.info('Patient created', { patientId });
  logger.error('Patient fetch failed', { 
    error: error.message,
    patientId  // Never: patientSSN, patientDate
  });
  
  Example ✗ WRONG:
  logger.info(`Patient ${patient.ssn} created`);
  // Exposing PHI in logs!

□ Encryption
  ✓ PHI encrypted with AES-256-GCM
  ✓ Encryption keys from vault (not hardcoded)
  ✓ Decryption only when needed
  
  Example ✓ GOOD:
  const { encrypted, iv } = encryptPHI(patient.ssn);
  // Store: {encrypted, iv, encryption_key_id}
  // Decrypt only when displaying to authorized user
  
  Example ✗ WRONG:
  patient.ssn = encrypt(patient.ssn, hardcodedKey);
  // Key in code = compromised!

□ API Rate Limiting
  ✓ Rate limits enforced (100-1000 req/min by endpoint)
  ✓ 429 Too Many Requests response sent
  ✓ Rate limit headers in response
  
  Example ✓ GOOD:
  Response: 429 Too Many Requests
  Headers:
    X-RateLimit-Limit: 100
    X-RateLimit-Remaining: 0
    X-RateLimit-Reset: 1618506000
  
  Example ✗ WRONG:
  No rate limiting → DDoS susceptibility

□ CORS Configuration
  ✓ CORS whitelist configured (not `Access-Control-Allow-Origin: *`)
  ✓ Credentials: 'include' only for same-origin
  
  Example ✓ GOOD:
  app.use(cors({
    origin: ['https://hospital.caresync.local'],
    credentials: true
  }));
  
  Example ✗ WRONG:
  app.use(cors({
    origin: '*'  // Any domain can access!
  }));

□ Error Handling
  ✓ Don't expose stack traces to users
  ✓ Log full error server-side for debugging
  ✓ Return generic error message to client
  
  Example ✓ GOOD:
  try {
    // operation
  } catch (error) {
    logger.error('Operation failed', { error: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  }
  
  Example ✗ WRONG:
  res.status(500).json({ error: error.stack });
  // Exposes internal details to attacker!

□ Dependencies
  ✓ npm audit shows no critical vulnerabilities
  ✓ Outdated dependencies updated regularly
  ✓ Lock file committed for reproducibility
  
  Example ✓ GOOD:
  $ npm audit
  // audited 245 packages in 2s
  // found 0 vulnerabilities
  
  Example ✗ WRONG:
  $ npm audit
  // found 3 high severity vulnerabilities in 2 packages

□ Comments & Documentation
  ✓ Security-sensitive logic has comments explaining why
  ✓ No credentials in comments
  ✓ No TODOs about security fixes (implement first)
```

---

## Data Protection Checklist

### PHI (Protected Health Information) Handling

```
□ Data Classification
  □ Identify what data is PHI (name, SSN, medical records, etc)
  □ Mark PHI fields in code comments
  □ Apply encryption/access controls accordingly

□ Data Minimization
  □ Collect only necessary data
  □ Delete data when no longer needed
  □ Retention policy documented (e.g., 7 years for medical records)

□ Encryption in Transit
  □ HTTPS/TLS 1.2+ enforced
  □ Certificate from trusted CA (not self-signed)
  □ Mixed content disabled (no http on https page)
  
□ Encryption at Rest
  □ Database encryption enabled
  □ Backup encryption enabled
  □ AES-256-GCM used for PHI
  □ Encryption keys in vault (not in code)

□ Access Control
  □ Only authorized roles see PHI
  □ RLS policies enforced at database
  □ Audit trail logs all PHI access
  □ Masking: SSN shows only last 4 digits (123-45-6789 → ****6789)

□ Audit Trail
  □ All PHI access logged (who, when, what data)
  □ Audit logs tamper-proof (append-only)
  □ Audit logs kept for 7 years minimum
  
  Fields logged:
  - user_id: who accessed
  - timestamp: when
  - action: 'read' | 'create' | 'update' | 'delete'
  - table_name: which table accessed
  - record_id: which record
  - ip_address: from where
  - user_agent: from what device

□ Data Retention & Deletion
  □ Policy documented and enforced
  □ Deletion removes all copies (DB, backups, cache)
  □ Deletion logged in audit trail
  □ Right-to-be-forgotten (GDPR) implemented
  □ Bulk deletion operations monitored

□ Backup Security
  □ Backups encrypted same as production data
  □ Backup access restricted (not all admins)
  □ Restore tested regularly (ensure not corrupted)
  □ Backup retention policy aligned with legal requirements
```

---

## Authentication & Authorization

### Authentication Checklist

```
□ Password Policy
  ✓ Minimum 12 characters
  ✓ Require: uppercase, lowercase, number, special char
  ✓ Prevent common passwords (password123, qwerty, etc)
  ✓ Password history (can't reuse last 5)
  ✓ Expiry: 90 days (warning at 80 days)

□ Multi-Factor Authentication (MFA)
  ✓ 2FA available for all users
  ✓ 2FA required for admin accounts
  ✓ 2FA backup codes provided (store safely)
  ✓ TOTP (Time-based One-Time Password) or push notification
  ✓ Regenerate codes after use (no replay attack)

□ Session Management
  ✓ Session timeout after 30 min of inactivity
  ✓ Force logout on critical actions (changing password)
  ✓ Only one active session per user (log out old session)
  ✓ Secure cookies: HttpOnly, Secure, SameSite=Strict

□ Account Lockout
  ✓ Lockout after 5 failed login attempts
  ✓ Lockout duration: 30 minutes
  ✓ Admin can manually unlock
  ✓ Lockout logged in audit trail

□ API Key Management
  ✓ API keys: 32+ characters, random, unique
  ✓ API key rotation: 90-day expiry
  ✓ Key exposed? Immediately invalidate and rotate
  ✓ Rate limiting per API key
```

### Authorization (RBAC) Checklist

```
□ Role Definitions
  □ 7 roles defined with specific permissions
  □ Principle of least privilege (minimal permissions)
  □ No privilege creep (permissions only when needed)

□ Permission Matrix
  □ 40+ permissions documented
  □ Data scoping: Can user access other departments' data?
  □ Functional scoping: Can user perform this action?
  □ Hospital isolation: Can user access other hospitals?

□ Permission Enforcement
  □ 3-layer enforcement:
    1. Frontend (UX): Hide controls from unauthorized users
    2. API (Validation): Reject unauthorized requests
    3. Database (RLS): Final enforcement, data isolation
    
  Example flow:
  - Frontend: User doesn't see "Approve" button (no permission)
  - If bypasses frontend: API rejects request 403 Forbidden
  - If somehow bypasses API: Database RLS policy blocks query

□ Testing
  □ E2E tests verify permission denials
  □ Test: Admin can do X
  □ Test: Doctor cannot do X
  □ Test: Multi-hospital isolation (can't see other hospitals)
  □ Test: Non-existent permission denied
```

---

## API Security

### API Endpoint Protection

```
□ Authentication
  ✓ Every endpoint requires JWT bearer token
  ✓ No public endpoints exposing PHI
  ✓ Token validation on every request
  ✓ Expired tokens rejected with 401 Unauthorized

□ Authorization
  ✓ Permission checked for requested action
  ✓ Missing permission returns 403 Forbidden
  ✓ Hospital isolation enforced (can't access other hospitals)

□ Input Validation
  ✓ Content-Type: application/json enforced
  ✓ POST body size limited (< 10 MB)
  ✓ Request fields validated:
    - Type checking (string vs number)
    - Length limits (name < 256 chars)
    - Format validation (email format, date format)
  ✓ Invalid requests return 400 Bad Request with details

□ Output Encoding
  ✓ Response is valid JSON
  ✓ Sensitive fields not exposed (no internal IDs, etc)
  ✓ No stack traces in error responses

□ Rate Limiting
  ✓ Read endpoints: 1000 req/minute
  ✓ Write endpoints: 100 req/minute
  ✓ Auth endpoints: 10 req/minute
  ✓ 429 Too Many Requests returned when exceeded
  ✓ Rate limit headers in response

□ CORS
  ✓ Only legitimate domains allow-listed
  ✓ Credentials: include only for same-origin
  ✓ No wildcard (*) origin

□ HTTP Headers
  ✓ X-Content-Type-Options: nosniff
  ✓ X-Frame-Options: DENY
  ✓ X-XSS-Protection: 1; mode=block
  ✓ Content-Security-Policy: strict (no unsafe-inline)
  ✓ Strict-Transport-Security: max-age=31536000
```

---

## Infrastructure Security

### Server & Network

```
□ TLS/SSL
  ✓ TLS 1.2 or higher enforced
  ✓ HTTP redirects to HTTPS
  ✓ Certificate from trusted CA
  ✓ Certificate valid for 1+ year
  ✓ Certificate renewal automated

□ Firewall & Network
  ✓ Firewall rules: Only necessary ports exposed
  ✓ Port 22 (SSH): Restricted to VPN/bastion host
  ✓ Port 80 (HTTP): Redirects to 443
  ✓ Port 443 (HTTPS): Only outward rule
  ✓ Database port: Not exposed to internet
  ✓ WAF (Web Application Firewall) enabled

□ DDoS Protection
  ✓ DDoS mitigation service (CloudFlare, AWS Shield)
  ✓ Rate limiting at CDN edge
  ✓ Geo-blocking for non-target regions
  ✓ Behavioral analysis to detect attacks

□ Database Security
  ✓ Database not publicly accessible
  ✓ Access only from application servers
  ✓ Strong passwords (25+ chars)
  ✓ Encryption in transit (SSL)
  ✓ Encryption at rest enabled
  ✓ Audit logging enabled

□ Container Security (Docker/Kubernetes)
  ✓ Container images scanned for vulnerabilities
  ✓ Root user not used in containers (unprivileged)
  ✓ Secrets not in container images (use vault)
  ✓ Resource limits set (CPU, memory)
  ✓ Pod Security Policy enforced

□ Monitoring & Logging
  ✓ SIEM configured (collect logs)
  ✓ Real-time alerting for suspicious activity
  ✓ Failed login attempts logged
  ✓ Failed API requests logged
  ✓ Access to sensitive data logged
  ✓ Logs kept for 90+ days
  ✓ Log integrity verified (can't be modified)

□ Backup & Disaster Recovery
  ✓ Backups encrypted
  ✓ Backups stored off-site (different region)
  ✓ Backup restore tested monthly
  ✓ RTO (Recovery Time Objective): < 1 hour
  ✓ RPO (Recovery Point Objective): < 15 minutes
  ✓ Disaster recovery plan documented and drilled
```

---

## Incident Response Procedures

### Breach Detection & Response

```
□ Detection
  ✓ Monitoring alerts on suspicious activity
  ✓ Unusual login patterns detected
  ✓ Large data exports flagged
  ✓ Permission escalation attempts blocked

□ Immediate Response (First Hour)
  1. [ ] Activate incident response team
  2. [ ] Notify: Security, Compliance, Legal
  3. [ ] Isolate affected systems (if needed)
  4. [ ] Preserve evidence (logs, backups)
  5. [ ] Notify affected patients if PHI exposed
  6. [ ] Document timeline

□ Investigation (Hours 1-24)
  1. [ ] Determine scope: How much data? Which records?
  2. [ ] Identify cause: Malware? Human error? Misconfig?
  3. [ ] Identify timeline: When did breach occur? How long exposed?
  4. [ ] Review logs: Who accessed what?
  5. [ ] Notify regulators (HHS/OCR for HIPAA breach)

□ Remediation
  1. [ ] Patch vulnerability
  2. [ ] Rotate credentials
  3. [ ] Strengthen access controls
  4. [ ] Notify affected users to change passwords
  5. [ ] Offer credit monitoring (if financial data exposed)

□ Post-Incident
  1. [ ] Root cause analysis (RCA)
  2. [ ] Implement preventive measures
  3. [ ] Update security policies
  4. [ ] Retrain staff if human error involved
  5. [ ] Document lessons learned

Contact Information:
- Incident Commander: security@caresync.local
- HIPAA Privacy Officer: privacy@caresync.local
- Legal: legal@caresync.local
- HHS/OCR report: https://www.hhs.gov/ocr/privacy/hipaa/to-report-a-breach/
```

---

## Quick Reference: Common Vulnerabilities

| Vulnerability | Prevention |
|---|---|
| **SQL Injection** | Parameterized queries, ORM, never concatenate SQL |
| **XSS (Cross-Site Scripting)** | React auto-escapes, CSP headers, sanitize on output |
| **CSRF (Cross-Site Request Forgery)** | SameSite cookies, CSRF tokens, verify origin |
| **Broken Auth** | Strong passwords, 2FA, session timeout, JWT validation |
| **Broken Access Control** | RBAC, RLS policies, 3-layer enforcement, test perms |
| **Sensitive Data Exposure** | Encryption in transit (HTTPS) & at rest (AES-256) |
| **Weak Crypto** | AES-256-GCM for encryption, bcrypt for passwords |
| **Insecure Deserialization** | Use JSON, avoid pickle/Marshal, validate input |
| **Using Vulnerable Components** | npm audit regularly, update dependencies |
| **Insufficient Logging** | Audit trail on all PHI access, tamper-proof logs |

---

## Compliance Frameworks

```
□ HIPAA (Health Insurance Portability & Accountability Act)
  - Required for US healthcare
  - Focuses on: Confidentiality, Integrity, Availability (CIA)
  - Key requirements: Encryption, audit trails, risk assessments, breach notification

□ GDPR (General Data Protection Regulation)
  - Required for EU users' data
  - Focuses on: User rights, data minimization, consent
  - Key requirements: Right to access, right to delete, consent tracking

□ HITECH Act
  - Strengthens HIPAA requirements
  - Increased penalties for breaches

□ State Laws
  - CCPA (California)
  - MTBSA (Texas)
  - Other state privacy laws

□ NIST Cybersecurity Framework
  - Identify, Protect, Detect, Respond, Recover
  - Best practices for healthcare IT
```

---

## Escalation Matrix

| Severity | Examples | Response Time | Action |
|----------|----------|---|---|
| **CRITICAL** | Unauthorized data access, RCE, ransomware | 15 min | Isolate systems, notify CEO |
| **HIGH** | SQL injection found, password db compromised | 1 hour | Patch, rotate credentials, monitor |
| **MEDIUM** | Missing audit log, weak password policy | 24 hours | Review, document fix plan |
| **LOW** | Minor code issue, documentation gap | 1 week | Schedule fix in sprint |

---

**Questions?** Contact: security@caresync.local

**Last Security Audit**: April 1, 2026  
**Next Audit**: July 1, 2026 (quarterly)
