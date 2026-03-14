import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateLabOrderModal } from '@/components/lab/CreateLabOrderModal';

vi.mock('@/hooks/useLabOrders', () => ({
  useCreateLabOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/usePatients', () => ({
  usePatients: () => ({ data: { patients: [] }, isLoading: false }),
  useSearchPatients: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ hospital: { id: 'hosp-1' }, profile: { id: 'user-1' } }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('CreateLabOrderModal Component', () => {
  it('renders base form fields when open', () => {
    render(<CreateLabOrderModal open={true} onOpenChange={vi.fn()} />, { wrapper: Wrapper });

    expect(screen.getByText(/new lab order/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/complete blood count/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create lab order/i })).toBeInTheDocument();
  });
});
