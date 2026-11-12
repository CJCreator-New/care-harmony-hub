import { describe, expect, it } from 'vitest';
import { STANDARD_LAB_PANELS, evaluateLabPanel, matchLabPanel } from '../index';

describe('age- and sex-aware reference ranges (CLIN-16)', () => {
  it('does not treat a neonatal potassium of 6.3 mmol/L as a critical panic value', () => {
    const result = evaluateLabPanel(
      STANDARD_LAB_PANELS.bmp,
      { k: 6.3 },
      { ageYears: 0, sex: 'F' }
    );
    const k = result.results.find((r) => r.parameterId === 'k');
    expect(k?.isCritical).toBe(false);
    expect(result.hasCriticalPanic).toBe(false);
  });

  it('still flags an adult potassium of 6.3 mmol/L as critical', () => {
    const result = evaluateLabPanel(STANDARD_LAB_PANELS.bmp, { k: 6.3 }, { ageYears: 45, sex: 'M' });
    expect(result.hasCriticalPanic).toBe(true);
  });

  it('shows a male haemoglobin of 12.5 g/dL as low (male reference 13.5-17.5)', () => {
    const result = evaluateLabPanel(STANDARD_LAB_PANELS.cbc, { hgb: 12.5 }, { ageYears: 40, sex: 'M' });
    const hgb = result.results.find((r) => r.parameterId === 'hgb');
    expect(hgb?.status).toBe('low');
    expect(hgb?.referenceRange).toBe('13.5 - 17.5 g/dL');
  });

  it('keeps the female haemoglobin range (12.0-15.5 g/dL) so 12.5 is normal for a woman', () => {
    const result = evaluateLabPanel(STANDARD_LAB_PANELS.cbc, { hgb: 12.5 }, { ageYears: 40, sex: 'F' });
    expect(result.results.find((r) => r.parameterId === 'hgb')?.status).toBe('normal');
  });

  it('does not flag a neonatal haemoglobin of 21 g/dL as a critical panic value', () => {
    const result = evaluateLabPanel(STANDARD_LAB_PANELS.cbc, { hgb: 21 }, { ageYears: 0, sex: 'M' });
    expect(result.results.find((r) => r.parameterId === 'hgb')?.isCritical).toBe(false);
  });

  it('keeps the unisex adult range when no patient context is supplied', () => {
    const result = evaluateLabPanel(STANDARD_LAB_PANELS.cbc, { hgb: 12.5 });
    expect(result.results.find((r) => r.parameterId === 'hgb')?.status).toBe('normal');
  });
});

describe('panel matching by whole token (CLIN-16)', () => {
  it.each([
    'Fasting Lipid Profile',
    'Parathyroid Hormone (PTH)',
    'Gastrin',
  ])('does not map "%s" to any panel by substring', (testName) => {
    expect(matchLabPanel(testName)).toBeNull();
  });

  it('still maps real panel names', () => {
    expect(matchLabPanel('Liver Function Panel (LFT)')).toBe(STANDARD_LAB_PANELS.lft);
    expect(matchLabPanel('AST')).toBe(STANDARD_LAB_PANELS.lft);
    expect(matchLabPanel('Troponin I (High-Sensitivity)')).toBe(STANDARD_LAB_PANELS.cardiac);
    expect(matchLabPanel('PT/INR')).toBe(STANDARD_LAB_PANELS.coag);
    expect(matchLabPanel('CK-MB')).toBe(STANDARD_LAB_PANELS.cardiac);
  });
});
