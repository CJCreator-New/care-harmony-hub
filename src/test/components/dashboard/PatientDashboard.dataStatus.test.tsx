import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/test-utils';
import {
  usePatientProfile,
  usePatientAppointments,
  usePatientPrescriptions,
  usePatientLabResults,
} from '@/lib/hooks/patients';
import { PatientDashboard } from '@/components/dashboard/PatientDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { first_name: 'Ana' } }),
}));
vi.mock('@/components/patient/PatientHealthInsights', () => ({
  PatientHealthInsights: () => null,
}));
vi.mock('@/lib/hooks/patients', () => ({
  usePatientProfile: vi.fn(),
  usePatientAppointments: vi.fn(),
  usePatientPrescriptions: vi.fn(),
  usePatientLabResults: vi.fn(),
}));

const refetchAppointments = vi.fn();
const refetchPrescriptions = vi.fn();
const refetchLabResults = vi.fn();

type Source = { loading?: boolean; error?: string | null };

function setSources({
  appointments = {},
  prescriptions = {},
  labs = {},
}: { appointments?: Source; prescriptions?: Source; labs?: Source } = {}) {
  vi.mocked(usePatientProfile).mockReturnValue({
    profile: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePatientProfile>);
  vi.mocked(usePatientAppointments).mockReturnValue({
    appointments: [],
    loading: appointments.loading ?? false,
    error: appointments.error ?? null,
    refetch: refetchAppointments,
  } as unknown as ReturnType<typeof usePatientAppointments>);
  vi.mocked(usePatientPrescriptions).mockReturnValue({
    prescriptions: [],
    loading: prescriptions.loading ?? false,
    error: prescriptions.error ?? null,
    refetch: refetchPrescriptions,
  } as unknown as ReturnType<typeof usePatientPrescriptions>);
  vi.mocked(usePatientLabResults).mockReturnValue({
    labResults: [],
    loading: labs.loading ?? false,
    error: labs.error ?? null,
    refetch: refetchLabResults,
  } as unknown as ReturnType<typeof usePatientLabResults>);
}

describe('PatientDashboard data states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not claim "All records up to date" when the record queries fail', () => {
    setSources({
      appointments: { error: 'network' },
      prescriptions: { error: 'network' },
      labs: { error: 'network' },
    });
    render(<PatientDashboard />);

    const alerts = screen.getAllByRole('alert').map((el) => el.textContent);
    expect(alerts).toContain('Could not load your health records.Retry');
    expect(alerts).toContain('Could not load upcoming appointments.Retry');
    expect(alerts).toContain('Could not load active prescriptions.Retry');
    expect(alerts).toContain('Could not load lab results.Retry');
    expect(screen.queryByText('All records up to date')).not.toBeInTheDocument();
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
    expect(screen.queryByText('No upcoming appointments')).not.toBeInTheDocument();
    expect(screen.queryByText('No active prescriptions')).not.toBeInTheDocument();
    expect(screen.queryByText('No lab results available')).not.toBeInTheDocument();

    const retryButtons = screen.getAllByRole('button', { name: 'Retry' });
    expect(retryButtons).toHaveLength(4);
    fireEvent.click(retryButtons[0]);
    expect(refetchAppointments).toHaveBeenCalled();
    expect(refetchPrescriptions).toHaveBeenCalled();
    expect(refetchLabResults).toHaveBeenCalled();
  });

  it('shows the explicit all-clear only when every source loaded successfully', () => {
    setSources();
    render(<PatientDashboard />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('All records up to date')).toBeInTheDocument();
    expect(screen.getByText('No upcoming appointments')).toBeInTheDocument();
  });

  it('shows a loading placeholder, not the all-clear text, while records are pending', () => {
    setSources({ labs: { loading: true } });
    render(<PatientDashboard />);

    expect(screen.queryByText('All records up to date')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
