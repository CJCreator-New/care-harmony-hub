/**
 * useClinicalValidation Hook
 * Wraps clinical validation utilities for real-time form validation in React components.
 * 
 * Usage in VitalSignsForm, MedicationForm, etc.:
 *   const { validateVitals, validateDosage } = useClinicalValidation(patientAgeYears);
 *   const result = validateVitals('heart_rate', value);
 *   if (!result.valid) toast.error(result.warning);
 */

import { useState, useCallback } from 'react';
import {
  classifyVitalStatus,
  validateDosageForAge,
  validateDrugRoute,
  checkDrugAllergyConflict,
  checkPregnancyContraindication,
  validateICD10Code,
  checkDrugAllergyConflict as checkAllergy,
} from '@/utils/clinicalValidation';
import type { Route } from '@/utils/clinicalValidation';

interface ValidationResult {
  valid: boolean;
  status?: 'normal' | 'warning' | 'critical';
  warning?: string;
  requiresReview?: boolean;
}

interface ClinicalValidationOptions {
  ageYears?: number;
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  allergies?: string[];
}

/**
 * Hook for clinical validation in form components.
 * Memoizes validation functions for performance.
 */
export function useClinicalValidation(options: ClinicalValidationOptions = {}) {
  const [recentWarnings, setRecentWarnings] = useState<Map<string, string>>(new Map());

  // ─── Vital Signs Validation ──────────────────────────────────────────────────

  const validateVital = useCallback(
    (vitalName: string, value: number): ValidationResult => {
      if (options.ageYears === undefined) {
        return { valid: true };
      }

      const status = classifyVitalStatus(vitalName, value, options.ageYears);
      const result: ValidationResult = { valid: true, status };

      if (status === 'critical') {
        result.requiresReview = true;
        result.warning = `⚠️ CRITICAL: ${vitalName} = ${value} outside safe range for age ${options.ageYears}y. Verify immediately.`;
      } else if (status === 'warning') {
        result.warning = `${vitalName} = ${value} outside normal range for age ${options.ageYears}y.`;
      }

      return result;
    },
    [options.ageYears]
  );

  // ─── Dosage Validation ────────────────────────────────────────────────────────

  const validateDosage = useCallback(
    (dosageMg: number, drugName: string): ValidationResult => {
      if (options.ageYears === undefined) {
        return { valid: true };
      }

      const result = validateDosageForAge(dosageMg, options.ageYears, drugName);
      return {
        valid: result.valid,
        warning: result.warning,
        requiresReview: !result.valid,
      };
    },
    [options.ageYears]
  );

  // ─── Drug-Route Validation ───────────────────────────────────────────────────

  const validateRoute = useCallback(
    (drugName: string, route: Route): ValidationResult => {
      const result = validateDrugRoute(drugName, route);
      return {
        valid: result.valid,
        warning: result.warning,
        requiresReview: !result.valid,
      };
    },
    []
  );

  // ─── Pregnancy & Breastfeeding Validation ───────────────────────────────────

  const validatePregnancySafety = useCallback(
    (drugName: string): ValidationResult => {
      const result = checkPregnancyContraindication(
        drugName,
        options.isPregnant || false,
        options.isBreastfeeding || false
      );

      if (!result.safe) {
        return {
          valid: false,
          warning: result.recommendation,
          requiresReview: true,
        };
      }

      if (result.category === 'C') {
        return {
          valid: true,
          warning: result.recommendation,
          requiresReview: false,
        };
      }

      return { valid: true };
    },
    [options.isPregnant, options.isBreastfeeding]
  );

  // ─── Allergy Validation ──────────────────────────────────────────────────────

  const validateAllergy = useCallback(
    (drugName: string): ValidationResult => {
      if (!options.allergies || options.allergies.length === 0) {
        return { valid: true };
      }

      const result = checkAllergy(drugName, options.allergies);
      if (!result.safe) {
        return {
          valid: false,
          warning: `⚠️ ALLERGY ALERT: ${drugName} conflicts with documented allergy: ${result.conflictingAllergy}`,
          requiresReview: true,
        };
      }

      return { valid: true };
    },
    [options.allergies]
  );

  // ─── ICD-10 Code Validation ──────────────────────────────────────────────────

  const validateDiagnosisCode = useCallback((icd10Code: string): ValidationResult => {
    const result = validateICD10Code(icd10Code);
    return {
      valid: result.valid,
      warning: result.message,
    };
  }, []);

  // ─── Composite Multi-field Validation ────────────────────────────────────────

  const validatePrescription = useCallback(
    (prescription: {
      drugName: string;
      dosageMg: number;
      route: Route;
    }): ValidationResult => {
      // Run all checks, aggregate warnings
      const checks = [
        validateDosage(prescription.dosageMg, prescription.drugName),
        validateRoute(prescription.drugName, prescription.route),
        validatePregnancySafety(prescription.drugName),
        validateAllergy(prescription.drugName),
      ];

      const failures = checks.filter((c) => !c.valid);
      const warnings = checks
        .filter((c) => c.warning)
        .map((c) => c.warning)
        .join('\n');

      const allRequireReview = checks.some((c) => c.requiresReview);

      return {
        valid: failures.length === 0,
        warning: warnings || undefined,
        requiresReview: allRequireReview || failures.length > 0,
      };
    },
    [validateDosage, validateRoute, validatePregnancySafety, validateAllergy]
  );

  return {
    validateVital,
    validateDosage,
    validateRoute,
    validatePregnancySafety,
    validateAllergy,
    validateDiagnosisCode,
    validatePrescription,
    // Utility: track recent warnings for toast/UI dedupe
    recentWarnings,
    addWarning: (key: string, msg: string) => {
      setRecentWarnings((prev) => new Map(prev).set(key, msg));
    },
  };
}
