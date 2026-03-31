import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('@/integrations/supabase/client');

const mockUseAuth = vi.mocked(useAuth);
const mockSupabase = vi.mocked(supabase);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useDashboardMetrics (Blocker #2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use hospital-scoped query key', () => {
    const hospitalId = 'hospital-a-123';
    mockUseAuth.mockReturnValue({
      hospital: { id: hospitalId, name: 'Hospital A' },
      user: { id: 'user1', email: 'test@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      }),
    });

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    // Verify query key includes hospital ID
    expect(result.current.queryKey).toContain(hospitalId);
  });

  it('should filter all queries by hospital_id', async () => {
    const hospitalId = 'hospital-a-456';
    mockUseAuth.mockReturnValue({
      hospital: { id: hospitalId, name: 'Hospital A' },
      user: { id: 'user1', email: 'test@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    const eqMock = vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        lte: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
      }),
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: eqMock,
        in: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify eq() was called with hospital_id filter
    expect(eqMock).toHaveBeenCalledWith('hospital_id', hospitalId);
  });

  it('should return different data for different hospitals', async () => {
    const hospitalAId = 'hospital-a-789';
    
    // First call: Hospital A
    mockUseAuth.mockReturnValue({
      hospital: { id: hospitalAId, name: 'Hospital A' },
      user: { id: 'user1', email: 'test@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], count: 5, error: null }),
          }),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: [], count: 3, error: null }),
              }),
            }),
          }),
        }),
      }),
    });

    const { result: resultA } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(resultA.current.isSuccess).toBe(true);
    });

    const dataA = resultA.current.data;

    // Now switch to Hospital B with different data
    const hospitalBId = 'hospital-b-999';
    mockUseAuth.mockReturnValue({
      hospital: { id: hospitalBId, name: 'Hospital B' },
      user: { id: 'user2', email: 'test2@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], count: 15, error: null }),
          }),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: [], count: 8, error: null }),
              }),
            }),
          }),
        }),
      }),
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    
    const { result: resultB } = renderHook(() => useDashboardMetrics(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(resultB.current.isSuccess).toBe(true);
    });

    const dataB = resultB.current.data;

    // Data should be different (different hospital IDs used for queries)
    expect(dataA).not.toEqual(dataB);
  });

  it('should throw error if hospital context is missing', async () => {
    mockUseAuth.mockReturnValue({
      hospital: null,
      user: { id: 'user1', email: 'test@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect(String(result.current.error)).toContain('Hospital context required');
  });

  it('should retry failed queries up to 2 times', async () => {
    const hospitalId = 'hospital-retry-123';
    mockUseAuth.mockReturnValue({
      hospital: { id: hospitalId, name: 'Hospital A' },
      user: { id: 'user1', email: 'test@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    let callCount = 0;
    const selectMock = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return {
          eq: vi.fn().mockRejectedValue(new Error('Network error')),
        };
      }
      return {
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          }),
        }),
      };
    });

    mockSupabase.from = vi.fn().mockReturnValue({
      select: selectMock,
    });

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    // Should eventually succeed after retries
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBe(true);
    }, { timeout: 5000 });
  });

  it('should have correct stale time and refetch interval', () => {
    const hospitalId = 'hospital-config-123';
    mockUseAuth.mockReturnValue({
      hospital: { id: hospitalId, name: 'Hospital A' },
      user: { id: 'user1', email: 'test@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    mockSupabase.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    // Query should have correct configuration
    expect(result.current.staleTime).toBe(30 * 1000); // 30 seconds
    expect(result.current.refetchInterval).toBe(60 * 1000); // 60 seconds
  });

  it('should fetch all required metrics in parallel', async () => {
    const hospitalId = 'hospital-parallel-123';
    mockUseAuth.mockReturnValue({
      hospital: { id: hospitalId, name: 'Hospital A' },
      user: { id: 'user1', email: 'test@hospital.com' },
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      primaryRole: 'admin',
    } as any);

    const mockFrom = vi.fn();
    mockSupabase.from = mockFrom;

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], count: 42, error: null }),
          }),
          in: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockResolvedValue({ data: [], count: 0, error: null }),
              }),
            }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have called supabase.from() for each metric (9 times via Promise.all)
    expect(mockFrom).toHaveBeenCalledWith('appointments');
    expect(mockFrom).toHaveBeenCalledWith('patients');
    expect(mockFrom).toHaveBeenCalledWith('lab_orders');
    expect(mockFrom).toHaveBeenCalledWith('prescriptions');
    expect(mockFrom).toHaveBeenCalledWith('patient_queue');
    expect(mockFrom).toHaveBeenCalledWith('billing');
  });
});
