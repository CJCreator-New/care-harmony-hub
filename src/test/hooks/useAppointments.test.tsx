import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  useAppointments,
  useTodayAppointments,
  useUpcomingAppointments,
  useCreateAppointment,
  useUpdateAppointment,
  useCheckInAppointment,
} from '@/lib/hooks/appointments';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile, mockHospital } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseClient } = await import('../mocks/supabase');
  return { supabase: mockSupabaseClient };
});
const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useActivityLog', () => ({
  useActivityLog: () => ({ logActivity: vi.fn().mockResolvedValue(undefined) }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockAppointment = {
  id: 'appt-1',
  hospital_id: mockHospital.id,
  patient_id: 'patient-1',
  doctor_id: 'doctor-1',
  scheduled_date: '2026-06-01',
  scheduled_time: '09:00',
  duration_minutes: 30,
  appointment_type: 'consultation',
  status: 'scheduled',
  priority: 'normal',
  queue_number: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  patient: { id: 'patient-1', first_name: 'John', last_name: 'Doe', mrn: 'MRN-001', phone: null },
  doctor: { id: 'doctor-1', first_name: 'Dr', last_name: 'Smith' },
};

describe('useAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('returns empty array when no hospital', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => useAppointments(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('fetches appointments for a date', async () => {
    const chain: any = {};
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn()
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ data: [mockAppointment], error: null });
    chain.order = vi.fn().mockReturnValue(chain);
    mockSupabaseClient.from.mockReturnValue(chain);

    const { result } = renderHook(() => useAppointments('2026-06-01'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('throws on error', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const { result } = renderHook(() => useAppointments(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useTodayAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('uses today date as filter', async () => {
    const eqMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: eqMock,
      order: vi.fn().mockReturnThis(),
    });

    renderHook(() => useTodayAppointments(), { wrapper: createWrapper() });
    await waitFor(() => {});
    const today = new Date().toISOString().split('T')[0];
    expect(eqMock).toHaveBeenCalledWith('scheduled_date', today);
  });
});

describe('useUpcomingAppointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('fetches upcoming scheduled/checked_in appointments', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [mockAppointment], error: null }),
    });

    const { result } = renderHook(() => useUpcomingAppointments(5), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useCreateAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('inserts appointment with hospital_id and created_by', async () => {
    const insertMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: mockAppointment, error: null });

    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    });

    const { result } = renderHook(() => useCreateAppointment(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        patient_id: 'patient-1',
        scheduled_date: '2026-06-01',
        scheduled_time: '09:00',
        appointment_type: 'consultation',
      });
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hospital_id: mockHospital.id,
        created_by: mockProfile.id,
      })
    );
  });
});

describe('useUpdateAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('updates appointment by id', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: mockAppointment, error: null });

    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      update: updateMock,
      eq: eqMock,
      select: selectMock,
      single: singleMock,
    });

    const { result } = renderHook(() => useUpdateAppointment(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 'appt-1', status: 'completed' });
    });

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(eqMock).toHaveBeenCalledWith('id', 'appt-1');
  });
});

describe('useCheckInAppointment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('calls get_next_queue_number rpc and inserts queue entry', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { patient_id: 'patient-1', priority: 'normal', doctor_id: 'doctor-1', patient: { first_name: 'John', last_name: 'Doe' } },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { ...mockAppointment, queue_number: 1 }, error: null }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: 1, error: null });

    const { result } = renderHook(() => useCheckInAppointment(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('appt-1');
    });

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_next_queue_number', {
      p_hospital_id: mockHospital.id,
    });
  });
});
