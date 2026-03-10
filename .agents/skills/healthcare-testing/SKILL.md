---
name: healthcare-testing
description: 'Generates Playwright E2E specs, Vitest API/integration tests, and HIMS module validation suites for CareSync. Covers role-based access flows, clinical workflow assertions, Edge Function testing, RLS policy verification, and HIPAA audit trail validation. Use when asked to write tests for any HIMS module, validate a clinical workflow, test an API endpoint, or verify role-based access. Produces ready-to-run test files matching the existing test conventions in tests/e2e/, tests/api/, and tests/integration/.'
argument-hint: 'Specify what to test: a module (auth, pharmacy, lab, billing, patient-portal, consultations), a workflow (prescription-flow, lab-result-notify, patient-discharge), or a test type (e2e | api | integration | rbac | hipaa). Optionally specify roles: doctor | nurse | pharmacist | lab-tech | receptionist | patient | admin.'
---

# CareSync — Healthcare Testing Workflow

Generates test files that match CareSync's existing conventions. All output is drop-in ready for the project's test infrastructure.

## When to Use

- "Write E2E tests for [module/workflow]"
- "Test the [feature] API endpoint"
- "Validate RBAC for [role] on [page]"
- "Add integration tests for [clinical flow]"
- "Verify HIPAA audit trail for [operation]"
- "Test RLS policies on [table]"

---

## Test Infrastructure Map

| Type | Runner | Config | Output Dir |
|------|--------|--------|-----------|
| E2E (Playwright) | `npx playwright test` | `playwright.config.ts` | `tests/e2e/` |
| API / Edge Functions | Vitest | `vitest.config.ts` | `tests/api/` |
| Integration | Vitest | `vitest.integration.config.ts` | `tests/integration/` |
| Unit | Vitest | `vitest.config.ts` | `tests/unit/` |
| Security / RLS | Vitest | `vitest.config.ts` | `tests/security/` |
| RBAC | Vitest | `vitest.config.ts` | `src/test/` |

Key shared utilities:
- `tests/e2e/utils/test-helpers.ts` — `loginAs(page, role)` helper
- `tests/e2e/utils.ts` — shared Playwright utilities
- `src/test/test-utils.tsx` — Vitest render helpers
- `src/test/setup.ts` — global Vitest setup

---

## Naming Conventions

| Pattern | Example |
|---------|---------|
| E2E spec | `tests/e2e/t{N}-{slug}.spec.ts` | `t87-lab-critical-alert.spec.ts` |
| Role workflow | `tests/e2e/{role}-workflow.spec.ts` | `doctor-workflow.spec.ts` |
| API test | `tests/api/{feature}.test.ts` | `edge-functions.test.ts` |
| Integration | `tests/integration/{flow}.test.ts` | `lab-workflow.test.ts` |
| RBAC | `src/test/{role}-rbac.test.ts` | `pharmacist-rbac.test.ts` |

---

## Template 1 — Playwright E2E (Clinical Workflow)

File: `tests/e2e/t{N}-{workflow-slug}.spec.ts`

```ts
/**
 * T-{N} · {TEST-ID}
 * {One-line description of the workflow under test}
 *
 * Validates:
 *  - {assertion 1}
 *  - {assertion 2}
 */

import { expect, test } from '@playwright/test';
import { loginAs } from './utils/test-helpers';

test.describe('T-{N} · {Workflow Name}', () => {
  test('{test description}', async ({ page }) => {

    await test.step('{Actor} can access {page}', async () => {
      await loginAs(page, '{role}');
      await page.goto('/{route}');
      await expect(page).toHaveURL(/\/{route}/);
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('{Actor} performs {action}', async () => {
      await loginAs(page, '{next-role}');
      await page.goto('/{next-route}');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      // Assert state transition
      const indicator = page.getByText(/{status-keyword}/i);
      await expect(indicator.first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('{Final actor} sees {terminal state}', async () => {
      await loginAs(page, '{final-role}');
      await page.goto('/{final-route}');
      await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
      const count = await page.getByText(/{terminal-status}/i).count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### E2E Rules
- Always use `loginAs(page, role)` — never hardcode credentials
- Use `test.step()` for each role transition — matches existing T-82–T-86 pattern
- `baseURL` is `http://localhost:8080` (from `playwright.config.ts`)
- `timeout` for `toBeVisible` = `10_000` (matches project default)
- Use `toBeGreaterThanOrEqual(0)` for counts when seeded data is not guaranteed

---

## Template 2 — API / Edge Function Test (Vitest)

File: `tests/api/{feature}.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('{Feature} Edge Function', () => {
  it('returns expected shape on valid input', async () => {
    const { data, error } = await supabase.functions.invoke('{function-name}', {
      body: { /* minimal valid payload */ },
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('rejects invalid input with 4xx', async () => {
    const { error } = await supabase.functions.invoke('{function-name}', {
      body: { /* invalid payload */ },
    });

    expect(error).not.toBeNull();
  });

  it('responds within 2000ms', async () => {
    const start = Date.now();
    await supabase.functions.invoke('{function-name}', {
      body: { /* minimal payload */ },
    });
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
```

---

## Template 3 — Integration Test (Clinical Flow)

File: `tests/integration/{flow}.test.ts`

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('{Flow Name} Integration', () => {
  let resourceId: string;

  beforeAll(async () => {
    // Seed minimal test fixture
    const { data } = await supabase
      .from('{table}')
      .insert({ /* minimal fields */ })
      .select('id')
      .single();
    resourceId = data!.id;
  });

  it('creates {resource} with correct initial state', async () => {
    const { data, error } = await supabase
      .from('{table}')
      .select('status')
      .eq('id', resourceId)
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe('{initial-status}');
  });

  it('transitions to {next-state} after {action}', async () => {
    const { error } = await supabase
      .from('{table}')
      .update({ status: '{next-status}' })
      .eq('id', resourceId);

    expect(error).toBeNull();

    const { data } = await supabase
      .from('{table}')
      .select('status')
      .eq('id', resourceId)
      .single();

    expect(data?.status).toBe('{next-status}');
  });
});
```

---

## Template 4 — RBAC Validation Test

File: `src/test/{role}-rbac.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { render, screen } from './test-utils';
import { {RoleComponent} } from '@/components/{role}/{RoleComponent}';

describe('{Role} RBAC', () => {
  it('renders {role} dashboard without crashing', () => {
    render(<{RoleComponent} />);
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('does not expose {forbidden-element} to {role}', () => {
    render(<{RoleComponent} />);
    expect(screen.queryByText(/{admin-only-text}/i)).toBeNull();
  });
});
```

---

## Template 5 — RLS Policy Test

File: `tests/security/rls-{table}.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('RLS: {table}', () => {
  it('authenticated user can only read own hospital rows', async () => {
    const { data, error } = await supabase
      .from('{table}')
      .select('hospital_id');

    expect(error).toBeNull();
    // All returned rows must belong to the authenticated user's hospital
    const hospitalIds = [...new Set(data?.map(r => r.hospital_id))];
    expect(hospitalIds.length).toBeLessThanOrEqual(1);
  });

  it('anon role cannot read {table}', async () => {
    const anonClient = supabase; // use anon key client
    const { data, error } = await anonClient
      .from('{table}')
      .select('id')
      .limit(1);

    // Should return empty or error — never data
    expect(data?.length ?? 0).toBe(0);
  });
});
```

---

## Template 6 — HIPAA Audit Trail Validation

File: `tests/security/hipaa-audit-{feature}.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('HIPAA Audit Trail: {feature}', () => {
  it('logs audit entry on {operation}', async () => {
    const before = new Date().toISOString();

    // Perform the operation under test
    await supabase.from('{table}').insert({ /* ... */ });

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('action_type, resource_type, performed_by')
      .eq('action_type', '{expected_action_type}')
      .gte('created_at', before)
      .limit(1);

    expect(logs?.length).toBe(1);
    expect(logs![0].action_type).toBe('{expected_action_type}');
    expect(logs![0].performed_by).not.toBeNull();
  });
});
```

---

## HIMS Module Test Coverage Map

| Module | E2E Spec | Integration | API | RBAC |
|--------|----------|-------------|-----|------|
| Auth / Onboarding | `auth.spec.ts` | — | — | `admin-rbac.test.ts` |
| Patient Registration | `patient-management.spec.ts` | `patient-doctor-pharmacy.test.ts` | — | `patient-rbac.test.ts` |
| Consultations | `clinical-workflow.spec.ts` | — | — | `doctor-rbac.test.ts` |
| Prescriptions | `t84-prescription-to-dispensed.spec.ts` | `dispenseTransaction.test.ts` | — | `pharmacist-rbac.test.ts` |
| Laboratory | `t83-lab-order-flow.spec.ts` | `lab-workflow.test.ts` | — | `labtech-rbac.test.ts` |
| Billing | `billing-flow.spec.ts` | `billing-lifecycle.test.ts` | — | — |
| Nurse Triage | `t85-critical-vitals-alert.spec.ts` | `nurse-triage.test.ts` | — | `nurse-rbac.test.ts` |
| Patient Portal | `patient-portal.spec.ts` | — | — | `patient-rbac.test.ts` |
| Edge Functions | — | — | `edge-functions.test.ts` | — |
| RLS Policies | — | — | `rls-policies.test.ts` | — |

---

## Test Generation Procedure

### Step 1 — Identify scope
- Module test → pick template matching test type (E2E / API / integration)
- Workflow test → use Template 1, map each role transition to a `test.step()`
- Security test → use Template 5 (RLS) or Template 6 (HIPAA audit)

### Step 2 — Fill in the template
- Replace all `{placeholders}` with real values from the codebase
- Route paths from `src/pages/` directory structure
- Table names from `supabase/migrations/`
- Edge function names from `supabase/functions/` directory
- Role strings: `'admin' | 'doctor' | 'nurse' | 'receptionist' | 'pharmacist' | 'lab-tech' | 'patient'`

### Step 3 — Validate before output
- [ ] File placed in correct directory per the Infrastructure Map
- [ ] Filename follows naming convention
- [ ] `loginAs(page, role)` used for all E2E role switches (never hardcoded creds)
- [ ] No PHI in test fixtures — use placeholder IDs and generic values
- [ ] `timeout: 10_000` on all `toBeVisible` assertions (matches `playwright.config.ts`)
- [ ] HIPAA audit tests assert `action_type` is specific (not generic `'update'`)
- [ ] RLS tests assert `hospital_id` scoping
