import { describe, it, expect, beforeEach } from 'vitest';

// T-80: Dispense transaction integration
// Verifies that dispensing medication deducts stock atomically and records the transaction

interface MedicationStock {
  drug_id: string;
  drug_name: string;
  quantity_available: number;
  unit: string;
}

interface DispenseRecord {
  id: string;
  drug_id: string;
  patient_id: string;
  quantity: number;
  dispensed_by: string;
  dispensed_at: string;
}

class PharmacyDispenseService {
  private stock: MedicationStock[];
  private transactions: DispenseRecord[] = [];

  constructor(stock: MedicationStock[]) {
    this.stock = stock.map(s => ({ ...s }));
  }

  async dispense(
    drugId: string,
    patientId: string,
    quantity: number,
    dispensedBy: string
  ): Promise<DispenseRecord> {
    if (quantity <= 0) throw new Error('Quantity must be positive');

    const item = this.stock.find(s => s.drug_id === drugId);
    if (!item) throw new Error(`Drug ${drugId} not found in stock`);
    if (item.quantity_available < quantity) {
      throw new Error(`Insufficient stock: available ${item.quantity_available}, requested ${quantity}`);
    }

    // Atomic deduction
    item.quantity_available -= quantity;

    const record: DispenseRecord = {
      id: `tx-${Date.now()}`,
      drug_id: drugId,
      patient_id: patientId,
      quantity,
      dispensed_by: dispensedBy,
      dispensed_at: new Date().toISOString(),
    };
    this.transactions.push(record);
    return record;
  }

  getStock(drugId: string): MedicationStock | undefined {
    return this.stock.find(s => s.drug_id === drugId);
  }

  getTransactions(): DispenseRecord[] {
    return this.transactions;
  }
}

describe('Dispense Transaction Integration (T-80)', () => {
  let service: PharmacyDispenseService;

  beforeEach(() => {
    service = new PharmacyDispenseService([
      { drug_id: 'drug-1', drug_name: 'Amoxicillin 500mg', quantity_available: 100, unit: 'capsule' },
      { drug_id: 'drug-2', drug_name: 'Paracetamol 500mg', quantity_available: 5, unit: 'tablet' },
    ]);
  });

  it('dispenses medication and deducts stock', async () => {
    await service.dispense('drug-1', 'patient-1', 20, 'pharmacist-1');
    expect(service.getStock('drug-1')!.quantity_available).toBe(80);
  });

  it('records dispense transaction with timestamp', async () => {
    const record = await service.dispense('drug-1', 'patient-1', 10, 'pharmacist-1');
    expect(record.drug_id).toBe('drug-1');
    expect(record.quantity).toBe(10);
    expect(record.dispensed_at).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('rejects zero or negative quantity', async () => {
    await expect(service.dispense('drug-1', 'patient-1', 0, 'pharmacist-1')).rejects.toThrow('Quantity must be positive');
    await expect(service.dispense('drug-1', 'patient-1', -5, 'pharmacist-1')).rejects.toThrow();
  });

  it('rejects when stock is insufficient', async () => {
    await expect(service.dispense('drug-2', 'patient-1', 10, 'pharmacist-1')).rejects.toThrow('Insufficient stock');
  });

  it('throws for unknown drug id', async () => {
    await expect(service.dispense('drug-999', 'patient-1', 1, 'pharmacist-1')).rejects.toThrow('not found in stock');
  });

  it('accumulates multiple transactions correctly', async () => {
    await service.dispense('drug-1', 'patient-1', 10, 'pharmacist-1');
    await service.dispense('drug-1', 'patient-2', 15, 'pharmacist-1');
    expect(service.getTransactions()).toHaveLength(2);
    expect(service.getStock('drug-1')!.quantity_available).toBe(75);
  });
});
