# ADR-0008: Two-Tier Identity Verification for Patient Portal

## Status

Accepted

## Context

The system supports self-service patient onboarding via the `register-patient` edge function and patient portal. However, healthcare compliance (HIPAA/GDPR) strictly dictates that unverified external users must never be granted unrestricted access to Protected Health Information (PHI), historical clinical notes, or diagnostic lab reports simply by submitting matching demographic data (e.g., national ID or telephone number) online.

Granting immediate full access upon self-registration introduces severe privacy violation risks and credential spoofing.

## Decision

1. **Two-Tier Portal Access Model**:
   - **Tier 1 (Unverified / Self-Registered)**:
     - Can log into the Patient Portal.
     - Can view, book, reschedule, or cancel future outpatient appointments.
     - Can view hospital facility information, clinic timings, and physician directories.
     - Clinical notes, diagnostic lab results, and active prescription lists are masked/locked.
   - **Tier 2 (Verified In-Person / Two-Factor Staff Authenticated)**:
     - Unlocks full access to historical EHR notes, diagnostic lab reports, and medication histories.
2. **Verification Mechanism**:
   - Identity verification occurs at the hospital reception or clinic via physical photo ID verification, or via an authorized staff member using an out-of-band verified OTP challenge.
   - Hospital staff marks `profiles.is_identity_verified = true` with the verifying staff user ID and timestamp recorded in the audit log.

## Consequences

- **Positive**: Eliminates data leakage and identity spoofing of sensitive medical histories.
- **Positive**: Allows frictionless appointment booking for new patients without compromising regulatory compliance.
- **Negative**: Requires patient to complete verification before viewing lab results online.
