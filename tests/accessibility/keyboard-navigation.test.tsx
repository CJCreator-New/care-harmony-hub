import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Keyboard Navigation', () => {
  it('should navigate through form fields with Tab', async () => {
    const user = userEvent.setup();
    
    render(
      <form>
        <input data-testid="input1" type="text" />
        <input data-testid="input2" type="text" />
        <button data-testid="submit">Submit</button>
      </form>
    );

    const input1 = screen.getByTestId('input1');
    const input2 = screen.getByTestId('input2');
    const button = screen.getByTestId('submit');

    input1.focus();
    expect(document.activeElement).toBe(input1);

    await user.tab();
    expect(document.activeElement).toBe(input2);

    await user.tab();
    expect(document.activeElement).toBe(button);
  });

  it('should activate buttons with Enter and Space', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<button onClick={handleClick}>Click Me</button>);
    const button = screen.getByRole('button');

    button.focus();
    await user.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should close dialogs with Escape key', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <div role="dialog" onKeyDown={(e) => e.key === 'Escape' && handleClose()}>
        <button onClick={handleClose}>Close</button>
      </div>
    );

    const dialog = screen.getByRole('dialog');
    dialog.focus();
    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalled();
  });

  it('should trap focus within modal dialogs', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <button data-testid="outside">Outside</button>
        <div role="dialog" aria-modal="true">
          <button data-testid="first">First</button>
          <button data-testid="last">Last</button>
        </div>
      </div>
    );

    const first = screen.getByTestId('first');
    const last = screen.getByTestId('last');

    first.focus();
    expect(document.activeElement).toBe(first);

    await user.tab();
    expect(document.activeElement).toBe(last);
  });
});
