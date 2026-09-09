# 0004: Strict Pharmacist-Gated Prescription Dispensing

## Context
In hospital information systems, medication dispensing errors are a major source of adverse drug events. System designs often face a choice between allowing rapid direct dispensing (such as in emergency rooms) or requiring formal clinical pharmacist review prior to drug release.

## Decision
The prescription approval lifecycle strictly requires pharmacist verification:
initiated ➔ pending_approval ➔ pproved ➔ dispensed ➔ completed.
Direct transition from pending_approval or initiated to dispensed is rejected at the database CHECK constraint, the edge function authorization layer, and the service layer. Only users holding the pharmacist role can transition an order to pproved.

## Consequences
- Every dispensed medication undergoes automated and clinical allergy, dosage appropriateness, and drug-drug interaction verification.
- Dispensation without pharmacist verification is structurally prevented by database constraints and RLS.
