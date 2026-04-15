import { describe, it, expect } from "vitest";
import {
  calculateCopay,
  calculatePatientCost,
  calculateMultiPlanCost,
  estimateAnnualCosts,
  BillingCalculationCache,
  InsurancePlan,
} from "@/lib/billing.calculator";

describe("Billing Calculator", () => {
  const mockPlan: InsurancePlan = {
    id: "plan-1",
    plan_name: "Standard PPO",
    copay_type: "fixed",
    copay_amount: 35,
    annual_deductible: 1000,
    coinsurance_percentage: 20,
    out_of_pocket_max: 5000,
  };

  describe("calculateCopay", () => {
    it("should calculate fixed copay", () => {
      const copay = calculateCopay(500, mockPlan);
      expect(copay).toBe(35);
    });

    it("should cap copay at service charge", () => {
      const copay = calculateCopay(20, mockPlan);
      expect(copay).toBeLessThanOrEqual(20);
    });

    it("should calculate percentage copay", () => {
      const percentPlan = { ...mockPlan, copay_type: "percentage" as const, copay_amount: 15 };
      const copay = calculateCopay(1000, percentPlan);
      expect(copay).toBe(150);
    });

    it("should calculate tiered copay", () => {
      const tieredPlan = { ...mockPlan, copay_type: "tiered" as const };
      
      expect(calculateCopay(50, tieredPlan)).toBe(20);
      expect(calculateCopay(200, tieredPlan)).toBe(35);
      expect(calculateCopay(600, tieredPlan)).toBe(50);
      expect(calculateCopay(2000, tieredPlan)).toBe(75);
    });
  });

  describe("calculatePatientCost", () => {
    it("should apply deductible correctly", () => {
      const result = calculatePatientCost(1500, mockPlan, 0, 0);
      expect(result.deductible_applied).toBe(1000);
      expect(result.remaining_deductible).toBe(0);
    });

    it("should calculate coinsurance after deductible", () => {
      const result = calculatePatientCost(1500, mockPlan, 0, 0);
      const coinsuranceExpected = Math.round((500 * 20) / 100 * 100) / 100;
      expect(result.coinsurance_amount).toBe(coinsuranceExpected);
    });

    it("should respect out-of-pocket maximum", () => {
      const result = calculatePatientCost(10000, mockPlan, 0, 0);
      expect(result.patient_responsibility).toBeLessThanOrEqual(5000);
    });

    it("should carry forward deductible met", () => {
      const result = calculatePatientCost(500, mockPlan, 500, 0);
      expect(result.remaining_deductible).toBe(500);
    });

    it("should handle zero service charge", () => {
      const result = calculatePatientCost(0, mockPlan, 0, 0);
      expect(result.patient_responsibility).toBe(0);
      expect(result.insurance_payment).toBe(0);
    });
  });

  describe("calculateMultiPlanCost", () => {
    const secondaryPlan: InsurancePlan = {
      id: "plan-2",
      plan_name: "Secondary PPO",
      copay_type: "fixed",
      copay_amount: 25,
      annual_deductible: 500,
      coinsurance_percentage: 10,
      out_of_pocket_max: 3000,
    };

    it("should calculate primary and secondary", () => {
      const result = calculateMultiPlanCost(1000, mockPlan, secondaryPlan, 0, 0);
      
      expect(result.primary).toBeDefined();
      expect(result.secondary).toBeDefined();
      expect(result.total.insurance_payment).toBeGreaterThanOrEqual(
        result.primary.insurance_payment
      );
    });

    it("should not exceed total service charge", () => {
      const result = calculateMultiPlanCost(1000, mockPlan, secondaryPlan, 0, 0);
      const totalPaid =
        result.total.insurance_payment + result.total.patient_responsibility;
      expect(totalPaid).toBeCloseTo(1000, 1);
    });
  });

  describe("estimateAnnualCosts", () => {
    it("should estimate worst case OOP", () => {
      const estimate = estimateAnnualCosts(10000, mockPlan, 150);
      expect(estimate.worstCaseOOP).toBeLessThanOrEqual(1000 + 5000);
    });

    it("should estimate average copay", () => {
      const estimate = estimateAnnualCosts(10000, mockPlan, 150);
      expect(estimate.averageCopay).toBe(35);
    });

    it("should calculate yearly patient cost", () => {
      const estimate = estimateAnnualCosts(10000, mockPlan, 150);
      expect(estimate.estimatedYearlyPatientCost).toBeGreaterThan(0);
      expect(estimate.estimatedYearlyPatientCost).toBeLessThanOrEqual(5000);
    });
  });

  describe("BillingCalculationCache", () => {
    it("should cache calculations", () => {
      const cache = new BillingCalculationCache();
      const calc = calculatePatientCost(1000, mockPlan, 0, 0);
      const key = cache.generateKey(1000, "plan-1", 0);

      cache.set(key, calc);
      const cached = cache.get(key);

      expect(cached).toEqual(calc);
    });

    it("should expire cached items", (done) => {
      const cache = new BillingCalculationCache();
      const calc = calculatePatientCost(1000, mockPlan, 0, 0);
      const key = cache.generateKey(1000, "plan-1", 0);

      cache.set(key, calc);

      // Wait for expiration (test uses shorter TTL)
      setTimeout(() => {
        const cached = cache.get(key);
        expect(cached).toBeNull();
        done();
      }, 100);
    });

    it("should clear all cache entries", () => {
      const cache = new BillingCalculationCache();
      const calc = calculatePatientCost(1000, mockPlan, 0, 0);

      cache.set("key1", calc);
      cache.set("key2", calc);
      cache.clear();

      expect(cache.get("key1")).toBeNull();
      expect(cache.get("key2")).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very high service charges", () => {
      const result = calculatePatientCost(100000, mockPlan, 50000, 0);
      expect(result.patient_responsibility).toBeLessThanOrEqual(5000);
    });

    it("should handle very low service charges", () => {
      const result = calculatePatientCost(10, mockPlan, 0, 0);
      expect(result.patient_responsibility).toBeGreaterThanOrEqual(0);
    });

    it("should handle deductible already met", () => {
      const result = calculatePatientCost(500, mockPlan, 2000, 0);
      expect(result.deductible_applied).toBe(0);
    });

    it("should handle OOP already met", () => {
      const result = calculatePatientCost(1000, mockPlan, 0, 5000);
      expect(result.out_of_pocket_applied).toBe(0);
    });
  });
});
