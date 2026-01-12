import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealTimeDashboard } from '@/components/admin/RealTimeDashboard';
import { AuthContext } from '@/contexts/AuthContext';

const mockAuthContext = {
  user: { id: 'test-user-id', email: 'admin@test.com' },
  profile: { first_name: 'Admin', last_name: 'User' },
  hospital: { id: 'test-hospital', name: 'Test Hospital' },
  primaryRole: 'admin',
  roles: ['admin'],
  loading: false,
  signOut: vi.fn(),
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContext}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AuthContext.Provider>
  );
};

describe('RealTimeDashboard', () => {
  it('should render loading state initially', () => {
    render(<RealTimeDashboard />, { wrapper: createWrapper() });
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should render system health cards', async () => {
    render(<RealTimeDashboard />, { wrapper: createWrapper() });
    
    expect(await screen.findByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    expect(screen.getByText('API Performance')).toBeInTheDocument();
    expect(screen.getByText('Database Health')).toBeInTheDocument();
  });

  it('should display no alerts message when no alerts exist', async () => {
    render(<RealTimeDashboard />, { wrapper: createWrapper() });
    
    expect(await screen.findByText(/No active alerts/i)).toBeInTheDocument();
  });
});
