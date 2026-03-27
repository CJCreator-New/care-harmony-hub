# Test Release Matrix

This matrix is the minimum release gate for the current CareSync app.

## Change Type to Required Commands

| Change Type | Required Commands |
| --- | --- |
| Shared UI, page layout, route shell | `npm run lint`, `npm run type-check`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e:smoke` |
| Auth, RBAC, sidebar visibility, route protection | `npm run lint`, `npm run type-check`, `npm run test:unit`, `npm run test:integration`, `npm run test:api`, `npm run test:security`, `npm run test:e2e:roles` |
| Supabase migrations, RLS, edge functions | `npm run type-check`, `npm run validate:rls`, `npm run validate:migrations`, `npm run test:api`, `npm run test:security`, targeted integration tests |
| Tier 1 workflow changes | `npm run test:unit`, `npm run test:integration`, `npm run test:api`, `npm run test:security`, `npm run test:e2e:smoke`, `npm run test:e2e:roles`, `npm run test:e2e:full` |
| Accessibility-sensitive clinical UI | `npm run lint`, `npm run type-check`, `npm run test:unit`, `npm run test:accessibility`, targeted Playwright smoke |
| Release candidate | `npm run test:release:gates` |

## Tier 1 Workflow Checklist

- Patient registration and lookup
- Appointment booking and queue progression
- Consultation access and documentation
- Prescription creation, approval, and dispensing
- Lab order creation, result review, and critical alert path
- Billing read/write for authorized roles
- Staff/admin settings, monitoring, and activity logs
- Document and notification access by role

## Policy

- No release if RBAC changes have not passed role-based Playwright coverage.
- No release if migration or RLS changes have not passed API and security suites.
- No release if a `tier1` route is visible but lacks a mapped test owner in the route manifest.
