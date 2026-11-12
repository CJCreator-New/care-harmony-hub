/**
 * CLIN-28 regression: `usePatients()` returns a paginated `{ patients, total, ... }`
 * object. The Initiate Discharge modal called `.filter`/`.find` on that object and
 * crashed as soon as patients loaded.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InitiateDischargeModal } from '@/components/discharge/InitiateDischargeModal';

vi.mock('@/lib/hooks/patients', () => ({
  usePatients: () => ({
    isLoading: false,
    data: {
      patients: [
        { id: 'p-1', first_name: 'Ada', last_name: 'Lovelace', mrn: 'MRN-001' },
        { id: 'p-2', first_name: 'Alan', last_name: 'Turing', mrn: 'MRN-002' },
      ],
      total: 2,
      page: 1,
      limit: 50,
      totalPages: 1,
    },
  }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe('InitiateDischargeModal with a paginated usePatients result (CLIN-28)', () => {
  it('renders the patients and filters them by search term', () => {
    render(<InitiateDischargeModal open onOpenChange={vi.fn()} onInitiate={vi.fn()} />);

    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();

    const search = screen.getByPlaceholderText(/search/i);
    fireEvent.change(search, { target: { value: 'turing' } });

    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(screen.getByText('Alan Turing')).toBeInTheDocument();
  });

  it('selects a patient (find on the patient list)', () => {
    render(<InitiateDischargeModal open onOpenChange={vi.fn()} onInitiate={vi.fn()} />);
    fireEvent.click(screen.getByText('Ada Lovelace'));
    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
  });
});
