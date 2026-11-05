#!/usr/bin/env bash
# =============================================================================
# scripts/db/capture-live-schema.sh
#
# Captures the LIVE Supabase database's schema (never data) so it can become the
# replayable migration baseline. Audit task S0-01; see supabase/baseline/README.md.
#
# Run by an operator with database access. It is read-only against the database:
# it only runs pg_dump --schema-only and SELECTs on catalog tables.
#
# Required:
#   SUPABASE_DB_URL   Postgres connection string for the project (Dashboard →
#                     Connect → "Session pooler" or direct). Prefer a read-only
#                     role. It is never printed or written to disk.
# Optional:
#   SUPABASE_PROJECT_REF + SUPABASE_ACCESS_TOKEN
#                     also regenerate src/integrations/supabase/types.ts through
#                     the Supabase Management API (no Docker needed).
#   PG_BIN            directory containing pg_dump/psql (must be >= server major).
#   OUT_DIR           output directory (default supabase/baseline/live-<UTC date>).
#
# Outputs (in OUT_DIR):
#   live_public_schema.sql      pg_dump --schema-only of schema public (incl. grants)
#   live_auth_storage_policies.sql  RLS policies on auth.* and storage.*
#   live_auth_triggers.sql      triggers (and their functions) on auth.users
#   live_storage_buckets.tsv    bucket configuration (id, public, size limit, mime types)
#   live_migration_history.tsv  supabase_migrations.schema_migrations (which repo files ran)
#   live_extensions.tsv         installed extensions and versions
#   live_rls_summary.tsv        every public table: RLS on/off, policy count
#   live_security_definer.tsv   SECURITY DEFINER functions, search_path, EXECUTE grants
#   SECRETS_SCAN.txt            pattern scan of the dumps for credential-like strings
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL (not printed). See supabase/baseline/README.md}"
OUT_DIR="${OUT_DIR:-$ROOT/supabase/baseline/live-$(date -u +%Y%m%d)}"
mkdir -p "$OUT_DIR"

if [[ -n "${PG_BIN:-}" ]]; then
  PG_DUMP="$PG_BIN/pg_dump"; PSQL="$PG_BIN/psql"
else
  PG_DUMP="$(command -v pg_dump || true)"; PSQL="$(command -v psql || true)"
fi
[[ -x "$PG_DUMP" && -x "$PSQL" ]] || { echo "pg_dump/psql not found (install postgresql-client or set PG_BIN)" >&2; exit 2; }

q() { "$PSQL" "$SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -A -t -F $'\t' -c "$1"; }

server_major="$(q "SELECT current_setting('server_version_num')::int / 10000")"
client_major="$("$PG_DUMP" --version | grep -oE '[0-9]+' | head -1)"
echo "server PostgreSQL major: $server_major; local pg_dump major: $client_major"
if (( client_major < server_major )); then
  echo "pg_dump $client_major is older than the server ($server_major). Install postgresql-client-$server_major," >&2
  echo "or use the Supabase CLI with Docker: npx supabase db dump --db-url \"\$SUPABASE_DB_URL\" -f $OUT_DIR/live_public_schema.sql" >&2
  exit 2
fi

echo "1/8 schema dump (public, schema only, with grants)"
"$PG_DUMP" "$SUPABASE_DB_URL" --schema-only --schema=public --no-owner --quote-all-identifiers \
  -f "$OUT_DIR/live_public_schema.sql"

echo "2/8 auth/storage policies"
q "SELECT format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
          policyname, schemaname, tablename, permissive, cmd, array_to_string(roles, ', '),
          coalesce(' USING (' || qual || ')', ''), coalesce(' WITH CHECK (' || with_check || ')', ''))
   FROM pg_policies WHERE schemaname IN ('auth','storage') ORDER BY schemaname, tablename, policyname" \
  > "$OUT_DIR/live_auth_storage_policies.sql"

echo "3/8 triggers on auth.users"
q "SELECT rtrim(pg_get_functiondef(t.tgfoid), E'\n') || ';' || E'\n' || pg_get_triggerdef(t.oid) || ';'
   FROM pg_trigger t
   WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal
   ORDER BY t.tgname" > "$OUT_DIR/live_auth_triggers.sql"

echo "4/8 storage buckets"
q "SELECT id, public, coalesce(file_size_limit::text,''), coalesce(array_to_string(allowed_mime_types, ','),'')
   FROM storage.buckets ORDER BY id" > "$OUT_DIR/live_storage_buckets.tsv"

echo "5/8 migration history"
q "SELECT version, coalesce(name,'') FROM supabase_migrations.schema_migrations ORDER BY version" \
  > "$OUT_DIR/live_migration_history.tsv" || echo "(no supabase_migrations.schema_migrations table)" > "$OUT_DIR/live_migration_history.tsv"

echo "6/8 extensions"
q "SELECT e.extname, e.extversion, n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace ORDER BY 1" \
  > "$OUT_DIR/live_extensions.tsv"

echo "7/8 RLS and SECURITY DEFINER inventory"
q "SELECT c.relname, c.relrowsecurity, (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid)
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r','p') ORDER BY 1" > "$OUT_DIR/live_rls_summary.tsv"
q "SELECT p.proname, pg_get_function_identity_arguments(p.oid),
          coalesce(array_to_string(p.proconfig, ','), ''),
          has_function_privilege('anon', p.oid, 'EXECUTE'),
          has_function_privilege('authenticated', p.oid, 'EXECUTE')
   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef ORDER BY 1" > "$OUT_DIR/live_security_definer.tsv"

echo "8/8 generated types"
if [[ -n "${SUPABASE_PROJECT_REF:-}" && -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  npx --no-install supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" --schema public \
    > "$OUT_DIR/types.generated.ts"
  echo "   wrote $OUT_DIR/types.generated.ts (review, then copy over src/integrations/supabase/types.ts)"
else
  echo "   skipped (set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN to regenerate types)"
fi

# Function bodies can embed credentials. Flag anything credential-like for review
# BEFORE the dump is committed.
grep -nE "eyJ[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{16,}|sk_live_|re_[A-Za-z0-9]{16,}|password[[:space:]]*:?=[[:space:]]*'[^']+'" \
  "$OUT_DIR"/*.sql > "$OUT_DIR/SECRETS_SCAN.txt" || true
if [[ -s "$OUT_DIR/SECRETS_SCAN.txt" ]]; then
  echo "WARNING: credential-like strings found; see $OUT_DIR/SECRETS_SCAN.txt and redact before committing." >&2
else
  echo "no credential-like strings found" > "$OUT_DIR/SECRETS_SCAN.txt"
fi

echo
echo "Done: $OUT_DIR"
echo "Next: follow supabase/baseline/README.md step 3 (compare) and step 4 (squash)."
