import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, corsHeaders as defaultCorsHeaders } from '../_shared/cors.ts'
import { authorize } from '../_shared/authorize.ts'
import { withRateLimit } from '../_shared/rateLimit.ts'
import { validateRequest } from '../_shared/validation.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const workflowSchema = z.object({
  action: z.string().min(1),
  data: z.any().optional(),
});

interface WorkflowTask {
  id: string
  title: string
  workflow_type: string
  priority: string
  assigned_to: string
  patient_id: string
  due_date: string
  hospital_id: string
}

interface WorkflowRule {
  id: string
  trigger_event: string
  trigger_conditions: any
  actions: any
  active: boolean
  cooldown_minutes: number
  last_triggered: string
}

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authErr = await authorize(req, ['admin', 'doctor', 'nurse', 'super_admin'])
  if (authErr) return authErr

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const validation = await validateRequest(req, workflowSchema);
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { action, data } = validation.data;

    switch (action) {
      case 'process_workflow_rules':
        return await processWorkflowRules(supabaseClient, data)

      case 'auto_assign_tasks':
        return await autoAssignTasks(supabaseClient, data)

      case 'calculate_metrics':
        return await calculateWorkflowMetrics(supabaseClient, data)

      case 'send_bulk_notifications':
        return await sendBulkNotifications(supabaseClient, data)

      default:
        throw new Error(`Unknown action: ${action}`)
    }

  } catch (error) {
    console.error('Workflow automation error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
}

serve((req) => withRateLimit(req, handler));

async function processWorkflowRules(supabaseClient: any, data: any) {
  const { trigger_event, record_data, hospital_id } = data

  // Get active workflow rules for this trigger event
  const { data: rules, error: rulesError } = await supabaseClient
    .from('workflow_rules')
    .select('*')
    .eq('active', true)
    .eq('trigger_event', trigger_event)
    .eq('hospital_id', hospital_id)

  if (rulesError) throw rulesError

  const triggeredRules = []
  const createdTasks = []

  for (const rule of rules) {
    // Check cooldown period
    if (rule.last_triggered) {
      const lastTriggered = new Date(rule.last_triggered)
      const cooldownMs = rule.cooldown_minutes * 60 * 1000
      if (Date.now() - lastTriggered.getTime() < cooldownMs) {
        continue // Skip rule due to cooldown
      }
    }

    // Check trigger conditions
    if (checkTriggerConditions(rule.trigger_conditions, record_data)) {
      triggeredRules.push(rule)

      // Execute rule actions
      const tasks = await executeRuleActions(supabaseClient, rule, record_data)
      createdTasks.push(...tasks)

      // Update last triggered timestamp
      await supabaseClient
        .from('workflow_rules')
        .update({ last_triggered: new Date().toISOString() })
        .eq('id', rule.id)
    }
  }

  return new Response(JSON.stringify({
    success: true,
    triggered_rules: triggeredRules.length,
    created_tasks: createdTasks.length,
    tasks: createdTasks
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Execute all actions defined in a workflow rule.
 *
 * The actions payload is normalised to an array so that both legacy object-keyed
 * format `{ "task": {...} }` and the current array format
 * `[{ "type": "create_task", "target_role": "nurse", ... }]` are handled.
 *
 * Supported action types:
 *   create_task        – create a workflow_tasks row and notify the assignee
 *   send_notification  – insert a notifications row for the target role
 *   update_status      – update the source entity's status (no-op in Edge Fn,
 *                        status updates are performed by DB triggers)
 *   trigger_function   – fire another Edge Function by name
 */
async function executeRuleActions(supabaseClient: any, rule: WorkflowRule, recordData: any) {
  const createdTasks: any[] = []

  // ── Normalise actions to an array ────────────────────────────────────────
  let actionsArray: any[] = []
  if (Array.isArray(rule.actions)) {
    actionsArray = rule.actions
  } else if (rule.actions && typeof rule.actions === 'object') {
    // Legacy object-keyed format: { task: {...}, assignment_strategy: '...' }
    if (rule.actions.task) {
      actionsArray.push({ type: 'create_task', ...rule.actions.task })
    }
    // allow other legacy keys to fall through gracefully
  }

  for (const action of actionsArray) {
    switch (action.type) {

      case 'create_task': {
        const targetRole: string = action.target_role || 'admin'
        const assigneeId = await findOptimalAssigneeByRole(
          supabaseClient,
          targetRole,
          recordData.hospital_id,
        )

        if (assigneeId) {
          const dueDate = action.due_hours
            ? new Date(Date.now() + action.due_hours * 60 * 60 * 1000).toISOString()
            : null

          const { data: task, error: taskError } = await supabaseClient
            .from('workflow_tasks')
            .insert({
              title:        action.title       || action.message || `Workflow task: ${rule.name}`,
              description:  action.description || action.message,
              workflow_type: targetRole,
              priority:     action.priority    || action.metadata?.priority || 'normal',
              assigned_to:  assigneeId,
              patient_id:   recordData.patient_id || recordData.id,
              due_date:     dueDate,
              hospital_id:  recordData.hospital_id,
              metadata: {
                auto_generated: true,
                rule_id:        rule.id,
                trigger_event:  rule.trigger_event,
                ...(action.metadata || {}),
              },
            })
            .select()
            .single()

          if (!taskError && task) {
            createdTasks.push(task)
            await sendTaskNotification(supabaseClient, task, assigneeId)
          }
        }
        break
      }

      case 'send_notification': {
        // Fan-out by role; recordData must carry hospital_id
        const targetRole: string = action.target_role || 'admin'
        const { data: recipients } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .eq('hospital_id', recordData.hospital_id)
          .in('user_id', (
            await supabaseClient
              .from('user_roles')
              .select('user_id')
              .eq('role', targetRole)
              .eq('hospital_id', recordData.hospital_id)
          ).data?.map((r: any) => r.user_id) ?? [])

        for (const recipient of recipients ?? []) {
          await supabaseClient.from('notifications').insert({
            hospital_id:  recordData.hospital_id,
            recipient_id: recipient.user_id,
            type:         action.notification_type || 'task',
            title:        action.title   || rule.name,
            message:      action.message || rule.description,
            priority:     action.metadata?.priority || 'normal',
            category:     action.category || 'clinical',
            metadata: {
              rule_id:       rule.id,
              trigger_event: rule.trigger_event,
              patient_id:    recordData.patient_id || recordData.id,
              ...(action.metadata || {}),
            },
          })
        }
        break
      }

      case 'update_status':
        // Status transitions are handled by DB triggers – nothing to do here.
        break

      case 'trigger_function': {
        const fnName: string = action.metadata?.function_name
        if (fnName) {
          try {
            await supabaseClient.functions.invoke(fnName, {
              body: { action: 'process', data: recordData },
            })
          } catch (err) {
            console.warn(`trigger_function ${fnName} failed:`, err)
          }
        }
        break
      }

      default:
        console.warn(`Unknown workflow action type: ${action.type}`)
    }
  }

  return createdTasks
}

// ── Helper: find optimal assignee by role name (replaces findOptimalAssignee) ─
async function findOptimalAssigneeByRole(
  supabaseClient: any,
  role: string,
  hospitalId: string,
): Promise<string | null> {
  const { data: roleRows } = await supabaseClient
    .from('user_roles')
    .select('user_id')
    .eq('role', role)
    .eq('hospital_id', hospitalId)

  if (!roleRows?.length) return null

  const userIds = roleRows.map((r: any) => r.user_id)

  // Get current task counts to find least-loaded staff member
  const { data: taskCounts } = await supabaseClient
    .from('workflow_tasks')
    .select('assigned_to')
    .in('assigned_to', userIds)
    .in('status', ['pending', 'in_progress'])

  const workloadMap = new Map<string, number>()
  taskCounts?.forEach((task: any) => {
    workloadMap.set(task.assigned_to, (workloadMap.get(task.assigned_to) ?? 0) + 1)
  })

  let bestUserId: string | null = null
  let lowestWorkload = Infinity

  for (const userId of userIds) {
    const workload = workloadMap.get(userId) ?? 0
    if (workload < lowestWorkload) {
      lowestWorkload = workload
      bestUserId = userId
    }
  }

  return bestUserId
}

// ── Legacy wrapper kept for any callers that pass a workflowType string ──────
async function findOptimalAssignee(
  supabaseClient: any,
  workflowType: string,
  hospitalId: string,
  _strategy: string,
): Promise<string | null> {
  const roleMap: Record<string, string> = {
    consultation: 'doctor',
    medication:   'pharmacist',
    lab_order:    'lab_technician',
    billing:      'receptionist',
  }
  const role = roleMap[workflowType] ?? 'admin'
  return findOptimalAssigneeByRole(supabaseClient, role, hospitalId)
}

async function sendTaskNotification(supabaseClient: any, task: WorkflowTask, assigneeId: string) {
  // Get assignee profile
  const { data: assignee } = await supabaseClient
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', assigneeId)
    .single()

  if (!assignee) return

  // Create notification message
  await supabaseClient
    .from('communication_messages')
    .insert({
      sender_id: task.assigned_to, // System-generated, but we'll use assignee as sender for now
      sender_name: 'Workflow System',
      sender_role: 'system',
      recipient_ids: [assigneeId],
      subject: `New Task Assigned: ${task.title}`,
      content: `You have been assigned a new task: ${task.title}. Priority: ${task.priority}. Due: ${task.due_date ? new Date(task.due_date).toLocaleString() : 'ASAP'}`,
      priority: task.priority === 'urgent' ? 'urgent' : 'normal',
      message_type: 'task_assignment',
      patient_id: task.patient_id,
      task_id: task.id,
      hospital_id: task.hospital_id
    })
}

function checkTriggerConditions(conditions: any, recordData: any) {
  if (!conditions || Object.keys(conditions).length === 0) return true

  for (const [field, condition] of Object.entries(conditions)) {
    const fieldValue = recordData[field]
    const conditionObj = condition as any

    switch (conditionObj.operator) {
      case 'equals':
        if (fieldValue != conditionObj.value) return false
        break
      case 'not_equals':
        if (fieldValue == conditionObj.value) return false
        break
      case 'contains':
        if (!fieldValue?.includes(conditionObj.value)) return false
        break
      case 'greater_than':
        if (fieldValue <= conditionObj.value) return false
        break
      case 'less_than':
        if (fieldValue >= conditionObj.value) return false
        break
    }
  }

  return true
}

async function autoAssignTasks(supabaseClient: any, data: any) {
  const { hospital_id, workflow_type, limit = 10 } = data

  // Get unassigned tasks
  const { data: unassignedTasks, error } = await supabaseClient
    .from('workflow_tasks')
    .select('*')
    .is('assigned_to', null)
    .eq('hospital_id', hospital_id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  const assignments = []

  for (const task of unassignedTasks) {
    const assigneeId = await findOptimalAssignee(supabaseClient, task.workflow_type, hospital_id, 'workload')

    if (assigneeId) {
      const { error: updateError } = await supabaseClient
        .from('workflow_tasks')
        .update({
          assigned_to: assigneeId,
          metadata: { ...task.metadata, auto_assigned: true }
        })
        .eq('id', task.id)

      if (!updateError) {
        assignments.push({ task_id: task.id, assigned_to: assigneeId })

        // Send notification
        await sendTaskNotification(supabaseClient, { ...task, assigned_to: assigneeId }, assigneeId)
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    assignments_made: assignments.length,
    assignments
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}

async function calculateWorkflowMetrics(supabaseClient: any, data: any) {
  const { hospital_id, timeframe_days = 30 } = data

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - timeframe_days)

  // Get task metrics
  const { data: tasks } = await supabaseClient
    .from('workflow_tasks')
    .select('*')
    .eq('hospital_id', hospital_id)
    .gte('created_at', startDate.toISOString())

  const metrics = {
    total_tasks: tasks?.length || 0,
    completed_tasks: tasks?.filter(t => t.status === 'completed').length || 0,
    pending_tasks: tasks?.filter(t => t.status === 'pending').length || 0,
    overdue_tasks: tasks?.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length || 0,
    average_completion_time: 0,
    task_completion_rate: 0
  }

  // Calculate completion rate
  if (metrics.total_tasks > 0) {
    metrics.task_completion_rate = (metrics.completed_tasks / metrics.total_tasks) * 100
  }

  // Calculate average completion time
  const completedTasks = tasks?.filter(t => t.completed_at && t.created_at) || []
  if (completedTasks.length > 0) {
    const totalTime = completedTasks.reduce((acc, task) => {
      return acc + (new Date(task.completed_at).getTime() - new Date(task.created_at).getTime())
    }, 0)
    metrics.average_completion_time = totalTime / completedTasks.length / (1000 * 60 * 60) // hours
  }

  // Store metrics in workflow_metrics table
  await supabaseClient
    .from('workflow_metrics')
    .insert({
      metric_type: 'workflow_efficiency',
      hospital_id,
      metric_value: metrics.task_completion_rate,
      measurement_unit: 'percentage',
      recorded_date: new Date().toISOString().split('T')[0]
    })

  return new Response(JSON.stringify({
    success: true,
    metrics
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendBulkNotifications(supabaseClient: any, data: any) {
  const { hospital_id, recipient_roles, subject, content, priority = 'normal', message_type = 'broadcast' } = data

  // Get recipient profiles
  const { data: recipients, error } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('hospital_id', hospital_id)
    .in('role', recipient_roles)

  if (error) throw error

  if (!recipients?.length) {
    return new Response(JSON.stringify({
      success: true,
      message: 'No recipients found for the specified roles',
      notifications_sent: 0
    }), {
      headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const recipientIds = recipients.map(r => r.id)

  // Get sender info (system user or first admin)
  const { data: sender } = await supabaseClient
    .from('profiles')
    .select('id, full_name, role')
    .eq('hospital_id', hospital_id)
    .eq('role', 'admin')
    .limit(1)
    .single()

  const senderInfo = sender || {
    id: recipientIds[0], // Fallback
    full_name: 'System Notification',
    role: 'system'
  }

  // Create bulk message
  const { data: message, error: messageError } = await supabaseClient
    .from('communication_messages')
    .insert({
      sender_id: senderInfo.id,
      sender_name: senderInfo.full_name,
      sender_role: senderInfo.role,
      recipient_ids: recipientIds,
      recipient_roles: recipient_roles,
      subject,
      content,
      priority,
      message_type,
      hospital_id
    })
    .select()
    .single()

  if (messageError) throw messageError

  return new Response(JSON.stringify({
    success: true,
    message_id: message.id,
    notifications_sent: recipientIds.length,
    recipients: recipientIds
  }), {
    headers: { ...defaultCorsHeaders, 'Content-Type': 'application/json' },
  })
}


