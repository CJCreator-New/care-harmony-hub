import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// The shell pulls in auth, realtime, search and banner modules. They are stubbed so the
// test exercises only the layout's own semantics: drawer inert state, focus and landmarks.
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: null,
    hospital: null,
    primaryRole: 'admin',
    roles: ['admin'],
    user: null,
    logout: vi.fn(),
  }),
}));
vi.mock('@/hooks/useActivityLog', () => ({ useActivityLog: () => ({ logActivity: vi.fn() }) }));
vi.mock('@/hooks/usePageTitle', () => ({ usePageTitle: () => undefined }));
vi.mock('@/components/common/NotificationsSystem', () => ({ NotificationsSystem: () => null }));
vi.mock('@/components/theme/ThemeToggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/layout/GroupedSidebar', () => ({
  GroupedSidebar: () => (
    <nav aria-label="Main navigation">
      <a href="/dashboard">Dashboard</a>
    </nav>
  ),
}));
vi.mock('@/components/navigation/Breadcrumb', () => ({ Breadcrumb: () => null }));
vi.mock('@/components/auth/RoleSwitcher', () => ({ RoleSwitcher: () => null }));
vi.mock('@/components/admin/ConnectionStatusBanner', () => ({ ConnectionStatusBanner: () => null }));
vi.mock('@/components/labs/CriticalLabAlertBanner', () => ({ CriticalLabAlertBanner: () => null }));
vi.mock('@/components/safety/CriticalResultSafeguardBanner', () => ({
  CriticalResultSafeguardBanner: () => null,
}));
vi.mock('@/hooks/useCriticalLabAlerts', () => ({
  useCriticalLabAlerts: () => ({
    alerts: [],
    isLoading: false,
    acknowledgeAlert: vi.fn(),
    resolveAlert: vi.fn(),
  }),
}));
vi.mock('@/components/search/GlobalSearchDialog', () => ({ GlobalSearchDialog: () => null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/utils/devRoleSwitch', () => ({
  getDevTestRole: () => null,
  setDevTestRole: vi.fn(),
  clearDevTestRole: vi.fn(),
}));

function setNarrowViewport(narrow: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: narrow,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <DashboardLayout>
        <p>Page body</p>
      </DashboardLayout>
    </MemoryRouter>,
  );
}

function getSidebar(container: HTMLElement) {
  const aside = container.querySelector('aside');
  if (!aside) throw new Error('sidebar aside not rendered');
  return aside;
}

describe('DashboardLayout accessibility semantics (A11Y-04, A11Y-12)', () => {
  beforeEach(() => {
    setNarrowViewport(true);
  });

  it('makes the off-canvas sidebar inert while closed on narrow screens', () => {
    const { container } = renderLayout();
    const aside = getSidebar(container);

    expect(aside).toHaveAttribute('inert');
    expect(aside).toHaveAttribute('aria-label', 'Application sidebar');
  });

  it('removes inert from the drawer when opened and moves focus into it', () => {
    const { container } = renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    expect(getSidebar(container)).not.toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveFocus();
  });

  it('makes the page behind an open drawer inert so focus stays in the drawer', () => {
    const { container } = renderLayout();
    const main = screen.getByRole('main');

    expect(main.parentElement).not.toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(main.parentElement).toHaveAttribute('inert');
    expect(getSidebar(container)).not.toHaveAttribute('inert');
  });

  it('returns focus to the menu trigger and restores inert when Escape closes the drawer', () => {
    const { container } = renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(getSidebar(container)).toHaveAttribute('inert');
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveFocus();
  });

  it('returns focus to the trigger when the close button is used', () => {
    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));

    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveFocus();
  });

  it('never makes the sidebar inert on wide screens, where it is always visible', () => {
    setNarrowViewport(false);
    const { container } = renderLayout();

    expect(getSidebar(container)).not.toHaveAttribute('inert');
  });

  it('exposes one labelled main landmark that the skip link can move focus into', () => {
    renderLayout();
    const main = screen.getByRole('main');

    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
