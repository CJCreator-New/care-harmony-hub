#!/usr/bin/env node
/**
 * Local test for supabase/pending-migrations/20261105000006_rls_lab_tables.sql.
 *
 * Creates a throwaway PostgreSQL cluster (same approach as tests/s0-04: server
 * binaries, no Docker, no credentials), then:
 *   1. scripts/db/supabase-compat-shim.sql
 *   2. tests/s0-06-rls/00000000000000_fixture.sql      six lab tables, two hospitals
 *   3. 20261105000006_rls_lab_tables.sql                first apply
 *   4. 20261105000006_rls_lab_tables.sql                second apply; the policy
 *                                                       set and grants must match step 3
 *   5. tests/s0-06-rls/99999999999999_assertions.sql    read/write matrix and state
 *   6. guard: shim only, then the migration, which must abort and change nothing
 *
 * Usage: node supabase/pending-migrations/tests/s0-06-rls/run-tests.mjs
 * Env: PG_BIN, REPLAY_PG_USER (when run as root; default nobody), REPLAY_WORKDIR.
 * Exit code 0 only if every step behaves as expected.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..', '..', '..');
const PENDING = path.resolve(HERE, '..', '..');
const FILES = {
  shim: path.join(ROOT, 'scripts', 'db', 'supabase-compat-shim.sql'),
  fixture: path.join(HERE, '00000000000000_fixture.sql'),
  s006: path.join(PENDING, '20261105000006_rls_lab_tables.sql'),
  assertions: path.join(HERE, '99999999999999_assertions.sql'),
};

function findPgBin() {
  if (process.env.PG_BIN) return process.env.PG_BIN;
  const r = spawnSync('pg_config', ['--bindir'], { encoding: 'utf8' });
  if (r.status === 0 && fs.existsSync(path.join(r.stdout.trim(), 'initdb'))) return r.stdout.trim();
  const base = '/usr/lib/postgresql';
  if (fs.existsSync(base)) {
    for (const v of fs.readdirSync(base).filter((x) => /^\d+$/.test(x)).sort((a, b) => b - a)) {
      if (fs.existsSync(path.join(base, v, 'bin', 'initdb'))) return path.join(base, v, 'bin');
    }
  }
  console.error('PostgreSQL server binaries not found; set PG_BIN.');
  process.exit(2);
}

const PG_BIN = findPgBin();
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;
const PG_USER = process.env.REPLAY_PG_USER || 'nobody';
const run = (cmd, args, asPgUser = false) => {
  const bin = path.join(PG_BIN, cmd);
  const [c, a] = asPgUser && IS_ROOT ? ['runuser', ['-u', PG_USER, '--', bin, ...args]] : [bin, args];
  return spawnSync(c, a, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
};

// The cluster lives under REPLAY_WORKDIR (default: the OS temp dir) and listens
// on 127.0.0.1 only, with no unix socket, so nothing else is needed outside it.
const workdir = fs.mkdtempSync(path.join(process.env.REPLAY_WORKDIR || os.tmpdir(), 's006-'));
const pgdata = path.join(workdir, 'data');
const PORT = 40000 + Math.floor(Math.random() * 20000);
if (IS_ROOT) {
  const uid = Number(spawnSync('id', ['-u', PG_USER], { encoding: 'utf8' }).stdout.trim());
  const gid = Number(spawnSync('id', ['-g', PG_USER], { encoding: 'utf8' }).stdout.trim());
  fs.chownSync(workdir, uid, gid);
}
let r = run('initdb', ['-D', pgdata, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale'], true);
if (r.status !== 0) { console.error(r.stderr); process.exit(2); }
r = run('pg_ctl', ['-D', pgdata, '-w', '-l', path.join(workdir, 'server.log'),
  '-o', `-c listen_addresses=127.0.0.1 -c port=${PORT} -c unix_socket_directories='' -c fsync=off`, 'start'], true);
if (r.status !== 0) { console.error(r.stderr); process.exit(2); }
process.on('exit', () => {
  run('pg_ctl', ['-D', pgdata, '-m', 'immediate', 'stop'], true);
  fs.rmSync(workdir, { recursive: true, force: true });
});

const BASE = ['-X', '-q', '-h', '127.0.0.1', '-p', String(PORT), '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'];
const psql = (db, args) => run('psql', [...BASE, '-d', db, ...args]);
const query = (db, sql) => {
  const q = psql(db, ['-A', '-t', '-c', sql]);
  if (q.status !== 0) throw new Error(q.stderr);
  return q.stdout.trim();
};
run('psql', [...BASE, '-d', 'postgres', '-c', 'CREATE DATABASE s006']);
run('psql', [...BASE, '-d', 'postgres', '-c', 'CREATE DATABASE s006_guard']);

let failed = false;
const POLICY_SNAPSHOT = `SELECT string_agg(format('%s|%s|%s|%s|%s|%s|%s', tablename, policyname, permissive, cmd, roles, qual, with_check), E'\\n' ORDER BY tablename, policyname) FROM pg_policies WHERE schemaname = 'public'`;
const GRANT_SNAPSHOT = `SELECT string_agg(format('%s|%s|%s', table_name, grantee, privilege_type), E'\\n' ORDER BY table_name, grantee, privilege_type) FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name IN ('lab_results','lab_qc_results','lab_trends','lab_interpretation_rules','critical_value_notifications','loinc_codes')`;

const step = (label, db, args, { show = 'errors' } = {}) => {
  const res = psql(db, ['--single-transaction', ...args]);
  const okExit = res.status === 0;
  if (!okExit) failed = true;
  console.log(`\n=== ${okExit ? 'OK  ' : 'FAIL'} ${label} (psql exit ${res.status})`);
  const lines = res.stderr.split('\n').filter(Boolean);
  const shown = show === 'all' ? lines : lines.filter((l) => /ERROR|NOTICE|WARNING|FAIL/.test(l));
  for (const l of shown) console.log('  ' + l.replace(/^psql:[^:]+:\d+: /, ''));
  return res;
};

step('compat shim', 's006', ['-f', FILES.shim]);
step('fixture (six lab tables, two hospitals, seed rows)', 's006', ['-f', FILES.fixture]);
step('20261105000006 apply #1', 's006', ['-f', FILES.s006]);
const pol1 = query('s006', POLICY_SNAPSHOT);
const grant1 = query('s006', GRANT_SNAPSHOT);
step('20261105000006 apply #2 (idempotency)', 's006', ['-f', FILES.s006]);
const pol2 = query('s006', POLICY_SNAPSHOT);
const grant2 = query('s006', GRANT_SNAPSHOT);
const samePol = pol1 === pol2;
const sameGrant = grant1 === grant2;
if (!samePol || !sameGrant) failed = true;
console.log(`\n=== ${samePol ? 'OK  ' : 'FAIL'} policy set identical after apply #1 and #2 (${pol1.split('\n').length} policy rows)`);
console.log(`=== ${sameGrant ? 'OK  ' : 'FAIL'} table grants identical after apply #1 and #2 (${grant1.split('\n').length} grant rows)`);

step('assertions (read/write matrix, state)', 's006', ['-f', FILES.assertions], { show: 'all' });

// Guard: a database without the six tables must abort and create nothing.
step('guard: shim only', 's006_guard', ['-f', FILES.shim]);
const guard = psql('s006_guard', ['--single-transaction', '-f', FILES.s006]);
const guardAborted = guard.status !== 0 && /missing table/.test(guard.stderr);
if (!guardAborted) failed = true;
console.log(`\n=== ${guardAborted ? 'OK  ' : 'FAIL'} migration aborts on a database without the lab tables (psql exit ${guard.status})`);
for (const l of guard.stderr.split('\n').filter((x) => /ERROR/.test(x))) {
  console.log('  ' + l.replace(/^psql:[^:]+:\d+: /, ''));
}
const policiesOnGuard = query('s006_guard', `SELECT count(*) FROM pg_policies WHERE schemaname = 'public'`);
const guardClean = policiesOnGuard === '0';
if (!guardClean) failed = true;
console.log(`=== ${guardClean ? 'OK  ' : 'FAIL'} guard database has no policies after the abort (${policiesOnGuard})`);

console.log(`\n${failed ? '20261105000006 TESTS FAILED' : '20261105000006 TESTS PASSED'}`);
process.exit(failed ? 1 : 0);
