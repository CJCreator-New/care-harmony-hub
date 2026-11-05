#!/usr/bin/env node
/**
 * Local test for supabase/pending-migrations/20261105000004_role_aware_rls.sql (S0-04).
 *
 * Creates a throwaway PostgreSQL cluster (same approach as
 * scripts/db/replay-migrations.mjs: server binaries, no Docker, no credentials),
 * then applies, each in one transaction:
 *   1. scripts/db/supabase-compat-shim.sql
 *   2. tests/s0-04/00000000000000_fixture.sql   live-like schema, policies, data
 *   3. 20261105000002_mfa_backup_codes_and_aal2.sql  (S0-10, already pending)
 *   4. 20261105000004_role_aware_rls.sql         first apply
 *   5. 20261105000004_role_aware_rls.sql         second apply; the policy set
 *                                                must be identical to step 4
 *   6. tests/s0-04/99999999999999_assertions.sql read matrix + write checks
 *   7. abort mode: add a live-only policy, rerun with
 *      s0_04.unknown_policy_mode=abort (must fail and change nothing), then
 *      rerun in sweep mode (must succeed and record the policy as live-only)
 *
 * Usage: node supabase/pending-migrations/tests/s0-04/run-tests.mjs
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
  s010: path.join(PENDING, '20261105000002_mfa_backup_codes_and_aal2.sql'),
  s004: path.join(PENDING, '20261105000004_role_aware_rls.sql'),
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

const workdir = fs.mkdtempSync(path.join(process.env.REPLAY_WORKDIR || os.tmpdir(), 's004-'));
const sock = fs.mkdtempSync(path.join(os.tmpdir(), 'pgs-'));
const pgdata = path.join(workdir, 'data');
if (IS_ROOT) {
  const uid = Number(spawnSync('id', ['-u', PG_USER], { encoding: 'utf8' }).stdout.trim());
  const gid = Number(spawnSync('id', ['-g', PG_USER], { encoding: 'utf8' }).stdout.trim());
  for (const d of [workdir, sock]) fs.chownSync(d, uid, gid);
}
let r = run('initdb', ['-D', pgdata, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale'], true);
if (r.status !== 0) { console.error(r.stderr); process.exit(2); }
r = run('pg_ctl', ['-D', pgdata, '-w', '-l', path.join(workdir, 'server.log'),
  '-o', `-c listen_addresses='' -k ${sock} -c fsync=off`, 'start'], true);
if (r.status !== 0) { console.error(r.stderr); process.exit(2); }
process.on('exit', () => {
  run('pg_ctl', ['-D', pgdata, '-m', 'immediate', 'stop'], true);
  fs.rmSync(sock, { recursive: true, force: true });
  fs.rmSync(workdir, { recursive: true, force: true });
});

const BASE = ['-X', '-q', '-h', sock, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1'];
const psql = (args) => run('psql', [...BASE, '-d', 's004', ...args]);
const query = (sql) => {
  const q = psql(['-A', '-t', '-c', sql]);
  if (q.status !== 0) throw new Error(q.stderr);
  return q.stdout.trim();
};
run('psql', [...BASE, '-d', 'postgres', '-c', 'CREATE DATABASE s004']);

let failed = false;
const step = (label, args, { expectFail = false, show = 'errors', fatal = true } = {}) => {
  const res = psql(['--single-transaction', ...args]);
  const okExit = expectFail ? res.status !== 0 : res.status === 0;
  if (!okExit) failed = true;
  if (!okExit && fatal && !expectFail) {
    console.log(`\n=== FAIL ${label} (psql exit ${res.status})\n${res.stderr}`);
    process.exit(1);
  }
  console.log(`\n=== ${okExit ? 'OK  ' : 'FAIL'} ${label} (psql exit ${res.status}${expectFail ? ', failure expected' : ''})`);
  const lines = res.stderr.split('\n').filter(Boolean);
  const shown = show === 'all' ? lines : lines.filter((l) => /ERROR|WARNING|FAIL/.test(l));
  for (const l of shown) console.log('  ' + l.replace(/^psql:[^:]+:\d+: /, ''));
  return res;
};
const POLICY_SNAPSHOT = `SELECT string_agg(format('%s|%s|%s|%s|%s|%s', tablename, policyname, permissive, cmd, qual, with_check), E'\\n' ORDER BY tablename, policyname) FROM pg_policies WHERE schemaname = 'public'`;

step('compat shim', ['-f', FILES.shim]);
step('fixture (live-like schema, policies, data)', ['-f', FILES.fixture]);
step('20261105000002 (S0-10)', ['-f', FILES.s010]);
step('20261105000004 apply #1', ['-f', FILES.s004]);
const snap1 = query(POLICY_SNAPSHOT);
step('20261105000004 apply #2 (idempotency)', ['-f', FILES.s004]);
const snap2 = query(POLICY_SNAPSHOT);
const same = snap1 === snap2;
if (!same) failed = true;
console.log(`\n=== ${same ? 'OK  ' : 'FAIL'} policy set identical after apply #1 and apply #2 (${snap1.split('\n').length} policies)`);
console.log('\n--- run log (section, action, count)');
console.log('  ' + query(`SELECT string_agg(format('%s %-38s %s', section, action, n), E'\\n  ' ORDER BY section, action)
  FROM (SELECT section, action, count(*) n FROM rls_migration_audit.s004_run_log GROUP BY 1, 2) x`));

step('assertions', ['-f', FILES.assertions], { show: 'all', fatal: false });

query(`CREATE POLICY live_only_drift ON public.invoices FOR SELECT USING (true)`);
step('abort mode with a live-only policy present', ['-c', "SET s0_04.unknown_policy_mode = 'abort'", '-f', FILES.s004], { expectFail: true });
const still = query(`SELECT count(*) FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'live_only_drift'`);
if (still !== '1') failed = true;
console.log(`=== ${still === '1' ? 'OK  ' : 'FAIL'} abort mode changed nothing (live_only_drift still present: ${still})`);
step('sweep mode (default) after drift', ['-f', FILES.s004]);
const rec = query(`SELECT count(*) FROM rls_migration_audit.s004_dropped_policies WHERE policyname = 'live_only_drift' AND NOT in_repo_history`);
const gone = query(`SELECT count(*) FROM pg_policies WHERE policyname = 'live_only_drift'`);
const swept = rec === '1' && gone === '0';
if (!swept) failed = true;
console.log(`=== ${swept ? 'OK  ' : 'FAIL'} sweep dropped live_only_drift and recorded it as live-only (recorded ${rec}, remaining ${gone})`);

console.log(`\n${failed ? 'S0-04 TESTS FAILED' : 'S0-04 TESTS PASSED'}`);
process.exit(failed ? 1 : 0);
