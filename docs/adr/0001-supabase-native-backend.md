# 0001: Supabase Native Backend Architecture

## Context
The repository contains both a direct Supabase client (src/integrations/supabase/client.ts) and containerized microservices with Kong API gateway configs (docker-compose.prod.yml, kong.yml). All application hooks, queries, mutations, RLS security policies, real-time channels, and edge functions target Supabase directly. The Kong microservices environment variables are unconsumed by the Vite frontend.

## Decision
CareSync HIMS standardizes on Supabase Native (Lovable Cloud) as the sole runtime data and auth backend. Supabase PostgreSQL, Row-Level Security, Edge Functions, Auth, and Storage form the complete backend perimeter. The Kong API gateway and local microservices configurations are archived/secondary artifacts and are not part of the active production runtime path.

## Consequences
- Single data client throughout the entire React frontend.
- Zero gateway latency or dual-auth synchronization overhead.
- All access controls and tenant isolation enforced via Supabase PostgreSQL RLS policies.
