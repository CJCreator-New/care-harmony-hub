/**
 * Utility functions and test data factories for E2E workflow testing
 */

import { vi } from 'vitest';

// ============================================
// Test Data Factories
// ============================================

export const TestDataFactory = {
  createPatient: (overrides = {}) => ({
    id: `patient-${Date.now()}`,
    first_name: 'Test',
    last_name: 'Patient',
    mrn: `MRN-${Date.now()}`,
    date_of_birth: '1990-01-15',
    gender: 'male' as const,
    phone: '555-0100',
    email: 'test@example.com',
    hospital_id: 'test-hospital-id',
    allergies: [] as string[],
    blood_type: 'O+',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createQueueEntry: (patientId: string, overrides = {}) => ({
    id: `queue-${Date.now()}`,
    patient_id: patientId,
    hospital_id: 'test-hospital-id',
    queue_number: 1,
    status: 'waiting' as const,
    priority: 'normal' as const,
    check_in_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createVitals: (patientId: string, overrides = {}) => ({
    id: `vitals-${Date.now()}`,
    patient_id: patientId,
    hospital_id: 'test-hospital-id',
    blood_pressure_systolic: 120,
    blood_pressure_diastolic: 80,
    heart_rate: 72,
    temperature: 98.6,
    respiratory_rate: 16,
    oxygen_saturation: 98,
    weight: 70,
    height: 175,
    recorded_at: new Date().toISOString(),
    recorded_by: 'test-profile-id',
    ...overrides,
  }),

  createPrepChecklist: (patientId: string, queueEntryId: string, overrides = {}) => ({
    id: `checklist-${Date.now()}`,
    patient_id: patientId,
    hospital_id: 'test-hospital-id',
    queue_entry_id: queueEntryId,
    vitals_completed: false,
    allergies_verified: false,
    medications_reviewed: false,
    chief_complaint_recorded: false,
    consent_obtained: false,
    ready_for_doctor: false,
    nurse_id: 'test-profile-id',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createConsultation: (patientId: string, overrides = {}) => ({
    id: `consultation-${Date.now()}`,
    patient_id: patientId,
    hospital_id: 'test-hospital-id',
    doctor_id: 'test-profile-id',
    status: 'in_progress' as const,
    current_step: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createPrescription: (patientId: string, consultationId: string, overrides = {}) => ({
    id: `prescription-${Date.now()}`,
    patient_id: patientId,
    hospital_id: 'test-hospital-id',
    consultation_id: consultationId,
    prescribed_by: 'test-profile-id',
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  createPrescriptionItem: (prescriptionId: string, overrides = {}) => ({
    id: `item-${Date.now()}`,
    prescription_id: prescriptionId,
    medication_name: 'Test Medication',
    dosage: '100mg',
    frequency: 'Once daily',
    duration: '7 days',
    quantity: 7,
    instructions: 'Take with food',
    is_dispensed: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createLabOrder: (patientId: string, consultationId: string, overrides = {}) => ({
    id: `lab-${Date.now()}`,
    patient_id: patientId,
    hospital_id: 'test-hospital-id',
    consultation_id: consultationId,
    ordered_by: 'test-profile-id',
    test_name: 'Complete Blood Count',
    test_code: 'CBC',
    status: 'pending' as const,
    priority: 'normal' as const,
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  createNotification: (recipientId: string, type: string, overrides = {}) => ({
    id: `notif-${Date.now()}`,
    recipient_id: recipientId,
    hospital_id: 'test-hospital-id',
    title: 'Test Notification',
    message: 'Test notification message',
    type,
    priority: 'normal',
    is_read: false,
    created_at: new Date().toISOString(),
    ...overrides,
  }),
};

// ============================================
// Mock Chain Builders
// ============================================

export const MockChainBuilder = {
  select: (data: any) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error: null }),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: data[0] || null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: data[0] || null, error: null }),
  }),

  insert: (data: any) => ({
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  }),

  update: (data: any) => ({
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  }),

  delete: () => ({
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),

  error: (message: string, code = 'PGRST000') => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message, code } }),
    order: vi.fn().mockResolvedValue({ data: null, error: { message, code } }),
  }),
};

// ============================================
// Workflow State Machine
// ============================================

export type WorkflowStage =
  | 'registered'
  | 'checked_in'
  | 'vitals_recorded'
  | 'prep_started'
  | 'prep_complete'
  | 'consultation_started'
  | 'consultation_in_progress'
  | 'consultation_completed'
  | 'prescription_created'
  | 'prescription_dispensed'
  | 'lab_ordered'
  | 'lab_collected'
  | 'lab_completed'
  | 'billed'
  | 'paid';

export interface WorkflowState {
  patientId: string;
  currentStage: WorkflowStage;
  stageHistory: Array<{ stage: WorkflowStage; timestamp: Date }>;
  data: {
    queueEntryId?: string;
    checklistId?: string;
    consultationId?: string;
    prescriptionId?: string;
    labOrderId?: string;
    invoiceId?: string;
  };
}

export const WorkflowStateMachine = {
  create: (patientId: string): WorkflowState => ({
    patientId,
    currentStage: 'registered',
    stageHistory: [{ stage: 'registered', timestamp: new Date() }],
    data: {},
  }),

  transition: (state: WorkflowState, nextStage: WorkflowStage): WorkflowState => {
    const validTransitions: Record<WorkflowStage, WorkflowStage[]> = {
      registered: ['checked_in'],
      checked_in: ['vitals_recorded', 'prep_started'],
      vitals_recorded: ['prep_started', 'prep_complete'],
      prep_started: ['vitals_recorded', 'prep_complete'],
      prep_complete: ['consultation_started'],
      consultation_started: ['consultation_in_progress'],
      consultation_in_progress: ['consultation_completed'],
      consultation_completed: ['prescription_created', 'lab_ordered', 'billed'],
      prescription_created: ['prescription_dispensed', 'lab_ordered', 'billed'],
      prescription_dispensed: ['lab_ordered', 'billed'],
      lab_ordered: ['lab_collected'],
      lab_collected: ['lab_completed'],
      lab_completed: ['billed'],
      billed: ['paid'],
      paid: [],
    };

    if (!validTransitions[state.currentStage].includes(nextStage)) {
      throw new Error(`Invalid transition from ${state.currentStage} to ${nextStage}`);
    }

    return {
      ...state,
      currentStage: nextStage,
      stageHistory: [...state.stageHistory, { stage: nextStage, timestamp: new Date() }],
    };
  },

  canTransition: (state: WorkflowState, nextStage: WorkflowStage): boolean => {
    try {
      WorkflowStateMachine.transition(state, nextStage);
      return true;
    } catch {
      return false;
    }
  },
};

// ============================================
// Validation Utilities
// ============================================

export const Validators = {
  vitals: (vitals: ReturnType<typeof TestDataFactory.createVitals>) => {
    const errors: string[] = [];

    if (vitals.blood_pressure_systolic < 70 || vitals.blood_pressure_systolic > 200) {
      errors.push('Systolic BP out of range (70-200)');
    }
    if (vitals.blood_pressure_diastolic < 40 || vitals.blood_pressure_diastolic > 130) {
      errors.push('Diastolic BP out of range (40-130)');
    }
    if (vitals.heart_rate < 40 || vitals.heart_rate > 200) {
      errors.push('Heart rate out of range (40-200)');
    }
    if (vitals.temperature < 95 || vitals.temperature > 107) {
      errors.push('Temperature out of range (95-107°F)');
    }
    if (vitals.respiratory_rate < 8 || vitals.respiratory_rate > 40) {
      errors.push('Respiratory rate out of range (8-40)');
    }
    if (vitals.oxygen_saturation < 70 || vitals.oxygen_saturation > 100) {
      errors.push('Oxygen saturation out of range (70-100%)');
    }

    return { isValid: errors.length === 0, errors };
  },

  patient: (patient: Partial<ReturnType<typeof TestDataFactory.createPatient>>) => {
    const errors: string[] = [];

    if (!patient.first_name?.trim()) errors.push('First name is required');
    if (!patient.last_name?.trim()) errors.push('Last name is required');
    if (!patient.date_of_birth) errors.push('Date of birth is required');
    if (!patient.gender) errors.push('Gender is required');

    return { isValid: errors.length === 0, errors };
  },

  prescription: (prescription: Partial<ReturnType<typeof TestDataFactory.createPrescription>>) => {
    const errors: string[] = [];

    if (!prescription.patient_id) errors.push('Patient ID is required');
    if (!prescription.prescribed_by) errors.push('Prescriber ID is required');

    return { isValid: errors.length === 0, errors };
  },

  prescriptionItem: (item: Partial<ReturnType<typeof TestDataFactory.createPrescriptionItem>>) => {
    const errors: string[] = [];

    if (!item.medication_name?.trim()) errors.push('Medication name is required');
    if (!item.dosage?.trim()) errors.push('Dosage is required');
    if (!item.frequency?.trim()) errors.push('Frequency is required');
    if (!item.duration?.trim()) errors.push('Duration is required');

    return { isValid: errors.length === 0, errors };
  },
};

// ============================================
// BMI Calculator
// ============================================

export const calculateBMI = (weightKg: number, heightCm: number): number => {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

// ============================================
// Drug Interaction Checker (Mock)
// ============================================

export const DrugInteractionChecker = {
  penicillinClass: ['Amoxicillin', 'Ampicillin', 'Penicillin', 'Piperacillin'],
  sulfaClass: ['Sulfamethoxazole', 'Sulfasalazine'],

  checkAllergyInteraction: (
    drug: string,
    allergies: string[]
  ): { hasInteraction: boolean; severity?: 'low' | 'medium' | 'high'; message?: string } => {
    const drugLower = drug.toLowerCase();

    if (allergies.includes('Penicillin')) {
      if (DrugInteractionChecker.penicillinClass.some((d) => d.toLowerCase() === drugLower)) {
        return {
          hasInteraction: true,
          severity: 'high',
          message: 'Patient is allergic to Penicillin class antibiotics',
        };
      }
    }

    if (allergies.includes('Sulfa')) {
      if (DrugInteractionChecker.sulfaClass.some((d) => d.toLowerCase() === drugLower)) {
        return {
          hasInteraction: true,
          severity: 'high',
          message: 'Patient is allergic to Sulfa drugs',
        };
      }
    }

    return { hasInteraction: false };
  },
};

// ============================================
// Wait Utilities for Async Tests
// ============================================

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error('Condition not met within timeout');
};
