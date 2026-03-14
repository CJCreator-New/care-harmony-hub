import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrescriptionBuilder } from '@/components/doctor/PrescriptionBuilder';

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
    render(<PrescriptionBuilder patientId="patient-1" onSave={vi.fn()} existingDrugs={drugs} />);

    expect(screen.getByPlaceholderText(/search medications/i)).toBeInTheDocument();
    expect(screen.getByText(/no medications added yet/i)).toBeInTheDocument();
  });

  it('renders safely when allergies are provided', () => {
    render(
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
    render(<PrescriptionBuilder patientId="patient-1" onSave={vi.fn()} existingDrugs={drugs} />);
    expect(screen.getByText(/search and select medications above/i)).toBeInTheDocument();
  });
});
