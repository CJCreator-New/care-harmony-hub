# ADR-0007: Pure Supabase-Native Backend & Microservice Boundary Retirement

## Status

Accepted

## Context

Initial iterations of the repository explored hybrid architectures, including standalone Node.js/Express services located under `services/` (`appointment-service`, `clinical-service`, `patient-service`). However, maintaining multiple deployment surfaces, duplicated database connection pools, divergent authentication middleware, and out-of-band network calls violated the project's core invariants established in ADR-0001 (Supabase-Native Backend) and ADR-0005 (Unified Typed RBAC).

Operating both edge functions and external services increased operational complexity, created configuration drift, and introduced bypasses to PostgreSQL Row-Level Security (RLS).

## Decision

1. **Reaffirmation of Pure Supabase Runtime**:
   - All backend APIs, scheduled routines, and background automations must be hosted exclusively as Deno-based Supabase Edge Functions in `supabase/functions/` or executed via Postgres triggers, procedures, and RLS policies.
2. **Retirement of `services/` Codebase**:
   - The untracked `services/` directory is officially retired and excluded from system runtime, CI validation, and packaging.
   - Any reusable logic remaining in `services/` must be ported into edge functions (`supabase/functions/`) or shared TypeScript modules (`src/modules/`).
3. **Fail-Closed API Access**:
   - All HTTP endpoints adhere to the unified authorization helper (`getAuthorizedActor`) and database RLS enforcement. Direct multi-service database connections using service keys outside documented edge functions are prohibited.

## Consequences

- **Positive**: Single deployment model, lower infrastructure overhead, and unified security scanning.
- **Positive**: Eradicates RLS bypass risks caused by external microservice processes.
- **Positive**: Streamlines CI pipelines and local developer testing.
- **Negative**: Long-running background computation (>15 minutes continuous CPU) must rely on scheduled edge function batching or external webhook workers.
