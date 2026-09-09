import { describe, it, expect } from 'vitest';
import { validatePediatricDose, AAP_DOSING_RULES } from '@/utils/pediatricDosingEngine';

describe('CLIN-005: AAP-Compliant Pediatric Dosing Engine', () => {
  it('AC-1: flags overdose when prescribed dose exceeds 110% of maximum AAP guideline without override', () => {
    // 10 kg child: safe max is 90 mg/kg/day = 900 mg/day (450 mg BID).
    // Prescribing 120 mg/kg/day = 1200 mg/day (600 mg BID).
    const result = validatePediatricDose({
      drugName: 'Amoxicillin',
      weightKg: 10,
      ageMonths: 36,
      prescribedDoseMg: 600, // BID -> 1200 mg/day = 120 mg/kg/day
      frequency: 'BID',
    });

    expect(result.isValid).toBe(false);
    expect(result.requiresOverride).toBe(true);
    expect(result.error).toContain('exceeds 110% of AAP maximum guideline');
  });

  it('AC-1: permits dose exceeding 110% when explicit clinical override reason is provided', () => {
    const result = validatePediatricDose({
      drugName: 'Amoxicillin',
      weightKg: 10,
      ageMonths: 36,
      prescribedDoseMg: 520, // ~104 mg/kg/day (>99 mg/kg/day which is 110%)
      frequency: 'BID',
      clinicalOverrideReason: 'Severe refractory bilateral acute otitis media per pediatric ID consult',
    });

    expect(result.isValid).toBe(true);
    expect(result.requiresOverride).toBe(true);
    expect(result.warnings.some((w) => w.includes('approved via documented clinical override'))).toBe(true);
  });

  it('AC-1: blocks completely on lethal overdose (>200% maximum limit) even with override reason', () => {
    // 10 kg child: 200% of 90 mg/kg/day is 180 mg/kg/day.
    // Prescribing 200 mg/kg/day = 2000 mg/day (1000 mg BID).
    const result = validatePediatricDose({
      drugName: 'Amoxicillin',
      weightKg: 10,
      ageMonths: 36,
      prescribedDoseMg: 1000, // 2000 mg/day = 200 mg/kg/day
      frequency: 'BID',
      clinicalOverrideReason: 'Doctor insists on extreme megadose',
    });

    expect(result.isValid).toBe(false);
    expect(result.isHardStop).toBe(true);
    expect(result.error).toContain('CRITICAL SAFETY STOP: Prescribed dose');
  });

  it('AC-2: automatically caps pediatric dose at standard adult maximum', () => {
    // 60 kg adolescent child: standard 22.5 mg/kg = 1350 mg single dose.
    // Adult single max for amoxicillin is 1000 mg.
    const result = validatePediatricDose({
      drugName: 'Amoxicillin',
      weightKg: 60,
      ageMonths: 168, // 14 years
      frequency: 'BID',
    });

    expect(result.recommendedSingleDoseMg).toBe(1000); // capped at adult max
    expect(result.recommendedDailyDoseMg).toBe(2000); // capped at adult daily max
    expect(result.adjustmentsApplied.some((a) => a.includes('capped at standard adult maximum'))).toBe(true);
  });

  it('AC-4: calculates standard Acetaminophen dose accurately (15 mg/kg)', () => {
    // 12 kg child: 15 mg/kg = 180 mg single dose
    const result = validatePediatricDose({
      drugName: 'Acetaminophen',
      weightKg: 12,
      ageMonths: 24,
    });

    expect(result.recommendedSingleDoseMg).toBe(180);
    expect(result.recommendedDailyDoseMg).toBe(900); // 180 * 5 = 900 mg/day
    expect(result.isValid).toBe(true);
  });

  it('AC-4: warns on Ibuprofen in infants under 6 months', () => {
    const result = validatePediatricDose({
      drugName: 'Ibuprofen',
      weightKg: 4,
      ageMonths: 3, // Under 6 months
    });

    expect(result.warnings.some((w) => w.includes('below recommended minimum'))).toBe(true);
  });
});
