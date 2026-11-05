# Remediation Map: Repository Audit (2026-11-01)

## Notes
- Originating audit: `docs/repository-audit/` (start at EXECUTIVE_SUMMARY.md). Plan: `docs/repository-audit/IMPLEMENTATION_ROADMAP.md`.
- One ticket per roadmap task, numbered in execution order. The roadmap task ID is in each ticket's title.
- This tracker supersedes `.scratch/audit-remediation/` (see IMPLEMENTATION_ROADMAP §4 for which of its tickets were reopened).

## Decisions-so-far
- 2026-11-05: [S0-01 / 01] The repository migrations cannot be repaired into a baseline. Replay is 0/64 in CLI order, and the multipass and what-if experiments keep finding new intrinsic defects. The baseline must come from a live-schema capture. Tooling and procedure: `supabase/baseline/README.md`. Evidence: `supabase/baseline/REPLAY_FINDINGS_2026-11-05.md`.

## Tickets
- [ ] [01-live-schema-baseline](issues/01-live-schema-baseline.md): S0-01 Establish ground truth: live schema capture and replayable baseline (in progress; blocked on operator capture)
