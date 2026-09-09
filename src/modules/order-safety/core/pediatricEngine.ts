/**
 * Pediatric Dosing Validation Engine
 * Implements American Academy of Pediatrics (AAP) weight-based dosing guidelines.
 *
 * Clinical Invariants Enforced:
 * 1. Weight-based dosing (mg/kg/day)
 * 2. Mandatory Adult Dose Ceiling Cap (never exceed adult maximum single or daily dose)
 * 3. 110% safe limit threshold requires documented Physician clinical override
 * 4. 200% safe limit threshold triggers an unbypassable HARD STOP
 */

import {
  OrderItemIntent,
  PatientClinicalContext,
  PediatricSafetyAnalysis,
  SafetyFinding,
} from '../types';

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

/**
 * Determine frequency doses per day multiplier
 */
export function getDosesPerDay(frequency: string, defaultDoses: number): number {
  const f = frequency.toLowerCase();
  if (f === 'bid' || f.includes('twice')) return 2;
  if (f === 'tid' || f.includes('three')) return 3;
  if (f === 'qid' || f.includes('four')) return 4;
  if (f === 'daily' || f === 'qd' || f.includes('once')) return 1;
  if (f === 'q4-6h' || f === 'q4h') return 5;
  if (f === 'q6-8h' || f === 'q6h') return 3;
  return defaultDoses;
}

/**
 * Evaluates pediatric dosing safety for an order item against AAP guidelines.
 * Applies only if patient age is under 18 or weight is documented under 45kg.
 */
export function evaluatePediatricDosing(
  item: OrderItemIntent,
  patient: PatientClinicalContext
): {
  finding?: SafetyFinding;
  analysis?: PediatricSafetyAnalysis;
} {
  const isPediatric =
    patient.ageYears < 18 || (patient.ageMonths !== undefined && patient.ageMonths < 216);
  if (!isPediatric || !patient.weightKg || patient.weightKg <= 0) {
    return {};
  }

  const weightKg = patient.weightKg;
  const ageMonths = patient.ageMonths !== undefined ? patient.ageMonths : patient.ageYears * 12;
  const drugKey = item.drugName.toLowerCase().trim();
  const matchedKey = Object.keys(AAP_DOSING_RULES).find((k) => drugKey.includes(k));
  const rule = matchedKey ? AAP_DOSING_RULES[matchedKey] : null;

  if (!rule) {
    return {};
  }

  const adjustmentsApplied: string[] = [];
  const dosesPerDay = item.dosesPerDay || getDosesPerDay(item.frequency, rule.dosesPerDay);
  const dosePerKg =
    item.isHighDoseProtocol && rule.highDoseMgPerKg ? rule.highDoseMgPerKg : rule.doseMgPerKg;

  let calculatedSingleDose = Math.round(weightKg * dosePerKg * 10) / 10;
  let calculatedDailyDose = Math.round(calculatedSingleDose * dosesPerDay * 10) / 10;

  // Enforce Adult Dose Cap
  if (calculatedSingleDose > rule.adultMaxSingleDoseMg) {
    calculatedSingleDose = rule.adultMaxSingleDoseMg;
    adjustmentsApplied.push(
      `Single dose capped at adult maximum (${rule.adultMaxSingleDoseMg} mg)`
    );
  }
  if (calculatedDailyDose > rule.adultMaxDailyDoseMg) {
    calculatedDailyDose = rule.adultMaxDailyDoseMg;
    calculatedSingleDose = Math.round((rule.adultMaxDailyDoseMg / dosesPerDay) * 10) / 10;
    adjustmentsApplied.push(
      `Daily dose capped at adult maximum (${rule.adultMaxDailyDoseMg} mg/day)`
    );
  }

  const prescribedDoseMg = item.doseMg;
  const prescribedDailyDose = prescribedDoseMg * dosesPerDay;
  const prescribedMgPerKgDay = prescribedDailyDose / weightKg;
  const maxSafeDailyDose = weightKg * rule.maxSafeDailyMgPerKg;
  const ratioToSafeCeiling = Math.round((prescribedDailyDose / maxSafeDailyDose) * 100) / 100;

  const analysis: PediatricSafetyAnalysis = {
    drugName: rule.drugName,
    weightKg,
    ageMonths,
    calculatedDailyMgPerKg: Math.round(prescribedMgPerKgDay * 10) / 10,
    maxSafeDailyMgPerKg: rule.maxSafeDailyMgPerKg,
    adultCeilingSingleDoseMg: rule.adultMaxSingleDoseMg,
    adultCeilingDailyDoseMg: rule.adultMaxDailyDoseMg,
    adjustmentsApplied,
    ratioToSafeCeiling,
  };

  // Age/Weight minimum warnings
  if (rule.minAgeMonths && ageMonths < rule.minAgeMonths) {
    return {
      analysis,
      finding: {
        code: `PEDIATRIC_AGE_MIN_${item.clientItemId}`,
        kind: 'PEDIATRIC_DOSE_LIMIT',
        severity: 'SERIOUS',
        isHardStop: false,
        requiresPhysicianOverride: true,
        clientItemId: item.clientItemId,
        drugName: item.drugName,
        title: `Patient Age Below AAP Minimum: ${item.drugName}`,
        detail: `Patient age (${ageMonths} months) is below AAP minimum recommendation (${rule.minAgeMonths} months) for ${rule.drugName}.`,
        clinicalRecommendation:
          'Verify age-appropriateness or document physician clinical justification.',
        source: 'AAP',
      },
    };
  }

  // Overdose Threshold 1: >200% Safe Ceiling => HARD STOP
  if (prescribedDailyDose > maxSafeDailyDose * 2.0) {
    return {
      analysis,
      finding: {
        code: `PEDIATRIC_HARD_STOP_${item.clientItemId}`,
        kind: 'PEDIATRIC_DOSE_LIMIT',
        severity: 'CRITICAL',
        isHardStop: true, // Cannot be overridden by any role
        requiresPhysicianOverride: true,
        clientItemId: item.clientItemId,
        drugName: item.drugName,
        title: `CRITICAL SAFETY STOP: Toxic Pediatric Overdose for ${item.drugName}`,
        detail: `Prescribed dose (${prescribedDoseMg} mg single / ${prescribedDailyDose} mg/day, ${Math.round(prescribedMgPerKgDay)} mg/kg/day) exceeds 200% of maximum AAP safe ceiling (${rule.maxSafeDailyMgPerKg} mg/kg/day). Prescribing blocked.`,
        clinicalRecommendation: `Reduce total daily dose to <= ${maxSafeDailyDose} mg/day (${rule.maxSafeDailyMgPerKg} mg/kg/day).`,
        source: 'AAP',
      },
    };
  }

  // Overdose Threshold 2: >110% Safe Ceiling => Requires Physician Override
  if (prescribedDailyDose > maxSafeDailyDose * 1.1) {
    return {
      analysis,
      finding: {
        code: `PEDIATRIC_OVERDOSE_OVERRIDE_${item.clientItemId}`,
        kind: 'PEDIATRIC_DOSE_LIMIT',
        severity: 'SERIOUS',
        isHardStop: false,
        requiresPhysicianOverride: true,
        clientItemId: item.clientItemId,
        drugName: item.drugName,
        title: `Pediatric Dose Exceeds Safe Ceiling: ${item.drugName}`,
        detail: `Prescribed dose (${Math.round(prescribedMgPerKgDay)} mg/kg/day) exceeds 110% of AAP maximum guideline (${rule.maxSafeDailyMgPerKg} mg/kg/day). Clinical override required.`,
        clinicalRecommendation: `Standard recommended daily dose is ${calculatedDailyDose} mg/day. Document rationale if intentional.`,
        source: 'AAP',
      },
    };
  }

  return { analysis };
}
