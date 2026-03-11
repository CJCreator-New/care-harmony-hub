/**
 * T-P05: Consultation Transformers Unit Tests
 * Tests transformConsultationFromService from @/utils/consultationTransformers.
 * Heavy module transitive deps are mocked so the test stays fast and isolated.
 *
 * Pyramid layer: UNIT (70%)
 * F.I.R.S.T.: Fast (<1ms), Isolated, Repeatable, Self-validating, Timely
 */
import { describe, it, expect, vi } from 'vitest';

// Mock all heavy transitive deps pulled in by useConsultations and its imports
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));
vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: vi.fn(),
  WORKFLOW_EVENT_TYPES: {},
}));
vi.mock('@/utils/rateLimitBackoff', () => ({
  executeWithRateLimitBackoff: vi.fn((fn: () => unknown) => fn()),
}));

import {
  transformConsultationFromService,
  transformConsultationsFromService,
} from '@/utils/consultationTransformers';
import type { Consultation as ServiceConsultation } from '@/types/clinical';

function makeServiceConsultation(
  overrides: Partial<ServiceConsultation> = {}
): ServiceConsultation {
  return {
    id: 'consult-1',
    patient_id: 'patient-1',
    provider_id: 'doctor-1',
    hospital_id: 'hospital-1',
    consultation_type: 'initial',
    status: 'in-progress',
    chief_complaint: 'Fever and cough',
    history_of_present_illness: '3 days of high fever',
    vital_signs: { heart_rate: 88, temperature: 38.5 },
    physical_examination: 'Chest auscultation normal',
    diagnosis_codes: ['J11.1', 'R50.9'],
    medications_prescribed: [],
    lab_orders: ['CBC', 'CXR'],
    follow_up_instructions: 'Return in 5 days',
    clinical_notes: 'Viral flu likely',
    started_at: '2024-06-01T08:00:00.000Z',
    completed_at: undefined,
    created_at: '2024-06-01T07:55:00.000Z',
    updated_at: '2024-06-01T08:05:00.000Z',
    created_by: 'doctor-1',
    updated_by: 'doctor-1',
    plan: 'Rest and fluids',
    ...overrides,
  };
}

describe('transformConsultationFromService', () => {
  it('maps provider_id to doctor_id', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.doctor_id).toBe('doctor-1');
  });

  it('normalises "in-progress" status to "clinical_assessment"', () => {
    const result = transformConsultationFromService(makeServiceConsultation({ status: 'in-progress' }));
    expect(result.status).toBe('clinical_assessment');
  });

  it('normalises "in_progress" status to "clinical_assessment"', () => {
    const svc = makeServiceConsultation({ status: 'in-progress' });
    // Override status to simulate in_progress string from DB
    const result = transformConsultationFromService({ ...svc, status: 'in_progress' as any });
    expect(result.status).toBe('clinical_assessment');
  });

  it('preserves "completed" status unchanged', () => {
    const result = transformConsultationFromService(makeServiceConsultation({ status: 'completed' }));
    expect(result.status).toBe('completed');
    expect(result.consultation_status).toBe('completed');
  });

  it('preserves "cancelled" status unchanged', () => {
    const result = transformConsultationFromService(makeServiceConsultation({ status: 'cancelled' }));
    expect(result.status).toBe('cancelled');
    expect(result.consultation_status).toBe('cancelled');
  });

  it('sets consultation_status to "active" for in-progress', () => {
    const result = transformConsultationFromService(makeServiceConsultation({ status: 'in-progress' }));
    expect(result.consultation_status).toBe('active');
  });

  it('maps vital_signs to vitals', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.vitals).toEqual({ heart_rate: 88, temperature: 38.5 });
  });

  it('defaults vitals to empty object when vital_signs absent', () => {
    const result = transformConsultationFromService(
      makeServiceConsultation({ vital_signs: undefined })
    );
    expect(result.vitals).toEqual({});
  });

  it('maps physical_examination string to object with notes key', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.physical_examination).toEqual({ notes: 'Chest auscultation normal' });
  });

  it('defaults physical_examination to empty object when absent', () => {
    const result = transformConsultationFromService(
      makeServiceConsultation({ physical_examination: undefined })
    );
    expect(result.physical_examination).toEqual({});
  });

  it('maps diagnosis_codes to both provisional and final diagnosis', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.provisional_diagnosis).toEqual(['J11.1', 'R50.9']);
    expect(result.final_diagnosis).toEqual(['J11.1', 'R50.9']);
  });

  it('defaults diagnosis arrays to [] when diagnosis_codes absent', () => {
    const result = transformConsultationFromService(
      makeServiceConsultation({ diagnosis_codes: undefined })
    );
    expect(result.provisional_diagnosis).toEqual([]);
    expect(result.final_diagnosis).toEqual([]);
  });

  it('maps plan to treatment_plan', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.treatment_plan).toBe('Rest and fluids');
  });

  it('maps lab_orders array', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.lab_orders).toEqual(['CBC', 'CXR']);
  });

  it('maps follow_up_instructions to follow_up_notes', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.follow_up_notes).toBe('Return in 5 days');
  });

  it('sets pharmacy_notified / lab_notified / billing_notified to false', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.pharmacy_notified).toBe(false);
    expect(result.lab_notified).toBe(false);
    expect(result.billing_notified).toBe(false);
  });

  it('preserves original patient_id and hospital_id', () => {
    const result = transformConsultationFromService(makeServiceConsultation());
    expect(result.patient_id).toBe('patient-1');
    expect(result.hospital_id).toBe('hospital-1');
  });
});

describe('transformConsultationsFromService', () => {
  it('maps an array of consultations', () => {
    const input = [
      makeServiceConsultation({ id: 'c-1', status: 'completed' }),
      makeServiceConsultation({ id: 'c-2', status: 'cancelled' }),
    ];
    const result = transformConsultationsFromService(input);
    expect(result).toHaveLength(2);
    expect(result[0].status).toBe('completed');
    expect(result[1].status).toBe('cancelled');
  });

  it('returns empty array for empty input', () => {
    expect(transformConsultationsFromService([])).toEqual([]);
  });
});
