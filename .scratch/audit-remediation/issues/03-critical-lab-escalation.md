# 03: CLIN-002 - Implement Durable Critical Lab Alert Escalation Queue & Worker

Status: resolved
Type: task
Blocked by: none

## Context
- **Finding ID**: CLIN-002 (Critical / Clinical Safety / Joint Commission National Patient Safety Goals)
- **File**: `supabase/functions/critical-lab-check/index.ts`, `supabase/migrations/`
- **Description**: `scheduleEscalation()` in `critical-lab-check` is a non-functional `console.log()` stub. When a life-threatening panic lab result is recorded, if the primary ordering physician is offline or misses the in-app WebSocket alert, no escalation to the on-call physician (5 min) or emergency department supervisor (10 min) occurs.

## Technical Requirements
1. Deploy table `lab_alert_escalations` in PostgreSQL with columns: `id`, `alert_id`, `hospital_id`, `ordering_doctor_id`, `patient_id`, `test_name`, `value`, `escalation_level` (1=primary, 2=on-call, 3=ER), `status` ('pending', 'acknowledged', 'escalated', 'expired'), `due_at`, `created_at`, `updated_at`.
2. Refactor `critical-lab-check` to persist initial escalation records into `lab_alert_escalations` upon critical alert creation.
3. Implement an escalation worker function (or pg_cron job) executing every minute:
   - Queries `lab_alert_escalations` where `status = 'pending' AND due_at <= NOW()`.
   - If not acknowledged, transitions to next escalation level (dispatches SMS/pager via Twilio / SendGrid mock).
   - Marks previous tier as `'escalated'`.
4. Provide an API endpoint for doctors to acknowledge alerts, transitioning status to `'acknowledged'`.

## Acceptance Criteria
- [x] **AC-1 (Escalation Queue Insertion)**:
  - **Given** a panic lab result (e.g., Potassium 6.9 mmol/L)
  - **When** `critical-lab-check` executes
  - **Then** a row is inserted into `lab_alert_escalations` with `escalation_level = 1`, `due_at = NOW() + INTERVAL '5 minutes'`, and `status = 'pending'`.
- [x] **AC-2 (Doctor Acknowledgment Halts Escalation)**:
  - **Given** an unacknowledged critical alert in `lab_alert_escalations`
  - **When** the primary doctor calls the acknowledgment API within 5 minutes
  - **Then** the record status updates to `'acknowledged'`
  - **And** no secondary or tertiary escalation notifications are dispatched.
- [x] **AC-3 (Durable Escalation on Timeout)**:
  - **Given** an unacknowledged alert where `due_at <= NOW()`
  - **When** the escalation runner executes
  - **Then** a Level 2 escalation alert is logged and sent to the hospital's on-call physician
  - **And** a Level 3 queue entry is scheduled for +5 minutes (Level 3 ER Supervisor).
- [x] **AC-4 (Hospital Scoping)**:
  - **Given** alerts across multiple hospitals
  - **When** the worker processes escalations
  - **Then** each alert is routed strictly to the on-call staff configured for that specific `hospital_id`.

## Answer
- **Implementation**: In `supabase/functions/critical-lab-check/index.ts`, implemented `scheduleEscalation()` writing durable rows to `lab_alert_escalations`. Added `action: 'acknowledge'` handler to halt escalations and update status to acknowledged. Added `action: 'process_escalations'` worker runner to process due escalations and schedule subsequent tiers. All actions scoped strictly to `actor.hospitalId`.
- **Verification**: Verified via `tests/security/p0-audit-remediation.test.ts`.
