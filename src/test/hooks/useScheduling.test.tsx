import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useResourceBookings, useWaitlistManagement, useInsuranceVerification } from '@/hooks/useScheduling';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

const makeChain = (overrides = {}) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  ...overrides,
});

describe('useResourceBookings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks for auto-fetch useEffect (loadBookings calls from twice)
    mockFrom
      .mockReturnValueOnce(makeChain({ lt: vi.fn().mockResolvedValue({ data: [], error: null }) }))
      .mockReturnValueOnce(makeChain({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }));
  });

  it('starts with empty state', async () => {
    const { result } = renderHook(() => useResourceBookings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookings).toEqual([]);
    expect(result.current.resources).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('creates a booking successfully', async () => {
    const mockBooking = { id: 'booking-1', resource_id: 'res-1', status: 'confirmed' };
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: mockBooking, error: null }),
    }));

    const { result } = renderHook(() => useResourceBookings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createBooking({ resource_id: 'res-1' });
    });

    expect(result.current.bookings).toHaveLength(1);
  });

  it('handles Supabase error on createBooking', async () => {
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }));

    const { result } = renderHook(() => useResourceBookings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await expect(result.current.createBooking({ resource_id: 'res-1' })).rejects.toBeDefined();
    });

    expect(result.current.error).toBe('Failed to create booking');
  });
});

describe('useWaitlistManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for auto-fetch useEffect (loadWaitlist calls order twice)
    mockFrom.mockReturnValue(makeChain({
      order: vi.fn().mockImplementation(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
    }));
  });

  it('starts with empty waitlist', async () => {
    const { result } = renderHook(() => useWaitlistManagement());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.waitlist).toEqual([]);
  });

  it('adds patient to waitlist', async () => {
    const mockEntry = { id: 'wait-1', patient_id: 'patient-1', status: 'waiting' };
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: mockEntry, error: null }),
    }));

    const { result } = renderHook(() => useWaitlistManagement());

    await act(async () => {
      await result.current.addToWaitlist({ patient_id: 'patient-1' });
    });

    expect(result.current.waitlist).toHaveLength(1);
  });

  it('removes patient from waitlist', async () => {
    mockFrom.mockReturnValue(makeChain({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));

    const { result } = renderHook(() => useWaitlistManagement());

    await act(async () => {
      await result.current.removeFromWaitlist('wait-1');
    });

    expect(result.current.waitlist).toEqual([]);
  });

  it('handles Supabase error on addToWaitlist', async () => {
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Waitlist error' } }),
    }));

    const { result } = renderHook(() => useWaitlistManagement());

    await act(async () => {
      await expect(result.current.addToWaitlist({ patient_id: 'patient-1' })).rejects.toBeDefined();
    });

    expect(result.current.error).toBe('Failed to add to waitlist');
  });
});

describe('useInsuranceVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for auto-fetch useEffect
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    }));
  });

  it('starts with null verification', async () => {
    const { result } = renderHook(() => useInsuranceVerification('patient-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.verification).toBeNull();
  });

  it('creates a verification record', async () => {
    const mockVerif = { id: 'verif-1', patient_id: 'patient-1', verification_status: 'verified' };
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: mockVerif, error: null }),
    }));

    const { result } = renderHook(() => useInsuranceVerification('patient-1'));

    await act(async () => {
      await result.current.createVerification({ patient_id: 'patient-1' });
    });

    expect(result.current.verification).toMatchObject({ verification_status: 'verified' });
  });

  it('handles Supabase error on createVerification', async () => {
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Verif failed' } }),
    }));

    const { result } = renderHook(() => useInsuranceVerification('patient-1'));

    await act(async () => {
      await expect(result.current.createVerification({ patient_id: 'patient-1' })).rejects.toBeDefined();
    });

    expect(result.current.error).toBe('Failed to create verification');
  });
});
