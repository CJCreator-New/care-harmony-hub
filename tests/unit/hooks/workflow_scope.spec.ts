import { describe, it, expect } from 'vitest'
import { supabase } from '@/integrations/supabase/client'
import { renderHook } from '@testing-library/react'
import { useWorkflowAutomation } from '@/hooks/useWorkflowAutomation'
import { createWrapper } from '@/test/utils'

describe('workflow automation hospital scoping', () => {
  it('throws if hospital context missing when creating a task', async () => {
    const { result } = renderHook(() => useWorkflowAutomation(), { wrapper: createWrapper({ hospital: null }) })
    await expect(result.current.createAutomatedTask({ title: 't', description: '', priority: 'low', status: 'pending', assigned_to: '', assigned_role: '', created_by: '', due_date: new Date().toISOString(), workflow_type: 'test', metadata: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })).rejects.toThrow()
  })
})
