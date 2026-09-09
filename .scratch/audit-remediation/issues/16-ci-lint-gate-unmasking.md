# 16: DEVOPS-001 - Remove `|| true` CI Suppression and Resolve 1,214 Lint Errors

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: DEVOPS-001 (High / Code Quality & Pipeline Integrity)
- **Files**: `.github/workflows/ci-pipeline.yml:53`, codebase source and test files
- **Description**: The GitHub Actions CI pipeline suppresses ESLint failures via `npm run lint -- --format json > lint-report.json || true`. Consequently, 1,214 lint errors and warnings (including syntax bugs in test fixtures, unescaped entities, and unhandled promises) are ignored, allowing broken code into the repository.

## Technical Requirements
1. Remove `|| true` from `.github/workflows/ci-pipeline.yml`.
2. Fix automated lint issues across `src/` and `tests/` using `npx eslint --fix`.
3. Manually resolve residual errors:
   - Fix unescaped HTML entities in React components (`&apos;`, `&quot;`).
   - Fix unused variables and unhandled promises.
   - Correct invalid syntax in test fixture files.
4. Ensure `npm run lint` exits with code 0.

## Acceptance Criteria
- [x] **AC-1 (CI Fails on Lint Errors)**:
  - **Given** `.github/workflows/ci-pipeline.yml`
  - **When** a pull request introduces an ESLint error
  - **Then** the CI job fails with a non-zero exit code.
- [x] **AC-2 (Zero Linter Errors in Codebase)**:
  - **When** running `npm run lint` locally or in CI
  - **Then** the command exits with code 0
  - **And** reports 0 errors.
- [x] **AC-3 (Build and Tests Pass)**:
  - **When** running `npm run build` and `npm run test:unit` after lint fixes
  - **Then** all unit tests and production Vite builds succeed without errors.
