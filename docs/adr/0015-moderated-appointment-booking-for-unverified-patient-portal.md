# ADR-0015: Moderated Appointment Booking for Unverified Patient Portal Users

## Status

Accepted

## Context

Under ADR-0008 (Two-Tier Identity Verification for Patient Portal), self-registered patients are assigned Tier-1 access upon signing up online. This permits them to manage basic profile information while blocking access to historical medical notes, lab results, and prescriptions until verified in-person by hospital staff.

However, unconstrained direct self-scheduling on clinical calendars by unverified users introduces major vulnerabilities:

- Calendar spam and automated bot bookings blocking legitimate physician availability.
- Accidental creation of duplicate medical record numbers (MRNs) when returning patients create new online accounts with minor demographic typos.
- Inappropriate self-booking with subspecialists without required clinical triage or referral verification.

## Decision

CareHarmony HIMS implements a moderated booking workflow for unverified patient portal users:

1. **Pending Confirmation Lifecycle**:
   - Appointment requests submitted by Tier-1 (unverified) portal users are inserted into `appointments` with `status = 'pending_confirmation'`.
   - The booking reserves a temporary hold but does not lock the physician's definitive clinical calendar until confirmed.
2. **Reception Desk Triage & Reconciliation**:
   - Receptionists monitor a dedicated "Portal Requests" tab on the front-desk dashboard.
   - Staff verify patient identity against existing hospital records to prevent duplicate MRNs, confirm insurance eligibility, and either approve the requested slot or propose an alternative time.
3. **Automated Notification & Arrival Protocol**:
   - Upon receptionist approval, the status transitions to `'confirmed'`, dispatching an automated confirmation SMS/email to the patient.
   - The confirmation notice includes a required checklist instructing the patient to bring photo identification and insurance cards for physical Tier-2 verification upon arrival.

## Consequences

- Protects clinician calendars from denial-of-service spam and unverified blockages.
- Eliminates duplicate medical record numbers (MRNs) in PostgreSQL.
- Seamlessly integrates digital patient onboarding with existing front-desk intake protocols.
