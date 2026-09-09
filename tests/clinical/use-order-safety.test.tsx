/**
 * React Hook Tests: `useOrderSafety`
 *
 * Verifies presentation-layer ergonomics:
 * 1. Debounced evaluation & loading status
 * 2. Row-level item findings via getItemIssues()
 * 3. Override rationale recording & canProceed gating
 * 4. bindSubmission execution guard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useOrderSafety,
  HeadlessOrderSafetyEngine,
  InMemoryLocalDdiAdapter,
  MockRxNormAdapter,
  SpyAuditLoggerAdapter,
  PatientClinicalContext,
  OrderItemIntent,
} from '@/modules/order-safety';

const mockUseAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useOrderSafety Hook Tests', () => {
  let engine: HeadlessOrderSafetyEngine;

  const mockPatient: PatientClinicalContext = {
    patientId: 'patient-hook-1',
    hospitalId: 'hospital-test',
    ageYears: 30,
    allergies: ['Penicillin'],
    activeMedications: [],
  };

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'doctor-1',
        hospital_id: 'hospital-test',
        role: 'doctor',
      },
    });

    engine = new HeadlessOrderSafetyEngine({
      localDdiRepo: new InMemoryLocalDdiAdapter(),
      rxNormPort: new MockRxNormAdapter(),
      auditLogger: new SpyAuditLoggerAdapter(),
    });
  });

  it('initializes in idle or cleared state with empty items', () => {
    const { result } = renderHook(() =>
      useOrderSafety({
        patient: mockPatient,
        items: [],
        engine,
      })
    );

    expect(result.current.canProceed).toBe(true);
    expect(result.current.hasHardStop).toBe(false);
    expect(result.current.findings.length).toBe(0);
  });

  it('evaluates prescribed items and populates row-level item issues', async () => {
    const itemAmox: OrderItemIntent = {
      clientItemId: 'row-amox-1',
      drugName: 'Amoxicillin 500mg',
      doseMg: 500,
      route: 'PO',
      frequency: 'BID',
    };

    const { result } = renderHook(() =>
      useOrderSafety({
        patient: mockPatient,
        items: [itemAmox],
        debounceMs: 50, // Short debounce for testing
        engine,
      })
    );

    await waitFor(
      () => {
        expect(result.current.isChecking).toBe(false);
        expect(result.current.findings.length).toBeGreaterThan(0);
      },
      { timeout: 2000 }
    );

    expect(result.current.canProceed).toBe(false);
    expect(result.current.status).toBe('warning');

    // Test row-level helper
    const rowIssues = result.current.getItemIssues('row-amox-1');
    expect(rowIssues.length).toBe(1);
    expect(rowIssues[0].kind).toBe('ALLERGY_CROSS_REACTIVITY');
  });

  it('updates canProceed to true when doctor records valid clinical override', async () => {
    const itemAmox: OrderItemIntent = {
      clientItemId: 'row-amox-1',
      drugName: 'Amoxicillin 500mg',
      doseMg: 500,
      route: 'PO',
      frequency: 'BID',
    };

    const { result } = renderHook(() =>
      useOrderSafety({
        patient: mockPatient,
        items: [itemAmox],
        debounceMs: 50,
        engine,
      })
    );

    await waitFor(() => {
      expect(result.current.findings.length).toBeGreaterThan(0);
    });

    const findingCode = result.current.findings[0].code;

    // Submitting rationale shorter than 10 characters fails
    act(() => {
      const success = result.current.recordOverride(findingCode, 'Too short');
      expect(success).toBe(false);
    });
    expect(result.current.canProceed).toBe(false);

    // Submitting valid rationale succeeds
    act(() => {
      const success = result.current.recordOverride(
        findingCode,
        'Skin test negative, desensitization protocol completed in clinic.'
      );
      expect(success).toBe(true);
    });

    expect(result.current.canProceed).toBe(true);
    expect(result.current.unhandledOverrides.length).toBe(0);
  });

  it('bindSubmission blocks form submission when safety checks are not satisfied', async () => {
    const itemAmox: OrderItemIntent = {
      clientItemId: 'row-amox-1',
      drugName: 'Amoxicillin 500mg',
      doseMg: 500,
      route: 'PO',
      frequency: 'BID',
    };

    const { result } = renderHook(() =>
      useOrderSafety({
        patient: mockPatient,
        items: [itemAmox],
        debounceMs: 50,
        engine,
      })
    );

    await waitFor(() => {
      expect(result.current.findings.length).toBeGreaterThan(0);
    });

    const mockSubmitHandler = vi.fn().mockResolvedValue('ok');
    const guardedSubmit = result.current.bindSubmission(mockSubmitHandler);

    let output: string | null = null;
    await act(async () => {
      output = await guardedSubmit();
    });

    // Submission was guarded and blocked
    expect(output).toBeNull();
    expect(mockSubmitHandler).not.toHaveBeenCalled();
  });
});
