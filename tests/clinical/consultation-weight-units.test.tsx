/**
 * CLIN-09 / S1-09: consultation vitals carry explicit units, and only a weight
 * with a known unit reaches the pediatric weight-based dose check.
 *
 * Chain under test (as wired in ConsultationWorkflowPage):
 *   consultation.vitals --verifiedWeightKg--> usePatientClinicalContext({ weightKg })
 *   --> order-safety engine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { verifiedWeightKg } from '@/modules/vital-signs';
import {
  HeadlessOrderSafetyEngine,
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
  toOrderItems,
  usePatientClinicalContext,
  type PatientClinicalContext,
} from '@/modules/order-safety';
import {
  buildNurseVitalsPatch,
  weightNeedsUnit,
} from '@/components/consultations/steps/consultationVitals';

const mocks = vi.hoisted(() => ({
  loadPatientClinicalRecord: vi.fn(),
  latestVitals: { data: null as unknown, isLoading: false },
}));

vi.mock('@/modules/order-safety/adapters/SupabaseAdapters', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  loadPatientClinicalRecord: mocks.loadPatientClinicalRecord,
}));
vi.mock('@/hooks/useVitalSigns', () => ({ useLatestVitals: () => mocks.latestVitals }));
vi.mock('@/components/consultations/HPITemplateSelector', () => ({ HPITemplateSelector: () => null }));

import { ChiefComplaintStep } from '@/components/consultations/steps/ChiefComplaintStep';

const HOSPITAL = 'hospital-a';
const childRecord = {
  patientId: 'child-1',
  hospitalId: HOSPITAL,
  ageYears: 5,
  ageMonths: 62,
  allergies: [],
  allergyStatusUnknown: false,
  homeMedications: [],
  activePrescriptionMedications: [],
  gaps: [],
};
const actor = { userId: 'doctor-1', hospitalId: HOSPITAL, role: 'doctor' as const };

function engine() {
  return new HeadlessOrderSafetyEngine({
    localDdiRepo: new InMemoryLocalDdiAdapter(),
    rxNormPort: new MockRxNormAdapter(),
    auditLogger: new SpyAuditLoggerAdapter(),
  });
}

async function contextFor(consultationVitals: Record<string, unknown>): Promise<PatientClinicalContext> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => usePatientClinicalContext({ patientId: 'child-1', weightKg: verifiedWeightKg(consultationVitals) }),
    { wrapper }
  );
  await waitFor(() => expect(result.current.context).not.toBeNull());
  return result.current.context as PatientClinicalContext;
}

async function pediatricFindings(consultationVitals: Record<string, unknown>) {
  const patient = await contextFor(consultationVitals);
  const assessment = await engine().evaluate({
    actor,
    patient,
    items: toOrderItems([{ medication_name: 'Amoxicillin', dosage: '400 mg', frequency: 'BID' }], 'rx'),
  });
  return { patient, assessment, codes: assessment.findings.map((f) => f.code) };
}

describe('CLIN-09: weight reaches the pediatric dose check only with a known unit', () => {
  beforeEach(() => {
    mocks.loadPatientClinicalRecord.mockResolvedValue(childRecord);
  });

  it('a 20 kg child with a weight-based drug no longer gets PEDIATRIC_WEIGHT_UNAVAILABLE', async () => {
    const { patient, assessment, codes } = await pediatricFindings({ weight: '20', weight_unit: 'kg' });
    expect(patient.weightKg).toBe(20);
    expect(codes.some((c) => c.startsWith('PEDIATRIC_WEIGHT_UNAVAILABLE_'))).toBe(false);
    // 400 mg BID = 40 mg/kg/day, inside the AAP amoxicillin ceiling.
    expect(assessment.findings.some((f) => f.kind === 'PEDIATRIC_DOSE_LIMIT')).toBe(false);
    expect(assessment.canProceed).toBe(true);
  });

  it('converts a weight entered in lb', async () => {
    const { patient, codes } = await pediatricFindings({ weight: '44', weight_unit: 'lb' });
    expect(patient.weightKg).toBeCloseTo(19.96, 2);
    expect(codes.some((c) => c.startsWith('PEDIATRIC_WEIGHT_UNAVAILABLE_'))).toBe(false);
  });

  it('a unit-less weight is not used: the check still requires an override', async () => {
    const { patient, assessment, codes } = await pediatricFindings({ weight: '20' });
    expect(patient.weightKg).toBeUndefined();
    expect(codes.some((c) => c.startsWith('PEDIATRIC_WEIGHT_UNAVAILABLE_'))).toBe(true);
    expect(assessment.canProceed).toBe(false);
  });

  it('a 20 lb weight is not read as 20 kg (would hide a 2.2x overdose)', async () => {
    // 400 mg BID for a 9 kg child is ~89 mg/kg/day, near the AAP ceiling.
    const { patient } = await pediatricFindings({ weight: '20', weight_unit: 'lb' });
    expect(patient.weightKg).toBeCloseTo(9.07, 2);
  });
});

describe('CLIN-09: copying nurse vitals into the consultation form', () => {
  const nurse = { temperature: 37.2, heart_rate: 96, weight: 20, height: 110, pain_level: 0 };

  it('copies weight and height with the unit cleared, so the doctor must state it', () => {
    const patch = buildNurseVitalsPatch({}, nurse);
    expect(patch).toMatchObject({ weight: '20', weight_unit: null, height: '110', height_unit: null });
    expect(verifiedWeightKg(patch)).toBeUndefined();
    expect(weightNeedsUnit(patch)).toBe(true);
  });

  it('drops a unit the doctor picked before copying (it described their entry, not the nurse value)', () => {
    const patch = buildNurseVitalsPatch({ weight_unit: 'kg' }, nurse);
    expect(verifiedWeightKg({ weight_unit: 'kg', ...patch })).toBeUndefined();
  });

  it('records the temperature unit from the value (°C and °F ranges do not overlap)', () => {
    expect(buildNurseVitalsPatch({}, { temperature: 37.2 }).temperature_unit).toBe('celsius');
    expect(buildNurseVitalsPatch({}, { temperature: 99.1 }).temperature_unit).toBe('fahrenheit');
  });

  it('never overwrites what the doctor entered, and copies a pain score of 0', () => {
    const patch = buildNurseVitalsPatch({ weight: '21', weight_unit: 'kg', heart_rate: '88' }, nurse);
    expect(patch).not.toHaveProperty('weight');
    expect(patch).not.toHaveProperty('weight_unit');
    expect(patch).not.toHaveProperty('heart_rate');
    expect(patch.pain_level).toBe('0');
  });
});

describe('CLIN-09: ChiefComplaintStep unit controls', () => {
  function renderStep(vitals: Record<string, unknown>) {
    const onUpdate = vi.fn();
    render(<ChiefComplaintStep data={{ vitals }} onUpdate={onUpdate} patient={{ id: 'child-1', first_name: 'A', last_name: 'B' }} />);
    return onUpdate;
  }

  beforeEach(() => {
    mocks.latestVitals = { data: null, isLoading: false };
  });

  it('no longer labels weight as lbs; warns when a weight has no unit', () => {
    renderStep({ weight: '20' });
    expect(screen.queryByText(/Weight \(lbs\)/)).not.toBeInTheDocument();
    expect(screen.getByText(/Weight without a unit is not used for dose checks/)).toBeInTheDocument();
  });

  it('stores the unit the doctor selects under weight_unit', () => {
    const onUpdate = renderStep({ weight: '20' });
    fireEvent.click(screen.getByRole('button', { name: 'Weight in kg' }));
    expect(onUpdate).toHaveBeenCalledWith('vitals', { weight: '20', weight_unit: 'kg' });
  });

  it('"Use these vitals" copies the nurse weight without a unit', () => {
    mocks.latestVitals = { data: { weight: 20, temperature: 37 }, isLoading: false };
    const onUpdate = renderStep({ weight_unit: 'lb' });
    fireEvent.click(screen.getByRole('button', { name: /Use these vitals/ }));
    expect(onUpdate).toHaveBeenCalledWith(
      'vitals',
      expect.objectContaining({ weight: '20', weight_unit: null, temperature: '37', temperature_unit: 'celsius' })
    );
  });
});
