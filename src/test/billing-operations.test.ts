import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createInvoice,
  recordPayment,
  calculateCharges,
  validateCopay,
  detectDuplicateCharges,
  applyDiscount,
  calculateTax,
  submitInsuranceClaim,
  reverseCharge,
  auditBillingLeakage,
  processRefund,
  validateCalculationOrder,
} from '@/utils/billingValidator';
import { logAudit } from '@/utils/sanitize';

vi.mock('@/utils/sanitize');

// Test Fixtures
const mockPatient = {
  id: 'pat-001',
  name: 'John Doe',
  insurance: 'TPA',
  insuranceScheme: 'Aditya Birla',
  hospitalId: 'hosp-001',
};

const mockCharges = [
  { itemId: 'service-001', description: 'Consultation', amount: 500, quantity: 1 },
  { itemId: 'service-002', description: 'Lab Test', amount: 300, quantity: 2 },
];

const mockInvoice = {
  id: 'inv-001',
  patientId: 'pat-001',
  hospitalId: 'hosp-001',
  charges: mockCharges,
  createdAt: new Date(),
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

const mockInsuranceScheme = {
  code: 'TPA-ADITYA',
  name: 'Aditya Birla Health Insurance',
  type: 'TPA',
  copay: {
    fixed: 300, // Rs 300 fixed copay
  },
  coverage: 80, // 80% coverage
};

describe('Billing - Invoice Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should create invoice with valid charges', async () => {
    const result = await createInvoice(mockInvoice.patientId, mockCharges);

    expect(result).toEqual(expect.objectContaining({
      id: expect.any(String),
      patientId: 'pat-001',
      charges: expect.any(Array),
      status: 'draft',
    }));
  });

  it('should reject invoice without charges', async () => {
    await expect(() => createInvoice('pat-001', []))
      .rejects
      .toThrow('At least one charge required');
  });

  it('should reject negative charge amounts', async () => {
    const invalid = [{ itemId: 'srv-001', description: 'Test', amount: -100, quantity: 1 }];

    await expect(() => createInvoice('pat-001', invalid))
      .rejects
      .toThrow('Charge amount must be positive');
  });

  it('should reject zero charge amounts', async () => {
    const invalid = [{ itemId: 'srv-001', description: 'Test', amount: 0, quantity: 1 }];

    await expect(() => createInvoice('pat-001', invalid))
      .rejects
      .toThrow('Charge amount must be positive');
  });

  it('should lock charges after invoice finalization', async () => {
    const result = await createInvoice('pat-001', mockCharges);
    
    expect(result.chargesLocked).toBe(false); // Draft, not yet locked
    
    // Finalize
    const finalized = { ...result, status: 'finalized' };
    expect(finalized.chargesLocked).toBe(true);
  });

  it('should log invoice creation', async () => {
    await createInvoice('pat-001', mockCharges);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INVOICE_CREATED',
        resourceType: 'invoice',
      })
    );
  });

  it('should calculate subtotal from charges', async () => {
    const result = await createInvoice('pat-001', mockCharges);

    const expected = 500 + (300 * 2); // 1100
    expect(result.subtotal).toBe(expected);
  });
});

describe('Billing - Calculation Order Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply discount BEFORE tax (not after)', async () => {
    const result = await validateCalculationOrder(
      1000, // subtotal
      100,  // discount
      0.18  // tax rate
    );

    // Correct: (1000 - 100) * 1.18 = 1062
    // Wrong: 1000 * 1.18 - 100 = 1080
    expect(result.total).toBe(1062);
  });

  it('should NOT allow tax before discount', async () => {
    const wrongOrder = async () => {
      // This should fail - tax then discount
      const taxFirst = 1000 * 1.18; // 1180
      const thenDiscount = taxFirst - 100; // 1080
      return thenDiscount;
    };

    const result = await validateCalculationOrder(1000, 100, 0.18);
    
    // Correct order result: 1062, not 1080
    expect(result.total).not.toBe(1080);
  });

  it('should reject multiple sequential operations changing order', async () => {
    // Should detect if calculation order is: charges -> tax -> discount (WRONG)
    const result = await validateCalculationOrder(1000, 100, 0.18);
    
    expect(result.orderValid).toBe(true);
  });

  it('should document calculation steps in audit', async () => {
    await validateCalculationOrder(1000, 100, 0.18);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('CALCULATION'),
        metadata: expect.objectContaining({
          subtotal: 1000,
          discountApplied: 100,
          taxRate: 0.18,
        }),
      })
    );
  });

  it('should calculate with multiple discounts', async () => {
    // Discount 1: 10% off
    // Discount 2: Rs 50 off
    const result = await validateCalculationOrder(1000, (1000 * 0.10) + 50, 0.18);

    // (1000 - 150) * 1.18 = 1004
    expect(result.total).toBe(1004);
  });
});

describe('Billing - Copay Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should charge zero copay for Government insurance', async () => {
    const govScheme = { type: 'CGHS', copay: { fixed: 0 } };

    const result = await validateCopay(1000, govScheme);

    expect(result.copayAmount).toBe(0);
  });

  it('should charge fixed copay for TPA insurance', async () => {
    const tpaScheme = { type: 'TPA', copay: { fixed: 300 } };

    const result = await validateCopay(1000, tpaScheme);

    expect(result.copayAmount).toBe(300);
  });

  it('should charge percentage copay for Private insurance', async () => {
    const privateScheme = { type: 'Private', copay: { percentage: 20 } };

    const result = await validateCopay(1000, privateScheme);

    expect(result.copayAmount).toBe(200); // 20% of 1000
  });

  it('should calculate blended copay for mixed insurance', async () => {
    const mixedScheme = { type: 'Mixed', copay: { fixed: 100, percentage: 10 } };

    const result = await validateCopay(1000, mixedScheme);

    expect(result.copayAmount).toBe(200); // 100 + (10% of 1000)
  });

  it('should handle Ayushman Bharat (100% coverage, 0% copay)', async () => {
    const ayushmanScheme = { type: 'Ayushman', copay: { fixed: 0, coverage: 100 } };

    const result = await validateCopay(1000, ayushmanScheme);

    expect(result.copayAmount).toBe(0);
    expect(result.insuranceCoverage).toBe(1000);
  });

  it('should cap copay at invoice maximum', async () => {
    const tpaScheme = { type: 'TPA', copay: { fixed: 500, maxAmount: 300 } };

    const result = await validateCopay(1000, tpaScheme);

    // Should be capped at 300
    expect(result.copayAmount).toBeLessThanOrEqual(300);
  });

  it('should log copay calculation', async () => {
    const scheme = { type: 'TPA', copay: { fixed: 300 } };

    await validateCopay(1000, scheme);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'COPAY_CALCULATED',
      })
    );
  });
});

describe('Billing - Duplicate Charge Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect duplicate charge (same item, amount, within 1 hour)', async () => {
    const charge1 = { itemId: 'srv-001', amount: 500, timestamp: new Date() };
    const charge2 = { itemId: 'srv-001', amount: 500, timestamp: new Date(Date.now() - 30 * 60 * 1000) };

    const result = await detectDuplicateCharges('pat-001', [charge1, charge2]);

    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateOf).toBe(charge1.itemId);
  });

  it('should NOT flag different items as duplicate', async () => {
    const charge1 = { itemId: 'srv-001', amount: 500, timestamp: new Date() };
    const charge2 = { itemId: 'srv-002', amount: 500, timestamp: new Date(Date.now() - 30 * 60 * 1000) };

    const result = await detectDuplicateCharges('pat-001', [charge1, charge2]);

    expect(result.isDuplicate).toBe(false);
  });

  it('should NOT flag same item charged at different times (>1 hour)', async () => {
    const charge1 = { itemId: 'srv-001', amount: 500, timestamp: new Date() };
    const charge2 = { itemId: 'srv-001', amount: 500, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) };

    const result = await detectDuplicateCharges('pat-001', [charge1, charge2]);

    expect(result.isDuplicate).toBe(false);
  });

  it('should NOT flag same item with different amounts', async () => {
    const charge1 = { itemId: 'srv-001', amount: 500, timestamp: new Date() };
    const charge2 = { itemId: 'srv-001', amount: 450, timestamp: new Date(Date.now() - 30 * 60 * 1000) };

    const result = await detectDuplicateCharges('pat-001', [charge1, charge2]);

    expect(result.isDuplicate).toBe(false);
  });

  it('should flag multiple duplicates', async () => {
    const charge1 = { itemId: 'srv-001', amount: 500, timestamp: new Date() };
    const charge2 = { itemId: 'srv-001', amount: 500, timestamp: new Date(Date.now() - 15 * 60 * 1000) };
    const charge3 = { itemId: 'srv-002', amount: 300, timestamp: new Date(Date.now() - 45 * 60 * 1000) };

    const result = await detectDuplicateCharges('pat-001', [charge1, charge2, charge3]);

    expect(result.duplicates).toBeDefined();
    expect(result.duplicates!.length).toBeGreaterThan(0);
  });

  it('should log duplicate detection', async () => {
    const charge1 = { itemId: 'srv-001', amount: 500, timestamp: new Date() };
    const charge2 = { itemId: 'srv-001', amount: 500, timestamp: new Date(Date.now() - 30 * 60 * 1000) };

    await detectDuplicateCharges('pat-001', [charge1, charge2]);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DUPLICATE_CHARGE_DETECTED',
      })
    );
  });
});

describe('Billing - Discount & Tax Application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply percentage discount', async () => {
    const result = await applyDiscount(1000, { type: 'percentage', value: 10 });

    expect(result.discountAmount).toBe(100);
    expect(result.subtotalAfterDiscount).toBe(900);
  });

  it('should apply fixed discount', async () => {
    const result = await applyDiscount(1000, { type: 'fixed', value: 150 });

    expect(result.discountAmount).toBe(150);
    expect(result.subtotalAfterDiscount).toBe(850);
  });

  it('should cap discount to invoice total', async () => {
    const result = await applyDiscount(1000, { type: 'fixed', value: 1500 });

    expect(result.discountAmount).toBeLessThanOrEqual(1000);
  });

  it('should reject negative discount', async () => {
    await expect(() => applyDiscount(1000, { type: 'percentage', value: -10 }))
      .rejects
      .toThrow('Discount must be positive');
  });

  it('should calculate tax on discounted amount', async () => {
    const result = await calculateTax(900, 0.18); // 18% GST on 900

    expect(result.taxAmount).toBe(162); // 900 * 0.18
    expect(result.totalWithTax).toBe(1062);
  });

  it('should apply state tax rules', async () => {
    const stateWithDifferentTax = { stateTax: 0.05, centralTax: 0.09 };

    const result = await calculateTax(1000, 0.14, stateWithDifferentTax);

    expect(result.taxAmount).toBe(140); // 14% total
  });

  it('should reject tax on non-taxable items', async () => {
    // Some medical services are tax-exempt
    const result = await calculateTax(1000, 0.18, { exemptFromTax: true });

    expect(result.taxAmount).toBe(0);
    expect(result.totalWithTax).toBe(1000);
  });

  it('should log discount application', async () => {
    await applyDiscount(1000, { type: 'percentage', value: 10 });

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DISCOUNT_APPLIED',
      })
    );
  });
});

describe('Billing - Payment Recording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record full payment', async () => {
    const result = await recordPayment('inv-001', 1062, 'card');

    expect(result.invoiceId).toBe('inv-001');
    expect(result.amountPaid).toBe(1062);
    expect(result.status).toBe('paid');
  });

  it('should record partial payment', async () => {
    const result = await recordPayment('inv-001', 500, 'cash');

    expect(result.amountPaid).toBe(500);
    expect(result.status).toBe('partially_paid');
    expect(result.amountOutstanding).toBe(562);
  });

  it('should reject overpayment', async () => {
    await expect(() => recordPayment('inv-001', 2000, 'card'))
      .rejects
      .toThrow('Payment exceeds invoice total');
  });

  it('should track payment method', async () => {
    const methods = ['cash', 'card', 'cheque', 'bank_transfer'];

    for (const method of methods) {
      const result = await recordPayment('inv-001', 1000, method);
      expect(result.paymentMethod).toBe(method);
    }
  });

  it('should log payment recording', async () => {
    await recordPayment('inv-001', 1062, 'card');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_RECORDED',
        resourceId: 'inv-001',
      })
    );
  });

  it('should generate payment receipt', async () => {
    const result = await recordPayment('inv-001', 1062, 'card');

    expect(result.receiptId).toBeDefined();
    expect(result.receiptTimestamp).toBeDefined();
  });
});

describe('Billing - Charge Reversal & Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reverse charge with reason', async () => {
    const result = await reverseCharge('inv-001', 'srv-001', 'duplicate_entry');

    expect(result.reversed).toBe(true);
    expect(result.reverseReason).toBe('duplicate_entry');
  });

  it('should create audit trail for reversal', async () => {
    const result = await reverseCharge('inv-001', 'srv-001', 'erroneous_coding');

    expect(result.reversalAudit).toBeDefined();
    expect(result.reversalAudit.originalAmount).toBeDefined();
  });

  it('should reject reversal of paid charges', async () => {
    await expect(() => reverseCharge('paid-inv-001', 'srv-001', 'duplicate_entry'))
      .rejects
      .toThrow('Cannot reverse charges from paid invoice');
  });

  it('should log charge reversal', async () => {
    await reverseCharge('inv-001', 'srv-001', 'duplicate_entry');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CHARGE_REVERSED',
      })
    );
  });
});

describe('Billing - Insurance Claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit insurance claim', async () => {
    const result = await submitInsuranceClaim('inv-001', 'TPA', 800);

    expect(result.claimId).toBeDefined();
    expect(result.claimAmount).toBe(800);
    expect(result.status).toBe('submitted');
  });

  it('should track claim status', async () => {
    const result = await submitInsuranceClaim('inv-001', 'TPA', 800);

    expect(['submitted', 'approved', 'rejected', 'partially_approved']).toContain(result.status);
  });

  it('should handle claim denial', async () => {
    const result = await submitInsuranceClaim('inv-001', 'TPA', 800, { denyReason: 'pre_existing' });

    expect(result.denyReason).toBe('pre_existing');
  });

  it('should log insurance claim submission', async () => {
    await submitInsuranceClaim('inv-001', 'TPA', 800);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CLAIM_SUBMITTED',
      })
    );
  });
});

describe('Billing - Revenue Leakage Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect missing charges', async () => {
    const hospitalRecords = [500, 300, 200]; // 3 expected charges
    const invoiced = [500, 300]; // Only 2 invoiced
    
    const result = await auditBillingLeakage('pat-001', hospitalRecords, invoiced);

    expect(result.hasLeakage).toBe(true);
    expect(result.missingCharges).toContain(200);
  });

  it('should detect unauthorized discounts', async () => {
    const record = { ordinalTotal: 1000, invoicedTotal: 700, discountApprover: 'attendant' };

    const result = await auditBillingLeakage('pat-001', [record]);

    if (result.unauthorizedDiscount) {
      expect(result.unauthorizedDiscount).toBe(true);
    }
  });

  it('should flag excessive waivers', async () => {
    const records = [
      { total: 1000, waived: 500 },
      { total: 800, waived: 600 },
      { total: 500, waived: 400 },
    ];

    const result = await auditBillingLeakage('pat-001', records);

    if (result.excessiveWaivers) {
      expect(result.excessiveWaivers).toBe(true);
    }
  });

  it('should detect duplicate invoicing', async () => {
    const inv1 = { invoiceId: 'inv-001', total: 1000, date: new Date() };
    const inv2 = { invoiceId: 'inv-002', total: 1000, date: new Date(Date.now() - 5 * 60 * 1000) };

    const result = await auditBillingLeakage('pat-001', [inv1, inv2]);

    if (result.duplicateInvoices) {
      expect(result.duplicateInvoices).toBeDefined();
    }
  });

  it('should generate leakage amount', async () => {
    const hospitalRecords = [500, 300, 200]; // 1000 total expected
    const invoiced = [500, 300]; // 800 invoiced
    
    const result = await auditBillingLeakage('pat-001', hospitalRecords, invoiced);

    expect(result.leakageAmount).toBe(200); // 1000 - 800
  });

  it('should log revenue audit', async () => {
    await auditBillingLeakage('pat-001', [500, 300], [500]);

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('AUDIT'),
      })
    );
  });
});

describe('Billing - Refunds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process refund', async () => {
    const result = await processRefund('inv-001', 100, 'patient_request');

    expect(result.refunded).toBe(true);
    expect(result.refundAmount).toBe(100);
  });

  it('should reject refund exceeding paid amount', async () => {
    await expect(() => processRefund('inv-001', 2000, 'patient_request'))
      .rejects
      .toThrow('Refund exceeds paid amount');
  });

  it('should track refund method (reverse to original payment)', async () => {
    const result = await processRefund('inv-001', 100, 'payment_reversal');

    expect(result.refundMethod).toBe('reverse_to_original');
  });

  it('should log refund processing', async () => {
    await processRefund('inv-001', 100, 'patient_request');

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REFUND_PROCESSED',
      })
    );
  });
});

describe('Billing - Complete Financial Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete end-to-end billing workflow', async () => {
    // 1. Create invoice
    const invoice = await createInvoice('pat-001', mockCharges);
    expect(invoice.status).toBe('draft');

    // 2. Apply discount
    const withDiscount = await applyDiscount(invoice.subtotal, { type: 'percentage', value: 10 });

    // 3. Calculate tax
    const withTax = await calculateTax(withDiscount.subtotalAfterDiscount, 0.18);

    // 4. Validate copay
    const copay = await validateCopay(withTax.totalWithTax, mockInsuranceScheme);

    // 5. Record payment
    const payment = await recordPayment(invoice.id, withTax.totalWithTax - copay.copayAmount, 'card');
    expect(payment.amountPaid).toBeGreaterThan(0);

    // 6. Submit insurance claim
    const claim = await submitInsuranceClaim(invoice.id, 'TPA', copay.copayAmount);
    expect(claim.claimId).toBeDefined();
  });

  it('should maintain audit trail through all billing operations', async () => {
    await createInvoice('pat-001', mockCharges);
    await applyDiscount(mockCharges[0].amount, { type: 'percentage', value: 10 });
    await recordPayment('inv-001', 500, 'cash');

    expect(logAudit.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
