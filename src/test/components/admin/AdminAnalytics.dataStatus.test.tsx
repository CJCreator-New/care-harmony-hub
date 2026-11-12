import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import {
  useAdminStats,
  useStaffOverview,
  useDepartmentPerformance,
  useWeeklyAppointmentTrend,
} from '@/hooks/useAdminStats';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';

vi.mock('@/hooks/useAdminStats', () => ({
  useAdminStats: vi.fn(),
  useStaffOverview: vi.fn(),
  useDepartmentPerformance: vi.fn(),
  useWeeklyAppointmentTrend: vi.fn(),
}));
vi.mock('@/components/ui/lazy-chart', () => ({
  ChartSkeleton: () => null,
  useRecharts: () => ({ components: null, loading: false }),
}));

const mockedStats = vi.mocked(useAdminStats);
const mockedStaff = vi.mocked(useStaffOverview);
const mockedDept = vi.mocked(useDepartmentPerformance);
const mockedTrend = vi.mocked(useWeeklyAppointmentTrend);

const refetchStats = vi.fn();
const refetchDept = vi.fn();
const refetchTrend = vi.fn();

const zeroStats = {
  totalPatients: 0,
  newPatientsThisMonth: 0,
  patientGrowthLabel: '+0 this month',
  todayAppointments: 0,
  appointmentMetricLabel: "Today's Appointments",
  appointmentMetricSubtitle: '0 completed, 0 cancelled',
  completedToday: 0,
  cancelledToday: 0,
  activeStaff: 0,
  staffByRole: {},
  monthlyRevenue: 0,
  pendingAmount: 0,
  queueWaiting: 0,
  queueInService: 0,
  pendingPrescriptions: 0,
  pendingLabOrders: 0,
  criticalLabOrders: 0,
  bedOccupancy: 0,
};

function setQueries({
  statsError = false,
  stats = zeroStats as typeof zeroStats | undefined,
  trendError = false,
  deptError = false,
} = {}) {
  mockedStats.mockReturnValue({
    data: stats,
    isLoading: false,
    isError: statsError,
    refetch: refetchStats,
  } as unknown as ReturnType<typeof useAdminStats>);
  mockedStaff.mockReturnValue({ data: [], isLoading: false, isError: false } as unknown as ReturnType<typeof useStaffOverview>);
  mockedDept.mockReturnValue({
    data: deptError ? undefined : [],
    isLoading: false,
    isError: deptError,
    refetch: refetchDept,
  } as unknown as ReturnType<typeof useDepartmentPerformance>);
  mockedTrend.mockReturnValue({
    data: trendError ? undefined : [],
    isLoading: false,
    isError: trendError,
    refetch: refetchTrend,
  } as unknown as ReturnType<typeof useWeeklyAppointmentTrend>);
}

/** The value <p> sits next to the metric title inside the same card. */
function statValue(title: string) {
  const label = screen.getByText(title);
  const value = label.parentElement?.querySelector('p.text-3xl, p.text-2xl');
  if (!value) throw new Error(`no value for ${title}`);
  return value as HTMLElement;
}

describe('AdminAnalytics data states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows dashes and an error, never 0, when the admin stats query fails', () => {
    setQueries({ statsError: true, stats: undefined });
    render(<AdminAnalytics />);

    const alerts = screen.getAllByRole('alert');
    expect(alerts[0]).toHaveTextContent('Could not load admin statistics.');
    expect(alerts[1]).toHaveTextContent('Could not load staff by role.');
    expect(statValue('Total Patients')).toHaveTextContent('—');
    expect(statValue('Total Patients')).not.toHaveTextContent('0');
    expect(statValue('Queue Waiting')).toHaveTextContent('—');
    expect(statValue('Pending Labs')).toHaveTextContent('—');
    expect(statValue('Bed Occupancy')).toHaveTextContent('—');
    expect(screen.queryByText('No staff data')).not.toBeInTheDocument();
    expect(screen.queryByText('critical')).not.toBeInTheDocument();

    screen.getAllByRole('button', { name: 'Retry' })[0].click();
    expect(refetchStats).toHaveBeenCalled();
  });

  it('shows real zeros and no error on a successful empty result', () => {
    setQueries();
    render(<AdminAnalytics />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(statValue('Total Patients')).toHaveTextContent('0');
    expect(statValue('Bed Occupancy')).toHaveTextContent('0%');
    expect(screen.getByText('No staff data')).toBeInTheDocument();
  });

  it('shows a trend error instead of "No appointment data this week" when the trend query fails', () => {
    setQueries({ trendError: true });
    render(<AdminAnalytics />);

    expect(screen.getByText("Could not load this week's appointments.")).toBeInTheDocument();
    expect(screen.queryByText('No appointment data this week')).not.toBeInTheDocument();
    expect(statValue('Total Patients')).toHaveTextContent('0');
  });
});
