# ADR-0009: Decoupled Consultation Encounters and Formal Discharge Orders

## Status

Accepted

## Context

In inpatient and emergency hospital workflows, physicians conduct multiple daily clinical consultations, ward rounds, and progress notes on an admitted patient. In some legacy systems, completing a clinical encounter or signing notes inadvertently flags the patient for discharge, leading to premature administrative or financial release.

The system needs an unambiguous architectural separation between daily clinical documentation and the formal multi-stage discharge process.

## Decision

1. **Encounter Separation**:
   - Completing a Consultation encounter records diagnoses, orders labs/medications, and saves progress notes. It marks only the specific clinical session as completed (`consultations.status = 'completed'`).
   - Routine consultation completion does not alter the patient's admission state or initiate the discharge workflow.
2. **Physician-Initiated Discharge Order**:
   - Initiating discharge requires an explicit, separate clinical order: a `Discharge Order` signed by the attending physician.
   - Submitting the Discharge Order triggers Stage 1 of the sequential 4-stage discharge pipeline (ADR-0003: Doctor ➔ Pharmacist ➔ Billing ➔ Nurse ➔ Completed).
3. **Discharge Preconditions**:
   - The Discharge Order UI verifies that no critical lab alerts are pending acknowledgment and no STAT medication orders are unfulfilled before permitting submission.

## Consequences

- **Positive**: Eliminates premature patient discharge and accidental ward bed release.
- **Positive**: Preserves clean distinction between documentation of continuous inpatient care and final discharge clearance.
- **Negative**: Adds an explicit order action for physicians prior to patient departure.
