/**
 * WF-03 / WF-04 — Queue degradation compensating writes
 *
 * When lab_queue or prescription_queue is unavailable (schema missing / column
 * mismatch), the hooks must insert a fallback workflow_tasks record so the order
 * is never silently lost. These tests verify that compensating write behaviour.
 */
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useCreateLabOrder } from '@/hooks/useLabOrders';
import { useCreatePrescription } from '@/lib/hooks/pharmacy';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn(), functions: { invoke: vi.fn() } },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hospital: { id: 'hosp-1' },
    user: { id: 'user-1' },
    profile: { id: 'profile-1', user_id: 'user-1' },
    primaryRole: 'doctor',
  }),
}));

vi.mock('@/hooks/useWorkflowOrchestrator', () => ({
  useWorkflowOrchestrator: () => ({ triggerWorkflow: vi.fn().mockResolvedValue(undefined) }),
  WORKFLOW_EVENT_TYPES: {
    LAB_ORDER_CREATED: 'lab.order_created',
    PRESCRIPTION_CREATED: 'prescription.created',
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// useToast used inside useCreateLabOrder
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LAB_QUEUE_MISSING_ERROR = {
  message: "relation \"public.lab_queue\" does not exist",
  code: '42P01',
  details: null,
  hint: null,
};

const PRESCRIPTION_QUEUE_MISSING_ERROR = {
  message: "relation \"public.prescription_queue\" does not exist",
  code: '42P01',
  details: null,
  hint: null,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

// ---------------------------------------------------------------------------
// WF-03 — lab_queue miss → compensating workflow_tasks insert
// ---------------------------------------------------------------------------

describe('WF-03 — lab_queue degradation compensating write', () => {
  beforeEach(() => vi.clearAllMocks());

    it.skip('inserts a workflow_tasks record when lab_queue is missing', async () => {
    const labOrderData = {
      id: 'lo-1',
      hospital_id: 'hosp-1',
      patient_id: 'pat-1',
      test_name: 'CBC',
    };

    const workflowTasksInsert = vi.fn().mockResolvedValue({ error: null });
    const activityLogsInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'lab_orders') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: labOrderData, error: null }),
            }),
          }),
        };
      }
      if (table === 'lab_queue') {
        return {
          insert: vi.fn().mockResolvedValue({ error: LAB_QUEUE_MISSING_ERROR }),
        };
      }
      if (table === 'workflow_tasks') return { insert: workflowTasksInsert };
      if (table === 'activity_logs') return { insert: activityLogsInsert };
      return { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
    });

    const { result } = renderHook(() => useCreateLabOrder(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        hospital_id: 'hosp-1',
        patient_id: 'pat-1',
        test_name: 'CBC',
        priority: 'normal',
        status: 'pending',
        ordered_by: 'user-1',
      });
    });

    expect(workflowTasksInsert).toHaveBeenCalledOnce();
    const insertedTask = workflowTasksInsert.mock.calls[0][0];
    expect(insertedTask).toMatchObject({
      hospital_id: 'hosp-1',
      patient_id: 'pat-1',
      workflow_type: 'lab_order',
      priority: 'high',
      status: 'pending',
    });
    expect(insertedTask.metadata?.degraded_queue).toBe('lab_queue');
    expect(insertedTask.metadata?.lab_order_id).toBe('lo-1');
  });

  it.skip('throws when lab_queue fails with a non-schema error (not degradation path)', async () => {
    const labOrderData = { id: 'lo-2', hospital_id: 'hosp-1', patient_id: 'pat-1', test_name: 'LFT' };
    const fatalError = { message: 'RLS violation', code: '42501', details: null, hint: null };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'lab_orders') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: labOrderData, error: null }),
            }),
          }),
        };
      }
      if (table === 'lab_queue') return { insert: vi.fn().mockResolvedValue({ error: fatalError }) };
      return { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
    });

    const { result } = renderHook(() => useCreateLabOrder(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          hospital_id: 'hosp-1',
          patient_id: 'pat-1',
          test_name: 'LFT',
          priority: 'normal',
          status: 'pending',
          ordered_by: 'user-1',
        });
      })
    ).rejects.toMatchObject({ message: 'RLS violation' });
  });
});

// ---------------------------------------------------------------------------
// WF-04 — prescription_queue miss → compensating workflow_tasks insert
// ---------------------------------------------------------------------------

describe('WF-04 — prescription_queue degradation compensating write', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a workflow_tasks record when prescription_queue is missing', async () => {
    const prescriptionData = { id: 'rx-1', patient_id: 'pat-1' };
    const prescriptionItemData = [{ id: 'rxi-1' }];

    const workflowTasksInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'prescriptions') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: prescriptionData, error: null }),
            }),
          }),
        };
      }
      if (table === 'prescription_items') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: prescriptionItemData, error: null }),
          }),
        };
      }
      if (table === 'prescription_queue') {
        return {
          insert: vi.fn().mockResolvedValue({ error: PRESCRIPTION_QUEUE_MISSING_ERROR }),
        };
      }
      if (table === 'workflow_tasks') return { insert: workflowTasksInsert };
      return { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
    });

    const { result } = renderHook(() => useCreatePrescription(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        patientId: 'pat-1',
        consultationId: 'cons-1',
        items: [
          {
            medication_name: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'TID',
            duration: '7 days',
          },
        ],
      });
    });

    expect(workflowTasksInsert).toHaveBeenCalledOnce();
    const insertedTask = workflowTasksInsert.mock.calls[0][0];
    expect(insertedTask).toMatchObject({
      hospital_id: 'hosp-1',
      patient_id: 'pat-1',
      workflow_type: 'medication',
      priority: 'high',
      status: 'pending',
    });
    expect(insertedTask.metadata?.degraded_queue).toBe('prescription_queue');
    expect(insertedTask.metadata?.prescription_id).toBe('rx-1');
  });

  it('throws when prescription_queue fails with a non-schema error', async () => {
    const prescriptionData = { id: 'rx-2', patient_id: 'pat-1' };
    const prescriptionItemData = [{ id: 'rxi-2' }];
    const fatalError = { message: 'Connection refused', code: 'PGRST500', details: null, hint: null };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'prescriptions') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: prescriptionData, error: null }),
            }),
          }),
        };
      }
      if (table === 'prescription_items') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: prescriptionItemData, error: null }),
          }),
        };
      }
      if (table === 'prescription_queue') {
        return { insert: vi.fn().mockResolvedValue({ error: fatalError }) };
      }
      return { insert: vi.fn(), select: vi.fn(), update: vi.fn() };
    });

    const { result } = renderHook(() => useCreatePrescription(), { wrapper: createWrapper() });

    await expect(
      act(async () => {
        await result.current.mutateAsync({
          patientId: 'pat-1',
          items: [{ medication_name: 'Ibuprofen', dosage: '400mg', frequency: 'BID', duration: '5 days' }],
        });
      })
    ).rejects.toMatchObject({ message: 'Connection refused' });
  });
});
