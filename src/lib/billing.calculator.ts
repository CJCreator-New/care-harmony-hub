/**
 * Insurance Billing Calculation Engine
 * Handles copay, deductible, coinsurance, out-of-pocket calculations
 */

export interface InsurancePlan {
  id: string;
  plan_name: string;
  copay_type: "fixed" | "percentage" | "tiered";
  copay_amount: number;
  annual_deductible: number;
  coinsurance_percentage: number;
  out_of_pocket_max: number;
}

export interface BillingCalculation {
  service_charge: number;
  copay_amount: number;
  deductible_applied: number;
  coinsurance_amount: number;
  insurance_payment: number;
  patient_responsibility: number;
  out_of_pocket_applied: number;
  remaining_deductible: number;
  remaining_out_of_pocket: number;
}

/**
 * Calculate copay for a service
 */
export function calculateCopay(
  serviceCharge: number,
  plan: InsurancePlan
): number {
  switch (plan.copay_type) {
    case "fixed":
      return Math.min(plan.copay_amount, serviceCharge);

    case "percentage":
      return Math.round((serviceCharge * plan.copay_amount) / 100 * 100) / 100;

    case "tiered":
      // Tiered copay based on service charge
      if (serviceCharge < 100) return 20;
      if (serviceCharge < 500) return 35;
      if (serviceCharge < 1000) return 50;
      return Math.min(75, Math.round((serviceCharge * 0.1) * 100) / 100);

    default:
      return 0;
  }
}

/**
 * Apply deductible to patient responsibility
 */
function applyDeductible(
  amount: number,
  deductibleMet: number,
  annualDeductible: number
): { deductibleApplied: number; remainingAmount: number; remainingDeductible: number } {
  const remainingDeductible = annualDeductible - deductibleMet;
  const deductibleApplied = Math.min(amount, remainingDeductible);
  const remainingAmount = amount - deductibleApplied;

  return {
    deductibleApplied,
    remainingAmount,
    remainingDeductible: remainingDeductible - deductibleApplied,
  };
}

/**
 * Calculate coinsurance (patient's percentage after deductible)
 */
function calculateCoinsurance(
  amount: number,
  coinsurancePercentage: number
): number {
  return Math.round((amount * coinsurancePercentage) / 100 * 100) / 100;
}

/**
 * Apply out-of-pocket maximum
 */
function applyOutOfPocketMax(
  patientResponsibility: number,
  outOfPocketMet: number,
  outOfPocketMax: number
): { patientPays: number; insuranceCoverage: number; remainingOOP: number } {
  const remainingOOP = outOfPocketMax - outOfPocketMet;
  const patientPays = Math.min(patientResponsibility, remainingOOP);
  const insuranceCoverage = patientResponsibility - patientPays;

  return {
    patientPays,
    insuranceCoverage,
    remainingOOP: remainingOOP - patientPays,
  };
}

/**
 * Complete billing calculation
 */
export function calculatePatientCost(
  serviceCharge: number,
  plan: InsurancePlan,
  deductibleMet: number = 0,
  outOfPocketMet: number = 0
): BillingCalculation {
  // Step 1: Apply deductible
  const deductibleCalc = applyDeductible(
    serviceCharge,
    deductibleMet,
    plan.annual_deductible
  );

  // Step 2: Calculate copay (before deductible)
  const copayAmount = calculateCopay(serviceCharge, plan);

  // Step 3: Calculate coinsurance on amount after deductible
  const coinsuranceAmount = calculateCoinsurance(
    deductibleCalc.remainingAmount,
    plan.coinsurance_percentage
  );

  // Step 4: Calculate insurance payment
  const insurancePayment =
    serviceCharge - deductibleCalc.deductibleApplied - coinsuranceAmount;

  // Step 5: Initial patient responsibility
  let initialPatientResp =
    deductibleCalc.deductibleApplied + coinsuranceAmount + copayAmount;

  // Step 6: Apply out-of-pocket maximum
  const oopCalc = applyOutOfPocketMax(
    initialPatientResp,
    outOfPocketMet,
    plan.out_of_pocket_max
  );

  return {
    service_charge: serviceCharge,
    copay_amount: copayAmount,
    deductible_applied: deductibleCalc.deductibleApplied,
    coinsurance_amount: coinsuranceAmount,
    insurance_payment: insurancePayment + oopCalc.insuranceCoverage,
    patient_responsibility: oopCalc.patientPays,
    out_of_pocket_applied: oopCalc.patientPays,
    remaining_deductible: deductibleCalc.remainingDeductible,
    remaining_out_of_pocket: oopCalc.remainingOOP,
  };
}

/**
 * Calculate for multi-plan scenario (primary + secondary)
 */
export function calculateMultiPlanCost(
  serviceCharge: number,
  primaryPlan: InsurancePlan,
  secondaryPlan: InsurancePlan | null,
  primaryDeductibleMet: number = 0,
  secondaryDeductibleMet: number = 0
): { primary: BillingCalculation; secondary: BillingCalculation | null; total: BillingCalculation } {
  // Calculate primary
  const primary = calculatePatientCost(
    serviceCharge,
    primaryPlan,
    primaryDeductibleMet,
    0
  );

  let secondary: BillingCalculation | null = null;

  // Calculate secondary if provided
  if (secondaryPlan) {
    // Secondary pays on what primary didn't cover (typically)
    const secondaryResponsibility =
      serviceCharge - primary.insurance_payment;
    secondary = calculatePatientCost(
      secondaryResponsibility,
      secondaryPlan,
      secondaryDeductibleMet,
      0
    );
  }

  // Calculate totals
  const totalInsurancePayment =
    primary.insurance_payment + (secondary?.insurance_payment || 0);

  return {
    primary,
    secondary,
    total: {
      service_charge: serviceCharge,
      copay_amount: primary.copay_amount + (secondary?.copay_amount || 0),
      deductible_applied:
        primary.deductible_applied + (secondary?.deductible_applied || 0),
      coinsurance_amount:
        primary.coinsurance_amount + (secondary?.coinsurance_amount || 0),
      insurance_payment: totalInsurancePayment,
      patient_responsibility:
        serviceCharge - totalInsurancePayment,
      out_of_pocket_applied: primary.out_of_pocket_applied,
      remaining_deductible: primary.remaining_deductible,
      remaining_out_of_pocket: primary.remaining_out_of_pocket,
    },
  };
}

/**
 * Estimate annual out-of-pocket costs
 */
export function estimateAnnualCosts(
  estimatedAnnualCharges: number,
  plan: InsurancePlan,
  averageVisitCost: number = 150
): {
  worstCaseOOP: number;
  averageCopay: number;
  estimatedYearlyPatientCost: number;
} {
  const estimatedVisits = Math.ceil(
    estimatedAnnualCharges / averageVisitCost
  );
  const averageCopay = calculateCopay(averageVisitCost, plan);

  // Worst case: patient hits deductible + out-of-pocket max
  const worstCaseOOP = Math.min(
    plan.annual_deductible + plan.out_of_pocket_max,
    estimatedAnnualCharges
  );

  // Average scenario
  const estimatedCopays = averageCopay * estimatedVisits;
  const estimatedDeductible = Math.min(
    plan.annual_deductible,
    estimatedAnnualCharges
  );
  const estimatedYearlyPatientCost = Math.min(
    estimatedCopays + estimatedDeductible,
    plan.out_of_pocket_max
  );

  return {
    worstCaseOOP,
    averageCopay,
    estimatedYearlyPatientCost,
  };
}

/**
 * Cache billing calculation for performance
 */
export class BillingCalculationCache {
  private cache: Map<string, { calculation: BillingCalculation; expires: number }> = new Map();
  private ttlSeconds: number = 3600; // 1 hour

  set(key: string, calculation: BillingCalculation): void {
    this.cache.set(key, {
      calculation,
      expires: Date.now() + this.ttlSeconds * 1000,
    });
  }

  get(key: string): BillingCalculation | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }

    return entry.calculation;
  }

  clear(): void {
    this.cache.clear();
  }

  generateKey(
    serviceCharge: number,
    planId: string,
    deductibleMet: number
  ): string {
    return `${planId}-${serviceCharge}-${deductibleMet}`;
  }
}

export default {
  calculateCopay,
  calculatePatientCost,
  calculateMultiPlanCost,
  estimateAnnualCosts,
  BillingCalculationCache,
};
