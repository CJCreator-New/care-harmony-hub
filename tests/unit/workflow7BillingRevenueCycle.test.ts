import { describe, it, expect } from 'vitest';
import {
  resolveTariffRate,
  STANDARD_HOSPITAL_TARIFF,
  isValidIcd10Code,
  isPreAuthRequired,
  isValidPreAuthNumber,
  calculateSplitPaymentSummary,
  evaluatePaymentPlanDelinquency,
  validateInvoiceAdjustment,
  SplitTenderItem,
} from '@/lib/clinical/billingCycleRules';

describe('Workflow 7: Billing & Revenue Cycle Governance', () => {
  describe('Decision A1: Clinical Tariffs & Charge Capture Mapping', () => {
    it('should resolve exact tariff rates for standard laboratory panels', () => {
      const cbc = resolveTariffRate('LAB-CBC', 'lab');
      expect(cbc.unitPrice).toBe(350);
      expect(cbc.category).toBe('lab');

      const cardiac = resolveTariffRate('LAB-CARD', 'lab');
      expect(cardiac.unitPrice).toBe(1200);

      const lft = resolveTariffRate('Liver Function Test (LFT)', 'lab');
      expect(lft.unitPrice).toBe(600);
    });

    it('should resolve standard medication pricing from pharmacy catalog', () => {
      const amox = resolveTariffRate('Amoxicillin-Clavulanate 625mg', 'medication');
      expect(amox.unitPrice).toBe(140);

      const para = resolveTariffRate('Paracetamol 650mg', 'medication');
      expect(para.unitPrice).toBe(30);

      const ns = resolveTariffRate('Normal Saline 0.9% 500ml IV', 'medication');
      expect(ns.unitPrice).toBe(120);
    });

    it('should resolve inpatient bed daily rates according to ward type', () => {
      const genBed = resolveTariffRate('General Ward Bed (Per Day)', 'bed');
      expect(genBed.unitPrice).toBe(1500);

      const icuBed = resolveTariffRate('Intensive Care Unit (ICU) Bed (Per Day)', 'bed');
      expect(icuBed.unitPrice).toBe(8000);
    });

    it('should provide reasonable category fallback tariff for unlisted services', () => {
      const customLab = resolveTariffRate('Special Specialized Genetic Panel', 'lab');
      expect(customLab.unitPrice).toBe(400); // Default lab rate

      const customProcedure = resolveTariffRate('Minor Wound Suture', 'procedure');
      expect(customProcedure.unitPrice).toBe(1500); // Default procedure rate
    });
  });

  describe('Decision A2: Insurance Claims, ICD-10 & Pre-Authorization Validation', () => {
    it('should validate valid ICD-10 diagnosis codes', () => {
      expect(isValidIcd10Code('I10')).toBe(true);
      expect(isValidIcd10Code('E11.9')).toBe(true);
      expect(isValidIcd10Code('J18.9')).toBe(true);
      expect(isValidIcd10Code('S82.90XA')).toBe(true);
      expect(isValidIcd10Code('k21.9')).toBe(true); // case-insensitive
    });

    it('should reject invalid ICD-10 syntax', () => {
      expect(isValidIcd10Code('')).toBe(false);
      expect(isValidIcd10Code('123')).toBe(false);
      expect(isValidIcd10Code('DIABETES')).toBe(false);
      expect(isValidIcd10Code('E11.999999')).toBe(false);
    });

    it('should enforce Pre-Authorization for claims >= ₹25,000', () => {
      expect(isPreAuthRequired('Star Health', 25000)).toBe(true);
      expect(isPreAuthRequired('HDFC ERGO', 50000)).toBe(true);
      expect(isPreAuthRequired('Star Health', 15000)).toBe(false);
    });

    it('should enforce Pre-Authorization for Government Schemes (PMJAY / CGHS / ESIC) regardless of amount', () => {
      expect(isPreAuthRequired('PMJAY (Ayushman Bharat)', 5000)).toBe(true);
      expect(isPreAuthRequired('CGHS / Central Govt Health Scheme', 8000)).toBe(true);
      expect(isPreAuthRequired('ESIC', 3500)).toBe(true);
    });

    it('should validate pre-authorization code format', () => {
      expect(isValidPreAuthNumber('PA-992140')).toBe(true);
      expect(isValidPreAuthNumber('AUTH12345')).toBe(true);
      expect(isValidPreAuthNumber('PA-1')).toBe(false); // too short
      expect(isValidPreAuthNumber('')).toBe(false);
      expect(isValidPreAuthNumber(null)).toBe(false);
    });
  });

  describe('Decision A3: Multi-Tender Split Payment & Change Calculation', () => {
    it('should settle exact balance with single tender', () => {
      const tenders: SplitTenderItem[] = [{ id: '1', method: 'cash', amount: 5000 }];
      const summary = calculateSplitPaymentSummary(5000, tenders);

      expect(summary.totalTendered).toBe(5000);
      expect(summary.remainingBalance).toBe(0);
      expect(summary.changeDue).toBe(0);
      expect(summary.isFullySettled).toBe(true);
      expect(summary.hasErrors).toBe(false);
    });

    it('should calculate split payment across Card and Cash', () => {
      const tenders: SplitTenderItem[] = [
        { id: '1', method: 'card', amount: 6000, referenceNumber: 'TXN-98124' },
        { id: '2', method: 'cash', amount: 4000 },
      ];
      const summary = calculateSplitPaymentSummary(10000, tenders);

      expect(summary.totalTendered).toBe(10000);
      expect(summary.remainingBalance).toBe(0);
      expect(summary.changeDue).toBe(0);
      expect(summary.isFullySettled).toBe(true);
      expect(summary.hasErrors).toBe(false);
    });

    it('should compute cash change due when cash tendered exceeds balance', () => {
      const tenders: SplitTenderItem[] = [{ id: '1', method: 'cash', amount: 2000 }];
      const summary = calculateSplitPaymentSummary(1850, tenders);

      expect(summary.totalTendered).toBe(2000);
      expect(summary.remainingBalance).toBe(0);
      expect(summary.changeDue).toBe(150);
      expect(summary.isFullySettled).toBe(true);
    });

    it('should flag error when electronic tender lacks reference number', () => {
      const tenders: SplitTenderItem[] = [
        { id: '1', method: 'card', amount: 5000, referenceNumber: '' },
      ];
      const summary = calculateSplitPaymentSummary(5000, tenders);

      expect(summary.hasErrors).toBe(true);
      expect(summary.errorMessage).toContain('Reference/Transaction ID is required');
    });

    it('should reject electronic tender amount exceeding invoice balance', () => {
      const tenders: SplitTenderItem[] = [
        { id: '1', method: 'card', amount: 8000, referenceNumber: 'POS-001' },
      ];
      const summary = calculateSplitPaymentSummary(5000, tenders);

      expect(summary.hasErrors).toBe(true);
      expect(summary.errorMessage).toContain('Electronic tenders');
    });
  });

  describe('Decision A4: Payment Plans & 14-Day Delinquency Grace Period', () => {
    it('should mark completed plans correctly', () => {
      const result = evaluatePaymentPlanDelinquency({
        status: 'completed',
        remaining_balance: 0,
      });
      expect(result.status).toBe('completed');
      expect(result.badgeVariant).toBe('secondary');
      expect(result.isDelinquent).toBe(false);
    });

    it('should mark plan as active when due date is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const result = evaluatePaymentPlanDelinquency({
        status: 'active',
        next_due_date: futureDate.toISOString(),
        remaining_balance: 4000,
      });
      expect(result.status).toBe('active');
      expect(result.badgeVariant).toBe('default');
      expect(result.isDelinquent).toBe(false);
    });

    it('should assign grace period when overdue by <= 14 days', () => {
      const referenceDate = new Date('2026-09-20');
      const overdueDate = new Date('2026-09-15'); // 5 days overdue

      const result = evaluatePaymentPlanDelinquency(
        {
          status: 'active',
          next_due_date: overdueDate.toISOString(),
          remaining_balance: 2500,
        },
        referenceDate
      );

      expect(result.status).toBe('grace_period');
      expect(result.daysOverdue).toBe(5);
      expect(result.badgeVariant).toBe('secondary');
      expect(result.isDelinquent).toBe(false);
      expect(result.label).toContain('In Grace Period');
    });

    it('should flag default when overdue exceeds 14-day grace period', () => {
      const referenceDate = new Date('2026-09-30');
      const overdueDate = new Date('2026-09-10'); // 20 days overdue

      const result = evaluatePaymentPlanDelinquency(
        {
          status: 'active',
          next_due_date: overdueDate.toISOString(),
          remaining_balance: 5000,
        },
        referenceDate
      );

      expect(result.status).toBe('defaulted');
      expect(result.daysOverdue).toBe(20);
      expect(result.badgeVariant).toBe('destructive');
      expect(result.isDelinquent).toBe(true);
      expect(result.label).toContain('Defaulted');
    });
  });

  describe('Decision A5: Invoice Adjustments, Discounts & Refunds', () => {
    const mockInvoice = {
      total: 10000,
      paid_amount: 4000,
      status: 'partial',
    };

    it('should approve valid dispute waiver within balance', () => {
      const result = validateInvoiceAdjustment(mockInvoice, {
        type: 'dispute_waiver',
        amount: 2000,
        reason: 'Duplicate laboratory panel cancelled by attending physician',
        managerAuthorized: false,
      });

      expect(result.valid).toBe(true);
      expect(result.newTotal).toBe(8000);
      expect(result.newBalance).toBe(4000);
    });

    it('should reject dispute waiver exceeding remaining balance', () => {
      const result = validateInvoiceAdjustment(mockInvoice, {
        type: 'dispute_waiver',
        amount: 7000, // remaining balance is 6000
        reason: 'Patient disputed diagnostic charges',
        managerAuthorized: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed the remaining balance');
    });

    it('should reject manager discount without manager authorization', () => {
      const result = validateInvoiceAdjustment(mockInvoice, {
        type: 'manager_discount',
        amount: 1500,
        reason: 'Senior citizen compassionate concession',
        managerAuthorized: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Manager authorization is required');
    });

    it('should cap manager discount at 50% of invoice total', () => {
      const result = validateInvoiceAdjustment(mockInvoice, {
        type: 'manager_discount',
        amount: 6000, // 60% of 10,000
        reason: 'Director special concession',
        managerAuthorized: true,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 50%');
    });

    it('should validate customer refund capped at amount paid', () => {
      const validRefund = validateInvoiceAdjustment(mockInvoice, {
        type: 'refund',
        amount: 1500,
        reason: 'Overpayment refund via original payment tender',
        managerAuthorized: true,
      });
      expect(validRefund.valid).toBe(true);
      expect(validRefund.refundAmount).toBe(1500);

      const excessiveRefund = validateInvoiceAdjustment(mockInvoice, {
        type: 'refund',
        amount: 5000, // paid amount is only 4000
        reason: 'Full advance refund',
        managerAuthorized: true,
      });
      expect(excessiveRefund.valid).toBe(false);
      expect(excessiveRefund.error).toContain('cannot exceed the total amount paid');
    });
  });
});
