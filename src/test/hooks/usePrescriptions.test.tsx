import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  usePrescriptions,
  usePrescriptionStats,
  useCreatePrescription,
  useDispensePrescription,
} from '@/hooks/usePrescriptions';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile, mockHospital } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseClient } = await import('../mocks/supabase');
  return { supabase: mockSupabaseClient };
});
vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: vi.fn() }),
  WORKFLOW_EVENT_TYPES: {},
}));
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

beforeEach(() => {
  mockUseAuth.mockReturnValue(createMockAuthContext());
});

const mockPrescription = {
  id: 'rx-1',
  hospital_id: mockHospital.id,
  patient_id: 'patient-1',
  consultation_id: null,
  prescribed_by: mockProfile.id,
  status: 'pending',
  notes: null,
  dispensed_by: null,
  dispensed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  items: [],
};

describe('usePrescriptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no hospital', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => usePrescriptions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('fetches prescriptions with optional status filter', async () => {
    const chain: any = {};
    const eqMock = vi.fn()
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ data: [mockPrescription], error: null });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = eqMock;
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    mockSupabaseClient.from.mockReturnValue(chain);

    const { result } = renderHook(() => usePrescriptions('pending'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(eqMock).toHaveBeenCalledWith('status', 'pending');
  });

  it('throws on error', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const { result } = renderHook(() => usePrescriptions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('usePrescriptionStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pending/dispensed/today counts', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 3, error: null }),
    });

    const { result } = renderHook(() => usePrescriptionStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveProperty('pending');
    expect(result.current.data).toHaveProperty('dispensed');
    expect(result.current.data).toHaveProperty('today');
  });
});

describe('useCreatePrescription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts prescription, items, and queue entry', async () => {
    const rxInsertMock = vi.fn().mockReturnThis();
    const itemsInsertMock = vi.fn().mockResolvedValue({ error: null });
    const queueInsertMock = vi.fn().mockResolvedValue({ error: null });

    const rxChain: any = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockPrescription, error: null }),
    };
    rxChain.insert = rxInsertMock;
    const itemsChain = { insert: itemsInsertMock };
    const queueChain = { insert: queueInsertMock };
    mockSupabaseClient.from
      .mockReturnValueOnce(rxChain)
      .mockReturnValueOnce(itemsChain)
      .mockReturnValueOnce(queueChain);

    const { result } = renderHook(() => useCreatePrescription(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        patientId: 'patient-1',
        items: [
          { medication_name: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7 days' },
        ],
      });
    });

    expect(rxInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hospital_id: mockHospital.id,
        prescribed_by: mockProfile.id,
        status: 'pending',
      })
    );
    expect(itemsInsertMock).toHaveBeenCalled();
    expect(queueInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ hospital_id: mockHospital.id, status: 'queued' })
    );
  });

  it('throws when no hospital/profile context', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null, profile: null }));

    const { result } = renderHook(() => useCreatePrescription(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ patientId: 'p-1', items: [] })
      ).rejects.toThrow();
    });
  });
});

describe('useDispensePrescription', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates prescription status to dispensed and marks items dispensed', async () => {
    const rxUpdateMock = vi.fn().mockReturnThis();
    const itemsUpdateMock = vi.fn().mockReturnThis();
    const queueUpdateMock = vi.fn().mockReturnThis();

    const rxChain: any = { eq: vi.fn().mockResolvedValue({ error: null }) };
    rxChain.update = rxUpdateMock;
    const itemsChain: any = { eq: vi.fn().mockResolvedValue({ error: null }) };
    itemsChain.update = itemsUpdateMock;
    const queueChain: any = {};
    queueChain.eq = vi.fn()
      .mockReturnValueOnce(queueChain)
      .mockResolvedValueOnce({ error: null });
    queueChain.update = queueUpdateMock;
    mockSupabaseClient.from
      .mockReturnValueOnce(rxChain)
      .mockReturnValueOnce(itemsChain)
      .mockReturnValueOnce(queueChain);

    const { result } = renderHook(() => useDispensePrescription(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('rx-1');
    });

    expect(rxUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dispensed', dispensed_by: mockProfile.id })
    );
    expect(itemsUpdateMock).toHaveBeenCalledWith({ is_dispensed: true });
  });
});
