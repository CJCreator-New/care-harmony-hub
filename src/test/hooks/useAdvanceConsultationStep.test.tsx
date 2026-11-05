/**
 * Regression test for CLIN-26: completing a consultation threw
 * `ReferenceError: queryClient is not defined` inside onSuccess, so the
 * mutation was reported as failed, no success toast was shown and the
 * queue caches were never invalidated.
 */
import type { ReactNode } from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdvanceConsultationStep, CONSULTATION_STEPS } from '@/hooks/useConsultations';
import { createMockAuthContext } from '../mocks/auth';

const { mockFrom, mockToast } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
    rpc: vi.fn(),
    functions: { invoke: vi.fn() },
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

vi.mock('sonner', () => ({ toast: mockToast }));

vi.mock('@/hooks/useAudit', () => ({
  useAudit: () => ({ logActivity: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: vi.fn().mockResolvedValue(undefined) }),
  WORKFLOW_EVENT_TYPES: {
    CONSULTATION_STARTED: 'consultation.started',
    CONSULTATION_COMPLETED: 'consultation.completed',
  },
}));

vi.mock('@/utils/rateLimitBackoff', () => ({
  executeWithRateLimitBackoff: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

const completedConsultation = {
  id: 'consult-1',
  patient_id: 'patient-1',
  doctor_id: 'doctor-1',
  status: 'completed',
  current_step: CONSULTATION_STEPS.length + 1,
};

/** A thenable query-builder chain: every builder method returns itself. */
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'update', 'eq', 'in']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ error: null }).then(resolve);
  return chain;
}

describe('useAdvanceConsultationStep (CLIN-26)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(
      createMockAuthContext({ primaryRole: 'doctor', roles: ['doctor'] })
    );
    mockFrom.mockImplementation(() => makeChain({ data: completedConsultation, error: null }));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('completes the final step, shows success and invalidates the three queues', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useAdvanceConsultationStep(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        consultationId: 'consult-1',
        currentStep: CONSULTATION_STEPS.length,
      });
    });

    expect(result.current.isError).toBe(false);
    expect(mockToast.success).toHaveBeenCalledWith('Moved to next step');
    const keys = invalidateSpy.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([['queue'], ['patients-ready-for-doctor'], ['nurse-queue']])
    );
  });
});
