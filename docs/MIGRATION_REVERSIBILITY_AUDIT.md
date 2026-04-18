# Migration Reversibility Audit

**Skill:** hims-devops-guardian
**Last Updated:** 2026-04-18
**Auditor:** Production Readiness Plan — Phase 4

## Audit Methodology

Per hims-devops-guardian: every migration must be reversible without data loss.
- ✅ **Allowed**: `ADD COLUMN`, `CREATE INDEX CONCURRENTLY`, new tables, new policies
- ⚠️ **Soft-deprecate**: rename column → add `_deprecated` suffix + keep both
- ❌ **Blocked**: `DROP COLUMN`, `DROP TABLE`, destructive `ALTER TYPE`

## Last 10 Migrations Reviewed

| File | Type | Reversible | Risk | Notes |
|------|------|------------|------|-------|
| `20260331000002_core_workflow_schema_guard.sql` | Guard | ✅ | Low | Idempotent CHECK constraints |
| `20260331000001_walkin_registration_schema_guard.sql` | Guard | ✅ | Low | ADD COLUMN IF NOT EXISTS |
| `20260331_break_glass_overrides.sql` | New table | ✅ | Low | Additive — drop table to revert |
| `20260328065831_fix_test_data_and_genders.sql` | Data fix | ⚠️ | Med | UPDATE statements — review before re-run |
| `20260325_create_prescription_approval_workflows.sql` | New table | ✅ | Low | Additive |
| `20260313000004_audit_testing_compliance_utilities.sql` | Functions | ✅ | Low | CREATE OR REPLACE |
| `20260313000003_billing_lab_result_audit_triggers.sql` | Triggers | ✅ | Low | DROP TRIGGER IF EXISTS to revert |
| `20260313000002_prescription_approval_logging_triggers.sql` | Triggers | ✅ | Low | Reversible |
| `20260313000001_audit_trail_core_infrastructure.sql` | New tables | ✅ | Low | Additive |
| `20260311000007_rls_hardening.sql` | RLS | ✅ | Low | Policies — DROP POLICY to revert |

## Findings

- **0 P0 destructive operations** in last 10 migrations.
- **1 P1**: data-fix migration `20260328065831` — document one-time-only intent.
- **All schema changes are additive** (column adds, new tables, new policies).

## Recommendation

✅ **PASS** — Migration history is production-safe. Continue policy: no `DROP COLUMN` in any new migration; use soft-deprecation pattern from skill spec.
