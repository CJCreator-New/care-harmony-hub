/**
 * Vital Signs & Physiological Deterioration Module (`vital-signs`)
 *
 * CareSync HIMS Deep Module
 * Canonical entry point for clinical vital sign evaluations, unit conversions,
 * critical thresholds, and Royal College of Physicians NEWS2 calculations.
 */

// Evaluator & Scoring APIs
export { evaluateVitalSigns } from './core/evaluator';
export {
  calculateNews2Score,
  scoreRespirationRate,
  scoreOxygenSaturation,
  scoreSupplementalOxygen,
  scoreSystolicBp,
  scoreHeartRate,
  scoreConsciousness,
  scoreTemperatureCelsius,
} from './core/news2';
export {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  calculateBmi,
  roundToOneDecimal,
} from './core/conversions';

// Domain Types
export * from './types';
