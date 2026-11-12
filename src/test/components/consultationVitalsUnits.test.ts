import { describe, expect, it } from 'vitest';
import { switchTemperatureUnit, switchWeightUnit } from '@/components/consultations/steps/consultationVitals';

describe('switching the unit keeps the same physical value (CLIN-09)', () => {
  it('a nurse 37.0 °C reading reads 98.6 °F after switching the unit to °F', () => {
    const patch = switchTemperatureUnit({ temperature: '37.0' }, 'fahrenheit');
    expect(patch).toMatchObject({ temperature: '98.6', temperature_unit: 'fahrenheit' });
  });

  it('a doctor-entered 98.6 °F reads 37.0 °C after switching to °C', () => {
    const patch = switchTemperatureUnit({ temperature: '98.6', temperature_unit: 'fahrenheit' }, 'celsius');
    expect(patch).toMatchObject({ temperature: '37.0', temperature_unit: 'celsius' });
  });

  it('an unstated temperature unit is read from its value before converting', () => {
    // 37.0 is inferred as °C (values above 45 are read as °F), so switching to °F converts it.
    const patch = switchTemperatureUnit({ temperature: '37.0', temperature_unit: null }, 'fahrenheit');
    expect(patch.temperature).toBe('98.6');
  });

  it('an empty temperature only sets the unit', () => {
    expect(switchTemperatureUnit({ temperature: '' }, 'fahrenheit')).toEqual({ temperature_unit: 'fahrenheit' });
  });

  it('70 kg reads about 154.3 lb after switching to lb', () => {
    const patch = switchWeightUnit({ weight: '70', weight_unit: 'kg' }, 'lb');
    expect(Number(patch.weight)).toBeCloseTo(154.3, 1);
    expect(patch.weight_unit).toBe('lb');
  });

  it('154 lb reads about 69.9 kg after switching back to kg', () => {
    const patch = switchWeightUnit({ weight: '154', weight_unit: 'lb' }, 'kg');
    expect(Number(patch.weight)).toBeCloseTo(69.9, 1);
  });

  it('a weight with no stated unit is not converted (the doctor is stating its unit)', () => {
    expect(switchWeightUnit({ weight: '70' }, 'kg')).toEqual({ weight_unit: 'kg' });
  });
});
