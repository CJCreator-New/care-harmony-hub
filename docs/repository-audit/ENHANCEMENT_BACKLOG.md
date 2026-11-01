# Enhancement Backlog

> CareSync HIMS repository audit, 2026-11-01. Commit `43ab8f7`. This backlog goes beyond defects: it lists capabilities that are missing, simulated or only partially built, plus opportunities that would materially improve the product.
> - **Essential (E-01 to E-15):** required before the product can honestly claim the scope described in README, CONTEXT.md and the ADRs.
> - **Optional (E-16 to E-24):** improvements that add value but are not prerequisites for production.
>
> Prerequisites: most items depend on the Sprint 0 and 1 foundations (live schema baseline S0-01, role-aware RLS S0-04, transactional RPCs S1-01). Do not start them before those land. Complexity uses the S/M/L scale in [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) §1.

## Summary

| ID | Enhancement | Class | Related issues | Complexity | Roadmap |
|---|---|---|---|---|---|
| E-01 | Real kiosk self check-in | Essential | FUNC-11 | M | S4-01 |
| E-02 | Recurring appointments | Essential | FUNC-23 | M | S4-01 |
| E-03 | Insurance claims through a clearinghouse | Essential | FUNC-09, EDGE-10 | L | S4-01 |
| E-04 | Purchase-order receiving that updates stock | Essential | FUNC-22 | S | S4-01 |
| E-05 | Production-grade telemedicine | Essential | FUNC-24, CLIN-21 | L | S4-01 |
| E-06 | Live operational dashboards from SQL | Essential | FUNC-18, FUNC-28, PERF-07 | M | S4-01 |
| E-07 | Account and profile self-service | Essential | FUNC-26 | S | S4-01 |
| E-08 | Duplicate-patient detection (lightweight MPI) | Essential | FUNC-27 | M | S4-01 |
| E-09 | Patient-portal release rules | Essential | FUNC-30 | S | S4-01 |
| E-10 | Governed AI clinical assistance | Essential (if AI is offered) | CLIN-18, SECF-03 | L | S4-01 |
| E-11 | Immutable addenda and electronic signature | Essential | CLIN-22 | M | S4-01 |
| E-12 | Complete ICD-10 catalogue and search | Essential | CLIN-23 | M | S4-01 |
| E-13 | Role onboarding and in-app guidance | Essential | UX-14 | M | S4-01 |
| E-14 | Domain vocabulary alignment | Essential | FUNC-32 | S | S4-01 |
| E-15 | Online patient payments with server-side confirmation | Essential (if offered) | — (mock Stripe in `src/utils/paymentService.ts:1-16`) | M | S4-01 |
| E-16 | Break-glass emergency access | Optional | — (unwired `src/hooks/useBreakGlassOverride.ts`) | M | after S2 |
| E-17 | Consent management | Optional | — (`ConsentForm` used only in `DigitalCheckinWorkflow`) | M | after S2 |
| E-18 | Standards-based interoperability (SMART on FHIR, HL7 v2) | Optional | EDGE-01 | L | after S5 |
| E-19 | Secure offline mode for wards | Optional | SECF-06 | L | after S5 |
| E-20 | De-identified analytics store | Optional | PERF-07 | L | after S5 |
| E-21 | Feature flags and progressive delivery | Optional | — (`useFeatureFlags` reads `feature_flags`) | S | S5 |
| E-22 | Internationalization and multi-currency | Optional | UX-12, FUNC-29 | M | S3/S4 |
| E-23 | Automated dependency updates, SBOM and provenance | Optional | OPS-19, OPS-12 | S | S5 |
| E-24 | Clinical audit analytics and anomaly alerts | Optional | DB-08, SECF-15 | M | after S1-05 |

## Essential enhancements

### E-01: Real kiosk self check-in
- **Current limitation:** The kiosk page is a mock. It has three hardcoded patients and persists nothing (FUNC-11).
- **Proposed improvement:** Patients identify themselves by appointment code, or by DOB plus last name with a one-time code. The kiosk checks them in and adds them to the patient queue.
- **Expected benefit:** Shorter front-desk queues and accurate arrival times.
- **Technical approach:** A `kiosk_check_in(code)` SECURITY DEFINER RPC that reuses `check_in_patient` (S1-01). A kiosk-scoped device account with a minimal role and a hospital pin. Rate limiting and an idle reset.
- **Dependencies:** S1-01, S0-04.
- **Complexity:** M.
- **Risks:** Identity verification at a public device, and PHI shown on screen. Mitigate with minimal display and an auto-timeout.
- **Acceptance criteria:** A patient with a booked appointment checks in at the kiosk, appears in the queue once, and the kiosk shows no other patient's data.

### E-02: Recurring appointments
- **Current limitation:** The recurrence UI is dead code. `recurrence.utils` has DST and conflict bugs. The edge function sits in a non-deployable nested directory (FUNC-23, EDGE-22).
- **Proposed improvement:** RRULE-based series with exceptions, conflict checks and series edits.
- **Expected benefit:** Supports chronic care and therapy schedules.
- **Technical approach:** Store the RRULE (RFC 5545) on `appointment_series`. Materialize occurrences 90 days ahead with `pg_cron`. Rely on the exclusion constraint from S1-04 for conflicts. Use timezone-aware expansion.
- **Dependencies:** S1-04.
- **Complexity:** M.
- **Risks:** DST edge cases. Mitigate with a property-based test across timezones.
- **Acceptance criteria:** A weekly series across a DST change keeps the local time. Editing "this and following" works. Conflicts are rejected.

### E-03: Insurance claims through a clearinghouse
- **Current limitation:** Claim submission and status are simulated. The edge function persists fabricated "80% approved" adjudications (FUNC-09, EDGE-10).
- **Proposed improvement:** Real 837P/837I submission and 835/277 ingestion through a clearinghouse API, with a claim state machine.
- **Expected benefit:** Real revenue-cycle management and an end to fabricated financial records.
- **Technical approach:** Extend `lib/edi837.builder.ts`. Add an edge function with a vendor credential (server-side). Add webhook ingestion and claim status tables with audit.
- **Dependencies:** S1-01 billing RPCs, vendor contract and BAA.
- **Complexity:** L.
- **Risks:** Vendor certification lead time. Mitigate by keeping the feature flagged off until certified.
- **Acceptance criteria:** No simulated adjudication code remains, and a sandbox claim round-trip is reflected in the claim status.

### E-04: Purchase-order receiving that updates stock
- **Current limitation:** Receiving a purchase order changes neither stock nor `received_quantity` (FUNC-22).
- **Proposed improvement:** Partial and complete receiving with lot and expiry capture.
- **Expected benefit:** Accurate inventory, plus the expiry tracking that safe dispensing needs.
- **Technical approach:** A `receive_purchase_order(po_id, lines[])` RPC that atomically updates `medications.current_stock` and inserts a stock ledger row.
- **Dependencies:** S1-01.
- **Complexity:** S.
- **Risks:** Concurrent dispensing. The atomic updates from S1-01 cover this.
- **Acceptance criteria:** After receiving, stock equals the prior stock plus the received quantity, and the ledger reconciles.

### E-05: Production-grade telemedicine
- **Current limitation:** WebRTC runs STUN-only with a one-shot offer, and the UI shows "connected" too early (FUNC-24). Session notes and prescriptions are not persisted (CLIN-21). The edge function trusts body identity (EDGE-06). The recordings bucket is unscoped (SECF-24).
- **Proposed improvement:** A managed video provider or a TURN-backed mesh, with session notes and e-prescribing persisted to the encounter.
- **Expected benefit:** Reliable remote consultations across NATs and firewalls.
- **Technical approach:** Integrate a HIPAA-eligible provider (Twilio Video is referenced in code, so confirm its availability and BAA) through server-minted tokens. Use the existing consultation model for notes. Prescriptions go through the S0-07 CDS path.
- **Dependencies:** S0-06, S0-07, S2-08.
- **Complexity:** L.
- **Risks:** Vendor lock-in and recording consent. Pair with E-17.
- **Acceptance criteria:** Sessions connect behind symmetric NAT, notes appear on the encounter, and a telehealth prescription passes CDS.

### E-06: Live operational dashboards from SQL
- **Current limitation:** Admin, monitoring and workflow dashboards show hardcoded or simulated figures (FUNC-18). Reports are truncated at 1,000 rows (FUNC-28, PERF-07).
- **Proposed improvement:** SQL views or RPCs for each KPI (census, TAT, revenue, queue times), refreshed through realtime or a short cache.
- **Expected benefit:** Trustworthy operational decisions.
- **Technical approach:** Materialized views refreshed by `pg_cron`. RLS-safe SECURITY DEFINER wrappers scoped to the caller's hospital. Charts loaded lazily.
- **Dependencies:** S0-04, S3-05.
- **Complexity:** M.
- **Risks:** Expensive refresh queries. Use indexes from S2-08.
- **Acceptance criteria:** Every dashboard figure traces to a documented SQL definition, and nothing uses `Math.random` or a literal.

### E-07: Account and profile self-service
- **Current limitation:** Change Password does nothing, there is no profile editing, and mandatory-2FA roles can disable 2FA (FUNC-26).
- **Proposed improvement:** A profile page with re-authentication for sensitive changes, MFA factor management and session listing.
- **Expected benefit:** Fewer admin tickets and better account security.
- **Technical approach:** Supabase Auth `updateUser` with reauthentication, plus MFA APIs (S0-10).
- **Dependencies:** S0-10, S5-04.
- **Complexity:** S.
- **Risks:** None significant.
- **Acceptance criteria:** A password change requires the current password. Admins and doctors cannot remove their last MFA factor.

### E-08: Duplicate-patient detection (lightweight MPI)
- **Current limitation:** Staff registration has no duplicate detection or DOB plausibility check, and there are three registration implementations (FUNC-27).
- **Proposed improvement:** Probabilistic matching on name, DOB, phone and identifiers before create, with a merge workflow.
- **Expected benefit:** Fewer split records, which is a known patient-safety and billing hazard.
- **Technical approach:** `pg_trgm` similarity plus exact identifier match inside a `find_potential_duplicates` RPC. Merge goes through an audited RPC. Consolidate to one registration form.
- **Dependencies:** S1-03, S2-02.
- **Complexity:** M.
- **Risks:** False merges. Require two-person approval to merge.
- **Acceptance criteria:** Registering an existing patient with a misspelled name surfaces the match before save.

### E-09: Patient-portal release rules
- **Current limitation:** The portal shows all prescription and appointment statuses, while CONTEXT.md limits it to dispensed and finalized items (FUNC-30).
- **Proposed improvement:** Configurable release rules, for example an optional embargo on sensitive results until a clinician releases them.
- **Expected benefit:** Compliance with the glossary and fewer confusing or premature disclosures.
- **Technical approach:** Encode the rules in RLS patient policies and portal views, not in UI filters.
- **Dependencies:** S0-04.
- **Complexity:** S.
- **Risks:** Information-blocking rules (21st Century Cures Act). Document the exceptions.
- **Acceptance criteria:** Patient REST queries return only released items.

### E-10: Governed AI clinical assistance
- **Current limitation:** AI features are simulated (keyword rules, fixed or random confidences) and feed directly into the record (CLIN-18). Real calls would run in the browser with exposed keys (SECF-03).
- **Proposed improvement:** A server-side AI gateway with a BAA vendor, prompt and response logging (PHI-minimized), explicit "suggestion" UX, clinician accept/reject, and evaluation datasets.
- **Expected benefit:** Safe, auditable decision support.
- **Technical approach:** An edge-function gateway (`ai-clinical-support` already exists but cannot boot, EDGE-18). Store suggestions in a separate table, never written directly into consultation fields. Rate-limit and cost-cap per hospital.
- **Dependencies:** S0-09, S2-07, and a clinical safety case.
- **Complexity:** L.
- **Risks:** Hallucination and over-reliance. Mitigate with human-in-the-loop and monitoring of the acceptance rate.
- **Acceptance criteria:** No AI output enters the record without explicit clinician acceptance, and no simulated confidences remain.

### E-11: Immutable addenda and electronic signature
- **Current limitation:** The "immutable signed addendum" is a mutable text append (CLIN-22).
- **Proposed improvement:** An append-only `clinical_note_addenda` table with signer, timestamp and content hash. Finalized notes are locked by a trigger.
- **Expected benefit:** Medico-legal integrity.
- **Technical approach:** An immutability trigger (the same pattern as audit logs). Sign by re-authenticating at AAL2.
- **Dependencies:** S0-10, S1-05.
- **Complexity:** M.
- **Risks:** None significant.
- **Acceptance criteria:** UPDATE or DELETE on a finalized note or addendum fails, and each addendum shows signer and time.

### E-12: Complete ICD-10 catalogue and search
- **Current limitation:** The catalogue is a 69-code seed, and search breaks on punctuation (CLIN-23).
- **Proposed improvement:** Load the full ICD-10-CM (or the WHO ICD-10, depending on market) with yearly updates and full-text search.
- **Expected benefit:** Accurate coding for billing and analytics.
- **Technical approach:** A reference table loaded by a script. `tsvector` plus trigram search. Version the code set by year.
- **Dependencies:** S0-01.
- **Complexity:** M.
- **Risks:** Licensing differs by market. Confirm before loading.
- **Acceptance criteria:** Searching "E11.9" or "type 2 diabetes" returns the correct code.

### E-13: Role onboarding and in-app guidance
- **Current limitation:** First-run guidance exists only for admin (UX-14).
- **Proposed improvement:** Role-specific first-run tours and contextual help for critical workflows (prescribing, dispensing, discharge).
- **Expected benefit:** Faster adoption and fewer workflow errors.
- **Technical approach:** A lightweight tour component, with completion state stored per user.
- **Dependencies:** S3-02 (accessible components).
- **Complexity:** M.
- **Risks:** None significant.
- **Acceptance criteria:** Each role sees a dismissible tour on first login, and the tours are keyboard-accessible.

### E-14: Domain vocabulary alignment
- **Current limitation:** CONTEXT.md queue statuses differ from the code and the database (FUNC-32).
- **Proposed improvement:** One generated enum shared by the database, TypeScript and the glossary.
- **Expected benefit:** Fewer status-mapping bugs (compare CLIN-17).
- **Technical approach:** Use Postgres enums as the source and generate TypeScript types from them. Update CONTEXT.md through the `/domain-modeling` workflow.
- **Dependencies:** S0-01.
- **Complexity:** S.
- **Risks:** None significant.
- **Acceptance criteria:** The glossary statuses equal the enum values, and a CI check enforces it.

### E-15: Online patient payments with server-side confirmation
- **Current limitation:** `src/utils/paymentService.ts:1-16` uses a mock Stripe object. Online payments are not implemented (FUNCTIONAL_AUDIT §2).
- **Proposed improvement:** Stripe PaymentIntents (or a regional processor that supports INR) with webhook-confirmed recording.
- **Expected benefit:** Real patient self-pay and reconciliation.
- **Technical approach:** An edge function creates the PaymentIntent. A webhook verifies the signature and calls the `record_payment` RPC with an idempotency key (S1-01).
- **Dependencies:** S1-01, S5-01.
- **Complexity:** M.
- **Risks:** PCI scope. Keep card data in Stripe Elements only.
- **Acceptance criteria:** A payment is recorded only after a verified webhook, and replayed webhooks do not double-record.

## Optional enhancements

### E-16: Break-glass emergency access
- **Current limitation:** `src/hooks/useBreakGlassOverride.ts` (270 lines) exists but is excluded from type-checking and has no UI importer.
- **Proposed improvement:** Time-boxed emergency access to a patient outside the user's normal scope, with a mandatory reason and real-time notification to privacy officers.
- **Expected benefit:** Clinical access in emergencies without weakening the default RLS.
- **Technical approach:** A `break_glass_grants` table checked by the RLS helpers, with expiry and an audit trigger.
- **Dependencies:** S0-04, S1-05.
- **Complexity:** M.
- **Risks:** Abuse. Mitigate with alerting (E-24).
- **Acceptance criteria:** A grant expires automatically, and every grant and access is audited and alerted.

### E-17: Consent management
- **Current limitation:** `ConsentForm` is used only inside `DigitalCheckinWorkflow`. There is no consent registry.
- **Proposed improvement:** A consent registry (treatment, telehealth recording, data sharing, research) with versioned templates and withdrawal.
- **Expected benefit:** Compliance, and an enabler for E-05 recordings and E-18 sharing.
- **Technical approach:** `consents` table plus RLS, checked by the features that need consent.
- **Dependencies:** S0-04.
- **Complexity:** M.
- **Risks:** None significant.
- **Acceptance criteria:** Telehealth recording is blocked without recorded consent.

### E-18: Standards-based interoperability (SMART on FHIR, HL7 v2)
- **Current limitation:** `fhir-integration` hand-rolls SMART scopes from `user_metadata` (EDGE-01).
- **Proposed improvement:** A proper authorization server (OAuth2/SMART), FHIR R4 read/write for core resources, and an HL7 v2 ADT/ORU interface for lab equipment (see `docs/integrations/`).
- **Expected benefit:** Integration with labs, HIEs and payers.
- **Technical approach:** Use a FHIR server or an Aidbox/HAPI facade over the reconciled schema, with Supabase Auth as the identity provider.
- **Dependencies:** S0-05, S5-01.
- **Complexity:** L.
- **Risks:** Scope creep. Start with Patient, Encounter and Observation.
- **Acceptance criteria:** Passes the Inferno SMART App Launch test suite for the chosen scope.

### E-19: Secure offline mode for wards
- **Current limitation:** Offline nurse data sits in plaintext `localStorage` and is exported as unencrypted JSON (SECF-06).
- **Proposed improvement:** An encrypted IndexedDB queue (WebCrypto, key derived per session) with conflict resolution and purge on logout.
- **Expected benefit:** Charting continues through network blips without PHI exposure.
- **Technical approach:** Use `idb` (already installed). Synchronize through idempotent RPCs.
- **Dependencies:** S1-01, S0-09.
- **Complexity:** L.
- **Risks:** Key management on shared devices.
- **Acceptance criteria:** No plaintext PHI remains in browser storage, and offline entries sync exactly once.

### E-20: De-identified analytics store
- **Current limitation:** Analytics run on live tables client-side, truncated at 1,000 rows (PERF-07).
- **Proposed improvement:** Nightly ELT into a de-identified analytics schema or warehouse.
- **Expected benefit:** Population health and operational analytics without PHI exposure or load on OLTP.
- **Technical approach:** A `pg_cron` export or logical replication to a separate project, with tokenized identifiers.
- **Dependencies:** S0-01, S5-02.
- **Complexity:** L.
- **Risks:** Re-identification. Apply k-anonymity checks.
- **Acceptance criteria:** Analytics queries touch no PHI columns.

### E-21: Feature flags and progressive delivery
- **Current limitation:** `useFeatureFlags` reads a `feature_flags` table. Rollout is per route only.
- **Proposed improvement:** Per-hospital and per-role flags with kill switches for risky features (AI, telehealth, payments).
- **Expected benefit:** Safer releases.
- **Technical approach:** Extend the table with a scope, cache it with React Query, and enforce server-side for edge functions.
- **Dependencies:** S5-01.
- **Complexity:** S.
- **Risks:** Flag debt. Expire flags.
- **Acceptance criteria:** Disabling a flag hides the UI and rejects the server-side calls.

### E-22: Internationalization and multi-currency
- **Current limitation:** Strings are hardcoded, and the app mixes ₹ and $ and date locales (UX-12, FUNC-29).
- **Proposed improvement:** i18n framework and per-hospital locale and currency.
- **Expected benefit:** A multi-market product.
- **Technical approach:** `react-i18next` and `Intl` formatting, with the currency stored on `hospitals`.
- **Dependencies:** S3-04.
- **Complexity:** M.
- **Risks:** Translation quality for clinical terms.
- **Acceptance criteria:** No hardcoded currency symbols remain in `src/`.

### E-23: Automated dependency updates, SBOM and provenance
- **Current limitation:** 42 advisories, no update automation, and unpinned actions (OPS-19, OPS-12).
- **Proposed improvement:** Renovate, CycloneDX SBOM per build and SLSA provenance.
- **Expected benefit:** Supply-chain hygiene and audit evidence.
- **Technical approach:** A Renovate config with grouping, `@cyclonedx/cyclonedx-npm` in CI, and pinned actions.
- **Dependencies:** S1-07.
- **Complexity:** S.
- **Risks:** Update noise. Group updates and auto-merge patches only.
- **Acceptance criteria:** Weekly update PRs, and an SBOM artifact for each release.

### E-24: Clinical audit analytics and anomaly alerts
- **Current limitation:** The audit trail can be forged and is not monitored (DB-08). There is no lockout or anomaly detection (SECF-15).
- **Proposed improvement:** Alerts on unusual PHI access, such as VIP records, bulk exports, after-hours access and break-glass use.
- **Expected benefit:** Detection of insider misuse, which HIPAA expects.
- **Technical approach:** Scheduled SQL rules over immutable audit logs (S1-05), with notifications to privacy officers.
- **Dependencies:** S1-05, E-16.
- **Complexity:** M.
- **Risks:** Alert fatigue. Tune the thresholds.
- **Acceptance criteria:** A synthetic bulk-access scenario triggers an alert within 5 minutes.
