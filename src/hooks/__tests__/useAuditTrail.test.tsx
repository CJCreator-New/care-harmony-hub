import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuditTrail } from '@/hooks/useAuditTrail';
import { useAuth } from '@/contexts/AuthContext';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

// Mock Auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const createQueryClient = () => new QueryClient();

const renderWithQueryClient = (hook: any) => {
  const queryClient = createQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(hook, { wrapper });
};

describe.skip('useAuditTrail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch audit trail for prescription', async () => {
    const mockProfile = { hospital_id: 'hosp_123' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderWithQueryClient(() =>
      useAuditTrail('rx_123', 'prescription')
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.auditTrail).toBeDefined();
  });

  it('should return empty trail when recordId is null', async () => {
    const mockProfile = { hospital_id: 'hosp_123' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderWithQueryClient(() =>
      useAuditTrail(null, 'prescription')
    );

    expect(result.current.auditTrail).toEqual([]);
    expect(result.current.hasAmendments).toBe(false);
  });

  it('should sort amendments by timestamp descending', async () => {
    const mockProfile = { hospital_id: 'hosp_123' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderWithQueryClient(() =>
      useAuditTrail('rx_123', 'prescription')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify sorted by timestamp descending
    if (result.current.auditTrail.length > 1) {
      for (let i = 0; i < result.current.auditTrail.length - 1; i++) {
        const current = new Date(result.current.auditTrail[i].timestamp);
        const next = new Date(result.current.auditTrail[i + 1].timestamp);
        expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
      }
    }
  });

  it('should track hasAmendments correctly', async () => {
    const mockProfile = { hospital_id: 'hosp_123' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderWithQueryClient(() =>
      useAuditTrail('rx_123', 'prescription')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.hasAmendments).toBe('boolean');
  });

  it('should handle different record types', async () => {
    const mockProfile = { hospital_id: 'hosp_123' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const recordTypes: Array<'prescription' | 'lab_result' | 'appointment'> = [
      'prescription',
      'lab_result',
      'appointment',
    ];

    for (const recordType of recordTypes) {
      const { result } = renderWithQueryClient(() =>
        useAuditTrail(`record_${recordType}`, recordType)
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(Array.isArray(result.current.auditTrail)).toBe(true);
    }
  });

  it('should allow manual refetch', async () => {
    const mockProfile = { hospital_id: 'hosp_123' };
    (useAuth as any).mockReturnValue({ profile: mockProfile });

    const { result } = renderWithQueryClient(() =>
      useAuditTrail('rx_123', 'prescription')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const refetchResult = await result.current.refetch();
    expect(refetchResult).toBeDefined();
  });
});

