import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateLabOrder } from '@/hooks/useLabOrders';
import { useCreatePrescription } from '@/hooks/usePrescriptions';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockHospital, mockProfile } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseClient } = await import('../mocks/supabase');
  return { supabase: mockSupabaseClient };
});

vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: vi.fn() }),
  WORKFLOW_EVENT_TYPES: {},
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('queue degradation compensating writes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('creates a workflow task when lab_queue is unavailable', async () => {
    const taskInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'lab-1',
            hospital_id: mockHospital.id,
            patient_id: 'patient-1',
            test_name: 'CBC',
          },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          error: { message: "relation 'lab_queue' does not exist" },
        }),
      })
      .mockReturnValueOnce({ insert: taskInsert })
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) });

    const { result } = renderHook(() => useCreateLabOrder(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        hospital_id: mockHospital.id,
        patient_id: 'patient-1',
        ordered_by: mockProfile.id,
        test_name: 'CBC',
        status: 'pending',
      } as any);
    });

    expect(taskInsert).toHaveBeenCalledWith(expect.objectContaining({
      workflow_type: 'lab_order',
      metadata: expect.objectContaining({ degraded_queue: 'lab_queue', lab_order_id: 'lab-1' }),
    }));
  });

  it('creates a workflow task when prescription_queue is unavailable', async () => {
    const taskInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from
      .mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'rx-1' },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({
          error: { message: "relation 'prescription_queue' does not exist" },
        }),
      })
      .mockReturnValueOnce({ insert: taskInsert });

    const { result } = renderHook(() => useCreatePrescription(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        patientId: 'patient-1',
        items: [{ medication_name: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7 days' }],
      });
    });

    expect(taskInsert).toHaveBeenCalledWith(expect.objectContaining({
      workflow_type: 'medication',
      metadata: expect.objectContaining({ degraded_queue: 'prescription_queue', prescription_id: 'rx-1' }),
    }));
  });
});
