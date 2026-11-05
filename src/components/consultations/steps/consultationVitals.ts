/**
 * Units for the vitals captured in the consultation workflow (audit CLIN-09).
 *
 * `consultations.vitals` stores each measurement next to an explicit unit key:
 * `temperature` + `temperature_unit`, `weight` + `weight_unit`,
 * `height` + `height_unit`. `fromVitalsRecord` / `verifiedWeightKg` in
 * `@/modules/vital-signs` read these keys. Records saved before CLIN-09 have no
 * unit keys; their weight and height are treated as unit-unknown.
 */

import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  inferTemperatureUnit,
  kgToLb,
  lbToKg,
  type TemperatureUnit,
} from '@/modules/vital-signs';

export type WeightUnit = 'kg' | 'lb';
export type HeightUnit = 'cm' | 'in';

export const WEIGHT_UNITS: ReadonlyArray<{ value: WeightUnit; label: string }> = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];
export const HEIGHT_UNITS: ReadonlyArray<{ value: HeightUnit; label: string }> = [
  { value: 'cm', label: 'cm' },
  { value: 'in', label: 'in' },
];
export const TEMPERATURE_UNITS: ReadonlyArray<{ value: TemperatureUnit; label: string }> = [
  { value: 'celsius', label: '°C' },
  { value: 'fahrenheit', label: '°F' },
];

/** The subset of a `vital_signs` row the consultation form copies. */
export interface NurseVitalsRow {
  temperature?: number | null;
  heart_rate?: number | null;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  respiratory_rate?: number | null;
  oxygen_saturation?: number | null;
  weight?: number | null;
  height?: number | null;
  pain_level?: number | null;
}

type VitalsForm = Record<string, unknown>;

const isBlank = (v: unknown) => v === undefined || v === null || v === '';
const hasValue = (v: unknown): v is number | string => !isBlank(v);

export function isWeightUnit(v: unknown): v is WeightUnit {
  return v === 'kg' || v === 'lb';
}
export function isHeightUnit(v: unknown): v is HeightUnit {
  return v === 'cm' || v === 'in';
}
export function isTemperatureUnit(v: unknown): v is TemperatureUnit {
  return v === 'celsius' || v === 'fahrenheit';
}

const toOneDecimal = (n: number) => n.toFixed(1);

/**
 * Patch for switching the temperature unit. The entered value is converted so
 * it keeps its physical meaning (37.0 °C becomes 98.6 °F). An unstated unit is
 * read from the value first, as the form displays it (CLIN-09).
 */
export function switchTemperatureUnit(vitals: VitalsForm | null | undefined, unit: TemperatureUnit): VitalsForm {
  const current = vitals ?? {};
  const patch: VitalsForm = { temperature_unit: unit };
  const value = parseFloat(String(current.temperature ?? ''));
  if (!Number.isFinite(value)) return patch;
  const from = isTemperatureUnit(current.temperature_unit) ? current.temperature_unit : inferTemperatureUnit(value);
  if (!from || from === unit) return patch;
  patch.temperature = toOneDecimal(from === 'celsius' ? celsiusToFahrenheit(value) : fahrenheitToCelsius(value));
  return patch;
}

/**
 * Patch for switching the weight unit. A weight whose unit was never stated is
 * not converted: the doctor is stating what the number means (CLIN-09).
 */
export function switchWeightUnit(vitals: VitalsForm | null | undefined, unit: WeightUnit): VitalsForm {
  const current = vitals ?? {};
  const patch: VitalsForm = { weight_unit: unit };
  const value = parseFloat(String(current.weight ?? ''));
  if (!Number.isFinite(value) || !isWeightUnit(current.weight_unit) || current.weight_unit === unit) return patch;
  patch.weight = toOneDecimal(current.weight_unit === 'kg' ? kgToLb(value) : lbToKg(value));
  return patch;
}

/** True when a weight is entered but its unit is not stated (it will not be used for dose checks). */
export function weightNeedsUnit(vitals: VitalsForm | null | undefined): boolean {
  return !!vitals && hasValue(vitals.weight) && !isWeightUnit(vitals.weight_unit);
}

/** True when a height is entered but its unit is not stated. */
export function heightNeedsUnit(vitals: VitalsForm | null | undefined): boolean {
  return !!vitals && hasValue(vitals.height) && !isHeightUnit(vitals.height_unit);
}

/**
 * Builds the patch that copies the latest nurse vitals into the consultation
 * form. Fields the doctor has already entered are never overwritten.
 *
 * Units:
 * - Temperature: the unit is inferred from the value. Human body temperatures
 *   in °C (< 45) and °F (> 80) do not overlap, so this is not a guess.
 * - Weight and height: `vital_signs` has no unit column and its writers
 *   disagree (RecordVitalsModal / PatientPrepModal record kg and cm,
 *   UnifiedPatientPrepPanel records lb and in). The number is copied with its
 *   unit explicitly cleared, so the doctor must state it before it is used.
 */
export function buildNurseVitalsPatch(
  current: VitalsForm | null | undefined,
  latest: NurseVitalsRow | null | undefined
): VitalsForm {
  if (!latest) return {};
  const vitals = current ?? {};
  const patch: VitalsForm = {};

  if (isBlank(vitals.temperature) && hasValue(latest.temperature)) {
    patch.temperature = String(latest.temperature);
    const unit = inferTemperatureUnit(Number(latest.temperature));
    patch.temperature_unit = unit ?? null;
  }
  if (isBlank(vitals.heart_rate) && hasValue(latest.heart_rate)) {
    patch.heart_rate = String(latest.heart_rate);
  }
  if (
    isBlank(vitals.blood_pressure) &&
    hasValue(latest.blood_pressure_systolic) &&
    hasValue(latest.blood_pressure_diastolic)
  ) {
    patch.blood_pressure = `${latest.blood_pressure_systolic}/${latest.blood_pressure_diastolic}`;
  }
  if (isBlank(vitals.respiratory_rate) && hasValue(latest.respiratory_rate)) {
    patch.respiratory_rate = String(latest.respiratory_rate);
  }
  if (isBlank(vitals.oxygen_saturation) && hasValue(latest.oxygen_saturation)) {
    patch.oxygen_saturation = String(latest.oxygen_saturation);
  }
  if (isBlank(vitals.weight) && hasValue(latest.weight)) {
    patch.weight = String(latest.weight);
    // Clear any unit the doctor picked before copying: it described their entry, not the nurse's.
    patch.weight_unit = null;
  }
  if (isBlank(vitals.height) && hasValue(latest.height)) {
    patch.height = String(latest.height);
    patch.height_unit = null;
  }
  if (isBlank(vitals.pain_level) && hasValue(latest.pain_level)) {
    patch.pain_level = String(latest.pain_level);
  }
  return patch;
}
