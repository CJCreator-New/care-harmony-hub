---
Status: ready-for-agent
Severity: P2
Role: backend/api
Page: N/A
Viewport: N/A
Browser: Node.js (Vitest)
---

# [P2] API & Integration Suites Time Out Against `stub.supabase.co` Without Local DB or Mocking

## Description
In `tests/api/` (11 tests), `tests/security/` (4 tests), and `tests/integration/appointment-lifecycle.test.ts` (2 tests), tests execute direct queries via the Supabase client without a running local Supabase container or HTTP mocks.

In `src/integrations/supabase/client.ts`, test mode falls back to `https://stub.supabase.co`:
```typescript
const SUPABASE_URL = _url || (isTest ? 'https://stub.supabase.co' : '');
```
`safeFetch` contains a 10,000ms timeout. Because `https://stub.supabase.co` does not exist, `fetch` hangs until the timeout fires with `AbortError: This operation was aborted`, causing tests to exceed Vitest's 15,000ms threshold.

## Steps to Reproduce
1. Run `npm run test:api` without a local Supabase Docker daemon running.
2. Observe 11 tests in `tests/api/` failing with `AbortError: This operation was aborted`.

## Expected Result
Vitest API/integration suites should either:
- Mock HTTP responses (MSW / vi.spyOn) when running in offline CI/local dev, OR
- Require the local Supabase container (`scripts/start-local-db.ps1`) before executing live queries.

## Recommended Fix
Add MSW / mock handlers for `tests/api/` and `tests/security/` or guard live DB tests with an environment check (e.g. `process.env.SUPABASE_LOCAL_RUNNING`).

## Regression Test Required
Yes (`npm run test:api`, `npm run test:security`).
