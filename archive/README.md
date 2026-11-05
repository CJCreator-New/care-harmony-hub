# Archive: non-runtime infrastructure

This directory holds code and infrastructure that is **not** part of the CareSync runtime.
The runtime is the Supabase-native SPA (Postgres, RLS, Edge Functions, Auth, Storage), as
recorded in [ADR-0001](../docs/adr/0001-supabase-native-backend.md). Nothing here is built,
deployed or type-checked by CI, and nothing in `src/` or `supabase/` imports from it.

Nothing here is a live deployment. Its credentials were removed or converted to `${VAR:?...}`
placeholders under S0-11 (SECF-19 / SECF-20 / OPS-06). Treat the contents as reference only.

## What is archived

The layout mirrors the repository root, so relative paths inside the archived files
(for example `./services/...` in a compose file) still resolve after a restore.

| Archived path | Original path | What it is |
|---|---|---|
| `archive/services/` | `services/` | Five service directories (patient, clinical, laboratory, pharmacy, appointment). Four are Fastify apps with Dockerfiles; pharmacy holds only sync code and SQL. Each has its own `migrations/` or `supabase/migrations/` SQL (DB-19) |
| `archive/kong.yml` | `kong.yml` | Kong declarative gateway template (placeholders only) |
| `archive/docker-compose.yml` | `docker-compose.yml` | Dev stack: Kong, services, Kafka, Redis, Postgres, monitoring |
| `archive/docker-compose.prod.yml` | `docker-compose.prod.yml` | Production copy of the microservices stack |
| `archive/docker-compose.dev.yml` | `docker-compose.dev.yml` | Dev overlay for the microservices stack |
| `archive/monitoring/` | `monitoring/` | Prometheus, Alertmanager, Grafana, Loki and Kong dashboards and rules |
| `archive/.deployment/` | `.deployment/` | Kubernetes, Datadog, PagerDuty and Prometheus manifests |
| `archive/docker/` | `docker/` | Kubernetes deployment, service, ingress and HPA manifests |
| `archive/deploy-prod.sh` | `deploy-prod.sh` | Blue-green deploy script for the microservices compose stack |
| `archive/mobile-app/` | `mobile-app/` | Expo 50 patient-app skeleton, no lockfile or CI |
| `archive/scripts/` | `scripts/{render-kong-config.sh,init-kong.sh,test-rate-limiting.*,test-response-caching.*}` | Kong config rendering and gateway test scripts |

The root `Dockerfile`, `Dockerfile.dev`, `nginx.conf` and `rollback.sh` stay in place. CI builds the root `Dockerfile`,
and `rollback.sh` is the SPA kill-switch rollback. The Dockerfile decision (fix or delete) belongs to S5-01.

## Changes made while archiving

- `archive/docker-compose.yml`: Grafana, Prometheus, Alertmanager, Loki, Kafka and the clinical
  service port are published on `127.0.0.1` only (OPS-06). Kong admin, Postgres and Redis were
  already loopback-bound.
- `archive/services/{appointment,clinical}-service/src/config/environment.ts`: the `CORS_ORIGIN`
  default changed from `*` to `http://localhost:5173`. Both services allow credentials, so the
  wildcard default was a credentialed CORS wildcard (SECF-19).
- `archive/docker/kubernetes/ingress.yaml`: `cors-allow-origin` changed from `*` to the exact
  production origin.
- The only `vercel.app` references left are exact production origins in `archive/kong.yml`.
  No wildcard origin remains.

## How to restore

Restore one path to its original location from the repository root, then revert the
reference updates listed in `.scratch/repository-audit/issues/11-archive-infra.md`:

```bash
git mv archive/docker-compose.yml docker-compose.yml   # any path above, same pattern
```

Restoring the microservices stack also requires the secrets it reads (`JWT_SECRET`,
`ENCRYPTION_KEY`, `KONG_*_API_KEY`, `LOGGLY_TOKEN`, and the database passwords). Supply them
from an untracked `.env`, as described in `.env.example`. Do not restore literal values from git
history. The rotation steps are in `docs/operations/SECRET_ROTATION_AND_HISTORY_PURGE.md`.

History is kept: each move was a `git mv`, so `git log --follow` works on the archived files.
