# 03: S0-08 Restore critical-lab escalation

Status: ready-for-human
Type: task
Roadmap: S0-08 (docs/repository-audit/IMPLEMENTATION_ROADMAP.md)
Issues: EDGE-03, CLIN-10, A11Y-06
Depends on: S0-01 (live schema baseline)

## Done (2026-11-05, agents; branch `ccr-2602d823-jeymkf`, not merged)

### Interim safeguard (works without the server fix)
- [x] `CriticalResultSafeguardBanner` on every dashboard page: critical `lab_orders` without a recorded read-back, polled every 30 s, cannot be dismissed. Audience widens at 5 min (all doctors/nurses), ED instruction at 10 min. Fails closed on missing timestamps; shows "safeguard unavailable" on load error.
- [x] Clinician receipt goes to `activity_logs` (hides it for that clinician only).
- [x] Telephone SOP: `docs/operations/CRITICAL_RESULT_ESCALATION_SOP.md`. **Needs sign-off by the lab lead and Medical Director before use.**
- [x] A11Y-06: role=alert/status on lab critical banners, NEWS2 alerts (sidebar and consultation page) and nurse predictive alerts.

### Server-side fix (code only)
- [x] `critical-lab-check` rewritten: lab_order_id + per-analyte values, server-side grading (hospital ranges, then built-in defaults), fail-closed `review_required`, one open alert per order, idempotent acknowledge, a worker authenticated by a shared secret or the service-role key only (constant-time compare), claimed rows, honest dispatched/retry/failed status, in-app notifications, an SMS/pager webhook hook (a no-op until configured; no PHI in the message).
- [x] `LaboratoryPage` uses the new contract. It no longer claims "protocol initiated" or sets `critical_notified` unless the function confirms; failures tell the tech to phone.
- [x] Migration `supabase/pending-migrations/20261105000001_critical_lab_escalation_queue.sql`: idempotent, replaces the recursive RLS, adds `on_call_schedule`, an append-only event audit table, and a pg_cron + pg_net schedule using Vault secrets (no-op if absent). Applied twice cleanly on local PostgreSQL 16 in two scenarios; replay tool 3/3.
- [x] 66 unit tests (grading, ladder, retry, worker auth, request validation, client).

## Remaining

- [ ] After S0-01: replay the migration on the baseline, move it to `supabase/migrations/`, apply, regenerate `types.ts`.
- [ ] Secrets: function secret `CRITICAL_LAB_WORKER_SECRET` (≥32 chars); Vault `critical_lab_worker_url`, `critical_lab_worker_secret` (+ `critical_lab_worker_gateway_key` while `verify_jwt = true`). See `supabase/pending-migrations/README.md`.
- [ ] Enable pg_cron and pg_net; re-run the migration so the job is scheduled.
- [ ] Fill `on_call_schedule` for each hospital.
- [ ] Connect an SMS/pager provider under a BAA (`CRITICAL_LAB_PAGER_WEBHOOK_URL` / `_TOKEN`).
- [ ] Staging drill: K+ 6.9, no ack → on-call at ~5 min, ED at ~10 min, then ack cancels; write the integration test against the real function.
- [ ] **Deployment order:** the rewritten edge function expects the new schema. If the branch reaches `main` (Lovable deploys functions) before the migration is applied, alert creation will fail; the lab screen then shows a "phone the clinician" error and the interim banner still works. Prefer: apply the migration first, or deploy the function after it.
- [ ] Follow-up: `useCriticalLabEscalation` filters alerts by auth user id while `primary_doctor_id` holds a profile id, so the doctor's alert list is probably empty.
- [ ] Follow-up: `tier4_2_4_lab_workflows.sql` seed rows use wrong LOINC codes (potassium `2757-9`; troponin `1975-2` is total bilirubin).
