/**
 * useBillingValidation Hook
 * Wraps billing validator utilities for real-time form validation in billing pages.
 * 
 * Usage in BillingPage:
 *   const { addCharge, applyDiscount, calculateTotal } = useBillingValidation();
 *   const result = addCharge(line);
 *   if (result.error) toast.error(result.error);
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateInvoiceTotal,
  validateChargeLine,
  validateDiscount,
  detectDuplicateCharge,
  addChargeLineToInvoice,
  applyAdjustmentToInvoice,
  auditInvoiceForLeakage,
  calculateCopay,
  createChargeLine,
} from '@/utils/billingValidator';
import type {
  BillingInvoice,
  ChargeLineItem,
  BillingAdjustment,
  ChargeType,
} from '@/utils/billingValidator';

interface BillingValidationResult {
  success: boolean;
  invoice?: BillingInvoice;
  error?: string;
  warnings?: string[];
}

/**
 * Hook for billing validation and calculation in form components.
 */
export function useBillingValidation(initialInvoice?: BillingInvoice) {
  const { profile } = useAuth();
  const [invoice, setInvoice] = useState<BillingInvoice | null>(
    initialInvoice ||
      null
  );
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // ─── Create Charge Line ──────────────────────────────────────────────────────

  const addCharge = useCallback(
    (chargeType: ChargeType, description: string, rate: number, quantity: number, taxable?: boolean): BillingValidationResult => {
      if (!invoice || !profile) {
        return { success: false, error: 'Invoice or profile not loaded' };
      }

      const line = createChargeLine(chargeType, description, rate, quantity, profile.id, taxable);
      if (!line) {
        return { success: false, error: 'Failed to create charge line' };
      }

      const result = addChargeLineToInvoice(invoice, line);
      if (result.success && result.invoice) {
        setInvoice(result.invoice);
        return { success: true, invoice: result.invoice };
      }

      return { success: false, error: result.error };
    },
    [invoice, profile]
  );

  // ─── Apply Discount/Adjustment ──────────────────────────────────────────────

  const applyDiscount = useCallback(
    (
      type: 'discount' | 'waiver' | 'reversal' | 'refund',
      reason: string,
      amount: number
    ): BillingValidationResult => {
      if (!invoice || !profile) {
        return { success: false, error: 'Invoice or profile not loaded' };
      }

      const adjustment: Partial<BillingAdjustment> = {
        type,
        reason,
        amount,
        appliedTo: 'invoice_total',
      };

      const result = applyAdjustmentToInvoice(invoice, adjustment, profile.id);
      if (result.success && result.invoice) {
        setInvoice(result.invoice);

        // Re-audit for leakage
        const audit = auditInvoiceForLeakage(result.invoice);
        if (audit.issues.length > 0) {
          setValidationWarnings(audit.issues);
        }

        return { success: true, invoice: result.invoice, warnings: audit.issues };
      }

      return { success: false, error: result.error };
    },
    [invoice, profile]
  );

  // ─── Calculate Total ────────────────────────────────────────────────────────

  const calculateTotal = useCallback((): {
    subtotal: number;
    discounts: number;
    tax: number;
    total: number;
    copay: number;
  } | null => {
    if (!invoice) return null;

    const calc = calculateInvoiceTotal(invoice);
    const copay = invoice.insurance ? calculateCopay(calc.total, invoice.insurance) : 0;

    return {
      subtotal: calc.subtotal,
      discounts: calc.discounts,
      tax: calc.tax,
      total: calc.total,
      copay,
    };
  }, [invoice]);

  // ─── Detect Duplicate ───────────────────────────────────────────────────────

  const checkDuplicate = useCallback(
    (line: ChargeLineItem): {
      isDuplicate: boolean;
      suspectLineId?: string;
      warning?: string;
    } => {
      if (!invoice) return { isDuplicate: false };

      const dup = detectDuplicateCharge(line, invoice.chargeLines);
      return {
        isDuplicate: dup.isDuplicate,
        suspectLineId: dup.suspectLine?.id,
        warning: dup.isDuplicate
          ? `Duplicate detected: ${dup.suspectLine?.description} (${dup.suspectLine?.id})`
          : undefined,
      };
    },
    [invoice]
  );

  // ─── Revenue Audit ──────────────────────────────────────────────────────────

  const auditRevenue = useCallback((): {
    riskLevel: 'low' | 'medium' | 'high';
    issues: string[];
  } | null => {
    if (!invoice) return null;

    const audit = auditInvoiceForLeakage(invoice);
    return {
      riskLevel: audit.riskLevel,
      issues: audit.issues,
    };
  }, [invoice]);

  // ─── Undo Last Charge/Adjustment ────────────────────────────────────────────

  const undoLastCharge = useCallback((): BillingValidationResult => {
    if (!invoice || invoice.chargeLines.length === 0) {
      return { success: false, error: 'No charges to undo' };
    }

    const updatedInvoice = {
      ...invoice,
      chargeLines: invoice.chargeLines.slice(0, -1),
      calculatedAt: new Date(),
    };

    setInvoice(updatedInvoice);
    return { success: true, invoice: updatedInvoice };
  }, [invoice]);

  const undoLastAdjustment = useCallback((): BillingValidationResult => {
    if (!invoice || invoice.adjustments.length === 0) {
      return { success: false, error: 'No adjustments to undo' };
    }

    const updatedInvoice = {
      ...invoice,
      adjustments: invoice.adjustments.slice(0, -1),
      calculatedAt: new Date(),
    };

    setInvoice(updatedInvoice);
    return { success: true, invoice: updatedInvoice };
  }, [invoice]);

  // ─── Finalize Invoice ───────────────────────────────────────────────────────

  const finalizeInvoice = useCallback((): BillingValidationResult => {
    if (!invoice) {
      return { success: false, error: 'Invoice not loaded' };
    }

    if (invoice.chargeLines.length === 0) {
      return { success: false, error: 'Cannot finalize invoice with no charges' };
    }

    const audit = auditInvoiceForLeakage(invoice);
    if (audit.riskLevel === 'high') {
      return {
        success: false,
        error: `Cannot finalize: High revenue risk detected. Review audit issues.`,
        warnings: audit.issues,
      };
    }

    const finalizedInvoice = {
      ...invoice,
      status: 'finalized' as const,
      invoicedAt: new Date(),
    };

    setInvoice(finalizedInvoice);
    return { success: true, invoice: finalizedInvoice, warnings: audit.issues };
  }, [invoice]);

  return {
    invoice,
    setInvoice,
    addCharge,
    applyDiscount,
    calculateTotal,
    checkDuplicate,
    auditRevenue,
    undoLastCharge,
    undoLastAdjustment,
    finalizeInvoice,
    validationWarnings,
  };
}
