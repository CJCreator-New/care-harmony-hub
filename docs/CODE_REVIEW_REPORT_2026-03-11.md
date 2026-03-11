# CareSync HIMS — Code Security Audit Report

**Date**: 2026-03-11  
**Auditor**: GitHub Copilot — Code Review Skill  
**Scope**: `src/`, `supabase/functions/`, `services/`, `mobile-app/`  
**Standard**: OWASP Top 10 (2021), HIPAA §164.312 Technical Safeguards  
**Previous Report**: [docs/COMPREHENSIVE_REVIEW_REPORT.md](COMPREHENSIVE_REVIEW_REPORT.md)

---

## Executive Summary

The CareSync codebase demonstrates strong security posture overall. Core patterns are sound: `RoleProtectedRoute` guards every clinical route, `user_belongs_to_hospital()` enforces multi-tenant RLS at the database layer, PHI is encrypted via AES-GCM through `fieldEncryption`, and `sanitizeForLog` strips sensitive data before logging. This review identified **4 Medium** and **5 Low** findings, with no Critical or High severity issues. All findings are remediable with targeted fixes.

---

## Findings

### F-01 · MEDIUM — PBKDF2 Static Salt in `dataProtection.ts`

**OWASP**: A02 Cryptographic Failures  
**File**: [src/utils/dataProtection.ts](../src/utils/dataProtection.ts)  
**Lines**: ~L84–L91

**Description**: `initializeDefaultKey()` derives the AES-GCM key using a hardcoded PBKDF2 salt string (`'care-sync-salt'`). A static salt removes the entropy benefit of PBKDF2 — an attacker who obtains encrypted records can pre-compute a dictionary against the known salt.

**Repro**:
```ts
const key = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt: new TextEncoder().encode('care-sync-salt'),  // ← static
    iterations: 100000,
    hash: 'SHA-256'
  }, ...
```

**Remediation**: Store a cryptographically random, per-hospital salt in Supabase Vault and pass it at key derivation time. Alternatively, generate the salt once on first-run and persist it alongside the key version in `encryption_metadata`.

```ts
// Preferred: pull from Vault via edge function, not client-side
const salt = hexToBytes(import.meta.env.VITE_ENCRYPTION_SALT);
```

---

### F-02 · MEDIUM — Development Encryption Fallback is Client-Visible

**OWASP**: A02 Cryptographic Failures  
**File**: [src/utils/dataProtection.ts](../src/utils/dataProtection.ts)  
**Lines**: ~L68–L77

**Description**: When `VITE_ENCRYPTION_KEY` is absent in non-production builds, the code falls back to the literal string `'caresync-dev-key-do-not-use-in-prod'`. Because this is bundled into the browser JavaScript, it is trivially visible in any Vite dev/preview build. If a developer accidentally deploys a staging build without the env var set, PHI would be encrypted with a known key.

**Repro**: Build with `VITE_ENCRYPTION_KEY` unset in a `preview` environment; inspect the bundle for the fallback string.

**Remediation**: Remove the fallback entirely and throw unconditionally if the key is absent. Gate on `import.meta.env.DEV && !import.meta.env.VITE_TEST_MODE` to allow unit tests to pass a key via `vitest.config.ts` define.

```ts
if (!encryptionKey) {
  throw new Error('VITE_ENCRYPTION_KEY is required. Set it in .env.local for development.');
}
```

---

### F-03 · MEDIUM — Twilio Auth Token Exposed in Vite Bundle

**OWASP**: A02 Cryptographic Failures  
**File**: [src/utils/smsService.ts](../src/utils/smsService.ts)  
**Lines**: ~L55–L57

**Description**: `VITE_TWILIO_ACCOUNT_SID` and `VITE_TWILIO_AUTH_TOKEN` are read via `import.meta.env` and shipped to the browser. Twilio credentials in browser-accessible JS allow any user to send SMS from the hospital's account, incurring cost and enabling abuse regardless of authentication state.

**Remediation**: Move all Twilio calls behind a Supabase Edge Function. The browser should call `supabase.functions.invoke('send-sms', { body: { to, message } })`, and the edge function holds the secrets via Supabase Secrets (Deno's `Deno.env.get`). Remove all `VITE_TWILIO_*` env vars from the frontend.

---

### F-04 · MEDIUM — Missing `RoleProtectedRoute` on New Dashboard Routes

**OWASP**: A01 Broken Access Control  
**File**: [src/App.tsx](../src/App.tsx)  
**Context**: New routes added in this session

**Description**: `WardCensusDashboard`, `PharmacyInventoryDashboard`, and `LabTATDashboard` have been created but not yet registered in `App.tsx`. When added, they **must** be wrapped in `RoleProtectedRoute` with appropriate role constraints (e.g., `['admin', 'doctor', 'nurse']` for ward census; `['admin', 'pharmacist']` for pharmacy inventory). Omitting the guard would allow any authenticated user — including patients — to access clinical aggregated data.

**Remediation**:
```tsx
<RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'super_admin']}>
  <WardCensusDashboard />
</RoleProtectedRoute>

<RoleProtectedRoute allowedRoles={['admin', 'pharmacist', 'super_admin']}>
  <PharmacyInventoryDashboard />
</RoleProtectedRoute>

<RoleProtectedRoute allowedRoles={['admin', 'doctor', 'nurse', 'lab_technician', 'super_admin']}>
  <LabTATDashboard />
</RoleProtectedRoute>
```

---

### F-05 · LOW — `console.log` Leaks Infrastructure Details in `services/clinical-service`

**OWASP**: A09 Security Logging and Monitoring Failures  
**File**: `services/clinical-service/src/config/redis.ts` line 18

**Description**: `console.log('Connected to Redis')` logs a connection success message with no log level control. In containerized environments, stdout is captured by log aggregators visible to operators; however, this should use a structured logger (e.g., pino/winston) at `info` level so it can be filtered in production.

**Remediation**: Replace with the service's existing structured logger: `logger.info({ service: 'redis' }, 'Connected to Redis');`

---

### F-06 · LOW — Static Test Credentials in `services/clinical-service/src/test/setup.ts`

**OWASP**: A02 Cryptographic Failures  
**File**: `services/clinical-service/src/test/setup.ts`

**Description**: `process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'` and `ENCRYPTION_KEY = 'test-encryption-key-32-chars-long'` are committed. This is test-scoped and acceptable for local development, but if ever run against a real database (e.g., a shared staging schema), it could allow token forgery.

**Remediation**: Add a guard to abort if `DATABASE_URL` doesn't contain `localhost` or `127.0.0.1`:
```ts
if (!process.env.DATABASE_URL?.match(/localhost|127\.0\.0\.1/)) {
  throw new Error('Test setup must not run against a non-local database.');
}
```

---

### F-07 · LOW — Edge Functions Missing Request Body Size Limit

**OWASP**: A05 Security Misconfiguration  
**Files**: `supabase/functions/census-reports/index.ts`, `supabase/functions/billing-reconciliation/index.ts`

**Description**: Both new edge functions parse JSON request bodies (`await req.json()`) without a size guard. A large POST body (e.g., 50MB) could memory-exhaust a Deno isolate or cause slow processing.

**Remediation**: Add a guard before `req.json()`:
```ts
const contentLength = parseInt(req.headers.get('content-length') ?? '0');
if (contentLength > 64 * 1024) {
  return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: corsHeaders });
}
```

---

### F-08 · LOW — `devRoleSwitch.ts` Not Guarded Against `MODE === 'staging'`

**OWASP**: A05 Security Misconfiguration  
**File**: [src/utils/devRoleSwitch.ts](../src/utils/devRoleSwitch.ts)  
**Lines**: ~L7, L34

**Description**: `devRoleSwitch` is disabled only when `MODE === 'production'`. If a `staging` or `preview` Vite mode is used (e.g., `vite build --mode staging`), the developer role-switching UI would remain accessible, allowing any authenticated user to temporarily assume any role.

**Remediation**: Guard against all non-dev modes:
```ts
if (!import.meta.env.DEV) return null;
```

---

### F-09 · LOW — Mobile `AuthContext.tsx` Fetches `patient_id` Without Error Handling on Missing Profile

**OWASP**: A04 Insecure Design  
**File**: `mobile-app/app/src/contexts/AuthContext.tsx`

**Description**: The updated `AuthContext` performs `SELECT id FROM patients WHERE user_id = userId`. If a user is authenticated but has no corresponding `patients` record (e.g., a staff user who uses the app, or a newly registered patient before their record is created), the `patientId` resolves to `null` silently. Components that subsequently use `patientId!` (non-null assertion) will throw at runtime.

**Remediation**: Document that `patientId === null` is an expected state (pending record creation) and add a runtime check in any hook that depends on it:
```ts
if (!patientId) {
  setError('Patient profile not yet available. Please try again shortly.');
  return;
}
```

---

## Risk Matrix

| ID   | Severity | OWASP Category          | Effort | Priority |
|------|----------|-------------------------|--------|----------|
| F-01 | Medium   | A02 Cryptographic Fail  | Medium | P1       |
| F-02 | Medium   | A02 Cryptographic Fail  | Low    | P1       |
| F-03 | Medium   | A02 Cryptographic Fail  | High   | P2       |
| F-04 | Medium   | A01 Broken Access Ctrl  | Low    | P1       |
| F-05 | Low      | A09 Logging Failures    | Low    | P3       |
| F-06 | Low      | A02 Cryptographic Fail  | Low    | P3       |
| F-07 | Low      | A05 Misconfig           | Low    | P3       |
| F-08 | Low      | A05 Misconfig           | Low    | P2       |
| F-09 | Low      | A04 Insecure Design     | Low    | P2       |

---

## Positives Noted

- **RLS coverage**: `user_belongs_to_hospital()` is consistently applied across all clinical tables. Migration `20260311000007` hardens 6 additional tables.  
- **HIPAA PHI logging**: `sanitizeForLog` is correctly used in all hooks including the two new ones (`useLabCriticalAlerts`, `useAdmissionMedicationReconciliation`).  
- **Route protection**: `RoleProtectedRoute` is applied to every existing clinical route in `App.tsx`.  
- **Session management**: `useSessionTimeout` is centralized in `AuthContext` — no duplicate timer logic found.  
- **Environment variables**: All frontend secrets correctly use `import.meta.env.VITE_*` (not `process.env`) throughout `src/`.  
- **XSS surface**: No `dangerouslySetInnerHTML` or `eval()` usage found in the React source tree.  
- **Cipher selection**: AES-GCM with 100,000 PBKDF2 iterations is a strong choice; the static-salt issue (F-01) is the only weakness.

---

## Recommended Next Steps

1. **Immediate (P1)**: Register new dashboard routes with `RoleProtectedRoute` (F-04) before any deployment.
2. **Sprint 1 (P1)**: Harden encryption key derivation — per-hospital random salt via Vault (F-01) and remove dev fallback (F-02).
3. **Sprint 2 (P2)**: Move Twilio SMS to an edge function (F-03); guard `devRoleSwitch` against staging modes (F-08); add mobile null-check for `patientId` (F-09).
4. **Sprint 3 (P3)**: Adopt structured logging in `clinical-service` (F-05); add request body size limits to new edge functions (F-07); add test database guard (F-06).
