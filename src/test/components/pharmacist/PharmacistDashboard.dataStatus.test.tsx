import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { usePrescriptionStats } from '@/lib/hooks/pharmacy';
import { useInventoryAutomation } from '@/hooks/useInventoryAutomation';
import { useConsultations } from '@/hooks/useConsultations';
import PharmacistDashboard from '@/components/pharmacist/PharmacistDashboard';

vi.mock('@/lib/hooks/pharmacy', () => ({ usePrescriptionStats: vi.fn() }));
vi.mock('@/hooks/useInventoryAutomation', () => ({ useInventoryAutomation: vi.fn() }));
vi.mock('@/hooks/useConsultations', () => ({ useConsultations: vi.fn() }));
vi.mock('@/components/pharmacist/PrescriptionQueue', () => ({ PrescriptionQueue: () => null }));
vi.mock('@/components/pharmacist/ClinicalServices', () => ({ ClinicalServices: () => null }));
vi.mock('@/components/pharmacist/RefillRequests', () => ({ RefillRequests: () => null }));
vi.mock('@/components/pharmacist/WorkflowTasks', () => ({ WorkflowTasks: () => null }));
vi.mock('@/components/pharmacist/InventoryDashboard', () => ({ InventoryDashboard: () => null }));

const mockedStats = vi.mocked(usePrescriptionStats);
const mockedInventory = vi.mocked(useInventoryAutomation);
const mockedConsultations = vi.mocked(useConsultations);

const statsRefetch = vi.fn();
const consultationsRefetch = vi.fn();
const alertsRefetch = vi.fn();

function setQueries({
  stats = { pending: 0, dispensed: 0, today: 0 } as { pending: number; dispensed: number; today: number } | undefined,
  statsLoading = false,
  statsError = false,
  consultations = [] as { status: string }[] | undefined,
  consultationsError = false,
  alerts = [] as { status: string }[],
  alertsError = false,
} = {}) {
  mockedStats.mockReturnValue({
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: statsRefetch,
  } as unknown as ReturnType<typeof usePrescriptionStats>);
  mockedConsultations.mockReturnValue({
    data: consultations,
    isLoading: false,
    isError: consultationsError,
    refetch: consultationsRefetch,
  } as unknown as ReturnType<typeof useConsultations>);
  mockedInventory.mockReturnValue({
    stockAlerts: alerts,
    isLoading: false,
    alertsError,
    refetchAlerts: alertsRefetch,
  } as unknown as ReturnType<typeof useInventoryAutomation>);
}

/** The value element sits right after the metric title in each stat card. */
function metricValue(title: string) {
  const el = screen.getByText(title).nextElementSibling;
  if (!el) throw new Error(`no value for ${title}`);
  return el as HTMLElement;
}

describe('PharmacistDashboard data states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an explicit error with Retry and no zero or all-clear text when prescription stats fail', () => {
    setQueries({ statsError: true, stats: undefined });
    render(<PharmacistDashboard />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load pharmacy figures.');
    expect(metricValue('Pending Prescriptions')).toHaveTextContent('—');
    expect(metricValue('Dispensed Today')).toHaveTextContent('—');
    expect(screen.queryByText('Up to date')).not.toBeInTheDocument();
    expect(screen.queryByText('None today')).not.toBeInTheDocument();
    expect(screen.getAllByText('Could not load')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(statsRefetch).toHaveBeenCalled();
    expect(alertsRefetch).toHaveBeenCalled();
    expect(consultationsRefetch).toHaveBeenCalled();
  });

  it('never shows "Stock levels OK" when the inventory alert query fails', () => {
    setQueries({ alertsError: true });
    render(<PharmacistDashboard />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(metricValue('Inventory Alerts')).toHaveTextContent('—');
    expect(screen.queryByText('Stock levels OK')).not.toBeInTheDocument();
  });

  it('shows a loading placeholder, not a zero or all-clear, while stats are pending', () => {
    setQueries({ statsLoading: true, stats: undefined });
    render(<PharmacistDashboard />);

    expect(screen.getByRole('status', { name: 'Loading pending prescriptions' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Up to date')).not.toBeInTheDocument();
  });

  it('shows all-clear wording only when every query succeeded and the result is empty', () => {
    setQueries();
    render(<PharmacistDashboard />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Up to date')).toBeInTheDocument();
    expect(screen.getByText('None today')).toBeInTheDocument();
    expect(screen.getByText('Stock levels OK')).toBeInTheDocument();
    expect(metricValue('Pending Prescriptions')).toHaveTextContent('0');
  });
});
