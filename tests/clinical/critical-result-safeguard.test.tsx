/**
 * S0-08 interim safeguard: unacknowledged critical lab results are shown on
 * every dashboard, widening to all doctors/nurses at 5 min (ADR-0005 ladder).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  selectSafeguardAlerts,
  stageFor,
  readBackRecorded,
} from '@/lib/clinical/criticalResultSafeguard';

const NOW = new Date('2026-11-05T10:00:00Z').getTime();
const minsAgo = (m: number) => new Date(NOW - m * 60000).toISOString();
const order = (over: Record<string, unknown> = {}) => ({
  id: 'lo-1',
  is_critical: true,
  status: 'completed',
  ordered_by: 'prof-doc-1',
  critical_notified_at: minsAgo(1),
  results: { criticalSummary: 'K+ 6.9' },
  ...over,
});

describe('selectSafeguardAlerts', () => {
  it('stages follow the 5/10-minute ladder', () => {
    expect(stageFor(0)).toBe('primary');
    expect(stageFor(5)).toBe('on_call');
    expect(stageFor(10)).toBe('ed');
  });

  it('shows a fresh critical result to the ordering doctor and the lab, not other doctors', () => {
    const o = [order()];
    expect(selectSafeguardAlerts(o, { profileId: 'prof-doc-1', roles: ['doctor'] }, NOW)).toHaveLength(1);
    expect(selectSafeguardAlerts(o, { profileId: 'x', roles: ['lab_technician'] }, NOW)).toHaveLength(1);
    expect(selectSafeguardAlerts(o, { profileId: 'prof-doc-2', roles: ['doctor'] }, NOW)).toHaveLength(0);
    expect(selectSafeguardAlerts(o, { profileId: 'r', roles: ['receptionist'] }, NOW)).toHaveLength(0);
  });

  it('widens to every doctor and nurse after 5 minutes, ED stage after 10', () => {
    const at6 = selectSafeguardAlerts([order({ critical_notified_at: minsAgo(6) })], { profileId: 'n', roles: ['nurse'] }, NOW);
    expect(at6[0]?.stage).toBe('on_call');
    const at11 = selectSafeguardAlerts([order({ critical_notified_at: minsAgo(11) })], { profileId: 'd2', roles: ['doctor'] }, NOW);
    expect(at11[0]?.stage).toBe('ed');
  });

  it('clears only on recorded read-back', () => {
    const acked = order({ results: { acknowledgment: { verbalReadBackConfirmed: true } } });
    expect(readBackRecorded(acked.results)).toBe(true);
    expect(selectSafeguardAlerts([acked], { roles: ['lab_technician'] }, NOW)).toHaveLength(0);
    expect(selectSafeguardAlerts([order({ results: { acknowledgment: { verbalReadBackConfirmed: false } } })], { roles: ['lab_technician'] }, NOW)).toHaveLength(1);
  });

  it('a clinician receipt hides it for that clinician only; the lab still sees it', () => {
    const o = [order()];
    const receipts = new Set(['lo-1']);
    expect(selectSafeguardAlerts(o, { profileId: 'prof-doc-1', roles: ['doctor'] }, NOW, receipts)).toHaveLength(0);
    expect(selectSafeguardAlerts(o, { roles: ['lab_technician'] }, NOW, receipts)).toHaveLength(1);
  });

  it('fails closed when the result has no timestamp (treated as overdue)', () => {
    const o = [order({ critical_notified_at: null, completed_at: null, updated_at: null })];
    expect(selectSafeguardAlerts(o, { profileId: 'n', roles: ['nurse'] }, NOW)[0]?.stage).toBe('ed');
  });

  it('ignores non-critical and cancelled orders, sorts oldest first', () => {
    const list = selectSafeguardAlerts(
      [order({ id: 'a', is_critical: false }), order({ id: 'b', status: 'cancelled' }), order({ id: 'c' }), order({ id: 'd', critical_notified_at: minsAgo(8) })],
      { roles: ['admin'] },
      NOW
    );
    expect(list.map((a) => a.order.id)).toEqual(['d', 'c']);
  });
});

// ─── Banner ──────────────────────────────────────────────────────────────────

const mockUseAuth = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from } }));

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'order', 'limit', 'insert']) c[m] = vi.fn(() => c);
  (c as { then: unknown }).then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return c;
}

async function renderBanner() {
  const { CriticalResultSafeguardBanner } = await import('@/components/safety/CriticalResultSafeguardBanner');
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CriticalResultSafeguardBanner />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CriticalResultSafeguardBanner', () => {
  beforeEach(() => {
    from.mockReset();
    mockUseAuth.mockReturnValue({
      user: { id: 'u-doc-1' },
      profile: { id: 'prof-doc-1', hospital_id: 'h-1' },
      roles: ['doctor'],
    });
  });

  it('announces an unacknowledged critical result with role=alert', async () => {
    from.mockImplementation((table: string) =>
      table === 'lab_orders'
        ? chain({ data: [{ ...order({ critical_notified_at: new Date().toISOString() }), test_name: 'Potassium', patient_id: 'p1', patient: { first_name: 'Ana', last_name: 'Lee', mrn: 'MRN1' } }], error: null })
        : chain({ data: [], error: null })
    );
    await renderBanner();
    const region = await screen.findByRole('alert', { name: /unacknowledged critical lab results/i });
    expect(region).toHaveTextContent('Critical result: Potassium');
    expect(region).toHaveTextContent('Ana Lee');
    expect(screen.getByRole('button', { name: /i have reviewed this result/i })).toBeInTheDocument();
  });

  it('says the safeguard is down when lab orders cannot be loaded', async () => {
    from.mockImplementation((table: string) =>
      table === 'lab_orders' ? chain({ data: null, error: new Error('permission denied') }) : chain({ data: [], error: null })
    );
    await renderBanner();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/safeguard unavailable/i));
  });

  it('renders nothing for non-clinical roles', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u' }, profile: { id: 'p', hospital_id: 'h-1' }, roles: ['receptionist'] });
    from.mockImplementation(() => chain({ data: [], error: null }));
    const { container } = await renderBanner();
    expect(container).toBeEmptyDOMElement();
    expect(from).not.toHaveBeenCalled();
  });
});
