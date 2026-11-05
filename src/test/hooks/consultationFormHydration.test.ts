import { describe, expect, it } from 'vitest';
import { shouldHydrateConsultationForm } from '@/components/consultations/consultationFormState';
import { CONSULTATION_COLUMNS } from '@/lib/queryColumns';

describe('consultation form hydration (CLIN-06)', () => {
  it('hydrates the form once for a consultation', () => {
    expect(shouldHydrateConsultationForm(null, 'c-1')).toBe(true);
  });

  it('does not re-hydrate when the same consultation is refetched after an autosave', () => {
    expect(shouldHydrateConsultationForm('c-1', 'c-1')).toBe(false);
  });

  it('hydrates when a different consultation is opened', () => {
    expect(shouldHydrateConsultationForm('c-1', 'c-2')).toBe(true);
  });

  it('does not hydrate without a consultation', () => {
    expect(shouldHydrateConsultationForm(null, undefined)).toBe(false);
  });
});

describe('consultation read columns (CLIN-05 / CLIN-06)', () => {
  const cols = (s: string) => s.split(',').map((c) => c.trim());

  it.each(['detail', 'detailWithoutHpi'] as const)(
    '%s selects the diagnoses and encryption_metadata columns the form needs',
    (preset) => {
      expect(cols(CONSULTATION_COLUMNS[preset])).toEqual(
        expect.arrayContaining(['diagnoses', 'encryption_metadata'])
      );
    }
  );
});
