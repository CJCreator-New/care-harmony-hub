import { describe, it, expect } from 'vitest';
import { checkDrugAllergyConflict } from '@/utils/clinicalValidation';

describe('CLIN-001: Drug-Allergy Conflict Detection & Normalization', () => {
  it('detects conflict with bare allergen "penicillin" without "allergy" suffix', () => {
    const result = checkDrugAllergyConflict('Amoxicillin 500mg', ['penicillin']);
    expect(result.safe).toBe(false);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingAllergy).toBe('penicillin');
  });

  it('detects conflict with acronym "PCN"', () => {
    const result = checkDrugAllergyConflict('Piperacillin-Tazobactam', ['PCN']);
    expect(result.safe).toBe(false);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingAllergy).toBe('PCN');
  });

  it('detects conflict with full phrase "penicillin allergy"', () => {
    const result = checkDrugAllergyConflict('Ampicillin', ['penicillin allergy']);
    expect(result.safe).toBe(false);
    expect(result.hasConflict).toBe(true);
  });

  it('detects sulfa class contraindications', () => {
    const result = checkDrugAllergyConflict('Bactrim DS', ['sulfa']);
    expect(result.safe).toBe(false);
    expect(result.hasConflict).toBe(true);
    expect(result.conflictingAllergy).toBe('sulfa');
  });

  it('detects NSAID class contraindications', () => {
    const result = checkDrugAllergyConflict('Ibuprofen 400mg', ['nsaids']);
    expect(result.safe).toBe(false);
    expect(result.hasConflict).toBe(true);
  });

  it('detects opioid class contraindications', () => {
    const result = checkDrugAllergyConflict('Morphine 10mg IV', ['opioid allergy']);
    expect(result.safe).toBe(false);
    expect(result.hasConflict).toBe(true);
  });

  it('returns safe for non-conflicting medication', () => {
    const result = checkDrugAllergyConflict('Metformin 500mg', ['penicillin', 'sulfa']);
    expect(result.safe).toBe(true);
    expect(result.hasConflict).toBe(false);
    expect(result.conflictingAllergy).toBeUndefined();
    expect(result.conflicts).toEqual([]);
  });

  it('handles empty allergy lists gracefully', () => {
    const result = checkDrugAllergyConflict('Amoxicillin 500mg', []);
    expect(result.safe).toBe(true);
    expect(result.hasConflict).toBe(false);
    expect(result.conflicts).toEqual([]);
  });
});
