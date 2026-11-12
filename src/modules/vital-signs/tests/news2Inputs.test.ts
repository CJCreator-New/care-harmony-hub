import { describe, expect, it } from 'vitest';
import { evaluateVitalSigns, fromVitalsRecord } from '../index';

const completeInput = {
  respiratoryRate: 16,
  oxygenSaturation: 97,
  supplementalOxygen: false,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  heartRate: 80,
  temperature: 37,
  temperatureUnit: 'celsius' as const,
  consciousness: 'alert' as const,
};

describe('NEWS2 inputs (CLIN-12)', () => {
  it('scores new confusion (the C of ACVPU) as 3', () => {
    const result = evaluateVitalSigns({ ...completeInput, consciousness: 'confusion' });
    expect(result.news2.subScores.consciousness).toBe(3);
    expect(result.news2.hasRedFlag).toBe(true);
    expect(result.news2.riskLevel).toBe('low_medium');
  });

  it('maps a recorded "confused" level to the confusion input', () => {
    const input = fromVitalsRecord({ consciousness: 'confused' });
    expect(input.consciousness).toBe('confusion');
  });

  it('SpO2 Scale 2 at 88% on air scores 0 (hypercapnic target range)', () => {
    const result = evaluateVitalSigns({ ...completeInput, oxygenSaturation: 88, spo2Scale: 2 });
    expect(result.news2.subScores.oxygenSaturation).toBe(0);
  });

  it('SpO2 Scale 1 at 88% still scores 3', () => {
    const result = evaluateVitalSigns({ ...completeInput, oxygenSaturation: 88, spo2Scale: 1 });
    expect(result.news2.subScores.oxygenSaturation).toBe(3);
  });

  it('SpO2 Scale 2 on supplemental oxygen scores by the oxygen column (95-96% on O2 = 2)', () => {
    const result = evaluateVitalSigns({
      ...completeInput,
      oxygenSaturation: 95,
      supplementalOxygen: true,
      spo2Scale: 2,
    });
    expect(result.news2.subScores.oxygenSaturation).toBe(2);
    expect(result.news2.subScores.supplementalOxygen).toBe(2);
  });

  it('reports an incomplete NEWS2 when a parameter is missing', () => {
    const { respiratoryRate: _rr, ...withoutRr } = completeInput;
    const result = evaluateVitalSigns(withoutRr);
    expect(result.isComplete).toBe(false);
    expect(result.missingParameters).toContain('respiratoryRate');
  });

  it('reports a complete NEWS2 when all seven parameters are recorded', () => {
    const result = evaluateVitalSigns(completeInput);
    expect(result.isComplete).toBe(true);
    expect(result.missingParameters).toEqual([]);
  });

  it('treats unrecorded consciousness and supplemental oxygen as missing', () => {
    const { consciousness: _c, supplementalOxygen: _o2, ...rest } = completeInput;
    const result = evaluateVitalSigns(rest);
    expect(result.missingParameters).toEqual(expect.arrayContaining(['consciousness', 'supplementalOxygen']));
  });

  it('maps a recorded SpO2 scale and an explicit "no oxygen" from a stored record', () => {
    const input = fromVitalsRecord({ spo2_scale: 2, supplemental_oxygen: false });
    expect(input.spo2Scale).toBe(2);
    expect(input.supplementalOxygen).toBe(false);
  });
});
