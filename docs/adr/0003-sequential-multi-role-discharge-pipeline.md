# 0003: Sequential Multi-Role Discharge Pipeline

## Context
Patient discharge in acute care facilities touches multiple clinical and administrative disciplines: the attending physician, the dispensing pharmacist, the billing cashier/receptionist, and the nursing floor. While concurrent clearance is common in outpatient setups, an inpatient release requires strict dependency guarantees (e.g., billing cannot finalize until discharge medications are reconciled; nurses cannot hand over discharge packets until billing has cleared).

## Decision
CareSync HIMS enforces a strictly sequential 4-stage discharge pipeline:
1. doctor: Initiates discharge order and clinical discharge summary.
2. pharmacist: Reviews take-home medications and reconciles active prescriptions.
3. illing: Receptionist or Admin finalizes invoices, collects remaining copays, and issues billing clearance.
4. 
urse: Conducts final physical assessment, education, prints summary, and marks completed.

Transitions are guarded by STEP_ROLE_MAP, forward transition NEXT_STEP, reverse transition PREVIOUS_STEP (for rejections), and an optimistic concurrency check .eq(current_step, currentStep).

## Consequences
- Prevents race conditions and guarantees no patient is physically released without financial and pharmacy sign-off.
- Any rejection rolls the workflow back to the preceding discipline with an auditable reason.
- Rejection/approval actions are atomic and tracked with efore_state and fter_state in the audit log.
