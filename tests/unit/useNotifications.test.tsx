import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useNotifications } from '@/hooks/useNotifications';
import { mockSupabaseClient } from '../../src/test/mocks/supabase';
import { createMockAuthContext, mockHospital } from '../../src/test/mocks/auth';

vi.mock('@/integrations/supabase/client', async () => {
  const { mockSupabaseClient } = await import('../../src/test/mocks/supabase');
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

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(createMockAuthContext());
  });

  it('returns sendNotification and helpers', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });
    expect(typeof result.current.sendNotification).toBe('function');
    expect(typeof result.current.sendAppointmentReminder).toBe('function');
    expect(typeof result.current.sendPrescriptionReady).toBe('function');
    expect(typeof result.current.sendLabResults).toBe('function');
    expect(typeof result.current.sendInvoiceNotification).toBe('function');
    expect(typeof result.current.sendCustomNotification).toBe('function');
  });

  it('isLoading is false initially', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });
    expect(result.current.isLoading).toBe(false);
  });

  it('invokes edge function with hospital name on sendNotification', async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValueOnce({ data: { success: true }, error: null });

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendNotificationAsync({
        type: 'custom',
        recipientEmail: 'patient@test.com',
        recipientName: 'Test Patient',
        data: { customSubject: 'Hello', customMessage: 'World' },
      });
    });

    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        body: expect.objectContaining({ hospitalName: mockHospital.name }),
      })
    );
  });

  it('throws when hospital context is missing', async () => {
    mockUseAuth.mockReturnValue(createMockAuthContext({ hospital: null }));
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(
        result.current.sendNotificationAsync({
          type: 'custom',
          recipientEmail: 'x@x.com',
          recipientName: 'X',
        })
      ).rejects.toThrow('Hospital context not available');
    });
  });

  it('handles Supabase function error', async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Function error' },
    });

    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await expect(
        result.current.sendNotificationAsync({
          type: 'appointment_reminder',
          recipientEmail: 'p@test.com',
          recipientName: 'Patient',
        })
      ).rejects.toBeDefined();
    });
  });

  it('sendAppointmentReminder passes correct type', async () => {
    mockSupabaseClient.functions.invoke.mockResolvedValueOnce({ data: {}, error: null });
    const { result } = renderHook(() => useNotifications(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.sendAppointmentReminder('p@test.com', 'Patient', '2026-06-01', '09:00', 'Dr. Smith');
    });

    expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        body: expect.objectContaining({ type: 'appointment_reminder' }),
      })
    );
  });
});
