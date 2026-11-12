import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PatientCheckOutModal } from './PatientCheckOutModal';

const completeMutate = vi.fn(async () => {});

const entry = {
  id: 'q1',
  patient_id: 'p1',
  queue_number: 7,
  department: 'General',
  check_in_time: new Date().toISOString(),
  service_start_time: new Date().toISOString(),
  status: 'in_service',
  patient: { first_name: 'Asha', last_name: 'Rao', mrn: 'MRN-001' },
} as any;

vi.mock('@/hooks/useQueue', () => ({
  useActiveQueue: () => ({ data: [] }),
  useCompleteService: () => ({ mutateAsync: completeMutate, isPending: false }),
}));

vi.mock('@/hooks/useBilling', () => ({
  useInvoices: () => ({ data: [] }),
  useRecordPayment: () => ({ mutateAsync: vi.fn(async () => {}) }),
}));

function renderModal() {
  return render(<PatientCheckOutModal open onOpenChange={() => {}} queueEntry={entry} />);
}

describe('PatientCheckOutModal wizard flow', () => {
  beforeEach(() => {
    completeMutate.mockClear();
  });

  it('walks summary -> billing -> payment -> followup -> complete', async () => {
    renderModal();
    expect(await screen.findAllByText('Visit Summary')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Billing')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Payment Collection')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('button', { name: /Complete Check-Out/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Complete Check-Out/ }));
    expect(await screen.findByText('Check-Out Complete!')).toBeTruthy();
    expect(completeMutate).toHaveBeenCalledWith('q1');
  });

  it('Back steps one screen at a time and not past the summary', async () => {
    renderModal();
    expect(await screen.findAllByText('Visit Summary')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Billing')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findAllByText('Visit Summary')).toBeTruthy();
  });

  it('Back from payment returns to billing', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Billing')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Payment Collection')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await waitFor(() => expect(screen.getAllByText('Billing').length).toBeGreaterThan(0));
  });

  it('has no Back button on the completion screen', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Billing')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findAllByText('Payment Collection')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: /Complete Check-Out/ }));
    await waitFor(() => expect(screen.getByText('Check-Out Complete!')).toBeTruthy());
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull();
  });
});
