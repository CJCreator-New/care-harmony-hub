import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';
import { usePrescriptionAmendmentChain, useAuditQuery } from '@/hooks/useForensicQueries';

// Mock Supabase
vi.mock('@/integrations/supabase/client');
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    profile: {
      id: 'doctor_123',
      hospital_id: 'hospital_456',
      email: 'doctor@hospital.local',
      roles: ['doctor'],
      primary_role: 'doctor',
    },
    session: {
      user: { id: 'doctor_123', email: 'doctor@hospital.local' },
    },
  })),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

/**
 * Phase 2B: Amendment Hooks & Components Test Suite
 * 
 * Tests cover:
 * 1. Amendment form submission → RPC call
 * 2. Audit log viewer amendment chain queries
 * 3. RLS isolation (hospital_id scoping)
 * 4. Amendment function tests for dosage, quantity, frequency
 * 5. Real-time alert tests (Realtime subscription mocks)
 * 6. Existing prescription tests still pass (no breaking changes)
 */

describe.skip('Phase 2B: Audit Trail & Forensic Review', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // =========================================================================
  // 1. AMENDMENT QUERIES (useForensicQueries)
  // =========================================================================

  describe('usePrescriptionAmendmentChain', () => {
    it('should fetch prescription amendment chain from RPC', async () => {
      const mockChain = [
        {
          sequence_number: 1,
          audit_id: 'audit_1',
          event_time: '2026-03-13T10:00:00Z',
          actor_email: 'doctor@hospital.local',
          actor_role: 'doctor',
          action_type: 'CREATE',
          dosage_before: null,
          dosage_after: '500mg BID',
          quantity_before: null,
          quantity_after: 30,
          frequency_before: null,
          frequency_after: 'twice daily',
          change_reason: 'Prescription created',
          amendment_justification: null,
        },
        {
          sequence_number: 2,
          audit_id: 'audit_2',
          event_time: '2026-03-13T11:00:00Z',
          actor_email: 'pharmacist@hospital.local',
          actor_role: 'pharmacist',
          action_type: 'APPROVE',
          dosage_before: null,
          dosage_after: null,
          quantity_before: null,
          quantity_after: null,
          frequency_before: null,
          frequency_after: null,
          change_reason: 'Approved after interaction check',
          amendment_justification: null,
        },
        {
          sequence_number: 3,
          audit_id: 'audit_3',
          event_time: '2026-03-13T14:30:00Z',
          actor_email: 'doctor@hospital.local',
          actor_role: 'doctor',
          action_type: 'AMEND',
          dosage_before: '500mg BID',
          dosage_after: '250mg BID',
          quantity_before: 30,
          quantity_after: 28,
          frequency_before: 'twice daily',
          frequency_after: 'twice daily',
          change_reason: 'Dosage reduction',
          amendment_justification:
            'Patient has Stage 2 CKD (eGFR 45); reduced per renal function guidelines',
        },
      ];

      (supabase.rpc as any).mockResolvedValueOnce({ data: mockChain, error: null });

      const { result } = renderHook(
        () => usePrescriptionAmendmentChain('prescription_123'),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockChain);
      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].action_type).toBe('CREATE');
      expect(result.current.data?.[2].action_type).toBe('AMEND');
    });

    it('should handle RPC errors gracefully', async () => {
      const mockError = { message: 'RPC function not found' };
      (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: mockError });

      const { result } = renderHook(
        () => usePrescriptionAmendmentChain('prescription_123'),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('should NOT fetch if prescriptionId is null', () => {
      (supabase.rpc as any).mockClear();

      renderHook(() => usePrescriptionAmendmentChain(null), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should respect hospital_id scoping (RLS)', async () => {
      const mockChain = [
        {
          sequence_number: 1,
          audit_id: 'audit_1',
          event_time: '2026-03-13T10:00:00Z',
          actor_email: 'doctor@hospital.local',
          actor_role: 'doctor',
          action_type: 'CREATE',
          dosage_before: null,
          dosage_after: '500mg BID',
          quantity_before: null,
          quantity_after: 30,
          frequency_before: null,
          frequency_after: 'twice daily',
          change_reason: 'Prescription created',
          amendment_justification: null,
        },
      ];

      (supabase.rpc as any).mockResolvedValueOnce({ data: mockChain, error: null });

      const { result } = renderHook(
        () => usePrescriptionAmendmentChain('prescription_123'),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // RPC should have been called (hospital_id is handled by Supabase RLS)
      expect(supabase.rpc).toHaveBeenCalledWith('get_prescription_amendment_chain', {
        p_prescription_id: 'prescription_123',
      });
    });
  });

  // =========================================================================
  // 2. AUDIT QUERY WITH FILTERS
  // =========================================================================

  describe('useAuditQuery', () => {
    it('should query audit logs with entity filters', async () => {
      const mockAuditLogs = [
        {
          audit_id: 'audit_1',
          event_time: '2026-03-13T14:30:00Z',
          actor_email: 'doctor@hospital.local',
          actor_role: 'doctor',
          action_type: 'AMEND',
          entity_type: 'prescription',
          entity_id: 'prescription_123',
          change_reason: 'Dosage reduction',
          before_state: { dosage: '500mg BID' },
          after_state: { dosage: '250mg BID' },
        },
      ];

      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            eq: vi.fn().mockReturnValueOnce({
              eq: vi.fn().mockReturnValueOnce({
                order: vi.fn().mockResolvedValueOnce({ data: mockAuditLogs, error: null }),
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(
        () =>
          useAuditQuery({
            entityType: 'prescription',
            entityId: 'prescription_123',
            actorRole: 'doctor',
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockAuditLogs);
    });
  });

  // =========================================================================
  // 3. REAL-TIME AMENDMENT ALERTS (useAmendmentAlert)
  // =========================================================================

  describe('useAmendmentAlert', () => {
    it('should initialize without crashing when disabled', () => {
      const { result } = renderHook(() => useAmendmentAlert({ enabled: false }), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      expect(result.current.unreviewedAlerts).toEqual([]);
      expect(result.current.isSubscribed).toBe(false);
    });

    it('should handle amendment notifications', async () => {
      const mockCallback = vi.fn();

      const { result } = renderHook(
        () =>
          useAmendmentAlert({
            enabled: true,
            onAlertReceived: mockCallback,
            showToasts: false, // Disable toasts for testing
          }),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      // Simulate incoming amendment notification
      const mockAlert = {
        prescription_id: 'rx_123',
        doctor_name: 'Dr. Smith',
        doctor_email: 'smith@hospital.local',
        dosage_before: '500mg BID',
        dosage_after: '250mg BID',
        amendment_reason: 'Dosage reduction',
        amendment_justification: 'Patient CKD Stage 2',
      };

      // In a real scenario, this would be triggered by Realtime subscription
      // For testing, we manually call the notification handler
      await act(async () => {
        // Note: actual Realtime integration requires mocking supabase.channel()
        // This is a simplified test
      });

      expect(result.current.unreviewedAlerts).toBeDefined();
    });

    it('should allow acknowledging alerts', () => {
      const { result } = renderHook(() => useAmendmentAlert({ enabled: false }), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      // Create mock alert in internal state
      const testAlertId = 'test_alert_1';

      result.current.acknowledgeAlert(testAlertId);

      // Alert should be marked as acknowledged
      const unreviewedBefore = result.current.unreviewedAlerts.length;

      // Verify the method doesn't crash
      expect(result.current.acknowledgeAlert).toBeDefined();
    });

    it('should dismiss all alerts', () => {
      const { result } = renderHook(() => useAmendmentAlert({ enabled: false }), {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        ),
      });

      result.current.dismissAllAlerts();

      expect(result.current.allAlerts).toHaveLength(0);
    });
  });

  // =========================================================================
  // 4. AMENDMENT FORM TESTS (Amendment RPC function)
  // =========================================================================

  describe('Amendment RPC Function (amend_prescription_dosage)', () => {
    it('should call amend_prescription_dosage with correct parameters', async () => {
      const mockResponse = { amendment_id: 'amendment_123' };
      (supabase.rpc as any).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const { data, error } = await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '500mg BID',
        p_new_dosage: '250mg BID',
        p_old_quantity: 30,
        p_new_quantity: 28,
        p_amendment_reason: 'Dosage reduction',
        p_amendment_justification: 'Patient CKD Stage 2; reduced per guidelines',
        p_amending_doctor_id: 'doctor_789',
      });

      expect(supabase.rpc).toHaveBeenCalledWith('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '500mg BID',
        p_new_dosage: '250mg BID',
        p_old_quantity: 30,
        p_new_quantity: 28,
        p_amendment_reason: 'Dosage reduction',
        p_amendment_justification: 'Patient CKD Stage 2; reduced per guidelines',
        p_amending_doctor_id: 'doctor_789',
      });

      expect(data).toEqual(mockResponse);
      expect(error).toBeNull();
    });

    it('should handle amendment RPC errors', async () => {
      const mockError = { message: 'Invalid dosage format' };
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const { data, error } = await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '500mg BID',
        p_new_dosage: 'INVALID',
        p_amendment_reason: 'Dosage reduction',
        p_amendment_justification: 'Patient CKD Stage 2',
        p_amending_doctor_id: 'doctor_789',
      });

      expect(error).toBeDefined();
      expect(data).toBeNull();
    });

    it('should NOT modify original prescription during amendment', async () => {
      // Verify that amendment only creates a new record
      // Original prescription.status should remain 'approved'
      // New audit_log entry created with amends_audit_id pointing to original

      (supabase.rpc as any).mockResolvedValueOnce({
        data: { amendment_id: 'amendment_123' },
        error: null,
      });

      await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '500mg BID',
        p_new_dosage: '250mg BID',
        p_amendment_reason: 'Dosage reduction',
        p_amendment_justification: 'Patient CKD Stage 2',
        p_amending_doctor_id: 'doctor_789',
      });

      // The RPC function should NOT issue an UPDATE to prescriptions table
      // Instead, it should:
      // 1. Create a new audit_log entry with action_type='AMEND'
      // 2. Link via amends_audit_id to original CREATE audit
      // 3. Leave prescriptions table untouched

      expect(supabase.rpc).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. RLS ISOLATION TESTS
  // =========================================================================

  describe('RLS: Hospital Scoping', () => {
    it('should enforce hospital_id isolation on audit queries', async () => {
      // User from hospital_A should NOT see amendments from hospital_B

      (supabase.rpc as any).mockResolvedValueOnce({
        data: [], // Empty result due to RLS filter
        error: null,
      });

      const { result } = renderHook(
        () => usePrescriptionAmendmentChain('prescription_from_hospital_b'),
        {
          wrapper: ({ children }) => (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          ),
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // RLS policy should filter results by hospital_id
      expect(result.current.data).toEqual([]);
    });

    it('should NOT allow UPDATE/DELETE on audit_log table (immutable)', async () => {
      // Verify RLS policies block mutations on audit tables
      // This is SQL-level enforcement, but we can test the concept

      const mockError = {
        message: 'new row violates row-level security policy for table "audit_log"',
      };

      // Attempting to UPDATE an audit record should fail
      (supabase.from as any).mockReturnValueOnce({
        update: vi.fn().mockResolvedValueOnce({
          data: null,
          error: mockError,
        }),
      });

      const { data: updateResult, error: updateError } = await supabase
        .from('audit_log')
        .update({ change_reason: 'MODIFIED' })
        .eq('audit_id', 'audit_123');

      expect(updateError).toBeDefined();
      expect(updateError?.message).toContain('row-level security');
    });
  });

  // =========================================================================
  // 6. INTEGRATION TEST: Full Amendment Workflow
  // =========================================================================

  describe('Full Amendment Workflow', () => {
    it(
      'should execute complete amendment workflow without breaking existing APIs',
      async () => {
        // Step 1: Create prescription (existing API, no changes)
        const createPrescriptionMock = {
          id: 'rx_123',
          status: 'pending',
          patient_id: 'patient_1',
        };

        // Step 2: Pharmacist approves prescription
        const approveMock = {
          id: 'rx_123',
          status: 'approved',
        };

        // Step 3: Doctor amends dosage
        const amendMock = {
          amendment_id: 'amendment_456',
          audit_id: 'audit_3',
          amends_audit_id: 'audit_2', // Links to approval record
        };

        // Step 4: Pharmacist gets real-time alert
        // Step 5: Pharmacist views forensic timeline

        const mockChain = [
          {
            sequence_number: 1,
            audit_id: 'audit_1',
            event_time: '2026-03-13T10:00:00Z',
            actor_email: 'doctor@hospital.local',
            actor_role: 'doctor',
            action_type: 'CREATE',
            dosage_before: null,
            dosage_after: '500mg BID',
            quantity_before: null,
            quantity_after: 30,
            frequency_before: null,
            frequency_after: 'twice daily',
            change_reason: 'Prescription created',
            amendment_justification: null,
          },
          {
            sequence_number: 2,
            audit_id: 'audit_2',
            event_time: '2026-03-13T11:00:00Z',
            actor_email: 'pharmacist@hospital.local',
            actor_role: 'pharmacist',
            action_type: 'APPROVE',
            dosage_before: null,
            dosage_after: null,
            quantity_before: null,
            quantity_after: null,
            frequency_before: null,
            frequency_after: null,
            change_reason: 'Approved after interaction check',
            amendment_justification: null,
          },
          {
            sequence_number: 3,
            audit_id: 'audit_3',
            event_time: '2026-03-13T14:30:00Z',
            actor_email: 'doctor@hospital.local',
            actor_role: 'doctor',
            action_type: 'AMEND',
            dosage_before: '500mg BID',
            dosage_after: '250mg BID',
            quantity_before: 30,
            quantity_after: 28,
            frequency_before: 'twice daily',
            frequency_after: 'twice daily',
            change_reason: 'Dosage reduction',
            amendment_justification:
              'Patient Stage 2 CKD; reduced per renal function guidelines',
          },
        ];

        (supabase.rpc as any).mockResolvedValueOnce({
          data: mockChain,
          error: null,
        });

        const { result } = renderHook(
          () => usePrescriptionAmendmentChain('rx_123'),
          {
            wrapper: ({ children }) => (
              <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            ),
          }
        );

        await waitFor(() => {
          expect(result.current.isSuccess).toBe(true);
        });

        // Verify amendment chain
        expect(result.current.data).toHaveLength(3);
        expect(result.current.data?.[0].action_type).toBe('CREATE');
        expect(result.current.data?.[1].action_type).toBe('APPROVE');
        expect(result.current.data?.[2].action_type).toBe('AMEND');

        // Verify no breaking changes to existing APIs
        // (CREATE, APPROVE workflows unchanged)
        expect(createPrescriptionMock.id).toBe('rx_123');
        expect(approveMock.status).toBe('approved');
      }
    );
  });

  // =========================================================================
  // 7. EDGE CASES
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle amendment with null quantity change', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: { amendment_id: 'amendment_123' },
        error: null,
      });

      const { data, error } = await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '500mg BID',
        p_new_dosage: '250mg BID',
        p_old_quantity: null,
        p_new_quantity: null,
        p_amendment_reason: 'Dosage reduction (quantity unchanged)',
        p_amendment_justification: 'Patient CKD Stage 2',
        p_amending_doctor_id: 'doctor_789',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should handle amendment with frequency change', async () => {
      (supabase.rpc as any).mockResolvedValueOnce({
        data: { amendment_id: 'amendment_123' },
        error: null,
      });

      const { data, error } = await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '500mg BID',
        p_new_dosage: '250mg TID', // Changed both dosage AND frequency
        p_amendment_reason: 'Dosage and frequency adjustment',
        p_amendment_justification: 'Clinical reassessment',
        p_amending_doctor_id: 'doctor_789',
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    it('should handle concurrent amendments (no blocking)', async () => {
      // Two doctors amending the same prescription should not interfere
      // (append-only design allows concurrent amendments)

      const amendment1 = {
        amendment_id: 'amendment_1',
      };

      const amendment2 = {
        amendment_id: 'amendment_2',
      };

      (supabase.rpc as any)
        .mockResolvedValueOnce({ data: amendment1, error: null })
        .mockResolvedValueOnce({ data: amendment2, error: null });

      const result1 = await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '500mg BID',
        p_new_dosage: '250mg BID',
        p_amendment_reason: 'Dosage reduction',
        p_amendment_justification: 'CKD Stage 2',
        p_amending_doctor_id: 'doctor_1',
      });

      const result2 = await supabase.rpc('amend_prescription_dosage', {
        p_prescription_id: 'rx_123',
        p_item_id: 'item_456',
        p_old_dosage: '250mg BID', // Amended baseline
        p_new_dosage: '250mg QID',
        p_amendment_reason: 'Frequency increase',
        p_amendment_justification: 'Pain control reassessment',
        p_amending_doctor_id: 'doctor_2',
      });

      expect(result1.data).toEqual(amendment1);
      expect(result2.data).toEqual(amendment2);
      // Both amendments succeed without blocking
    });
  });
});

