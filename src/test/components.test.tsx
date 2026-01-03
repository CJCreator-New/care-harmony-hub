import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

describe('Button Component', () => {
  it('renders correctly', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    expect(getByRole('button', { name: /click me/i })).toBeDefined();
  });

  it('handles click events', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    expect(getByRole('button')).toHaveProperty('disabled', true);
  });

  it('renders different variants', () => {
    const { getByRole, rerender } = render(<Button variant="destructive">Delete</Button>);
    expect(getByRole('button')).toBeDefined();

    rerender(<Button variant="outline">Outline</Button>);
    expect(getByRole('button')).toBeDefined();

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(getByRole('button')).toBeDefined();
  });
});

describe('Input Component', () => {
  it('renders correctly', () => {
    const { getByPlaceholderText } = render(<Input placeholder="Enter text" />);
    expect(getByPlaceholderText('Enter text')).toBeDefined();
  });

  it('handles value changes', async () => {
    const handleChange = vi.fn();
    const { getByRole } = render(<Input onChange={handleChange} />);
    
    await userEvent.type(getByRole('textbox'), 'Hello');
    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    const { getByRole } = render(<Input disabled />);
    expect(getByRole('textbox')).toHaveProperty('disabled', true);
  });
});

describe('Card Component', () => {
  it('renders with title and content', () => {
    const { getByText } = render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
        </CardHeader>
        <CardContent>Card content here</CardContent>
      </Card>
    );
    
    expect(getByText('Test Card')).toBeDefined();
    expect(getByText('Card content here')).toBeDefined();
  });
});
