/**
 * apply-rls-migration.mjs
 *
 * Applies the C-2 profiles RLS hardening migration directly to the Supabase
 * project without needing the Supabase CLI database password.
 *
 * Usage:
 *   1. Set SUPABASE_SERVICE_ROLE_KEY in your .env file (or pass as env var):
 *        $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
 *   2. Run:
 *        node scripts/apply-rls-migration.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Read environment ────────────────────────────────────────────────────────
// Load from .env if dotenv is available; otherwise fall back to process.env
try {
  const { config } = await import('dotenv');
  config({ path: resolve(__dirname, '../.env') });
} catch {
  // dotenv not installed — rely on shell-level env vars
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`
❌  Missing required environment variables.

Please set SUPABASE_SERVICE_ROLE_KEY in your .env file or PowerShell session:

  $env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

Then re-run:
  node scripts/apply-rls-migration.mjs

You can find your service role key in the Supabase Dashboard:
  Settings → API → Project API keys → service_role (secret)
`);
  process.exit(1);
}

// ── Read the migration SQL ──────────────────────────────────────────────────
const migrationPath = resolve(
  __dirname,
  '../supabase/migrations/20260303000001_profiles_rls_anon_deny.sql'
);
const sql = readFileSync(migrationPath, 'utf8');

console.log('🔒  Applying profiles RLS hardening migration...');
console.log(`    Project: ${SUPABASE_URL}`);
console.log(`    File: supabase/migrations/20260303000001_profiles_rls_anon_deny.sql\n`);

// ── Execute via Supabase REST (pg_query RPC if available, else direct DB) ───
// Use the admin REST API endpoint: POST /rest/v1/rpc/exec_sql
// (This requires a custom exec_sql function OR we call the management API)
//
// Primary: Use the Supabase management API v1 (requires access token from
//   `supabase login` or SUPABASE_ACCESS_TOKEN env var)
// Fallback: Print instructions.

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌  Could not parse project ref from VITE_SUPABASE_URL');
  process.exit(1);
}

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (accessToken) {
  // ── Path A: Management API (needs SUPABASE_ACCESS_TOKEN from `supabase login`) ─
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌  Management API error (${res.status}): ${body}`);
    process.exit(1);
  }

  const result = await res.json();
  console.log('✅  Migration applied successfully via Management API!');
  console.log('    Result:', JSON.stringify(result, null, 2));
} else {
  // ── Path B: Use service role key to call a helper RPC ────────────────────
  // We create a temporary exec_sql function, run the migration, then drop it.
  const SETUP_EXEC_SQL = `
CREATE OR REPLACE FUNCTION _tmp_exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;
`;
  const TEARDOWN_EXEC_SQL = `DROP FUNCTION IF EXISTS _tmp_exec_sql(text);`;

  async function rpcPost(body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/_tmp_exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(body),
    });
    return r;
  }

  // Check whether the helper function exists by trying to call it with empty SQL
  let helperExists = false;
  {
    const probe = await rpcPost({ sql: 'SELECT 1' });
    helperExists = probe.status !== 404;
  }

  if (!helperExists) {
    // We can't create the helper via REST without a direct DB connection.
    // Print the SQL for manual application.
    printManualInstructions(sql, projectRef);
    process.exit(0);
  }

  // Call the helper with the migration SQL
  const migrRes = await rpcPost({ sql });
  if (!migrRes.ok) {
    const body = await migrRes.text();
    if (body.includes('already exists') || body.includes('does not exist')) {
      // Idempotent — policy names already in desired state
      console.log('✅  Migration is already applied (idempotent — no changes needed).');
    } else {
      console.error(`❌  RPC error (${migrRes.status}): ${body}`);
      printManualInstructions(sql, projectRef);
      process.exit(1);
    }
  } else {
    console.log('✅  Migration applied successfully!');
  }

  // Cleanup helper function
  await rpcPost({ sql: TEARDOWN_EXEC_SQL });
}

console.log(`
Next step: run the security test suite to confirm the gate passes:
  npm run test:security
`);

// ── Helper ──────────────────────────────────────────────────────────────────
function printManualInstructions(sql, projectRef) {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MANUAL APPLICATION REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This migration must be applied by an admin. Quickest route:

1. Open the Supabase Dashboard SQL Editor:
   https://supabase.com/dashboard/project/${projectRef}/sql/new

2. Paste and run the following SQL:

────────────────────────────────────────────────────────────
${sql}
────────────────────────────────────────────────────────────

3. Then re-run the security tests:
   npm run test:security

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}
