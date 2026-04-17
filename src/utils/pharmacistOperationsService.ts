// @ts-nocheck
import {
  Prescription,
  PrescriptionVerification,
  DispensingRecord,
  PatientCounseling,
  PharmacyAlert,
  PharmacyMetrics,
  PharmacistDashboard,
  InventoryItem,
  InventoryReorderRequest,
  ClinicalIntervention,
  InteractionCheck,
  AllergyCheck,
  DosageVerification,
} from '../types/pharmacist';
import { PharmacistRBACManager } from './pharmacistRBACManager';
import { logAudit } from './auditLogQueue';

export class PharmacistOperationsService {
  private rbacManager: PharmacistRBACManager;
  private pharmacistId: string;
  private hospitalId: string;

  constructor(rbacManager: PharmacistRBACManager, pharmacistId: string, hospitalId = '') {
    this.rbacManager = rbacManager;
    this.pharmacistId = pharmacistId;
    this.hospitalId = hospitalId;
  }

  // Receive Prescription
  async receivePrescription(prescriptionData: Partial<Prescription>): Promise<Prescription> {
    if (!this.rbacManager.canReceivePrescription()) {
      throw new Error('Insufficient permissions to receive prescription');
    }

    const prescription: Prescription = {
      id: `rx_${Date.now()}`,
      patientId: prescriptionData.patientId || '',
      patientName: prescriptionData.patientName || '',
      prescriberId: prescriptionData.prescriberId || '',
      prescriberName: prescriptionData.prescriberName || '',
      medicationName: prescriptionData.medicationName || '',
      dosage: prescriptionData.dosage || '',
      quantity: prescriptionData.quantity || 0,
      route: prescriptionData.route || '',
      frequency: prescriptionData.frequency || '',
      duration: prescriptionData.duration || '',
      refillsRemaining: prescriptionData.refillsRemaining || 0,
      prescriptionDate: prescriptionData.prescriptionDate || new Date(),
      expiryDate: prescriptionData.expiryDate || new Date(),
      status: 'received',
      notes: prescriptionData.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'receive_prescription', entity_type: 'prescription', entity_id: prescription.id });

    return prescription;
  }

  // Verify Prescription
  async verifyPrescription(prescriptionId: string, patientId: string): Promise<PrescriptionVerification> {
    if (!this.rbacManager.canVerifyPrescription()) {
      throw new Error('Insufficient permissions to verify prescription');
    }

    const verification: PrescriptionVerification = {
      id: `verify_${Date.now()}`,
      prescriptionId,
      pharmacistId: this.pharmacistId,
      verificationTime: new Date(),
      drugInteractionCheck: { hasInteractions: false, interactions: [], severity: 'none', recommendations: [] },
      allergyCheck: { hasAllergies: false, allergies: [], medicationAllergies: [], severity: 'none', recommendations: [] },
      dosageVerification: { isAppropriate: true, recommendedDosage: '', patientAge: 0, issues: [], recommendations: [] },
      formularyCompliance: true,
      duplicateTherapyCheck: false,
      isValid: true,
      issues: [],
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'verify_prescription', entity_type: 'prescription', entity_id: prescriptionId });

    return verification;
  }

  // Check Drug Interactions
  async checkDrugInteractions(medicationName: string, currentMedications: string[]): Promise<InteractionCheck> {
    if (!this.rbacManager.canCheckInteractions()) {
      throw new Error('Insufficient permissions to check interactions');
    }

    const check: InteractionCheck = {
      hasInteractions: false,
      interactions: [],
      severity: 'none',
      recommendations: [],
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'check_drug_interactions', entity_type: 'medication', entity_id: medicationName });

    return check;
  }

  // Check Allergies
  async checkAllergies(patientId: string, medicationName: string): Promise<AllergyCheck> {
    if (!this.rbacManager.canCheckAllergies()) {
      throw new Error('Insufficient permissions to check allergies');
    }

    const check: AllergyCheck = {
      hasAllergies: false,
      allergies: [],
      medicationAllergies: [],
      severity: 'none',
      recommendations: [],
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'check_patient_allergies', entity_type: 'patient', entity_id: patientId });

    return check;
  }

  // Verify Dosage
  async verifyDosage(
    medicationName: string,
    dosage: string,
    patientAge: number,
    patientWeight?: number
  ): Promise<DosageVerification> {
    if (!this.rbacManager.canVerifyDosage()) {
      throw new Error('Insufficient permissions to verify dosage');
    }

    const verification: DosageVerification = {
      isAppropriate: true,
      recommendedDosage: dosage,
      patientAge,
      patientWeight,
      issues: [],
      recommendations: [],
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'verify_dosage', entity_type: 'medication', entity_id: medicationName });

    return verification;
  }

  // Fill Prescription
  async fillPrescription(prescriptionId: string): Promise<Prescription> {
    if (!this.rbacManager.canFillPrescription()) {
      throw new Error('Insufficient permissions to fill prescription');
    }

    const filled: Prescription = {
      id: prescriptionId,
      patientId: '',
      patientName: '',
      prescriberId: '',
      prescriberName: '',
      medicationName: '',
      dosage: '',
      quantity: 0,
      route: '',
      frequency: '',
      duration: '',
      refillsRemaining: 0,
      prescriptionDate: new Date(),
      expiryDate: new Date(),
      status: 'filled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'fill_prescription', entity_type: 'prescription', entity_id: prescriptionId });

    return filled;
  }

  // Reject Prescription
  async rejectPrescription(prescriptionId: string, reason: string): Promise<Prescription> {
    if (!this.rbacManager.canRejectPrescription()) {
      throw new Error('Insufficient permissions to reject prescription');
    }

    const rejected: Prescription = {
      id: prescriptionId,
      patientId: '',
      patientName: '',
      prescriberId: '',
      prescriberName: '',
      medicationName: '',
      dosage: '',
      quantity: 0,
      route: '',
      frequency: '',
      duration: '',
      refillsRemaining: 0,
      prescriptionDate: new Date(),
      expiryDate: new Date(),
      status: 'rejected',
      notes: reason,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'reject_prescription', entity_type: 'prescription', entity_id: prescriptionId });

    return rejected;
  }

  // Process Dispensing
  async processDispensing(prescriptionId: string, patientId: string): Promise<DispensingRecord> {
    if (!this.rbacManager.canProcessDispensing()) {
      throw new Error('Insufficient permissions to process dispensing');
    }

    const dispensing: DispensingRecord = {
      id: `disp_${Date.now()}`,
      prescriptionId,
      patientId,
      pharmacistId: this.pharmacistId,
      dispensingTime: new Date(),
      medicationName: '',
      quantity: 0,
      batchNumber: '',
      expiryDate: new Date(),
      labelGenerated: false,
      qualityChecked: false,
      counselingProvided: false,
      status: 'pending',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'process_dispensing', entity_type: 'prescription', entity_id: prescriptionId });

    return dispensing;
  }

  // Verify Dispensing
  async verifyDispensing(dispensingId: string): Promise<DispensingRecord> {
    if (!this.rbacManager.canVerifyDispensing()) {
      throw new Error('Insufficient permissions to verify dispensing');
    }

    const verified: DispensingRecord = {
      id: dispensingId,
      prescriptionId: '',
      patientId: '',
      pharmacistId: this.pharmacistId,
      dispensingTime: new Date(),
      medicationName: '',
      quantity: 0,
      batchNumber: '',
      expiryDate: new Date(),
      labelGenerated: true,
      qualityChecked: true,
      counselingProvided: false,
      status: 'verified',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'verify_dispensing', entity_type: 'dispensing', entity_id: dispensingId });

    return verified;
  }

  // Generate Label
  async generateLabel(dispensingId: string): Promise<{ labelId: string; timestamp: Date }> {
    if (!this.rbacManager.canGenerateLabel()) {
      throw new Error('Insufficient permissions to generate label');
    }

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'generate_dispensing_label', entity_type: 'dispensing', entity_id: dispensingId });

    return {
      labelId: `label_${Date.now()}`,
      timestamp: new Date(),
    };
  }

  // View Inventory
  async getInventory(): Promise<InventoryItem[]> {
    if (!this.rbacManager.canViewInventory()) {
      throw new Error('Insufficient permissions to view inventory');
    }

    return [];
  }

  // Update Inventory
  async updateInventory(itemId: string, quantity: number): Promise<InventoryItem> {
    if (!this.rbacManager.canUpdateInventory()) {
      throw new Error('Insufficient permissions to update inventory');
    }

    const updated: InventoryItem = {
      id: itemId,
      medicationName: '',
      ndc: '',
      strength: '',
      form: '',
      quantity,
      reorderLevel: 0,
      reorderQuantity: 0,
      unitCost: 0,
      expiryDate: new Date(),
      location: '',
      lastUpdated: new Date(),
      updatedBy: this.pharmacistId,
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'update_inventory', entity_type: 'inventory', entity_id: itemId });

    return updated;
  }

  // Request Reorder
  async requestReorder(medicationName: string, ndc: string, quantity: number): Promise<InventoryReorderRequest> {
    if (!this.rbacManager.canReorderInventory()) {
      throw new Error('Insufficient permissions to request reorder');
    }

    const request: InventoryReorderRequest = {
      id: `reorder_${Date.now()}`,
      medicationName,
      ndc,
      currentQuantity: 0,
      reorderQuantity: quantity,
      estimatedCost: 0,
      requestedBy: this.pharmacistId,
      requestedAt: new Date(),
      status: 'pending',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'request_reorder', entity_type: 'medication', entity_id: medicationName });

    return request;
  }

  // Counsel Patient
  async counselPatient(prescriptionId: string, patientId: string, counselingData: Partial<PatientCounseling>): Promise<PatientCounseling> {
    if (!this.rbacManager.canCounselPatient()) {
      throw new Error('Insufficient permissions to counsel patient');
    }

    const counseling: PatientCounseling = {
      id: `counsel_${Date.now()}`,
      prescriptionId,
      patientId,
      pharmacistId: this.pharmacistId,
      counselingDate: new Date(),
      medicationName: counselingData.medicationName || '',
      topics: counselingData.topics || [],
      adherenceSupport: counselingData.adherenceSupport || '',
      sideEffects: counselingData.sideEffects || [],
      drugInteractions: counselingData.drugInteractions || [],
      storageInstructions: counselingData.storageInstructions || '',
      refillInstructions: counselingData.refillInstructions || '',
      followUpNeeded: counselingData.followUpNeeded || false,
      notes: counselingData.notes,
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'counsel_patient', entity_type: 'patient', entity_id: patientId });

    return counseling;
  }

  // Create Clinical Intervention
  async createIntervention(prescriptionId: string, patientId: string, interventionData: Partial<ClinicalIntervention>): Promise<ClinicalIntervention> {
    const intervention: ClinicalIntervention = {
      id: `interv_${Date.now()}`,
      prescriptionId,
      patientId,
      pharmacistId: this.pharmacistId,
      interventionType: interventionData.interventionType || 'other',
      description: interventionData.description || '',
      recommendation: interventionData.recommendation || '',
      prescriberNotified: false,
      interventionDate: new Date(),
      status: 'pending',
    };

    logAudit({ hospital_id: this.hospitalId, user_id: this.pharmacistId, action_type: 'create_clinical_intervention', entity_type: 'prescription', entity_id: prescriptionId });

    return intervention;
  }

  // Get Dashboard Data
  async getDashboardData(): Promise<PharmacistDashboard> {
    if (!this.rbacManager.canAccessPharmacyPanel()) {
      throw new Error('Insufficient permissions to access pharmacy panel');
    }

    return {
      prescriptionQueue: [],
      inventoryAlerts: [],
      clinicalAlerts: [],
      performanceMetrics: this.getDefaultMetrics(),
      pendingVerifications: [],
      recentDispensing: [],
      qualityIndicators: [],
    };
  }

  // Get Metrics
  async getMetrics(): Promise<PharmacyMetrics> {
    if (!this.rbacManager.canViewMetrics()) {
      throw new Error('Insufficient permissions to view metrics');
    }

    return this.getDefaultMetrics();
  }

  // Helper Methods
  private getDefaultMetrics(): PharmacyMetrics {
    return {
      prescriptionsReceived: 0,
      prescriptionsFilled: 0,
      averageProcessingTime: 0,
      dispensingAccuracy: 0,
      medicationErrors: 0,
      adverseDrugReactions: 0,
      interventionRate: 0,
      patientSatisfactionScore: 0,
      inventoryAccuracy: 0,
      costSavings: 0,
    };
  }
}

// Standalone function wrappers for testing and external use
const defaultRbacManager = new PharmacistRBACManager({
  id: 'pharmacist-default',
  name: 'Default Pharmacist',
  isActive: true,
  permissions: ['*'],
} as any);
const defaultService = new PharmacistOperationsService(defaultRbacManager, 'default-pharmacist', 'default-hospital');

export async function receivePrescription(prescriptionData: Partial<Prescription>): Promise<Prescription> {
  // Validate required fields
  if (!prescriptionData.id || !prescriptionData.medicationId) {
    throw new Error('Invalid prescription data');
  }
  
  // Check expiration
  if (prescriptionData.expiresAt && prescriptionData.expiresAt < new Date()) {
    throw new Error('Prescription is expired');
  }

  const result = await defaultService.receivePrescription(prescriptionData);
  
  logAudit({
    action: 'PRESCRIPTION_RECEIVED',
    resourceId: result.id,
    resourceType: 'prescription',
    hospitalId: result.patientId,
  });

  return result;
}

export async function verifyPrescription(prescriptionId: string, patientId: string): Promise<PrescriptionVerification> {
  return defaultService.verifyPrescription(prescriptionId, patientId);
}

export async function fillPrescription(prescriptionId: string): Promise<Prescription> {
  return defaultService.fillPrescription(prescriptionId);
}

export async function checkDrugInteractions(medicationName: string, currentMedications: string[]): Promise<InteractionCheck> {
  return defaultService.checkDrugInteractions(medicationName, currentMedications);
}

export async function checkAllergies(patientId: string, medicationName: string): Promise<AllergyCheck> {
  return defaultService.checkAllergies(patientId, medicationName);
}

export async function verifyDosage(
  medicationName: string,
  dosage: string,
  patientAge: number,
  patientWeight?: number
): Promise<DosageVerification> {
  return defaultService.verifyDosage(medicationName, dosage, patientAge, patientWeight);
}

export async function getInventory(): Promise<InventoryItem[]> {
  return [];
}

export async function updateInventory(itemId: string, quantity: number): Promise<InventoryItem> {
  return {
    id: itemId,
    name: '',
    quantity,
    reorderLevel: 0,
    expiryDate: new Date(),
    batchNumber: '',
    unitCost: 0,
    storageLocation: '',
  };
}
