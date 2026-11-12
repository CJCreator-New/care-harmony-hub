import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

describe('Table scroll region (A11Y-14)', () => {
  it('makes the horizontally scrolling wrapper keyboard-focusable and named', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Invoice 1</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const region = screen.getByRole('region', { name: 'Scrollable table' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toContainElement(screen.getByRole('table'));
  });

  it('lets a page give its scroll region a specific name', () => {
    render(<Table scrollLabel="Billing lines" />);

    expect(screen.getByRole('region', { name: 'Billing lines' })).toHaveAttribute('tabindex', '0');
  });
});

describe('Badge motion (A11Y-15)', () => {
  it('gates the emergency pulse behind motion-safe so reduced-motion users get a static badge', () => {
    render(<Badge variant="emergency">Critical</Badge>);

    const badge = screen.getByText('Critical');
    const classes = badge.className.split(/\s+/);
    expect(classes).toContain('motion-safe:animate-pulse');
    expect(classes).not.toContain('animate-pulse');
  });
});

function FormHarness({ id }: { id?: string }) {
  const form = useForm<{ email: string }>({ defaultValues: { email: '' } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl id={id}>
              <Input {...field} />
            </FormControl>
            <FormDescription>We only use it for sign-in.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

describe('FormControl label association (A11Y-03, A11Y-10)', () => {
  it('associates the label with the control and describes it', () => {
    render(<FormHarness />);

    const input = screen.getByLabelText('Email');
    expect(input.tagName).toBe('INPUT');
    expect(input.getAttribute('aria-describedby')).toContain('form-item-description');
    expect(input).toHaveAccessibleDescription('We only use it for sign-in.');
  });

  it('does not let a caller-supplied id break the label association', () => {
    render(<FormHarness id="caller-id" />);

    const input = screen.getByLabelText('Email');
    expect(input.id).not.toBe('caller-id');
    expect(input.id).toMatch(/form-item$/);
  });
});
