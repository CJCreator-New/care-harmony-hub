#!/usr/bin/env node
/**
 * scripts/db/replay-migrations.mjs
 *
 * Replays supabase/migrations against a throwaway, vanilla PostgreSQL cluster
 * and reports exactly which migration files fail to apply and why.
 * Audit task S0-01, issue DB-03.
 *
 * Unlike scripts/validate-migrations.mjs (a text-pattern scan), this EXECUTES
 * the SQL. It needs PostgreSQL server binaries (initdb, pg_ctl, postgres, psql,
 * pg_dump) but no Docker, no Supabase CLI and no credentials. Supabase-managed
 * objects come from scripts/db/supabase-compat-shim.sql.
 *
 * Behaviour mirrors the Supabase CLI:
 *   - only files directly in supabase/migrations named <digits>_<name>.sql are
 *     applied (others are listed as "skipped by the CLI");
 *   - files are applied in lexicographic filename order (what the CLI does),
 *     each in a single transaction.
 * By default the replay CONTINUES after a failure (the failed file rolls back)
 * so the report shows every failing file. --stop-on-error reproduces the CLI,
 * which halts at the first failure. --multipass (diagnostic only) keeps retrying
 * failed files in further passes until no more apply: ordering problems then
 * resolve, and whatever still fails has a defect of its own. The schema it
 * produces is NOT canonical because files run out of order.
 *
 * Usage:
 *   node scripts/db/replay-migrations.mjs [--migrations <dir>] [--out <dir>] [--stop-on-error | --multipass] [--keep]
 *   npm run db:replay
 *
 * Environment:
 *   PG_BIN           directory with initdb/pg_ctl/psql (auto-detected otherwise)
 *   REPLAY_WORKDIR   where to create the throwaway cluster (default: OS temp dir)
 *   REPLAY_SOCKET_DIR  where to create the short-lived Unix socket dir (default: OS temp dir)
 *   REPLAY_PG_USER   OS user that runs postgres when invoked as root (default: nobody)
 *
 * Exit code: 0 when every applied migration succeeds, 1 otherwise, 2 on setup error.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const SHIM = path.join(ROOT, 'scripts', 'db', 'supabase-compat-shim.sql');
const TYPES_FILE = path.join(ROOT, 'src', 'integrations', 'supabase', 'types.ts');
const CLI_PATTERN = /^([0-9]+)_(.*)\.sql$/;

const args = process.argv.slice(2);
const opt = (name) => args.includes(name);
const val = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const MIGRATIONS_DIR = path.resolve(val('--migrations', path.join(ROOT, 'supabase', 'migrations')));
const OUT = path.resolve(val('--out', path.join(ROOT, 'migration-replay-report')));
const STOP_ON_ERROR = opt('--stop-on-error');
const KEEP = opt('--keep');
const MULTIPASS = opt('--multipass');

function fail(msg) {
  console.error(`replay-migrations: ${msg}`);
  process.exit(2);
}

function findPgBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const r = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' });
  if (r.status === 0 && fs.existsSync(path.join(r.stdout.trim(), 'initdb'))) return r.stdout.trim();
  for (const base of ['/usr/lib/postgresql', '/usr/local/opt']) {
    if (!fs.existsSync(base)) continue;
    const versions = fs.readdirSync(base).filter((v) => /^\d+$/.test(v)).sort((a, b) => b - a);
    for (const v of versions) {
      const bin = path.join(base, v, 'bin');
      if (fs.existsSync(path.join(bin, 'initdb'))) return bin;
    }
  }
  fail('PostgreSQL server binaries not found. Install postgresql (15+) or set PG_BIN.');
}

const PG_BIN = findPgBin();
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;
const PG_USER = process.env.REPLAY_PG_USER || 'nobody';

function run(cmd, cmdArgs, { asPgUser = false, input } = {}) {
  const bin = path.join(PG_BIN, cmd);
  const [c, a] = asPgUser && IS_ROOT ? ['runuser', ['-u', PG_USER, '--', bin, ...cmdArgs]] : [bin, cmdArgs];
  return spawnSync(c, a, { encoding: 'utf8', input, maxBuffer: 256 * 1024 * 1024 });
}

// ------------------------------------------------------------------ cluster
const workdir = process.env.REPLAY_WORKDIR
  ? fs.mkdtempSync(path.join(process.env.REPLAY_WORKDIR, 'pg-replay-'))
  : fs.mkdtempSync(path.join(os.tmpdir(), 'pg-replay-'));
const pgdata = path.join(workdir, 'data');
// Unix socket paths are limited to ~107 bytes, so the socket gets its own short
// directory even when the data directory lives somewhere deep.
const sock = fs.mkdtempSync(path.join(process.env.REPLAY_SOCKET_DIR || os.tmpdir(), 'pgs-'));
if (IS_ROOT) {
  const id = spawnSync('id', ['-u', PG_USER], { encoding: 'utf8' });
  if (id.status !== 0) fail(`running as root but OS user "${PG_USER}" does not exist (set REPLAY_PG_USER)`);
  const gid = spawnSync('id', ['-g', PG_USER], { encoding: 'utf8' });
  for (const d of [workdir, sock]) fs.chownSync(d, Number(id.stdout.trim()), Number(gid.stdout.trim()));
}

function stopCluster() {
  run('pg_ctl', ['-D', pgdata, '-m', 'immediate', 'stop'], { asPgUser: true });
  fs.rmSync(sock, { recursive: true, force: true });
  if (!KEEP) fs.rmSync(workdir, { recursive: true, force: true });
}

let r = run('initdb', ['-D', pgdata, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale'], { asPgUser: true });
if (r.status !== 0) fail(`initdb failed:\n${r.stderr}`);
r = run(
  'pg_ctl',
  ['-D', pgdata, '-w', '-l', path.join(workdir, 'server.log'), '-o', `-c listen_addresses='' -k ${sock} -c fsync=off`, 'start'],
  { asPgUser: true },
);
if (r.status !== 0) {
  const log = fs.existsSync(path.join(workdir, 'server.log')) ? fs.readFileSync(path.join(workdir, 'server.log'), 'utf8') : '';
  fail(`pg_ctl start failed:\n${r.stderr}\n${log}`);
}
process.on('exit', () => {
  try {
    stopCluster();
  } catch {
    /* best effort */
  }
});

const PSQL_BASE = ['-X', '-h', sock, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'];
const psql = (db, extra) => run('psql', [...PSQL_BASE, '-d', db, ...extra]);
const query = (sql) => {
  const q = psql('replay', ['-A', '-t', '-F', '\t', '-c', sql]);
  if (q.status !== 0) throw new Error(q.stderr);
  return q.stdout.trim() ? q.stdout.trim().split('\n').map((l) => l.split('\t')) : [];
};

r = psql('postgres', ['-c', 'CREATE DATABASE replay']);
if (r.status !== 0) fail(`create database failed:\n${r.stderr}`);
r = psql('replay', ['-q', '-f', SHIM]);
if (r.status !== 0) fail(`compat shim failed:\n${r.stderr}`);
const PG_VERSION = query('SHOW server_version')[0][0];

// ------------------------------------------------------------------ inventory
const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
const applied = entries
  .filter((e) => e.isFile() && CLI_PATTERN.test(e.name))
  .map((e) => e.name)
  // The Supabase CLI applies files in directory-listing (lexicographic
  // filename) order, not numeric version order: "20260325_x.sql" sorts after
  // "20260324000001_y.sql" even though its version number is smaller.
  .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
const skippedFiles = entries.filter((e) => e.isFile() && !CLI_PATTERN.test(e.name)).map((e) => e.name).sort();
const skippedDirs = entries
  .filter((e) => e.isDirectory())
  .map((e) => ({ dir: e.name, files: fs.readdirSync(path.join(MIGRATIONS_DIR, e.name)).filter((f) => f.endsWith('.sql')).length }));
const versions = applied.map((f) => f.match(CLI_PATTERN)[1]);
const duplicateVersions = [...new Set(versions.filter((v, i) => versions.indexOf(v) !== i))];

// Objects each file tries to create, used to tell cascades from defects.
const CREATE_RE =
  /create\s+(?:or\s+replace\s+)?(?:unique\s+)?(?:materialized\s+)?(table|view|function|type|index|sequence|policy|trigger)\s+(?:if\s+not\s+exists\s+)?(?:concurrently\s+)?("?[\w.]+"?(?:\."?\w+"?)?)/gi;
function createdObjects(file) {
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  const names = new Set();
  for (const m of sql.matchAll(CREATE_RE)) {
    names.add(m[2].replace(/"/g, '').replace(/^public\./i, '').toLowerCase());
  }
  // ALTER TABLE ... ADD COLUMN x  -> record "table.column"
  for (const m of sql.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?("?[\w.]+"?)[^;]*?add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?/gi)) {
    names.add(`${m[1].replace(/"/g, '').replace(/^public\./i, '').toLowerCase()}.${m[2].toLowerCase()}`);
    names.add(m[2].toLowerCase());
  }
  return names;
}

const ENV_PATTERNS = [
  /could not open extension control file/i,
  /extension "[^"]+" is not available/i,
  /schema "(cron|vault|net|pgsodium|realtime|supabase_functions|graphql)" does not exist/i,
  /role "(supabase_admin|supabase_auth_admin|supabase_storage_admin|dashboard_user|pgbouncer)" does not exist/i,
];

const createsByFile = new Map(applied.map((f) => [f, createdObjects(f)]));

function classify(errorMsg, failedSoFar, file) {
  if (ENV_PATTERNS.some((re) => re.test(errorMsg))) return 'ENV';
  const missing = errorMsg.match(/(?:relation|function|type|column|table|schema|index|constraint)\s+"?([\w.]+)"?(?:\([^)]*\))?\s+(?:of relation "([\w.]+)"\s+)?does not exist/i);
  if (missing) {
    const obj = missing[1].replace(/^public\./i, '').toLowerCase();
    const colKey = missing[2] ? `${missing[2].replace(/^public\./i, '').toLowerCase()}.${obj}` : null;
    for (const f of failedSoFar) {
      if (f.creates.has(obj) || (colKey && f.creates.has(colKey))) return { kind: 'CASCADE', from: f.file };
    }
    // Needed object is only created by a migration that runs LATER: an
    // ordering defect that breaks every from-scratch replay.
    for (const later of applied.slice(applied.indexOf(file) + 1)) {
      const c = createsByFile.get(later);
      if (c.has(obj) || (colKey && c.has(colKey))) return { kind: 'ORDER', from: later };
    }
  }
  return 'DEFECT';
}

// ------------------------------------------------------------------ replay
console.log(`Replaying ${applied.length} migrations on PostgreSQL ${PG_VERSION} (${STOP_ON_ERROR ? 'stop on first error' : MULTIPASS ? 'multipass diagnostic' : 'continue after errors'})`);
const results = [];
const failed = [];
for (const file of applied) {
  const t0 = Date.now();
  const res = psql('replay', ['-q', '--single-transaction', '-f', path.join(MIGRATIONS_DIR, file)]);
  const ms = Date.now() - t0;
  if (res.status === 0) {
    results.push({ file, ok: true, ms });
    process.stdout.write('.');
    continue;
  }
  const errLine = res.stderr.split('\n').find((l) => /ERROR:/.test(l)) || res.stderr.split('\n')[0] || 'unknown error';
  const m = errLine.match(/:(\d+):\s*ERROR:\s*(.*)$/);
  const line = m ? Number(m[1]) : null;
  const message = (m ? m[2] : errLine.replace(/^.*ERROR:\s*/, '')).trim();
  const detail = res.stderr
    .split('\n')
    .filter((l) => /^(DETAIL|HINT|CONTEXT):/.test(l.trim()))
    .slice(0, 2)
    .join(' ');
  const cls = classify(message, failed, file);
  const kind = typeof cls === 'string' ? cls : cls.kind;
  const entry = { file, ok: false, ms, line, message, detail, kind, cascadeFrom: typeof cls === 'object' ? cls.from : null };
  results.push(entry);
  failed.push({ file, creates: createsByFile.get(file) });
  process.stdout.write(kind === 'DEFECT' ? 'F' : kind === 'ORDER' ? 'O' : kind === 'CASCADE' ? 'c' : 'e');
  if (STOP_ON_ERROR) break;
}
process.stdout.write('\n');

// Diagnostic multipass: retry failed files until a pass makes no progress.
const passes = [];
if (MULTIPASS && !STOP_ON_ERROR) {
  let pending = results.filter((x) => !x.ok);
  for (let pass = 2; pending.length; pass++) {
    let progress = 0;
    for (const entry of pending) {
      const res = psql('replay', ['-q', '--single-transaction', '-f', path.join(MIGRATIONS_DIR, entry.file)]);
      if (res.status === 0) {
        Object.assign(entry, { ok: true, appliedInPass: pass });
        progress++;
      } else {
        const errLine = res.stderr.split('\n').find((l) => /ERROR:/.test(l)) || '';
        const m = errLine.match(/:(\d+):\s*ERROR:\s*(.*)$/);
        entry.finalLine = m ? Number(m[1]) : null;
        entry.finalMessage = (m ? m[2] : errLine.replace(/^.*ERROR:\s*/, '')).trim();
      }
    }
    passes.push({ pass, applied: progress });
    process.stdout.write(`pass ${pass}: +${progress}\n`);
    pending = pending.filter((x) => !x.ok);
    if (!progress) break;
  }
}

// ------------------------------------------------------------------ resulting schema
const tables = query(`
  SELECT c.relname, c.relrowsecurity::text,
         (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid)::text
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
  ORDER BY 1`).map(([name, rls, policies]) => ({ name, rls: rls === 'true', policies: Number(policies) }));
const views = query(`SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY 1`).map((r) => r[0]);
const functions = query(`
  SELECT p.proname, p.prosecdef::text,
         coalesce(array_to_string(p.proconfig, ','), '')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' ORDER BY 1`).map(([name, secdef, config]) => ({
  name,
  securityDefiner: secdef === 'true',
  searchPathSet: /search_path=/.test(config),
}));
const ubh = query(`
  SELECT pg_get_function_identity_arguments(p.oid), pg_get_functiondef(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'user_belongs_to_hospital'`);

// Tables the generated types say exist (src/integrations/supabase/types.ts is
// generated from the LIVE database, so it is the best available proxy for it).
function typesTables() {
  if (!fs.existsSync(TYPES_FILE)) return [];
  const src = fs.readFileSync(TYPES_FILE, 'utf8');
  const start = src.indexOf('Tables: {');
  const end = src.indexOf('Views: {', start);
  if (start < 0 || end < 0) return [];
  return [...src.slice(start, end).matchAll(/^ {6}(\w+): \{$/gm)].map((m) => m[1]).sort();
}
const liveTables = typesTables();
const replayTableNames = new Set(tables.map((t) => t.name));
const inLiveNotReplay = liveTables.filter((t) => !replayTableNames.has(t));
const inReplayNotLive = tables.map((t) => t.name).filter((t) => !liveTables.includes(t));

fs.mkdirSync(OUT, { recursive: true });
const dump = run('pg_dump', ['-h', sock, '-U', 'postgres', '-d', 'replay', '--schema-only', '--no-owner', '--schema=public']);
fs.writeFileSync(path.join(OUT, 'replayed-public-schema.sql'), dump.stdout);

// ------------------------------------------------------------------ report
const nOk = results.filter((x) => x.ok).length;
const nFirstPass = results.filter((x) => x.ok && !x.appliedInPass).length;
const byKind = (k) => results.filter((x) => (!x.ok || x.appliedInPass) && x.kind === k);
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const summary = {
  generatedAt: new Date().toISOString(),
  postgres: PG_VERSION,
  mode: STOP_ON_ERROR ? 'stop-on-error' : MULTIPASS ? 'multipass (diagnostic)' : 'continue',
  passes,
  appliedByCli: applied.length,
  attempted: results.length,
  appliedInOrder: nFirstPass,
  appliedEventually: nOk,
  failedInOrder: results.length - nFirstPass,
  neverApplied: results.length - nOk,
  defects: byKind('DEFECT').length,
  orderDefects: byKind('ORDER').length,
  cascades: byKind('CASCADE').length,
  environment: byKind('ENV').length,
  skippedFiles,
  skippedDirs,
  duplicateVersions,
  tables: tables.length,
  tablesWithoutRls: tables.filter((t) => !t.rls).map((t) => t.name),
  tablesRlsNoPolicy: tables.filter((t) => t.rls && t.policies === 0).map((t) => t.name),
  securityDefinerWithoutSearchPath: functions.filter((f) => f.securityDefiner && !f.searchPathSet).map((f) => f.name),
  liveTypesTables: liveTables.length,
  inLiveTypesNotReplay: inLiveNotReplay,
  inReplayNotLiveTypes: inReplayNotLive.length,
  results,
};
fs.writeFileSync(path.join(OUT, 'replay-results.json'), JSON.stringify(summary, null, 2));

const md = [];
md.push('# Migration replay report', '');
md.push(`Generated by \`scripts/db/replay-migrations.mjs\` on ${summary.generatedAt} against PostgreSQL ${PG_VERSION} with \`scripts/db/supabase-compat-shim.sql\`. Mode: **${summary.mode}**.`, '');
md.push('| Metric | Value |', '|---|---|');
md.push(`| Files the Supabase CLI applies (\`<digits>_<name>.sql\`) | ${applied.length} |`);
md.push(`| Attempted / applied in order / failed in order | ${results.length} / ${nFirstPass} / ${results.length - nFirstPass} |`);
if (MULTIPASS) md.push(`| Applied after multipass retries / never applied | ${nOk - nFirstPass} / ${results.length - nOk} |`);
md.push(`| Failures: defect / ordering defect / cascade / environment | ${summary.defects} / ${summary.orderDefects} / ${summary.cascades} / ${summary.environment} |`);
md.push(`| Top-level files the CLI skips (bad name) | ${skippedFiles.length} |`);
md.push(`| Subdirectory files the CLI never reads | ${skippedDirs.reduce((a, d) => a + d.files, 0)} (${skippedDirs.map((d) => `${d.dir}/: ${d.files}`).join(', ')}) |`);
md.push(`| Duplicate versions | ${duplicateVersions.length ? duplicateVersions.join(', ') : 'none'} |`);
md.push(`| Tables in \`public\` after replay | ${tables.length} |`);
md.push(`| …without RLS / with RLS but no policy | ${summary.tablesWithoutRls.length} / ${summary.tablesRlsNoPolicy.length} |`);
md.push(`| SECURITY DEFINER functions without \`search_path\` | ${summary.securityDefinerWithoutSearchPath.length} |`);
md.push(`| Tables in generated \`types.ts\` (live proxy) | ${liveTables.length} |`);
md.push(`| …of which the replay does NOT produce | ${inLiveNotReplay.length} |`);
md.push(`| Tables the replay produces that \`types.ts\` lacks | ${inReplayNotLive.length} |`, '');
md.push('Failure kinds: **DEFECT** = the SQL itself is wrong for any database; **ORDER** = needs an object that only a later migration creates (breaks every from-scratch replay); **CASCADE** = fails only because an earlier failed file did not create an object it needs; **ENV** = needs a Supabase-managed object or extension the vanilla replay lacks (verify on a real Supabase stack).', '');
if (MULTIPASS) {
  md.push('## Multipass diagnostic', '');
  md.push('First-pass failures were retried until a pass applied nothing new. **Files that apply only in a later pass have an ordering dependency on a later file. Files that never apply have a defect of their own (or depend on one).** The resulting schema is not canonical, because files ran out of order.', '');
  md.push('| Pass | Newly applied |', '|---|---|', `| 1 | ${results.filter((x) => x.ok && !x.appliedInPass).length} |`, ...passes.map((p) => `| ${p.pass} | ${p.applied} |`), '');
  const never = results.filter((x) => !x.ok);
  md.push('### Never applied (intrinsic defects)', '');
  if (!never.length) md.push('None.', '');
  else {
    md.push('| # | File | Line | Error on last attempt |', '|---|---|---|---|');
    never.forEach((x, i) => md.push(`| ${i + 1} | \`${x.file}\` | ${x.finalLine ?? x.line ?? '—'} | ${esc(x.finalMessage ?? x.message)} |`));
    md.push('');
  }
  const late = results.filter((x) => x.appliedInPass);
  md.push('### Applied only in a later pass (ordering dependencies)', '');
  md.push(late.length ? late.map((x) => `\`${x.file}\` (pass ${x.appliedInPass})`).join(', ') : 'None.', '');
}
md.push('## Failed migrations (first pass)', '');
const failedRows = results.filter((x) => !x.ok || x.appliedInPass);
if (!failedRows.length) md.push('None.', '');
else {
  md.push('| # | File | Kind | Line | Error |', '|---|---|---|---|---|');
  failedRows.forEach((x, i) =>
    md.push(`| ${i + 1} | \`${x.file}\` | ${x.kind}${x.cascadeFrom ? ` (${x.kind === 'ORDER' ? 'created later in' : 'from'} \`${x.cascadeFrom}\`)` : ''} | ${x.line ?? '—'} | ${esc(x.message)}${x.detail ? ` — ${esc(x.detail)}` : ''} |`),
  );
  md.push('');
}
md.push('## `user_belongs_to_hospital` as defined after replay', '');
if (ubh.length) ubh.forEach(([args]) => md.push(`- \`user_belongs_to_hospital(${args})\``));
else md.push('- not defined');
md.push('');
md.push('## Tables in the live types but not produced by replaying the migrations', '');
md.push(inLiveNotReplay.length ? inLiveNotReplay.map((t) => `\`${t}\``).join(', ') : 'None.', '');
md.push('## Files the Supabase CLI does not apply', '');
md.push(`Top-level: ${skippedFiles.length ? skippedFiles.map((f) => `\`${f}\``).join(', ') : 'none'}.`, '');
md.push(`Subdirectories: ${skippedDirs.map((d) => `\`${d.dir}/\` (${d.files} files)`).join(', ') || 'none'}.`, '');
md.push('## All applied files', '');
md.push('| # | File | Result | ms |', '|---|---|---|---|');
results.forEach((x, i) => md.push(`| ${i + 1} | \`${x.file}\` | ${x.ok ? (x.appliedInPass ? `ok in pass ${x.appliedInPass} (first: ${x.kind})` : 'ok') : x.kind} | ${x.ms} |`));
fs.writeFileSync(path.join(OUT, 'REPORT.md'), md.join('\n') + '\n');

console.log(
  `${nOk}/${results.length} applied; failures: ${summary.defects} defect, ${summary.orderDefects} ordering, ${summary.cascades} cascade, ${summary.environment} environment. Report: ${path.relative(ROOT, OUT) || OUT}/REPORT.md`,
);
process.exitCode = nFirstPass === applied.length ? 0 : 1;
