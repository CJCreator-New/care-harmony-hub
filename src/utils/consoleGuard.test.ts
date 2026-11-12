/**
 * Source-level guard: a console call in src/ must not pass a patient-shaped object.
 *
 * Rules
 * - Any `console.log|error|warn|info|debug(...)` in src/ whose arguments (string literal
 *   text excluded) name a PHI or contact field (patient name, MRN, DOB, medication,
 *   diagnosis, notes, e-mail, phone, address, SSN, allergies) fails the test. Use `createLogger` from
 *   `@/utils/logger` instead: it redacts those keys.
 * - `KNOWN_PHI_CONSOLE_DEBT` lists files that already do this. It is a ratchet: a
 *   listed file may not gain more matches, and an unlisted file may not add any.
 *   Remove entries as the calls are routed through the logger.
 * - Files in `CONSOLE_ALLOWED_FILES` may call console directly (the logger itself).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

// Vitest runs from the repository root; jsdom gives import.meta.url no file: scheme.
const SRC_DIR = resolve(process.cwd(), 'src');

/** Files that may call console directly. */
const CONSOLE_ALLOWED_FILES = new Set<string>(['utils/logger.ts']);

/** Field names that identify a patient or carry contact or clinical free text. */
const PHI_SHAPED =
  /(patient_?name|patientname|first_?name|last_?name|mrn|uhid|\bdob\b|date_?of_?birth|medication|diagnos|clinical_?notes|notes|email|phone|mobile|address|\bssn\b|allerg)/i;

const CONSOLE_CALL = /console\.(log|error|warn|info|debug)\(/g;

/**
 * Existing offenders, file -> number of PHI-shaped console calls. Ratchet only.
 * Owned by other workstreams (nurse/lab/billing/dashboard paths are off-limits to this change).
 */
const KNOWN_PHI_CONSOLE_DEBT: Record<string, number> = {};

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Remove string and template literal contents so only identifiers and keys are matched. */
export function stripStringLiterals(arg: string): string {
  return arg.replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''");
}

/** Return the argument text of each console call in `source`. */
export function consoleCallArgs(source: string): string[] {
  const args: string[] = [];
  CONSOLE_CALL.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CONSOLE_CALL.exec(source))) {
    let i = match.index + match[0].length;
    let depth = 1;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      i++;
    }
    args.push(source.slice(match.index + match[0].length, i - 1));
  }
  return args;
}

function relativeSrcPath(file: string): string {
  return relative(SRC_DIR, file).split(sep).join('/');
}

describe('console calls in src/ do not carry patient-shaped data', () => {
  const files = listSourceFiles(SRC_DIR);

  it('scans a non-trivial set of source files', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('allows console directly only in the allow-listed files', () => {
    for (const file of CONSOLE_ALLOWED_FILES) {
      expect(statSync(join(SRC_DIR, file)).isFile()).toBe(true);
    }
  });

  it('fails on any new PHI-shaped console call, and on growth in known debt', () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = relativeSrcPath(file);
      if (CONSOLE_ALLOWED_FILES.has(rel)) continue;

      const source = readFileSync(file, 'utf8');
      const hits = consoleCallArgs(source)
        .map(stripStringLiterals)
        .filter((arg) => PHI_SHAPED.test(arg)).length;
      if (hits === 0) continue;

      const allowed = KNOWN_PHI_CONSOLE_DEBT[rel] ?? 0;
      if (hits > allowed) {
        violations.push(`src/${rel}: ${hits} PHI-shaped console call(s), allowed ${allowed}`);
      }
    }

    expect(violations, violations.join('\n')).toEqual([]);
  });

  it('detects a patient-shaped console call (self-test of the matcher)', () => {
    const sample = "console.error('save failed', { patientName: p.name, mrn: p.mrn });";
    const args = consoleCallArgs(sample).map(stripStringLiterals);
    expect(args).toHaveLength(1);
    expect(PHI_SHAPED.test(args[0])).toBe(true);

    // A PHI word inside a message string is not patient data.
    expect(PHI_SHAPED.test(stripStringLiterals(consoleCallArgs("console.error('Email error:', err);")[0]))).toBe(false);
    expect(PHI_SHAPED.test(stripStringLiterals(consoleCallArgs("console.log('count', n);")[0]))).toBe(false);
  });
});
