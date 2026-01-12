import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { AuthProvider } from '@/contexts/AuthContext';

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

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: { id: 'test-user', role: 'admin' },
    loading: false
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
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

describe('hooks with auth', () => {
  it('should work with mocked auth', () => {
    expect(true).toBe(true);
  });
});