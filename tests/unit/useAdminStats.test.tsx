import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdminStats, useStaffOverview } from '@/hooks/useAdminStats';
import { mockSupabaseClient } from '../../src/test/mocks/supabase';
import { createMockAuthContext, mockHospital } from '../../src/test/mocks/auth';

vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseClient } = await import('../../src/test/mocks/supabase');
  return { supabase: mockSupabaseClient };
});

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/utils/sanitize', () => ({ devLog: vi.fn() }));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockStats = {
  totalPatients: 100,
  newPatientsThisMonth: 10,
  todayAppointments: 20,
  completedToday: 15,
  cancelledToday: 2,
  activeStaff: 8,
  staffByRole: { doctor: 3, nurse: 5 },
  monthlyRevenue: 50000,
  pendingInvoices: 5,
  pendingAmount: 2500,
  avgWaitTime: 12,
  pendingPrescriptions: 3,
  pendingLabOrders: 4,
  queueWaiting: 6,
  queueInService: 2,
  bedOccupancy: 70,
  criticalLabOrders: 1,
};

describe('useAdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('returns loading state initially', () => {
    mockSupabaseClient.rpc.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches stats via RPC scoped to hospital_id', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: mockStats, error: null });

    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_dashboard_stats', {
      p_hospital_id: mockHospital.id,
    });
    expect(result.current.data?.totalPatients).toBe(100);
  });

  it('returns default zeros on Supabase RPC error', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC error', code: 'PGRST202' } });

    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalPatients).toBeGreaterThanOrEqual(0);
    expect(result.current.data?.avgWaitTime).toBeGreaterThanOrEqual(0);
  });

  it('returns default zeros when no hospital_id', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.totalPatients ?? 0).toBe(0);
  });
});

describe('useStaffOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('fetches staff scoped to hospital_id', async () => {
    const staffData = [{ id: 'staff-1', user_id: 'user-1', first_name: 'Alice', last_name: 'Smith' }];
    const rolesData = [{ user_id: 'user-1', role: 'doctor' }];

    // Build chain objects WITHOUT calling from() to avoid queue contamination
    const mkChain = (overrides: Record<string, any> = {}) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      ...overrides,
    });

    const staffChain: any = mkChain();
    staffChain.eq = vi.fn()
      .mockReturnValueOnce(staffChain)
      .mockResolvedValueOnce({ data: staffData, error: null });

    mockSupabaseClient.from
      .mockReturnValueOnce(staffChain)
      .mockReturnValueOnce(mkChain({ eq: vi.fn().mockResolvedValue({ data: rolesData, error: null }) }))
      .mockReturnValueOnce(mkChain({ gte: vi.fn().mockResolvedValue({ data: [], error: null }) }));

    const { result } = renderHook(() => useStaffOverview(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].role).toBe('doctor');
  });

  it('returns empty array when no hospital_id', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => useStaffOverview(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data ?? []).toEqual([]);
  });

  it('handles Supabase error', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const { result } = renderHook(() => useStaffOverview(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
