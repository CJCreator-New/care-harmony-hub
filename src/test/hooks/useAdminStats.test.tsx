import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAdminStats, useStaffOverview } from '@/hooks/useAdminStats';
import { createMockAuthContext, mockHospital } from '../mocks/auth';

const { mockFrom, mockRpc, mockChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockChannel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, rpc: mockRpc, channel: mockChannel, removeChannel: vi.fn() },
}));

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/utils/sanitize', () => ({ devLog: vi.fn() }));

const makeChain = (overrides = {}) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
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

const mockStats = {
  totalPatients: 100, newPatientsThisMonth: 10, todayAppointments: 20,
  completedToday: 15, cancelledToday: 2, activeStaff: 8,
  staffByRole: { doctor: 3, nurse: 5 }, monthlyRevenue: 50000,
  pendingInvoices: 5, pendingAmount: 2500, avgWaitTime: 12,
  pendingPrescriptions: 3, pendingLabOrders: 4, queueWaiting: 6,
  queueInService: 2, bedOccupancy: 70, criticalLabOrders: 1,
};

describe('useAdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('returns loading state initially', () => {
    mockRpc.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(true);
  });

  it('fetches stats via RPC scoped to hospital_id', async () => {
    mockRpc.mockResolvedValueOnce({ data: mockStats, error: null });

    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith('get_dashboard_stats', { p_hospital_id: mockHospital.id });
    expect(result.current.data?.totalPatients).toBe(100);
  });

  it('returns default zeros on RPC error', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC error', code: 'PGRST202' } });

    const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.totalPatients).toBe(0);
    expect(result.current.data?.avgWaitTime).toBe(15);
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

    const staffChain = makeChain();
    staffChain.eq = vi.fn()
      .mockReturnValueOnce(staffChain)
      .mockResolvedValueOnce({ data: staffData, error: null });

    mockFrom
      .mockReturnValueOnce(staffChain)
      .mockReturnValueOnce(makeChain({ eq: vi.fn().mockResolvedValue({ data: rolesData, error: null }) }))
      .mockReturnValueOnce(makeChain({ gte: vi.fn().mockResolvedValue({ data: [], error: null }) }));

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
    mockFrom.mockReturnValue(makeChain({ eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }) }));

    const { result } = renderHook(() => useStaffOverview(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
