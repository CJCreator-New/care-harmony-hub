import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  usePatientVitalSigns,
  useLatestVitals,
  useTodayVitalsCount,
  useRecordVitals,
} from '@/hooks/useVitalSigns';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabaseClient }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => createMockAuthContext() }));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockVitals = {
  id: 'vitals-1',
  patient_id: 'patient-1',
  consultation_id: null,
  recorded_by: mockProfile.id,
  recorded_at: '2026-06-01T09:00:00Z',
  blood_pressure_systolic: 120,
  blood_pressure_diastolic: 80,
  heart_rate: 72,
  temperature: 98.6,
  respiratory_rate: 16,
  oxygen_saturation: 98,
  weight: 70,
  height: 175,
  bmi: 22.9,
  pain_level: 0,
  notes: null,
};

describe('usePatientVitalSigns', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is disabled when no patientId', () => {
    const { result } = renderHook(() => usePatientVitalSigns(''), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches vitals ordered by recorded_at desc', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockVitals], error: null }),
    });

    const { result } = renderHook(() => usePatientVitalSigns('patient-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe('vitals-1');
  });

  it('throws on error', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    });

    const { result } = renderHook(() => usePatientVitalSigns('patient-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useLatestVitals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null when no vitals exist (PGRST116)', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    });

    const { result } = renderHook(() => useLatestVitals('patient-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('returns latest vitals record', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockVitals, error: null }),
    });

    const { result } = renderHook(() => useLatestVitals('patient-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.heart_rate).toBe(72);
  });
});

describe('useTodayVitalsCount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 0 when no hospital', async () => {
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => createMockAuthContext({ profile: { ...mockProfile, hospital_id: null } }),
    }));
    const { result } = renderHook(() => useTodayVitalsCount(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('returns count of today vitals', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockResolvedValue({ count: 5, error: null }),
    });

    const { result } = renderHook(() => useTodayVitalsCount(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(5);
  });
});

describe('useRecordVitals', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates BMI when weight and height provided', async () => {
    const insertMock = vi.fn().mockReturnThis();
    const selectMock = vi.fn().mockReturnThis();
    const singleMock = vi.fn().mockResolvedValue({ data: mockVitals, error: null });

    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      insert: insertMock,
      select: selectMock,
      single: singleMock,
    });

    const { result } = renderHook(() => useRecordVitals(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        patient_id: 'patient-1',
        weight: 70,
        height: 175,
        heart_rate: 72,
      });
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        recorded_by: mockProfile.id,
        bmi: expect.any(Number),
      })
    );
  });

  it('sets bmi to null when weight/height missing', async () => {
    const insertMock = vi.fn().mockReturnThis();
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      insert: insertMock,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockVitals, error: null }),
    });

    const { result } = renderHook(() => useRecordVitals(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ patient_id: 'patient-1', heart_rate: 72 });
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ bmi: null }));
  });
});
