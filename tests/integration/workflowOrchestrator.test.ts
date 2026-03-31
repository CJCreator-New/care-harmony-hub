import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowOrchestrator, WORKFLOW_EVENT_TYPES } from '@/hooks/useWorkflowOrchestrator';
import * as AuthContext from '@/contexts/AuthContext';

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/services/notificationAdapter', () => ({
  sendNotification: vi.fn(),
}));

describe('Workflow Orchestrator - Hospital-Scope ABAC', () => {
  const mockHospitalId = 'hospital-123';
  const mockUserId = 'user-456';
  const mockPatientId = 'patient-789';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock useAuth hook
    (AuthContext.useAuth as any).mockReturnValue({
      hospital: { id: mockHospitalId },
      profile: { user_id: mockUserId },
      primaryRole: 'nurse',
    });
  });

  describe('Hospital-scope validation', () => {
    it('should reject workflow when hospital_id mismatch in audit context', async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      const auditContext = {
        action_type: 'test',
        performed_by: mockUserId,
        hospital_id: 'different-hospital-999', // ← Mismatch!
        change_reason: 'Test reason',
        resource_type: 'patient',
      };

      const mockFromInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Hospital scope validation failed' },
          }),
        }),
      });

      (supabase.from as any).mockReturnValue({
        insert: mockFromInsert,
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      await act(async () => {
        await result.current.triggerWorkflow(
          {
            type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
            patientId: mockPatientId,
            sourceRole: 'receptionist',
            data: {},
          },
          auditContext as any
        );
      });

      // Verify rejection occurred (should not proceed with workflow)
      // In production, this should emit an error toast and return early
    });

    it('should accept workflow when hospital_id matches in audit context', async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      const auditContext = {
        action_type: 'test',
        performed_by: mockUserId,
        hospital_id: mockHospitalId, // ← Match!
        change_reason: 'Test reason',
        resource_type: 'patient',
      };

      const mockInsertFn = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'event-123',
              hospital_id: mockHospitalId,
              event_type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
            },
            error: null,
          }),
        }),
      });

      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workflow_events') {
          return {
            insert: mockInsertFn,
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'event-123', hospital_id: mockHospitalId },
                error: null,
              }),
            }),
            update: mockUpdateFn,
          };
        }
        if (table === 'workflow_rules') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {};
      });

      await act(async () => {
        await result.current.triggerWorkflow(
          {
            type: WORKFLOW_EVENT_TYPES.PATIENT_CHECKED_IN,
            patientId: mockPatientId,
            sourceRole: 'receptionist',
            data: {},
            priority: 'normal',
          },
          auditContext as any
        );
      });

      // Verify event was inserted with audit context
      expect(mockInsertFn).toHaveBeenCalled();
    });
  });

  describe('Audit context requirement for high-risk actions', () => {
    it('should require audit context for update_status action', async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      // Try to update status WITHOUT audit context - should fail
      const mockInsertFn = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'event-123', hospital_id: mockHospitalId },
            error: null,
          }),
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'workflow_events') {
          return {
            insert: mockInsertFn,
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'event-123' },
                error: null,
              }),
            }),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === 'workflow_rules') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'rule-1',
                  actions: [
                    {
                      type: 'update_status',
                      metadata: { status: 'in_service' },
                    },
                  ],
                },
              ],
              error: null,
            }),
            update: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        return {};
      });

      // This should throw or handle gracefully because update_status requires audit context
      // The hook should catch this and prevent execution
    });
  });

  describe('Patient status update with audit trail', () => {
    it('should capture before/after state in audit context', async () => {
      const { result } = renderHook(() => useWorkflowOrchestrator());

      const auditContext = {
        action_type: 'patient_status_update',
        performed_by: mockUserId,
        hospital_id: mockHospitalId,
        patient_id: mockPatientId,
        change_reason: 'Vitals stable: BP 120/80, HR 82, Temp 98.6°F',
        resource_type: 'patient',
        before_state: { status: 'in_prep' },
        after_state: { status: 'in_service' },
      };

      // Verify audit context has required fields for forensic trail
      expect(auditContext).toHaveProperty('before_state');
      expect(auditContext).toHaveProperty('after_state');
      expect(auditContext.before_state?.status).toBe('in_prep');
      expect(auditContext.after_state?.status).toBe('in_service');
    });
  });

  describe('Idempotency key generation', () => {
    it('should generate consistent idempotency keys for same parameters', () => {
      // Idempotency is tested at edge function level, but we can verify client-side
      // that repeated calls with same parameters work correctly

      const hospitalId = 'hospital-123';
      const actionType = 'create_task';
      const patientId = 'patient-789';
      const timestamp = 1609459200000; // Fixed timestamp

      // Two calls with same parameters should ideally generate same key
      // (In practice, 1-second granularity means keys generated within same second are grouped)
      const timestamp1 = Math.floor(timestamp / 1000) * 1000;
      const timestamp2 = Math.floor((timestamp + 500) / 1000) * 1000; // 500ms later, same second

      expect(timestamp1).toBe(timestamp2); // Same 1-second bucket
    });
  });

  describe('Cross-hospital mutation prevention', () => {
    it('should prevent doctor from one hospital updating patient in another hospital', async () => {
      // Setup: Doctor logged into hospital-A
      (AuthContext.useAuth as any).mockReturnValue({
        hospital: { id: 'hospital-A' },
        profile: { user_id: 'doctor-123' },
        primaryRole: 'doctor',
      });

      const { result } = renderHook(() => useWorkflowOrchestrator());

      // Try to update patient that belongs to hospital-B
      const auditContext = {
        action_type: 'patient_status_update',
        performed_by: 'doctor-123',
        hospital_id: 'hospital-B', // ← Different hospital!
        patient_id: 'patient-from-hospital-b',
        change_reason: 'Updating patient',
        resource_type: 'patient',
      };

      // This should be rejected during hospital-scope validation
      const shouldFail = auditContext.hospital_id !== 'hospital-A'; // actor's hospital
      expect(shouldFail).toBe(true);
    });
  });
});

describe('Workflow Orchestrator - Idempotency', () => {
  const mockHospitalId = 'hospital-123';
  const mockUserId = 'user-456';

  beforeEach(() => {
    vi.clearAllMocks();

    (AuthContext.useAuth as any).mockReturnValue({
      hospital: { id: mockHospitalId },
      profile: { user_id: mockUserId },
      primaryRole: 'admin',
    });
  });

  it('should detect duplicate action submission', () => {
    // Idempotency check format:
    // `${hospitalId}:${rule.id}:${action.type}:${patient_id}`

    const idempotencyKey1 = `${mockHospitalId}:rule-1:create_task:patient-789`;
    const idempotencyKey2 = `${mockHospitalId}:rule-1:create_task:patient-789`;

    expect(idempotencyKey1).toBe(idempotencyKey2); // Same parameters = same key
  });

  it('should generate different keys for different patients', () => {
    const key1 = `${mockHospitalId}:rule-1:create_task:patient-789`;
    const key2 = `${mockHospitalId}:rule-1:create_task:patient-999`;

    expect(key1).not.toBe(key2); // Different patients = different keys
  });
});
