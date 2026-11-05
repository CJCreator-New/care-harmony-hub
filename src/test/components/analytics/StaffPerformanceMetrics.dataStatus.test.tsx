import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { useDoctorStats } from '@/hooks/useDoctorStats';
import { StaffPerformanceMetrics } from '@/components/analytics/StaffPerformanceMetrics';

vi.mock('@/hooks/useDoctorStats', () => ({
  useDoctorStats: vi.fn(),
}));
vi.mock('@/components/ui/lazy-chart', () => ({
  ChartSkeleton: () => null,
  useRecharts: () => ({ components: null, loading: false }),
}));

const mockedStats = vi.mocked(useDoctorStats);
const refetch = vi.fn();

function setStats({ isError = false, data }: { isError?: boolean; data?: unknown } = {}) {
  mockedStats.mockReturnValue({
    data,
    isLoading: false,
    isError,
    refetch,
  } as unknown as ReturnType<typeof useDoctorStats>);
}

describe('StaffPerformanceMetrics doctor data states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error instead of 0 values when the doctor stats query fails', () => {
    setStats({ isError: true, data: undefined });
    render(<StaffPerformanceMetrics role="doctor" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load your performance metrics.');
    expect(screen.queryByText('Patient Throughput')).not.toBeInTheDocument();
    expect(screen.queryByText('0 today')).not.toBeInTheDocument();

    screen.getByRole('button', { name: 'Retry' }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the real metric values on success', () => {
    setStats({
      data: {
        todaysPatients: 7,
        completedConsultations: 5,
        avgConsultationDuration: 20,
        pendingFollowUps: 1,
      },
    });
    render(<StaffPerformanceMetrics role="doctor" />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Patient Throughput')).toBeInTheDocument();
    expect(screen.getByText('7 today')).toBeInTheDocument();
  });
});
