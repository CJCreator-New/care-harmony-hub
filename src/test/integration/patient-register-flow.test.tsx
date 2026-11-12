/**
 * S0-03 (DB-01, SECF-10, SECF-11, FUNC-01): patient self-registration goes
 * through the register-patient edge function only. The page never writes
 * profiles, never picks a hospital id and no longer collects a security answer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@/test/test-utils';
import PatientRegisterPage from '@/pages/patient/PatientRegisterPage';

const mockNavigate = vi.fn();
const mockInvoke = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();
const mockSignUp = vi.fn();
const mockToast = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { signUp: (...args: unknown[]) => mockSignUp(...args) },
  },
}));

async function fillAndSubmit() {
  const user = userEvent.setup();
  render(<PatientRegisterPage />);

  await user.type(screen.getByLabelText(/Hospital Code/), 'LIC-A');
  await user.type(screen.getByLabelText(/Medical Record Number/), 'MRN00000001');
  await user.type(screen.getByLabelText(/Last Name/), 'Lovelace');
  await user.type(screen.getByLabelText(/Date of Birth/), '1980-01-02');
  await user.click(screen.getByRole('button', { name: /Next/i }));

  await user.type(screen.getByLabelText(/^Email/), 'ada@example.test');
  await user.type(screen.getByLabelText(/^Password/), 'StrongP@ss1');
  await user.type(screen.getByLabelText(/Confirm Password/), 'StrongP@ss1');
  await user.click(screen.getByRole('button', { name: /Next/i }));

  await user.click(screen.getByLabelText(/Terms of Service/));
  await user.click(screen.getByLabelText(/HIPAA Privacy Notice/));
  await user.click(screen.getByRole('button', { name: /Complete Registration/i }));
}

describe('Patient self-registration (S0-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers only through register-patient, without a hospital id or security answer', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, confirmation_email_sent: true }, error: null });

    await fillAndSubmit();

    await waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));
    const [fn, options] = mockInvoke.mock.calls[0] as [string, { body: Record<string, unknown> }];
    expect(fn).toBe('register-patient');
    expect(options.body).toEqual({
      hospitalCode: 'LIC-A',
      mrn: 'MRN00000001',
      lastName: 'Lovelace',
      dateOfBirth: '1980-01-02',
      email: 'ada@example.test',
      password: 'StrongP@ss1',
    });
    expect(JSON.stringify(options.body)).not.toMatch(/hospital_id|hospitalId|security/i);

    // No client-side writes or lookups: everything is server-side.
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/patient-login');
    expect(screen.queryByLabelText(/Security Answer/i)).toBeNull();
  });

  it('shows the server message when the record cannot be matched', async () => {
    const body = { error: 'We could not match these details to a patient record.' };
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => body } },
    });

    await fillAndSubmit();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Registration Failed', description: body.error, variant: 'destructive' }),
      ),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
