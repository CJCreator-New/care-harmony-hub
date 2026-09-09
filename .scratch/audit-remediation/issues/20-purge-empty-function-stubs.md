# 20: DEV-STUBS - Delete 5 Empty Function Stubs & Clean Up Dead Directories

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: DEV-STUBS (Low / Architecture Hygiene)
- **Files**: `supabase/functions/ab-test-api/`, `integration-api/`, `live-chat/`, `partner-api/`, `personalization-api/`
- **Description**: Five directories under `supabase/functions/` contain zero files. They represent abandoned or incomplete features that clutter the repository, inflate function counts in documentation, and create confusion during security audits.

## Technical Requirements
1. Verify whether any active frontend components or configurations reference `ab-test-api`, `integration-api`, `live-chat`, `partner-api`, or `personalization-api`.
2. Delete the five empty directories from `supabase/functions/`.
3. Update any edge function deployment manifests or CI scripts to reflect the clean inventory of 41 active edge functions.

## Acceptance Criteria
- [x] **AC-1 (Zero Broken References)**:
  - **Given** the frontend codebase in `src/`
  - **When** searching for the 5 stub function names
  - **Then** no active components invoke or import them.
- [x] **AC-2 (Directories Removed)**:
  - **When** listing `supabase/functions/`
  - **Then** none of the 5 empty directories exist.
- [x] **AC-3 (Build and Tests Pass)**:
  - **When** running `npm run type-check` and `npm run test:unit`
  - **Then** all checks pass without errors.
