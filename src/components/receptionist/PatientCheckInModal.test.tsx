import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientCheckInModal } from './PatientCheckInModal';

const patient = {
  id: 'p1',
  first_name: 'Asha',
  last_name: 'Rao',
  mrn: 'MRN-001',
  date_of_birth: '1990-01-01',
  phone: null,
  insurance_provider: null,
  insurance_policy_number: null,
  insurance_group_number: null,
};

const checkInMock = vi.fn(async () => 42);

// Search results for the current test; a module-level variable so the mock can read it at render time.
let searchResults: unknown[] = [patient];

vi.mock('@/lib/hooks/patients', () => ({
  useSearchPatients: () => ({ data: searchResults, isLoading: false }),
}));

vi.mock('@/lib/hooks/appointments', () => ({
  useTodayAppointments: () => ({ data: [] }),
}));

vi.mock('@/hooks/useUnifiedCheckIn', () => ({
  useUnifiedCheckIn: () => ({ checkIn: checkInMock, isPending: false }),
}));

async function waitForCopayStep() {
  await waitFor(() => expect(document.getElementById('copayAmount')).not.toBeNull());
}

function renderModal() {
  return render(<PatientCheckInModal open onOpenChange={() => {}} />);
}

describe('PatientCheckInModal wizard flow', () => {
  beforeEach(() => {
    checkInMock.mockClear();
    searchResults = [patient];
  });

  it('express check-in goes straight from search to complete', async () => {
    searchResults = [
      {
        ...patient,
        insurance_provider: 'Acme Health',
        insurance_policy_number: 'POL-1',
        insurance_status: 'active',
        last_visit: '2026-01-01',
      },
    ];
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Express/ }));
    expect(await screen.findByText('Check-In Complete!')).toBeTruthy();
    expect(checkInMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('does not offer express check-in for an ineligible patient', () => {
    renderModal();
    expect(screen.queryByRole('button', { name: /Express/ })).toBeNull();
  });

  it('walks search -> verify -> insurance -> copay -> complete', async () => {
    renderModal();
    expect(screen.getByText('Find Patient')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Check-In' }));
    expect(await screen.findByText('Verify Patient')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    // Continue is blocked until identity is verified.
    expect(screen.getByText('Verify Patient')).toBeTruthy();

    fireEvent.click(document.getElementById('identityVerified') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Insurance Verification')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitForCopayStep();

    fireEvent.click(screen.getByRole('button', { name: /Complete Check-In/ }));
    expect(await screen.findByText('Check-In Complete!')).toBeTruthy();
    expect(checkInMock).toHaveBeenCalledTimes(1);
  });

  it('Back steps one screen at a time and never past search', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Check-In' }));
    expect(await screen.findByText('Verify Patient')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Find Patient')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });

  it('Back from copay returns to insurance', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Check-In' }));
    expect(await screen.findByText('Verify Patient')).toBeTruthy();
    fireEvent.click(document.getElementById('identityVerified') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Insurance Verification')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitForCopayStep();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Insurance Verification')).toBeTruthy();
  });

  it('has no Back button on the completion screen', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Check-In' }));
    expect(await screen.findByText('Verify Patient')).toBeTruthy();
    fireEvent.click(document.getElementById('identityVerified') as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Insurance Verification')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitForCopayStep();
    fireEvent.click(screen.getByRole('button', { name: /Complete Check-In/ }));
    await waitFor(() => expect(screen.getByText('Check-In Complete!')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });
});
