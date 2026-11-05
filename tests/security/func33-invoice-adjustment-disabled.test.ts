/**
 * FUNC-33 (S0-09): invoice adjustments/refunds were authorised by a hardcoded
 * client-side PIN and written directly to `invoices`. The UI is removed until
 * the server-side adjust_invoice RPC (S1-01) exists. Guard against regressions.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? sourceFiles(p) : /\.(t|j)sx?$/.test(name) ? [p] : [];
  });
}

describe('FUNC-33: no client-side financial authorisation', () => {
  const files = sourceFiles(join(process.cwd(), 'src'));

  it('has no manager PIN check in client code', () => {
    const offenders = files.filter((f) => /managerPin|manager_pin/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('does not write invoice totals, discounts or paid amounts from an adjustment UI', () => {
    const offenders = files.filter((f) => {
      const src = readFileSync(f, 'utf8');
      return /from\(['"]invoices['"]\)[\s\S]{0,200}\.update\(/.test(src) && /refund|waiver|write-?off/i.test(src);
    });
    expect(offenders).toEqual([]);
  });
});
