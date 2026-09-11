---
Status: ready-for-agent
Severity: P2
Role: receptionist
Page: /queue
Viewport: Desktop
Browser: chromium
---

# [P2] Queue Walk-In CTA Regex Fails to Match "Walk-In Registration"

## Description
In `tests/e2e/tests/roles/receptionist/receptionist.spec.ts`, the test `REC-TC-01 queue page has check-in or new appointment option` searches for:
```typescript
const cta = page.getByRole('button', { name: /check.?in|add patient|new appointment|register/i }).first();
await expect(cta).toBeVisible({ timeout: 10_000 });
```
On `/queue`, the actual button rendered in `QueueManagementPage` is:
```yaml
- button "Walk-In Registration" [cursor=pointer]:
  - text: Walk-In Registration
```
Because `/register/i` requires the literal suffix "er", it does not match "Registration". Consequently, the locator times out and fails the test even though the registration CTA button is visibly present.

## Steps to Reproduce
1. Log in as `reception@testgeneral.com`
2. Navigate to `/queue`
3. Observe button labeled "Walk-In Registration"
4. Test fails waiting for `/check.?in|add patient|new appointment|register/i`.

## Expected Result
The regex locator should include `registration` or `/walk.?in|registration|check.?in/i`.

## Actual Result
Locator fails to match "Walk-In Registration".

## Evidence
- `test-results/tests-roles-receptionist-r-95de4-n-or-new-appointment-option-chromium/error-context.md` line 96:
  `button "Walk-In Registration" [cursor=pointer]`

## Likely Root Cause
Regex in `tests/e2e/tests/roles/receptionist/receptionist.spec.ts` line 51 uses `/register/i` instead of `/regist/i` or `/registration/i`.

## Recommended Fix
Update regex to `/check.?in|add patient|new appointment|register|registration|walk.?in/i`.

## Regression Test Required
Yes (`tests/e2e/tests/roles/receptionist/receptionist.spec.ts`).
