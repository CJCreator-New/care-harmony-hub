#!/usr/bin/env node
/**
 * scripts/db/build-consolidated.mjs
 *
 * Generates the paste-in-order SQL bundle in supabase/pending-migrations/consolidated/
 * from the six pending migrations (audit tasks S0-03, S0-04, S0-05, S0-06, S0-08, S0-10).
 *
 *   00-preflight.sql     read-only checks of the target database (generated)
 *   part-NN-*.sql        the migrations, verbatim, split at top-level statement
 *                        boundaries into parts of at most MAX_BODY_LINES lines (generated)
 *   99-verify.sql        read-only checks of the expected end state (generated)
 *
 * Migration text is never edited. A small scanner splits each file only between two
 * top-level statements (it understands quotes, -- and block comments, and $tag$ bodies).
 * The generator then checks that the parts, without their generated headers, reproduce
 * every source file byte for byte, and fails otherwise.
 *
 * A migration that fits in one part is wrapped in BEGIN/COMMIT, so it applies atomically.
 * A migration that is split is not wrapped.
 *
 * Usage: node scripts/db/build-consolidated.mjs
 * Standard library only.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PENDING = path.join(ROOT, 'supabase', 'pending-migrations');
const OUT = path.join(PENDING, 'consolidated');

const MAX_BODY_LINES = 700; // body lines per part; headers and BEGIN/COMMIT add a few more
const WRAP_MAX_LINES = 760; // a migration this short is one part, wrapped in a transaction
const LINE_LIMIT = 800;

/** The six migrations in apply order. */
const MIGRATIONS = [
  {
    file: '20261105000001_critical_lab_escalation_queue.sql',
    slug: 'critical-lab-escalation-queue',
    task: 'S0-08 (EDGE-03, CLIN-10)',
    what: 'Critical lab alert and escalation tables, on-call roster, append-only alert events, and the pg_cron worker schedule.',
    after:
      'No ERROR expected. A NOTICE or WARNING that pg_cron, pg_net or Vault is missing is normal: the worker schedule is skipped until the operator steps in pending-migrations/README.md (step 3) are done, and then this part is re-run.',
    extraTables: ['lab_critical_alerts', 'lab_alert_escalations', 'on_call_schedule', 'lab_critical_alert_events'],
    extraFunctions: [],
  },
  {
    file: '20261105000002_mfa_backup_codes_and_aal2.sql',
    slug: 'mfa-backup-codes-and-aal2',
    task: 'S0-10 (EDGE-05, EDGE-25, SECF-01, SECF-02)',
    gate:
      'Section D turns on aal2 enforcement for admins and doctors on the PHI tables. Do not run this part until every admin and doctor has an enrolled Supabase MFA factor, the client MFA change is live, and BACKUP_CODE_PEPPER is set (20261105000002 README, deployment order). README.md, step 2.',
    what: 'MFA backup-code tables and service-role RPCs; the profiles_guard_privileged_columns trigger; mfa_satisfied(); a RESTRICTIVE mfa_aal2_required policy on the PHI tables.',
    after:
      'Expect the trigger profiles_guard_privileged_columns and mfa_satisfied() (both in 99-verify). From here, an admin or doctor session at aal1 sees 0 rows in the PHI tables until that user enrolls a Supabase MFA factor.',
    extraTables: ['mfa_backup_codes', 'mfa_backup_code_attempts'],
    extraFunctions: [
      'consume_mfa_backup_code',
      'replace_mfa_backup_codes',
      'my_mfa_backup_codes_remaining',
      'mfa_satisfied',
      'role_requires_2fa',
      'profiles_guard_privileged_columns',
    ],
  },
  {
    file: '20261105000003_lock_tenant_key.sql',
    slug: 'lock-tenant-key',
    task: 'S0-03 (DB-01, SECF-10, SECF-09, DB-22, SECF-11)',
    known:
      'validated only against a date-typed patients.date_of_birth. With the live-shaped text column (src/integrations/supabase/types.ts), the source fails at patient_claim_candidates: "operator does not exist: text = date". The part is one transaction, so the failure rolls it back. Do not run this part until the S0-03 owner fixes that comparison in the source migration. README.md, known risks.',
    what: 'Profile UPDATE/INSERT policies and an ABAC column guard; security answers and legacy 2FA columns moved out of profiles and dropped; client role self-assignment removed; onboarding RPCs made service-role only.',
    after:
      'The 99-verify COL-* rows must read ok (profiles has no security_question, security_answer, two_factor_secret or backup_codes). If a database view depended on one of those columns, the migration empties the column and raises a WARNING instead of dropping it; the COL-* row then shows MISSING, which is a real finding to resolve before going on.',
    extraTables: ['profile_security_answers', 'profiles_legacy_2fa_archive', 'patient_claim_attempts'],
    extraFunctions: ['create_hospital_with_admin', 'accept_staff_invitation', 'verify_patient_claim', 'register_patient'],
  },
  {
    file: '20261105000004_role_aware_rls.sql',
    slug: 'role-aware-rls',
    task: 'S0-04 (DB-02, DB-07, DB-09, DB-13, DB-16)',
    gate:
      'Sweep mode (the default) drops every permissive policy on the owned tables that is not in the spec, and it turns RLS on for every public table. Do not run parts 04-06 against a live database until the abort-mode dry run and the S0-01 capture review in 20261105000004.README.md (steps 2-3) are done. README.md, known risks.',
    what: 'Role-aware helper functions; user_belongs_to_hospital redefined as active-staff membership; owned tables re-policied per role; RLS enabled on every public table; a guard policy on the rest.',
    afterMid:
      'Not the end of S0-04. Do not stop here and do not open the app between parts: the next part completes the migration.',
    afterLast:
      'Completes S0-04. Read its audit before going further: select section, action, tablename, detail from rls_migration_audit.s004_run_log order by id; and select tablename, policyname, cmd, in_repo_history from rls_migration_audit.s004_dropped_policies order by id; (20261105000004.README.md, step 4). A failed_kept_old_policies row means that table still has its old policies; a closed_unclassified row means it is now deny-all and needs a policy for the clients that use it.',
    extraTables: [
      'rls_migration_audit.s004_policy_spec',
      'rls_migration_audit.s004_dropped_policies',
      'rls_migration_audit.s004_repo_policy_names',
      'rls_migration_audit.s004_run_log',
    ],
    extraFunctions: [],
  },
  {
    file: '20261105000005_neutralize_destructive_endpoints.sql',
    slug: 'neutralize-destructive-endpoints',
    task: 'S0-05 (EDGE-02, DB-04, FUNC-10, EDGE-01, DB-11)',
    what: 'Drops the purge and test-setup RPCs (every overload), after revoking their EXECUTE grants.',
    after: 'No ERROR expected. 99-verify must show no purge_old_audit_logs_staging_only and no test_setup_* function.',
    extraTables: [],
    extraFunctions: [],
  },
  {
    file: '20261105000006_rls_lab_tables.sql',
    slug: 'rls-lab-tables',
    task: 'S0-06 (urgent: six lab tables had RLS off)',
    what: 'Deny-by-default policies and RLS enabled on lab_results, lab_qc_results, lab_trends, lab_interpretation_rules, critical_value_notifications and loinc_codes; lab_rls_* helper functions.',
    after:
      'Expect RLS on all six lab tables (99-verify LAB-RLS-*). All six are now deny-by-default: only the roles in the policy matrix (20261105000006.README.md) can read or write them. Check each role\'s lab screens before relying on it.',
    extraTables: [],
    extraFunctions: [
      'lab_rls_profile_active',
      'lab_rls_staff_hospital_ids',
      'lab_rls_can_access',
      'lab_rls_result_access',
      'lab_rls_is_active_admin',
    ],
  },
];

/**
 * What the validation found when the whole bundle was applied a second time, per migration.
 * Keyed by the migration's 4-digit number. Only the S0-04 note is an exception: its guard policy
 * depends on whether S0-06 policies exist yet, so a second pass changes the schema.
 */
const RERUN_NOTE = {
  default: 'validated: a second run of the whole bundle changed no schema object (pg_dump diff, see README.md).',
  '0004':
    'NOT a no-op. A second run adds RESTRICTIVE policy s004_active_principal_guard on lab_qc_results and lab_trends (it only narrows access to active staff). See README.md, known risks.',
};

/** Tables that 20261105000002 section D puts a RESTRICTIVE mfa_aal2_required policy on. */
const MFA_TABLES = ['patients', 'consultations', 'prescriptions', 'prescription_items', 'lab_orders', 'vital_signs', 'medical_records'];
const LAB_TABLES = ['lab_results', 'lab_qc_results', 'lab_trends', 'critical_value_notifications', 'loinc_codes', 'lab_interpretation_rules'];

function fail(msg) {
  console.error(`build-consolidated: ${msg}`);
  process.exit(1);
}

/**
 * Scans SQL into top-level statements. Returns:
 *   chunks: source split after each top-level ';' (concatenated, it equals sql)
 *   code:   the SQL with comments blanked out (quotes and dollar-quoted bodies kept)
 */
export function scan(sql, file) {
  const ends = [];
  let code = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === '-' && next === '-') {
      const j = sql.indexOf('\n', i);
      i = j === -1 ? n : j;
      code += ' ';
      continue;
    }
    if (ch === '/' && next === '*') {
      const j = sql.indexOf('*/', i + 2);
      if (j === -1) fail(`${file}: unterminated block comment at offset ${i}`);
      i = j + 2;
      code += ' ';
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      for (;;) {
        const q = sql.indexOf(ch, j);
        if (q === -1) fail(`${file}: unterminated quote at offset ${i}`);
        if (sql[q + 1] === ch) {
          j = q + 2;
          continue;
        }
        j = q + 1;
        break;
      }
      code += sql.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '$' && !/[A-Za-z0-9_$]/.test(sql[i - 1] ?? '')) {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 128));
      if (m) {
        const close = sql.indexOf(m[0], i + m[0].length);
        if (close === -1) fail(`${file}: unterminated dollar quote ${m[0]} at offset ${i}`);
        const j = close + m[0].length;
        code += sql.slice(i, j);
        i = j;
        continue;
      }
    }
    if (ch === ';') {
      code += ';';
      i += 1;
      ends.push(i);
      continue;
    }
    code += ch;
    i += 1;
  }
  const chunks = [];
  let prev = 0;
  for (const e of ends) {
    chunks.push(sql.slice(prev, e));
    prev = e;
  }
  if (prev < n) chunks.push(sql.slice(prev));
  if (chunks.join('') !== sql) fail(`${file}: internal error, chunks do not reproduce the source`);
  return { chunks, code };
}

const lineCount = (s) => (s.match(/\n/g) || []).length;

/** Source line (1-based) at which chunks[idx] starts. */
function lineOf(chunks, idx) {
  let line = 1;
  for (let k = 0; k < idx; k++) line += lineCount(chunks[k]);
  return line;
}

/** Groups chunk indexes into parts. A migration that fits in WRAP_MAX_LINES is one part. */
function pack(file, chunks) {
  const lc = chunks.map(lineCount);
  lc.forEach((c, idx) => {
    if (c > MAX_BODY_LINES) fail(`${file}: statement ${idx + 1} is ${c} lines, above ${MAX_BODY_LINES}`);
  });
  const total = lc.reduce((a, b) => a + b, 0);
  if (total <= WRAP_MAX_LINES) return [chunks.map((_, idx) => idx)];
  const groups = [];
  let cur = [];
  let curLines = 0;
  chunks.forEach((_, idx) => {
    if (cur.length && curLines + lc[idx] > MAX_BODY_LINES) {
      groups.push(cur);
      cur = [];
      curLines = 0;
    }
    cur.push(idx);
    curLines += lc[idx];
  });
  if (cur.length) groups.push(cur);
  return groups;
}

/** Tables and functions a migration creates, from code only (comments excluded). */
function createdObjects(code) {
  const tables = new Set();
  const functions = new Set();
  for (const m of code.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)(?=\s*\()/gi)) {
    tables.add(m[1].toLowerCase());
  }
  for (const m of code.matchAll(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi)) {
    functions.add(m[1].toLowerCase());
  }
  return { tables: [...tables], functions: [...functions] };
}

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const qualify = (name) => (name.includes('.') ? name : `public.${name}`);

/** One verify row: id, label, a condition that must hold for 'ok', and a detail expression. */
function verifyRow(id, label, okExpr, detailExpr = "''") {
  return `SELECT ${sqlStr(id)} AS check_id, ${sqlStr(label)} AS check_name, (${detailExpr})::text AS detail,\n       CASE WHEN (${okExpr}) THEN 'ok' ELSE 'MISSING' END AS result`;
}

const fnExists = (name, extra = null) =>
  `EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = ${sqlStr(name)}${extra ? ` AND ${extra}` : ''})`;
const noFn = (name) => `NOT ${fnExists(name)}`;
const noCol = (table, col) =>
  `NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass('public.${table}')
                AND a.attname = ${sqlStr(col)} AND NOT a.attisdropped AND a.attnum > 0)`;
const rlsOn = (qualified) =>
  `coalesce((SELECT c.relrowsecurity FROM pg_class c WHERE c.oid = to_regclass(${sqlStr(qualified)})), false)`;

/** Public tables (not owned by an extension) that have RLS off. */
const OFFENDERS_RLS_SQL = `SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass
                        AND d.objid = c.oid AND d.deptype = 'e')`;

function buildVerify(perMigration) {
  const rows = [];
  for (const t of LAB_TABLES) {
    rows.push(verifyRow(`LAB-EXISTS-${t}`, `table public.${t} exists`, `to_regclass('public.${t}') IS NOT NULL`, `'public.${t}'`));
  }
  for (const t of LAB_TABLES) {
    rows.push(verifyRow(`LAB-RLS-${t}`, `RLS enabled on public.${t}`, rlsOn(`public.${t}`), `'public.${t}'`));
  }
  rows.push(
    verifyRow(
      'RLS-ALL',
      'RLS enabled on every public table (extension-owned tables excluded); detail lists any that are not',
      `NOT EXISTS (${OFFENDERS_RLS_SQL})`,
      `SELECT coalesce(string_agg(relname, ', '), 'none') FROM (${OFFENDERS_RLS_SQL}) o`,
    ),
  );
  for (const [migration, objs] of perMigration) {
    for (const t of objs.tables) {
      rows.push(verifyRow(`OBJ-${migration}-T-${t}`, `${migration}: table ${qualify(t)} exists`, `to_regclass('${qualify(t)}') IS NOT NULL`, `'${qualify(t)}'`));
    }
    for (const f of objs.functions) {
      rows.push(verifyRow(`OBJ-${migration}-F-${f}`, `${migration}: function public.${f} exists`, fnExists(f), `'public.${f}'`));
    }
  }
  rows.push(
    verifyRow(
      'TRG-profiles-guard',
      'trigger profiles_guard_privileged_columns on public.profiles',
      `EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.profiles') AND tgname = 'profiles_guard_privileged_columns' AND NOT tgisinternal)`,
      `'public.profiles'`,
    ),
  );
  for (const t of MFA_TABLES) {
    rows.push(
      verifyRow(
        `POL-mfa-${t}`,
        `RESTRICTIVE policy mfa_aal2_required on public.${t}`,
        `EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = ${sqlStr(t)} AND policyname = 'mfa_aal2_required')`,
        `'public.${t}'`,
      ),
    );
  }
  rows.push(
    verifyRow(
      'POL-s004',
      'S0-04 policies present (policy names s004_%)',
      `EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND policyname LIKE 's004\\_%')`,
    ),
  );
  rows.push(
    verifyRow(
      'SIG-ubth',
      'user_belongs_to_hospital(_user_id uuid, _hospital_id uuid) signature',
      fnExists('user_belongs_to_hospital', `pg_get_function_identity_arguments(p.oid) = '_user_id uuid, _hospital_id uuid'`),
      `(SELECT string_agg(pg_get_function_identity_arguments(p.oid), ' | ') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'user_belongs_to_hospital')`,
    ),
  );
  rows.push(verifyRow('DROP-purge', 'no purge_old_audit_logs_staging_only (S0-05)', noFn('purge_old_audit_logs_staging_only')));
  rows.push(verifyRow('DROP-test-prescription', 'no test_setup_prescription_audit_scenario (S0-05)', noFn('test_setup_prescription_audit_scenario')));
  rows.push(verifyRow('DROP-test-invoice', 'no test_setup_invoice_audit_scenario (S0-05)', noFn('test_setup_invoice_audit_scenario')));
  rows.push(verifyRow('COL-security_answer', 'no security_answer column on public.profiles (S0-03)', noCol('profiles', 'security_answer')));
  rows.push(verifyRow('COL-security_question', 'no security_question column on public.profiles (S0-03)', noCol('profiles', 'security_question')));
  rows.push(verifyRow('COL-two_factor_secret', 'no two_factor_secret column on public.profiles (S0-03)', noCol('profiles', 'two_factor_secret')));
  rows.push(verifyRow('COL-backup_codes', 'no backup_codes column on public.profiles (S0-03)', noCol('profiles', 'backup_codes')));

  return `-- =============================================================================
-- 99-verify.sql  (GENERATED by scripts/db/build-consolidated.mjs; do not edit)
--
-- READ-ONLY: only SELECTs, changes nothing. Run it last, after every part.
-- One row per check. result is 'ok' or 'MISSING'. Every row must read 'ok'
-- after the first run of the parts and again after a second run.
-- A MISSING row is a finding, not something to work around: read the detail
-- column, then the note for that part in README.md.
-- =============================================================================

${rows.join('\nUNION ALL\n')}
ORDER BY check_id;
`;
}

const PRE_LAB = LAB_TABLES.map(
  (t) =>
    `'${t}=' || CASE WHEN to_regclass('public.${t}') IS NULL THEN 'ABSENT' WHEN ${rlsOn(`public.${t}`)} THEN 'present, rls=on' ELSE 'present, rls=OFF' END`,
);
const PRE_COLS = [
  'security_question',
  'security_answer',
  'two_factor_secret',
  'backup_codes',
  'two_factor_enabled',
  'two_factor_required',
  'is_active',
  'is_staff',
  'hospital_id',
  'failed_login_attempts',
  'locked_until',
].map(
  (c) =>
    `'${c}=' || CASE WHEN EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass('public.profiles') AND a.attname = '${c}' AND NOT a.attisdropped AND a.attnum > 0) THEN 'present' ELSE 'absent' END`,
);

const PREFLIGHT_SQL = `-- =============================================================================
-- 00-preflight.sql  (GENERATED by scripts/db/build-consolidated.mjs; do not edit)
--
-- READ-ONLY: only SELECTs and catalog reads, changes nothing. Run it first,
-- before part-01, and read every row. Rows that decide whether to go on:
--   * history rows: whether the pending versions (20261105...) already ran;
--   * drizzle.__drizzle_migrations, if present, is the Lovable drizzle history
--     (0017-0023 may overlap with 000002 and 000004);
--   * "user_belongs_to_hospital arguments": must be _user_id uuid, _hospital_id uuid;
--   * "profiles legacy and privileged columns": shows what S0-03 will remove.
-- Output: section, item, state.
-- =============================================================================

SELECT section, item, state FROM (
  SELECT 1 AS o, 'server' AS section, 'version' AS item, version() AS state
  UNION ALL SELECT 2, 'server', 'current_database / current_user', current_database() || ' / ' || current_user
  UNION ALL SELECT 3, 'server', 'extensions (pg_cron, pg_net, supabase_vault): installed or available',
    coalesce((SELECT string_agg(name || '=' || coalesce(installed_version, 'not-installed'), ', ' ORDER BY name)
               FROM pg_available_extensions WHERE name IN ('pg_cron', 'pg_net', 'supabase_vault')), 'none available')
  UNION ALL SELECT 4, 'history', 'supabase_migrations.schema_migrations',
    CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL THEN 'absent'
         ELSE 'present, rows=' || (xpath('/row/c/text()', query_to_xml('SELECT count(*)::text AS c FROM supabase_migrations.schema_migrations', false, true, '')))[1]::text END
  UNION ALL SELECT 5, 'history', 'supabase_migrations versions 20261105%',
    CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL THEN 'n/a (table absent)'
         ELSE coalesce((xpath('/row/c/text()', query_to_xml('SELECT string_agg(version::text, '', '' ORDER BY version) AS c FROM supabase_migrations.schema_migrations WHERE version::text LIKE ''20261105%''', false, true, '')))[1]::text, 'none') END
  UNION ALL SELECT 6, 'history', 'drizzle.__drizzle_migrations (Lovable drizzle pushes)',
    CASE WHEN to_regclass('drizzle.__drizzle_migrations') IS NULL THEN 'absent'
         ELSE 'present, rows=' || (xpath('/row/c/text()', query_to_xml('SELECT count(*)::text AS c FROM drizzle.__drizzle_migrations', false, true, '')))[1]::text END
  UNION ALL SELECT 7, 'tables', 'profiles / user_roles / lab_orders / patients',
    concat_ws(', ', 'profiles=' || CASE WHEN to_regclass('public.profiles') IS NULL THEN 'ABSENT' ELSE 'present' END,
                    'user_roles=' || CASE WHEN to_regclass('public.user_roles') IS NULL THEN 'ABSENT' ELSE 'present' END,
                    'lab_orders=' || CASE WHEN to_regclass('public.lab_orders') IS NULL THEN 'ABSENT' ELSE 'present' END,
                    'patients=' || CASE WHEN to_regclass('public.patients') IS NULL THEN 'ABSENT' ELSE 'present' END)
  UNION ALL SELECT 8, 'tables', 'hospitals / notifications / staff_invitations',
    concat_ws(', ', 'hospitals=' || CASE WHEN to_regclass('public.hospitals') IS NULL THEN 'ABSENT' ELSE 'present' END,
                    'notifications=' || CASE WHEN to_regclass('public.notifications') IS NULL THEN 'ABSENT' ELSE 'present' END,
                    'staff_invitations=' || CASE WHEN to_regclass('public.staff_invitations') IS NULL THEN 'ABSENT' ELSE 'present' END)
  UNION ALL SELECT 9, 'lab tables', 'the six lab tables (presence and RLS)',
    concat_ws(', ', ${PRE_LAB.join(',\n                    ')})
  UNION ALL SELECT 10, 'functions', 'has_role',
    coalesce((SELECT string_agg(pg_get_function_identity_arguments(p.oid), ' | ') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'has_role'), 'absent')
  UNION ALL SELECT 11, 'functions', 'user_belongs_to_hospital arguments (must be _user_id uuid, _hospital_id uuid)',
    coalesce((SELECT string_agg(pg_get_function_identity_arguments(p.oid), ' | ') FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'user_belongs_to_hospital'), 'absent')
  UNION ALL SELECT 12, 'triggers', 'profiles_guard_privileged_columns (S0-10 guard; S0-03 needs it)',
    CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.profiles') AND tgname = 'profiles_guard_privileged_columns' AND NOT tgisinternal) THEN 'present' ELSE 'absent' END
  UNION ALL SELECT 13, 'columns', 'profiles legacy and privileged columns',
    concat_ws(', ', ${PRE_COLS.join(',\n                    ')})
  UNION ALL SELECT 14, 'policies', 'policies on user_roles (permissive write policies are the S0-03 concern)',
    coalesce((SELECT string_agg(policyname || ' [' || cmd || ']', ' ; ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles'), 'none')
  UNION ALL SELECT 15, 'policies', 'policies on profiles',
    coalesce((SELECT string_agg(policyname || ' [' || cmd || ']', ' ; ' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'), 'none')
  UNION ALL SELECT 16, 'rls', 'public tables with RLS OFF (DB-13; S0-04 part 2 enables them)',
    (SELECT count(*)::text || ' table(s): ' || coalesce(string_agg(relname, ', ' ORDER BY relname), 'none') FROM (${OFFENDERS_RLS_SQL}) o)
  UNION ALL SELECT 17, 'public tables', 'count of public tables (tables and partitioned tables)',
    (SELECT count(*)::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p'))
  UNION ALL SELECT 18, 'objects', 'profile_security_answers / profiles_legacy_2fa_archive / mfa_backup_codes',
    concat_ws(', ', 'profile_security_answers=' || CASE WHEN to_regclass('public.profile_security_answers') IS NULL THEN 'absent' ELSE 'present' END,
                    'profiles_legacy_2fa_archive=' || CASE WHEN to_regclass('public.profiles_legacy_2fa_archive') IS NULL THEN 'absent' ELSE 'present' END,
                    'mfa_backup_codes=' || CASE WHEN to_regclass('public.mfa_backup_codes') IS NULL THEN 'absent' ELSE 'present' END)
  UNION ALL SELECT 19, 'objects', 'rls_migration_audit schema (S0-04 bookkeeping)',
    CASE WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'rls_migration_audit') THEN 'present' ELSE 'absent' END
  UNION ALL SELECT 20, 'objects', 'audit_log, and the S0-05 purge RPC',
    concat_ws(', ', 'audit_log=' || CASE WHEN to_regclass('public.audit_log') IS NULL THEN 'absent' ELSE 'present' END,
                    'purge_old_audit_logs_staging_only=' || CASE WHEN ${fnExists('purge_old_audit_logs_staging_only')} THEN 'PRESENT (part-06 drops it)' ELSE 'absent' END)
) x
ORDER BY o;
`;

function headerFor({ idx, total, m, partLabel, lines, wrapped, after, next, lastOfBundle }) {
  return [
    '-- =============================================================================',
    `-- consolidated part ${String(idx).padStart(2, '0')} of ${String(total).padStart(2, '0')}  (GENERATED by scripts/db/build-consolidated.mjs; do not edit)`,
    `-- Migration  : ${m.file}`,
    `-- Task       : ${m.task}`,
    `-- What it does: ${m.what}`,
    ...(m.gate ? [`-- GATE: ${m.gate}`] : []),
    ...(m.known ? [`-- KNOWN ISSUE: ${m.known}`] : []),
    `-- Source lines: ${lines}`,
    `-- ${partLabel}`,
    `-- Transaction: ${wrapped ? 'the whole migration is one BEGIN/COMMIT, so a failure rolls it back' : 'none (the migration spans parts; BEGIN/COMMIT is not used)'}`,
    `-- Re-running: ${RERUN_NOTE[m.file.slice(10, 14)] ?? RERUN_NOTE.default}`,
    `-- Check after this part: ${after}`,
    next
      ? `-- Next: ${next}. Do not skip it.`
      : lastOfBundle
        ? '-- Last part of the bundle: run 00-preflight.sql before the first part, and 99-verify.sql now.'
        : '-- Last part of this migration. The next part is the next migration.',
    '-- =============================================================================',
    '',
  ].join('\n');
}

function main() {
  const onDisk = fs
    .readdirSync(PENDING)
    .filter((f) => /^20261105\d{6}_.*\.sql$/.test(f))
    .sort();
  const listed = MIGRATIONS.map((m) => m.file);
  if (JSON.stringify(onDisk) !== JSON.stringify(listed)) {
    fail(`pending migrations on disk (${onDisk.join(', ')}) differ from the list in this script (${listed.join(', ')})`);
  }

  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) {
    if (/^(00-|part-|99-).*\.sql$/.test(f)) fs.rmSync(path.join(OUT, f));
  }

  const plans = MIGRATIONS.map((m) => {
    const src = fs.readFileSync(path.join(PENDING, m.file), 'utf8');
    const { chunks, code } = scan(src, m.file);
    return { m, src, chunks, groups: pack(m.file, chunks), created: createdObjects(code) };
  });
  const totalParts = plans.reduce((a, p) => a + p.groups.length, 0);

  const parts = [];
  const perMigration = [];
  let partNo = 0;
  for (const { m, src, chunks, groups, created } of plans) {
    const wrapped = groups.length === 1;
    const short = m.file.slice(10, 14); // "0001" ... "0006"
    const tables = [...new Set([...created.tables, ...m.extraTables])];
    const functions = [...new Set([...created.functions, ...m.extraFunctions])];
    perMigration.push([short, { tables, functions }]);

    // pg_temp helpers (session-local functions) are created by one statement and used by
    // later ones. Parts run in separate sessions, so a part that calls a helper defined in an
    // earlier part gets a verbatim copy of that definition in front of its body.
    const tempDefs = new Map();
    chunks.forEach((c, idx) => {
      for (const d of c.matchAll(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+pg_temp\.(\w+)/gi)) {
        tempDefs.set(d[1].toLowerCase(), idx);
      }
    });

    const migrationParts = [];
    groups.forEach((group, gi) => {
      partNo += 1;
      const body = group.map((idx) => chunks[idx]).join('');
      const inGroup = new Set(group);
      const neededDefs = new Set();
      for (const idx of group) {
        for (const r of chunks[idx].matchAll(/pg_temp\.(\w+)/gi)) {
          const def = tempDefs.get(r[1].toLowerCase());
          if (def !== undefined && !inGroup.has(def)) neededDefs.add(def);
        }
      }
      const prelude = [...neededDefs]
        .sort((a, b) => a - b)
        .map((idx) => {
          const from = lineOf(chunks, idx);
          const to = from + lineCount(chunks[idx]) - 1;
          const copy = chunks[idx].endsWith('\n') ? chunks[idx] : `${chunks[idx]}\n`;
          return `-- session prelude: verbatim copy of source lines ${from}-${to}. It defines a pg_temp helper that this part calls.\n-- Parts run in separate sessions and pg_temp objects do not survive between them.\n${copy}`;
        })
        .join('');
      const last = group[group.length - 1];
      const lines = `${lineOf(chunks, group[0])}-${lineOf(chunks, last) + lineCount(chunks[last]) - 1}`;
      const isLastGroup = gi + 1 === groups.length;
      const nextGroupName = isLastGroup ? null : `part-${String(partNo + 1).padStart(2, '0')}-${short}-${m.slug}-${gi + 2}of${groups.length}.sql`;
      const name = wrapped
        ? `part-${String(partNo).padStart(2, '0')}-${short}-${m.slug}.sql`
        : `part-${String(partNo).padStart(2, '0')}-${short}-${m.slug}-${gi + 1}of${groups.length}.sql`;
      const header = headerFor({
        idx: partNo,
        total: totalParts,
        m,
        partLabel: wrapped ? 'This part is the whole migration.' : `Part ${gi + 1} of ${groups.length} of this migration.`,
        lines,
        wrapped,
        after: wrapped ? m.after : isLastGroup ? m.afterLast : m.afterMid,
        next: nextGroupName,
        lastOfBundle: isLastGroup && m === MIGRATIONS[MIGRATIONS.length - 1],
      });
      const text = header + prelude + (wrapped ? 'BEGIN;\n\n' : '') + body + (wrapped ? '\nCOMMIT;\n' : '');
      const part = { name, text, body, lines: text.split('\n').length - 1 };
      migrationParts.push(part);
      parts.push(part);
    });

    // Byte-exact check: the bodies of this migration, joined in order, are the source.
    if (migrationParts.map((p) => p.body).join('') !== src) fail(`${m.file}: parts do not reproduce the source`);
  }

  for (const part of parts) {
    if (part.lines > LINE_LIMIT) fail(`${part.name} is ${part.lines} lines (limit ${LINE_LIMIT})`);
    fs.writeFileSync(path.join(OUT, part.name), part.text);
  }
  fs.writeFileSync(path.join(OUT, '00-preflight.sql'), PREFLIGHT_SQL);
  fs.writeFileSync(path.join(OUT, '99-verify.sql'), buildVerify(perMigration));

  const all = ['00-preflight.sql', ...parts.map((p) => p.name), '99-verify.sql'];
  for (const n of all) {
    const lines = fs.readFileSync(path.join(OUT, n), 'utf8').split('\n').length - 1;
    console.log(`${String(lines).padStart(5)}  ${n}`);
  }
  console.log(`wrote ${all.length} files to ${path.relative(ROOT, OUT)}`);
}

main();
