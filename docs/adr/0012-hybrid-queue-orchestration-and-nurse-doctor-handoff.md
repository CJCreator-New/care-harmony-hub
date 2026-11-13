# ADR-0012: Hybrid Queue Orchestration and Nurse-Doctor Handoff

## Status

Accepted

## Context

In outpatient departments (OPD) and emergency triage units, patients registered at the reception desk enter the `patient_queue` table. Under heavy patient volume, strict single-doctor routing by triage nurses creates severe clinical bottlenecks when assigned doctors are occupied with complex consultations. Conversely, unstructured, unassigned queues introduce race conditions where multiple physicians attempt to open and document against the same patient chart simultaneously.

## Decision

CareHarmony HIMS implements a hybrid queue orchestration model:

1. **Dual Routing Mechanism**:
   - **Doctor Pull (Self-Claim)**: Any on-duty physician authenticated in a clinical department can view the prioritized department pool and claim the next waiting patient.
   - **Nurse Push (Direct Assignment)**: Triage nurses can explicitly assign high-acuity or specialist-bound patients directly to a designated doctor or examination room during vitals intake.
2. **Atomic Concurrency Control**:
   - Claiming a patient executes an atomic database operation (`SELECT FOR UPDATE` or atomic RPC) updating `status = 'in_consultation'` with `claimed_by_doctor_id` and timestamp, instantly removing the patient from other physicians' claimable views.
3. **Emergency Priority Pinning**:
   - Patients flagged with triage acuity category Red/Immediate or utilizing the Emergency Triage Bypass (ADR-0006) remain pinned at the top of the queue across all department views with audible/visual in-session indicators.

## Consequences

- Eliminates room handoff delays and unblocks outpatient consultation throughput.
- Completely prevents duplicate chart lockouts and race conditions.
- Preserves full clinical audit traceability for patient handoffs under PostgreSQL RLS.
