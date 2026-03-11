import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkflowOrchestrator, type WorkflowEvent } from '../useWorkflowOrchestrator';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hospital: { id: 'hosp-123' },
    profile: { id: 'profile-1', user_id: 'user-456' },
    primaryRole: 'receptionist',
  }),
}));

vi.mock('@/services/notificationAdapter', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useWorkflowOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips a rule when cooldown_minutes has not elapsed', async () => {
    const eventInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'event-1' }, error: null }),
      }),
    });
    const eventUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const eventUpdate = vi.fn().mockReturnValue({ eq: eventUpdateEq });

    const rulesEqThird = vi.fn().mockResolvedValue({
      data: [{
        id: 'rule-1',
        name: 'Cooldown rule',
        actions: [{ type: 'create_task', target_role: 'nurse', message: 'Do something' }],
        cooldown_minutes: 10,
        last_triggered: new Date().toISOString(),
      }],
      error: null,
    });
    const rulesEqSecond = vi.fn().mockReturnValue({ eq: rulesEqThird });
    const rulesEqFirst = vi.fn().mockReturnValue({ eq: rulesEqSecond });
    const rulesSelect = vi.fn().mockReturnValue({ eq: rulesEqFirst });

    const ruleUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const ruleUpdate = vi.fn().mockReturnValue({ eq: ruleUpdateEq });

    const taskInsert = vi.fn().mockResolvedValue({ error: null });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'workflow_events') return { insert: eventInsert, update: eventUpdate };
      if (table === 'workflow_rules') return { select: rulesSelect, update: ruleUpdate };
      if (table === 'workflow_tasks') return { insert: taskInsert };
      return { insert: vi.fn(), update: vi.fn(), select: vi.fn() };
    });

    const { result } = renderHook(() => useWorkflowOrchestrator(), { wrapper: createWrapper() });

    await result.current.triggerWorkflow({
      type: 'patient.checked_in',
      patientId: 'pat-1',
      data: { foo: 'bar' },
    });

    expect(taskInsert).not.toHaveBeenCalled();
    expect(ruleUpdate).not.toHaveBeenCalled();
  });

  it('persists processing_error when workflow event insert succeeds but rules fetch fails', async () => {
    const eventInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'event-2' }, error: null }),
      }),
    });

    const eventUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const eventUpdate = vi.fn().mockReturnValue({ eq: eventUpdateEq });

    const rulesEqThird = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Rules fetch failed' },
    });
    const rulesEqSecond = vi.fn().mockReturnValue({ eq: rulesEqThird });
    const rulesEqFirst = vi.fn().mockReturnValue({ eq: rulesEqSecond });
    const rulesSelect = vi.fn().mockReturnValue({ eq: rulesEqFirst });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'workflow_events') return { insert: eventInsert, update: eventUpdate };
      if (table === 'workflow_rules') return { select: rulesSelect, update: vi.fn() };
      return { insert: vi.fn(), update: vi.fn(), select: vi.fn() };
    });

    const { result } = renderHook(() => useWorkflowOrchestrator(), { wrapper: createWrapper() });

    await result.current.triggerWorkflow({
      type: 'patient.checked_in',
      patientId: 'pat-1',
      data: {},
    });

    expect(eventUpdate).toHaveBeenCalledWith({ processing_error: 'Rules fetch failed' });
    expect(eventUpdateEq).toHaveBeenCalledWith('id', 'event-2');
    expect(toast.error).toHaveBeenCalledWith('Workflow error: Rules fetch failed');
  });
});
