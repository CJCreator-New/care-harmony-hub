import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowOrchestrator, WorkflowEvent } from '../useWorkflowOrchestrator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock AuthContext
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hospital: { id: 'hosp-123' },
    profile: { user_id: 'user-456' },
    primaryRole: 'receptionist'
  })
}));

// Mock Sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useWorkflowOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger workflow event and execute rules', async () => {
    // Mock event insertion
    const mockEventInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'event-789' }, error: null })
      })
    });

    // Mock rules fetching
    const mockRulesSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ 
            data: [
              { 
                id: 'rule-1', 
                name: 'Test Rule', 
                actions: [{ 
                  type: 'create_task', 
                  target_role: 'nurse', 
                  message: 'New Triage Task' 
                }] 
              }
            ], 
            error: null 
          })
        })
      })
    });

    // Mock task insertion
    const mockTaskInsert = vi.fn().mockResolvedValue({ data: null, error: null });

    // Mock update calls
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'workflow_events') return { insert: mockEventInsert, update: mockUpdate };
      if (table === 'workflow_rules') return { select: mockRulesSelect, update: mockUpdate };
      if (table === 'workflow_tasks') return { insert: mockTaskInsert };
      return { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
    });

    const { result } = renderHook(() => useWorkflowOrchestrator(), { wrapper: createWrapper() });

    const event: WorkflowEvent = {
      type: 'patient_check_in',
      patientId: 'pat-101',
      data: { reason: 'check-in' }
    };

    await result.current.triggerWorkflow(event);

    // Verify event logging
    expect(mockEventInsert).toHaveBeenCalled();
    
    // Verify rules fetching
    expect(mockRulesSelect).toHaveBeenCalled();
    
    // Verify task creation (the action)
    expect(mockTaskInsert).toHaveBeenCalledWith(expect.objectContaining({
      workflow_type: 'patient_check_in',
      assigned_role: 'nurse'
    }));

    // Verify success toast was NOT called (it's silent unless error)
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    (supabase.from as any).mockImplementation(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
        })
      })
    }));

    const { result } = renderHook(() => useWorkflowOrchestrator(), { wrapper: createWrapper() });

    await result.current.triggerWorkflow({ type: 'test_event', data: {} });

    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('DB Error'));
  });
});
