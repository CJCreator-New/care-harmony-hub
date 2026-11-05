import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { useDoctorStats } from '@/hooks/useDoctorStats';
import { usePatientsReadyForDoctor } from '@/lib/hooks/patients';
import { useActiveQueue } from '@/hooks/useQueue';
import { DoctorDashboard } from '@/components/dashboard/DoctorDashboard';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { first_name: 'Asha' }, hospital: { id: 'h1' } }),
}));
vi.mock('@/hooks/useAudit', () => ({ useAudit: () => ({ logActivity: vi.fn() }) }));
vi.mock('@/hooks/useSecureMessaging', () => ({ useUnreadMessagesCount: () => ({ data: 0 }) }));
vi.mock('@/hooks/useDoctorStats', () => ({ useDoctorStats: vi.fn() }));
vi.mock('@/lib/hooks/patients', () => ({ usePatientsReadyForDoctor: vi.fn() }));
vi.mock('@/hooks/useQueue', () => ({ useActiveQueue: vi.fn(), useQueueRealtime: () => undefined }));
vi.mock('@/hooks/useNurseWorkflow', () => ({ usePatientChecklists: () => ({ checklists: [] }) }));
vi.mock('@/lib/hooks/appointments', () => ({
  useTodayAppointments: () => ({ data: [], isLoading: false, isError: false }),
  useLatestScheduledAppointments: () => ({ data: undefined }),
}));
vi.mock('@/components/consultations/StartConsultationModal', () => ({ StartConsultationModal: () => null }));
vi.mock('@/components/workflow/EnhancedTaskManagement', () => ({ EnhancedTaskManagement: () => null }));
vi.mock('@/components/analytics/StaffPerformanceMetrics', () => ({ StaffPerformanceMetrics: () => null }));

const mockedStats = vi.mocked(useDoctorStats);
const mockedReady = vi.mocked(usePatientsReadyForDoctor);
const mockedQueue = vi.mocked(useActiveQueue);

const refetchStats = vi.fn();
const refetchReady = vi.fn();
const refetchQueue = vi.fn();

function setQueries({
  stats = { todaysPatients: 4, completedConsultations: 2, pendingLabs: 1, pendingLabReviews: 0, pendingPrescriptions: 0, pendingFollowUps: 0 } as Record<string, number> | undefined,
  statsError = false,
  ready = [] as unknown[] | undefined,
  readyError = false,
  queue = [] as unknown[] | undefined,
  queueError = false,
} = {}) {
  mockedStats.mockReturnValue({
    data: stats,
    isLoading: false,
    isError: statsError,
    refetch: refetchStats,
  } as unknown as ReturnType<typeof useDoctorStats>);
  mockedReady.mockReturnValue({
    data: ready,
    isLoading: false,
    isError: readyError,
    refetch: refetchReady,
  } as unknown as ReturnType<typeof usePatientsReadyForDoctor>);
  mockedQueue.mockReturnValue({
    data: queue,
    isLoading: false,
    isError: queueError,
    refetch: refetchQueue,
  } as unknown as ReturnType<typeof useActiveQueue>);
}

/** The value <h3> sits in the same card as the metric title. */
function statValue(title: string) {
  const card = screen.getByText(title).parentElement;
  const h3 = card?.querySelector('h3');
  if (!h3) throw new Error(`no value for ${title}`);
  return h3 as HTMLElement;
}

describe('DoctorDashboard data states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a dash and an error, not zero, when the doctor stats query fails', () => {
    setQueries({ statsError: true, stats: undefined });
    render(<DoctorDashboard />);

    expect(statValue("Today's Patients")).toHaveTextContent('—');
    expect(statValue('Consultations')).toHaveTextContent('—');
    expect(statValue('Pending Labs')).toHaveTextContent('—');
    expect(screen.getByText('Could not load pending actions.')).toBeInTheDocument();
    expect(screen.queryByText('0 pending')).not.toBeInTheDocument();
    expect(screen.queryByText('0 due')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchStats).toHaveBeenCalled();
  });

  it('does not show "0 ready" when the patients-ready query fails', () => {
    setQueries({ readyError: true, ready: undefined });
    render(<DoctorDashboard />);

    expect(screen.getByText('Could not load patients ready for consultation.')).toBeInTheDocument();
    expect(statValue('Ready for Consult')).toHaveTextContent('—');
    expect(statValue('Ready for Consult')).not.toHaveTextContent('0');
    expect(screen.queryByText('Patients Ready for Consultation')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Retry' })[0]);
    expect(refetchReady).toHaveBeenCalled();
  });

  it('shows the queue error instead of "No patients in queue" when the active queue query fails', () => {
    setQueries({ queueError: true, queue: undefined });
    render(<DoctorDashboard />);

    expect(screen.getByText('Could not load the patient queue.')).toBeInTheDocument();
    expect(screen.queryByText('No patients in queue')).not.toBeInTheDocument();
    expect(screen.queryByText('0 patients active')).not.toBeInTheDocument();
    expect(screen.getByText('— patients active')).toBeInTheDocument();
  });

  it('shows real counts and empty wording only when every query succeeded', () => {
    setQueries({ stats: { todaysPatients: 0, completedConsultations: 0, pendingLabs: 0, pendingLabReviews: 0, pendingPrescriptions: 0, pendingFollowUps: 0 } });
    render(<DoctorDashboard />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(statValue("Today's Patients")).toHaveTextContent('0');
    expect(statValue('Ready for Consult')).toHaveTextContent('0');
    expect(screen.getAllByText('0 pending').length).toBeGreaterThan(0);
    expect(screen.getByText('No patients in queue')).toBeInTheDocument();
  });
});
