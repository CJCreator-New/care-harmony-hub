# Route Manifest Contract

This document defines the production route contract introduced in `src/config/routeManifest.ts`.

## Purpose

- Centralize route metadata that was previously duplicated across `src/App.tsx`, `src/components/layout/GroupedSidebar.tsx`, and ad hoc permission checks.
- Make release tier, feature-flag readiness, and test ownership explicit for every navigation surface.
- Give frontend, QA, and release reviewers one source of truth for launch-visible routes.

## Contract Fields

- `label`: user-facing navigation label
- `href`: canonical route path
- `allowedRoles`: roles allowed to reach the route
- `requiredPermission`: canonical permission required in addition to role access
- `releaseTier`:
  - `tier1`: launch-critical
  - `tier2`: launch-supported
  - `tier3`: post-launch or feature-flagged
- `featureFlag`: optional launch gate for routes that must not be visible by default
- `testOwner`:
  - `unit`
  - `integration`
  - `api-security`
  - `e2e`

## Launch Rules

- `tier1` routes must have green integration or E2E coverage before release.
- `tier2` routes must either meet the same bar as `tier1` or remain hidden behind an explicit feature flag.
- `tier3` routes must not be treated as launch blockers, but they also must not be visible without a release decision.
- Sidebar visibility, guard logic, and future route-group extraction should consume this manifest instead of inventing route policy in-place.

## Immediate Follow-up

- Migrate inline route declarations in `src/App.tsx` to consume this manifest in grouped modules.
- Add a route-manifest validation test that asserts every manifest entry has a live route or a documented feature-flag reason.
- Add release-review automation that fails when a `tier3` route is visible without `featureFlag`.
