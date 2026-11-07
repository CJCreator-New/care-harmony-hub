import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { render } from '@/test/test-utils';
import { Input } from '@/components/ui/input';
import { Form } from '@/components/ui/form';
import { FormField } from '@/components/common/FormField';

const schema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  notes: z.string().optional(),
});
type Values = z.infer<typeof schema>;

function Harness({ onValid = () => {} }: { onValid?: (v: Values) => void }) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { first_name: '', notes: '' } });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onValid)}>
        <FormField control={form.control} name="first_name" label="First name" required>
          {(field, controlProps) => <Input {...field} {...controlProps} />}
        </FormField>
        <FormField control={form.control} name="notes" label="Notes" description="Shown to the care team">
          {(field, controlProps) => <Input {...field} {...controlProps} />}
        </FormField>
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

describe('FormField', () => {
  it('renders a visual required marker and sets aria-required on the control', () => {
    render(<Harness />);
    const input = screen.getByLabelText(/First name/);
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('(required)', { exact: false })).toBeInTheDocument();
  });

  it('does not mark optional fields as required', () => {
    render(<Harness />);
    const notes = screen.getByLabelText('Notes');
    expect(notes).not.toHaveAttribute('aria-required');
    expect(screen.getByText('Shown to the care team')).toBeInTheDocument();
  });

  it('links the inline error to the control with aria-describedby', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const error = await screen.findByText('First name is required');
    const input = screen.getByLabelText(/First name/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toContain(error.id);
  });

  it('links the description to the control when there is no error', () => {
    render(<Harness />);
    const notes = screen.getByLabelText('Notes');
    const description = screen.getByText('Shown to the care team');
    expect(notes.getAttribute('aria-describedby')?.split(' ')).toContain(description.id);
    expect(notes).toHaveAttribute('aria-invalid', 'false');
  });

  it('submits valid values through react-hook-form', async () => {
    const submitted: Values[] = [];
    render(<Harness onValid={(v) => submitted.push(v)} />);
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Asha' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(submitted).toHaveLength(1));
    expect(submitted[0].first_name).toBe('Asha');
  });
});
