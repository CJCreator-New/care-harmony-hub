import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useConsultations, useConsultation, useCreateConsultation, useUpdateConsultation } from '@/hooks/useConsultations';
import { createMockAuthContext, mockProfile, mockHospital } from '../mocks/auth';

const { mockFrom, mockChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, rpc: vi.fn(), functions: { invoke: vi.fn() }, channel: mockChannel, removeChannel: vi.fn() },
}), { virtual: true });

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: vi.fn() }),
  WORKFLOW_EVENT_TYPES: { CONSULTATION_STARTED: 'consultation.started', CONSULTATION_COMPLETED: 'consultation.completed' },
}));

vi.mock('@/utils/rateLimitBackoff', () => ({
  executeWithRateLimitBackoff: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock('@/lib/queryColumns', () => ({
  CONSULTATION_COLUMNS: { detail: '*', detailWithoutHpi: '*' },
  PATIENT_COLUMNS: { detail: '*' },
}));

const makeChain = (overrides = {}) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockConsultation = {
  id: 'consult-1',
  hospital_id: mockHospital.id,
  patient_id: 'patient-1',
  doctor_id: mockProfile.id,
  status: 'patient_overview',
  current_step: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('useConsultations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('returns loading state initially', () => {
    mockFrom.mockReturnValue(makeChain());
    const { result } = renderHook(() => useConsultations(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches consultations scoped to hospital_id', async () => {
    const eqMock = vi.fn().mockReturnThis();
    mockFrom.mockReturnValue(makeChain({
      eq: eqMock,
      limit: vi.fn().mockResolvedValue({ data: [mockConsultation], error: null }),
    }));

    const { result } = renderHook(() => useConsultations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eqMock).toHaveBeenCalledWith('hospital_id', mockHospital.id);
    expect(result.current.data).toHaveLength(1);
  });

  it('handles Supabase error gracefully', async () => {
    mockFrom.mockReturnValue(makeChain({
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error', code: 'PGRST000' } }),
    }));

    const { result } = renderHook(() => useConsultations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('returns empty when no hospital_id', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => useConsultations(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

describe('useConsultation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('fetches single consultation by id', async () => {
    mockFrom.mockReturnValue(makeChain({
      maybeSingle: vi.fn().mockResolvedValue({ data: mockConsultation, error: null }),
    }));

    const { result } = renderHook(() => useConsultation('consult-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ id: 'consult-1' });
  });

  it('is disabled when no consultationId', () => {
    const { result } = renderHook(() => useConsultation(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateConsultation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('inserts consultation with hospital_id scoping', async () => {
    const insertMock = vi.fn().mockReturnThis();
    mockFrom
      .mockReturnValueOnce(makeChain({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }))
      .mockReturnValue(makeChain({
        insert: insertMock,
        single: vi.fn().mockResolvedValue({ data: mockConsultation, error: null }),
      }));

    const { result } = renderHook(() => useCreateConsultation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ patient_id: 'patient-1' });
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ hospital_id: mockHospital.id })
    );
  });

  it('throws when not authenticated', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null, profile: null }));
    const { result } = renderHook(() => useCreateConsultation(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync({ patient_id: 'patient-1' })).rejects.toThrow();
    });
  });
});

describe('useUpdateConsultation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('updates consultation by id', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    mockFrom.mockReturnValue(makeChain({
      update: updateMock,
      eq: eqMock,
      single: vi.fn().mockResolvedValue({ data: mockConsultation, error: null }),
    }));

    const { result } = renderHook(() => useUpdateConsultation(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 'consult-1', status: 'completed' as any });
    });

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(eqMock).toHaveBeenCalledWith('id', 'consult-1');
  });

  it('handles Supabase error on update', async () => {
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Update failed', code: 'PGRST000' } }),
    }));

    const { result } = renderHook(() => useUpdateConsultation(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(result.current.mutateAsync({ id: 'consult-1' })).rejects.toBeDefined();
    });
  });
});
