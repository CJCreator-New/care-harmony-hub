# ADR-0006: Emergency Floor Stock Override and STAT Medication Flow

## Status

Accepted

## Context

Under ADR-0004, the hospital information system enforces strict pharmacist-gated prescription dispensing (`initiated` ➔ `pending_approval` ➔ `approved` ➔ `dispensed`). While critical for normal clinical pharmacy and drug safety checks, applying this unconditionally in Emergency Department (ED) resuscitation, Operating Theatres (OT), or Intensive Care Units (ICU) creates dangerous clinical delays when an on-duty pharmacist is physically unavailable or reviewing high-volume queues.

The system requires an escape hatch for STAT emergency medications that balances immediate patient safety with rigorous regulatory accountability, drug tracking, and retrospective reconciliation.

## Decision

1. **Emergency Floor Stock Distinction**:
   - High-alert and emergency medications maintained in designated floor carts/Pyxis units can be marked in the medication catalog as eligible for `EMERGENCY_OVERRIDE`.
2. **Clinical Role Privilege**:
   - Licensed Doctors and ER Triage Nurses are granted the authority to execute an `Emergency Floor Stock Administration`.
3. **Mandatory Audit Exception**:
   - When executed, the system logs an immutable audit event (`logAudit`) with:
     - `patient_id`
     - `administering_user_id`
     - `medication_id` and dosage administered
     - `clinical_justification` (free-text rationale required, minimum 15 characters)
     - Timestamp
4. **Retrospective Pharmacist Reconciliation**:
   - An override creates a high-priority task in the Pharmacist queue categorized under `retrospective_reconciliation`.
   - The pharmacist must review, confirm, or flag the emergency order within 2 hours of administration.
   - Failure to reconcile within 2 hours triggers an escalation alert to the Chief Medical Officer and Pharmacy Director.

## Consequences

- **Positive**: Prevents clinical delays during life-threatening resuscitation events while maintaining fail-closed safety for routine outpatient/inpatient dispensing.
- **Positive**: Maintains an unbroken chain of custody and full HIPAA/regulatory audit trail.
- **Negative**: Adds a retrospective verification step to the pharmacist's workload.
