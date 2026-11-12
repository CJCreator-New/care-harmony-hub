import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { Table, TableBody, TableCard, TableCardList, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

describe('Table', () => {
  it('wraps the table in a labelled, keyboard-focusable scroll region', () => {
    render(
      <Table scrollLabel="Patients">
        <TableHeader>
          <TableRow>
            <TableHead>MRN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>MRN-001</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    const region = screen.getByRole('region', { name: 'Patients' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });
});

describe('TableCard', () => {
  it('renders each field as a labelled term and description, plus actions', () => {
    render(
      <TableCardList>
        <TableCard
          title="Asha Rao"
          fields={[
            { label: 'MRN', value: 'MRN-001' },
            { label: 'Blood Type', value: 'O+' },
          ]}
          actions={<button type="button">View profile</button>}
        />
      </TableCardList>,
    );
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('MRN')).toBeInTheDocument();
    expect(screen.getByText('MRN-001')).toBeInTheDocument();
    expect(screen.getByText('Blood Type').tagName).toBe('DT');
    expect(screen.getByText('O+').tagName).toBe('DD');
    expect(screen.getByRole('button', { name: 'View profile' })).toBeInTheDocument();
  });

  it('is hidden at md and above through the list wrapper', () => {
    const { container } = render(
      <TableCardList>
        <TableCard title="Asha Rao" fields={[]} />
      </TableCardList>,
    );
    expect(container.firstElementChild).toHaveClass('md:hidden');
  });
});
