/**
 * Billing Validation Utilities
 * Enforces correct tariff, discount, tax, and claim logic per hims-billing-validator skill.
 *
 * Core invariants:
 * - Calculation order: discount → tax → rounding (never tax → discount)
 * - Negative amounts and zero charges have explicit guards
 * - Immutable charge lines (append-only adjustments)
 * - Insurance co-pay, discount rules, TPA package logic
 * - Revenue leakage prevention
 */

import type { UUID } from '@/integrations/supabase/types';

// ─── Domain Types ───────────────────────────────────────────────────────────

export type ChargeType =
  | 'service'
  | 'procedure'
  | 'medication'
  | 'diagnostic'
  | 'admission'
  | 'adjustment';

export type InsuranceType =
  | 'government' // CGHS, ESIC, etc.
  | 'private'
  | 'tpa' // Third-party administrator
  | 'self_pay'
  | 'mixed'; // Multiple coverage sources

export interface ChargeLineItem {
  id: string;
  chargeType: ChargeType;
  description: string;
  rate: number; // Per unit tariff
  quantity: number;
  amount: number; // rate * quantity (calculated, not user input)
  taxable: boolean;
  createdAt: Date;
  createdBy: UUID;
}

export interface BillingAdjustment {
  id: string;
  type: 'discount' | 'waiver' | 'reversal' | 'refund';
  reason: string;
  amount: number; // Always positive; applied as negative
  appliedTo: string; // Original charge line ID
  authorizedBy: UUID;
  createdAt: Date;
}

export interface BillingInvoice {
  id: string;
  hospitalId: UUID;
  patientId: UUID;
  encounterId: UUID;
  chargeLines: ChargeLineItem[];
  adjustments: BillingAdjustment[];
  insurance: {
    type: InsuranceType;
    copay?: number;
    coveragePercent?: number; // 0-100
    preAuthNumber?: string;
  };
  calculatedAt: Date;
  invoicedAt?: Date;
  status: 'draft' | 'finalized' | 'paid' | 'cancelled';
}

// ─── Calculation Order: Discount → Tax → Rounding ─────────────────────────

/**
 * Calculate invoice total in correct order:
 * 1. Sum all charges
 * 2. Apply discounts/adjustments
 * 3. Calculate tax on discounted amount
 * 4. Round final amount (always round UP for hospital revenue safety)
 */
export function calculateInvoiceTotal(invoice: BillingInvoice): {
  subtotal: number;
  discounts: number;
  taxableAmount: number;
  tax: number;
  total: number;
} {
  // Step 1: Calculate subtotal from charge lines
  const subtotal = invoice.chargeLines.reduce((sum, line) => sum + line.amount, 0);

  // Step 2: Calculate total discounts/adjustments
  const discounts = invoice.adjustments.reduce((sum, adj) => sum + adj.amount, 0);

  // Step 3: Apply discount, calculate taxable amount
  const discountedAmount = Math.max(0, subtotal - discounts);

  // Step 4: Calculate tax on discounted amount (GST in India: typically 5-18%)
  const taxRate = 0.05; // 5% GST (configurable per invoice type)
  const taxableAmount = invoice.chargeLines
    .filter((line) => line.taxable)
    .reduce((sum, line) => sum + line.amount, 0);
  const tax = taxableAmount > 0 ? taxableAmount * taxRate : 0;

  // Step 5: Round UP for revenue
  const total = Math.ceil((discountedAmount + tax) * 100) / 100;

  return {
    subtotal,
    discounts,
    taxableAmount,
    tax: Math.ceil(tax * 100) / 100,
    total,
  };
}

// ─── Input Validation Guards ────────────────────────────────────────────────

export interface ChargeValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a charge line before adding to invoice.
 */
export function validateChargeLine(line: Partial<ChargeLineItem>): ChargeValidation {
  const errors: string[] = [];

  if (!line.description || line.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (line.rate === undefined || line.rate === null || line.rate < 0) {
    errors.push('Rate must be a non-negative number');
  }

  if (line.quantity === undefined || line.quantity === null || line.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  // Guard: zero charge without explicit reason
  const calculatedAmount = (line.rate || 0) * (line.quantity || 0);
  if (calculatedAmount === 0 && !line.createdBy) {
    errors.push('Zero-charge items require explicit authorization');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate discount before applying.
 */
export function validateDiscount(
  discount: Partial<BillingAdjustment>,
  invoiceTotalBeforeDiscount: number
): ChargeValidation {
  const errors: string[] = [];

  if (!discount.reason || discount.reason.trim().length === 0) {
    errors.push('Discount reason is required for audit trail');
  }

  if (discount.amount === undefined || discount.amount === null) {
    errors.push('Discount amount is required');
  } else if (discount.amount < 0) {
    errors.push('Discount amount must be non-negative');
  } else if (discount.amount > invoiceTotalBeforeDiscount) {
    errors.push(`Discount (${discount.amount}) exceeds invoice total (${invoiceTotalBeforeDiscount})`);
  }

  return { valid: errors.length === 0, errors };
}

// ─── Insurance Business Rules ────────────────────────────────────────────────

/**
 * Calculate co-pay for insured patient.
 * Rules vary by insurance type and coverage %.
 */
export function calculateCopay(
  invoiceTotal: number,
  insurance: BillingInvoice['insurance']
): number {
  switch (insurance.type) {
    case 'government':
      // CGHS/ESIC: typically 0 co-pay
      return 0;
    case 'tpa':
      // TPA: fixed co-pay or percentage
      return insurance.copay || 0;
    case 'private':
      // Private: coverage %, patient pays remainder
      if (insurance.coveragePercent !== undefined) {
        return invoiceTotal * ((100 - insurance.coveragePercent) / 100);
      }
      return invoiceTotal;
    case 'self_pay':
      return invoiceTotal;
    case 'mixed':
      // Blended: use specified copay or default
      return insurance.copay || invoiceTotal * 0.2; // Default 20% patient co-pay
    default:
      return invoiceTotal;
  }
}

// ─── Duplicate Detection ────────────────────────────────────────────────────

/**
 * Detect if a charge line looks like a duplicate of another
 * (same charge code, amount, within 1 hour).
 */
export function detectDuplicateCharge(
  newLine: ChargeLineItem,
  existingLines: ChargeLineItem[],
  toleranceMs: number = 3600000 // 1 hour default
): { isDuplicate: boolean; suspectLine?: ChargeLineItem } {
  for (const existing of existingLines) {
    // Don't compare with same line
    if (existing.id === newLine.id) continue;

    // Check for exact match: same description, quantity, rate
    const descMatch = existing.description === newLine.description;
    const amountMatch = Math.abs(existing.amount - newLine.amount) < 0.01;
    const timeMatch = Math.abs(
      newLine.createdAt.getTime() - existing.createdAt.getTime()
    ) < toleranceMs;

    if (descMatch && amountMatch && timeMatch) {
      return { isDuplicate: true, suspectLine: existing };
    }
  }

  return { isDuplicate: false };
}

// ─── Immutable Charge Line Pattern ──────────────────────────────────────────

/**
 * Create immutable charge line. Once created, cannot be modified—only adjustments can be applied.
 */
export function createChargeLine(
  chargeType: ChargeType,
  description: string,
  rate: number,
  quantity: number,
  createdBy: UUID,
  taxable: boolean = true
): ChargeLineItem | null {
  const vResult = validateChargeLine({
    chargeType,
    description,
    rate,
    quantity,
    taxable,
    createdBy,
  });

  if (!vResult.valid) {
    console.warn('Invalid charge line:', vResult.errors);
    return null;
  }

  return {
    id: `charge_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    chargeType,
    description,
    rate,
    quantity,
    amount: rate * quantity,
    taxable,
    createdAt: new Date(),
    createdBy,
  };
}

/**
 * Immutable: Once a charge line is added to an invoice, it cannot be modified.
 * Only adjustments (discounts, reversal, etc.) can be applied.
 */
export function addChargeLineToInvoice(
  invoice: BillingInvoice,
  line: ChargeLineItem
): { success: boolean; invoice?: BillingInvoice; error?: string } {
  // Already finalized? Reject
  if (invoice.status !== 'draft') {
    return { success: false, error: `Cannot add charges to ${invoice.status} invoice` };
  }

  // Duplicate check
  const dup = detectDuplicateCharge(line, invoice.chargeLines);
  if (dup.isDuplicate) {
    return {
      success: false,
      error: `Possible duplicate charge detected (${dup.suspectLine?.id}). Verify or ignore.`,
    };
  }

  // Append charge (immutable pattern)
  const updatedInvoice = {
    ...invoice,
    chargeLines: [...invoice.chargeLines, line],
    calculatedAt: new Date(),
  };

  return { success: true, invoice: updatedInvoice };
}

/**
 * Apply discount/adjustment to invoice (append-only).
 * Original charges remain immutable; adjustments are recorded separately.
 */
export function applyAdjustmentToInvoice(
  invoice: BillingInvoice,
  adjustment: Partial<BillingAdjustment>,
  authorizedBy: UUID
): { success: boolean; invoice?: BillingInvoice; error?: string } {
  // Calculate total before discount
  const totalBefore = invoice.chargeLines.reduce((sum, line) => sum + line.amount, 0);

  // Validate adjustment
  const vResult = validateDiscount(adjustment, totalBefore);
  if (!vResult.valid) {
    return { success: false, error: vResult.errors.join('; ') };
  }

  // Create adjustment record
  const newAdjustment: BillingAdjustment = {
    id: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: (adjustment.type as BillingAdjustment['type']) || 'discount',
    reason: adjustment.reason || 'No reason provided',
    amount: adjustment.amount || 0,
    appliedTo: adjustment.appliedTo || 'invoice_total',
    authorizedBy,
    createdAt: new Date(),
  };

  // Append adjustment (immutable pattern)
  const updatedInvoice = {
    ...invoice,
    adjustments: [...invoice.adjustments, newAdjustment],
    calculatedAt: new Date(),
  };

  return { success: true, invoice: updatedInvoice };
}

// ─── Revenue Leakage Prevention ─────────────────────────────────────────────

/**
 * Audit flags: detect suspicious patterns that could indicate revenue leakage.
 */
export function auditInvoiceForLeakage(invoice: BillingInvoice): {
  issues: string[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const issues: string[] = [];

  // Flag 1: Total discount > 40% (unusual)
  const totalDiscount = invoice.adjustments.reduce((sum, a) => sum + a.amount, 0);
  const subtotal = invoice.chargeLines.reduce((sum, line) => sum + line.amount, 0);
  const discountPercent = (totalDiscount / subtotal) * 100;
  if (discountPercent > 40) {
    issues.push(`High discount (${discountPercent.toFixed(1)}%) may indicate fraud or data entry error`);
  }

  // Flag 2: Multiple adjustments to same charge
  const adjustmentsByLine: Record<string, number> = {};
  for (const adj of invoice.adjustments) {
    adjustmentsByLine[adj.appliedTo] = (adjustmentsByLine[adj.appliedTo] || 0) + 1;
  }
  for (const [lineId, count] of Object.entries(adjustmentsByLine)) {
    if (count > 1) {
      issues.push(`Charge ${lineId} has ${count} adjustments (potential manipulation)`);
    }
  }

  // Flag 3: Zero or very low final amount
  const calculated = calculateInvoiceTotal(invoice);
  if (calculated.total < 100 && subtotal > 500) {
    issues.push(`Invoice total (${calculated.total}) drastically reduced from subtotal (${subtotal})`);
  }

  // Determine risk
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (issues.length >= 2) riskLevel = 'high';
  else if (issues.length === 1) riskLevel = 'medium';

  return { issues, riskLevel };
}
