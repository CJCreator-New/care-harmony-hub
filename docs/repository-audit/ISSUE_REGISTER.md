# Consolidated Issue Register

> CareSync HIMS repository audit, 2026-11-01. Commit `43ab8f7`. This register is the single list of unique issues found by the audit. Nine specialist reviews (frontend security, edge functions, database, clinical workflows, operational workflows, architecture/performance, DevOps/testing, UI/accessibility, and lead verification) were merged and de-duplicated.

## 1. How to read this register

- **IDs** are stable and prefixed by area (`SECF`, `EDGE`, `DB`, `CLIN`, `FUNC`, `ARCH`, `PERF`, `OPS`, `TEST`, `UX`, `A11Y`). Use the ID to find the full record in the linked document.
- **Severity:**
  - **P0 Critical:** immediate action. Active risk of PHI breach, patient harm or irreversible data loss.
  - **P1 High:** significant functional, security or reliability risk.
  - **P2 Medium:** a meaningful quality or usability issue.
  - **P3 Low:** a minor issue.
  - **P4 Informational.**
- **Confidence** separates *confirmed defects* from *likely defects* (deployed state unverified) and *suspected risks*. No live environment was available. Findings that depend on the deployed database are therefore at most "Likely" unless the schema itself makes them certain.
- **Lead adjustments:** FUNC-10 was raised from P1 to P0 (see its row). Every P0 and the highest-impact P1s were re-verified in source by the lead auditor. The verification tables are in SECURITY_AUDIT §3 and DATABASE_AUDIT §2.
- Issues **not** included: items the auditors checked and found mitigated. These are listed in each detailed document under "mitigated / not-an-issue" or the prior-claim tables. Examples: mock auth cannot be enabled in production builds; there is no wildcard CORS in edge functions; `check-low-stock` tenant pinning is fixed.

## 2. Summary counts

- **Findings recorded by auditors:** 229
- **Duplicates consolidated:** 22
- **Unique issues in this register:** **207**

| Severity | Count |
|---|---|
| P0 | 9 |
| P1 | 63 |
| P2 | 89 |
| P3 | 43 |
| P4 | 3 |

| Category | P0 | P1 | P2 | P3 | P4 | Total |
|---|---|---|---|---|---|---|
| Accessibility | 0 | 5 | 6 | 4 | 0 | 15 |
| Architecture | 0 | 2 | 6 | 2 | 0 | 10 |
| Database | 1 | 4 | 2 | 0 | 0 | 7 |
| Functional | 3 | 21 | 28 | 12 | 0 | 64 |
| Infrastructure | 0 | 4 | 5 | 4 | 0 | 13 |
| Performance | 0 | 1 | 5 | 3 | 0 | 9 |
| Product enhancement | 0 | 0 | 0 | 0 | 1 | 1 |
| Security | 5 | 18 | 23 | 7 | 0 | 53 |
| Technical debt | 0 | 1 | 4 | 4 | 2 | 11 |
| Testing | 0 | 5 | 3 | 4 | 0 | 12 |
| UI/UX | 0 | 2 | 7 | 3 | 0 | 12 |
| **Total** | 9 | 63 | 89 | 43 | 3 | 207 |

| Confidence | Meaning | Count |
|---|---|---|
| Confirmed | Seen in code with a reproducible static trace, or executed (compiler, test, build, rendered UI) | 168 |
| Likely | Strong code evidence; runtime behavior or deployed state not verified | 35 |
| Suspected | Plausible risk that needs runtime or environment verification | 4 |

| ID prefix | Area | Detailed in | Unique issues |
|---|---|---|---|
| SECF | Frontend & repository security | [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | 25 |
| EDGE | Edge functions | [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | 28 |
| DB | Database / RLS / migrations | [DATABASE_AUDIT.md](./DATABASE_AUDIT.md) | 20 |
| CLIN | Clinical workflows | [FUNCTIONAL_AUDIT.md](./FUNCTIONAL_AUDIT.md) | 27 |
| FUNC | Operational workflows & routing | [FUNCTIONAL_AUDIT.md](./FUNCTIONAL_AUDIT.md) | 30 |
| ARCH | Architecture & code quality | [MODULE_AUDIT.md](./MODULE_AUDIT.md) | 15 |
| PERF | Performance & reliability | [PERFORMANCE_AUDIT.md](./PERFORMANCE_AUDIT.md) | 9 |
| OPS | CI/CD, infrastructure, operations | [PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md) | 14 |
| TEST | Testing | [TEST_COVERAGE_AUDIT.md](./TEST_COVERAGE_AUDIT.md) | 10 |
| UX | User experience | [UI_UX_AUDIT.md](./UI_UX_AUDIT.md) | 14 |
| A11Y | Accessibility | [UI_UX_AUDIT.md](./UI_UX_AUDIT.md) | 15 |

## 3. Register

Sorted by severity, then by area. Each row is one unique issue. The full record lives in the linked document under the same ID heading, and covers evidence, reproduction, expected vs actual behavior, root cause, impact, recommended solution, effort and acceptance criteria. "Merged" lists duplicate IDs that were folded into the row; their evidence remains in the detail documents. "Roadmap" points to [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md). Effort: S < 1 day, M 1–3 days, L > 3 days (one engineer familiar with the code).

### P0 (9)

| ID | Title | Category | Confidence | Module | Primary location | Effort | Roadmap | Merged |
|---|---|---|---|---|---|---|---|---|
| [EDGE-01](./SECURITY_AUDIT.md) | fhir-integration exposes any tenant's PHI: unscoped exports plus self-grantable `system/*.*` SMART scope | Security | Confirmed | FHIR interoperability | `supabase/functions/fhir-integration/index.ts:475-490, 532-561, 650-…` | S | S0-05 |  |
| [EDGE-02](./SECURITY_AUDIT.md) | backup-manager lets any tenant admin dump every tenant's tables and wipe them platform-wide | Security | Confirmed | Backup / DR | `supabase/functions/backup-manager/index.ts:34, 71-76, 97-100, 159-1…` | M | S0-05 |  |
| [EDGE-03](./SECURITY_AUDIT.md) | Critical lab escalation is non-functional end-to-end (claim CLIN-002 "resolved" is false) | Functional | Confirmed | Laboratory / clinical safety | `supabase/functions/critical-lab-check/index.ts:51, 75-90, 100-134, …` | L | S0-08 | CLIN-10 |
| [DB-01](./DATABASE_AUDIT.md) | Tenant key `profiles.hospital_id` (and `is_active`, 2FA, lockout flags) is self-writable, enabling cross-tenant PHI access | Security | Confirmed | Auth / multi-tenancy (profiles, RLS helper) | `supabase/migrations/20260204000011_misc.sql:274-280` | M | S0-03 | SECF-10 |
| [DB-02](./DATABASE_AUDIT.md) | "Staff" policies check only hospital membership (no role), so patients and deactivated staff keep full PHI access | Security | Confirmed | RLS (patients, appointments, patient_queue, consultations, p | `supabase/migrations/20260204000011_misc.sql:299-309,312-318,361-367…` | L | S0-04 |  |
| [DB-03](./DATABASE_AUDIT.md) | Migration chain is not replayable and the 2026-03..09 hardening migrations fail, so claimed fixes are not deployed | Database | Confirmed | Migrations | `supabase/migrations/20260311000007_rls_hardening.sql:11` | L | S0-01 |  |
| [DB-04](./DATABASE_AUDIT.md) | Anyone can erase the HIPAA audit trail via `purge_old_audit_logs_staging_only()` | Security | Likely | Audit (`public.audit_log`) | `supabase/migrations/20260313000004_audit_testing_compliance_utiliti…` | S | S0-05 |  |
| [CLIN-01](./FUNCTIONAL_AUDIT.md) | Live prescribing CDS is the unfixed legacy matcher, ignores home medications and never fails closed | Functional | Confirmed | Prescribing / order safety (consultation step 4, quick consu | `src/hooks/usePrescriptionSafety.ts:111-135,158` | M | S0-07 |  |
| [FUNC-10](./FUNCTIONAL_AUDIT.md) | Production admin dashboard exposes "Test Data" seed and cleanup; cleanup deletes real hospital data by `hospital_id` (raised from P1) | Functional | Likely | Admin dashboard | `src/components/dashboard/AdminDashboard.tsx:111,146-149` | S | S0-05 |  |

### P1 (63)

| ID | Title | Category | Confidence | Module | Primary location | Effort | Roadmap | Merged |
|---|---|---|---|---|---|---|---|---|
| [SECF-01](./SECURITY_AUDIT.md) | Mandatory 2FA enrolment for admin/doctor is enforced only on 5 non-PHI routes, so every PHI route skips it | Security | Confirmed | Routing / Authentication (2FA) | `src/routes/routeDefinitions.tsx:92-176, 242-259, 426-698` | S | S0-10 |  |
| [SECF-02](./SECURITY_AUDIT.md) | Login-time TOTP check is a UI step after a full session is issued, so it is skippable and fails open | Security | Likely | Authentication / LoginPage | `src/pages/hospital/LoginPage.tsx:65-78, 97-115` | L | S0-10 | FUNC-02 |
| [SECF-03](./SECURITY_AUDIT.md) | OpenAI/Anthropic API keys are read from `VITE_*` env and inlined into the public JS bundle | Security | Confirmed | AI integration | `src/lib/ai/orchestrator.ts:542-560` | M | S0-09 | OPS-16 |
| [SECF-04](./SECURITY_AUDIT.md) | The PWA service worker caches every Supabase GET response (PHI) on disk for 24h, keyed by URL rather than user | Security | Confirmed | PWA / offline | `vite.config.ts:40-65` | S | S0-09 | PERF-02, OPS-14 |
| [SECF-21](./SECURITY_AUDIT.md) | Publicly known shared test credentials (including an admin) are provisioned into whichever Supabase project the scripts target | Security | Suspected | Test tooling / identity | `.env.test:7-28` | S | S0-11 | OPS-17 |
| [EDGE-04](./SECURITY_AUDIT.md) | phi-crypto decryption oracle remains: probe not bound to ciphertext; one global key; no AAD | Security | Confirmed | PHI field encryption | `supabase/functions/phi-crypto/index.ts:32-34, 89-93, 103-110, 167-2…` | M | S1-09 |  |
| [EDGE-05](./SECURITY_AUDIT.md) | 2FA is cosmetic: no server-side enforcement; secret can be (re)enrolled without proof; live hook still uses Math.random | Security | Confirmed | Authentication / 2FA | `supabase/functions/store-2fa-secret/index.ts:8-11, 109-164` | M | S0-10 |  |
| [EDGE-06](./SECURITY_AUDIT.md) | telemedicine trusts body identity and tenant; cross-tenant appointment state changes; forgeable tokens; silent clinical data loss | Security | Confirmed | Telemedicine | `supabase/functions/telemedicine/index.ts:32, 69-100, 114-129, 163-1…` | L | S0-06 |  |
| [EDGE-07](./SECURITY_AUDIT.md) | workflow-automation writes tasks and notifications into the tenant named in `record_data`; any nurse can broadcast as the hospital admin | Security | Confirmed | Workflow automation | `supabase/functions/workflow-automation/index.ts:58-61, 92, 128, 182…` | S | S0-06 |  |
| [EDGE-08](./SECURITY_AUDIT.md) | clinical-pharmacy and lab-automation: cross-tenant DUR disclosure and mass-assignment that can move rows to another tenant | Security | Confirmed | Pharmacy / Laboratory | `supabase/functions/clinical-pharmacy/index.ts:91-99, 109-118, 144-1…` | S | S0-06 |  |
| [EDGE-09](./SECURITY_AUDIT.md) | audit-logger accepts forged audit events and exposes the audit trail to every staff role (globally if hospital is null) | Security | Confirmed | Audit / HIPAA §164.312(b) | `supabase/functions/audit-logger/index.ts:31-32, 75-100, 115-124, 14…` | S | S0-06, S1-05 |  |
| [EDGE-10](./SECURITY_AUDIT.md) | insurance-integration returns hard-coded adjudication and persists fabricated "processed, 80% approved" results | Functional | Confirmed | Billing / insurance | `supabase/functions/insurance-integration/index.ts:67-90, 100-119, 1…` | M | S2-07 |  |
| [DB-05](./DATABASE_AUDIT.md) | SECURITY DEFINER RPCs accept tenant/patient/actor IDs without verifying the caller (cross-tenant read/write) | Security | Likely | RPC layer | `supabase/migrations/20260909000004_discharge_workflow_row_locking.s…` | M | S0-06 |  |
| [DB-07](./DATABASE_AUDIT.md) | ADR-0002 billing boundary not enforced: every hospital member can read/create/update invoices and record payments | Security | Confirmed | Billing (invoices, invoice_items, payments) | `supabase/migrations/20260204000011_misc.sql:827-837,840-863,865-871` | S | S0-04 |  |
| [DB-08](./DATABASE_AUDIT.md) | Audit/activity logging integrity: open insert, cross-tenant admin read, partitions without RLS, parallel audit stores | Security | Confirmed | Audit (activity_logs, audit_logs, audit_log) | `supabase/migrations/20260223000002_activity_logs_partitioning.sql:5…` | M | S1-05 |  |
| [DB-09](./DATABASE_AUDIT.md) | Broad `FOR ALL` hospital-only policies override role restrictions (prescription items, messages, queues) | Security | Confirmed | Pharmacy / messaging / queues | `supabase/migrations/20260622000002_prescription_items_hospital_id.s…` | S | S0-04 |  |
| [DB-10](./DATABASE_AUDIT.md) | Clinical state machines (ADR-0003 discharge, ADR-0004 prescription) are not enforced by the database | Database | Confirmed | Discharge workflow, prescription dispensing | `supabase/migrations/20260311000003_patient_discharge_workflow.sql:7…` | M | S1-02 |  |
| [DB-11](./DATABASE_AUDIT.md) | Migrations mutate and hard-delete production PHI across all tenants | Database | Confirmed | Migrations / data integrity | `supabase/migrations/20260328065831_fix_test_data_and_genders.sql:2-33` | S | S0-05 |  |
| [DB-13](./DATABASE_AUDIT.md) | 35 tables have RLS disabled (several hold PHI); 4 have RLS with zero policies | Security | Confirmed | RLS | `supabase/migrations/20260204000011_misc.sql:2537,2637,2665,2694,272…` | S | S0-04 |  |
| [DB-14](./DATABASE_AUDIT.md) | Schema drift: code references 66 tables and 16 RPCs that do not exist; `types.ts` covers only 44 of 232 tables | Database | Confirmed | Frontend data layer / edge functions | `src/** and supabase/functions/** (.from()/.rpc())` | L | S0-01 |  |
| [DB-15](./DATABASE_AUDIT.md) | Onboarding RPCs are broken at runtime (patient registration, staff invitation, patient role) | Functional | Likely | Auth onboarding | `supabase/migrations/20260224000001_register_patient_atomic.sql:36-58` | S | S1-03 | FUNC-01 |
| [DB-18](./DATABASE_AUDIT.md) | No real backup/restore path; `backup-manager` restore is broken and cross-tenant destructive; DR runbook not executable | Infrastructure | Confirmed | Backup / DR | `supabase/functions/backup-manager/index.ts:23-26,34,97-100,123-126,…` | M | S5-02 | OPS-08 |
| [CLIN-02](./FUNCTIONAL_AUDIT.md) | Mandatory override gate never fires for allergy conflicts, and override rationales are lost | Functional | Confirmed | Prescribing / override audit | `src/pages/consultations/ConsultationWorkflowPage.tsx:466,533,681-714` | S | S0-07 |  |
| [CLIN-03](./FUNCTIONAL_AUDIT.md) | ADR-0004 pharmacist-gated state machine is never persisted or enforced at the data layer | Functional | Confirmed | Prescription Approval Workflow (prescription-dispensing) | `src/modules/prescription-dispensing/PrescriptionDispensingEngine.ts…` | L | S1-01 |  |
| [CLIN-04](./FUNCTIONAL_AUDIT.md) | Inventory decrement on dispense is ineffective for consultation prescriptions and is not atomic | Functional | Confirmed | Pharmacy dispensing / inventory | `src/pages/consultations/ConsultationWorkflowPage.tsx:693-699` | M | S1-01 | PERF-06 |
| [CLIN-05](./FUNCTIONAL_AUDIT.md) | PHI field-encryption round-trip makes saved clinical narratives and medication lines unreadable or lost | Functional | Likely | Consultation persistence, prescription items (cross-cutting) | `src/hooks/useConsultations.ts:222-246,513-533` | M | S1-09 |  |
| [CLIN-06](./FUNCTIONAL_AUDIT.md) | Consultation autosave refetch overwrites local form state (ICD-10 codes, override reason and step position are lost) | Functional | Confirmed | Consultation workflow | `src/pages/consultations/ConsultationWorkflowPage.tsx:176-203,314-34…` | M | S1-09 | PERF-05 |
| [CLIN-07](./FUNCTIONAL_AUDIT.md) | Consultation completion is non-atomic; routine/STAT lab orders fail on the DB enum, and orders are duplicated | Functional | Confirmed | Consultation completion / Lab Order creation | `src/pages/consultations/ConsultationWorkflowPage.tsx:622-633,743-77…` | M | S1-01 |  |
| [CLIN-08](./FUNCTIONAL_AUDIT.md) | NEWS2 shown to the doctor is computed from mismatched keys and reads ≈0/LOW for deteriorating patients | Functional | Confirmed | Vital signs / consultation header, deterioration banner, Pat | `src/pages/consultations/ConsultationWorkflowPage.tsx:137-141,1011-1097` | S | S0-07 |  |
| [CLIN-11](./FUNCTIONAL_AUDIT.md) | Discharge rejection rollback dead-ends, AMA discharge is broken, and the sequential/role guarantees are bypassable | Functional | Confirmed | Discharge Workflow (ADR-0003) | `supabase/functions/discharge-workflow/index.ts:40-50,249-257,386-39…` | M | S1-02 |  |
| [CLIN-26](./FUNCTIONAL_AUDIT.md) | Completing a consultation throws `ReferenceError: queryClient is not defined` after the database update | Functional | Confirmed | Consultations | `src/hooks/useConsultations.ts:611-660 (onSuccess at :654-656)` | S | S0-12 |  |
| [CLIN-27](./FUNCTIONAL_AUDIT.md) | Deep-module hooks build the clinical actor from fields that do not exist (`profile.role`, `user.role`, `user.hospital_id`) | Functional | Confirmed | Prescription dispensing / critical lab escalation / order sa | `src/modules/prescription-dispensing/usePrescriptionDispensing.ts:75-83` | S | S0-12 |  |
| [CLIN-28](./FUNCTIONAL_AUDIT.md) | "Initiate discharge" modal calls `.filter`/`.find` on a paginated object and crashes | Functional | Likely | Discharge pipeline | `src/components/discharge/InitiateDischargeModal.tsx:93-101` | S | S0-12 |  |
| [FUNC-03](./FUNCTIONAL_AUDIT.md) | Hospital signup cannot create the hospital: stale `createHospitalAndProfile` closure returns "Not authenticated" | Functional | Likely | Onboarding (hospital signup) | `src/pages/hospital/SignupPage.tsx:109,189,200-216,223` | S | S1-03 |  |
| [FUNC-04](./FUNCTIONAL_AUDIT.md) | Staff Management lists no staff for anyone onboarded through the app (`profiles.is_staff` is never set) | Functional | Likely | Admin / staff management | `src/pages/settings/StaffManagementPage.tsx:125-129` | S | S1-03 |  |
| [FUNC-05](./FUNCTIONAL_AUDIT.md) | Invoice modal shows discount and 5% GST, but the saved invoice has `tax = 0` and `discount = 0` | Functional | Confirmed | Billing (Front-Desk Billing) | `src/components/billing/CreateInvoiceModal.tsx:54,119-127,179-191,48…` | M | S1-01 |  |
| [FUNC-06](./FUNCTIONAL_AUDIT.md) | Payment recording under-records multi-cash tenders, can leave fully paid invoices "partial", and is non-atomic and race-prone | Functional | Confirmed | Billing / payments | `src/components/billing/EnhancedPaymentModal.tsx:115-147` | M | S1-01 |  |
| [FUNC-08](./FUNCTIONAL_AUDIT.md) | "Unbilled clinical charges" re-imports already-billed items (and non-dispensed prescriptions), auto-selected | Functional | Likely | Billing (charge capture) | `src/hooks/useUnbilledCharges.ts:38-45,70-77,103-110` | L | S1-01 |  |
| [FUNC-11](./FUNCTIONAL_AUDIT.md) | Kiosk self check-in is a mock (3 hardcoded patients; nothing persisted) | Functional | Confirmed | Receptionist / check-in | `src/components/receptionist/CheckInKiosk.tsx:58-83,85-91,98-104` | M | S4-01 |  |
| [FUNC-12](./FUNCTIONAL_AUDIT.md) | Double booking is possible: no doctor-time conflict check, and time slots are never marked booked | Functional | Confirmed | Appointments / scheduling | `src/components/appointments/ScheduleAppointmentModal.tsx:95-97,179-191` | M | S1-04 |  |
| [FUNC-13](./FUNCTIONAL_AUDIT.md) | Patient appointment requests: "Approve" never creates an appointment, and "Auto-approve" queries non-existent columns | Functional | Likely | Patient portal / receptionist | `src/lib/hooks/appointments/useAppointmentRequests.ts:194-204,240-25…` | M | S1-04 |  |
| [FUNC-33](./FUNCTIONAL_AUDIT.md) | Invoice adjustments and refunds are authorized by a hardcoded client-side manager PIN and written directly to `invoices` | Security | Confirmed | Billing / invoice adjustments | `src/components/billing/InvoiceAdjustmentModal.tsx:72-73, 102-118, 1…` | M | S0-09, S1-01 |  |
| [ARCH-01](./MODULE_AUDIT.md) | `npm run type-check` compiles zero files — CI type gate is a no-op | Infrastructure | Confirmed | Build/CI tooling | `package.json:72` | S | S0-12 |  |
| [ARCH-02](./MODULE_AUDIT.md) | Supabase client is type-erased via a tsconfig path remap; generated `types.ts` covers 44 of 196 tables used | Architecture | Confirmed | Data access / `src/integrations/supabase` | `tsconfig.app.json:18-24` | L | S0-01, S2-03 |  |
| [ARCH-04](./MODULE_AUDIT.md) | Live clinical paths bypass the deep modules that the ADRs and clinical tests describe | Architecture | Confirmed | order-safety / prescription-dispensing / consultation prescr | `src/pages/consultations/ConsultationWorkflowPage.tsx:40,463,530` | M | S0-07 |  |
| [ARCH-05](./MODULE_AUDIT.md) | ADR-0004 dispensing audit trail is written to a table that no migration creates; failure is silent | Database | Confirmed | prescription-dispensing (deep module adapter) | `src/modules/prescription-dispensing/adapters/SupabasePrescriptionAd…` | S | S1-01 |  |
| [ARCH-06](./MODULE_AUDIT.md) | Two parallel hook trees (`src/hooks` vs `src/lib/hooks`): 22 same-name pairs; fixes landed in the dead copy (live 2FA still uses `Math.random`) | Technical debt | Confirmed | hooks (patients, appointments, pharmacy, auth) | `src/lib/hooks/auth/useTwoFactorAuth.ts:19-35 (live)` | S | S0-10, S2-02 |  |
| [PERF-01](./PERFORMANCE_AUDIT.md) | Global `fetch` monkey-patch adds `x-correlation-id` to every request, but Edge Function CORS does not allow it — likely breaks all browser `functions.invoke` calls | Performance | Likely | Observability bootstrap / Edge Functions | `src/App.tsx:52` | S | S0-02 |  |
| [OPS-01](./PRODUCTION_READINESS_CHECKLIST.md) | Nothing gates merges to `main` — ruleset targets no branch, all work is pushed directly, CI has been red for 4+ months | Infrastructure | Confirmed | Repository governance / CI | `GitHub ruleset protection (id 17399861)` | S | S1-07 |  |
| [OPS-02](./PRODUCTION_READINESS_CHECKLIST.md) | RLS validation "BLOCKING" gate cannot fail for an RLS reason — script crashes per table, passes on any DB, skips without secrets, and is not even installed | Security | Confirmed | CI security gates / `scripts/validate-rls.ts` | `scripts/validate-rls.ts:15-21, 62-69, 72-76, 89-101, 107-112` | M | S1-07 |  |
| [OPS-03](./PRODUCTION_READINESS_CHECKLIST.md) | Remaining CI gates are neutralised (`continue-on-error`, `\|\| true`, no-op checks, wrong coverage file) | Testing | Confirmed | CI workflows | `.github/workflows/rls-validation.yml:186-207, 132, 235-241, 261-283` | M | S1-07 | SECF-27 |
| [OPS-04](./PRODUCTION_READINESS_CHECKLIST.md) | `deploy-production.yml` does not deploy the application; real production deploy (Lovable) is outside any pipeline | Infrastructure | Confirmed | Release pipeline | `.github/workflows/deploy-production.yml:3-6, 19, 23-29, 30-37, 38-44` | M | S5-01 |  |
| [TEST-01](./TEST_COVERAGE_AUDIT.md) | Default Playwright config loads zero tests — every `npm run test:e2e*` script fails at collection | Testing | Confirmed | tests/e2e | `tests/e2e/comprehensive-workflows.spec.ts:2-3` | S | S1-07 |  |
| [TEST-02](./TEST_COVERAGE_AUDIT.md) | CI unit stage runs only `src/test`; the real clinical-engine, RBAC and module tests never execute in any active pipeline | Testing | Confirmed | package.json scripts / CI | `package.json "test:unit": "vitest run src/test"` | S | S1-07 |  |
| [TEST-03](./TEST_COVERAGE_AUDIT.md) | Large share of the suite is tautological or tests code re-implemented inside the test | Testing | Confirmed | src/test, tests/unit, tests/security, tests/integration, tes | `src/test/doctor-rbac.test.ts:4-42 (and 18 sibling files listed below)` | M | S5-05 |  |
| [TEST-04](./TEST_COVERAGE_AUDIT.md) | Tenant isolation / RLS is never tested against a real database; "RLS" and "integration" tests pass vacuously | Testing | Confirmed | tests/api, tests/security, tests/integration, src/modules/*/ | `tests/api/rls-policies.test.ts:6-71` | L | S1-08 |  |
| [UX-01](./UI_UX_AUDIT.md) | Backend failures display as valid zero or "all clear" clinical data | UI/UX | Confirmed | Dashboards (admin, doctor, nurse, receptionist, pharmacist,  | `src/components/pharmacist/PharmacistDashboard.tsx:44,60,84` | M | S1-06 |  |
| [UX-02](./UI_UX_AUDIT.md) | Destructive and irreversible clinical actions run with one click, without confirmation, reason or undo | UI/UX | Likely | Appointments, Discharge workflow, Receptionist requests, Sta | `src/pages/appointments/AppointmentsPage.tsx:155-157,513-518,555-557` | M | S3-03 |  |
| [A11Y-01](./UI_UX_AUDIT.md) | Brand primary teal fails WCAG contrast everywhere it is used for text or as a text background | Accessibility | Confirmed | Design system / theming | `src/index.css:29-31, src/index.css:107 (--sidebar-primary), src/c…` | S | S3-01 |  |
| [A11Y-02](./UI_UX_AUDIT.md) | Clinical status and severity colours fail contrast (warning 2.1:1, info 2.9:1, success 3.3:1, critical 3.8:1) | Accessibility | Confirmed | Status badges / clinical severity | `src/index.css:76-83, src/components/ui/badge.tsx:15-23, src/compone…` | M | S3-01 |  |
| [A11Y-03](./UI_UX_AUDIT.md) | Hospital login and forgot-password fields have no programmatic labels; password errors are not associated | Accessibility | Confirmed | Auth / LoginPage, ForgotPasswordPage | `src/pages/hospital/LoginPage.tsx:229-236, src/pages/hospital/LoginP…` | S | S3-02 |  |
| [A11Y-04](./UI_UX_AUDIT.md) | The hidden mobile sidebar stays in the tab order; the open drawer gets no focus management | Accessibility | Confirmed | Layout / DashboardLayout | `src/components/layout/DashboardLayout.tsx:209-220, src/components/l…` | S | S3-02 |  |
| [A11Y-06](./UI_UX_AUDIT.md) | Critical lab values and NEWS2 escalations are not announced and do not persist | Accessibility | Likely | Lab critical alerts, NEWS2, nurse predictive alerts | `src/components/lab/CriticalLabAlertBanner.tsx:73-85, src/components…` | M | S0-08 |  |

### P2 (89)

| ID | Title | Category | Confidence | Module | Primary location | Effort | Roadmap | Merged |
|---|---|---|---|---|---|---|---|---|
| [SECF-05](./SECURITY_AUDIT.md) | Logout leaves PHI in the client; idle auto-logoff can leave a live session | Security | Confirmed | AuthContext / session lifecycle | `src/contexts/AuthContext.tsx:296-348` | S | S0-09 | PERF-03 |
| [SECF-06](./SECURITY_AUDIT.md) | PHI is written to localStorage in plaintext and exported or imported as unencrypted JSON | Security | Confirmed | Nurse offline mode | `src/components/nurse/OfflineDataImportExport.tsx:33-49, 83-111 (ren…` | M | S0-09 |  |
| [SECF-07](./SECURITY_AUDIT.md) | Two divergent permission matrices; the guards use the one with an `admin: ['*']` wildcard and alias leaks | Security | Confirmed | RBAC | `src/lib/permissions.ts:5-41, 145-164` | M | S2-01 |  |
| [SECF-09](./SECURITY_AUDIT.md) | The admin onboarding page `/hospital/role-setup`, which creates staff invitations with any role, is open to every authenticated role | Security | Likely | Onboarding / staff invitations | `src/routes/routeDefinitions.tsx:391-398` | S | S0-03 |  |
| [SECF-12](./SECURITY_AUDIT.md) | Sentry scrubbing does not cover user email, `extra` context or URL search terms, and three conflicting `Sentry.init` calls run | Security | Likely | Monitoring / Sentry | `src/main.tsx:73` | S | S2-05 |  |
| [SECF-13](./SECURITY_AUDIT.md) | Password policy is inconsistent; the 12-char HIPAA minimum applies only to the hospital-creator signup | Security | Confirmed | Authentication / password policy | `src/utils/passwordPolicy.ts:20-29` | S | S5-04 |  |
| [SECF-14](./SECURITY_AUDIT.md) | Password change and 2FA disable need no re-authentication; `/hospital/reset-password` accepts any session | Security | Confirmed | Account management | `src/routes/routeDefinitions.tsx:341` | M | S5-04 |  |
| [SECF-15](./SECURITY_AUDIT.md) | No account lockout or brute-force protection in the app; "intrusion detection" cannot see the data it needs | Security | Confirmed | Authentication / security monitoring | `src/contexts/AuthContext.tsx:541-557` | M | S5-04 |  |
| [SECF-17](./SECURITY_AUDIT.md) | CSP permits inline/eval; nginx drops security headers on static assets; `deploy-prod.sh` serves via `vite preview` with no headers | Infrastructure | Confirmed | Hosting / headers | `nginx.conf:16-21, 30-33, 41-45` | S | S5-03 | OPS-15 |
| [SECF-18](./SECURITY_AUDIT.md) | PostgREST filter strings are built from raw input at several sites; the local drug-contraindication check fails open on malformed names | Security | Likely | Data access / order safety | `src/modules/order-safety/adapters/SupabaseAdapters.ts:50-57, 71-73` | S | S5-04 |  |
| [SECF-19](./SECURITY_AUDIT.md) | Kong gateway config commits static consumer API keys, a Loggly token and wildcard credentialed CORS; dev compose hardcodes JWT/encryption secrets | Security | Confirmed | API gateway / repo secrets | `kong.yml:159-165, 170-181 (and 190-195, 204-209), 303-306` | S | S0-11, S2-06 |  |
| [SECF-20](./SECURITY_AUDIT.md) | Git history still contains `.env`/`.env.kong` with project identifiers, a former PHI encryption key and an API key | Security | Confirmed | Repository hygiene | `commits df8831e (2026-04-01) and ff2ea46 (2026-04-18) add .env an…` | M | S0-11 |  |
| [SECF-24](./SECURITY_AUDIT.md) | Telemedicine recordings go to a bucket with no migration-defined policies, under a path not scoped to the hospital, with overwrite enabled | Security | Suspected | Telemedicine | `src/components/telemedicine/VideoCallModal.tsx:136-141, 219-235` | S | S2-08 |  |
| [EDGE-11](./SECURITY_AUDIT.md) | Rate limiting is ineffective: per-isolate memory, one shared bucket for all users, `{limit}` typo, header-rotation bypass | Security | Confirmed | _shared/rateLimit.ts | `supabase/functions/_shared/rateLimit.ts:7, 29-33, 35-41` | M | S2-07 |  |
| [EDGE-12](./SECURITY_AUDIT.md) | generate-2fa-secret emits base64url, not RFC 4648 base32: authenticator apps, `verify-2fa` and `verify-totp` disagree | Functional | Confirmed | 2FA setup | `supabase/functions/generate-2fa-secret/index.ts:91-99, 102-108` | S | S0-10 |  |
| [EDGE-13](./SECURITY_AUDIT.md) | Residual BOLA through body-supplied patient and doctor ids in "fixed" functions | Security | Confirmed | Multiple | `supabase/functions/drug-interaction-check/index.ts:235-240 (prescri…` | M | S0-06 |  |
| [EDGE-14](./SECURITY_AUDIT.md) | Fail-open tenant checks when `actor.hospitalId` is null; roles not tenant-scoped; role list disclosed | Security | Confirmed | _shared/authorize.ts and callers | `supabase/functions/_shared/authorize.ts:54-57, 78-81, 89` | S | S0-06 |  |
| [EDGE-15](./SECURITY_AUDIT.md) | Platform-scope jobs are callable by any tenant user; reminders never reach patients; monitoring metrics are hard-coded | Architecture | Confirmed | Scheduling / ops | `supabase/functions/appointment-reminders/index.ts:36, 55-71, 100-12…` | M | S2-07 |  |
| [EDGE-16](./SECURITY_AUDIT.md) | send-email and send-notification are an authenticated open relay with HTML injection and unaudited PHI egress | Security | Confirmed | Notifications | `supabase/functions/send-email/index.ts:8-14, 23, 49-62, 66-75` | M | S0-06 |  |
| [EDGE-17](./SECURITY_AUDIT.md) | lab-result-notify reports fake delivery, fails open on criticality, and logs PHI | Functional | Confirmed | Laboratory notifications | `supabase/functions/lab-result-notify/index.ts:136-157, 189-204, 219…` | M | S2-05, S2-07 |  |
| [EDGE-18](./SECURITY_AUDIT.md) | ai-clinical-support cannot boot; predict-deterioration throws exactly when the patient is critical | Functional | Confirmed | Clinical decision support | `supabase/functions/ai-clinical-support/index.ts:4, 32-33, 67-73, 13…` | S | S2-07 |  |
| [EDGE-19](./SECURITY_AUDIT.md) | pediatric-dosing never caps the prescribed dose at the absolute maximum (adolescent overdose passes as valid) | Functional | Confirmed | Pharmacy CDS | `supabase/functions/pediatric-dosing/index.ts:16, 51-60, 172-189, 221` | S | S1-09 |  |
| [EDGE-20](./SECURITY_AUDIT.md) | Frontend ↔ edge contract drift: 18 missing functions, broken payloads, 12 uncalled deployed functions | Architecture | Confirmed | Integration | `see §2. Payload mismatches:` | M | S2-03 |  |
| [EDGE-21](./SECURITY_AUDIT.md) | Error responses leak internals; PHI and contact data reach logs; shared sanitizers are unused | Security | Confirmed | Multiple | `critical-lab-check/index.ts:83, 110, 213, 269` | S | S2-05 |  |
| [DB-06](./DATABASE_AUDIT.md) | SECURITY DEFINER hygiene: 46/75 lack `search_path`; audit-forgery helpers are publicly executable | Security | Confirmed | RPC layer / audit | `supabase/migrations/20260313000001_audit_trail_core_infrastructure.…` | M | S1-05 |  |
| [DB-12](./DATABASE_AUDIT.md) | Integrity gaps: destructive cascades, no soft-delete, missing CHECKs, constraint that blocks repeat visits | Database | Confirmed | Schema | `supabase/migrations/20260204000011_misc.sql:58-87,114-120,182-198,6…` | M | S2-08 |  |
| [DB-16](./DATABASE_AUDIT.md) | Dead or mis-keyed policies give a false sense of protection | Technical debt | Confirmed | RLS | `supabase/migrations/20260204000011_misc.sql:5721-5734,5990-6000 (67…` | M | S0-04 |  |
| [DB-17](./DATABASE_AUDIT.md) | Storage `documents` bucket: any hospital member can read/overwrite/delete any PHI document | Security | Confirmed | Storage | `supabase/migrations/20260204000011_misc.sql:2135-2180,2232-2285` | S | S2-08 |  |
| [CLIN-09](./FUNCTIONAL_AUDIT.md) | Mixed and unlabelled vital units between nurse and doctor screens | Functional | Confirmed | Vitals / consultation | `src/components/consultations/steps/ChiefComplaintStep.tsx:35-49,108…` | S | S1-09 |  |
| [CLIN-12](./FUNCTIONAL_AUDIT.md) | NEWS2 inputs are incomplete (no ACVPU "C", no supplemental-O2 capture, no SpO2 Scale 2; missing values score 0) | Functional | Confirmed | Vital signs (module and nurse capture) | `src/modules/vital-signs/types.ts:10` | M | S1-09 |  |
| [CLIN-13](./FUNCTIONAL_AUDIT.md) | eMAR has no dose schedule or double-administration guard, and BCMA can be satisfied by a "Simulate Scanner Scan" button | Functional | Confirmed | Nurse medication administration | `src/pages/nurse/NurseMedicationsPage.tsx:72-83,86-142,160-186,307-308` | L | S1-09 |  |
| [CLIN-14](./FUNCTIONAL_AUDIT.md) | Nurse-intake allergies and home medications never reach the CDS; prep failure paths can drop vitals and alerts silently | Functional | Confirmed | Nurse intake → doctor / CDS | `src/components/nurse/PatientPrepModal.tsx:150-215` | M | S0-07 |  |
| [CLIN-15](./FUNCTIONAL_AUDIT.md) | Four divergent pediatric dosing engines, none on the live prescribing path, with frequency arithmetic errors | Functional | Confirmed | order-safety / pediatric dosing | `src/modules/order-safety/core/pediatricEngine.ts:150-160,183-185,22…` | M | S1-09 |  |
| [CLIN-16](./FUNCTIONAL_AUDIT.md) | Lab reference and critical ranges ignore age and sex, and the keyword panel matcher picks wrong panels | Functional | Confirmed | critical-lab-escalation / Structured Result Entry | `src/modules/critical-lab-escalation/core/labPanels.ts:55-62,100-106…` | M | S1-09 |  |
| [CLIN-17](./FUNCTIONAL_AUDIT.md) | Lab order lifecycle — specimen rejection violates the status CHECK; sample tracking is disconnected from orders | Functional | Confirmed | Lab Order lifecycle / sample tracking | `src/pages/laboratory/LaboratoryPage.tsx:317-366` | S | S1-02 |  |
| [CLIN-18](./FUNCTIONAL_AUDIT.md) | AI clinical support is simulated (keyword rules, fixed or random confidences) and feeds directly into the record | Functional | Confirmed | AI clinical support | `src/components/consultations/AIConsultationAssistant.tsx:27-90,165` | S | S4-01 |  |
| [CLIN-19](./FUNCTIONAL_AUDIT.md) | Consultation completion over-reaches — future appointments and other queue entries are closed | Functional | Confirmed | Consultation ↔ Patient Queue / appointments | `src/pages/consultations/ConsultationWorkflowPage.tsx:636-649` | S | S1-01 | ARCH-10 |
| [CLIN-20](./FUNCTIONAL_AUDIT.md) | Prescription amendment always fails, and its design would orphan the order | Functional | Confirmed | Clinical amendments (prescriptions) | `src/components/audit/AmendmentModal.tsx:112-122` | S | S1-02 |  |
| [CLIN-21](./FUNCTIONAL_AUDIT.md) | Telehealth: session notes and prescriptions are never persisted; the issuance component is unmounted and has no backend | Functional | Confirmed | Telemedicine | `src/components/telemedicine/SessionNotes.tsx:21,41-42` | M | S1-09 |  |
| [CLIN-29](./FUNCTIONAL_AUDIT.md) | Nurse dashboard opens the medication administration modal without the prescription, patient or administer handler | Functional | Likely | Nursing / eMAR | `src/components/dashboard/NurseDashboard.tsx:281-284` | S | S0-12 |  |
| [FUNC-07](./FUNCTIONAL_AUDIT.md) | Invoice numbers are not guaranteed unique, and invoice creation is non-atomic | Database | Confirmed | Billing | `supabase/migrations/20260204000011_misc.sql:874-889 (active definit…` | S | S1-01 |  |
| [FUNC-09](./FUNCTIONAL_AUDIT.md) | Insurance claim "submission" and "status" are simulated, and the edge function writes columns that do not exist | Functional | Likely | Billing / insurance claims | `src/hooks/useInsuranceClaims.ts:53-75,202-240,250-270` | L | S4-01 |  |
| [FUNC-14](./FUNCTIONAL_AUDIT.md) | Slot generation uses the wrong weekday in timezones west of UTC (`new Date('YYYY-MM-DD').getDay()`) | Functional | Confirmed | Scheduling (doctor availability) | `src/lib/hooks/appointments/useDoctorAvailability.ts:197-206` | S | S1-04 |  |
| [FUNC-15](./FUNCTIONAL_AUDIT.md) | No-show handling is inverted; cancel has no confirmation; reschedule is not implemented | Functional | Confirmed | Appointments (receptionist) | `src/pages/appointments/AppointmentsPage.tsx:155-161,503-528,550-563` | M | S1-04 |  |
| [FUNC-16](./FUNCTIONAL_AUDIT.md) | Check-in is non-atomic (appointment marked `checked_in` before the queue insert) and uses a UTC "today" window | Functional | Likely | Receptionist / Patient Queue | `src/lib/hooks/appointments/useAppointments.ts:369-427` | S | S1-01 |  |
| [FUNC-17](./FUNCTIONAL_AUDIT.md) | Admin `/settings/audit-logs` and `/settings/health` crash on render (`hasPermission` is not returned by `usePermissions`) | Functional | Confirmed | Admin / audit, system health | `src/pages/admin/AuditLogViewer.tsx:1,64-67` | S | S0-12 |  |
| [FUNC-18](./FUNCTIONAL_AUDIT.md) | Admin, monitoring, and workflow dashboards display hardcoded or simulated figures as live data | Functional | Confirmed | Admin / analytics / workflow dashboards | `src/components/monitoring/MonitoringDashboard.tsx:75-84,146-160` | M | S4-01 |  |
| [FUNC-19](./FUNCTIONAL_AUDIT.md) | Navigation gaps: 10 orphan routes, 7 broken in-app link targets, 10 dead pages, and stub routes reachable by redirect | UI/UX | Confirmed | Routing & navigation | `src/config/routeManifest.ts (no entries for /suppliers, /scheduling…` | S | S3-04 |  |
| [FUNC-20](./FUNCTIONAL_AUDIT.md) | Role and guard mismatches between manifest, route guard, and sidebar; messaging excludes receptionists and staff-to-staff contact | Functional | Confirmed | Routing / RBAC / messaging | `src/components/layout/GroupedSidebar.tsx:72-88` | M | S2-01 |  |
| [FUNC-21](./FUNCTIONAL_AUDIT.md) | Staff invitation flow: no email is sent although the UI says "sent"; the onboarding wizard fails on an FK; status uniqueness blocks re-invites | Functional | Confirmed | Onboarding / staff invitation | `src/hooks/useStaffInvitations.ts:82-101,103-112,205-224` | M | S1-03 |  |
| [FUNC-22](./FUNCTIONAL_AUDIT.md) | Receiving a purchase order does not update inventory stock or `received_quantity` | Functional | Confirmed | Inventory & suppliers | `src/hooks/useSuppliers.ts:232-251` | M | S4-01 |  |
| [FUNC-24](./FUNCTIONAL_AUDIT.md) | Telemedicine uses real WebRTC but is STUN-only with a one-shot offer; the doctor UI shows "connected" before the patient answers | Functional | Suspected | Telemedicine | `src/components/telemedicine/VideoCallModal.tsx:379-383,421-468` | M | S4-01 |  |
| [FUNC-25](./FUNCTIONAL_AUDIT.md) | Consultation completion tries to create an invoice as the doctor, which the `billing:write` check rejects (Billing Boundary conflict) | Functional | Likely | Billing hand-off from consultation | `src/pages/consultations/ConsultationWorkflowPage.tsx:781-826` | S | S1-01 |  |
| [ARCH-03](./MODULE_AUDIT.md) | 34 live files (14,443 LOC) run under `@ts-nocheck`, incl. the consultation, dispensing, RBAC and audit paths; lint rules that would catch it are disabled | Technical debt | Confirmed | Cross-cutting (type safety) | `src/pages/consultations/ConsultationWorkflowPage.tsx:1` | L | S2-03 | CLIN-24 |
| [ARCH-07](./MODULE_AUDIT.md) | 377 unreachable source files (90.8 k LOC) and 52 test files that test unreachable code — incl. the ADR-0005 fail-closed tests | Technical debt | Confirmed | Repository-wide | `src/services/{blockchainAuditService,iotIntegration,enterpriseScali…` | M | S2-02 | FUNC-31 |
| [ARCH-09](./MODULE_AUDIT.md) | God components/hooks — 34 live files > 600 lines mixing UI, orchestration, persistence and side-effects | Architecture | Confirmed | consultations, laboratory, auth, AI, patient portal, telemed | `src/pages/consultations/ConsultationWorkflowPage.tsx (1,412)` | L | S2-04 |  |
| [ARCH-11](./MODULE_AUDIT.md) | Dependency cycles through the `AuthContext` ↔ `lib/hooks/auth` barrel; boundary lint covers ~10 % of `src` | Architecture | Confirmed | auth / lint tooling | `src/contexts/AuthContext.tsx:17` | S | S2-04 |  |
| [ARCH-12](./MODULE_AUDIT.md) | No data-access layer — 61 live pages/components talk to Supabase directly (145 call sites) | Architecture | Confirmed | UI layer | `e.g. src/pages/consultations/ConsultationWorkflowPage.tsx:637-652,888` | L | S2-03 |  |
| [PERF-07](./PERFORMANCE_AUDIT.md) | 201 unbounded live selects; dashboards aggregate client-side and are silently truncated at PostgREST's 1,000-row cap | Performance | Confirmed | Dashboards / stats hooks | `src/hooks/usePharmacyLabStats.ts:25-50,126-170` | M | S3-05 |  |
| [PERF-08](./PERFORMANCE_AUDIT.md) | N+1 request patterns — per-row patient fetch + per-field PHI decrypt edge calls; sequential mutation loops | Performance | Likely | Laboratory, Patients, Consultations, Workflow | `src/pages/laboratory/LaboratoryPage.tsx:130-133,741` | M | S3-05 |  |
| [PERF-09](./PERFORMANCE_AUDIT.md) | App shell and realtime subscriptions are torn down and rebuilt on every navigation; shared static channel topics | Performance | Likely | Layout / Realtime | `src/components/layout/DashboardLayout.tsx:74-96,321` | M | S3-05 |  |
| [PERF-10](./PERFORMANCE_AUDIT.md) | Background polling for every user — root-mounted admin metrics hook, no-op 5 s intervals, polling on top of realtime | Performance | Confirmed | App shell / hooks | `src/App.tsx:117` | S | S3-05 |  |
| [PERF-11](./PERFORMANCE_AUDIT.md) | Bundle/chunk strategy risks (needs the lead's build stats to confirm) | Performance | Suspected | Build config | `vite.config.ts:41,84-143` | S | S3-05 |  |
| [PERF-12](./PERFORMANCE_AUDIT.md) | Overlapping observability stacks — Sentry initialised up to 3× with divergent configs; prod logs go to a non-existent `/api/logs`; telemetry is a stub | Architecture | Confirmed | src/bootstrap, src/lib/monitoring, src/utils/{logger,errorTr | `src/main.tsx:6,73,101-121` | M | S2-05 |  |
| [OPS-05](./PRODUCTION_READINESS_CHECKLIST.md) | Container/K8s artefacts are broken and contradict ADR-0001 (Supabase-native SPA) | Infrastructure | Confirmed | Dockerfile / docker/kubernetes / .deployment/kubernetes | `Dockerfile:3, 12, 21, 28-29, 50` | M | S2-06 |  |
| [OPS-06](./PRODUCTION_READINESS_CHECKLIST.md) | Compose files commit default credentials and expose Kong Admin API / Grafana / Postgres on all interfaces | Security | Confirmed | docker-compose*.yml | `docker-compose.yml:10, 19, 21, 49, 73, 92, 95-96, 113, 118-119, 194…` | S | S0-11, S2-06 |  |
| [OPS-07](./PRODUCTION_READINESS_CHECKLIST.md) | Deploy / rollback / backup scripts referenced by package.json and docs are missing or non-functional | Infrastructure | Confirmed | scripts, deploy-prod.sh, rollback.sh, deploy.bat, validate-s | `package.json scripts deploy:staging, deploy:production, backup…` | S | S5-01 |  |
| [OPS-09](./PRODUCTION_READINESS_CHECKLIST.md) | Monitoring/alerting stack is not wired to anything that runs in production | Infrastructure | Confirmed | monitoring/**, src/services/metrics.ts | `monitoring/prometheus.yml:5-6, 15-104` | L | S5-03 |  |
| [OPS-10](./PRODUCTION_READINESS_CHECKLIST.md) | Node.js runtime is unpinned and inconsistent; CI/Docker use EOL Node 18/20 while deps require ≥20.19/22.12 | Infrastructure | Confirmed | CI / Docker / package.json | `package.json (no engines, no .nvmrc)` | S | S5-01 |  |
| [OPS-12](./PRODUCTION_READINESS_CHECKLIST.md) | Supply-chain hygiene — unpinned `@master` actions, deprecated actions, no least-privilege `permissions:` | Security | Confirmed | .github/workflows | `ci-pipeline.yml:104` | S | S5-01 |  |
| [OPS-13](./PRODUCTION_READINESS_CHECKLIST.md) | Service-role key exposed to PR-triggered code; CI build uses wrong env names | Security | Likely | ci-pipeline.yml / rls-validation.yml | `.github/workflows/ci-pipeline.yml:3-7, 95-96, 117-122, 183-187` | S | S5-01 |  |
| [OPS-19](./PRODUCTION_READINESS_CHECKLIST.md) | 42 known-vulnerable dependency versions, including runtime packages (critical DOMPurify via jsPDF, React Router open redirect) | Security | Confirmed | Dependencies | `package.json` | M | S1-07 |  |
| [TEST-05](./TEST_COVERAGE_AUDIT.md) | Edge functions (45) have no working tests; the only test file breaks `npm test` | Testing | Confirmed | supabase/functions | `supabase/functions/workflow-automation/index.test.ts:1` | M | S1-08 | EDGE-28 |
| [TEST-06](./TEST_COVERAGE_AUDIT.md) | E2E suites are low-fidelity — mock auth, mocked APIs, assertion-free "checks", fixed sleeps; production code contains test seams | Testing | Confirmed | tests/e2e, playwright configs, src/hooks/useStaffInvitations | `playwright.config.ts:62-70` | L | S5-05 |  |
| [TEST-10](./TEST_COVERAGE_AUDIT.md) | `npm test` is red: 39 failing tests in 20 files, including source-string "security" tests broken by reformatting | Testing | Confirmed | Test suite | `tests/security/discharge-workflow-scoping.test.ts:17-33` | M | S1-07 |  |
| [UX-03](./UI_UX_AUDIT.md) | Calendar "Reschedule", "Cancel" and "Edit" buttons do nothing | Functional | Likely | Receptionist / AppointmentCalendarView | `src/components/receptionist/AppointmentCalendarView.tsx:43-70, 321-323` | S | S3-03 |  |
| [UX-04](./UI_UX_AUDIT.md) | Sidebar renders every item as an identical bright teal pill; the active page is indistinguishable | UI/UX | Confirmed | Layout / GroupedSidebar + Button | `src/components/layout/GroupedSidebar.tsx:207-208, 224-228` | S | S3-01 |  |
| [UX-05](./UI_UX_AUDIT.md) | Auth errors show raw technical text twice; forgot-password failure is a disappearing toast only | UI/UX | Confirmed | Auth | `src/pages/hospital/LoginPage.tsx:79-86,126-130` | S | S3-03 |  |
| [UX-06](./UI_UX_AUDIT.md) | Mojibake in the login password placeholder ("â€¢â€¢â€¢…") | UI/UX | Confirmed | Auth / LoginPage | `src/pages/hospital/LoginPage.tsx:265 (also lines 22, 33, 36, 61: co…` | S | S3-03 |  |
| [UX-07](./UI_UX_AUDIT.md) | Horizontal overflow at 390px on key dashboards and portal | UI/UX | Confirmed | Admin/Doctor dashboards, Billing, Patient portal | `admin and doctor dashboard grids (lg:col-span-2 space-y-6 sibling…` | S | S3-04 |  |
| [UX-08](./UI_UX_AUDIT.md) | Design-system drift: 3,677 hard-coded palette classes, three conflicting primary definitions, and global heading styles leaking into components | Technical debt | Confirmed | Design system | `src/index.css:29` | L | S3-01 |  |
| [UX-10](./UI_UX_AUDIT.md) | Forms are inconsistent: 131 of 146 input-bearing files use ad-hoc state; required marking is inconsistent | UI/UX | Likely | Forms across clinical modules | `src/components/** and src/pages/** (21 files use useForm/zodReso…` | L | S3-04 |  |
| [UX-11](./UI_UX_AUDIT.md) | Session-timeout warning is a 10-second toast; expiry logs the user out without protecting unsaved work | UI/UX | Likely | Auth / session | `src/lib/hooks/auth/useSessionTimeout.ts:29-43 (duplicated in src/ho…` | M | S3-03 |  |
| [A11Y-05](./UI_UX_AUDIT.md) | Sidebar nav nests a `<button>` inside each `<a>`, doubling tab stops | Accessibility | Confirmed | Layout / GroupedSidebar | `src/components/layout/GroupedSidebar.tsx:222-240, src/components/la…` | S | S3-02 |  |
| [A11Y-07](./UI_UX_AUDIT.md) | Icon-only buttons and tabs without accessible names (29 in source; 40 failing nodes in axe) | Accessibility | Confirmed | Cross-cutting (telemedicine, nurse handover, documents, admi | `src/components/telemedicine/VideoCallModal.tsx:631,731,740` | S | S3-02 |  |
| [A11Y-08](./UI_UX_AUDIT.md) | 57 click handlers on non-interactive elements, including the medication "5 Rights" checklist and patient pickers | Accessibility | Likely | Nurse MAR, lab and imaging ordering, scheduling, billing, re | `src/components/nurse/MedicationAdministrationModal.tsx:354,368 (and…` | M | S3-02 |  |
| [A11Y-09](./UI_UX_AUDIT.md) | Custom modals without dialog semantics or focus trap; 56 Dialog files lack descriptions | Accessibility | Likely | Nurse patient prep (NEWS2), appointment recurrence, workflow | `src/components/nurse/PatientPrepModal.tsx:240-254, src/components/f…` | S | S3-02 |  |
| [A11Y-10](./UI_UX_AUDIT.md) | Unlabelled selects and comboboxes (appointments filter, nurse MAR, patient registration) | Accessibility | Confirmed | Appointments, Nurse medications, Patient self-registration | `src/pages/appointments/AppointmentsPage.tsx (status/date filter .s…` | S | S3-02 |  |
| [A11Y-11](./UI_UX_AUDIT.md) | Login and Signup hero panels render white text on a near-white background | Accessibility | Confirmed | Auth pages (desktop ≥1024px, light theme) | `src/index.css:190-192 vs src/index.css:220-223` | S | S3-01 |  |

### P3 (43)

| ID | Title | Category | Confidence | Module | Primary location | Effort | Roadmap | Merged |
|---|---|---|---|---|---|---|---|---|
| [SECF-08](./SECURITY_AUDIT.md) | `PharmacistRBACManager` grants the pharmacist role to a magic user ID and uses substring permission matching | Security | Confirmed | RBAC / pharmacy | `src/utils/pharmacistRBACManager.ts:27-61` | S | S2-01 |  |
| [SECF-11](./SECURITY_AUDIT.md) | Plaintext "security question" answer is collected, stored hospital-readable, and never used | Security | Confirmed | Patient registration | `src/pages/patient/PatientRegisterPage.tsx:182-185` | S | S0-03 | DB-22 |
| [SECF-16](./SECURITY_AUDIT.md) | Several "security" modules are dead code or client-only theater | Technical debt | Confirmed | src/lib/security, src/utils | `src/lib/security/headers.ts:1-24` | S | S2-02 |  |
| [SECF-22](./SECURITY_AUDIT.md) | Mock and test-mode code paths remain in production code | Security | Confirmed | Staff invitations / field encryption | `src/hooks/useStaffInvitations.ts:82-101` | S | S2-02 | UX-15 |
| [SECF-23](./SECURITY_AUDIT.md) | Session tokens in sessionStorage are still XSS-readable, and the type-checker resolves a different Supabase client (localStorage) than runtime | Security | Confirmed | Supabase client | `src/integrations/supabase/client.ts:69-160` | S | S5-04 |  |
| [SECF-25](./SECURITY_AUDIT.md) | Report "export to PDF" writes unescaped hospital name into a same-origin popup via `document.write` | Security | Confirmed | Reports | `src/utils/reportExport.ts:72, 94, 160-167` | S | S5-04 |  |
| [SECF-26](./SECURITY_AUDIT.md) | Automatic logoff is client-only and per tab; server session lifetime is not codified | Security | Confirmed | Session management | `src/lib/hooks/auth/useSessionTimeout.ts:4-71` | S | S5-04 |  |
| [EDGE-22](./SECURITY_AUDIT.md) | Nested `phase5/*` functions are not deployable, and their code has BOLA (prescriber identity from body) | Architecture | Confirmed | Phase 5 scheduling and telehealth | `supabase/functions/phase5/issue-telehealth-prescription/index.ts:33…` | M | S0-06 |  |
| [EDGE-23](./SECURITY_AUDIT.md) | validate-invitation-token returns 500 for every invalid token (`.catch` on a PostgREST builder); invitation flow otherwise sound | Functional | Confirmed | Staff onboarding | `supabase/functions/validate-invitation-token/index.ts:87-94, 126-133` | S | S1-03 |  |
| [EDGE-24](./SECURITY_AUDIT.md) | create-hospital-admin needs an existing admin, so self-service tenant onboarding is a dead end; admins can silently re-home themselves | Functional | Likely | Tenant onboarding | `supabase/functions/create-hospital-admin/index.ts:27-28, 77-90` | S | S1-03 |  |
| [EDGE-25](./SECURITY_AUDIT.md) | verify-backup-code allows double-spend under concurrency; backup-code material is weak and client-chosen | Security | Confirmed | 2FA recovery | `supabase/functions/verify-backup-code/index.ts:88-92, 101-111, 132-147` | S | S0-10 |  |
| [EDGE-26](./SECURITY_AUDIT.md) | CORS and gateway configuration gaps: localhost default allowlist, CORS-less auth errors, fixed module-level headers, 28 functions missing from config.toml | Infrastructure | Confirmed | _shared/cors.ts, config.toml | `supabase/functions/_shared/cors.ts:1-6, 28-32, 49` | S | S2-07 |  |
| [EDGE-27](./SECURITY_AUDIT.md) | Unpinned and inconsistent remote imports; lockfile does not cover the dependency graph | Infrastructure | Confirmed | Build / supply chain | `28 imports of https://esm.sh/@supabase/supabase-js@2 (for example…` | S | S2-07 |  |
| [EDGE-29](./SECURITY_AUDIT.md) | drug-interaction-check falls back to the retired RxNav interaction API, so every unmatched check returns "unknown / manual review" | Functional | Likely | Pharmacy CDS | `supabase/functions/drug-interaction-check/index.ts:20, 97-114, 371-390` | M | S2-07 |  |
| [DB-20](./DATABASE_AUDIT.md) | RLS performance: per-row `auth.uid()`, non-inlinable helpers, stacked permissive policies, missing indexes | Performance | Likely | RLS / indexing | `final policy set (521 policies)` | M | S2-08 |  |
| [DB-21](./DATABASE_AUDIT.md) | Migration hygiene: unapplied files, non-standard versions, explicit transactions, DRAFT and test data in the applied path, ineffective validators | Technical debt | Confirmed | Migrations / tooling | `supabase/migrations/tier3_2_system_metrics_table.sql, tier4_1_disch…` | M | S0-01 |  |
| [CLIN-22](./FUNCTIONAL_AUDIT.md) | The "immutable signed addendum" on a finalized consultation is a mutable append to `clinical_notes` | Functional | Confirmed | Clinical notes / addenda | `src/pages/consultations/ConsultationWorkflowPage.tsx:359-406,1232-1…` | S | S4-01 |  |
| [CLIN-23](./FUNCTIONAL_AUDIT.md) | ICD-10 catalogue is a 69-code seed; search breaks on punctuation | Functional | Confirmed | Diagnosis coding | `supabase/migrations/20260204000011_misc.sql:2381-2516` | M | S4-01 |  |
| [CLIN-25](./FUNCTIONAL_AUDIT.md) | UTC "today" and date-only parsing in clinical time logic | Functional | Confirmed | eMAR, lab stats, consultation seeding, on-call lookup | `src/pages/nurse/NurseMedicationsPage.tsx:308` | S | S1-04 |  |
| [FUNC-23](./FUNCTIONAL_AUDIT.md) | Recurring appointments are not implemented (UI is dead code), and `recurrence.utils` has DST/calendar and conflict-detection defects | Functional | Confirmed | Scheduling / recurrence | `src/lib/recurrence.utils.ts:44-58,85-93,101-111` | M | S4-01 |  |
| [FUNC-26](./FUNCTIONAL_AUDIT.md) | Profile and settings gaps: Change Password does nothing, no profile edit, 2FA can be disabled by mandatory roles, and the post-reset redirect bounces | Functional | Confirmed | Profile / settings / auth | `src/pages/settings/UserProfilePage.tsx:21-28,47-56,190-192` | S | S4-01 |  |
| [FUNC-27](./FUNCTIONAL_AUDIT.md) | Staff patient registration has no duplicate-patient detection or DOB plausibility check; three registration implementations; shared zod schemas unused | Functional | Confirmed | Receptionist / patient registration | `src/components/patients/PatientRegistrationModal.tsx:39-62,170-222` | M | S4-01 |  |
| [FUNC-28](./FUNCTIONAL_AUDIT.md) | Reports revenue is attributed by invoice creation date and silently capped by PostgREST row limits; legacy report and analytics engines are dead and broken | Functional | Likely | Reports / analytics | `src/hooks/useReports.ts:109-114,177-178` | S | S3-05 |  |
| [FUNC-29](./FUNCTIONAL_AUDIT.md) | Currency inconsistency: UI uses ₹ (INR) while notifications, SMS, and the `payments` default use `$` / USD | Functional | Confirmed | Billing / notifications | `src/lib/currency.ts:8-9` | S | S3-04 |  |
| [FUNC-30](./FUNCTIONAL_AUDIT.md) | Patient portal shows all prescription and appointment statuses (CONTEXT.md limits it to dispensed and finalized); patient online payment is a mock and unrouted | Functional | Confirmed | Patient portal | `src/lib/hooks/patients/usePatientPortal.ts:106-115,175-184,258-266,…` | M | S4-01 |  |
| [ARCH-08](./MODULE_AUDIT.md) | Parallel implementation families (logger ×2, rate limiter ×5, cache ×6, security ×4, RBAC ×10, Sentry ×3, registration ×4, vitals forms ×4, audit viewers ×4) | Technical debt | Confirmed | src/utils, src/lib, src/components | `see table` | M | S2-01 |  |
| [ARCH-13](./MODULE_AUDIT.md) | Dependency manifest hygiene — test/tooling libs in `dependencies`, unused SDKs, two React plugins, two lockfiles that disagree | Technical debt | Confirmed | package.json / lockfiles | `package.json:2,122,124-127,156,160-166,173,176-177,180,195,209,222,…` | S | S2-02 |  |
| [ARCH-14](./MODULE_AUDIT.md) | Production root renders QA/test tooling (TestingProvider, E2E mock-auth branches) for every user | Architecture | Confirmed | App shell | `src/App.tsx:9,89` | S | S2-02 |  |
| [ARCH-15](./MODULE_AUDIT.md) | Five test roots with overlapping scope; unit/coverage scripts cover only one of them | Testing | Confirmed | Test architecture | `package.json (test:unit, test:coverage)` | M | S2-02 |  |
| [ARCH-16](./MODULE_AUDIT.md) | Repo hygiene — microservices/Kong still built and deployed despite ADR-0001; stray prompt files; README links broken | Infrastructure | Confirmed | Repository root | `services/ (105 files, 18,264 TS LOC)` | S | S2-06 | DB-19 |
| [PERF-04](./PERFORMANCE_AUDIT.md) | AuthContext re-renders the whole tree and refetches profile/hospital/roles redundantly | Performance | Likely | Auth | `src/contexts/AuthContext.tsx:353-418,451-485,930` | M | S3-05 |  |
| [PERF-13](./PERFORMANCE_AUDIT.md) | Async hygiene — no request cancellation, 71 live exhaustive-deps warnings, no list virtualisation | Performance | Confirmed | Hooks / components | `src/pages/consultations/ConsultationWorkflowPage.tsx:206-229` | M | S3-05 |  |
| [OPS-11](./PRODUCTION_READINESS_CHECKLIST.md) | Broken, retired and duplicate workflows produce permanent red noise | Infrastructure | Confirmed | .github/workflows | `soak-test.yml:20, 22` | S | S1-07 |  |
| [TEST-07](./TEST_COVERAGE_AUDIT.md) | Accessibility, performance and "infrastructure" tests test fixtures and YAML, not the application | Testing | Confirmed | tests/accessibility, tests/performance, tests/load-testing,  | `tests/accessibility/wcag-compliance.test.tsx:19-50` | M | S3-02 | A11Y-16 |
| [TEST-08](./TEST_COVERAGE_AUDIT.md) | Security "verification" relies on grepping source text | Testing | Confirmed | tests/security | `tests/security/p1-audit-remediation.test.ts:50-67` | M | S1-08 |  |
| [TEST-09](./TEST_COVERAGE_AUDIT.md) | Test infrastructure hygiene — global mocks, skipped audit tests, empty flaky registry, no coverage thresholds | Testing | Confirmed | src/test/setup.ts, vitest configs, tests/flaky-registry.ts | `src/test/setup.ts:5-56` | S | S5-05 |  |
| [UX-09](./UI_UX_AUDIT.md) | Two parallel toast systems, with errors delivered mainly by toasts | UI/UX | Confirmed | Feedback / notifications | `src/App.tsx:91-92` | M | S3-03 |  |
| [UX-12](./UI_UX_AUDIT.md) | Not internationalisation-ready; mixed date locales and currency symbols | UI/UX | Confirmed | i18n / formatting | `package.json (no i18n library)` | L | S3-04 |  |
| [UX-13](./UI_UX_AUDIT.md) | Empty, loading and error states are inconsistent across modules | UI/UX | Confirmed | Pharmacy queue, Billing, Laboratory, Dashboards | `src/components/pharmacist/PrescriptionQueue.tsx (header-only table)…` | M | S1-06 |  |
| [A11Y-12](./UI_UX_AUDIT.md) | Public pages lack landmarks and a skip link, with heading and title gaps | Accessibility | Confirmed | Public pages / layout | `src/pages/hospital/LandingPage.tsx, LoginPage.tsx, SignupPage.tsx, …` | S | S3-02 |  |
| [A11Y-13](./UI_UX_AUDIT.md) | Text-input focus indicator is faint (15% alpha ring plus a 2.5:1 teal border) | Accessibility | Confirmed | Design system / inputs | `src/index.css:274-281` | S | S3-01 |  |
| [A11Y-14](./UI_UX_AUDIT.md) | Data tables overflow on mobile in scroll regions that are not keyboard-focusable | Accessibility | Confirmed | Tables (Billing, Pharmacy, Inventory, Consultations) | `src/components/ui/table.tsx:5-10` | M | S3-02 |  |
| [A11Y-15](./UI_UX_AUDIT.md) | Infinite pulse and bounce animations on critical UI with no reduced-motion handling | Accessibility | Likely | Alerts / badges | `src/components/ui/badge.tsx:18 (emergency: ... animate-pulse), sr…` | S | S3-02 |  |

### P4 (3)

| ID | Title | Category | Confidence | Module | Primary location | Effort | Roadmap | Merged |
|---|---|---|---|---|---|---|---|---|
| [FUNC-32](./FUNCTIONAL_AUDIT.md) | Glossary drift: CONTEXT.md Patient Queue statuses differ from code and DB | Technical debt | Confirmed | Domain docs / Patient Queue | `CONTEXT.md (Patient Queue: 'waiting' \| 'in_consultation' \| 'comple…` | S | S4-01 |  |
| [OPS-18](./PRODUCTION_READINESS_CHECKLIST.md) | Local quality gates are thin and code-reviewer tooling is unwired | Technical debt | Confirmed | .husky, .lintstagedrc, .code-reviewer.json | `.husky/pre-commit:1-3` | S | S5-01 |  |
| [UX-14](./UI_UX_AUDIT.md) | Navigation load is reasonable; first-run guidance exists only for admin | Product enhancement | Confirmed | Navigation / onboarding | `src/config/routeManifest.ts` | M | S4-01 |  |

## 4. Consolidated duplicates

| Duplicate ID | Folded into | Duplicate title |
|---|---|---|
| A11Y-16 | TEST-07 | Existing accessibility tests give false assurance |
| ARCH-10 | CLIN-19 | Consultation completion is a non-atomic client-side saga that marks *all* of a patient's confirmed appointments (including future ones) as completed |
| CLIN-10 | EDGE-03 | Critical Lab Escalation Queue (5/10-minute ladder) is non-functional end to end |
| CLIN-24 | ARCH-03 | Type safety is disabled on core clinical paths, and duplicate or dead implementations mask defects |
| DB-19 | ARCH-16 | `services/*` define a parallel, divergent schema (contradicts ADR-0001) |
| DB-22 | SECF-11 | `profiles` stores plaintext security answers and 2FA artefacts readable by every same-hospital user |
| EDGE-28 | TEST-05 | Edge-function tests are effectively absent; remediation "verification" asserts source strings |
| FUNC-01 | DB-15 | Patient self-registration always fails: `register_patient` RPC targets schema that does not exist |
| FUNC-02 | SECF-02 | Login 2FA verification is not enforced: the session is fully usable before the TOTP check, and PublicRoute redirects past the modal |
| FUNC-31 | ARCH-07 | Large dead, duplicate, and unbacked code surface obscures what is live |
| OPS-08 | DB-18 | Disaster-recovery runbook describes a non-existent architecture and uses Supabase CLI commands that do not exist |
| OPS-14 | SECF-04 | PWA runtime-caches Supabase API (PHI) responses for 24 h and never purges them on logout |
| OPS-15 | SECF-17 | Production security headers are defined only in an unused nginx.conf; that config itself has defects |
| OPS-16 | SECF-03 | Secrets hygiene — historical `.env` with PHI encryption key, client-bundle `VITE_*` secrets, no secret scanning |
| OPS-17 | SECF-21 | Tests and seed scripts run against whatever Supabase `.env` points to — the single Lovable (production) project — with no isolated test backend |
| PERF-02 | SECF-04 | PWA runtime cache stores Supabase API responses (PHI) for 24 h, keyed only by URL; survives logout; storage rule is shadowed |
| PERF-03 | SECF-05 | React Query cache is never cleared on logout/user switch (5-min staleTime, hospital-scoped keys) |
| PERF-05 | CLIN-06 | Consultation autosave race can overwrite in-progress clinical documentation |
| PERF-06 | CLIN-04 | Dispensing performs non-atomic client-side read-modify-write of stock in a loop; errors ignored |
| SECF-10 | DB-01 | Patient self-registration can join any hospital tenant, giving hospital-wide reads (profiles, documents) to anonymous sign-ups |
| SECF-27 | OPS-03 | CI security gates are non-blocking |
| UX-15 | SECF-22 | Login renders the dev mock-auth password from a hard-coded literal (cross-reference for the security auditor) |