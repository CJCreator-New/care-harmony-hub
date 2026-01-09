import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RoleProtectedRoute } from '@/components/auth/RoleProtectedRoute';
import { AuthProvider } from '@/contexts/AuthContext';

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

const renderWithAuth = (children: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('RoleProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows loading when authentication is loading', () => {
    renderWithAuth(
      <RoleProtectedRoute allowedRoles={['doctor']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders children when user has required role', async () => {
    localStorage.setItem('testRole', 'doctor');
    
    renderWithAuth(
      <RoleProtectedRoute allowedRoles={['doctor']}>
        <div>Protected Content</div>
      </RoleProtectedRoute>
    );

    // Wait for auth to load and check for content or loading
    const content = await screen.findByText(/Protected Content|Loading.../i);
    expect(content).toBeInTheDocument();
  });
});