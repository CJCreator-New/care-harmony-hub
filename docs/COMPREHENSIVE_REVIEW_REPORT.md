# Comprehensive End-to-End Review Report

Date: 2026-03-03  
Project: care-harmony-hub

## Scope
This review covered frontend flows, auth and route protection, API/edge function patterns, data access and RLS checks, security test execution health, and core reliability controls.

## Executive Summary
Multiple high-severity issues were identified that should be resolved before production deployment. The most critical areas are:
- Security test pipeline reliability (Vitest/Playwright collision)
- RLS gate failure indicating potential profile exposure path
- Broken AI request auth headers in browser code
- Role lookup inconsistency in shared edge authorization

## Findings

### 1) High - Security test suite contamination (Vitest picks Playwright file)
- Severity: High
- Area: Test infrastructure / security assurance
- Files:
  - `vitest.config.ts:12`
  - `tests/e2e/tests/security/hipaa-security.spec.ts:13`

#### Description
`npm run test:security` executes a Playwright spec through Vitest, causing framework-level failure and invalidating security CI confidence.

#### Repro Steps
1. Run `npm run -s test:security`.
2. Observe error: `Playwright Test did not expect test.describe() to be called here`.

#### Impact
Security test results are not trustworthy; real regressions can be missed or masked by runner failures.

#### Recommended Remediation
1. Exclude `tests/e2e/**` from Vitest in `vitest.config.ts`.
2. Keep Playwright specs only under Playwright execution (`npm run test:e2e...`).
3. Add CI job separation: unit/integration (Vitest) vs e2e/security-ui (Playwright).

---

### 2) High - RLS gate test failure for anonymous profile exposure path
- Severity: High
- Area: Database security / data isolation
- File:
  - `tests/security/p0-db-rls-gates.test.ts:20`

#### Description
The gate test `verifies anonymous queries cannot expose null-scoped profiles` fails, indicating that anonymous access is not reliably blocked for `profiles` rows with `hospital_id IS NULL`.

#### Repro Steps
1. Run `npm run -s test:security`.
2. Observe failing assertion in `tests/security/p0-db-rls-gates.test.ts:33`.

#### Impact
Potential unauthorized exposure of profile metadata and multi-tenant boundary weakening.

#### Recommended Remediation
1. Harden RLS policies on `profiles` to explicitly deny anon reads.
2. Backfill and constrain `hospital_id` nullability where required.
3. Keep this probe test as a mandatory release gate.

---

### 3) High - Browser AI calls use `process.env` instead of Vite env
- Severity: High
- Area: API integration / runtime reliability
- Files:
  - `src/hooks/useAIClinicalSupport.ts:43`
  - `src/hooks/useAIClinicalSuggestions.ts:201`
  - `src/hooks/useClinicalPredictiveAnalytics.ts:58`

#### Description
Client code builds Authorization headers with `process.env.VITE_SUPABASE_ANON_KEY` in browser context. In Vite client runtime, this resolves incorrectly and often becomes `undefined`.

#### Repro Steps
1. Trigger any AI action from UI.
2. Inspect network request headers.
3. Observe `Authorization: Bearer undefined` or missing expected token behavior.

#### Impact
AI features silently fail or fall back; production behavior is degraded and error observability is reduced.

#### Recommended Remediation
1. Replace with `import.meta.env.VITE_*` where truly needed.
2. Prefer server-side auth forwarding instead of client-sent anon credentials.
3. Add runtime assertion/logging for missing auth headers before request dispatch.

---

### 4) High - Shared edge authorization role lookup inconsistency
- Severity: High
- Area: Authorization / edge functions
- File:
  - `supabase/functions/_shared/authorize.ts:29`

#### Description
Shared authorize helper fetches profile role using `.eq("id", user.id)` and `select("role")`, while the application user-profile model is primarily keyed on `user_id` and role ownership appears to be managed via role tables elsewhere.

#### Repro Steps
1. Invoke edge function using this helper with a valid authenticated user.
2. Compare role result against expected roles from app/session.
3. Observe false 403 outcomes in mismatched data layouts.

#### Impact
Valid users may be denied unexpectedly; authorization behavior can drift across services.

#### Recommended Remediation
1. Resolve identity by `user_id` consistently.
2. Use a single authoritative role source (e.g., `user_roles`) across app and edge functions.
3. Add automated tests for helper behavior per role and tenant.

---

### 5) Medium - Multiple session-timeout hooks registered concurrently
- Severity: Medium
- Area: Authentication UX / session lifecycle
- Files:
  - `src/contexts/AuthContext.tsx:310`
  - `src/App.tsx:139`
  - `src/components/layout/DashboardLayout.tsx:88`

#### Description
Session timeout logic is mounted in three places, potentially causing duplicate warnings, duplicate timeout triggers, and repeated logout calls.

#### Repro Steps
1. Sign in and remain idle near timeout threshold.
2. Observe repeated timeout warnings and/or repeated logout events.

#### Impact
Unstable session behavior and noisy UX; hard-to-debug auth edge cases.

#### Recommended Remediation
1. Keep timeout logic in one owner (recommended: `AuthContext`).
2. Remove duplicate hook mounts in route/layout layers.
3. Add unit test asserting single timer registration.

---

### 6) Medium - In-memory rate limiter cleanup ignores configured window
- Severity: Medium
- Area: Security controls / abuse prevention
- File:
  - `src/lib/security/rate-limiter.ts:28`

#### Description
`cleanup()` removes records older than fixed `60000ms`, regardless of configured `windowMs`.

#### Repro Steps
1. Call limiter with `windowMs > 60000`.
2. Wait just over 60s.
3. Observe prior requests are dropped early, weakening effective limit.

#### Impact
Long-window rate limits are bypassable in practice.

#### Recommended Remediation
1. Store per-key window metadata and clean using actual configured window.
2. Add tests for multiple window sizes.

---

### 7) Medium - Secondary Supabase client uses placeholder fallbacks
- Severity: Medium
- Area: Configuration safety / runtime correctness
- File:
  - `src/lib/supabase.ts:3`

#### Description
A second client module creates a Supabase client with placeholder fallback URL/key values.

#### Repro Steps
1. Import `src/lib/supabase.ts` without proper env values.
2. Client initializes with fake credentials.

#### Impact
Misconfiguration can pass startup and fail later in unpredictable ways.

#### Recommended Remediation
1. Fail fast when required env vars are missing.
2. Consolidate to a single typed client module (`src/integrations/supabase/client.ts`).

---

## Test Evidence Collected
- `npm run -s type-check` completed without reported type errors.
- `npm run -s test:security` failed with:
  - 1 failed assertion in `tests/security/p0-db-rls-gates.test.ts`
  - 1 failed suite due to Playwright spec executed by Vitest

## Release Readiness Assessment
Current status: Not production-ready.

Blocking items before deployment:
1. Fix test-runner segregation and restore deterministic security CI.
2. Resolve RLS gate failure for anonymous profile exposure path.
3. Correct AI request auth header construction in browser code.
4. Align shared edge authorization with canonical identity/role model.

## Notes
This document intentionally excludes mock-data/mock-auth findings per request.
