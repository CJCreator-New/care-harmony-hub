import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUnifiedCheckIn } from '@/hooks/useUnifiedCheckIn';

const mockCheckInAppointment = {
  mutateAsync: vi.fn(),
  isPending: false,
};

const mockAddToQueue = {
  mutateAsync: vi.fn(),
  isPending: false,
};

const mockTriggerWorkflow = vi.fn();
const toastError = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAppointments', () => ({
  useCheckInAppointment: () => mockCheckInAppointment,
}));

vi.mock('@/hooks/useQueue', () => ({
  useAddToQueue: () => mockAddToQueue,
}));

vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: mockTriggerWorkflow }),
  WORKFLOW_EVENT_TYPES: { PATIENT_CHECKED_IN: 'patient.checked_in' },
}));

vi.mock('sonner', () => ({
  toast: { error: toastError },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useUnifiedCheckIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and shows toast when appointment check-in fails', async () => {
    mockCheckInAppointment.mutateAsync.mockRejectedValueOnce({ message: 'Check-in failed' });

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    let response: number | null = 123;
    await act(async () => {
      response = await result.current.checkIn({
        patient: { id: 'patient-1', first_name: 'Jane', last_name: 'Doe' },
        appointmentId: 'appt-1',
      });
    });

    expect(response).toBeNull();
    expect(toastError).toHaveBeenCalledWith('Failed to check in patient: Check-in failed');
    expect(mockTriggerWorkflow).not.toHaveBeenCalled();
  });

  it('narrows emergency walk-in priority to urgent workflow priority', async () => {
    mockAddToQueue.mutateAsync.mockResolvedValueOnce({ queue_number: 42 });

    const { result } = renderHook(() => useUnifiedCheckIn(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.checkIn({
        patient: { id: 'patient-1', first_name: 'Jane', last_name: 'Doe' },
        priority: 'emergency',
        isWalkIn: true,
      });
    });

    expect(mockTriggerWorkflow).toHaveBeenCalledWith(expect.objectContaining({
      priority: 'urgent',
    }));
  });
});
