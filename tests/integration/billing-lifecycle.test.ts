import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Billing Lifecycle Integration — T-BILL-INT-01
 *
 * Validates the billing chain:
 *   consultation completed → invoice auto-created (status: 'pending')
 *   → payment recorded → invoice status becomes 'paid'
 *   → audit entry created
 *
 * Fully self-contained (no external DB/Supabase calls).
 */

// ── Domain types ────────────────────────────────────────────────────────────

type InvoiceStatus = 'draft' | 'pending' | 'partial' | 'paid' | 'cancelled' | 'overdue';
type PaymentMethod = 'cash' | 'card' | 'insurance' | 'bank_transfer';

interface Consultation {
  id: string;
  patient_id: string;
  hospital_id: string;
  status: 'open' | 'completed' | 'cancelled';
}

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  consultation_id: string;
  patient_id: string;
  hospital_id: string;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  total_amount: number;
  amount_paid: number;
  created_at: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  recorded_at: string;
}

interface AuditEntry {
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
}

// ── In-memory billing service ─────────────────────────────────────────────

class BillingService {
  private consultations: Consultation[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];
  private audit: AuditEntry[] = [];

  reset() {
    this.consultations = [];
    this.invoices = [];
    this.payments = [];
    this.audit = [];
  }

  addConsultation(c: Consultation) {
    this.consultations.push({ ...c });
  }

  completeConsultation(consultationId: string, items: InvoiceLineItem[]): Invoice {
    const consultation = this.consultations.find(c => c.id === consultationId);
    if (!consultation) throw new Error(`Consultation ${consultationId} not found`);
    if (consultation.status === 'completed') {
      throw new Error('Consultation is already completed');
    }
    if (items.length === 0) throw new Error('Invoice must have at least one line item');

    consultation.status = 'completed';

    const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      consultation_id: consultationId,
      patient_id: consultation.patient_id,
      hospital_id: consultation.hospital_id,
      status: 'pending',
      items,
      total_amount: total,
      amount_paid: 0,
      created_at: new Date().toISOString(),
    };

    this.invoices.push(invoice);

    this.audit.push({
      action: 'INVOICE_CREATED',
      entity_type: 'invoice',
      entity_id: invoice.id,
      metadata: { consultation_id: consultationId, total_amount: total },
    });

    return invoice;
  }

  recordPayment(invoiceId: string, amount: number, method: PaymentMethod): Payment {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
    if (invoice.status === 'paid') throw new Error('Invoice is already fully paid');
    if (amount <= 0) throw new Error('Payment amount must be positive');
    if (amount > invoice.total_amount - invoice.amount_paid) {
      throw new Error('Payment amount exceeds outstanding balance');
    }

    invoice.amount_paid += amount;

    if (invoice.amount_paid >= invoice.total_amount) {
      invoice.status = 'paid';
    } else if (invoice.amount_paid > 0) {
      invoice.status = 'partial';
    }

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      invoice_id: invoiceId,
      amount,
      method,
      recorded_at: new Date().toISOString(),
    };
    this.payments.push(payment);

    this.audit.push({
      action: 'PAYMENT_RECORDED',
      entity_type: 'payment',
      entity_id: payment.id,
      metadata: {
        invoice_id: invoiceId,
        amount,
        method,
        new_status: invoice.status,
      },
    });

    return payment;
  }

  cancelInvoice(invoiceId: string): Invoice {
    const invoice = this.invoices.find(i => i.id === invoiceId);
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
    if (invoice.status === 'paid') throw new Error('Cannot cancel a paid invoice');
    invoice.status = 'cancelled';
    this.audit.push({
      action: 'INVOICE_CANCELLED',
      entity_type: 'invoice',
      entity_id: invoiceId,
      metadata: {},
    });
    return invoice;
  }

  getInvoice(id: string) {
    return this.invoices.find(i => i.id === id) ?? null;
  }

  getPayments(invoiceId: string) {
    return this.payments.filter(p => p.invoice_id === invoiceId);
  }

  getAudit() {
    return [...this.audit];
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

const service = new BillingService();

const CONSULTATION_ITEMS: InvoiceLineItem[] = [
  { description: 'Consultation fee', quantity: 1, unit_price: 150 },
  { description: 'Lab tests', quantity: 2, unit_price: 75 },
];
const TOTAL = 300; // 150 + 2*75

describe('Billing Lifecycle Integration (T-BILL-INT-01)', () => {
  const HOSPITAL = 'hosp-001';
  const PATIENT = 'pat-001';
  const CONSULT_ID = 'consult-001';

  beforeEach(() => {
    service.reset();
    service.addConsultation({
      id: CONSULT_ID,
      patient_id: PATIENT,
      hospital_id: HOSPITAL,
      status: 'open',
    });
  });

  it('creates a pending invoice when consultation is completed', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    expect(invoice.status).toBe('pending');
    expect(invoice.total_amount).toBe(TOTAL);
    expect(invoice.amount_paid).toBe(0);
    expect(invoice.consultation_id).toBe(CONSULT_ID);
    expect(invoice.patient_id).toBe(PATIENT);
    expect(invoice.hospital_id).toBe(HOSPITAL);
  });

  it('throws when completing an already-completed consultation', () => {
    service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    expect(() =>
      service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS)
    ).toThrow('already completed');
  });

  it('throws when completing with no line items', () => {
    expect(() => service.completeConsultation(CONSULT_ID, [])).toThrow(
      'at least one line item'
    );
  });

  it('calculates invoice total correctly from line items', () => {
    const invoice = service.completeConsultation(CONSULT_ID, [
      { description: 'A', quantity: 3, unit_price: 100 },
      { description: 'B', quantity: 1, unit_price: 50 },
    ]);
    expect(invoice.total_amount).toBe(350);
  });

  it('moves invoice to partial payment status on partial payment', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    service.recordPayment(invoice.id, 100, 'cash');
    const updated = service.getInvoice(invoice.id)!;
    expect(updated.status).toBe('partial');
    expect(updated.amount_paid).toBe(100);
  });

  it('moves invoice to paid status when full amount is paid', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    service.recordPayment(invoice.id, TOTAL, 'card');
    const paid = service.getInvoice(invoice.id)!;
    expect(paid.status).toBe('paid');
    expect(paid.amount_paid).toBe(TOTAL);
  });

  it('supports split payments across multiple transactions', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    service.recordPayment(invoice.id, 100, 'cash');
    service.recordPayment(invoice.id, 200, 'card');
    const paid = service.getInvoice(invoice.id)!;
    expect(paid.status).toBe('paid');
    expect(service.getPayments(invoice.id)).toHaveLength(2);
  });

  it('throws when payment exceeds outstanding balance', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    expect(() =>
      service.recordPayment(invoice.id, TOTAL + 1, 'insurance')
    ).toThrow('exceeds outstanding balance');
  });

  it('throws recording payment against an already-paid invoice', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    service.recordPayment(invoice.id, TOTAL, 'cash');
    expect(() => service.recordPayment(invoice.id, 1, 'cash')).toThrow('already fully paid');
  });

  it('creates audit entries for INVOICE_CREATED and PAYMENT_RECORDED', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    service.recordPayment(invoice.id, TOTAL, 'bank_transfer');

    const audit = service.getAudit();
    expect(audit.map(a => a.action)).toContain('INVOICE_CREATED');
    expect(audit.map(a => a.action)).toContain('PAYMENT_RECORDED');
  });

  it('cancelled invoice audit entry is recorded', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    service.cancelInvoice(invoice.id);
    expect(service.getInvoice(invoice.id)!.status).toBe('cancelled');
    expect(service.getAudit().map(a => a.action)).toContain('INVOICE_CANCELLED');
  });

  it('throws cancelling a fully paid invoice', () => {
    const invoice = service.completeConsultation(CONSULT_ID, CONSULTATION_ITEMS);
    service.recordPayment(invoice.id, TOTAL, 'card');
    expect(() => service.cancelInvoice(invoice.id)).toThrow('Cannot cancel a paid invoice');
  });
});
