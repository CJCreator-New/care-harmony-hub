# CareSync HIMS — System Hardening Final Report

## Executive Summary

This report documents the security hardening measures applied to the CareSync HIMS as part of the Q1 2026 security review cycle.

## Hardening Measures Applied

### Row Level Security (RLS)
- All patient-facing tables enforce `hospital_id` scoping
- Profiles with null `hospital_id` are blocked from anon access (migration `20260209100000_m3_rls_hardening.sql`)
- `two_factor_secrets` and credential tables are restricted to authenticated owners only

### Authentication
- Multi-factor authentication (TOTP) added for admin and doctor roles
- Session token rotation on privilege escalation
- Biometric authentication support via WebAuthn

### Data Encryption
- PHI fields encrypted at rest using AES-256-GCM via `FieldEncryptionService`
- Encryption key versioning supports future key rotation
- Audit metadata stored alongside encrypted records

### API Security
- Rate limiting enforced via Kong gateway (100 req/min per IP for unauthenticated)
- CORS policy restricted to approved origins
- All Edge Functions validate JWT before processing

### Audit Logging
- Every PHI access and mutation logged to `audit_logs` table
- Logs are append-only (no delete policy)
- Sensitive log fields masked via `sanitizeForLog`

## Residual Risks

| Risk | Severity | Status |
|---|---|---|
| Null-scoped profile exposure | Medium | Pending migration T-04 |
| Edge function auth bypass | Low | Under review |

## Next Review Date

July 2026
