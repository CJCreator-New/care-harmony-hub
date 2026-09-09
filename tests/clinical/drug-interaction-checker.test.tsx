import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useDrugInteractionChecker } from '@/hooks/useDrugInteractionChecker';

const mockInvoke = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('CLIN-004: useDrugInteractionChecker Hook & Edge Function Fail-Closed Wireup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('AC-1: dispatches edge function call with drug identifiers and patient context', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        severity: 'none',
        interactions: [],
        requiresManualReview: false,
      },
      error: null,
    });

    const { result } = renderHook(
      () =>
        useDrugInteractionChecker({
          patientId: 'patient-123',
          drugCodes: ['4324', '7052'],
          newDrugName: 'Ibuprofen',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInvoke).toHaveBeenCalledWith('drug-interaction-check', {
      body: {
        patientId: 'patient-123',
        newDrugRxcui: '4324',
        newDrugName: 'Ibuprofen',
        drugCodes: ['4324', '7052'],
        medications: ['Ibuprofen'],
      },
    });

    expect(result.current.data?.hasInteractions).toBe(false);
    expect(result.current.data?.requiresManualReview).toBe(false);
  });

  it('AC-2: flags severe interactions and requiresManualReview for lethal/contraindicated combinations', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        severity: 'contraindicated',
        interactions: [
          {
            interactingDrug: 'Nitroglycerin',
            severity: 'contraindicated',
            recommendation: 'Refractory and potentially fatal hypotension risk',
          },
        ],
        requiresManualReview: true,
      },
      error: null,
    });

    const { result } = renderHook(
      () =>
        useDrugInteractionChecker({
          patientId: 'patient-456',
          newDrugName: 'Sildenafil',
          drugCodes: ['sildenafil', 'nitroglycerin'],
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.hasInteractions).toBe(true);
    expect(result.current.data?.requiresManualReview).toBe(true);
    expect(result.current.data?.severity).toBe('major');
    expect(result.current.data?.[0].drug2).toBe('Nitroglycerin');
  });

  it('AC-3: enforces fail-closed behavior on edge function network error or 500 failure', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: null,
      error: new Error('Edge function 500 Internal Server Error'),
    });

    const { result } = renderHook(
      () =>
        useDrugInteractionChecker({
          patientId: 'patient-789',
          newDrugName: 'Warfarin',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Must fail closed: flag interactions and require pharmacist manual review
    expect(result.current.data?.hasInteractions).toBe(true);
    expect(result.current.data?.requiresManualReview).toBe(true);
    expect(result.current.data?.error).toBe('Clinical check unavailable - pharmacist review required');
  });

  it('AC-3: enforces fail-closed behavior on unhandled invocation exception', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network connection timeout'));

    const { result } = renderHook(
      () =>
        useDrugInteractionChecker({
          patientId: 'patient-timeout',
          newDrugName: 'Digoxin',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.hasInteractions).toBe(true);
    expect(result.current.data?.requiresManualReview).toBe(true);
    expect(result.current.data?.error).toContain('Clinical check unavailable');
  });

  it('AC-4: resolves prescription details from table when prescriptionId is provided', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              patient_id: 'patient-from-rx',
              medication_name: 'Metformin',
              drug_rxcui: '18827',
            },
            error: null,
          }),
        }),
      }),
    });

    mockInvoke.mockResolvedValueOnce({
      data: {
        severity: 'none',
        interactions: [],
        requiresManualReview: false,
      },
      error: null,
    });

    const { result } = renderHook(
      () => useDrugInteractionChecker('rx-12345'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockInvoke).toHaveBeenCalledWith('drug-interaction-check', {
      body: {
        patientId: 'patient-from-rx',
        newDrugRxcui: '18827',
        newDrugName: 'Metformin',
        drugCodes: ['18827'],
        medications: ['Metformin'],
      },
    });
  });
});
