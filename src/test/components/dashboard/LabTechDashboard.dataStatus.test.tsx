import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { useLabTechStats, usePendingLabOrders } from '@/hooks/usePharmacyLabStats';
import { LabTechDashboard } from '@/components/dashboard/LabTechDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { first_name: 'Ravi' }, hospital: { id: 'h1' } }),
}));
vi.mock('@/hooks/useLabOrders', () => ({
  useUpdateLabOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/hooks/usePharmacyLabStats', () => ({
  useLabTechStats: vi.fn(),
  usePendingLabOrders: vi.fn(),
}));
vi.mock('@/components/lab/CriticalValueAlert', () => ({ CriticalValueAlert: () => null }));
vi.mock('@/components/laboratory/LabAutomationPanel', () => ({ LabAutomationPanel: () => null }));

const mockedStats = vi.mocked(useLabTechStats);
const mockedOrders = vi.mocked(usePendingLabOrders);
const refetchStats = vi.fn();
const refetchOrders = vi.fn();

const zeroStats = {
  pending: 0,
  collected: 0,
  inProgress: 0,
  completedToday: 0,
  urgent: 0,
  critical: 0,
  bloodTests: 0,
  urineAnalysis: 0,
  other: 0,
};

function setQueries({
  stats = zeroStats as typeof zeroStats | undefined,
  statsError = false,
  orders = [] as unknown[] | undefined,
  ordersError = false,
} = {}) {
  mockedStats.mockReturnValue({
    data: stats,
    isLoading: false,
    isError: statsError,
    refetch: refetchStats,
  } as unknown as ReturnType<typeof useLabTechStats>);
  mockedOrders.mockReturnValue({
    data: orders,
    isLoading: false,
    isError: ordersError,
    refetch: refetchOrders,
  } as unknown as ReturnType<typeof usePendingLabOrders>);
}

/** The value <h3> sits in the same stat card as the metric title. */
function statValue(title: string) {
  const label = screen.getAllByText(title).find((el) => el.parentElement?.querySelector('h3'));
  const h3 = label?.parentElement?.querySelector('h3');
  if (!h3) throw new Error(`no value for ${title}`);
  return h3 as HTMLElement;
}

describe('LabTechDashboard data states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never shows the critical-values count as 0 when the lab stats query fails', () => {
    setQueries({ statsError: true, stats: undefined });
    render(<LabTechDashboard />);

    expect(statValue('Critical Values')).toHaveTextContent('—');
    expect(statValue('Critical Values')).not.toHaveTextContent('0');
  });

  it('shows an urgent-orders error and not "No urgent orders" when stats fail', () => {
    setQueries({ statsError: true, stats: undefined });
    render(<LabTechDashboard />);

    expect(screen.getByText('Could not load urgent orders.')).toBeInTheDocument();
    expect(screen.queryByText('No urgent orders')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    expect(refetchStats).toHaveBeenCalled();
  });

  it('shows a lab-order error and not "All caught up!" when the pending orders query fails', () => {
    setQueries({ ordersError: true, orders: undefined });
    render(<LabTechDashboard />);

    expect(screen.getByText('Could not load lab orders.')).toBeInTheDocument();
    expect(screen.queryByText('All caught up!')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' }).slice(-1)[0]);
    expect(refetchOrders).toHaveBeenCalled();
  });

  it('shows zero critical values and the all-clear wording only on a successful empty result', () => {
    setQueries();
    render(<LabTechDashboard />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(statValue('Critical Values')).toHaveTextContent('0');
    expect(screen.getByText('No urgent orders')).toBeInTheDocument();
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(statValue('Pending Orders')).toHaveTextContent('0');
  });
});
