/**
 * Staging-only environment for the S0-07 clinical smoke test.
 *
 * Everything here is opt-in: nothing runs unless the operator sets the
 * E2E_STAGING_* variables, and nothing runs when the target looks like
 * production. Values (passwords, ids) are never printed, only variable names.
 */

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type StagingRole = 'doctor' | 'pharmacist' | 'nurse';

/** Production app hosts referenced in the repo (package.json `test:health-check:production`). */
const KNOWN_PRODUCTION_HOSTS = ['app.caresync.com', 'caresync.com', 'www.caresync.com'];

/**
 * Production Supabase project ref(s). Read from `supabase/config.toml`
 * (`project_id`), which is the project the repo deploys to.
 */
function productionSupabaseRefs(): string[] {
  const refs = new Set<string>();
  try {
    const toml = fileURLToPath(new URL('../../../supabase/config.toml', import.meta.url));
    if (existsSync(toml)) {
      const m = readFileSync(toml, 'utf8').match(/^\s*project_id\s*=\s*"([a-z0-9]+)"/m);
      if (m) refs.add(m[1].toLowerCase());
    }
  } catch {
    /* fall through: the explicit list below still applies */
  }
  for (const r of (process.env.E2E_PRODUCTION_SUPABASE_REFS || '').split(',')) {
    if (r.trim()) refs.add(r.trim().toLowerCase());
  }
  return [...refs];
}

function productionHosts(): string[] {
  const extra = (process.env.E2E_PRODUCTION_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return [...KNOWN_PRODUCTION_HOSTS, ...extra];
}

const PROD_REFS = productionSupabaseRefs();
const PROD_HOSTS = productionHosts();

/** True when `host` is a production app host or the production Supabase project. */
export function isProductionHost(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (PROD_HOSTS.some((p) => h === p)) return true;
  // The Supabase project ref appears as <ref>.supabase.co / <ref>.functions.supabase.co etc.
  return PROD_REFS.some((ref) => h === ref || h.startsWith(`${ref}.`) || h.includes(`.${ref}.`));
}

/** Throws when `url` is unparsable or points at production. Never echoes secrets. */
export function assertNotProductionUrl(url: string, varName: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`${varName} is not a valid URL.`);
  }
  if (isProductionHost(host)) {
    throw new Error(
      `${varName} points at a production host (${host}). The S0-07 clinical smoke test only runs against staging. Refusing to run.`
    );
  }
}

const read = (name: string): string | undefined => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
};

export interface StagingEnv {
  readonly baseUrl?: string;
  /** Optional: the Supabase URL the staging app is built against; requests to any other *.supabase.co host are blocked. */
  readonly supabaseUrl?: string;
  readonly patientId?: string;
  readonly patientMrn?: string;
  readonly consultationId?: string;
  readonly credentials: Partial<Record<StagingRole, { email: string; password: string }>>;
}

export function readStagingEnv(): StagingEnv {
  const credentials: StagingEnv['credentials'] = {};
  for (const role of ['doctor', 'pharmacist', 'nurse'] as const) {
    const email = read(`E2E_STAGING_${role.toUpperCase()}_EMAIL`);
    const password = read(`E2E_STAGING_${role.toUpperCase()}_PASSWORD`);
    if (email && password) credentials[role] = { email, password };
  }
  return {
    baseUrl: read('E2E_STAGING_BASE_URL'),
    supabaseUrl: read('E2E_STAGING_SUPABASE_URL'),
    patientId: read('E2E_STAGING_PATIENT_ID'),
    patientMrn: read('E2E_STAGING_PATIENT_MRN'),
    consultationId: read('E2E_STAGING_CONSULTATION_ID'),
    credentials,
  };
}

/** Names of required variables that are not set (names only, never values). */
export function missingVars(env: StagingEnv, needs: { roles?: StagingRole[]; consultation?: boolean }): string[] {
  const missing: string[] = [];
  if (!env.baseUrl) missing.push('E2E_STAGING_BASE_URL');
  if (!env.patientId) missing.push('E2E_STAGING_PATIENT_ID');
  if (!env.patientMrn) missing.push('E2E_STAGING_PATIENT_MRN');
  if (needs.consultation && !env.consultationId) missing.push('E2E_STAGING_CONSULTATION_ID');
  for (const role of needs.roles ?? []) {
    if (!env.credentials[role]) {
      missing.push(`E2E_STAGING_${role.toUpperCase()}_EMAIL`, `E2E_STAGING_${role.toUpperCase()}_PASSWORD`);
    }
  }
  return missing;
}

/**
 * Validates every URL the operator supplied. Throws (fails the run) on a
 * production match; returns normally when the vars are simply absent.
 */
export function assertStagingTargets(env: StagingEnv): void {
  if (env.baseUrl) assertNotProductionUrl(env.baseUrl, 'E2E_STAGING_BASE_URL');
  if (env.supabaseUrl) assertNotProductionUrl(env.supabaseUrl, 'E2E_STAGING_SUPABASE_URL');
}
