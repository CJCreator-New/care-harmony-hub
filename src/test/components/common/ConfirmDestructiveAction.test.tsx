import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/test/test-utils';
import { ConfirmDestructiveAction } from '@/components/common/ConfirmDestructiveAction';
import { MIN_REASON_LENGTH, isValidDestructiveReason } from '@/lib/audit/destructiveReason';

function renderWithTrigger(onConfirm: (reason: string) => void | Promise<void>, extra = {}) {
  return render(
    <ConfirmDestructiveAction
      trigger={<button type="button">Cancel appointment</button>}
      title="Cancel appointment?"
      description={<p>This cancels the visit for Jane Doe.</p>}
      confirmLabel="Cancel appointment"
      onConfirm={onConfirm}
      {...extra}
    />,
  );
}

describe('isValidDestructiveReason', () => {
  it('uses the order-safety rule: at least 10 characters after trimming', () => {
    expect(MIN_REASON_LENGTH).toBe(10);
    expect(isValidDestructiveReason('123456789')).toBe(false);
    expect(isValidDestructiveReason('1234567890')).toBe(true);
    expect(isValidDestructiveReason('   short   ')).toBe(false);
    expect(isValidDestructiveReason('   ten chars   ')).toBe(false);
    expect(isValidDestructiveReason('  patient left early  ')).toBe(true);
  });
});

describe('ConfirmDestructiveAction', () => {
  it('opens an alertdialog from the trigger with the consequence text', async () => {
    const user = userEvent.setup();
    renderWithTrigger(vi.fn());

    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Cancel appointment?');
    expect(dialog).toHaveTextContent('This cancels the visit for Jane Doe.');
  });

  it('keeps the confirm button disabled until the reason is long enough', async () => {
    const user = userEvent.setup();
    renderWithTrigger(vi.fn());
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    const confirm = await screen.findByRole('button', { name: 'Cancel appointment' });
    const reason = screen.getByLabelText(/Reason/);
    expect(confirm).toBeDisabled();

    await user.type(reason, 'too short');
    expect(confirm).toBeDisabled();
    expect(reason).toHaveAttribute('aria-invalid', 'true');

    await user.clear(reason);
    await user.type(reason, 'Patient asked to reschedule');
    expect(confirm).toBeEnabled();
    expect(reason).not.toHaveAttribute('aria-invalid');
  });

  it('passes the trimmed reason to onConfirm and closes on success', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithTrigger(onConfirm);
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    await user.type(await screen.findByLabelText(/Reason/), '   Duplicate booking found   ');
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('Duplicate booking found'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('stays open and keeps the reason when onConfirm rejects', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('network down'));
    renderWithTrigger(onConfirm);
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    const reason = await screen.findByLabelText(/Reason/);
    await user.type(reason, 'Patient called to cancel');
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason/)).toHaveValue('Patient called to cancel');
  });

  it('does not confirm with a short reason even if the button is pressed programmatically', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithTrigger(onConfirm);
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));
    await user.type(await screen.findByLabelText(/Reason/), 'nope');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel appointment' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('omits the reason field and enables confirm when requireReason is false', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderWithTrigger(onConfirm, { requireReason: false });
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel appointment' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(''));
  });

  it('supports controlled open state without a trigger', async () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDestructiveAction
        open
        onOpenChange={onOpenChange}
        title="Delete department?"
        description="Staff will lose the department assignment."
        confirmLabel="Delete department"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete department?');
    fireEvent.click(screen.getByRole('button', { name: 'Go back' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
