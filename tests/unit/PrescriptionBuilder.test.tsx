import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrescriptionBuilder } from '@/components/doctor/PrescriptionBuilder';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthValue = {
  profile: { id: 'doc-1', hospital_id: 'hosp-1' },
  hospital: { id: 'hosp-1', name: 'Test Hospital' },
  primaryRole: 'doctor',
  signOut: vi.fn(),
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider value={mockAuthValue}>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('PrescriptionBuilder Component', () => {
  const drugs = [
    {
      id: '1',
      name: 'Lisinopril',
      genericName: 'Enalapril',
      dosageForms: ['Tablet'],
      strengths: ['10mg', '20mg'],
      interactions: [],
    },
  ];

  it('renders search and empty state', () => {
    renderWithProviders(<PrescriptionBuilder patientId="patient-1" onSave={vi.fn()} existingDrugs={drugs} />);

    expect(screen.getByPlaceholderText(/search medications/i)).toBeInTheDocument();
    expect(screen.getByText(/no medications added yet/i)).toBeInTheDocument();
  });

  it('renders safely when allergies are provided', () => {
    renderWithProviders(
      <PrescriptionBuilder
        patientId="patient-1"
        onSave={vi.fn()}
        existingDrugs={drugs}
        patientAllergies={['Penicillin']}
      />
    );

    expect(screen.getByPlaceholderText(/search medications/i)).toBeInTheDocument();
  });

  it('shows empty hint before medications are selected', () => {
    renderWithProviders(<PrescriptionBuilder patientId="patient-1" onSave={vi.fn()} existingDrugs={drugs} />);
    expect(screen.getByText(/search and select medications above/i)).toBeInTheDocument();
  });
});
