# ADR-0010: Persistent In-Session Critical Lab Result Alerts and Escalation

## Status

Accepted

## Context

When a laboratory assay produces panic or critical values (e.g., severe hypokalemia, acute cardiac troponin elevation), rapid physician notification is a vital safety requirement. While automated background SMS/pager dispatch exists, physicians logged into the web portal may not see a critical notification if it arrives in a standard notification toast that easily auto-dismisses.

## Decision

1. **Multi-Channel Escalation Mechanism**:
   - When a lab result with `is_critical = true` is committed by a Lab Technician:
     - The background `critical-lab-escalation` queue starts a 5-minute timer for primary doctor acknowledgment, followed by on-call escalation (5 min) and emergency department escalation (10 min).
2. **Persistent In-Session Safety Modal**:
   - The frontend application checks for unacknowledged critical alerts belonging to the physician's assigned or ordered patients via Supabase Realtime.
   - Any unacknowledged critical alert renders an unclosable, high-priority safety modal in the physician's active browser session.
   - The modal cannot be dismissed by clicking the background or pressing Escape; it requires the physician to click "Acknowledge & Sign", which records an immediate timestamped audit entry (`critical_lab_acknowledgments`).

## Consequences

- **Positive**: Guarantees zero missed critical lab values during active clinical sessions.
- **Positive**: Satisfies hospital accreditation requirements (Joint Commission / CAP) for critical value notification and signed doctor acknowledgment.
- **Negative**: Interrupts physician workflow in the portal until acknowledgment is provided.
