import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitalSignsForm } from '@/components/nurse/VitalSignsForm';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/ui/micro-interactions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/micro-interactions')>();
  return {
    ...actual,
    Toast: vi.fn(() => null),
  };
});

const mockAuthValue = {
  profile: { id: 'nurse-1', hospital_id: 'hosp-1' },
  hospital: { id: 'hosp-1', name: 'Test Hospital' },
  primaryRole: 'nurse',
  signOut: vi.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={mockAuthValue}>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('VitalSignsForm', () => {
  const baseProps = {
    patientId: 'patient-123',
    patientName: 'John Doe',
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form header and patient name', () => {
    renderWithProviders(<VitalSignsForm {...baseProps} />);

    expect(screen.getByText('Vital Signs Entry')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders action buttons with accessibility labels', () => {
    renderWithProviders(<VitalSignsForm {...baseProps} />);

    expect(screen.getByRole('button', { name: /save vital signs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel vital signs entry/i })).toBeInTheDocument();
  });

  it('updates temperature input value', async () => {
    const user = userEvent.setup();
    renderWithProviders(<VitalSignsForm {...baseProps} />);

    const input = screen.getByRole('spinbutton', { name: /temperature value/i });
    await user.clear(input);
    await user.type(input, '37.5');

    expect((input as HTMLInputElement).value).toBe('37.5');
  });

  it('shows critical values banner when initial data is critical', () => {
    renderWithProviders(
      <VitalSignsForm
        {...baseProps}
        initialData={{
          temperature: 40,
          systolic: 120,
          diastolic: 80,
          pulse: 80,
          respiration: 16,
          spo2: 98,
        }}
      />
    );

    expect(screen.getByText(/critical values detected/i)).toBeInTheDocument();
  });

  it('calls onSave with vitals payload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    renderWithProviders(
      <VitalSignsForm
        {...baseProps}
        onSave={onSave}
        initialData={{
          temperature: 36.8,
          systolic: 120,
          diastolic: 80,
          pulse: 72,
          respiration: 16,
          spo2: 98,
        }}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    for (const input of inputs) {
      await user.clear(input);
      await user.type(input, '98');
    }

    await user.click(screen.getByRole('button', { name: /save vital signs/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: expect.any(Number),
          systolic: expect.any(Number),
          diastolic: expect.any(Number),
          pulse: expect.any(Number),
          respiration: expect.any(Number),
          spo2: expect.any(Number),
        })
      );
    });
  });
});
