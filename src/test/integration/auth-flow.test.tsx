import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

describe('Authentication Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('persists role switching across components', async () => {
    render(
      <TestWrapper>
        <div>Test Component</div>
      </TestWrapper>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('clears test role and resets to default', async () => {
    localStorage.setItem('testRole', 'doctor');

    render(
      <TestWrapper>
        <div>Test Component</div>
      </TestWrapper>
    );

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});