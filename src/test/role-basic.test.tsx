import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';

// Mock the AuthContext
const mockAuthContext = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock hasAnyRole
vi.mock('@/hooks/usePermissions', () => ({
  hasAnyRole: vi.fn(),
}));

import { hasAnyRole } from '@/hooks/usePermissions';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

describe('Week 3: Basic Role Testing', () => {
  it('should allow access when hasAnyRole returns true', () => {
    mockAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      roles: ['admin'],
      user: { id: '1', email: 'test@test.com' },
      hospital: { id: '1', name: 'Test Hospital' },
    });

    (hasAnyRole as any).mockReturnValue(true);

    render(
      <RoleProtectedRoute allowedRoles={['admin']}>
        <div>Admin Content</div>
      </RoleProtectedRoute>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });

  it('should deny access when hasAnyRole returns false', () => {
    mockAuthContext.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      roles: ['patient'],
      user: { id: '1', email: 'test@test.com' },
      hospital: { id: '1', name: 'Test Hospital' },
    });

    (hasAnyRole as any).mockReturnValue(false);

    render(
      <RoleProtectedRoute allowedRoles={['admin']}>
        <div>Admin Content</div>
      </RoleProtectedRoute>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
  });
});