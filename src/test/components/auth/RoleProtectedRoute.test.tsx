import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => {
      mockNavigate(to);
      return <div data-testid="navigate">{to}</div>;
    },
  };
});

// Mock the useAuth hook
vi.mock('@/contexts/AuthContext', async () => {
  const actual = await vi.importActual('@/contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const renderWithAuth = (children: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

describe('RoleProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading when authentication is loading', () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      roles: [],
    });

    renderWithAuth(
      <RoleProtectedRoute allowedRoles={['doctor']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders children when user has required role', async () => {
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      roles: ['doctor'],
    });
    
    renderWithAuth(
      <RoleProtectedRoute allowedRoles={['doctor']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});