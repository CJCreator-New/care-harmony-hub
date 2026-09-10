# CareSync HIMS — Complete the Comprehensive Audit

All seven investigations have now reported back. Every finding below was confirmed by reading the actual files (and, for the database, by querying the live backend), so the remaining work is assembling and writing the report — no further guesswork.

## What gets produced

A single new document, `docs/AUDIT_2026-09.md`, with the 12 requested sections:

1. Audit consolidation and documentation integrity
2. RBAC and permission systems
3. Backend function authentication and tenant scoping
4. Clinical safety (dosing, interactions, allergies, critical labs)
5. Lab and discharge workflows
6. Security and HIPAA
7. Database and access rules
8. Testing
9. Build and release pipeline
10. Performance and reliability
11. Workflow interconnections
12. Prioritised recommendations

Each finding carries an ID, severity, exact file and line references, and a tag of VERIFIED, DISCREPANCY, or NEW.

Two supporting edits:
- Replace `docs/COMPREHENSIVE_AUDIT_REPORT.md` with a short notice pointing at the new report, because the old one cites backend functions and audit documents that no longer exist.
- Update `docs/INDEX.md` to list the new report.

## Headline findings the report will carry

**Highest severity, confirmed:**
- Deactivated staff still pass every hospital access check — the hardening migration exists in the code but is not live in the database.
- Anyone can pass a self-generated code to the 2FA check function and be told it is valid; the check never identifies the caller or reads their stored secret.
- Turning on 2FA never verifies the code at all — any six digits enables it.
- Low-stock and appointment-reminder functions read every hospital's data, not just the caller's.
- A doctor can mark their own prescription dispensed, skipping pharmacist approval and interaction checks entirely.
- Discharge records can be set straight to "completed" from the client, skipping pharmacy and billing steps.
- Penicillin-allergic patients get no warning when prescribed a cephalosporin.
- Two different critical-lab checks disagree, and one silently treats unrecognised tests as normal.
- Prescription approval has no concurrency guard, so two staff acting at once can clobber each other.
- Real AI provider keys are read from browser-visible settings and would ship inside the app bundle.

**Also confirmed:** four parallel permission systems that disagree (admin is unlimited in the enforced one), unlisted pages default to allowed in the route guard, broken rate limits on 2FA and backup-code endpoints, 28 test files that assert nothing, one test suite family that cannot even load, an audit trail with no source address, and per-record decryption round trips that will make patient and prescription lists slow.

## Technical notes

- Findings are drawn from the seven completed investigations, each grounded in file/line reads: RBAC (14 findings), backend functions (17), clinical safety (24), database rules, testing/CI, security/performance (17), and workflow interconnections (7).
- The report will explicitly separate live-database state from repository state, since the newest access-control migration is committed but unapplied.
- No production code, migrations, or configuration change in this step. Remediation is proposed as a prioritised list; fixes come as a separate approved piece of work.
- The 45 entries under the backend functions folder include shared code and config, so the effective function count is 41 deployable functions, not 43 — that discrepancy is itself reported.

## Out of scope for this step

Fixing anything. The report ends with a recommended fix order so the critical items (deactivated-staff access, 2FA bypass, cross-hospital reads, dispense bypass, allergy cross-reactivity) can be scheduled first.
