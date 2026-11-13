# ADR-0013: Bedside Offline-First Queue with Fail-Closed Critical Action Gating

## Status

Accepted

## Context

Hospital ward rounds and mobile nursing intake frequently encounter intermittent Wi-Fi connectivity dead zones across clinical facilities. In pure web applications, network drops cause vital sign submissions and bedside nursing notes to fail abruptly, tempting clinical staff to resort to manual paper charts. This introduces transcription delays and delays automated Early Warning Score (NEWS2/PEWS) alerts.

However, clinical safety regulations (HIPAA, FDA CDS guidelines) strictly prohibit uncontrolled offline medication dispensing or discharge clearances, which could produce dangerous split-brain clinical states or unverified drug-drug interactions.

## Decision

CareHarmony HIMS establishes a partitioned offline-first synchronization architecture:

1. **Optimistic Local Queue for Routine Clinical Records**:
   - Nurse intake vitals and routine progress notes persist to an encrypted local IndexedDB store (`src/modules/offline-store`) when the browser detects offline status.
   - Each record captures both `client_recorded_at` (device timestamp with timezone) and `server_received_at` upon reconnection replay.
   - Automated replay occurs transparently via service worker background sync upon network restoration, running standard schema validation and database trigger calculations.
2. **Fail-Closed Gating for Critical Clinical & Financial Actions**:
   - High-risk operations are strictly disabled in offline mode:
     - Pharmacist prescription dispensing and approvals (ADR-0004).
     - STAT Emergency Floor Stock Overrides (ADR-0006).
     - Initiation or clearance of discharge pipeline orders (ADR-0003, ADR-0014).
     - Billing invoice generation and copayment processing (ADR-0002).
   - The UI surfaces a persistent warning banner indicating degraded network mode and requiring active connection for critical workflows.

## Consequences

- Bedside documentation remains uninterrupted during transient ward network drops.
- Eliminates duplicate paper transcription errors.
- Guarantees zero compromise of clinical safety checks, drug-drug interaction alerts, or financial ledger consistency.
