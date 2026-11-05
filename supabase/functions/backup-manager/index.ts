// Supabase Edge Function: backup-manager (RETIRED, roadmap S0-05, issue EDGE-02)
//
// Returns 410 Gone for every request. The previous implementation let any
// hospital's `admin` use the service role to dump arbitrary tables for every
// tenant into the `backups` bucket (create_backup), list every tenant's jobs
// (list_backups), and delete every row of every table in a caller-chosen backup
// file for all tenants before re-inserting at most 1000 rows (restore_backup).
//
// Backups are a platform-operator function, not a tenant feature: use Supabase
// point-in-time recovery or scheduled pg_dump run by operators (roadmap S5-02).
// If a tenant export is ever needed, build it as a new read-only function that
// filters by the caller's hospital_id, uses a fixed table allowlist and pages.
//
// This stub is deployed (rather than the directory being deleted) so that the
// next deploy overwrites any live copy of the old code. Operators should also
// run `supabase functions delete backup-manager`; see
// supabase/pending-migrations/20261105000005.README.md.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { retiredFunctionResponse } from "../_shared/retired.ts";

serve((req) =>
  retiredFunctionResponse(
    req,
    "backup-manager",
    "Backups and restores are performed by platform operators (Supabase point-in-time recovery), not through the application.",
  )
);
