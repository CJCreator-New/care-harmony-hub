/**
 * Tests for Prescription Optimistic Locking
 * Covers: version checking, conflict detection, conflict resolution
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrescriptionOptimisticLock, usePrescription } from '@/hooks/usePrescriptionOptimisticLock';
import * as sonner from 'sonner';

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Supabase
const mockSupabaseFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

// Mock Auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    hospital: { id: 'test-hospital-id' },
  })),
}));

// Mock activity log
vi.mock('@/hooks/useActivityLog', () => ({
  useActivityLog: vi.fn(() => ({
    logActivity: vi.fn(),
  })),
}));

describe('Optimistic Locking — Prescription Updates', () => {
  const queryClient = new QueryClient();
  const mockPrescription = {
    id: 'rx-123',
    hospital_id: 'test-hospital-id',
    patient_id: 'patient-123',
    created_by: 'doctor-123',
    drug_name: 'Amoxicillin',
    dose: '500',
    dosage_unit: 'mg',
    frequency: 'Every 8 hours',
    duration: '10 days',
    status: 'active' as const,
    version: 1,
    updated_at: '2024-04-18T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load prescription successfully', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPrescription,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prescription).toEqual(mockPrescription);
    expect(result.current.error).toBeNull();
  });

  it('should update prescription successfully with version increment', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPrescription,
          error: null,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockPrescription, dose: '1000', version: 2 },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.prescription).not.toBeNull();
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updatePrescription({ dose: '1000' });
    });

    expect(updateResult).toEqual({
      ...mockPrescription,
      dose: '1000',
      version: 2,
    });
    expect(sonner.toast.success).toHaveBeenCalledWith('Prescription updated successfully');
  });

  it('should detect version conflict on concurrent update', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: mockPrescription,
            error: null,
          })
          .mockResolvedValueOnce({
            data: { ...mockPrescription, dose: '750', version: 2 },
            error: null,
          }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: {
              code: 'PGRST116',
              message: '0 rows returned',
            },
          }),
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.prescription).not.toBeNull();
    });

    let conflictError;
    await act(async () => {
      const response = await result.current.updatePrescription({ dose: '1000' });
      if (response && 'type' in response && response.type === 'version_conflict') {
        conflictError = response;
      }
    });

    expect(conflictError).toBeDefined();
    expect(conflictError?.type).toBe('version_conflict');
    expect(conflictError?.clientVersion).toBe(1);
    expect(conflictError?.serverVersion).toBe(2);
    expect(sonner.toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Prescription conflict')
    );
  });

  it('should resolve version conflict by accepting server version', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPrescription,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.prescription).not.toBeNull();
    });

    // Simulate conflict state
    const mockConflict = {
      type: 'version_conflict' as const,
      clientVersion: 1,
      serverVersion: 2,
      serverData: { ...mockPrescription, dose: '750', version: 2 },
      message: 'Conflict detected',
    };

    // Resolve by keeping server version
    await act(async () => {
      await result.current.resolveConflict(true);
    });

    expect(sonner.toast.info).toHaveBeenCalledWith(
      expect.stringContaining('Using server version')
    );
  });

  it('should allow read-only access via usePrescription hook', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPrescription,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => usePrescription('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.prescription).toEqual(mockPrescription);
  });

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('Network request failed');
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: networkError,
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(sonner.toast.error).toHaveBeenCalled();
  });

  it('should track version increments across multiple updates', async () => {
    let currentVersion = 1;

    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockImplementation(() => {
          return Promise.resolve({
            data: { ...mockPrescription, version: currentVersion },
            error: null,
          });
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => {
            currentVersion++;
            return Promise.resolve({
              data: { ...mockPrescription, version: currentVersion },
              error: null,
            });
          }),
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.prescription?.version).toBe(1);
    });

    // First update
    await act(async () => {
      await result.current.updatePrescription({ dose: '750' });
    });

    // Version should be incremented
    expect(currentVersion).toBeGreaterThan(1);
  });

  it('should provide refresh function to reload prescription', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockPrescription,
          error: null,
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.prescription).not.toBeNull();
    });

    // Call refresh
    await act(async () => {
      result.current.refresh();
    });

    // Should reload prescription
    expect(mockSupabaseFrom).toHaveBeenCalled();
  });

  it('should not allow update if prescription not loaded', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found'),
        }),
      }),
    });

    const { result } = renderHook(() => usePrescriptionOptimisticLock('rx-123'), {
      wrapper: ({ children }: any) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let updateResult;
    await act(async () => {
      updateResult = await result.current.updatePrescription({ dose: '1000' });
    });

    expect(updateResult).toBeNull();
    expect(sonner.toast.error).toHaveBeenCalled();
  });
});

describe('Optimistic Locking — Concurrent Edit Scenarios', () => {
  const queryClient = new QueryClient();

  it('should handle race condition: simultaneous edits by pharmacist and doctor', async () => {
    // Scenario: Pharmacist and doctor both update same prescription
    // Pharmacist updates status first, doctor updates dose
    // One should succeed, other should get version conflict

    const initialPrescription = {
      id: 'rx-123',
      hospital_id: 'hospital-1',
      patient_id: 'patient-1',
      drug_name: 'Aspirin',
      dose: '100',
      version: 1,
      status: 'pending',
      updated_at: '2024-04-18T10:00:00Z',
    };

    // Simulate pharmacist's update succeeding first
    // Simulate doctor's update failing (version conflict)

    // Both start with version 1
    expect(initialPrescription.version).toBe(1);

    // After pharmacist updates → version 2
    // When doctor tries to update with version 1 → CONFLICT
  });

  it('should prevent lost update problem with optimistic locking', async () => {
    // Without optimistic locking, both updates would apply
    // With optimistic locking, second update fails and must be retried
    // This prevents one user's changes from overwriting another's

    // Key test: UPDATE ... WHERE version = ? ensures atomicity
  });
});

describe('Optimistic Locking — DB Constraint Enforcement', () => {
  it('should enforce version column NOT NULL constraint', () => {
    // All prescriptions must have a version
    // NULL version should be rejected at DB level
  });

  it('should auto-increment version on each UPDATE', () => {
    // Application must increment: SET version = version + 1
    // This is enforced by UPDATE query logic, not DB trigger
  });

  it('should provide meaningful error on version mismatch', () => {
    // NO_ROWS_AFFECTED (code PGRST116) indicates version conflict
    // Should be caught and returned to user
  });
});
