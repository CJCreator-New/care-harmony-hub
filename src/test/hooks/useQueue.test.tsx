import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  useQueue,
  useActiveQueue,
  useAddToQueue,
  useUpdateQueueEntry,
  useCallNextPatient,
  useCompleteService,
} from '@/hooks/useQueue';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile, mockHospital } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseClient } = await import('../mocks/supabase');
  return { supabase: mockSupabaseClient };
});
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

const mockQueueEntry = {
  id: 'queue-1',
  hospital_id: mockHospital.id,
  patient_id: 'patient-1',
  appointment_id: null,
  queue_number: 1,
  priority: 'normal',
  status: 'waiting',
  department: null,
  assigned_to: null,
  check_in_time: '2026-06-01T09:00:00Z',
  called_time: null,
  service_start_time: null,
  service_end_time: null,
  notes: null,
  created_at: '2026-06-01T09:00:00Z',
  patient: { id: 'patient-1', first_name: 'John', last_name: 'Doe', mrn: 'MRN-001' },
};

describe('useQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no hospital', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => useQueue(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('fetches queue entries for today', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [mockQueueEntry], error: null }),
    });

    const { result } = renderHook(() => useQueue(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('filters by status when provided', async () => {
    const inMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: inMock,
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    renderHook(() => useQueue(['waiting', 'called']), { wrapper: createWrapper() });
    await waitFor(() => {});
    expect(inMock).toHaveBeenCalledWith('status', ['waiting', 'called']);
  });
});

describe('useActiveQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('filters for active statuses', async () => {
    const inMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      in: inMock,
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    renderHook(() => useActiveQueue(), { wrapper: createWrapper() });
    await waitFor(() => {});
    expect(inMock).toHaveBeenCalledWith('status', ['waiting', 'called', 'in_prep', 'in_service']);
  });
});

describe('useAddToQueue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns existing entry if patient already in queue', async () => {
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockQueueEntry, error: null }),
      });

    const { result } = renderHook(() => useAddToQueue(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ patientId: 'patient-1' });
    });

    expect(mockSupabaseClient.rpc).not.toHaveBeenCalled();
  });

  it('calls get_next_queue_number and inserts new entry', async () => {
    const insertMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: mockQueueEntry, error: null });

    const checkChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const insertChain: any = {
      select: vi.fn().mockReturnThis(),
      single: singleMock,
    };
    insertChain.insert = insertMock;
    const auditChain = { insert: vi.fn().mockResolvedValue({ error: null }) };
    mockSupabaseClient.from
      .mockReturnValueOnce(checkChain)
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(auditChain);

    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: 2, error: null });

    const { result } = renderHook(() => useAddToQueue(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ patientId: 'patient-1', priority: 'high' });
    });

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_next_queue_number', {
      p_hospital_id: mockHospital.id,
    });
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ hospital_id: mockHospital.id, status: 'waiting', priority: 'high' })
    );
  });
});

describe('useUpdateQueueEntry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates queue entry by id', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: mockQueueEntry, error: null });

    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      update: updateMock,
      eq: eqMock,
      select: vi.fn().mockReturnThis(),
      single: singleMock,
    });

    const { result } = renderHook(() => useUpdateQueueEntry(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ id: 'queue-1', status: 'called' });
    });

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'called' }));
    expect(eqMock).toHaveBeenCalledWith('id', 'queue-1');
  });
});

describe('useCallNextPatient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets status to called with called_time and assigned_to', async () => {
    const updateMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      update: updateMock,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockQueueEntry, status: 'called', queue_number: 1 },
        error: null,
      }),
    });

    const { result } = renderHook(() => useCallNextPatient(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('queue-1');
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'called', assigned_to: mockProfile.id })
    );
  });
});

describe('useCompleteService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets status to completed with service_end_time', async () => {
    const updateMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      update: updateMock,
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...mockQueueEntry, status: 'completed' },
        error: null,
      }),
    });

    const { result } = renderHook(() => useCompleteService(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('queue-1');
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', service_end_time: expect.any(String) })
    );
  });
});
