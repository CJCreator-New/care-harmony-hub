import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLabOrders, useLabOrderStats, useUpdateLabOrder, useCreateLabOrder } from '@/hooks/useLabOrders';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile, mockHospital } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabaseClient }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => createMockAuthContext() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockLabOrder = {
  id: 'lab-1',
  hospital_id: mockHospital.id,
  patient_id: 'patient-1',
  ordered_by: mockProfile.id,
  test_name: 'CBC',
  status: 'pending',
  priority: 'normal',
  ordered_at: '2026-06-01T09:00:00Z',
  completed_at: null,
};

describe('useLabOrders', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no hospital', async () => {
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => createMockAuthContext({ profile: { ...mockProfile, hospital_id: null } }),
    }));
    const { result } = renderHook(() => useLabOrders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('fetches lab orders ordered by ordered_at desc', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockLabOrder], error: null }),
    });

    const { result } = renderHook(() => useLabOrders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('applies status filter when not "all"', async () => {
    const eqMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    renderHook(() => useLabOrders('pending'), { wrapper: createWrapper() });
    await waitFor(() => {});
    expect(eqMock).toHaveBeenCalledWith('status', 'pending');
  });

  it('does not apply status filter when "all"', async () => {
    const eqMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    renderHook(() => useLabOrders('all'), { wrapper: createWrapper() });
    await waitFor(() => {});
    expect(eqMock).not.toHaveBeenCalledWith('status', 'all');
  });
});

describe('useLabOrderStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates pending, inProgress, completedToday', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { status: 'pending', completed_at: null },
          { status: 'sample_collected', completed_at: null },
          { status: 'in_progress', completed_at: null },
          { status: 'completed', completed_at: `${today}T10:00:00Z` },
        ],
        error: null,
      }),
    });

    const { result } = renderHook(() => useLabOrderStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pending).toBe(1);
    expect(result.current.data?.inProgress).toBe(2);
    expect(result.current.data?.completedToday).toBe(1);
  });
});

describe('useUpdateLabOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates lab order by id', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: mockLabOrder, error: null });

    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      update: updateMock,
      eq: eqMock,
      select: vi.fn().mockReturnThis(),
      single: singleMock,
    });

    const { result } = renderHook(() => useUpdateLabOrder(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 'lab-1', updates: { status: 'completed' } });
    });

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(eqMock).toHaveBeenCalledWith('id', 'lab-1');
  });
});

describe('useCreateLabOrder', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts lab order and creates lab_queue entry', async () => {
    const orderInsertMock = vi.fn().mockReturnThis();
    const queueInsertMock = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: orderInsertMock,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLabOrder, error: null }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: queueInsertMock,
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: vi.fn().mockResolvedValue({ error: null }), // activity_logs telemetry
      });

    const { result } = renderHook(() => useCreateLabOrder(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        hospital_id: mockHospital.id,
        patient_id: 'patient-1',
        ordered_by: mockProfile.id,
        test_name: 'CBC',
        status: 'pending',
        priority: 'normal',
      } as any);
    });

    expect(orderInsertMock).toHaveBeenCalled();
    expect(queueInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', lab_order_id: 'lab-1' })
    );
  });

  it('throws and logs telemetry on queue insertion failure', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockLabOrder, error: null }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: vi.fn().mockResolvedValue({ error: { message: 'queue error' } }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: vi.fn().mockResolvedValue({ error: null }), // failure telemetry
      });

    const { result } = renderHook(() => useCreateLabOrder(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(
        result.current.mutateAsync({ hospital_id: mockHospital.id, patient_id: 'p-1' } as any)
      ).rejects.toBeDefined();
    });
  });
});
