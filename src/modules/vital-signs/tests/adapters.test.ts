import { describe, expect, it } from 'vitest';
import { evaluateVitalSigns, fromVitalsRecord, hasNews2Parameters, parseBloodPressure, verifiedWeightKg } from '../index';

describe('fromVitalsRecord (CLIN-08)', () => {
  it('scores a shocked patient recorded in consultation snake_case as HIGH', () => {
    const input = fromVitalsRecord({
      temperature: '101.3',
      heart_rate: '140',
      blood_pressure: '80/50',
      respiratory_rate: '30',
      oxygen_saturation: '85',
    });
    expect(input.bloodPressureSystolic).toBe(80);
    expect(input.temperatureUnit).toBe('fahrenheit');
    const result = evaluateVitalSigns(input);
    expect(result.news2.totalScore).toBeGreaterThanOrEqual(12);
    expect(result.news2.riskLevel).toBe('high');
  });

  it('the raw record without the adapter scored nothing (regression guard)', () => {
    const raw = { heart_rate: '140', blood_pressure: '80/50', respiratory_rate: '30', oxygen_saturation: '85' };
    expect(evaluateVitalSigns(raw as never).news2.totalScore).toBe(0);
    expect(evaluateVitalSigns(fromVitalsRecord(raw)).news2.totalScore).toBeGreaterThan(0);
  });

  it('reads nursing records with separate systolic/diastolic and celsius', () => {
    const input = fromVitalsRecord({ temperature: 38.5, blood_pressure_systolic: 120, blood_pressure_diastolic: 80 });
    expect(input).toMatchObject({ temperatureUnit: 'celsius', bloodPressureSystolic: 120, bloodPressureDiastolic: 80 });
  });

  it('maps consciousness and supplemental oxygen when recorded', () => {
    const input = fromVitalsRecord({ consciousness: 'confused', supplemental_oxygen: true });
    expect(input.consciousness).toBe('voice');
    expect(input.supplementalOxygen).toBe(true);
  });

  it('does not guess weight or height units', () => {
    expect(fromVitalsRecord({ weight: '154', height: '68' })).toMatchObject({ weightKg: null, heightCm: null });
    expect(fromVitalsRecord({ weight: '70', weight_unit: 'kg' }).weightKg).toBe(70);
    expect(fromVitalsRecord({ weight_kg: 12 }).weightKg).toBe(12);
  });

  it('rejects malformed blood pressure and reports empty records', () => {
    expect(parseBloodPressure('120')).toEqual({ systolic: null, diastolic: null });
    expect(parseBloodPressure('120 / 80')).toEqual({ systolic: 120, diastolic: 80 });
    expect(hasNews2Parameters(fromVitalsRecord({ pain_level: '3' }))).toBe(false);
    expect(hasNews2Parameters(fromVitalsRecord(null))).toBe(false);
  });
});

describe('verifiedWeightKg (CLIN-09)', () => {
  it('returns kg only when the unit is stated', () => {
    expect(verifiedWeightKg({ weight: '20', weight_unit: 'kg' })).toBe(20);
    expect(verifiedWeightKg({ weight_kg: 12.5 })).toBe(12.5);
    expect(verifiedWeightKg({ weight: '44', weight_unit: 'lb' })).toBeCloseTo(19.96, 2);
  });

  it('never guesses a unit-less weight (legacy lbs-labelled or copied nurse value)', () => {
    expect(verifiedWeightKg({ weight: '20' })).toBeUndefined();
    expect(verifiedWeightKg({ weight: '20', weight_unit: null })).toBeUndefined();
    expect(verifiedWeightKg({ weight: '20', weight_unit: 'stone' })).toBeUndefined();
    expect(verifiedWeightKg(null)).toBeUndefined();
  });

  it('rejects implausible or unreadable weights', () => {
    expect(verifiedWeightKg({ weight: '0', weight_unit: 'kg' })).toBeUndefined();
    expect(verifiedWeightKg({ weight: '700', weight_unit: 'kg' })).toBeUndefined();
    expect(verifiedWeightKg({ weight: 'abc', weight_unit: 'kg' })).toBeUndefined();
  });
});
