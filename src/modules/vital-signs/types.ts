/**
 * Vital Signs & Physiological Deterioration Module (`vital-signs`)
 *
 * Domain Types & Contracts
 * Compliant with Royal College of Physicians NEWS2 standard
 */

export type TemperatureUnit = 'celsius' | 'fahrenheit';

/** ACVPU. `confusion` is the new-confusion "C" of ACVPU (CLIN-12); NEWS2 scores any non-alert level as 3. */
export type ConsciousnessLevel = 'alert' | 'confusion' | 'voice' | 'pain' | 'unresponsive';

/** NEWS2 SpO2 scale: Scale 2 is for patients with hypercapnic respiratory failure (target 88-92%). */
export type Spo2Scale = 1 | 2;

export interface VitalSignsInput {
  readonly temperature?: number | string | null;
  readonly temperatureUnit?: TemperatureUnit;
  readonly heartRate?: number | string | null;
  readonly bloodPressureSystolic?: number | string | null;
  readonly bloodPressureDiastolic?: number | string | null;
  readonly respiratoryRate?: number | string | null;
  readonly oxygenSaturation?: number | string | null;
  readonly spo2Scale?: Spo2Scale;
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
  /** False when any of the seven NEWS2 parameters is unrecorded (a missing parameter otherwise scores 0). */
  readonly isComplete: boolean;
  readonly missingParameters: readonly string[];
}
