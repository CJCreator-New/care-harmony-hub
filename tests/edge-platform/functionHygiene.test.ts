/**
 * S2-07 (EDGE-18, EDGE-26, EDGE-27, EDGE-29, EDGE-10, EDGE-17): edge-function hygiene.
 *
 * Deno is not available to vitest, so these tests check the properties that make a function
 * fail to boot or regress silently, by reading the source:
 *   - every deployable function is declared in supabase/config.toml (EDGE-26)
 *   - supabase-js is pinned to an exact version, not a floating @2 (EDGE-27)
 *   - every named import from a relative module is an export that module really has (EDGE-18)
 *   - the retired RxNav interaction endpoint is no longer called (EDGE-29)
 *   - insurance-integration returns 501 and does not persist simulated payer results (EDGE-10)
 *   - lab-result-notify does not report fake delivery or log contact details or lab values (EDGE-17)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../supabase');
const FUNCTIONS = join(ROOT, 'functions');

const read = (path: string) => readFileSync(path, 'utf8');

/** Deployable function directories: direct children of functions/ that contain index.ts. */
function deployableFunctions(): string[] {
  return readdirSync(FUNCTIONS)
    .filter((name) => !name.startsWith('_') && statSync(join(FUNCTIONS, name)).isDirectory())
    .filter((name) => existsSync(join(FUNCTIONS, name, 'index.ts')));
}

function allFunctionTsFiles(dir: string = FUNCTIONS): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...allFunctionTsFiles(full));
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

/** Names exported by a module. Returns null when the module re-exports with `export *`. */
function exportedNames(source: string): Set<string> | null {
  if (/export\s*\*\s*from/.test(source)) return null;
  const names = new Set<string>();
  for (const m of source.matchAll(/export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g)) {
    names.add(m[1]);
  }
  for (const m of source.matchAll(/export\s+(?:type\s+)?\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '').trim();
      if (name) names.add(name);
    }
  }
  return names;
}

describe('EDGE-26: config.toml declares every deployable function', () => {
  it('has a [functions.<name>] entry for each function directory', () => {
    const config = read(join(ROOT, 'config.toml'));
    const missing = deployableFunctions().filter((name) => !config.includes(`[functions.${name}]`));
    expect(missing).toEqual([]);
  });
});

describe('EDGE-27: remote imports are pinned', () => {
  it('has no floating supabase-js specifier (esm.sh/@supabase/supabase-js@2 with no minor)', () => {
    const offenders = allFunctionTsFiles().filter((file) =>
      /supabase-js@2(?!\.\d)/.test(read(file)),
    );
    expect(offenders.map((f) => f.replace(FUNCTIONS, ''))).toEqual([]);
  });
});

describe('EDGE-18: named imports resolve to real exports (boot check)', () => {
  it('every named import from a relative module exists in that module', () => {
    const problems: string[] = [];
    for (const file of allFunctionTsFiles()) {
      const source = read(file);
      for (const m of source.matchAll(/import\s+(?:type\s+)?\{([^}]+)\}\s*from\s*["'](\.[^"']+\.ts)["']/g)) {
        const target = resolve(dirname(file), m[2]);
        if (!existsSync(target)) {
          problems.push(`${file}: missing module ${m[2]}`);
          continue;
        }
        const exported = exportedNames(read(target));
        if (exported === null) continue;
        for (const part of m[1].split(',')) {
          const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
          if (name && !exported.has(name)) {
            problems.push(`${file.replace(FUNCTIONS, '')}: "${name}" is not exported by ${m[2]}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('predict-deterioration references no undeclared hospital_id identifier', () => {
    const source = read(join(FUNCTIONS, 'predict-deterioration', 'index.ts'));
    // Bare `hospital_id` (not a property access or object key) must not be used as a value.
    const bare = source
      .split('\n')
      .filter((line) => /(?<![.\w'"])hospital_id(?![\w'"]*\s*:)/.test(line) && !/^\s*\/\//.test(line));
    expect(bare).toEqual([]);
  });
});

describe('EDGE-29: drug-interaction-check does not call the retired RxNav API', () => {
  it('contains no RxNav host or /interaction/ endpoint', () => {
    const source = read(join(FUNCTIONS, 'drug-interaction-check', 'index.ts'));
    expect(source).not.toMatch(/rxnav\.nlm\.nih\.gov/);
    expect(source).not.toMatch(/\/interaction\/list\.json/);
  });
});

describe('EDGE-10: insurance-integration persists no simulated payer results', () => {
  const source = read(join(FUNCTIONS, 'insurance-integration', 'index.ts'));

  it('has no hard-coded eligibility or adjudication object', () => {
    expect(source).not.toMatch(/eligible:\s*true/);
    expect(source).not.toMatch(/\* 0\.8/);
    expect(source).not.toMatch(/1234567890/);
  });

  it('writes nothing to the database', () => {
    expect(source).not.toMatch(/\.insert\(|\.update\(|\.upsert\(/);
  });

  it('answers 501', () => {
    expect(source).toMatch(/status:\s*501/);
  });
});

describe('EDGE-17: lab-result-notify does not fake delivery or log PHI', () => {
  const source = read(join(FUNCTIONS, 'lab-result-notify', 'index.ts'));

  it('does not use console.log and does not log contact details or values', () => {
    expect(source).not.toMatch(/console\.log\(/);
    expect(source).not.toMatch(/console\.error\([^)]*(phone|email|labResult|result_value)/);
  });

  it('does not treat an unknown range as not critical', () => {
    expect(source).not.toMatch(/if \(error \|\| !ranges\) return false/);
  });

  it('is rate limited', () => {
    expect(source).toMatch(/withRateLimit\(req, handler\)/);
  });
});
