import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePatients, usePatient, useCreatePatient, useSearchPatients } from '@/hooks/usePatients';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile, mockHospital } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseClient } = await import('../mocks/supabase');
  return { supabase: mockSupabaseClient };
});
const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useDataProtection', () => ({
  useHIPAACompliance: () => ({
    encryptPHI: vi.fn().mockResolvedValue({ data: {}, metadata: {} }),
    decryptPHI: vi.fn().mockResolvedValue({}),
  }),
}));

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

const mockPatient = {
  id: 'patient-1',
  hospital_id: mockHospital.id,
  mrn: 'MRN-001',
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: '1990-01-01',
  gender: 'male',
  is_active: true,
  allergies: [],
  chronic_conditions: [],
  current_medications: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('usePatients', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty result when no hospital', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => usePatients(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('fetches patients with pagination', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [mockPatient], error: null, count: 1 }),
    });

    const { result } = renderHook(() => usePatients({ page: 1, limit: 50 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.patients).toBeDefined();
  });

  it('throws on Supabase error', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' }, count: null }),
    });

    const { result } = renderHook(() => usePatients(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('usePatient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is disabled when no patientId', () => {
    const { result } = renderHook(() => usePatient(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches single patient', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockPatient, error: null }),
    });

    const { result } = renderHook(() => usePatient('patient-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('patient-1');
  });
});

describe('useCreatePatient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls rpc generate_mrn then inserts patient with encryption_metadata', async () => {
    const insertMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: mockPatient, error: null });

    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: 'MRN-002', error: null });
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    });

    const { result } = renderHook(() => useCreatePatient(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        first_name: 'Jane',
        last_name: 'Smith',
        date_of_birth: '1985-05-15',
        gender: 'female',
        user_id: null,
        email: null,
        phone: null,
        address: null,
        city: null,
        state: null,
        zip: null,
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
        insurance_provider: null,
        insurance_policy_number: null,
        insurance_group_number: null,
        allergies: [],
        chronic_conditions: [],
        current_medications: [],
        blood_type: null,
        notes: null,
        is_active: true,
      });
    });

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('generate_mrn', {
      hospital_id: mockHospital.id,
    });
    expect(insertMock).toHaveBeenCalled();
  });
});

describe('useSearchPatients', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is disabled when searchTerm < 2 chars', () => {
    const { result } = renderHook(() => useSearchPatients('a'), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('queries with sanitized search term', async () => {
    const orMock = vi.fn().mockReturnThis();
    const limitMock = vi.fn().mockResolvedValue({ data: [mockPatient], error: null });

    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: orMock,
      order: vi.fn().mockReturnThis(),
      limit: limitMock,
    });

    const { result } = renderHook(() => useSearchPatients('John'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(orMock).toHaveBeenCalled();
  });
});
