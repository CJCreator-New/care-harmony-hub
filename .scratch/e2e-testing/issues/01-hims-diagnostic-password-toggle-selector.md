---
Status: ready-for-agent
Severity: P1
Role: all
Page: /hospital/login
Viewport: Desktop Chrome
Browser: chromium
---

# [P1] Diagnostic Suite `loginAs` Selector Collides with Show Password Button

## Description
In `tests/e2e/hims-diagnostic-complete.spec.ts`, the custom `loginAs` helper attempts to locate the password input field using:
```typescript
const passwordField = page.getByLabel(/password/i).first();
```
Because the password visibility toggle button is rendered with `aria-label="Show password"`, Playwright resolves `getByLabel(/password/i).first()` to the `<button>` element rather than the password `<input>` element. Attempting to call `.fill(password)` on this button results in:
`Error: locator.fill: Error: Element is not an <input>, <textarea>, <select> or [contenteditable] and does not have a role allowing [aria-readonly]`
This causes all 21 diagnostic test cases in `hims-diagnostic-complete.spec.ts` to abort during login.

## Steps to Reproduce
1. Run `npx playwright test tests/e2e/hims-diagnostic-complete.spec.ts --project=chromium`
2. Observe `loginAs` resolving `getByLabel(/password/i).first()` to `<button type="button" aria-label="Show password"...>`
3. Execution throws fill error on button.

## Expected Result
The test helper should target the actual password input or reuse the canonical `LoginPage` object (`tests/e2e/pages/login.page.ts`) which targets `input[type="password"]`.

## Actual Result
Throws element not fillable exception on all diagnostic tests.

## Evidence
- Call log:
  `- waiting for getByLabel(/password/i).first()`
  `- locator resolved to <button type="button" aria-label="Show password"...>`
  `- fill("TestPass123!")`

## Likely Root Cause
`tests/e2e/hims-diagnostic-complete.spec.ts` re-implemented login logic inline instead of reusing `LoginPage.loginAndWaitForDashboard` from `tests/e2e/pages/login.page.ts`.

## Recommended Fix
Replace inline login helper in `tests/e2e/hims-diagnostic-complete.spec.ts` with `LoginPage` or update selector to `page.locator('input[type="password"], input[name="password"]')`.

## Regression Test Required
Yes (`tests/e2e/hims-diagnostic-complete.spec.ts`).
