import { describe, expect, it } from 'vitest';
import { validatePediatricDose } from '@/utils/pediatricDosingEngine';

describe('validatePediatricDose uses the prescribed frequency (CLIN-15)', () => {
  it('counts the prescribed q6h frequency, not the rule default, when checking the daily ceiling', () => {
    // Ibuprofen, 20 kg, 260 mg q6h = 4 doses = 1040 mg/day = 52 mg/kg/day.
    // The ceiling is 40 mg/kg/day, so 110% (44 mg/kg/day) is exceeded and an override is required.
    const result = validatePediatricDose({
      drugName: 'Ibuprofen',
      weightKg: 20,
      ageMonths: 60,
      prescribedDoseMg: 260,
      frequency: 'q6h',
    });
    expect(result.requiresOverride).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('a q8h frequency gives 3 doses a day for the same dose', () => {
    const result = validatePediatricDose({
      drugName: 'Ibuprofen',
      weightKg: 20,
      ageMonths: 60,
      prescribedDoseMg: 260,
      frequency: 'q8h',
    });
    expect(result.requiresOverride).toBe(false);
    expect(result.isValid).toBe(true);
  });
});
