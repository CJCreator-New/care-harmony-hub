import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PrescriptionBuilder } from '@/components/doctor/PrescriptionBuilder';  

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: 'doctor-1' },
    profile: { id: 'doc-prof-1', first_name: 'Dr', last_name: 'Smith' },
    hospital: { id: 'hospital-1' },
    primaryRole: 'doctor'
  })
}));
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithContext = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('PrescriptionBuilder Integration Tests', () => {
  const mockDrugs = [
    {
      id: 'drug-1',
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      dosageForms: ['Tablet'],
      strengths: ['500mg'],
      interactions: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders medication search and save actions', () => {
    renderWithContext(
      <PrescriptionBuilder
        patientId="patient-123"
        onSave={vi.fn()}
        existingDrugs={mockDrugs}
      />
    );

    expect(screen.getByPlaceholderText(/search medications/i)).toBeInTheDocument();
    expect(screen.getByText(/no medications added yet/i)).toBeInTheDocument();
  });

  it('renders safely when allergies are provided', async () => {
    renderWithContext(
      <PrescriptionBuilder
        patientId="patient-123"
        onSave={vi.fn()}
        existingDrugs={mockDrugs}
        patientAllergies={['Amoxicillin']}
      />
    );

    expect(screen.getByPlaceholderText(/search medications/i)).toBeInTheDocument();
  });
});
