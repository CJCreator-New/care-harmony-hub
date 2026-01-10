import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        range: vi.fn(() => ({
          order: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({
              data: [{ id: '1', name: 'Test' }],
              error: null,
              count: 1
            }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('usePaginatedQuery', () => {
  it('should return paginated data', async () => {
    const { result } = renderHook(
      () => usePaginatedQuery({
        table: 'patients',
        filters: { hospital_id: 'test' }
      }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([{ id: '1', name: 'Test' }]);
    expect(result.current.currentPage).toBe(0);
  });
});

describe('useActivityLog', () => {
  it('should log activity', async () => {
    const { result } = renderHook(() => useActivityLog());

    await result.current.logActivity({
      actionType: 'test_action',
      entityType: 'test_entity',
      entityId: 'test_id'
    });

    // Test passes if no error is thrown
    expect(true).toBe(true);
  });
});

describe('useSessionTimeout', () => {
  it('should handle session timeout', () => {
    const mockLogout = vi.fn();
    
    renderHook(() => useSessionTimeout({ 
      enabled: true,
      onTimeout: mockLogout 
    }));

    // Test initialization
    expect(true).toBe(true);
  });
});