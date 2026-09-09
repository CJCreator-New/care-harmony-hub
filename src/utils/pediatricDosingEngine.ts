/**
 * Pediatric Dosing Validation Engine
 * Implements American Academy of Pediatrics (AAP) weight-based dosing guidelines.
 * Used by frontend components (PediatricDosingCard) and backend edge functions (prescription-approval).
 */

export interface AAPDosingRule {
  drugName: string;
  minAgeMonths?: number;
  minWeightKg?: number;
  doseMgPerKg: number; // standard single dose in mg/kg
  highDoseMgPerKg?: number; // maximum single dose in mg/kg for severe indications
  maxSafeDailyMgPerKg: number; // absolute daily limit in mg/kg/day
  defaultFrequency: string;
  dosesPerDay: number;
  maxSingleDoseMg: number;
  maxDailyDoseMg: number;
  adultMaxSingleDoseMg: number;
  adultMaxDailyDoseMg: number;
  specialConsiderations: string[];
}

export const AAP_DOSING_RULES: Record<string, AAPDosingRule> = {
  amoxicillin: {
    drugName: 'Amoxicillin',
    minAgeMonths: 2,
    minWeightKg: 3,
    doseMgPerKg: 22.5, // 45 mg/kg/day divided BID for standard
    highDoseMgPerKg: 45, // 90 mg/kg/day divided BID for otitis media
    maxSafeDailyMgPerKg: 90, // maximum safe daily AAP ceiling
    defaultFrequency: 'BID',
    dosesPerDay: 2,
    maxSingleDoseMg: 1000,
    maxDailyDoseMg: 2000,
    adultMaxSingleDoseMg: 1000,
    adultMaxDailyDoseMg: 2000,
    specialConsiderations: [
      'Standard dose: 25-45 mg/kg/day divided BID',
      'High-dose protocol: 90 mg/kg/day divided BID for severe otitis media',
      'Max single dose 1000 mg; max daily 2000 mg',
    ],
  },
  acetaminophen: {
    drugName: 'Acetaminophen',
    minAgeMonths: 2,
    minWeightKg: 3,
    doseMgPerKg: 15,
    maxSafeDailyMgPerKg: 75,
    defaultFrequency: 'q4-6h',
    dosesPerDay: 5,
    maxSingleDoseMg: 650,
    maxDailyDoseMg: 3000,
    adultMaxSingleDoseMg: 1000,
    adultMaxDailyDoseMg: 4000,
    specialConsiderations: [
      '10-15 mg/kg/dose every 4-6 hours as needed',
      'Do not exceed 5 doses (75 mg/kg) in 24 hours',
      'Check for other acetaminophen-containing combination products',
    ],
  },
  ibuprofen: {
    drugName: 'Ibuprofen',
    minAgeMonths: 6,
    minWeightKg: 5,
    doseMgPerKg: 10,
    maxSafeDailyMgPerKg: 40,
    defaultFrequency: 'q6-8h',
    dosesPerDay: 3,
    maxSingleDoseMg: 400,
    maxDailyDoseMg: 1200,
    adultMaxSingleDoseMg: 800,
    adultMaxDailyDoseMg: 2400,
    specialConsiderations: [
      'Contraindicated in infants < 6 months',
      'Take with food to minimize GI upset',
      'Avoid in dehydration or renal impairment',
    ],
  },
  azithromycin: {
    drugName: 'Azithromycin',
    minAgeMonths: 6,
    minWeightKg: 5,
    doseMgPerKg: 10,
    maxSafeDailyMgPerKg: 10,
    defaultFrequency: 'daily',
    dosesPerDay: 1,
    maxSingleDoseMg: 500,
    maxDailyDoseMg: 500,
    adultMaxSingleDoseMg: 500,
    adultMaxDailyDoseMg: 500,
    specialConsiderations: [
      'Day 1: 10 mg/kg (max 500 mg); Days 2-5: 5 mg/kg (max 250 mg)',
      'Monitor for QT prolongation in high-risk patients',
    ],
  },
  cephalexin: {
    drugName: 'Cephalexin',
    minAgeMonths: 3,
    minWeightKg: 4,
    doseMgPerKg: 12.5,
    highDoseMgPerKg: 25,
    maxSafeDailyMgPerKg: 100,
    defaultFrequency: 'QID',
    dosesPerDay: 4,
    maxSingleDoseMg: 500,
    maxDailyDoseMg: 2000,
    adultMaxSingleDoseMg: 1000,
    adultMaxDailyDoseMg: 4000,
    specialConsiderations: [
      '25-50 mg/kg/day divided into 2 to 4 doses',
      'Severe infections: up to 100 mg/kg/day (max 4000 mg/day)',
    ],
  },
  prednisolone: {
    drugName: 'Prednisolone',
    minAgeMonths: 1,
    minWeightKg: 3,
    doseMgPerKg: 1,
    highDoseMgPerKg: 2,
    maxSafeDailyMgPerKg: 2,
    defaultFrequency: 'daily',
    dosesPerDay: 1,
    maxSingleDoseMg: 60,
    maxDailyDoseMg: 60,
    adultMaxSingleDoseMg: 60,
    adultMaxDailyDoseMg: 60,
    specialConsiderations: [
      'Asthma exacerbation: 1-2 mg/kg/day (max 60 mg/day) for 3-5 days',
      'Give with food in the morning',
    ],
  },
};

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
      warnings: [`No AAP dosing guideline configured for "${drugName}". Manual clinical pharmacist review required.`],
      error: 'Unconfigured pediatric medication',
    };
  }

  // Check age and weight constraints
  if (rule.minAgeMonths && ageMonths < rule.minAgeMonths) {
    warnings.push(`Caution: Patient age (${ageMonths}m) is below recommended minimum (${rule.minAgeMonths}m) for ${rule.drugName}`);
  }
  if (rule.minWeightKg && weightKg < rule.minWeightKg) {
    warnings.push(`Caution: Patient weight (${weightKg}kg) is below recommended minimum (${rule.minWeightKg}kg) for ${rule.drugName}`);
  }

  const dosePerKg = isHighDoseProtocol && rule.highDoseMgPerKg ? rule.highDoseMgPerKg : rule.doseMgPerKg;
  let rawSingleDose = Math.round(weightKg * dosePerKg * 10) / 10;
  const dosesPerDay = rule.dosesPerDay;
  let rawDailyDose = Math.round(rawSingleDose * dosesPerDay * 10) / 10;

  // AC-2: Enforce Adult Dose Cap
  if (rawSingleDose > rule.adultMaxSingleDoseMg) {
    rawSingleDose = rule.adultMaxSingleDoseMg;
    adjustmentsApplied.push(`Single dose capped at standard adult maximum (${rule.adultMaxSingleDoseMg} mg)`);
  }
  if (rawDailyDose > rule.adultMaxDailyDoseMg) {
    rawDailyDose = rule.adultMaxDailyDoseMg;
    rawSingleDose = Math.round((rule.adultMaxDailyDoseMg / dosesPerDay) * 10) / 10;
    adjustmentsApplied.push(`Daily dose capped at standard adult maximum (${rule.adultMaxDailyDoseMg} mg/day)`);
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
    const isExceeding200Percent = prescribedDailyDose > maxSafeDailyDose * 2.0;

    if (isExceeding200Percent) {
      isHardStop = true;
      isValid = false;
      errorMsg = `🚨 CRITICAL SAFETY STOP: Prescribed dose (${prescribedDoseMg} mg single / ${prescribedDailyDose} mg/day, ${Math.round(prescribedMgPerKgDay)} mg/kg/day) exceeds 200% of maximum safety threshold (${rule.maxSafeDailyMgPerKg} mg/kg/day). Prescribing blocked.`;
      warnings.push(errorMsg);
    } else if (isExceeding110Percent) {
      requiresOverride = true;
      const hasValidOverride = Boolean(clinicalOverrideReason && clinicalOverrideReason.trim().length >= 10);
      if (!hasValidOverride) {
        isValid = false;
        errorMsg = `Dose exceeds 110% of AAP maximum guideline (${Math.round(prescribedMgPerKgDay)} mg/kg/day vs max ${rule.maxSafeDailyMgPerKg} mg/kg/day). Clinical override justification required.`;
        warnings.push(errorMsg);
      } else {
        warnings.push(`Dose exceeds standard guideline but approved via documented clinical override: "${clinicalOverrideReason}"`);
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
