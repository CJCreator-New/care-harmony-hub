# CareSync HMS - Review 3 Consolidated Remediation and Tracking Plan

**Created:** February 9, 2026  
**Sources Merged:** `REview 1.md`, `Review 2.md`  
**Tracking Mode:** Milestone checklist with strict production gates

---

## 1) Consolidated Summary

This document merges both review reports into one execution plan with verifiable gates.

- Previous review scores: `8.5/10` and `7.0/10` (conflicting confidence levels).
- Unified baseline decision: use the stricter interpretation until verified by tests and code evidence.
- Current repo verification in this implementation cycle:
  - Security test suite moved from `22/24` to `27/27` passing.
  - URL sanitization and search-query sanitization protections were implemented and wired into key callsites.
  - Added dedicated P0 DB/RLS gate test coverage for relation existence and anon-access restrictions.
  - Build verification: `npm run build` passed.

---

## 2) Production Gate (Strict P0)

Production remains blocked until all P0 gates are verified.

| Gate ID | Requirement | Status | Evidence |
|---|---|---|---|
| P0-G1 | Security suite passes | DONE | `npx vitest run tests/security` -> `27/27` |
| P0-G2 | URL sanitization vulnerability closed | DONE | `tests/security/penetration/xss-prevention.test.tsx` passing |
| P0-G3 | Search query injection handling hardened | DONE | `tests/security/penetration/sql-injection.test.ts` passing |
| P0-G4 | Critical DB/RLS controls verified in target environment | IN_PROGRESS | `tests/security/p0-db-rls-gates.test.ts` passed; admin-level verification still pending |
| P0-G5 | Auth provider hardening verified (incl. leaked-password protection) | BLOCKED | Supabase management endpoint access denied (`403`) for current account |

---

## 3) Consolidated Issue Register

Status legend: `OPEN`, `IN_PROGRESS`, `READY_FOR_VERIFY`, `VERIFIED`, `BLOCKED`, `CLOSED`

| ID | Source | Finding | Severity | Owner | Status | Target Date | Evidence |
|---|---|---|---|---|---|---|---|
| SEC-001 | Both | URL sanitization gap (`javascript:`/`data:`) | P0 | Frontend/Security | VERIFIED | Feb 10, 2026 | `src/utils/sanitize.ts`, xss test passing |
| SEC-002 | Both | Search query sanitization inconsistent across `.ilike()`/`.or()` | P0 | Frontend/Security | VERIFIED | Feb 10, 2026 | callsites patched, sql test passing |
| SEC-003 | Review 2 | `patient_consents` table reported missing | P0 | Backend/DB | VERIFIED | Feb 11, 2026 | `p0-db-rls-gates` confirms relation exists in target DB |
| SEC-004 | Review 2 | Profiles RLS exposure (`hospital_id IS NULL`) | P0 | Backend/DB | IN_PROGRESS | Feb 11, 2026 | `p0-db-rls-gates` confirms anon cannot read null-scoped profiles; authenticated cross-hospital verification pending |
| SEC-005 | Review 2 | 2FA secret storage hardening | P0 | Backend/Security | IN_PROGRESS | Feb 11, 2026 | relation exists + anon read blocked; encrypted-at-rest/admin-path verification pending |
| SEC-006 | Review 2 | Leaked-password protection disabled | P0 | Security/DevOps | BLOCKED | Feb 11, 2026 | `supabase projects api-keys --project-ref wmxtzkrkscjwixafumym` -> `403 insufficient privileges` |
| SEC-007 | Review 2 | Over-permissive RLS (`USING(true)` scope review) | P1 | Backend/DB | IN_PROGRESS | Feb 12, 2026 | M3 migration added: `20260209100000_m3_rls_hardening.sql` (manual apply pending) |
| SEC-008 | Both | CORS restrictions require tightening | P1 | Backend/DevOps | READY_FOR_VERIFY | Feb 12, 2026 | wildcard CORS removed in edge functions; `CORS_ALLOWED_ORIGINS` rollout + redeploy pending |
| SEC-009 | Review 2 | Invitation token enumeration/rate-limit risk | P1 | Backend/Security | IN_PROGRESS | Feb 13, 2026 | validate/accept invitation endpoints hardened (uniform invalid response + rate limiting) |
| CODE-001 | Review 2 | Production `console.log` noise in hooks | P2 | Frontend | OPEN | Feb 14, 2026 | callsites identified |
| PERF-001 | Both | Appointment/search indexing review | P2 | Backend/DB | OPEN | Feb 15, 2026 | query/index benchmark pending |
| PERF-002 | Review 1 | High-volume log partitioning strategy | P2 | Backend/DB | OPEN | Feb 16, 2026 | design and migration plan pending |
| A11Y-001 | Review 1 | WCAG 2.1 AA completion and evidence | P2 | Frontend/QA | OPEN | Feb 17, 2026 | audit run pending |
| DOC-001 | Both | API/deployment/security documentation gaps | P3 | Docs/Platform | OPEN | Feb 18, 2026 | update plan pending |

---

## 4) Milestone Checklist

## M0 - Consolidation and Baseline (DONE)
- [x] Merge findings from both review files into one tracker.
- [x] Define strict P0 production gates.
- [x] Record reproducible baseline commands and results.

## M1 - Active P0 Security Remediation (DONE)
- [x] Implement shared URL sanitization utility.
- [x] Add safe link abstraction and wire into landing/header link surfaces.
- [x] Implement shared search sanitization helpers (`sanitizeSearchQuery`, `toIlikePattern`, `sanitizePostgrestFilterValue`).
- [x] Patch dynamic query callsites:
  - `src/hooks/usePaginatedQuery.ts`
  - `src/components/monitoring/LoggingDashboard.tsx`
  - `src/components/monitoring/ErrorTrackingDashboard.tsx`
  - `src/hooks/usePharmacy.ts`
- [x] Update penetration tests to validate sanitized query/link behavior.
- [x] Pass full security suite.

## M2 - Environment Verification for Critical Controls (IN_PROGRESS)
- [x] Verify `patient_consents` presence in target environment.
- [x] Verify anon access does not expose null-scoped `profiles` rows.
- [x] Verify `two_factor_secrets` relation exists and is not anonymously readable.
- [ ] Verify profiles policy behavior under authenticated cross-hospital scenarios.
- [ ] Verify 2FA secret encryption/hashing behavior with real data paths.
- [ ] Verify leaked-password protection enabled in auth provider (blocked until project admin access is provided).

## M3 - Security Hardening Follow-up (IN_PROGRESS)
- [x] Complete review of non-SELECT permissive policies and prepare selective hardening migration.
- [x] Implement CORS allowlist logic and remove wildcard CORS in edge functions.
- [x] Harden invitation endpoints for anti-enumeration and rate-limit behavior.
- [ ] Apply migration `supabase/migrations/20260209100000_m3_rls_hardening.sql` in target environment.
- [ ] Set Supabase edge-function secret `CORS_ALLOWED_ORIGINS` (comma-separated production origins).
- [ ] Redeploy updated edge functions and verify browser-origin behavior in production.

## M3 - Manual Supabase Steps (To Be Performed by Project Admin)
- [ ] Set secret:
  - `CORS_ALLOWED_ORIGINS=https://<your-prod-domain>,https://<your-admin-domain>`
- [ ] Deploy DB migration:
  - `supabase db push` (or apply `supabase/migrations/20260209100000_m3_rls_hardening.sql` via SQL editor)
- [ ] Redeploy updated functions:
  - Redeploy all functions changed in this patchset (invitation/auth plus operational endpoints now referencing `CORS_ALLOWED_ORIGINS`).
  - At minimum redeploy: `accept-invitation-signup`, `validate-invitation-token`, `create-hospital-admin`, `store-2fa-secret`, `verify-backup-code`, `verify-totp`, `verify-2fa`, `generate-2fa-secret`.
- [ ] Verify leaked-password protection toggle in Supabase Auth settings and capture screenshot/evidence.

## M4 - Compliance and Quality Follow-up (PENDING)
- [ ] Strengthen placeholder HIPAA assertions into deterministic checks.
- [ ] Complete WCAG 2.1 AA audit and remediation tickets.
- [ ] Reduce production console noise in targeted hooks.

## M5 - Performance and Documentation Follow-up (PENDING)
- [ ] Validate indexing strategy for high-frequency queries.
- [ ] Define archival/partitioning strategy for high-volume logs.
- [ ] Update API/security/deployment docs with implemented controls and evidence.

---

## 5) Evidence Log

### Test Evidence

1. Security suite run:
```bash
npx vitest run tests/security
```
Result: `6 files passed`, `27 tests passed`, `0 failed`.

2. Dedicated P0 DB/RLS gate run:
```bash
npx vitest run tests/security/p0-db-rls-gates.test.ts
```
Result: `1 file passed`, `3 tests passed`, `0 failed`.

3. Auth-provider access check:
```bash
supabase projects api-keys --project-ref wmxtzkrkscjwixafumym
```
Result: `403` insufficient privileges for management endpoint access.

4. CORS wildcard verification:
```bash
rg -n "Access-Control-Allow-Origin" supabase/functions -g "*.ts"
```
Result: edge function files now reference `CORS_ALLOWED_ORIGINS` or shared dynamic CORS helper (no `*` values remain).

5. Post-M3 security regression run:
```bash
npm run test:security
```
Result: `6 files passed`, `27 tests passed`, `0 failed`.

6. Build verification:
```bash
npm run build
```
Result: build completed successfully (`vite v7.3.0`, production bundle generated).

7. Type verification:
```bash
npm run type-check
```
Result: TypeScript check passed (`tsc --noEmit`).

### Code Evidence (Primary Changed Files)

- `src/utils/sanitize.ts`
- `src/components/ui/safe-link.tsx`
- `src/components/landing/EnhancedFooter.tsx`
- `src/components/landing/NavigationHeader.tsx`
- `src/hooks/usePaginatedQuery.ts`
- `src/components/monitoring/LoggingDashboard.tsx`
- `src/components/monitoring/ErrorTrackingDashboard.tsx`
- `src/hooks/usePharmacy.ts`
- `tests/security/penetration/xss-prevention.test.tsx`
- `tests/security/penetration/sql-injection.test.ts`
- `tests/security/p0-db-rls-gates.test.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/validate-invitation-token/index.ts`
- `supabase/functions/accept-invitation-signup/index.ts`
- `supabase/functions/create-hospital-admin/index.ts`
- `supabase/functions/store-2fa-secret/index.ts`
- `supabase/functions/verify-backup-code/index.ts`
- `supabase/functions/verify-totp/index.ts`
- `supabase/functions/verify-2fa/index.ts`
- `supabase/functions/generate-2fa-secret/index.ts`
- `supabase/migrations/20260209100000_m3_rls_hardening.sql`

---

## 6) Go / No-Go Decision

**Current decision:** `NO-GO` (strict gate policy still active)

Reason:
- P0-G1 to P0-G3 are complete.
- P0-G4 is in progress and still needs authenticated/admin-level verification evidence.
- P0-G5 is blocked due missing project admin privileges for Supabase management endpoints.

When P0-G4 and P0-G5 are verified with attached evidence in this file, decision can be reevaluated to `GO`.

---

## 7) Change Log

### February 9, 2026
- Created consolidated tracker from both review files.
- Implemented and validated URL/search sanitization improvements.
- Added dedicated P0 DB/RLS gate tests.
- Security suite improved to full pass (`27/27`).
- Confirmed production build success after implementation.

### February 9, 2026 (M3 Progress)
- Implemented shared CORS allowlist handling for edge functions (`CORS_ALLOWED_ORIGINS` support).
- Hardened invitation endpoints against enumeration and added stricter rate-limit behavior.
- Added migration `20260209100000_m3_rls_hardening.sql` to remove permissive non-SELECT write policies.
- Completed local validation (`npm run test:security`, `npm run type-check`, `npm run build`); pending manual Supabase apply/deploy.
