import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toastMocks }));

import { SessionNotes } from '@/components/telemedicine/SessionNotes';

describe('telehealth SessionNotes persistence (CLIN-21)', () => {
  beforeEach(() => {
    toastMocks.success.mockClear();
    toastMocks.error.mockClear();
  });

  it('does not claim the notes were saved when nothing is connected to store them', () => {
    render(<SessionNotes patientId="p-1" />);
    fireEvent.change(screen.getByLabelText('Chief Complaint'), { target: { value: 'Cough for three days' } });
    fireEvent.click(screen.getByRole('button', { name: /save notes/i }));

    expect(toastMocks.success).not.toHaveBeenCalled();
    expect(toastMocks.error).toHaveBeenCalledWith(expect.stringMatching(/not saved/i));
  });

  it('reports success only after the onSave handler receives the notes', () => {
    const onSave = vi.fn();
    render(<SessionNotes patientId="p-1" onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Chief Complaint'), { target: { value: 'Cough for three days' } });
    fireEvent.click(screen.getByRole('button', { name: /save notes/i }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ chiefComplaint: 'Cough for three days' }));
    expect(toastMocks.success).toHaveBeenCalledWith('Session notes saved');
  });
});
