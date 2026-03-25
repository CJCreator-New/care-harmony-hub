

# Plan: Skill-Driven Enhancement of CareSync HIMS

## Current State Summary

After auditing all 20 skills against the codebase, here is what exists vs. what each skill recommends but is missing.

## Skills Already Well-Utilized (No Major Gaps)

| Skill | Status |
|-------|--------|
| **hims-audit-trail** | `useAudit` + `useActivityLog` used in 19+ files. Audit logging covers prescriptions, logins, patient views, settings. |
| **hims-observability** | `useClinicalMetrics` wired into 7 key workflows. Grafana dashboards exist (5 JSON files). Alert rules configured. |
| **hims-onboarding-helper** | `QUICK_START_15_MIN.md`, test user scripts, contribution checklist all exist. |
| **hims-documentation-coach** | 30+ docs in `docs/`. Architecture, API, deployment, troubleshooting all documented. |
| **hims-fhir-specialist** | FHIR R4 export/import implemented with validation in `IntegrationDashboard`. |
| **hims-privacy-enforcer** | `useHIPAACompliance`, `sanitizeLogMessage`, PHI encryption utilities exist. |
| **hims-rbac-abac** | `user_roles` table, `has_role` function, RLS hospital scoping, ABAC manager all implemented. |
| **hims-security-companion** | CSP headers, rate limiting, 2FA, security monitor all exist. |
| **hims-devops-guardian** | CI/CD workflows, RLS validation scripts, migration validation exist. |

## Skills With Actionable Gaps (Implementation Plan)

### Step 1: Fix CSP Font Loading (from hims-security-companion)
**Problem**: `vite.config.ts` CSP has no `font-src` directive, blocking Google Fonts in local dev. `headers.ts` is already correct.

**Changes**:
- `vite.config.ts` line 154: Add `font-src 'self' https://fonts.gstatic.com data:;` to the CSP string

**Impact**: Fixes all font/layout/spacing disparities between Lovable preview and local build.

---

### Step 2: Feature Flag Integration (from hims-devops-guardian + workflow-creator)
**Problem**: `useFeatureFlags` hook exists but is used in **zero** components or pages. The skill requires feature-gated rollout of enhanced clinical forms.

**Changes**:
- Import `useFeatureFlags` into these Phase 4B enhanced form components and wrap the v2 UI paths:
  - `src/components/clinical/EnhancedMedicationForm.tsx` — gate behind `doctor_flow_v2`
  - `src/components/clinical/EnhancedVitalSignsForm.tsx` — gate behind `nurse_flow_v2`
  - `src/components/clinical/EnhancedLabOrderForm.tsx` — gate behind `lab_flow_v2`
  - `src/components/pharmacist/PrescriptionQueue.tsx` — gate behind `pharmacy_flow_v2`
- Pattern: `const { isEnabled } = useFeatureFlags(); if (isEnabled('doctor_flow_v2')) { /* enhanced */ } else { /* legacy */ }`

---

### Step 3: Billing Validation Logic (from hims-billing-validator)
**Problem**: No tariff/charge-master validation, no calculation-order enforcement (discount → tax → rounding), no insurance business rules.

**Changes**:
- Create `src/utils/billingValidator.ts` with:
  - Calculation order enforcement: discount → tax → rounding
  - Negative amount / zero charge guards
  - Duplicate billing detection
  - Insurance co-pay/discount validation rules
  - Immutable charge line pattern (append-only adjustments)
- Create `src/hooks/useBillingValidation.ts` hook to integrate with billing page
- Wire into `BillingPage.tsx` for real-time validation on invoice creation

---

### Step 4: Clinical Domain Validation (from hims-domain-expert + hims-clinical-forms)
**Problem**: AI components (`AIConsultationAssistant`, `AITriageAssistant`) use hardcoded mock data. Clinical form validation lacks domain-specific rules.

**Changes**:
- Create `src/utils/clinicalValidation.ts`:
  - Vital signs realistic ranges (HR 30-220, BP 50/30-250/150, SpO2 60-100, Temp 32-42C)
  - Age-based dosage guards (pediatric vs adult vs geriatric)
  - Drug-route compatibility checks
  - Pregnancy/breastfeeding medication flags
  - ICD-10 code format validation
- Wire `AIConsultationAssistant` to call a real edge function instead of `setTimeout` mocks
- Wire `AITriageAssistant` to use validated vital sign ranges for acuity scoring

---

### Step 5: Edge Case Resilience (from hims-error-resilience + hims-edgecase-tester)
**Problem**: Several forms lack boundary validation, concurrent edit protection, and graceful network failure handling.

**Changes**:
- Add optimistic locking (`updated_at` check) to prescription and lab order mutations
- Add duplicate submission guards (debounce + idempotency keys) to patient registration, prescription creation
- Add network failure retry with exponential backoff to critical mutations (prescriptions, lab orders, billing)
- Add session expiry detection middleware that prompts re-auth instead of silent failures

---

### Step 6: Workflow Automation (from workflow-creator)
**Problem**: The workflow-creator skill defines 6 standard workflow templates but none are implemented as proper state-machine-driven Edge Functions.

**Changes** (highest-value workflow first):
- Implement `prescription-approval` workflow:
  - DB: Create `prescription_approval_workflows` table with status state machine
  - Edge Function: `supabase/functions/prescription-approval/index.ts` with role-gated transitions
  - React Hook: `src/hooks/usePrescriptionApprovalWorkflow.ts` with realtime subscription
  - Wire into `PrescriptionQueue` component

---

### Step 7: Performance Safety (from hims-performance-safety)
**Problem**: No query pagination guards for large datasets, no N+1 detection logging.

**Changes**:
- Add query result count warnings when Supabase returns exactly 1000 rows (hitting default limit)
- Add `React.memo` to heavy list components (PrescriptionQueue, patient lists)
- Add virtualization (`@tanstack/react-virtual`) to lab results and prescription lists for hospitals with 10K+ records

---

### Step 8: Browser Test Automation (from hims-browser-test-automation + hims-e2e-testing-complete)
**Problem**: E2E tests exist but have environment issues. No role-based Playwright fixtures.

**Changes**:
- Create `tests/e2e/fixtures/roles.fixture.ts` with pre-authenticated sessions per role
- Fix dev server startup in E2E config (wait for server before running tests)
- Add prescription workflow E2E test covering Doctor → Pharmacist → Nurse flow
- Add RBAC violation test (receptionist cannot access pharmacy queue)

---

## Implementation Priority Order

| Priority | Step | Skill Source | Effort |
|----------|------|-------------|--------|
| 1 | CSP font fix | security-companion | 15 min |
| 2 | Feature flag integration | devops-guardian | 2 hrs |
| 3 | Clinical domain validation | domain-expert, clinical-forms | 3 hrs |
| 4 | Billing validation | billing-validator | 3 hrs |
| 5 | Edge case resilience | error-resilience, edgecase-tester | 3 hrs |
| 6 | Prescription approval workflow | workflow-creator | 4 hrs |
| 7 | Performance safety | performance-safety | 2 hrs |
| 8 | E2E test automation | browser-test-automation | 3 hrs |

**Total estimated: ~20 hours**

## Skills That Are Strategy/Process Only (No Code Changes)
- **product-strategy-session**: Market analysis and roadmap planning — use when planning next product cycle
- **hims-documentation-coach**: Docs already comprehensive — invoke for future feature documentation
- **hims-onboarding-helper**: Onboarding materials complete — invoke when adding new developer workflows

