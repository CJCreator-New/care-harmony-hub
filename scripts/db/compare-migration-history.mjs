#!/usr/bin/env node
/**
 * scripts/db/compare-migration-history.mjs
 *
 * Compares the live migration history (live_migration_history.tsv written by
 * scripts/db/capture-live-schema.sh) with the migration files in the repository.
 * Audit task S0-01: shows which repository migrations actually ran in
 * production, which never did, and which live versions have no file at all.
 *
 * Usage:
 *   node scripts/db/compare-migration-history.mjs <capture-dir>/live_migration_history.tsv [--md <out.md>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [historyFile, ...rest] = process.argv.slice(2);
if (!historyFile || !fs.existsSync(historyFile)) {
  console.error('usage: node scripts/db/compare-migration-history.mjs <live_migration_history.tsv> [--md <out.md>]');
  process.exit(2);
}
const mdOut = rest[rest.indexOf('--md') + 1] && rest.includes('--md') ? rest[rest.indexOf('--md') + 1] : null;

const live = new Map(
  fs
    .readFileSync(historyFile, 'utf8')
    .split('\n')
    .filter((l) => /^\d+\t?/.test(l))
    .map((l) => {
      const [version, name = ''] = l.split('\t');
      return [version.trim(), name.trim()];
    }),
);

const CLI = /^(\d+)_(.*)\.sql$/;
const repoFiles = [];
for (const dir of ['supabase/migrations', 'supabase/migrations_archive']) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    const m = f.match(CLI);
    if (m) repoFiles.push({ dir, file: f, version: m[1] });
  }
}
const repoVersions = new Set(repoFiles.map((f) => f.version));

const appliedLive = repoFiles.filter((f) => live.has(f.version));
const notApplied = repoFiles.filter((f) => !live.has(f.version));
const liveOnly = [...live].filter(([v]) => !repoVersions.has(v));

const lines = [
  '# Live migration history vs repository',
  '',
  `Source: \`${path.relative(ROOT, path.resolve(historyFile))}\``,
  '',
  '| Metric | Count |',
  '|---|---|',
  `| Versions recorded in the live database | ${live.size} |`,
  `| Repository migration files (CLI-named) | ${repoFiles.length} |`,
  `| Repository files that ran live | ${appliedLive.length} |`,
  `| Repository files that NEVER ran live | ${notApplied.length} |`,
  `| Live versions with no repository file | ${liveOnly.length} |`,
  '',
  '## Repository files that never ran in the live database',
  '',
  ...(notApplied.length ? notApplied.map((f) => `- \`${f.dir}/${f.file}\``) : ['None.']),
  '',
  '## Live versions with no file in the repository',
  '',
  'These changes exist only in production (applied from another branch, the dashboard SQL editor, or Lovable) and are captured only by the live schema dump.',
  '',
  ...(liveOnly.length ? liveOnly.map(([v, n]) => `- \`${v}\`${n ? ` ${n}` : ''}`) : ['None.']),
  '',
];
const md = lines.join('\n');
if (mdOut) fs.writeFileSync(mdOut, md);
console.log(md);
