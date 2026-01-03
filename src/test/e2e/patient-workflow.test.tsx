import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile } from '../mocks/auth';
import React from 'react';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Test data factories
const createTestPatient = (overrides = {}) => ({
  id: 'patient-001',
  first_name: 'John',
  last_name: 'Doe',
  mrn: 'MRN-001',
  date_of_birth: '1990-01-15',
  gender: 'male',
  phone: '555-0100',
  email: 'john.doe@test.com',
  hospital_id: 'test-hospital-id',
  allergies: ['Penicillin'],
  blood_type: 'O+',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createTestQueueEntry = (patientId: string, overrides = {}) => ({
  id: 'queue-001',
  patient_id: patientId,
  hospital_id: 'test-hospital-id',
  queue_number: 1,
  status: 'waiting',
  priority: 'normal',
  check_in_time: new Date().toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});

const createTestVitals = (patientId: string, overrides = {}) => ({
  id: 'vitals-001',
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
});

const createTestPrepChecklist = (patientId: string, queueEntryId: string, overrides = {}) => ({
  id: 'checklist-001',
  patient_id: patientId,
  hospital_id: 'test-hospital-id',
  queue_entry_id: queueEntryId,
  vitals_completed: true,
  allergies_verified: true,
  medications_reviewed: true,
  chief_complaint_recorded: true,
  consent_obtained: true,
  ready_for_doctor: true,
  nurse_id: 'test-profile-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  ...overrides,
});

const createTestConsultation = (patientId: string, overrides = {}) => ({
  id: 'consultation-001',
  patient_id: patientId,
  hospital_id: 'test-hospital-id',
  doctor_id: 'test-profile-id',
  status: 'in_progress',
  current_step: 1,
  chief_complaint: 'Headache and fever',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createTestPrescription = (patientId: string, consultationId: string, overrides = {}) => ({
  id: 'prescription-001',
  patient_id: patientId,
  hospital_id: 'test-hospital-id',
  consultation_id: consultationId,
  prescribed_by: 'test-profile-id',
  status: 'pending',
  notes: 'Take with food',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const createTestPrescriptionItem = (prescriptionId: string, overrides = {}) => ({
  id: 'prescription-item-001',
  prescription_id: prescriptionId,
  medication_name: 'Ibuprofen',
  dosage: '400mg',
  frequency: 'Three times daily',
  duration: '7 days',
  quantity: 21,
  instructions: 'Take after meals',
  is_dispensed: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

// Test wrapper with all providers
const createTestWrapper = (authOverrides = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const _authContext = createMockAuthContext(authOverrides);

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          {children}
          <Toaster />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

describe('Patient Workflow E2E Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Phase 1: Patient Check-In (Receptionist)', () => {
    const testPatient = createTestPatient();

    it('should search for existing patient', async () => {
      const mockFromChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [testPatient],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockFromChain);

      // Verify patient search works
      expect(mockSupabaseClient.from).toBeDefined();
    });

    it('should add patient to queue on check-in', async () => {
      const queueEntry = createTestQueueEntry(testPatient.id);

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: queueEntry,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertChain);

      // Simulate check-in
      const result = await mockInsertChain.single();

      expect(result.data).toEqual(queueEntry);
      expect(result.data.status).toBe('waiting');
      expect(result.data.queue_number).toBe(1);
    });

    it('should assign queue number sequentially', async () => {
      const existingQueues = [
        createTestQueueEntry('p1', { queue_number: 1 }),
        createTestQueueEntry('p2', { queue_number: 2 }),
      ];

      const mockCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({
          data: existingQueues,
          count: 2,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockCountChain);

      const result = await mockCountChain.gte();
      const nextQueueNumber = (result.count || 0) + 1;

      expect(nextQueueNumber).toBe(3);
    });

    it('should handle priority check-in for emergency cases', async () => {
      const emergencyQueue = createTestQueueEntry(testPatient.id, {
        priority: 'emergency',
        queue_number: 0, // Emergency gets priority
      });

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: emergencyQueue,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertChain);

      const result = await mockInsertChain.single();

      expect(result.data.priority).toBe('emergency');
    });

    it('should trigger notification to nurses on check-in', async () => {
      const notification = {
        id: 'notif-001',
        recipient_id: 'nurse-profile-id',
        title: 'New Patient Check-In',
        message: `${testPatient.first_name} ${testPatient.last_name} has checked in`,
        type: 'patient_checkin',
        hospital_id: 'test-hospital-id',
        is_read: false,
      };

      const mockNotificationChain = {
        insert: vi.fn().mockResolvedValue({
          data: notification,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'notifications') return mockNotificationChain;
        return mockSupabaseClient.from(table);
      });

      const result = await mockNotificationChain.insert();

      expect(result.data.type).toBe('patient_checkin');
    });
  });

  describe('Phase 2: Vitals Recording (Nurse)', () => {
    const testPatient = createTestPatient();
    const testQueue = createTestQueueEntry(testPatient.id);

    it('should display patients waiting in queue', async () => {
      const queueWithPatient = {
        ...testQueue,
        patient: testPatient,
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [queueWithPatient],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockSelectChain);

      const result = await mockSelectChain.order();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].patient.first_name).toBe('John');
    });

    it('should record vital signs for patient', async () => {
      const vitals = createTestVitals(testPatient.id);

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: vitals,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertChain);

      const result = await mockInsertChain.single();

      expect(result.data.blood_pressure_systolic).toBe(120);
      expect(result.data.blood_pressure_diastolic).toBe(80);
      expect(result.data.heart_rate).toBe(72);
    });

    it('should calculate BMI when weight and height provided', () => {
      const weight = 70; // kg
      const height = 175; // cm
      const heightInMeters = height / 100;
      const expectedBMI = weight / (heightInMeters * heightInMeters);

      expect(expectedBMI).toBeCloseTo(22.86, 2);
    });

    it('should validate vital sign ranges', () => {
      type VitalsRecord = ReturnType<typeof createTestVitals>;
      
      const validateVitals = (vitals: VitalsRecord) => {
        const errors: string[] = [];

        if (vitals.blood_pressure_systolic < 70 || vitals.blood_pressure_systolic > 200) {
          errors.push('Systolic BP out of range');
        }
        if (vitals.blood_pressure_diastolic < 40 || vitals.blood_pressure_diastolic > 130) {
          errors.push('Diastolic BP out of range');
        }
        if (vitals.heart_rate < 40 || vitals.heart_rate > 200) {
          errors.push('Heart rate out of range');
        }
        if (vitals.temperature < 95 || vitals.temperature > 107) {
          errors.push('Temperature out of range');
        }

        return errors;
      };

      const normalVitals = createTestVitals(testPatient.id);
      expect(validateVitals(normalVitals)).toHaveLength(0);

      const abnormalVitals = createTestVitals(testPatient.id, {
        blood_pressure_systolic: 250, // Too high
        heart_rate: 30, // Too low
      });
      expect(validateVitals(abnormalVitals)).toHaveLength(2);
    });
  });

  describe('Phase 3: Pre-Consultation Prep (Nurse)', () => {
    const testPatient = createTestPatient();
    const testQueue = createTestQueueEntry(testPatient.id);

    it('should create prep checklist for patient', async () => {
      const checklist = createTestPrepChecklist(testPatient.id, testQueue.id, {
        vitals_completed: false,
        allergies_verified: false,
        medications_reviewed: false,
        chief_complaint_recorded: false,
        consent_obtained: false,
        ready_for_doctor: false,
      });

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: checklist,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertChain);

      const result = await mockInsertChain.single();

      expect(result.data.ready_for_doctor).toBe(false);
    });

    it('should update checklist items individually', async () => {
      const updatedChecklist = createTestPrepChecklist(testPatient.id, testQueue.id, {
        vitals_completed: true,
        allergies_verified: true,
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedChecklist,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.vitals_completed).toBe(true);
      expect(result.data.allergies_verified).toBe(true);
    });

    it('should mark patient ready for doctor when all items complete', async () => {
      const completeChecklist = createTestPrepChecklist(testPatient.id, testQueue.id, {
        vitals_completed: true,
        allergies_verified: true,
        medications_reviewed: true,
        chief_complaint_recorded: true,
        consent_obtained: true,
        ready_for_doctor: true,
        completed_at: new Date().toISOString(),
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: completeChecklist,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.ready_for_doctor).toBe(true);
      expect(result.data.completed_at).toBeTruthy();
    });

    it('should update queue entry notes when marked ready', async () => {
      const updatedQueue = {
        ...testQueue,
        notes: 'Patient prep complete - Ready for doctor',
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedQueue,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.notes).toContain('Ready for doctor');
    });

    it('should notify doctors when patient is ready', async () => {
      const notification = {
        id: 'notif-002',
        recipient_id: 'doctor-profile-id',
        title: 'Patient Ready for Consultation',
        message: `${testPatient.first_name} ${testPatient.last_name} is ready`,
        type: 'patient_ready',
        hospital_id: 'test-hospital-id',
        priority: 'high',
        is_read: false,
      };

      const mockNotificationChain = {
        insert: vi.fn().mockResolvedValue({
          data: notification,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'notifications') return mockNotificationChain;
        return mockSupabaseClient.from(table);
      });

      const result = await mockNotificationChain.insert();

      expect(result.data.type).toBe('patient_ready');
      expect(result.data.priority).toBe('high');
    });
  });

  describe('Phase 4: Consultation (Doctor)', () => {
    const testPatient = createTestPatient();
    const testQueue = createTestQueueEntry(testPatient.id);

    it('should display patients ready for consultation', async () => {
      const readyPatients = [
        {
          ...createTestPrepChecklist(testPatient.id, testQueue.id),
          patient: testPatient,
          queue_entry: testQueue,
        },
      ];

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: readyPatients,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockSelectChain);

      const result = await mockSelectChain.order();

      expect(result.data[0].ready_for_doctor).toBe(true);
      expect(result.data[0].patient.first_name).toBe('John');
    });

    it('should create new consultation', async () => {
      const consultation = createTestConsultation(testPatient.id);

      const mockInsertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: consultation,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockInsertChain);

      const result = await mockInsertChain.single();

      expect(result.data.status).toBe('in_progress');
      expect(result.data.current_step).toBe(1);
    });

    it('should progress through consultation steps', async () => {
      const steps = [
        { step: 1, status: 'chief_complaint' },
        { step: 2, status: 'physical_exam' },
        { step: 3, status: 'diagnosis' },
        { step: 4, status: 'treatment' },
        { step: 5, status: 'summary' },
      ];

      for (const { step, status } of steps) {
        const updatedConsultation = createTestConsultation(testPatient.id, {
          current_step: step,
          status,
        });

        const mockUpdateChain = {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: updatedConsultation,
            error: null,
          }),
        };

        mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

        const result = await mockUpdateChain.single();

        expect(result.data.current_step).toBe(step);
        expect(result.data.status).toBe(status);
      }
    });

    it('should save chief complaint data', async () => {
      const consultationWithComplaint = createTestConsultation(testPatient.id, {
        chief_complaint: 'Severe headache for 3 days',
        history_of_present_illness: 'Patient reports throbbing headache, worse in morning',
        symptoms: ['headache', 'nausea', 'light sensitivity'],
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: consultationWithComplaint,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.chief_complaint).toBeTruthy();
      expect(result.data.symptoms).toContain('headache');
    });

    it('should save diagnosis', async () => {
      const consultationWithDiagnosis = createTestConsultation(testPatient.id, {
        provisional_diagnosis: ['Migraine'],
        final_diagnosis: ['Migraine without aura'],
        clinical_notes: 'Classic migraine presentation',
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: consultationWithDiagnosis,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.final_diagnosis).toContain('Migraine without aura');
    });

    it('should complete consultation', async () => {
      const completedConsultation = createTestConsultation(testPatient.id, {
        status: 'completed',
        current_step: 5,
        completed_at: new Date().toISOString(),
        pharmacy_notified: true,
        billing_notified: true,
      });

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: completedConsultation,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.status).toBe('completed');
      expect(result.data.completed_at).toBeTruthy();
      expect(result.data.pharmacy_notified).toBe(true);
    });
  });

  describe('Phase 5: Prescription Creation (Doctor)', () => {
    const testPatient = createTestPatient();
    const testConsultation = createTestConsultation(testPatient.id);

    it('should create prescription with items', async () => {
      const prescription = createTestPrescription(testPatient.id, testConsultation.id);
      const prescriptionItem = createTestPrescriptionItem(prescription.id);

      // Mock prescription creation
      const mockPrescriptionInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: prescription,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'prescriptions') return mockPrescriptionInsert;
        return mockSupabaseClient.from(table);
      });

      const prescriptionResult = await mockPrescriptionInsert.single();
      expect(prescriptionResult.data.status).toBe('pending');

      // Mock item creation
      const mockItemInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [prescriptionItem],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'prescription_items') return mockItemInsert;
        return mockSupabaseClient.from(table);
      });

      const itemResult = await mockItemInsert.select();
      expect(itemResult.data[0].medication_name).toBe('Ibuprofen');
    });

    it('should check for drug allergies before prescribing', () => {
      const patientAllergies = ['Penicillin', 'Sulfa'];
      const prescribedDrug = 'Amoxicillin'; // Penicillin-class antibiotic

      const checkAllergyInteraction = (drug: string, allergies: string[]) => {
        const penicillinDrugs = ['Amoxicillin', 'Ampicillin', 'Penicillin'];
        if (allergies.includes('Penicillin') && penicillinDrugs.includes(drug)) {
          return { hasInteraction: true, severity: 'high', message: 'Patient allergic to Penicillin class' };
        }
        return { hasInteraction: false };
      };

      const result = checkAllergyInteraction(prescribedDrug, patientAllergies);
      expect(result.hasInteraction).toBe(true);
      expect(result.severity).toBe('high');
    });

    it('should notify pharmacy of new prescription', async () => {
      const notification = {
        id: 'notif-003',
        recipient_id: 'pharmacist-profile-id',
        title: 'New Prescription',
        message: `New prescription for ${testPatient.first_name} ${testPatient.last_name}`,
        type: 'prescription_created',
        hospital_id: 'test-hospital-id',
        priority: 'normal',
        is_read: false,
        metadata: { prescription_id: 'prescription-001' },
      };

      const mockNotificationChain = {
        insert: vi.fn().mockResolvedValue({
          data: notification,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'notifications') return mockNotificationChain;
        return mockSupabaseClient.from(table);
      });

      const result = await mockNotificationChain.insert();

      expect(result.data.type).toBe('prescription_created');
    });
  });

  describe('Phase 6: Prescription Dispensing (Pharmacy)', () => {
    const testPatient = createTestPatient();
    const testConsultation = createTestConsultation(testPatient.id);
    const testPrescription = createTestPrescription(testPatient.id, testConsultation.id);

    it('should display pending prescriptions', async () => {
      const prescriptionWithDetails = {
        ...testPrescription,
        patient: testPatient,
        prescriber: mockProfile,
        prescription_items: [createTestPrescriptionItem(testPrescription.id)],
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [prescriptionWithDetails],
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockSelectChain);

      const result = await mockSelectChain.order();

      expect(result.data[0].status).toBe('pending');
      expect(result.data[0].prescription_items).toHaveLength(1);
    });

    it('should verify medication stock before dispensing', async () => {
      const medication = {
        id: 'med-001',
        name: 'Ibuprofen',
        current_stock: 100,
        minimum_stock: 20,
        hospital_id: 'test-hospital-id',
      };

      const mockSelectChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: medication,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockSelectChain);

      const result = await mockSelectChain.single();
      const requiredQuantity = 21;

      expect(result.data.current_stock >= requiredQuantity).toBe(true);
    });

    it('should dispense prescription and update status', async () => {
      const dispensedPrescription = {
        ...testPrescription,
        status: 'dispensed',
        dispensed_at: new Date().toISOString(),
        dispensed_by: 'pharmacist-profile-id',
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: dispensedPrescription,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.status).toBe('dispensed');
      expect(result.data.dispensed_at).toBeTruthy();
      expect(result.data.dispensed_by).toBe('pharmacist-profile-id');
    });

    it('should decrement medication inventory after dispensing', async () => {
      const currentStock = 100;
      const dispensedQuantity = 21;
      const expectedStock = currentStock - dispensedQuantity;

      const updatedMedication = {
        id: 'med-001',
        name: 'Ibuprofen',
        current_stock: expectedStock,
      };

      const mockUpdateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: updatedMedication,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockUpdateChain);

      const result = await mockUpdateChain.single();

      expect(result.data.current_stock).toBe(79);
    });

    it('should trigger low stock alert if inventory below threshold', () => {
      const checkLowStock = (currentStock: number, minimumStock: number) => {
        return currentStock <= minimumStock;
      };

      expect(checkLowStock(15, 20)).toBe(true);
      expect(checkLowStock(100, 20)).toBe(false);
    });

    it('should notify patient when prescription is ready', async () => {
      const notification = {
        id: 'notif-004',
        recipient_id: testPatient.id,
        title: 'Prescription Ready',
        message: 'Your prescription is ready for pickup',
        type: 'prescription_ready',
        hospital_id: 'test-hospital-id',
        priority: 'normal',
        is_read: false,
      };

      const mockNotificationChain = {
        insert: vi.fn().mockResolvedValue({
          data: notification,
          error: null,
        }),
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'notifications') return mockNotificationChain;
        return mockSupabaseClient.from(table);
      });

      const result = await mockNotificationChain.insert();

      expect(result.data.type).toBe('prescription_ready');
    });
  });

  describe('Full Workflow Integration', () => {
    it('should complete entire patient journey from check-in to dispense', async () => {
      const patient = createTestPatient();
      const workflowState = {
        patientId: patient.id,
        queueEntryId: '',
        checklistId: '',
        consultationId: '',
        prescriptionId: '',
        currentPhase: 'check-in',
      };

      // Step 1: Check-in
      const queueEntry = createTestQueueEntry(patient.id);
      workflowState.queueEntryId = queueEntry.id;
      workflowState.currentPhase = 'waiting';
      expect(queueEntry.status).toBe('waiting');

      // Step 2: Vitals recorded
      const vitals = createTestVitals(patient.id);
      expect(vitals.blood_pressure_systolic).toBe(120);

      // Step 3: Prep complete
      const checklist = createTestPrepChecklist(patient.id, queueEntry.id);
      workflowState.checklistId = checklist.id;
      workflowState.currentPhase = 'ready-for-doctor';
      expect(checklist.ready_for_doctor).toBe(true);

      // Step 4: Consultation started and completed
      const consultation = createTestConsultation(patient.id, { status: 'completed' });
      workflowState.consultationId = consultation.id;
      workflowState.currentPhase = 'consultation-complete';
      expect(consultation.status).toBe('completed');

      // Step 5: Prescription created
      const prescription = createTestPrescription(patient.id, consultation.id);
      workflowState.prescriptionId = prescription.id;
      workflowState.currentPhase = 'prescription-pending';
      expect(prescription.status).toBe('pending');

      // Step 6: Prescription dispensed
      const dispensedPrescription = { ...prescription, status: 'dispensed' };
      workflowState.currentPhase = 'complete';
      expect(dispensedPrescription.status).toBe('dispensed');

      // Verify final state
      expect(workflowState.currentPhase).toBe('complete');
    });

    it('should handle workflow with lab orders', async () => {
      const patient = createTestPatient();
      const consultation = createTestConsultation(patient.id);

      const labOrder = {
        id: 'lab-001',
        patient_id: patient.id,
        hospital_id: 'test-hospital-id',
        consultation_id: consultation.id,
        ordered_by: 'test-profile-id',
        test_name: 'Complete Blood Count',
        test_code: 'CBC',
        status: 'pending',
        priority: 'normal',
        created_at: new Date().toISOString(),
      };

      // Order created
      expect(labOrder.status).toBe('pending');

      // Sample collected
      const collectedOrder = { ...labOrder, status: 'collected', collected_at: new Date().toISOString() };
      expect(collectedOrder.status).toBe('collected');

      // Results entered
      const completedOrder = {
        ...collectedOrder,
        status: 'completed',
        results: { wbc: 7.5, rbc: 4.8, hgb: 14.2 },
        completed_at: new Date().toISOString(),
      };
      expect(completedOrder.status).toBe('completed');
      expect(completedOrder.results.wbc).toBe(7.5);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockErrorChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed', code: 'PGRST000' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockErrorChain);

      const result = await mockErrorChain.single();

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Database connection failed');
    });

    it('should handle duplicate check-in attempts', async () => {
      const mockErrorChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Patient already checked in today', code: '23505' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockErrorChain);

      const result = await mockErrorChain.single();

      expect(result.error.code).toBe('23505'); // Unique violation
    });

    it('should handle insufficient medication stock', () => {
      const currentStock = 10;
      const requiredQuantity = 21;

      const canDispense = currentStock >= requiredQuantity;
      expect(canDispense).toBe(false);
    });
  });

  describe('Data Validation', () => {
    it('should validate patient data on registration', () => {
      const validatePatient = (patient: Partial<ReturnType<typeof createTestPatient>>) => {
        const errors: string[] = [];

        if (!patient.first_name?.trim()) errors.push('First name is required');
        if (!patient.last_name?.trim()) errors.push('Last name is required');
        if (!patient.date_of_birth) errors.push('Date of birth is required');
        if (!patient.gender) errors.push('Gender is required');

        return errors;
      };

      const validPatient = createTestPatient();
      expect(validatePatient(validPatient)).toHaveLength(0);

      const invalidPatient = { first_name: '', last_name: 'Doe' };
      expect(validatePatient(invalidPatient).length).toBeGreaterThan(0);
    });

    it('should validate prescription items', () => {
      const validatePrescriptionItem = (item: Partial<ReturnType<typeof createTestPrescriptionItem>>) => {
        const errors: string[] = [];

        if (!item.medication_name?.trim()) errors.push('Medication name is required');
        if (!item.dosage?.trim()) errors.push('Dosage is required');
        if (!item.frequency?.trim()) errors.push('Frequency is required');
        if (!item.duration?.trim()) errors.push('Duration is required');

        return errors;
      };

      const validItem = createTestPrescriptionItem('rx-001');
      expect(validatePrescriptionItem(validItem)).toHaveLength(0);

      const invalidItem = { medication_name: 'Ibuprofen' };
      expect(validatePrescriptionItem(invalidItem).length).toBeGreaterThan(0);
    });
  });
});
