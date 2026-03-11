import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDischargeWorkflow } from '@/hooks/useDischargeWorkflow';

const mockInvoke = vi.fn();
const mockRemoveChannel = vi.fn();
const mockSubscribe = vi.fn();
const mockOn = vi.fn();
const mockChannel = { on: mockOn, subscribe: mockSubscribe };

const createQueueBuilder = (rows: unknown[]) => {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(async () => ({ data: rows, error: null })),
    single: vi.fn(async () => ({ data: rows[0] ?? null, error: null })),
  };
  return builder;
};

const mockFrom = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hospital: { id: 'test-hospital-id' },
    user: { id: 'test-user-id' },
    primaryRole: 'pharmacist',
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    channel: vi.fn(() => mockChannel),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDischargeWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOn.mockReturnValue(mockChannel);
    mockSubscribe.mockReturnValue(mockChannel);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'discharge_workflows') {
        return createQueueBuilder([
          {
            id: 'workflow-1',
            hospital_id: 'test-hospital-id',
            patient_id: 'patient-1',
            current_step: 'pharmacist',
            status: 'in_progress',
            rejection_reason: null,
            updated_at: '2026-03-11T10:00:00.000Z',
          },
        ]);
      }

      if (table === 'discharge_workflow_audit') {
        return createQueueBuilder([]);
      }

      return createQueueBuilder([]);
    });
  });

  it('submits approve action through the discharge workflow edge function', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    const { result } = renderHook(() => useDischargeWorkflow(undefined, 'pharmacist'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.myQueue).toHaveLength(1);
    });

    await act(async () => {
      await result.current.approveStep({ workflowId: 'workflow-1' });
    });

    expect(mockInvoke).toHaveBeenCalledWith('discharge-workflow', {
      body: {
        action: 'approve',
        workflowId: 'workflow-1',
        patientId: undefined,
        consultationId: undefined,
        reason: undefined,
        metadata: undefined,
      },
    });
  });

  it('submits reject action with reason through the discharge workflow edge function', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    const { result } = renderHook(() => useDischargeWorkflow(undefined, 'billing'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.myQueue).toHaveLength(1);
    });

    await act(async () => {
      await result.current.rejectStep({ workflowId: 'workflow-1', reason: 'Invoice mismatch' });
    });

    expect(mockInvoke).toHaveBeenCalledWith('discharge-workflow', {
      body: {
        action: 'reject',
        workflowId: 'workflow-1',
        patientId: undefined,
        consultationId: undefined,
        reason: 'Invoice mismatch',
        metadata: undefined,
      },
    });
  });
});
