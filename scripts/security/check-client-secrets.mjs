#!/usr/bin/env node
/**
 * check-client-secrets.mjs — guard against provider secrets in the browser bundle (SECF-03).
 *
 * Vite inlines every `import.meta.env.VITE_*` value into the public JavaScript
 * bundle. Provider credentials (AI, SMS, payment secret keys, ...) must live in
 * Supabase edge-function secrets and be used server-side only.
 *
 * Modes:
 *   node scripts/security/check-client-secrets.mjs [--src <dir>]
 *       Source scan (default dir: src). Fails if any env var name that looks like
 *       a secret (contains KEY, TOKEN, SECRET or PASSWORD) is referenced as a
 *       VITE_* name or via import.meta.env, unless it is in ALLOWLIST below.
 *
 *   node scripts/security/check-client-secrets.mjs --bundle <dir> [--canary <str>]...
 *       Built-bundle scan (e.g. dist). Fails if any file contains a canary
 *       marker (default: anything matching /AUDITCANARY[A-Z0-9_]*\/), any extra
 *       --canary string, or the value (8+ chars) of any secret-looking env var
 *       set in the current process environment that is not allowlisted.
 *       Typical use: build with canary values in the provider env vars, then scan.
 *
 * Exit codes: 0 = clean, 1 = findings, 2 = usage error.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Public, browser-safe env vars whose names contain KEY/TOKEN/SECRET/PASSWORD.
 * Every entry needs a justification; do not add provider secrets here.
 */
const ALLOWLIST = new Map([
  [
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'Supabase anon/publishable key (src/integrations/supabase/client.ts). Public by design; access is enforced by RLS and edge-function auth.',
  ],
  [
    'VITE_SUPABASE_ANON_KEY',
    'Legacy name for the same public Supabase anon key (raw edge-function fetches in src/hooks/*). Public by design.',
  ],
  [
    'VITE_STRIPE_PUBLISHABLE_KEY',
    'Stripe publishable key (pk_*), used by src/utils/paymentService.ts. Designed to ship to browsers; the Stripe secret key stays server-side.',
  ],
  [
    'VITE_E2E_MOCK_PASSWORD',
    'E2E mock-auth fixture read only behind import.meta.env.DEV in src/contexts/AuthContext.tsx; compiled out of production builds (verified by the canary build).',
  ],
]);

const SECRET_WORD = /(KEY|TOKEN|SECRET|PASSWORD)/;
const DEFAULT_CANARY = /AUDITCANARY[A-Z0-9_]*/g;
const SCANNED_EXT = /\.(c|m)?(j|t)sx?$|\.(json|md|mdx|html|css|svg|txt|map|webmanifest)$/i;
const SKIP_DIRS = new Set(['node_modules', '.git']);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else if (st.isFile()) files.push(full);
  }
  return files;
}

function parseArgs(argv) {
  const opts = { src: 'src', bundle: null, canaries: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usage(`${a} requires a value`);
      return v;
    };
    if (a === '--src') opts.src = next();
    else if (a === '--bundle') opts.bundle = next();
    else if (a === '--canary') opts.canaries.push(next());
    else if (a === '-h' || a === '--help') usage();
    else usage(`unknown argument: ${a}`);
  }
  return opts;
}

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error('usage: check-client-secrets.mjs [--src <dir>] | --bundle <dir> [--canary <str>]...');
  process.exit(msg ? 2 : 0);
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function scanSource(dir) {
  if (!existsSync(dir)) usage(`source dir not found: ${dir}`);
  // VITE_* identifiers anywhere (code, strings, docs), plus any import.meta.env.X access.
  const patterns = [/\bVITE_[A-Z0-9_]+\b/g, /import\.meta\.env\.([A-Za-z0-9_]+)/g];
  const findings = [];
  for (const file of walk(dir)) {
    if (!SCANNED_EXT.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const re of patterns) {
      for (const m of text.matchAll(re)) {
        const name = m[1] ?? m[0];
        if (!SECRET_WORD.test(name) || ALLOWLIST.has(name)) continue;
        findings.push(`${relative(process.cwd(), file)}:${lineOf(text, m.index)}  ${name}`);
      }
    }
  }
  const unique = [...new Set(findings)];
  if (unique.length) {
    console.error(`FAIL: ${unique.length} secret-looking env reference(s) in ${dir}/ (SECF-03).`);
    console.error('Provider credentials must be edge-function secrets, not VITE_* vars:');
    for (const f of unique) console.error(`  ${f}`);
    console.error('If a variable is genuinely public, add it to ALLOWLIST in scripts/security/check-client-secrets.mjs with a justification.');
    return 1;
  }
  console.log(`OK: no non-allowlisted secret env references in ${dir}/.`);
  console.log(`Allowlisted: ${[...ALLOWLIST.keys()].join(', ')}`);
  return 0;
}

function scanBundle(dir, extraCanaries) {
  if (!existsSync(dir)) usage(`bundle dir not found: ${dir}`);
  // Values of secret-looking env vars present in this process (e.g. canaries set for the build).
  const envValues = Object.entries(process.env)
    .filter(([k, v]) => SECRET_WORD.test(k) && !ALLOWLIST.has(k) && typeof v === 'string' && v.length >= 8)
    .map(([k, v]) => ({ label: `value of $${k}`, value: v }));
  const literal = [...extraCanaries.map((c) => ({ label: 'canary', value: c })), ...envValues];

  const findings = [];
  let scanned = 0;
  for (const file of walk(dir)) {
    const text = readFileSync(file, 'latin1');
    scanned++;
    const rel = relative(process.cwd(), file);
    for (const m of text.matchAll(DEFAULT_CANARY)) findings.push(`${rel}: ${m[0]}`);
    for (const { label, value } of literal) {
      if (text.includes(value)) findings.push(`${rel}: ${label}`);
    }
  }
  const unique = [...new Set(findings)];
  if (unique.length) {
    console.error(`FAIL: ${unique.length} canary/secret value(s) found in built bundle ${dir}/ (SECF-03):`);
    for (const f of unique) console.error(`  ${f}`);
    return 1;
  }
  console.log(`OK: scanned ${scanned} file(s) in ${dir}/, no canary or secret env values found (${literal.length} env/canary value(s) checked).`);
  return 0;
}

const opts = parseArgs(process.argv.slice(2));
process.exit(opts.bundle ? scanBundle(opts.bundle, opts.canaries) : scanSource(opts.src));
