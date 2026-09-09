# 18: SEC-007 - Scrub Historical Secrets via `git-filter-repo` & Rotate Supabase Keys

Status: ready-for-human
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-007 (High / Secrets Management / OWASP A05:2021)
- **Files**: `.env`, `.env.kong`, git commit tree
- **Description**: While `.env` is currently git-ignored, git revision history contains tracked commits exposing live Supabase project URLs, service keys, and anonymous API keys (expiring in 2082).

## Technical Requirements
1. Interactive Wizard: Execute `powershell -ExecutionPolicy Bypass -File scripts/secrets-rotation-wizard.ps1` to walk through the 6-stage guided procedure.
2. Run `git-filter-repo` (or BFG Repo-Cleaner) to completely purge historical `.env`, `.env.kong`, and associated secret tokens from all git branches and tags.
3. In Supabase Dashboard, rotate:
   - Database user passwords.
   - JWT secret and Anon / Service-Role API keys.
   - Webhook signing secrets.
4. Update environment variables in GitHub Secrets, Vercel/production deployment, and local `.env.example`.
5. Run `trufflehog` or `gitleaks` to verify that git history is completely free of credential leaks.

## Acceptance Criteria
- [ ] **AC-1 (History Sanitization)**:
  - **Given** the git commit history across all branches
  - **When** scanning for historical `.env` commits using `git log --all --full-history -- "**.env*"`
  - **Then** 0 results are found.
- [ ] **AC-2 (Zero Leaks Detected)**:
  - **When** running `gitleaks detect` or `trufflehog git file://.`
  - **Then** the scanner exits with 0 detected leaks.
- [ ] **AC-3 (Key Rotation Complete)**:
  - **Given** rotated Supabase API credentials
  - **When** old credentials are used to make API requests
  - **Then** requests are rejected with HTTP 401 Unauthorized.
