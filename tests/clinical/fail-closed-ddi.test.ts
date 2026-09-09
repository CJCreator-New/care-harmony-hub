import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { fromPartial } from '@total-typescript/shoehorn';
import { useDrugInteractions, InteractionResult } from '@/hooks/useDrugInteractions';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-123', hospital_id: 'hosp-456' },
  }),
}));

vi.mock('@/hooks/useActivityLog', () => ({
  useActivityLog: () => ({
    logActivity: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('TEST-GAPS: Fail-Closed Clinical Drug-Drug Interaction (DDI) Safety Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC-2.1: Fail-Closed Behavior on Check Failure or Null State', () => {
    it('blocks dispensing when no check has been performed (null check)', () => {
      const { result } = renderHook(() => useDrugInteractions());

      // Can we dispense with null? Must be FALSE (fail-closed)
      expect(result.current.canDispense(null)).toBe(false);
      // Does it require approval? Must be TRUE (fail-closed)
      expect(result.current.requiresApproval(null)).toBe(true);
      // Warning message directs to pharmacist manual review
      expect(result.current.getMessage(null)).toContain('Pharmacist manual verification required');
    });

    it('blocks dispensing when severity is "unknown" (timeout or API error)', () => {
      const { result } = renderHook(() => useDrugInteractions());

      const unknownResult: InteractionResult = {
        severity: 'unknown',
        interactions: [],
        cacheHit: false,
        requiresManualReview: true,
        error: 'RxNorm API timeout',
        timestamp: new Date().toISOString(),
      };

      expect(result.current.canDispense(unknownResult)).toBe(false);
      expect(result.current.requiresApproval(unknownResult)).toBe(true);
      expect(result.current.getMessage(unknownResult)).toContain(
        'Pharmacist manual verification required'
      );
    });

    it('blocks dispensing for "contraindicated" interactions', () => {
      const { result } = renderHook(() => useDrugInteractions());

      const contraindicatedResult: InteractionResult = {
        severity: 'contraindicated',
        interactions: [
          {
            interactingDrug: 'Nitroglycerin',
            severity: 'contraindicated',
            recommendation: 'Severe refractory hypotension risk',
          },
        ],
        cacheHit: false,
        requiresManualReview: true,
        timestamp: new Date().toISOString(),
      };

      expect(result.current.canDispense(contraindicatedResult)).toBe(false);
      expect(result.current.getMessage(contraindicatedResult)).toContain('CONTRAINDICATED');
    });

    it('requires doctor approval for "serious" interactions while allowing supervised dispensing', () => {
      const { result } = renderHook(() => useDrugInteractions());

      const seriousResult: InteractionResult = {
        severity: 'serious',
        interactions: [
          {
            interactingDrug: 'Warfarin',
            severity: 'serious',
            recommendation: 'Increased bleeding risk',
          },
        ],
        cacheHit: false,
        requiresManualReview: true,
        timestamp: new Date().toISOString(),
      };

      expect(result.current.canDispense(seriousResult)).toBe(true);
      expect(result.current.requiresApproval(seriousResult)).toBe(true);
      expect(result.current.getMessage(seriousResult)).toContain('SERIOUS interaction');
    });

    it('permits dispensing for "none" severity without approval requirement', () => {
      const { result } = renderHook(() => useDrugInteractions());

      const clearResult: InteractionResult = {
        severity: 'none',
        interactions: [],
        cacheHit: false,
        requiresManualReview: false,
        timestamp: new Date().toISOString(),
      };

      expect(result.current.canDispense(clearResult)).toBe(true);
      expect(result.current.requiresApproval(clearResult)).toBe(false);
      expect(result.current.getMessage(clearResult)).toContain('No drug interactions detected');
    });
  });

  describe('AC-2.2: Hook Resilience against Edge Function 500 / Network Rejection', () => {
    it('returns null and defaults to fail-closed state when Edge Function invocation throws error', async () => {
      const invokeMock = vi.mocked(supabase.functions.invoke);
      invokeMock.mockRejectedValueOnce(new Error('500 Internal Server Error in DDI Engine'));

      const { result } = renderHook(() => useDrugInteractions());

      let checkRes: InteractionResult | null = null;
      await act(async () => {
        checkRes = await result.current.checkInteraction('pat-123', 'rxcui-456', 'Aspirin');
      });

      expect(checkRes).toBeNull();
      // Fail-closed invariant preserved:
      expect(result.current.canDispense(checkRes)).toBe(false);
      expect(result.current.requiresApproval(checkRes)).toBe(true);
    });

    it('returns null and defaults to fail-closed state when Edge Function returns an error object', async () => {
      const invokeMock = vi.mocked(supabase.functions.invoke);
      invokeMock.mockResolvedValueOnce(
        fromPartial({
          data: null,
          error: fromPartial({ message: 'Timeout calling RxNorm API' }),
        })
      );

      const { result } = renderHook(() => useDrugInteractions());

      let checkRes: InteractionResult | null = null;
      await act(async () => {
        checkRes = await result.current.checkInteraction('pat-123', 'rxcui-999', 'UnknownDrug');
      });

      expect(checkRes).toBeNull();
      expect(result.current.canDispense(checkRes)).toBe(false);
      expect(result.current.requiresApproval(checkRes)).toBe(true);
    });
  });
});
