import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test/test-utils';
import JoinPage from '@/pages/hospital/JoinPage';

const mockNavigate = vi.fn();
const mockGetInvitationByToken = vi.fn();
const mockInvoke = vi.fn();
const mockToast = vi.fn();

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
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
    auth: {
      setSession: vi.fn(),
    },
  },
}));

describe('JoinPage invitation errors (FUNC-21 / EDGE-23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInvitationByToken.mockResolvedValue({
      data: {
        id: 'invite-3',
        email: 'invitee@hospital.com',
        role: 'nurse',
        hospital_id: 'hospital-1',
        hospital: { name: 'CareSync General' },
      },
      error: null,
    });
  });

  it('shows the server reason when accept-invitation-signup responds with an error status', async () => {
    // supabase-js resolves with { error } for HTTP errors; the body is on error.context.
    mockInvoke.mockResolvedValue({
      data: null,
      error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
        context: new Response(JSON.stringify({ error: 'Unable to accept invitation' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
      }),
    });

    const user = userEvent.setup();
    render(<JoinPage />);

    await screen.findAllByText('Join CareSync General');
    await user.type(screen.getByLabelText('First Name'), 'Alex');
    await user.type(screen.getByLabelText('Last Name'), 'Rivers');
    await user.type(screen.getByLabelText('Password'), 'StrongP@ss1');
    await user.type(screen.getByLabelText('Confirm Password'), 'StrongP@ss1');
    await user.click(screen.getByRole('button', { name: /Join Team/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Registration failed',
          description: 'Unable to accept invitation',
        })
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
