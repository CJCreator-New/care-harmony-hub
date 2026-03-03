# CareSync HMS — Comprehensive End-to-End Review Report

**Date:** February 2026  
**Reviewer:** Automated Codebase Analysis  
**Scope:** Full application — UI, API, Auth, DB, Workflows, Security, Performance  
**Status:** FINDINGS DOCUMENTED — Remediation Required Before Production

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| 🔴 CRITICAL | Data loss, security breach, or complete feature failure |
| 🟠 HIGH | Significant functional breakage or security risk |
| 🟡 MEDIUM | Degraded UX, partial failure, or code quality issue |
| 🟢 LOW | Minor issue, style, or improvement opportunity |

---

## Executive Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Security | 3 | 4 | 3 | 1 | 11 |
| Authentication & Authorization | 2 | 2 | 2 | 0 | 6 |
| Data Integrity | 2 | 3 | 4 | 2 | 11 |
| API & Database | 1 | 4 | 3 | 2 | 10 |
| Workflow & Business Logic | 1 | 5 | 4 | 1 | 11 |
| Performance | 0 | 2 | 5 | 3 | 10 |
| Error Handling | 0 | 3 | 6 | 2 | 11 |
| Code Quality | 0 | 1 | 5 | 6 | 12 |
| **TOTAL** | **9** | **24** | **32** | **17** | **82** |

---

## 1. SECURITY VULNERABILITIES

---

### SEC-001 🔴 CRITICAL — E2E Mock Auth Enabled in Production Risk

**File:** `src/contexts/AuthContext.tsx:L155`  
**Description:** The E2E mock authentication bypass is controlled solely by `VITE_E2E_MOCK_AUTH=true`. If this env variable is accidentally set in a staging or production build, any user can log in as any role (admin, doctor, etc.) using hardcoded credentials (`TestPass123!`) with no real Supabase auth check. The mock tokens (`e2e-access-{id}`) are not validated by any backend.

**Reproducible Steps:**
1. Set `VITE_E2E_MOCK_AUTH=true` in `.env`
2. Navigate to `/hospital/login`
3. Enter `admin@testgeneral.com` / `TestPass123!`
4. Full admin access granted with no real authentication

**Impact:** Complete authentication bypass — all 7 roles accessible without credentials.

**Remediation:**
```typescript
// AuthContext.tsx — add build-time guard
const isE2EMockAuthEnabled =
  typeof window !== 'undefined' &&
  import.meta.env.VITE_E2E_MOCK_AUTH === 'true' &&
  import.meta.env.DEV; // ← ADD THIS: block mock auth in production builds
```
Also add to CI pipeline: `grep -r "VITE_E2E_MOCK_AUTH=true" .env* && exit 1`

---

### SEC-002 🔴 CRITICAL — `supabase.auth.admin` Called from Browser Client

**File:** `src/utils/adminUserManagementService.ts:L17, L130, L148`  
**Description:** `supabase.auth.admin.createUser()`, `deleteUser()`, and `updateUserById()` require the `service_role` key. The file itself acknowledges this with a `throw new Error(...)` comment, but the code still reaches `auth.admin.deleteUser()` and `auth.admin.updateUserById()` in `deleteUser()` and `resetPassword()` methods — these will silently fail or expose the service key if it is ever placed in `VITE_*` env vars.

**Reproducible Steps:**
1. Call `AdminUserManagementService.deleteUser(userId)` from the browser
2. If `SUPABASE_SERVICE_KEY` is mistakenly set as a `VITE_` variable, it is exposed in the JS bundle

**Remediation:** Move all `auth.admin.*` calls to a Supabase Edge Function. The browser client should only call the edge function endpoint.

---

### SEC-003 🔴 CRITICAL — `generateTemporaryPassword` Uses `Math.random()`

**File:** `src/utils/adminUserManagementService.ts:L183`  
**Description:** Temporary passwords are generated with `Math.floor(Math.random() * charset.length)`. `Math.random()` is not cryptographically secure and can be predicted, allowing an attacker to brute-force temporary passwords.

**Reproducible Steps:**
1. Admin creates a new staff member
2. Temporary password generated with `Math.random()`
3. Password is predictable given seed knowledge

**Remediation:**
```typescript
private static generateTemporaryPassword(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint32Array(12);
  crypto.getRandomValues(array); // ← Use Web Crypto API
  return Array.from(array, (n) => charset[n % charset.length]).join('');
}
```

---

### SEC-004 🟠 HIGH — Supabase Client Exposes URL/Key in Bundle Without Validation

**File:** `src/integrations/supabase/client.ts:L4-L5`  
**Description:** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are read directly with no validation. If either is undefined (misconfigured deployment), the client silently creates an invalid Supabase instance that makes requests to `undefined` — causing cryptic network errors rather than a clear startup failure.

**Remediation:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing required Supabase environment variables');
}
```

---

### SEC-005 🟠 HIGH — `sanitize.ts` Imports DOMPurify but `sanitization.ts` Does Not

**Files:** `src/utils/sanitize.ts:L1`, `src/lib/security/sanitization.ts`  
**Description:** Two parallel sanitization modules exist. `sanitize.ts` correctly uses DOMPurify for XSS prevention. `sanitization.ts` uses only a regex `replace(/<[^>]*>/g, '')` which is bypassable with malformed HTML (e.g., `<scr<script>ipt>`). Components importing from `sanitization.ts` are not fully protected.

**Remediation:** Consolidate to one module. Replace `sanitization.ts`'s `sanitizeHtml` with DOMPurify, or re-export from `sanitize.ts`.

---

### SEC-006 🟠 HIGH — `assignRole` Has No Hospital Scope Guard

**File:** `src/utils/adminUserManagementService.ts:L120`  
**Description:** `assignRole(userId, role)` updates `user_roles` with only `.eq('user_id', userId)` — no `hospital_id` filter. An admin from Hospital A could theoretically reassign roles for a user in Hospital B if RLS is misconfigured.

**Remediation:**
```typescript
static async assignRole(userId: string, role: UserRole, hospitalId: string): Promise<{ error?: Error }> {
  const { error } = await supabase
    .from('user_roles')
    .update({ role })
    .eq('user_id', userId)
    .eq('hospital_id', hospitalId); // ← Required
```

---

### SEC-007 🟠 HIGH — `updateUser` Derives `first_name` from Email

**File:** `src/utils/adminUserManagementService.ts:L80`  
**Description:** `updates.email?.split('@')[0]` is used as `first_name` in the profile update. This means updating a user's role also overwrites their first name with the email prefix — a data corruption bug that also reveals internal logic.

**Remediation:** Pass `first_name` and `last_name` explicitly in the `updates` object and use them directly.

---

### SEC-008 🟡 MEDIUM — Browser Notification Permission Requested Without User Gesture

**File:** `src/hooks/useEnhancedNotifications.ts:L100`  
**Description:** `Notification.requestPermission()` is called inside a realtime message handler (not a user gesture). Modern browsers block this and it silently fails, meaning urgent notifications are never shown.

**Remediation:** Request notification permission on an explicit user action (e.g., a "Enable Notifications" button in settings).

---

### SEC-009 🟡 MEDIUM — `safeFetch` Signal Merging Has a Bug

**File:** `src/integrations/supabase/client.ts:L14`  
**Description:** `(init as any).signal` is used to detect an existing signal, but the merged signal logic only uses `controller.signal` when no signal is present. If the caller provides a signal that aborts before the 10s timeout, the `controller` is never aborted, causing a potential resource leak.

**Remediation:** Use `AbortSignal.any([controller.signal, init.signal])` (or a polyfill) to merge both signals.

---

### SEC-010 🟡 MEDIUM — `sanitizeLogMessage` Applied Inconsistently

**Files:** Multiple hooks and services  
**Description:** `sanitizeLogMessage` is correctly used in some `console.error` calls but missing in others (e.g., `console.error('Error creating prescription:', err)` in `ConsultationWorkflowPage.tsx:L218`). PHI could leak into browser console logs in production.

**Remediation:** Enforce via ESLint rule: `no-restricted-syntax` on bare `console.error` calls with non-sanitized arguments.

---

### SEC-011 🟢 LOW — `devLog` Uses `process.env.NODE_ENV` Instead of `import.meta.env`

**File:** `src/utils/sanitize.ts:L8`  
**Description:** In a Vite project, `process.env.NODE_ENV` may not be tree-shaken correctly. `import.meta.env.DEV` is the correct Vite idiom and guarantees dead-code elimination in production builds.

**Remediation:** Replace `process.env.NODE_ENV === 'development'` with `import.meta.env.DEV`.

---

## 2. AUTHENTICATION & AUTHORIZATION

---

### AUTH-001 🔴 CRITICAL — `ProtectedRoute` Race Condition on Initial Load

**File:** `src/App.tsx:L108`  
**Description:** `ProtectedRoute` checks `!isProfileReady` and shows a spinner, but `isProfileReady` is set to `true` in `fetchUserData`'s `finally` block even when the fetch fails. If the profile fetch errors (network issue, RLS denial), `isProfileReady` becomes `true` with `profile=null`, `hospital=null`, `roles=[]` — triggering an immediate redirect to `/hospital/account-setup` for an already-configured user.

**Reproducible Steps:**
1. Log in with a valid user
2. Simulate a network error during profile fetch (DevTools → offline for 1s)
3. User is redirected to account-setup despite having a complete account

**Remediation:** Track fetch error state separately. Only redirect to account-setup after a successful fetch confirms the data is missing.

---

### AUTH-002 🔴 CRITICAL — `RoleProtectedRoute` Loads with Empty Roles Array

**File:** `src/components/auth/RoleProtectedRoute.tsx:L28`  
**Description:** The loading condition is `isLoading || (isAuthenticated && roles.length === 0)`. However, after `fetchUserData` completes, if a user genuinely has no roles assigned, this spinner loops forever — the user is stuck on a loading screen with no error message or redirect.

**Reproducible Steps:**
1. Create a user with no role assigned in `user_roles`
2. Log in and navigate to any protected route
3. Infinite loading spinner — no feedback

**Remediation:** Add a timeout or check `isProfileReady` to break out of the loading state and show an appropriate "No role assigned" error.

---

### AUTH-003 🟠 HIGH — `switchRole` Does Not Validate Against DB

**File:** `src/contexts/AuthContext.tsx:L340`  
**Description:** `switchRole` only checks `roles.includes(targetRole)` against the in-memory `roles` array. If roles were revoked server-side after login, the user can still switch to the revoked role until they log out.

**Remediation:** Re-fetch roles from DB before allowing a role switch, or use short-lived role tokens with server-side validation.

---

### AUTH-004 🟠 HIGH — `PublicRoute` Does Not Check `isLoading`

**File:** `src/App.tsx:L155`  
**Description:** `PublicRoute` immediately redirects to `/dashboard` if `isAuthenticated` is true, but does not wait for `isLoading` to resolve. On initial page load, `isAuthenticated` may briefly be `false` before the session is restored, causing a flash of the login page for authenticated users.

**Remediation:**
```typescript
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
```

---

### AUTH-005 🟡 MEDIUM — Duplicate `reception@testgeneral.com` and `receptionist@testgeneral.com` Share Same ID

**File:** `src/contexts/AuthContext.tsx:L97-L107`  
**Description:** Both email aliases map to the same mock user ID `00000000-0000-0000-0000-000000000013`. Same for `pharmacy@` and `pharmacist@`, `lab@` and `labtech@`. This is intentional for test flexibility but creates confusion in test reports and could mask role-isolation bugs if tests use the wrong alias.

**Remediation:** Document the aliases explicitly in `tests/e2e/config/test-users.ts` and add a lint check to prevent accidental use of deprecated aliases.

---

### AUTH-006 🟡 MEDIUM — `useSessionTimeout` Called Twice for Authenticated Users

**File:** `src/App.tsx:L100`, `src/contexts/AuthContext.tsx:L196`  
**Description:** `useSessionTimeout` is called inside `AuthProvider` (line 196 of AuthContext) AND inside `ProtectedRoute` (line 100 of App.tsx). This creates two competing timeout timers for the same session, potentially causing premature logout or double-logout calls.

**Remediation:** Remove the `useSessionTimeout` call from `ProtectedRoute` — it is already handled in `AuthProvider`.

---

## 3. DATA INTEGRITY

---

### DATA-001 🔴 CRITICAL — Consultation Completion Has No Transaction — Partial Writes Possible

**File:** `src/pages/consultations/ConsultationWorkflowPage.tsx:L155-L280`  
**Description:** The consultation completion flow performs 6+ sequential database writes (update consultation, insert document, create prescriptions, create lab orders, create invoice, create tasks) with no transaction wrapper. If any step fails mid-way (e.g., lab order insert fails), the consultation is marked `completed` but lab orders are missing — the doctor has no indication and the lab never receives the orders.

**Reproducible Steps:**
1. Complete a consultation with lab orders
2. Simulate a DB error on lab order insert (e.g., disconnect network after prescription write)
3. Consultation shows "completed" but lab orders are absent

**Remediation:** Wrap the entire completion sequence in a Supabase Edge Function that uses a PostgreSQL transaction, or implement a saga pattern with compensating actions.

---

### DATA-002 🔴 CRITICAL — `useGetOrCreateConsultation` Has No Hospital Scope on Existing Consultation Lookup

**File:** `src/hooks/useConsultations.ts:L175`  
**Description:** The existing consultation lookup queries `.eq('patient_id', patientId).neq('status', 'completed')` with no `.eq('hospital_id', hospital.id)`. If a patient was previously seen at another hospital (same Supabase instance, multi-tenant), a doctor at Hospital B could open and continue a consultation belonging to Hospital A.

**Remediation:**
```typescript
const { data: existingConsultation } = await supabase
  .from('consultations')
  .select(...)
  .eq('patient_id', patientId)
  .eq('hospital_id', hospital.id) // ← ADD THIS
  .neq('status', 'completed')
  .maybeSingle();
```

---

### DATA-003 🟠 HIGH — `useAddToQueue` Idempotency Check Uses `created_at` Date Filter That Can Miss Entries

**File:** `src/hooks/useQueue.ts:L78`  
**Description:** The duplicate check filters by `gte('created_at', \`${today}T00:00:00\`)`. If a patient is checked in just before midnight and the duplicate check runs just after midnight, the existing entry is not found and a duplicate queue entry is created.

**Remediation:** Remove the date filter from the idempotency check, or use a DB-level unique constraint on `(hospital_id, patient_id, date(created_at))` for active statuses.

---

### DATA-004 🟠 HIGH — `updateUser` in `adminUserManagementService` Overwrites `first_name` with Email Prefix

**File:** `src/utils/adminUserManagementService.ts:L80`  
**Description:** `first_name: updates.email?.split('@')[0]` — if `updates.email` is undefined (role-only update), this sets `first_name` to `undefined`, potentially NULLing the field in the database.

**Reproducible Steps:**
1. Admin updates a user's role only (no email change)
2. `updates.email` is undefined → `first_name` becomes `undefined`
3. Profile `first_name` is set to NULL in DB

**Remediation:** Only include `first_name` in the update payload if it is explicitly provided.

---

### DATA-005 🟠 HIGH — Lab Order `ordered_by` Stores Profile ID, Not Auth User ID

**File:** `src/pages/laboratory/LaboratoryPage.tsx:L108`  
**Description:** `resolveAuthUserIdByProfileId` is called to convert `ordered_by` (profile ID) to an auth user ID for notification routing. This is a workaround for a schema inconsistency. If `resolveAuthUserIdByProfileId` fails or returns null, the notification is silently dropped — the doctor never receives lab results.

**Remediation:** Standardize `ordered_by` to store auth user ID at the point of insertion in `useCreateLabOrder`, eliminating the need for runtime resolution.

---

### DATA-006 🟡 MEDIUM — `useAutoSaveConsultation` Debounce Does Not Flush on Unmount

**File:** `src/hooks/useConsultations.ts:L280`  
**Description:** The auto-save debounce timer is cleared on unmount (`clearTimeout`), but the pending save is discarded. If a doctor types notes and immediately navigates away within the 30-second window, the last changes are lost.

**Remediation:** In the cleanup function, immediately flush the pending save before clearing the timer.

---

### DATA-007 🟡 MEDIUM — `markAsRead` in `useEnhancedNotifications` Has N+1 Write Pattern

**File:** `src/hooks/useEnhancedNotifications.ts:L155`  
**Description:** `markAsRead` fetches all messages, then issues one UPDATE per message in a `Promise.all`. For 50 messages, this is 51 DB round-trips. Under load, this can cause rate limiting or partial failures.

**Remediation:** Use a single RPC call: `supabase.rpc('mark_messages_read', { message_ids: messageIds, user_id: profile.user_id })`.

---

### DATA-008 🟡 MEDIUM — `ConsultationStatus` Type Has Overlapping Values

**File:** `src/hooks/useConsultations.ts:L14-L25`  
**Description:** `ConsultationStatus` includes both workflow stages (`patient_overview`, `clinical_assessment`) and lifecycle states (`in-progress`, `completed`). The `Consultation` interface has both `status: ConsultationStatus` and `consultation_status?: 'active' | 'completed' | 'cancelled'` — two fields representing the same concept with different value sets. This causes confusion in queries and UI rendering.

**Remediation:** Use `ConsultationLifecycleStatus` for the DB `consultation_status` column and `WorkflowStageName` for `workflow_stage`. Remove the legacy `status` field from the interface.

---

### DATA-009 🟡 MEDIUM — `QueueStatus` Missing `ready_for_doctor` Value

**File:** `src/hooks/useQueue.ts:L8`  
**Description:** `QueueStatus = 'waiting' | 'called' | 'in_prep' | 'in_service' | 'completed'` does not include `ready_for_doctor`, which is used in nurse workflow components. This causes TypeScript to accept invalid status strings and can break queue filter queries.

**Remediation:** Add `'ready_for_doctor'` to the `QueueStatus` union type.

---

### DATA-010 🟢 LOW — `useConsultations` Fetches Last 100 Records Without Pagination

**File:** `src/hooks/useConsultations.ts:L100`  
**Description:** `.limit(100)` is hardcoded. For busy hospitals, this silently truncates the consultation list, hiding older active consultations from doctors.

**Remediation:** Implement cursor-based pagination using `usePaginatedQuery` (already used in `LaboratoryPage`).

---

### DATA-011 🟢 LOW — `today` Queue Filter Uses Local Timezone

**File:** `src/hooks/useQueue.ts:L65`  
**Description:** `new Date().toISOString().split('T')[0]` produces a UTC date. If the hospital is in a timezone behind UTC, the queue shows yesterday's patients at the start of the local day.

**Remediation:** Use `date-fns` with the hospital's configured timezone for date boundaries.

