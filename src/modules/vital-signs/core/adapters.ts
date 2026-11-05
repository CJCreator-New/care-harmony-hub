/**
 * Adapters from stored vitals records to the module's `VitalSignsInput`.
 *
 * Consultation and nursing records store vitals in snake_case, often with blood
 * pressure as a single "120/80" string. Passing those records straight to
 * `evaluateVitalSigns` (which reads camelCase keys) silently scored every
 * parameter as missing, so a shocked patient showed NEWS2 0 / LOW (audit CLIN-08).
 */

import type { ConsciousnessLevel, TemperatureUnit, VitalSignsInput } from '../types';

type Raw = Record<string, unknown> | null | undefined;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

const pick = (r: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
  }
  return undefined;
};

/** Splits "120/80" (also "120 / 80", "120-80") into systolic and diastolic. */
export function parseBloodPressure(value: unknown): { systolic: number | null; diastolic: number | null } {
  if (typeof value !== 'string') return { systolic: null, diastolic: null };
  const m = value.trim().match(/^(\d{2,3}(?:\.\d+)?)\s*[/-]\s*(\d{2,3}(?:\.\d+)?)$/);
  if (!m) return { systolic: null, diastolic: null };
  return { systolic: Number(m[1]), diastolic: Number(m[2]) };
}

/**
 * Infers the unit when the record does not state it. Human body temperatures
 * never exceed 45 °C, and never fall below 80 °F, so the ranges do not overlap.
 */
export function inferTemperatureUnit(value: number | null, stated?: unknown): TemperatureUnit | undefined {
  const s = typeof stated === 'string' ? stated.toLowerCase() : '';
  if (s.startsWith('f')) return 'fahrenheit';
  if (s.startsWith('c')) return 'celsius';
  if (value === null) return undefined;
  return value > 45 ? 'fahrenheit' : 'celsius';
}

const CONSCIOUSNESS: Record<string, ConsciousnessLevel> = {
  a: 'alert', alert: 'alert',
  c: 'confusion', confused: 'confusion', confusion: 'confusion', new_confusion: 'confusion',
  v: 'voice', voice: 'voice',
  p: 'pain', pain: 'pain',
  u: 'unresponsive', unresponsive: 'unresponsive',
};

/**
 * Maps a stored vitals record (snake_case or camelCase) to `VitalSignsInput`.
 * Weight and height are included only when their unit is stated in the record
 * (`weight_kg`, `height_cm`, or `weight_unit`/`height_unit`). Consultation
 * records before CLIN-09 were labelled lbs/in, and nursing forms record kg/cm
 * or lb/in into the unit-less `vital_signs` columns, so guessing is unsafe.
 */
export function fromVitalsRecord(record: Raw): VitalSignsInput {
  if (!record || typeof record !== 'object') return {};
  const r = record as Record<string, unknown>;

  let systolic = num(pick(r, 'bloodPressureSystolic', 'blood_pressure_systolic', 'systolic_bp', 'systolic'));
  let diastolic = num(pick(r, 'bloodPressureDiastolic', 'blood_pressure_diastolic', 'diastolic_bp', 'diastolic'));
  if (systolic === null || diastolic === null) {
    const bp = parseBloodPressure(pick(r, 'blood_pressure', 'bloodPressure', 'bp'));
    systolic = systolic ?? bp.systolic;
    diastolic = diastolic ?? bp.diastolic;
  }

  const temperature = num(pick(r, 'temperature', 'temp'));
  const temperatureUnit = inferTemperatureUnit(temperature, pick(r, 'temperatureUnit', 'temperature_unit'));

  const consciousnessRaw = pick(r, 'consciousness', 'consciousness_level', 'avpu', 'level_of_consciousness');
  const consciousness =
    typeof consciousnessRaw === 'string' ? CONSCIOUSNESS[consciousnessRaw.trim().toLowerCase()] : undefined;

  // Explicit yes/no is kept; an absent value stays undefined so NEWS2 reports it as missing (CLIN-12).
  const o2 = pick(r, 'supplementalOxygen', 'supplemental_oxygen', 'on_oxygen');
  const supplementalOxygen =
    o2 === true || o2 === 'true' || o2 === 'yes' ? true : o2 === false || o2 === 'false' || o2 === 'no' ? false : undefined;
  const spo2ScaleRaw = num(pick(r, 'spo2Scale', 'spo2_scale', 'oxygen_saturation_scale'));
  const spo2Scale = spo2ScaleRaw === 1 || spo2ScaleRaw === 2 ? spo2ScaleRaw : undefined;

  const weightUnit = String(pick(r, 'weight_unit', 'weightUnit') ?? '').toLowerCase();
  const heightUnit = String(pick(r, 'height_unit', 'heightUnit') ?? '').toLowerCase();
  const rawWeight = num(pick(r, 'weight'));
  const rawHeight = num(pick(r, 'height'));
  const weightKg =
    num(pick(r, 'weightKg', 'weight_kg')) ??
    (rawWeight === null ? null : weightUnit === 'kg' ? rawWeight : weightUnit.startsWith('lb') ? rawWeight * 0.45359237 : null);
  const heightCm =
    num(pick(r, 'heightCm', 'height_cm')) ??
    (rawHeight === null ? null : heightUnit === 'cm' ? rawHeight : heightUnit === 'in' ? rawHeight * 2.54 : null);

  return {
    temperature,
    ...(temperatureUnit ? { temperatureUnit } : {}),
    heartRate: num(pick(r, 'heartRate', 'heart_rate', 'pulse', 'pulse_rate')),
    bloodPressureSystolic: systolic,
    bloodPressureDiastolic: diastolic,
    respiratoryRate: num(pick(r, 'respiratoryRate', 'respiratory_rate', 'resp_rate')),
    oxygenSaturation: num(pick(r, 'oxygenSaturation', 'oxygen_saturation', 'spo2', 'SpO2')),
    ...(supplementalOxygen !== undefined ? { supplementalOxygen } : {}),
    ...(spo2Scale ? { spo2Scale } : {}),
    ...(consciousness ? { consciousness } : {}),
    painScale: num(pick(r, 'painScale', 'pain_level', 'pain_scale', 'pain_score')),
    weightKg,
    heightCm,
  };
}

/** Plausible body weight range in kg; matches the evaluator's plausibility check. */
const MIN_PLAUSIBLE_WEIGHT_KG = 1;
const MAX_PLAUSIBLE_WEIGHT_KG = 500;

/**
 * Weight in kg that is safe to use for weight-based dose checks, or `undefined`.
 *
 * Returns a value only when the record states the unit (`weight_kg`, or
 * `weight` with `weight_unit` kg/lb) and the result is physiologically
 * plausible. A bare `weight` is never used: consultation records before CLIN-09
 * were labelled lbs, and the `vital_signs` table has no unit column while its
 * writers disagree (kg or lb), so any guess could be off by 2.2x.
 */
export function verifiedWeightKg(record: Raw): number | undefined {
  const { weightKg } = fromVitalsRecord(record);
  if (typeof weightKg !== 'number' || !Number.isFinite(weightKg)) return undefined;
  if (weightKg < MIN_PLAUSIBLE_WEIGHT_KG || weightKg > MAX_PLAUSIBLE_WEIGHT_KG) return undefined;
  return Math.round(weightKg * 100) / 100;
}

/** True when the record has at least one NEWS2 parameter (otherwise a score of 0 would mislead). */
export function hasNews2Parameters(input: VitalSignsInput): boolean {
  return [
    input.temperature,
    input.heartRate,
    input.bloodPressureSystolic,
    input.respiratoryRate,
    input.oxygenSaturation,
  ].some((v) => v !== null && v !== undefined && v !== '');
}
