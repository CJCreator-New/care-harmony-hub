import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateLabOrderModal } from '@/components/lab/CreateLabOrderModal';
import { toast } from 'sonner';

const mockUseAuth = vi.fn();
const mockUsePatients = vi.fn();
const mockUseSearchPatients = vi.fn();
const mockMutateAsync = vi.fn();
const mockUseCreateLabOrder = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/usePatients', () => ({
  usePatients: (...args: unknown[]) => mockUsePatients(...args),
  useSearchPatients: (...args: unknown[]) => mockUseSearchPatients(...args),
}));

vi.mock('@/hooks/useLabOrders', () => ({
  useCreateLabOrder: () => mockUseCreateLabOrder(),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('CreateLabOrderModal Integration Tests', () => {
  const mockPatient = {
    id: 'p1',
    first_name: 'John',
    last_name: 'Doe',
    mrn: 'MRN-001',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();

    mockUseAuth.mockReturnValue({
      hospital: { id: 'hosp-1' },
      profile: { id: 'doctor-1' },
    });

    mockUsePatients.mockReturnValue({
      data: { patients: [mockPatient] },
      isLoading: false,
    });

    mockUseSearchPatients.mockReturnValue({
      data: [mockPatient],
      isLoading: false,
    });

    mockUseCreateLabOrder.mockReturnValue({
      mutateAsync: mockMutateAsync.mockResolvedValue({ id: 'lab-order-1' }),
      isPending: false,
    });
  });

  it('creates a lab order from selected patient and form values', async () => {
    const user = userEvent.setup();

    render(<CreateLabOrderModal open={true} onOpenChange={vi.fn()} />, { wrapper: Wrapper });

    await user.click(screen.getByText(/John Doe/i));
    await user.type(screen.getByPlaceholderText(/Complete Blood Count/i), 'CBC');
    await user.click(screen.getByRole('button', { name: /Create Lab Order/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        hospital_id: 'hosp-1',
        patient_id: 'p1',
        ordered_by: 'doctor-1',
        test_name: 'CBC',
        status: 'pending',
      })
    );

    expect(toast.success).toHaveBeenCalledWith(
      'Lab order created',
      expect.objectContaining({ description: expect.stringContaining('CBC') })
    );
  });

  it('does not submit when no patient is selected', async () => {
    const user = userEvent.setup();

    render(<CreateLabOrderModal open={true} onOpenChange={vi.fn()} />, { wrapper: Wrapper });

    await user.type(screen.getByPlaceholderText(/Complete Blood Count/i), 'CBC');
    await user.click(screen.getByRole('button', { name: /Create Lab Order/i }));

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText(/Please select a patient/i)).toBeInTheDocument();
  });
});
