# Agent Guidelines

## Agent skills

### Issue tracker

Issues and specs are tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository layout (`CONTEXT.md` and `docs/adr/` at the root). See `docs/agents/domain.md`.

### Architecture boundaries

Modules under `src/modules/` are deep modules: see [src/modules/README.md](src/modules/README.md) before adding or importing one.
