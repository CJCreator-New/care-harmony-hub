---
name: code-review
description: 'Code review and issue finder for the CareSync HIMS app. Use when asked to review code, find bugs, audit security, check HIPAA compliance, validate RBAC/RLS, find performance issues, or assess release readiness. Produces a structured Findings report with severity ratings, repro steps, impact, and remediation steps — matching the format of docs/COMPREHENSIVE_REVIEW_REPORT.md.'
argument-hint: 'Scope the review: a specific file, component, feature area (auth, pharmacy, lab, billing), or "full app". Optionally specify focus: security | compliance | performance | quality | accessibility | release-readiness.'
---

# CareSync Code Review & Issue Finder

Performs structured code review across the React/TypeScript/Supabase HIMS codebase. Output is a prioritized findings report matching the format of `docs/COMPREHENSIVE_REVIEW_REPORT.md`. Every finding includes: severity, area, affected files, description, repro steps, impact, and recommended remediation.

## When to Use

- "Review [file/feature/area] for issues"
- "Find security vulnerabilities in [component]"
- "Audit HIPAA compliance for [feature]"
- "Check RBAC/RLS coverage for [role/table]"
- "Is this ready to ship?"
- "Find performance bottlenecks in [page]"
- "Check accessibility on [component]"

---

## Review Categories & What to Look For

### 🔴 Security (`critical` / `high`)
Check in: any `.tsx`, `.ts`, Supabase edge functions, `src/lib/`, `src/utils/`, `supabase/functions/`

| Pattern to detect | Rule |
|-------------------|------|
| `password\|secret\|token\|api[_-]?key\s*[:=]\s*['"][^'"]+['"]` | Hardcoded secret |
| `process.env.VITE_*` in `src/` browser code | Must be `import.meta.env.VITE_*` — `process.env` resolves to `undefined` at Vite runtime |
| `.eq("id", user.id)` to resolve profile in edge functions | Must use `.eq("user_id", user.id)` — CareSync keys profiles on `user_id` |
| Supabase `.from().select()` without a `.eq("hospital_id", ...)` scope | Missing multi-tenant isolation |
| `auth.jwt() ->> 'role'` in RLS policy | Weak — JWT claims can diverge from `user_roles` table truth |
| Missing `usePermissions()` / `hasPermission()` guard before sensitive mutation | Missing RBAC frontend gate |
| `console.log` + `/ssn\|dob\|diagnosis\|mrn\|medical.record/i` | PHI leak to logs — violates HIPAA §164.312 |
| Hardcoded fallback URL/key (`'https://placeholder'`) in second Supabase client init | Misconfiguration passes startup |
| Auth header built as `Bearer ${process.env...}` → `Bearer undefined` | AI hooks browser auth broken |

### 🟠 Compliance / HIPAA
Check in: hooks touching patient data, Supabase mutations, edge functions

| Signal | Issue |
|--------|-------|
| `create\|update\|delete` patient/medical data without `logActivity` or `audit` call | Missing HIPAA audit trail |
| Encryption/decryption of PHI without storing `encryption_metadata` on the row | Violates key-handle persistence rule (§164.312(a)(2)(iv)) |
| `delete.*patient` without checking `retention` / `archive` flag | Violates data retention requirements |
| Patient data accessed without `consent` verification | Missing consent gate |
| PHI passed directly to AI prompt without `sanitizeForLog` / PHI stripping | PHI leakage to model |

### 🟡 Session & Auth Lifecycle
Check in: `AuthContext.tsx`, layout files, route wrappers

| Signal | Issue |
|--------|-------|
| Session timeout logic appearing in >1 of: `AuthContext`, `App.tsx`, layout — same `useEffect` | Duplicate timers → double logout, noisy UX |
| `RoleProtectedRoute` wrapper absent from a sensitive route in `App.tsx` | Unguarded route |
| Dev role override (`testRole` / `devRole`) not cleared on production login path | Role leakage |

### 🟡 Rate Limiting & Security Controls
Check in: `src/lib/security/`

| Signal | Issue |
|--------|-------|
| `cleanup()` deletes records older than hard-coded `60000ms` regardless of `windowMs` | Long-window limits bypassable |
| Second `createClient()` call with fallback string literals | Fail-fast missing |

### 🟢 Performance
Check in: dashboard components, data hooks, list pages

| Signal | Issue |
|--------|-------|
| `useEffect` with Supabase `select` + no `queryKey` for TanStack Query / no cache | Redundant fetches on every render |
| Heavy list without `useMemo` / pagination hook | Re-compute on every keystroke |
| `import` of heavy chart lib at top level instead of `lazy()` | Blocking bundle |
| `useQuery` with no `staleTime` on a rarely-changing resource | Excessive refetches |
| Inline `new Date()` or `Math.random()` inside render body | Forces re-render on every paint |

### 🟢 Accessibility
Check in: form fields, modals, interactive cards

| Signal | Issue |
|--------|-------|
| Interactive element (button-like `div`, icon button) without `aria-label` | Screen reader opaque |
| `<input>` without associated `<label>` or `htmlFor` | WCAG 2.1 AA failure |
| Color-only state indicator (no icon/text fallback) | Color blindness inaccessible |
| Focus trap missing in modal/dialog | Keyboard navigation escapes modal |
| `autoFocus` without `aria-live="assertive"` on error | Errors not announced |

### 🔵 Code Quality
Check in: any hook or component over ~80 lines

| Signal | Issue |
|--------|-------|
| PHI / sensitive data fields in `useState` without encryption | Unencrypted in-memory PHI |
| Logic duplicated across role-specific dashboard hooks | Violates DRY — should use shared hook |
| `try/catch` that swallows error without `toast` or log | Silent failure |
| TypeScript `as any` cast on external API response | Type safety hole |
| Supabase call outside a hook (directly in component body) | Bypasses cache and error boundary |

---

## Review Procedure

### Step 1 — Scope & File Discovery
Read the user's scope. Then:
- **Single file**: read it fully
- **Feature area**: use semantic search + grep for the area's entry points, hooks, and API calls
- **Full app**: prioritize in this order: auth/session → Supabase hooks/edge functions → role-protected pages → shared UI components → test infrastructure

### Step 2 — Run Each Category Pass
For each applicable category above, scan the relevant files and note every match against the signals table. Flag:
- `critical`: data breach, PHI leak, hardcoded secret
- `high`: auth bypass, broken RBAC, broken feature in production
- `medium`: degraded security control, UX instability, config risk
- `low` / `info`: quality debt, minor DRY violation, missing docs

### Step 3 — Deduplicate & Rank
Group duplicates (same root cause in multiple files). Rank the final list by: critical → high → medium → low. Drop pure style issues unless code quality is the review focus.

### Step 4 — Write the Report

Use this template per finding. Match the style of `docs/COMPREHENSIVE_REVIEW_REPORT.md`:

```markdown
### [N]) [Severity label] — [One-line title]
- **Severity**: Critical | High | Medium | Low
- **Area**: [domain: auth / RLS / HIPAA compliance / session / performance / accessibility / quality]
- **Files**:
  - `relative/path/to/file.ts:[line]`

#### Description
[2–4 sentences: what the pattern is and why it's a problem in this clinical context.]

#### Repro Steps
1. [Minimal steps to trigger or observe the issue]
2. ...

#### Impact
[Concrete consequence: data leak, feature failure, RLS bypass, audit gap, etc.]

#### Recommended Remediation
1. [Specific actionable fix]
2. [Follow-up or test to validate]
```

### Step 5 — Release Readiness Verdict

Always close with:

```markdown
## Release Readiness Assessment
Current status: [Production-ready | Not production-ready — blocking items remain]

Blocking items (if any):
1. ...
```

---

## Codebase-Specific Rules (CareSync HIMS)

These override or supplement generic rules because of project-specific architecture:

| Rule | Reason |
|------|--------|
| Profiles are keyed on `user_id`, not `id` | Edge functions using `.eq("id", ...)` will silently return wrong data |
| All Supabase calls must be hospital-scoped: `.eq("hospital_id", hospital.id)` | Multi-tenant RLS — missing scope = cross-tenant data leak risk |
| PHI encryption uses `useHIPAACompliance()` and must persist `encryption_metadata` field | Key-handle required by `fix_encryption_metadata.sql` migration |
| Auth state lives in `AuthContext` — **do not** read from `supabase.auth.getUser()` inside components | Bypasses context caching and causes extra round-trips |
| Role checks use `usePermissions()` → `hasPermission(role, permission)` from `src/lib/permissions.ts` | Do not gate on `profile.role` string directly — role table is authoritative |
| Session timeout owned by `AuthContext` only | Do not duplicate in `App.tsx` or layout components |
| Vite env vars: `import.meta.env.VITE_*` only in browser code | `process.env` resolves `undefined` at runtime |
| `sanitizeForLog(data)` required before any `console.log` / `toast` that touches patient fields | HIPAA PHI log sanitization |
| `logActivity({ actionType })` required for every create/update/delete touching patient or clinical data | HIPAA audit trail |
| RLS policies using `auth.jwt() ->> 'role'` are weaker than `user_roles` table-based checks | JWT claim can lag after role change |

---

## Quality Checklist (use as sign-off)

- [ ] No hardcoded secrets in any tracked file
- [ ] No `process.env.VITE_*` in `src/` browser code
- [ ] All Supabase calls in hooks are hospital-scoped
- [ ] PHI fields encrypted + `encryption_metadata` stored
- [ ] Every sensitive mutation has `logActivity` call
- [ ] `sanitizeForLog` used before any patient-data log/toast
- [ ] `RoleProtectedRoute` wraps every dashboard route
- [ ] Session timeout registered in exactly one place (`AuthContext`)
- [ ] Rate limiter cleanup uses `windowMs` not hard-coded `60000`
- [ ] No second Supabase client with placeholder fallback values
- [ ] All icon buttons have `aria-label`
- [ ] Test runner segregation: Playwright specs excluded from Vitest
- [ ] RLS gate test passes: anon cannot read null-scoped profiles
