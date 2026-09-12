/**
 * Deep Module Test Suite: `vital-signs`
 *
 * Rules Enforced:
 * 1. Imports ONLY through public entry point `../index`.
 * 2. Exercises unit conversions, NEWS2 scoring invariants, and panic thresholds.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateVitalSigns,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  calculateBmi,
  type VitalSignsInput,
} from '../index';

describe('vital-signs (NEWS2 & Clinical Safety Engine)', () => {
  describe('Temperature Conversions & Biometrics', () => {
    it('converts between Celsius and Fahrenheit correctly', () => {
      expect(celsiusToFahrenheit(37.0)).toBe(98.6);
      expect(celsiusToFahrenheit(39.0)).toBe(102.2);
      expect(celsiusToFahrenheit(35.0)).toBe(95.0);

      expect(fahrenheitToCelsius(98.6)).toBe(37.0);
      expect(fahrenheitToCelsius(102.2)).toBe(39.0);
    });

    it('calculates BMI correctly and handles edge cases', () => {
      // 70 kg, 175 cm -> 70 / (1.75^2) = 22.86 -> 22.9
      expect(calculateBmi(70, 175)).toBe(22.9);
      expect(calculateBmi(0, 175)).toBeNull();
      expect(calculateBmi(70, 0)).toBeNull();
      expect(calculateBmi(null, null)).toBeNull();
    });
  });

  describe('NEWS2 Scoring & Risk Stratification', () => {
    it('scores perfectly normal physiological vitals as 0 (low risk)', () => {
      const normalVitals: VitalSignsInput = {
        respiratoryRate: 16,
        oxygenSaturation: 98,
        supplementalOxygen: false,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        heartRate: 72,
        consciousness: 'alert',
        temperature: 36.8,
        temperatureUnit: 'celsius',
      };

      const result = evaluateVitalSigns(normalVitals);
      expect(result.isValid).toBe(true);
      expect(result.news2.totalScore).toBe(0);
      expect(result.news2.riskLevel).toBe('low');
      expect(result.news2.hasRedFlag).toBe(false);
      expect(result.criticalAlert.isCritical).toBe(false);
    });

    it('identifies single parameter red flag (score 3) as low_medium risk', () => {
      const singleRedFlag: VitalSignsInput = {
        respiratoryRate: 16,
        oxygenSaturation: 90, // SpO2 <= 91 triggers score 3
        supplementalOxygen: false,
        bloodPressureSystolic: 120,
        heartRate: 75,
        consciousness: 'alert',
        temperature: 37.0,
      };

      const result = evaluateVitalSigns(singleRedFlag);
      expect(result.news2.subScores.oxygenSaturation).toBe(3);
      expect(result.news2.hasRedFlag).toBe(true);
      expect(result.news2.riskLevel).toBe('low_medium');
      expect(result.criticalAlert.isCritical).toBe(true);
      expect(result.criticalAlert.criticalFlags).toContain('Critical Hypoxemia (SpO2 90%)');
    });

    it('identifies multi-parameter physiological collapse as high risk (NEWS2 >= 7)', () => {
      const septicShockVitals: VitalSignsInput = {
        respiratoryRate: 28, // score 3 (>= 25)
        oxygenSaturation: 91, // score 3 (<= 91)
        supplementalOxygen: true, // score 2
        bloodPressureSystolic: 85, // score 3 (<= 90)
        bloodPressureDiastolic: 50,
        heartRate: 135, // score 3 (>= 131)
        consciousness: 'voice', // score 3 (non-alert)
        temperature: 39.5, // score 2 (>= 39.1)
      };

      const result = evaluateVitalSigns(septicShockVitals);
      // Total score = 3 + 3 + 2 + 3 + 3 + 3 + 2 = 19
      expect(result.news2.totalScore).toBe(19);
      expect(result.news2.riskLevel).toBe('high');
      expect(result.criticalAlert.isCritical).toBe(true);
      expect(result.criticalAlert.summary).toMatch(/Critical vitals detected/);
    });
  });

  describe('Fahrenheit vs. Celsius Safety & Normalization', () => {
    it('correctly normalizes Fahrenheit input and triggers critical high fever alert', () => {
      // 103.1°F is 39.5°C
      const fahrenheitFever: VitalSignsInput = {
        temperature: 103.1,
        temperatureUnit: 'fahrenheit',
        heartRate: 80,
        bloodPressureSystolic: 120,
      };

      const result = evaluateVitalSigns(fahrenheitFever);
      expect(result.normalized.temperatureFahrenheit).toBe(103.1);
      expect(result.normalized.temperatureCelsius).toBe(39.5);
      expect(result.criticalAlert.isCritical).toBe(true);
      expect(result.criticalAlert.criticalFlags).toContain('High Fever (39.5°C / 103.1°F)');
    });

    it('correctly normalizes Celsius input and triggers critical high fever alert', () => {
      const celsiusFever: VitalSignsInput = {
        temperature: 39.2,
        temperatureUnit: 'celsius',
        heartRate: 85,
        bloodPressureSystolic: 120,
      };

      const result = evaluateVitalSigns(celsiusFever);
      expect(result.normalized.temperatureCelsius).toBe(39.2);
      expect(result.criticalAlert.isCritical).toBe(true);
      expect(result.criticalAlert.criticalFlags[0]).toMatch(/High Fever \(39.2°C/);
    });
  });

  describe('Plausibility Validation', () => {
    it('flags unphysiological vital sign values', () => {
      const invalidVitals: VitalSignsInput = {
        temperature: 55, // Implausible
        heartRate: 450, // Implausible
        bloodPressureSystolic: 100,
        bloodPressureDiastolic: 120, // Diastolic > Systolic!
        oxygenSaturation: 105, // > 100%
      };

      const result = evaluateVitalSigns(invalidVitals);
      expect(result.isValid).toBe(false);
      expect(result.validationErrors.temperature).toBeDefined();
      expect(result.validationErrors.heartRate).toBeDefined();
      expect(result.validationErrors.bloodPressure).toBeDefined();
      expect(result.validationErrors.oxygenSaturation).toBeDefined();
    });
  });
});
