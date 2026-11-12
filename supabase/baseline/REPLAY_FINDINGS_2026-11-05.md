# Migration replay findings (2026-11-05)

> Audit task **S0-01**, issue **DB-03** (with DB-14, DB-21). Produced by executing the migrations with `scripts/db/replay-migrations.mjs` on PostgreSQL 16.15, with `scripts/db/supabase-compat-shim.sql` standing in for Supabase-managed objects. No credentials or production systems were used. Rerun at any time with `npm run db:replay`.

## Conclusion

**The repository's migrations cannot build the database, and cannot be repaired into a baseline.** The production schema has to be captured from the live database (procedure: [README.md](./README.md)).

| Experiment | Result |
|---|---|
| **A. CLI-faithful** (`--stop-on-error`, what `supabase db reset` does) | Stops at the **first** file, `20260204000001_core_schema.sql`. **0 of 64** files apply. |
| **B. Continue after errors** | 8 of 64 apply, and those 8 only define functions, which PostgreSQL does not check against missing tables. **0 tables exist in `public` afterwards.** None of the 44 tables in the generated live types can be produced. 56 files fail: 3 intrinsic defects, 7 ordering defects, 45 cascades and 1 environment gap (pg_cron). |
| **C. Multipass** (retry failed files until no progress) | Pass 2 applies **nothing**. The baseline files block each other in a cycle: the file that creates the core tables (`…000011_misc.sql`) fails on its own defects, and every other baseline file needs those tables. |
| **D. What-if** (scratch copy with the first defects patched; not committed) | Each patch exposes another independent defect in the same files: `profiles.role` policies, a non-existent `hospital_roles` table, duplicate indexes, a non-existent `staff` table, a non-existent `immediate_attention_required` column. After two rounds there were still 0 tables. |
| **E. Hardening migrations in isolation** (the live function signature from `types.ts`, then each hardening file) | Both `20260311000007_rls_hardening.sql` and `20260909000001_harden_invoices_and_active_user_rls.sql` are **rejected by PostgreSQL**: `cannot change name of input parameter "_user_id"` (HINT: `Use DROP FUNCTION user_belongs_to_hospital(uuid,uuid) first`). |

Experiment E is what matters for security. It confirms by execution that the `is_active` check (SEC-008), the invoice billing boundary (ADR-0002) and the `audit_logs` immutability in `20260909000001` **cannot have been applied** to a database with the live function signature. Those audit "fixes" are not in effect (audit findings DB-03, DB-07, DB-08).

## Root failures (experiment B)

| File | Kind | Line | Error |
|---|---|---|---|
| `20260204000001_core_schema.sql` | ordering | 161 | `DELETE FROM public.consultations`, but `consultations` is created ten files later in `…000011_misc.sql` |
| `20260204000002_scheduling.sql` | ordering | 21 | needs `hospitals` (created in `…000011_misc.sql`) |
| `20260204000003_billing.sql` | **defect** | 80 | policy references `public.hospital_roles`, a table that exists nowhere |
| `20260204000004_pharmacy.sql` | ordering | 25 | needs `prescriptions` (created in `…000011_misc.sql`) |
| `20260204000005_laboratory.sql` | ordering | 30 | needs `lab_orders` (created in `…000011_misc.sql`) |
| `20260204000006_telemedicine.sql` | ordering | 25 | needs `appointments` (created in `…000011_misc.sql`) |
| `20260204000008_security_compliance.sql` | ordering | 73 | needs `user_roles` (created in `…000011_misc.sql`) |
| `20260204000009_portal_documents.sql` | ordering | 39 | needs `user_roles` (created in `…000011_misc.sql`) |
| `20260204000010_monitoring_ops.sql` | **defect** | 149 | creates `idx_system_metrics_timestamp` a second time (first at line 49) without `IF NOT EXISTS` |
| `20260204000011_misc.sql` | **defect** | 2920 | RLS policy filters `profiles` by `id = auth.uid()` and `role IN (…)`. `profiles` has no `role` column, and `id` is not the user id. Even if it compiled, this policy would never match: a latent security bug. |
| `20260311000002_workflow_failure_escalation.sql` | environment | 120 | `pg_cron` is not installed in vanilla PostgreSQL. The file's guard catches `insufficient_privilege`/`undefined_file` but not `feature_not_supported` (the PG15+ error), so it fails outside Supabase. It is harmless on Supabase, where pg_cron exists. |

## Other facts established

- **Order matters, and the CLI is lexicographic.** `20260325_create_prescription_approval_workflows.sql` and `20260331_break_glass_overrides.sql` have 8-digit versions. The CLI orders by filename, so they run after `20260324…`. Tools that sort numerically would put them first.
- **108 SQL files are never read by the CLI:** `legacy/` (98), `phase5/` (5) and the five top-level `tier*.sql` files whose names do not match `<digits>_<name>.sql`. Runtime tables such as `lab_critical_alerts` exist only there.
- **`scripts/validate-migrations.mjs` reports "69/69 reversible"** for this same set. It pattern-matches text and never executes SQL, so it cannot detect any of the above (DB-21).

## Raw report (experiment B, generated)

Generated by `scripts/db/replay-migrations.mjs` on 2026-11-05T03:55:57.751Z against PostgreSQL 16.15 (Ubuntu 16.15-0ubuntu0.24.04.1) with `scripts/db/supabase-compat-shim.sql`. Mode: **continue**.

| Metric | Value |
|---|---|
| Files the Supabase CLI applies (`<digits>_<name>.sql`) | 64 |
| Attempted / succeeded / failed | 64 / 8 / 56 |
| Failures: defect / ordering defect / cascade / environment | 3 / 7 / 45 / 1 |
| Top-level files the CLI skips (bad name) | 5 |
| Subdirectory files the CLI never reads | 103 (legacy/: 98, phase5/: 5) |
| Duplicate versions | none |
| Tables in `public` after replay | 0 |
| …without RLS / with RLS but no policy | 0 / 0 |
| SECURITY DEFINER functions without `search_path` | 1 |
| Tables in generated `types.ts` (live proxy) | 44 |
| …of which the replay does NOT produce | 44 |
| Tables the replay produces that `types.ts` lacks | 0 |

Failure kinds: **DEFECT** = the SQL itself is wrong for any database; **ORDER** = needs an object that only a later migration creates (breaks every from-scratch replay); **CASCADE** = fails only because an earlier failed file did not create an object it needs; **ENV** = needs a Supabase-managed object or extension the vanilla replay lacks (verify on a real Supabase stack).

### Failed migrations

| # | File | Kind | Line | Error |
|---|---|---|---|---|
| 1 | `20260204000001_core_schema.sql` | ORDER (created later in `20260204000011_misc.sql`) | 161 | relation "public.consultations" does not exist |
| 2 | `20260204000002_scheduling.sql` | ORDER (created later in `20260204000011_misc.sql`) | 21 | relation "hospitals" does not exist |
| 3 | `20260204000003_billing.sql` | DEFECT | 80 | relation "public.hospital_roles" does not exist |
| 4 | `20260204000004_pharmacy.sql` | ORDER (created later in `20260204000011_misc.sql`) | 25 | relation "prescriptions" does not exist |
| 5 | `20260204000005_laboratory.sql` | ORDER (created later in `20260204000011_misc.sql`) | 30 | relation "lab_orders" does not exist |
| 6 | `20260204000006_telemedicine.sql` | ORDER (created later in `20260204000011_misc.sql`) | 25 | relation "appointments" does not exist |
| 7 | `20260204000007_analytics_ai.sql` | CASCADE (from `20260204000001_core_schema.sql`) | 20 | relation "patients" does not exist |
| 8 | `20260204000008_security_compliance.sql` | ORDER (created later in `20260204000011_misc.sql`) | 73 | relation "user_roles" does not exist |
| 9 | `20260204000009_portal_documents.sql` | ORDER (created later in `20260204000011_misc.sql`) | 39 | relation "user_roles" does not exist |
| 10 | `20260204000010_monitoring_ops.sql` | DEFECT | 149 | relation "idx_system_metrics_timestamp" already exists |
| 11 | `20260204000011_misc.sql` | DEFECT | 2920 | column "role" does not exist |
| 12 | `20260205000001_accept_staff_invitation.sql` | CASCADE (from `20260204000011_misc.sql`) | 53 | relation "public.staff_invitations" does not exist — CONTEXT:  compilation of PL/pgSQL function "accept_staff_invitation" near line 3 |
| 13 | `20260205000002_hospital_admin_role.sql` | CASCADE (from `20260205000001_accept_staff_invitation.sql`) | 74 | function public.accept_staff_invitation(text, uuid, text, text, text) does not exist |
| 14 | `20260205000004_profiles_rls_hardening.sql` | CASCADE (from `20260204000011_misc.sql`) | 10 | relation "public.profiles" does not exist |
| 15 | `20260205000005_two_factor_encryption.sql` | CASCADE (from `20260204000011_misc.sql`) | 5 | relation "public.two_factor_secrets" does not exist |
| 16 | `20260205000006_rls_policy_hardening.sql` | CASCADE (from `20260204000011_misc.sql`) | 8 | relation "public.hospitals" does not exist |
| 17 | `20260205073146_fix_profiles_rls_exposure.sql` | CASCADE (from `20260204000011_misc.sql`) | 11 | relation "profiles" does not exist |
| 18 | `20260220070446_38d9e7dc-0e8e-4171-b60e-646645c7d87a.sql` | CASCADE (from `20260204000001_core_schema.sql`) | 14 | relation "public.patients" does not exist |
| 19 | `20260221000001_normalize_mrn_format.sql` | CASCADE (from `20260204000001_core_schema.sql`) | 11 | relation "public.patients" does not exist |
| 20 | `20260223000001_fix_role_self_assignment.sql` | CASCADE (from `20260204000011_misc.sql`) | 29 | relation "public.user_roles" does not exist |
| 21 | `20260223000002_activity_logs_partitioning.sql` | CASCADE (from `20260204000011_misc.sql`) | 23 | relation "activity_logs" does not exist |
| 22 | `20260223000003_perf_indexes.sql` | CASCADE (from `20260204000011_misc.sql`) | 9 | relation "appointments" does not exist |
| 23 | `20260223100000_production_backend_hardening.sql` | CASCADE (from `20260204000011_misc.sql`) | 59 | relation "public.hospitals" does not exist |
| 24 | `20260224000002_feature_flags.sql` | CASCADE (from `20260204000011_misc.sql`) | 14 | relation "hospitals" does not exist |
| 25 | `20260303000001_profiles_rls_anon_deny.sql` | CASCADE (from `20260204000011_misc.sql`) | 26 | relation "public.profiles" does not exist |
| 26 | `20260309000001_fix_broken_rls_policies.sql` | CASCADE (from `20260204000004_pharmacy.sql`) | 21 | relation "public.clinical_interventions" does not exist |
| 27 | `20260309000002_scheduling_rls.sql` | CASCADE (from `20260204000002_scheduling.sql`) | 11 | relation "public.resource_types" does not exist |
| 28 | `20260309000003_pharmacy_lab_portal_rls.sql` | CASCADE (from `20260204000004_pharmacy.sql`) | 13 | relation "public.e_prescriptions" does not exist |
| 29 | `20260309000004_hospital_id_indexes.sql` | CASCADE (from `20260204000008_security_compliance.sql`) | 12 | relation "public.messages" does not exist |
| 30 | `20260309000005_realtime_and_feature_flags_fixes.sql` | CASCADE (from `20260204000005_laboratory.sql`) | 101 | relation "public.critical_value_notifications" does not exist — CONTEXT:  SQL statement "ALTER PUBLICATION supabase_realtime ADD TABLE public.critical_value_notifications" |
| 31 | `20260310000001_add_hpi_columns_to_consultations.sql` | CASCADE (from `20260204000011_misc.sql`) | 7 | relation "public.consultations" does not exist |
| 32 | `20260311000001_workflow_rule_coverage_seed.sql` | CASCADE (from `20260204000011_misc.sql`) | 75 | relation "public.hospitals" does not exist |
| 33 | `20260311000002_workflow_failure_escalation.sql` | ENV | 120 | extension "pg_cron" is not available — DETAIL:  Could not open extension control file "/usr/share/postgresql/16/extension/pg_cron.control": No such file or directory. HINT:  The extension must first be installed on the system where PostgreSQL is running. |
| 34 | `20260311000003_patient_discharge_workflow.sql` | CASCADE (from `20260204000011_misc.sql`) | 17 | relation "public.hospitals" does not exist |
| 35 | `20260311000004_hipaa_encryption_metadata.sql` | CASCADE (from `20260204000011_misc.sql`) | 7 | relation "public.consultations" does not exist |
| 36 | `20260311000005_lab_critical_acknowledgements.sql` | CASCADE (from `20260204000011_misc.sql`) | 32 | relation "public.hospitals" does not exist |
| 37 | `20260311000006_medication_reconciliation_workflow.sql` | CASCADE (from `20260204000011_misc.sql`) | 38 | relation "public.hospitals" does not exist |
| 38 | `20260311000007_rls_hardening.sql` | CASCADE (from `20260204000011_misc.sql`) | 23 | relation "public.profiles" does not exist |
| 39 | `20260313000001_audit_trail_core_infrastructure.sql` | CASCADE (from `20260204000011_misc.sql`) | 58 | relation "public.hospitals" does not exist |
| 40 | `20260313000002_prescription_approval_logging_triggers.sql` | CASCADE (from `20260204000011_misc.sql`) | 86 | relation "public.prescriptions" does not exist |
| 41 | `20260313000003_billing_lab_result_audit_triggers.sql` | CASCADE (from `20260204000003_billing.sql`) | 66 | relation "public.invoices" does not exist |
| 42 | `20260313000004_audit_testing_compliance_utilities.sql` | CASCADE (from `20260313000001_audit_trail_core_infrastructure.sql`) | 191 | relation "public.audit_log" does not exist |
| 43 | `20260325_create_prescription_approval_workflows.sql` | CASCADE (from `20260204000011_misc.sql`) | 38 | relation "hospitals" does not exist |
| 44 | `20260328065831_fix_test_data_and_genders.sql` | CASCADE (from `20260204000001_core_schema.sql`) | 4 | relation "patients" does not exist |
| 45 | `20260331000001_walkin_registration_schema_guard.sql` | CASCADE (from `20260204000001_core_schema.sql`) | 8 | relation "public.patients" does not exist |
| 46 | `20260331000002_core_workflow_schema_guard.sql` | CASCADE (from `20260204000001_core_schema.sql`) | 6 | relation "public.patients" does not exist |
| 47 | `20260331_break_glass_overrides.sql` | CASCADE (from `20260204000011_misc.sql`) | 28 | relation "public.hospitals" does not exist |
| 48 | `20260418045649_4c272308-93d1-4998-8742-bea9eb9b504e.sql` | CASCADE (from `20260204000011_misc.sql`) | 8 | relation "public.hospitals" does not exist |
| 49 | `20260613100405_61e009a4-76d3-4e93-98eb-32d39e7fc36b.sql` | CASCADE (from `20260204000011_misc.sql`) | 11 | relation "public.profiles" does not exist |
| 50 | `20260617000001_tighten_activity_logs_rls.sql` | CASCADE (from `20260204000011_misc.sql`) | 17 | relation "activity_logs" does not exist |
| 51 | `20260622000001_enforce_2fa_for_clinical_roles.sql` | CASCADE (from `20260204000011_misc.sql`) | 16 | relation "public.profiles" does not exist |
| 52 | `20260622000002_prescription_items_hospital_id.sql` | CASCADE (from `20260204000011_misc.sql`) | 13 | relation "public.prescription_items" does not exist |
| 53 | `20260622000003_activity_logs_immutable.sql` | CASCADE (from `20260204000011_misc.sql`) | 30 | relation "public.activity_logs" does not exist |
| 54 | `20260622000004_audit_logs_hospital_id_not_null.sql` | CASCADE (from `20260204000008_security_compliance.sql`) | 16 | relation "public.audit_logs" does not exist |
| 55 | `20260909000001_harden_invoices_and_active_user_rls.sql` | CASCADE (from `20260204000011_misc.sql`) | 24 | relation "public.profiles" does not exist |
| 56 | `20260909000004_discharge_workflow_row_locking.sql` | CASCADE (from `20260311000003_patient_discharge_workflow.sql`) | 54 | type "public.discharge_workflows" does not exist |

### `user_belongs_to_hospital` as defined after replay

- not defined

### Tables in the live types but not produced by replaying the migrations

`activity_logs`, `appointment_requests`, `appointments`, `consultations`, `departments`, `doctor_availability`, `documents`, `hospital_resources`, `hospitals`, `icd10_codes`, `insurance_claims`, `invoice_items`, `invoices`, `lab_orders`, `medical_records`, `medication_administrations`, `medications`, `messages`, `notifications`, `patient_consents`, `patient_prep_checklists`, `patient_queue`, `patients`, `payment_plans`, `payments`, `prescription_items`, `prescription_refill_requests`, `prescriptions`, `profiles`, `purchase_order_items`, `purchase_orders`, `reorder_rules`, `shift_handovers`, `shift_schedules`, `staff_invitations`, `stock_alerts`, `suppliers`, `system_config`, `task_assignments`, `telemedicine_sessions`, `time_slots`, `two_factor_secrets`, `user_roles`, `vital_signs`

### Files the Supabase CLI does not apply

Top-level: `tier3_2_system_metrics_table.sql`, `tier4_1_discharge_workflow.sql`, `tier4_2_4_lab_workflows.sql`, `tier4_3_optimistic_locking.sql`, `tier4_5_drug_interactions.sql`.

Subdirectories: `legacy/` (98 files), `phase5/` (5 files).

### All applied files

| # | File | Result | ms |
|---|---|---|---|
| 1 | `20260204000001_core_schema.sql` | ORDER | 11 |
| 2 | `20260204000002_scheduling.sql` | ORDER | 10 |
| 3 | `20260204000003_billing.sql` | DEFECT | 11 |
| 4 | `20260204000004_pharmacy.sql` | ORDER | 9 |
| 5 | `20260204000005_laboratory.sql` | ORDER | 9 |
| 6 | `20260204000006_telemedicine.sql` | ORDER | 9 |
| 7 | `20260204000007_analytics_ai.sql` | CASCADE | 9 |
| 8 | `20260204000008_security_compliance.sql` | ORDER | 17 |
| 9 | `20260204000009_portal_documents.sql` | ORDER | 11 |
| 10 | `20260204000010_monitoring_ops.sql` | DEFECT | 21 |
| 11 | `20260204000011_misc.sql` | DEFECT | 212 |
| 12 | `20260205000001_accept_staff_invitation.sql` | CASCADE | 10 |
| 13 | `20260205000002_hospital_admin_role.sql` | CASCADE | 9 |
| 14 | `20260205000003_harden_staff_invitation_rls.sql` | ok | 8 |
| 15 | `20260205000004_profiles_rls_hardening.sql` | CASCADE | 7 |
| 16 | `20260205000005_two_factor_encryption.sql` | CASCADE | 7 |
| 17 | `20260205000006_rls_policy_hardening.sql` | CASCADE | 7 |
| 18 | `20260205073146_fix_profiles_rls_exposure.sql` | CASCADE | 7 |
| 19 | `20260209100000_m3_rls_hardening.sql` | ok | 8 |
| 20 | `20260220000001_fix_complete_patient_prep.sql` | ok | 8 |
| 21 | `20260220070446_38d9e7dc-0e8e-4171-b60e-646645c7d87a.sql` | CASCADE | 8 |
| 22 | `20260221000001_normalize_mrn_format.sql` | CASCADE | 7 |
| 23 | `20260222000001_fix_dashboard_stats_rpc.sql` | ok | 8 |
| 24 | `20260223000001_fix_role_self_assignment.sql` | CASCADE | 7 |
| 25 | `20260223000002_activity_logs_partitioning.sql` | CASCADE | 7 |
| 26 | `20260223000003_perf_indexes.sql` | CASCADE | 7 |
| 27 | `20260223043658_95c4822c-ace2-44b7-a0a5-14067c8c528c.sql` | ok | 8 |
| 28 | `20260223100000_production_backend_hardening.sql` | CASCADE | 9 |
| 29 | `20260223113000_patient_record_onboarding_rpc.sql` | ok | 8 |
| 30 | `20260224000001_register_patient_atomic.sql` | ok | 9 |
| 31 | `20260224000002_feature_flags.sql` | CASCADE | 10 |
| 32 | `20260303000001_profiles_rls_anon_deny.sql` | CASCADE | 8 |
| 33 | `20260309000001_fix_broken_rls_policies.sql` | CASCADE | 7 |
| 34 | `20260309000002_scheduling_rls.sql` | CASCADE | 7 |
| 35 | `20260309000003_pharmacy_lab_portal_rls.sql` | CASCADE | 8 |
| 36 | `20260309000004_hospital_id_indexes.sql` | CASCADE | 7 |
| 37 | `20260309000005_realtime_and_feature_flags_fixes.sql` | CASCADE | 10 |
| 38 | `20260310000001_add_hpi_columns_to_consultations.sql` | CASCADE | 7 |
| 39 | `20260311000001_workflow_rule_coverage_seed.sql` | CASCADE | 6 |
| 40 | `20260311000002_workflow_failure_escalation.sql` | ENV | 9 |
| 41 | `20260311000003_patient_discharge_workflow.sql` | CASCADE | 9 |
| 42 | `20260311000004_hipaa_encryption_metadata.sql` | CASCADE | 7 |
| 43 | `20260311000005_lab_critical_acknowledgements.sql` | CASCADE | 8 |
| 44 | `20260311000006_medication_reconciliation_workflow.sql` | CASCADE | 9 |
| 45 | `20260311000007_rls_hardening.sql` | CASCADE | 7 |
| 46 | `20260313000001_audit_trail_core_infrastructure.sql` | CASCADE | 10 |
| 47 | `20260313000002_prescription_approval_logging_triggers.sql` | CASCADE | 8 |
| 48 | `20260313000003_billing_lab_result_audit_triggers.sql` | CASCADE | 9 |
| 49 | `20260313000004_audit_testing_compliance_utilities.sql` | CASCADE | 9 |
| 50 | `20260325_create_prescription_approval_workflows.sql` | CASCADE | 9 |
| 51 | `20260328065831_fix_test_data_and_genders.sql` | CASCADE | 7 |
| 52 | `20260331000001_walkin_registration_schema_guard.sql` | CASCADE | 7 |
| 53 | `20260331000002_core_workflow_schema_guard.sql` | CASCADE | 7 |
| 54 | `20260331_break_glass_overrides.sql` | CASCADE | 9 |
| 55 | `20260418045649_4c272308-93d1-4998-8742-bea9eb9b504e.sql` | CASCADE | 7 |
| 56 | `20260518044514_e6cf9e30-7371-45db-9777-3ae6ff76af00.sql` | ok | 7 |
| 57 | `20260613100405_61e009a4-76d3-4e93-98eb-32d39e7fc36b.sql` | CASCADE | 7 |
| 58 | `20260617000001_tighten_activity_logs_rls.sql` | CASCADE | 6 |
| 59 | `20260622000001_enforce_2fa_for_clinical_roles.sql` | CASCADE | 7 |
| 60 | `20260622000002_prescription_items_hospital_id.sql` | CASCADE | 7 |
| 61 | `20260622000003_activity_logs_immutable.sql` | CASCADE | 8 |
| 62 | `20260622000004_audit_logs_hospital_id_not_null.sql` | CASCADE | 6 |
| 63 | `20260909000001_harden_invoices_and_active_user_rls.sql` | CASCADE | 7 |
| 64 | `20260909000004_discharge_workflow_row_locking.sql` | CASCADE | 7 |
