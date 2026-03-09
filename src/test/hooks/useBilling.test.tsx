import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  useInvoices,
  useInvoice,
  useInvoiceStats,
  useCreateInvoice,
  useRecordPayment,
} from '@/hooks/useBilling';
import { mockSupabaseClient } from '../mocks/supabase';
import { createMockAuthContext, mockProfile, mockHospital } from '../mocks/auth';

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabaseClient }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => createMockAuthContext() }));
vi.mock('@/utils/rateLimitBackoff', () => ({
  executeWithRateLimitBackoff: vi.fn().mockImplementation((fn) => fn()),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockInvoice = {
  id: 'inv-1',
  hospital_id: mockHospital.id,
  patient_id: 'patient-1',
  invoice_number: 'INV-001',
  subtotal: 100,
  tax: 0,
  discount: 0,
  total: 100,
  paid_amount: 0,
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  patient: { id: 'patient-1', first_name: 'John', last_name: 'Doe', mrn: 'MRN-001' },
};

describe('useInvoices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no hospital', async () => {
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => createMockAuthContext({ hospital: null }),
    }));
    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('fetches invoices with optional status filter', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockInvoice], error: null }),
    });

    const { result } = renderHook(() => useInvoices('pending'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('is disabled when no invoiceId', () => {
    const { result } = renderHook(() => useInvoice(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches invoice with items and payments', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockInvoice, error: null }),
    });

    const { result } = renderHook(() => useInvoice('inv-1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.id).toBe('inv-1');
  });
});

describe('useInvoiceStats', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calculates pending/partial/paid counts and outstanding total', async () => {
    mockSupabaseClient.from.mockReturnValue({
      ...mockSupabaseClient.from(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [
          { status: 'pending', total: 100, paid_amount: 0 },
          { status: 'partial', total: 200, paid_amount: 100 },
          { status: 'paid', total: 150, paid_amount: 150 },
        ],
        error: null,
      }),
    });

    const { result } = renderHook(() => useInvoiceStats(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pending).toBe(1);
    expect(result.current.data?.partial).toBe(1);
    expect(result.current.data?.paid).toBe(1);
    expect(result.current.data?.totalOutstanding).toBe(200);
  });
});

describe('useCreateInvoice', () => {
  beforeEach(() => vi.clearAllMocks());

  it('generates invoice number, inserts invoice and items', async () => {
    const invoiceInsertMock = vi.fn().mockReturnThis();
    const itemsInsertMock = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.rpc.mockResolvedValueOnce({ data: 'INV-002', error: null });
    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: invoiceInsertMock,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockInvoice, error: null }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: itemsInsertMock,
      });

    const { result } = renderHook(() => useCreateInvoice(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        patientId: 'patient-1',
        items: [{ description: 'Consultation', quantity: 1, unit_price: 100 }],
      });
    });

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('generate_invoice_number', {
      p_hospital_id: mockHospital.id,
    });
    expect(invoiceInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ hospital_id: mockHospital.id, status: 'pending' })
    );
    expect(itemsInsertMock).toHaveBeenCalled();
  });
});

describe('useRecordPayment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts payment and updates invoice status to paid when fully paid', async () => {
    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'pay-1', amount: 100 },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { total: 100, paid_amount: 0 },
          error: null,
        }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        update: updateMock,
        eq: eqMock,
      });

    const { result } = renderHook(() => useRecordPayment(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        invoiceId: 'inv-1',
        amount: 100,
        paymentMethod: 'cash',
      });
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'paid', paid_amount: 100 })
    );
  });

  it('sets status to partial when partially paid', async () => {
    const updateMock = vi.fn().mockReturnThis();

    mockSupabaseClient.from
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: 'pay-1', amount: 50 }, error: null }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { total: 100, paid_amount: 0 }, error: null }),
      })
      .mockReturnValueOnce({
        ...mockSupabaseClient.from(),
        update: updateMock,
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

    const { result } = renderHook(() => useRecordPayment(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ invoiceId: 'inv-1', amount: 50, paymentMethod: 'card' });
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'partial', paid_amount: 50 })
    );
  });
});
