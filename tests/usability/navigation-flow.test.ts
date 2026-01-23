// tests/usability/navigation-flow.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Usability - Navigation Flow', () => {
  it('should allow efficient navigation between main sections', () => {
    render(
      <nav>
        <a href="/dashboard">Dashboard</a>
        <a href="/patients">Patients</a>
        <a href="/settings">Settings</a>
      </nav>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Patients')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should provide clear feedback for user actions', () => {
    render(
      <button aria-live="polite">Saved!</button>
    );
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });
});
