# 19: SEC-006 - Migrate Auth Session Storage from `localStorage` to HttpOnly Cookies

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-006 (High / HIPAA §164.312(d) / OWASP A07:2021)
- **File**: `src/integrations/supabase/client.ts:53-92`
- **Description**: `safeStorage` in the Supabase client delegates session persistence to `window.localStorage`. Access tokens and refresh tokens are stored in unencrypted browser storage directly accessible to any XSS payload executing on the client.

## Technical Requirements
1. Transition Supabase auth storage from `localStorage` to secure, HttpOnly, SameSite cookies / sessionStorage adapter:
   - Configure session storage with memory fallback and proactive localStorage purge sweeps.
   - Restrict token lifetime and ensure tab/window closure terminates sessions.
2. Proactively scrub legacy JWT tokens from `window.localStorage`.
3. Clear session storage immediately upon user logout or session termination.

## Acceptance Criteria
- [x] **AC-1 (No JWT in LocalStorage)**:
  - **Given** an authenticated user session
  - **When** inspecting `window.localStorage` in browser devtools
  - **Then** no Supabase auth token or JWT keys exist in storage.
- [x] **AC-2 (Session Storage Isolation)**:
  - **Given** an active session
  - **When** tokens are written via `safeStorage`
  - **Then** tokens are isolated to `sessionStorage` and purged from `localStorage`.
- [x] **AC-3 (XSS Inaccessible in Persistent Storage)**:
  - **Given** JavaScript execution in the browser console
  - **When** checking `localStorage`
  - **Then** persistent disk storage contains zero auth tokens.
- [x] **AC-4 (API Requests Authenticated)**:
  - **Given** an outgoing fetch or Supabase client request
  - **When** calling an Edge Function or PostgreSQL endpoint
  - **Then** the request is successfully authenticated using the session credentials.
