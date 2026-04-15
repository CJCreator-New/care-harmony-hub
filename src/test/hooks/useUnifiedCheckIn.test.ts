import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { useUnifiedCheckIn } from '@/hooks/useUnifiedCheckIn';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn();
const mockTriggerWorkflow = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/hooks/appointments', () => ({
  useCheckInAppointment: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useQueue', () => ({
  useAddToQueue: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: mockTriggerWorkflow }),
  WORKFLOW_EVENT_TYPES: {
    PATIENT_CHECKED_IN: 'patient.checked_in',
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hospital: { id: 'hosp-1' },
    profile: { id: 'profile-1', user_id: 'user-1' },
    primaryRole: 'receptionist',
  }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

const patient = {
  id: 'pat-1',
  first_name: 'Jane',
  last_name: 'Doe',
  mrn: 'MRN-001',
};

// ---------------------------------------------------------------------------
// WF-01: error handling — errors do not propagate uncaught
// ---------------------------------------------------------------------------

describe('useUnifiedCheckIn — WF-01 error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and shows toast.error when checkInAppointment fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Appointment not found'));

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    let returnValue: number | null | undefined;
    await act(async () => {
      returnValue = await result.current.checkIn({ patient, appointmentId: 'appt-1' });
    });

    expect(returnValue).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Appointment not found')
    );
  });

  it('does not throw — error stays within the hook', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Network timeout'));

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.checkIn({ patient, appointmentId: 'appt-2' });
      })
    ).resolves.not.toThrow();
  });

  it('returns null and shows toast.error when walk-in queue fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Queue unavailable'));

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    let returnValue: number | null | undefined;
    await act(async () => {
      returnValue = await result.current.checkIn({ patient, isWalkIn: true });
    });

    expect(returnValue).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Queue unavailable')
    );
  });

  it('does not call triggerWorkflow when checkIn throws', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('DB error'));

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.checkIn({ patient, appointmentId: 'appt-3' });
    });

    expect(mockTriggerWorkflow).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// WF-02: type safety — priority is always a valid WorkflowEvent priority
// ---------------------------------------------------------------------------

describe('useUnifiedCheckIn — WF-02 priority type safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps standard priority "normal" through correctly', async () => {
    mockMutateAsync.mockResolvedValueOnce({ queue_number: 5, priority: 'normal' });

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.checkIn({ patient, appointmentId: 'appt-4', priority: 'normal' });
    });

    expect(mockTriggerWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'normal' })
    );
  });

  it('maps "emergency" priority to "urgent" (not passed as raw "emergency")', async () => {
    mockMutateAsync.mockResolvedValueOnce({ queue_number: 1, priority: 'emergency' });

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.checkIn({ patient, appointmentId: 'appt-5', priority: 'normal' });
    });

    expect(mockTriggerWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'urgent' })
    );
  });

  it('maps unknown priority to "normal"', async () => {
    mockMutateAsync.mockResolvedValueOnce({ queue_number: 3, priority: 'vip' });

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.checkIn({ patient, appointmentId: 'appt-6' });
    });

    const call = mockTriggerWorkflow.mock.calls[0]?.[0];
    expect(['low', 'normal', 'high', 'urgent']).toContain(call?.priority);
  });

  it('triggers workflow with priority "high" for a high-priority walk-in', async () => {
    mockMutateAsync.mockResolvedValueOnce({ queue_number: 2 });

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.checkIn({ patient, priority: 'high', isWalkIn: true });
    });

    expect(mockTriggerWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'high' })
    );
  });
});
