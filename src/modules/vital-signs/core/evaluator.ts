/**
 * Vital Signs & Physiological Deterioration Module (`vital-signs`)
 *
 * Evaluation Engine: Normalization, Plausibility Validation, Critical Panic Thresholds
 */

import {
  CriticalVitalsAlert,
  NormalizedVitalSigns,
  VitalSignsEvaluationResult,
  VitalSignsInput,
} from '../types';
import {
  calculateBmi,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  roundToOneDecimal,
} from './conversions';
import { calculateNews2Score } from './news2';

function parseNumeric(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = typeof val === 'number' ? val : parseFloat(val);
  return Number.isFinite(num) ? num : null;
}

export function evaluateVitalSigns(input: VitalSignsInput): VitalSignsEvaluationResult {
  const validationErrors: Record<string, string> = {};

  // 1. Temperature Parsing & Normalization
  let tempC: number | null = null;
  let tempF: number | null = null;
  const rawTemp = parseNumeric(input.temperature);

  if (rawTemp !== null) {
    const unit = input.temperatureUnit ?? 'celsius';
    if (unit === 'fahrenheit') {
      tempF = roundToOneDecimal(rawTemp);
      tempC = fahrenheitToCelsius(tempF);
    } else {
      tempC = roundToOneDecimal(rawTemp);
      tempF = celsiusToFahrenheit(tempC);
    }

    // Physiological plausibility check (Celsius: 28°C - 45°C)
    if (tempC < 28.0 || tempC > 45.0) {
      validationErrors.temperature = `Temperature ${tempC}°C is outside physiologically plausible range (28°C - 45°C).`;
    }
  }

  // 2. Heart Rate
  const heartRate = parseNumeric(input.heartRate);
  if (heartRate !== null && (heartRate < 20 || heartRate > 300)) {
    validationErrors.heartRate = `Heart rate ${heartRate} bpm is outside plausible range (20 - 300 bpm).`;
  }

  // 3. Blood Pressure
  const systolic = parseNumeric(input.bloodPressureSystolic);
  const diastolic = parseNumeric(input.bloodPressureDiastolic);

  if (systolic !== null && (systolic < 40 || systolic > 300)) {
    validationErrors.bloodPressureSystolic = `Systolic BP ${systolic} mmHg is outside plausible range (40 - 300 mmHg).`;
  }
  if (diastolic !== null && (diastolic < 20 || diastolic > 200)) {
    validationErrors.bloodPressureDiastolic = `Diastolic BP ${diastolic} mmHg is outside plausible range (20 - 200 mmHg).`;
  }
  if (systolic !== null && diastolic !== null && diastolic >= systolic) {
    validationErrors.bloodPressure = `Diastolic BP (${diastolic}) must be lower than Systolic BP (${systolic}).`;
  }

  // 4. Respiratory Rate
  const respRate = parseNumeric(input.respiratoryRate);
  if (respRate !== null && (respRate < 4 || respRate > 80)) {
    validationErrors.respiratoryRate = `Respiratory rate ${respRate} is outside plausible range (4 - 80 bpm).`;
  }

  // 5. Oxygen Saturation (SpO2)
  const spo2 = parseNumeric(input.oxygenSaturation);
  if (spo2 !== null && (spo2 < 50 || spo2 > 100)) {
    validationErrors.oxygenSaturation = `SpO2 ${spo2}% is outside plausible range (50% - 100%).`;
  }

  // 6. Pain Scale
  const pain = parseNumeric(input.painScale);
  if (pain !== null && (pain < 0 || pain > 10)) {
    validationErrors.painScale = `Pain scale must be an integer between 0 and 10.`;
  }

  // 7. Weight & Height
  const weightKg = parseNumeric(input.weightKg);
  const heightCm = parseNumeric(input.heightCm);
  if (weightKg !== null && (weightKg < 1 || weightKg > 500)) {
    validationErrors.weightKg = `Weight ${weightKg} kg is outside plausible range (1 - 500 kg).`;
  }
  if (heightCm !== null && (heightCm < 30 || heightCm > 260)) {
    validationErrors.heightCm = `Height ${heightCm} cm is outside plausible range (30 - 260 cm).`;
  }

  const bmi = calculateBmi(weightKg, heightCm);

  const normalized: NormalizedVitalSigns = {
    temperatureCelsius: tempC,
    temperatureFahrenheit: tempF,
    heartRate,
    bloodPressureSystolic: systolic,
    bloodPressureDiastolic: diastolic,
    respiratoryRate: respRate,
    oxygenSaturation: spo2,
    supplementalOxygen: !!input.supplementalOxygen,
    consciousness: input.consciousness ?? 'alert',
    painScale: pain,
    weightKg,
    heightCm,
    bmi,
  };

  // 8. Calculate NEWS2 Score
  const news2 = calculateNews2Score({
    respiratoryRate: respRate,
    oxygenSaturation: spo2,
    supplementalOxygen: !!input.supplementalOxygen,
    bloodPressureSystolic: systolic,
    heartRate,
    consciousness: input.consciousness ?? 'alert',
    temperatureCelsius: tempC,
  });

  // 9. Detect Critical Vital Thresholds
  const criticalFlags: string[] = [];

  if (tempC !== null) {
    if (tempC >= 38.5) criticalFlags.push(`High Fever (${tempC}°C / ${tempF}°F)`);
    else if (tempC <= 35.0) criticalFlags.push(`Hypothermia (${tempC}°C / ${tempF}°F)`);
  }

  if (systolic !== null) {
    if (systolic >= 180) criticalFlags.push(`Severe Hypertension (Systolic ${systolic} mmHg)`);
    else if (systolic <= 90) criticalFlags.push(`Hypotension / Shock (Systolic ${systolic} mmHg)`);
  }

  if (diastolic !== null && diastolic >= 110) {
    criticalFlags.push(`Severe Diastolic Hypertension (${diastolic} mmHg)`);
  }

  if (heartRate !== null) {
    if (heartRate >= 120) criticalFlags.push(`Critical Tachycardia (${heartRate} bpm)`);
    else if (heartRate <= 45) criticalFlags.push(`Critical Bradycardia (${heartRate} bpm)`);
  }

  if (respRate !== null) {
    if (respRate >= 26) criticalFlags.push(`Severe Tachypnea (${respRate} breaths/min)`);
    else if (respRate <= 8) criticalFlags.push(`Severe Bradypnea (${respRate} breaths/min)`);
  }

  if (spo2 !== null && spo2 <= 90) {
    criticalFlags.push(`Critical Hypoxemia (SpO2 ${spo2}%)`);
  }

  if (input.consciousness && input.consciousness !== 'alert') {
    criticalFlags.push(`Altered Mental Status (${input.consciousness.toUpperCase()})`);
  }

  const criticalAlert: CriticalVitalsAlert = {
    isCritical: criticalFlags.length > 0 || news2.riskLevel === 'high',
    criticalFlags,
    summary:
      criticalFlags.length > 0
        ? `Critical vitals detected: ${criticalFlags.join(', ')}`
        : news2.riskLevel === 'high'
          ? `High NEWS2 Deterioration Score (${news2.totalScore}): ${news2.clinicalResponse}`
          : 'All vital signs within acceptable clinical thresholds.',
  };

  return {
    normalized,
    news2,
    criticalAlert,
    validationErrors,
    isValid: Object.keys(validationErrors).length === 0,
  };
}
