import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '@/test/test-utils';
import { DataError, DataStatus, StatValue } from '@/components/common/DataStatus';

const DATA_UNAVAILABLE = '—';

describe('DataError', () => {
  it('announces the failed resource with role="alert" and a Retry action', () => {
    const onRetry = vi.fn();
    render(<DataError resource="pending prescriptions" onRetry={onRetry} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Could not load pending prescriptions.');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('DataStatus', () => {
  it('shows the error state instead of children when the query failed', () => {
    render(
      <DataStatus isLoading={false} isError resource="lab orders" onRetry={() => {}}>
        <p>No lab orders</p>
      </DataStatus>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load lab orders.');
    expect(screen.queryByText('No lab orders')).not.toBeInTheDocument();
  });

  it('shows a loading status instead of children while pending', () => {
    render(
      <DataStatus isLoading isError={false} resource="lab orders">
        <p>No lab orders</p>
      </DataStatus>,
    );
    expect(screen.getByRole('status', { name: 'Loading lab orders' })).toBeInTheDocument();
    expect(screen.queryByText('No lab orders')).not.toBeInTheDocument();
  });

  it('renders children only on success', () => {
    render(
      <DataStatus isLoading={false} isError={false} resource="lab orders">
        <p>No lab orders</p>
      </DataStatus>,
    );
    expect(screen.getByText('No lab orders')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('StatValue', () => {
  it('never renders 0 for a failed query', () => {
    render(<StatValue isLoading={false} isError value={0} resource="pending prescriptions" />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getByLabelText('pending prescriptions unavailable')).toHaveTextContent(DATA_UNAVAILABLE);
  });

  it('renders the value on success', () => {
    render(<StatValue isLoading={false} isError={false} value={3} resource="x" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
