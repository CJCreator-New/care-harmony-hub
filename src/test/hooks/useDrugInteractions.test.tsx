import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDrugInteractions, InteractionResult } from '@/hooks/useDrugInteractions';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/useActivityLog', () => ({
  useActivityLog: () => ({ logActivity: vi.fn() }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('useDrugInteractions (Fail-Closed Behavior)', () => {
  it('fails closed when check result is null (missing or error)', () => {
    const { result } = renderHook(() => useDrugInteractions());

    // CLIN-002: null check MUST NOT permit dispensing
    expect(result.current.canDispense(null)).toBe(false);
    expect(result.current.requiresApproval(null)).toBe(true);
    expect(result.current.getMessage(null)).toContain('Interaction check unavailable');
  });

  it('blocks dispensing when interaction is contraindicated', () => {
    const { result } = renderHook(() => useDrugInteractions());

    const contraindicatedCheck: InteractionResult = {
      severity: 'contraindicated',
      interactions: [
        { interactingDrug: 'Warfarin', severity: 'contraindicated', recommendation: 'Do not combine' },
      ],
      cacheHit: false,
      timestamp: new Date().toISOString(),
    };

    expect(result.current.canDispense(contraindicatedCheck)).toBe(false);
    expect(result.current.getMessage(contraindicatedCheck)).toContain('CONTRAINDICATED');
  });

  it('blocks dispensing when interaction severity is unknown', () => {
    const { result } = renderHook(() => useDrugInteractions());

    const unknownCheck: InteractionResult = {
      severity: 'unknown',
      interactions: [],
      cacheHit: false,
      timestamp: new Date().toISOString(),
      requiresManualReview: true,
    };

    expect(result.current.canDispense(unknownCheck)).toBe(false);
    expect(result.current.requiresApproval(unknownCheck)).toBe(true);
    expect(result.current.getMessage(unknownCheck)).toContain('Interaction check incomplete');
  });

  it('allows dispensing for safe or minor interactions', () => {
    const { result } = renderHook(() => useDrugInteractions());

    const safeCheck: InteractionResult = {
      severity: 'none',
      interactions: [],
      cacheHit: false,
      timestamp: new Date().toISOString(),
    };

    const minorCheck: InteractionResult = {
      severity: 'minor',
      interactions: [
        { interactingDrug: 'Antacid', severity: 'minor', recommendation: 'Separate by 2h' },
      ],
      cacheHit: false,
      timestamp: new Date().toISOString(),
    };

    expect(result.current.canDispense(safeCheck)).toBe(true);
    expect(result.current.canDispense(minorCheck)).toBe(true);
    expect(result.current.requiresApproval(safeCheck)).toBe(false);
    expect(result.current.requiresApproval(minorCheck)).toBe(false);
  });
});
