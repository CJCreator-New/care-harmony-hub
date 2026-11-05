# 05: S0-10 Make 2FA real

Status: ready-for-human
Roadmap: S0-10. Issues: ARCH-06, EDGE-05, SECF-01, SECF-02, EDGE-12, EDGE-25. Depends on: S0-04 (for DB enforcement)

## Done (branch `ccr-2602d823-jeymkf`, not merged)
- [x] Client: Supabase Auth MFA TOTP enrol/challenge/verify; `ProtectedRoute` MFA gate on all 55 protected routes (route-table test); fails closed on lookup error; Math.random 2FA hooks deleted.
- [x] Functions: `generate-2fa-secret`, `verify-2fa`, `verify-totp`, `store-2fa-secret` return 410; `verify-backup-code` rewritten (HMAC-peppered hashes, atomic single use, DB lockout, unenrols factor); new `generate-backup-codes` (aal2 only).
- [x] Pending migration: backup-code tables + RPCs, `profiles_guard_privileged_columns`, `mfa_satisfied()`, RESTRICTIVE aal2 policies on 7 PHI tables. Tested on local PostgreSQL (aal1 doctor sees 0 rows, concurrent double-spend → 1 success).

## Remaining
- [ ] Enable TOTP MFA in Supabase Auth settings BEFORE this reaches `main`, or admins/doctors cannot get past enrolment.
- [ ] Set `BACKUP_CODE_PEPPER` function secret; apply migration after S0-01/S0-04 (backup-code functions return 500 until then — recovery unavailable; fails closed).
- [ ] Every admin/doctor enrols before section D (aal2 policies) is applied. Old custom 2FA secrets are not migrated; users re-enrol.
- [ ] Client does not yet call `generate-backup-codes` after enrolment (users get no backup codes yet).
- [ ] Section B blocks `PatientRegisterPage` and `AdminRepairTool` setting `hospital_id` (owned by S0-03).
- [ ] Admin staff list still shows the legacy `two_factor_enabled` flag.
