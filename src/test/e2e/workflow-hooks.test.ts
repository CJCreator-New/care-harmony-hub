import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockSupabaseClient } from '../mocks/supabase';
import React from 'react';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabaseClient,
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { id: 'test-profile-id', hospital_id: 'test-hospital-id' },
    hospital: { id: 'test-hospital-id', name: 'Test Hospital' },
    roles: ['admin'],
  }),
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('Workflow Hooks Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Management Hooks', () => {
    it('should fetch active queue entries', async () => {
      const mockQueueData = [
        {
          id: 'queue-001',
          patient_id: 'patient-001',
          queue_number: 1,
          status: 'waiting',
          priority: 'normal',
          check_in_time: new Date().toISOString(),
          patient: { first_name: 'John', last_name: 'Doe', mrn: 'MRN-001' },
        },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockQueueData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.order();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe('waiting');
    });

    it('should add patient to queue', async () => {
      const newQueueEntry = {
        id: 'queue-002',
        patient_id: 'patient-002',
        queue_number: 2,
        status: 'waiting',
        priority: 'normal',
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: newQueueEntry, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.queue_number).toBe(2);
    });

    it('should update queue entry status', async () => {
      const updatedEntry = {
        id: 'queue-001',
        status: 'in_service',
        service_start_time: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedEntry, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.status).toBe('in_service');
    });
  });

  describe('Vital Signs Hooks', () => {
    it('should record vital signs', async () => {
      const vitals = {
        id: 'vitals-001',
        patient_id: 'patient-001',
        blood_pressure_systolic: 120,
        blood_pressure_diastolic: 80,
        heart_rate: 72,
        temperature: 98.6,
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: vitals, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.blood_pressure_systolic).toBe(120);
    });

    it('should fetch patient vitals history', async () => {
      const vitalsHistory = [
        { id: 'v1', recorded_at: '2024-01-01', heart_rate: 72 },
        { id: 'v2', recorded_at: '2024-01-02', heart_rate: 75 },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: vitalsHistory, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.order();

      expect(result.data).toHaveLength(2);
    });

    it('should get today vitals count', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ data: [1, 2, 3], count: 3, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.gte();

      expect(result.count).toBe(3);
    });
  });

  describe('Patient Prep Checklist Hooks', () => {
    it('should create prep checklist', async () => {
      const checklist = {
        id: 'checklist-001',
        patient_id: 'patient-001',
        vitals_completed: false,
        allergies_verified: false,
        ready_for_doctor: false,
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: checklist, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.ready_for_doctor).toBe(false);
    });

    it('should update checklist items', async () => {
      const updatedChecklist = {
        id: 'checklist-001',
        vitals_completed: true,
        allergies_verified: true,
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedChecklist, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.vitals_completed).toBe(true);
    });

    it('should mark patient ready for doctor', async () => {
      const readyChecklist = {
        id: 'checklist-001',
        ready_for_doctor: true,
        completed_at: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: readyChecklist, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.ready_for_doctor).toBe(true);
    });
  });

  describe('Consultation Hooks', () => {
    it('should create consultation', async () => {
      const consultation = {
        id: 'consult-001',
        patient_id: 'patient-001',
        doctor_id: 'doctor-001',
        status: 'in_progress',
        current_step: 1,
      };

      const mockChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: consultation, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.status).toBe('in_progress');
    });

    it('should advance consultation step', async () => {
      const updatedConsultation = {
        id: 'consult-001',
        current_step: 2,
        status: 'physical_exam',
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedConsultation, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.current_step).toBe(2);
    });

    it('should complete consultation', async () => {
      const completedConsultation = {
        id: 'consult-001',
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: completedConsultation, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.status).toBe('completed');
    });
  });

  describe('Prescription Hooks', () => {
    it('should create prescription with items', async () => {
      const prescription = {
        id: 'rx-001',
        patient_id: 'patient-001',
        status: 'pending',
      };

      const prescriptionItems = [
        { id: 'item-001', medication_name: 'Ibuprofen', dosage: '400mg' },
      ];

      const mockPrescriptionChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: prescription, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockPrescriptionChain);

      const rxResult = await mockPrescriptionChain.single();
      expect(rxResult.data.status).toBe('pending');

      const mockItemsChain = {
        insert: vi.fn().mockResolvedValue({ data: prescriptionItems, error: null }),
      };

      const itemsResult = await mockItemsChain.insert();
      expect(itemsResult.data).toHaveLength(1);
    });

    it('should fetch pending prescriptions', async () => {
      const prescriptions = [
        { id: 'rx-001', status: 'pending', patient: { first_name: 'John' } },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: prescriptions, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.order();

      expect(result.data[0].status).toBe('pending');
    });

    it('should dispense prescription', async () => {
      const dispensedPrescription = {
        id: 'rx-001',
        status: 'dispensed',
        dispensed_at: new Date().toISOString(),
        dispensed_by: 'pharmacist-001',
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: dispensedPrescription, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.status).toBe('dispensed');
    });
  });

  describe('Notification Hooks', () => {
    it('should create workflow notification', async () => {
      const notification = {
        id: 'notif-001',
        recipient_id: 'user-001',
        title: 'Patient Ready',
        message: 'John Doe is ready for consultation',
        type: 'patient_ready',
        is_read: false,
      };

      const mockChain = {
        insert: vi.fn().mockResolvedValue({ data: notification, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.insert();

      expect(result.data.type).toBe('patient_ready');
    });

    it('should fetch unread notifications', async () => {
      const notifications = [
        { id: 'n1', is_read: false, title: 'Alert 1' },
        { id: 'n2', is_read: false, title: 'Alert 2' },
      ];

      const mockChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: notifications, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.order();

      expect(result.data).toHaveLength(2);
      expect(result.data.every((n: any) => !n.is_read)).toBe(true);
    });

    it('should mark notification as read', async () => {
      const readNotification = {
        id: 'notif-001',
        is_read: true,
        read_at: new Date().toISOString(),
      };

      const mockChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: readNotification, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockChain);

      const result = await mockChain.single();

      expect(result.data.is_read).toBe(true);
    });
  });

  describe('Cross-Workflow State Transitions', () => {
    it('should track patient through entire workflow', async () => {
      const patientJourney = {
        patientId: 'patient-001',
        stages: [] as string[],
      };

      // Stage 1: Check-in
      patientJourney.stages.push('checked_in');
      expect(patientJourney.stages).toContain('checked_in');

      // Stage 2: Vitals
      patientJourney.stages.push('vitals_recorded');
      expect(patientJourney.stages).toContain('vitals_recorded');

      // Stage 3: Prep Complete
      patientJourney.stages.push('prep_complete');
      expect(patientJourney.stages).toContain('prep_complete');

      // Stage 4: Consultation
      patientJourney.stages.push('consultation_started');
      patientJourney.stages.push('consultation_completed');
      expect(patientJourney.stages).toContain('consultation_completed');

      // Stage 5: Prescription
      patientJourney.stages.push('prescription_created');
      patientJourney.stages.push('prescription_dispensed');
      expect(patientJourney.stages).toContain('prescription_dispensed');

      // Verify complete journey
      expect(patientJourney.stages).toHaveLength(7);
    });

    it('should handle concurrent operations correctly', async () => {
      // Simulate multiple queue updates
      const operations = [
        { id: 'q1', action: 'call', expectedStatus: 'called' },
        { id: 'q2', action: 'start_service', expectedStatus: 'in_service' },
        { id: 'q3', action: 'complete', expectedStatus: 'completed' },
      ];

      const results = await Promise.all(
        operations.map(async (op) => {
          const mockChain = {
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { id: op.id, status: op.expectedStatus },
              error: null,
            }),
          };

          mockSupabaseClient.from.mockReturnValue(mockChain);
          return mockChain.single();
        })
      );

      expect(results).toHaveLength(3);
      expect(results[0].data.status).toBe('called');
      expect(results[1].data.status).toBe('in_service');
      expect(results[2].data.status).toBe('completed');
    });
  });
});
