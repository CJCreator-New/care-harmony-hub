// @vitest-environment node
/**
 * Literal provider-key gate for scripts/security/check-client-secrets.mjs (OPS-03).
 *
 * The fixtures are fake keys written to temp dirs at test time. They are assembled
 * from parts so that this file holds no key-shaped literal. Each fixture carries a
 * "TESTFAKE" marker, so a fixture cannot be mistaken for a real credential.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(new URL('../../scripts/security/check-client-secrets.mjs', import.meta.url));
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SK = ['s', 'k'].join('');

function randomAlnum(n: number): string {
  return Array.from(randomBytes(n), (b) => ALNUM[b % ALNUM.length]).join('');
}

/** sk- + "TESTFAKE" + 16 random alphanumerics = 24 characters after the prefix. */
function fakeKey(prefix: string): string {
  return `${SK}-${prefix}TESTFAKE${randomAlnum(16)}`;
}

const tempDirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'client-secrets-'));
  tempDirs.push(dir);
  return dir;
}

function runScanner(args: string[]): { status: number | null; output: string } {
  // Drop secret-looking variables so the bundle-mode env check cannot affect the result.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/(KEY|TOKEN|SECRET|PASSWORD)/.test(k)),
  );
  const r = spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env });
  return { status: r.status, output: `${r.stdout}${r.stderr}` };
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('client secret gate: literal provider-key shapes', () => {
  it.each(['', 'proj-', 'ant-'])('source scan fails on a planted key (prefix "%s")', (prefix) => {
    const root = tempDir();
    const src = join(root, 'src');
    mkdirSync(src);
    const key = fakeKey(prefix);
    writeFileSync(join(src, 'planted.ts'), `// header\nexport const k = '${key}';\n`);

    const { status, output } = runScanner(['--src', src]);

    expect(status).toBe(1);
    expect(output).toMatch(/planted\.ts:2\b/);
    expect(output).not.toContain(key);
  });

  it('source scan passes a clean file', () => {
    const root = tempDir();
    const src = join(root, 'src');
    mkdirSync(src);
    writeFileSync(join(src, 'clean.ts'), `export const label = 'task-manager risk-assessment';\n`);

    const { status } = runScanner(['--src', src]);

    expect(status).toBe(0);
  });

  it('bundle scan fails on a planted key in built output', () => {
    const root = tempDir();
    const dist = join(root, 'dist', 'assets');
    mkdirSync(dist, { recursive: true });
    const key = fakeKey('');
    writeFileSync(join(dist, 'index-test.js'), `var a=1;\nvar k="${key}";\n`);

    const { status, output } = runScanner(['--bundle', join(root, 'dist')]);

    expect(status).toBe(1);
    expect(output).toMatch(/index-test\.js:2\b/);
    expect(output).not.toContain(key);
  });

  it('bundle scan passes clean built output', () => {
    const root = tempDir();
    const dist = join(root, 'dist');
    mkdirSync(dist);
    writeFileSync(join(dist, 'index.js'), `var a=1;console.log("ok");\n`);

    const { status } = runScanner(['--bundle', dist]);

    expect(status).toBe(0);
  });
});
