# 0005: Unified Typed RBAC, Scoped Cryptography, and Fail-Closed Clinical Safety

## Context
A comprehensive security and clinical safety audit of CareSync HIMS v1.2.0 revealed critical vulnerabilities across authorization, field-level cryptography, prescribing, and critical diagnostic alerts:
1. Four divergent authorization layers (`rbac.ts`, `permissions.ts`, `abacManager.ts`, and per-role managers) led to access control bypasses (such as `PharmacistRBACManager.checkPermission()` hardcoded to `return true`).
2. The `phi-crypto` edge function acted as an unscoped decryption oracle, allowing any authenticated user to decrypt arbitrary ciphertext without record verification.
3. Allergy and drug interaction checks exhibited fail-open behavior: allergy checking failed on standard terms lacking the literal suffix `' allergy'`, and the frontend DDI hook bypassed the RxNorm edge function.
4. Critical diagnostic lab alerts relied on an unexecuted `console.log()` stub for on-call (5m) and emergency department (10m) escalation.
5. Database RLS policies permitted doctors and nurses to read financial invoices contrary to ADR-0002, and `user_belongs_to_hospital()` failed to verify active account status (`profiles.is_active = true`).

## Decision
We establish the following non-negotiable architectural and clinical safety invariants:
1. **Unified Typed RBAC & Facades**: `src/types/rbac.ts` serves as the sole TypeScript source of truth for frontend permissions, with PostgreSQL RLS as the authoritative enforcement boundary. Legacy `permissions.ts` and per-role managers (`DoctorRBACManager`, `PharmacistRBACManager`) are refactored into thin compatibility facades mapping strictly to canonical roles and permissions. Phantom `super_admin` references are eradicated.
2. **Contextually Scoped Cryptography**: `phi-crypto` decryption requires explicit `resourceType` and `resourceId`. It delegates authorization directly to PostgreSQL RLS by probing the target table with the caller's JWT Bearer token before performing AES-256-GCM decryption.
3. **Fail-Closed Clinical Decision Support (CDS)**:
   - Patient allergy strings are tokenized and normalized against clinical allergen root classes (`penicillin`, `sulfa`, `nsaid`, `cephalosporin`, etc.), preventing bypasses from variant nomenclature.
   - Prescribing drug interaction checking invokes the serverless `drug-interaction-check` engine and fails closed: network errors or unmapped high-risk drugs flag a mandatory manual pharmacist review and require explicit physician clinical override.
4. **Durable Lab Alert Escalation Queue**: Unacknowledged critical lab alerts are tracked in a dedicated PostgreSQL `lab_alert_escalations` queue table. Escalation to on-call (5 min) and ER (10 min) is managed asynchronously, with automatic cancellation triggers when the primary physician acknowledges the alert.
5. **Database Monotonic Hardening**: Migration `20260909000001` enforces `profiles.is_active = true` on `user_belongs_to_hospital()`, strips doctor and nurse roles from `invoices_hospital_billing_read`, and deploys append-only immutability triggers on `public.audit_logs`.

## Consequences
- Eliminates the arbitrary decryption oracle and cross-hospital clinical data leakage.
- Prevents fatal prescribing errors caused by allergy string-matching bypasses.
- Guarantees immediate access revocation when staff accounts are deactivated.
- Restores the strict billing boundary mandated by ADR-0002.
- Maintains full backwards compatibility for existing React components through unified facades.
