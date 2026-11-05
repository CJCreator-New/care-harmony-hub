import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GroupedSidebar } from '@/components/layout/GroupedSidebar';
import { routeManifest } from '@/config/routeManifest';

// Route access and feature flags are not under test here; every item is treated as visible.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ primaryRole: 'admin' }),
}));
vi.mock('@/hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ isEnabled: () => true, isLoading: false }),
}));
vi.mock('@/modules/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/modules/rbac')>();
  return {
    ...actual,
    decideRouteAccess: () => ({ allowed: true }),
    resolveActingRole: ({ primaryRole }: { primaryRole: string }) => primaryRole,
  };
});

const firstItem = routeManifest.flatMap((group) => group.items)[0];

function renderSidebar(collapsed: boolean) {
  return render(
    <MemoryRouter initialEntries={[firstItem.href]}>
      <GroupedSidebar userRole="admin" collapsed={collapsed} />
    </MemoryRouter>,
  );
}

describe('GroupedSidebar semantics (A11Y-05)', () => {
  it('never nests an interactive element inside a link', () => {
    const { container } = renderSidebar(false);

    expect(container.querySelectorAll('a button')).toHaveLength(0);
    expect(container.querySelectorAll('a a')).toHaveLength(0);
  });

  it('gives each expanded nav item one link as its tab stop, marked aria-current when active', () => {
    renderSidebar(false);

    const link = screen.getByRole('link', { name: (name) => name.includes(firstItem.label) });
    expect(link).toHaveAttribute('href', firstItem.href);
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).not.toHaveAttribute('tabindex', '-1');
  });

  it('keeps every collapsed icon link named and free of nested buttons', () => {
    const { container } = renderSidebar(true);

    expect(container.querySelectorAll('a button')).toHaveLength(0);
    // Icon-only triggers (group menus, single-item links) must each have a name.
    const controls = Array.from(container.querySelectorAll('a, button'));
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control.getAttribute('aria-label')).toBeTruthy();
    }
  });

  it('labels the navigation landmark', () => {
    renderSidebar(false);

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
