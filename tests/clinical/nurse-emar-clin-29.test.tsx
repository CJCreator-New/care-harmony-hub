/**
 * CLIN-29 regression (and the same paginated-accessor defect as CLIN-28 on the eMAR page).
 *
 * 1. The nurse dashboard's "Administer Medication" shortcut opened
 *    MedicationAdministrationModal without prescription, patient or onAdminister,
 *    so confirming threw and nothing was charted. It now links to the eMAR page,
 *    where a due dose is selected first.
 * 2. The eMAR page (NurseMedicationsPage) called `.map`/`.find` on the paginated
 *    `usePatients()` result and crashed on render once patients loaded.
 */
import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NurseDashboard } from '@/components/dashboard/NurseDashboard';
import NurseMedicationsPage from '@/pages/nurse/NurseMedicationsPage';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { id: 'profile-1', first_name: 'Nina', hospital_id: 'h-1' },
    hospital: { id: 'h-1', name: 'Test Hospital' },
    roles: ['nurse'],
    primaryRole: 'nurse',
  }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'insert', 'update']) chain[m] = () => chain;
  chain.limit = () => Promise.resolve({ data: [], error: null });
  return { supabase: { from: () => chain } };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

// Dashboard: data hooks and heavy children.
vi.mock('@/hooks/useVitalSigns', () => ({ useTodayVitalsCount: () => ({ data: 0 }) }));
vi.mock('@/hooks/useQueue', () => ({ useActiveQueue: () => ({ data: [] }) }));
vi.mock('@/hooks/useNurseWorkflow', () => ({
  usePendingHandovers: () => ({ handovers: [] }),
  usePatientChecklists: () => ({ checklists: [] }),
}));
const { Null } = vi.hoisted(() => ({ Null: () => null }));
vi.mock('@/components/nurse/RecordVitalsModal', () => ({ RecordVitalsModal: Null }));
vi.mock('@/components/nurse/ShiftHandoverModal', () => ({ ShiftHandoverModal: Null }));
vi.mock('@/components/nurse/OfflineIndicator', () => ({ OfflineIndicator: Null }));
vi.mock('@/components/nurse/OfflineVitalsCaptureModal', () => ({ OfflineVitalsCaptureModal: Null }));
vi.mock('@/components/nurse/OfflineVitalsHistory', () => ({ OfflineVitalsHistory: Null }));
vi.mock('@/components/nurse/SyncProgressPanel', () => ({ SyncProgressPanel: Null }));
vi.mock('@/components/nurse/MobileLandscapeVitalsForm', () => ({ MobileLandscapeVitalsForm: Null }));
vi.mock('@/components/nurse/NursePatientQueue', () => ({ NursePatientQueue: Null }));
vi.mock('@/components/nurse/PatientPrepStation', () => ({ PatientPrepStation: Null }));
vi.mock('@/components/nurse/NurseTaskPanel', () => ({ NurseTaskPanel: Null }));
vi.mock('@/components/dashboard/DashboardPageTransition', () => ({
  DashboardPageTransition: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DashboardSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// eMAR page: data hooks, layout and modals.
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/lib/hooks/pharmacy/usePrescriptions', () => ({
  usePrescriptions: () => ({ data: [], isLoading: false }),
}));
vi.mock('@/lib/hooks/patients', () => ({
  usePatient: () => ({ data: null }),
  usePatients: () => ({
    data: {
      patients: [{ id: 'p-1', first_name: 'Ada', last_name: 'Lovelace', mrn: 'MRN-001' }],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    },
  }),
}));
vi.mock('@/components/nurse/BarcodeVerificationModal', () => ({ BarcodeVerificationModal: Null }));
vi.mock('@/components/nurse/MedicationAdministrationModal', () => ({
  MedicationAdministrationModal: Null,
}));
vi.mock('@/components/nurse/DoseWithholdingModal', () => ({ DoseWithholdingModal: Null }));
vi.mock('@/components/nurse/PRNAdministrationModal', () => ({ PRNAdministrationModal: Null }));
vi.mock('@/components/nurse/PRNEffectivenessModal', () => ({ PRNEffectivenessModal: Null }));

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Nurse medication administration entry points (CLIN-29)', () => {
  it('the dashboard shortcut links to the eMAR page instead of opening an empty modal', () => {
    renderWithProviders(<NurseDashboard />);
    const shortcut = screen.getByRole('link', { name: /administer medication/i });
    expect(shortcut).toHaveAttribute('href', '/hospital/nurse/medications');
  });

  it('the eMAR page renders with a paginated usePatients result and lists the patient', () => {
    renderWithProviders(<NurseMedicationsPage />);
    expect(screen.getByRole('option', { name: /Ada Lovelace/ })).toBeInTheDocument();
  });
});
