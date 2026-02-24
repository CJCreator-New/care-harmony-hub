# Playwright E2E Test Suite

This folder contains a generic, observable Playwright Test setup designed to exercise major user journeys with deterministic mock data.

## What is included

- `playwright.config.ts`
- `mockData.ts` deterministic users/entities/notifications/settings
- `utils.ts` shared helpers (`login`, `navigateTo`, API interception, error collection)
- Route-level coverage specs:
  - `home-page.spec.ts`
  - `login-page.spec.ts`
  - `dashboard-page.spec.ts`
  - `settings-page.spec.ts`
- Journey/flow specs:
  - `auth-and-onboarding.spec.ts`
  - `primary-business-flow.spec.ts`
  - `edit-and-delete-flow.spec.ts`
  - `notifications-and-settings-flow.spec.ts`

## Install and browser setup

```bash
npm install
npx playwright install
```

## Run locally

```bash
# Standard E2E run
npm run test:e2e

# Headed + visible slow interactions for walkthroughs
npm run test:e2e:ui

# Role setup coverage (Admin, Doctor, Nurse, Receptionist, Lab, Pharmacist, Patient Portal)
npm run test:e2e:roles:setup

# Headless one-off run
npx playwright test --headless
```

## Run in CI

```bash
CI=true npx playwright test --reporter=line
```

Recommended CI artifacts to upload:

- `playwright-report/`
- `test-results/`

## Mock data and deterministic state

- Tests call `installMockApi(page)` which intercepts `**/api/**` with `page.route` and returns JSON from `mockData.ts`.
- `resetMockState()` is called before each test to keep initial state consistent.
- `enableTestMode(page)` sets `localStorage.TEST_MODE=true` before app scripts run.

## Adding new tests

1. Add a new `*.spec.ts` in `tests/e2e`.
2. Reuse helpers from `utils.ts`:
   - `navigateTo(page, '/route')`
   - `login(page)`
   - `installMockApi(page)`
   - `createErrorCollector(page)`
3. Wrap major actions in `test.step('...')` for readable execution.
4. Prefer semantic selectors:
   - `getByRole`
   - `getByLabel`
   - `getByText`
   - `getByTestId`
5. If UI is hard to target, add stable `data-testid` attributes in app code.
6. Extend `mockData.ts` and corresponding API route handlers when new flows require new entities.

## Role coverage matrix

The suite `role-setup-coverage.spec.ts` validates the same deterministic setup pattern for:

- Admin
- Doctor
- Nurse
- Receptionist
- Lab (`lab_technician`)
- Pharmacist
- Patient Portal (`patient`)

## Failure artifact interpretation

- `trace`: available on first retry. Open with:
  - `npx playwright show-trace <trace.zip>`
- `screenshot`: captured automatically on failure.
- `video`: recorded on first retry for visual debugging.

Use `test.step` names in traces to locate exact failing stages quickly.
