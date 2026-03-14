import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PrescriptionBuilder } from '@/components/doctor/PrescriptionBuilder';

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
    render(
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
    render(
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
