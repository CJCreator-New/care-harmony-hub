/**
 * Vital Signs & Physiological Deterioration Module (`vital-signs`)
 *
 * Domain Types & Contracts
 * Compliant with Royal College of Physicians NEWS2 standard
 */

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export type ConsciousnessLevel = 'alert' | 'voice' | 'pain' | 'unresponsive';

export interface VitalSignsInput {
  readonly temperature?: number | string | null;
  readonly temperatureUnit?: TemperatureUnit;
  readonly heartRate?: number | string | null;
  readonly bloodPressureSystolic?: number | string | null;
  readonly bloodPressureDiastolic?: number | string | null;
  readonly respiratoryRate?: number | string | null;
  readonly oxygenSaturation?: number | string | null;
  readonly supplementalOxygen?: boolean;
  readonly consciousness?: ConsciousnessLevel;
  readonly painScale?: number | string | null;
  readonly weightKg?: number | string | null;
  readonly heightCm?: number | string | null;
}

export interface NormalizedVitalSigns {
  readonly temperatureCelsius: number | null;
  readonly temperatureFahrenheit: number | null;
  readonly heartRate: number | null;
  readonly bloodPressureSystolic: number | null;
  readonly bloodPressureDiastolic: number | null;
  readonly respiratoryRate: number | null;
  readonly oxygenSaturation: number | null;
  readonly supplementalOxygen: boolean;
  readonly consciousness: ConsciousnessLevel;
  readonly painScale: number | null;
  readonly weightKg: number | null;
  readonly heightCm: number | null;
  readonly bmi: number | null;
}

export type News2RiskLevel = 'low' | 'low_medium' | 'medium' | 'high';

export interface News2SubScores {
  readonly respirationRate: number;
  readonly oxygenSaturation: number;
  readonly supplementalOxygen: number;
  readonly systolicBp: number;
  readonly heartRate: number;
  readonly consciousness: number;
  readonly temperature: number;
}

export interface News2ScoreResult {
  readonly totalScore: number;
  readonly riskLevel: News2RiskLevel;
  readonly clinicalResponse: string;
  readonly hasRedFlag: boolean;
  readonly subScores: News2SubScores;
}

export interface CriticalVitalsAlert {
  readonly isCritical: boolean;
  readonly criticalFlags: readonly string[];
  readonly summary: string;
}

export interface VitalSignsEvaluationResult {
  readonly normalized: NormalizedVitalSigns;
  readonly news2: News2ScoreResult;
  readonly criticalAlert: CriticalVitalsAlert;
  readonly validationErrors: Record<string, string>;
  readonly isValid: boolean;
}
