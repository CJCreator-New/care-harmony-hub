# 08: SEC-003 - Replace `Math.random()` with Web Crypto in 2FA Flow & Require Server Verification

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: SEC-003 (Critical / OWASP A02:2021 Cryptographic Failures / HIPAA §164.312(d))
- **File**: `src/hooks/useTwoFactorAuth.ts:20-35, 79-93`
- **Description**: `useTwoFactorAuth` generates base32 TOTP secrets and backup recovery codes using `Math.random().toString(36)`, which is cryptographically predictable and non-compliant. Additionally, `verifyAndEnable()` accepts any arbitrary 6-digit number on the client without verifying it against the TOTP algorithm via backend edge function `verify-totp`.

## Technical Requirements
1. Replace all pseudo-random generation in `src/hooks/useTwoFactorAuth.ts` with `window.crypto.getRandomValues()`.
2. Generate base32 secrets using a standard, cryptographically secure RFC 4226/6238 implementation or invoke `supabase.functions.invoke('generate-2fa-secret')`.
3. Refactor `verifyAndEnable(token: string)` to invoke `supabase.functions.invoke('verify-totp', { body: { token } })`.
4. Only set 2FA state as enabled locally and in database if the backend confirms the token is valid.

## Acceptance Criteria
- [x] **AC-1 (Cryptographic PRNG Enforcement)**:
  - **Given** a user initiating 2FA setup
  - **When** generating the secret key and backup codes
  - **Then** `crypto.getRandomValues()` is utilized
  - **And** `Math.random()` is completely absent from the execution path.
- [x] **AC-2 (Invalid TOTP Code Rejected)**:
  - **Given** a generated 2FA secret
  - **When** the user inputs an invalid or expired 6-digit code (e.g. `'123456'`)
  - **Then** the verification call to `verify-totp` fails with HTTP 400/401
  - **And** 2FA remains disabled on both client and server.
- [x] **AC-3 (Valid TOTP Code Enables 2FA)**:
  - **Given** a generated 2FA secret entered into an authenticator app
  - **When** the user enters the active TOTP code
  - **Then** `verify-totp` returns HTTP 200 OK
  - **And** 2FA status is saved as enabled.
- [x] **AC-4 (Unit Test Verification)**:
  - **Given** `tests/security/p1-audit-remediation.test.ts`
  - **When** running automated tests
  - **Then** tests assert that invalid codes are rejected and crypto APIs are called.

## Answer
- **Implementation**: Refactored `src/hooks/useTwoFactorAuth.ts` to eliminate `Math.random()` entirely in favor of `window.crypto.getRandomValues()` for both base32 TOTP secret generation and recovery code generation. Refactored `verifyAndEnable(token)` to invoke `supabase.functions.invoke('verify-totp', { body: { token } })`, strictly preventing 2FA enablement unless the backend verification succeeds.
- **Verification**: Verified via `tests/security/p1-audit-remediation.test.ts` where crypto mocking and rejection of invalid codes were tested.
