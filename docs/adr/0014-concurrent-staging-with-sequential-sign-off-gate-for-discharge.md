# ADR-0014: Concurrent Staging with Sequential Sign-Off Gate for Discharge

## Status

Accepted

## Context

Under ADR-0003, patient discharge enforces a strict 4-stage pipeline: `doctor` ➔ `pharmacist` ➔ `billing` ➔ `nurse`. In inpatient hospital operations, strictly serializing the preparation of discharge components creates severe operational bottlenecks:

- Pharmacy cannot start preparing discharge medications until the doctor signs off.
- Billing cannot assemble invoices until pharmacy has completed pricing and reconciliation.
- Nursing cannot discharge the patient until billing clears.

As a result, patients occupy inpatient beds for hours after medical clearance has been granted, limiting hospital bed turnover and emergency admission capacity.

## Decision

CareHarmony HIMS retains the strict safety guarantees of ADR-0003 while parallelizing administrative and pharmaceutical staging:

1. **Concurrent Staging Phase**:
   - As soon as the attending physician executes the clinical discharge order (`doctor` step), the discharge record transitions to `staging`.
   - Event notifications and work items are dispatched simultaneously to the Pharmacy queue (for take-home medication reconciliation) and the Receptionist/Billing queue (for itemized billing assembly and copayment collection).
   - Pharmacists and Billing personnel can review, price, and clear their respective domains in parallel.
2. **Inviolable Sequential Exit Gate**:
   - The final nursing handover and patient release step (`nurse` step) remains hard-gated by database CHECK constraints and RLS rules:
     - `nurse_release_allowed = (doctor_signed = true AND pharmacy_cleared = true AND billing_cleared = true)`
   - The nursing discharge interface disables the patient release confirmation button until both pharmacy and billing clearance locks are cryptographically verified in PostgreSQL.

## Consequences

- Reduces inpatient discharge turnaround latency by an estimated 40% to 60%.
- Maximizes inpatient bed turnover without compromising billing collection or pharmaceutical reconciliation.
- Strictly adheres to ADR-0002 (billing separation) and ADR-0003 (fail-closed discharge safety).
