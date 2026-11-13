# ADR-0011: Canonical Platform Branding as CareHarmony HIMS

## Status

Accepted

## Context

The repository historical codebase had conflicting naming conventions across different artifacts:

- Repository package manifest named `vite_react_shadcn_ts`
- Documentation and specs referencing `CareSync`
- User interface landing pages, login headers, and registration components branding as `AROCORD-HIMS`

To avoid trademark conflicts and build a unified product identity aligned with the repository namespace (`care-harmony-hub`), a single canonical brand name must be established.

## Decision

1. **Canonical Name**:
   - The official platform name is **CareHarmony HIMS**.
2. **Implementation Scope**:
   - Update `package.json` package name to `@careharmony/hims`.
   - Update HTML metadata, title tags in `index.html` to `CareHarmony HIMS`.
   - Update `README.md` and `docs/` documentation indices.
   - Standardize all navigation headers, logos, and authentication screens from `AROCORD-HIMS` / `CareSync` to `CareHarmony HIMS`.

## Consequences

- **Positive**: Eliminates naming ambiguity for end users, developers, and potential enterprise hospital clients.
- **Positive**: Protects against third-party trademark claims.
