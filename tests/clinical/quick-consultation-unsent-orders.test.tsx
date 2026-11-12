/**
 * S0-07 follow-up: QuickConsultationModal must never silently discard a
 * clinical order the doctor entered. A saved prescription is a pharmacy order
 * (useCreatePrescription queues it for pharmacist review, ADR-0004), so with
 * prescriptions entered and "Send to Pharmacy" unticked, completion is blocked
 * with a clear message instead of dropping them. Same for lab orders.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';

const mocks = vi.hoisted(() => ({
  updateConsultation: vi.fn(),
  createPrescription: vi.fn(),
  createLabOrder: vi.fn(),
  clearAndSign: vi.fn(),
  buildPrescriptionSafetyColumns: vi.fn(),
}));

vi.mock('@/hooks/useConsultations', () => ({
  useUpdateConsultation: () => ({ mutateAsync: mocks.updateConsultation }),
}));
vi.mock('@/lib/hooks/pharmacy', () => ({
  useCreatePrescription: () => ({ mutateAsync: mocks.createPrescription }),
}));
vi.mock('@/hooks/useLabOrders', () => ({
  useCreateLabOrder: () => ({ mutateAsync: mocks.createLabOrder }),
}));
vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: vi.fn().mockResolvedValue(undefined) }),
  WORKFLOW_EVENT_TYPES: {
    PRESCRIPTION_CREATED: 'prescription_created',
    LAB_ORDER_CREATED: 'lab_order_created',
    CONSULTATION_COMPLETED: 'consultation_completed',
  },
}));
vi.mock('@/hooks/useClinicalMetrics', () => ({
  useClinicalMetrics: () => ({
    recordOperation: (_meta: unknown, fn: () => Promise<unknown>) => fn(),
    recordCustomEvent: vi.fn(),
    recordError: vi.fn(),
  }),
}));
vi.mock('@/modules/order-safety', () => ({
  usePatientClinicalContext: () => ({ context: null, isLoading: false, loadError: null, refetch: vi.fn() }),
  useOrderSafety: () => ({
    canProceed: true,
    findings: [],
    hardStops: [],
    unhandledOverrides: [],
    errorMessage: null,
    clearAndSign: mocks.clearAndSign,
  }),
  toOrderItems: (rows: unknown[]) => rows,
  overrideSummary: () => '',
  buildPrescriptionSafetyColumns: mocks.buildPrescriptionSafetyColumns,
}));
vi.mock('@/components/prescriptions/OrderSafetyPanel', () => ({ OrderSafetyPanel: () => null }));
vi.mock('@/components/consultations/ICD10Autocomplete', () => ({
  ICD10Autocomplete: ({ onSelect }: { onSelect: (c: unknown) => void }) => (
    <button type="button" onClick={() => onSelect({ code: 'J02.9', short_description: 'Acute pharyngitis' })}>
      pick diagnosis
    </button>
  ),
}));
vi.mock('@/components/consultations/CPTCodeMapper', () => ({ CPTCodeMapper: () => null }));
vi.mock('@/components/doctor/VoiceDocumentation', () => ({ VoiceDocumentation: () => null }));

import { QuickConsultationModal } from '@/components/consultations/QuickConsultationModal';

const consultation = {
  id: 'c-1',
  patient_id: 'pt-1',
  hospital_id: 'h-1',
  doctor_id: 'd-1',
  patient: { first_name: 'Ada', last_name: 'Lovelace' },
};

function renderModal() {
  const onOpenChange = vi.fn();
  render(<QuickConsultationModal open onOpenChange={onOpenChange} consultation={consultation} />);
  fireEvent.click(screen.getByText('pick diagnosis'));
  return { onOpenChange };
}

function addPrescription(medication = 'Amoxicillin', dosage = '500 mg', frequency = 'TID') {
  fireEvent.change(screen.getByPlaceholderText('Medication'), { target: { value: medication } });
  fireEvent.change(screen.getByPlaceholderText('Dosage'), { target: { value: dosage } });
  fireEvent.change(screen.getByPlaceholderText('Frequency'), { target: { value: frequency } });
  fireEvent.click(screen.getByRole('button', { name: '+ Add Prescription' }));
}

const complete = () => fireEvent.click(screen.getByRole('button', { name: /Complete Consultation/ }));

describe('QuickConsultationModal: entered orders are never silently discarded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateConsultation.mockResolvedValue({});
    mocks.createPrescription.mockResolvedValue({ id: 'rx-1' });
    mocks.createLabOrder.mockResolvedValue({ id: 'lab-1' });
    mocks.clearAndSign.mockResolvedValue({ receiptId: 'r-1', overridesApplied: [] });
    mocks.buildPrescriptionSafetyColumns.mockReturnValue({
      allergy_alerts: [],
      drug_interactions: [],
      verification_required: false,
    });
  });

  it('blocks completion when prescriptions are entered but "Send to Pharmacy" is unticked', async () => {
    renderModal();
    addPrescription();
    expect(screen.getByText(/cannot be completed with unsent prescriptions/)).toBeInTheDocument();

    complete();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/1 prescription\(s\) entered but "Send to Pharmacy" is not ticked/))
    );
    expect(mocks.updateConsultation).not.toHaveBeenCalled();
    expect(mocks.createPrescription).not.toHaveBeenCalled();
    expect(mocks.clearAndSign).not.toHaveBeenCalled();
  });

  it('persists the prescription through the safety gate once "Send to Pharmacy" is ticked', async () => {
    const { onOpenChange } = renderModal();
    addPrescription();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Send to Pharmacy' }));
    expect(screen.queryByText(/unsent prescriptions/)).not.toBeInTheDocument();

    complete();

    await waitFor(() => expect(mocks.createPrescription).toHaveBeenCalledTimes(1));
    expect(mocks.clearAndSign).toHaveBeenCalledWith('DOCTOR_PRESCRIBE');
    expect(mocks.createPrescription).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: 'pt-1',
        consultationId: 'c-1',
        items: [expect.objectContaining({ medication_name: 'Amoxicillin', dosage: '500 mg', frequency: 'TID' })],
        safety: { allergy_alerts: [], drug_interactions: [], verification_required: false },
      })
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('completes normally once the doctor removes the prescriptions instead', async () => {
    renderModal();
    addPrescription();
    fireEvent.click(screen.getByRole('button', { name: '×' }));

    complete();

    await waitFor(() => expect(mocks.updateConsultation).toHaveBeenCalledTimes(1));
    expect(mocks.createPrescription).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('blocks completion when a medication was typed but never added', async () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Medication'), { target: { value: 'Ibuprofen' } });

    complete();

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/"Ibuprofen" was typed but not added/)));
    expect(mocks.updateConsultation).not.toHaveBeenCalled();
  });

  it('blocks completion when lab orders are entered but "Send to Lab" is unticked', async () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Test name'), { target: { value: 'CBC' } });
    fireEvent.click(screen.getByRole('button', { name: '+ Add Lab Order' }));

    complete();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/1 lab order\(s\) entered but "Send to Lab" is not ticked/))
    );
    expect(mocks.updateConsultation).not.toHaveBeenCalled();
    expect(mocks.createLabOrder).not.toHaveBeenCalled();
  });
});
