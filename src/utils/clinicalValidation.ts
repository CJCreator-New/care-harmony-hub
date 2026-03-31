/**
 * Clinical Domain Validation Utilities
 * Enforces medically correct logic, realistic ranges, age/drug appropriateness per hims-domain-expert skill
 * 
 * Core invariants for patient safety:
 * - Vital signs ranges per clinical standards
 * - Age-based dosage and alert logic (pediatric/adult/geriatric)
 * - Drug-route compatibility
 * - Pregnancy/breastfeeding contraindications
 * - ICD-10 format validation
 */

// ─── Vital Signs Realistic Ranges (per clinical standards) ────────────────────

export interface VitalSignsRange {
  min: number;
  max: number;
  criticalLow?: number;
  criticalHigh?: number;
}

/**
 * Adult vital signs normal ranges.
 * Clinical consensus from AHA/ACC/ATS standards.
 */
export const ADULT_VITAL_RANGES: Record<string, VitalSignsRange> = {
  heart_rate: { min: 60, max: 100, criticalLow: 40, criticalHigh: 180 },
  systolic_bp: { min: 90, max: 120, criticalLow: 70, criticalHigh: 200 },
  diastolic_bp: { min: 60, max: 80, criticalLow: 40, criticalHigh: 130 },
  spo2: { min: 95, max: 100, criticalLow: 85, criticalHigh: 100 },
  temperature_c: { min: 36.1, max: 37.2, criticalLow: 35.0, criticalHigh: 40.0 },
  respiratory_rate: { min: 12, max: 20, criticalLow: 8, criticalHigh: 40 },
};

/**
 * Pediatric vital signs (ages 1-12) — narrower, age-specific ranges.
 */
export const PEDIATRIC_VITAL_RANGES: Record<string, VitalSignsRange> = {
  heart_rate: { min: 70, max: 110, criticalLow: 50, criticalHigh: 160 },
  systolic_bp: { min: 85, max: 110, criticalLow: 60, criticalHigh: 150 },
  diastolic_bp: { min: 50, max: 70, criticalLow: 35, criticalHigh: 100 },
  spo2: { min: 95, max: 100, criticalLow: 90, criticalHigh: 100 },
  temperature_c: { min: 36.5, max: 37.5, criticalLow: 35.0, criticalHigh: 39.5 },
  respiratory_rate: { min: 20, max: 30, criticalLow: 15, criticalHigh: 50 },
};

/**
 * Geriatric vital signs (age 65+) — higher baseline, wider bounds.
 */
export const GERIATRIC_VITAL_RANGES: Record<string, VitalSignsRange> = {
  heart_rate: { min: 50, max: 110, criticalLow: 35, criticalHigh: 160 },
  systolic_bp: { min: 110, max: 140, criticalLow: 80, criticalHigh: 220 },
  diastolic_bp: { min: 70, max: 90, criticalLow: 50, criticalHigh: 140 },
  spo2: { min: 93, max: 100, criticalLow: 88, criticalHigh: 100 },
  temperature_c: { min: 36.0, max: 37.5, criticalLow: 34.0, criticalHigh: 39.0 },
  respiratory_rate: { min: 12, max: 24, criticalLow: 8, criticalHigh: 40 },
};

// ─── Age-based Dosage Guards ──────────────────────────────────────────────────

export type AgeCategory = 'neonatal' | 'infant' | 'child' | 'adolescent' | 'adult' | 'geriatric';

/**
 * Determine age category from age in years.
 * Used for dose calculation, reference ranges, alert thresholds.
 */
export function getAgeCategory(ageYears: number): AgeCategory {
  if (ageYears < 0.083) return 'neonatal'; // <1 month
  if (ageYears < 1) return 'infant';
  if (ageYears < 12) return 'child';
  if (ageYears < 18) return 'adolescent';
  if (ageYears < 65) return 'adult';
  return 'geriatric';
}

/**
 * Validate dosage appropriateness for age.
 * Returns { valid: boolean, warning?: string }
 */
export function validateDosageForAge(
  dosageMg: number,
  ageYears: number,
  drugName: string
): { valid: boolean; warning?: string } {
  const category = getAgeCategory(ageYears);

  // High-risk pediatric drugs: maximum thresholds
  if (category === 'neonatal' && dosageMg > 10) {
    return { valid: false, warning: `Neonatal dose >10mg is typically contraindicated for ${drugName}` };
  }
  if (category === 'infant' && dosageMg > 50) {
    return { valid: false, warning: `Infant dose >50mg requires close supervision for ${drugName}` };
  }
  if (category === 'child' && dosageMg > 500) {
    return { valid: false, warning: `Child dose >500mg unusually high for ${drugName}, verify age-adjusted calculation` };
  }

  // Geriatric dose caution: typically 50% of adult
  if (category === 'geriatric' && dosageMg > 1500) {
    return { valid: true, warning: `Geriatric high dose detected (${dosageMg}mg). Verify renal/hepatic adjustment.` };
  }

  return { valid: true };
}

// ─── Pregnancy & Breastfeeding Flags ──────────────────────────────────────────

/**
 * FDA Pregnancy Categories (though being phased out in US, still reference standard).
 * A/B = Safe, C = Consider benefit/risk, D = Avoid, X = Contraindicated
 */
export const TERATOGENIC_DRUGS = {
  // X = Contraindicated in pregnancy
  contraindicated: [
    'isotretinoin', // Accutane
    'finasteride', // Proscar
    'misoprostol', // Cytotec
    'warfarin', // High-risk in 1st trimester
    'statins',
    'ace-inhibitors', // 2nd/3rd trimester
    'nsaids', // Late pregnancy
  ],
  // C = Use with caution
  cautious: ['fluconazole', 'acyclovir', 'beta-blockers', 'certain antibiotics'],
};

/**
 * Check if drug is contraindicated in pregnancy/breastfeeding.
 */
export function checkPregnancyContraindication(
  drugName: string,
  isPregnant: boolean,
  isBreastfeeding: boolean
): { safe: boolean; category?: string; recommendation?: string } {
  const normalized = drugName.toLowerCase();

  if (isPregnant) {
    if (TERATOGENIC_DRUGS.contraindicated.some((d) => normalized.includes(d))) {
      return {
        safe: false,
        category: 'X',
        recommendation: `${drugName} is contraindicated in pregnancy. Consider alternative.`,
      };
    }
    if (TERATOGENIC_DRUGS.cautious.some((d) => normalized.includes(d))) {
      return {
        safe: true,
        category: 'C',
        recommendation: `${drugName} has pregnancy concerns (Cat C). Weigh benefits vs. risks.`,
      };
    }
  }

  // Breastfeeding checks (subset of teratogenic)
  if (isBreastfeeding && normalized.match(/warfarin|statins|isotretinoin/)) {
    return {
      safe: false,
      recommendation: `${drugName} may pass into breastmilk. Consider alternative or express-and-discard.`,
    };
  }

  return { safe: true };
}

// ─── Drug-Route Compatibility ────────────────────────────────────────────────

export type Route = 'PO' | 'IV' | 'IV (slow)' | 'IM' | 'SC' | 'PR' | 'Inhaled' | 'Topical' | 'SL';

/**
 * Known route restrictions for high-risk drugs.
 */
const ROUTE_RESTRICTIONS: Record<string, Route[]> = {
  insulin: ['SC', 'IV'], // Never PO for systemic
  heparin: ['IV', 'SC'], // Not IM
  potassium: ['IV (slow)', 'PO'], // Never rapid IV
  nitroglycerin: ['SL', 'PO', 'Topical'], // Rarely IV
};

/**
 * Validate drug-route combination.
 */
export function validateDrugRoute(drugName: string, route: Route): { valid: boolean; warning?: string } {
  const normalized = drugName.toLowerCase();
  const allowedRoutes = Object.entries(ROUTE_RESTRICTIONS).find(([drug]) =>
    normalized.includes(drug)
  )?.[1];

  if (allowedRoutes && !allowedRoutes.includes(route)) {
    return {
      valid: false,
      warning: `${drugName} via ${route} not recommended. Allowed: ${allowedRoutes.join(', ')}`,
    };
  }

  return { valid: true };
}

// ─── ICD-10 Format Validation ─────────────────────────────────────────────────

/**
 * Validate ICD-10 code format (e.g., A00, B15.9, Z12.3).
 * Pattern: 1 letter, 2 digits, optional '.', optional 1 char
 */
export function validateICD10Code(code: string): { valid: boolean; message?: string } {
  const icd10Pattern = /^[A-Z]\d{2}(\.\d{1,2})?$/;
  if (!icd10Pattern.test(code)) {
    return {
      valid: false,
      message: `Invalid ICD-10 format: ${code}. Expected format: A99.99`,
    };
  }
  return { valid: true };
}

// ─── Vital Signs Validation Helpers ──────────────────────────────────────────

/**
 * Get appropriate vital range for age.
 */
export function getVitalRangeForAge(vitalName: string, ageYears: number): VitalSignsRange | null {
  const category = getAgeCategory(ageYears);
  let ranges: Record<string, VitalSignsRange>;

  if (category === 'neonatal' || category === 'infant' || category === 'child') {
    ranges = PEDIATRIC_VITAL_RANGES;
  } else if (category === 'geriatric') {
    ranges = GERIATRIC_VITAL_RANGES;
  } else {
    ranges = ADULT_VITAL_RANGES;
  }

  return ranges[vitalName] || null;
}

/**
 * Check vital sign against age-appropriate range, classify as normal/warning/critical.
 */
export function classifyVitalStatus(
  vitalName: string,
  value: number,
  ageYears: number
): 'normal' | 'warning' | 'critical' {
  const range = getVitalRangeForAge(vitalName, ageYears);
  if (!range) return 'normal';

  if (value < range.criticalLow! || value > range.criticalHigh!) {
    return 'critical';
  }
  if (value < range.min || value > range.max) {
    return 'warning';
  }
  return 'normal';
}

// ─── Allergy & Contraindication Checks ────────────────────────────────────────

/**
 * Common drug-allergy incompatibilities (simplified).
 */
const ALLERGY_CONTRAINDICATIONS: Record<string, string[]> = {
  'penicillin allergy': ['amoxicillin', 'ampicillin', 'piperacillin'],
  'sulfa allergy': ['sulfamethoxazole', 'sulfadiazine'],
  'nsaid allergy': ['ibuprofen', 'naproxen', 'indomethacin'],
};

/**
 * Check for drug-allergy conflict.
 */
export function checkDrugAllergyConflict(
  drugName: string,
  allergyList: string[]
): { safe: boolean; conflictingAllergy?: string } {
  const normalizedDrug = drugName.toLowerCase();
  for (const allergy of allergyList) {
    const conflictingDrugs = ALLERGY_CONTRAINDICATIONS[allergy.toLowerCase()] || [];
    if (conflictingDrugs.some((d) => normalizedDrug.includes(d))) {
      return { safe: false, conflictingAllergy: allergy };
    }
  }
  return { safe: true };
}

// ─── Clinical Invariant Guards ───────────────────────────────────────────────

/**
 * Fail-fast clinical invariant checks.
 */
export function validateClinicalInvariants(patient: {
  ageYears?: number;
  gender?: string;
  isPregnant?: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (patient.ageYears !== undefined) {
    if (patient.ageYears < 0) errors.push('Patient age cannot be negative');
    if (patient.ageYears > 150) errors.push('Patient age unusually high; verify DOB');
  }

  if (patient.isPregnant && patient.gender === 'M') {
    errors.push('Pregnancy flag set for male patient');
  }

  return { valid: errors.length === 0, errors };
}
