import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useLOINCCodes, useLabResults, useCriticalValueNotifications } from '@/hooks/useLaboratory';

const { mockFrom, mockChannel } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockChannel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis(), unsubscribe: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom, channel: mockChannel, removeChannel: vi.fn() },
}));

vi.mock('@/utils/sanitize', () => ({ sanitizeForLog: vi.fn((v: unknown) => v) }));

vi.mock('@/hooks/useLabOrders', () => ({
  useLabOrders: vi.fn(),
  useCreateLabOrder: vi.fn(),
  useUpdateLabOrder: vi.fn(),
  useLabOrderStats: vi.fn(),
}));

const makeChain = (overrides = {}) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  ...overrides,
});

describe('useLOINCCodes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with empty state', () => {
    const { result } = renderHook(() => useLOINCCodes());
    expect(result.current.loincCodes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('searches LOINC codes successfully', async () => {
    const mockCodes = [{ id: 'loinc-1', code: '2160-0', component: 'Creatinine' }];
    mockFrom.mockReturnValue(makeChain({
      limit: vi.fn().mockResolvedValue({ data: mockCodes, error: null }),
    }));

    const { result } = renderHook(() => useLOINCCodes());

    let codes: unknown[] = [];
    await act(async () => {
      codes = await result.current.searchLOINCCodes('Creatinine');
    });

    expect(codes).toHaveLength(1);
    expect(result.current.loincCodes).toHaveLength(1);
  });

  it('handles Supabase error on search', async () => {
    mockFrom.mockReturnValue(makeChain({
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'Search failed' } }),
    }));

    const { result } = renderHook(() => useLOINCCodes());

    await act(async () => {
      await result.current.searchLOINCCodes('test');
    });

    expect(result.current.error).toBe('Failed to search LOINC codes');
    expect(result.current.loincCodes).toEqual([]);
  });

  it('fetches LOINC by code', async () => {
    const mockCode = { id: 'loinc-1', code: '2160-0', component: 'Creatinine' };
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: mockCode, error: null }),
    }));

    const { result } = renderHook(() => useLOINCCodes());

    let code: unknown = null;
    await act(async () => {
      code = await result.current.getLOINCByCode('2160-0');
    });

    expect(code).toMatchObject({ code: '2160-0' });
  });
});

describe('useLabResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
  });

  it('starts with empty results', async () => {
    const { result } = renderHook(() => useLabResults('patient-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toEqual([]);
  });

  it('adds a lab result successfully', async () => {
    const mockResult = { id: 'result-1', lab_order_id: 'order-1', loinc_code: '2160-0', result_value: '1.2', result_unit: 'mg/dL', critical_flag: false };
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: mockResult, error: null }),
    }));

    const { result } = renderHook(() => useLabResults('patient-1'));

    await act(async () => {
      await result.current.addLabResult({ lab_order_id: 'order-1', loinc_code: '2160-0', result_value: '1.2', result_unit: 'mg/dL', critical_flag: false } as any);
    });

    expect(result.current.results).toHaveLength(1);
  });

  it('handles Supabase error on addLabResult', async () => {
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
    }));

    const { result } = renderHook(() => useLabResults('patient-1'));

    await act(async () => {
      await expect(result.current.addLabResult({ lab_order_id: 'order-1' } as any)).rejects.toBeDefined();
    });

    expect(result.current.error).toBe('Failed to add lab result');
  });
});

describe('useCriticalValueNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeChain({
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));
  });

  it('starts with empty notifications', () => {
    const { result } = renderHook(() => useCriticalValueNotifications('test-hospital-id'));
    expect(result.current.notifications).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('acknowledges a notification', async () => {
    const mockNotif = { id: 'notif-1', acknowledged_at: new Date().toISOString() };
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: mockNotif, error: null }),
    }));

    const { result } = renderHook(() => useCriticalValueNotifications('test-hospital-id'));

    await act(async () => {
      await result.current.acknowledgeNotification('notif-1', 'Reviewed');
    });

    expect(result.current.notifications).toEqual([]);
  });

  it('handles Supabase error on acknowledge', async () => {
    mockFrom.mockReturnValue(makeChain({
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Ack failed' } }),
    }));

    const { result } = renderHook(() => useCriticalValueNotifications('test-hospital-id'));

    await act(async () => {
      await expect(result.current.acknowledgeNotification('notif-1')).rejects.toBeDefined();
    });

    expect(result.current.error).toBe('Failed to acknowledge notification');
  });
});
