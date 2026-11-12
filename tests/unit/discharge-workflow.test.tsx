/**
 * Tests for the discharge workflow React hook (`useDischargePipeline`).
 *
 * Imports go through the discharge-pipeline module's public entry point, as its
 * README requires. The pure state-machine rules (role mapping, transitions,
 * rollback, AMA) are covered by src/modules/discharge-pipeline/tests; this file
 * covers the hook: queries, actions, error reporting, and realtime wiring.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { useDischargePipeline, getRoleStep } from '@/modules/discharge-pipeline';

const { tableRows, tableErrors, mockInvoke, mockChannel, mockRemoveChannel, authState } =
  vi.hoisted(() => ({
    tableRows: {} as Record<string, unknown[]>,
    tableErrors: {} as Record<string, unknown>,
    mockInvoke: vi.fn(),
    mockChannel: vi.fn(),
    mockRemoveChannel: vi.fn(),
    authState: {
      user: { id: 'u1' } as { id: string } | null,
      hospital: { id: 'h1' } as { id: string } | null,
      primaryRole: 'doctor' as string | null,
    },
  }));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/integrations/supabase/client', () => {
  // Chainable query builder. `single()` resolves to the first row; otherwise to all rows.
  const builder = (table: string): any => {
    let single = false;
    const b: any = {};
    for (const m of ['select', 'eq', 'order']) b[m] = () => b;
    b.single = () => {
      single = true;
      return b;
    };
    b.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
      const rows = (tableRows[table] ?? []) as unknown[];
      const error = tableErrors[table] ?? null;
      const data = single ? (rows[0] ?? null) : rows;
      return Promise.resolve({ data, error }).then(resolve, reject);
    };
    return b;
  };
  const channel = (name: string) => {
    mockChannel(name);
    const ch: any = {};
    ch.on = () => ch;
    ch.subscribe = () => ch;
    return ch;
  };
  return {
    supabase: {
      from: (table: string) => builder(table),
      functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
      channel,
      removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
    },
  };
});

const workflow = {
  id: 'wf1',
  hospital_id: 'h1',
  patient_id: 'p1',
  status: 'in_progress',
  current_step: 'pharmacist',
};

function wrapperFor(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function newClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

describe('useDischargePipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(tableRows)) delete tableRows[k];
    for (const k of Object.keys(tableErrors)) delete tableErrors[k];
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
    authState.user = { id: 'u1' };
    authState.hospital = { id: 'h1' };
    authState.primaryRole = 'doctor';
  });

  describe('current queue step', () => {
    it('derives the queue step from the signed-in role', () => {
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });
      expect(result.current.currentRoleStep).toBe(getRoleStep('doctor'));
      expect(result.current.currentRoleStep).toBe('doctor');
    });

    it('uses the explicit queue step override when given', () => {
      const { result } = renderHook(() => useDischargePipeline(undefined, 'nurse'), {
        wrapper: wrapperFor(newClient()),
      });
      expect(result.current.currentRoleStep).toBe('nurse');
    });

    it('has no queue step for a role outside the pipeline', () => {
      authState.primaryRole = 'patient';
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });
      expect(result.current.currentRoleStep).toBeNull();
    });
  });

  describe('queries', () => {
    it('loads the workflow and its audit trail for a given workflow id', async () => {
      tableRows.discharge_workflows = [workflow];
      tableRows.discharge_workflow_audit = [{ id: 'a1', workflow_id: 'wf1', action: 'initiate' }];

      const { result } = renderHook(() => useDischargePipeline('wf1'), {
        wrapper: wrapperFor(newClient()),
      });

      await waitFor(() => expect(result.current.isLoadingWorkflow).toBe(false));
      expect(result.current.workflow).toEqual(workflow);
      expect(result.current.workflowAudit).toEqual([
        { id: 'a1', workflow_id: 'wf1', action: 'initiate' },
      ]);
    });

    it('does not query a workflow when no id is given', () => {
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });
      expect(result.current.workflow).toBeNull();
      expect(result.current.workflowAudit).toEqual([]);
    });

    it('returns the queue of in-progress workflows for the current step', async () => {
      tableRows.discharge_workflows = [workflow];
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });
      await waitFor(() => expect(result.current.isLoadingQueue).toBe(false));
      expect(result.current.myQueue).toEqual([workflow]);
    });

    it('reports a failed workflow query as no workflow, without a toast (current behavior)', async () => {
      // Known gap: query errors are not surfaced to the user. This test pins that
      // behavior so a change to it is deliberate.
      tableErrors.discharge_workflows = { message: 'boom' };
      const { result } = renderHook(() => useDischargePipeline('wf1'), {
        wrapper: wrapperFor(newClient()),
      });
      await waitFor(() => expect(result.current.isLoadingWorkflow).toBe(false));
      expect(result.current.workflow).toBeNull();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  describe('actions', () => {
    it('initiates a discharge with the initiate action and patient id', async () => {
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      await act(async () => {
        await result.current.initiateDischarge({ patientId: 'p1', consultationId: 'c1' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('discharge-workflow', {
        body: expect.objectContaining({
          action: 'initiate',
          patientId: 'p1',
          consultationId: 'c1',
        }),
      });
    });

    it('approves a step with the workflow id', async () => {
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      await act(async () => {
        await result.current.approveStep({ workflowId: 'wf1', patientId: 'p1' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('discharge-workflow', {
        body: expect.objectContaining({ action: 'approve', workflowId: 'wf1' }),
      });
    });

    it('sends the rejection type with a reject action', async () => {
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      await act(async () => {
        await result.current.rejectStep({
          workflowId: 'wf1',
          patientId: 'p1',
          reason: 'Vitals unstable',
          rejectionType: 'clinical',
        } as any);
      });

      expect(mockInvoke).toHaveBeenCalledWith('discharge-workflow', {
        body: expect.objectContaining({
          action: 'reject',
          reason: 'Vitals unstable',
          metadata: { rejectionType: 'clinical' },
        }),
      });
    });

    it('cancels a workflow with the cancel action', async () => {
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      await act(async () => {
        await result.current.cancelWorkflow({ workflowId: 'wf1' });
      });

      expect(mockInvoke).toHaveBeenCalledWith('discharge-workflow', {
        body: expect.objectContaining({ action: 'cancel', workflowId: 'wf1' }),
      });
    });
  });

  describe('error reporting', () => {
    it('shows the server error message and rejects when the function returns an error payload', async () => {
      mockInvoke.mockResolvedValue({ data: { error: 'Step already advanced' }, error: null });
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      await act(async () => {
        await expect(
          result.current.approveStep({ workflowId: 'wf1', patientId: 'p1' })
        ).rejects.toThrow('Step already advanced');
      });

      expect(toast.error).toHaveBeenCalledWith('Step already advanced');
    });

    it('shows a toast when the transport itself fails', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error('network down') });
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      await act(async () => {
        await expect(result.current.cancelWorkflow({ workflowId: 'wf1' })).rejects.toThrow(
          'network down'
        );
      });

      expect(toast.error).toHaveBeenCalledWith('network down');
    });

    it('refuses actions for a role that cannot act on discharge workflows, before calling the server', async () => {
      authState.primaryRole = null;
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      await act(async () => {
        await expect(result.current.initiateDischarge({ patientId: 'p1' })).rejects.toThrow(
          'You do not have permission to act on discharge workflows'
        );
      });

      expect(mockInvoke).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        'You do not have permission to act on discharge workflows'
      );
    });
  });

  describe('canAct and realtime', () => {
    it('cannot act without a signed-in user', () => {
      authState.user = null;
      const { result } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });
      expect(result.current.canAct).toBe(false);
    });

    it('subscribes to the hospital channel and removes it on unmount', () => {
      const { unmount } = renderHook(() => useDischargePipeline(), {
        wrapper: wrapperFor(newClient()),
      });

      expect(mockChannel).toHaveBeenCalledWith('discharge-workflows:h1');
      unmount();
      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    });

    it('does not subscribe without a hospital', () => {
      authState.hospital = null;
      renderHook(() => useDischargePipeline(), { wrapper: wrapperFor(newClient()) });
      expect(mockChannel).not.toHaveBeenCalled();
    });
  });
});
