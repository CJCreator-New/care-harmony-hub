# AROCORD-HIMS Audit Execution Prompts

Use these prompts with Claude to systematically audit your codebase. Copy and paste each prompt into Claude, providing the relevant code/context when requested.

---

## MASTER AUDIT PROMPT

Use this to start the full audit process:

```
You are conducting a production-readiness audit for AROCORD-HIMS, 
an enterprise hospital information management system built with React, 
TypeScript, Supabase, and Tailwind CSS.

I'm providing you with:
1. The Product Master Document (architecture, features, tech stack)
2. This section of code/documentation: [PASTE CODE OR DOCUMENTATION HERE]

Your task:
1. Evaluate against the audit checklist (15 categories, 500+ checks)
2. Identify any issues, inconsistencies, or gaps
3. Categorize findings by Severity (Critical/High/Medium/Low)
4. Provide specific, actionable remediation steps

For this analysis, focus on these categories:
- [LIST WHICH CATEGORIES TO FOCUS ON]

Output format:
- ✅ Passed Checks: [List what passed]
- ⚠️ Issues Found: [Each issue with severity, description, impact, fix]
- 📋 Observations: [Non-blocking improvements]
- 🎯 Priority Actions: [Top 3 fixes to make first]

Start by analyzing the provided code/docs now.
```

---

## SECTION-BY-SECTION AUDIT PROMPTS

Use these targeted prompts for each of the 15 audit categories:

### 1️⃣ ARCHITECTURE & CODEBASE QUALITY

```
Audit AROCORD-HIMS for architecture & code quality issues.

I'm providing you with my project structure and key code files.

Evaluate:
✓ Project structure organization (components, hooks, services, types)
✓ TypeScript strictness (strict mode enabled, no `any` types)
✓ Import organization (path aliases, no relative imports)
✓ Dependency health (unused deps, vulnerabilities, versions)
✓ Code consistency (naming conventions, linting, formatting)
✓ Component organization (no circular deps, logical grouping)

For each finding, provide:
1. What's the issue?
2. Why is it a problem?
3. How to fix it (specific code changes or refactoring)
4. Effort estimate (1hr / 4hrs / 1day / 3days)

Also run these checks and report results:
- npx depcheck (show unused/missing dependencies)
- npm audit (list any vulnerabilities)
- Find any files with >300 lines
- Find any components with >15 props

Here's my code:
[PASTE: tsconfig.json, package.json, sample components, src/ structure]
```

---

### 2️⃣ UI/UX CONSISTENCY & DESIGN

```
Audit AROCORD-HIMS UI/UX for design system consistency and visual uniformity.

I'm providing you with screenshots/code from multiple dashboards and components.

Evaluate across ALL 7 role dashboards:
✓ Button styles (primary, secondary, destructive, outline consistency)
✓ Color palette (limited to Tailwind + brand colors?)
✓ Spacing (4px grid adherence)
✓ Typography hierarchy (h1, h2, h3, body, caption consistent?)
✓ Card/widget sizing consistency
✓ Form element styling (inputs, selects, labels uniform?)
✓ Theme support (light/dark mode readability)
✓ Component reuse (any duplicated patterns?)

For each inconsistency:
1. Where did you find it? (which components/pages)
2. What's the deviation from design system?
3. Current vs. expected appearance
4. How to fix (CSS class update, component refactor, etc.)

Also identify:
- Any hardcoded colors (should use CSS variables)
- Any components that should be reused but aren't
- Any excessive or missing animations

Here are my dashboards:
[PASTE: Screenshots or component code from Admin, Doctor, Nurse, Receptionist, 
Pharmacist, Lab Tech, Patient dashboards]
```

---

### 3️⃣ ACCESSIBILITY (WCAG 2.1 AA)

```
Conduct an accessibility audit of AROCORD-HIMS against WCAG 2.1 AA standards.

I'm providing you with HTML/component code from key pages.

Check:
✓ Semantic HTML (heading hierarchy, landmarks, form labels with htmlFor)
✓ ARIA attributes (aria-label, aria-describedby, aria-live, aria-hidden)
✓ Color contrast (text >= 4.5:1, UI >= 3:1)
✓ Color not sole differentiator (red error without icon = fail)
✓ Focus management (visible focus, logical tab order, focus trap in modals)
✓ Keyboard navigation (no keyboard traps, all functionality via keyboard)
✓ Screen reader support (form inputs announced, dynamic updates, alt text)
✓ Touch targets (>= 44x44px, >= 8px spacing)
✓ Motion (prefers-reduced-motion respected)

For each violation, provide:
1. WCAG criterion it violates (e.g., 2.1.1 Keyboard, 1.4.3 Contrast)
2. Severity (Must Fix / Should Fix)
3. Which users are affected
4. Exact code location and fix

Special focus on critical workflows:
- Patient registration form
- Prescription creation
- Lab order entry
- Discharge workflow

Here's my code:
[PASTE: HTML/component code from critical forms and workflows]
```

---

### 4️⃣ USABILITY & USER WORKFLOWS

```
Audit AROCORD-HIMS for usability issues in critical user workflows.

I'm providing you with code and screenshots for key workflows.

Test these critical journeys:
□ Patient Registration & Admission (target: <2 min)
□ Appointment Scheduling (target: <3 clicks to schedule)
□ Prescription Workflow (create → sign → dispense)
□ Lab Order & Result (order → specimen → result → approval)
□ Discharge Process (all steps sequential and clear)

For each workflow, evaluate:
1. How many steps required? (should be minimal)
2. Are error states handled? (what happens if X fails?)
3. Is data loss prevented? (unsaved changes warning?)
4. Are confirmations clear? (destructive actions explicitly confirmed?)
5. Is feedback provided? (user knows action succeeded?)
6. Are next steps obvious? (empty states guide next action?)

Also check:
- Error messages (are they specific/actionable or generic?)
- Form recovery (does data persist on error?)
- Offline handling (graceful degradation?)
- Help/documentation (is it discoverable?)

Create a table showing:
| Workflow | Steps | Issues Found | Friction Points |

Here's the code:
[PASTE: Component code for critical workflows]
```

---

### 5️⃣ PERFORMANCE & OPTIMIZATION

```
Audit AROCORD-HIMS performance and optimization.

Target metrics (from Product Doc Section 13):
- Bundle Size: <= 400 KB (gzipped)
- LCP: < 2.5s | FID: < 100ms | CLS: < 0.1
- TTI (Time to Interactive): < 3s
- API Response p95: < 500ms

I'm providing:
- Your build output analysis
- Network waterfall data
- React Profiler traces
- Bundle analysis report

Evaluate:
✓ Bundle size breakdown (is it <= 400 KB gzipped?)
✓ Code splitting (are dashboards lazy-loaded?)
✓ Image optimization (WebP, srcset, lazy loading?)
✓ React performance (unnecessary re-renders, memoization)
✓ Data fetching (TanStack Query caching, debouncing)
✓ CSS optimization (only used classes included?)
✓ Database queries (indexes, N+1 prevention, pagination?)
✓ Mobile performance (4G simulation, TTI < 5s?)

For each finding:
1. Current metric value
2. Target value
3. Root cause
4. Specific optimization steps
5. Expected improvement

Priority fixes:
- What gives best bang-for-buck?
- What's quickest to implement?
- What's highest impact?

Tools to run:
- npm run build && npm run analyze (bundle analysis)
- Lighthouse audit: https://[your-domain]
- Chrome DevTools: Network tab (throttle to Slow 4G)
- React DevTools Profiler

Here's my analysis:
[PASTE: Bundle analysis, lighthouse report, network waterfall, React profiles]
```

---

### 6️⃣ SECURITY & COMPLIANCE

```
Conduct a comprehensive security & HIPAA compliance audit of AROCORD-HIMS.

I'm providing code from auth, database, API, and sensitive data handling areas.

Critical checks:
□ Authentication (email/password, 2FA, WebAuthn working?)
□ Authorization (RBAC enforced, no privilege escalation?)
□ Encryption at rest (AES-256-GCM for PHI?)
□ Encryption in transit (TLS 1.3, HTTPS enforced?)
□ HIPAA compliance (audit logs, data retention, BAAs?)
□ Input validation (Zod schemas, no SQL injection?)
□ Output encoding (XSS prevention, no inline scripts?)
□ CSRF protection (tokens, SameSite cookies?)
□ Rate limiting (API endpoints rate-limited?)
□ Secrets management (no hardcoded creds, environment variables?)

For each issue:
1. Vulnerability type (OWASP category if applicable)
2. Risk level (Critical/High/Medium/Low)
3. How to exploit it (proof of concept)
4. Impact (data exposed? system compromised?)
5. Remediation steps (code changes, configuration)

Test these specific scenarios:
- Can I access another hospital's data? (should fail)
- Can I escalate from Doctor to Admin? (should fail)
- Can I inject SQL in patient search? (should fail)
- Can I XSS in patient name? (should fail)
- Does 2FA enforcement work? (must work)

HIPAA focus:
- Audit trail completeness (all PHI access logged?)
- Backup encryption (backups encrypted at rest?)
- Password policy (min 12 chars, rotation?)
- Session timeout (30 min inactivity?)
- Consent management (patient consent tracked?)

Here's my code:
[PASTE: Auth logic, database migrations with RLS, API endpoints, 
sensitive data handling, environment variable setup]
```

---

### 7️⃣ TESTING COVERAGE & QUALITY

```
Audit AROCORD-HIMS test coverage and test suite quality.

I'm providing test results and coverage reports.

Evaluate:
✓ Unit test coverage (>= 80%, 100% for critical paths)
✓ Integration test coverage (hooks + services tested?)
✓ E2E test coverage (500+ tests present?)
✓ Security test coverage (auth, RBAC, HIPAA tests?)
✓ Accessibility test coverage (>= 50 tests?)
✓ Test quality (no flaky tests, good assertions, clear names?)
✓ Test organization (logical grouping, setup/teardown clear?)
✓ Critical workflows tested (prescription, lab, discharge?)

For each gap:
1. What's not tested?
2. Why is it critical?
3. How many tests needed?
4. Effort to write (1hr / 4hrs / 1day)?

Also check:
- Do tests describe behavior or implementation? (should be behavior)
- Are mocks used appropriately? (not mocking everything?)
- Do tests pass consistently? (run 3x, all pass?)
- Test execution time (should be <5 min for unit tests)

Special focus:
□ Role-based workflows (all 7 roles tested end-to-end?)
□ Error scenarios (network errors, timeouts, validation?)
□ Edge cases (empty data, very large datasets, boundary conditions?)
□ Concurrent access (simultaneous user updates handled?)
□ Mobile workflows (responsive design tested?)

Here's my test data:
[PASTE: npm run test:unit -- --coverage output, 
E2E test results, test file listing, security test report]
```

---

### 8️⃣ DATABASE & DATA INTEGRITY

```
Audit AROCORD-HIMS database schema, migrations, and data integrity.

I'm providing your Supabase migrations and schema.

Evaluate:
✓ Schema completeness (all 11+ core tables present?)
✓ Multi-tenancy (hospital_id on all tables, RLS policies active?)
✓ Timestamps (created_at, updated_at on all tables?)
✓ Data types (TIMESTAMPTZ, JSONB, correct precision?)
✓ Constraints (foreign keys, unique constraints, check constraints?)
✓ Indexes (on frequently-queried columns, particularly hospital_id + other filters?)
✓ RLS policies (50+ policies enforcing security?)
✓ Audit trail (activity_logs table append-only, immutable?)
✓ Encryption (PHI fields encrypted with AES-256-GCM?)
✓ Backups (automated daily, encrypted, tested?)

For each issue:
1. Table/migration affected
2. What's wrong?
3. How does it violate requirements?
4. SQL fix or migration needed
5. Data migration implications

Also check:
- Any missing indexes? (query performance will suffer)
- Any N+1 query patterns in code?
- Any missing foreign key constraints?
- Data consistency (orphaned records? invalid enum values?)
- Backup/recovery tested?

RLS Deep Dive:
- Can a user see other hospitals' data? (test with query)
- Can a patient see other patients' data? (test with query)
- Can a doctor modify admin settings? (test with query)
- Do UPDATE policies prevent unauthorized field edits?

Here's my schema:
[PASTE: All migration files from supabase/migrations/, 
schema definition, RLS policies, indexes]
```

---

### 9️⃣ API & INTEGRATION POINTS

```
Audit AROCORD-HIMS API design and integration completeness.

I'm providing your API endpoints, Edge Functions, and integration code.

Evaluate:
✓ REST API completeness (all CRUD operations present?)
✓ Response format consistency (data/error fields consistent?)
✓ Error handling (consistent error format with status codes?)
✓ Pagination (implemented on list endpoints, max 100?)
✓ Filtering/Sorting (supported where needed?)
✓ Real-time subscriptions (Supabase Realtime working?)
✓ Authentication (JWT tokens required, properly validated?)
✓ Rate limiting (API Gateway rate limits active?)
✓ Edge Functions (all 30+ present, functional, tested?)
✓ File storage (buckets configured, security enforced?)

For each endpoint, verify:
1. Authentication required?
2. Authorization enforced (hospital_id filter, RLS)?
3. Input validation (Zod schemas)?
4. Response format correct?
5. Error scenarios handled?

Edge Functions checklist:
□ ai-clinical-support
□ appointment-reminders
□ audit-logger
□ billing-reconciliation
□ check-low-stock
□ critical-lab-check
□ discharge-workflow
□ drug-interaction-check
□ [... and 22 more from Product Doc Section 7.1]

For each function:
- Does it exist and is deployed?
- Error handling present?
- Timeout protection?
- Idempotency for retries?
- Authorization enforced?
- Logging present?

Also test:
- Can I call API with invalid token? (should fail)
- Can I exceed rate limit? (should return 429)
- Do real-time subscriptions respect RLS? (should filter data)
- Can I upload arbitrary files? (should be restricted)

Here's my code:
[PASTE: API endpoint code, Edge Function definitions, 
service client code, WebSocket subscription setup]
```

---

### 🔟 DOCUMENTATION & KNOWLEDGE TRANSFER

```
Audit AROCORD-HIMS documentation completeness and quality.

I'm providing your documentation files and code comments.

Evaluate:
✓ Code documentation (JSDoc comments on complex functions?)
✓ Component documentation (all 150+ components documented?)
✓ Type documentation (custom types explained?)
✓ API documentation (OpenAPI/Swagger spec present?)
✓ Architecture documentation (system diagram, data flow?)
✓ Operational documentation (runbooks, incident response?)
✓ User documentation (guides for each role?)
✓ Troubleshooting guide (common issues and solutions?)
✓ Setup/deployment guide (new developer onboarding?)

For missing documentation:
1. What should be documented?
2. For whom (developers, operators, users)?
3. Current gap (what's missing?)
4. Effort to document (1hr / 4hrs / 1day)?
5. Priority (critical / important / nice-to-have)?

Quality checks:
- Is documentation accurate and up-to-date?
- Are examples provided?
- Are diagrams/visuals included?
- Is it searchable?
- Is it linked from relevant code?

Critical documentation needed:
□ System architecture diagram
□ Database schema documentation
□ API reference (all endpoints)
□ Authentication/authorization flows
□ Security model explanation
□ Deployment procedures
□ Incident response runbook
□ User guide per role
□ Troubleshooting guide

Create a documentation matrix:
| Topic | Exists? | Quality | Location |
|-------|---------|---------|----------|

Here's my documentation:
[PASTE: README.md, docs/ folder structure, code comments sample, 
any wiki/confluence links, OpenAPI specs]
```

---

### 1️⃣1️⃣ DEPLOYMENT READINESS

```
Audit AROCORD-HIMS for production deployment readiness.

I'm providing your build config, CI/CD pipeline, and infrastructure setup.

Build & Deployment:
✓ Build completes without errors? (npm run build succeeds?)
✓ Build time reasonable? (< 5 min?)
✓ No build warnings?
✓ Source maps generated?
✓ Docker image builds? (size < 500 MB?)
✓ Environment variables configured? (.env.example present?)
✓ Feature flags configured? (for gradual rollout?)

CI/CD Pipeline:
✓ Lint stage passes? (ESLint, Prettier?)
✓ Unit tests pass? (npm run test:unit?)
✓ Security scan passes? (npm audit, OWASP?)
✓ Build verification? (can build successfully?)
✓ E2E smoke tests? (critical paths tested?)
✓ Manual approval step? (before prod deploy?)
✓ Rollback automated? (on failure?)
✓ Deployment notifications? (Slack/email on deploy?)

Infrastructure:
✓ Database configured? (Supabase project, backups?)
✓ API Gateway configured? (Kong, rate limiting?)
✓ CDN configured? (for static assets?)
✓ Storage configured? (Supabase Storage buckets?)
✓ Load balancing? (multiple app instances?)
✓ Monitoring active? (Prometheus, Grafana?)
✓ Alerting configured? (PagerDuty rules?)
✓ Backup/recovery tested? (RTO < 2 hours?)

Pre-Launch Checklist:
□ All critical E2E tests pass
□ Load testing completed (1000+ users)
□ Security audit passed
□ HIPAA audit passed
□ Incident response plan documented
□ On-call engineer briefed
□ Support team trained
□ Rollback plan documented
□ Customer communications plan

For each gap:
1. What's missing?
2. When needed? (blocking / non-blocking?)
3. Steps to implement
4. Effort estimate

Here's my setup:
[PASTE: .github/workflows/*.yml, Dockerfile, docker-compose.yml, 
kubernetes manifests (if applicable), .env.example, 
build config, monitoring setup]
```

---

### 1️⃣2️⃣ MOBILE & RESPONSIVE DESIGN

```
Audit AROCORD-HIMS for mobile responsiveness and PWA capabilities.

Test on these devices: iPhone SE (375px), iPad (768px), Desktop (1920px)

Responsive Breakpoints:
✓ Mobile (320-640px): Tested and usable?
✓ Tablet (641-1024px): Tested and usable?
✓ Desktop (1025px+): Tested and usable?
✓ Large screens (2560px+): No layout breaking?

On mobile specifically:
✓ Hamburger menu (not full sidebar)?
✓ Tables scrollable or card layout?
✓ Forms single-column?
✓ Touch targets >= 44x44px?
✓ No horizontal scrolling?
✓ Font size >= 16px (no zoom needed)?
✓ Viewport meta tag correct?

PWA Features:
✓ Service worker registered?
✓ Offline mode works?
✓ manifest.json present with correct metadata?
✓ App icons (192x192, 512x512)?
✓ Standalone mode enabled?

For each responsive issue:
1. Which breakpoint/device fails?
2. What's broken (layout, navigation, forms)?
3. Screenshot of issue
4. Tailwind breakpoint fix needed
5. Test on real device (not just DevTools)

Visual regression:
- Hamburger menu toggle works?
- Navigation sidebar collapses?
- Cards stack vertically?
- Images resize correctly?
- Modals full-screen on mobile?

Here's my code:
[PASTE: Tailwind breakpoint usage in components, 
viewport meta tag, manifest.json, service worker code]
```

---

### 1️⃣3️⃣ CLINICAL DOMAIN VALIDATION

```
Audit AROCORD-HIMS for clinical accuracy and healthcare domain compliance.

I'm providing clinical workflows and medical data handling code.

Medical Accuracy:
✓ Dosage calculations correct? (pediatric, renal, hepatic adjustments?)
✓ Drug interactions database current?
✓ Allergy checking comprehensive?
✓ Contraindications considered?
✓ Lab reference ranges appropriate? (by age/gender?)
✓ Critical value thresholds correct?
✓ ICD-10 codes current? (2024 codes?)
✓ CPT codes current? (2024 codes?)
✓ LOINC codes for lab tests correct?

Clinical Workflows:
✓ Prescription requires e-signature for controlled substances?
✓ Refill authorizations respected?
✓ Quantity limits enforced?
✓ DEA tracking for controlled drugs?
✓ Lab chain of custody maintained?
✓ Critical results immediately flagged?
✓ Medication reconciliation required at discharge?
✓ Clinical decision support alerts evidence-based?

For each issue:
1. What's the clinical error?
2. How could it harm patient safety?
3. What's the correct approach (based on clinical guidelines)?
4. Code/workflow change needed

Test scenarios:
- Prescribe medication to patient with allergy (should alert)
- Order lab test (should have correct reference range)
- Prescribe controlled substance (should require e-signature)
- Set critical lab value (should immediately alert doctor)
- Enter vital signs (should flag if out of range)

Questions to verify:
□ Were clinical workflows reviewed by healthcare professionals?
□ Are dose calculators validated?
□ Are drug interactions from reliable source (UpToDate, etc.)?
□ Are lab reference ranges from standard references?
□ Are clinical protocols based on published evidence?

Here's my code:
[PASTE: Prescription workflow code, dosage calculator logic, 
drug interaction check code, lab reference range data, 
critical value threshold logic]
```

---

### 1️⃣4️⃣ INTERNATIONALIZATION & LOCALIZATION

```
Audit AROCORD-HIMS for internationalization and regional compliance.

I'm providing language support code and regional configuration.

Multi-Language:
✓ Language support configured? (which languages?)
✓ Language switcher present and functional?
✓ All UI text externalized? (no hardcoded text?)
✓ Translations complete? (100% of keys translated?)
✓ Pluralization handled correctly?
✓ Gender forms handled? (if applicable?)
✓ RTL support? (if supporting Arabic/Hebrew?)

Localization:
✓ Date formats localized? (MM/DD/YYYY vs DD/MM/YYYY?)
✓ Time formats localized? (12-hour vs 24-hour?)
✓ Currency formats localized?
✓ Number formats localized? (decimal separators?)
✓ Names/addresses support international formats?

Regional Compliance:
✓ US HIPAA: Applies?
✓ EU GDPR: Data residency in EU? Right to be forgotten implemented?
✓ India: Local data residency? DPDP Act compliance?
✓ Brazil LGPD: Data processing agreement?

For each gap:
1. Which language/region not supported?
2. Impact (can users use app?)
3. Text keys to translate (how many?)
4. Regional requirements to implement
5. Effort estimate

If supporting India specifically:
- Is data stored in India data centers?
- Are terms/privacy policy India-specific?
- Are rupee formats correct?
- Are Indian name/address formats supported?

Here's my code:
[PASTE: Language/i18n configuration, translations files sample, 
regional compliance setup, data residency configuration]
```

---

### 1️⃣5️⃣ ERROR HANDLING & EDGE CASES

```
Audit AROCORD-HIMS for error handling and edge case coverage.

I'm providing code for error scenarios and edge case handling.

Network Errors:
✓ Connection loss detected and handled?
✓ User informed with offline banner?
✓ Actions queued when offline?
✓ Auto-retry when connection restored?
✓ API timeouts < 30 seconds?
✓ Timeout errors show retry button?
✓ No infinite loading spinners?

Data Edge Cases:
✓ Empty/null values handled? (missing name, no vital signs?)
✓ Very long values handled? (100+ char name?)
✓ Very large datasets paginated? (10k+ records?)
✓ Boundary conditions safe? (min/max values?)
✓ Date/time edge cases? (leap years, DST, timezones?)

User Error Prevention:
✓ Confirmation dialogs for destructive actions?
✓ Validation clear (required fields marked, error messages specific?)
✓ Form data persists on error?
✓ Undo available where possible?
✓ Accidental logout recovery?

Concurrent Access:
✓ Optimistic updates implemented?
✓ Conflicts detected and resolved?
✓ Duplicate prevention (duplicate submissions, double-booking)?
✓ Race conditions prevented?
✓ Stale data handled (realtime updates)?

For each gap:
1. What's not handled?
2. What happens when it occurs? (crashes? silent failure?)
3. How should it be handled?
4. Code change needed
5. Effort estimate

Test these scenarios:
- Disconnect internet during form submission (what happens?)
- Refresh page while loading data (does it recover?)
- Delete patient that's being accessed by another user (conflict handling?)
- Schedule appointment during daylight saving time change (correct time?)
- Register patient with 100+ character name (display OK?)
- View lab result with missing reference range (what shows?)

Here's my code:
[PASTE: Error handling code, network error handling, 
edge case conditionals, concurrent access handling,
form validation and error recovery]
```

---

## QUICK AUDIT PROMPT (Fast 1-Hour Review)

Use this for quick health checks:

```
Quick Production Readiness Audit - AROCORD-HIMS (1 hour)

Analyze the provided code snapshot across these high-impact areas:

1. CRITICAL BLOCKERS (must pass):
   □ npm audit output (zero critical vulnerabilities?)
   □ Unit test coverage (>= 80%?)
   □ Build succeeds? (npm run build)
   □ TypeScript strict? (npm run lint passes?)
   □ No PHI in logs? (sample log review)

2. HIGH-IMPACT ISSUES:
   □ RLS policies enforced? (can't access other hospital's data?)
   □ RBAC working? (can't escalate privileges?)
   □ E2E critical paths pass? (prescription, lab, discharge)
   □ Performance acceptable? (bundle < 400KB, TTI < 3s)
   □ Accessibility basic checks? (keyboard nav, contrast)

3. QUICK WINS (easiest fixes):
   □ Code style (any linting errors?)
   □ Documentation (README complete?)
   □ Build warnings (any to address?)
   □ Unused dependencies (npm audit)

Output a traffic light report:
🟢 Production Ready (no critical blockers)
🟡 Conditional (must fix X before launch)
🔴 Not Ready (multiple critical issues)

For each issue, estimate:
- Effort (1hr / 4hrs / 1day)
- Must-fix status
- Recommended priority

Here's my code:
[PASTE: Key files, build output, test results, audit output]
```

---

## ISSUE DOCUMENTATION PROMPT

Use this when documenting each finding:

```
Document an audit finding for AROCORD-HIMS with full context.

I'm going to describe an issue found during the production audit.
Create a structured GitHub Issue template output.

The issue is:
[DESCRIBE THE ISSUE HERE]

Please provide:

### Issue Title
[Concise 1-line title]

### Category
[Architecture | UI | Accessibility | Security | Performance | Testing | 
 Clinical | Database | API | Documentation | Deployment]

### Severity
[🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low]

### Description
[What's the problem? Be specific with code locations/file paths]

### Impact
[Who's affected? What breaks? Business impact?]

### Reproduction Steps
[How to reproduce the issue?]

### Current Behavior
[What's happening now?]

### Expected Behavior
[What should happen?]

### Root Cause
[Why is this happening?]

### Suggested Solution
[Specific code changes or refactoring steps]

### Testing Strategy
[How to verify the fix works?]

### Effort Estimate
[1hr | 4hrs | 1day | 3days | 1week]

### Blocking?
[Blocks production launch? Yes/No]

### Related Issues
[Any related findings?]

### Acceptance Criteria
- [ ] [Specific criterion]
- [ ] [Specific criterion]
- [ ] [Specific criterion]

---

Issue details:
[PASTE YOUR ISSUE DESCRIPTION]
```

---

## ROLE-SPECIFIC AUDIT PROMPTS

### For Frontend Engineers:

```
Frontend-focused audit of AROCORD-HIMS.

Analyze these components/pages:
[LIST SPECIFIC COMPONENTS/PAGES TO REVIEW]

Checklist:
□ Design consistency (colors, spacing, typography match design system?)
□ Component reuse (any duplicated code that should be shared?)
□ Responsive design (tested on mobile/tablet/desktop?)
□ Accessibility (keyboard nav, screen reader, contrast?)
□ Performance (unnecessary re-renders, lazy loading?)
□ TypeScript strictness (no `any`, proper prop types?)
□ Error states (handled and user-friendly?)

For each component:
- What does it do?
- Is it properly typed?
- Is it accessible?
- Is it responsive?
- Could it be reused elsewhere?
- Any performance issues?

Report:
✅ Good (what's working well)
⚠️ Issues (with severity)
💡 Improvements (not blocking but good to fix)

Code provided:
[PASTE: Component code, Tailwind classes, responsiveness setup]
```

### For Backend Engineers:

```
Backend-focused audit of AROCORD-HIMS.

Analyze these systems:
[LIST SPECIFIC SERVICES/APIS/DATABASES TO REVIEW]

Checklist:
□ Database schema (multi-tenancy, RLS, indexes, constraints?)
□ RLS policies (enforced, no data leaks?)
□ Edge Functions (all present, error handling, logging?)
□ API security (auth, rate limiting, input validation?)
□ Error handling (graceful failures, clear error messages?)
□ Logging (security-relevant actions logged?)
□ Data consistency (transactions, migrations tested?)

For each Edge Function:
- Does it exist and is deployed?
- Is it secure (auth enforced)?
- Error handling present?
- Idempotent (safe to retry)?
- Logged appropriately?

For database:
- Hospital isolation enforced?
- RLS policies comprehensive?
- Indexes on hot queries?
- Migrations tested?
- Backups configured?

Code provided:
[PASTE: Edge Functions, database migrations, API endpoints, 
RLS policies, service configuration]
```

### For Security Engineers:

```
Security-focused audit of AROCORD-HIMS.

High-priority security checks:
□ Authentication (2FA enforced, tokens secure?)
□ Authorization (RBAC enforcement, no privilege escalation?)
□ Encryption (at rest and in transit?)
□ HIPAA compliance (audit logs, consent, BAAs?)
□ Input validation (no SQL injection, XSS possible?)
□ Secret management (no hardcoded credentials?)
□ Dependency vulnerabilities (npm audit clean?)

For each security control:
- Is it implemented?
- Is it properly configured?
- Are there bypasses?
- How would an attacker target it?
- Mitigation steps?

Test scenarios:
1. Access another hospital's data (should fail)
2. Escalate to Admin (should fail)
3. SQL injection in search (should fail safely)
4. XSS in form field (should be escaped)
5. Access API without token (should fail)
6. Exceed rate limits (should return 429)

Provide remediation for each finding.

Code/config provided:
[PASTE: Auth logic, RLS policies, API rate limiting, input validation,
secret management, dependency audit results]
```

---

## SUMMARY

Choose the prompt based on your audit stage:

| Stage | Prompt to Use |
|-------|---------------|
| **Kickoff** | Master Audit Prompt |
| **Quick health check** | Quick Audit Prompt (1 hour) |
| **Detailed review** | Section-by-Section Prompts |
| **Specific deep-dive** | Role-Specific Prompts |
| **Issue documentation** | Issue Documentation Prompt |

### Recommended Workflow:

1. **Start with Quick Audit** (1 hour) → identify blockers
2. **Fix Critical Issues** → then proceed to detailed audit
3. **Use Section Prompts** → audit each category systematically
4. **Document Findings** → use Issue Prompt for each finding
5. **Create GitHub Issues** → assign to team, track remediation

---

### Usage Tips:

✅ **DO:**
- Paste actual code/config when prompted
- Include build output and test results
- Ask clarifying questions if anything is unclear
- Request specific remediation steps
- Get help with edge cases

❌ **DON'T:**
- Paste entire files (summarize or provide excerpts)
- Ask for code without providing context
- Expect perfect results without sharing relevant code/data
- Rush through - be thorough

---

**Questions to ask Claude during audit:**

- "Here's my [component/service]. Are there any issues?"
- "Why is this a problem in a healthcare/clinical context?"
- "What's the most efficient way to fix this?"
- "How would I test that this is fixed?"
- "Can you prioritize these 10 issues by effort vs. impact?"
- "Is there a pattern here I'm missing?"
- "How would a malicious user exploit this?"
```

---

Now save this file and use the prompts with Claude. Each prompt is ready to copy-paste!