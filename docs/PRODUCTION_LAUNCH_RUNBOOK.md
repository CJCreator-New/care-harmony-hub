# Production Launch Runbook

## Environments

- Local: mock auth allowed, seeded test data allowed, developer diagnostics enabled
- CI: deterministic test mode, no production secrets, release gates enforced
- Staging: production-like Supabase project, real role matrix, rollout rehearsal only
- Production: no test auth shortcuts, feature flags controlled, audited deployment path only

## Mandatory Dashboards

- auth failures
- frontend route errors
- Supabase edge function failures
- RLS-denied spikes
- prescription approval latency
- lab critical-value latency
- billing workflow failures
- notification backlog depth

## Rollout Sequence

1. Internal staff validation
2. Limited hospital cohort
3. Wider cohort
4. Full release

Each phase requires:

- healthy `/health`, `/ready`, and metrics signals
- successful smoke validation for admin, doctor, nurse, receptionist, pharmacist, lab technician, and patient where applicable
- no active Sev1 or Sev2 auth/RLS regression

## Rollback Triggers

- login or role-selection failures affecting multiple users
- cross-hospital data exposure or suspected RLS regression
- audit write failures on critical workflows
- lab critical alert delays
- failed billing adjustments or prescription approvals after release

## Immediate Response Playbooks

- Auth outage: freeze rollout, verify Supabase auth health, validate session persistence, disable newly exposed routes if needed
- RLS regression: stop rollout, compare latest migration and edge-function auth changes, run security suite, revert migration/function deployment
- Background workflow failure: inspect edge-function logs, queue depth, retry backlog, and notification dispatch state
- Audit failure: treat as compliance incident, disable affected writes if audit cannot be guaranteed
