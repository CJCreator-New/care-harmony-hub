---
Status: ready-for-agent
Severity: P2
Role: nurse, receptionist, pharmacist
Page: /pharmacy, /settings/staff, /laboratory, /consultations
Viewport: Any
Browser: chromium
---

# [P2] Access Guard Tests Suffer Race Condition Against Lazy-Loaded Suspense Elements

## Description
In `tests/e2e/tests/roles/nurse/nurse.spec.ts`, `receptionist.spec.ts`, and `pharmacist.spec.ts`, access guard tests verify that unauthorized roles are blocked from restricted routes (e.g. nurse accessing `/pharmacy` or `/settings/staff`).

The test assertion is implemented as:
```typescript
await page.goto('/pharmacy');
const denied = page.getByText(/access denied|unauthorized|not authorized/i);
const isDenied = await denied.isVisible().catch(() => false);
const redirected = !page.url().includes('/pharmacy');
expect(isDenied || redirected).toBeTruthy();
```
Because routes in `src/routes/routeDefinitions.tsx` use `React.lazy()`, when `page.goto` finishes DOMContentLoaded, the route chunk is still being fetched and rendered inside React Suspense. Playwright's `locator.isVisible()` executes synchronously without waiting, returning `false` before the Access Denied heading renders.

Inspection of Playwright error snapshots confirms the application DOES properly block access and renders:
```yaml
- heading "Access Denied" [level=1]
- paragraph: "Access denied. Required roles: admin, pharmacist"
- button "Go Back"
```
However, the test fails falsely because of the instantaneous non-waiting check.

## Steps to Reproduce
1. Run `npx playwright test tests/e2e/tests/roles/nurse/nurse.spec.ts --project=chromium`
2. Inspect tests: `NUR-TC-04 nurse cannot access pharmacy module directly` and `NUR-TC-04 nurse cannot access admin staff settings`.
3. Notice `expect(isDenied || redirected).toBeTruthy()` receives `false`, while the snapshot shows "Access Denied" is rendered.

## Expected Result
Tests should use auto-retrying assertions such as `await expect(denied).toBeVisible({ timeout: 10_000 })` or check for either redirect or denied text using proper asynchronous assertions.

## Actual Result
False test failures on properly secured routes due to checking visibility before Suspense resolves.

## Evidence
- `test-results/tests-roles-nurse-nurse-Nu-08e5b-ss-pharmacy-module-directly-chromium/error-context.md` shows:
  `heading "Access Denied" [level=1]`
  `paragraph: "Access denied. Required roles: admin, pharmacist"`

## Likely Root Cause
Use of `await locator.isVisible()` (non-waiting) instead of `await expect(locator).toBeVisible()` (auto-retrying).

## Recommended Fix
Update access guard tests in role specs to use `await expect(page.locator('text=/access denied|unauthorized/i').or(page.locator('body'))).toBeVisible()` or `await expect(async () => { ... }).toPass()`.

## Regression Test Required
Yes (`tests/e2e/tests/roles/nurse/nurse.spec.ts`, `receptionist.spec.ts`, `pharmacist.spec.ts`).
