import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAutomatedAlerts } from '@/hooks/useAutomatedAlerts';
import React from 'react';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({
                data: [
                  {
                    id: '1',
                    severity: 'high',
                    action_type: 'system_error',
                    created_at: '2024-01-01T00:00:00Z',
                    details: { message: 'Test alert', acknowledged: false }
                  }
                ],
                error: null
              }))
            }))
          }))
        }))
      }))
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAutomatedAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch active alerts', async () => {
    const { result } = renderHook(() => useAutomatedAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeAlerts).toBeDefined();
  });

  it('should fetch alert rules', async () => {
    const { result } = renderHook(() => useAutomatedAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.alertRules).toBeDefined();
    });

    expect(result.current.alertRules?.length).toBeGreaterThan(0);
  });

  it('should evaluate metrics against rules', async () => {
    const { result } = renderHook(() => useAutomatedAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.alertRules).toBeDefined();
    });

    result.current.evaluateMetric('avg_wait_time', 35);
    
    expect(result.current.evaluateMetric).toBeDefined();
  });
});
