/**
 * Pediatric Dosing Validation Engine
 * Implements American Academy of Pediatrics (AAP) weight-based dosing guidelines.
 * Used by frontend components (PediatricDosingCard) and backend edge functions (prescription-approval).
 */

import { AAP_DOSING_RULES, type AAPDosingRule } from '@/modules/order-safety';
export { AAP_DOSING_RULES, type AAPDosingRule };

export interface ValidatePediatricDoseParams {
  drugName: string;
  weightKg: number;
  ageMonths?: number;
  ageYears?: number;
  prescribedDoseMg?: number;
  frequency?: string;
  isHighDoseProtocol?: boolean;
  clinicalOverrideReason?: string;
}

export interface PediatricDoseCalculationResult {
  drugName: string;
  patientWeightKg: number;
  ageMonths: number;
  recommendedSingleDoseMg: number;
  recommendedDailyDoseMg: number;
  maxSingleDoseMg: number;
  maxDailyDoseMg: number;
  frequency: string;
  isValid: boolean;
  isHardStop: boolean;
  requiresOverride: boolean;
  adjustmentsApplied: string[];
  warnings: string[];
  error?: string;
}

export function validatePediatricDose(
  params: ValidatePediatricDoseParams
): PediatricDoseCalculationResult {
  const {
    drugName,
    weightKg,
    ageMonths = params.ageYears ? params.ageYears * 12 : 24,
    prescribedDoseMg,
    frequency,
    isHighDoseProtocol = false,
    clinicalOverrideReason,
  } = params;

  const key = drugName.toLowerCase().trim();
  const matchedKey = Object.keys(AAP_DOSING_RULES).find((k) => key.includes(k));
  const rule = matchedKey ? AAP_DOSING_RULES[matchedKey] : null;

  const warnings: string[] = [];
  const adjustmentsApplied: string[] = [];

  if (!rule) {
    return {
      drugName,
      patientWeightKg: weightKg,
      ageMonths,
      recommendedSingleDoseMg: 0,
      recommendedDailyDoseMg: 0,
      maxSingleDoseMg: 0,
      maxDailyDoseMg: 0,
      frequency: frequency || 'daily',
      isValid: false,
      isHardStop: false,
      requiresOverride: true,
      adjustmentsApplied: [],
      warnings: [
        `No AAP dosing guideline configured for "${drugName}". Manual clinical pharmacist review required.`,
      ],
      error: 'Unconfigured pediatric medication',
    };
  }

  // Check age and weight constraints
  if (rule.minAgeMonths && ageMonths < rule.minAgeMonths) {
    warnings.push(
      `Caution: Patient age (${ageMonths}m) is below recommended minimum (${rule.minAgeMonths}m) for ${rule.drugName}`
    );
  }
  if (rule.minWeightKg && weightKg < rule.minWeightKg) {
    warnings.push(
      `Caution: Patient weight (${weightKg}kg) is below recommended minimum (${rule.minWeightKg}kg) for ${rule.drugName}`
    );
  }

  const dosePerKg =
    isHighDoseProtocol && rule.highDoseMgPerKg ? rule.highDoseMgPerKg : rule.doseMgPerKg;
  let rawSingleDose = Math.round(weightKg * dosePerKg * 10) / 10;
  const dosesPerDay = rule.dosesPerDay;
  let rawDailyDose = Math.round(rawSingleDose * dosesPerDay * 10) / 10;

  // AC-2: Enforce Adult Dose Cap
  if (rawSingleDose > rule.adultMaxSingleDoseMg) {
    rawSingleDose = rule.adultMaxSingleDoseMg;
    adjustmentsApplied.push(
      `Single dose capped at standard adult maximum (${rule.adultMaxSingleDoseMg} mg)`
    );
  }
  if (rawDailyDose > rule.adultMaxDailyDoseMg) {
    rawDailyDose = rule.adultMaxDailyDoseMg;
    rawSingleDose = Math.round((rule.adultMaxDailyDoseMg / dosesPerDay) * 10) / 10;
    adjustmentsApplied.push(
      `Daily dose capped at standard adult maximum (${rule.adultMaxDailyDoseMg} mg/day)`
    );
  }

  let isValid = true;
  let isHardStop = false;
  let requiresOverride = false;
  let errorMsg: string | undefined;

  // If a prescribed dose is being evaluated
  if (prescribedDoseMg !== undefined && prescribedDoseMg > 0) {
    const prescribedDailyDose = prescribedDoseMg * dosesPerDay;
    const prescribedMgPerKgDay = prescribedDailyDose / weightKg;

    // AC-1: Overdose evaluation (10 kg child with 120 mg/kg/day vs max 90 mg/kg/day)
    const maxSafeDailyDose = weightKg * rule.maxSafeDailyMgPerKg;
    const isExceeding110Percent = prescribedDailyDose > maxSafeDailyDose * 1.1;
    const isExceeding200Percent =
      prescribedDailyDose > maxSafeDailyDose * 2.0 ||
      (rule.adultMaxSingleDoseMg > 0 && prescribedDoseMg > rule.adultMaxSingleDoseMg * 2.0) ||
      (rule.adultMaxDailyDoseMg > 0 && prescribedDailyDose > rule.adultMaxDailyDoseMg * 2.0);

    if (isExceeding200Percent) {
      isHardStop = true;
      isValid = false;
      errorMsg = `🚨 CRITICAL SAFETY STOP: Prescribed dose (${prescribedDoseMg} mg single / ${prescribedDailyDose} mg/day, ${Math.round(prescribedMgPerKgDay)} mg/kg/day) exceeds 200% of maximum safety threshold (${rule.maxSafeDailyMgPerKg} mg/kg/day). Prescribing blocked.`;
      warnings.push(errorMsg);
    } else if (isExceeding110Percent) {
      requiresOverride = true;
      const hasValidOverride = Boolean(
        clinicalOverrideReason && clinicalOverrideReason.trim().length >= 10
      );
      if (!hasValidOverride) {
        isValid = false;
        errorMsg = `Dose exceeds 110% of AAP maximum guideline (${Math.round(prescribedMgPerKgDay)} mg/kg/day vs max ${rule.maxSafeDailyMgPerKg} mg/kg/day). Clinical override justification required.`;
        warnings.push(errorMsg);
      } else {
        warnings.push(
          `Dose exceeds standard guideline but approved via documented clinical override: "${clinicalOverrideReason}"`
        );
      }
    }
  }

  return {
    drugName: rule.drugName,
    patientWeightKg: weightKg,
    ageMonths,
    recommendedSingleDoseMg: rawSingleDose,
    recommendedDailyDoseMg: rawDailyDose,
    maxSingleDoseMg: rule.maxSingleDoseMg,
    maxDailyDoseMg: rule.maxDailyDoseMg,
    frequency: frequency || rule.defaultFrequency,
    isValid,
    isHardStop,
    requiresOverride,
    adjustmentsApplied,
    warnings,
    error: errorMsg,
  };
}
