/**
 * FUNC-17 regression: `/settings/audit-logs` and `/settings/health` crashed on
 * render because they destructured `hasPermission` from `usePermissions()`,
 * which does not return it. They also rendered outside the app shell, and the
 * health page fetched a relative `/functions/v1/health-check` from the SPA host.
 *
 * These tests use the real `usePermissions` hook so API drift fails here.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuditLogViewerPage from '@/pages/admin/AuditLogViewer';
import SystemHealthDashboardPage from '@/pages/admin/SystemHealthDashboard';

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: mockInvoke } },
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock('@/components/admin/AIMetricsChart', () => ({ AIMetricsChart: () => null }));

vi.mock('@/hooks/useActivityLogsPaginated', () => ({
  useActivityLogsPaginated: () => ({
    data: { logs: [], total: 0, pageCount: 1 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useActivityLogFilterOptions: () => ({
    data: { actionTypes: [], entityTypes: [], userIds: [] },
    isLoading: false,
  }),
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

function authAs(roles: string[]) {
  return {
    user: { id: 'user-1' },
    profile: { id: 'p-1', first_name: 'Ada', last_name: 'Admin', hospital_id: 'h-1' },
    hospital: { id: 'h-1', name: 'Test Hospital' },
    roles,
    primaryRole: roles[0] ?? null,
  };
}

describe('Admin audit-log and system-health pages (FUNC-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: 1,
        services: { database: 'healthy', auth: 'healthy', storage: 'healthy' },
        metrics: { response_time_ms: 12, memory_usage_mb: 64 },
      },
      error: null,
    });
  });

  it('audit-log page renders for an admin inside the dashboard layout', () => {
    mockUseAuth.mockReturnValue(authAs(['admin']));
    render(<AuditLogViewerPage />);
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it('system-health page renders for an admin and calls the edge function via supabase', async () => {
    mockUseAuth.mockReturnValue(authAs(['admin']));
    render(<SystemHealthDashboardPage />);
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
    await waitFor(() =>
      expect(mockInvoke).toHaveBeenCalledWith('health-check', expect.anything())
    );
    expect(await screen.findByText('HEALTHY')).toBeInTheDocument();
  });

  it('system-health page denies a non-admin without crashing', () => {
    mockUseAuth.mockReturnValue(authAs(['nurse']));
    render(<SystemHealthDashboardPage />);
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });
});
