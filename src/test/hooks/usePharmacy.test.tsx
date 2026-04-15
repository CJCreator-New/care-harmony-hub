import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useEPrescriptions, useFormulary, useDrugInteractions } from '@/lib/hooks/pharmacy';
import { mockHospital } from '../mocks/auth';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/utils/sanitize', () => ({
  sanitizeForLog: vi.fn((v: unknown) => v),
  sanitizePostgrestFilterValue: vi.fn((v: string) => v),
  toIlikePattern: vi.fn((v: string) => `%${v}%`),
}));

const makeChain = (overrides = {}) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  ...overrides,
});

describe('useEPrescriptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with empty state', () => {
    const { result } = renderHook(() => useEPrescriptions());
    expect(result.current.ePrescriptions).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches e-prescriptions scoped to hospital_id', async () => {
    const mockData = [{ id: 'rx-1', hospital_id: mockHospital.id }];
    mockFrom.mockReturnValue(makeChain({
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }));

    const { result } = renderHook(() => useEPrescriptions());

    await act(async () => {
      await result.current.fetchEPrescriptions(mockHospital.id);
    });

    expect(result.current.ePrescriptions).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it('sets error on Supabase failure', async () => {
    mockFrom.mockReturnValue(makeChain({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }));

    const { result } = renderHook(() => useEPrescriptions());

    await act(async () => {
      await result.current.fetchEPrescriptions(mockHospital.id);
    });

    expect(result.current.error).toBe('Failed to fetch e-prescriptions');
  });
});

describe('useFormulary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with empty formulary', () => {
    const { result } = renderHook(() => useFormulary());
    expect(result.current.formularyDrugs).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('fetches formulary drugs scoped to hospital_id', async () => {
    const mockDrugs = [{ id: 'drug-1', drug_name: 'Amoxicillin', hospital_id: mockHospital.id }];
    mockFrom.mockReturnValue(makeChain({
      order: vi.fn().mockResolvedValue({ data: mockDrugs, error: null }),
    }));

    const { result } = renderHook(() => useFormulary());

    await act(async () => {
      await result.current.fetchFormularyDrugs(mockHospital.id);
    });

    expect(result.current.formularyDrugs).toHaveLength(1);
    expect(result.current.formularyDrugs[0].drug_name).toBe('Amoxicillin');
  });

  it('checkFormularyStatus returns null when drug not found', () => {
    const { result } = renderHook(() => useFormulary());
    expect(result.current.checkFormularyStatus('UnknownDrug')).toBeNull();
  });

  it('handles Supabase error on fetch', async () => {
    mockFrom.mockReturnValue(makeChain({
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Fetch failed' } }),
    }));

    const { result } = renderHook(() => useFormulary());

    await act(async () => {
      await result.current.fetchFormularyDrugs(mockHospital.id);
    });

    expect(result.current.error).toBe('Failed to fetch formulary');
  });
});

describe('useDrugInteractions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when fewer than 2 medications', async () => {
    const { result } = renderHook(() => useDrugInteractions());

    let interactions: unknown[] = [];
    await act(async () => {
      interactions = await result.current.checkInteractions(['Amoxicillin']);
    });

    expect(interactions).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('checks interactions for multiple medications', async () => {
    const mockInteractions = [{ id: 'int-1', drug1_name: 'Warfarin', drug2_name: 'Aspirin', severity_level: 4, clinical_effect: 'Bleeding risk', management_strategy: 'Monitor' }];
    mockFrom.mockReturnValue(makeChain({
      or: vi.fn().mockResolvedValue({ data: mockInteractions, error: null }),
    }));

    const { result } = renderHook(() => useDrugInteractions());

    let interactions: unknown[] = [];
    await act(async () => {
      interactions = await result.current.checkInteractions(['Warfarin', 'Aspirin']);
    });

    expect(interactions).toHaveLength(1);
  });

  it('returns empty array on Supabase error', async () => {
    mockFrom.mockReturnValue(makeChain({
      or: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }));

    const { result } = renderHook(() => useDrugInteractions());

    let interactions: unknown[] = [];
    await act(async () => {
      interactions = await result.current.checkInteractions(['DrugA', 'DrugB']);
    });

    expect(interactions).toEqual([]);
    expect(result.current.error).toBe('Failed to check interactions');
  });
});
