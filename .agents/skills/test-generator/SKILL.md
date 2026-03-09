---
name: test-generator
description: 'Generates Vitest unit tests for hooks and Playwright E2E tests for role workflows in the CareSync HIMS. Uses the existing fixtures, mocks, and AuthContext patterns already in the test tree. Use when asked to write tests for a hook, component, or role workflow. Produces ready-to-run test files that follow the existing conventions in src/test/ and tests/e2e/.'
argument-hint: 'Specify what to test: a hook name (e.g. usePatients), a component, or a role workflow (e.g. "doctor consultation flow", "pharmacist dispense flow"). Optionally specify test type: unit | e2e | both.'
---

# CareSync — Test Generator Skill

Generates production-ready test files that slot directly into the existing test infrastructure. Follows the exact patterns, mocks, and conventions already established in `src/test/` (Vitest) and `tests/e2e/` (Playwright).

## When to Use

- "Write tests for [hook]"
- "Generate a Vitest unit test for [hook/util]"
- "Write a Playwright E2E test for the [role] workflow"
- "Add tests for [feature]"
- "Generate tests for [component]"

---

## Test Infrastructure Overview

### Vitest (Unit / Integration)
- **Config**: `vitest.config.ts` — `jsdom` environment, globals, `setupFiles: ['./src/test/setup.ts']`
- **Alias**: `@/` → `src/`
- **Setup file**: `src/test/setup.ts` — mocks `sonner`, `crypto`, sets env vars
- **Supabase mock**: `src/test/mocks/supabase.ts` → `mockSupabaseClient`
- **Auth mock**: `src/test/mocks/auth.ts` → `createMockAuthContext`, `mockUser`, `mockProfile`, `mockHospital`
- **Wrapper**: `QueryClientProvider` with `retry: false`
- **Excluded from Vitest**: `tests/e2e/**`, `**/*.spec.ts` — Playwright files must NOT be picked up by Vitest

### Playwright (E2E)
- **Config**: `playwright.config.ts` — `testDir: 'tests/e2e'`, `baseURL: http://localhost:8080`, Chromium only
- **Auth fixture**: `tests/e2e/fixtures/auth.fixture.ts` — `loginAs(role)`, role-specific test extensions (`doctorTest`, `nurseTest`, etc.)
- **Test data**: `tests/e2e/fixtures/test-data.ts` — `testUsers`, `generatePatient()`, `generateAppointment()`
- **Roles**: `admin`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `lab_technician`, `patient`
- **File naming**: `tests/e2e/<feature>.spec.ts` — must end in `.spec.ts`

---

## Part A — Vitest Hook Tests

### Standard Hook Test Template

```tsx
// src/test/hooks/use<HookName>.test.tsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { use<HookName> } from '@/hooks/use<HookName>';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile } from '../mocks/auth';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock AuthContext if hook uses useAuth()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => createMockAuthContext(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('use<HookName>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => use<HookName>(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('should fetch data successfully', async () => {
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient.from(),
      // chain the specific methods your hook uses
      single: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    });

    const { result } = renderHook(() => use<HookName>(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it('should handle Supabase error gracefully', async () => {
    mockSupabaseClient.from.mockReturnValueOnce({
      ...mockSupabaseClient.from(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const { result } = renderHook(() => use<HookName>(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeDefined();
  });
});
```

### Mutation Hook Test Pattern

```tsx
it('should call insert with correct payload', async () => {
  const insertMock = vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null });
  mockSupabaseClient.from.mockReturnValueOnce({
    ...mockSupabaseClient.from(),
    insert: insertMock,
  });

  const { result } = renderHook(() => use<HookName>(), { wrapper: createWrapper() });

  await act(async () => {
    await result.current.create({ name: 'Test', hospital_id: mockProfile.hospital_id });
  });

  expect(insertMock).toHaveBeenCalledWith(
    expect.objectContaining({ hospital_id: mockProfile.hospital_id })
  );
});
```

### Role-Specific Hook Test Pattern

When the hook behaves differently per role, override `createMockAuthContext`:

```tsx
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => createMockAuthContext({ roles: ['doctor'] }),
}));
```

### Paginated Hook Test Pattern

For hooks using `usePaginatedQuery`:

```tsx
mockSupabaseClient.from.mockReturnValueOnce({
  select: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({
    data: [{ id: '1' }, { id: '2' }],
    error: null,
    count: 2,
  }),
});
```

---

## Part B — Playwright E2E Tests

### Standard Role Workflow Template

```ts
// tests/e2e/<feature>-<role>-workflow.spec.ts
import { test, expect } from '@playwright/test';
import { doctorTest } from './fixtures/auth.fixture';  // use role-specific fixture
import { generatePatient } from './fixtures/test-data';

// Use role-specific test extension for authenticated context
doctorTest.describe('Doctor — <Feature> Workflow', () => {
  doctorTest('should complete <action> successfully', async ({ doctorPage }) => {
    // Navigate to the feature
    await doctorPage.goto('/dashboard');
    await expect(doctorPage).toHaveURL(/dashboard/);

    // Interact with the UI
    await doctorPage.getByRole('button', { name: /<action>/i }).click();

    // Assert outcome
    await expect(doctorPage.getByText(/<success message>/i)).toBeVisible();
  });
});
```

### Multi-Role Handoff Test Pattern

```ts
// tests/e2e/cross-role-<feature>.spec.ts
import { test, expect, Page } from '@playwright/test';
import { test as authTest } from './fixtures/auth.fixture';

authTest.describe('Cross-Role — <Feature> Handoff', () => {
  authTest('nurse preps patient → doctor sees ready status', async ({ loginAs }) => {
    // Step 1: Nurse action
    const nursePage = await loginAs('nurse');
    await nursePage.goto('/nurse/queue');
    await nursePage.getByRole('button', { name: /complete prep/i }).first().click();
    await expect(nursePage.getByText(/ready for doctor/i)).toBeVisible();

    // Step 2: Doctor sees updated status
    const doctorPage = await loginAs('doctor');
    await doctorPage.goto('/doctor/queue');
    await expect(doctorPage.getByText(/ready for doctor/i)).toBeVisible();
  });
});
```

### Role Access Control Test Pattern

```ts
test.describe('RBAC — <Feature> Access Control', () => {
  const unauthorizedRoles = ['patient', 'receptionist'] as const;

  for (const role of unauthorizedRoles) {
    test(`${role} cannot access <protected route>`, async ({ loginAs }) => {
      const page = await loginAs(role);
      await page.goto('/<protected-route>');

      // Should redirect or show access denied
      await expect(page).not.toHaveURL(/<protected-route>/);
    });
  }
});
```

### Form Submission Test Pattern

```ts
authTest('should submit <form> with valid data', async ({ loginAs }) => {
  const page = await loginAs('receptionist');
  const patient = generatePatient();

  await page.goto('/patients/register');

  await page.getByLabel(/first name/i).fill(patient.firstName);
  await page.getByLabel(/last name/i).fill(patient.lastName);
  await page.getByLabel(/email/i).fill(patient.email);
  await page.getByLabel(/phone/i).fill(patient.phone);

  await page.getByRole('button', { name: /register|save|submit/i }).click();

  await expect(page.getByText(/successfully registered|patient created/i)).toBeVisible();
});
```

---

## Part C — What to Generate Per Request

| Request | Output file | Base template |
|---------|-------------|---------------|
| `usePatients` hook | `src/test/hooks/usePatients.test.tsx` | Standard Hook Test |
| `useVitalSigns` hook | `src/test/hooks/useVitalSigns.test.tsx` | Standard Hook Test |
| `usePaginatedQuery` hook | `src/test/hooks/usePaginatedQuery.test.tsx` | Paginated Hook Test |
| Doctor consultation flow | `tests/e2e/doctor-consultation.spec.ts` | Role Workflow (doctorTest) |
| Nurse triage flow | `tests/e2e/nurse-triage.spec.ts` | Role Workflow (nurseTest) |
| Pharmacist dispense flow | `tests/e2e/pharmacist-dispense.spec.ts` | Role Workflow (pharmacistTest) |
| Receptionist check-in flow | `tests/e2e/receptionist-checkin.spec.ts` | Role Workflow (receptionistTest) |
| Lab tech order flow | `tests/e2e/labtech-orders.spec.ts` | Role Workflow (labTechTest) |
| Patient portal flow | `tests/e2e/patient-portal.spec.ts` | Role Workflow (patientTest) |
| Cross-role handoff | `tests/e2e/cross-role-<feature>.spec.ts` | Multi-Role Handoff |
| RBAC access control | `tests/e2e/rbac-<feature>.spec.ts` | Role Access Control |

---

## Rules

- **Never** import from `@playwright/test` in Vitest files — it will break the test runner
- **Never** use `*.spec.ts` naming for Vitest files — Vitest excludes them
- **Always** use `vi.clearAllMocks()` in `beforeEach` for hook tests
- **Always** use `retry: false` in `QueryClient` for hook tests — prevents flaky async behavior
- **Always** use role-specific fixtures (`doctorTest`, `nurseTest`, etc.) for E2E — not raw `test`
- **Always** use `getByRole` / `getByLabel` / `getByText` selectors — not CSS selectors or `data-testid` unless already present
- **Never** hardcode `hospital_id` — use `mockProfile.hospital_id` from the auth mock
- For hooks that call `useAuth()`, always mock `@/contexts/AuthContext` — never let it hit the real Supabase auth
