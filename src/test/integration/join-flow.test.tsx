import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test/test-utils';
import JoinPage from '@/pages/hospital/JoinPage';

const mockNavigate = vi.fn();
const mockGetInvitationByToken = vi.fn();
const mockInvoke = vi.fn();
const mockSetSession = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ token: 'token-123' }),
  };
});

vi.mock('@/hooks/useStaffInvitations', () => ({
  useStaffInvitations: () => ({
    getInvitationByToken: mockGetInvitationByToken,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
    auth: {
      setSession: (...args: any[]) => mockSetSession(...args),
    },
  },
}));

describe('Join Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders invitation details and completes join flow', async () => {
    mockGetInvitationByToken.mockResolvedValue({
      data: {
        id: 'invite-1',
        email: 'invitee@hospital.com',
        role: 'doctor',
        hospital_id: 'hospital-1',
        hospital: { name: 'CareSync General' },
      },
      error: null,
    });

    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        session: { access_token: 'access', refresh_token: 'refresh' },
        requires_login: false,
      },
      error: null,
    });

    mockSetSession.mockResolvedValue({ error: null });

    const user = userEvent.setup();
    render(<JoinPage />);

    expect(await screen.findByText(/Join CareSync General/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('First Name'), 'Alex');
    await user.type(screen.getByLabelText('Last Name'), 'Rivers');
    await user.type(screen.getByLabelText('Password'), 'StrongP@ss1');
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongP@ss1');

    await user.click(screen.getByRole('button', { name: /Join Team/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('accept-invitation-signup', {
        body: {
          token: 'token-123',
          password: 'StrongP@ss1',
          firstName: 'Alex',
          lastName: 'Rivers',
        },
      });
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('redirects to login when server requires login', async () => {
    mockGetInvitationByToken.mockResolvedValue({
      data: {
        id: 'invite-2',
        email: 'invitee@hospital.com',
        role: 'nurse',
        hospital_id: 'hospital-1',
        hospital: { name: 'CareSync General' },
      },
      error: null,
    });

    mockInvoke.mockResolvedValue({
      data: { success: true, requires_login: true },
      error: null,
    });

    const user = userEvent.setup();
    render(<JoinPage />);

    await screen.findByText(/Join CareSync General/i);

    await user.type(screen.getByLabelText('First Name'), 'Alex');
    await user.type(screen.getByLabelText('Last Name'), 'Rivers');
    await user.type(screen.getByLabelText('Password'), 'StrongP@ss1');
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongP@ss1');

    await user.click(screen.getByRole('button', { name: /Join Team/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/hospital/login');
    });
  });

  it('shows invalid invitation state when token is rejected', async () => {
    mockGetInvitationByToken.mockResolvedValue({
      data: null,
      error: 'Invalid or expired invitation',
    });

    render(<JoinPage />);

    expect(await screen.findByText('Invalid Invitation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Home/i })).toBeInTheDocument();
  });
});
