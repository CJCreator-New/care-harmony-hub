import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ARIA Labels and Roles', () => {
  it('should have proper ARIA labels on interactive elements', () => {
    render(
      <div>
        <button aria-label="Close modal">×</button>
        <button aria-label="Open menu">☰</button>
        <input aria-label="Search patients" type="search" />
      </div>
    );

    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
    expect(screen.getByLabelText('Search patients')).toBeInTheDocument();
  });

  it('should use semantic HTML roles', () => {
    render(
      <div>
        <nav role="navigation">Navigation</nav>
        <main role="main">Main Content</main>
        <aside role="complementary">Sidebar</aside>
      </div>
    );

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('should have aria-live regions for dynamic content', () => {
    render(
      <div>
        <div aria-live="polite" aria-atomic="true">
          Appointment saved successfully
        </div>
        <div aria-live="assertive">
          Error: Please fill required fields
        </div>
      </div>
    );

    const politeRegion = screen.getByText('Appointment saved successfully');
    expect(politeRegion).toHaveAttribute('aria-live', 'polite');

    const assertiveRegion = screen.getByText(/Error:/);
    expect(assertiveRegion).toHaveAttribute('aria-live', 'assertive');
  });

  it('should mark required fields with aria-required', () => {
    render(
      <form>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" aria-required="true" required />
        <label htmlFor="phone">Phone (optional)</label>
        <input id="phone" type="tel" />
      </form>
    );

    const emailInput = screen.getByLabelText('Email');
    expect(emailInput).toHaveAttribute('aria-required', 'true');
  });

  it('should use aria-expanded for collapsible content', () => {
    const { rerender } = render(
      <button aria-expanded="false" aria-controls="menu">
        Menu
      </button>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <button aria-expanded="true" aria-controls="menu">
        Menu
      </button>
    );

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });
});
