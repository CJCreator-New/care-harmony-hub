import { describe, expect, it } from 'vitest';
import { mergeIntakeIntoPatientRecord, normalizeAllergyList } from '@/modules/order-safety';

describe('mergeIntakeIntoPatientRecord (CLIN-14)', () => {
  it('records intake allergies on an empty record', () => {
    const patch = mergeIntakeIntoPatientRecord({ allergies: null }, { allergies: 'Penicillin, sulfa' });
    expect(patch?.allergies).toEqual(['Penicillin', 'sulfa']);
    expect(normalizeAllergyList(patch?.allergies).recorded).toBe(true);
  });

  it('never removes a documented allergy, and de-duplicates case-insensitively', () => {
    const patch = mergeIntakeIntoPatientRecord({ allergies: ['Penicillin'] }, { allergies: 'penicillin; Latex' });
    expect(patch?.allergies).toEqual(['Penicillin', 'Latex']);
  });

  it('NKDA is recorded only when nothing is on file, and does not overwrite allergies', () => {
    expect(mergeIntakeIntoPatientRecord({ allergies: [] }, { allergies: 'NKDA' })?.allergies).toEqual(['NKDA']);
    expect(mergeIntakeIntoPatientRecord({ allergies: ['Aspirin'] }, { allergies: 'NKDA' })).toBeNull();
  });

  it('a real allergy replaces a previous NKDA marker', () => {
    expect(mergeIntakeIntoPatientRecord({ allergies: ['NKDA'] }, { allergies: 'Codeine' })?.allergies).toEqual(['Codeine']);
  });

  it('appends new home medications and keeps existing entry shapes', () => {
    const patch = mergeIntakeIntoPatientRecord(
      { current_medications: [{ name: 'Warfarin', dosage: '5mg' }] },
      { currentMedications: 'warfarin, Metformin 500mg' }
    );
    expect(patch?.current_medications).toEqual([{ name: 'Warfarin', dosage: '5mg' }, 'Metformin 500mg']);
  });

  it('returns null when intake adds nothing', () => {
    expect(mergeIntakeIntoPatientRecord({ allergies: ['Latex'] }, { allergies: '', currentMedications: null })).toBeNull();
  });
});
