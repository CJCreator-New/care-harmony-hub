/**
 * Vital Signs & Physiological Deterioration Module (`vital-signs`)
 *
 * Core Unit Conversions and Biometrics
 */

export function roundToOneDecimal(val: number): number {
  return Math.round(val * 10) / 10;
}

export function celsiusToFahrenheit(celsius: number): number {
  return roundToOneDecimal((celsius * 9) / 5 + 32);
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return roundToOneDecimal(((fahrenheit - 32) * 5) / 9);
}

export function calculateBmi(weightKg: number | null, heightCm: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
    return null;
  }
  const heightM = heightCm / 100;
  return roundToOneDecimal(weightKg / (heightM * heightM));
}
