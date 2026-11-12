import { describe, expect, it } from 'vitest';
import {
  evaluatePediatricDosing,
  getDosesPerDay,
  type OrderItemIntent,
  type PatientClinicalContext,
} from '../index';

const item = (over: Partial<OrderItemIntent>): OrderItemIntent => ({
  clientItemId: 'item-1',
  drugName: 'Acetaminophen',
  doseMg: 150,
  route: 'PO',
  frequency: 'q4h',
  ...over,
});

const child = (over: Partial<PatientClinicalContext>): PatientClinicalContext => ({
  patientId: 'p-1',
  hospitalId: 'h-1',
  ageYears: 5,
  ageMonths: 60,
  weightKg: 20,
  ...over,
});

describe('getDosesPerDay (CLIN-15 frequency arithmetic)', () => {
  it.each([
    ['q4h', 6],
    ['q6h', 4],
    ['q8h', 3],
    ['q12h', 2],
    ['q4-6h', 6],
    ['BID', 2],
    ['TID', 3],
    ['QID', 4],
    ['daily', 1],
  ])('%s is %i doses per day', (frequency, expected) => {
    expect(getDosesPerDay(frequency, 99)).toBe(expected);
  });
});

describe('evaluatePediatricDosing (CLIN-15 / EDGE-19)', () => {
  it('q4h acetaminophen is counted as 6 doses a day, so a 10 kg child at 150 mg q4h is flagged', () => {
    // 150 mg x 6 = 900 mg/day = 90 mg/kg/day; ceiling 75 mg/kg/day (110% = 82.5).
    const { finding } = evaluatePediatricDosing(
      item({ doseMg: 150, frequency: 'q4h' }),
      child({ weightKg: 10, ageMonths: 60 })
    );
    expect(finding?.requiresPhysicianOverride).toBe(true);
    expect(finding?.code).toMatch(/^PEDIATRIC_OVERDOSE_OVERRIDE_/);
  });

  it('a hard stop is evaluated before the age-minimum warning', () => {
    // Ibuprofen, 3-month-old 5 kg infant (minimum 6 months): 250 mg q8h = 750 mg/day,
    // 150 mg/kg/day against a 40 mg/kg/day ceiling (200% = 80 mg/kg/day).
    const { finding } = evaluatePediatricDosing(
      item({ drugName: 'Ibuprofen', doseMg: 250, frequency: 'q8h' }),
      child({ weightKg: 5, ageYears: 0, ageMonths: 3 })
    );
    expect(finding?.isHardStop).toBe(true);
    expect(finding?.code).toMatch(/^PEDIATRIC_HARD_STOP_/);
  });

  it('still reports the age warning when the dose itself is within limits', () => {
    const { finding } = evaluatePediatricDosing(
      item({ drugName: 'Ibuprofen', doseMg: 50, frequency: 'q8h' }),
      child({ weightKg: 5, ageYears: 0, ageMonths: 3 })
    );
    expect(finding?.code).toMatch(/^PEDIATRIC_AGE_MIN_/);
  });

  it('caps the weight-based daily limit at the absolute paediatric maximum (EDGE-19)', () => {
    // 70 kg adolescent, acetaminophen: 75 mg/kg/day = 5250 mg/day uncapped, but the
    // rule's maxDailyDoseMg is 3000 mg. 1000 mg q6h = 4000 mg/day must be flagged.
    const { finding } = evaluatePediatricDosing(
      item({ drugName: 'Acetaminophen', doseMg: 1000, frequency: 'q6h' }),
      child({ weightKg: 70, ageYears: 12, ageMonths: 144 })
    );
    expect(finding).toBeDefined();
    expect(finding?.requiresPhysicianOverride).toBe(true);
  });

  it('hard-stops a paediatric daily dose above the absolute adult maximum (EDGE-19)', () => {
    // 1000 mg q4h = 6000 mg/day, above the 4000 mg/day adult acetaminophen maximum.
    const { finding } = evaluatePediatricDosing(
      item({ drugName: 'Acetaminophen', doseMg: 1000, frequency: 'q4h' }),
      child({ weightKg: 70, ageYears: 12, ageMonths: 144 })
    );
    expect(finding?.isHardStop).toBe(true);
  });
});
