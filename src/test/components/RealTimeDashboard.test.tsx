import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealTimeDashboard } from '@/components/admin/RealTimeDashboard';
import { AuthContext } from '@/contexts/AuthContext';

// Mock the hooks
vi.mock('@/hooks/useSystemMonitoring', () => ({
  useSystemMonitoring: vi.fn()
}));

vi.mock('@/hooks/useAutomatedAlerts', () => ({
  useAutomatedAlerts: () => ({
    activeAlerts: [],
    acknowledgeAlert: vi.fn(),
    isAcknowledging: false
  })
}));

// Import the mocked hook
import { useSystemMonitoring } from '@/hooks/useSystemMonitoring';

const mockUseSystemMonitoring = vi.mocked(useSystemMonitoring);

beforeEach(() => {
  mockUseSystemMonitoring.mockReturnValue({
    systemStatus: {
      overall_status: 'healthy',
      services: [
        { name: 'database', status: 'healthy', response_time: 50 },
        { name: 'api', status: 'healthy', response_time: 120 },
        { name: 'auth', status: 'healthy', response_time: 80 }
      ],
      metrics: {
        active_users: 25,
        response_time: 150,
        uptime: 99.9
      }
    },
    isLoading: false
  });
});

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
    // Mock loading state for this test
    vi.mocked(useSystemMonitoring).mockReturnValueOnce({
      systemStatus: null,
      isLoading: true
    });

    render(<RealTimeDashboard />, { wrapper: createWrapper() });
    // Check for the loading spinner by its animation class
    expect(screen.getByText('', { selector: '.animate-spin' })).toBeInTheDocument();
  });

  it('should render system health cards', async () => {
    render(<RealTimeDashboard />, { wrapper: createWrapper() });
    
    expect(await screen.findByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('API Performance')).toBeInTheDocument();
    expect(screen.getByText('Database Health')).toBeInTheDocument();
  });

  it('should display no alerts message when no alerts exist', async () => {
    render(<RealTimeDashboard />, { wrapper: createWrapper() });
    
    expect(await screen.findByText(/No active alerts/i)).toBeInTheDocument();
  });
});
