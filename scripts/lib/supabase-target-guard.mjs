/**
 * Production target guard for test, seed and E2E-setup tooling (S0-11, OPS-17 / SECF-21).
 *
 * Test and seed tooling must never write to the production Supabase project.
 * The production project ref is read from `supabase/config.toml` (`project_id`),
 * the project this repo deploys to. More refs or app hosts can be added with
 * PRODUCTION_SUPABASE_REFS / PRODUCTION_APP_HOSTS (comma-separated).
 *
 * There is deliberately no override flag: point the tooling at a local stack
 * (`supabase start`) or at the dedicated test/staging project instead.
 *
 * Messages name variables and hosts only, never keys or passwords.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Production app hosts referenced in the repo (package.json `test:health-check:production`). */
const KNOWN_PRODUCTION_HOSTS = ['app.caresync.com', 'caresync.com', 'www.caresync.com'];

const splitList = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

/** Supabase project refs that count as production. */
export function productionSupabaseRefs() {
  const refs = new Set(splitList(process.env.PRODUCTION_SUPABASE_REFS));
  try {
    const toml = fileURLToPath(new URL('../../supabase/config.toml', import.meta.url));
    if (existsSync(toml)) {
      const m = readFileSync(toml, 'utf8').match(/^\s*project_id\s*=\s*"([a-z0-9]+)"/m);
      if (m) refs.add(m[1].toLowerCase());
    }
  } catch {
    /* the env list still applies */
  }
  return [...refs];
}

/** Production app hosts (exact hostname match). */
export function productionAppHosts() {
  return [...KNOWN_PRODUCTION_HOSTS, ...splitList(process.env.PRODUCTION_APP_HOSTS)];
}

/**
 * True when `target` (an https URL, a postgres connection string or a bare host)
 * refers to the production Supabase project or a production app host.
 */
export function isProductionTarget(target) {
  if (!target) return false;
  const value = String(target).trim().toLowerCase();
  // The ref appears as <ref>.supabase.co, db.<ref>.supabase.co, or the pooler user postgres.<ref>.
  if (productionSupabaseRefs().some((ref) => value.includes(ref))) return true;
  let host = value;
  try {
    host = new URL(value).hostname;
  } catch {
    /* bare host */
  }
  host = host.replace(/\.$/, '');
  return productionAppHosts().includes(host);
}

/**
 * Throws when `target` points at production. `label` names the variable or
 * setting the value came from; the value itself is only reported by host.
 */
export function assertNotProductionTarget(target, label, context = 'This test/seed tooling') {
  if (!isProductionTarget(target)) return;
  let host = 'the production project';
  try {
    host = new URL(String(target)).hostname;
  } catch {
    /* not a URL; keep the generic wording */
  }
  throw new Error(
    `${label} points at production (${host}). ${context} only runs against a local Supabase stack ` +
      '(`supabase start`) or the dedicated test/staging project. Refusing to run. ' +
      'See docs/operations/SECRET_ROTATION_AND_HISTORY_PURGE.md.'
  );
}

/** Same as assertNotProductionTarget, but prints the message and exits(1). For CLI scripts. */
export function exitIfProductionTarget(target, label, context) {
  try {
    assertNotProductionTarget(target, label, context);
  } catch (err) {
    console.error(`REFUSING TO RUN: ${err.message}`);
    process.exit(1);
  }
}
