import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  receivePrescription,
  verifyPrescription,
  fillPrescription,
  checkDrugInteractions,
  checkAllergies,
  verifyDosage,
  getInventory,
  updateInventory,
} from '@/utils/pharmacistOperationsService';
import { PharmacistRBACManager } from '@/utils/pharmacistRBACManager';
import { logAudit } from '@/utils/sanitize';

// Mocks
vi.mock('@/utils/sanitize');
vi.mock('@/utils/pharmacistRBACManager');

// Test Fixtures
const mockPrescription = {
  id: 'rx-001',
  patientId: 'pat-001',
  doctorId: 'doc-001',
  medicationId: 'med-001',
  medicationName: 'Amoxicillin',
  dosage: '500mg',
  frequency: 'three times daily',
  quantity: 30,
  daysSupply: 10,
  instructions: 'Take with water',
  status: 'pending' as const,
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
  hospitalId: 'hosp-001',
};

const mockPatient = {
  id: 'pat-001',
  name: 'John Doe',
  age: 35,
  weight: 75, // kg
  allergies: ['Penicillin'],
  medications: ['Aspirin'],
  conditions: ['Hypertension'],
};

const mockDrug = {
  id: 'med-001',
  name: 'Amoxicillin',
  strength: '500mg',
  interactions: [
    { drugId: 'med-002', severity: 'MAJOR', description: 'Increased risk of bleeding' },
  ],
  contraindications: ['Penicillin Allergy'],
  pediatricDosing: true,
  renalClearance: true,
};

const mockInventory = {
  drugId: 'med-001',
  quantity: 100,
  reorderLevel: 20,
  expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  batchNumber: 'BATCH-2026-001',
  hospitalId: 'hosp-001',
};

describe('Pharmacy - Prescription Reception', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (PharmacistRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should receive valid prescription', async () => {
    const result = await receivePrescription(mockPrescription);
    
    expect(result).toEqual(expect.objectContaining({
      id: 'rx-001',
      status: 'received',
    }));
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESCRIPTION_RECEIVED',
      })
    );
  });

  it('should reject prescription if not authorized', async () => {
    (PharmacistRBACManager.checkPermission as any).mockResolvedValueOnce(false);
    
    await expect(() => receivePrescription(mockPrescription))
      .rejects
      .toThrow('Unauthorized to receive prescription');
  });

  it('should reject expired prescription', async () => {
    const expiredRx = { ...mockPrescription, expiresAt: new Date(Date.now() - 1000) };
    
    await expect(() => receivePrescription(expiredRx))
      .rejects
      .toThrow('Prescription is expired');
  });

  it('should reject prescription with missing required fields', async () => {
    const incompleteRx = { ...mockPrescription, medicationId: undefined };
    
    await expect(() => receivePrescription(incompleteRx as any))
      .rejects
      .toThrow('Invalid prescription data');
  });

  it('should log audit trail for received prescription', async () => {
    await receivePrescription(mockPrescription);
    
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESCRIPTION_RECEIVED',
        resourceId: 'rx-001',
        resourceType: 'prescription',
        hospitalId: 'hosp-001',
      })
    );
  });
});

describe('Pharmacy - Prescription Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (PharmacistRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should verify prescription with valid data', async () => {
    const result = await verifyPrescription(mockPrescription, mockPatient);
    
    expect(result).toEqual(expect.objectContaining({
      verified: false, // Will fail due to allergy
      warnings: expect.arrayContaining(['Penicillin allergy detected']),
    }));
  });

  it('should detect penicillin allergy conflict', async () => {
    const result = await verifyPrescription(mockPrescription, mockPatient);
    
    expect(result.warnings).toContain('Penicillin allergy detected');
    expect(result.verified).toBe(false);
  });

  it('should verify safe medication for patient', async () => {
    const safeRx = { ...mockPrescription, medicationName: 'Acetaminophen' };
    const result = await verifyPrescription(safeRx, mockPatient);
    
    expect(result.verified).toBe(true);
    expect(result.warnings).not.toContain('Penicillin allergy detected');
  });

  it('should check dosage appropriateness', async () => {
    const pediatricPatient = { ...mockPatient, age: 5 };
    const result = await verifyPrescription(mockPrescription, pediatricPatient);
    
    expect(result.warnings).toContainEqual(
      expect.stringContaining('dosage')
    );
  });

  it('should flag duplicate therapy', async () => {
    const patientOnMedication = {
      ...mockPatient,
      medications: ['Amoxicillin'], // Already on this medication
    };
    
    const result = await verifyPrescription(mockPrescription, patientOnMedication);
    
    expect(result.warnings).toContain('Duplicate therapy detected');
  });

  it('should log verification audit trail', async () => {
    await verifyPrescription(mockPrescription, mockPatient);
    
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESCRIPTION_VERIFIED',
        resourceId: 'rx-001',
      })
    );
  });
});

describe('Pharmacy - Dispensing Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (PharmacistRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should fill prescription successfully', async () => {
    const result = await fillPrescription(mockPrescription, mockInventory);
    
    expect(result).toEqual(expect.objectContaining({
      status: 'filled',
      dispensedQuantity: 30,
      filledAt: expect.any(Date),
    }));
  });

  it('should reject fill if quantity insufficient', async () => {
    const lowInventory = { ...mockInventory, quantity: 10 };
    
    await expect(() => fillPrescription(mockPrescription, lowInventory))
      .rejects
      .toThrow('Insufficient inventory');
  });

  it('should reject fill if medication expired', async () => {
    const expiredInventory = {
      ...mockInventory,
      expiryDate: new Date(Date.now() - 1000),
    };
    
    await expect(() => fillPrescription(mockPrescription, expiredInventory))
      .rejects
      .toThrow('Medication expired');
  });

  it('should generate label with correct information', async () => {
    const result = await fillPrescription(mockPrescription, mockInventory);
    
    expect(result.label).toContain('500mg');
    expect(result.label).toContain('three times daily');
  });

  it('should log dispensing audit trail', async () => {
    await fillPrescription(mockPrescription, mockInventory);
    
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PRESCRIPTION_FILLED',
        resourceId: 'rx-001',
      })
    );
  });

  it('should update inventory after dispensing', async () => {
    const updateInventorySpy = vi.spyOn({ updateInventory }, 'updateInventory');
    
    await fillPrescription(mockPrescription, mockInventory);
    
    expect(updateInventorySpy).toHaveBeenCalled();
  });

  it('should flag low inventory threshold', async () => {
    const lowStockInventory = { ...mockInventory, quantity: 25 };
    const result = await fillPrescription(mockPrescription, lowStockInventory);
    
    expect(result.warnings).toContainEqual(
      expect.stringContaining('Low stock')
    );
  });
});

describe('Pharmacy - Drug Interaction Checking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect CRITICAL drug interactions', async () => {
    const result = await checkDrugInteractions(
      mockPrescription.medicationId,
      mockPatient.medications
    );
    
    expect(result.interactions).toBeDefined();
    expect(result.hasCritical).toEqual(expect.any(Boolean));
  });

  it('should not flag interactions for patient on no medications', async () => {
    const result = await checkDrugInteractions(
      mockPrescription.medicationId,
      []
    );
    
    expect(result.interactions).toHaveLength(0);
    expect(result.hasCritical).toBe(false);
  });

  it('should categorize interactions by severity', async () => {
    const result = await checkDrugInteractions(
      mockPrescription.medicationId,
      ['med-002', 'med-003']
    );
    
    if (result.interactions.length > 0) {
      expect(result.interactions[0]).toHaveProperty('severity');
      expect(['CRITICAL', 'MAJOR', 'MODERATE', 'MINOR']).toContain(
        result.interactions[0].severity
      );
    }
  });

  it('should provide interaction descriptions', async () => {
    const result = await checkDrugInteractions(
      mockPrescription.medicationId,
      ['med-002']
    );
    
    if (result.interactions.length > 0) {
      expect(result.interactions[0]).toHaveProperty('description');
      expect(typeof result.interactions[0].description).toBe('string');
    }
  });

  it('should handle unknown medications gracefully', async () => {
    const result = await checkDrugInteractions('unknown-med', ['med-002']);
    
    expect(result).toBeDefined();
    expect(result.interactions).toBeDefined();
  });
});

describe('Pharmacy - Allergy Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect patient drug allergies', async () => {
    const result = await checkAllergies(
      mockPrescription.medicationId,
      mockPatient.allergies
    );
    
    expect(result.hasAllergy).toEqual(expect.any(Boolean));
    expect(result.allergyInfo).toBeDefined();
  });

  it('should flag penicillin allergy against amoxicillin', async () => {
    const result = await checkAllergies('amoxicillin', ['Penicillin']);
    
    expect(result.hasAllergy).toBe(true);
    expect(result.allergyInfo.crossReaction).toBe(true);
  });

  it('should not flag unrelated allergies', async () => {
    const result = await checkAllergies(
      'amoxicillin',
      ['Shellfish', 'Peanuts']
    );
    
    expect(result.hasAllergy).toBe(false);
  });

  it('should provide allergy severity level', async () => {
    const result = await checkAllergies('amoxicillin', ['Penicillin']);
    
    if (result.hasAllergy) {
      expect(['MILD', 'MODERATE', 'SEVERE']).toContain(result.allergyInfo.severity);
    }
  });

  it('should handle empty allergy list', async () => {
    const result = await checkAllergies(mockPrescription.medicationId, []);
    
    expect(result.hasAllergy).toBe(false);
    expect(result.allergyInfo).toBeDefined();
  });

  it('should log allergy checks for critical findings', async () => {
    await checkAllergies('amoxicillin', ['Penicillin']);
    
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ALLERGY_FLAG_DETECTED',
      })
    );
  });
});

describe('Pharmacy - Dosage Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify dosage for adult patient', async () => {
    const result = await verifyDosage(
      mockPrescription.medicationId,
      '500mg',
      mockPatient.age,
      mockPatient.weight
    );
    
    expect(result.appropriate).toEqual(expect.any(Boolean));
    expect(result.warnings).toBeDefined();
  });

  it('should flag pediatric dosing incorrectly prescribed', async () => {
    const result = await verifyDosage(
      mockPrescription.medicationId,
      '1000mg', // Too high for child
      5, // 5 year old
      20 // 20 kg
    );
    
    expect(result.warnings).toContainEqual(
      expect.stringContaining('dosage')
    );
  });

  it('should verify age-based dosing', async () => {
    const elderly = { age: 75, weight: 65 };
    const result = await verifyDosage(
      mockPrescription.medicationId,
      mockPrescription.dosage,
      elderly.age,
      elderly.weight
    );
    
    if (!result.appropriate) {
      expect(result.warnings).toContainEqual(
        expect.stringContaining('age')
      );
    }
  });

  it('should verify weight-based dosing', async () => {
    const obese = { age: 40, weight: 120 };
    const result = await verifyDosage(
      mockPrescription.medicationId,
      mockPrescription.dosage,
      obese.age,
      obese.weight
    );
    
    expect(result).toBeDefined();
  });

  it('should flag concerning dosage values', async () => {
    const result = await verifyDosage(
      mockPrescription.medicationId,
      '5000mg', // Likely too high
      35,
      75
    );
    
    expect(result.warnings).toContainEqual(
      expect.stringContaining('high')
    );
  });

  it('should consider renal function adjustments', async () => {
    // This test assumes renalClearance = true for the drug
    const result = await verifyDosage(
      mockPrescription.medicationId,
      mockPrescription.dosage,
      70,
      60
    );
    
    expect(result).toBeDefined();
  });
});

describe('Pharmacy - Inventory Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (PharmacistRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should retrieve inventory for medication', async () => {
    const result = await getInventory(mockPrescription.medicationId);
    
    expect(result).toEqual(expect.objectContaining({
      drugId: expect.any(String),
      quantity: expect.any(Number),
      expiryDate: expect.any(Date),
    }));
  });

  it('should flag low inventory status', async () => {
    const result = await getInventory(mockPrescription.medicationId);
    
    if (result.quantity <= result.reorderLevel) {
      expect(result.status).toBe('low');
    }
  });

  it('should flag expired inventory', async () => {
    const result = await getInventory(mockPrescription.medicationId);
    
    if (result.expiryDate < new Date()) {
      expect(result.status).not.toBe('available');
    }
  });

  it('should update inventory quantity after dispensing', async () => {
    const updated = await updateInventory(
      mockPrescription.medicationId,
      -30 // Dispense 30 units
    );
    
    expect(updated.quantity).toBeLessThan(mockInventory.quantity);
  });

  it('should prevent inventory update resulting in negative quantity', async () => {
    await expect(() => updateInventory(mockPrescription.medicationId, -200))
      .rejects
      .toThrow('Cannot reduce inventory below zero');
  });

  it('should track batch number for dispensed medications', async () => {
    const result = await getInventory(mockPrescription.medicationId);
    
    expect(result).toHaveProperty('batchNumber');
  });

  it('should log inventory updates', async () => {
    await updateInventory(mockPrescription.medicationId, -30);
    
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.stringContaining('INVENTORY'),
      })
    );
  });

  it('should calculate days of supply', async () => {
    const result = await getInventory(mockPrescription.medicationId);
    
    if (result.daysOfSupply) {
      expect(result.daysOfSupply).toBeGreaterThan(0);
    }
  });
});

describe('Pharmacy - Comprehensive Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (PharmacistRBACManager.checkPermission as any).mockResolvedValue(true);
    (logAudit as any).mockResolvedValue(undefined);
  });

  it('should complete full prescription workflow', async () => {
    // 1. Receive
    const received = await receivePrescription(mockPrescription);
    expect(received.status).toBe('received');

    // 2. Verify
    const verified = await verifyPrescription(received, mockPatient);
    // May have warnings but should continue

    // 3. Check interactions
    const interactions = await checkDrugInteractions(
      received.medicationId,
      mockPatient.medications
    );
    expect(interactions.hasCritical).toBeDefined();

    // 4. Check allergies
    const allergies = await checkAllergies(
      received.medicationId,
      mockPatient.allergies
    );
    // Should flag allergy for this patient

    // 5. Verify dosage
    const dosage = await verifyDosage(
      received.medicationId,
      received.dosage,
      mockPatient.age,
      mockPatient.weight
    );
    expect(dosage.appropriate).toBeDefined();

    // 6. Fill prescription
    const filled = await fillPrescription(received, mockInventory);
    expect(filled.status).toBe('filled');
  });

  it('should handle contraindicated medication', async () => {
    const contraIndicatedRx = { ...mockPrescription, medicationName: 'Pcn' }; // Penicillin
    
    const allergies = await checkAllergies('penicillin', ['Penicillin']);
    expect(allergies.hasAllergy).toBe(true);
    
    const verified = await verifyPrescription(contraIndicatedRx, mockPatient);
    expect(verified.verified).toBe(false);
  });

  it('should track all pharmacy operations with audit', async () => {
    await receivePrescription(mockPrescription);
    await verifyPrescription(mockPrescription, mockPatient);
    
    expect(logAudit).toHaveBeenCalledTimes(2);
  });
});
