/**
 * Vital Signs & Physiological Deterioration Module (`vital-signs`)
 *
 * Royal College of Physicians NEWS2 (National Early Warning Score) Standard
 */

import { ConsciousnessLevel, News2RiskLevel, News2ScoreResult, News2SubScores } from '../types';

export function scoreRespirationRate(rate: number | null): number {
  if (rate === null || !Number.isFinite(rate)) return 0;
  if (rate <= 8) return 3;
  if (rate <= 11) return 1;
  if (rate <= 20) return 0;
  if (rate <= 24) return 2;
  return 3; // >= 25
}

/** NEWS2 Scale 2 (hypercapnic target 88-92%). Scores depend on whether the patient is on supplemental oxygen. */
export function scoreOxygenSaturationScale2(spo2: number, onOxygen: boolean): number {
  if (spo2 <= 83) return 3;
  if (spo2 <= 85) return 2;
  if (spo2 <= 87) return 1;
  if (spo2 <= 92) return 0;
  if (!onOxygen) return 0; // >= 93% on air
  if (spo2 <= 94) return 1;
  if (spo2 <= 96) return 2;
  return 3; // >= 97% on oxygen
}

export function scoreOxygenSaturation(
  spo2: number | null,
  scale: 1 | 2 = 1,
  onOxygen = false
): number {
  if (spo2 === null || !Number.isFinite(spo2)) return 0;
  if (scale === 2) return scoreOxygenSaturationScale2(spo2, onOxygen);
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0; // >= 96
}

export function scoreSupplementalOxygen(hasOxygen: boolean): number {
  return hasOxygen ? 2 : 0;
}

export function scoreSystolicBp(systolic: number | null): number {
  if (systolic === null || !Number.isFinite(systolic)) return 0;
  if (systolic <= 90) return 3;
  if (systolic <= 100) return 2;
  if (systolic <= 110) return 1;
  if (systolic <= 219) return 0;
  return 3; // >= 220
}

export function scoreHeartRate(rate: number | null): number {
  if (rate === null || !Number.isFinite(rate)) return 0;
  if (rate <= 40) return 3;
  if (rate <= 50) return 1;
  if (rate <= 90) return 0;
  if (rate <= 110) return 1;
  if (rate <= 130) return 2;
  return 3; // >= 131
}

export function scoreConsciousness(level: ConsciousnessLevel): number {
  // Confusion (C), voice, pain and unresponsive are all scored 3.
  return level === 'alert' ? 0 : 3;
}

export function scoreTemperatureCelsius(tempC: number | null): number {
  if (tempC === null || !Number.isFinite(tempC)) return 0;
  if (tempC <= 35.0) return 3;
  if (tempC <= 36.0) return 1;
  if (tempC <= 38.0) return 0;
  if (tempC <= 39.0) return 1;
  return 2; // >= 39.1
}

export function calculateNews2Score(params: {
  respiratoryRate: number | null;
  oxygenSaturation: number | null;
  spo2Scale?: 1 | 2;
  supplementalOxygen: boolean;
  bloodPressureSystolic: number | null;
  heartRate: number | null;
  consciousness: ConsciousnessLevel;
  temperatureCelsius: number | null;
}): News2ScoreResult {
  const subScores: News2SubScores = {
    respirationRate: scoreRespirationRate(params.respiratoryRate),
    oxygenSaturation: scoreOxygenSaturation(
      params.oxygenSaturation,
      params.spo2Scale ?? 1,
      params.supplementalOxygen
    ),
    supplementalOxygen: scoreSupplementalOxygen(params.supplementalOxygen),
    systolicBp: scoreSystolicBp(params.bloodPressureSystolic),
    heartRate: scoreHeartRate(params.heartRate),
    consciousness: scoreConsciousness(params.consciousness),
    temperature: scoreTemperatureCelsius(params.temperatureCelsius),
  };

  const hasRedFlag = Object.values(subScores).some((score) => score >= 3);
  const totalScore = Object.values(subScores).reduce((sum, current) => sum + current, 0);

  let riskLevel: News2RiskLevel = 'low';
  let clinicalResponse = 'Low clinical risk: Routine ward-based observation (minimum 4-6 hourly).';

  if (totalScore >= 7) {
    riskLevel = 'high';
    clinicalResponse =
      'High clinical risk: Emergency bedside response required. Continuous monitoring; alert attending physician / medical emergency team immediately.';
  } else if (totalScore >= 5) {
    riskLevel = 'medium';
    clinicalResponse =
      'Medium clinical risk: Key trigger threshold. Urgent clinical review by competent physician within 1 hour; escalate monitoring frequency to hourly.';
  } else if (hasRedFlag) {
    riskLevel = 'low_medium';
    clinicalResponse =
      'Single parameter red score (3): Prompt review by registered nurse and attending physician; escalate monitoring to minimum 1 hourly.';
  }

  return {
    totalScore,
    riskLevel,
    clinicalResponse,
    hasRedFlag,
    subScores,
  };
}
