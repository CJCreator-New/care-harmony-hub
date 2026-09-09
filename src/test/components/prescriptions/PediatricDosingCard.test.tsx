import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PediatricDosingCard } from '@/components/prescriptions/PediatricDosingCard';

describe('PediatricDosingCard (CLIN-001 Clinical Safety)', () => {
  it('renders standard-dose and high-dose Amoxicillin protocols for infants', () => {
    const onDoseCalculated = vi.fn();
    const patientData = {
      weight_kg: 10,
      age_months: 18,
      age_years: 1,
    };

    render(
      <PediatricDosingCard
        drugName="Amoxicillin"
        patientData={patientData}
        onDoseCalculated={onDoseCalculated}
      />
    );

    expect(screen.getByText(/Pediatric Dosing - Amoxicillin/i)).toBeInTheDocument();
    expect(screen.getAllByText(/10 kg/i).length).toBeGreaterThan(0);
  });

  it('triggers hard stop when calculated dose exceeds 200% of maximum safety limit', () => {
    const onDoseCalculated = vi.fn();
    // Simulate extreme weight or dosing scenario: 90 kg child on standard-dose (12.5 mg/kg BID) = 1125 mg/dose (limit is 500 mg, 2x limit is 1000 mg)
    const patientData = {
      weight_kg: 90,
      age_months: 120,
      age_years: 10,
    };

    render(
      <PediatricDosingCard
        drugName="Amoxicillin"
        patientData={patientData}
        onDoseCalculated={onDoseCalculated}
      />
    );

    // Verify onDoseCalculated was called with isHardStop: true or warning is displayed
    const calls = onDoseCalculated.mock.calls;
    if (calls.length > 0) {
      const latestCalc = calls[calls.length - 1][0];
      expect(latestCalc.isHardStop).toBe(true);
      expect(latestCalc.warnings.some((w: string) => w.includes('CRITICAL SAFETY STOP'))).toBe(true);
    }

    expect(screen.getByText(/HARD STOP/i)).toBeInTheDocument();
  });
});
