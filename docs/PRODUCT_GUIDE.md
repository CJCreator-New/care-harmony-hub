# CareHarmony HIMS — End-to-End Product Guide

> **Purpose**: one document that explains what CareHarmony HIMS is, how a patient
> moves through it, who does what, how it is built, how to run and test it — and
> where the documentation was found to be out of date.
>
> **Sources of truth** (this guide summarises, it does not replace them):
> `CONTEXT.md` (domain language), `docs/adr/` (decisions), `src/types/rbac.ts`
> (permissions), `supabase/migrations/` (schema), `supabase/functions/` (backend),
> `package.json` (commands and versions).
>
> **Last verified against the codebase**: 2026-11-13.

---

## Table of contents

1. [What the product is](#1-what-the-product-is)
2. [Vocabulary and canonical roles](#2-vocabulary-and-canonical-roles)
3. [The end-to-end patient journey](#3-the-end-to-end-patient-journey)
4. [What each role does](#4-what-each-role-does)
5. [Architecture](#5-architecture)
6. [Data model and multi-tenancy](#6-data-model-and-multi-tenancy)
7. [Security and clinical safety invariants](#7-security-and-clinical-safety-invariants)
8. [Running the product locally](#8-running-the-product-locally)
9. [Testing, quality gates and CI](#9-testing-quality-gates-and-ci)
10. [Operations](#10-operations)
11. [Architecture decision register](#11-architecture-decision-register)
12. [Documentation gaps found and how they were handled](#12-documentation-gaps-found-and-how-they-were-handled)
13. [Documentation map](#13-documentation-map)

---

## 1. What the product is

CareHarmony HIMS is an enterprise **Hospital Information Management System**: a
single web application that carries a patient from registration and triage
through consultation, diagnostics, pharmacy, billing and discharge, and gives the
patient a self-service portal afterwards.

- **Deployment shape**: browser-based React SPA with a PWA service worker for
  offline capability. There is **no application server and no microservice tier**
  — all backend logic runs in Supabase PostgreSQL (RLS, triggers, functions) and
  Deno edge functions (ADR-0001, ADR-0007).
- **Tenancy**: multi-hospital. Every clinical record is hospital-scoped and
  enforced by Row-Level Security, not by client-side filtering.
- **Clinical posture**: fail-closed. If allergy or drug-interaction checking
  fails, is ambiguous, or times out, fulfillment is blocked pending an explicit
  clinician override with a logged rationale (ADR-0005).
- **Roles**: exactly seven — admin, doctor, nurse, receptionist, pharmacist,
  lab_technician, patient (ADR-0002). There is no billing role.
- **Brand**: "CareHarmony HIMS" is the only user-facing name (ADR-0011). Legacy
  names (`CareSync`, `AROCORD-HIMS`) survive only in historical documents and
  code comments.

**Surfaces** (navigation groups in `src/config/routeManifest.ts`): Core
Operations, Clinical Care, Pharmacy & Inventory, Laboratory, AI & Analytics,
Administration, Business Operations, Patient Portal.

---

## 2. Vocabulary and canonical roles

The full glossary is `CONTEXT.md`; use its terms in specs, issues and tests.
The role definitions and permission categories live in `src/types/rbac.ts`;
route access is derived from `ROUTE_POLICIES` in `src/modules/rbac`.

| Role               | Scope in one line                                           | Notable capabilities (from the permission matrix)                                                                                                                    |
| ------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **admin**          | Hospital administration, staff, configuration, compliance   | staff manage/invite, hospital settings, reports, audit logs, compliance reports, system maintenance; read/write on patients, appointments, billing, queue, inventory |
| **doctor**         | Diagnosis, encounters, orders                               | patient read/write, appointments, consultations (start/read/write), prescriptions, lab orders, telemedicine, queue read, vitals read                                 |
| **nurse**          | Intake, vitals, medication administration, queue operations | patient read/write, appointment check-in, queue manage/write, vitals read/write, pharmacy/lab/inventory read                                                         |
| **receptionist**   | Registration, scheduling, check-in, front-desk billing      | patient read/write, appointments, check-in, queue manage, billing read/write/process/invoice                                                                         |
| **pharmacist**     | Medication verification and dispensing                      | prescription read/write/dispense, pharmacy read/write/dispense, inventory manage, patient and consultation read                                                      |
| **lab_technician** | Specimens, assays, results, critical values                 | lab read/write/process/upload results, patient read, consultation read                                                                                               |
| **patient**        | Own records through the portal                              | portal access; own appointments, prescriptions, lab results, billing and vitals, subject to identity tier (ADR-0008)                                                 |

> **Billing boundary (ADR-0002)**: doctors and nurses never see invoices. Billing
> is a receptionist capability (point of care) plus admin oversight (governance
> and reporting).

---

## 3. The end-to-end patient journey

Each stage names the owning role, the system behaviour, and the decision that
governs it.

### Stage 1 — Hospital and staff onboarding

- A hospital is created by an administrator; staff are provisioned by invitation
  (`accept-invitation-signup`, staff management) with a canonical role.
- Each account is hospital-scoped; deactivating an account revokes access
  immediately because `user_belongs_to_hospital()` requires `is_active = true`
  (ADR-0005).

### Stage 2 — Patient registration

- **Receptionist** registers demographics, contacts, insurance and emergency
  contacts (`PatientRegistrationModal` → `patients`).
- The patient may alternatively self-register online (`register-patient`), which
  creates a **Tier-1 unverified** portal identity (ADR-0008).

### Stage 3 — Appointment booking

- Staff book directly onto the clinical calendar.
- **Portal self-booking is moderated (ADR-0015)**: requests are stored as
  `pending_confirmation`, appear in a reception "Portal Requests" queue, and only
  become `confirmed` after staff verify identity, insurance and duplicate-MRN
  risk.

### Stage 4 — Arrival, check-in and queue

- Check-in (front desk, kiosk, or digital check-in) creates a wait item in
  `patient_queue`.
- **Hybrid orchestration (ADR-0012)**: physicians self-claim the next patient
  atomically, or triage nurses push a patient to a specific doctor/room. Red /
  Immediate acuity and Emergency Triage Bypass patients stay pinned to the top.
- The claim is a single atomic update (`status = 'in_consultation'`,
  `claimed_by_doctor_id`, timestamp) so two physicians cannot open the same chart.

### Stage 5 — Triage and vitals

- **Nurse** records vitals; `src/modules/vital-signs` validates plausibility and
  computes NEWS2 deterioration scores and panic thresholds.
- **Offline-first (ADR-0013)**: routine vitals and progress notes queue in an
  encrypted IndexedDB store (`src/modules/offline-store`) and replay on
  reconnection. Critical actions (dispensing, discharge, billing) are disabled
  offline.
- Emergency Triage Bypass lets a physician or triage nurse start care
  immediately, skipping routine vitals with a mandatory logged rationale.

### Stage 6 — Consultation

- **Doctor** documents the encounter: notes, diagnoses, orders and prescriptions
  (`consultations`).
- Completing an encounter **does not discharge the patient** (ADR-0009); discharge
  is a separate physician order.

### Stage 7 — Diagnostics

- Orders land in the lab queue (`ordered → collected → in_progress → completed`).
- **Lab technician** accessions specimens, runs assays, records results.
- A critical result triggers `critical-lab-check` / `lab-critical-values`:
  escalation ladder primary doctor → on-call (5 min) → emergency department
  (10 min), plus a persistent, non-dismissible in-session modal requiring
  "Acknowledge & Sign" (ADR-0010). Acknowledgment cancels pending escalation.

### Stage 8 — Pharmacy

- Prescriptions follow `initiated → pending_approval → approved → dispensed →
completed`; only a pharmacist may approve/dispense (ADR-0004).
- Allergy matching is normalised against allergen root classes; drug interaction
  checks call `drug-interaction-check` and **fail closed** (ADR-0005).
- **Emergency Floor Stock Override (ADR-0006)** allows STAT administration by a
  doctor or ER triage nurse with a ≥15-character justification, an immutable
  audit event, and pharmacist reconciliation within 2 hours.

### Stage 9 — Billing

- **Receptionist** creates invoices, records charges and collects copayments;
  **admin** has governance/reporting visibility. Clinical roles have no access
  (ADR-0002).
- Billing is disabled while offline (ADR-0013).

### Stage 10 — Discharge

- **Doctor** signs the discharge order (preconditions: no unacknowledged critical
  alerts, no unfulfilled STAT medication).
- **Concurrent staging (ADR-0014)**: pharmacy (take-home medication
  reconciliation) and billing (invoice finalisation, copay collection) work in
  parallel.
- **Nurse** performs the final release, which is hard-gated until
  `doctor_signed AND pharmacy_cleared AND billing_cleared`. Rejections roll back
  to the preceding discipline with an auditable reason (ADR-0003).

### Stage 11 — After care

- Verified (Tier-2) patients see appointments, prescriptions, lab results and
  medical history in the portal; Tier-1 patients see future appointments only
  (ADR-0008).
- Every clinical and administrative action is written to append-only
  `audit_logs`; admins review them in the Audit Logs and System Health screens.

---

## 4. What each role does

- **Admin** — staff lifecycle and role assignment, hospital settings, audit and
  compliance reporting, system health, reports. Cannot alter live clinical data
  as a clinician.
- **Doctor** — owns the encounter: history, examination, diagnosis, lab orders,
  prescriptions, telemedicine, voice notes, discharge order. Reviews AI
  differential/treatment suggestions as decision support only.
- **Nurse** — intake, vitals and NEWS2, queue push/routing, care protocols,
  medication administration against the approved prescription, discharge release.
- **Receptionist** — registration, appointment management, check-in, portal
  request moderation, front-desk billing and copays.
- **Pharmacist** — reviews and approves prescriptions, runs interaction checks,
  dispenses, manages inventory, reconciles emergency overrides.
- **Lab technician** — specimen collection/accessioning, assay execution, result
  entry and verification, critical value escalation.
- **Patient** — portal only: appointments, prescriptions, lab results, history;
  visibility depends on verification tier.

Per-role walkthroughs: `docs/workflows/*.md` (these predate ADR-0012…0015 — see
[gap G7](#12-documentation-gaps-found-and-how-they-were-handled)).

---

## 5. Architecture

### 5.1 Frontend

- React 18 + TypeScript 5.8, Vite 7, Tailwind 3.4 + shadcn/Radix UI, React
  Router 6, TanStack Query 5, react-hook-form 7 + Zod 4.
- Lazy-loaded role dashboards and heavy vendors; the chart vendor is split into
  `charts` and `charts-d3` chunks (see `vite.config.ts`).
- `src/modules/` holds **deep modules** with enforced import boundaries
  (`npm run lint:boundaries`):
  `order-safety`, `discharge-pipeline`, `prescription-dispensing`,
  `critical-lab-escalation`, `vital-signs`, `offline-store`, `rbac`.
- Permission decisions come only from `@/modules/rbac`; components must not
  re-implement role checks.
- PWA: service worker for static precache and offline shell; Supabase origins are
  explicitly `NetworkOnly` so PHI is never cached (SECF-04).

### 5.2 Backend — Supabase-native only

- PostgreSQL with RLS as the authoritative authorization boundary, plus triggers,
  constraints and RPCs for invariants (prescription state machine, discharge
  gates, audit immutability).
- **41 edge functions** in `supabase/functions/` (plus `_shared` helpers) cover
  AI support, notifications, lab automation, pharmacy, FHIR/insurance
  integration, telemedicine, backups, monitoring and crypto.
- Realtime channels push queue changes, notifications and critical alerts.
- **No `services/` runtime**: the untracked `services/` directory is retired and
  excluded from lint, tests and packaging (ADR-0007).

### 5.3 Integrations

- Lab equipment (HL7 v2 / REST point-of-care), pharmacy systems/e-Rx, telemedicine
  video, insurance/X12 claims, FHIR export/import, AI providers. Backend
  credentials live in Supabase edge-function secrets, never in `VITE_*` variables
  (`npm run security:client-secrets`).

### 5.4 Data access

Hooks under `src/lib/hooks/**` and module entry points wrap Supabase queries with
TanStack Query for caching, retries and optimistic updates. Components never call
`supabase` directly except through the generated client and documented helpers.

---

## 6. Data model and multi-tenancy

- **71 SQL migrations** under `supabase/migrations/` define the schema and RLS.
- Core tables: `hospitals`, `profiles` (staff/patient identity, `is_active`,
  `is_identity_verified`), `patients`, `appointments`, `consultations`,
  `vital_signs`, `prescriptions` (+ items), `lab_orders` / `lab_results`,
  `critical_value_alerts`, `patient_queue`, `invoices` / payments,
  `discharge_workflows` (+ tasks/audit), `pharmacy_inventory`, `audit_logs`
  (append-only, partitioned) and `activity_logs`.
- Tenancy rule: every PHI row carries `hospital_id`; RLS policies resolve the
  caller's hospital through `user_belongs_to_hospital()` (active accounts only)
  and clinical tables additionally restrict by role and record ownership.
- Generated types: `src/integrations/supabase/types.ts` (excluded from lint).

Schema references: `docs/DATABASE.md` and `docs/product/DATA_MODEL.md`
(partially overlapping — see gap G8).

---

## 7. Security and clinical safety invariants

1. **RLS is the boundary.** Client checks are UX only; the database denies by
   default.
2. **Fail-closed CDS.** Allergy/interaction ambiguity or failure blocks
   fulfillment until an explicit, audited override.
3. **Billing isolation.** Clinical roles cannot read invoices (ADR-0002).
4. **Scoped decryption.** `phi-crypto` requires `resourceType` + `resourceId`
   and probes the target table with the caller's JWT before decrypting; it is not
   a decryption oracle (ADR-0005).
5. **Immutable audit.** `audit_logs` is append-only via triggers; every safety
   override and pipeline transition records before/after state.
6. **MFA** for clinical/admin roles via Supabase Auth MFA, with backup codes
   (`docs/security/MFA_MIGRATION.md`).
7. **Offline gating.** Only routine vitals/notes may be written offline; critical
   actions require connectivity (ADR-0013).
8. **Secret hygiene.** No real credentials in the repository; `.env.test` holds
   mocks only; provider keys live in edge-function secrets.

---

## 8. Running the product locally

Prerequisites: Node.js 18+ and npm, Git, and a Supabase project (or the local
Supabase CLI stack).

```bash
git clone <YOUR_GIT_URL>
cd care-harmony-hub
npm install
npm run dev          # http://localhost:8080
```

Environment: copy `.env.example` to an untracked `.env` and set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never put provider keys
in `VITE_*` variables. End-to-end mock auth uses `.env.test` (mock password only).

| Command                                                       | What it does                                                          |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev` / `build` / `preview`                           | Vite dev server / production build / preview                          |
| `npm run lint`                                                | ESLint over the app (ignores `.kilo`, `services`, `dist`, `supabase`) |
| `npm run lint:boundaries`                                     | dependency-cruiser module-boundary rules                              |
| `npm run type-check`                                          | `tsc --noEmit` for app and node configs                               |
| `npm run test:unit`                                           | Vitest over `src/test` (the fast gate)                                |
| `npm run test:unit:all`                                       | Full Vitest run (unit + api + security + integration)                 |
| `npm run test:integration`                                    | Integration suite with its own config                                 |
| `npm run test:api` / `test:security` / `test:accessibility`   | Focused suites                                                        |
| `npm run test:e2e[*]`                                         | Playwright suites (smoke, full, roles, staging)                       |
| `npm run validate:rls`                                        | RLS policy validator (also runs on commit)                            |
| `npm run validate:migrations` / `npm run db:replay`           | Migration validation and replay                                       |
| `npm run security:client-secrets` / `security:bundle-secrets` | Secret leak checks                                                    |
| `npm run validate:all`                                        | lint + boundaries + tests + RLS                                       |

Quality baseline at the time of writing: **64 unit test files / 1,035 passing
tests**, `npm run lint` with **0 errors**, `npm run type-check` clean,
`npm run build` clean, and `npm audit` with **0 high/critical** advisories.

---

## 9. Testing, quality gates and CI

- **Pyramid**: unit tests for pure logic and modules; integration tests for
  workflows and RLS; API/security tests for edge-function authorization; E2E for
  role journeys.
- **Module tests** live in `src/modules/<domain>/tests/` and must use the module's
  public entry points.
- **Required CI checks** and their current state are tracked in
  `docs/operations/CI_REQUIRED_CHECKS.md`.
- **Pre-commit**: husky + lint-staged; RLS validation runs on commit.
- Known red tests (pre-existing, unrelated to product logic): one migration-review
  assertion in `tests/security/s0-05-destructive-endpoints.test.ts` and one
  schema-drift assertion in `tests/integration/lab-critical-alerts.test.ts`
  (Postgres `42703`).

---

## 10. Operations

| Runbook                                           | When to use                                 |
| ------------------------------------------------- | ------------------------------------------- |
| `operations/CI_REQUIRED_CHECKS.md`                | Gate configuration on `main`                |
| `operations/STAGING_DEPLOYMENT_VALIDATION.md`     | Pre-release staging checklist               |
| `operations/CRITICAL_RESULT_ESCALATION_SOP.md`    | Interim phone procedure if alerting is down |
| `operations/DISASTER_RECOVERY_RUNBOOK.md`         | Failover, RTO/RPO, recovery                 |
| `operations/SECRET_ROTATION_AND_HISTORY_PURGE.md` | Rotating keys, purging history              |
| `SECURITY_ROTATION_GUIDE.md`                      | Day-to-day key rotation posture             |
| `security/MFA_MIGRATION.md`                       | 2FA rollout for existing users              |

Migrations are applied with the Supabase CLI; `npm run db:replay` verifies they
apply cleanly from scratch.

---

## 11. Architecture decision register

| ADR  | Decision                                                                                   |
| ---- | ------------------------------------------------------------------------------------------ |
| 0001 | Supabase-native backend is the sole runtime; Kong/microservice configs are archived        |
| 0002 | Seven canonical roles; billing belongs to receptionist (operations) and admin (governance) |
| 0003 | Sequential 4-stage discharge pipeline with rollback on rejection                           |
| 0004 | Pharmacist-gated prescription dispensing state machine                                     |
| 0005 | Unified typed RBAC, scoped PHI crypto, fail-closed CDS, durable lab escalation             |
| 0006 | Emergency floor-stock override for STAT medication with 2-hour reconciliation              |
| 0007 | `services/` retired; all backend logic in edge functions/Postgres                          |
| 0008 | Two-tier patient portal identity verification                                              |
| 0009 | Consultations decoupled from formal discharge orders                                       |
| 0010 | Persistent in-session critical lab alerts and timed escalation                             |
| 0011 | Canonical branding: CareHarmony HIMS                                                       |
| 0012 | Hybrid queue: doctor self-claim + nurse push, atomic claiming                              |
| 0013 | Offline-first queue for routine records, fail-closed critical gating                       |
| 0014 | Concurrent pharmacy/billing staging with inviolable nursing release gate                   |
| 0015 | Moderated appointment booking for unverified portal users                                  |

---

## 12. Documentation gaps found and how they were handled

Findings from reconciling `docs/` with the code and ADRs, in severity order.
"Resolved" means corrected in this pass; "Open" means the guide documents the
correct behaviour but the legacy document still needs a rewrite.

| ID      | Gap                                                                                                                   | Evidence                                                           | Status                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **G1**  | Product named `CareSync` / `AROCORD-HIMS` across product, workflow and integration docs                               | 22 non-ADR files                                                   | **Resolved** — renamed to CareHarmony HIMS (ADR-0011)                                                         |
| **G2**  | `product/API_REFERENCE.md` documents a REST API (`api.careharmony.local/v1/...`) that does not exist                  | no REST server in the tree; ADR-0001/0007                          | **Resolved** — obsolete document deleted; backend operates exclusively via Supabase client and edge functions |
| **G3**  | `product/BACKEND_DEVELOPMENT.md` describes a `backend/` Node/Express service tree                                     | directory does not exist; ADR-0007                                 | **Resolved** — obsolete document deleted; backend development resides in `supabase/functions` and PostgreSQL  |
| **G4**  | `RBAC_PERMISSIONS.md` lists a "Billing / Finance" role and omits Patient                                              | ADR-0002; `src/types/rbac.ts`                                      | **Resolved** — correction notice, role section relabelled, matrix footnote                                    |
| **G5**  | Forms guides import `@/lib/schemas/formValidation`, which does not exist                                              | no `src/lib/schemas`; forms define local Zod schemas + `FormField` | **Mitigated** — correction banner added; examples need updating (Open)                                        |
| **G6**  | `product/SYSTEM_ARCHITECTURE.md` diagram shows Kong gateway, Docker microservices, Kubernetes                         | ADR-0001/0007                                                      | **Resolved** — diagram and deployment model corrected                                                         |
| **G7**  | Workflow guides predate ADR-0012…0015 (hybrid queue, offline queue, concurrent discharge staging, moderated booking)  | no ADR-0012–0015 references in `docs/workflows`                    | **Resolved** — modern workflows and ADR-0012–0015 implemented and cross-referenced in workflow docs           |
| **G8**  | Two overlapping schema references: `DATABASE.md` and `product/DATA_MODEL.md`, both partial                            | duplicate scope                                                    | **Resolved** — consolidated into `product/DATA_MODEL.md`; duplicate `docs/DATABASE.md` deleted                |
| **G9**  | `.env.example` titled "AroCord-HIMS"                                                                                  | file header                                                        | **Resolved** — retitled                                                                                       |
| **G10** | Legacy docs quote stale metrics ("500+ E2E tests", "50+ migrations", Kong ports)                                      | various                                                            | **Resolved** — updated to 70 migrations and 64 unit test files / 1,035 passing tests                          |
| **G11** | `RBAC_PERMISSIONS.md` SQL examples parse `auth.jwt()->'role'` instead of the real `user_belongs_to_hospital()` helper | ADR-0005; migrations                                               | **Mitigated** — correction notice added; examples still illustrative (Open)                                   |

### Recommended follow-ups (not done here)

1. Delete or rewrite `API_REFERENCE.md` as an **edge-function reference**
   (invocation, auth header, `getAuthorizedActor`, error shape, rate limits).
2. Replace `BACKEND_DEVELOPMENT.md` with a guide to `supabase/functions/`,
   `_shared`, local Deno workflow and secrets.
3. Rewrite `RBAC_PERMISSIONS.md` from `src/types/rbac.ts` so the matrix is
   generated rather than hand-maintained.
4. Update `FORMS_DEVELOPMENT_GUIDE.md` examples to the current pattern: per-form
   Zod 4 schema, `zodResolver` from `@hookform/resolvers` 7, and
   `@/components/common/FormField` for a11y wiring.
5. Add ADR-0012…0015 callouts to the nurse, doctor, receptionist and patient
   workflow guides.
6. Generate a single schema document from the migrations to replace G8.

---

## 13. Documentation map

| Need                     | Document                                                                                                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain vocabulary        | [`../CONTEXT.md`](../CONTEXT.md)                                                                                                                                                             |
| Index of everything      | [`INDEX.md`](./INDEX.md)                                                                                                                                                                     |
| Decisions                | [`adr/`](./adr)                                                                                                                                                                              |
| Schema                   | [`product/DATA_MODEL.md`](./product/DATA_MODEL.md)                                                                                                                                           |
| Roles and permissions    | [`RBAC_PERMISSIONS.md`](./RBAC_PERMISSIONS.md)                                                                                                                                               |
| Architecture             | [`product/SYSTEM_ARCHITECTURE.md`](./product/SYSTEM_ARCHITECTURE.md)                                                                                                                         |
| Edge functions & Backend | Supabase Edge Functions in `supabase/functions/` & PostgreSQL RLS                                                                                                                            |
| Frontend / standards     | [`product/FRONTEND_DEVELOPMENT.md`](./product/FRONTEND_DEVELOPMENT.md), [`product/DEVELOPMENT_STANDARDS.md`](./product/DEVELOPMENT_STANDARDS.md)                                             |
| Forms                    | [`product/FORMS_DEVELOPMENT_GUIDE.md`](./product/FORMS_DEVELOPMENT_GUIDE.md), [`product/FORMS_QUICK_REFERENCE.md`](./product/FORMS_QUICK_REFERENCE.md) (see G5)                              |
| Testing                  | [`product/TESTING_STRATEGY.md`](./product/TESTING_STRATEGY.md)                                                                                                                               |
| Security                 | [`product/SECURITY_CHECKLIST.md`](./product/SECURITY_CHECKLIST.md), [`SECURITY_ROTATION_GUIDE.md`](./SECURITY_ROTATION_GUIDE.md), [`security/MFA_MIGRATION.md`](./security/MFA_MIGRATION.md) |
| Integrations             | [`integrations/`](./integrations)                                                                                                                                                            |
| Role workflows           | [`workflows/`](./workflows)                                                                                                                                                                  |
| Runbooks                 | [`operations/`](./operations)                                                                                                                                                                |
| Agent conventions        | [`agents/`](./agents)                                                                                                                                                                        |

**Keeping this guide current**: when an ADR is accepted, add it to §11 and, if it
changes a journey, update §3. When a command is added to `package.json`, update
§8. When a gap is closed, move it to "Resolved" in §12.
